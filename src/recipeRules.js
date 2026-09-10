// ===========================================================================
// recipeRules.js
//
// Pre-flight check for recipes, before anything reaches a printed menu.
//
// Fire Watch audits finished menus. By then the mistake is already printed.
// This runs at the point the mistake is made: someone writes a recipe from
// what's behind the bar rather than from the APL, and nobody notices until a
// supplier report bills a placement the venue was never approved for.
//
// Deliberately NO model call. The Swingers Fall LTO run got "Absolut Vanilla"
// wrong twice — once flagging it as a naming error, once counting it against
// ABSOLUT — and both were the model getting a MATCH wrong. Matching is the
// one thing that should be code: same answer every time, and you can point at
// the line that produced it. This also means the check is instant and free,
// so it can run on every keystroke.
// ===========================================================================

import { offAplTokens, matchesAplBrand, tokensMatch } from './aplParser';

// Words that describe an ingredient rather than name a brand. An ingredient
// is treated as generic ONLY when every one of its words is in here, so
// "Absolut Vanilla" and "Angostura Aromatic Bitters" survive even though
// "vanilla" and "bitters" are listed.
const GENERIC_WORDS = new Set([
  // produce and aromatics
  'lemon', 'lime', 'orange', 'grapefruit', 'pineapple', 'cranberry', 'apple',
  'pear', 'peach', 'mango', 'strawberry', 'raspberry', 'blackberry', 'cherry',
  'cucumber', 'watermelon', 'coconut', 'banana', 'blood', 'yuzu', 'passion',
  'fruit', 'mint', 'basil', 'rosemary', 'thyme', 'sage', 'lavender', 'olive',
  'olives', 'celery', 'jalapeno', 'chili', 'chilli',
  // spices and flavourings
  'ginger', 'cinnamon', 'nutmeg', 'clove', 'cloves', 'allspice', 'spice',
  'spiced', 'pumpkin', 'vanilla', 'cardamom', 'star', 'anise', 'pepper',
  'peppercorn', 'salt', 'sugar', 'honey', 'maple', 'agave', 'demerara',
  'turbinado', 'molasses', 'caramel', 'chocolate', 'cocoa', 'coffee',
  'espresso', 'tea', 'blossom', 'floral', 'elderflower', 'hibiscus',
  // preparations
  'syrup', 'puree', 'juice', 'water', 'soda', 'tonic', 'club', 'cordial',
  'shrub', 'oleo', 'saccharum', 'tincture', 'foam', 'egg', 'white', 'whites',
  'yolk', 'cream', 'milk', 'oat', 'almond', 'half', 'brine', 'reduction',
  'infusion', 'infused', 'bitters', 'aromatic',
  // qualifiers and noise
  'house', 'housemade', 'homemade', 'made', 'fresh', 'freshly', 'squeezed',
  'simple', 'rich', 'hot', 'cold', 'chilled', 'iced', 'ice', 'crushed',
  'garnish', 'garnished', 'rim', 'rimmed', 'twist', 'wedge', 'wheel', 'peel',
  'zest', 'zested', 'expressed', 'dash', 'dashes', 'splash', 'top', 'topped',
  'float', 'floated', 'rinse', 'barspoon', 'spoon', 'drop', 'drops', 'pinch',
  'of', 'and', 'with', 'a', 'an', 'to', 'taste', 'optional', 'sprig', 'leaves',
  'all', 'some', 'plus', 'or',
]);

// Leading measurements: "2 oz", "1.5oz", "0.75 oz", "3 dashes", "½ part".
const MEASURE_RE =
  /^\s*(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾⅓⅔⅛])\s*(?:oz|ounce|ounces|ml|cl|l|liter|litre|dash(?:es)?|tsp|teaspoons?|tbsp|tablespoons?|barspoons?|parts?|splash(?:es)?|drops?|pinch(?:es)?|shots?|bottles?|cans?|cups?)?\.?\s+/i;

// "5 bottles of Samuel Adams Seasonal Rotator for $35 ($9 a bottle)" — an
// offer line, not a recipe. It still names a product that has to be approved.
const OFFER_RE = /^\s*\d+\s+bottles?\b/i;

const clean = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Split pasted text into drinks.
//
// Text lifted out of a PDF wraps mid-ingredient, so lines cannot be trusted as
// record boundaries. A line starts a NEW drink only when it opens with a short
// label followed by a dash ("Cocktail 2 - ...") or is a bottle offer.
// Everything else continues the drink above it.
// ---------------------------------------------------------------------------

export function parseRecipes(text) {
  const lines = String(text || '').split(/\r?\n/);
  const drinks = [];
  let current = null;

  const startsDrink = (line) => {
    const m = line.match(/^\s*(.{1,45}?)\s+[-–—:]\s+(.*)$/);
    return m ? { name: clean(m[1]), rest: m[2] } : null;
  };

  for (const line of lines) {
    if (!clean(line)) continue;

    const started = startsDrink(line);
    if (started) {
      current = { name: started.name, body: started.rest };
      drinks.push(current);
      continue;
    }

    if (OFFER_RE.test(line)) {
      current = { name: 'Bottle offer', body: clean(line), isOffer: true };
      drinks.push(current);
      continue;
    }

    if (current) current.body += ' ' + clean(line);
    else {
      current = { name: 'Untitled', body: clean(line) };
      drinks.push(current);
    }
  }

  return drinks.map((d) => ({
    name: d.name,
    isOffer: !!d.isOffer,
    ingredients: splitIngredients(d.body, d.isOffer),
  }));
}

function splitIngredients(body, isOffer) {
  let text = clean(body);

  if (isOffer) {
    // "5 bottles of X for $35 ($9 a bottle single price)" -> "X"
    text = text
      .replace(/^\s*\d+\s+bottles?\s+(?:of\s+)?/i, '')
      .replace(/\s+for\s+\$[\d.,]+.*$/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '');
    return [clean(text)].filter(Boolean);
  }

  return text
    .split(/[,;]|\band\b/i)
    .map((part) =>
      clean(part)
        .replace(MEASURE_RE, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/[.\s]+$/, '')
    )
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Verdict for one ingredient.
//
//   approved   — matches an APL row outright
//   variant    — the BRAND is on the APL but this expression is not. This is
//                the Absolut Vanilla / Seedlip Notas de Agave case, and it is
//                the whole reason the tool exists: it looks approved at a
//                glance and it is not.
//   unlisted   — a branded product with nothing like it on the APL
//   generic    — an ingredient, not a product. Ignored.
// ---------------------------------------------------------------------------

export function checkIngredient(raw, aplBrands) {
  const name = clean(raw);
  if (!name) return null;

  const tokens = offAplTokens(name);
  if (tokens.length === 0 || tokens.every((t) => GENERIC_WORDS.has(t))) {
    return { name, verdict: 'generic' };
  }

  const hit = matchesAplBrand(name, aplBrands);
  if (hit) {
    return {
      name,
      verdict: 'approved',
      aplName: hit.name,
      supplier: hit.supplier,
      category: hit.category || '',
    };
  }

  // Which APL rows belong to the same brand family? Keyed on the leading
  // word — except that a short leading word is not distinctive enough to key
  // on. "St. Elizabeth Allspice Dram" matched "St~Germain Elderflower" on a
  // shared "St" and told the writer to substitute an elderflower liqueur for
  // an allspice dram. Short leading words take the first TWO words instead.
  const familyKey = (t) =>
    t[0].length >= 4 || t.length < 2 ? t.slice(0, 1) : t.slice(0, 2);
  const want = familyKey(tokens);

  // Family keying uses exact words, or a single-character typo in a long
  // word — NOT the prefix rule the general matcher allows. With prefixes,
  // "White Claw Black Cherry" keyed on "white" and pulled in "Whitehaven",
  // so a misspelled seltzer was offered a Sauvignon Blanc as its substitute.
  const sameFamilyToken = (a, b) =>
    a === b || (a.length >= 6 && b.length >= 6 && tokensMatch(a, b) && !b.startsWith(a) && !a.startsWith(b));

  const seenAlt = new Set();
  const alternatives = (aplBrands || []).filter((b) => {
    const aplTokens = offAplTokens(b.name);
    if (aplTokens.length === 0) return false;
    const have = familyKey(aplTokens);
    if (have.length !== want.length) return false;
    if (!want.every((t, i) => sameFamilyToken(t, have[i]))) return false;
    // One APL row can be cross-listed on two tabs (White Claw sits under
    // both RTDs and BEER). Offering the same substitute twice reads as noise.
    const k = b.name.toLowerCase();
    if (seenAlt.has(k)) return false;
    seenAlt.add(k);
    return true;
  });

  if (alternatives.length) {
    // Two different problems wear the same face here, and they need different
    // answers from whoever wrote the recipe:
    //
    //   naming  — every word the menu uses appears in an approved row. Same
    //             product, written short. "Bailey's Irish Cream" is
    //             "Baileys Original Irish Cream". Write it out; nothing to
    //             re-spec.
    //   variant — the menu adds a word no approved row carries. That is a
    //             different SKU the venue is not approved to pour, and it is
    //             the one that has to change. "Absolut Vanilla" against an
    //             APL of ABSOLUT / CITRON / ELYX.
    const sameProduct = alternatives.find((b) => {
      const aplTokens = offAplTokens(b.name);
      return tokens.every((t) => aplTokens.some((a) => tokensMatch(t, a)));
    });

    if (sameProduct) {
      return {
        name,
        verdict: 'naming',
        aplName: sameProduct.name,
        supplier: sameProduct.supplier,
      };
    }

    return {
      name,
      verdict: 'variant',
      alternatives: alternatives.map((b) => ({
        name: b.name,
        supplier: b.supplier,
      })),
    };
  }

  return { name, verdict: 'unlisted' };
}

export function checkRecipes(text, aplBrands) {
  const drinks = parseRecipes(text).map((d) => ({
    ...d,
    ingredients: d.ingredients
      .map((i) => checkIngredient(i, aplBrands))
      .filter(Boolean),
  }));

  const all = drinks.flatMap((d) => d.ingredients);
  const counts = {
    approved: all.filter((i) => i.verdict === 'approved').length,
    naming: all.filter((i) => i.verdict === 'naming').length,
    variant: all.filter((i) => i.verdict === 'variant').length,
    unlisted: all.filter((i) => i.verdict === 'unlisted').length,
    generic: all.filter((i) => i.verdict === 'generic').length,
  };
  // Naming is a copy fix, not a re-spec. Counted separately so it can't pad
  // the number that decides whether a menu is ready to print.
  counts.blockers = counts.variant + counts.unlisted;

  return { drinks, counts };
}
