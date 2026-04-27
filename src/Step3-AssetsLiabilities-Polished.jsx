import React from 'react';
import './styles.css';
import { formatCurrency, parseCurrency, formatCurrencyDisplay } from './utils';

const Step3AssetsLiabilities = ({ formData, updateFormData }) => {

  const updateApplicantData = (applicantIndex, field, value) => {
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex] = { ...updatedApplicants[applicantIndex], [field]: value };
    updateFormData('applicants', updatedApplicants);
  };

  const addAsset = (applicantIndex) => {
    const applicant = formData.applicants[applicantIndex];
    const currentAssets = applicant.assets || [];
    updateApplicantData(applicantIndex, 'assets', [
      ...currentAssets,
      { id: Date.now(), type: '', description: '', value: '' }
    ]);
  };

  const updateAsset = (applicantIndex, assetIndex, field, value) => {
    const updatedApplicants = [...formData.applicants];
    const assets = [...(updatedApplicants[applicantIndex].assets || [])];
    assets[assetIndex] = { ...assets[assetIndex], [field]: value };
    updatedApplicants[applicantIndex] = { ...updatedApplicants[applicantIndex], assets };
    updateFormData('applicants', updatedApplicants);
  };

  const removeAsset = (applicantIndex, assetIndex) => {
    const updatedApplicants = [...formData.applicants];
    updatedApplicants[applicantIndex].assets = updatedApplicants[applicantIndex].assets.filter((_, i) => i !== assetIndex);
    updateFormData('applicants', updatedApplicants);
  };

  const addLiability = (applicantIndex) => {
    const applicant = formData.applicants[applicantIndex];
    const currentLiabilities = applicant.liabilities || [];
    updateApplicantData(applicantIndex, 'liabilities', [
      ...currentLiabilities,
      { id: Date.now(), type: '', description: '', amount: '', repayment: '' }
    ]);
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

  // Aggregate totals across all applicants for summary
  const allApplicants = formData.applicants || [];
  const grandTotalAssets = allApplicants.reduce((sum, applicant) =>
    sum + (applicant.assets || []).reduce((s, a) => s + (parseFloat(parseCurrency(a.value)) || 0), 0), 0);
  const grandTotalLiabilities = allApplicants.reduce((sum, applicant) =>
    sum + (applicant.liabilities || []).reduce((s, l) => s + (parseFloat(parseCurrency(l.amount)) || 0), 0), 0);
  const grandNetPosition = grandTotalAssets - grandTotalLiabilities;

  return (
    <div className="fade-in">

      {/* Summary Cards */}
      <div className="grid grid-cols-3 mb-8">
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Assets
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-success)' }}>
            {formatCurrencyDisplay(grandTotalAssets.toString())}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Liabilities
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-danger)' }}>
            {formatCurrencyDisplay(grandTotalLiabilities.toString())}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Net Position
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: grandNetPosition >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatCurrencyDisplay(grandNetPosition.toString())}
          </p>
        </div>
      </div>

      {/* Change 13: Separate A&L card per applicant */}
      {allApplicants.map((applicant, applicantIndex) => (
        <div key={applicant.id} className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">
              {applicant.firstName || applicant.role} {applicant.lastName || applicant.number}'s Assets & Liabilities
            </h3>
          </div>

          {/* Assets Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Assets</h4>
              <button
                type="button"
                onClick={() => addAsset(applicantIndex)}
                className="btn-secondary"
              >
                + Add Asset
              </button>
            </div>

            {(applicant.assets || []).map((asset, assetIndex) => (
              <div key={asset.id} className="mb-4" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div className="flex justify-between items-center mb-3">
                  <h5 style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>Asset {assetIndex + 1}</h5>
                  <button
                    type="button"
                    onClick={() => removeAsset(applicantIndex, assetIndex)}
                    className="btn-danger"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Remove
                  </button>
                </div>

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
                    <option value="Superannuation">Superannuation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label>Description</label>
                  <input
                    type="text"
                    value={asset.description}
                    onChange={(e) => updateAsset(applicantIndex, assetIndex, 'description', e.target.value)}
                    placeholder="E.g., CBA Savings Account, Tesla Model 3"
                  />
                </div>

                <div>
                  <label>Value</label>
                  <input
                    type="text"
                    value={formatCurrency(asset.value)}
                    onChange={(e) => updateAsset(applicantIndex, assetIndex, 'value', parseCurrency(e.target.value))}
                    placeholder="50,000"
                  />
                </div>
              </div>
            ))}

            {applicant.assets && applicant.assets.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '600', marginTop: '12px' }}>
                Total Assets: {formatCurrencyDisplay(
                  applicant.assets.reduce((sum, asset) => sum + (parseFloat(parseCurrency(asset.value)) || 0), 0).toString()
                )}
              </div>
            )}
          </div>

          {/* Liabilities Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Liabilities</h4>
              <button
                type="button"
                onClick={() => addLiability(applicantIndex)}
                className="btn-secondary"
              >
                + Add Liability
              </button>
            </div>

            {(applicant.liabilities || []).map((liability, liabIndex) => (
              <div key={liability.id} className="mb-4" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div className="flex justify-between items-center mb-3">
                  <h5 style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>Liability {liabIndex + 1}</h5>
                  <button
                    type="button"
                    onClick={() => removeLiability(applicantIndex, liabIndex)}
                    className="btn-danger"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Remove
                  </button>
                </div>

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
                    placeholder="E.g., ANZ Credit Card, CBA Personal Loan"
                  />
                </div>

                <div className="grid grid-cols-2">
                  <div>
                    <label>Outstanding Amount</label>
                    <input
                      type="text"
                      value={formatCurrency(liability.amount)}
                      onChange={(e) => updateLiability(applicantIndex, liabIndex, 'amount', parseCurrency(e.target.value))}
                      placeholder="10,000"
                    />
                  </div>
                  <div>
                    <label>Monthly Repayment</label>
                    <input
                      type="text"
                      value={formatCurrency(liability.repayment)}
                      onChange={(e) => updateLiability(applicantIndex, liabIndex, 'repayment', parseCurrency(e.target.value))}
                      placeholder="500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {applicant.liabilities && applicant.liabilities.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '600', marginTop: '12px' }}>
                <div>Total Liabilities: {formatCurrencyDisplay(
                  applicant.liabilities.reduce((sum, liab) => sum + (parseFloat(parseCurrency(liab.amount)) || 0), 0).toString()
                )}</div>
                <div style={{ marginTop: '4px' }}>Total Monthly Repayments: {formatCurrencyDisplay(
                  applicant.liabilities.reduce((sum, liab) => sum + (parseFloat(parseCurrency(liab.repayment)) || 0), 0).toString()
                )}</div>
              </div>
            )}
          </div>

          {/* Net Position per applicant */}
          {((applicant.assets && applicant.assets.length > 0) || (applicant.liabilities && applicant.liabilities.length > 0)) && (
            <div style={{
              padding: '16px',
              background: 'var(--color-success-light)',
              borderRadius: '8px',
              borderLeft: '4px solid var(--color-success)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                Net Position: {(() => {
                  const totalAssets = (applicant.assets || []).reduce((sum, asset) =>
                    sum + (parseFloat(parseCurrency(asset.value)) || 0), 0);
                  const totalLiabilities = (applicant.liabilities || []).reduce((sum, liab) =>
                    sum + (parseFloat(parseCurrency(liab.amount)) || 0), 0);
                  return formatCurrencyDisplay((totalAssets - totalLiabilities).toString());
                })()}
              </div>
            </div>
          )}
        </div>
      ))}

      {allApplicants.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-primary)'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants available. Please complete Step 1 (Applicants) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step3AssetsLiabilities;
