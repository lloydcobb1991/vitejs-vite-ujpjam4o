// ===========================================================================
// aplParser.js
//
// Shared APL parsing and brand matching. Used by Fire Watch (Emberwatch.jsx)
// and the recipe pre-flight check (RecipeCheck.jsx).
//
// This lives in one place deliberately. Every parser bug we have hit — the
// zone-start drift, the BEER/WINE column layout, the blank varietal header on
// the Swingers WINE tab that loaded every wine as its grape variety — would
// otherwise need fixing twice, and the second copy would be the one nobody
// remembers to fix.
// ===========================================================================

import * as XLSX from 'xlsx';

// Words that describe a product rather than name it. Menus append them freely
// ("Ford's Gin", "Canyon Road Wines"); APLs usually don't.
export const DESCRIPTOR_WORDS = new Set([
  'vodka', 'gin', 'rum', 'tequila', 'mezcal', 'whiskey', 'whisky', 'bourbon',
  'scotch', 'brandy', 'cognac', 'liqueur', 'cordial', 'vermouth', 'beer',
  'lager', 'ale', 'ipa', 'pilsner', 'stout', 'porter', 'cider', 'seltzer',
  'wine', 'wines', 'champagne', 'prosecco', 'sparkling',
  'na', 'nonalcoholic', 'non', 'alcoholic', 'hard', 'the', 'brand', 'brands',
  // Category words menus append to aperitivo-style bottles: "Aperol Apertivo"
  // is Aperol. Spelled both ways in the wild, and misspelled in practice.
  'aperitivo', 'apertivo', 'aperativo', 'aperitif', 'digestif',
]);
// Deliberately NOT descriptors: blanco, silver, reposado, añejo, 12, 1942.
// Those distinguish one SKU from another — "Don Julio Blanco" and "Don Julio
// Reposado" are different products and only one may be approved.

export function offAplTokens(raw) {
  return String(raw || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/['\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !DESCRIPTOR_WORDS.has(w));
}

export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

// Two tokens are "the same word" if one abbreviates the other (Sam/Samuel) or
// they differ by a single character in a long word (Lunazul/Lanazul).
export function tokensMatch(a, b) {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.startsWith(short)) return true;
  if (short.length >= 6 && editDistance(a, b) <= 1) return true;
  return false;
}

// True when an off-APL entry is really an APL brand under different wording.
// Deliberately conservative: every token must line up, so "Don Julio Reposado"
// stays off-APL against an APL that only carries "Don Julio Blanco".
export function matchesAplBrand(offName, aplBrands) {
  const off = offAplTokens(offName);
  if (off.length === 0) return null;

  for (const b of aplBrands || []) {
    const apl = offAplTokens(b.name);
    if (apl.length === 0) continue;

    // Same number of meaningful tokens, matching position for position.
    // Allowing the APL name to be one token shorter let a general entry
    // swallow a specific SKU — "Hendrick's" absorbing "Hendrick's Neptunia",
    // "Casa Noble Blanco" absorbing "Casamigos". Descriptor words are already
    // stripped from both sides, so a genuine rewording lands on equal counts.
    if (off.length !== apl.length) continue;
    let ok = true;
    for (let i = 0; i < off.length; i++) {
      if (!tokensMatch(off[i], apl[i])) {
        ok = false;
        break;
      }
    }
    if (ok) return b;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canonical brand names.
//
// The model is told to key each brand by its APL form, and mostly it does —
// but a 36-menu run produced "Jameson" and "Jameson Irish" as separate brands
// for the same product, plus "Coffee" alongside "Coffee (LA COLOMBE)". Every
// split understates a supplier's own count on their own report.
//
// The fix has to be careful, because not every near-match is a duplicate: the
// Alterra APL lists BOTH "Woodford Reserve" and "Woodford Reserve Rye", which
// are different products. So the APL decides, not string similarity.
//
//   1. An APL entry with the SAME number of meaningful tokens wins outright.
//      "Woodford Reserve Rye" finds its own entry and stays distinct.
//   2. Otherwise, the longest APL entry that is a strict prefix of the
//      reported name. "Jameson Irish" finds "Jameson (Irish)".
//   3. If either step is ambiguous, leave the reported name alone. "New
//      Amsterdam (Gin)" matches two APL rows, so it keeps its category tag.
// ---------------------------------------------------------------------------

export function canonicalizeBrand(reported, aplBrands) {
  const raw = String(reported || '').trim();
  if (!raw || !aplBrands || aplBrands.length === 0) return raw;

  const tokens = offAplTokens(raw);
  if (tokens.length === 0) return raw;

  const prefixMatches = (aplTokens) => {
    if (aplTokens.length > tokens.length) return false;
    for (let i = 0; i < aplTokens.length; i++) {
      if (!tokensMatch(tokens[i], aplTokens[i])) return false;
    }
    return true;
  };

  const sameLength = [];
  const shorter = [];
  for (const b of aplBrands) {
    const aplTokens = offAplTokens(b.name);
    if (aplTokens.length === 0) continue;
    if (!prefixMatches(aplTokens)) continue;
    (aplTokens.length === tokens.length ? sameLength : shorter).push({
      brand: b,
      len: aplTokens.length,
    });
  }

  // Display form drops any trailing region/style parenthetical, matching the
  // naming rule the prompt already gives the model: "Jameson (Irish)" reads
  // as "Jameson".
  const display = (b) =>
    String(b.name).replace(/\s*\([^)]*\)\s*$/, '').trim() || String(b.name);

  if (sameLength.length === 1) return display(sameLength[0].brand);
  if (sameLength.length > 1) return raw; // ambiguous — leave it alone

  if (shorter.length) {
    const longest = Math.max(...shorter.map((x) => x.len));
    const best = shorter.filter((x) => x.len === longest);
    if (best.length === 1) return display(best[0].brand);
  }

  return raw;
}

// ---------------------------------------------------------------------------
// APL parsers. Two entry points (CSV text and SheetJS row arrays) share the
// same header-matching logic so behavior is identical across file types.
// ---------------------------------------------------------------------------

// Common header variants we look for
export const BRAND_HEADERS = ['brand name', 'brand', 'name', 'product', 'product name'];
export const SUPPLIER_HEADERS = ['supplier', 'vendor', 'company', 'distributor'];

// Locate brand + supplier column indexes from an array of header strings.
export function findAplColumns(headers) {
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
export function parseAplRows(rows) {
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

export function parseAplCsv(text) {
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
// CSV APLs.
//
// The old code ran ONLY the flat "Brand Name | Supplier" parser here. A CSV
// exported from one tab of a real client APL — side-by-side category blocks
// with a SUPPLIER header over each — threw "Could not find a brand column",
// which set aplError and left the app on the built-in sample list. Every
// number in such a run comes from the wrong brand list while looking fine.
//
// The flat parser is still tried first, so simple two-column files behave
// exactly as before. Anything it can't read now goes to SheetJS and the
// structured parser, the same path an .xlsx takes. SheetJS also handles
// quoted cells containing newlines, which the hand-rolled line splitter
// mangled — the Swingers beer export has one in its title row.
// ---------------------------------------------------------------------------

export function parseCsvApl(text) {
  try {
    const flat = parseAplCsv(text);
    if (flat.length) {
      console.log(`[APL] flat CSV parse: ${flat.length} brands`);
      return flat;
    }
  } catch (err) {
    console.log('[APL] no flat header row in this CSV, trying structured:', err.message);
  }

  const workbook = XLSX.read(String(text || '').replace(/^\uFEFF/, ''), {
    type: 'string',
  });
  return parseXlsxApl(workbook);
}

// ---------------------------------------------------------------------------
// Single entry point for Excel APLs.
//
// Runs the structured parser across every sheet, then runs the flat
// "Brand Name | Supplier" parser across every sheet as well, and unions the
// two on name+supplier+category. Either parser alone loses tabs: the flat one
// only ever looked at sheet 1, and the structured one only understands sheets
// that anchor on a SUPPLIER header.
//
// Everything it finds is logged per sheet. If a tab contributes zero brands
// you can see which tab and why, instead of finding out when a client asks
// where their Prosecco went.
// ---------------------------------------------------------------------------

export function parseXlsxApl(workbook) {
  const merged = [];
  const seen = new Set();

  const add = (b) => {
    const key = `${String(b.name || '').toLowerCase()}|${String(
      b.supplier || ''
    ).toLowerCase()}|${String(b.category || '').toLowerCase()}`;
    if (!b.name || seen.has(key)) return false;
    seen.add(key);
    merged.push(b);
    return true;
  };

  // Structured pass — the real client format.
  try {
    parseStructuredXlsxApl(workbook).forEach(add);
  } catch (err) {
    console.warn('[APL] structured pass found nothing:', err.message);
  }
  console.log(`[APL] structured pass: ${merged.length} brands`);

  // Flat pass — every sheet, not just the first.
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;
    let added = 0;
    try {
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (const b of parseAplRows(rows)) if (add(b)) added++;
    } catch (_) {
      // No flat header row on this sheet. Expected for the structured format.
    }
    if (added) {
      console.log(`[APL] flat pass, "${sheetName}": +${added} brands`);
    }
  }

  console.log(`[APL] TOTAL: ${merged.length} brands`);
  // Ctrl-F this line in the console to check whether a specific brand made it
  // in. This is the fastest answer to "is Mionetto / Seedlip actually loaded?"
  console.log('[APL] names:', merged.map((b) => b.name).join(' | '));

  if (merged.length === 0) {
    throw new Error(
      'Could not extract brands from this spreadsheet. Looking for either a flat "Brand Name | Supplier" header row, or category blocks with "SUPPLIER" column headers.'
    );
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Parse a structured APL workbook (multiple sheets, side-by-side category
// blocks, "SUPPLIER" column headers). This is the real-world client format.
//
// Algorithm:
//   1. For each sheet, find every cell that reads SUPPLIER (or VENDOR, or
//      DISTRIBUTOR). These anchor the zones.
//   2. Walk LEFT from each anchor, stepping over known sub-headers (STYLE,
//      VARIETAL, REGION...) and blank spacer cells, to elect a brand column.
//   3. Validate that election by counting the product rows each candidate
//      column would actually yield, and move it if the elected one is barren.
//   4. Walk every data row in the sheet, pairing brand cell with supplier
//      cell, skipping header rows, markers and category labels.
//
// Every sheet reports what it produced to the console, so a tab that
// contributes nothing says so instead of disappearing quietly.
// ---------------------------------------------------------------------------

export function parseStructuredXlsxApl(workbook) {
  const brands = [];
  const seen = new Set();

  // Category headers: "RUM - 7", "WHITE WINE (750 mL) - 6",
  // "TEQUILA - 17 (order silver - extra anejo)".
  const looksLikeCategoryHeader = (s) => {
    const t = s.trim();
    if (/ - \d+\s*$/.test(t)) return true;
    if (/ - \d+\s*\(.*\)\s*$/.test(t)) return true;
    if (/^[A-Z/\s\-]+ - \d+/.test(t)) return true;
    if (t.toUpperCase() === 'APL BAR MANDATE') return true;
    if (t.toUpperCase() === 'BAR STANDARDS APL MANDATE') return true;
    // Alterra-style APLs use this as a mid-zone divider before the
    // non-mandatory brands. It is a section label, not a product.
    if (t.toUpperCase() === 'OPTIONAL PRODUCTS') return true;
    return false;
  };

  // The anchor that defines a zone. Widened from an exact "SUPPLIER" match: a
  // tab that writes "Vendor", or "SUPPLIER:" with a colon, produced no zones
  // at all and therefore no brands, and said nothing about it.
  const SUPPLIER_ANCHORS = new Set([
    'SUPPLIER', 'SUPPLIERS', 'VENDOR', 'VENDORS', 'DISTRIBUTOR', 'DISTRIBUTORS',
  ]);
  const isSupplierHeader = (s) =>
    SUPPLIER_ANCHORS.has(
      String(s || '').replace(/[:*]+\s*$/, '').trim().toUpperCase()
    );

  // Sub-headers that sit BETWEEN the brand column and the SUPPLIER column.
  // BEER uses STYLE, WINE uses VARIETAL. This is why brandCol is not always
  // supplierCol - 1. Wine and sparkling blocks carry more of these than
  // spirits blocks do, and an unrecognised one used to stop the walk-left
  // dead and elect the wrong column.
  const SUB_HEADERS = new Set([
    'STYLE', 'VARIETAL', 'VARIETY', 'VARIETALS', 'TYPE', 'CATEGORY',
    'REGION', 'COUNTRY', 'PRODUCER', 'APPELLATION', 'VINTAGE', 'SIZE',
    'FORMAT', 'ORIGIN', 'ABV', 'COLOR', 'COLOUR', 'SUB TYPE', 'SUBTYPE',
  ]);

  // Venue-approval markers and short venue codes that appear in the columns
  // to the RIGHT of SUPPLIER and in repeated header rows.
  const MARKER_TOKENS = new Set([
    'X', 'BS', 'BSH', 'AB', 'LB', 'EL', 'EL2', 'FD', 'CS', 'B1', 'B2', 'B3',
    'WB', 'RE', 'C', 'N/A', 'NA', '-', '--', '—', '•', '✓', '✔', 'YES', 'NO',
    'LEGEND', 'KEY', 'LOCATIONS',
  ]);
  const looksLikeMarker = (s) => {
    const t = s.trim();
    if (!t) return true;
    if (MARKER_TOKENS.has(t.toUpperCase())) return true;
    if (t.length === 1) return true;
    if (t.length <= 3 && /^[A-Z0-9]+$/.test(t) && !/[AEIOU]/.test(t)) return true;
    return false;
  };

  const LEGEND_COLOR_WORDS = new Set([
    'TAUPE', 'CORNFLOWER', 'ORANGE', 'TURQUOISE', 'SALMON', 'GREY', 'GRAY',
    'WHITE', 'GREEN', 'RED', 'BLUE', 'YELLOW', 'PINK', 'PURPLE', 'BLACK',
    'BROWN', 'BEIGE', 'TEAL', 'MAGENTA', 'CYAN', 'GOLD', 'SILVER', 'LAVENDER',
    'SLATE', 'NAVY', 'OLIVE', 'MAROON', 'IVORY', 'CHARCOAL', 'MINT', 'PEACH',
    'COLOR / ICON', 'COLOR/ICON', 'COLOR', 'ICON',
  ]);
  const looksLikeLegendSupplier = (s) =>
    LEGEND_COLOR_WORDS.has(s.trim().toUpperCase());

  // Service-tier and venue-type labels sitting where a brand name should be.
  // An all-caps cell built around a slash is a label ("POP-UP / SATELLITE",
  // "QUICK SERVE / CONCESSION"); real brands in caps don't read that way.
  const looksLikeSectionLabel = (s) => {
    const t = s.trim();
    if (/^TIER\s*\d+/i.test(t)) return true;
    if (/\s\/\s/.test(t) && t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
    return false;
  };

  // "VODKA - 11" -> "Vodka".  "WHITE WINE (750 mL) - 6" -> "White Wine".
  // "TEQUILA / MEZCAL - 14" -> "Tequila / Mezcal".  Drops the count suffix,
  // the volume parenthetical, and any trailing asterisk.
  const cleanCategoryLabel = (raw) => {
    let t = String(raw || '').trim();
    if (!t) return '';
    t = t.replace(/\s*-\s*\d+\s*$/, '');
    t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
    t = t.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    if (!t || isSupplierHeader(t)) return '';
    if (t.length > 40) return '';
    // Title-case the all-caps headers; leave mixed case ("Chardonnay") alone.
    if (t === t.toUpperCase()) {
      t = t
        .toLowerCase()
        .replace(/(^|[\s/])([a-z])/g, (m, p, ch) => p + ch.toUpperCase());
    }
    return t;
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) {
      console.warn(`[APL] "${sheetName}": empty sheet, skipped`);
      continue;
    }

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const maxRow = range.e.r;
    const maxCol = range.e.c;

    const cellAt = (r, c) => {
      if (c < 0 || c > maxCol || r < 0 || r > maxRow) return '';
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined || cell.v === null) return '';
      return String(cell.v).replace(/\s+/g, ' ').trim();
    };

    // ---- Resolve each zone by walking LEFT from its SUPPLIER anchor. ----
    //
    // The original code voted for "leftmost non-empty cell in the zone", where
    // the zone started just after the PREVIOUS supplier column. For a sheet
    // with venue-approval columns, that start lands inside the previous zone's
    // block of X-markers, so the vote elected a marker column as the brand
    // column. Walking left from SUPPLIER is deterministic and can't drift.
    const zones = new Map(); // supplierCol -> { brandCol, subCol, headerRows }

    for (let r = 0; r <= maxRow; r++) {
      for (let c = 0; c <= maxCol; c++) {
        if (!isSupplierHeader(cellAt(r, c))) continue;

        // Skip known sub-headers AND blank spacer cells. A blank cell between
        // the brand column and SUPPLIER used to end the walk immediately,
        // electing an empty column: the zone then read zero rows and reported
        // nothing at all.
        let brandCol = c - 1;
        while (brandCol >= 0) {
          const h = cellAt(r, brandCol).toUpperCase();
          if (h === '' || SUB_HEADERS.has(h)) brandCol -= 1;
          else break;
        }
        if (brandCol < 0) continue;

        // Remember the STYLE/VARIETAL column too — for BEER and WINE it holds
        // a far more useful per-row category ("Chardonnay") than the block
        // header ("WHITE WINE - 6") does. Take the column NEXT TO the brand
        // rather than next to SUPPLIER: where a block has two sub-columns
        // (VARIETAL then REGION), the one beside the brand is the product
        // type and the one beside SUPPLIER is geography.
        const subCol = brandCol + 1 < c ? brandCol + 1 : -1;

        if (!zones.has(c)) {
          zones.set(c, { brandCol, subCol, headerRows: new Set() });
        }
        const zone = zones.get(c);
        if (zone.subCol === -1 && subCol !== -1) zone.subCol = subCol;
        // A repeated header row that omits STYLE must not pull the zone
        // rightwards onto the sub-header column.
        zone.brandCol = Math.min(zone.brandCol, brandCol);
        zone.headerRows.add(r);
      }
    }

    if (zones.size === 0) {
      console.warn(
        `[APL] "${sheetName}": no SUPPLIER header found — 0 brands from this tab`
      );
      continue;
    }

    // ---- Validate the elected brand column before reading the zone. ----
    //
    // Header-row inspection is a guess. This counts how many usable product
    // rows each candidate column would actually yield and moves the election
    // only when the current pick is clearly barren, so layouts that already
    // parse correctly are left alone.
    const countUsable = (brandCol, supplierCol, headerRows) => {
      if (brandCol < 0) return 0;
      let n = 0;
      for (let r = 0; r <= maxRow; r++) {
        if (headerRows.has(r)) continue;
        const b = cellAt(r, brandCol);
        const s = cellAt(r, supplierCol);
        if (!b || !s) continue;
        if (isSupplierHeader(s)) continue;
        if (s.length < 2) continue;
        if (looksLikeLegendSupplier(s)) continue;
        if (looksLikeCategoryHeader(b)) continue;
        if (looksLikeMarker(b)) continue;
        n++;
      }
      return n;
    };

    const supplierCols = [...zones.keys()].sort((a, b) => a - b);
    const leftBoundFor = (supplierCol) => {
      const i = supplierCols.indexOf(supplierCol);
      return i > 0 ? supplierCols[i - 1] + 1 : 0;
    };

    for (const [supplierCol, zone] of zones) {
      const elected = countUsable(zone.brandCol, supplierCol, zone.headerRows);
      let best = { col: zone.brandCol, n: elected };
      const floor = Math.max(leftBoundFor(supplierCol), supplierCol - 6);
      for (let c = supplierCol - 1; c >= floor; c--) {
        if (c === zone.brandCol) continue;
        const n = countUsable(c, supplierCol, zone.headerRows);
        if (n > best.n) best = { col: c, n };
      }

      if (best.col !== zone.brandCol && elected < best.n * 0.6) {
        console.warn(
          `[APL] "${sheetName}": brand column for SUPPLIER col ${supplierCol} ` +
            `moved ${zone.brandCol} -> ${best.col} (${elected} rows -> ${best.n})`
        );
        zone.brandCol = best.col;
        zone.subCol = zone.brandCol + 1 < supplierCol ? zone.brandCol + 1 : -1;
      }
    }

    // ---- Read each zone top to bottom. ----
    // Categories stack vertically inside one zone (VODKA, then RUM, then
    // WHISKEY), each re-printing its own header row, so we scan every row and
    // skip the header rows rather than stopping at the first one.
    const sheetStart = brands.length;

    for (const [supplierCol, zone] of zones) {
      // The category label lives in the brand column OF the header row
      // ("VODKA - 11" sits directly left of "SUPPLIER"). Because categories
      // stack down a zone, we track the most recent one as we descend.
      let currentCategory = '';

      for (let r = 0; r <= maxRow; r++) {
        if (zone.headerRows.has(r)) {
          const label = cleanCategoryLabel(cellAt(r, zone.brandCol));
          if (label) currentCategory = label;
          continue;
        }

        const brandRaw = cellAt(r, zone.brandCol);
        const supplierRaw = cellAt(r, supplierCol);
        if (!brandRaw || !supplierRaw) continue;
        if (isSupplierHeader(supplierRaw)) continue;

        if (brandRaw.toUpperCase().startsWith('LOCATIONS')) continue;
        if (brandRaw.startsWith('*')) continue;
        // Venue-tier legends. The Alterra APL carries a block describing each
        // service type — "TIER 1", "POP-UP / SATELLITE", and a full sentence
        // of prose — laid out exactly like a brand/supplier pair, so all
        // three were loading as APL products and going into the prompt.
        if (looksLikeSectionLabel(brandRaw)) continue;
        if (brandRaw.length > 60) continue;   // prose, not a product name
        if (supplierRaw.length > 40) continue; // prose in the supplier cell
        if (looksLikeCategoryHeader(brandRaw)) continue;
        if (looksLikeMarker(brandRaw)) continue;
        if (supplierRaw.length < 2) continue;
        if (looksLikeLegendSupplier(supplierRaw)) continue;

        // Strip the mandate markers and service notation so the same brand
        // from two sheets aggregates into one row, and so a supplier report
        // doesn't read "Tanqueray London Dry +". The dagger and the trailing
        // "+" are both APL mandate flags; "- BTG & BTB" (by the glass / by
        // the bottle) is a service note. None are part of the brand name, and
        // leaving them on breaks the token matcher used for category lookup
        // and off-APL suppression — "Mionetto (Italy) - BTG & BTB" tokenised
        // to three words against a menu's one.
        const name = brandRaw
          .replace(/\s*†\s*/g, ' ')
          // "Hayes Ranch BTB / BTG", "Rombauer BTB", "Mionetto (Italy) - BTG
          // & BTB". By-the-bottle / by-the-glass is a service note, not part
          // of the name, and leaving it on stops "Hayes Ranch Wines" on a
          // menu ever matching "Hayes Ranch BTB / BTG" on the APL.
          .replace(/\s*[-–]?\s*BT[GB](\s*[/&]\s*BT[GB])?\s*$/i, '')
          // Priority-ranking prefixes: the Alterra BEER tab lists a top-eight
          // as "1. Michelob ULTRA" alongside a plain "Michelob ULTRA", which
          // split one brand into two rows and halved the supplier's count.
          .replace(/^\s*\d{1,2}\s*[.)]\s+/, '')
          .replace(/\s*\+\s*$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!name || looksLikeMarker(name)) continue;

        // A brand can legitimately appear twice under one supplier in two
        // different categories — the OHM APL lists "New Amsterdam" under both
        // VODKA and GIN, both Gallo. Keying on name+supplier alone deleted the
        // second one, so the gin never reached the prompt and every menu
        // mention of it was misfiled as off-APL. Category is part of identity.
        const subType = zone.subCol >= 0 ? cellAt(r, zone.subCol) : '';
        const category = subType && !looksLikeMarker(subType)
          ? cleanCategoryLabel(subType)
          : currentCategory;

        const key = `${name.toLowerCase()}|${supplierRaw.toLowerCase()}|${String(
          category
        ).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        brands.push(
          category
            ? { name, supplier: supplierRaw, category }
            : { name, supplier: supplierRaw }
        );
      }
    }

    console.log(
      `[APL] "${sheetName}": ${brands.length - sheetStart} brands from ${
        zones.size
      } zone(s)`
    );
  }

  if (brands.length === 0) {
    throw new Error(
      'Could not extract brands from this spreadsheet. Looking for either a flat "Brand Name | Supplier" header row, or category blocks with "SUPPLIER" column headers.'
    );
  }

  return brands;
}

