# Step-by-Step Field Reference

## Step 0 — Loan Strategy

### Broker / Application Info
| Field | Key | Type | Notes |
|---|---|---|---|
| Broker Name | `brokerName` | text | Auto-filled from Mercury or manual |
| Broker Email | `brokerEmail` | text | Used as `submittedBy` |
| Client Type | `clientType` | select | Existing / New / Family & Friends |
| Lead Source | `leadSource` | text | |
| Number of Applicants | `numApplicants` | number | 1–4 |
| Number of Guarantors | `numGuarantors` | number | 0–2 |
| Applicant Type | `applicantType` | select | Natural Person / Company / Trust |
| Priority | `priority` | select | Low / Medium / High / Critical |
| Lender Preference | `lenderPreference` | string[] | Free-form, multi |
| Broker Notes | `brokerNotes` | textarea | Free-form |

### Per Security (`formData.securities[]`)
| Field | Key | Type | Notes |
|---|---|---|---|
| Address | `address` | text | |
| Property Value | `propertyValue` | currency | |
| Loan Amount | `loanAmount` | currency | |
| LVR | `lvr` | % | Auto-calculated |
| Primary Transaction Types | `primaryTransactionTypes` | string[] | Purchase / Refinance / Construction |
| Secondary Transaction Types | `secondaryTransactionTypes` | string[] | Cashout / Equity Release / Debt Consolidation |
| Intended Occupancy | `intendedOccupancy` | select | Owner Occupied / Investment |
| Application Type | `applicationType` | select | Full Doc / Low Doc |
| Loan Term | `loanTerm` | number (years) | |
| Loan Type | `loanType` | select | P&I / Interest Only / Split |
| Repayment Type | `repaymentType` | select | |
| Interest Only Period | `interestOnlyPeriod` | number (years) | |
| Fixed Rate Period | `fixedRatePeriod` | number (years) | |
| Split 1 Amount | `split1Amount` | currency | Only when Split |
| Split 1 Type | `split1Type` | select | P&I / IO |
| Split 1 Rate Type | `split1RateType` | select | Fixed / Variable |
| Split 1 Fixed Years | `split1FixedYears` | number | |
| Split 1 IO Years | `split1IOYears` | number | |
| Split 2 (same fields) | `split2*` | — | |
| Current Loan Balance | `currentLoanBalance` | currency | Refinance only |
| Cashout Amount | `cashoutAmount` | currency | Cashout only |
| State | `state` | select | For stamp duty |
| First Home Buyer | `isFirstHomeBuyer` | boolean | |
| New Home | `isNewHome` | boolean | |
| Purchase Completion Methods | `purchaseCompletionMethods` | string[] | Deposit / Equity / Gift / Other |
| Purchase Completion Amounts | `purchaseCompletionAmounts` | object | Keyed by method |
| Equity Property Index | `equityPropertyIndex` | integer | Index into `securities[]` |
| Gift Relationship | `giftRelationship` | text | |
| Has Offset | `hasOffset` | boolean | |
| Has Redraw | `hasRedraw` | boolean | |
| Ownership Rows | `ownershipRows` | OwnerRow[] | See below |
| Guarantors | `guarantors` | integer[] | Applicant IDs |
| Cross-Collateralise | `crossCollateralise` | boolean | |

#### OwnerRow shape
```js
{ id, type: 'applicant' | 'other', applicantId, name, percentage }
```

---

## Step 1 — Applicants

One record per applicant + guarantors. Each has:

| Field | Key | Notes |
|---|---|---|
| First Name | `firstName` | |
| Last Name | `lastName` | |
| DOB | `dob` | |
| Mobile | `mobile` | |
| Email | `email` | |
| Residential Address | `residentialAddress` | Google Maps autocomplete |
| Years at Address | `yearsAtAddress` | |
| Previous Address | `previousAddress` | Shown if < 3 yrs at current |
| Years at Previous Address | `yearsAtPreviousAddress` | |
| DL Front URL | `dlFrontUrl` | Blob URL, set post-extraction |
| DL Back URL | `dlBackUrl` | Blob URL, set post-extraction |

---

## Step 2 — Employment

One record per applicant. Each has `currentEmployments[]` and `previousEmployments[]`.

### Current Employment
| Field | Key | Notes |
|---|---|---|
| Employer Name | `employerName` | |
| Job Title | `jobTitle` | |
| Employment Type | `employmentType` | PAYG / Self-Employed / Contractor / Casual |
| Start Date | `startDate` | |
| Income | `income` | |
| Pay Frequency | `payFrequency` | Weekly / Fortnightly / Monthly |
| ABN | `abn` | Self-employed |
| Payslip URL | `payslipUrl` | Blob URL, set post-extraction |

### Previous Employment
| Field | Key | Notes |
|---|---|---|
| Employer Name | `employerName` | |
| ABN | `abn` | Included for self-employed previous roles |
| End Date | `endDate` | |

---

## Step 3 — Assets & Liabilities

### Assets
- `realProperty[]` — address, value, mortgage, equity, ownership
- `savings[]` — institution, balance, ownership
- `superannuation[]` — fund, balance, ownership
- `shares[]` — institution, value, ownership
- `vehicles[]` — make/model, value

### Liabilities
- `creditCards[]` — institution, limit, balance
- `personalLoans[]` — institution, balance, repayment
- `hecs[]` — balance
- `otherLiabilities[]` — description, balance, repayment
