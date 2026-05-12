import React from 'react';
import './styles.css';
import { formatCurrency, parseCurrency, formatCurrencyDisplay } from './utils';
import SmartCard from './SmartCard';

const MANDATORY_ASSETS = [
  { type: 'Savings Account', description: 'Savings' },
  { type: 'Superannuation', description: 'Superannuation' },
  { type: 'Vehicle', description: 'Vehicle' },
  { type: 'Home Contents', description: 'Home Contents' },
];

const Step3AssetsLiabilities = ({ formData, updateFormData }) => {

  // Seed mandatory assets for any applicant that doesn't have them yet
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
          ...missing.map((ma, i) => ({
            id: Date.now() + i * 7,
            type: ma.type,
            description: ma.description,
            value: '',
            mandatory: true
          })),
          ...currentAssets
        ]
      };
    });
    if (changed) updateFormData('applicants', updatedApplicants);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update asset and auto-manage linked mortgage liability for Investment Property
  const updateAsset = (applicantIndex, assetIndex, field, value) => {
    const updatedApplicants = [...formData.applicants];
    const assets = [...(updatedApplicants[applicantIndex].assets || [])];
    const asset = { ...assets[assetIndex], [field]: value };
    assets[assetIndex] = asset;

    let liabilities = [...(updatedApplicants[applicantIndex].liabilities || [])];

    if (asset.type === 'Investment Property' &&
        (field === 'mortgageOwing' || field === 'address' || field === 'lender')) {
      const linkedIdx = liabilities.findIndex(l => l.linkedAssetId === asset.id);
      const mortgageAmt = parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0;
      const desc = `Mortgage — ${asset.address || 'Investment Property'}${asset.lender ? ` (${asset.lender})` : ''}`;

      if (mortgageAmt > 0) {
        if (linkedIdx >= 0) {
          liabilities[linkedIdx] = { ...liabilities[linkedIdx], description: desc, amount: asset.mortgageOwing };
        } else {
          liabilities = [...liabilities, {
            id: Date.now(),
            type: 'Home Loan',
            description: desc,
            amount: asset.mortgageOwing,
            repayment: '',
            linkedAssetId: asset.id
          }];
        }
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
    if (asset.type === 'Investment Property') {
      liabilities = liabilities.filter(l => l.linkedAssetId !== asset.id);
    }
    updatedApplicants[applicantIndex] = {
      ...updatedApplicants[applicantIndex],
      assets: updatedApplicants[applicantIndex].assets.filter((_, i) => i !== assetIndex),
      liabilities
    };
    updateFormData('applicants', updatedApplicants);
  };

  const addAsset = (applicantIndex) => {
    const applicant = formData.applicants[applicantIndex];
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex] = {
      ...applicant,
      assets: [...(applicant.assets || []), { id: Date.now(), type: '', description: '', value: '' }]
    };
    updateFormData('applicants', updatedApplicants);
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
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex] = {
      ...applicant,
      liabilities: [...(applicant.liabilities || []), { id: Date.now(), type: '', description: '', amount: '', repayment: '' }]
    };
    updateFormData('applicants', updatedApplicants);
  };

  const allApplicants = formData.applicants || [];
  const grandTotalAssets = allApplicants.reduce((sum, a) =>
    sum + (a.assets || []).reduce((s, asset) => s + (parseFloat(parseCurrency(asset.value)) || 0), 0), 0);
  const grandTotalLiabilities = allApplicants.reduce((sum, a) =>
    sum + (a.liabilities || []).reduce((s, liab) => s + (parseFloat(parseCurrency(liab.amount)) || 0), 0), 0);
  const grandNetPosition = grandTotalAssets - grandTotalLiabilities;

  return (
    <div className="fade-in">

      {/* Summary Cards */}
      <div className="grid grid-cols-3 mb-8">
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assets</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-success)' }}>
            {formatCurrencyDisplay(grandTotalAssets.toString())}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Liabilities</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-danger)' }}>
            {formatCurrencyDisplay(grandTotalLiabilities.toString())}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Position</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: grandNetPosition >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatCurrencyDisplay(grandNetPosition.toString())}
          </p>
        </div>
      </div>

      {allApplicants.map((applicant, applicantIndex) => {
        const alName = [applicant.firstName || applicant.role, applicant.lastName || applicant.number].filter(Boolean).join(' ');
        const assetCount = (applicant.assets || []).filter(a => a.value).length;
        const liabCount  = (applicant.liabilities || []).filter(l => l.amount).length;
        const alSummary  = assetCount + liabCount > 0
          ? `${assetCount} asset${assetCount !== 1 ? 's' : ''} · ${liabCount} liabilit${liabCount !== 1 ? 'ies' : 'y'}`
          : null;
        const alStatus   = assetCount + liabCount > 0 ? 'partial' : 'empty';

        return (
        <SmartCard
          key={applicant.id}
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          title={`${alName}'s Assets & Liabilities`}
          summary={alSummary}
          status={alStatus}
          defaultOpen={assetCount + liabCount === 0}
        >

          {/* Assets */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Assets</h4>
              <button type="button" onClick={() => addAsset(applicantIndex)} className="btn-secondary">
                + Add Asset
              </button>
            </div>

            {(applicant.assets || []).map((asset, assetIndex) => (
              <div key={asset.id} className="mb-4" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div className="flex justify-between items-center mb-3">
                  <h5 style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {asset.mandatory ? asset.description : `Asset ${assetIndex + 1}`}
                    {asset.mandatory && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: '400' }}>(required)</span>
                    )}
                  </h5>
                  {!asset.mandatory && (
                    <button type="button" onClick={() => removeAsset(applicantIndex, assetIndex)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>
                      Remove
                    </button>
                  )}
                </div>

                {/* Asset Type — locked for mandatory assets */}
                {!asset.mandatory && (
                  <div className="mb-3">
                    <label>Asset Type</label>
                    <select
                      value={asset.type}
                      onChange={(e) => updateAsset(applicantIndex, assetIndex, 'type', e.target.value)}
                    >
                      <option value="">Select Type...</option>
                      <option value="Savings Account">Savings Account</option>
                      <option value="Transaction Account">Transaction Account</option>
                      <option value="Term Deposit">Term Deposit</option>
                      <option value="Shares">Shares</option>
                      <option value="Investment Property">Investment Property</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Home Contents">Home Contents</option>
                      <option value="Superannuation">Superannuation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Description — only for non-mandatory, non-investment-property */}
                {!asset.mandatory && asset.type !== 'Investment Property' && (
                  <div className="mb-3">
                    <label>Description</label>
                    <input
                      type="text"
                      value={asset.description}
                      onChange={(e) => updateAsset(applicantIndex, assetIndex, 'description', e.target.value)}
                      placeholder="E.g., CBA Savings Account"
                    />
                  </div>
                )}

                {/* Investment Property — extended fields */}
                {asset.type === 'Investment Property' && (
                  <>
                    <div className="mb-3">
                      <label>Property Address</label>
                      <input
                        type="text"
                        value={asset.address || ''}
                        onChange={(e) => updateAsset(applicantIndex, assetIndex, 'address', e.target.value)}
                        placeholder="123 Main St, Sydney NSW 2000"
                      />
                    </div>
                    <div className="grid grid-cols-2 mb-3">
                      <div>
                        <label>Property Value</label>
                        <input
                          type="text"
                          value={formatCurrency(asset.value)}
                          onChange={(e) => updateAsset(applicantIndex, assetIndex, 'value', parseCurrency(e.target.value))}
                          placeholder="750,000"
                        />
                      </div>
                      <div>
                        <label>Ownership %</label>
                        <input
                          type="number"
                          value={asset.ownershipPercentage || ''}
                          onChange={(e) => updateAsset(applicantIndex, assetIndex, 'ownershipPercentage', e.target.value)}
                          placeholder="100"
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 mb-3">
                      <div>
                        <label>Weekly Rental Income</label>
                        <input
                          type="text"
                          value={formatCurrency(asset.rentalIncome || '')}
                          onChange={(e) => updateAsset(applicantIndex, assetIndex, 'rentalIncome', parseCurrency(e.target.value))}
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label>Mortgage Owing</label>
                        <input
                          type="text"
                          value={formatCurrency(asset.mortgageOwing || '')}
                          onChange={(e) => updateAsset(applicantIndex, assetIndex, 'mortgageOwing', parseCurrency(e.target.value))}
                          placeholder="400,000"
                        />
                      </div>
                    </div>
                    {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
                      <div className="mb-3">
                        <label>Lender</label>
                        <input
                          type="text"
                          value={asset.lender || ''}
                          onChange={(e) => updateAsset(applicantIndex, assetIndex, 'lender', e.target.value)}
                          placeholder="CBA, ANZ, etc."
                        />
                      </div>
                    )}
                    {(parseFloat(parseCurrency(asset.mortgageOwing || '0')) || 0) > 0 && (
                      <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px' }}>
                        ✓ Mortgage liability auto-linked below
                      </div>
                    )}
                  </>
                )}

                {/* Superannuation — provider field */}
                {asset.type === 'Superannuation' && (
                  <div className="mb-3">
                    <label>Provider</label>
                    <input
                      type="text"
                      value={asset.provider || ''}
                      onChange={(e) => updateAsset(applicantIndex, assetIndex, 'provider', e.target.value)}
                      placeholder="e.g. Australian Super, REST, Host Plus"
                    />
                  </div>
                )}

                {/* Value field for non-Investment Property assets */}
                {asset.type !== 'Investment Property' && (
                  <div>
                    <label>Value</label>
                    <input
                      type="text"
                      value={formatCurrency(asset.value)}
                      onChange={(e) => updateAsset(applicantIndex, assetIndex, 'value', parseCurrency(e.target.value))}
                      placeholder="50,000"
                    />
                  </div>
                )}

                {/* Bank/Account fields for Savings Account */}
                {asset.type === 'Savings Account' && (
                  <div className="grid grid-cols-2 mb-3" style={{ marginTop: '12px' }}>
                    <div>
                      <label>Bank / Institution</label>
                      <input
                        type="text"
                        value={asset.bank || ''}
                        onChange={(e) => updateAsset(applicantIndex, assetIndex, 'bank', e.target.value)}
                        placeholder="e.g. Commonwealth Bank"
                      />
                    </div>
                    <div>
                      <label>Account Name / Type</label>
                      <input
                        type="text"
                        value={asset.accountName || ''}
                        onChange={(e) => updateAsset(applicantIndex, assetIndex, 'accountName', e.target.value)}
                        placeholder="e.g. Everyday Savings"
                      />
                    </div>
                  </div>
                )}

                {/* Vehicle — make & model fields */}
                {asset.type === 'Vehicle' && (
                  <div className="grid grid-cols-2 mb-3" style={{ marginTop: '12px' }}>
                    <div>
                      <label>Make</label>
                      <input
                        type="text"
                        value={asset.vehicleMake || ''}
                        onChange={(e) => updateAsset(applicantIndex, assetIndex, 'vehicleMake', e.target.value)}
                        placeholder="e.g. Toyota"
                      />
                    </div>
                    <div>
                      <label>Model</label>
                      <input
                        type="text"
                        value={asset.vehicleModel || ''}
                        onChange={(e) => updateAsset(applicantIndex, assetIndex, 'vehicleModel', e.target.value)}
                        placeholder="e.g. Camry"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* spacer between assets list and liabilities */}
          </div>

          {/* Liabilities */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Liabilities</h4>
              <button type="button" onClick={() => addLiability(applicantIndex)} className="btn-secondary">
                + Add Liability
              </button>
            </div>

            {(applicant.liabilities || []).map((liability, liabIndex) => (
              <div key={liability.id} className="mb-4" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div className="flex justify-between items-center mb-3">
                  <h5 style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {liability.linkedAssetId ? liability.description : `Liability ${liabIndex + 1}`}
                    {liability.linkedAssetId && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: '400' }}>(auto-linked)</span>
                    )}
                  </h5>
                  {!liability.linkedAssetId && (
                    <button type="button" onClick={() => removeLiability(applicantIndex, liabIndex)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>
                      Remove
                    </button>
                  )}
                </div>

                {!liability.linkedAssetId && (
                  <>
                    <div className="mb-3">
                      <label>Liability Type</label>
                      <select
                        value={liability.type}
                        onChange={(e) => updateLiability(applicantIndex, liabIndex, 'type', e.target.value)}
                      >
                        <option value="">Select Type...</option>
                        <option value="Home Loan">Home Loan</option>
                        <option value="Personal Loan">Personal Loan</option>
                        <option value="Car Loan">Car Loan</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="HECS/HELP">HECS/HELP</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label>Description</label>
                      <input
                        type="text"
                        value={liability.description}
                        onChange={(e) => updateLiability(applicantIndex, liabIndex, 'description', e.target.value)}
                        placeholder="E.g., ANZ Credit Card"
                      />
                    </div>
                  </>
                )}

                {liability.linkedAssetId && (
                  <div className="mb-3">
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Type: Home Loan (Investment Property)</label>
                  </div>
                )}

                <div className="grid grid-cols-2">
                  <div>
                    <label>Outstanding Amount</label>
                    <input
                      type="text"
                      value={formatCurrency(liability.amount)}
                      onChange={(e) => updateLiability(applicantIndex, liabIndex, 'amount', parseCurrency(e.target.value))}
                      placeholder="400,000"
                      readOnly={!!liability.linkedAssetId}
                      style={liability.linkedAssetId ? { background: 'var(--bg-tertiary)', cursor: 'not-allowed' } : {}}
                    />
                  </div>
                  <div>
                    <label>Monthly Repayment</label>
                    <input
                      type="text"
                      value={formatCurrency(liability.repayment)}
                      onChange={(e) => updateLiability(applicantIndex, liabIndex, 'repayment', parseCurrency(e.target.value))}
                      placeholder="2,000"
                    />
                  </div>
                </div>
              </div>
            ))}

          </div>

          {/* Per-applicant summary */}
          {(() => {
            const ta = (applicant.assets || []).reduce((s, a) => s + (parseFloat(parseCurrency(a.value)) || 0), 0);
            const tl = (applicant.liabilities || []).reduce((s, l) => s + (parseFloat(parseCurrency(l.amount)) || 0), 0);
            const net = ta - tl;
            const monthlyRepay = (applicant.liabilities || []).reduce((s, l) => s + (parseFloat(parseCurrency(l.repayment)) || 0), 0);
            return (
              <div className="grid grid-cols-3" style={{ marginTop: '8px', gap: '12px' }}>
                <div style={{ padding: '14px 16px', background: 'var(--color-success-light)', borderRadius: '8px', border: '1px solid var(--color-success)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-success-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Assets</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-success-dark)' }}>{formatCurrencyDisplay(ta.toString())}</div>
                </div>
                <div style={{ padding: '14px 16px', background: 'var(--bg-danger-surface)', borderRadius: '8px', border: '1px solid var(--border-danger)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Liabilities</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-danger-emphasis)' }}>{formatCurrencyDisplay(tl.toString())}</div>
                  {monthlyRepay > 0 && <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', marginTop: '2px' }}>{formatCurrencyDisplay(monthlyRepay.toString())}/mo repayments</div>}
                </div>
                <div style={{ padding: '14px 16px', background: net >= 0 ? 'var(--color-success-light)' : '#fef2f2', borderRadius: '8px', border: `1px solid ${net >= 0 ? 'var(--color-success)' : '#fca5a5'}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: net >= 0 ? 'var(--color-success-dark)' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Net Position</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: net >= 0 ? 'var(--color-success-dark)' : '#991b1b' }}>{formatCurrencyDisplay(net.toString())}</div>
                </div>
              </div>
            );
          })()}
        </SmartCard>
        );
      })}

      {allApplicants.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-primary)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants available. Please complete Step 1 (Applicants) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step3AssetsLiabilities;
