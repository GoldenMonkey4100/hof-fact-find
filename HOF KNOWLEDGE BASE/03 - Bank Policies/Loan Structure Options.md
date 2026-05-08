# Loan Structure Options

## Repayment Types

### Principal & Interest (P&I)
- Each repayment reduces the loan balance
- Lower rate than IO at most lenders
- Required by most lenders for owner-occupied loans
- Investors increasingly required to revert to P&I after IO period ends

### Interest Only (IO)
- Repayments cover interest only; balance does not reduce
- Common for investment properties (cash flow management, tax strategy)
- APRA has restricted IO lending; most lenders cap IO at 5 years (10 years at some non-banks)
- IO rate loading: typically 0.10–0.30% above P&I rate
- Captured in fact find: `repaymentType` + `interestOnlyPeriod`

### Split Loan
- Loan split into two portions with different structures
- Most common: part fixed / part variable; or part P&I / part IO
- Captured in fact find as flat fields: `split1Amount`, `split1Type`, `split1RateType`, etc.
- Processing team uses this to set up two loan accounts at settlement

**In Notion:** The split loan breakdown must be clearly visible — the team creates two loan accounts based on these figures. Split details appear in the Loan Structure callout (🏦) within each security's Notion section.

---

## Rate Types

### Variable
- Rate moves with lender's standard variable rate (SVR)
- Offset accounts and redraw typically available
- Full flexibility: extra repayments, redraw, split allowed

### Fixed
- Rate locked for `fixedRatePeriod` years
- Limited extra repayments (typically $10k–$30k/year)
- Break costs apply if refinanced or sold during fixed period
- Offset generally not available (some lenders: offset available at higher rate)
- Captured: `fixedRatePeriod`

### Split (Rate)
- One portion fixed, one variable
- Provides certainty on part of debt while retaining flexibility on the other

---

## Loan Features

### Offset Account
- 100% offset: full balance in linked account offsets against loan balance for interest calculation
- Partial offset: less common
- Most effective on variable rate loans
- Captured: `sec.hasOffset`

### Redraw
- Access extra repayments made on the loan
- Available on most variable P&I loans
- Not available on fixed rate (typically)
- Captured: `sec.hasRedraw`

---

## Common Structures by Scenario

### PPOR — Simple Purchase
- Variable P&I + offset account
- 30-year term
- Offset for emergency fund / savings

### Investment — Cash Flow Focus
- IO for 5 years → P&I
- Variable or fixed (lender dependent)
- No offset (if fixed)

### Split — Hedge Against Rate Changes
- 60% fixed P&I + 40% variable P&I with offset
- Term: 30 years

### Investor Portfolio — Multiple Properties
- Cross-collateralise OR separate lenders per property
- HOF prefers **not** to cross-collateralise where avoidable — preserves flexibility
- IO on all investment loans to maximise cash flow

---

## Application Types

| Type | When | Income Required |
|---|---|---|
| Full Doc | Standard — PAYG or 2+ year self-employed | Payslips / Tax returns |
| Low Doc | < 2 years ABN or cannot provide full financials | BAS + accountant declaration |

Captured per security: `sec.applicationType`

---

## Loan Term

Standard: 30 years. Some lenders offer 25 or 35 years (non-bank). Shorter terms increase repayments but reduce total interest. Most investment loans run 30 years for cash flow.

Captured: `sec.loanTerm`
