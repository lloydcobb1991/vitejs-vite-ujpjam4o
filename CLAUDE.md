# RFP Pipeline — Tool Portal

## Project overview

Internal tool portal for a creative/marketing team. Currently adding a new module: an **RFP pipeline** that lets the director launch RFPs, collect signups via a landing page, and run deadline-anchored follow-up emails — all from one screen. He should never touch Mailchimp's automation builder again.

This is a trust-building internal tool. The director is a creative director: clean design, due diligence, visible data. No clutter.

---

## Stack

- **Frontend:** React (Vite), deployed on Vercel
- **Backend:** Vercel serverless functions in `api/` — same pattern as the existing `api/analyze.js` and `api/send-emails.js` (`export default async function handler(req, res)`). This is where the RFP engine lives. No separate server.
- **CI/CD:** GitHub — pushes to main auto-deploy on Vercel
- **Source of truth:** Airtable (human-visible grid + API)
- **Email list:** Mailchimp Marketing API — **list management only** (audience upsert + tagging + unsubscribe compliance)
- **Email sends:** SendGrid (already set up — see `api/send-emails.js`) — per-recipient, transactional, merge-var-driven
- **Landing pages:** WordPress REST API → Custom Post Type "rfp" with ACF fields

---

## Architecture: RFP pipeline

### Data flow

```
Director fills intake form (React)
  → POST /api/rfp (Vercel serverless function)
    → Creates RFP row in Airtable (rfps table)
    → Creates WordPress CPT entry via REST (renders the landing page)
    → Returns RFP ID + LP URL to frontend

Contact submits LP signup form (Gravity Forms on WP)
  → Zapier webhook (or POST /api/signup serverless endpoint)
    → Upserts contact in Mailchimp audience + adds RFP tag (list management only)
    → Creates signup row in Airtable (signups table)

Vercel cron (hourly) → POST /api/cron/sweep
  → Queries Airtable: signups where a deadline-anchored reminder is due
  → Sends via SendGrid with per-message merge vars
  → Stamps each row with send timestamp

Vercel cron (hourly, separate) → POST /api/cron/reconcile
  → Counts: Airtable signups vs Mailchimp list members vs SendGrid sends
  → Writes match/mismatch to Airtable reconciliation record
  → Dashboard renders green (in sync) or red (out of sync) per RFP
```

> Cron note: Vercel Cron Jobs are configured in `vercel.json` and hit a serverless
> endpoint on a schedule. The free/hobby tier limits cron frequency — confirm the
> plan supports hourly before relying on it.

### Reminder schedule

Reminders are **deadline-anchored**, not signup-anchored. For each signup:
- `D-7`, `D-3`, `D-1` (configurable per RFP)
- Each run checks: is today in this reminder's window? Is it unsent? Is deadline still future?
- Late entrants automatically skip past-window steps — no stuck states
- If deadline changes in Airtable, all timing recalculates automatically on the next run

---

## Airtable schema

### `rfps` table
| Field | Type | Notes |
|---|---|---|
| rfp_id | Auto number | Primary key |
| name | Text | e.g. "Annual Services RFP" |
| client | Text | e.g. "Acme Corp" |
| deadline | Date | All reminder timing derives from this |
| description | Long text | |
| logo_url | URL | Used in email + LP merge vars |
| wp_page_id | Number | Returned by WP REST on creation |
| lp_url | URL | |
| template_id | Text | Which LP template was chosen |
| status | Select | active / closed / draft |
| created_at | Date |

### `signups` table
| Field | Type | Notes |
|---|---|---|
| signup_id | Auto number | |
| rfp_id | Link to rfps | |
| email | Email | |
| name | Text | |
| organisation | Text | |
| signed_up_at | Date/time | |
| fu1_sent_at | Date/time | D-7 reminder |
| fu2_sent_at | Date/time | D-3 reminder |
| fu3_sent_at | Date/time | D-1 reminder |
| fu1_skipped | Checkbox | Joined after window |
| fu2_skipped | Checkbox | |
| fu3_skipped | Checkbox | |
| mc_status | Text | delivered / bounced / failed |

### `reconciliation` table
| Field | Type | Notes |
|---|---|---|
| rfp_id | Link to rfps | |
| airtable_count | Number | |
| mailchimp_count | Number | |
| sendgrid_sent | Number | |
| in_sync | Checkbox | |
| checked_at | Date/time | |
| notes | Text | Describes any mismatch |

---

## Backend endpoints (Vercel serverless functions)

File-based routing: `api/rfp.js` → `POST /api/rfp`. Sub-paths need their own files
(e.g. `api/rfps.js` for the plural list route, `api/cron/sweep.js` for the cron).

```
POST /api/rfp            — create RFP (Airtable + WP CPT)        → api/rfp.js
GET  /api/rfps           — list all active RFPs for dashboard    → api/rfps.js
GET  /api/rfp/:id        — single RFP w/ signups + reconciliation → api/rfp/[id].js
POST /api/signup         — inbound LP signup (Mailchimp list + Airtable row) → api/signup.js
POST /api/cron/sweep     — hourly: send due reminders via SendGrid → api/cron/sweep.js
POST /api/cron/reconcile — hourly: count layers and write match/mismatch → api/cron/reconcile.js
```

---

## Email (SendGrid)

Transactional sends go through SendGrid (already wired in `api/send-emails.js`).
Pass merge data **per message** — do NOT store RFP data on the Mailchimp contact
record. The Mailchimp contact is only for list membership + unsubscribe compliance.

SendGrid carries per-recipient merge data in `personalizations[].dynamic_template_data`
(when using a dynamic template) or via substitutions:

```js
// Example SendGrid payload (dynamic template)
{
  from: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME },
  template_id: process.env.SENDGRID_RFP_TEMPLATE_ID,
  personalizations: [
    {
      to: [{ email: signup.email }],
      dynamic_template_data: {
        RFP_NAME: rfp.name,
        RFP_DEADLINE: formatDate(rfp.deadline),
        RFP_CLIENT: rfp.client,
        LP_URL: rfp.lp_url,
        LOGO_URL: rfp.logo_url
      }
    }
  ]
}
```

If not using a dynamic template, build the `content` blocks per message and inline
the same values — never persist them on the contact.

---

## Landing pages (WordPress)

- Custom Post Type: `rfp` with ACF fields matching the Airtable RFP schema
- Page builder (Elementor/Bricks) templates use dynamic field bindings — not static content
- Director builds templates visually; system creates CPT entries via REST; template renders the data
- Template picker: a `templates` registry (name, created_at, thumbnail_url, wp_template_id) shown as a side-drawer in the intake form

```
POST /wp-json/wp/v2/rfp    — create new RFP CPT entry
```
Note: ACF fields over REST may need the ACF to REST API plugin or explicit `register_rest_field` calls.

---

## Dashboard (React)

**What the director sees:**
- Metric cards: active RFPs, signups this week, sent today, needs attention count
- Per-RFP card: name + client, deadline countdown, signup count, mini follow-up timeline (announced → D-7 → D-3 → D-1 → due), status pill
- Timeline states: done (dark grey filled check), next (gold ring), pending (hollow grey), skipped (dashed)
- Layer-check strip per card: Airtable N · List N · Sends N → "in sync" or red "out of sync — list short by 1"
- Needs attention panel: only visible when something is wrong (bounce, mismatch)

Keep it clean. The director is a creative director. No clutter, no unnecessary chrome.

---

## Brand / design

- **Primary:** white `#ffffff`
- **Accent red:** `#da291c` — use for identity (logo, primary CTA) and genuine alerts only. Do not use decoratively.
- **Accent gold:** `#fcb900` — use for "next/active" state in timelines. Avoid for warnings (too close to semantic warning colour).
- **Dark grey:** `#3a3a38` text primary, `#6f6e69` secondary, `#e3e2dd` borders
- **Font:** Brandon Grotesque (via Adobe Fonts / Creative Cloud license). Loaded via the Typekit embed in `index.html` (`use.typekit.net/gfb2mjm.css`). Weights: 400 regular, 600 semibold. Do not substitute with system fonts in production.
- Flat, no shadows, no gradients. Generous whitespace. `border-radius: 12px` for cards.

---

## First slice to build

Build this vertical path end to end before anything else:

1. **Intake form** (React) — fields: RFP name, client, deadline, description, logo upload, template picker (side-drawer)
2. **`POST /api/rfp`** (Vercel serverless) — creates Airtable row + WP CPT entry, returns `{ rfp_id, lp_url }`
3. **Dashboard card** (React) — reads `GET /api/rfps`, renders one card per RFP with the timeline

No sends, no cron, no reconciliation yet. Just the intake → storage → display loop. Once this round-trips cleanly, layer in the SendGrid pieces, then the cron, then the WP template picker.

---

## Dev commands

```bash
npm run dev        # local dev server (vite)
npm run build      # production build (vite build)
npm run preview    # preview the production build locally
# No test runner configured yet — add one before relying on `npm test`.
```

> Note: `node`/`npm` are provided via nvm (`v24.x`). If `npm` is "command not
> found", run `. "$HOME/.nvm/nvm.sh"` first.

---

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables):

```
# Existing (current tools)
ANTHROPIC_API_KEY        # api/analyze.js — Claude proxy
SENDGRID_API_KEY         # api/send-emails.js — transactional sends
FROM_EMAIL, FROM_NAME    # SendGrid sender identity
REPLY_TO_EMAIL, REPLY_TO_NAME

# RFP pipeline (new)
AIRTABLE_API_KEY         # Airtable personal access token
AIRTABLE_BASE_ID         # the base holding rfps / signups / reconciliation
AIRTABLE_RFPS_TABLE      # table name or id (default: "rfps")
MAILCHIMP_API_KEY        # list management only
MAILCHIMP_SERVER_PREFIX  # e.g. "us21"
MAILCHIMP_AUDIENCE_ID    # the audience contacts get upserted into
WP_API_URL               # e.g. https://www.example.com (no trailing slash)
WP_USER                  # WordPress user for app-password auth
WP_APP_PASSWORD          # WordPress application password
SENDGRID_RFP_TEMPLATE_ID # dynamic template for reminder emails (when built)
```

---

## Rules

- Never store RFP details (name, deadline, logo) as Mailchimp merge fields on the contact. Always pass per message via SendGrid. Mailchimp holds list membership + unsubscribe status only.
- Deadline-anchored reminders only — never drip from signup date.
- Every send must stamp a timestamp on the Airtable signup row before moving on.
- Keep the serverless endpoint contracts stable — the React frontend and the cron jobs both depend on them.
- Follow the existing `api/` pattern: `export default async function handler(req, res)`, guard the HTTP method, check required env vars and fail loudly, wrap in try/catch, log on error.
- When in doubt, add a log line. The director will want to know what happened.
