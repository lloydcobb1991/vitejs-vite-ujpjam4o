# Alembic — cocktail ideation brain (v1)

Backend + schema only (no UI yet). Two Vercel serverless functions under
`api/alembic/`, following the same pattern as `api/analyze.js` and `api/rfp.js`
(`export default async function handler(req, res)`, method guard, loud env-var
failure, try/catch, log on error).

**All Claude calls happen server-side**, keyed from the `ANTHROPIC_API_KEY`
environment variable (the same one `api/analyze.js` already uses) — the frontend
never sees the key.

Before each Claude call the function loads a **vocabulary** of allowed
ingredients / glasses / garnishes / tags and injects it into the system prompt,
so outputs stay within things we have data and render assets for.

> **Routing note:** Vercel maps files in `api/` to `/api/...`, so the live paths
> are `/api/alembic/generate` and `/api/alembic/swap` (the brief wrote them
> without the `/api` prefix).
>
> **Datastore note:** the brief mentions Supabase, but this repo's source of
> truth is **Airtable** (see `api/rfp.js`) and there's no recipe/vocabulary
> table yet. So the vocabulary is a seed JSON file
> (`api/_lib/vocabulary.json`) with a clear TODO — see `loadVocabulary()` in
> `api/_lib/vocabulary.js`. Swap it for the real recipe DB (Airtable or Supabase)
> later, keeping the `{ ingredients, glasses, garnishes, tags, builds }` shape so
> the prompts and validators don't change.

## Endpoints

### `POST /api/alembic/generate`

Invent a Drink framework from a creative prompt.

- **Model:** `claude-opus-4-8`
- **Body:** `{ "prompt": string, "vibe"?: string }`
- **200:** a `Drink` object (schema below)
- **400:** `prompt` missing / not a string, or `vibe` not a string
- **422:** model didn't return valid JSON for the schema after one retry —
  body is `{ error, validationErrors, raw }` (`raw` = the model's text)

```bash
curl -X POST http://localhost:3000/api/alembic/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a bittersweet aperitif for a rooftop sunset","vibe":"terracotta and citrus"}'
```

### `POST /api/alembic/swap`

Suggest 2–3 alternatives for one slot of an existing drink.

- **Model:** `claude-sonnet-4-6`
- **Body:** `{ "drink": Drink, "slot": string }` — `slot` is a component role
  (`base` / `bittersweet` / `acid` / `sweet` / `aromatic` / `lengthener`) or the
  name of one of the drink's components
- **200:** `{ "alternatives": [{ "name": string, "amount"?: number, "unit"?: string, "why": string }] }`
- **400:** `drink` not an object, or `slot` missing / not a string
- **422:** same shape as `/generate`

```bash
curl -X POST http://localhost:3000/api/alembic/swap \
  -H 'Content-Type: application/json' \
  -d '{"drink": { ...Drink... }, "slot": "bittersweet"}'
```

## Drink schema

Defined and validated in `api/_lib/drinkSchema.js`. Every `/generate` response is
validated against it before being returned.

```jsonc
{
  "name": "string",
  "build": "string",                  // "spritz" | "shaken sour" | "stirred" | ...
  "components": [
    {
      "role": "base|bittersweet|acid|sweet|aromatic|lengthener",
      "name": "string",
      "amount": 1.5,
      "unit": "oz"
    }
  ],
  "glass": "string",
  "garnish": ["string"],
  "method": "string",
  "flavorDirection": "string",
  "colorHint": "#E4572E",             // hex, drives the liquid color in the render
  "carbonated": false,
  "tags": ["string"]
}
```

## JSON safety

Both endpoints instruct Claude to return **only** valid JSON (no prose, no code
fences). The function still defends itself (`api/_lib/claude.js`):

1. Strip markdown fences defensively, then `JSON.parse`.
2. Validate against the schema (`drinkSchema.js`).
3. On parse **or** validation failure, retry the Claude call **once**.
4. If it still fails, respond **422** with the raw model text.

## Environment

| Name                | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key. Required — read server-side only.  |

Set it in Vercel (Project → Settings → Environment Variables); it's already used
by `api/analyze.js`.

## Files

| File                              | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `api/alembic/generate.js`         | `POST /api/alembic/generate` handler                        |
| `api/alembic/swap.js`             | `POST /api/alembic/swap` handler                            |
| `api/_lib/claude.js`              | Server-side Claude call + defensive parse + validate/retry  |
| `api/_lib/drinkSchema.js`         | `Drink` type + `validateDrink` / `validateSwapResult`        |
| `api/_lib/vocabulary.json`        | Seed grounding vocabulary (TODO: replace with recipe DB)     |
| `api/_lib/vocabulary.js`          | Vocabulary loader (swap point for the real DB)               |
| `api/_lib/prompts/generatePrompt.js` | System prompt for `/generate` (tune here)                |
| `api/_lib/prompts/swapPrompt.js`  | System prompt for `/swap` (tune here)                        |

> Files under `api/_lib/` are prefixed-shared modules; the `_` keeps Vercel from
> treating them as routes.
