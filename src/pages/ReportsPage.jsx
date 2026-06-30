import React, { useState, useEffect } from 'react';
import { CHECKLIST_ITEMS } from '../lib/checklist-data';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ReportsPage = ({ onBack }) => {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res  = await fetch('/api/fact-finds', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list-all' }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setItems(data.items || []);
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    load();
  }, []);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    const limit = new Date(now.getFullYear(), now.getMonth());
    const current = new Date(selectedYear, selectedMonth);
    if (current >= limit) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const qaFiles = items.filter(i => i.compliance_qa && i.compliance_qa.reviewed_at);

  const inPeriod = qaFiles.filter(i => {
    const d = new Date(i.compliance_qa.reviewed_at);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  // Group by analyst
  const byAnalyst = {};
  inPeriod.forEach(i => {
    const name = i.compliance_qa.reviewed_by_name || i.compliance_qa.reviewed_by || 'Unknown';
    if (!byAnalyst[name]) byAnalyst[name] = [];
    byAnalyst[name].push(i);
  });

  // Aggregate fail items across all files in period
  const failCounts = {};
  inPeriod.forEach(i => {
    const responses = i.compliance_qa.responses || {};
    Object.entries(responses).forEach(([id, r]) => {
      if (r?.result === 'fail') {
        failCounts[id] = (failCounts[id] || 0) + 1;
      }
    });
  });
  const topFails = Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const item = CHECKLIST_ITEMS.find(i => String(i.id) === String(id));
      return { id, count, description: item?.description || `Item ${id}`, category: item?.category || '—', cls: item?.cls || 'minor' };
    });

  const clsLabel = { major_servicing: 'Major — Servicing', major: 'Major', minor: 'Minor' };
  const clsBg    = { major_servicing: '#faeeda', major: '#e6f1fb', minor: '#f3f4f6' };
  const clsColor = { major_servicing: '#633806', major: '#0c447c', minor: '#374151' };

  const fmt = (n) => n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';

  const isAtLimit = new Date(selectedYear, selectedMonth) >= new Date(now.getFullYear(), now.getMonth());

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
          ← Pipeline
        </button>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>QA Compliance Reports</span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Month picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button onClick={prevMonth} style={{ padding: '6px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
          <div style={{ minWidth: '160px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{inPeriod.length} file{inPeriod.length !== 1 ? 's' : ''} reviewed</div>
          </div>
          <button onClick={nextMonth} disabled={isAtLimit} style={{ padding: '6px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '14px', cursor: isAtLimit ? 'not-allowed' : 'pointer', color: isAtLimit ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: isAtLimit ? 0.4 : 1 }}>→</button>
        </div>

        {loading && <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>}
        {error && <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}

        {!loading && !error && inPeriod.length === 0 && (
          <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No QA reviews recorded for {MONTH_NAMES[selectedMonth]} {selectedYear}.
          </div>
        )}

        {!loading && !error && inPeriod.length > 0 && (
          <>
            {/* Analyst cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {Object.entries(byAnalyst).map(([name, files]) => {
                const avgScore = files.reduce((s, f) => s + (f.compliance_qa.score || 0), 0) / files.length;
                const kpiAvg   = files.reduce((s, f) => s + (f.compliance_qa.kpi_contribution || 0), 0) / files.length;
                const passCount = files.filter(f => (f.compliance_qa.score || 0) >= 90).length;
                return (
                  <div key={name} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>Credit Analyst</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { l: 'Files reviewed', v: files.length },
                        { l: 'Avg QA score', v: `${avgScore.toFixed(1)}%`, color: avgScore >= 90 ? '#065f46' : avgScore >= 75 ? '#92400e' : '#991b1b' },
                        { l: 'KPI contribution', v: `${kpiAvg.toFixed(1)}%` },
                        { l: 'Pass rate', v: `${Math.round((passCount / files.length) * 100)}%` },
                      ].map(({ l, v, color }) => (
                        <div key={l} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>{l}</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: color || 'var(--text-primary)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top fail items */}
            {topFails.length > 0 && (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px 24px', marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>Most common fail items this period</div>
                {topFails.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < topFails.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                      {f.count}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{f.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{f.category}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: clsBg[f.cls], color: clsColor[f.cls], whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {clsLabel[f.cls]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* File detail table */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)' }}>All reviewed files</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      {['Client', 'Broker', 'Lender', 'Reviewed by', 'Score', 'KPI', 'Reviewed'].map(h => (
                        <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inPeriod.sort((a, b) => new Date(b.compliance_qa.reviewed_at) - new Date(a.compliance_qa.reviewed_at)).map(item => {
                      const qa = item.compliance_qa;
                      const score = qa.score || 0;
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.client_name || '—'}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{item.broker_name || '—'}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{qa.lender || '—'}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{qa.reviewed_by_name || '—'}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontWeight: '700', color: score >= 90 ? '#065f46' : score >= 75 ? '#92400e' : '#991b1b' }}>{score.toFixed(1)}%</span>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{(qa.kpi_contribution || 0).toFixed(1)}%</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                            {new Date(qa.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
