// RfpPipeline.jsx — RFP Pipeline dashboard for the ICS Internal Tools Portal.
//
// Drop-in tool component, same pattern as Emberwatch.jsx / Alembic.
// Register it in the TOOLS registry in AppShell (fill the existing RFP entry
// or add one) and import it:  import RfpPipeline from './RfpPipeline.jsx';
//
// Talks to the Railway backend (rfp.js router). Self-contained: React hooks
// only, no external deps, all styles scoped under .rfp-root so nothing leaks.

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://emberwatch-api-production.up.railway.app';

// Reminder cadence, days before deadline. Mirrors the backend design.
const CADENCE = [7, 3, 1];

// --- date helpers ----------------------------------------------------------

function parseDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(dateStr) {
  const d = parseDay(dateStr);
  if (!d) return '\u2014';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// green (plenty of time) -> amber (<=7) -> red (<=3) -> grey (past)
function urgency(daysUntil) {
  if (daysUntil == null) return 'none';
  if (daysUntil < 0) return 'past';
  if (daysUntil <= 3) return 'red';
  if (daysUntil <= 7) return 'amber';
  return 'green';
}

// Build the D-7 / D-3 / D-1 / Due markers for a deadline. `passed` = that
// window is behind us. When the cron writes real sent_at data we can upgrade
// passed markers to sent/missed; for now the schedule position is the truth.
function scheduleFor(deadline) {
  const due = parseDay(deadline);
  if (!due) return [];
  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const marks = CADENCE.map((offset) => {
    const at = new Date(due.getTime() - offset * 86400000);
    return { key: `D-${offset}`, label: `D-${offset}`, at, passed: at.getTime() < utcToday };
  });
  marks.push({ key: 'due', label: 'Due', at: due, passed: due.getTime() < utcToday, isDue: true });
  return marks;
}

// --- small components ------------------------------------------------------

function Timeline({ deadline }) {
  const marks = scheduleFor(deadline);
  if (!marks.length) {
    return <div className="rfp-timeline rfp-timeline--empty">No deadline set</div>;
  }
  return (
    <div className="rfp-timeline" role="img" aria-label="Reminder schedule">
      <div className="rfp-timeline-track" />
      {marks.map((m) => (
        <div key={m.key} className={`rfp-mark ${m.passed ? 'is-passed' : 'is-upcoming'} ${m.isDue ? 'is-due' : ''}`}>
          <span className="rfp-dot" />
          <span className="rfp-mark-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function RfpCard({ rfp, onOpen }) {
  const u = urgency(rfp.days_until);
  const daysText =
    rfp.days_until == null
      ? 'No date'
      : rfp.days_until < 0
        ? `${Math.abs(rfp.days_until)}d ago`
        : rfp.days_until === 0
          ? 'Due today'
          : `${rfp.days_until}d left`;

  return (
    <button className={`rfp-card rfp-accent-${u}`} onClick={() => onOpen(rfp)}>
      <div className="rfp-card-top">
        <span className="rfp-eyebrow">{rfp.client || 'No client'}</span>
        <span className={`rfp-days rfp-days-${u}`}>{daysText}</span>
      </div>
      <h3 className="rfp-card-title">{rfp.name || 'Untitled RFP'}</h3>
      <div className="rfp-card-meta">
        <span>Due {fmtDate(rfp.deadline)}</span>
        <span className="rfp-dotsep">\u00b7</span>
        <span>{rfp.signup_count} {rfp.signup_count === 1 ? 'signup' : 'signups'}</span>
        {rfp.status && rfp.status !== 'active' && (
          <>
            <span className="rfp-dotsep">\u00b7</span>
            <span className="rfp-status-pill">{rfp.status}</span>
          </>
        )}
      </div>
      <Timeline deadline={rfp.deadline} />
    </button>
  );
}

function Drawer({ open, onClose, onCreate, submitting, error }) {
  const [form, setForm] = useState({ name: '', client: '', deadline: '', description: '', logo_url: '' });

  useEffect(() => {
    if (open) setForm({ name: '', client: '', deadline: '', description: '', logo_url: '' });
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ready = form.name.trim() && form.client.trim() && form.deadline;

  return (
    <div className={`rfp-drawer-wrap ${open ? 'is-open' : ''}`}>
      <div className="rfp-scrim" onClick={submitting ? undefined : onClose} />
      <aside className="rfp-drawer" role="dialog" aria-label="New RFP">
        <div className="rfp-drawer-head">
          <h2>New RFP</h2>
          <button className="rfp-x" onClick={onClose} disabled={submitting} aria-label="Close">\u00d7</button>
        </div>

        {error && <div className="rfp-banner rfp-banner-error">{error}</div>}

        <label className="rfp-field">
          <span>RFP name</span>
          <input value={form.name} onChange={set('name')} placeholder="Annual beverage program RFP" />
        </label>
        <label className="rfp-field">
          <span>Client</span>
          <input value={form.client} onChange={set('client')} placeholder="Acme Hospitality Group" />
        </label>
        <label className="rfp-field">
          <span>Deadline</span>
          <input type="date" value={form.deadline} onChange={set('deadline')} />
        </label>
        <label className="rfp-field">
          <span>Description <em>optional</em></span>
          <textarea rows={3} value={form.description} onChange={set('description')} placeholder="Short summary vendors will see." />
        </label>
        <label className="rfp-field">
          <span>Logo URL <em>optional</em></span>
          <input value={form.logo_url} onChange={set('logo_url')} placeholder="https://\u2026" />
        </label>

        <div className="rfp-drawer-foot">
          <button className="rfp-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="rfp-btn" onClick={() => onCreate(form)} disabled={!ready || submitting}>
            {submitting ? 'Creating\u2026' : 'Create RFP'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ data, loading, onBack }) {
  if (loading) {
    return (
      <div className="rfp-detail">
        <button className="rfp-back" onClick={onBack}>\u2190 All RFPs</button>
        <div className="rfp-loading">Loading\u2026</div>
      </div>
    );
  }
  if (!data || !data.rfp) return null;
  const { rfp, signups } = data;
  const u = urgency(rfp.days_until);

  return (
    <div className="rfp-detail">
      <button className="rfp-back" onClick={onBack}>\u2190 All RFPs</button>

      <div className={`rfp-detail-head rfp-accent-${u}`}>
        <span className="rfp-eyebrow">{rfp.client}</span>
        <h2>{rfp.name}</h2>
        <div className="rfp-card-meta">
          <span>Due {fmtDate(rfp.deadline)}</span>
          <span className="rfp-dotsep">\u00b7</span>
          <span>
            {rfp.days_until == null ? 'No date'
              : rfp.days_until < 0 ? `${Math.abs(rfp.days_until)} days ago`
                : `${rfp.days_until} days left`}
          </span>
          <span className="rfp-dotsep">\u00b7</span>
          <span className="rfp-status-pill">{rfp.status}</span>
        </div>
        {rfp.description && <p className="rfp-detail-desc">{rfp.description}</p>}
        <Timeline deadline={rfp.deadline} />
      </div>

      <div className="rfp-signups">
        <div className="rfp-signups-head">
          <h3>Signups</h3>
          <span className="rfp-count-chip">{signups.length}</span>
        </div>

        {signups.length === 0 ? (
          <div className="rfp-empty-inline">No one has signed up yet. Share the landing page to start collecting vendors.</div>
        ) : (
          <table className="rfp-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Organization</th>
                <th>Signed up</th>
                <th>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{s.name || '\u2014'}</td>
                  <td>{s.organisation || '\u2014'}</td>
                  <td>{fmtDateTime(s.signed_up_at)}</td>
                  <td>
                    <span className="rfp-rem-row">
                      {['fu1', 'fu2', 'fu3'].map((k, i) => {
                        const r = s.reminders?.[k] || {};
                        const state = r.sent_at ? 'sent' : r.skipped ? 'skipped' : 'pending';
                        return (
                          <span key={k} className={`rfp-rem rfp-rem-${state}`} title={`D-${CADENCE[i]}: ${state}`}>
                            D-{CADENCE[i]}
                          </span>
                        );
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- main ------------------------------------------------------------------

export default function RfpPipeline() {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const [view, setView] = useState('dashboard'); // 'dashboard' | 'detail'
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRfps = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE}/api/rfps`);
      const data = await res.json();
      if (data.error === 'Airtable not configured') {
        setNotConfigured(true);
        setRfps([]);
      } else if (data.error) {
        setLoadError(data.error);
        setRfps(data.rfps || []);
      } else {
        setNotConfigured(false);
        setRfps(data.rfps || []);
      }
    } catch (e) {
      setLoadError(`Couldn't reach the server. ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRfps(); }, [loadRfps]);

  const createRfp = async (form) => {
    setSubmitting(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/api/rfp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          client: form.client.trim(),
          deadline: form.deadline,
          description: form.description.trim() || undefined,
          logo_url: form.logo_url.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || `Server returned ${res.status}`);
        return;
      }
      setDrawerOpen(false);
      await loadRfps();
    } catch (e) {
      setCreateError(`Couldn't create the RFP. ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (rfp) => {
    setView('detail');
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/rfp/${rfp.id}`);
      const data = await res.json();
      setDetail(data);
    } catch (e) {
      setDetail({ rfp, signups: [], _error: e.message });
    } finally {
      setDetailLoading(false);
    }
  };

  const backToDashboard = () => {
    setView('dashboard');
    setDetail(null);
    loadRfps();
  };

  const activeCount = rfps.filter((r) => r.status === 'active').length;

  return (
    <div className="rfp-root">
      <style>{CSS}</style>

      <header className="rfp-header">
        <div>
          <h1>RFP Pipeline</h1>
          <p className="rfp-sub">
            {loading ? 'Loading\u2026'
              : notConfigured ? 'Backend not configured'
                : `${rfps.length} total \u00b7 ${activeCount} active`}
          </p>
        </div>
        {view === 'dashboard' && (
          <button className="rfp-btn" onClick={() => { setCreateError(''); setDrawerOpen(true); }}>
            + New RFP
          </button>
        )}
      </header>

      {notConfigured && (
        <div className="rfp-banner rfp-banner-warn">
          The RFP backend can't see its Airtable credentials. Check that
          AIRTABLE_API_KEY and AIRTABLE_BASE_ID are set on the Railway service.
        </div>
      )}
      {loadError && <div className="rfp-banner rfp-banner-error">{loadError}</div>}

      {view === 'detail' ? (
        <Detail data={detail} loading={detailLoading} onBack={backToDashboard} />
      ) : loading ? (
        <div className="rfp-loading">Loading RFPs\u2026</div>
      ) : rfps.length === 0 && !notConfigured ? (
        <div className="rfp-empty">
          <p>No RFPs yet.</p>
          <button className="rfp-btn" onClick={() => setDrawerOpen(true)}>Create your first RFP</button>
        </div>
      ) : (
        <div className="rfp-grid">
          {rfps.map((r) => <RfpCard key={r.id} rfp={r} onOpen={openDetail} />)}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={createRfp}
        submitting={submitting}
        error={createError}
      />
    </div>
  );
}

// --- styles (scoped under .rfp-root) ---------------------------------------

const CSS = `
.rfp-root {
  --red: #da291c;
  --red-dark: #b31f14;
  --ink: #1a1a1a;
  --muted: #6b7280;
  --line: #e6e6e6;
  --bg: #ffffff;
  --amber: #d97706;
  --green: #15803d;
  --grey: #9ca3af;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--ink);
  max-width: 1120px;
  margin: 0 auto;
  padding: 8px 24px 64px;
}
.rfp-root * { box-sizing: border-box; }
.rfp-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; padding: 20px 0 24px; border-bottom: 2px solid var(--ink); margin-bottom: 28px;
}
.rfp-header h1 { margin: 0; font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
.rfp-sub { margin: 4px 0 0; color: var(--muted); font-size: 13px; }

.rfp-btn {
  background: var(--red); color: #fff; border: none; border-radius: 8px;
  padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s ease;
}
.rfp-btn:hover:not(:disabled) { background: var(--red-dark); }
.rfp-btn:disabled { opacity: .5; cursor: not-allowed; }
.rfp-btn-ghost {
  background: transparent; color: var(--muted); border: 1px solid var(--line);
  border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.rfp-btn-ghost:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }

.rfp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }

.rfp-card {
  text-align: left; background: var(--bg); border: 1px solid var(--line);
  border-left: 4px solid var(--grey); border-radius: 12px; padding: 18px 20px 22px;
  cursor: pointer; font: inherit; color: inherit;
  transition: box-shadow .15s ease, transform .15s ease;
}
.rfp-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.08); transform: translateY(-2px); }
.rfp-accent-green  { border-left-color: var(--green); }
.rfp-accent-amber  { border-left-color: var(--amber); }
.rfp-accent-red    { border-left-color: var(--red); }
.rfp-accent-past   { border-left-color: var(--grey); }
.rfp-accent-none   { border-left-color: var(--line); }

.rfp-card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rfp-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.rfp-days { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.rfp-days-green { background: #dcfce7; color: var(--green); }
.rfp-days-amber { background: #fef3c7; color: var(--amber); }
.rfp-days-red   { background: #fee2e2; color: var(--red-dark); }
.rfp-days-past  { background: #f1f1f1; color: var(--grey); }
.rfp-days-none  { background: #f1f1f1; color: var(--muted); }

.rfp-card-title { margin: 10px 0 8px; font-size: 19px; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; }
.rfp-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 13px; color: var(--muted); }
.rfp-dotsep { color: var(--line); }
.rfp-status-pill { text-transform: capitalize; font-weight: 600; font-size: 11px; color: var(--muted); background: #f1f1f1; padding: 2px 8px; border-radius: 999px; }

.rfp-timeline { position: relative; display: flex; justify-content: space-between; margin-top: 20px; padding: 0 2px; }
.rfp-timeline--empty { justify-content: flex-start; color: var(--grey); font-size: 12px; margin-top: 16px; }
.rfp-timeline-track { position: absolute; top: 5px; left: 6px; right: 6px; height: 2px; background: var(--line); }
.rfp-mark { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 1; }
.rfp-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid var(--line); }
.rfp-mark-label { font-size: 10px; font-weight: 600; color: var(--grey); }
.rfp-mark.is-passed .rfp-dot { background: var(--muted); border-color: var(--muted); }
.rfp-mark.is-passed .rfp-mark-label { color: var(--muted); }
.rfp-mark.is-upcoming .rfp-dot { border-color: var(--red); }
.rfp-mark.is-upcoming .rfp-mark-label { color: var(--ink); }
.rfp-mark.is-due .rfp-dot { width: 14px; height: 14px; }
.rfp-mark.is-due.is-upcoming .rfp-dot { background: var(--red); border-color: var(--red); }

.rfp-loading, .rfp-empty, .rfp-empty-inline { color: var(--muted); }
.rfp-loading { padding: 48px 0; text-align: center; }
.rfp-empty { padding: 64px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.rfp-empty p { margin: 0; font-size: 16px; }
.rfp-empty-inline { padding: 24px 0; }

.rfp-banner { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
.rfp-banner-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.rfp-banner-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

.rfp-drawer-wrap { position: fixed; inset: 0; pointer-events: none; z-index: 50; }
.rfp-drawer-wrap.is-open { pointer-events: auto; }
.rfp-scrim { position: absolute; inset: 0; background: rgba(0,0,0,.35); opacity: 0; transition: opacity .2s ease; }
.rfp-drawer-wrap.is-open .rfp-scrim { opacity: 1; }
.rfp-drawer {
  position: absolute; top: 0; right: 0; height: 100%; width: min(440px, 92vw);
  background: #fff; box-shadow: -8px 0 32px rgba(0,0,0,.14);
  transform: translateX(100%); transition: transform .24s cubic-bezier(.4,0,.2,1);
  padding: 24px; overflow-y: auto; font-family: 'Inter', system-ui, sans-serif;
}
.rfp-drawer-wrap.is-open .rfp-drawer { transform: translateX(0); }
.rfp-drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.rfp-drawer-head h2 { margin: 0; font-size: 22px; font-weight: 800; }
.rfp-x { background: none; border: none; font-size: 28px; line-height: 1; color: var(--muted); cursor: pointer; }
.rfp-x:hover:not(:disabled) { color: var(--ink); }

.rfp-field { display: block; margin-bottom: 16px; }
.rfp-field > span { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.rfp-field > span em { color: var(--muted); font-weight: 400; font-style: normal; }
.rfp-field input, .rfp-field textarea {
  width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;
  font-size: 14px; font-family: inherit; color: var(--ink);
}
.rfp-field input:focus, .rfp-field textarea:focus { outline: none; border-color: var(--red); box-shadow: 0 0 0 3px rgba(218,41,28,.12); }
.rfp-drawer-foot { display: flex; gap: 10px; margin-top: 24px; }
.rfp-drawer-foot .rfp-btn { flex: 1; }

.rfp-detail { animation: rfp-fade .2s ease; }
.rfp-back { background: none; border: none; color: var(--muted); font-size: 14px; font-weight: 600; cursor: pointer; padding: 0 0 16px; }
.rfp-back:hover { color: var(--red); }
.rfp-detail-head { border: 1px solid var(--line); border-left: 4px solid var(--grey); border-radius: 12px; padding: 22px 24px; margin-bottom: 24px; }
.rfp-detail-head h2 { margin: 8px 0 10px; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
.rfp-detail-desc { margin: 14px 0 4px; color: var(--ink); font-size: 14px; line-height: 1.5; }

.rfp-signups-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.rfp-signups-head h3 { margin: 0; font-size: 18px; font-weight: 700; }
.rfp-count-chip { background: var(--red); color: #fff; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }

.rfp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rfp-table th { text-align: left; font-weight: 600; color: var(--muted); padding: 8px 12px; border-bottom: 2px solid var(--line); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
.rfp-table td { padding: 12px; border-bottom: 1px solid var(--line); }
.rfp-rem-row { display: inline-flex; gap: 5px; }
.rfp-rem { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.rfp-rem-pending { background: #f1f1f1; color: var(--grey); }
.rfp-rem-sent { background: #dcfce7; color: var(--green); }
.rfp-rem-skipped { background: #fef3c7; color: var(--amber); }

@keyframes rfp-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .rfp-card, .rfp-scrim, .rfp-drawer, .rfp-detail { transition: none; animation: none; }
}
@media (max-width: 560px) {
  .rfp-root { padding: 8px 16px 48px; }
  .rfp-header h1 { font-size: 26px; }
  .rfp-table { display: block; overflow-x: auto; }
}
`;
