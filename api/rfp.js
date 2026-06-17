// Vercel Serverless Function - /api/rfp.js
//
// First slice of the RFP pipeline. Creates a new RFP:
//   1. Writes a row to the Airtable `rfps` table (source of truth).
//   2. Best-effort: creates the WordPress landing-page CPT entry via REST and
//      stamps the resulting wp_page_id + lp_url back onto the Airtable row.
//   3. Returns { rfp_id, lp_url } to the frontend.
//
// Follows the same shape as api/analyze.js and api/send-emails.js: guard the
// HTTP method, fail loudly on missing config, wrap in try/catch, log on error.
//
// Required env (set in Vercel):
//   AIRTABLE_API_KEY   - Airtable personal access token
//   AIRTABLE_BASE_ID   - base holding the rfps table
// Optional env:
//   AIRTABLE_RFPS_TABLE - table name or id (default: "rfps")
//   WP_API_URL          - e.g. https://www.example.com (no trailing slash)
//   WP_USER             - WordPress user for app-password auth
//   WP_APP_PASSWORD     - WordPress application password
//
// If the WP_* vars are absent, the landing page step is skipped and lp_url comes
// back null — the Airtable row is still created so the rest of the pipeline works.

const AIRTABLE_API = 'https://api.airtable.com/v0';

function bad(res, status, error, extra) {
  return res.status(status).json({ error, ...(extra || {}) });
}

// Create the RFP row in Airtable. Returns the parsed Airtable record.
async function createAirtableRow(fields) {
  const table = encodeURIComponent(process.env.AIRTABLE_RFPS_TABLE || 'rfps');
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${table}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // typecast lets Airtable coerce the select/date strings into the right types.
    body: JSON.stringify({ fields, typecast: true }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const message =
      (data && data.error && (data.error.message || data.error.type)) ||
      'Airtable create failed';
    const err = new Error(message);
    err.status = resp.status;
    err.detail = data;
    throw err;
  }
  return data;
}

// Patch an existing Airtable row (used to stamp wp_page_id + lp_url after WP).
async function patchAirtableRow(recordId, fields) {
  const table = encodeURIComponent(process.env.AIRTABLE_RFPS_TABLE || 'rfps');
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${table}/${recordId}`;

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    console.error('Airtable patch failed:', data);
  }
}

// Best-effort WordPress CPT creation. Returns { wp_page_id, lp_url } or null.
async function createWordPressPage(rfp) {
  const { WP_API_URL, WP_USER, WP_APP_PASSWORD } = process.env;
  if (!WP_API_URL || !WP_USER || !WP_APP_PASSWORD) {
    console.log('WP_* env not set — skipping landing page creation.');
    return null;
  }

  const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
  const resp = await fetch(`${WP_API_URL}/wp-json/wp/v2/rfp`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: rfp.name,
      status: 'publish',
      // ACF fields matching the Airtable RFP schema. Requires the ACF-to-REST
      // plugin or register_rest_field on the WP side to accept these.
      acf: {
        client: rfp.client,
        deadline: rfp.deadline,
        description: rfp.description || '',
        logo_url: rfp.logo_url || '',
        template_id: rfp.template_id || '',
      },
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('WordPress CPT create failed:', data);
    return null;
  }
  return { wp_page_id: data.id, lp_url: data.link || null };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return bad(res, 405, 'Method not allowed');
  }
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return bad(
      res,
      500,
      'Server is missing AIRTABLE_API_KEY and/or AIRTABLE_BASE_ID. Add them in Vercel then redeploy.'
    );
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    const name = (body.name || '').trim();
    const client = (body.client || '').trim();
    const deadline = (body.deadline || '').trim(); // expects YYYY-MM-DD

    // Minimum viable RFP: everything downstream (reminders) derives from these.
    const missing = [];
    if (!name) missing.push('name');
    if (!client) missing.push('client');
    if (!deadline) missing.push('deadline');
    if (missing.length) {
      return bad(res, 400, `Missing required field(s): ${missing.join(', ')}`);
    }

    const rfp = {
      name,
      client,
      deadline,
      description: (body.description || '').trim(),
      logo_url: (body.logo_url || '').trim(),
      template_id: (body.template_id || '').trim(),
    };

    // 1. Airtable row (source of truth). We don't write created_at — Airtable
    // stamps every record with a built-in createdTime, so a manual field would
    // be redundant (and the "Created time" field type is read-only anyway).
    const record = await createAirtableRow({
      ...rfp,
      status: 'active',
    });

    const recordId = record.id;
    // rfp_id is an Airtable auto-number; it's present on the returned record.
    const rfpId =
      (record.fields && record.fields.rfp_id) != null
        ? record.fields.rfp_id
        : recordId;

    // 2. Landing page (best-effort).
    const wp = await createWordPressPage(rfp);

    // 3. Stamp WP results back onto the Airtable row if we got them.
    if (wp) {
      await patchAirtableRow(recordId, {
        wp_page_id: wp.wp_page_id,
        lp_url: wp.lp_url,
      });
    }

    return res.status(201).json({
      rfp_id: rfpId,
      lp_url: wp ? wp.lp_url : null,
      airtable_record_id: recordId,
      wp_page_id: wp ? wp.wp_page_id : null,
      landing_page_created: Boolean(wp),
    });
  } catch (err) {
    console.error('RFP create error:', err);
    return res.status(err.status || 500).json({
      error: 'Failed to create RFP',
      message: err.message,
    });
  }
}
