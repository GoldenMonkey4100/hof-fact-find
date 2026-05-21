import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';
import { formatCurrency, parseCurrency, formatCurrencyDisplay } from './utils';
import SmartCard from './SmartCard';

const MANDATORY_ASSETS = [
  { type: 'Savings Account', description: 'Savings' },
  { type: 'Superannuation', description: 'Superannuation' },
  { type: 'Vehicle', description: 'Vehicle' },
  { type: 'Home Contents', description: 'Home Contents' },
];

const ASSET_ICONS = {
  'Savings Account':    '💰',
  'Transaction Account':'💳',
  'Term Deposit':       '🏦',
  'Shares':             '📈',
  'Investment Property':'🏢',
  'Vehicle':            '🚗',
  'Home Contents':      '🏠',
  'Superannuation':     '🏛',
  'Other':              '📋',
};

const LIABILITY_ICONS = {
  'Home Loan':     '🏠',
  'Personal Loan': '💸',
  'Car Loan':      '🚗',
  'Credit Card':   '💳',
  'HECS/HELP':     '🎓',
  'Other':         '📋',
};

const subStepVariants = {
  enter:  (dir) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir) => ({ opacity: 0, x: dir * -16 }),
};

const SubStepBar = ({ step, labels, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
    {labels.map((label, i) => {
      const n = i + 1; const done = n < step; const active = n === step;
      return (
        <React.Fragment key={n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: done ? 'pointer' : 'default' }}
            onClick={() => done && onGoTo(n)}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', background: done ? '#10b981' : active ? 'var(--color-primary)' : 'var(--bg-secondary)', color: done || active ? 'white' : 'var(--text-tertiary)', border: done ? '2px solid #10b981' : active ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400', color: active ? 'var(--color-primary)' : done ? '#10b981' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: done ? '#10b981' : 'var(--border-primary)', margin: '0 8px', marginBottom: '14px', transition: 'background 0.2s' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const Step3AssetsLiabilities = ({ formData, updateFormData }) => {

  const [alStep, setAlStep] = useState({});
  const [alDir,  setAlDir]  = useState({});
  const [expandedAssets,      setExpandedAssets]      = useState({});
  const [expandedLiabilities, setExpandedLiabilities] = useState({});

  const getAlStep  = (id) => alStep[id] || 1;
  const goToAlStep = (id, n) => {
    setAlDir(prev => ({ ...prev, [id]: n > (alStep[id] || 1) ? 1 : -1 }));
    setAlStep(prev => ({ ...prev, [id]: n }));
  };

  const toggleAsset = (appIdx, assetId) =>
    setExpandedAssets(prev => ({ ...prev, [`${appIdx}-${assetId}`]: !prev[`${appIdx}-${assetId}`] }));
  const isAssetExpanded = (appIdx, assetId) => !!expandedAssets[`${appIdx}-${assetId}`];

  const toggleLiability = (appIdx, liabId) =>
    setExpandedLiabilities(prev => ({ ...prev, [`${appIdx}-${liabId}`]: !prev[`${appIdx}-${liabId}`] }));
  const isLiabExpanded = (appIdx, liabId) => !!expandedLiabilities[`${appIdx}-${liabId}`];

  React.useEffect(() => {
    if (!formData.applicants || formData.applicants.length === 0) return;
    let changed = false;
    const updatedApplicants = formData.applicants.map(applicant => {
      const currentAssets = applicant.assets || [];
      const missing = MANDATORY_ASSETS.filter(
        ma => !currentAssets.some(a => a.type === ma.type && a.mandatory)
      );
      if (missing.length === 0) return applicant;
      changed = true;
      return {
        ...applicant,
        assets: [
          ...missing.map((ma, i) => ({ id: Date.now() + i * 7, type: ma.type, description: ma.description, value: '', mandatory: true })),
          ...currentAssets
        ]
      };
    });
    if (changed) updateFormData('applicants', updatedApplicants);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAsset = (applicantIndex, assetIndex, field, value) => {
    const updatedApplicants = [...formData.applicants];
    const assets = [...(updatedApplicants[applicantIndex].assets || [])];
    const asset = { ...assets[assetIndex], [field]: value };
    assets[assetIndex] = asset;
    let liabilities = [...(updatedApplicants[applicantIndex].liabilities || [])];
    if (asset.type === 'Investment Property' && (field === 'mortgageOwing' || field === 'address' || field === 'lender')) {
      const linkedIdx = liabilities.findIndex(l => l.linkedAssetId === asset.id);
      const mortgageAmt = parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0;
      const desc = `Mortgage — ${asset.address || 'Investment Property'}${asset.lender ? ` (${asset.lender})` : ''}`;
      if (mortgageAmt > 0) {
        if (linkedIdx >= 0) liabilities[linkedIdx] = { ...liabilities[linkedIdx], description: desc, amount: asset.mortgageOwing };
        else liabilities = [...liabilities, { id: Date.now(), type: 'Home Loan', description: desc, amount: asset.mortgageOwing, repayment: '', linkedAssetId: asset.id }];
      } else if (linkedIdx >= 0) {
        liabilities = liabilities.filter((_, i) => i !== linkedIdx);
      }
    }
    updatedApplicants[applicantIndex] = { ...updatedApplicants[applicantIndex], assets, liabilities };
    updateFormData('applicants', updatedApplicants);
  };

  const removeAsset = (applicantIndex, assetIndex) => {
    const updatedApplicants = [...formData.applicants];
    const asset = updatedApplicants[applicantIndex].assets[assetIndex];
    let liabilities = [...(updatedApplicants[applicantIndex].liabilities || [])];
    if (asset.type === 'Investment Property') liabilities = liabilities.filter(l => l.linkedAssetId !== asset.id);
    updatedApplicants[applicantIndex] = {
      ...updatedApplicants[applicantIndex],
      assets: updatedApplicants[applicantIndex].assets.filter((_, i) => i !== assetIndex),
      liabilities
    };
    updateFormData('applicants', updatedApplicants);
  };

  const addAsset = (applicantIndex) => {
    const applicant = formData.applicants[applicantIndex];
    const newAsset = { id: Date.now(), type: '', description: '', value: '' };
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex] = { ...applicant, assets: [...(applicant.assets || []), newAsset] };
    updateFormData('applicants', updatedApplicants);
    // auto-expand new asset
    setTimeout(() => setExpandedAssets(prev => ({ ...prev, [`${applicantIndex}-${newAsset.id}`]: true })), 50);
  };

  const updateLiability = (applicantIndex, liabIndex, field, value) => {
    const updatedApplicants = [...formData.applicants];
    const liabilities = [...(updatedApplicants[applicantIndex].liabilities || [])];
    liabilities[liabIndex] = { ...liabilities[liabIndex], [field]: value };
    updatedApplicants[applicantIndex] = { ...updatedApplicants[applicantIndex], liabilities };
    updateFormData('applicants', updatedApplicants);
  };

  const removeLiability = (applicantIndex, liabIndex) => {
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex].liabilities = updatedApplicants[applicantIndex].liabilities.filter((_, i) => i !== liabIndex);
    updateFormData('applicants', updatedApplicants);
  };

  const addLiability = (applicantIndex) => {
    const applicant = formData.applicants[applicantIndex];
    const newLiab = { id: Date.now(), type: '', description: '', amount: '', repayment: '' };
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex] = { ...applicant, liabilities: [...(applicant.liabilities || []), newLiab] };
    updateFormData('applicants', updatedApplicants);
    setTimeout(() => setExpandedLiabilities(prev => ({ ...prev, [`${applicantIndex}-${newLiab.id}`]: true })), 50);
  };

  const allApplicants = formData.applicants || [];
  const grandTotalAssets = allApplicants.reduce((sum, a) =>
    sum + (a.assets || []).reduce((s, asset) => s + (parseFloat(parseCurrency(asset.value)) || 0), 0), 0);
  const grandTotalLiabilities = allApplicants.reduce((sum, a) =>
    sum + (a.liabilities || []).reduce((s, liab) => s + (parseFloat(parseCurrency(liab.amount)) || 0), 0), 0);
  const grandNetPosition = grandTotalAssets - grandTotalLiabilities;

  const renderAssetFields = (asset, applicantIndex, assetIndex) => (
    <div style={{ padding: '14px 16px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      {!asset.mandatory && (
        <div className="mb-3">
          <label>Asset Type</label>
          <select value={asset.type} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'type', e.target.value)}>
            <option value="">Select Type...</option>
            <option>Savings Account</option>
            <option>Transaction Account</option>
            <option>Term Deposit</option>
            <option>Shares</option>
            <option>Investment Property</option>
            <option>Vehicle</option>
            <option>Home Contents</option>
            <option>Superannuation</option>
            <option>Other</option>
          </select>
        </div>
      )}
      {!asset.mandatory && asset.type !== 'Investment Property' && (
        <div className="mb-3">
          <label>Description</label>
          <input type="text" value={asset.description} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'description', e.target.value)} placeholder="e.g. CBA Savings Account" />
        </div>
      )}
      {asset.type === 'Investment Property' && (
        <>
          <div className="mb-3"><label>Property Address</label>
            <input type="text" value={asset.address || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'address', e.target.value)} placeholder="123 Main St, Sydney NSW 2000" />
          </div>
          <div className="grid grid-cols-2 mb-3">
            <div><label>Property Value</label>
              <input type="text" value={formatCurrency(asset.value)} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'value', parseCurrency(e.target.value))} placeholder="750,000" />
            </div>
            <div><label>Ownership %</label>
              <input type="number" value={asset.ownershipPercentage || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'ownershipPercentage', e.target.value)} placeholder="100" min="1" max="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 mb-3">
            <div><label>Weekly Rental Income</label>
              <input type="text" value={formatCurrency(asset.rentalIncome || '')} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'rentalIncome', parseCurrency(e.target.value))} placeholder="500" />
            </div>
            <div><label>Mortgage Owing</label>
              <input type="text" value={formatCurrency(asset.mortgageOwing || '')} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'mortgageOwing', parseCurrency(e.target.value))} placeholder="400,000" />
            </div>
          </div>
          {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
            <div className="mb-3"><label>Lender</label>
              <input type="text" value={asset.lender || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'lender', e.target.value)} placeholder="CBA, ANZ, etc." />
            </div>
          )}
          {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-success-dark)', marginBottom: '8px' }}>✓ Mortgage liability auto-linked in Liabilities step</div>
          )}
        </>
      )}
      {asset.type === 'Superannuation' && (
        <div className="mb-3"><label>Provider</label>
          <input type="text" value={asset.provider || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'provider', e.target.value)} placeholder="e.g. Australian Super, REST, Host Plus" />
        </div>
      )}
      {asset.type !== 'Investment Property' && (
        <div className="mb-3"><label>Value</label>
          <input type="text" value={formatCurrency(asset.value)} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'value', parseCurrency(e.target.value))} placeholder="50,000" />
        </div>
      )}
      {asset.type === 'Savings Account' && (
        <div className="grid grid-cols-2 mb-3">
          <div><label>Bank / Institution</label><input type="text" value={asset.bank || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'bank', e.target.value)} placeholder="e.g. Commonwealth Bank" /></div>
          <div><label>Account Name / Type</label><input type="text" value={asset.accountName || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'accountName', e.target.value)} placeholder="e.g. Everyday Savings" /></div>
        </div>
      )}
      {asset.type === 'Vehicle' && (
        <div className="grid grid-cols-2 mb-3">
          <div><label>Make</label><input type="text" value={asset.vehicleMake || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'vehicleMake', e.target.value)} placeholder="e.g. Toyota" /></div>
          <div><label>Model</label><input type="text" value={asset.vehicleModel || ''} onChange={(e) => updateAsset(applicantIndex, assetIndex, 'vehicleModel', e.target.value)} placeholder="e.g. Camry" /></div>
        </div>
      )}
    </div>
  );

  const renderLiabilityFields = (liability, applicantIndex, liabIndex) => (
    <div style={{ padding: '14px 16px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      {!liability.linkedAssetId && (
        <>
          <div className="mb-3">
            <label>Liability Type</label>
            <select value={liability.type} onChange={(e) => updateLiability(applicantIndex, liabIndex, 'type', e.target.value)}>
              <option value="">Select Type...</option>
              <option>Home Loan</option>
              <option>Personal Loan</option>
              <option>Car Loan</option>
              <option>Credit Card</option>
              <option>HECS/HELP</option>
              <option>Other</option>
            </select>
          </div>
          <div className="mb-3">
            <label>Description</label>
            <input type="text" value={liability.description} onChange={(e) => updateLiability(applicantIndex, liabIndex, 'description', e.target.value)} placeholder="e.g. ANZ Credit Card" />
          </div>
        </>
      )}
      {liability.linkedAssetId && (
        <div className="mb-3">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Type: Home Loan (Investment Property — auto-linked)</span>
        </div>
      )}
      <div className="grid grid-cols-2">
        <div><label>Outstanding Amount</label>
          <input type="text" value={formatCurrency(liability.amount)}
            onChange={(e) => updateLiability(applicantIndex, liabIndex, 'amount', parseCurrency(e.target.value))}
            placeholder="400,000" readOnly={!!liability.linkedAssetId}
            style={liability.linkedAssetId ? { background: 'var(--bg-tertiary)', cursor: 'not-allowed' } : {}} />
        </div>
        <div><label>Monthly Repayment</label>
          <input type="text" value={formatCurrency(liability.repayment)}
            onChange={(e) => updateLiability(applicantIndex, liabIndex, 'repayment', parseCurrency(e.target.value))}
            placeholder="2,000" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">

      {/* Grand summary cards */}
      <div className="grid grid-cols-3 mb-8">
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assets</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-success)' }}>{formatCurrencyDisplay(grandTotalAssets.toString())}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Liabilities</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-danger)' }}>{formatCurrencyDisplay(grandTotalLiabilities.toString())}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Position</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: grandNetPosition >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrencyDisplay(grandNetPosition.toString())}</p>
        </div>
      </div>

      {allApplicants.map((applicant, applicantIndex) => {
        const alName = [applicant.firstName || applicant.role, applicant.lastName || applicant.number].filter(Boolean).join(' ');
        const assetCount = (applicant.assets || []).filter(a => a.value).length;
        const liabCount  = (applicant.liabilities || []).filter(l => l.amount).length;
        const alSummary  = assetCount + liabCount > 0 ? `${assetCount} asset${assetCount !== 1 ? 's' : ''} · ${liabCount} liabilit${liabCount !== 1 ? 'ies' : 'y'}` : null;
        const alStatus   = assetCount + liabCount > 0 ? 'partial' : 'empty';
        const step = getAlStep(applicant.id);

        return (
          <SmartCard key={applicant.id}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            title={`${alName}'s Assets & Liabilities`}
            summary={alSummary}
            status={alStatus}
            defaultOpen={assetCount + liabCount === 0}
          >
            <SubStepBar step={step} labels={['Assets', 'Liabilities']} onGoTo={(n) => goToAlStep(applicant.id, n)} />

            <AnimatePresence mode="wait" custom={alDir[applicant.id] || 1}>
              <motion.div key={step} custom={alDir[applicant.id] || 1} variants={subStepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>

                {/* ── Sub-step 1: Assets ──────────────────────────────────── */}
                {step === 1 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Assets</h4>
                      <button type="button" onClick={() => addAsset(applicantIndex)} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>+ Add Asset</button>
                    </div>

                    <div style={{ border: '1px solid var(--border-primary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                      {(applicant.assets || []).length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No assets added yet</div>
                      )}
                      {(applicant.assets || []).map((asset, assetIndex) => {
                        const expanded = isAssetExpanded(applicantIndex, asset.id);
                        const icon = ASSET_ICONS[asset.type] || '📋';
                        const displayVal = asset.value ? formatCurrencyDisplay(parseCurrency(asset.value).toString()) : '—';
                        const displayDesc = asset.type === 'Investment Property'
                          ? (asset.address || 'Investment Property')
                          : (asset.description || asset.bank || asset.provider || asset.vehicleMake || '');
                        return (
                          <div key={asset.id} style={{ borderBottom: assetIndex < (applicant.assets || []).length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                            {/* Row */}
                            <div
                              onClick={() => toggleAsset(applicantIndex, asset.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', background: expanded ? 'var(--color-primary-light)' : 'var(--bg-primary)', transition: 'background 0.15s' }}
                            >
                              <span style={{ fontSize: '16px', flexShrink: 0 }}>{asset.mandatory ? '🔒' : icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{asset.type || 'New Asset'}</div>
                                {displayDesc && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</div>}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: asset.value ? 'var(--color-success-dark)' : 'var(--text-tertiary)', flexShrink: 0 }}>{displayVal}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                {!asset.mandatory && (
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); removeAsset(applicantIndex, assetIndex); }}
                                    style={{ fontSize: '14px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>✕</button>
                                )}
                              </div>
                            </div>
                            {/* Expanded fields */}
                            {expanded && renderAssetFields(asset, applicantIndex, assetIndex)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total row */}
                    {(applicant.assets || []).some(a => a.value) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: 'var(--color-success-dark)', padding: '6px 4px', marginBottom: '8px' }}>
                        <span>Total assets</span>
                        <span>{formatCurrencyDisplay(
                          ((applicant.assets || []).reduce((s, a) => s + (parseFloat(parseCurrency(a.value)) || 0), 0)).toString()
                        )}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <motion.button type="button" onClick={() => goToAlStep(applicant.id, 2)}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ padding: '9px 24px', fontSize: '13px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        Next: Liabilities →
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ── Sub-step 2: Liabilities ─────────────────────────────── */}
                {step === 2 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Liabilities</h4>
                      <button type="button" onClick={() => addLiability(applicantIndex)} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>+ Add Liability</button>
                    </div>

                    <div style={{ border: '1px solid var(--border-primary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                      {(applicant.liabilities || []).length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No liabilities added yet</div>
                      )}
                      {(applicant.liabilities || []).map((liability, liabIndex) => {
                        const expanded = isLiabExpanded(applicantIndex, liability.id);
                        const icon = LIABILITY_ICONS[liability.type] || '📋';
                        const displayAmt = liability.amount ? formatCurrencyDisplay(parseCurrency(liability.amount).toString()) : '—';
                        const displayDesc = liability.description || '';
                        return (
                          <div key={liability.id} style={{ borderBottom: liabIndex < (applicant.liabilities || []).length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                            <div
                              onClick={() => toggleLiability(applicantIndex, liability.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', background: expanded ? 'var(--color-primary-light)' : 'var(--bg-primary)', transition: 'background 0.15s' }}
                            >
                              <span style={{ fontSize: '16px', flexShrink: 0 }}>{liability.linkedAssetId ? '🔗' : icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{liability.type || 'New Liability'}</div>
                                {displayDesc && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</div>}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: liability.amount ? 'var(--text-danger-emphasis)' : 'var(--text-tertiary)', flexShrink: 0 }}>{displayAmt}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                {!liability.linkedAssetId && (
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); removeLiability(applicantIndex, liabIndex); }}
                                    style={{ fontSize: '14px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>✕</button>
                                )}
                              </div>
                            </div>
                            {expanded && renderLiabilityFields(liability, applicantIndex, liabIndex)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Net position banner */}
                    {(() => {
                      const ta = (applicant.assets || []).reduce((s, a) => s + (parseFloat(parseCurrency(a.value)) || 0), 0);
                      const tl = (applicant.liabilities || []).reduce((s, l) => s + (parseFloat(parseCurrency(l.amount)) || 0), 0);
                      const net = ta - tl;
                      const monthlyRepay = (applicant.liabilities || []).reduce((s, l) => s + (parseFloat(parseCurrency(l.repayment)) || 0), 0);
                      return (
                        <div className="grid grid-cols-3" style={{ gap: '12px', marginBottom: '16px' }}>
                          <div style={{ padding: '12px 14px', background: 'var(--color-success-light)', borderRadius: '8px', border: '1px solid var(--color-success)', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--color-success-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Assets</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-success-dark)' }}>{formatCurrencyDisplay(ta.toString())}</div>
                          </div>
                          <div style={{ padding: '12px 14px', background: 'var(--bg-danger-surface)', borderRadius: '8px', border: '1px solid var(--border-danger)', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Liabilities</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-danger-emphasis)' }}>{formatCurrencyDisplay(tl.toString())}</div>
                            {monthlyRepay > 0 && <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', marginTop: '2px' }}>{formatCurrencyDisplay(monthlyRepay.toString())}/mo</div>}
                          </div>
                          <div style={{ padding: '12px 14px', background: net >= 0 ? 'var(--color-success-light)' : '#fef2f2', borderRadius: '8px', border: `1px solid ${net >= 0 ? 'var(--color-success)' : '#fca5a5'}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: net >= 0 ? 'var(--color-success-dark)' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Net Position</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: net >= 0 ? 'var(--color-success-dark)' : '#991b1b' }}>{formatCurrencyDisplay(net.toString())}</div>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <motion.button type="button" onClick={() => goToAlStep(applicant.id, 1)}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ padding: '9px 24px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        ← Back: Assets
                      </motion.button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </SmartCard>
        );
      })}

      {allApplicants.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-primary)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>No applicants available. Please complete Step 1 (Applicants) first.</p>
        </div>
      )}
    </div>
  );
};

export default Step3AssetsLiabilities;
