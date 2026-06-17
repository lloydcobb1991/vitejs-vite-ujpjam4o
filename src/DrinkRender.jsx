import React, { useState } from "react";

/*
  Alembic — DrinkRender (reference component)
  --------------------------------------------
  Renders a drink from the Alembic `Drink` schema. Everything visual is derived
  from the data, so the same component covers every generation:

    colorHint   -> liquid gradient (lighter top, darker bottom, bright meniscus)
    carbonated  -> rising bubbles on/off
    glass       -> which glass outline (wine / rocks / coupe / highball)
    garnish[]   -> rim art, keyed off keywords
    method      -> ice treatment (big cube vs cubes vs none)
    components  -> fill level (summed oz)

  Drop `DrinkRender` into src/ and feed it the JSON from /api/alembic/generate.
  The default export below is just a demo harness so it renders standalone.

  Coverage note (v1): 4 glass shapes + a handful of garnish glyphs. Unknown
  glasses fall back to rocks; unknown garnishes fall back to a small leaf.
  Expand GLASSES and GARNISH_GLYPHS as your real DB vocabulary grows.
*/

/* ----------------------------- color helpers ----------------------------- */

function hexToRgb(hex) {
  const h = (hex || "#C77A33").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}
function rgbToHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(rgb, target, t) {
  return {
    r: rgb.r + (target.r - rgb.r) * t,
    g: rgb.g + (target.g - rgb.g) * t,
    b: rgb.b + (target.b - rgb.b) * t,
  };
}
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

function liquidShades(hex) {
  const base = hexToRgb(hex);
  return {
    top: rgbToHex(mix(base, WHITE, 0.16)),
    bottom: rgbToHex(mix(base, BLACK, 0.24)),
    meniscus: rgbToHex(mix(base, WHITE, 0.45)),
  };
}

/* ------------------------------ glass library ----------------------------- */

function glassKey(name = "") {
  const n = name.toLowerCase();
  if (n.includes("wine")) return "wine";
  if (n.includes("coupe") || n.includes("nick")) return "coupe";
  if (n.includes("collins") || n.includes("highball") || n.includes("hurricane")) return "highball";
  if (n.includes("rocks") || n.includes("old fashioned") || n.includes("double old")) return "rocks";
  return "rocks";
}

const GLASSES = {
  wine: {
    rim: { cx: 120, cy: 70, rx: 58, ry: 10 },
    outline: "M62 70 C60 140 92 178 120 178 C148 178 180 140 178 70",
    stem: { x: 120, y1: 178, y2: 250 },
    foot: { cx: 120, cy: 256, rx: 40, ry: 8 },
    clip: "M64 72 C62 140 92 176 120 176 C148 176 178 140 176 72 Z",
    surfaceFull: 92, surfaceEmpty: 170, bottomY: 176, shadowY: 270,
    anchor: { x: 172, y: 74 },
    cond: [{ x: 96, y: 150, r: 2.2 }, { x: 142, y: 160, r: 1.7 }, { x: 150, y: 134, r: 2 }],
  },
  rocks: {
    rim: { cx: 120, cy: 96, rx: 64, ry: 11 },
    outline: "M58 96 L66 246 Q68 256 78 256 L162 256 Q172 256 174 246 L182 96",
    base: { cx: 120, cy: 252, rx: 50, ry: 6 },
    clip: "M62 100 L70 248 Q71 254 80 254 L160 254 Q169 254 170 248 L178 100 Z",
    surfaceFull: 112, surfaceEmpty: 244, bottomY: 250, shadowY: 264,
    anchor: { x: 178, y: 100 },
    cond: [{ x: 92, y: 210, r: 2.4 }, { x: 152, y: 226, r: 1.8 }, { x: 162, y: 196, r: 2 }],
  },
  coupe: {
    rim: { cx: 120, cy: 92, rx: 66, ry: 12 },
    outline: "M54 92 C56 128 90 142 120 142 C150 142 184 128 186 92",
    stem: { x: 120, y1: 142, y2: 250 },
    foot: { cx: 120, cy: 256, rx: 42, ry: 8 },
    clip: "M58 94 C60 126 90 140 120 140 C150 140 180 126 182 94 Z",
    surfaceFull: 100, surfaceEmpty: 138, bottomY: 140, shadowY: 270,
    anchor: { x: 178, y: 96 },
    cond: [{ x: 90, y: 128, r: 2 }, { x: 150, y: 130, r: 1.6 }],
  },
  highball: {
    rim: { cx: 120, cy: 58, rx: 46, ry: 9 },
    outline: "M74 58 L76 284 Q77 292 85 292 L155 292 Q163 292 164 284 L166 58",
    base: { cx: 120, cy: 289, rx: 42, ry: 5 },
    clip: "M76 62 L78 286 Q79 290 86 290 L154 290 Q161 290 162 286 L164 62 Z",
    surfaceFull: 72, surfaceEmpty: 282, bottomY: 288, shadowY: 301,
    anchor: { x: 164, y: 64 },
    cond: [{ x: 88, y: 232, r: 2.2 }, { x: 152, y: 252, r: 1.8 }, { x: 154, y: 200, r: 2 }],
  },
};

/* ------------------------------- garnishes -------------------------------- */

function citrusColor(name) {
  const n = name.toLowerCase();
  if (n.includes("lemon")) return "#E9C84A";
  if (n.includes("lime")) return "#9CC04A";
  if (n.includes("grapefruit")) return "#E8806A";
  return "#E8843A"; // orange default
}

function garnishGlyph(name, key, ox) {
  const n = name.toLowerCase();
  const c = citrusColor(n);
  if (n.includes("twist") || n.includes("peel")) {
    return (
      <g key={key} transform={`translate(${ox} 0)`}>
        <path d="M0 6 C20 -12 38 4 24 18 C15 26 4 18 12 8" fill={c} fillOpacity="0.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 8 C18 -4 30 6 21 16" fill="none" stroke="#FBE3C8" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    );
  }
  if (n.includes("wheel") || n.includes("slice") || n.includes("round") || n.includes("dehydrated")) {
    return (
      <g key={key} transform={`translate(${ox} 0)`}>
        <circle cx="12" cy="10" r="13" fill={c} fillOpacity="0.55" stroke={c} strokeWidth="1.6" />
        <circle cx="12" cy="10" r="6" fill="none" stroke="#FBE3C8" strokeWidth="1" />
        <path d="M12 -3 V23 M-1 10 H25 M3 1 L21 19 M21 1 L3 19" stroke="#FBE3C8" strokeWidth="0.8" opacity="0.8" />
      </g>
    );
  }
  if (n.includes("flower")) {
    const petals = [0, 72, 144, 216, 288];
    return (
      <g key={key} transform={`translate(${ox} 8)`}>
        {petals.map((a, i) => {
          const rad = (a * Math.PI) / 180;
          return <ellipse key={i} cx={8 + Math.cos(rad) * 8} cy={Math.sin(rad) * 8} rx="6" ry="3.4" fill="#E9A6C4" transform={`rotate(${a} ${8 + Math.cos(rad) * 8} ${Math.sin(rad) * 8})`} />;
        })}
        <circle cx="8" cy="0" r="4" fill="#F2C14E" />
      </g>
    );
  }
  if (/(mint|thyme|rosemary|basil|sprig|herb)/.test(n)) {
    return (
      <g key={key} transform={`translate(${ox} 0)`}>
        <path d="M10 30 C6 14 2 4 0 -8" fill="none" stroke="#8FB84B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 14 L-4 10 M6 22 L-2 19 M2 6 L-4 3 M5 0 L0 -4" stroke="#8FB84B" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (n.includes("cherry")) {
    return (
      <g key={key} transform={`translate(${ox} 0)`}>
        <path d="M10 2 C6 -6 0 -8 -2 -10" fill="none" stroke="#7C5A3A" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="10" r="8" fill="#B5293A" />
        <circle cx="7" cy="7" r="2.2" fill="#E0697A" />
      </g>
    );
  }
  if (n.includes("olive")) {
    return (
      <g key={key} transform={`translate(${ox} 0)`}>
        <line x1="2" y1="-10" x2="16" y2="22" stroke="#C9B79A" strokeWidth="1.4" />
        <ellipse cx="9" cy="8" rx="7" ry="9" fill="#7E8E3C" />
        <circle cx="9" cy="2" r="2.4" fill="#C2433A" />
      </g>
    );
  }
  return (
    <g key={key} transform={`translate(${ox} 4)`}>
      <path d="M0 8 C0 0 8 -6 14 -6 C14 2 6 8 0 8 Z" fill="#8FB84B" />
      <path d="M0 8 C5 4 10 0 14 -6" fill="none" stroke="#6E9636" strokeWidth="1" />
    </g>
  );
}

/* --------------------------- the render component ------------------------- */

const BUBBLES = [
  { dx: -22, d: 2.6, delay: 0 }, { dx: 12, d: 3.0, delay: 0.6 },
  { dx: -4, d: 2.2, delay: 1.1 }, { dx: 30, d: 2.8, delay: 0.3 },
  { dx: -34, d: 2.4, delay: 1.5 }, { dx: 20, d: 2.1, delay: 1.9 },
  { dx: 2, d: 3.2, delay: 0.9 },
];

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference){
  .ar-liquid{transform-box:fill-box;transform-origin:bottom;animation:ar-fill 1s ease-out both;}
  .ar-bubbles{opacity:0;animation:ar-fade .5s ease-out 1s forwards;}
  .ar-bub{animation:ar-rise var(--ar-d,2.4s) ease-in infinite;animation-delay:var(--ar-delay,0s);}
  .ar-glint{animation:ar-sweep 5.5s ease-in-out infinite;}
  .ar-meniscus{animation:ar-shim 3.2s ease-in-out infinite;}
}
@keyframes ar-fill{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ar-fade{to{opacity:1}}
@keyframes ar-rise{0%{transform:translateY(0);opacity:0}12%{opacity:.85}80%{opacity:.5}100%{transform:translateY(calc(-1px * var(--ar-rise,80)));opacity:0}}
@keyframes ar-sweep{0%,40%{transform:translateX(-50px);opacity:0}50%{opacity:.45}60%{transform:translateX(70px);opacity:.45}68%,100%{opacity:0}}
@keyframes ar-shim{0%,100%{opacity:.45}50%{opacity:.72}}
`;

export function DrinkRender({ drink, width = 232, stage = true }) {
  const g = GLASSES[glassKey(drink.glass)] || GLASSES.rocks;
  const shades = liquidShades(drink.colorHint);

  const totalOz = (drink.components || [])
    .filter((c) => (c.unit || "").toLowerCase().includes("oz"))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const fillFrac = Math.max(0.42, Math.min(0.88, 0.42 + totalOz * 0.06));
  const surfaceY = g.surfaceEmpty - fillFrac * (g.surfaceEmpty - g.surfaceFull);

  const method = (drink.method || "").toLowerCase();
  const ice = method.includes("cube") ? "cube" : /over ice|\bice\b/.test(method) ? "cubes" : "none";

  const clipId = React.useId().replace(/:/g, "");
  const liqGrad = `arliq-${clipId}`;
  const clipPathId = `arclip-${clipId}`;

  const svg = (
    <svg viewBox="0 0 240 305" width={width} aria-hidden="true">
      <defs>
        <linearGradient id={liqGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shades.top} />
          <stop offset="100%" stopColor={shades.bottom} />
        </linearGradient>
        <clipPath id={clipPathId}><path d={g.clip} /></clipPath>
      </defs>

      {/* table shadow */}
      <ellipse cx={g.rim.cx} cy={g.shadowY} rx="68" ry="8" fill="#000" opacity="0.32" />

      {/* glass body fill (faint) */}
      <path d={g.clip} fill="rgba(255,255,255,0.04)" />

      {/* liquid + meniscus (fills on mount) */}
      <g className="ar-liquid" clipPath={`url(#${clipPathId})`}>
        <rect x="0" y={surfaceY} width="240" height={g.bottomY - surfaceY + 4} fill={`url(#${liqGrad})`} />
        <ellipse className="ar-meniscus" cx={g.rim.cx} cy={surfaceY} rx={g.rim.rx * 0.82} ry="6" fill={shades.meniscus} opacity="0.55" />
      </g>

      {/* ice (clipped to glass interior) */}
      {ice !== "none" && (
        <g clipPath={`url(#${clipPathId})`}>
          {ice === "cube" ? (
            <g>
              <rect x={g.rim.cx - 17} y={surfaceY + 4} width="34" height="34" rx="5" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
              <path d={`M${g.rim.cx - 12} ${surfaceY + 10} L${g.rim.cx + 6} ${surfaceY + 10}`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <rect x={g.rim.cx - 18} y={surfaceY + 6} width="22" height="22" rx="4" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.26)" strokeWidth="1" />
              <rect x={g.rim.cx + 2} y={surfaceY + 16} width="20" height="20" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
            </g>
          )}
        </g>
      )}

      {/* bubbles */}
      {drink.carbonated && (
        <g className="ar-bubbles" clipPath={`url(#${clipPathId})`}>
          {BUBBLES.map((b, i) => {
            const startY = g.bottomY - 8;
            const rise = Math.max(20, startY - surfaceY - 2);
            return (
              <circle key={i} className="ar-bub" cx={g.rim.cx + b.dx} cy={startY} r={1.6 + (i % 3) * 0.5}
                fill="#FFF0D2" style={{ "--ar-d": `${b.d}s`, "--ar-delay": `${b.delay}s`, "--ar-rise": rise }} />
            );
          })}
        </g>
      )}

      {/* reflections + glint (clipped to glass interior) */}
      <g clipPath={`url(#${clipPathId})`}>
        <ellipse cx={g.rim.cx - 26} cy={(g.rim.cy + g.bottomY) / 2} rx="10" ry={(g.bottomY - g.rim.cy) * 0.32} fill="rgba(255,255,255,0.10)" />
        <ellipse cx={g.rim.cx - 32} cy={(g.rim.cy + g.bottomY) / 2 - 12} rx="3.2" ry={(g.bottomY - g.rim.cy) * 0.22} fill="rgba(255,255,255,0.22)" />
        <polygon className="ar-glint"
          points={`${g.rim.cx - 22},${g.rim.cy} ${g.rim.cx - 4},${g.rim.cy} ${g.rim.cx - 30},${g.bottomY} ${g.rim.cx - 48},${g.bottomY}`}
          fill="rgba(255,255,255,0.16)" />
      </g>

      {/* glass outline */}
      <path d={g.outline} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx={g.rim.cx} cy={g.rim.cy} rx={g.rim.rx} ry={g.rim.ry} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {g.stem && <line x1={g.stem.x} y1={g.stem.y1} x2={g.stem.x} y2={g.stem.y2} stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" />}
      {g.foot && <ellipse cx={g.foot.cx} cy={g.foot.cy} rx={g.foot.rx} ry={g.foot.ry} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" />}
      {g.base && <ellipse cx={g.base.cx} cy={g.base.cy} rx={g.base.rx} ry={g.base.ry} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />}

      {/* condensation */}
      {g.cond.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(255,255,255,0.28)" />)}

      {/* garnish at the rim anchor */}
      <g transform={`translate(${g.anchor.x} ${g.anchor.y})`}>
        {(drink.garnish || []).slice(0, 2).map((name, i) => garnishGlyph(name, i, i * 18))}
      </g>
    </svg>
  );

  if (!stage) return <><style>{KEYFRAMES}</style>{svg}</>;
  return (
    <div style={{ background: "#15151a", borderRadius: 16, padding: 22, display: "flex", justifyContent: "center" }}>
      <style>{KEYFRAMES}</style>
      {svg}
    </div>
  );
}

/* --------------------------------- demo ----------------------------------- */

const SAMPLES = {
  "Patio Bloom": {
    name: "Patio Bloom", build: "spritz",
    components: [
      { role: "bittersweet", name: "Aperol", amount: 1.5, unit: "oz" },
      { role: "aromatic", name: "dry vermouth", amount: 1, unit: "oz" },
      { role: "acid", name: "lemon juice", amount: 0.5, unit: "oz" },
      { role: "lengthener", name: "soda water", amount: 2, unit: "oz" },
    ],
    glass: "wine glass", garnish: ["orange slice", "edible flower"],
    method: "Build over ice in a wine glass, top with soda water, stir gently.",
    flavorDirection: "Bright and lightly bitter with citrus lift and a crisp finish.",
    colorHint: "#F26B3A", carbonated: true, tags: ["bitter", "refreshing", "citrusy"],
  },
  "Ember Cellar": {
    name: "Ember Cellar", build: "stirred",
    components: [
      { role: "base", name: "tequila blanco", amount: 2, unit: "oz" },
      { role: "aromatic", name: "sweet vermouth", amount: 1, unit: "oz" },
      { role: "bittersweet", name: "Campari", amount: 0.5, unit: "oz" },
      { role: "aromatic", name: "Angostura bitters", amount: 2, unit: "dash" },
    ],
    glass: "old fashioned", garnish: ["orange twist", "dehydrated orange"],
    method: "Stir with ice, strain over a large cube in an old fashioned glass. Express the twist.",
    flavorDirection: "Deep, brooding and spirit-forward with bittersweet agave warmth.",
    colorHint: "#6E2A1F", carbonated: false, tags: ["boozy", "bitter", "aromatic"],
  },
  "Golden Hour": {
    name: "Golden Hour", build: "spritz",
    components: [
      { role: "base", name: "Lillet Blanc", amount: 1.5, unit: "oz" },
      { role: "bittersweet", name: "Aperol", amount: 0.75, unit: "oz" },
      { role: "acid", name: "fresh lemon", amount: 0.5, unit: "oz" },
      { role: "lengthener", name: "dry sparkling", amount: 2, unit: "oz" },
    ],
    glass: "wine glass", garnish: ["grapefruit twist", "thyme sprig"],
    method: "Build over ice, top with sparkling, express the peel.",
    flavorDirection: "Bittersweet citrus, long and dry.",
    colorHint: "#E8954A", carbonated: true, tags: ["low-abv", "spritz", "citrus"],
  },
};

export default function App() {
  const [pick, setPick] = useState("Patio Bloom");
  const drink = SAMPLES[pick];
  const btn = (active) => ({
    fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
    border: active ? "1.5px solid #DA281C" : "0.5px solid #cfcdc4",
    background: active ? "rgba(218,40,28,0.08)" : "transparent",
    color: "inherit", fontWeight: active ? 500 : 400,
  });
  return (
    <div style={{ maxWidth: 380, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} style={btn(k === pick)} onClick={() => setPick(k)}>{k}</button>
        ))}
      </div>
      <DrinkRender drink={drink} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{drink.name}</div>
        <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, marginTop: 2 }}>{drink.flavorDirection}</div>
      </div>
    </div>
  );
}
