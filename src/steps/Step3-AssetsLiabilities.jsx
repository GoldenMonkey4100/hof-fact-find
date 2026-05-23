import React, { useState } from 'react';
import '../styles.css';
import { formatCurrency, parseCurrency, formatCurrencyDisplay } from '../lib/utils';

// ── Section definitions ──────────────────────────────────────────────────────

const ASSET_SECTIONS = [
  { key: 'real-estate',  label: 'Real Estate',       icon: '🏢', types: ['Investment Property'],                                               addType: 'Investment Property' },
  { key: 'vehicles',     label: 'Vehicles',           icon: '🚗', types: ['Vehicle'],                                                           addType: 'Vehicle'            },
  { key: 'savings',      label: 'Savings & Accounts', icon: '💰', types: ['Savings Account', 'Transaction Account', 'Term Deposit', 'Shares'],  addType: 'Savings Account'    },
  { key: 'super',        label: 'Superannuation',     icon: '🏛', types: ['Superannuation'],                                                    addType: 'Superannuation'     },
  { key: 'other-assets', label: 'Other Assets',       icon: '📋', types: [],                                                                    addType: 'Other'              },
];

const LIABILITY_SECTIONS = [
  { key: 'home-loans',      label: 'Home Loans',      icon: '🏠', types: ['Home Loan'],      addType: 'Home Loan'      },
  { key: 'credit-cards',    label: 'Credit Cards',    icon: '💳', types: ['Credit Card'],    addType: 'Credit Card'    },
  { key: 'vehicle-fin',     label: 'Vehicle Finance', icon: '🚗', types: ['Car Loan'],       addType: 'Car Loan'       },
  { key: 'personal-loans',  label: 'Personal Loans',  icon: '💸', types: ['Personal Loan'],  addType: 'Personal Loan'  },
  { key: 'other-liabs',     label: 'Other',           icon: '📋', types: [],                 addType: 'Other'          },
];

const KNOWN_ASSET_TYPES = ASSET_SECTIONS.filter(s => s.types.length).flatMap(s => s.types);
const KNOWN_LIAB_TYPES  = LIABILITY_SECTIONS.filter(s => s.types.length).flatMap(s => s.types);

const MANDATORY_ASSETS = [
  { type: 'Savings Account', description: 'Savings'       },
  { type: 'Superannuation',  description: 'Superannuation' },
  { type: 'Vehicle',         description: 'Vehicle'        },
  { type: 'Home Contents',   description: 'Home Contents'  },
];

const OWNER_COLORS = [
  { bg: 'rgba(203,178,107,0.15)', color: '#CBB26B', border: 'rgba(203,178,107,0.35)' },
  { bg: 'rgba(129,140,248,0.15)', color: '#818CF8', border: 'rgba(129,140,248,0.35)' },
];

// ── Component ────────────────────────────────────────────────────────────────

const Step3AssetsLiabilities = ({ formData, updateFormData }) => {
  const [openSections,  setOpenSections]  = useState({ savings: true, super: true });
  const [expandedItems, setExpandedItems] = useState({});

  const toggleSection = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }));
  const ikey = (list, appIdx, id) => `${list}-${appIdx}-${id}`;
  const toggleItem   = (list, appIdx, id) => setExpandedItems(p => ({ ...p, [ikey(list, appIdx, id)]: !p[ikey(list, appIdx, id)] }));
  const isExpanded   = (list, appIdx, id) => !!expandedItems[ikey(list, appIdx, id)];

  // Seed mandatory assets once
  React.useEffect(() => {
    if (!formData.applicants?.length) return;
    let changed = false;
    const updated = formData.applicants.map(app => {
      const cur = app.assets || [];
      const missing = MANDATORY_ASSETS.filter(ma => !cur.some(a => a.type === ma.type && a.mandatory));
      if (!missing.length) return app;
      changed = true;
      return { ...app, assets: [...missing.map((ma, i) => ({ id: Date.now() + i * 7, type: ma.type, description: ma.description, value: '', mandatory: true })), ...cur] };
    });
    if (changed) updateFormData('applicants', updated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data mutators ──────────────────────────────────────────────────────────

  const updateAsset = (appIdx, assetIdx, field, value) => {
    const updated = [...formData.applicants];
    const assets = [...(updated[appIdx].assets || [])];
    const asset = { ...assets[assetIdx], [field]: value };
    assets[assetIdx] = asset;
    let liabilities = [...(updated[appIdx].liabilities || [])];
    if (asset.type === 'Investment Property' && ['mortgageOwing', 'address', 'lender'].includes(field)) {
      const linkedIdx = liabilities.findIndex(l => l.linkedAssetId === asset.id);
      const amt = parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0;
      const desc = `Mortgage — ${asset.address || 'Investment Property'}${asset.lender ? ` (${asset.lender})` : ''}`;
      if (amt > 0) {
        if (linkedIdx >= 0) liabilities[linkedIdx] = { ...liabilities[linkedIdx], description: desc, amount: asset.mortgageOwing };
        else liabilities = [...liabilities, { id: Date.now(), type: 'Home Loan', description: desc, amount: asset.mortgageOwing, repayment: '', linkedAssetId: asset.id }];
      } else if (linkedIdx >= 0) {
        liabilities = liabilities.filter((_, i) => i !== linkedIdx);
      }
    }
    updated[appIdx] = { ...updated[appIdx], assets, liabilities };
    updateFormData('applicants', updated);
  };

  const removeAsset = (appIdx, assetIdx) => {
    const updated = [...formData.applicants];
    const asset = updated[appIdx].assets[assetIdx];
    let liabilities = [...(updated[appIdx].liabilities || [])];
    if (asset.type === 'Investment Property') liabilities = liabilities.filter(l => l.linkedAssetId !== asset.id);
    updated[appIdx] = { ...updated[appIdx], assets: updated[appIdx].assets.filter((_, i) => i !== assetIdx), liabilities };
    updateFormData('applicants', updated);
  };

  const addAsset = (appIdx, preset = {}) => {
    const app = formData.applicants[appIdx];
    const newAsset = { id: Date.now(), type: '', description: '', value: '', ...preset };
    const updated = [...formData.applicants];
    updated[appIdx] = { ...app, assets: [...(app.assets || []), newAsset] };
    updateFormData('applicants', updated);
    setTimeout(() => setExpandedItems(p => ({ ...p, [ikey('assets', appIdx, newAsset.id)]: true })), 50);
  };

  const updateLiability = (appIdx, liabIdx, field, value) => {
    const updated = [...formData.applicants];
    const liabilities = [...(updated[appIdx].liabilities || [])];
    liabilities[liabIdx] = { ...liabilities[liabIdx], [field]: value };
    updated[appIdx] = { ...updated[appIdx], liabilities };
    updateFormData('applicants', updated);
  };

  const removeLiability = (appIdx, liabIdx) => {
    const updated = [...formData.applicants];
    updated[appIdx] = { ...updated[appIdx], liabilities: updated[appIdx].liabilities.filter((_, i) => i !== liabIdx) };
    updateFormData('applicants', updated);
  };

  const addLiability = (appIdx, preset = {}) => {
    const app = formData.applicants[appIdx];
    const newLiab = { id: Date.now(), type: '', description: '', amount: '', repayment: '', ...preset };
    const updated = [...formData.applicants];
    updated[appIdx] = { ...app, liabilities: [...(app.liabilities || []), newLiab] };
    updateFormData('applicants', updated);
    setTimeout(() => setExpandedItems(p => ({ ...p, [ikey('liabilities', appIdx, newLiab.id)]: true })), 50);
  };

  // ── Aggregation helpers ────────────────────────────────────────────────────

  const allApplicants = formData.applicants || [];

  const getAssetItems = (section) => {
    const items = [];
    allApplicants.forEach((app, appIdx) => {
      (app.assets || []).forEach((item, itemIdx) => {
        const match = section.key === 'other-assets'
          ? !KNOWN_ASSET_TYPES.includes(item.type)
          : section.types.includes(item.type);
        if (match) items.push({ item, appIdx, itemIdx });
      });
    });
    return items;
  };

  const getLiabItems = (section) => {
    const items = [];
    allApplicants.forEach((app, appIdx) => {
      (app.liabilities || []).forEach((item, itemIdx) => {
        const match = section.key === 'other-liabs'
          ? !KNOWN_LIAB_TYPES.includes(item.type)
          : section.types.includes(item.type);
        if (match) items.push({ item, appIdx, itemIdx });
      });
    });
    return items;
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const grandTotalAssets = allApplicants.reduce((s, a) =>
    s + (a.assets || []).reduce((ss, x) => ss + (parseFloat(parseCurrency(x.value)) || 0), 0), 0);
  const grandTotalLiabs = allApplicants.reduce((s, a) =>
    s + (a.liabilities || []).reduce((ss, x) => ss + (parseFloat(parseCurrency(x.amount)) || 0), 0), 0);
  const grandNet = grandTotalAssets - grandTotalLiabs;

  const itemsTotal = (items, field) =>
    items.reduce((s, { item }) => s + (parseFloat(parseCurrency(item[field] || '0')) || 0), 0);

  // ── Field editors ──────────────────────────────────────────────────────────

  const renderAssetFields = (asset, appIdx, assetIdx) => (
    <div style={{ padding: '14px 16px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      {!asset.mandatory && (
        <div className="mb-3">
          <label>Asset Type</label>
          <select value={asset.type} onChange={(e) => updateAsset(appIdx, assetIdx, 'type', e.target.value)}>
            <option value="">Select Type...</option>
            <option>Savings Account</option><option>Transaction Account</option>
            <option>Term Deposit</option><option>Shares</option>
            <option>Investment Property</option><option>Vehicle</option>
            <option>Home Contents</option><option>Superannuation</option><option>Other</option>
          </select>
        </div>
      )}
      {!asset.mandatory && asset.type !== 'Investment Property' && (
        <div className="mb-3">
          <label>Description</label>
          <input type="text" value={asset.description} onChange={(e) => updateAsset(appIdx, assetIdx, 'description', e.target.value)} placeholder="e.g. CBA Savings Account" />
        </div>
      )}
      {asset.type === 'Investment Property' && (
        <>
          <div className="mb-3"><label>Property Address</label>
            <input type="text" value={asset.address || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'address', e.target.value)} placeholder="123 Main St, Sydney NSW 2000" />
          </div>
          <div className="grid grid-cols-2 mb-3">
            <div><label>Property Value</label>
              <input type="text" value={formatCurrency(asset.value)} onChange={(e) => updateAsset(appIdx, assetIdx, 'value', parseCurrency(e.target.value))} placeholder="750,000" />
            </div>
            <div><label>Ownership %</label>
              <input type="number" value={asset.ownershipPercentage || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'ownershipPercentage', e.target.value)} placeholder="100" min="1" max="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 mb-3">
            <div><label>Weekly Rental Income</label>
              <input type="text" value={formatCurrency(asset.rentalIncome || '')} onChange={(e) => updateAsset(appIdx, assetIdx, 'rentalIncome', parseCurrency(e.target.value))} placeholder="500" />
            </div>
            <div><label>Mortgage Owing</label>
              <input type="text" value={formatCurrency(asset.mortgageOwing || '')} onChange={(e) => updateAsset(appIdx, assetIdx, 'mortgageOwing', parseCurrency(e.target.value))} placeholder="400,000" />
            </div>
          </div>
          {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
            <div className="mb-3"><label>Lender</label>
              <input type="text" value={asset.lender || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'lender', e.target.value)} placeholder="CBA, ANZ, etc." />
            </div>
          )}
          {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-success-dark)', marginBottom: '8px' }}>✓ Mortgage liability auto-linked</div>
          )}
        </>
      )}
      {asset.type === 'Superannuation' && (
        <div className="mb-3"><label>Provider</label>
          <input type="text" value={asset.provider || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'provider', e.target.value)} placeholder="e.g. Australian Super, REST" />
        </div>
      )}
      {asset.type !== 'Investment Property' && (
        <div className="mb-3"><label>Value</label>
          <input type="text" value={formatCurrency(asset.value)} onChange={(e) => updateAsset(appIdx, assetIdx, 'value', parseCurrency(e.target.value))} placeholder="50,000" />
        </div>
      )}
      {asset.type === 'Savings Account' && (
        <div className="grid grid-cols-2 mb-3">
          <div><label>Bank / Institution</label><input type="text" value={asset.bank || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'bank', e.target.value)} placeholder="e.g. Commonwealth Bank" /></div>
          <div><label>Account Name</label><input type="text" value={asset.accountName || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'accountName', e.target.value)} placeholder="e.g. Everyday Savings" /></div>
        </div>
      )}
      {asset.type === 'Vehicle' && (
        <div className="grid grid-cols-2 mb-3">
          <div><label>Make</label><input type="text" value={asset.vehicleMake || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'vehicleMake', e.target.value)} placeholder="e.g. Toyota" /></div>
          <div><label>Model</label><input type="text" value={asset.vehicleModel || ''} onChange={(e) => updateAsset(appIdx, assetIdx, 'vehicleModel', e.target.value)} placeholder="e.g. Camry" /></div>
        </div>
      )}
    </div>
  );

  const renderLiabilityFields = (liability, appIdx, liabIdx) => (
    <div style={{ padding: '14px 16px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      {!liability.linkedAssetId && (
        <>
          <div className="mb-3">
            <label>Liability Type</label>
            <select value={liability.type} onChange={(e) => updateLiability(appIdx, liabIdx, 'type', e.target.value)}>
              <option value="">Select Type...</option>
              <option>Home Loan</option><option>Personal Loan</option><option>Car Loan</option>
              <option>Credit Card</option><option>HECS/HELP</option><option>Other</option>
            </select>
          </div>
          <div className="mb-3">
            <label>Description</label>
            <input type="text" value={liability.description} onChange={(e) => updateLiability(appIdx, liabIdx, 'description', e.target.value)} placeholder="e.g. ANZ Credit Card" />
          </div>
        </>
      )}
      {liability.linkedAssetId && (
        <div className="mb-3"><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Home Loan — auto-linked from Investment Property</span></div>
      )}
      <div className="grid grid-cols-2">
        <div><label>Outstanding Amount</label>
          <input type="text" value={formatCurrency(liability.amount)}
            onChange={(e) => updateLiability(appIdx, liabIdx, 'amount', parseCurrency(e.target.value))}
            placeholder="400,000" readOnly={!!liability.linkedAssetId}
            style={liability.linkedAssetId ? { background: 'var(--bg-tertiary)', cursor: 'not-allowed' } : {}} />
        </div>
        <div><label>Monthly Repayment</label>
          <input type="text" value={formatCurrency(liability.repayment)}
            onChange={(e) => updateLiability(appIdx, liabIdx, 'repayment', parseCurrency(e.target.value))}
            placeholder="2,000" />
        </div>
      </div>
    </div>
  );

  // ── Accordion section ──────────────────────────────────────────────────────

  const renderSection = (section, listKey) => {
    const items   = listKey === 'assets' ? getAssetItems(section) : getLiabItems(section);
    const total   = itemsTotal(items, listKey === 'assets' ? 'value' : 'amount');
    const isOpen  = !!openSections[section.key];
    const multiApp = allApplicants.length > 1;

    return (
      <div key={section.key} className={`acc${isOpen ? ' acc--open' : ''}`}>
        <button type="button" className="acc-header" onClick={() => toggleSection(section.key)}>
          <span className="acc-icon">{section.icon}</span>
          <span className="acc-label">{section.label}</span>
          {items.length > 0 && <span className="acc-count">{items.length}</span>}
          <span className="acc-total" style={{ color: listKey === 'assets' ? 'var(--color-success-dark)' : 'var(--text-danger-emphasis)' }}>
            {total > 0 ? formatCurrencyDisplay(total.toString()) : '—'}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--text-tertiary)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {isOpen && (
          <div className="acc-body">
            {items.length === 0 && (
              <div className="acc-empty">No {section.label.toLowerCase()} added yet</div>
            )}

            {items.map(({ item, appIdx, itemIdx }) => {
              const expanded   = isExpanded(listKey, appIdx, item.id);
              const ownerColor = OWNER_COLORS[appIdx % OWNER_COLORS.length];
              const ownerName  = allApplicants[appIdx]?.firstName || allApplicants[appIdx]?.companyName || `Applicant ${appIdx + 1}`;
              const displayVal = listKey === 'assets'
                ? (item.value ? formatCurrencyDisplay(parseCurrency(item.value).toString()) : '—')
                : (item.amount ? formatCurrencyDisplay(parseCurrency(item.amount).toString()) : '—');
              const displayDesc = listKey === 'assets'
                ? (item.type === 'Investment Property' ? (item.address || 'Investment Property') : (item.description || item.bank || item.provider || item.vehicleMake || ''))
                : (item.description || '');
              const hasValue = listKey === 'assets' ? !!item.value : !!item.amount;

              return (
                <div key={`${appIdx}-${item.id}`} className="acc-item">
                  <div className="acc-item-row" onClick={() => toggleItem(listKey, appIdx, item.id)}>
                    <div className="acc-item-info">
                      <span className="acc-item-type">{item.type || (listKey === 'assets' ? 'New Asset' : 'New Liability')}</span>
                      {displayDesc && <span className="acc-item-desc">{displayDesc}</span>}
                    </div>
                    <div className="acc-item-meta">
                      {multiApp && (
                        <span className="acc-owner-pill" style={{ background: ownerColor.bg, color: ownerColor.color, border: `1px solid ${ownerColor.border}` }}>
                          {ownerName}
                        </span>
                      )}
                      <span className="acc-item-val" style={{ color: hasValue ? (listKey === 'assets' ? 'var(--color-success-dark)' : 'var(--text-danger-emphasis)') : 'var(--text-tertiary)' }}>
                        {displayVal}
                      </span>
                      {!item.mandatory && !item.linkedAssetId && (
                        <button type="button" className="acc-item-del"
                          onClick={(e) => { e.stopPropagation(); listKey === 'assets' ? removeAsset(appIdx, itemIdx) : removeLiability(appIdx, itemIdx); }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>
                  {expanded && (listKey === 'assets' ? renderAssetFields(item, appIdx, itemIdx) : renderLiabilityFields(item, appIdx, itemIdx))}
                </div>
              );
            })}

            {/* Add button(s) */}
            {allApplicants.length > 0 && (
              <div className="acc-add-row">
                {!multiApp ? (
                  <button type="button" className="acc-add-btn"
                    onClick={() => listKey === 'assets' ? addAsset(0, { type: section.addType }) : addLiability(0, { type: section.addType })}>
                    + Add {section.label}
                  </button>
                ) : (
                  allApplicants.map((app, appIdx) => {
                    const c = OWNER_COLORS[appIdx % OWNER_COLORS.length];
                    const name = app.firstName || app.companyName || `Applicant ${appIdx + 1}`;
                    return (
                      <button key={appIdx} type="button" className="acc-add-btn acc-add-btn--owner"
                        style={{ borderColor: c.border, color: c.color, background: c.bg }}
                        onClick={() => listKey === 'assets' ? addAsset(appIdx, { type: section.addType }) : addLiability(appIdx, { type: section.addType })}>
                        + Add for {name}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Net summary panel ──────────────────────────────────────────────────────

  const renderNetSummary = () => {
    const assetRows = ASSET_SECTIONS.map(s => ({ ...s, total: itemsTotal(getAssetItems(s), 'value') })).filter(s => s.total > 0);
    const liabRows  = LIABILITY_SECTIONS.map(s => ({ ...s, total: itemsTotal(getLiabItems(s), 'amount') })).filter(s => s.total > 0);

    return (
      <div className="al-net-summary">
        <div className="net-hero" style={{ background: grandNet >= 0 ? 'var(--color-success-light)' : '#fef2f2', borderColor: grandNet >= 0 ? 'var(--color-success)' : '#fca5a5' }}>
          <div className="net-hero-label">Net Position</div>
          <div className="net-hero-amount" style={{ color: grandNet >= 0 ? 'var(--color-success-dark)' : '#991b1b' }}>
            {formatCurrencyDisplay(grandNet.toString())}
          </div>
        </div>

        <div className="net-group">
          <div className="net-group-hdr" style={{ color: 'var(--color-success-dark)' }}>
            <span>Assets</span>
            <span>{formatCurrencyDisplay(grandTotalAssets.toString())}</span>
          </div>
          {assetRows.length
            ? assetRows.map(s => (
                <div key={s.key} className="net-line">
                  <span>{s.icon} {s.label}</span>
                  <span>{formatCurrencyDisplay(s.total.toString())}</span>
                </div>
              ))
            : <div className="net-empty">No assets entered</div>
          }
        </div>

        <div className="net-group">
          <div className="net-group-hdr" style={{ color: 'var(--text-danger-emphasis)' }}>
            <span>Liabilities</span>
            <span>{formatCurrencyDisplay(grandTotalLiabs.toString())}</span>
          </div>
          {liabRows.length
            ? liabRows.map(s => (
                <div key={s.key} className="net-line">
                  <span>{s.icon} {s.label}</span>
                  <span>{formatCurrencyDisplay(s.total.toString())}</span>
                </div>
              ))
            : <div className="net-empty">No liabilities entered</div>
          }
        </div>

        <div className="net-checks">
          {MANDATORY_ASSETS.map(ma => {
            const done = allApplicants.every(app => (app.assets || []).some(a => a.type === ma.type && (parseFloat(parseCurrency(a.value)) || 0) > 0));
            return (
              <div key={ma.type} className="net-check-row">
                <span style={{ color: done ? '#16a34a' : 'var(--text-tertiary)', fontSize: '13px' }}>{done ? '✓' : '○'}</span>
                <span style={{ color: done ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '12px' }}>{ma.type}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  if (!allApplicants.length) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-primary)' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>No applicants available. Please complete Step 1 (Applicants) first.</p>
      </div>
    );
  }

  return (
    <div className="fade-in al-layout">

      {/* Left: Accordion */}
      <div className="al-accordion-panel">
        <div className="al-group-hdr">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Assets
        </div>
        {ASSET_SECTIONS.map(s => renderSection(s, 'assets'))}

        <div className="al-group-hdr" style={{ marginTop: '24px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          Liabilities
        </div>
        {LIABILITY_SECTIONS.map(s => renderSection(s, 'liabilities'))}
      </div>

      {/* Right: Net summary */}
      {renderNetSummary()}

    </div>
  );
};

export default Step3AssetsLiabilities;
