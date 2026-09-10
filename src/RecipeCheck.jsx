import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  ClipboardCopy,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseCsvApl, parseXlsxApl } from './aplParser';
import { checkRecipes } from './recipeRules';

// ===========================================================================
// Recipe pre-flight.
//
// Fire Watch tells you what went wrong after the menu is printed. This tells
// you before it is written. Paste the recipes, get a verdict per ingredient
// against the live APL.
//
// No model call anywhere in here. The verdict is the same every time and you
// can point at the rule that produced it, which matters when the answer is
// "this drink can't go on the menu".
// ===========================================================================

const VERDICT = {
  approved: { label: 'On the APL', color: '#28a745', bg: '#f0f9f4', border: '#bfe6cb' },
  naming:   { label: 'Rename',     color: '#b26a00', bg: '#fffdf7', border: '#ffe1a6' },
  variant:  { label: 'Not approved', color: '#da291c', bg: '#fff5f5', border: '#f5c2c0' },
  unlisted: { label: 'Not on the APL', color: '#da291c', bg: '#fff5f5', border: '#f5c2c0' },
  generic:  { label: 'Ingredient',  color: '#999',    bg: '#fafafa', border: '#ececec' },
};

export default function RecipeCheck() {
  const [apl, setApl] = useState(null); // { name, brands }
  const [aplError, setAplError] = useState(null);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const loadApl = async (file) => {
    if (!file) return;
    setAplError(null);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let brands;
      if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        brands = parseXlsxApl(XLSX.read(buf, { type: 'array' }));
      } else if (ext === 'csv') {
        brands = parseCsvApl(await file.text());
      } else {
        throw new Error(`Unsupported file type: .${ext}. Upload a CSV or Excel file.`);
      }
      if (!brands.length) throw new Error('No brands found in that file.');
      setApl({ name: file.name, brands });
    } catch (err) {
      console.error('APL parse error:', err);
      setAplError(err.message || 'Could not read that APL.');
      setApl(null);
    }
  };

  // Cheap enough to run on every keystroke — no network, no model.
  const result = useMemo(
    () => (apl && text.trim() ? checkRecipes(text, apl.brands) : null),
    [apl, text]
  );

  // Plain text, so findings can go straight into an email without retyping.
  const copySummary = () => {
    if (!result) return;
    const lines = [`Recipe check against ${apl.name}`, ''];
    for (const d of result.drinks) {
      const flagged = d.ingredients.filter((i) => i.verdict !== 'generic' && i.verdict !== 'approved');
      if (!flagged.length) continue;
      lines.push(`${d.name}:`);
      for (const i of flagged) {
        if (i.verdict === 'naming') lines.push(`  - "${i.name}" should be written as "${i.aplName}"`);
        else if (i.verdict === 'variant')
          lines.push(
            `  - "${i.name}" is NOT on the APL. Approved: ${i.alternatives.map((a) => a.name).join(', ')}`
          );
        else lines.push(`  - "${i.name}" is not on the APL at all`);
      }
      lines.push('');
    }
    lines.push(
      `${result.counts.blockers} item${result.counts.blockers === 1 ? '' : 's'} need re-speccing before print.`
    );
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const blockers = result?.counts.blockers ?? 0;
  const naming = result?.counts.naming ?? 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        padding: '40px 20px',
      }}
    >
      <div style={{ width: '98%', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
            borderRadius: '20px',
            padding: '32px 40px',
            marginBottom: '24px',
            boxShadow: '0 20px 60px rgba(218, 41, 28, 0.4)',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              letterSpacing: '-1px',
            }}
          >
            Recipe Check
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.95)',
              margin: '8px 0 0 0',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Check recipes against the APL before they reach a menu.
          </p>
        </div>

        {/* APL panel */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px 32px',
            marginBottom: '20px',
            border: apl ? '2px solid #da291c' : '2px solid #ececec',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#999',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Active APL
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a1a' }}>
              {apl ? apl.name : 'None loaded'}
            </div>
            {apl && (
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                {apl.brands.length} brands
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              loadApl(e.target.files[0]);
              if (fileRef.current) fileRef.current.value = '';
            }}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'white',
              color: '#da291c',
              border: '2px solid #da291c',
              padding: '12px 22px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Upload size={16} />
            {apl ? 'Replace APL' : 'Upload APL'}
          </button>
        </div>

        {aplError && (
          <div
            style={{
              background: '#fff5f5',
              border: '2px solid #da291c',
              borderRadius: '12px',
              padding: '16px 24px',
              marginBottom: '20px',
              color: '#da291c',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} />
            {aplError}
          </div>
        )}

        {/* Input */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}
          >
            Recipes
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Paste recipes, one drink per block. For example:\n\n' +
              'Autumn Flip - Absolut Vanilla Vodka, Captain Morgan Original Spiced Rum, lemon juice\n' +
              'Spritz - Aperol, Mionetto Prosecco, soda water'
            }
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '180px',
              padding: '16px',
              fontSize: '14px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              border: '2px solid #ddd',
              borderRadius: '10px',
              resize: 'vertical',
              lineHeight: '1.7',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '12px', color: '#999', marginTop: '10px', lineHeight: '1.6' }}>
            Wrapped lines are fine — text pasted out of a PDF breaks mid-ingredient and is
            stitched back together. A new drink starts on a line like{' '}
            <strong style={{ color: '#666' }}>Name - ingredient, ingredient</strong>, or on a
            bottle offer.
          </div>
        </div>

        {!apl && text.trim() && (
          <div
            style={{
              background: '#fff8e6',
              border: '2px solid #ffab00',
              borderRadius: '12px',
              padding: '16px 24px',
              color: '#b26a00',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={18} />
            Upload the client's APL to check these against it.
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div
              style={{
                background: blockers ? '#fff5f5' : '#f0f9f4',
                border: `3px solid ${blockers ? '#da291c' : '#28a745'}`,
                borderRadius: '16px',
                padding: '24px 32px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {blockers ? (
                  <AlertTriangle size={32} color="#da291c" />
                ) : (
                  <CheckCircle size={32} color="#28a745" />
                )}
                <div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '900',
                      color: blockers ? '#da291c' : '#28a745',
                    }}
                  >
                    {blockers
                      ? `${blockers} item${blockers === 1 ? '' : 's'} not approved`
                      : 'Every product is on the APL'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', fontWeight: '600', marginTop: '2px' }}>
                    {result.counts.approved} approved
                    {naming > 0 && ` · ${naming} to rename`}
                    {result.counts.generic > 0 && ` · ${result.counts.generic} ingredients skipped`}
                  </div>
                </div>
              </div>
              <button
                onClick={copySummary}
                style={{
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  padding: '14px 26px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ClipboardCopy size={16} />
                {copied ? 'Copied' : 'Copy findings'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {result.drinks.map((drink, di) => (
                <div
                  key={di}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px 28px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: '900',
                      color: '#1a1a1a',
                      margin: '0 0 16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <FileText size={18} color="#da291c" />
                    {drink.name}
                  </h3>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {drink.ingredients.map((ing, ii) => {
                      const v = VERDICT[ing.verdict];
                      return (
                        <div
                          key={ii}
                          style={{
                            background: v.bg,
                            border: `1px solid ${v.border}`,
                            borderLeft: `5px solid ${v.color}`,
                            borderRadius: '8px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '14px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: v.color,
                              minWidth: '104px',
                            }}
                          >
                            {v.label}
                          </span>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: ing.verdict === 'generic' ? '500' : '700',
                              color: ing.verdict === 'generic' ? '#999' : '#1a1a1a',
                            }}
                          >
                            {ing.name}
                          </span>

                          {ing.verdict === 'approved' && (
                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
                              {ing.aplName} · {ing.supplier}
                            </span>
                          )}

                          {ing.verdict === 'naming' && (
                            <span style={{ fontSize: '13px', color: '#b26a00', fontWeight: '700' }}>
                              same product — write it as “{ing.aplName}”
                            </span>
                          )}

                          {ing.verdict === 'variant' && (
                            <span style={{ fontSize: '13px', color: '#da291c', fontWeight: '700' }}>
                              different SKU. Approved:{' '}
                              {ing.alternatives.map((a) => a.name).join(' · ')}
                            </span>
                          )}

                          {ing.verdict === 'unlisted' && (
                            <span style={{ fontSize: '13px', color: '#da291c', fontWeight: '700' }}>
                              nothing like it on the APL — house ingredient, or re-spec
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
