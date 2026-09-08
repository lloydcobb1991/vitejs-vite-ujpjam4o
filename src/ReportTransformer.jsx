import React, { useState, useMemo } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

/*
 * Column model
 * ------------
 * Every column in the export — mapped or opt-in — is described by one
 * descriptor:
 *
 *   key       stable id used for the selection state
 *   csvHeader the text written into the CSV header row
 *   kind      'mapped' (Cereus field we rename) | 'extra' (raw sheet column)
 *   level     'cart' -> value written only on the first row of each cart
 *             'line' -> value written on every line-item row
 *   source    raw sheet column name (extras only)
 *   nonEmpty  count of non-blank cells, used to hide dead columns
 *
 * Mapped fields keep their original order and labels so existing downstream
 * consumers of the CSV see no change unless a box is unticked.
 */

const MAPPED_FIELDS = [
  { key: 'm:cartNumber', csvHeader: 'Cart Number',  level: 'cart' },
  { key: 'm:orderName',  csvHeader: 'Order Name',   level: 'cart' },
  { key: 'm:recipient',  csvHeader: 'Recipient',    level: 'cart' },
  { key: 'm:address',    csvHeader: 'Address',      level: 'cart' },
  { key: 'm:city',       csvHeader: 'City',         level: 'cart' },
  { key: 'm:state',      csvHeader: 'State',        level: 'cart' },
  { key: 'm:zip',        csvHeader: 'Zip',          level: 'cart' },
  { key: 'm:product',    csvHeader: 'Product Name', level: 'line' },
  { key: 'm:qty',        csvHeader: 'Quantity',     level: 'line' },
  { key: 'm:notes',      csvHeader: 'NOTES',        level: 'cart' },
];

// Sheet columns already consumed by the mapping above. Excluded from the
// opt-in list so the same data isn't offered twice.
// Note: /Cart/Header/ShippingInfo/Address is NOT here — the Cereus quirk means
// it holds an email address, not a street address, so it stays available as an
// opt-in column.
const CONSUMED_COLUMNS = new Set([
  '/Cart/#id',
  '/Cart/Header/SessionID',
  '/Cart/Header/ContactInfo/Name',
  '/Cart/Header/ShippingInfo/Name',
  '/Cart/Header/ShippingInfo/Address2',
  '/Cart/Header/ShippingInfo/City',
  '/Cart/Header/ShippingInfo/State',
  '/Cart/Header/ShippingInfo/Zip',
  '/Cart/Header/Notes',
  '/Cart/Item/ProductName',
  '/Cart/Item/Qty',
]);

const clean = (val) => String(val ?? '').trim();

// Turn "/Cart/Header/ShippingInfo/Address" into "Address", widening to
// "ShippingInfo Address" and beyond only if a shorter form is already taken.
const deriveHeader = (path, used) => {
  const segs = clean(path)
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/^#/, ''));

  if (segs.length === 0) return path;

  for (let take = 1; take <= segs.length; take += 1) {
    const candidate = segs.slice(segs.length - take).join(' ');
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
  }

  const base = segs.join(' ');
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} ${n}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

// Build the export rows. Used by both the preview and the download so the
// two can never disagree about what's in the file.
const buildRows = (carts, columns) => {
  const rows = [];

  carts.forEach((cart) => {
    const lines = cart.lines.length > 0 ? cart.lines : [null];

    lines.forEach((line, idx) => {
      const isFirst = idx === 0;

      rows.push(
        columns.map((col) => {
          if (col.level === 'cart') {
            if (!isFirst) return '';
            return col.kind === 'mapped'
              ? cart.mapped[col.key] || ''
              : cart.extras[col.source] || '';
          }

          if (!line) return '';
          return col.kind === 'mapped'
            ? line.mapped[col.key] || ''
            : clean(line.raw[col.source]);
        })
      );
    });
  });

  return rows;
};

export default function ReportTransformer() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null); // { carts, columns }
  const [selected, setSelected] = useState({}); // key -> bool
  const [showEmpty, setShowEmpty] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setProcessing(true);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get the first sheet (sagecarts)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON - IMPORTANT: skip first row, headers are in row 2.
      // defval:'' guarantees every column appears as a key on every row, so
      // the column list below includes columns that are entirely blank.
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1, defval: '' });

      if (jsonData.length === 0) {
        throw new Error('File appears to be empty');
      }

      const allColumns = Object.keys(jsonData[0]);

      // Group rows by cart ID, keeping all line items per cart. Each cart's
      // header fields are taken from the first row we encounter for that cart;
      // line items accumulate. Raw rows are retained so opt-in columns can be
      // read at export time without reparsing the file.
      const cartMap = new Map();

      for (const row of jsonData) {
        const cartId = clean(row['/Cart/#id']);
        if (!cartId) continue;

        if (!cartMap.has(cartId)) {
          cartMap.set(cartId, {
            mapped: {
              'm:cartNumber': clean(row['/Cart/Header/SessionID']) || cartId,
              'm:orderName': clean(row['/Cart/Header/ContactInfo/Name']),
              'm:recipient': clean(row['/Cart/Header/ShippingInfo/Name']),
              // Cereus quirk: ShippingInfo/Address holds an email; the actual
              // street address is in ShippingInfo/Address2.
              'm:address': clean(row['/Cart/Header/ShippingInfo/Address2']),
              'm:city': clean(row['/Cart/Header/ShippingInfo/City']),
              'm:state': clean(row['/Cart/Header/ShippingInfo/State']),
              'm:zip': clean(row['/Cart/Header/ShippingInfo/Zip']),
              'm:notes': clean(row['/Cart/Header/Notes']),
            },
            extras: {},
            rows: [],
            lines: [],
          });
        }

        const cart = cartMap.get(cartId);
        cart.rows.push(row);

        // Add this row as a line item if it has a product name
        const productName = clean(row['/Cart/Item/ProductName']);
        if (productName) {
          const qty = row['/Cart/Item/Qty'];
          cart.lines.push({
            mapped: {
              'm:product': productName,
              'm:qty': qty !== undefined && qty !== null ? String(qty) : '',
            },
            raw: row,
          });
        }
      }

      const carts = Array.from(cartMap.values());

      if (carts.length === 0) {
        throw new Error('No orders found in file. Please check the file format.');
      }

      // Classify every unmapped column. A column whose value ever differs
      // between rows of the same cart describes a line item; one that stays
      // constant describes the order.
      const usedHeaders = new Set(MAPPED_FIELDS.map((f) => f.csvHeader.toLowerCase()));
      const extraColumns = allColumns
        .filter((col) => col && !CONSUMED_COLUMNS.has(col))
        .map((col) => {
          let nonEmpty = 0;
          let varies = false;

          carts.forEach((cart) => {
            const seen = new Set();
            cart.rows.forEach((row) => {
              const val = clean(row[col]);
              if (val) {
                nonEmpty += 1;
                seen.add(val);
              }
            });
            if (seen.size > 1) varies = true;
          });

          return {
            key: `x:${col}`,
            csvHeader: deriveHeader(col, usedHeaders),
            kind: 'extra',
            level: varies ? 'line' : 'cart',
            source: col,
            path: col,
            nonEmpty,
          };
        });

      // Cache the order-level value for each cart: the first non-blank value
      // found anywhere in that cart's rows, not just the first row.
      const cartLevelExtras = extraColumns.filter((c) => c.level === 'cart');
      carts.forEach((cart) => {
        cartLevelExtras.forEach((col) => {
          const hit = cart.rows.find((row) => clean(row[col.source]));
          cart.extras[col.source] = hit ? clean(hit[col.source]) : '';
        });
      });

      const mappedColumns = MAPPED_FIELDS.map((f) => {
        let nonEmpty = 0;
        carts.forEach((cart) => {
          if (f.level === 'cart') {
            if (cart.mapped[f.key]) nonEmpty += 1;
          } else {
            cart.lines.forEach((line) => {
              if (line.mapped[f.key]) nonEmpty += 1;
            });
          }
        });
        return { ...f, kind: 'mapped', nonEmpty };
      });

      const columns = [...mappedColumns, ...extraColumns];

      // Default selection: exactly what the tool produced before this feature.
      const defaults = {};
      columns.forEach((col) => {
        defaults[col.key] = col.kind === 'mapped';
      });

      setResult({ carts, columns });
      setSelected(defaults);
      setShowEmpty(false);
      setProcessing(false);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || "Failed to process file. Please ensure it's a valid Cereus PSNA report.");
      setProcessing(false);
    }
  };

  const selectedColumns = useMemo(
    () => (result ? result.columns.filter((col) => selected[col.key]) : []),
    [result, selected]
  );

  const previewRows = useMemo(
    () => (result && selectedColumns.length > 0 ? buildRows(result.carts, selectedColumns) : []),
    [result, selectedColumns]
  );

  const toggleColumn = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setGroup = (kind, value) => {
    setSelected((prev) => {
      const next = { ...prev };
      result.columns
        .filter((col) => col.kind === kind)
        .filter((col) => (kind === 'extra' && !showEmpty ? col.nonEmpty > 0 : true))
        .forEach((col) => {
          next[col.key] = value;
        });
      return next;
    });
  };

  const resetColumns = () => {
    const defaults = {};
    result.columns.forEach((col) => {
      defaults[col.key] = col.kind === 'mapped';
    });
    setSelected(defaults);
  };

  const downloadTransformed = () => {
    if (!result || selectedColumns.length === 0) return;

    // Escape every value: wrap in quotes, double internal quotes. Applied
    // uniformly so a comma in a state, zip or quantity can't break the row.
    const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const csvRows = [selectedColumns.map((col) => esc(col.csvHeader)).join(',')];
    buildRows(result.carts, selectedColumns).forEach((row) => {
      csvRows.push(row.map(esc).join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proximo_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mappedColumns = result ? result.columns.filter((c) => c.kind === 'mapped') : [];
  const extraColumns = result ? result.columns.filter((c) => c.kind === 'extra') : [];
  const visibleExtras = showEmpty ? extraColumns : extraColumns.filter((c) => c.nonEmpty > 0);
  const hiddenExtraCount = extraColumns.length - visibleExtras.length;
  const totalLines = result ? result.carts.reduce((sum, c) => sum + c.lines.length, 0) : 0;

  const sectionHeading = {
    margin: '0 0 15px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const smallButton = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const renderColumnChip = (col) => {
    const checked = !!selected[col.key];
    return (
      <label
        key={col.key}
        title={col.path || col.csvHeader}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '10px 12px',
          background: checked ? '#fdf3f2' : 'white',
          border: `1px solid ${checked ? '#da291c' : '#e8e8e8'}`,
          borderRadius: '4px',
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleColumn(col.key)}
          style={{
            accentColor: '#da291c',
            width: '16px',
            height: '16px',
            marginTop: '2px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.csvHeader}
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: '#999',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.level === 'line' ? 'Per line item' : 'Per order'}
            {col.nonEmpty === 0 ? ' · always blank' : ''}
            {col.path ? ` · ${col.path}` : ''}
          </span>
        </span>
      </label>
    );
  };

  return (
    <div
      style={{
        background: '#f5f5f5',
        padding: '30px 20px',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
      `}</style>
      <div
        style={{
          maxWidth: '1400px',
          minWidth: '320px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Upload Area */}
        {!result && (
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '60px 40px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#da291c',
                marginBottom: '25px',
              }}
            >
              <Upload size={36} color="white" />
            </div>

            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '22px',
                fontWeight: '700',
                color: '#1a1a1a',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Upload Spreadsheet
            </h2>
            <p
              style={{
                margin: '0 0 30px 0',
                color: '#666',
                fontSize: '15px',
                lineHeight: '1.6',
              }}
            >
              Upload an XLSX file to clean and transform
            </p>

            <label
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                borderRadius: '4px',
                background: '#da291c',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {processing ? 'Processing...' : 'Select File'}
            </label>

            {error && (
              <div
                style={{
                  marginTop: '25px',
                  padding: '15px 20px',
                  background: '#fee',
                  border: '2px solid #fcc',
                  borderRadius: '4px',
                  color: '#c33',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: '40px',
                paddingTop: '30px',
                borderTop: '2px solid #f0f0f0',
              }}
            >
              <h3 style={sectionHeading}>Currently Optimized For Cereus PSNA Reports</h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 auto',
                  textAlign: 'left',
                  maxWidth: '500px',
                }}
              >
                {[
                  'Removes duplicate rows',
                  'Simplifies complex XML-style column names',
                  'Lets you pick which columns land in the export',
                  'Exports in Proximo-ready CSV format',
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      padding: '10px 0',
                      color: '#666',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <CheckCircle size={18} color="#da291c" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '30px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#1a1a1a',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Transformation Complete
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '15px' }}>
                  Successfully processed {result.carts.length} unique orders
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={downloadTransformed}
                  disabled={selectedColumns.length === 0}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedColumns.length === 0 ? '#ddd' : '#da291c',
                    color: selectedColumns.length === 0 ? '#999' : 'white',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: selectedColumns.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  <Download size={18} />
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setSelected({});
                    setFile(null);
                  }}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: 'white',
                    color: '#666',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  <RefreshCw size={18} />
                  New File
                </button>
              </div>
            </div>

            {/* Column Picker */}
            <div
              style={{
                background: '#f9f9f9',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '25px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '18px',
                }}
              >
                <h3 style={{ ...sectionHeading, margin: 0 }}>
                  Columns — {selectedColumns.length} of {result.columns.length} selected
                </h3>
                <button onClick={resetColumns} style={smallButton}>
                  Reset to default
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
                  Mapped fields
                </span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setGroup('mapped', true)} style={smallButton}>
                    All
                  </button>
                  <button onClick={() => setGroup('mapped', false)} style={smallButton}>
                    None
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '10px',
                  marginBottom: '25px',
                }}
              >
                {mappedColumns.map(renderColumnChip)}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
                  Other columns in this file ({visibleExtras.length})
                </span>
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hiddenExtraCount > 0 && !showEmpty && (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {hiddenExtraCount} blank hidden
                    </span>
                  )}
                  <button onClick={() => setShowEmpty(!showEmpty)} style={smallButton}>
                    {showEmpty ? 'Hide blank' : 'Show blank'}
                  </button>
                  <button onClick={() => setGroup('extra', true)} style={smallButton}>
                    All
                  </button>
                  <button onClick={() => setGroup('extra', false)} style={smallButton}>
                    None
                  </button>
                </span>
              </div>

              {visibleExtras.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                  No other columns carry data in this file.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '10px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {visibleExtras.map(renderColumnChip)}
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div
              style={{
                background: '#f9f9f9',
                borderRadius: '8px',
                padding: '20px',
                overflow: 'auto',
                marginBottom: '25px',
              }}
            >
              <h3 style={sectionHeading}>Preview — first 10 rows of the export</h3>

              {selectedColumns.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                  Select at least one column to preview the export.
                </p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                      }}
                    >
                      <thead>
                        <tr style={{ background: 'white' }}>
                          {selectedColumns.map((col) => (
                            <th
                              key={col.key}
                              style={{
                                padding: '12px',
                                textAlign: 'left',
                                borderBottom: '2px solid #da291c',
                                fontWeight: '700',
                                color: '#1a1a1a',
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.csvHeader}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                            {row.map((cell, cellIdx) => (
                              <td
                                key={selectedColumns[cellIdx].key}
                                style={{
                                  padding: '12px',
                                  borderBottom: '1px solid #e8e8e8',
                                  color: '#1a1a1a',
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={cell}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewRows.length > 10 && (
                    <p style={{ margin: '15px 0 0 0', color: '#999', fontSize: '13px' }}>
                      Showing 10 of {previewRows.length} rows. Download to see all.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
              }}
            >
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '20px',
                  borderRadius: '8px',
                  color: 'white',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {result.carts.length}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.9,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700',
                  }}
                >
                  Total Orders
                </div>
              </div>
              <div
                style={{
                  background: '#da291c',
                  padding: '20px',
                  borderRadius: '8px',
                  color: 'white',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {
                    result.carts.filter(
                      (c) => c.mapped['m:address'] && c.mapped['m:city'] && c.mapped['m:state']
                    ).length
                  }
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.9,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700',
                  }}
                >
                  With Full Address
                </div>
              </div>
              <div
                style={{
                  background: '#666',
                  padding: '20px',
                  borderRadius: '8px',
                  color: 'white',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {totalLines}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.9,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700',
                  }}
                >
                  Line Items
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
