import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, X, AlertTriangle } from 'lucide-react';

/**
 * MenuDropzone — drag-and-drop + click-to-browse PDF intake for Fire Watch.
 *
 * Fixes over the original inline drop box in UploadView:
 *   1. Old code filtered on f.type === 'application/pdf'. Some sources (Outlook
 *      attachments, network shares, certain file managers) hand the browser an
 *      empty MIME type, so those PDFs were silently discarded. Now falls back
 *      to the .pdf extension.
 *   2. No visual feedback on drag-over. Now highlights.
 *   3. Dropping OUTSIDE the box made the browser navigate to the PDF, killing
 *      the session. Now swallowed at the window level.
 *
 * Also appends instead of replaces, dedupes on name+size, and flags oversized
 * files before the run instead of after 40 API calls.
 */

// Anthropic hard-rejects payloads over 32MB. Base64 inflates ~33%, so the real
// ceiling for a raw PDF is ~24MB. Warn at 20MB to leave headroom for the JSON
// envelope and the Railway proxy body limit.
const SOFT_LIMIT = 20 * 1024 * 1024;
const HARD_LIMIT = 24 * 1024 * 1024;

// How long after the last dragover event before we drop the highlight. Browsers
// fire dragover every ~50-100ms while the cursor is over the target, so this
// just needs to outlast that gap.
const DRAG_IDLE_MS = 160;

const fmtSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdf = (file) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const keyOf = (file) => `${file.name}::${file.size}`;

// Only highlight for an actual file drag — not selected text or a dragged link.
const draggingFiles = (e) => {
  const types = e.dataTransfer?.types;
  if (!types) return true; // some browsers withhold this; assume yes
  return Array.from(types).includes('Files');
};

export default function MenuDropzone({
  files = [],
  onFilesChange,
  disabled = false,
  maxFiles = 60,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState([]);
  const idleTimer = useRef(null);
  const inputRef = useRef(null);

  // Highlight is driven by dragover, which fires CONTINUOUSLY while the cursor
  // is over the target, then cleared on a short idle timer. The obvious
  // alternative — counting dragenter/dragleave pairs — breaks whenever those
  // events don't balance across child elements, which is easy to hit with an
  // icon + button + text inside the zone.
  const keepAlive = useCallback(() => {
    setIsDragging(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsDragging(false), DRAG_IDLE_MS);
  }, []);

  const endDrag = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, []);

  const addFiles = useCallback(
    (incoming) => {
      const all = Array.from(incoming || []);
      const notPdf = all.filter((f) => !isPdf(f));
      const pdfs = all.filter(isPdf);

      const existing = new Set(files.map(keyOf));
      const fresh = [];
      let dupes = 0;
      for (const f of pdfs) {
        if (existing.has(keyOf(f))) {
          dupes++;
        } else {
          existing.add(keyOf(f));
          fresh.push(f);
        }
      }

      const merged = [...files, ...fresh].slice(0, maxFiles);
      const overflow = files.length + fresh.length - merged.length;

      const msgs = [];
      if (notPdf.length)
        msgs.push(
          `Skipped ${notPdf.length} non-PDF file${notPdf.length > 1 ? 's' : ''}`
        );
      if (dupes) msgs.push(`Skipped ${dupes} already in the list`);
      if (overflow > 0)
        msgs.push(`Skipped ${overflow} over the ${maxFiles}-file cap`);
      setNotes(msgs);

      onFilesChange(merged);
    },
    [files, maxFiles, onFilesChange]
  );

  const removeAt = (idx) => onFilesChange(files.filter((_, i) => i !== idx));

  const clearAll = () => {
    onFilesChange([]);
    setNotes([]);
  };

  // A drop that MISSES the target makes the browser navigate to the file.
  // Cancelling at the window level is what prevents losing the session.
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
    if (disabled || !draggingFiles(e)) return;
    keepAlive();
  };

  const onDragOver = (e) => {
    e.preventDefault(); // required, or the drop event never fires
    if (disabled || !draggingFiles(e)) return;
    e.dataTransfer.dropEffect = 'copy';
    keepAlive();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    endDrag();
    if (disabled) return;
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const oversized = files.filter((f) => f.size > SOFT_LIMIT);
  const anyHard = oversized.some((f) => f.size > HARD_LIMIT);

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* ---- Drop zone ---- */}
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={endDrag}
        onDrop={onDrop}
        style={{
          border: `3px ${isDragging ? 'solid' : 'dashed'} ${
            isDragging ? '#ff6b35' : '#da291c'
          }`,
          borderRadius: '16px',
          padding: '60px 40px',
          textAlign: 'center',
          background: isDragging ? '#fff0e6' : '#fafafa',
          transition: 'background 0.15s ease, border-color 0.15s ease',
          opacity: disabled ? 0.5 : 1,
          boxShadow: isDragging ? '0 0 0 6px rgba(255,107,53,0.18)' : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ''; // lets the same file be re-picked after removal
          }}
          style={{ display: 'none' }}
        />

        {/* Children are pointer-events:none so drag events always land on the
            container itself rather than bubbling up from a child. Keeps the
            highlight steady while moving across the icon and text. The button
            re-enables them for itself. */}
        <div style={{ pointerEvents: 'none' }}>
          <FileText
            size={64}
            color={isDragging ? '#ff6b35' : '#da291c'}
            style={{ marginBottom: '24px', opacity: isDragging ? 1 : 0.7 }}
          />

          <div>
            <button
              onClick={() => !disabled && inputRef.current?.click()}
              disabled={disabled}
              style={{
                background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
                color: 'white',
                border: 'none',
                padding: '20px 48px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '800',
                cursor: disabled ? 'not-allowed' : 'pointer',
                marginBottom: '24px',
                boxShadow: '0 8px 24px rgba(218, 41, 28, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                pointerEvents: disabled ? 'none' : 'auto',
              }}
            >
              <Upload size={20} />
              Select Menu PDFs
            </button>
          </div>

          <p
            style={{
              color: isDragging ? '#da291c' : '#999',
              fontSize: '15px',
              margin: 0,
              fontWeight: isDragging ? '800' : '400',
              textTransform: isDragging ? 'uppercase' : 'none',
              letterSpacing: isDragging ? '1px' : '0',
            }}
          >
            {isDragging
              ? 'Drop to add menus'
              : `or drag and drop files here — up to ${maxFiles} at once`}
          </p>
        </div>
      </div>

      {/* ---- File list ---- */}
      {files.length > 0 && (
        <div
          style={{
            background: '#f0f9f4',
            borderRadius: '12px',
            padding: '30px',
            marginTop: '24px',
            border: '2px solid #28a745',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <strong style={{ fontSize: '18px', color: '#28a745' }}>
              {files.length} file{files.length > 1 ? 's' : ''} ready ·{' '}
              {fmtSize(totalBytes)}
            </strong>
            <button
              onClick={clearAll}
              disabled={disabled}
              style={{
                background: 'transparent',
                border: '2px solid #ccc',
                color: '#666',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Clear All
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '10px',
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {files.map((f, i) => {
              const big = f.size > SOFT_LIMIT;
              return (
                <div
                  key={keyOf(f) + i}
                  style={{
                    background: 'white',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: `2px solid ${big ? '#ffab00' : '#e8e8e8'}`,
                    fontWeight: '600',
                    color: '#1a1a1a',
                  }}
                >
                  <FileText size={18} color="#da291c" style={{ flexShrink: 0 }} />
                  <span
                    title={f.name}
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: big ? '#b26a00' : '#999',
                      flexShrink: 0,
                    }}
                  >
                    {fmtSize(f.size)}
                  </span>
                  <button
                    onClick={() => removeAt(i)}
                    disabled={disabled}
                    aria-label={`Remove ${f.name}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      color: '#999',
                      padding: '4px',
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Oversized warning ---- */}
      {oversized.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px 20px',
            background: '#fff8e6',
            border: '2px solid #ffab00',
            borderRadius: '12px',
            color: '#b26a00',
            fontSize: '14px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            lineHeight: '1.6',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {oversized.length} file{oversized.length > 1 ? 's are' : ' is'} over{' '}
            {fmtSize(SOFT_LIMIT)}
            {anyHard
              ? ' — the largest will be rejected by the API. Compress before running.'
              : ' — close to the API limit and may fail. Compress if the run errors.'}
          </span>
        </div>
      )}

      {/* ---- Skip notes ---- */}
      {notes.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 18px',
            background: '#fff8e6',
            border: '1px solid #ffd88a',
            borderRadius: '8px',
            color: '#7a5200',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          {notes.join(' · ')}
        </div>
      )}
    </div>
  );
}
