# Step 0 — Loan Strategy

> **Component:** `src/Step0-LoanStrategy-Polished.jsx`
> **Load alongside:** [[Shared Core]]
> **Bank policy refs:** [[Loan Structure Options]] · [[Transaction Type Policy Notes]] · [[LVR & Lender Tiers]]

---

## Fields — Broker / Application Info

| Field | Key | Type | Notes |
|---|---|---|---|
| Broker Name | `brokerName` | text | Auto-filled from Mercury or manual |
| Broker Email | `brokerEmail` | text | Used as `submittedBy` |
| Client Type | `clientType` | select | New / Existing / Family & Friends — pill toggle |
| Lead Source | `leadSource` | text | Shown only when `clientType === 'New'` |
| Number of Applicants | `numApplicants` | number | 1–4 |
| Number of Guarantors | `numGuarantors` | number | 0–2 |
| Applicant Type | `applicantType` | select | Natural Person / Company |
| Priority | `priority` | select | Low / Medium / High / Urgent — colour-coded pill toggle |
| Lender Preference | `lenderPreference` | string[] | Multi-select by tier; flows directly to Notion `Lender` property |
| Broker Notes | `brokerNotes` | textarea | |

---

## Fields — Per Security (`formData.securities[]`)

| Field | Key | Type | Notes |
|---|---|---|---|
| Address | `address` | text | Google Places autocomplete |
| Property Value | `propertyValue` | currency | Part of tri-directional calculator |
| LVR | `lvr` | % | **Fillable** — enter any two of value/LVR/loan; third auto-fills |
| Loan Amount | `loanAmount` | currency | Part of tri-directional calculator |
| Primary Transaction Types | `primaryTransactionTypes` | string[] | Purchase / Refinance |
| Secondary Transaction Types | `secondaryTransactionTypes` | string[] | Cashout / Construction / Off the Plan / Pre-approval / Vacant Land |
| Intended Occupancy | `intendedOccupancy` | select | Owner Occupied / Investment |
| Application Type | `applicationType` | select | Full Doc / Low Doc |
| State | `state` | select | AU state/territory — for stamp duty calculation |
| First Home Buyer | `isFirstHomeBuyer` | boolean | |
| New Home | `isNewHome` | boolean | Shown when `isFirstHomeBuyer` is true |
| Purchase Completion Methods | `purchaseCompletionMethods` | string[] | Own Savings / Gift from Family / Equity from Existing Property / First Home Owner Grant / Other |
| Purchase Completion Amounts | `purchaseCompletionAmounts` | object | Keyed by method name |
| Gift Relationship | `giftRelationship` | text | Shown when 'Gift from Family' selected |
| Equity Property Index | `equityPropertyIndex` | integer | Index into `securities[]` for equity source property |
| Current Loan Balance | `currentLoanBalance` | currency | Refinance + Cashout only |
| Cashout Amount | `cashoutAmount` | currency | Refinance + Cashout only |
| Loan Term | `loanTerm` | number (years) | Sub-step 2 |
| Loan Type | `loanType` | select | Principal & Interest / Interest Only / Split — Sub-step 2 |
| Repayment Type | `repaymentType` | select | Sub-step 2 |
| Fixed Rate Period | `fixedRatePeriod` | number (years) | Sub-step 2 |
| Interest Only Period | `interestOnlyPeriod` | number (years) | Sub-step 2, shown when IO |
| Split 1 Amount | `split1Amount` | currency | Sub-step 2, only when `loanType === 'Split'` |
| Split 1 Type | `split1Type` | select | P&I / IO |
| Split 1 Rate Type | `split1RateType` | select | Fixed / Variable |
| Split 1 Fixed Years | `split1FixedYears` | number | |
| Split 1 IO Years | `split1IOYears` | number | |
| Split 2 (same fields) | `split2*` | — | |
| Has Offset | `hasOffset` | boolean | Sub-step 2 |
| Has Redraw | `hasRedraw` | boolean | Sub-step 2 |
| Ownership Rows | `ownershipRows` | OwnerRow[] | Sub-step 2 |
| Guarantors | `guarantors` | integer[] | Applicant IDs — Sub-step 2 |
| Cross-Collateralise | `crossCollateralise` | boolean | Sub-step 2; HOF preference: avoid where possible |

### OwnerRow shape
```js
{ id, type: 'applicant' | 'other', applicantId, name, percentage }
```

---

## Security Object — Full Shape

```js
{
  id: Date.now(),
  address: '',
  propertyValue: '',
  loanAmount: '',
  lvr: '',
  primaryTransactionTypes: [],
  secondaryTransactionTypes: [],
  intendedOccupancy: '',
  applicationType: '',        // 'Full Doc' | 'Low Doc'
  state: '',
  isFirstHomeBuyer: false,
  isNewHome: false,
  purchaseCompletionMethods: [],
  purchaseCompletionAmounts: {},
  purchaseCompletionOther: '',
  giftRelationship: '',
  equityPropertyIndex: '',
  currentLoanBalance: '',
  cashoutAmount: '',
  loanTerm: '',
  loanType: '',               // 'Principal & Interest' | 'Interest Only' | 'Split'
  repaymentType: '',
  fixedRatePeriod: '',
  interestOnlyPeriod: '',
  // Split loan — FLAT fields on the object, NOT a nested array:
  split1Amount: '', split1Type: '', split1RateType: '', split1FixedYears: '', split1IOYears: '',
  split2Amount: '', split2Type: '', split2RateType: '', split2FixedYears: '', split2IOYears: '',
  hasOffset: false,
  hasRedraw: false,
  // Ownership:
  ownershipRows: [{ id, type: 'applicant'|'other', applicantId, name, percentage }],
  guarantors: [],
  crossCollateralise: false,
}
```

---

## Critical Data Access Patterns

```js
// Ownership — field is ownershipRows (NOT sec.owners), use row.name / row.percentage (NOT row.pct):
sec.ownershipRows.map(o => `${o.name} (${o.percentage}%)`)

// Split loan — fields are flat on the security object (NOT a nested array):
sec.split1Amount, sec.split1Type, sec.split1RateType, sec.split1FixedYears, sec.split1IOYears

// Equity source — resolve integer index to actual security object:
const srcSec = formData.securities[parseInt(sec.equityPropertyIndex)];

// Cashout equity available (used in calculator panel):
const maxLVR80 = parseFloat(sec.propertyValue) * 0.8;
const availEq  = Math.max(0, maxLVR80 - parseFloat(parseCurrency(sec.currentLoanBalance)));

// Detect Refinance + Cashout combo:
const isRefCashout = sec.primaryTransactionTypes.includes('Refinance') &&
                     sec.secondaryTransactionTypes.includes('Cashout');
```

---

## Sub-Step Structure

Each security card has a `SubStepBar` with **2 sub-steps**:

### Sub-step 1 — "Property & Loan"

Field order (top to bottom):
1. **Property Address** — Google Places autocomplete
2. **Transaction Type** — Purchase / Refinance (large card buttons)
3. **Additional Features** — conditional on transaction type selected; pill toggles: Cashout, Construction, Off the Plan, Pre-approval, Vacant Land *(SMSF and Bridging excluded)*
4. **Occupancy + Application Type** — two-column row (Owner Occupied/Investment | Full Doc/Low Doc)
5. **Numbers Trio** — shaded box: `Property Value ($)` | `LVR (%)` | `Loan Amount ($)` — tri-directional, any two auto-fills third
6. **Purchase Details** — conditional on Purchase selected: State/Territory, First Home Buyer checkbox, New Home checkbox, purchase completion methods + amounts
7. **Cashout Breakdown** — conditional on Refinance + Cashout: Current Loan Balance, Cashout Amount (with "Use max →" shortcut)
8. **Next: Structure →** button

### Sub-step 2 — "Structure"

Loan Type matrix → Fixed/IO periods → Split details → Loan Term → Offset/Redraw → Ownership rows → Guarantors → Cross-collateralise → ← Back button

---

## Tri-Directional LVR Calculator

The numbers trio (Property Value, LVR%, Loan Amount) is fully fillable. Handler logic:

```js
// handlePropertyValueChange — value entered, loan known → calc LVR
// handleLoanAmountChange    — loan entered, value known → calc LVR
// handleLvrChange           — LVR entered:
//   if propertyValue known → loanAmount = value * (lvr / 100)
//   if loanAmount known    → propertyValue = loan / (lvr / 100)

const handleLvrChange = (index, value) => {
  const lvrNum = parseFloat(value) || 0;
  const updates = { lvr: value };
  if (lvrNum > 0 && lvrNum <= 100) {
    const propVal = parseFloat(security.propertyValue) || 0;
    const loanAmt = parseFloat(security.loanAmount) || 0;
    if (propVal > 0)      updates.loanAmount = Math.round(propVal * lvrNum / 100).toString();
    else if (loanAmt > 0) updates.propertyValue = Math.round(loanAmt / (lvrNum / 100)).toString();
  }
  updateSecurityFields(index, updates);
};
```

LVR is **read-only** when `isRefinanceCashout(security)` is true — auto-calculated from balance + cashout.

---

## Inline Calculator Panel

Each security card has an **inline right-side calculator panel**, toggled via the `📊 ◀/▶` button in the card header (`headerActions` prop on SmartCard).

**State:**
```js
const [secCalcOpen, setSecCalcOpen] = useState({});           // keyed by security.id
const toggleSecCalc = (id) => setSecCalcOpen(prev => ({ ...prev, [id]: !prev[id] }));
const calcOpen = secCalcOpen[security.id] || false;
```

**Layout when open:**

```jsx
<div style={{ display: 'flex', alignItems: 'flex-start' }}>
  <div style={{ flex: 1, minWidth: 0, paddingRight: calcOpen ? '20px' : '0' }}>
    {/* main form content */}
  </div>
  {calcOpen && (
    <div style={{ width: '260px', flexShrink: 0, borderLeft: '1px solid var(--border-primary)', paddingLeft: '20px' }}>
      {isPurchase    && <FundsToCompleteCard security={security} allSecurities={formData.securities} />}
      {isRefCashout  && <EquityCalcContent security={security} />}
      {!isPurchase && !isRefCashout && <p>Select a transaction type to see calculations.</p>}
    </div>
  )}
</div>
```

**`EquityCalcContent`** — shows property value, max 80% LVR, current balance, available equity, over-equity warning.

**`FundsToCompleteCard`** — shows deposit, stamp duty (per-state brackets), transfer fees, legal fees, building inspection, confirmed funds (savings + gift + FHOG), surplus/shortfall.

Each security has its own independent panel state. No global focus tracking needed.

---

## Stamp Duty / FHOG Data

All stamp duty brackets, FHB concessions, and FHOG data are hardcoded constants in the component for all 8 AU states/territories (`SD_BRACKETS`, `FHB_CONCESSIONS`, `FHOG_DATA`). `calcStampDuty()`, `calcFHOG()`, `calcTransferFees()` are pure functions — no API calls.

---

## Conditional Rendering Rules

| Condition | What shows |
|---|---|
| `primaryTransactionTypes.length > 0` | Additional Features pills |
| `primaryTransactionTypes.includes('Purchase')` | Purchase Details section |
| `isRefinanceCashout(security)` | Cashout Breakdown section; LVR read-only; Total Loan label |
| `loanType === 'Split'` | Split 1 and Split 2 sub-fields (sub-step 2) |
| `loanType === 'Interest Only'` | IO period selector (sub-step 2) |
| `repaymentType === 'Fixed'` | Fixed rate period selector (sub-step 2) |
| `purchaseCompletionMethods.includes('Equity from Existing Property')` | Equity source dropdown + preview |
| `purchaseCompletionMethods.includes('Gift from Family')` | Gift relationship selector |
| `isFirstHomeBuyer` | New Home checkbox |
| `clientType === 'New'` | Lead Source field |

---

## Equity Cross-Security Flow

When `purchaseCompletionMethods` includes `'Equity from Existing Property'`:
1. Dropdown shows all other securities by address
2. `sec.equityPropertyIndex` stores the integer index of the source security
3. If source security is Refinance + Cashout → display `cashoutAmount` as available equity
4. Otherwise → display `propertyValue * 0.8 - loanAmount` as available equity at 80% LVR
5. Resolve at render/submit: `formData.securities[parseInt(sec.equityPropertyIndex)]`
