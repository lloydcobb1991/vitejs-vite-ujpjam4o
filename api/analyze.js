// Vercel Serverless Function - /api/analyze.js
//
// Drop-in replacement for the old ignitecs.co/emberwatch-proxy.php.
// It does the SAME job: the frontend builds the full Claude request and sends
// it here; this function attaches the API key (from a Vercel env var, never
// hardcoded) and forwards it to Claude, then returns the response.
//
// Two improvements over the PHP proxy:
//   1. The key lives in process.env.ANTHROPIC_API_KEY (set in Vercel), not in
//      the file, and this endpoint is same-origin so it is NOT an open relay.
//   2. It strips raw control characters out of Claude's text output, which is
//      what caused the "Bad control character in string literal in JSON at
//      position ####" error when the frontend parsed the response.

function sanitizeJsonText(text) {
  if (typeof text !== 'string') return text;
  // Replace raw control chars (0x00-0x1F: real newlines, tabs, etc.) with a
  // space. These are illegal *inside* JSON string values and are what break
  // JSON.parse. Escaped sequences like \n (backslash + n) are NOT affected.
  return text.replace(/[\u0000-\u001F]/g, ' ');
}

export default async function handler(req, res) {
  // Same-origin requests don't trigger CORS preflight, but handle OPTIONS just
  // in case something sends it.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error:
        'Server is missing the ANTHROPIC_API_KEY environment variable. Add it in Vercel then redeploy.',
    });
  }

  try {
    // req.body is the parsed payload the frontend built (model, messages, the
    // PDF, the prompt). Forward it to Claude unchanged, just like the proxy.
    const payload =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: payload,
    });

    const data = await upstream.json();

    // Clean control characters inside any text blocks Claude returned, so the
    // frontend's JSON.parse on that text succeeds.
    if (data && Array.isArray(data.content)) {
      data.content = data.content.map((block) => {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          return { ...block, text: sanitizeJsonText(block.text) };
        }
        return block;
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}