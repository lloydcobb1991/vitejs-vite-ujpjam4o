// Alembic — Drink schema + response validation
// ----------------------------------------------------------------------------
// The Drink framework is the canonical shape every /api/alembic/generate
// response must satisfy, and what /api/alembic/swap alternatives slot back into.
// We validate Claude's JSON against this before returning it so the render layer
// (and the eventual recipe DB) never sees a malformed drink.

/**
 * @typedef {"base"|"bittersweet"|"acid"|"sweet"|"aromatic"|"lengthener"} ComponentRole
 *
 * @typedef {Object} Component
 * @property {ComponentRole} role
 * @property {string} name
 * @property {number} amount
 * @property {string} unit
 *
 * @typedef {Object} Drink
 * @property {string} name
 * @property {string} build              e.g. "spritz" | "shaken sour" | "stirred"
 * @property {Component[]} components
 * @property {string} glass
 * @property {string[]} garnish
 * @property {string} method
 * @property {string} flavorDirection
 * @property {string} colorHint          hex, drives the liquid color in the render
 * @property {boolean} carbonated
 * @property {string[]} tags
 */

export const COMPONENT_ROLES = [
  'base',
  'bittersweet',
  'acid',
  'sweet',
  'aromatic',
  'lengthener',
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isString = (v) => typeof v === 'string';
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isStringArray = (v) => Array.isArray(v) && v.every(isString);

/**
 * Validate a parsed object against the Drink schema.
 * @param {unknown} drink
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDrink(drink) {
  const errors = [];

  if (drink === null || typeof drink !== 'object' || Array.isArray(drink)) {
    return { valid: false, errors: ['drink must be a JSON object'] };
  }

  const d = /** @type {Record<string, unknown>} */ (drink);

  if (!isNonEmptyString(d.name)) errors.push('name must be a non-empty string');
  if (!isNonEmptyString(d.build)) errors.push('build must be a non-empty string');
  if (!isNonEmptyString(d.glass)) errors.push('glass must be a non-empty string');
  if (!isNonEmptyString(d.method)) errors.push('method must be a non-empty string');
  if (!isNonEmptyString(d.flavorDirection))
    errors.push('flavorDirection must be a non-empty string');

  if (!isString(d.colorHint) || !HEX_RE.test(d.colorHint))
    errors.push('colorHint must be a hex color string (e.g. "#E4572E")');

  if (typeof d.carbonated !== 'boolean')
    errors.push('carbonated must be a boolean');

  if (!isStringArray(d.garnish))
    errors.push('garnish must be an array of strings');
  if (!isStringArray(d.tags)) errors.push('tags must be an array of strings');

  if (!Array.isArray(d.components) || d.components.length === 0) {
    errors.push('components must be a non-empty array');
  } else {
    d.components.forEach((c, i) => {
      if (c === null || typeof c !== 'object' || Array.isArray(c)) {
        errors.push(`components[${i}] must be an object`);
        return;
      }
      const comp = /** @type {Record<string, unknown>} */ (c);
      if (!COMPONENT_ROLES.includes(/** @type {string} */ (comp.role)))
        errors.push(
          `components[${i}].role must be one of ${COMPONENT_ROLES.join(', ')}`
        );
      if (!isNonEmptyString(comp.name))
        errors.push(`components[${i}].name must be a non-empty string`);
      if (typeof comp.amount !== 'number' || Number.isNaN(comp.amount))
        errors.push(`components[${i}].amount must be a number`);
      if (!isNonEmptyString(comp.unit))
        errors.push(`components[${i}].unit must be a non-empty string`);
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a parsed /api/alembic/swap response:
 *   { alternatives: [{ name, amount?, unit?, why }] }  (2-3 items)
 * @param {unknown} payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSwapResult(payload) {
  const errors = [];

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['response must be a JSON object'] };
  }

  const alts = /** @type {Record<string, unknown>} */ (payload).alternatives;
  if (!Array.isArray(alts)) {
    return { valid: false, errors: ['alternatives must be an array'] };
  }
  if (alts.length < 2 || alts.length > 3) {
    errors.push('alternatives must contain 2-3 items');
  }

  alts.forEach((a, i) => {
    if (a === null || typeof a !== 'object' || Array.isArray(a)) {
      errors.push(`alternatives[${i}] must be an object`);
      return;
    }
    const alt = /** @type {Record<string, unknown>} */ (a);
    if (!isNonEmptyString(alt.name))
      errors.push(`alternatives[${i}].name must be a non-empty string`);
    if (!isNonEmptyString(alt.why))
      errors.push(`alternatives[${i}].why must be a non-empty string`);
    // amount and unit are optional, but must be the right type when present.
    if (alt.amount !== undefined && (typeof alt.amount !== 'number' || Number.isNaN(alt.amount)))
      errors.push(`alternatives[${i}].amount must be a number when present`);
    if (alt.unit !== undefined && !isString(alt.unit))
      errors.push(`alternatives[${i}].unit must be a string when present`);
  });

  return { valid: errors.length === 0, errors };
}
