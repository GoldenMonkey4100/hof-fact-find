# CLAUDE.md — Broker Fact Find

Five-step React 18 + Vite form for mortgage brokers to capture client loan data and submit to Mercury CRM. Deployed on Vercel with serverless API functions. Includes a Quick Fact Find lightweight flow for early lead capture.

## Commands

```bash
npm run dev      # Vite dev server → localhost:5173
npm run build    # Production build → dist/
vercel dev       # Test API functions locally (requires Vercel CLI)
```

## Architecture

`src/main.jsx` → `src/App.jsx` owns all state as a single `formData` object, passed down to each step via props.

**Screen routing** (`src/App.jsx`): `screen` state — `'welcome' | 'full' | 'quick'`
- `welcome`: `src/pages/WelcomeScreen.jsx` — two cards: Full Fact Find / Quick Fact Find
- `full`: steps 0–4 wrapped in a 264px left sidebar (`src/components/Sidebar.jsx`-equivalent inline layout)
- `quick`: `src/pages/QuickFactFind.jsx` — standalone lead capture form

**Step components:**

| Component | Purpose |
|-----------|---------|
| `src/steps/Step0-LoanStrategy.jsx` | Securities array, loan structure, transaction types, lender preference |
| `src/steps/Step1-Applicants.jsx` | Applicant records, DL upload + Claude vision extraction, address autocomplete |
| `src/steps/Step2-Employment.jsx` | Employment records; applicant name tabs; multi-select employment type pills (array) |
| `src/steps/Step3-AssetsLiabilities.jsx` | Accordion per asset/liability category + sticky 240px net summary panel |
| `src/steps/Step4-Review.jsx` | Summary view + Mercury submit |

**Pages:** `src/pages/WelcomeScreen.jsx`, `src/pages/QuickFactFind.jsx`

**Shared:** `SmartCard.jsx` (collapsible card + status badges), `AddressAutocomplete.jsx` (Google Maps Places)

**Utilities:** `src/lib/utils.js` — `BROKER_EMAILS`, `LEAD_SOURCES` (shared by Step0 and QuickFactFind), currency helpers

## API Functions (`api/` — Vercel serverless, ES modules)

| File | Purpose |
|------|---------|
| `submit.js` | `action:'quick-submit'` Quick FF lead → Mercury + Teams · `action:'submit'` Mercury + email/PDF + Teams |
| `documents.js` | HMAC password-gated document proxy (password delivered via Teams card) |
| `upload-blob.js` | Receives base64 → PUT to Vercel Blob → returns URL |
| `extract-license.js` | Claude vision: driver's licence → structured JSON |
| `extract-payslip.js` | Claude vision: payslip → income fields |
| `mercury-search.js` | Mercury CRM contact lookup by email/phone (Step 1 banner) |
| `abn-lookup.js` | ABR JSONP ABN lookup proxy |
| `docuseal-send.js` | DocuSeal: initiate e-signature |
| `docuseal-status.js` | DocuSeal: check signing status |
| `docuseal-download.js` | DocuSeal: download signed PDF |

## Critical Data Shapes

```js
// formData.securities[] — one per property
{ id, address, propertyValue, loanAmount, lvr,
  primaryTransactionTypes[], secondaryTransactionTypes[],
  loanType,              // 'Principal & Interest' | 'Interest Only' | 'Split'
  split1Amount, split1Type, split1RateType,  // flat fields — NOT a nested array
  split2Amount, split2Type, split2RateType,
  ownershipRows: [{ id, type, applicantId, name, percentage }],  // NOT sec.owners / row.pct
  equityPropertyIndex,   // integer index into formData.securities[] — use parseInt()
  purchaseCompletionMethods[], guarantors[] }

// formData.applicants[] — one per person
{ id, firstName, lastName, dob, mobile, email,
  residentialAddress, yearsAtAddress, previousAddress,
  dlFrontUrl, dlBackUrl,                     // Vercel Blob URLs set after Step 1 extraction
  assets: [{ id, type, description, value, ownership }],
  liabilities: [{ id, type, description, amount, lender, limit }] }

// formData.employment[] — one per applicant
{ applicantId,
  currentEmployment: {
    employmentType: string[],   // ARRAY — multi-select (was string in older data; normalised in Step2)
    employer, role, startDate, baseIncome, payFrequency, payslipUrl
  },
  previousEmployments: [{ employer, startDate, endDate }] }
```

## Environment Variables

```
BLOB_READ_WRITE_TOKEN  VITE_GOOGLE_MAPS_KEY
ANTHROPIC_API_KEY      MERCURY_API_KEY       MERCURY_API_TOKEN
DOCUSEAL_API_KEY       DOCUMENT_SIGNING_SECRET
TEAMS_WEBHOOK_URL
SMTP_HOST=smtp.office365.com   SMTP_PORT=587
SMTP_USER=chris@houseoffinance.com.au
SMTP_PASS=[M365 app password]
SMTP_FROM=notifications@houseoffinance.com.au
```

## Known Gotchas

- Vercel Hobby plan: currently **10/12** API functions — 2 slots remaining
- `equityPropertyIndex` must be parsed: `formData.securities[parseInt(sec.equityPropertyIndex)]`
- Ownership field names: `row.name` and `row.percentage` (not `row.pct` or `sec.owners`)
- Split loan fields are flat on the security object (`sec.split1Amount`) — not a nested array
- `employment[i].currentEmployment.employmentType` is `string[]` — join with `' / '` before display

## Deep Docs

→ `../knowledge-base/01 - fact-find/` — step guides, design system, architecture, API reference
