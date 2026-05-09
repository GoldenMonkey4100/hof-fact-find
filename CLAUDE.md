# CLAUDE.md — Broker Fact Find

Five-step React 18 + Vite form for mortgage brokers to capture client loan data and submit to Notion. Deployed on Vercel with serverless API functions.

## Commands

```bash
npm run dev      # Vite dev server → localhost:5173
npm run build    # Production build → dist/
vercel dev       # Test API functions locally (requires Vercel CLI)
```

## Architecture

`src/main.jsx` → `src/App.jsx` owns all state as a single `formData` object, passed down to each step via props.

**Active step components** (plain non-Polished versions are deleted):

| Component | Purpose |
|-----------|---------|
| `Step0-LoanStrategy-Polished.jsx` | Securities array, loan structure, transaction types, lender preference |
| `Step1-Applicants-Polished.jsx` | Applicant records, DL upload + Claude vision extraction, address autocomplete |
| `Step2-Employment-Polished.jsx` | Employment records, payslip upload + Claude vision extraction, ABN lookup |
| `Step3-AssetsLiabilities-Polished.jsx` | Assets/liabilities tables |
| `Step4-Review-Polished.jsx` | Summary view, duplicate detection, Notion submit |

**Shared:** `SmartCard.jsx` (collapsible card + status badges), `VoiceBar.jsx` (floating voice input), `AddressAutocomplete.jsx` (Google Maps Places)

**Utilities:** `utils.js` (broker email map, currency, LVR calc), `mercuryApiService.js` (Mercury CRM wrapper), `audioUtils.js` (16kHz mono WAV encoding)

## API Functions (`api/` — Vercel serverless, ES modules)

| File | Purpose |
|------|---------|
| `notion-submit.js` | `action:'check'` duplicate detection · `action:'submit'` rich Notion page creation |
| `upload-blob.js` | Receives base64 → PUT to Vercel Blob → returns URL |
| `extract-license.js` | Claude vision: driver's licence → structured JSON |
| `extract-payslip.js` | Claude vision: payslip → income fields |
| `mercury-search.js` | Mercury CRM contact lookup by email/phone |
| `abn-lookup.js` | ABR JSONP ABN lookup proxy |
| `voice.js` | Wispr Flow transcription + Claude field extraction |
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
  dlFrontUrl, dlBackUrl }  // Vercel Blob URLs set after Step 1 extraction

// formData.employment[] — one per applicant
{ applicantId,
  currentEmployments:  [{ employerName, jobTitle, employmentType, startDate, income, payFrequency, payslipUrl }],
  previousEmployments: [{ employerName, abn, endDate }] }
```

## Environment Variables

```
NOTION_API_KEY  BLOB_READ_WRITE_TOKEN  VITE_GOOGLE_MAPS_KEY
ANTHROPIC_API_KEY  MERCURY_API_KEY  DOCUSEAL_API_KEY
WISPR_FLOW_API_KEY   # ⚠️ not yet added to Vercel env vars
```

## Known Gotchas

- `column_list` Notion blocks only work at **page level** — not inside toggle children
- Vercel Hobby plan: currently **11/12** API functions — consolidate before adding more
- `equityPropertyIndex` must be parsed: `formData.securities[parseInt(sec.equityPropertyIndex)]`
- Ownership field names: `row.name` and `row.percentage` (not `row.pct` or `sec.owners`)
- Split loan fields are flat on the security object (`sec.split1Amount`) — not a nested array

## Deep Docs

→ `../knowledge-base/01 - fact-find/` — step guides, design system, architecture, API reference, Notion integration
