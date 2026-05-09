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
| Client Type | `clientType` | select | **New / Existing** — pill toggle |
| Lead Source | `leadSource` | text | Shown only when `clientType === 'New'` |
| Number of Applicants | `numApplicants` | number | 1–4 |
| Number of Guarantors | `numGuarantors` | number | 0–2 |
| Applicant Type | `applicantType` | select | Natural Person / Company |
| Priority | `priority` | select | **Medium / High / Urgent** — colour-coded pill toggle |
| Lender Preference | `lenderPreference` | string[] | Multi-select by tier; flows directly to Notion `Lender` property |
| Broker Notes | `brokerNotes` | textarea | |

> **Note:** "Family & Friends" was removed from Client Type. "Low" was removed from Priority.

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
| State | `state` | select | AU state/territory — inside calculator panel (Purchase) |
| First Home Buyer | `isFirstHomeBuyer` | boolean | Inside calculator panel (Purchase) |
| New Home | `isNewHome` | boolean | Inside calculator panel; shown when `isFirstHomeBuyer` is true |
| Purchase Completion Methods | `purchaseCompletionMethods` | string[] | Inside calculator panel; Own Savings / Gift from Family / Equity from Existing Property / First Home Owner Grant / Other |
| Purchase Completion Amounts | `purchaseCompletionAmounts` | object | Keyed by method name |
| Gift Relationship | `giftRelationship` | text | Inside calculator panel; shown when 'Gift from Family' selected |
| Equity Property Index | `equityPropertyIndex` | integer | Index into `securities[]` for equity source property |
| Current Loan Balance | `currentLoanBalance` | currency | Inside calculator panel (Refinance + Cashout) |
| Cashout Amount | `cashoutAmount` | currency | Inside calculator panel (Refinance + Cashout) |
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

> **Note:** Guarantors and Cross-Collateralise fields exist in the data shape but UI sections are temporarily hidden (removed from Sub-step 2 view pending redesign).

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
  guarantors: [],           // data kept; UI hidden
  crossCollateralise: false, // data kept; UI hidden
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
3. **Intended Occupancy + Application Type** — two-column row (Owner Occupied/Investment | Full Doc/Low Doc)
4. **Additional Features** — conditional on transaction type selected; pill toggles: Cashout, Construction, Off the Plan, Pre-approval, Vacant Land *(SMSF and Bridging excluded)*
5. **Numbers Trio** — shaded box: `Property Value ($)` | `LVR (%)` | `Loan Amount ($)` — tri-directional, any two auto-fills third
6. **Next: Structure →** button

> **Purchase Details and Refinance+Cashout fields are inside the Calculator Panel** (see below), not in the main form.

### Sub-step 2 — "Structure"

Loan Type matrix → Fixed/IO periods → Split details → Loan Term → Offset/Redraw → Ownership tiles → ← Back button

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

## Calculator Panel

Each security card has an inline **below-form calculator panel**, toggled via the `📊 ◀/▶` button in the card header (`headerActions` prop on SmartCard).

**The panel only renders when open** — no empty container is shown before the user clicks the button.

**Auto-triggers:** Selecting Purchase or Cashout automatically opens the calculator panel for that security.

**State:**
```js
const [secCalcOpen, setSecCalcOpen] = useState({});           // keyed by security.id
const toggleSecCalc = (id) => setSecCalcOpen(prev => ({ ...prev, [id]: !prev[id] }));
const calcOpen = secCalcOpen[security.id] || false;

// Auto-open on Purchase or Cashout selection:
if (isAdding && (type === 'Purchase' || type === 'Cashout')) {
  const secId = securities[securityIndex].id;
  setSecCalcOpen(prev => ({ ...prev, [secId]: true }));
}
```

**Layout when open:**

The panel extends **downward** below the form using negative margins that cancel the card body's own padding, keeping content within `.sc` bounds so `overflow: hidden` never clips it:

```jsx
{calcOpen && (
  <div style={{
    margin: '20px -18px 0',      // cancels sc-body padding: 20px 18px 0
    borderTop: '2px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    padding: '20px 18px 24px',
  }}>
    {/* Header row with ✕ Close button */}

    {isPurchase && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left column: State, First Home Buyer, purchase completion methods + amounts */}
        {/* Right column: <FundsToCompleteCard /> — live stamp duty + funds breakdown */}
      </div>
    )}

    {isRefCashout && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left column: Current Loan Balance, Cashout Amount */}
        {/* Right column: <EquityCalcContent /> — available equity at 80% LVR */}
      </div>
    )}
  </div>
)}
```

> **Why negative margins?** `.sc` has `overflow: hidden`. A side-panel approach clips at the card edge. Extending downward within the card's own bounds with `margin: '20px -18px 0'` (which exactly cancels `.sc-body`'s `padding: 20px 18px 0`) fills the full card width without triggering the overflow clip.

**`EquityCalcContent`** — shows property value, max 80% LVR, current balance, available equity, over-equity warning.

**`FundsToCompleteCard`** — shows deposit, stamp duty (per-state brackets), transfer fees, legal fees, building inspection, confirmed funds (savings + gift + FHOG), surplus/shortfall.

Each security has its own independent panel state. No global focus tracking needed.

---

## Stamp Duty / FHOG Data

All stamp duty brackets, FHB concessions, and FHOG data are hardcoded constants in the component for all 8 AU states/territories (`SD_BRACKETS`, `FHB_CONCESSIONS`, `FHOG_DATA`). `calcStampDuty()`, `calcFHOG()`, `calcTransferFees()` are pure functions — no API calls.

---

## Property Ownership Tiles (Sub-step 2)

Ownership is displayed as a grid of color-coded tiles, one per owner.

**Color palette:** `OWNERSHIP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4']`

**Grid:** `repeat(auto-fill, minmax(175px, 1fr))` with `gap: 10px`

**Each tile contains:**
- 4px left color accent bar (absolute positioned)
- Owner name (read-only for applicants, editable input for "other" type)
- Role badge — "Applicant N" for applicants
- Percentage stepper: `[−]` · `[64px input]` · `[+]` — steps in increments of 5
- ✕ remove button (top-right, only shown for non-applicant owners)

**Controls below tiles:**
- Progress bar showing total ownership %
- Remaining/over label (e.g. "+15.0% remaining" or "−5.0% over")
- **= Equal Split** button — divides 100% equally across all owners
- **+ Add owner** dashed button — appends a new "other" type row

**`computeOwnershipRows()` helper** — merges stored ownership rows with the live applicant list. Called on render; result passed to tile grid.

**Critical field names:** `row.name`, `row.percentage` (NOT `row.pct`), `sec.ownershipRows` (NOT `sec.owners`).

---

## Conditional Rendering Rules

| Condition | What shows |
|---|---|
| `primaryTransactionTypes.length > 0` | Additional Features pills |
| `primaryTransactionTypes.includes('Purchase')` | Purchase column inside calculator panel |
| `isRefinanceCashout(security)` | Cashout column inside calculator panel; LVR read-only; Total Loan label |
| `calcOpen === true` | Calculator panel (below form) |
| `type === 'Purchase' \|\| type === 'Cashout'` selected | Calculator auto-opens |
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
