import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Flame,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Mail,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Send,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The Railway-hosted backend. Switching this URL is how you swap servers.
const API_BASE = 'https://emberwatch-api-production.up.railway.app';

// Default email map per supplier. These are EDITABLE in the review screen
// before sending - this is just the prefill. Add or correct as you learn the
// real contacts.
const SUPPLIER_EMAILS = {
  DIAGEO: 'reports@diageo.com',
  'PERNOD RICARD': 'reports@pernod-ricard.com',
  'BEAM SUNTORY': 'reports@beamsuntory.com',
  CAMPARI: 'reports@campari.com',
  BACARDI: 'reports@bacardi.com',
  'MOET HENNESSY': 'reports@moethennessy.com',
  GALLO: 'reports@gallo.com',
  'FIFTH GENERATION': 'reports@fifthgeneration.com',
  'BROWN FORMAN': 'reports@brown-forman.com',
  'HEAVEN HILL': 'reports@heavenhill.com',
  'REMY COINTREAU': 'reports@remy-cointreau.com',
  'WILLIAM GRANT': 'reports@williamgrant.com',
  SAZERAC: 'reports@sazerac.com',
  PROXIMO: 'reports@proximospirits.com',
  'MAISON FERRAND': 'reports@maisonferrand.com',
  SERRALLES: 'reports@serralles.com',
  CHOPIN: 'reports@chopinvodka.com',
  'CASTLE BRANDS/PR': 'reports@castlebrandsinc.com',
  'AVIATION/DIAGEO': 'reports@aviationgin.com',
  'CASAMIGOS/DIAGEO': 'reports@casamigos.com',
  'WOLF SPIRITS': 'reports@wolfspirits.com',
  'LA GRITONA': 'reports@lagritonatequila.com',
  BOSSCAL: 'reports@bosscalmezcal.com',
  TRELLIS: 'reports@trellisspirits.com',
  TERLATO: 'reports@terlato.com',
  BRANCA: 'reports@brancausa.com',
  'FEVER-TREE': 'reports@fever-tree.com',
  MIONETTO: 'reports@mionetto.com',
};

// ---------------------------------------------------------------------------
// APL Brand Data
// ---------------------------------------------------------------------------

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

// ===========================================================================
// Main component
// ===========================================================================

export default function Emberwatch() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [view, setView] = useState('upload'); // 'upload' | 'results' | 'email'
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
      setView('results');
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

    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
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
1. Find every cocktail and identify which APL brands appear in it
2. Count impressions (each mention of a brand = 1 impression)
3. Flag compliance issues (incomplete names like "Jack" instead of "Jack Daniel's Tennessee Whiskey", misspellings, or wrong product variants)

**RETURN ONLY THIS JSON STRUCTURE - no other fields, no recipe text, no cocktail list:**
\`\`\`json
{
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
      "cocktail": "Cocktail Name"
    }
  ]
}
\`\`\`

ONLY respond with JSON. Do not include a "cocktails" array or "recipe_text" anywhere.`,
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

  // ----- Rendering -------------------------------------------------------

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

      {view === 'upload' && (
        <UploadView
          uploadedFiles={uploadedFiles}
          analyzing={analyzing}
          progress={progress}
          error={error}
          onPickFiles={() => fileInputRef.current?.click()}
          onFileUpload={handleFileUpload}
          onDropFiles={(files) => {
            setUploadedFiles(files);
            setResults(null);
            setError(null);
          }}
          onAnalyze={analyzeMenus}
          fileInputRef={fileInputRef}
        />
      )}

      {view === 'results' && results && (
        <ResultsView
          results={results}
          onNew={() => {
            setResults(null);
            setUploadedFiles([]);
            setView('upload');
          }}
          onExport={exportToCSV}
          onOpenEmail={() => setView('email')}
        />
      )}

      {view === 'email' && results && (
        <EmailReportView
          results={results}
          onBack={() => setView('results')}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Upload view
// ===========================================================================

function UploadView({
  uploadedFiles,
  analyzing,
  progress,
  error,
  onPickFiles,
  onFileUpload,
  onDropFiles,
  onAnalyze,
  fileInputRef,
}) {
  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
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
            if (files.length) onDropFiles(files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={onFileUpload}
            style={{ display: 'none' }}
          />

          <FileText
            size={64}
            color="#da291c"
            style={{ marginBottom: '24px', opacity: 0.7 }}
          />

          <button
            onClick={onPickFiles}
            style={{
              background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Upload size={20} />
            Select Menu PDFs
          </button>

          <p style={{ color: '#999', fontSize: '15px', margin: 0 }}>
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
          onClick={onAnalyze}
          disabled={analyzing || uploadedFiles.length === 0}
          style={{
            width: '100%',
          background: analyzing ? '#999' : '#da291c',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(218, 41, 28, 0.25)',
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
  );
}

// ===========================================================================
// Results view
// ===========================================================================

function ResultsView({ results, onNew, onExport, onOpenEmail }) {
  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onNew}
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
            }}
          >
            New Analysis
          </button>
          <button
            onClick={onOpenEmail}
            style={{
              background: '#1a1a1a',
              color: 'white',
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
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <Mail size={18} />
            Generate Reports
          </button>
          <button
            onClick={onExport}
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
                background: 'linear-gradient(135deg, #fafafa 0%, white 100%)',
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
                      {brand}: <span style={{ color: '#da291c' }}>{count}</span>
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
                    flexWrap: 'wrap',
                  }}
                >
                  {Object.entries(supplier.locations).map(([loc, count]) => (
                    <span key={loc} style={{ color: '#1a1a1a' }}>
                      📍 {loc}: <span style={{ color: '#da291c' }}>{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.menuAnalyses.some((m) => m.compliance_issues?.length > 0) && (
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
  );
}

// ===========================================================================
// Email report view
// ===========================================================================

function EmailReportView({ results, onBack }) {
  const [emails, setEmails] = useState(() => buildEmails(results));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState('review'); // 'review' | 'sending' | 'done'
  const [sendError, setSendError] = useState(null);
  const [sendSummary, setSendSummary] = useState(null);

  const current = emails[currentIdx];

  const updateField = (field, value) => {
    setEmails((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], [field]: value };
      return next;
    });
  };

  // Shared send pipeline. `batch` is the array of emails to send.
  const doSend = async (batch) => {
    setSendError(null);
    setStep('sending');

    try {
      const res = await fetch(`${API_BASE}/api/send-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: batch.map((e) => ({
            to: e.to,
            subject: e.subject,
            body: e.body,
            supplier: e.supplier,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setSendSummary(data);
      if (data.failed > 0) {
        setSendError(
          `${data.failed} of ${batch.length} emails failed. See details below.`
        );
      }
      setStep('done');
    } catch (err) {
      console.error('Send failed:', err);
      setSendError(err.message);
      setStep('review');
    }
  };

  // Send every supplier report.
  const sendAll = () => doSend(emails);

  // Send ONLY the supplier currently being viewed — used for safe testing.
  const sendOne = () => doSend([emails[currentIdx]]);

  // ----- Sending screen -----
  if (step === 'sending') {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '100px auto',
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <Flame
          size={64}
          color="#da291c"
          style={{
            marginBottom: '24px',
            animation: 'flicker 1s ease-in-out infinite',
          }}
        />
        <h2
          style={{
            fontSize: '32px',
            fontWeight: '900',
            color: '#da291c',
            margin: '0 0 12px 0',
            lineHeight: '1.2',
          }}
        >
          Sending Reports
        </h2>
        <p style={{ color: '#666', fontSize: '18px' }}>
          Sending {emails.length} supplier{' '}
          {emails.length === 1 ? 'report' : 'reports'}…
        </p>
      </div>
    );
  }

  // ----- Done screen -----
  if (step === 'done') {
    const sent = sendSummary?.sent ?? emails.length;
    const failed = sendSummary?.failed ?? 0;
    const allOk = failed === 0;
    return (
      <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '60px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            border: `4px solid ${allOk ? '#28a745' : '#da291c'}`,
          }}
        >
          <CheckCircle
            size={72}
            color={allOk ? '#28a745' : '#da291c'}
            style={{ marginBottom: '24px' }}
          />
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '900',
              color: allOk ? '#28a745' : '#da291c',
              margin: '0 0 12px 0',
              lineHeight: '1.2',
            }}
          >
            {allOk ? 'Reports Sent' : 'Sent with errors'}
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: '18px',
              marginBottom: '32px',
            }}
          >
            {sent} sent · {failed} failed
          </p>

          {sendSummary?.results && (
            <div
              style={{
                background: '#fafafa',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
                textAlign: 'left',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {sendSummary.results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #e8e8e8',
                    fontSize: '14px',
                    color: r.status === 'sent' ? '#28a745' : '#da291c',
                    fontWeight: '700',
                  }}
                >
                  {r.status === 'sent' ? '✓' : '✗'} {r.supplier} ({r.to})
                  {r.error && (
                    <div
                      style={{
                        color: '#666',
                        fontWeight: '500',
                        fontSize: '13px',
                        marginTop: '4px',
                      }}
                    >
                      {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onBack}
            style={{
              background: '#1a1a1a',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // ----- Review screen -----
  return (
    <div style={{ width: '98%', margin: '0 auto', padding: '0 20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
          borderRadius: '20px',
          padding: '32px 40px',
          marginBottom: '24px',
          boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={36} color="white" />
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '900',
                color: 'white',
                margin: 0,
                letterSpacing: '-1px',
                lineHeight: '1.2',
              }}
            >
              Review & Send Reports
            </h1>
          </div>
          <p
            style={{
              color: 'rgba(255,255,255,0.95)',
              margin: '8px 0 0 0',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {emails.length} supplier reports · review each before sending
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Back
          </button>
          <button
            onClick={sendOne}
            title="Sends only the supplier you're currently viewing — useful for testing to your own inbox"
            style={{
              background: 'white',
              color: '#1a1a1a',
              border: '2px solid #1a1a1a',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Send size={16} />
            Send Test (This One)
          </button>
          <button
            onClick={sendAll}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(40, 167, 69, 0.4)',
            }}
          >
            <Send size={18} />
            Approve & Send All
          </button>
        </div>
      </div>

      {sendError && (
        <div
          style={{
            background: '#fff5f5',
            border: '2px solid #da291c',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '24px',
            color: '#da291c',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} />
          {sendError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '24px',
        }}
      >
        {/* Supplier list */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            height: 'fit-content',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '800',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 16px 0',
            }}
          >
            Suppliers ({emails.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {emails.map((e, idx) => (
              <button
                key={e.supplier}
                onClick={() => {
                  setCurrentIdx(idx);
                  setEditing(false);
                }}
                style={{
                  background:
                    currentIdx === idx
                      ? 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)'
                      : '#fafafa',
                  color: currentIdx === idx ? 'white' : '#1a1a1a',
                  border: 'none',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>{e.supplier}</div>
                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    fontWeight: '600',
                    marginTop: '4px',
                  }}
                >
                  {e.totalImpressions} impressions
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Email preview/editor */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '2px solid #f0f0f0',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                Preview {currentIdx + 1} of {emails.length}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#1a1a1a',
                }}
              >
                {current.supplier}
              </div>
            </div>
            <button
              onClick={() => setEditing((v) => !v)}
              style={{
                background: editing ? '#28a745' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {editing ? <Save size={16} /> : <Edit3 size={16} />}
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* To / Subject */}
          <div
            style={{
              background: '#fafafa',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '2px solid #f0f0f0',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                To
              </div>
              {editing ? (
                <input
                  type="email"
                  value={current.to}
                  onChange={(e) => updateField('to', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '15px',
                    border: '2px solid #da291c',
                    borderRadius: '8px',
                    fontWeight: '600',
                  }}
                />
              ) : (
                <div style={{ fontSize: '15px', fontWeight: '700' }}>
                  {current.to}
                </div>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Subject
              </div>
              {editing ? (
                <input
                  type="text"
                  value={current.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '15px',
                    border: '2px solid #da291c',
                    borderRadius: '8px',
                    fontWeight: '600',
                  }}
                />
              ) : (
                <div style={{ fontSize: '15px', fontWeight: '700' }}>
                  {current.subject}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              background: '#fafafa',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #f0f0f0',
              minHeight: '400px',
            }}
          >
            {editing ? (
              <textarea
                value={current.body}
                onChange={(e) => updateField('body', e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '500px',
                  padding: '16px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '2px solid #da291c',
                  borderRadius: '8px',
                  resize: 'vertical',
                  lineHeight: '1.6',
                }}
              />
            ) : (
              <pre
                style={{
                  fontSize: '15px',
                  lineHeight: '1.7',
                  color: '#1a1a1a',
                  fontFamily:
                    '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {current.body}
              </pre>
            )}
          </div>

          {/* Nav */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '24px',
            }}
          >
            <button
              onClick={() => {
                setCurrentIdx(Math.max(0, currentIdx - 1));
                setEditing(false);
              }}
              disabled={currentIdx === 0}
              style={{
                background: currentIdx === 0 ? '#ccc' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              onClick={() => {
                setCurrentIdx(Math.min(emails.length - 1, currentIdx + 1));
                setEditing(false);
              }}
              disabled={currentIdx === emails.length - 1}
              style={{
                background:
                  currentIdx === emails.length - 1 ? '#ccc' : '#1a1a1a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                cursor:
                  currentIdx === emails.length - 1 ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build the per-supplier email list from the aggregated analysis results.
// ---------------------------------------------------------------------------

function buildEmails(results) {
  const period = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Map each supplier to their flagged compliance issues, by checking whether
  // the issue's correct_name is one of that supplier's brands.
  const supplierBrandNames = {};
  results.aggregated.forEach((s) => {
    supplierBrandNames[s.supplier] = new Set(Object.keys(s.brands));
  });
  const allIssues = results.menuAnalyses.flatMap((m) =>
    (m.compliance_issues || []).map((i) => ({ ...i, location: m.location }))
  );

  return results.aggregated.map((supplier) => {
    const issuesForSupplier = allIssues.filter((issue) =>
      supplierBrandNames[supplier.supplier]?.has(issue.correct_name)
    );

    const locationLines = Object.entries(supplier.locations)
      .map(([loc, count]) => `  • ${loc}: ${count} impressions`)
      .join('\n');

    const brandLines = Object.entries(supplier.brands)
      .map(([brand, count]) => `  • ${brand}: ${count} impressions`)
      .join('\n');

    const compliance =
      issuesForSupplier.length > 0
        ? `\n\nCOMPLIANCE NOTES:\n${issuesForSupplier
            .map(
              (issue) =>
                `  ⚠ Found "${issue.found_text}" in ${issue.cocktail} (${issue.location}) — should be "${issue.correct_name}"`
            )
            .join(
              '\n'
            )}\n\nPlease review these with the venue to ensure proper brand representation.`
        : '';

    const body = `Dear ${supplier.supplier} team,

Please find your APL impression report for ${period}.

SUMMARY
Total impressions: ${supplier.total}

BY LOCATION:
${locationLines}

BY BRAND:
${brandLines}${compliance}

This report reflects all detected mentions of your brands across our menu analysis for the period.

If you have any questions, please reply directly to this email.

Best regards,
The Ignite Team

—
Generated by Emberwatch - Ignite Creative Services LLC · ${new Date().toLocaleDateString()}`;

    return {
      supplier: supplier.supplier,
      to:
        SUPPLIER_EMAILS[supplier.supplier] ||
        `reports@${supplier.supplier.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      subject: `APL Impression Report — ${period}`,
      body,
      totalImpressions: supplier.total,
    };
  });
}