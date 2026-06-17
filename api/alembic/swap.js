// Vercel Serverless Function - /api/alembic/swap
//
// Alembic v1 "ideation brain" — suggests 2-3 alternatives for one slot of a drink.
//   Body:  { drink: Drink, slot: string }
//   Model: claude-sonnet-4-6
//   200:   { alternatives: [{ name, amount?, unit?, why }] }
//   422:   model didn't return valid JSON for the schema after one retry
//
// All Claude calls happen server-side; the key is read from ANTHROPIC_API_KEY
// (same env var as api/analyze.js). Follows the existing api/ pattern: guard the
// method, fail loudly on missing config, wrap in try/catch, log on error.

import { loadVocabulary } from '../_lib/vocabulary.js';
import { validateSwapResult } from '../_lib/drinkSchema.js';
import { buildSwapSystemPrompt } from '../_lib/prompts/swapPrompt.js';
import { generateValidatedJson } from '../_lib/claude.js';

const MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
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
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { drink, slot } = body;

    if (drink === null || typeof drink !== 'object' || Array.isArray(drink)) {
      return res
        .status(400)
        .json({ error: 'drink is required and must be a Drink object' });
    }
    if (typeof slot !== 'string' || slot.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'slot is required and must be a non-empty string' });
    }

    const vocab = await loadVocabulary();
    const system = buildSwapSystemPrompt(vocab);
    const user = `Slot to swap: ${slot}\nDrink:\n${JSON.stringify(drink, null, 2)}`;

    const result = await generateValidatedJson({
      model: MODEL,
      system,
      user,
      maxTokens: 1024,
      validate: validateSwapResult,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({
        error: 'Model did not return valid JSON for the schema.',
        validationErrors: err.validationErrors || [],
        raw: err.raw || '',
      });
    }
    console.error('Alembic swap error:', err);
    return res
      .status(err.status || 500)
      .json({ error: 'Failed to swap slot', message: err.message });
  }
}
