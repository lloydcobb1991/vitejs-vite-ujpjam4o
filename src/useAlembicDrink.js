import { useCallback, useState } from "react";

/*
  useAlembicDrink — the spine that connects a prompt to the render.
  --------------------------------------------------------------------
  Holds one Drink in state and talks to the two deployed endpoints:

    generate(prompt, vibe)  -> POST /api/alembic/generate  (claude-opus-4-8)
    swap(slot)              -> POST /api/alembic/swap       (claude-sonnet-4-6)

  generate() replaces the whole drink. swap() fetches alternatives for one slot
  WITHOUT mutating the drink — the UI shows them in the quick-swap strip, and the
  user commits one via applySwap(). That keeps "show me options" and "change it"
  as two separate, undoable steps, which is how the loadout is meant to feel.

  Slot vocabulary matches the schema: a component role
  ("base" | "bittersweet" | "acid" | "sweet" | "aromatic" | "lengthener")
  or one of "glass" | "garnish" | "method".

  Usage:
    const { drink, status, error, generate, swap, swapState, applySwap } = useAlembicDrink();
    generate("bright, low-ABV, summer patio", "fresh daytime");
*/

const BASE = "/api/alembic";

async function postJSON(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // 422 path returns raw, unparseable text — surface it instead of throwing blind
    throw new Error(`Bad response from /${path} (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request to /${path} failed (${res.status})`);
  }
  return data;
}

export function useAlembicDrink(initialDrink = null) {
  const [drink, setDrink] = useState(initialDrink);
  const [status, setStatus] = useState("idle"); // idle | generating | ready | error
  const [error, setError] = useState(null);

  // per-slot swap state: { slot, status: "loading"|"ready"|"error", alternatives, error }
  const [swapState, setSwapState] = useState(null);

  const generate = useCallback(async (prompt, vibe) => {
    if (!prompt?.trim()) return;
    setStatus("generating");
    setError(null);
    setSwapState(null);
    try {
      const next = await postJSON("generate", { prompt, vibe });
      setDrink(next);
      setStatus("ready");
      return next;
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, []);

  const swap = useCallback(
    async (slot) => {
      if (!drink) return;
      setSwapState({ slot, status: "loading", alternatives: [], error: null });
      try {
        const { alternatives } = await postJSON("swap", { drink, slot });
        setSwapState({ slot, status: "ready", alternatives: alternatives || [], error: null });
        return alternatives;
      } catch (e) {
        setSwapState({ slot, status: "error", alternatives: [], error: e.message });
      }
    },
    [drink]
  );

  // Commit one alternative into the drink. For component roles we replace the
  // matching component; for glass/garnish/method we set the field directly.
  const applySwap = useCallback((slot, alt) => {
    setDrink((d) => {
      if (!d) return d;
      const next = { ...d };
      if (slot === "glass") next.glass = alt.name;
      else if (slot === "method") next.method = alt.name;
      else if (slot === "garnish") next.garnish = [alt.name, ...(d.garnish || []).slice(1)];
      else {
        next.components = (d.components || []).map((c) =>
          c.role === slot
            ? { ...c, name: alt.name, amount: alt.amount ?? c.amount, unit: alt.unit ?? c.unit }
            : c
        );
      }
      return next;
    });
    setSwapState(null);
  }, []);

  const cancelSwap = useCallback(() => setSwapState(null), []);

  return { drink, status, error, generate, swap, swapState, applySwap, cancelSwap, setDrink };
}
