# Transaction Type Policy Notes

## Transaction Types in the Fact Find

The fact find captures `primaryTransactionTypes` and `secondaryTransactionTypes` per security. These flow directly into the Notion `Transaction Type` property.

### Primary Types
- **Purchase** — new property acquisition
- **Refinance** — existing loan being replaced
- **Construction** — land + build or knockdown rebuild

### Secondary / Modifier Types
- **Cashout** — borrowing above existing debt to release cash
- **Equity Release** — drawing equity for investment or purchase (cross-security)
- **Debt Consolidation** — folding other liabilities into the mortgage

---

## Purchase

### Standard Purchase Flow
1. Property identified → contract exchanged → formal approval → settlement
2. Typical timeline: pre-approval (days) → formal (5–10 days after contracts) → settlement (42 days from exchange, or as negotiated)

### First Home Buyer Considerations
`isFirstHomeBuyer` and `isNewHome` flags are captured per security.

| Scheme | Applicability |
|---|---|
| FHBG (First Home Buyer Guarantee) | 5% deposit, no LMI, income-tested, price caps apply |
| FHSS (First Home Super Saver) | Up to $50k voluntary contributions released for deposit |
| State stamp duty concessions | Varies: VIC, NSW, QLD, WA all have different thresholds and conditions |
| HomeBuilder / similar grants | Check current state government programs |

### Purchase Completion Methods
Captured as `purchaseCompletionMethods[]` + `purchaseCompletionAmounts{}`:

| Method | Notes |
|---|---|
| Deposit (cash) | Must evidence in savings account |
| Equity from existing property | `equityPropertyIndex` links to source security |
| Gift | `giftRelationship` field; gift letter required; lender rules on genuine savings |
| FHSS release | ATO approval required; timing risk |
| Other | Free text captured in `purchaseCompletionOther` |

---

## Refinance

### Refinance Scenarios
- **Rate/lender change only:** No change to loan amount; simpler process; LVR based on current value
- **Refinance + cashout:** Loan amount increases; purpose of funds matters to lender
- **Refinance + debt consolidation:** Unsecured debts rolled in; most lenders require 6–12 months satisfactory repayment history on existing debts

### Cashout Purpose — Lender Policy
| Purpose | Typical Lender Appetite |
|---|---|
| Home improvements / renovation | Generally accepted |
| Investment (shares, managed funds) | Accepted with declaration |
| New property purchase (deposit) | Accepted — equity release |
| Business use | Some lenders restrict; may require business purpose declaration |
| Debt consolidation | Accepted with evidence of debts being cleared |
| No stated purpose | Some lenders cap at $50k or 80% LVR without stated purpose |

### Equity Release for Purchase (Cross-Security)
When a client is purchasing a new property using equity from an existing property:
1. Security 1 = existing property (refinance + cashout)
2. Security 2 = new purchase property
3. `Security 2.equityPropertyIndex` points to Security 1 (index 0)
4. Cash released from Security 1 becomes deposit/completion funds for Security 2

The Notion processing team must understand this link — the securities section in the Notion page explicitly shows "Equity Source: Security 1 — [address]".

---

## Construction

- Land and construction must typically be financed together (though some lenders allow separate)
- Progress draw structure: slab / frame / lockup / fixing / completion
- Builder's fixed-price contract required
- Interest-only during construction period (standard)
- Valuation at completion required for final draw

---

## Low Doc Cashout

Non-bank lenders may allow cashout under Low Doc but:
- Purpose declaration required
- LVR typically capped at 70–75% for Low Doc cashout
- Income must still be declared (accountant letter or BAS)
