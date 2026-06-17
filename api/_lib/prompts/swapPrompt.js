// Alembic — system prompt for POST /api/alembic/swap
// ----------------------------------------------------------------------------
// Kept in its own file so it's easy to tune without touching route logic.
// The route (api/alembic/swap.js) resolves the slot to a single category and a
// slot-specific candidate list before calling this, so the prompt can state the
// category explicitly and forbid cross-category suggestions (a garnish swap must
// never come back with a spirit).

/**
 * @typedef {Object} SwapPlan
 * @property {string} slot          the raw slot ("base"/"glass"/"garnish"/"method"/…)
 * @property {string} category      human-readable category name for this slot
 * @property {string} current       the drink's current value(s) for this slot
 * @property {string[]|null} candidates  allowed names; null means "no fixed list" (method)
 * @property {boolean} includeAmounts    true only for ingredient (component-role) slots
 */

/**
 * Build the swap system prompt for a single, already-resolved slot.
 * @param {SwapPlan} plan
 * @returns {string}
 */
export function buildSwapSystemPrompt(plan) {
  const { slot, category, current, candidates, includeAmounts } = plan;

  const fields = includeAmounts
    ? `      "name": string,
      "amount": number (suggested amount for this drink),
      "unit": string (typical unit for the ingredient),
      "why": string (one short sentence on how it changes the drink)`
    : `      "name": string,
      "why": string (one short sentence on how it changes the drink)`;

  const intro = `You are Alembic, an ideation brain for cocktails. You are given an existing Drink (as JSON) and ONE slot to reconsider.

The slot being swapped is "${slot}", which is the drink's ${category}.
Its current value is: ${current || '(none)'}.

Propose 2-3 alternatives for THIS slot only that would work in this specific drink while keeping the overall balance sensible. Every alternative MUST be a valid ${category} — never suggest something from a different category (e.g. do not suggest a spirit or an ingredient when the slot is a glass, a garnish, or a method).`;

  const candidateBlock =
    candidates === null
      ? `This slot has no fixed list — propose sensible technique variations for the method, each a plausible way to build/prepare this drink.`
      : `Every alternative's "name" MUST be chosen verbatim from this candidate list. Do not invent or substitute anything outside it:
${candidates.map((c) => `- ${c}`).join('\n')}`;

  return `${intro}

${candidateBlock}

Return ONLY a JSON object in this exact shape. No prose, no explanation, no markdown code fences.

{
  "alternatives": [
    {
${fields}
    }
  ]
}

Rules:
- Provide exactly 2 or 3 alternatives.
- Every alternative must be a valid ${category}${candidates === null ? '' : ' drawn from the candidate list above'}.
- Do not repeat the current value ("${current || '(none)'}").
- ${includeAmounts ? 'Include "amount" and "unit" for each alternative.' : 'Do NOT include "amount" or "unit" — they are not meaningful for this slot.'}
- Output valid JSON and nothing else.`;
}
