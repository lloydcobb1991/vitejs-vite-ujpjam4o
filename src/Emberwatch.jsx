import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  Flame,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Mail,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Send,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import MenuDropzone from './MenuDropzone';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The Railway-hosted backend. Switching this URL is how you swap servers.
const API_BASE = 'https://emberwatch-api-production.up.railway.app';

// ---------------------------------------------------------------------------
// Contacts. Venue-manager addresses live in Airtable and are reached through
// the Railway API, never directly — an Airtable key in the frontend would ship
// inside the browser bundle for anyone to read.
//
// Every call here degrades silently. If the /api/contacts endpoints aren't
// deployed yet, the recipient UI still works exactly as normal; it just won't
// remember addresses between runs.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (s) => EMAIL_RE.test(String(s || '').trim());

async function fetchContacts() {
  try {
    const res = await fetch(`${API_BASE}/api/contacts`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.contacts) ? data.contacts : null;
  } catch (_) {
    return null;
  }
}

async function saveContacts(entries) {
  if (!entries || entries.length === 0) return;
  try {
    await fetch(`${API_BASE}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: entries }),
    });
  } catch (_) {
    // Non-fatal. The emails have already gone out by this point; losing an
    // address-book entry is a nuisance, not a failure worth alarming anyone
    // about mid-send.
  }
}

// Contacts explicitly associated with a venue.
function matchContacts(contacts, location) {
  const loc = String(location || '').trim().toLowerCase();
  if (!loc) return [];
  return contacts.filter((c) =>
    (c.locations || []).some((l) => String(l).trim().toLowerCase() === loc)
  );
}

// ---------------------------------------------------------------------------
// APL Brand Data
// ---------------------------------------------------------------------------

const APL_DATA = {
  brands: [
    { name: 'Absolut', supplier: 'PERNOD RICARD' },
    { name: 'Absolut Citron', supplier: 'PERNOD RICARD' },
    { name: 'Absolut Elyx', supplier: 'PERNOD RICARD' },
    { name: 'Chopin', supplier: 'CHOPIN' },
    { name: 'Grey Goose', supplier: 'BACARDI' },
    { name: 'Ketel One', supplier: 'DIAGEO' },
    { name: 'Ketel One Botanical Cucumber & Mint Vodka', supplier: 'DIAGEO' },
    { name: 'New Amsterdam', supplier: 'GALLO' },
    { name: "Tito's Handmade", supplier: 'FIFTH GENERATION' },
    { name: "Angel's Envy Bourbon", supplier: 'BACARDI' },
    { name: 'Bulleit Bourbon', supplier: 'DIAGEO' },
    { name: 'Buffalo Trace Bourbon', supplier: 'SAZERAC' },
    { name: 'Crown Royal Canadian Whisky', supplier: 'DIAGEO' },
    { name: "Jack Daniel's Tennessee Whiskey", supplier: 'BROWN FORMAN' },
    { name: 'Jameson Irish Whiskey', supplier: 'PERNOD RICARD' },
    { name: 'Jim Beam Bourbon', supplier: 'BEAM SUNTORY' },
    { name: "Maker's Mark 46 Bourbon", supplier: 'BEAM SUNTORY' },
    { name: 'Woodford Reserve Bourbon', supplier: 'BROWN FORMAN' },
    { name: 'Rittenhouse Rye Whiskey', supplier: 'HEAVEN HILL' },
    { name: 'Appleton Estate 12 Year Rare Blend', supplier: 'CAMPARI' },
    { name: 'BACARDÍ Superior', supplier: 'BACARDI' },
    { name: 'Captain Morgan Original Spiced', supplier: 'DIAGEO' },
    { name: 'Don Q Cristal', supplier: 'SERRALLES' },
    { name: "Gosling's Black Seal", supplier: 'CASTLE BRANDS/PR' },
    { name: 'Malibu Coconut', supplier: 'PERNOD RICARD' },
    {
      name: "Planteray Stiggins' Fancy Pineapple Rum",
      supplier: 'MAISON FERRAND',
    },
    { name: 'Aviation American Gin', supplier: 'AVIATION/DIAGEO' },
    { name: "Hendrick's Gin", supplier: 'WILLIAM GRANT' },
    { name: 'Mr. Pickles Gin', supplier: 'WOLF SPIRITS' },
    { name: 'Tanqueray London Dry Gin', supplier: 'DIAGEO' },
    { name: 'The Botanist Islay Dry Gin', supplier: 'REMY COINTREAU' },
    { name: 'Casamigos Blanco Tequila', supplier: 'CASAMIGOS/DIAGEO' },
    { name: 'Don Julio Blanco', supplier: 'DIAGEO' },
    { name: 'Espolón Blanco Tequila', supplier: 'CAMPARI' },
    { name: 'Espolón Reposado Tequila', supplier: 'CAMPARI' },
    { name: 'Jose Cuervo Especial Silver', supplier: 'PROXIMO' },
    { name: 'La Gritona Reposado Tequila', supplier: 'LA GRITONA' },
    { name: '818 Reposado Tequila', supplier: 'SAZERAC' },
    { name: 'Bosscal Mezcal', supplier: 'BOSSCAL' },
    { name: 'Ilegal Mezcal', supplier: 'BACARDI' },
    { name: 'Christian Brothers VSOP', supplier: 'HEAVEN HILL' },
    { name: 'Hennessy V.S Cognac', supplier: 'MOET HENNESSY' },
    { name: 'Martell Blue Swift VSOP', supplier: 'PERNOD RICARD' },
    { name: 'Remy Martin 1738', supplier: 'REMY COINTREAU' },
    { name: 'Aperol Aperitivo Liqueur', supplier: 'CAMPARI' },
    { name: "Cointreau L'Unique Orange Liqueur", supplier: 'REMY COINTREAU' },
    { name: 'Grand Marnier Liqueur', supplier: 'CAMPARI' },
    { name: 'St-Germain Elderflower Liqueur', supplier: 'BACARDI' },
    { name: "Pimm's No. 1 Cup Liqueur", supplier: 'DIAGEO' },
    { name: 'Caravella Limoncello', supplier: 'SAZERAC' },
    { name: "Barrow's Intense Ginger Liqueur", supplier: 'TRELLIS' },
    { name: 'Amaro Nonino Quintessentia', supplier: 'TERLATO' },
    { name: 'Carpano Antica Formula', supplier: 'BRANCA' },
    { name: 'Campari Aperitivo', supplier: 'CAMPARI' },
    { name: 'Fever-Tree Ginger Beer', supplier: 'FEVER-TREE' },
    { name: 'Mionetto Prosecco', supplier: 'MIONETTO' },
  ],
};

// ===========================================================================
// Main component
// ===========================================================================

export default function Emberwatch() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [view, setView] = useState('upload'); // 'upload' | 'results' | 'email'
  const [customApl, setCustomApl] = useState(null); // { name, brands } or null
  const [aplError, setAplError] = useState(null);
  const aplInputRef = useRef(null);

  // Active APL: custom if uploaded, else built-in.
  const activeApl = customApl || { name: 'Built-in APL', brands: APL_DATA.brands };

  const handleFilesChange = (files) => {
    setUploadedFiles(files);
    setResults(null);
    setError(null);
  };

  // ----- Custom APL upload -----

  const handleAplUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAplError(null);

    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let brands;

      if (ext === 'xlsx' || ext === 'xls') {
        // Parse Excel via SheetJS. Try a flat parse on sheet 1 first (handles
        // simple "Brand Name | Supplier" spreadsheets). If that fails, fall
        // back to the structured parser that walks multi-block layouts across
        // every sheet.
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        try {
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          brands = parseAplRows(rows);
        } catch (flatErr) {
          // Flat parse couldn't find headers — try structured parsing
          brands = parseStructuredXlsxApl(workbook);
        }
      } else {
        // CSV path
        const text = await file.text();
        brands = parseAplCsv(text);
      }

      if (brands.length === 0) {
        throw new Error(
          'No brands found. Make sure the file has "Brand Name" and "Supplier" columns, or a SUPPLIER header next to each category.'
        );
      }

      setCustomApl({ name: file.name, brands });
    } catch (err) {
      console.error('APL parse error:', err);
      setAplError(err.message || 'Could not read this APL file.');
      setCustomApl(null);
    }

    // Reset the input so re-selecting the same file re-fires onChange
    if (aplInputRef.current) aplInputRef.current.value = '';
  };

  const clearCustomApl = () => {
    setCustomApl(null);
    setAplError(null);
  };

  const analyzeMenus = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one menu PDF');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProgress('Converting PDFs...');

    try {
      const fileDataPromises = uploadedFiles.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({ name: file.name, base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(fileDataPromises);
      const menuAnalyses = [];
      const failedMenus = [];
      let accountFailure = null;

      for (let i = 0; i < filesData.length; i++) {
        const fileData = filesData[i];
        setProgress(
          `Analyzing ${fileData.name} (${i + 1}/${filesData.length})...`
        );

        // Isolate each menu. A single bad/unparseable response must NOT abort
        // the whole batch — record the failure and keep going. This is what
        // prevents "one menu out of 38 kills all 38."
        try {
          const analysis = await analyzeMenuWithClaude(fileData);
          menuAnalyses.push({
            location: extractLocation(fileData.name),
            filename: fileData.name,
            ...analysis,
          });
        } catch (menuErr) {
          console.error(`Failed to analyze ${fileData.name}:`, menuErr);
          const msg = menuErr.message || String(menuErr);
          failedMenus.push({
            filename: fileData.name,
            location: extractLocation(fileData.name),
            error: msg,
          });
          if (msg.startsWith('ACCOUNT:')) {
            accountFailure = msg.replace('ACCOUNT: ', '');
            break;
          }
        }
      }

      // An account-level abort means the run is INCOMPLETE, not partial.
      // Fail loudly so nobody emails half a batch as billable impressions.
      if (accountFailure) {
        const attempted = menuAnalyses.length + failedMenus.length;
        throw new Error(
          `${accountFailure} Stopped after ${attempted} of ${filesData.length} menus — ${
            filesData.length - attempted
          } not attempted. Fix the account issue, then re-run the full batch.`
        );
      }

      // Only a total wipeout is a hard error. Any partial success still renders.
      if (menuAnalyses.length === 0) {
        throw new Error(
          `All ${filesData.length} menus failed to analyze. First error: ${
            failedMenus[0]?.error || 'unknown'
          }`
        );
      }

      setProgress('Aggregating results...');
      const aggregated = aggregateBySupplier(menuAnalyses);
      const offApl = aggregateOffApl(menuAnalyses);

      setResults({ menuAnalyses, aggregated, offApl, failedMenus });
      setView('results');
      setProgress('');
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error('Error:', err);
      setProgress('');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeMenuWithClaude = async ({ name, base64 }) => {
    const brandList = activeApl.brands
      .map((b) => `- ${b.name} (${b.supplier})`)
      .join('\n');

    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Analyze this cocktail menu for APL brand impressions.

**APL BRANDS:**
${brandList}

**TASK:**
1. Scan the entire menu — every page, every section, every panel, every list, every cocktail title, every image and its surrounding text. Cocktail recipes, spirits lists, mixers, soft drinks, by-the-glass sections, side panels, captions, sidebar boxes, cocktail photography — every visible piece of content is in scope.
2. For each APL brand from the list above, count every time it appears anywhere on the menu. Each appearance is 1 impression, whether it's in a cocktail recipe, a spirits list, a cocktail title, image callout text, or a brand visible in an image.
3. The same brand appearing in multiple places counts each time. If "Fever-Tree Ginger Beer" appears in 3 cocktail recipes AND in a mixer list, that's 4 impressions. If "Ketel One" appears in an espresso martini recipe AND on a visible bottle in the cocktail's image, that's 2 impressions for that single drink.
4. Flag compliance issues only for genuinely problematic mentions (see below).

**STRICT APL ENFORCEMENT (critical):**
ONLY count brands that appear in the APL list above. Do not include any brand that is not explicitly in the APL, even if you recognize it as a well-known spirit/beer/wine brand.

Examples of what NOT to do:
- Menu mentions "Ole Smoky Salty Caramel Whiskey" but it's not in the APL → DO NOT include it in brand_impressions.
- Menu mentions "Don Julio Reposado" but the APL only lists "Don Julio Blanco" and "Don Julio 1942" → DO NOT include "Don Julio Reposado" as a separate brand. (You may NOT count it against Don Julio Blanco either — it's a different SKU.)
- Menu mentions "Fever Tree Tonic Water" but the APL only lists "Fever-Tree Ginger Beer" → DO NOT count Tonic Water mentions.

Non-APL brands should be **silently ignored**. Do NOT flag them as compliance issues. Do NOT add them to brand_impressions. They are simply out of scope for this analysis.

The exception: if a menu mention is an ABBREVIATION of an APL brand (per "Matching Abbreviated Names" below), it counts as a hit for that APL brand. E.g., "Ketel One Cucumber & Mint" on a menu is an abbreviation of "Ketel One Botanical Cucumber & Mint Vodka" in the APL — count it for the APL entry.

**WHAT COUNTS AS AN APPEARANCE:**
- The brand name is written in a cocktail recipe ingredient list
- The brand name is listed in a spirits/cocktail/wine/beer inventory section
- The brand name is listed in a mixers, soft drinks, or non-alcoholic panel
- The brand name appears in any sidebar, callout box, featured-product section, or pricing list
- **The brand name appears in a cocktail's name/title.** Example: "Ole Skrewball Old Fashioned" → 1 impression for "Skrewball Peanut Butter Whiskey" from the title (in addition to any impressions from the ingredient list).
- **Text near or beside a cocktail image that names a brand.** Example: a featured-drink image with adjacent callout text "Made with Ketel One" → 1 impression. This is counted separately from any ingredient-list mention of the same brand for the same drink.
- **A brand visible in an image** — on a bottle label, on branded glassware, on a garnish pick, or anywhere else the brand identity is visually present in the photograph. Example: an espresso martini photo with a recognizable Ketel One bottle in the shot → 1 impression. Be cautious here: only count brands you can identify with reasonable confidence from visual features (label text you can read, distinctive bottle shape, prominent logo).
- Abbreviated forms count too (see "Matching Abbreviated Names" below)

**Each surface is counted separately.** A single featured cocktail can produce multiple impressions for the same brand if the brand appears (1) in the recipe ingredients, (2) in callout text beside the image, AND (3) on a visible bottle in the image. Suppliers pay for surface visibility, not unique drinks.

**TAG THE SOURCE OF EACH MENTION (this enables auditing):**
In the "cocktails" array for each brand, tag the source so impressions can be traced back to the menu:
- Recipe ingredient: no tag needed → "Espresso Martini"
- Cocktail title mention: "Ole Skrewball Old Fashioned (title)"
- Image callout text: "Espresso Martini (image text)"
- Brand visible in image: "Espresso Martini (image)"
- Spirits/mixer list: "Spirits List"

If the same cocktail produces multiple impressions for one brand, list each source as a separate array entry. Example: "cocktails": ["Espresso Martini", "Espresso Martini (image text)", "Espresso Martini (image)"]

**WHAT DOES NOT COUNT (rare but important):**
- Brand mentioned in negative context: "we don't carry X," "X is unavailable," "alternative to X"
- Brand in copyright/legal footer or trademark disclaimer
- Brand referenced as inspiration without being used: "inspired by X" without X being an actual ingredient
- Brand in allergen warnings or compliance text that isn't a product listing

When in doubt: if the brand name is on the menu as something the venue carries, lists, or uses — count it.

**MATCHING ABBREVIATED NAMES (this is critical):**
Menus often abbreviate brand names. When the abbreviation is unambiguous, count it as an impression of the full product. Examples from real menus:
- "Ketel One Cucumber & Mint" → counts as "Ketel One Botanical Cucumber & Mint Vodka"
- "Tito's" or "Tito's Handmade" → counts as "Tito's Handmade"
- "Maker's Mark" or "Maker's 46" → counts as "Maker's Mark 46 Bourbon"
- "Angel's Envy" → counts as "Angel's Envy Bourbon"
- "Espolón Blanco" or "Espolòn Blanco" (with or without accent) → counts as "Espolón Blanco Tequila"
- "BACARDÍ Superior" or "Bacardi" → counts as "BACARDÍ Superior"
- "Jack Daniel's" → counts as "Jack Daniel's Tennessee Whiskey"
- "Tanqueray" → counts as "Tanqueray London Dry Gin"
- "Bulleit" → counts as "Bulleit Bourbon"
- "Crown Royal" → counts as "Crown Royal Canadian Whisky"

If an abbreviation could refer to multiple APL products (e.g., "Don Julio" could be Blanco or Reposado), use surrounding context. If still ambiguous, count it under the most basic/common variant and note it under compliance.

**WHAT IS NOT A COMPLIANCE ISSUE:**
Reasonable abbreviations on a menu are normal and acceptable. Do NOT flag these as compliance issues:
- "Ketel One Cucumber & Mint" (clearly the Botanical product)
- "Tito's" (clearly Tito's Handmade)
- "Maker's Mark 46" (just shorthand for the full name)
- Any abbreviation listed in the matching examples above

**WHAT IS a compliance issue (YOU MUST FLAG THESE — this section matters):**
When an APL brand is mentioned on the menu but the rendering is genuinely problematic, flag it. Be proactive — if you're unsure whether a mention qualifies, lean toward flagging it. This is a key part of the tool's value. Flag:

- **Incomplete brand names that are ambiguous or undersell the brand.** Examples:
  - Menu says "Jack" or "Jack Daniel's" → APL has "Jack Daniel's Tennessee Whiskey". Flag — the menu should include the full product name.
  - Menu says "Absolut Vodka" → APL has "Absolut". Flag if the menu adds a generic descriptor that's not part of the official brand name, OR omits the variant (e.g., menu says "Absolut" generically when the APL distinguishes Absolut/Absolut Citron/Absolut Elyx).
  - Menu says "Crown" or "Crown Royal" → APL has "Crown Royal Canadian Whisky". Flag — too generic to identify the SKU.
  - Menu says "Jim" or "Jim Beam" → APL has "Jim Beam Bourbon". Flag — missing the product specifier.
- **Misspellings of brand names.** "Bacardy" instead of "Bacardi", "Hennesy" instead of "Hennessy", etc.
- **Wrong product variants** — menu lists one variant in the ingredients but the recipe context suggests another (e.g., menu says "Don Julio Blanco" in a recipe that would typically use Reposado). Flag for review.
- **Inconsistent renderings of the same brand within one menu** — if the same APL brand appears two different ways on the same menu (e.g., "Tito's Handmade" in one recipe and just "Tito's Vodka" in another), flag the inconsistency.

**IMPORTANT — DISTINGUISHING OFF-APL FROM COMPLIANCE ISSUES:**
- If a brand on the menu is NOT in the APL at all (e.g., menu mentions "Ole Smoky" but Ole Smoky is nowhere in the APL list) → silently ignore. Do not flag.
- If a brand on the menu IS in the APL but is written incorrectly (incomplete, misspelled, wrong variant) → FLAG IT as a compliance issue.

The distinction: off-APL = out of scope, ignore. APL brand rendered poorly = flag for client awareness.

**SEPARATELY — OFF-APL BRANDS PRESENT (internal review only, NOT billed):**
In addition to everything above, produce a SEPARATE list of the notable branded products that appear on this menu but are NOT in the APL. This is an awareness list so our team can eyeball what competing / non-APL brands the venue carries. It is completely independent from the impression count.

Hard rules for this list:
- These do NOT count as impressions. Do NOT add them to brand_impressions.
- These are NOT compliance issues. Do NOT add them to compliance_issues.
- Include only NAMED, branded products — proper-noun spirit/beer/wine/liqueur/RTD brands that are not in the APL. Examples on a typical menu: "Ole Smoky Salty Caramel Whiskey", "Don Julio Reposado", "Skrewball Peanut Butter Whiskey", non-APL Seedlip variants (e.g. "Seedlip Grove 42", "Seedlip Garden 108"), "Bulleit" if absent from the APL, competitor beers/wines by name.
- Do NOT include generic ingredients or non-branded items: juices, "simple syrup", "mint", "lime juice", "egg white", "house-made cinnamon syrup", produce, or category words like "vodka" / "tequila". Only real brand names.
- List each off-APL brand ONCE, with every place it appears collected in "where".

Return this as an "off_apl_brands" array. If you find none, return an empty array [].

**ALWAYS return the compliance_issues array.** If you genuinely find no compliance issues, return an empty array like "compliance_issues": []. Never omit the field. Always look for issues before declaring there are none — be proactive about finding them.

**RETURN ONLY THIS JSON STRUCTURE - these three top-level fields only, no recipe text:**
\`\`\`json
{
  "brand_impressions": {
    "Brand Name": {
      "count": 4,
      "supplier": "SUPPLIER",
      "cocktails": ["Cocktail Name", "Cocktail Name (image text)", "Cocktail Name (image)", "Spirits List"]
    }
  },
  "compliance_issues": [
    {
      "type": "incomplete_name",
      "found_text": "Jack",
      "correct_name": "Jack Daniel's Tennessee Whiskey",
      "cocktail": "Cocktail Name"
    }
  ],
  "off_apl_brands": [
    {
      "name": "Ole Smoky Salty Caramel Whiskey",
      "category": "whiskey",
      "where": ["Ole Skrewball Old Fashioned", "Salty Caramel Whiskey Espresso Martini", "Spirits List"]
    }
  ]
}
\`\`\`

For spirits list mentions, use "Spirits List" as the cocktail name.

**CRITICAL — BRAND NAME FORMATTING IN JSON KEYS:**
The "Brand Name" key in your JSON response MUST be just the brand name. Do NOT include the supplier in parentheses. Do NOT include region/origin descriptors that appear after the brand name in the APL list.

Examples:
- APL list shows: "- Ketel One (DIAGEO)" → JSON key: "Ketel One"
- APL list shows: "- Appleton Estate 12-year Rare Blend (Jamacian) (CAMPARI)" → JSON key: "Appleton Estate 12-year Rare Blend"
- APL list shows: "- Zacapa 23 (Guatemala) (DIAGEO)" → JSON key: "Zacapa 23"
- APL list shows: "- Don Q Cristal + (light spanish) (SERRALLES)" → JSON key: "Don Q Cristal"
- APL list shows: "- Oban - 14 year old (Highland) (DIAGEO)" → JSON key: "Oban 14 year old" (strip "- " and "(Highland)")
- APL list shows: "- Macallan Glenrothes - 18 year old (Speyside) (EDRINGTON)" → JSON key: "Macallan Glenrothes 18 year old"

Always put the supplier in the separate "supplier" field, never in the brand name key. Always strip trailing region/origin descriptors. The brand name should be clean and consistent so identical brands across multiple menus aggregate correctly.

**USE THE APL CANONICAL FORM AS THE KEY, NOT THE MENU'S WORDING.**
Regardless of how the menu writes a brand, use the cleaned APL form as the JSON key. Examples:
- Menu says "Oban 14yr" → APL has "Oban - 14 year old (Highland)" → JSON key: "Oban 14 year old"
- Menu says "Maker's 46" → APL has "Maker's Mark 46 Bourbon" → JSON key: "Maker's Mark 46 Bourbon"
- Menu says "Tito's" → APL has "Tito's Handmade" → JSON key: "Tito's Handmade"

This ensures the same brand reported across multiple menus aggregates into one row, not multiple rows for different abbreviations.

ONLY respond with JSON. Do not include a "cocktails" array or "recipe_text" anywhere.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      // Surface WHY it failed, not just the status. The body is where Anthropic
      // (or the Railway proxy) explains itself: page limits, size limits,
      // "prompt is too long", body-parser rejections, etc. Without this we were
      // throwing away the only useful diagnostic.
      let detail = '';
      try {
        const errText = await response.text();
        try {
          const errJson = JSON.parse(errText);
          detail =
            errJson?.error?.message ||
            errJson?.message ||
            (typeof errJson?.error === 'string' ? errJson.error : '') ||
            errText;
        } catch (_) {
          detail = errText; // not JSON — use raw text (e.g. Express "PayloadTooLargeError")
        }
      } catch (_) {
        // couldn't read body — fall back to bare status
      }
      detail = String(detail || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
      // Classify account-level failures separately. These fail EVERY
      // remaining menu identically, so the batch loop aborts on them rather
      // than grinding through 39 more calls and reporting 40 vague errors.
      if (
        response.status === 401 ||
        /authentication|invalid x-api-key/i.test(detail)
      ) {
        throw new Error(
          'ACCOUNT: API key rejected (401). Check ANTHROPIC_API_KEY on Railway.'
        );
      }
      if (
        response.status === 402 ||
        /credit balance|insufficient|billing|quota|subscription/i.test(detail)
      ) {
        throw new Error(
          `ACCOUNT: Anthropic billing or credit problem — not a menu problem. ${detail}`
        );
      }
      if (response.status === 429) {
        throw new Error(
          `ACCOUNT: Rate limited (429). Wait a minute and re-run. ${detail}`
        );
      }
      throw new Error(
        `API error: ${response.status}${detail ? ` — ${detail}` : ''}`
      );
    }

    const data = await response.json();
    const text = data.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    // Robust parse. The old code did a single JSON.parse on the whole string,
    // which throws "unexpected non-whitespace character after JSON data" the
    // moment the model appends ANY trailing text (a note, a second block, a
    // stray sentence) after the JSON. parseClaudeJson tolerates that.
    return parseClaudeJson(text);
  };

  const extractLocation = (filename) => {
    if (filename.includes('NYC')) return 'New York City';
    if (filename.includes('LV')) return 'Las Vegas';
    if (filename.includes('DC')) return 'Washington DC';
    return filename.replace(/[^a-zA-Z0-9]/g, ' ');
  };

  const aggregateBySupplier = (menuAnalyses) => {
    const supplierTotals = {};
    // Map: supplier -> lowercased brand -> canonical display name (first seen)
    // So "Absolut" and "ABSOLUT" both bucket into whichever appeared first.
    const canonicalDisplayName = {};

    menuAnalyses.forEach((menu) => {
      Object.entries(menu.brand_impressions || {}).forEach(([brand, data]) => {
        const supplier = data.supplier || 'UNKNOWN';
        const brandKey = brand.trim().toLowerCase();

        if (!supplierTotals[supplier]) {
          supplierTotals[supplier] = { total: 0, brands: {}, locations: {} };
          canonicalDisplayName[supplier] = {};
        }

        // Pick display name: first one we see for this normalized key
        if (!canonicalDisplayName[supplier][brandKey]) {
          canonicalDisplayName[supplier][brandKey] = brand.trim();
        }
        const displayName = canonicalDisplayName[supplier][brandKey];

        supplierTotals[supplier].total += data.count;
        supplierTotals[supplier].brands[displayName] =
          (supplierTotals[supplier].brands[displayName] || 0) + data.count;
        supplierTotals[supplier].locations[menu.location] =
          (supplierTotals[supplier].locations[menu.location] || 0) + data.count;
      });
    });

    return Object.entries(supplierTotals)
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  // Helper for per-menu lookup: find a brand's count in a menu's
  // brand_impressions map, matching case-insensitively.
  const findMenuBrandCount = (menu, brandName) => {
    if (!menu || !menu.brand_impressions) return 0;
    const target = brandName.trim().toLowerCase();
    for (const [name, data] of Object.entries(menu.brand_impressions)) {
      if (name.trim().toLowerCase() === target) {
        return data.count || 0;
      }
    }
    return 0;
  };

  const exportToCSV = () => {
    if (!results) return;

    const rows = [
      ['Supplier', 'Brand', 'NYC', 'Las Vegas', 'Washington DC', 'Total'],
    ];

    results.aggregated.forEach((supplier) => {
      Object.entries(supplier.brands).forEach(([brand, totalCount]) => {
        const nycCount = findMenuBrandCount(
          results.menuAnalyses.find((m) => m.location === 'New York City'),
          brand
        );
        const lvCount = findMenuBrandCount(
          results.menuAnalyses.find((m) => m.location === 'Las Vegas'),
          brand
        );
        const dcCount = findMenuBrandCount(
          results.menuAnalyses.find((m) => m.location === 'Washington DC'),
          brand
        );

        rows.push([
          supplier.supplier,
          brand,
          nycCount,
          lvCount,
          dcCount,
          totalCount,
        ]);
      });
    });

    // Off-APL brands (informational — not billed). Appended as a clearly
    // separated block so it can't be confused with the impression rows above.
    if (results.offApl && results.offApl.length > 0) {
      rows.push([]);
      rows.push(['NOT IN APL (for review — not billed, not emailed)']);
      rows.push(['Brand', 'Category', 'Locations', 'Mentions']);
      results.offApl.forEach((b) => {
        const locs = Object.entries(b.locations)
          .map(([loc, c]) => `${loc} (${c})`)
          .join('; ');
        // Quote the free-text fields so any stray commas don't break columns.
        rows.push([`"${b.name}"`, b.category || '', `"${locs}"`, b.total]);
      });
    }

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firewatch-apl-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----- Rendering -------------------------------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        padding: '40px 20px',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(218, 41, 28, 0.3); }
          50% { box-shadow: 0 0 40px rgba(218, 41, 28, 0.6); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {view === 'upload' && (
        <UploadView
          uploadedFiles={uploadedFiles}
          analyzing={analyzing}
          progress={progress}
          error={error}
          activeApl={activeApl}
          customApl={customApl}
          aplError={aplError}
          aplInputRef={aplInputRef}
          onPickApl={() => aplInputRef.current?.click()}
          onAplUpload={handleAplUpload}
          onClearApl={clearCustomApl}
          onFilesChange={handleFilesChange}
          onAnalyze={analyzeMenus}
        />
      )}

      {view === 'results' && results && (
        <ResultsView
          results={results}
          activeApl={activeApl}
          onNew={() => {
            setResults(null);
            setUploadedFiles([]);
            setView('upload');
          }}
          onExport={exportToCSV}
          onOpenEmail={() => setView('email')}
        />
      )}

      {view === 'email' && results && (
        <EmailReportView
          results={results}
          activeApl={activeApl}
          onBack={() => setView('results')}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Upload view
// ===========================================================================

function UploadView({
  uploadedFiles,
  analyzing,
  progress,
  error,
  activeApl,
  customApl,
  aplError,
  aplInputRef,
  onPickApl,
  onAplUpload,
  onClearApl,
  onFilesChange,
  onAnalyze,
}) {
  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
      {/* APL selection panel */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: customApl ? '2px solid #da291c' : '2px solid #ececec',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#999',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Active APL
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '800',
                color: '#1a1a1a',
                letterSpacing: '-0.3px',
              }}
            >
              {activeApl.name}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginTop: '4px',
                fontWeight: '500',
              }}
            >
              {activeApl.brands.length} brand
              {activeApl.brands.length !== 1 ? 's' : ''} loaded ·{' '}
              {customApl ? 'Custom upload' : 'Using built-in list'}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <input
              ref={aplInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={onAplUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={onPickApl}
              style={{
                background: 'white',
                color: '#da291c',
                border: '2px solid #da291c',
                padding: '12px 22px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Upload size={16} />
              {customApl ? 'Replace APL' : 'Upload Custom APL'}
            </button>
            {customApl && (
              <button
                onClick={onClearApl}
                style={{
                  background: 'transparent',
                  color: '#666',
                  border: '2px solid #ddd',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Use Built-in
              </button>
            )}
          </div>
        </div>

        {aplError && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fff5f5',
              border: '1px solid #da291c',
              borderRadius: '8px',
              color: '#da291c',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} />
            {aplError}
          </div>
        )}

        <div
          style={{
            marginTop: '14px',
            fontSize: '12px',
            color: '#999',
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          Upload a CSV or Excel file with{' '}
          <strong style={{ color: '#666' }}>Brand Name</strong> and{' '}
          <strong style={{ color: '#666' }}>Supplier</strong> columns to use a
          client-specific list instead of the built-in.
        </div>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <MenuDropzone
          files={uploadedFiles}
          onFilesChange={onFilesChange}
          disabled={analyzing}
        />

        <button
          onClick={onAnalyze}
          disabled={analyzing || uploadedFiles.length === 0}
          style={{
            width: '100%',
            background: analyzing ? '#999' : '#da291c',
            color: 'white',
            border: 'none',
            padding: '28px',
            borderRadius: '12px',
            fontSize: '24px',
            fontWeight: '900',
            cursor:
              analyzing || uploadedFiles.length === 0
                ? 'not-allowed'
                : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(218, 41, 28, 0.25)',
          }}
        >
          {analyzing ? (
            <>
              <Flame
                size={24}
                style={{ animation: 'flicker 1s ease-in-out infinite' }}
              />
              {progress}
            </>
          ) : (
            <>
              <TrendingUp size={24} />
              Analyze Menus
            </>
          )}
        </button>

        {error && (
          <div
            style={{
              marginTop: '24px',
              padding: '24px',
              background: '#fff5f5',
              borderRadius: '12px',
              color: '#da291c',
              fontSize: '16px',
              fontWeight: '700',
              border: '2px solid #da291c',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={24} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance-note hygiene, shared by the results screen and the email builder
// so the two can't drift apart.
//
// The model reliably produces three kinds of junk note: ones where the menu
// already matches the APL exactly (and the note itself says so), ones where
// correct_name is prose like "Not in APL" rather than a brand, and ones where
// found_text is a paragraph of reasoning instead of the string on the menu.
// None of them survive here.
// ---------------------------------------------------------------------------

function filterIssues(issues, activeApl) {
  const aplNames = new Set(
    (activeApl?.brands || []).map((b) =>
      String(b.name || '').trim().toLowerCase()
    )
  );
  const isRealAplBrand = (name) =>
    aplNames.size === 0 ||
    aplNames.has(String(name || '').trim().toLowerCase());

  return (issues || []).filter((i) => {
    const found = String(i.found_text || '').trim();
    const correct = String(i.correct_name || '').trim();
    if (!found || !correct) return false;
    if (found.toLowerCase() === correct.toLowerCase()) return false;
    if (found.length > 45) return false;
    return isRealAplBrand(correct);
  });
}

// The cocktail field should hold a drink name. When it holds an explanation,
// keep the first clause and cap it.
function cleanIssueContext(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const first = s.split(/\s[\u2014\u2013-]\s|;|\.\s/)[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}...` : first;
}

// ===========================================================================
// Results view
// ===========================================================================

function ResultsView({ results, activeApl, onNew, onExport, onOpenEmail }) {
  const [newsStatus, setNewsStatus] = useState('idle'); // idle|loading|done|error
  const [news, setNews] = useState(null);
  const [newsError, setNewsError] = useState(null);

  // Same filtering the emails get, so what's on screen matches what goes out.
  const menusWithIssues = results.menuAnalyses
    .map((menu) => ({ menu, issues: filterIssues(menu.compliance_issues, activeApl) }))
    .filter((x) => x.issues.length > 0);

  // Every APL brand that turned up in this batch. Checking only what's on
  // these menus keeps the search count proportional to the run.
  const brandsInBatch = [
    ...new Set(results.aggregated.flatMap((s) => Object.keys(s.brands))),
  ];

  // Records a decision so this finding doesn't resurface next run. Optimistic:
  // the card updates immediately and rolls back only if the write fails.
  const reviewEvent = async (event, status) => {
    setNews((prev) =>
      prev
        ? {
            ...prev,
            events: prev.events.map((e) =>
              e.brand === event.brand && e.source_url === event.source_url
                ? { ...e, status }
                : e
            ),
          }
        : prev
    );
    try {
      const res = await fetch(`${API_BASE}/api/brand-news/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${res.status}`);
      }
    } catch (err) {
      console.error('Review failed:', err);
      setNewsError(`Couldn't save that decision: ${err.message}`);
      setNews((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.map((e) =>
                e.brand === event.brand && e.source_url === event.source_url
                  ? { ...e, status: 'new' }
                  : e
              ),
            }
          : prev
      );
    }
  };

  const checkBrandNews = async () => {
    setNewsStatus('loading');
    setNewsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/brand-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brands: brandsInBatch }),
      });
      // A 404 from Express returns an HTML error page, which blows up
      // res.json() with an unhelpful "Unexpected token '<'".
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        throw new Error(
          res.status === 404
            ? 'Endpoint not found — is brand-news.js mounted in server.js?'
            : `Server returned ${res.status} (not JSON)`
        );
      }
      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
      setNews(data);
      setNewsStatus('done');
    } catch (err) {
      console.error('Brand news failed:', err);
      setNewsError(err.message);
      setNewsStatus('error');
    }
  };

  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
          borderRadius: '20px',
          padding: '40px 50px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '10px',
            }}
          >
            <Flame
              size={48}
              color="white"
              fill="white"
              style={{ animation: 'flicker 2s ease-in-out infinite' }}
            />
            <h1
              style={{
                fontSize: '42px',
                fontWeight: '900',
                color: 'white',
                margin: 0,
                letterSpacing: '-1px',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              Analysis Complete
            </h1>
          </div>
          <p
            style={{
              color: 'rgba(255,255,255,0.95)',
              margin: 0,
              fontWeight: '600',
              fontSize: '18px',
            }}
          >
            {results.menuAnalyses.length} menu
            {results.menuAnalyses.length > 1 ? 's' : ''} analyzed ·{' '}
            {results.aggregated.reduce((sum, s) => sum + s.total, 0)} total
            impressions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onNew}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            New Analysis
          </button>
          <button
            onClick={onOpenEmail}
            style={{
              background: '#1a1a1a',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <Mail size={18} />
            Generate Reports
          </button>
          <button
            onClick={checkBrandNews}
            disabled={newsStatus === 'loading'}
            title="Checks the APL brands on these menus for ownership or distribution changes"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: newsStatus === 'loading' ? 'wait' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={18} />
            {newsStatus === 'loading' ? 'Checking\u2026' : 'Brand Check'}
          </button>
          <button
            onClick={onExport}
            style={{
              background: 'white',
              color: '#da291c',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {results.failedMenus && results.failedMenus.length > 0 && (
          <div
            style={{
              background: '#fff8e6',
              border: '2px solid #ffab00',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                color: '#b26a00',
                fontWeight: '800',
                fontSize: '16px',
              }}
            >
              <AlertTriangle size={20} color="#b26a00" />
              {results.failedMenus.length} menu
              {results.failedMenus.length > 1 ? 's' : ''} couldn't be analyzed —
              results below cover the {results.menuAnalyses.length} that
              succeeded.
            </div>
            <div style={{ fontSize: '13px', color: '#7a5200', lineHeight: '1.7' }}>
              {results.failedMenus.map((f, i) => (
                <div key={i}>
                  • <strong>{f.filename}</strong> — {f.error}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#7a5200',
                marginTop: '10px',
                fontStyle: 'italic',
              }}
            >
              Tip: re-run just the failed file(s) on their own to see the raw
              response, or forward this list to check those menus by hand.
            </div>
          </div>
        )}

        {newsStatus === 'loading' && (
          <div
            style={{
              background: '#fafafa',
              border: '2px solid #e8e8e8',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '32px',
              color: '#666',
              fontWeight: '700',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Flame
              size={20}
              color="#da291c"
              style={{ animation: 'flicker 1s ease-in-out infinite' }}
            />
            Checking {brandsInBatch.length} brands for ownership and
            distribution changes. This runs a web search per brand, so it takes
            a minute.
          </div>
        )}

        {newsStatus === 'error' && (
          <div
            style={{
              background: '#fff5f5',
              border: '2px solid #da291c',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '32px',
              color: '#da291c',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} />
            Brand check failed: {newsError}
          </div>
        )}

        {newsStatus === 'done' && news && (
          <div style={{ marginBottom: '40px' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '900',
                marginBottom: '8px',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={32} color="#b26a00" />
              Brand Check ({news.events.length})
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#666',
                margin: '0 0 24px 0',
                lineHeight: '1.6',
              }}
            >
              {news.checked} brands checked
              {news.cached > 0 && `, ${news.cached} from cache`}
              {news.suppressed > 0 &&
                `, ${news.suppressed} already reviewed and hidden`}
              . Nothing here changes the APL — verify each against its
              source, then update the supplier mapping by hand if it holds up.
              {news.registryError &&
                ' (Review history unavailable — decisions may not stick.)'}
            </p>

            {news.events.length === 0 ? (
              <div
                style={{
                  background: '#f0f9f4',
                  border: '2px solid #28a745',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  color: '#28a745',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <CheckCircle size={20} />
                No ownership or distribution changes found for these brands.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {news.events.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fffdf7',
                      border: '2px solid #ffe1a6',
                      borderRadius: '12px',
                      padding: '20px 24px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginBottom: '8px',
                      }}
                    >
                      <strong style={{ fontSize: '18px', color: '#1a1a1a' }}>
                        {e.brand}
                      </strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#b26a00',
                          background: '#fff3d6',
                          borderRadius: '20px',
                          padding: '4px 12px',
                        }}
                      >
                        {e.type}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color:
                            e.confidence === 'high'
                              ? '#28a745'
                              : e.confidence === 'medium'
                              ? '#b26a00'
                              : '#999',
                          border: '1px solid currentColor',
                          borderRadius: '20px',
                          padding: '3px 10px',
                        }}
                      >
                        {e.confidence} confidence
                      </span>
                      {e.date && (
                        <span style={{ fontSize: '13px', color: '#999', fontWeight: '600' }}>
                          {e.date}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '15px',
                        color: '#1a1a1a',
                        lineHeight: '1.6',
                        marginBottom: e.from || e.to ? '8px' : '10px',
                      }}
                    >
                      {e.summary}
                    </div>

                    {(e.from || e.to) && (
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#666',
                          fontWeight: '700',
                          marginBottom: '10px',
                        }}
                      >
                        {e.from || 'Unknown'} → {e.to || 'Unknown'}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#da291c',
                          fontWeight: '700',
                          textDecoration: 'underline',
                        }}
                      >
                        Verify at source
                      </a>
                      <span style={{ flex: 1 }} />
                      {e.status === 'confirmed' || e.status === 'dismissed' ? (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: e.status === 'confirmed' ? '#28a745' : '#999',
                          }}
                        >
                          {e.status} — won't reappear
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => reviewEvent(e, 'confirmed')}
                            title="Real change. Update the APL supplier mapping by hand."
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '8px 18px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => reviewEvent(e, 'dismissed')}
                            title="Not relevant. Won't be shown again."
                            style={{
                              background: 'transparent',
                              color: '#666',
                              border: '2px solid #ddd',
                              padding: '6px 18px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {news.errors && news.errors.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  fontSize: '13px',
                  color: '#999',
                  fontWeight: '600',
                }}
              >
                {news.errors.length} brand
                {news.errors.length > 1 ? 's' : ''} couldn't be checked:{' '}
                {news.errors.map((x) => x.brand).join(', ')}
              </div>
            )}
          </div>
        )}

        <h2
          style={{
            fontSize: '32px',
            fontWeight: '900',
            marginBottom: '40px',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <TrendingUp size={32} color="#da291c" />
          Impressions by Supplier
        </h2>

        <div style={{ display: 'grid', gap: '24px' }}>
          {results.aggregated.map((supplier, idx) => (
            <div
              key={idx}
              style={{
                border: '3px solid #f0f0f0',
                borderRadius: '16px',
                padding: '40px',
                background: 'linear-gradient(135deg, #fafafa 0%, white 100%)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '30px',
                }}
              >
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: '#1a1a1a',
                    margin: 0,
                  }}
                >
                  {supplier.supplier}
                </h3>
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
                    color: 'white',
                    padding: '14px 32px',
                    borderRadius: '40px',
                    fontSize: '28px',
                    fontWeight: '900',
                    boxShadow: '0 6px 20px rgba(218, 41, 28, 0.3)',
                  }}
                >
                  {supplier.total}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <strong
                  style={{
                    fontSize: '14px',
                    color: '#666',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Brands
                </strong>
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {Object.entries(supplier.brands).map(([brand, count]) => (
                    <span
                      key={brand}
                      style={{
                        background: 'white',
                        padding: '10px 20px',
                        borderRadius: '30px',
                        fontSize: '15px',
                        border: '2px solid #e8e8e8',
                        fontWeight: '700',
                        color: '#1a1a1a',
                      }}
                    >
                      {brand}: <span style={{ color: '#da291c' }}>{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <strong
                  style={{
                    fontSize: '14px',
                    color: '#666',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  By Location
                </strong>
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    gap: '24px',
                    fontWeight: '700',
                    fontSize: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  {Object.entries(supplier.locations).map(([loc, count]) => (
                    <span key={loc} style={{ color: '#1a1a1a' }}>
                      📍 {loc}: <span style={{ color: '#da291c' }}>{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {menusWithIssues.length > 0 && (
          <div style={{ marginTop: '50px' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '900',
                marginBottom: '30px',
                color: '#da291c',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={32} />
              Compliance Issues
            </h2>
            {menusWithIssues.map(
              ({ menu, issues }, idx) => (
                  <div key={idx} style={{ marginBottom: '30px' }}>
                    <h3
                      style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        marginBottom: '20px',
                        color: '#1a1a1a',
                      }}
                    >
                      📍 {menu.location}
                    </h3>
                    {issues.map((issue, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fff5f5',
                          padding: '24px',
                          borderRadius: '12px',
                          borderLeft: '6px solid #da291c',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px',
                          }}
                        >
                          <AlertTriangle size={20} color="#da291c" />
                          <strong
                            style={{ color: '#da291c', fontSize: '16px' }}
                          >
                            {issue.type === 'incomplete_name' &&
                              'INCOMPLETE NAME'}
                          </strong>
                        </div>
                        <div
                          style={{
                            color: '#666',
                            fontSize: '15px',
                            lineHeight: '1.7',
                          }}
                        >
                          <div>
                            Found: "<strong>{issue.found_text}</strong>"
                            {cleanIssueContext(issue.cocktail) && (
                              <>
                                {' '}
                                in <em>{cleanIssueContext(issue.cocktail)}</em>
                              </>
                            )}
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            Should be: "
                            <strong style={{ color: '#28a745' }}>
                              {issue.correct_name}
                            </strong>
                            "
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        )}
        {results.offApl && results.offApl.length > 0 && (
          <div style={{ marginTop: '50px' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '900',
                marginBottom: '8px',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <FileText size={32} color="#b26a00" />
              Not in APL ({results.offApl.length})
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#666',
                margin: '0 0 24px 0',
                lineHeight: '1.6',
              }}
            >
              Branded products found on the menus that aren't in the active APL.
              These are <strong>not counted as impressions</strong> and are{' '}
              <strong>not emailed to suppliers</strong> — listed here so you can
              spot-check coverage and see what else each venue carries.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {results.offApl.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fffdf7',
                    border: '2px solid #ffe1a6',
                    borderRadius: '12px',
                    padding: '18px 20px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#1a1a1a',
                      marginBottom: b.category ? '2px' : '8px',
                    }}
                  >
                    {b.name}
                  </div>
                  {b.category && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#b26a00',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px',
                      }}
                    >
                      {b.category}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    {Object.entries(b.locations).map(([loc, count]) => (
                      <span
                        key={loc}
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#7a5200',
                          background: '#fff3d6',
                          borderRadius: '20px',
                          padding: '4px 12px',
                        }}
                      >
                        {loc}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Email report view
// ===========================================================================

function EmailReportView({ results, activeApl, onBack }) {
  const [emails, setEmails] = useState(() =>
    buildVenueEmails(results, activeApl)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState('review'); // 'review' | 'sending' | 'done'
  const [sendError, setSendError] = useState(null);
  const [sendSummary, setSendSummary] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsStatus, setContactsStatus] = useState('loading'); // loading | ready | unavailable
  const [draftAddr, setDraftAddr] = useState('');
  const [addrError, setAddrError] = useState(null);

  const current = emails[currentIdx];

  // Load the saved address book, then prefill each venue with whoever received
  // that venue's last report. This is the "click once to include" bit - by the
  // time the review screen renders, the usual recipients are already there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchContacts();
      if (cancelled) return;
      if (!list) {
        setContactsStatus('unavailable');
        return;
      }
      setContacts(list);
      setContactsStatus('ready');
      setEmails((prev) =>
        prev.map((e) =>
          e.to.length
            ? e
            : { ...e, to: matchContacts(list, e.location).map((c) => c.email) }
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field, value) => {
    setEmails((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], [field]: value };
      return next;
    });
  };

  // ----- Recipients -----

  const addRecipient = (raw) => {
    const clean = String(raw || '').trim().toLowerCase();
    if (!clean) return;
    if (!isEmail(clean)) {
      setAddrError(`"${clean}" doesn't look like an email address.`);
      return;
    }
    setAddrError(null);
    setEmails((prev) => {
      const next = [...prev];
      const cur = next[currentIdx];
      if (cur.to.includes(clean)) return prev;
      next[currentIdx] = { ...cur, to: [...cur.to, clean] };
      return next;
    });
    setDraftAddr('');
  };

  const removeRecipient = (addr) => {
    setEmails((prev) => {
      const next = [...prev];
      const cur = next[currentIdx];
      next[currentIdx] = { ...cur, to: cur.to.filter((a) => a !== addr) };
      return next;
    });
  };

  // Saved contacts not already on this email, venue matches first.
  const suggestions = (() => {
    if (!current) return [];
    const taken = new Set(current.to);
    const forVenue = matchContacts(contacts, current.location).filter(
      (c) => !taken.has(c.email)
    );
    const venueEmails = new Set(forVenue.map((c) => c.email));
    const others = contacts.filter(
      (c) => !taken.has(c.email) && !venueEmails.has(c.email)
    );
    return [...forVenue, ...others].slice(0, 12);
  })();

  const missingRecipients = emails.filter((e) => e.to.length === 0);

  // ----- Send -----

  const doSend = async (batch) => {
    setSendError(null);

    // Guard. A venue with no recipient would either error out at SendGrid or,
    // worse, silently succeed with nobody on it.
    const blank = batch.filter((e) => e.to.length === 0);
    if (blank.length) {
      setSendError(
        `${blank.length} venue${
          blank.length > 1 ? 's have' : ' has'
        } no recipients: ${blank.map((e) => e.location).join(', ')}`
      );
      return;
    }

    setStep('sending');

    try {
      const res = await fetch(`${API_BASE}/api/send-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: batch.map((e) => ({
            to: e.to, // now an ARRAY of addresses, not a single string
            subject: e.subject,
            body: e.body,
            location: e.location,
            // Back-compat: the existing Railway handler labels results by
            // `supplier`. Sending both means the frontend works against the
            // current backend unchanged.
            supplier: e.location,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setSendSummary(data);
      if (data.failed > 0) {
        setSendError(
          `${data.failed} of ${batch.length} emails failed. See details below.`
        );
      }
      setStep('done');

      // Remember these recipients for next time. Deliberately after the send
      // and deliberately not awaited into the error path.
      saveContacts(
        batch.flatMap((e) =>
          e.to.map((email) => ({ email, location: e.location }))
        )
      );
    } catch (err) {
      console.error('Send failed:', err);
      setSendError(err.message);
      setStep('review');
    }
  };

  const sendAll = () => doSend(emails);
  const sendOne = () => doSend([emails[currentIdx]]);

  // ----- Sending screen -----
  if (step === 'sending') {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '100px auto',
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <Flame
          size={64}
          color="#da291c"
          style={{
            marginBottom: '24px',
            animation: 'flicker 1s ease-in-out infinite',
          }}
        />
        <h2
          style={{
            fontSize: '32px',
            fontWeight: '900',
            color: '#da291c',
            margin: '0 0 12px 0',
            lineHeight: '1.2',
          }}
        >
          Sending Reports
        </h2>
        <p style={{ color: '#666', fontSize: '18px' }}>Sending to venues…</p>
      </div>
    );
  }

  // ----- Done screen -----
  if (step === 'done') {
    const sent = sendSummary?.sent ?? 0;
    const failed = sendSummary?.failed ?? 0;
    const allOk = failed === 0;
    return (
      <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '60px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            border: `4px solid ${allOk ? '#28a745' : '#da291c'}`,
          }}
        >
          <CheckCircle
            size={72}
            color={allOk ? '#28a745' : '#da291c'}
            style={{ marginBottom: '24px' }}
          />
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '900',
              color: allOk ? '#28a745' : '#da291c',
              margin: '0 0 12px 0',
              lineHeight: '1.2',
            }}
          >
            {allOk ? 'Reports Sent' : 'Sent with errors'}
          </h2>
          <p style={{ color: '#666', fontSize: '18px', marginBottom: '32px' }}>
            {sent} sent · {failed} failed
          </p>

          {sendSummary?.results && (
            <div
              style={{
                background: '#fafafa',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
                textAlign: 'left',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {sendSummary.results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #e8e8e8',
                    fontSize: '14px',
                    color: r.status === 'sent' ? '#28a745' : '#da291c',
                    fontWeight: '700',
                  }}
                >
                  {r.status === 'sent' ? '✓' : '✗'}{' '}
                  {r.location || r.supplier}
                  <div
                    style={{
                      color: '#666',
                      fontWeight: '500',
                      fontSize: '13px',
                      marginTop: '4px',
                    }}
                  >
                    {Array.isArray(r.to) ? r.to.join(', ') : r.to}
                  </div>
                  {r.error && (
                    <div
                      style={{
                        color: '#da291c',
                        fontWeight: '500',
                        fontSize: '13px',
                        marginTop: '4px',
                      }}
                    >
                      {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onBack}
            style={{
              background: '#1a1a1a',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // ----- Review screen -----
  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
          borderRadius: '20px',
          padding: '32px 40px',
          marginBottom: '24px',
          boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={36} color="white" />
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '900',
                color: 'white',
                margin: 0,
                letterSpacing: '-1px',
                lineHeight: '1.2',
              }}
            >
              Review &amp; Send Reports
            </h1>
          </div>
          <p
            style={{
              color: 'rgba(255,255,255,0.95)',
              margin: '8px 0 0 0',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {emails.length} venue report{emails.length === 1 ? '' : 's'} ·
            review each before sending
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Back
          </button>
          <button
            onClick={sendOne}
            title="Sends only the venue you're currently viewing - useful for testing to your own inbox"
            style={{
              background: 'white',
              color: '#1a1a1a',
              border: '2px solid #1a1a1a',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Send size={16} />
            Send Test (This One)
          </button>
          <button
            onClick={sendAll}
            disabled={missingRecipients.length > 0}
            title={
              missingRecipients.length > 0
                ? `${missingRecipients.length} venue(s) still need recipients`
                : ''
            }
            style={{
              background: missingRecipients.length > 0 ? '#9bbfa5' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: missingRecipients.length > 0 ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(40, 167, 69, 0.4)',
            }}
          >
            <Send size={18} />
            Approve &amp; Send All
          </button>
        </div>
      </div>

      {sendError && (
        <div
          style={{
            background: '#fff5f5',
            border: '2px solid #da291c',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '24px',
            color: '#da291c',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} />
          {sendError}
        </div>
      )}

      {contactsStatus === 'unavailable' && (
        <div
          style={{
            background: '#fff8e6',
            border: '2px solid #ffab00',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '24px',
            color: '#b26a00',
            fontWeight: '700',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={18} />
          Saved contacts aren't available - the address book endpoint isn't
          responding. You can still type recipients by hand; they just won't be
          remembered for next time.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '24px',
        }}
      >
        {/* Venue list */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            height: 'fit-content',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '800',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 16px 0',
            }}
          >
            Venues ({emails.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {emails.map((e, idx) => {
              const active = currentIdx === idx;
              const noRecipients = e.to.length === 0;
              return (
                <button
                  key={e.location + idx}
                  onClick={() => {
                    setCurrentIdx(idx);
                    setEditing(false);
                    setDraftAddr('');
                    setAddrError(null);
                  }}
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)'
                      : '#fafafa',
                    color: active ? 'white' : '#1a1a1a',
                    border: noRecipients
                      ? '2px solid #ffab00'
                      : '2px solid transparent',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>{e.location}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      opacity: 0.85,
                      fontWeight: '600',
                      marginTop: '4px',
                    }}
                  >
                    {e.totalImpressions} impressions ·{' '}
                    {noRecipients ? (
                      <span style={{ color: active ? '#fff3d6' : '#b26a00' }}>
                        no recipients
                      </span>
                    ) : (
                      `${e.to.length} recipient${e.to.length > 1 ? 's' : ''}`
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email preview/editor */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '2px solid #f0f0f0',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                Preview {currentIdx + 1} of {emails.length}
              </div>
              <div
                style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}
              >
                {current.location}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#666',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                {current.totalImpressions} impressions · {current.brandCount}{' '}
                brands · {current.issueCount} naming note
                {current.issueCount === 1 ? '' : 's'} · {current.offAplCount}{' '}
                off-APL
              </div>
            </div>
            <button
              onClick={() => setEditing((v) => !v)}
              style={{
                background: editing ? '#28a745' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {editing ? <Save size={16} /> : <Edit3 size={16} />}
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Recipients */}
          <div
            style={{
              background: '#fafafa',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              border: `2px solid ${
                current.to.length === 0 ? '#ffab00' : '#f0f0f0'
              }`,
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                fontWeight: '800',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              To ({current.to.length})
            </div>

            {current.to.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                {current.to.map((addr) => (
                  <span
                    key={addr}
                    style={{
                      background: 'white',
                      border: '2px solid #da291c',
                      borderRadius: '30px',
                      padding: '8px 8px 8px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#1a1a1a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {addr}
                    <button
                      onClick={() => removeRecipient(addr)}
                      aria-label={`Remove ${addr}`}
                      style={{
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '14px',
                  color: '#b26a00',
                  fontWeight: '700',
                  marginBottom: '12px',
                }}
              >
                No recipients yet - add at least one below.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={draftAddr}
                placeholder="name@venue.com"
                onChange={(e) => {
                  setDraftAddr(e.target.value);
                  if (addrError) setAddrError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRecipient(draftAddr);
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '600',
                }}
              />
              <button
                onClick={() => addRecipient(draftAddr)}
                style={{
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Add
              </button>
            </div>

            {addrError && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#da291c',
                  fontWeight: '700',
                }}
              >
                {addrError}
              </div>
            )}

            {suggestions.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '8px',
                  }}
                >
                  Saved contacts - click to add
                </div>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                >
                  {suggestions.map((c) => (
                    <button
                      key={c.email}
                      onClick={() => addRecipient(c.email)}
                      title={c.name ? `${c.name} - ${c.email}` : c.email}
                      style={{
                        background: 'white',
                        border: '2px solid #e8e8e8',
                        borderRadius: '30px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#666',
                        cursor: 'pointer',
                      }}
                    >
                      + {c.name || c.email}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div
            style={{
              background: '#fafafa',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '2px solid #f0f0f0',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                fontWeight: '800',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Subject
            </div>
            {editing ? (
              <input
                type="text"
                value={current.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '2px solid #da291c',
                  borderRadius: '8px',
                  fontWeight: '600',
                }}
              />
            ) : (
              <div style={{ fontSize: '15px', fontWeight: '700' }}>
                {current.subject}
              </div>
            )}
          </div>

          {/* Body */}
          <div
            style={{
              background: '#fafafa',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #f0f0f0',
              minHeight: '400px',
            }}
          >
            {editing ? (
              <textarea
                value={current.body}
                onChange={(e) => updateField('body', e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '500px',
                  padding: '16px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '2px solid #da291c',
                  borderRadius: '8px',
                  resize: 'vertical',
                  lineHeight: '1.6',
                }}
              />
            ) : (
              <pre
                style={{
                  fontSize: '15px',
                  lineHeight: '1.7',
                  color: '#1a1a1a',
                  fontFamily:
                    '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {current.body}
              </pre>
            )}
          </div>

          {/* Nav */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '24px',
            }}
          >
            <button
              onClick={() => {
                setCurrentIdx(Math.max(0, currentIdx - 1));
                setEditing(false);
                setDraftAddr('');
                setAddrError(null);
              }}
              disabled={currentIdx === 0}
              style={{
                background: currentIdx === 0 ? '#ccc' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              onClick={() => {
                setCurrentIdx(Math.min(emails.length - 1, currentIdx + 1));
                setEditing(false);
                setDraftAddr('');
                setAddrError(null);
              }}
              disabled={currentIdx === emails.length - 1}
              style={{
                background:
                  currentIdx === emails.length - 1 ? '#ccc' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor:
                  currentIdx === emails.length - 1 ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Robust model-JSON parsing. Models sometimes wrap JSON in ```json fences,
// add a sentence before or after it, or emit more than one block. A naive
// JSON.parse() throws on ALL of those — most visibly with "unexpected
// non-whitespace character after JSON data" when there's trailing text. We
// strip fences, try a clean parse, and if that fails, extract the first
// balanced { ... } object and parse only that.
// ---------------------------------------------------------------------------

function parseClaudeJson(rawText) {
  const stripped = String(rawText || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // Fast path: already-clean JSON.
  try {
    return JSON.parse(stripped);
  } catch (_) {
    // fall through to balanced-object extraction
  }

  const candidate = extractFirstJsonObject(stripped);
  if (candidate) {
    // If this still throws, the caller's per-menu try/catch records it as a
    // failed menu rather than killing the whole batch.
    return JSON.parse(candidate);
  }

  const snippet = stripped.slice(0, 200).replace(/\s+/g, ' ');
  throw new Error(
    `No parseable JSON object found in model response. Started with: "${snippet}"`
  );
}

// Return the substring from the first '{' through its matching '}', tracking
// string literals and escapes so braces inside strings don't miscount. This is
// what lets us ignore any prose/second-object that follows the JSON.
function extractFirstJsonObject(s) {
  const start = s.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null; // never balanced — response was likely truncated
}

// ---------------------------------------------------------------------------
// Aggregate the "off-APL" brands the model flagged across menus. These are
// brands present on menus that are NOT in the active APL. They are NEVER
// counted as impressions and NEVER emailed to suppliers — this list exists
// purely as a manual-review aid ("what else is this venue carrying?").
// ---------------------------------------------------------------------------

function aggregateOffApl(menuAnalyses) {
  const map = {}; // lowercased name -> { name, category, locations:{loc:count}, total }

  menuAnalyses.forEach((menu) => {
    const list = menu.off_apl_brands || menu.off_apl || [];
    if (!Array.isArray(list)) return;

    list.forEach((entry) => {
      const name = (
        typeof entry === 'string' ? entry : entry?.name || ''
      ).trim();
      if (!name) return;

      const key = name.toLowerCase();
      const category =
        typeof entry === 'object' && entry?.category ? entry.category : '';
      const hits =
        typeof entry === 'object' && Array.isArray(entry?.where)
          ? entry.where.length || 1
          : 1;

      if (!map[key]) {
        map[key] = { name, category, locations: {}, total: 0 };
      }
      map[key].total += hits;
      map[key].locations[menu.location] =
        (map[key].locations[menu.location] || 0) + hits;
      if (!map[key].category && category) map[key].category = category;
    });
  });

  return Object.values(map).sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

// ---------------------------------------------------------------------------
// APL parsers. Two entry points (CSV text and SheetJS row arrays) share the
// same header-matching logic so behavior is identical across file types.
// ---------------------------------------------------------------------------

// Common header variants we look for
const BRAND_HEADERS = ['brand name', 'brand', 'name', 'product', 'product name'];
const SUPPLIER_HEADERS = ['supplier', 'vendor', 'company', 'distributor'];

// Locate brand + supplier column indexes from an array of header strings.
function findAplColumns(headers) {
  const lower = headers.map((h) => String(h || '').trim().toLowerCase());
  const brandIdx = lower.findIndex((h) => BRAND_HEADERS.includes(h));
  const supplierIdx = lower.findIndex((h) => SUPPLIER_HEADERS.includes(h));

  if (brandIdx === -1) {
    throw new Error(
      'Could not find a brand column. Expected a header like "Brand Name", "Brand", or "Name".'
    );
  }
  if (supplierIdx === -1) {
    throw new Error(
      'Could not find a supplier column. Expected a header like "Supplier" or "Vendor".'
    );
  }
  return { brandIdx, supplierIdx };
}

// Parse a 2D array (typically from XLSX.utils.sheet_to_json with header:1)
// into [{ name, supplier }].
function parseAplRows(rows) {
  if (!rows || rows.length < 2) {
    throw new Error('Spreadsheet must have a header row and at least one data row.');
  }

  const { brandIdx, supplierIdx } = findAplColumns(rows[0]);
  const brands = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = String(row[brandIdx] || '').trim();
    const supplier = String(row[supplierIdx] || '').trim();
    if (!name) continue;
    brands.push({ name, supplier: supplier || 'UNKNOWN' });
  }

  return brands;
}

function parseAplCsv(text) {
  // Strip BOM and split into lines, dropping empty ones
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row.');
  }

  // Parse a single CSV line, handling quoted fields with internal commas.
  const parseLine = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        // Doubled quote inside a quoted field = literal quote
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    fields.push(current);
    return fields.map((f) => f.trim());
  };

  const rows = lines.map(parseLine);
  return parseAplRows(rows);
}

// ---------------------------------------------------------------------------
// Parse a structured APL workbook (multiple sheets, side-by-side category
// blocks, "SUPPLIER" column headers). Used as a fallback when the flat parser
// can't find a single "Brand Name" / "Supplier" header row — i.e., for the
// real-world client APL format we see in production.
//
// Algorithm:
//   1. For each sheet, find every column that contains a "SUPPLIER" header
//      cell somewhere. These are the supplier columns.
//   2. Each supplier column owns a column zone: from (previous supplier + 1)
//      through itself. So a sheet with suppliers in cols B, E, H has zones
//      A-B, C-E, F-H.
//   3. For each zone, identify the brand column by voting: in every row that
//      contains a SUPPLIER header in that zone's supplier column, find the
//      leftmost non-empty cell in the zone. The column with the most votes
//      wins (ties broken leftward).
//   4. Walk every data row in the sheet. Skip rows that are SUPPLIER-header
//      rows themselves. For each row, pair the brand cell with the supplier
//      cell. Skip rows where either is empty or looks like a category header.
// ---------------------------------------------------------------------------

function parseStructuredXlsxApl(workbook) {
  const brands = [];
  const seen = new Set();

  // Heuristic: a brand string that looks like a category header
  // (e.g., "RUM - 10", "TEQUILA - 17 (order silver - extra anejo)")
  const looksLikeCategoryHeader = (s) => {
    if (/^[A-Z/\s\-]+ - \d+/.test(s)) return true;
    if (/.+- \d+\s*\(.+\)?\s*$/.test(s)) return true;
    return false;
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const maxRow = range.e.r;
    const maxCol = range.e.c;

    // Helper: read a cell's string value (0-indexed row + col)
    const cellAt = (r, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell || cell.v === undefined || cell.v === null) return '';
      return String(cell.v).trim();
    };

    // Step 1: find all unique SUPPLIER columns
    const supplierCols = new Set();
    for (let r = 0; r <= maxRow; r++) {
      for (let c = 0; c <= maxCol; c++) {
        if (cellAt(r, c).toUpperCase() === 'SUPPLIER') {
          supplierCols.add(c);
        }
      }
    }
    if (supplierCols.size === 0) continue;
    const sortedSupCols = Array.from(supplierCols).sort((a, b) => a - b);

    // Step 2: build column zones
    const zones = [];
    let prev = -1;
    for (const sc of sortedSupCols) {
      zones.push({ start: prev + 1, end: sc, supplierCol: sc });
      prev = sc;
    }

    // Step 3: for each zone, vote on the brand column
    for (const zone of zones) {
      const votes = {};
      const headerRows = [];
      for (let r = 0; r <= maxRow; r++) {
        if (cellAt(r, zone.supplierCol).toUpperCase() === 'SUPPLIER') {
          headerRows.push(r);
          for (let c = zone.start; c < zone.end; c++) {
            if (cellAt(r, c)) {
              votes[c] = (votes[c] || 0) + 1;
              break;
            }
          }
        }
      }
      if (Object.keys(votes).length === 0) continue;
      // Most votes wins; ties broken leftmost
      const brandCol = Object.entries(votes)
        .map(([k, v]) => [Number(k), v])
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
      zone.brandCol = brandCol;
      zone.headerRows = new Set(headerRows);
    }

    // Step 4: walk data rows for each zone
    for (const zone of zones) {
      if (zone.brandCol === undefined) continue;
      for (let r = 0; r <= maxRow; r++) {
        if (zone.headerRows.has(r)) continue;
        const brandRaw = cellAt(r, zone.brandCol);
        const supplierRaw = cellAt(r, zone.supplierCol);
        if (!brandRaw || !supplierRaw) continue;
        if (supplierRaw.toUpperCase() === 'SUPPLIER') continue;

        // Skip junk
        if (brandRaw.toUpperCase().startsWith('LOCATIONS')) continue;
        if (brandRaw.startsWith('*')) continue;
        if (looksLikeCategoryHeader(brandRaw)) continue;

        // Skip suppliers that are clearly punctuation/junk
        if (supplierRaw.length < 2) continue;

        const key = `${brandRaw.toLowerCase()}|${supplierRaw.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        brands.push({ name: brandRaw, supplier: supplierRaw });
      }
    }
  }

  if (brands.length === 0) {
    throw new Error(
      'Could not extract brands from this spreadsheet. Looking for either a flat "Brand Name | Supplier" header row, or category blocks with "SUPPLIER" column headers.'
    );
  }

  return brands;
}

// ---------------------------------------------------------------------------
// Build one email per VENUE from the per-menu analyses.
//
// Note this reads results.menuAnalyses (one entry per menu/venue), NOT
// results.aggregated (one entry per supplier). The recipients are venue
// managers, so the report is organised around what's on THEIR menu rather
// than around who supplies it.
// ---------------------------------------------------------------------------

function buildVenueEmails(results, activeApl) {
  const period = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const stamp = new Date().toLocaleDateString();

  // The model tags each mention with its source — "(image)", "(image text)",
  // "(title)" — so one drink can appear three times for the same brand. Strip
  // the tags and dedupe so the list under each brand stays short.
  const MAX_CONTEXTS = 6;
  const summariseCocktails = (list) => {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(list) ? list : []) {
      const name = String(raw || '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    if (out.length === 0) return '';
    if (out.length <= MAX_CONTEXTS) return out.join(', ');
    return `${out.slice(0, MAX_CONTEXTS).join(', ')} +${
      out.length - MAX_CONTEXTS
    } more`;
  };

  return results.menuAnalyses.map((menu) => {
    // Group this venue's APL hits by supplier so the list reads in a sensible
    // order rather than as one long undifferentiated run of brands.
    const bySupplier = {};
    let total = 0;
    Object.entries(menu.brand_impressions || {}).forEach(([brand, data]) => {
      const sup = String(data.supplier || 'UNKNOWN').trim();
      const count = data.count || 0;
      if (!bySupplier[sup]) bySupplier[sup] = [];
      bySupplier[sup].push({
        brand: brand.trim(),
        count,
        cocktails: data.cocktails || [],
      });
      total += count;
    });

    const supplierNames = Object.keys(bySupplier).sort();
    const brandCount = supplierNames.reduce(
      (n, s) => n + bySupplier[s].length,
      0
    );

    const brandBlock = supplierNames.length
      ? supplierNames
          .map((sup) => {
            const supTotal = bySupplier[sup].reduce((n, r) => n + r.count, 0);
            const rows = bySupplier[sup]
              .sort(
                (a, b) => b.count - a.count || a.brand.localeCompare(b.brand)
              )
              .map((r) => {
                const where = summariseCocktails(r.cocktails);
                return where
                  ? `    - ${r.brand}: ${r.count}\n        ${where}`
                  : `    - ${r.brand}: ${r.count}`;
              })
              .join('\n');
            return `  ${sup} (${supTotal})\n${rows}`;
          })
          .join('\n\n')
      : '  No APL brands were detected on this menu.';

    // Drop notes where the menu already matches the APL exactly. The model
    // flags these anyway and then explains, in the note itself, that there's
    // no issue — which reads as incoherent to the recipient.
    const issues = filterIssues(menu.compliance_issues, activeApl);
    const complianceBlock = issues.length
      ? `\n\nNAMING NOTES (${issues.length})
These brands are on the menu but aren't written as the full product name:
${issues
  .map((i) => {
    const where = cleanIssueContext(i.cocktail);
    return `  ! "${i.found_text}"${
      where ? ` in ${where}` : ''
    } - should read "${i.correct_name}"`;
  })
  .join('\n')}`
      : '';

    const offList = menu.off_apl_brands || menu.off_apl || [];
    const offRows = (Array.isArray(offList) ? offList : [])
      .map((b) => {
        const name = String(typeof b === 'string' ? b : b?.name || '').trim();
        if (!name) return '';
        const cat =
          typeof b === 'object' && b?.category ? ` (${b.category})` : '';
        const where =
          typeof b === 'object' && Array.isArray(b?.where) && b.where.length
            ? ` - ${b.where.join(', ')}`
            : '';
        return `  - ${name}${cat}${where}`;
      })
      .filter(Boolean);

    const offBlock = offRows.length
      ? `\n\nNOT ON THE APL (${offRows.length})
Branded products on this menu that aren't part of the current APL. Listed for
awareness only - these are not counted as impressions:
${offRows.join('\n')}`
      : '';

    const body = `Hi there,

Here is the menu report for ${menu.location} - ${period}.

SUMMARY
  Total APL impressions: ${total}
  APL brands present: ${brandCount}
  Suppliers represented: ${supplierNames.length}

APL BRAND IMPRESSIONS
${brandBlock}${complianceBlock}${offBlock}

Every appearance of an APL brand counts as one impression - recipe ingredients,
spirits lists, cocktail titles, and brands visible in menu photography are each
counted separately.

If anything above looks wrong, reply to this email and we'll take another look.

Best regards,
The Ignite Team

--
Generated by Fire Watch - Ignite Creative Services LLC - ${stamp}
Source menu: ${menu.filename}`;

    return {
      location: menu.location,
      filename: menu.filename,
      to: [],
      subject: `Menu Report - ${menu.location} - ${period}`,
      body,
      totalImpressions: total,
      brandCount,
      supplierCount: supplierNames.length,
      issueCount: issues.length,
      offAplCount: offRows.length,
    };
  });
}
