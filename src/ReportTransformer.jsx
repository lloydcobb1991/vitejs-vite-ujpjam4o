import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Zap, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportTransformer() {
  const [file, setFile] = useState(null);
  const [transformedData, setTransformedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setProcessing(true);

    try {
      // Read the file as binary
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      // Parse Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet (sagecarts)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON - IMPORTANT: skip first row, headers are in row 2
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 }); // Start from row 2
      
      if (jsonData.length === 0) {
        throw new Error('File appears to be empty');
      }
      
      console.log('Parsed rows:', jsonData.length);
      console.log('Sample row keys:', Object.keys(jsonData[0]));
      
      // Process data: group rows by cart ID, keeping all line items per cart.
      // Each cart's header fields (recipient/address/notes) are taken from the
      // first row we encounter for that cart; line items accumulate.
      const cartMap = new Map();
      
      for (const row of jsonData) {
        const cartId = row['/Cart/#id']?.toString().trim();
        if (!cartId) continue;
        
        if (!cartMap.has(cartId)) {
          cartMap.set(cartId, {
            cartNumber: row['/Cart/Header/SessionID']?.toString().trim() || cartId,
            orderName: row['/Cart/Header/ContactInfo/Name']?.toString().trim() || '',
            recipient: row['/Cart/Header/ShippingInfo/Name']?.toString().trim() || '',
            // Cereus quirk: ShippingInfo/Address holds an email; the actual
            // street address is in ShippingInfo/Address2.
            address: row['/Cart/Header/ShippingInfo/Address2']?.toString().trim() || '',
            city: row['/Cart/Header/ShippingInfo/City']?.toString().trim() || '',
            state: row['/Cart/Header/ShippingInfo/State']?.toString().trim() || '',
            zip: row['/Cart/Header/ShippingInfo/Zip']?.toString().trim() || '',
            notes: row['/Cart/Header/Notes']?.toString().trim() || '',
            lines: []
          });
        }
        
        // Add this row as a line item if it has a product name
        const productName = row['/Cart/Item/ProductName']?.toString().trim();
        if (productName) {
          const qty = row['/Cart/Item/Qty'];
          cartMap.get(cartId).lines.push({
            product: productName,
            qty: qty !== undefined && qty !== null ? qty.toString() : ''
          });
        }
      }
      
      const transformed = Array.from(cartMap.values());
      
      // Compute totals for diagnostics
      const totalLines = transformed.reduce((sum, c) => sum + c.lines.length, 0);
      console.log('Unique carts found:', transformed.length, '— total line items:', totalLines);
      
      if (transformed.length === 0) {
        throw new Error('No orders found in file. Please check the file format.');
      }
      
      setTransformedData(transformed);
      setProcessing(false);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process file. Please ensure it\'s a valid Cereus PSNA report.');
      setProcessing(false);
    }
  };

  const downloadTransformed = () => {
    if (!transformedData) return;

    // CSV format matches the Proximo Webstore Sales Report:
    // - One row per line item
    // - Cart Number, address fields, and Notes appear ONLY on the first row
    //   of each cart; subsequent line-item rows leave those columns blank
    // - Carts with no line items still get one row (with blank Product/Qty)
    const headers = ['Cart Number', 'Order Name', 'Recipient', 'Address', 'City', 'State', 'Zip', 'Product Name', 'Quantity', 'NOTES'];
    const csvRows = [headers.join(',')];
    
    // Escape a value for CSV: wrap in quotes, double internal quotes
    const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    
    transformedData.forEach(cart => {
      // If a cart has no line items, emit a single row with blank product/qty
      const lines = cart.lines.length > 0 ? cart.lines : [{ product: '', qty: '' }];
      
      lines.forEach((line, idx) => {
        const isFirst = idx === 0;
        const row = [
          isFirst ? cart.cartNumber : '',
          isFirst ? esc(cart.orderName) : '',
          isFirst ? esc(cart.recipient) : '',
          isFirst ? esc(cart.address) : '',
          isFirst ? esc(cart.city) : '',
          isFirst ? cart.state : '',
          isFirst ? cart.zip : '',
          esc(line.product),
          line.qty,
          isFirst ? esc(cart.notes) : ''
        ];
        csvRows.push(row.join(','));
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proximo_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: '#f5f5f5',
      padding: '30px 20px',
      fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif'
    }}>
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
      `}</style>
      <div style={{
        maxWidth: '1400px',
        minWidth: '320px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Upload Area */}
        {!transformedData && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#da291c',
              marginBottom: '25px'
            }}>
              <Upload size={36} color="white" />
            </div>
            
            <h2 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '22px', 
              fontWeight: '700',
              color: '#1a1a1a',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Upload Spreadsheet
            </h2>
            <p style={{ 
              margin: '0 0 30px 0', 
              color: '#666', 
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Upload an XLSX file to clean and transform
            </p>

            <label style={{
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
              letterSpacing: '1px'
            }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {processing ? 'Processing...' : 'Select File'}
            </label>

            {error && (
              <div style={{
                marginTop: '25px',
                padding: '15px 20px',
                background: '#fee',
                border: '2px solid #fcc',
                borderRadius: '4px',
                color: '#c33',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'center'
              }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <div style={{
              marginTop: '40px',
              paddingTop: '30px',
              borderTop: '2px solid #f0f0f0'
            }}>
              <h3 style={{ 
                margin: '0 0 15px 0', 
                fontSize: '14px', 
                fontWeight: '700',
                color: '#1a1a1a',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Currently Optimized For Cereus PSNA Reports
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 auto',
                textAlign: 'left',
                maxWidth: '500px'
              }}>
                <li style={{
                  padding: '10px 0',
                  color: '#666',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle size={18} color="#da291c" />
                  Removes duplicate rows
                </li>
                <li style={{
                  padding: '10px 0',
                  color: '#666',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle size={18} color="#da291c" />
                  Simplifies complex XML-style column names
                </li>
                <li style={{
                  padding: '10px 0',
                  color: '#666',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle size={18} color="#da291c" />
                  Generates clean, client-ready reports
                </li>
                <li style={{
                  padding: '10px 0',
                  color: '#666',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle size={18} color="#da291c" />
                  Exports in Proximo-ready CSV format
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Results */}
        {transformedData && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '30px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '22px', 
                  fontWeight: '700',
                  color: '#1a1a1a',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Transformation Complete
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '15px' }}>
                  Successfully processed {transformedData.length} unique orders
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={downloadTransformed}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#da291c',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <Download size={18} />
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    setTransformedData(null);
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
                    letterSpacing: '1px'
                  }}
                >
                  <RefreshCw size={18} />
                  New File
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div style={{
              background: '#f9f9f9',
              borderRadius: '8px',
              padding: '20px',
              overflow: 'auto',
              marginBottom: '25px'
            }}>
              <h3 style={{ 
                margin: '0 0 15px 0', 
                fontSize: '14px', 
                fontWeight: '700',
                color: '#1a1a1a',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Preview (First 10 Orders)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ background: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Cart #</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Order Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Recipient</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>City</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>State</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Items</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #da291c', fontWeight: '700', color: '#1a1a1a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transformedData.slice(0, 10).map((order, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a', fontWeight: '600' }}>{order.cartNumber}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a' }}>{order.orderName}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a' }}>{order.recipient}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a' }}>{order.city}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a' }}>{order.state}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#1a1a1a', textAlign: 'center', fontWeight: '600' }}>{order.lines?.length || 0}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {transformedData.length > 10 && (
                <p style={{ 
                  margin: '15px 0 0 0', 
                  color: '#999', 
                  fontSize: '13px'
                }}>
                  Showing 10 of {transformedData.length} orders. Download to see all.
                </p>
              )}
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div style={{
                background: '#1a1a1a',
                padding: '20px',
                borderRadius: '8px',
                color: 'white'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {transformedData.length}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                  Total Orders
                </div>
              </div>
              <div style={{
                background: '#da291c',
                padding: '20px',
                borderRadius: '8px',
                color: 'white'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {transformedData.filter(o => o.address && o.city && o.state).length}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                  With Full Address
                </div>
              </div>
              <div style={{
                background: '#666',
                padding: '20px',
                borderRadius: '8px',
                color: 'white'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px' }}>
                  {transformedData.reduce((sum, o) => sum + (o.lines?.length || 0), 0)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
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