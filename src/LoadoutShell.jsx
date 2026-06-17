import React, { useState } from "react";
import { DrinkRender } from "./DrinkRender";
import { useAlembicDrink } from "./useAlembicDrink";

/*
  Alembic — LoadoutShell
  ----------------------
  The tool screen. Ties the three pieces together:
    - useAlembicDrink  -> generate() / swap() / applySwap()
    - DrinkRender      -> the live drink in the center
    - slots + strip    -> the riff loop

  This is wired to the LIVE endpoints, so it only "breathes" when running in the
  deployed app (or local dev with the API reachable) — not in isolation.

  Honest v1 gaps, flagged in code so they don't pass as finished:
    - "Detailed search" opens nothing yet (the DB modal is a later build).
    - "Save to book" is a stub (needs the Airtable "my book" table).
    - Build info shows only what the schema returns. ABV/calories are NOT in the
      Drink schema yet — adding them means a schema + prompt change, not a UI hack.
    - Special-touch notes are local state only until "my book" persists them.

  Brand: Ignite red #DA281C. Light shell, dark studio stage in the center.
*/

const RED = "#DA281C";
const ROLE_ORDER = ["base", "bittersweet", "acid", "sweet", "aromatic", "lengthener"];

const ROLE_LABEL = {
  base: "Base", bittersweet: "Bittersweet", acid: "Acid",
  sweet: "Sweet", aromatic: "Aromatic", lengthener: "Top",
};
const TILE = {
  base: { bg: "rgba(239,159,39,0.18)", fg: "#BA7517", g: "bottle" },
  bittersweet: { bg: "rgba(216,90,48,0.16)", fg: "#C75A28", g: "bottle" },
  acid: { bg: "rgba(239,159,39,0.14)", fg: "#C99A2E", g: "droplet" },
  sweet: { bg: "rgba(186,117,23,0.16)", fg: "#9A6312", g: "droplet" },
  aromatic: { bg: "rgba(127,119,221,0.16)", fg: "#5B53B0", g: "droplet" },
  lengthener: { bg: "rgba(55,138,221,0.14)", fg: "#2E72B4", g: "glass" },
  glass: { bg: "#f1efe8", fg: "#5f5e5a", g: "glass" },
  garnish: { bg: "rgba(99,153,34,0.18)", fg: "#557F1C", g: "leaf" },
  method: { bg: "#f1efe8", fg: "#5f5e5a", g: "tool" },
};

function Glyph({ kind, color }) {
  const p = {
    bottle: "M6 1h4v3l1 2v9H5V6l1-2V1z",
    droplet: "M8 1.5C5 6 3.5 8 3.5 10.5a4.5 4.5 0 0 0 9 0C12.5 8 11 6 8 1.5z",
    glass: "M3.5 2h9l-1.2 12.5H4.7L3.5 2z",
    leaf: "M2 14C2 7 7 2 14 2c0 7-5 12-12 12zM2 14C6 11 10 7 13 3",
    tool: "M5 11l6-6m-1-2a3 3 0 0 1 3 3l-8 8-3 1 1-3 8-8z",
  }[kind];
  const filled = kind === "bottle" || kind === "droplet" || kind === "glass";
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={p} fill={filled ? color : "none"} stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" opacity={filled ? 0.9 : 1} />
    </svg>
  );
}

function SlotCard({ slot, label, value, active, onClick }) {
  const t = TILE[slot] || TILE.method;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
        border: active ? `1.5px solid ${RED}` : "0.5px solid #d6d4cb",
        background: active ? "rgba(218,40,28,0.06)" : "#fff",
        borderRadius: 8, padding: "8px 9px", cursor: "pointer", font: "inherit",
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 6, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Glyph kind={t.g} color={t.fg} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11, color: active ? RED : "#86857e", lineHeight: 1.3 }}>{label}</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: "#2c2c2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      </span>
    </button>
  );
}

export default function LoadoutShell() {
  const { drink, status, error, generate, swap, swapState, applySwap, cancelSwap } = useAlembicDrink();
  const [prompt, setPrompt] = useState("");
  const [vibe, setVibe] = useState("");
  const [notes, setNotes] = useState("");

  const onGenerate = () => generate(prompt, vibe || undefined);
  const busy = status === "generating";

  const input = {
    flex: 1, height: 38, padding: "0 12px", borderRadius: 8,
    border: "0.5px solid #d6d4cb", font: "inherit", fontSize: 14, color: "#2c2c2a",
  };
  const primaryBtn = {
    height: 38, padding: "0 18px", borderRadius: 8, border: "none",
    background: RED, color: "#fff", fontWeight: 500, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
  };

  // ---- empty state: prompt-forward, not a blank form ----
  if (!drink) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", fontFamily: "system-ui, sans-serif", padding: "1rem 0" }}>
        <div style={{ height: 4, background: RED, borderRadius: 2, width: 48, marginBottom: 18 }} />
        <div style={{ fontSize: 22, fontWeight: 500, color: "#2c2c2a" }}>What are you in the mood to build?</div>
        <p style={{ fontSize: 14, color: "#6b6a64", margin: "6px 0 18px", lineHeight: 1.6 }}>
          Describe a direction — a feeling, an occasion, a base spirit, a season. Alembic hands back a framework to riff on.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...input, minWidth: 220 }} placeholder="bright, low-ABV, summer patio" value={prompt}
            onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGenerate()} />
          <input style={{ ...input, minWidth: 140, flex: "0 1 160px" }} placeholder="vibe (optional)" value={vibe}
            onChange={(e) => setVibe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGenerate()} />
          <button style={primaryBtn} onClick={onGenerate} disabled={busy}>{busy ? "Distilling…" : "Generate"}</button>
        </div>
        {error && <div style={{ marginTop: 14, fontSize: 13, color: "#A32D2D" }}>{error}</div>}
      </div>
    );
  }

  // ---- loadout view ----
  const components = [...(drink.components || [])].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

  return (
    <div style={{ background: "#fff", border: "0.5px solid #d6d4cb", borderRadius: 12, overflow: "hidden", fontFamily: "system-ui, sans-serif", color: "#2c2c2a" }}>
      <div style={{ height: 4, background: RED }} />
      <div style={{ padding: "1.1rem 1.4rem 1.4rem" }}>

        {/* header + prompt bar */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ color: RED, fontWeight: 500, fontSize: 13 }}>Ignite</span>
          <span style={{ fontWeight: 500, fontSize: 18 }}>Alembic</span>
          <span style={{ fontSize: 13, color: "#9a988f" }}>building · {drink.name}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <input style={input} placeholder="describe another direction…" value={prompt}
            onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGenerate()} />
          <button style={primaryBtn} onClick={onGenerate} disabled={busy}>{busy ? "Distilling…" : "Regenerate"}</button>
        </div>

        {/* slots | render | slots */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr 1fr", gap: 14, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {components.map((c) => (
              <SlotCard key={c.role} slot={c.role} label={ROLE_LABEL[c.role] || c.role}
                value={`${c.name}${c.amount ? `  ${c.amount}${c.unit ? " " + c.unit : ""}` : ""}`}
                active={swapState?.slot === c.role} onClick={() => swap(c.role)} />
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <DrinkRender drink={drink} width={210} />
            <div style={{ fontSize: 12, color: "#9a988f", marginTop: 6 }}>{drink.build}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SlotCard slot="glass" label="Glass" value={drink.glass} active={swapState?.slot === "glass"} onClick={() => swap("glass")} />
            <SlotCard slot="garnish" label="Garnish" value={(drink.garnish || []).join(", ")} active={swapState?.slot === "garnish"} onClick={() => swap("garnish")} />
            <SlotCard slot="method" label="Method" value={drink.method} active={swapState?.slot === "method"} onClick={() => swap("method")} />
          </div>
        </div>

        {/* quick-swap strip */}
        {swapState && (
          <div style={{ marginTop: 14, border: `0.5px solid ${RED}`, background: "rgba(218,40,28,0.05)", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: RED }}>Swap {ROLE_LABEL[swapState.slot]?.toLowerCase() || swapState.slot}</span>
            {swapState.status === "loading" && <span style={{ fontSize: 13, color: "#6b6a64" }}>finding alternatives…</span>}
            {swapState.status === "error" && <span style={{ fontSize: 13, color: "#A32D2D" }}>{swapState.error} <button onClick={() => swap(swapState.slot)} style={{ marginLeft: 6, font: "inherit", fontSize: 13, background: "none", border: "none", color: RED, cursor: "pointer", textDecoration: "underline" }}>retry</button></span>}
            {swapState.status === "ready" && swapState.alternatives.map((alt, i) => (
              <button key={i} title={alt.why} onClick={() => applySwap(swapState.slot, alt)}
                style={{ fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 8, border: "0.5px solid #d6d4cb", background: "#fff", color: "#3a3a38", cursor: "pointer" }}>
                {alt.name}
              </button>
            ))}
            <span style={{ flex: 1, minWidth: 8 }} />
            <button onClick={() => alert("Detailed DB search — coming in a later build")} style={{ fontSize: 13, padding: "5px 12px", borderRadius: 8, border: "0.5px solid #d6d4cb", background: "#fff", color: "#3a3a38", cursor: "pointer" }}>Detailed search ↗</button>
            <button onClick={cancelSwap} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "#9a988f", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* build info + special touch */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ background: "#f7f6f1", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Build info</div>
            {[["Build", drink.build], ["Style", drink.carbonated ? "Sparkling" : "Still"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: "#6b6a64" }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(drink.tags || []).map((t) => (
                <span key={t} style={{ fontSize: 12, color: "#6b6a64", background: "#ece9e0", padding: "3px 9px", borderRadius: 7 }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ background: "#f7f6f1", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ color: RED, fontWeight: 700, fontSize: 15 }}>✦</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Special touch</span>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Prep & finishing the render can't show — smoke, a submerged garnish, tableside express…"
              style={{ width: "100%", resize: "vertical", border: "0.5px solid #d6d4cb", borderRadius: 6, padding: "8px 10px", font: "inherit", fontSize: 13, color: "#2c2c2a", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => alert("Save to book — needs the Airtable 'my book' table")} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "0.5px solid #d6d4cb", background: "#fff", font: "inherit", fontSize: 14, cursor: "pointer" }}>Save to my book</button>
        </div>

      </div>
    </div>
  );
}
