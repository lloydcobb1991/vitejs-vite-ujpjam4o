import React, { useEffect, useState } from "react";
import { DrinkRender } from "./DrinkRender";

/*
  Alembic — BookView
  ------------------
  The mixologist's saved collection. Fetches GET /api/alembic/book and shows a
  grid of saved drinks; clicking one calls onOpen(drink, notes) so the loadout
  reloads it for more riffing.

  Expects the endpoint to return { drinks: [{ id, name, drink, notes, createdAt }] }
  where `drink` is the parsed Drink object.
*/

const RED = "#DA281C";

export default function BookView({ onOpen }) {
  const [state, setState] = useState({ status: "loading", drinks: [], error: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/alembic/book");
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data?.error || `Couldn't load the book (${res.status})`);
        if (alive) setState({ status: "ready", drinks: data.drinks || [], error: null });
      } catch (e) {
        if (alive) setState({ status: "error", drinks: [], error: e.message });
      }
    })();
    return () => { alive = false; };
  }, []);

  const wrap = { fontFamily: "system-ui, sans-serif", color: "#2c2c2a" };
  const msg = { fontSize: 14, color: "#6b6a64", padding: "2rem 0", textAlign: "center", lineHeight: 1.6 };

  if (state.status === "loading") return <div style={{ ...wrap }}><div style={msg}>Opening the book…</div></div>;
  if (state.status === "error") return <div style={{ ...wrap }}><div style={{ ...msg, color: "#A32D2D" }}>{state.error}</div></div>;
  if (!state.drinks.length) {
    return (
      <div style={wrap}>
        <div style={msg}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#2c2c2a", marginBottom: 4 }}>Your book is empty</div>
          Build a drink and hit “Save to my book” — every one you keep lands here, ready to reopen and riff on.
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 13, color: "#86857e", marginBottom: 12 }}>{state.drinks.length} saved {state.drinks.length === 1 ? "drink" : "drinks"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {state.drinks.map((d) => (
          <button key={d.id} onClick={() => onOpen(d.drink, d.notes || "")}
            style={{ border: "0.5px solid #d6d4cb", borderRadius: 12, background: "#fff", padding: 10, cursor: "pointer", font: "inherit", textAlign: "center" }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              <DrinkRender drink={d.drink} width={150} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>{d.drink?.name || "Untitled"}</div>
            <div style={{ fontSize: 12, color: "#86857e", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(d.drink?.tags || []).slice(0, 3).join(" · ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
