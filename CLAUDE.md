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

**Screen routing** (`src/App.jsx`): `screen` state — `'dashboard' | 'full' | 'quick' | 'compliance'`
- `dashboard`: `src/pages/Dashboard.jsx` — role-based routing; shows broker queue, analyst queue, or processor queue depending on `localStorage.hof_user.role`
- `full`: steps 0–4 wrapped in a 264px left sidebar
- `quick`: `src/pages/QuickFactFind.jsx` — standalone lead capture form (still submits to Mercury)
- `compliance`: `src/pages/ComplianceChecklist.jsx` — 57-item credit QA checklist, analyst role only; opened via `onStartQA` from AnalystDashboard; `complianceTarget` state holds `{ id, item }`

**Identity:** `src/lib/utils.js` → `PEOPLE` array (`{ name, email, role }`), `getStoredUser()` reads `localStorage.hof_user`. Migration from legacy `hof_broker` key is handled automatically.

**Role-based views:**
- `broker` → `BrokerDashboard` (inside Dashboard.jsx) — My Fact Finds, Full/Quick FF launch
- `analyst` → `src/pages/AnalystDashboard.jsx` — pending review queue, credit analysis panel
- `processor` → `src/pages/ProcessorDashboard.jsx` — lodgement queue, Mercury entry

**Fact find pipeline statuses:**
`draft` → `pending_review` → `in_review` → `pending_lodgement` → `[compliance QA]` → `lodged` → `approved`

`pending_lodgement` is set by ProcessorDashboard when LP work is complete. The analyst then opens `ComplianceChecklist` to complete the 57-item QA; on lodge the status moves to `lodged`.

**Step components:**

| Component | Purpose |
|-----------|---------|
| `src/steps/Step0-LoanStrategy.jsx` | Securities array, loan structure, transaction types, lender preference |
| `src/steps/Step1-Applicants.jsx` | Applicant records, DL upload + Claude vision extraction, address autocomplete |
| `src/steps/Step2-Employment.jsx` | Employment records; applicant name tabs; multi-select employment type pills (array) |
| `src/steps/Step3-AssetsLiabilities.jsx` | Accordion per asset/liability category + sticky 240px net summary panel |
| `src/steps/Step4-Review.jsx` | Summary view + "Submit to Credit Team" (internal handoff — no Mercury) |

**Pages:** `src/pages/Dashboard.jsx`, `src/pages/AnalystDashboard.jsx`, `src/pages/ProcessorDashboard.jsx`, `src/pages/QuickFactFind.jsx`, `src/pages/ComplianceChecklist.jsx`

**Shared:** `SmartCard.jsx` (collapsible card + status badges), `AddressAutocomplete.jsx` (Google Maps Places)

**Utilities:** `src/lib/utils.js` — `PEOPLE`, `ROLE_LABELS`, `getStoredUser()`, `LEAD_SOURCES`, currency helpers; `src/lib/checklist-data.js` — `CHECKLIST_ITEMS` (57-item array), `CATEGORIES`; `src/lib/scoring.js` — `calcScore`, `calcKpi`, `calcDeductions`, `itemDeduction`

## API Functions (`api/` — Vercel serverless, ES modules)

| File | Purpose |
|------|---------|
| `submit.js` | `action:'quick-submit'` Quick FF → Mercury + Teams · `action:'internal-submit'` Full FF internal handoff → Supabase status + Teams (no Mercury) · `action:'submit'` Full Mercury entry (used by Loan Processor) · `action:'save-compliance'` auto-save QA responses · `action:'complete-compliance'` finalise QA + set status to `lodged` |
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

## Supabase Schema (fact_finds table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `broker_email` | text | Owner |
| `broker_name` | text | |
| `status` | text | `draft \| pending_review \| in_review \| pending_lodgement \| lodged \| approved` |
| `form_data` | JSONB | Full broker form state |
| `client_name` | text | First applicant name (denormalised) |
| `mercury_url` | text | Set by Loan Processor after lodgement |
| `compliance_qa` | JSONB | Set by Credit Analyst QA: `{ reviewed_by, reviewed_by_name, reviewed_at, responses: { [id]: { result, note } }, score, kpi_contribution, lender, broker_name, override_note? }` |
| `mercury_title` | text | |
| `credit_analysis` | JSONB | Analyst fields: lender, product, rate, serviceability, writeup |
| `assigned_analyst` | text | Analyst email |
| `assigned_processor` | text | Processor email |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

> **Migrations required** (run once in Supabase SQL Editor):
> ```sql
> ALTER TABLE fact_finds
>   ADD COLUMN IF NOT EXISTS credit_analysis JSONB,
>   ADD COLUMN IF NOT EXISTS assigned_analyst TEXT,
>   ADD COLUMN IF NOT EXISTS assigned_processor TEXT;
>
> -- Compliance QA (run separately)
> ALTER TABLE fact_finds
>   ADD COLUMN IF NOT EXISTS compliance_qa JSONB;
> ```

## Known Gotchas

- Vercel Hobby plan: currently **10/12** API functions — 2 slots remaining
- `equityPropertyIndex` must be parsed: `formData.securities[parseInt(sec.equityPropertyIndex)]`
- Ownership field names: `row.name` and `row.percentage` (not `row.pct` or `sec.owners`)
- Split loan fields are flat on the security object (`sec.split1Amount`) — not a nested array
- `employment[i].currentEmployment.employmentType` is `string[]` — join with `' / '` before display

## Deep Docs

→ `../knowledge-base/01 - fact-find/` — step guides, design system, architecture, API reference
