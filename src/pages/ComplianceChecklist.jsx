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

// ── Sidebar category nav ──────────────────────────────────────────────────────
function CategoryNav({ categories, activeCategory, responses, onSelect }) {
  return (
    <nav style={{
      width: 220, flexShrink: 0, background: '#12110D',
      borderRight: '1px solid rgba(203,178,107,0.12)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {categories.map(cat => {
        const catItems = CHECKLIST_ITEMS.filter(i => i.category === cat);
        const done     = catItems.filter(i => responses[i.id]?.result).length;
        const fails    = catItems.filter(i => responses[i.id]?.result === 'fail').length;
        const isActive = activeCategory === cat;
        let dot = null;
        if (done > 0) {
          dot = fails > 0
            ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
            : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />;
        }
        return (
          <button key={cat} onClick={() => onSelect(cat)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: 'none', border: 'none',
              textAlign: 'left', cursor: 'pointer',
              borderLeft: `3px solid ${isActive ? '#CBB26B' : 'transparent'}`,
              background: isActive ? 'rgba(203,178,107,0.08)' : 'transparent',
            }}
          >
            {dot || <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(245,244,242,0.12)', flexShrink: 0 }} />}
            <span style={{
              fontSize: 12, fontWeight: isActive ? 700 : 400,
              color: isActive ? '#CBB26B' : 'rgba(245,244,242,0.65)',
              lineHeight: 1.3, flex: 1,
            }}>
              {cat}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(245,244,242,0.3)', flexShrink: 0 }}>
              {done}/{catItems.length}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────
function ChecklistRow({ item, response, onSetResult, onSetNote }) {
  const meta = CLS_META[item.cls];
  const isFail = response.result === 'fail';

  return (
    <div style={{
      borderBottom: '1px solid var(--border-primary)',
      background: isFail ? 'rgba(254,226,226,0.35)' : 'var(--bg-primary)',
      borderLeft: isFail ? '3px solid #EF4444' : '3px solid transparent',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto auto', gap: 10, alignItems: 'center', padding: '10px 16px' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{item.id}</span>
        <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-primary)' }}>{item.description}</span>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {meta.label}
        </span>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {['pass', 'fail', 'na'].map(r => {
            const sel = response.result === r;
            const styles = sel ? {
              pass: { bg: '#D1FAE5', border: '#065F46', color: '#065F46' },
              fail: { bg: '#FEE2E2', border: '#991B1B', color: '#991B1B' },
              na:   { bg: '#f3f4f6', border: '#374151', color: '#374151' },
            }[r] : null;
            return (
              <button key={r} onClick={() => onSetResult(item.id, r)}
                style={{
                  height: 27, padding: '0 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${styles ? styles.border : 'var(--border-primary)'}`,
                  background: styles ? styles.bg : 'transparent',
                  color: styles ? styles.color : 'var(--text-secondary)',
                  fontWeight: sel ? 700 : 400,
                }}
              >
                {r === 'na' ? 'N/A' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
      {isFail && (
        <div style={{ padding: '0 16px 10px', paddingLeft: 52 }}>
          <input type="text" placeholder="Add a note about this failure…"
            defaultValue={response.note || ''}
            onChange={e => onSetNote(item.id, e.target.value)}
            style={{ width: '100%', height: 28, border: '1px solid var(--border-primary)', borderRadius: 6, padding: '0 10px', fontSize: 11.5, color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Score panel ───────────────────────────────────────────────────────────────
function ScorePanel({ score, deductions, kpi, passCount, failCount, naCount, lender, lodging, showOverride, overrideNote, lodgeError, onLodge, onToggleOverride, onOverrideNoteChange, onConfirmLodge }) {
  const scoreColor = score >= TARGET ? '#065F46' : score >= 75 ? '#92400E' : '#991B1B';
  const barColor   = score >= TARGET ? '#CBB26B' : score >= 75 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ width: 200, flexShrink: 0, background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', padding: '20px 16px 16px', gap: 14 }}>
      {/* Score */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Quality score</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: scoreColor, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Target ≥ {TARGET}%</div>
        <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: 4, width: `${score}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { label: 'KPI contribution', value: `${kpi}%` },
          { label: 'Points deducted',  value: `${deductions} pts` },
          { label: 'Pass',  value: passCount,  color: '#065F46' },
          { label: 'Fail',  value: failCount,  color: '#991B1B' },
          { label: 'N/A',   value: naCount },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Lodge */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {failCount > 0 && score < TARGET && !showOverride && (
          <button onClick={onToggleOverride}
            style={{ padding: '7px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 7, fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Override…
          </button>
        )}
        <button disabled={score < TARGET || lodging} onClick={onLodge}
          style={{
            padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: score >= TARGET && !lodging ? 'pointer' : 'not-allowed',
            background: score >= TARGET ? '#12110D' : 'var(--bg-secondary)',
            color: score >= TARGET ? '#CBB26B' : 'var(--text-tertiary)',
            border: score >= TARGET ? 'none' : '1px solid var(--border-primary)',
            fontFamily: 'var(--font-heading)', opacity: lodging ? 0.7 : 1,
          }}>
          {lodging ? 'Lodging…' : `Lodge to ${lender || 'lender'} →`}
        </button>

        {showOverride && score < TARGET && (
          <div style={{ border: '1px solid var(--border-primary)', borderRadius: 8, padding: '10px 10px', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5 }}>Override note (required)</div>
            <textarea rows={3} placeholder="Reason for lodging below target…"
              value={overrideNote}
              onChange={e => onOverrideNoteChange(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border-primary)', borderRadius: 5, padding: '6px 8px', fontSize: 11, resize: 'none', boxSizing: 'border-box', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
            />
            {lodgeError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{lodgeError}</div>}
            <button disabled={lodging} onClick={onConfirmLodge}
              style={{ marginTop: 6, width: '100%', padding: '7px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {lodging ? 'Lodging…' : 'Confirm override →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const ComplianceChecklist = ({ factFindId, factFind, onBack, onComplete }) => {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('hof_user') || 'null'); } catch { return null; }
  })();

  const [responses, setResponses] = useState(() => {
    const saved = factFind?.compliance_qa?.responses;
    return saved ? { ...saved } : {};
  });
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving]   = useState(false);
  const [lodging, setLodging] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [lodgeError, setLodgeError]     = useState('');
  const saveTimerRef = useRef(null);

  const score      = calcScore(responses, CHECKLIST_ITEMS);
  const deductions = calcDeductions(responses, CHECKLIST_ITEMS);
  const kpi        = calcKpi(score);
  const passCount  = Object.values(responses).filter(r => r?.result === 'pass').length;
  const failCount  = Object.values(responses).filter(r => r?.result === 'fail').length;
  const naCount    = Object.values(responses).filter(r => r?.result === 'na').length;
  const reviewed   = passCount + failCount + naCount;

  const fd         = factFind?.form_data || {};
  const clientName = factFind?.client_name || [fd?.applicants?.[0]?.firstName, fd?.applicants?.[0]?.lastName].filter(Boolean).join(' ') || 'Unnamed';
  const lender     = factFind?.credit_analysis?.lender || '—';
  const broker     = fd?.brokerName || '—';

  const buildPayload = useCallback(() => ({
    reviewed_by:      user?.email || '',
    reviewed_by_name: user?.name  || '',
    reviewed_at:      new Date().toISOString(),
    responses,
    score,
    kpi_contribution: kpi,
    lender,
    broker_name: fd?.brokerName || '',
  }), [responses, score, kpi, user, fd, lender]);

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

  const setResult = (id, result) => setResponses(prev => ({ ...prev, [id]: { ...(prev[id] || {}), result } }));
  const setNote   = (id, note)   => setResponses(prev => ({ ...prev, [id]: { ...(prev[id] || {}), note } }));

  const handleLodge = async (overridden = false) => {
    if (score < TARGET && !overridden) { setShowOverride(true); return; }
    if (overridden && !overrideNote.trim()) { setLodgeError('An override note is required.'); return; }
    setLodging(true); setLodgeError('');
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
    } finally { setLodging(false); }
  };

  const catItems = CHECKLIST_ITEMS.filter(i => i.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#12110D', borderBottom: '1px solid rgba(203,178,107,0.15)', padding: '0 20px', flexShrink: 0 }}>
        {/* Client info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0 8px' }}>
          <button onClick={onBack}
            style={{ fontSize: 11, color: 'rgba(203,178,107,0.7)', background: 'none', border: '1px solid rgba(203,178,107,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            ← Queue
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F4F2' }}>{clientName}</div>
            <div style={{ fontSize: 11, color: 'rgba(245,244,242,0.4)', marginTop: 1 }}>
              Broker: {broker} · {lender} · Credit QA
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: saving ? 'rgba(245,244,242,0.4)' : '#CBB26B' }}>
            {saving ? 'Saving…' : reviewed > 0 ? '✓ Saved' : ''}
          </div>
        </div>

        {/* Workflow bar */}
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 12 }}>
          {STAGE_LABELS.map((label, i) => {
            const done = i < 3; const active = i === 3;
            return (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: i < STAGE_LABELS.length - 1 ? 1 : 'none' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    background: done ? '#CBB26B' : 'transparent',
                    border: `2px solid ${done ? '#CBB26B' : active ? '#CBB26B' : 'rgba(245,244,242,0.2)'}`,
                    color: done ? '#12110D' : active ? '#CBB26B' : 'rgba(245,244,242,0.3)',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 10, color: active ? '#CBB26B' : 'rgba(245,244,242,0.4)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {i < STAGE_LABELS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? 'rgba(203,178,107,0.4)' : 'rgba(245,244,242,0.1)', margin: '0 8px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Body: sidebar + main + score panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left nav */}
        <CategoryNav
          categories={CATEGORIES}
          activeCategory={activeCategory}
          responses={responses}
          onSelect={setActiveCategory}
        />

        {/* Main items */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Category header */}
          <div style={{ padding: '14px 20px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{activeCategory}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {catItems.length} items · {catItems.filter(i => responses[i.id]?.result).length} reviewed · {catItems.filter(i => responses[i.id]?.result === 'fail').length} fails
            </div>
          </div>

          {/* Item rows */}
          <div style={{ flex: 1 }}>
            {catItems.map(item => (
              <ChecklistRow
                key={item.id}
                item={item}
                response={responses[item.id] || {}}
                onSetResult={setResult}
                onSetNote={setNote}
              />
            ))}
          </div>

          {/* Category nav footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <button
              disabled={CATEGORIES.indexOf(activeCategory) === 0}
              onClick={() => setActiveCategory(CATEGORIES[CATEGORIES.indexOf(activeCategory) - 1])}
              style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', opacity: CATEGORIES.indexOf(activeCategory) === 0 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
              {CATEGORIES.indexOf(activeCategory) + 1} / {CATEGORIES.length}
            </span>
            <button
              disabled={CATEGORIES.indexOf(activeCategory) === CATEGORIES.length - 1}
              onClick={() => setActiveCategory(CATEGORIES[CATEGORIES.indexOf(activeCategory) + 1])}
              style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', opacity: CATEGORIES.indexOf(activeCategory) === CATEGORIES.length - 1 ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right score panel */}
        <ScorePanel
          score={score}
          deductions={deductions}
          kpi={kpi}
          passCount={passCount}
          failCount={failCount}
          naCount={naCount}
          lender={lender}
          lodging={lodging}
          showOverride={showOverride}
          overrideNote={overrideNote}
          lodgeError={lodgeError}
          onLodge={() => handleLodge(false)}
          onToggleOverride={() => setShowOverride(o => !o)}
          onOverrideNoteChange={(v) => { setOverrideNote(v); setLodgeError(''); }}
          onConfirmLodge={() => handleLodge(true)}
        />
      </div>
    </div>
  );
};

export default ComplianceChecklist;
