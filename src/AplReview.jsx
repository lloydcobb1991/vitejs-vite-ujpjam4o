import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { reviewApl } from './aplParser';

// ===========================================================================
// APL review.
//
// The point of this screen is that a wrong parse looks exactly like a right
// one. The Swingers WINE tab loaded every wine as its grape variety for
// weeks — "Prosecco" where "Mionetto" should have been — and nothing caught
// it because the brand COUNT was correct. The Alterra sheet loaded a sentence
// about ski slope bars as a product. Neither raised an error.
//
// No parser is going to anticipate the next client's layout. What it can do
// is show its work: here is what I read, grouped by the tab I read it from,
// with the rows that look wrong pulled to the top. Thirty seconds of someone
// looking is worth more than another special-case rule.
// ===========================================================================

export default function AplReview({ apl }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [openSheets, setOpenSheets] = useState({});

  const review = useMemo(() => reviewApl(apl?.brands || []), [apl]);
  if (!apl || !apl.brands?.length) return null;

  const q = filter.trim().toLowerCase();
  const sheets = review.sheets
    .map((s) => ({
      ...s,
      rows: q
        ? s.rows.filter(
            (b) =>
              String(b.name || '').toLowerCase().includes(q) ||
              String(b.supplier || '').toLowerCase().includes(q) ||
              String(b.category || '').toLowerCase().includes(q)
          )
        : s.rows,
    }))
    .filter((s) => s.rows.length > 0);

  const shown = sheets.reduce((n, s) => n + s.rows.length, 0);
  const serious = review.warnings.filter((w) => w.kind === 'wrong-column');

  return (
    <div style={{ marginTop: '18px', borderTop: '2px solid #f0f0f0', paddingTop: '18px' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: serious.length ? '#fff5f5' : '#fafafa',
          border: `2px solid ${serious.length ? '#da291c' : '#e8e8e8'}`,
          borderRadius: '10px',
          padding: '14px 18px',
          width: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'left',
          fontWeight: '800',
          fontSize: '14px',
          color: serious.length ? '#da291c' : '#1a1a1a',
        }}
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        {serious.length ? <AlertTriangle size={18} /> : <CheckCircle size={18} color="#28a745" />}
        <span>
          {serious.length
            ? `Check this APL — ${serious.length} tab${serious.length === 1 ? '' : 's'} may have parsed wrong`
            : 'Review what was read from this APL'}
        </span>
        <span style={{ marginLeft: 'auto', fontWeight: '600', color: '#666', fontSize: '13px' }}>
          {review.total} brands · {review.sheets.length} tab
          {review.sheets.length === 1 ? '' : 's'}
        </span>
      </button>

      {/* A wrong-column warning is shown whether or not the panel is open —
          it means the numbers from this run would be wrong. */}
      {serious.map((w, i) => (
        <div
          key={i}
          style={{
            marginTop: '12px',
            background: '#fff5f5',
            border: '2px solid #da291c',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#da291c',
            fontSize: '14px',
            fontWeight: '700',
            lineHeight: '1.6',
            display: 'flex',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{w.text}</span>
        </div>
      ))}

      {open && (
        <div style={{ marginTop: '14px' }}>
          {review.warnings
            .filter((w) => w.kind !== 'wrong-column')
            .map((w, i) => (
              <div
                key={i}
                style={{
                  background: '#fffdf7',
                  border: '1px solid #ffe1a6',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: '#7a5200',
                  lineHeight: '1.6',
                }}
              >
                {w.text}
                {w.examples?.length ? (
                  <span style={{ color: '#b26a00', fontWeight: '700' }}>
                    {' '}
                    — {w.examples.join(', ')}
                  </span>
                ) : null}
              </div>
            ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              padding: '8px 12px',
              margin: '12px 0',
            }}
          >
            <Search size={16} color="#999" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a brand, supplier or category…"
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '14px',
                fontWeight: '600',
              }}
            />
            {q && (
              <span style={{ fontSize: '12px', color: '#999', fontWeight: '700' }}>
                {shown} match{shown === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          {sheets.map((s) => {
            const isOpen = openSheets[s.name] ?? (!!q || review.sheets.length <= 2);
            return (
              <div key={s.name} style={{ marginBottom: '10px' }}>
                <button
                  onClick={() =>
                    setOpenSheets((prev) => ({ ...prev, [s.name]: !isOpen }))
                  }
                  style={{
                    background: '#1a1a1a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  {s.name}
                  <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{s.rows.length}</span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      border: '1px solid #ececec',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                    }}
                  >
                    {s.rows.map((b, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 180px 140px',
                          gap: '12px',
                          padding: '8px 14px',
                          borderBottom: '1px solid #f4f4f4',
                          fontSize: '13px',
                          background: i % 2 ? '#fcfcfc' : 'white',
                        }}
                      >
                        <span style={{ fontWeight: '700', color: '#1a1a1a' }}>{b.name}</span>
                        <span style={{ color: '#666', fontWeight: '600' }}>{b.supplier}</span>
                        <span style={{ color: '#999' }}>{b.category || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
