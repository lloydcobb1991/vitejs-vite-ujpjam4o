// Alembic — server-side Claude client + defensive JSON handling
// ----------------------------------------------------------------------------
// All Claude calls happen server-side. The key is read from ANTHROPIC_API_KEY
// (same env var as api/analyze.js). We hit the Messages API directly with fetch
// to match the existing api/ functions — no new dependencies.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Call the Claude Messages API and return the concatenated text output.
 * @param {object} args
 * @param {string} args.model
 * @param {string} args.system
 * @param {string} args.user
 * @param {number} [args.maxTokens]
 * @returns {Promise<string>}
 */
export async function callClaude({ model, system, user, maxTokens = 2048 }) {
  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    const err = new Error(
      `Claude API error (${upstream.status}): ${data?.error?.message || 'unknown error'}`
    );
    err.status = 502;
    throw err;
  }

  // Concatenate all text blocks from the response content.
  return Array.isArray(data.content)
    ? data.content
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('')
    : '';
}

/**
 * Strip markdown code fences defensively, then JSON.parse.
 * Claude is instructed to return raw JSON, but we never fully trust that.
 * @param {string} raw
 * @returns {unknown}  throws on parse failure
 */
export function parseJsonLoose(raw) {
  let text = (raw || '').trim();

  // Remove a leading ```json / ``` fence and a trailing ``` fence if present.
  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Fallback: if prose still surrounds it, grab the outermost { ... } object.
  if (text && text[0] !== '{') {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      text = text.slice(first, last + 1);
    }
  }

  return JSON.parse(text);
}

/**
 * Call Claude, defensively parse JSON, validate, and retry once on failure.
 * On a second failure, throws an error carrying { status: 422, raw, validationErrors }
 * so the handler can return 422 with the raw model text.
 * @param {object} args
 * @param {string} args.model
 * @param {string} args.system
 * @param {string} args.user
 * @param {number} [args.maxTokens]
 * @param {(parsed: unknown) => { valid: boolean, errors: string[] }} args.validate
 * @returns {Promise<unknown>}
 */
export async function generateValidatedJson({ model, system, user, maxTokens, validate }) {
  let lastRaw = '';
  let lastErrors = [];

  // Two attempts total: the initial call, then one retry on parse/validation failure.
  for (let attempt = 0; attempt < 2; attempt++) {
    lastRaw = await callClaude({ model, system, user, maxTokens });
    try {
      const parsed = parseJsonLoose(lastRaw);
      const { valid, errors } = validate(parsed);
      if (valid) return parsed;
      lastErrors = errors;
    } catch (err) {
      lastErrors = [`JSON parse failed: ${err.message}`];
    }
  }

  const err = new Error('Model did not return valid JSON for the schema.');
  err.status = 422;
  err.raw = lastRaw;
  err.validationErrors = lastErrors;
  throw err;
}
