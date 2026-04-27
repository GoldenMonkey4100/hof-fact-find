import React, { useState } from 'react';

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

  // Real Property Functions
  const addRealProperty = () => {
    const updated = {
      ...assets,
      realProperty: [...assets.realProperty, {
        id: Date.now(),
        address: '',
        estimatedValue: '',
        ownershipPercentage: '',
        mortgageOwing: '',
        lender: '',
        repaymentAmount: ''
      }]
    };
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
    const updated = {
      ...assets,
      realProperty: assets.realProperty.filter((_, i) => i !== index)
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Savings Functions
  const addSavings = () => {
    const updated = {
      ...assets,
      savings: [...assets.savings, {
        id: Date.now(),
        institution: '',
        accountType: '',
        balance: ''
      }]
    };
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
    const updated = {
      ...assets,
      savings: assets.savings.filter((_, i) => i !== index)
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Superannuation Functions
  const addSuper = () => {
    const updated = {
      ...assets,
      superannuation: [...assets.superannuation, {
        id: Date.now(),
        fund: '',
        balance: ''
      }]
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const updateSuper = (index, field, value) => {
    const updated = { ...assets };
    updated.superannuation[index][field] = value;
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const removeSuper = (index) => {
    const updated = {
      ...assets,
      superannuation: assets.superannuation.filter((_, i) => i !== index)
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Shares Functions
  const addShares = () => {
    const updated = {
      ...assets,
      shares: [...assets.shares, {
        id: Date.now(),
        description: '',
        estimatedValue: ''
      }]
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const updateShares = (index, field, value) => {
    const updated = { ...assets };
    updated.shares[index][field] = value;
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const removeShares = (index) => {
    const updated = {
      ...assets,
      shares: assets.shares.filter((_, i) => i !== index)
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Vehicles Functions
  const addVehicle = () => {
    const updated = {
      ...assets,
      vehicles: [...assets.vehicles, {
        id: Date.now(),
        make: '',
        model: '',
        year: '',
        estimatedValue: ''
      }]
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const updateVehicle = (index, field, value) => {
    const updated = { ...assets };
    updated.vehicles[index][field] = value;
    setAssets(updated);
    updateFormData('assets', updated);
  };

  const removeVehicle = (index) => {
    const updated = {
      ...assets,
      vehicles: assets.vehicles.filter((_, i) => i !== index)
    };
    setAssets(updated);
    updateFormData('assets', updated);
  };

  // Credit Card Functions
  const addCreditCard = () => {
    const updated = {
      ...liabilities,
      creditCards: [...liabilities.creditCards, {
        id: Date.now(),
        institution: '',
        limit: '',
        balance: '',
        monthlyRepayment: ''
      }]
    };
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
    const updated = {
      ...liabilities,
      creditCards: liabilities.creditCards.filter((_, i) => i !== index)
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  // Personal Loan Functions
  const addPersonalLoan = () => {
    const updated = {
      ...liabilities,
      personalLoans: [...liabilities.personalLoans, {
        id: Date.now(),
        lender: '',
        purpose: '',
        balance: '',
        monthlyRepayment: ''
      }]
    };
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
    const updated = {
      ...liabilities,
      personalLoans: liabilities.personalLoans.filter((_, i) => i !== index)
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  // HECS Functions
  const addHECS = () => {
    const updated = {
      ...liabilities,
      hecs: [...liabilities.hecs, {
        id: Date.now(),
        balance: ''
      }]
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const updateHECS = (index, field, value) => {
    const updated = { ...liabilities };
    updated.hecs[index][field] = value;
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const removeHECS = (index) => {
    const updated = {
      ...liabilities,
      hecs: liabilities.hecs.filter((_, i) => i !== index)
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  // Other Liabilities Functions
  const addOtherLiability = () => {
    const updated = {
      ...liabilities,
      otherLiabilities: [...liabilities.otherLiabilities, {
        id: Date.now(),
        description: '',
        balance: '',
        monthlyRepayment: ''
      }]
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const updateOtherLiability = (index, field, value) => {
    const updated = { ...liabilities };
    updated.otherLiabilities[index][field] = value;
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  const removeOtherLiability = (index) => {
    const updated = {
      ...liabilities,
      otherLiabilities: liabilities.otherLiabilities.filter((_, i) => i !== index)
    };
    setLiabilities(updated);
    updateFormData('liabilities', updated);
  };

  // Calculate totals
  const calculateAssetTotal = () => {
    let total = 0;
    
    assets.realProperty.forEach(p => total += parseFloat(p.estimatedValue) || 0);
    assets.savings.forEach(s => total += parseFloat(s.balance) || 0);
    assets.superannuation.forEach(s => total += parseFloat(s.balance) || 0);
    assets.shares.forEach(s => total += parseFloat(s.estimatedValue) || 0);
    assets.vehicles.forEach(v => total += parseFloat(v.estimatedValue) || 0);
    
    return total;
  };

  const calculateLiabilityTotal = () => {
    let total = 0;
    
    assets.realProperty.forEach(p => total += parseFloat(p.mortgageOwing) || 0);
    liabilities.creditCards.forEach(c => total += parseFloat(c.balance) || 0);
    liabilities.personalLoans.forEach(l => total += parseFloat(l.balance) || 0);
    liabilities.hecs.forEach(h => total += parseFloat(h.balance) || 0);
    liabilities.otherLiabilities.forEach(o => total += parseFloat(o.balance) || 0);
    
    return total;
  };

  const netPosition = calculateAssetTotal() - calculateLiabilityTotal();

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Total Assets</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: 'var(--color-text-success)' }}>
            ${calculateAssetTotal().toLocaleString()}
          </div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Total Liabilities</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: 'var(--color-text-danger)' }}>
            ${calculateLiabilityTotal().toLocaleString()}
          </div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Net Position</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: netPosition >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
            ${netPosition.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ASSETS SECTION */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1.5rem 0' }}>Assets</h3>

        {/* Real Property */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Real Property</h4>
            <button onClick={addRealProperty} style={{ fontSize: '13px' }}>+ Add Property</button>
          </div>

          {assets.realProperty.map((property, index) => (
            <div key={property.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Property {index + 1}</span>
                <button onClick={() => removeRealProperty(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}>Remove</button>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Address</label>
                <input type="text" value={property.address} onChange={(e) => updateRealProperty(index, 'address', e.target.value)} placeholder="123 Main St, Sydney NSW 2000" style={{ width: '100%' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Estimated Value ($)</label>
                  <input type="number" value={property.estimatedValue} onChange={(e) => updateRealProperty(index, 'estimatedValue', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Ownership (%)</label>
                  <input type="number" value={property.ownershipPercentage} onChange={(e) => updateRealProperty(index, 'ownershipPercentage', e.target.value)} placeholder="100" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Mortgage Owing ($)</label>
                  <input type="number" value={property.mortgageOwing} onChange={(e) => updateRealProperty(index, 'mortgageOwing', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Lender</label>
                  <input type="text" value={property.lender} onChange={(e) => updateRealProperty(index, 'lender', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Monthly Repayment ($)</label>
                  <input type="number" value={property.repaymentAmount} onChange={(e) => updateRealProperty(index, 'repaymentAmount', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Savings */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Savings & Bank Accounts</h4>
            <button onClick={addSavings} style={{ fontSize: '13px' }}>+ Add Account</button>
          </div>

          {assets.savings.map((account, index) => (
            <div key={account.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Institution</label>
                <input type="text" value={account.institution} onChange={(e) => updateSavings(index, 'institution', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Account Type</label>
                <select value={account.accountType} onChange={(e) => updateSavings(index, 'accountType', e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select...</option>
                  <option value="Savings">Savings</option>
                  <option value="Transaction">Transaction</option>
                  <option value="Term Deposit">Term Deposit</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                <input type="number" value={account.balance} onChange={(e) => updateSavings(index, 'balance', e.target.value)} style={{ width: '100%' }} />
              </div>
              <button onClick={() => removeSavings(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)', padding: '8px 12px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Superannuation */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Superannuation</h4>
            <button onClick={addSuper} style={{ fontSize: '13px' }}>+ Add Super Fund</button>
          </div>

          {assets.superannuation.map((fund, index) => (
            <div key={fund.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px', display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Fund Name</label>
                <input type="text" value={fund.fund} onChange={(e) => updateSuper(index, 'fund', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                <input type="number" value={fund.balance} onChange={(e) => updateSuper(index, 'balance', e.target.value)} style={{ width: '100%' }} />
              </div>
              <button onClick={() => removeSuper(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)', padding: '8px 12px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Shares */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Shares & Investments</h4>
            <button onClick={addShares} style={{ fontSize: '13px' }}>+ Add Shares</button>
          </div>

          {assets.shares.map((share, index) => (
            <div key={share.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px', display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Description</label>
                <input type="text" value={share.description} onChange={(e) => updateShares(index, 'description', e.target.value)} placeholder="e.g. CBA shares, ETF portfolio" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Estimated Value ($)</label>
                <input type="number" value={share.estimatedValue} onChange={(e) => updateShares(index, 'estimatedValue', e.target.value)} style={{ width: '100%' }} />
              </div>
              <button onClick={() => removeShares(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)', padding: '8px 12px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Vehicles */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Vehicles</h4>
            <button onClick={addVehicle} style={{ fontSize: '13px' }}>+ Add Vehicle</button>
          </div>

          {assets.vehicles.map((vehicle, index) => (
            <div key={vehicle.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Vehicle {index + 1}</span>
                <button onClick={() => removeVehicle(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Make</label>
                  <input type="text" value={vehicle.make} onChange={(e) => updateVehicle(index, 'make', e.target.value)} placeholder="Toyota" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Model</label>
                  <input type="text" value={vehicle.model} onChange={(e) => updateVehicle(index, 'model', e.target.value)} placeholder="Camry" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Year</label>
                  <input type="number" value={vehicle.year} onChange={(e) => updateVehicle(index, 'year', e.target.value)} placeholder="2020" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Value ($)</label>
                  <input type="number" value={vehicle.estimatedValue} onChange={(e) => updateVehicle(index, 'estimatedValue', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIABILITIES SECTION */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1.5rem 0' }}>Liabilities</h3>

        {/* Credit Cards */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Credit Cards</h4>
            <button onClick={addCreditCard} style={{ fontSize: '13px' }}>+ Add Card</button>
          </div>

          {liabilities.creditCards.map((card, index) => (
            <div key={card.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Card {index + 1}</span>
                <button onClick={() => removeCreditCard(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Institution</label>
                  <input type="text" value={card.institution} onChange={(e) => updateCreditCard(index, 'institution', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Limit ($)</label>
                  <input type="number" value={card.limit} onChange={(e) => updateCreditCard(index, 'limit', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                  <input type="number" value={card.balance} onChange={(e) => updateCreditCard(index, 'balance', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Monthly ($)</label>
                  <input type="number" value={card.monthlyRepayment} onChange={(e) => updateCreditCard(index, 'monthlyRepayment', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Personal Loans */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Personal Loans</h4>
            <button onClick={addPersonalLoan} style={{ fontSize: '13px' }}>+ Add Loan</button>
          </div>

          {liabilities.personalLoans.map((loan, index) => (
            <div key={loan.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Loan {index + 1}</span>
                <button onClick={() => removePersonalLoan(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Lender</label>
                  <input type="text" value={loan.lender} onChange={(e) => updatePersonalLoan(index, 'lender', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Purpose</label>
                  <input type="text" value={loan.purpose} onChange={(e) => updatePersonalLoan(index, 'purpose', e.target.value)} placeholder="Car, Home Reno, etc" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                  <input type="number" value={loan.balance} onChange={(e) => updatePersonalLoan(index, 'balance', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Monthly ($)</label>
                  <input type="number" value={loan.monthlyRepayment} onChange={(e) => updatePersonalLoan(index, 'monthlyRepayment', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* HECS */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>HECS/HELP Debt</h4>
            <button onClick={addHECS} style={{ fontSize: '13px' }}>+ Add HECS Debt</button>
          </div>

          {liabilities.hecs.map((hecs, index) => (
            <div key={hecs.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px', display: 'grid', gridTemplateColumns: '2fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                <input type="number" value={hecs.balance} onChange={(e) => updateHECS(index, 'balance', e.target.value)} style={{ width: '100%' }} />
              </div>
              <button onClick={() => removeHECS(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)', padding: '8px 12px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Other Liabilities */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Other Liabilities</h4>
            <button onClick={addOtherLiability} style={{ fontSize: '13px' }}>+ Add Other</button>
          </div>

          {liabilities.otherLiabilities.map((liability, index) => (
            <div key={liability.id} style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Other {index + 1}</span>
                <button onClick={() => removeOtherLiability(index)} style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Description</label>
                  <input type="text" value={liability.description} onChange={(e) => updateOtherLiability(index, 'description', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Balance ($)</label>
                  <input type="number" value={liability.balance} onChange={(e) => updateOtherLiability(index, 'balance', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Monthly ($)</label>
                  <input type="number" value={liability.monthlyRepayment} onChange={(e) => updateOtherLiability(index, 'monthlyRepayment', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step3AssetsLiabilities;
