// Alembic — vocabulary loader (grounding source)
// ----------------------------------------------------------------------------
// Loads the allowed ingredients / glasses / garnishes / tags that every Claude
// call is grounded against, so generated drinks stay within things we have data
// and render assets for.
//
// Right now this is a hand-written seed file (./vocabulary.json). We load it via
// createRequire so the JSON is statically traced into the Vercel function
// bundle (a runtime fs read of a sibling file is NOT reliably bundled).
//
// TODO: replace loadVocabulary() with a query against the real recipe DB once it
// exists. This repo's source of truth is Airtable (see api/rfp.js) — there is no
// Supabase table yet despite the brief mentioning one. Keep the returned shape
// ({ ingredients, glasses, garnishes, tags, builds }) stable so prompts and
// validators don't need to change.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const seed = require('./vocabulary.json');

/**
 * @typedef {Object} Vocabulary
 * @property {{ name: string, roles: string[], defaultUnit: string }[]} ingredients
 * @property {string[]} glasses
 * @property {string[]} garnishes
 * @property {string[]} tags
 * @property {string[]} builds
 */

/**
 * Load the grounding vocabulary. Async on purpose so swapping in a DB query
 * later (await airtable/await supabase) is a drop-in change.
 * @returns {Promise<Vocabulary>}
 */
export async function loadVocabulary() {
  // TODO: read from the recipe DB instead of the seed file. Until then, return
  // the seed (strip the leading `_todo` doc key).
  const { _todo, ...vocab } = seed;
  return vocab;
}
