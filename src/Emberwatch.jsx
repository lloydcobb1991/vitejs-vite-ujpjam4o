import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Flame,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';

// APL Brand Data
const APL_DATA = {
  brands: [
    { name: 'Absolut', supplier: 'PERNOD RICARD' },
    { name: 'Absolut Citron', supplier: 'PERNOD RICARD' },
    { name: 'Absolut Elyx', supplier: 'PERNOD RICARD' },
    { name: 'Chopin', supplier: 'CHOPIN' },
    { name: 'Grey Goose', supplier: 'BACARDI' },
    { name: 'Ketel One', supplier: 'DIAGEO' },
    { name: 'Ketel One Botanical Cucumber & Mint Vodka', supplier: 'DIAGEO' },
    { name: 'New Amsterdam', supplier: 'GALLO' },
    { name: "Tito's Handmade", supplier: 'FIFTH GENERATION' },
    { name: "Angel's Envy Bourbon", supplier: 'BACARDI' },
    { name: 'Bulleit Bourbon', supplier: 'DIAGEO' },
    { name: 'Buffalo Trace Bourbon', supplier: 'SAZERAC' },
    { name: 'Crown Royal Canadian Whisky', supplier: 'DIAGEO' },
    { name: "Jack Daniel's Tennessee Whiskey", supplier: 'BROWN FORMAN' },
    { name: 'Jameson Irish Whiskey', supplier: 'PERNOD RICARD' },
    { name: 'Jim Beam Bourbon', supplier: 'BEAM SUNTORY' },
    { name: "Maker's Mark 46 Bourbon", supplier: 'BEAM SUNTORY' },
    { name: 'Woodford Reserve Bourbon', supplier: 'BROWN FORMAN' },
    { name: 'Rittenhouse Rye Whiskey', supplier: 'HEAVEN HILL' },
    { name: 'Appleton Estate 12 Year Rare Blend', supplier: 'CAMPARI' },
    { name: 'BACARDÍ Superior', supplier: 'BACARDI' },
    { name: 'Captain Morgan Original Spiced', supplier: 'DIAGEO' },
    { name: 'Don Q Cristal', supplier: 'SERRALLES' },
    { name: "Gosling's Black Seal", supplier: 'CASTLE BRANDS/PR' },
    { name: 'Malibu Coconut', supplier: 'PERNOD RICARD' },
    {
      name: "Planteray Stiggins' Fancy Pineapple Rum",
      supplier: 'MAISON FERRAND',
    },
    { name: 'Aviation American Gin', supplier: 'AVIATION/DIAGEO' },
    { name: "Hendrick's Gin", supplier: 'WILLIAM GRANT' },
    { name: 'Mr. Pickles Gin', supplier: 'WOLF SPIRITS' },
    { name: 'Tanqueray London Dry Gin', supplier: 'DIAGEO' },
    { name: 'The Botanist Islay Dry Gin', supplier: 'REMY COINTREAU' },
    { name: 'Casamigos Blanco Tequila', supplier: 'CASAMIGOS/DIAGEO' },
    { name: 'Don Julio Blanco', supplier: 'DIAGEO' },
    { name: 'Espolón Blanco Tequila', supplier: 'CAMPARI' },
    { name: 'Espolón Reposado Tequila', supplier: 'CAMPARI' },
    { name: 'Jose Cuervo Especial Silver', supplier: 'PROXIMO' },
    { name: 'La Gritona Reposado Tequila', supplier: 'LA GRITONA' },
    { name: '818 Reposado Tequila', supplier: 'SAZERAC' },
    { name: 'Bosscal Mezcal', supplier: 'BOSSCAL' },
    { name: 'Ilegal Mezcal', supplier: 'BACARDI' },
    { name: 'Christian Brothers VSOP', supplier: 'HEAVEN HILL' },
    { name: 'Hennessy V.S Cognac', supplier: 'MOET HENNESSY' },
    { name: 'Martell Blue Swift VSOP', supplier: 'PERNOD RICARD' },
    { name: 'Remy Martin 1738', supplier: 'REMY COINTREAU' },
    { name: 'Aperol Aperitivo Liqueur', supplier: 'CAMPARI' },
    { name: "Cointreau L'Unique Orange Liqueur", supplier: 'REMY COINTREAU' },
    { name: 'Grand Marnier Liqueur', supplier: 'CAMPARI' },
    { name: 'St-Germain Elderflower Liqueur', supplier: 'BACARDI' },
    { name: "Pimm's No. 1 Cup Liqueur", supplier: 'DIAGEO' },
    { name: 'Caravella Limoncello', supplier: 'SAZERAC' },
    { name: "Barrow's Intense Ginger Liqueur", supplier: 'TRELLIS' },
    { name: 'Amaro Nonino Quintessentia', supplier: 'TERLATO' },
    { name: 'Carpano Antica Formula', supplier: 'BRANCA' },
    { name: 'Campari Aperitivo', supplier: 'CAMPARI' },
    { name: 'Fever-Tree Ginger Beer', supplier: 'FEVER-TREE' },
    { name: 'Mionetto Prosecco', supplier: 'MIONETTO' },
  ],
};

export default function Emberwatch() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(files);
    setResults(null);
    setError(null);
  };

  const analyzeMenus = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one menu PDF');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProgress('Converting PDFs...');

    try {
      const fileDataPromises = uploadedFiles.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({ name: file.name, base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(fileDataPromises);
      const menuAnalyses = [];

      for (let i = 0; i < filesData.length; i++) {
        const fileData = filesData[i];
        setProgress(
          `Analyzing ${fileData.name} (${i + 1}/${filesData.length})...`
        );

        const analysis = await analyzeMenuWithClaude(fileData);
        menuAnalyses.push({
          location: extractLocation(fileData.name),
          filename: fileData.name,
          ...analysis,
        });
      }

      setProgress('Aggregating results...');
      const aggregated = aggregateBySupplier(menuAnalyses);

      setResults({ menuAnalyses, aggregated });
      setProgress('');
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error('Error:', err);
      setProgress('');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeMenuWithClaude = async ({ name, base64 }) => {
    const brandList = APL_DATA.brands
      .map((b) => `- ${b.name} (${b.supplier})`)
      .join('\n');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Analyze this cocktail menu for APL brand impressions.

**APL BRANDS:**
${brandList}

**TASK:**
1. Find every cocktail
2. Identify APL brands in each recipe
3. Count impressions (each mention = 1)
4. Flag compliance issues (incomplete names like "Jack" instead of "Jack Daniel's Tennessee Whiskey")

**RETURN JSON:**
\`\`\`json
{
  "cocktails": [
    {
      "name": "Cocktail Name",
      "brands_used": ["Full Brand Name"],
      "recipe_text": "ingredients"
    }
  ],
  "brand_impressions": {
    "Brand Name": {
      "count": 3,
      "supplier": "SUPPLIER",
      "cocktails": ["Cocktail 1", "Cocktail 2"]
    }
  },
  "compliance_issues": [
    {
      "type": "incomplete_name",
      "found_text": "Jack",
      "correct_name": "Jack Daniel's Tennessee Whiskey",
      "cocktail": "Name"
    }
  ]
}
\`\`\`

ONLY respond with JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    const jsonText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(jsonText);
  };

  const extractLocation = (filename) => {
    if (filename.includes('NYC')) return 'New York City';
    if (filename.includes('LV')) return 'Las Vegas';
    if (filename.includes('DC')) return 'Washington DC';
    return filename.replace(/[^a-zA-Z0-9]/g, ' ');
  };

  const aggregateBySupplier = (menuAnalyses) => {
    const supplierTotals = {};

    menuAnalyses.forEach((menu) => {
      Object.entries(menu.brand_impressions || {}).forEach(([brand, data]) => {
        const supplier = data.supplier || 'UNKNOWN';

        if (!supplierTotals[supplier]) {
          supplierTotals[supplier] = { total: 0, brands: {}, locations: {} };
        }

        supplierTotals[supplier].total += data.count;
        supplierTotals[supplier].brands[brand] =
          (supplierTotals[supplier].brands[brand] || 0) + data.count;
        supplierTotals[supplier].locations[menu.location] =
          (supplierTotals[supplier].locations[menu.location] || 0) + data.count;
      });
    });

    return Object.entries(supplierTotals)
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  const exportToCSV = () => {
    if (!results) return;

    const rows = [
      ['Supplier', 'Brand', 'NYC', 'Las Vegas', 'Washington DC', 'Total'],
    ];

    results.aggregated.forEach((supplier) => {
      Object.entries(supplier.brands).forEach(([brand, totalCount]) => {
        const nycCount =
          results.menuAnalyses.find((m) => m.location === 'New York City')
            ?.brand_impressions?.[brand]?.count || 0;
        const lvCount =
          results.menuAnalyses.find((m) => m.location === 'Las Vegas')
            ?.brand_impressions?.[brand]?.count || 0;
        const dcCount =
          results.menuAnalyses.find((m) => m.location === 'Washington DC')
            ?.brand_impressions?.[brand]?.count || 0;

        rows.push([
          supplier.supplier,
          brand,
          nycCount,
          lvCount,
          dcCount,
          totalCount,
        ]);
      });
    });

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emberwatch-apl-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        padding: '40px 20px',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(218, 41, 28, 0.3); }
          50% { box-shadow: 0 0 40px rgba(218, 41, 28, 0.6); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Upload View */}
      {!results && (
        <div
          style={{
            width: '98%',
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
              borderRadius: '20px',
              padding: '60px',
              marginBottom: '30px',
              boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
              animation: 'glow 3s ease-in-out infinite',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Animated background */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
                animation: 'flicker 4s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
            >
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    marginBottom: '15px',
                  }}
                >
                  <Flame
                    size={64}
                    color="white"
                    fill="white"
                    style={{ animation: 'flicker 2s ease-in-out infinite' }}
                  />
                  <h1
                    style={{
                      fontSize: '56px',
                      fontWeight: '900',
                      margin: 0,
                      color: 'white',
                      letterSpacing: '-2px',
                      textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      lineHeight: '1',
                    }}
                  >
                    Emberwatch
                  </h1>
                </div>
                <p
                  style={{
                    fontSize: '20px',
                    margin: 0,
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: '600',
                    letterSpacing: '1px',
                  }}
                >
                  Impressions Tracker
                </p>
              </div>
              <p
                style={{
                  fontSize: '18px',
                  color: 'rgba(255,255,255,0.95)',
                  margin: 0,
                  fontWeight: '500',
                }}
              >
                Upload cocktail menu PDFs to track brand compliance and count
                impressions
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '50px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                border: '3px dashed #da291c',
                borderRadius: '16px',
                padding: '60px 40px',
                textAlign: 'center',
                background: '#fafafa',
                marginBottom: '30px',
                transition: 'all 0.3s ease',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(
                  (f) => f.type === 'application/pdf'
                );
                if (files.length) {
                  setUploadedFiles(files);
                  setResults(null);
                  setError(null);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              <FileText
                size={64}
                color="#da291c"
                style={{ marginBottom: '24px', opacity: 0.7 }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background:
                    'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '20px 48px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  boxShadow: '0 8px 24px rgba(218, 41, 28, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 32px rgba(218, 41, 28, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(218, 41, 28, 0.4)';
                }}
              >
                <Upload size={20} />
                Select Menu PDFs
              </button>

              <p
                style={{
                  color: '#999',
                  fontSize: '15px',
                  margin: 0,
                }}
              >
                or drag and drop files here
              </p>
            </div>

            {uploadedFiles.length > 0 && (
              <div
                style={{
                  background: '#f0f9f4',
                  borderRadius: '12px',
                  padding: '30px',
                  marginBottom: '30px',
                  border: '2px solid #28a745',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <CheckCircle size={24} color="#28a745" />
                  <strong style={{ fontSize: '18px', color: '#28a745' }}>
                    {uploadedFiles.length} file
                    {uploadedFiles.length > 1 ? 's' : ''} ready
                  </strong>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'white',
                        padding: '14px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '2px solid #e8e8e8',
                        fontWeight: '600',
                        color: '#1a1a1a',
                      }}
                    >
                      <FileText size={18} color="#da291c" />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={analyzeMenus}
              disabled={analyzing || uploadedFiles.length === 0}
              style={{
                width: '100%',
                background: analyzing
                  ? 'linear-gradient(135deg, #999 0%, #666 100%)'
                  : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: 'white',
                border: 'none',
                padding: '28px',
                borderRadius: '12px',
                fontSize: '24px',
                fontWeight: '900',
                cursor:
                  analyzing || uploadedFiles.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
              onMouseOver={(e) => {
                if (!analyzing && uploadedFiles.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 32px rgba(0,0,0,0.4)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
              }}
            >
              {analyzing ? (
                <>
                  <Flame
                    size={24}
                    style={{ animation: 'flicker 1s ease-in-out infinite' }}
                  />
                  {progress}
                </>
              ) : (
                <>
                  <TrendingUp size={24} />
                  Analyze Menus
                </>
              )}
            </button>

            {error && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '24px',
                  background: '#fff5f5',
                  borderRadius: '12px',
                  color: '#da291c',
                  fontSize: '16px',
                  fontWeight: '700',
                  border: '2px solid #da291c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={24} />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div
          style={{
            width: '98%',
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
              borderRadius: '20px',
              padding: '40px 50px',
              marginBottom: '30px',
              boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '10px',
                }}
              >
                <Flame
                  size={48}
                  color="white"
                  fill="white"
                  style={{ animation: 'flicker 2s ease-in-out infinite' }}
                />
                <h1
                  style={{
                    fontSize: '42px',
                    fontWeight: '900',
                    color: 'white',
                    margin: 0,
                    letterSpacing: '-1px',
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  Analysis Complete
                </h1>
              </div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  margin: 0,
                  fontWeight: '600',
                  fontSize: '18px',
                }}
              >
                {results.menuAnalyses.length} menu
                {results.menuAnalyses.length > 1 ? 's' : ''} analyzed ·{' '}
                {results.aggregated.reduce((sum, s) => sum + s.total, 0)} total
                impressions
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setResults(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid white',
                  padding: '16px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                New Analysis
              </button>
              <button
                onClick={exportToCSV}
                style={{
                  background: 'white',
                  color: '#da291c',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '50px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '900',
                marginBottom: '40px',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <TrendingUp size={32} color="#da291c" />
              Impressions by Supplier
            </h2>

            <div style={{ display: 'grid', gap: '24px' }}>
              {results.aggregated.map((supplier, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '3px solid #f0f0f0',
                    borderRadius: '16px',
                    padding: '40px',
                    background:
                      'linear-gradient(135deg, #fafafa 0%, white 100%)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#da291c';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow =
                      '0 12px 32px rgba(218, 41, 28, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '30px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '28px',
                        fontWeight: '900',
                        color: '#1a1a1a',
                        margin: 0,
                      }}
                    >
                      {supplier.supplier}
                    </h3>
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
                        color: 'white',
                        padding: '14px 32px',
                        borderRadius: '40px',
                        fontSize: '28px',
                        fontWeight: '900',
                        boxShadow: '0 6px 20px rgba(218, 41, 28, 0.3)',
                      }}
                    >
                      {supplier.total}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <strong
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Brands
                    </strong>
                    <div
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      {Object.entries(supplier.brands).map(([brand, count]) => (
                        <span
                          key={brand}
                          style={{
                            background: 'white',
                            padding: '10px 20px',
                            borderRadius: '30px',
                            fontSize: '15px',
                            border: '2px solid #e8e8e8',
                            fontWeight: '700',
                            color: '#1a1a1a',
                          }}
                        >
                          {brand}:{' '}
                          <span style={{ color: '#da291c' }}>{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      By Location
                    </strong>
                    <div
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        gap: '24px',
                        fontWeight: '700',
                        fontSize: '16px',
                      }}
                    >
                      {Object.entries(supplier.locations).map(
                        ([loc, count]) => (
                          <span key={loc} style={{ color: '#1a1a1a' }}>
                            📍 {loc}:{' '}
                            <span style={{ color: '#da291c' }}>{count}</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance Issues */}
            {results.menuAnalyses.some(
              (m) => m.compliance_issues?.length > 0
            ) && (
              <div style={{ marginTop: '50px' }}>
                <h2
                  style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    marginBottom: '30px',
                    color: '#da291c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertTriangle size={32} />
                  Compliance Issues
                </h2>
                {results.menuAnalyses.map(
                  (menu, idx) =>
                    menu.compliance_issues?.length > 0 && (
                      <div key={idx} style={{ marginBottom: '30px' }}>
                        <h3
                          style={{
                            fontSize: '24px',
                            fontWeight: '800',
                            marginBottom: '20px',
                            color: '#1a1a1a',
                          }}
                        >
                          📍 {menu.location}
                        </h3>
                        {menu.compliance_issues.map((issue, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#fff5f5',
                              padding: '24px',
                              borderRadius: '12px',
                              borderLeft: '6px solid #da291c',
                              marginBottom: '16px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '12px',
                              }}
                            >
                              <AlertTriangle size={20} color="#da291c" />
                              <strong
                                style={{ color: '#da291c', fontSize: '16px' }}
                              >
                                {issue.type === 'incomplete_name' &&
                                  'INCOMPLETE NAME'}
                              </strong>
                            </div>
                            <div
                              style={{
                                color: '#666',
                                fontSize: '15px',
                                lineHeight: '1.7',
                              }}
                            >
                              <div>
                                Found: "<strong>{issue.found_text}</strong>" in{' '}
                                <em>{issue.cocktail}</em>
                              </div>
                              <div style={{ marginTop: '6px' }}>
                                Should be: "
                                <strong style={{ color: '#28a745' }}>
                                  {issue.correct_name}
                                </strong>
                                "
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
