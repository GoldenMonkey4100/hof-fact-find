# Income Verification Guide

## Payslip AI Extraction

The fact find uses Anthropic Claude vision to extract income data from payslip photos/PDFs uploaded in Step 2. The extracted fields are:

- Employer name
- Job title / position
- Employment type
- Pay period (start/end dates)
- Gross pay (this period)
- YTD gross income
- Pay frequency (weekly / fortnightly / monthly)
- Deductions (tax, HECS, other)
- Net pay

The broker **must review** extracted values before moving on — the AI will flag uncertainty but cannot guarantee accuracy.

---

## Annualisation Methods by Pay Frequency

When converting a single payslip to an annual income figure, use:

| Pay Frequency | Multiplier | Notes |
|---|---|---|
| Weekly | × 52 | |
| Fortnightly | × 26 | Most common in Australia |
| Monthly | × 12 | |
| Twice monthly (semi-monthly) | × 24 | Uncommon — confirm with broker |

**YTD method (preferred):** `Annual income = (YTD gross ÷ completed pay periods) × total pay periods in year`

Use YTD where available — it accounts for variable pay, bonuses, and pay rises mid-year.

---

## YTD Variance Flag

If the YTD-annualised income differs from the per-payslip-annualised income by more than **10%**, flag this to the broker. Common reasons:
- Salary increase during the year
- Bonus paid in one period
- Commission fluctuation
- Unpaid leave

---

## Employment Types — Lender Treatment

### PAYG (Permanent)
- Standard: 1 payslip within 90 days + employment letter or 2 payslips
- Most lenders: minimum 3–6 months in current role (or same industry)
- No probation: many lenders require probation period complete

### PAYG (Casual / Contractor)
- Typically 12 months employment history in same role/industry required
- 2 most recent payslips + last 2 years tax returns (lender dependent)
- Income averaged over 12–24 months

### Self-Employed (Sole Trader / Company Director)
- Minimum 2 years ABN registration (most lenders)
- Last 2 years personal + business tax returns + NOAs
- Income = lower of 2-year average or most recent year (conservative lenders)
- Add-backs: depreciation, one-off expenses may be added back (lender specific)

### Self-Employed (Low Doc)
- 12 months BAS statements + accountant declaration or 6 months business bank statements
- Income based on declared amount, typically with loading/discount applied
- LVR cap: usually 80% max without LMI for Low Doc

---

## HECS Debt Detection

The AI extraction flags HECS/HELP deductions from payslips. In the form, HECS is captured in `liabilities.hecs[]`.

**Lender treatment:** Most lenders include HECS repayments in the UMI (uncommitted monthly income) calculation at the minimum ATO repayment rate, regardless of whether the payslip shows active deductions (threshold-based repayments vary by employer).

**ATO repayment thresholds (2024–25):**
- Repayments begin at $54,435 taxable income
- Rate scales from 1% to 10% depending on income band
- Use ATO repayment tables for accurate UMI impact

---

## Rental Income

- Owner-occupied → Investment refinance: existing rental income from rental history / lease
- New purchase (investment): rental estimate from property manager's appraisal letter
- **Shading:** Most lenders apply 80% of gross rental income for servicing; some use 75%
- Negative gearing benefit: only some lenders factor this in

---

## Other Income Types

| Type | Typical Lender Treatment |
|---|---|
| Overtime / allowances | 100% if regular (2 years history) or 50% if irregular |
| Commission / bonus | 2-year average, 100% of average |
| Centrelink / FTB | 100% if ongoing (child must be < 13 yrs for FTB) |
| Child support received | 100% if 12+ months consistent, with court order or CSA agreement |
| Investment income (dividends) | 2-year average from tax returns |
| Foreign income | Currency risk — typically haircut applied; must be converting to AUD |

---

## Document Checklist (Income)

- [ ] Last 2 payslips (PAYG)
- [ ] Employment letter / contract (new role or for confirmation)
- [ ] Last 2 years individual tax returns + NOAs (self-employed or complex income)
- [ ] Last 2 years company / trust tax returns + financials (self-employed)
- [ ] Last 12 months BAS (Low Doc / self-employed alternative)
- [ ] Rental statement or property manager appraisal (rental income)
- [ ] Centrelink income statement (government benefits)
- [ ] Child support agreement + 12 months bank statements (child support)
