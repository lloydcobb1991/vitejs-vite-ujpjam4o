import React, { useState } from 'react';
import { Check, X, ExternalLink, LayoutTemplate, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// RFP Pipeline — first slice: the intake form.
//
// Posts to the same-origin Vercel function POST /api/rfp, which creates the
// Airtable row (+ best-effort WordPress landing page) and returns
// { rfp_id, lp_url }. No sends / cron / reconciliation yet.
//
// Brand: white, flat, no shadows, 12px radius. Red is identity/CTA only; gold
// marks the active/selected state. See CLAUDE.md > Brand / design.
// ---------------------------------------------------------------------------

const C = {
  white: '#ffffff',
  red: '#da291c',
  gold: '#fcb900',
  text: '#3a3a38',
  textSub: '#6f6e69',
  border: '#e3e2dd',
  bg: '#f7f6f3',
};

// Stub template registry. TODO: replace with GET from the WP `templates`
// registry (name, created_at, thumbnail_url, wp_template_id) once it exists.
const TEMPLATE_STUBS = [
  { id: 'tmpl-standard', name: 'Standard RFP', note: 'Logo, brief, single CTA' },
  { id: 'tmpl-detailed', name: 'Detailed Brief', note: 'Long-form + timeline' },
  { id: 'tmpl-minimal', name: 'Minimal', note: 'Headline + signup only' },
];

const EMPTY = {
  name: '',
  client: '',
  deadline: '',
  description: '',
  logo_url: '',
  template_id: '',
};

export default function RfpPipeline() {
  const [form, setForm] = useState(EMPTY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { rfp_id, lp_url, ... }
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectedTemplate = TEMPLATE_STUBS.find((t) => t.id === form.template_id);
  const canSubmit =
    form.name.trim() && form.client.trim() && form.deadline.trim() && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const resp = await fetch('/api/rfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }
      setResult(data);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        padding: '80px 2% 60px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              fontWeight: 600,
              letterSpacing: '-0.5px',
            }}
          >
            Launch an RFP
          </h1>
          <p style={{ margin: '8px 0 0', color: C.textSub, fontSize: '16px' }}>
            Create the record and its landing page. Reminders are set up later.
          </p>
        </div>

        {/* Success banner */}
        {result && (
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${C.gold}`,
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Check size={20} color={C.text} />
              <strong style={{ fontSize: '16px' }}>
                RFP #{result.rfp_id} created
              </strong>
            </div>
            <div style={{ marginTop: '10px', color: C.textSub, fontSize: '14px' }}>
              {result.landing_page_created && result.lp_url ? (
                <a
                  href={result.lp_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: C.red,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                  }}
                >
                  View landing page <ExternalLink size={14} />
                </a>
              ) : (
                <span>
                  Landing page not created (WordPress not configured yet) — the
                  Airtable record is saved.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: '#fdecea',
              border: `1px solid ${C.red}`,
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: C.red,
              fontSize: '14px',
            }}
          >
            <X size={18} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit}>
          <Card>
            <Field label="RFP name" required>
              <input
                style={inputStyle}
                value={form.name}
                onChange={set('name')}
                placeholder="Annual Services RFP"
              />
            </Field>

            <Row>
              <Field label="Client" required>
                <input
                  style={inputStyle}
                  value={form.client}
                  onChange={set('client')}
                  placeholder="Acme Corp"
                />
              </Field>
              <Field label="Deadline" required>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.deadline}
                  onChange={set('deadline')}
                />
              </Field>
            </Row>

            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                value={form.description}
                onChange={set('description')}
                placeholder="What the RFP is about…"
              />
            </Field>

            <Field
              label="Logo URL"
              hint="Paste a hosted image URL. File upload to storage comes later."
            >
              <input
                style={inputStyle}
                value={form.logo_url}
                onChange={set('logo_url')}
                placeholder="https://…/logo.png"
              />
            </Field>

            <Field label="Landing page template">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                style={{
                  ...inputStyle,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: C.white,
                  color: selectedTemplate ? C.text : C.textSub,
                }}
              >
                <span>
                  {selectedTemplate
                    ? selectedTemplate.name
                    : 'Choose a template…'}
                </span>
                <LayoutTemplate size={18} color={C.textSub} />
              </button>
            </Field>
          </Card>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: canSubmit ? C.red : C.border,
              color: canSubmit ? C.white : C.textSub,
              fontSize: '16px',
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s ease',
            }}
          >
            {submitting && <Loader2 size={18} className="rfp-spin" />}
            {submitting ? 'Creating…' : 'Create RFP'}
          </button>
        </form>
      </div>

      {/* Template side-drawer */}
      {drawerOpen && (
        <TemplateDrawer
          templates={TEMPLATE_STUBS}
          selectedId={form.template_id}
          onSelect={(id) => {
            setForm((f) => ({ ...f, template_id: id }));
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <style>{`
        .rfp-spin { animation: rfp-spin 0.8s linear infinite; }
        @keyframes rfp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// --- small presentational helpers -----------------------------------------

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: '10px',
  border: `1px solid #e3e2dd`,
  fontSize: '15px',
  fontFamily: 'inherit',
  color: '#3a3a38',
  outline: 'none',
  background: '#ffffff',
};

function Card({ children }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {children}
    </div>
  );
}

function Row({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '6px',
          color: C.text,
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px' }}>
          {hint}
        </div>
      )}
    </label>
  );
}

function TemplateDrawer({ templates, selectedId, onSelect, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(58, 58, 56, 0.35)',
          zIndex: 1100,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          maxWidth: '90vw',
          background: C.white,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 1101,
          padding: '28px 24px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Choose template
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: C.textSub,
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {templates.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  borderRadius: '12px',
                  border: active
                    ? `2px solid ${C.gold}`
                    : `1px solid ${C.border}`,
                  background: C.white,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>
                  {t.name}
                </div>
                <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
                  {t.note}
                </div>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '12px', color: C.textSub, marginTop: '20px' }}>
          Templates are placeholders. They'll be pulled from the WordPress
          template registry once that's wired up.
        </p>
      </div>
    </>
  );
}
