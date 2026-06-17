// Vercel Serverless Function - /api/alembic/book.js
//
// Alembic "My book" — the mixologist's saved drink collection.
//   POST { drink, notes? } : save a drink as a row in the Airtable "AlembicBook"
//                             table. Returns { id }.
//   GET                     : list saved drinks newest first, returning
//                             { drinks: [{ id, name, drink, notes, createdAt }] }.
//
// Mirrors api/rfp.js: same Airtable auth (AIRTABLE_API_KEY + AIRTABLE_BASE_ID),
// same fetch style, same OPTIONS/method guards, same fail-loud + try/catch shape.
//
// Required env (set in Vercel):
//   AIRTABLE_API_KEY   - Airtable personal access token
//   AIRTABLE_BASE_ID   - base holding the AlembicBook table

const AIRTABLE_API = 'https://api.airtable.com/v0';
const BOOK_TABLE = 'AlembicBook';

function bad(res, status, error, extra) {
  return res.status(status).json({ error, ...(extra || {}) });
}

// Create a row in the AlembicBook table. Returns the parsed Airtable record.
async function createBookRow(fields) {
  const table = encodeURIComponent(BOOK_TABLE);
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${table}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // typecast lets Airtable coerce strings into the right field types.
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

// List rows from the AlembicBook table. Airtable's createdTime is record
// metadata (not a sortable field), so we sort newest-first in JS below.
async function listBookRows() {
  const table = encodeURIComponent(BOOK_TABLE);
  const url = `${AIRTABLE_API}/${process.env.AIRTABLE_BASE_ID}/${table}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    },
  });

  const data = await resp.json();
  if (!resp.ok) {
    const message =
      (data && data.error && (data.error.message || data.error.type)) ||
      'Airtable list failed';
    const err = new Error(message);
    err.status = resp.status;
    err.detail = data;
    throw err;
  }
  return data.records || [];
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
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
    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {};

      const drink = body.drink;
      if (!drink || typeof drink !== 'object') {
        return bad(res, 400, 'Missing required field: drink');
      }
      const notes = typeof body.notes === 'string' ? body.notes : '';

      const record = await createBookRow({
        Name: drink.name || 'Untitled',
        Drink: JSON.stringify(drink),
        Notes: notes || '',
      });

      return res.status(201).json({ id: record.id });
    }

    // GET — list saved drinks newest first.
    const records = await listBookRows();
    records.sort((a, b) =>
      (b.createdTime || '').localeCompare(a.createdTime || '')
    );
    const drinks = [];
    for (const r of records) {
      const fields = r.fields || {};
      let drink;
      try {
        drink = JSON.parse(fields.Drink);
      } catch {
        // Skip any record whose Drink field won't parse.
        continue;
      }
      drinks.push({
        id: r.id,
        name: fields.Name || drink?.name || 'Untitled',
        drink,
        notes: fields.Notes || '',
        createdAt: r.createdTime,
      });
    }

    return res.status(200).json({ drinks });
  } catch (err) {
    console.error('Alembic book error:', err);
    return res.status(err.status || 500).json({
      error: 'Failed to handle book request',
      message: err.message,
    });
  }
}
