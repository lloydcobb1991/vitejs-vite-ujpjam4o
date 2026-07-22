import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * MenuDropzone — drag-and-drop + click-to-browse PDF intake for Emberwatch.
 *
 * Usage (replace your existing <input type="file"> block):
 *   <MenuDropzone files={files} onFilesChange={setFiles} disabled={isAnalyzing} />
 *
 * Notes:
 *  - `files` is the same File[] your analyze loop already consumes. Nothing downstream changes.
 *  - Files are APPENDED, not replaced, so the boss can drag in batches of 10 four times.
 *  - Dedupes on name+size so a double-drop doesn't double-bill impressions.
 *  - Flags oversized PDFs BEFORE the run instead of after 40 API calls.
 */

// Anthropic hard-rejects payloads over 32MB. Base64 inflates ~33%, so the real
// ceiling for a raw PDF is ~24MB. Warn early at 20MB to leave headroom for the
// JSON envelope and the Railway proxy body limit.
const SOFT_LIMIT = 20 * 1024 * 1024;
const HARD_LIMIT = 24 * 1024 * 1024;

const fmtSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdf = (file) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const keyOf = (file) => `${file.name}::${file.size}`;

export default function MenuDropzone({
  files = [],
  onFilesChange,
  disabled = false,
  maxFiles = 60,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState([]);
  const dragDepth = useRef(0);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (incoming) => {
      const all = Array.from(incoming || []);
      const notPdf = all.filter((f) => !isPdf(f)).map((f) => f.name);
      const pdfs = all.filter(isPdf);

      const existing = new Set(files.map(keyOf));
      const fresh = [];
      const dupes = [];
      for (const f of pdfs) {
        if (existing.has(keyOf(f))) {
          dupes.push(f.name);
        } else {
          existing.add(keyOf(f));
          fresh.push(f);
        }
      }

      const merged = [...files, ...fresh].slice(0, maxFiles);
      const overflow = files.length + fresh.length - merged.length;

      const notes = [];
      if (notPdf.length) notes.push(`Skipped ${notPdf.length} non-PDF file${notPdf.length > 1 ? 's' : ''}`);
      if (dupes.length) notes.push(`Skipped ${dupes.length} already in the list`);
      if (overflow > 0) notes.push(`Skipped ${overflow} over the ${maxFiles}-file cap`);
      setRejected(notes);

      onFilesChange(merged);
    },
    [files, maxFiles, onFilesChange]
  );

  const removeAt = (idx) => onFilesChange(files.filter((_, i) => i !== idx));
  const clearAll = () => {
    onFilesChange([]);
    setRejected([]);
  };

  // Browser opens dropped PDFs in a new tab unless every dragover is cancelled —
  // including drops that miss the target.
  useEffect(() => {
    const swallow = (e) => e.preventDefault();
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) e.dataTransfer.dropEffect = 'copy';
  };

  // Counter, not a boolean — dragging over a child element fires dragleave on
  // the parent and the highlight flickers without it.
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const oversized = files.filter((f) => f.size > SOFT_LIMIT);

  return (
    <div className="ew-drop">
      <style>{`
        .ew-drop { --ew-red:#da291c; --ew-ember:#ff7a18; --ew-ink:#2b2b29;
                   --ew-paper:#f5f3ee; --ew-line:#d8d4cb; --ew-muted:#6f6b63;
                   font-family: inherit; }
        .ew-drop__zone {
          border: 2px dashed var(--ew-line); border-radius: 12px;
          background: var(--ew-paper); padding: 34px 24px; text-align: center;
          cursor: pointer; transition: border-color .15s, background .15s, transform .15s;
          outline: none;
        }
        .ew-drop__zone:hover:not(.is-disabled) { border-color: var(--ew-ember); }
        .ew-drop__zone:focus-visible { box-shadow: 0 0 0 3px rgba(255,122,24,.35); }
        .ew-drop__zone.is-over {
          border-color: var(--ew-ember); border-style: solid;
          background: #fff6ed; transform: scale(1.005);
        }
        .ew-drop__zone.is-disabled { opacity: .5; cursor: not-allowed; }
        .ew-drop__head { font-size: 16px; font-weight: 700; color: var(--ew-ink); margin: 0 0 6px; }
        .ew-drop__sub { font-size: 13px; color: var(--ew-muted); margin: 0; }
        .ew-drop__link { color: var(--ew-red); text-decoration: underline; }
        .ew-drop__bar {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; margin: 14px 0 6px; font-size: 13px; color: var(--ew-muted);
        }
        .ew-drop__clear {
          background:none; border:none; color: var(--ew-red); cursor:pointer;
          font-size:13px; text-decoration: underline; padding:0;
        }
        .ew-drop__list { list-style:none; margin:0; padding:0; max-height: 260px; overflow-y:auto;
                         border:1px solid var(--ew-line); border-radius:8px; }
        .ew-drop__item {
          display:flex; align-items:center; gap:10px; padding:8px 12px;
          border-bottom:1px solid var(--ew-line); font-size:13px; color: var(--ew-ink);
        }
        .ew-drop__item:last-child { border-bottom:none; }
        .ew-drop__name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ew-drop__size { color: var(--ew-muted); font-variant-numeric: tabular-nums; }
        .ew-drop__item.is-big .ew-drop__size { color: var(--ew-red); font-weight:600; }
        .ew-drop__x { background:none; border:none; cursor:pointer; color:var(--ew-muted);
                      font-size:16px; line-height:1; padding:2px 4px; }
        .ew-drop__x:hover { color: var(--ew-red); }
        .ew-drop__note {
          margin-top:10px; padding:10px 12px; border-radius:8px; font-size:13px;
          background:#fff7e6; border:1px solid #f0d9a8; color:#7a5a12;
        }
        @media (prefers-reduced-motion: reduce) {
          .ew-drop__zone { transition: none; }
          .ew-drop__zone.is-over { transform: none; }
        }
      `}</style>

      <div
        className={`ew-drop__zone${isDragging ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop menu PDFs here or press Enter to browse"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={onKeyDown}
      >
        <p className="ew-drop__head">
          {isDragging ? 'Drop to add menus' : 'Drag menu PDFs here'}
        </p>
        <p className="ew-drop__sub">
          or <span className="ew-drop__link">browse your files</span> — up to {maxFiles} at once
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ''; // lets the same file be re-picked after removal
          }}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="ew-drop__bar">
            <span>
              {files.length} menu{files.length === 1 ? '' : 's'} · {fmtSize(totalBytes)}
            </span>
            <button type="button" className="ew-drop__clear" onClick={clearAll} disabled={disabled}>
              Clear all
            </button>
          </div>

          <ul className="ew-drop__list">
            {files.map((f, i) => (
              <li key={keyOf(f) + i} className={`ew-drop__item${f.size > SOFT_LIMIT ? ' is-big' : ''}`}>
                <span className="ew-drop__name" title={f.name}>{f.name}</span>
                <span className="ew-drop__size">{fmtSize(f.size)}</span>
                <button
                  type="button"
                  className="ew-drop__x"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {oversized.length > 0 && (
        <div className="ew-drop__note">
          {oversized.length} file{oversized.length === 1 ? '' : 's'} over {fmtSize(SOFT_LIMIT)}
          {oversized.some((f) => f.size > HARD_LIMIT)
            ? ' — the largest will be rejected by the API. Compress before running.'
            : ' — these are close to the API limit and may fail. Compress if the run errors.'}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="ew-drop__note">{rejected.join(' · ')}</div>
      )}
    </div>
  );
}
