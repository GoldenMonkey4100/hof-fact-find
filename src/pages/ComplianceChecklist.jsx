import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CHECKLIST_ITEMS, CATEGORIES } from '../lib/checklist-data';
import { calcScore, calcKpi, calcDeductions, itemDeduction } from '../lib/scoring';

const TARGET = 90;

const CLS_META = {
  major_servicing: { label: 'Major — Servicing', bg: '#faeeda', color: '#633806' },
  major:           { label: 'Major',              bg: '#e6f1fb', color: '#0c447c' },
  minor:           { label: 'Minor',              bg: '#f3f4f6', color: '#374151' },
};

const STAGE_LABELS = ['Fact find', 'Credit review', 'Loan processing', 'Credit QA', 'Lodge'];

function WorkflowBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 32px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)' }}>
      {STAGE_LABELS.map((label, i) => {
        const done   = i < 3;
        const active = i === 3;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STAGE_LABELS.length - 1 ? '1' : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, marginBottom: 5, position: 'relative', zIndex: 1,
                background: done ? '#CBB26B' : active ? 'var(--color-primary-light)' : 'var(--bg-secondary)',
                border: `2px solid ${done ? '#CBB26B' : active ? '#CBB26B' : 'var(--border-primary)'}`,
                color: done ? '#12110D' : active ? '#CBB26B' : 'var(--text-tertiary)',
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : i + 1}
              </div>
              <div style={{ fontSize: 10, color: active ? '#CBB26B' : 'var(--text-tertiary)', fontWeight: active ? 700 : 400, textAlign: 'center', fontFamily: 'var(--font-heading)' }}>
                {label}
              </div>
            </div>
            {i < STAGE_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#CBB26B' : 'var(--border-primary)', marginBottom: 18, marginLeft: -8, marginRight: -8, position: 'relative', zIndex: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)', color: highlight || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CategorySection({ category, items, responses, onSetResult, onSetNote, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  const catItems = items.filter(i => i.category === category);
  const catFails = catItems.filter(i => responses[i.id]?.result === 'fail');
  const catDone  = catItems.filter(i => responses[i.id]?.result).length;
  const catDed   = catFails.reduce((a, i) => a + itemDeduction(i.cls), 0);

  let chipBg = '#f3f4f6'; let chipColor = '#374151'; let chipText = '—';
  if (catDone > 0) {
    if (catFails.length === 0) { chipBg = '#D1FAE5'; chipColor = '#065F46'; chipText = '✓ All pass'; }
    else if (catDed >= 15)     { chipBg = '#FEE2E2'; chipColor = '#991B1B'; chipText = `−${catDed} pts`; }
    else                        { chipBg = '#FEF3C7'; chipColor = '#92400E'; chipText = `−${catDed} pts`; }
  }

  return (
    <div style={{ border: '1px solid var(--border-primary)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', flex: 1 }}>{category}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{catItems.length} items</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: chipBg, color: chipColor }}>{chipText}</span>
      </button>

      {open && (
        <div>
          {catItems.map((item, idx) => (
            <ChecklistRow
              key={item.id}
              item={item}
              response={responses[item.id] || {}}
              onSetResult={onSetResult}
              onSetNote={onSetNote}
              isLast={idx === catItems.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistRow({ item, response, onSetResult, onSetNote, isLast }) {
  const meta = CLS_META[item.cls];
  const [noteOpen, setNoteOpen] = useState(response.result === 'fail');

  useEffect(() => {
    setNoteOpen(response.result === 'fail');
  }, [response.result]);

  const handleResult = (r) => {
    onSetResult(item.id, r);
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto 132px', gap: 8, alignItems: 'center', padding: '9px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{item.id}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-primary)' }}>{item.description}</div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {meta.label}
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {['pass', 'fail', 'na'].map(r => {
            const sel = response.result === r;
            const colors = {
              pass: sel ? { bg: '#D1FAE5', border: '#065F46', color: '#065F46' } : null,
              fail: sel ? { bg: '#FEE2E2', border: '#991B1B', color: '#991B1B' } : null,
              na:   sel ? { bg: '#f3f4f6', border: '#374151', color: '#374151' } : null,
            };
            const c = colors[r];
            return (
              <button
                key={r}
                onClick={() => handleResult(r)}
                style={{
                  height: 26, padding: '0 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${c ? c.border : 'var(--border-primary)'}`,
                  background: c ? c.bg : 'transparent',
                  color: c ? c.color : 'var(--text-secondary)',
                  fontWeight: sel ? 700 : 400,
                }}
              >
                {r === 'na' ? 'N/A' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
      {noteOpen && (
        <div style={{ padding: '0 16px 9px', paddingLeft: 52 }}>
          <input
            type="text"
            placeholder="Add a note about this failure…"
            defaultValue={response.note || ''}
            onChange={e => onSetNote(item.id, e.target.value)}
            style={{ width: '100%', height: 28, border: '1px solid var(--border-primary)', borderRadius: 6, padding: '0 10px', fontSize: 11.5, color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }}
          />
        </div>
      )}
    </div>
  );
}

const ComplianceChecklist = ({ factFindId, factFind, onBack, onComplete }) => {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('hof_user') || 'null'); } catch { return null; }
  })();

  const [responses, setResponses] = useState(() => {
    const saved = factFind?.compliance_qa?.responses;
    return saved ? { ...saved } : {};
  });

  const [saving, setSaving]   = useState(false);
  const [lodging, setLodging] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [lodgeError, setLodgeError]     = useState('');
  const saveTimerRef = useRef(null);

  const score      = calcScore(responses, CHECKLIST_ITEMS);
  const deductions = calcDeductions(responses, CHECKLIST_ITEMS);
  const kpi        = calcKpi(score);
  const reviewed   = Object.values(responses).filter(r => r?.result).length;
  const passCount  = Object.values(responses).filter(r => r?.result === 'pass').length;
  const failCount  = Object.values(responses).filter(r => r?.result === 'fail').length;
  const naCount    = Object.values(responses).filter(r => r?.result === 'na').length;

  const scoreColor = score >= TARGET ? '#065F46' : score >= 75 ? '#92400E' : '#991B1B';

  const buildPayload = useCallback(() => ({
    reviewed_by:      user?.email || '',
    reviewed_by_name: user?.name  || '',
    reviewed_at:      new Date().toISOString(),
    responses,
    score,
    kpi_contribution: kpi,
    lender:      factFind?.credit_analysis?.lender || '',
    broker_name: factFind?.form_data?.brokerName   || '',
  }), [responses, score, kpi, user, factFind]);

  // Auto-save debounced 1.5s after any response change
  useEffect(() => {
    if (!factFindId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save-compliance', id: factFindId, compliance_qa: buildPayload() }),
        });
      } catch { /* non-fatal */ } finally { setSaving(false); }
    }, 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [responses, factFindId, buildPayload]);

  const setResult = (id, result) => {
    setResponses(prev => ({ ...prev, [id]: { ...(prev[id] || {}), result } }));
  };

  const setNote = (id, note) => {
    setResponses(prev => ({ ...prev, [id]: { ...(prev[id] || {}), note } }));
  };

  const handleLodge = async (overridden = false) => {
    if (score < TARGET && !overridden) {
      setShowOverride(true);
      return;
    }
    if (overridden && !overrideNote.trim()) {
      setLodgeError('An override note is required when lodging below target.');
      return;
    }
    setLodging(true);
    setLodgeError('');
    try {
      const payload = buildPayload();
      if (overridden) payload.override_note = overrideNote.trim();
      await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-compliance', id: factFindId, compliance_qa: payload }),
      });
      onComplete?.();
    } catch (err) {
      setLodgeError(err.message || 'Failed to lodge. Please try again.');
    } finally {
      setLodging(false);
    }
  };

  const fd = factFind?.form_data || {};
  const clientName = factFind?.client_name || fd?.applicants?.[0] ? [fd.applicants?.[0]?.firstName, fd.applicants?.[0]?.lastName].filter(Boolean).join(' ') : 'Unnamed';
  const lender     = factFind?.credit_analysis?.lender || '—';
  const broker     = fd?.brokerName || '—';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>

      {/* Back bar */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
          ← Queue
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{clientName}</span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Credit QA Checklist</span>
        {saving && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>Saving…</span>}
        {!saving && reviewed > 0 && <span style={{ fontSize: 11, color: '#065F46', marginLeft: 'auto' }}>✓ Saved</span>}
      </div>

      {/* Workflow bar */}
      <WorkflowBar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 60px' }}>

        {/* File metadata */}
        <div style={{ background: '#12110D', border: '1px solid rgba(203,178,107,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Client', value: clientName },
            { label: 'Broker', value: broker },
            { label: 'Lender', value: lender },
            { label: 'Review date', value: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'rgba(245,244,242,0.4)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-heading)' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F4F2' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Score summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          <ScoreCard
            label="File quality score"
            value={score.toFixed(1)}
            sub={`Target ≥ ${TARGET}%`}
            highlight={scoreColor}
          />
          <ScoreCard label="Points deducted" value={deductions} sub="from 100" />
          <ScoreCard label="KPI contribution" value={`${kpi}%`} sub="of 30% weighting" />
          <ScoreCard label="Items reviewed" value={`${reviewed} / 57`} sub={`${passCount} pass · ${failCount} fail · ${naCount} n/a`} />
        </div>

        {/* Target warning */}
        {failCount > 0 && score < TARGET && (
          <div style={{ background: '#FEF3C7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Score is below the 90% target. Resolve failures before lodging, or provide an override note.
          </div>
        )}

        {/* Checklist categories */}
        {CATEGORIES.map((cat, i) => (
          <CategorySection
            key={cat}
            category={cat}
            items={CHECKLIST_ITEMS}
            responses={responses}
            onSetResult={setResult}
            onSetNote={setNote}
            defaultOpen={i === 0}
          />
        ))}

        {/* Lodge section */}
        <div style={{ marginTop: 24, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', marginBottom: 3 }}>Ready to lodge?</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {score >= TARGET
                  ? `Score ${score.toFixed(1)}% — above target. File is ready to lodge to ${lender}.`
                  : `Score ${score.toFixed(1)}% — below the ${TARGET}% target. Review failures above.`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {score < TARGET && (
                <button
                  onClick={() => setShowOverride(o => !o)}
                  style={{ padding: '9px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  Lodge with override
                </button>
              )}
              <button
                disabled={score < TARGET || lodging}
                onClick={() => handleLodge(false)}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: score >= TARGET && !lodging ? 'pointer' : 'not-allowed',
                  background: score >= TARGET ? '#12110D' : 'var(--bg-secondary)',
                  color: score >= TARGET ? '#CBB26B' : 'var(--text-tertiary)',
                  border: score >= TARGET ? 'none' : '1px solid var(--border-primary)',
                  fontFamily: 'var(--font-heading)',
                  opacity: lodging ? 0.7 : 1,
                }}
              >
                {lodging ? 'Lodging…' : `Lodge to ${lender} →`}
              </button>
            </div>
          </div>

          {/* Override panel */}
          {showOverride && score < TARGET && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-primary)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                Override justification (required)
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this file is being lodged below the 90% target…"
                value={overrideNote}
                onChange={e => { setOverrideNote(e.target.value); setLodgeError(''); }}
                style={{ width: '100%', border: '1px solid var(--border-primary)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-secondary)', resize: 'vertical', boxSizing: 'border-box' }}
              />
              {lodgeError && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{lodgeError}</div>}
              <button
                disabled={lodging}
                onClick={() => handleLodge(true)}
                style={{ marginTop: 10, padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-heading)', opacity: lodging ? 0.7 : 1 }}
              >
                {lodging ? 'Lodging…' : 'Confirm lodge with override →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceChecklist;
