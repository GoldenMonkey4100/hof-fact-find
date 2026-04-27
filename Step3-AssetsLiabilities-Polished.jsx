import React, { useState } from 'react';
import './styles.css';

const Step3AssetsLiabilities = ({ formData, updateFormData }) => {
  const [assets, setAssets] = useState({
    realProperty: [],
    savings: [],
    superannuation: [],
    shares: [],
    vehicles: [],
    otherAssets: []
  });

  const [liabilities, setLiabilities] = useState({
    creditCards: [],
    personalLoans: [],
    hecs: [],
    otherLiabilities: []
  });

  // Calculate totals
  const calculateTotalAssets = () => {
    let total = 0;
    assets.realProperty.forEach(p => total += parseFloat(p.estimatedValue) || 0);
    assets.savings.forEach(s => total += parseFloat(s.balance) || 0);
    assets.superannuation.forEach(s => total += parseFloat(s.balance) || 0);
    assets.shares.forEach(s => total += parseFloat(s.value) || 0);
    assets.vehicles.forEach(v => total += parseFloat(v.value) || 0);
    assets.otherAssets.forEach(a => total += parseFloat(a.value) || 0);
    return total;
  };

  const calculateTotalLiabilities = () => {
    let total = 0;
    liabilities.creditCards.forEach(c => total += parseFloat(c.limit) || 0);
    liabilities.personalLoans.forEach(l => total += parseFloat(l.balance) || 0);
    liabilities.hecs.forEach(h => total += parseFloat(h.balance) || 0);
    liabilities.otherLiabilities.forEach(l => total += parseFloat(l.balance) || 0);
    assets.realProperty.forEach(p => total += parseFloat(p.mortgageOwing) || 0);
    return total;
  };

  // Real Property
  const addRealProperty = () => {
    const updated = { ...assets, realProperty: [...assets.realProperty, {
      id: Date.now(), address: '', estimatedValue: '', ownershipPercentage: '', 
      mortgageOwing: '', lender: '', repaymentAmount: ''
    }]};
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const updateRealProperty = (index, field, value) => {
    const updated = { ...assets };
    updated.realProperty[index][field] = value;
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const removeRealProperty = (index) => {
    const updated = { ...assets, realProperty: assets.realProperty.filter((_, i) => i !== index) };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Savings
  const addSavings = () => {
    const updated = { ...assets, savings: [...assets.savings, {
      id: Date.now(), institution: '', accountType: '', balance: ''
    }]};
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const updateSavings = (index, field, value) => {
    const updated = { ...assets };
    updated.savings[index][field] = value;
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const removeSavings = (index) => {
    const updated = { ...assets, savings: assets.savings.filter((_, i) => i !== index) };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Credit Cards
  const addCreditCard = () => {
    const updated = { ...liabilities, creditCards: [...liabilities.creditCards, {
      id: Date.now(), institution: '', limit: '', balance: ''
    }]};
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const updateCreditCard = (index, field, value) => {
    const updated = { ...liabilities };
    updated.creditCards[index][field] = value;
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const removeCreditCard = (index) => {
    const updated = { ...liabilities, creditCards: liabilities.creditCards.filter((_, i) => i !== index) };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  // Personal Loans
  const addPersonalLoan = () => {
    const updated = { ...liabilities, personalLoans: [...liabilities.personalLoans, {
      id: Date.now(), lender: '', purpose: '', balance: '', monthlyRepayment: ''
    }]};
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const updatePersonalLoan = (index, field, value) => {
    const updated = { ...liabilities };
    updated.personalLoans[index][field] = value;
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const removePersonalLoan = (index) => {
    const updated = { ...liabilities, personalLoans: liabilities.personalLoans.filter((_, i) => i !== index) };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const totalAssets = calculateTotalAssets();
  const totalLiabilities = calculateTotalLiabilities();
  const netPosition = totalAssets - totalLiabilities;

  return (
    <div className="fade-in">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 mb-8">
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Assets
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-success)' }}>
            ${totalAssets.toLocaleString()}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Liabilities
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--color-danger)' }}>
            ${totalLiabilities.toLocaleString()}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Net Position
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: netPosition >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            ${netPosition.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ASSETS SECTION */}
      <div className="card mb-8">
        <h3 className="card-title">Assets</h3>

        {/* Real Property */}
        <div className="mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Real Property</h4>
            <button onClick={addRealProperty} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>+ Add Property</button>
          </div>
          {assets.realProperty.map((property, index) => (
            <div key={property.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Property {index + 1}</span>
                <button onClick={() => removeRealProperty(index)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>Remove</button>
              </div>
              <div className="mb-4">
                <label>Address</label>
                <input type="text" value={property.address} onChange={(e) => updateRealProperty(index, 'address', e.target.value)} placeholder="123 Main St, Sydney NSW" />
              </div>
              <div className="grid grid-cols-3 mb-4">
                <div><label>Estimated Value ($)</label><input type="number" value={property.estimatedValue} onChange={(e) => updateRealProperty(index, 'estimatedValue', e.target.value)} /></div>
                <div><label>Ownership %</label><input type="number" value={property.ownershipPercentage} onChange={(e) => updateRealProperty(index, 'ownershipPercentage', e.target.value)} placeholder="100" /></div>
                <div><label>Mortgage Owing ($)</label><input type="number" value={property.mortgageOwing} onChange={(e) => updateRealProperty(index, 'mortgageOwing', e.target.value)} /></div>
              </div>
              {property.mortgageOwing > 0 && (
                <div className="grid grid-cols-2">
                  <div><label>Lender</label><input type="text" value={property.lender} onChange={(e) => updateRealProperty(index, 'lender', e.target.value)} /></div>
                  <div><label>Monthly Repayment ($)</label><input type="number" value={property.repaymentAmount} onChange={(e) => updateRealProperty(index, 'repaymentAmount', e.target.value)} /></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Savings */}
        <div className="mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Savings & Bank Accounts</h4>
            <button onClick={addSavings} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>+ Add Account</button>
          </div>
          {assets.savings.map((saving, index) => (
            <div key={saving.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Account {index + 1}</span>
                <button onClick={() => removeSavings(index)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>Remove</button>
              </div>
              <div className="grid grid-cols-3">
                <div><label>Institution</label><input type="text" value={saving.institution} onChange={(e) => updateSavings(index, 'institution', e.target.value)} placeholder="Bank name" /></div>
                <div><label>Account Type</label><select value={saving.accountType} onChange={(e) => updateSavings(index, 'accountType', e.target.value)}><option value="">Select...</option><option value="Savings">Savings</option><option value="Transaction">Transaction</option><option value="Term Deposit">Term Deposit</option></select></div>
                <div><label>Balance ($)</label><input type="number" value={saving.balance} onChange={(e) => updateSavings(index, 'balance', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIABILITIES SECTION */}
      <div className="card">
        <h3 className="card-title">Liabilities</h3>

        {/* Credit Cards */}
        <div className="mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Credit Cards</h4>
            <button onClick={addCreditCard} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>+ Add Card</button>
          </div>
          {liabilities.creditCards.map((card, index) => (
            <div key={card.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Card {index + 1}</span>
                <button onClick={() => removeCreditCard(index)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>Remove</button>
              </div>
              <div className="grid grid-cols-3">
                <div><label>Institution</label><input type="text" value={card.institution} onChange={(e) => updateCreditCard(index, 'institution', e.target.value)} placeholder="Bank name" /></div>
                <div><label>Credit Limit ($)</label><input type="number" value={card.limit} onChange={(e) => updateCreditCard(index, 'limit', e.target.value)} /></div>
                <div><label>Current Balance ($)</label><input type="number" value={card.balance} onChange={(e) => updateCreditCard(index, 'balance', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Personal Loans */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Personal Loans</h4>
            <button onClick={addPersonalLoan} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>+ Add Loan</button>
          </div>
          {liabilities.personalLoans.map((loan, index) => (
            <div key={loan.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Loan {index + 1}</span>
                <button onClick={() => removePersonalLoan(index)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}>Remove</button>
              </div>
              <div className="grid grid-cols-2 mb-4">
                <div><label>Lender</label><input type="text" value={loan.lender} onChange={(e) => updatePersonalLoan(index, 'lender', e.target.value)} /></div>
                <div><label>Purpose</label><input type="text" value={loan.purpose} onChange={(e) => updatePersonalLoan(index, 'purpose', e.target.value)} placeholder="Car, Personal, etc." /></div>
              </div>
              <div className="grid grid-cols-2">
                <div><label>Balance Owing ($)</label><input type="number" value={loan.balance} onChange={(e) => updatePersonalLoan(index, 'balance', e.target.value)} /></div>
                <div><label>Monthly Repayment ($)</label><input type="number" value={loan.monthlyRepayment} onChange={(e) => updatePersonalLoan(index, 'monthlyRepayment', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step3AssetsLiabilities;
