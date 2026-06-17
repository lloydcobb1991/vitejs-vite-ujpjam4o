// Vercel Serverless Function - /api/alembic/generate
//
// Alembic v1 "ideation brain" — invents a Drink framework from a creative prompt.
//   Body:  { prompt: string, vibe?: string }
//   Model: claude-opus-4-8
//   200:   a Drink object (see api/_lib/drinkSchema.js)
//   422:   model didn't return valid JSON for the schema after one retry
//
// All Claude calls happen server-side; the key is read from ANTHROPIC_API_KEY
// (same env var as api/analyze.js). Follows the existing api/ pattern: guard the
// method, fail loudly on missing config, wrap in try/catch, log on error.

import { loadVocabulary } from '../_lib/vocabulary.js';
import { validateDrink } from '../_lib/drinkSchema.js';
import { buildGenerateSystemPrompt } from '../_lib/prompts/generatePrompt.js';
import { generateValidatedJson } from '../_lib/claude.js';

const MODEL = 'claude-opus-4-8';

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
    const { prompt, vibe } = body;

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'prompt is required and must be a non-empty string' });
    }
    if (vibe !== undefined && typeof vibe !== 'string') {
      return res.status(400).json({ error: 'vibe must be a string when provided' });
    }

    const vocab = await loadVocabulary();
    const system = buildGenerateSystemPrompt(vocab);
    const user = vibe ? `Prompt: ${prompt}\nVibe: ${vibe}` : `Prompt: ${prompt}`;

    const drink = await generateValidatedJson({
      model: MODEL,
      system,
      user,
      maxTokens: 2048,
      validate: validateDrink,
    });

    return res.status(200).json(drink);
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({
        error: 'Model did not return valid JSON for the schema.',
        validationErrors: err.validationErrors || [],
        raw: err.raw || '',
      });
    }
    console.error('Alembic generate error:', err);
    return res
      .status(err.status || 500)
      .json({ error: 'Failed to generate drink', message: err.message });
  }
}
