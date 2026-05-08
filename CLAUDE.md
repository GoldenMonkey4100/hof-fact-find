# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

Serverless functions in `api/` are deployed automatically by Vercel. To test them locally you need the Vercel CLI (`vercel dev`), which proxies both Vite and the API functions together.

## Architecture

Single-page React 18 app (Vite) deployed on Vercel. Five-step multi-page form for mortgage brokers to capture client data (loan strategy → applicants → employment → assets/liabilities → review/submit).

**Entry point:** `src/main.jsx` → `src/App.jsx`

`App.jsx` owns all state. It holds a single `formData` object and passes it + `updateFormData` down to each step. Submission uses a two-phase flow: first `action: 'check'` (duplicate detection), then `action: 'submit'` (create Notion page). Overlay modals handle success / duplicate / error states inside App.jsx itself.

**Active step components** (the `*-Polished.jsx` variants are in use; the plain ones are legacy):
- `Step0-LoanStrategy-Polished.jsx` — securities array, lender preferences, broker info
- `Step1-Applicants-Polished.jsx` — applicant records, DL upload + AI extraction, Blob upload
- `Step2-Employment-Polished.jsx` — employment records, payslip upload + AI extraction, Blob upload
- `Step3-AssetsLiabilities-Polished.jsx` — assets/liabilities tables
- `Step4-Review-Polished.jsx` — summary view + submit trigger

**API functions** (`api/` — all ES modules, Vercel serverless):
| File | Purpose |
|---|---|
| `notion-submit.js` | Main submit handler: duplicate check + rich Notion page creation |
| `upload-blob.js` | Proxy: receives base64 → PUT to Vercel Blob → returns URL |
| `extract-license.js` | Anthropic Claude vision: parse driver's licence images |
| `extract-payslip.js` | Anthropic Claude vision: parse payslip images |
| `mercury-search.js` | Mercury CRM client search |
| `abn-lookup.js` | ABR JSONP ABN lookup proxy |
| `docuseal-send.js` / `docuseal-status.js` / `docuseal-download.js` | DocuSeal e-signature flow |
| `adobe-sign-send.js` / `adobe-sign-status.js` / `adobe-sign-download.js` | Adobe Sign (legacy/alternative) |

**Other source files:**
- `src/utils.js` — shared helpers including `getBrokerEmail`
- `src/mercuryApiService.js` — Mercury CRM API wrapper
- `src/AddressAutocomplete.jsx` — Google Maps Places autocomplete component

## Environment Variables (required)

```
NOTION_API_KEY           # Notion integration token
BLOB_READ_WRITE_TOKEN    # Vercel Blob storage token
VITE_GOOGLE_MAPS_KEY     # Google Maps Places API (client-side, must be VITE_ prefixed)
ANTHROPIC_API_KEY        # Claude API for DL + payslip extraction
MERCURY_API_KEY          # Mercury CRM
DOCUSEAL_API_KEY         # DocuSeal e-signatures
```

## Key Data Structures

### formData.securities[] — one object per security property

```js
{
  id: 1,
  address: '',
  propertyValue: '',
  loanAmount: '',
  primaryTransactionTypes: [],   // e.g. ['Purchase', 'Refinance']
  secondaryTransactionTypes: [], // e.g. ['Cashout', 'Equity Release']
  applicationType: '',           // 'Full Doc' | 'Low Doc'
  loanType: '',                  // 'Principal & Interest' | 'Interest Only' | 'Split'
  repaymentType: '',
  // Split loan — stored as flat fields, NOT nested array:
  split1Amount: '', split1Type: '', split1RateType: '', split1FixedYears: '', split1IOYears: '',
  split2Amount: '', split2Type: '', split2RateType: '', split2FixedYears: '', split2IOYears: '',
  // Ownership — array of row objects:
  ownershipRows: [{ id, type: 'applicant'|'other', applicantId, name, percentage }],
  guarantors: [],              // array of applicant IDs (integers)
  equityPropertyIndex: '',     // integer index into formData.securities[] for equity source
  crossCollateralise: false,
  purchaseCompletionMethods: [],
  purchaseCompletionAmounts: {},
}
```

**Critical:** ownership is `sec.ownershipRows` (not `sec.owners`). Fields are `row.name` and `row.percentage` (not `row.pct`).

**Critical:** split loan fields are flat on the security object (`sec.split1Amount`, `sec.split2Amount`, etc.), not a nested array.

**Critical:** `equityPropertyIndex` is an integer index into `formData.securities[]` pointing to the property providing the equity — resolve it with `formData.securities[parseInt(sec.equityPropertyIndex)]`.

### formData.applicants[] — one object per applicant/guarantor

```js
{
  id: 1,
  firstName: '', lastName: '', dob: '',
  mobile: '', email: '',
  residentialAddress: '', yearsAtAddress: '',
  previousAddress: '', yearsAtPreviousAddress: '',
  dlFrontUrl: '',   // Vercel Blob URL (set after DL extraction in Step1)
  dlBackUrl: '',    // Vercel Blob URL
  // ... other personal fields
}
```

### formData.employment[] — one object per applicant's employment

```js
{
  applicantId: 1,
  currentEmployments: [{
    employerName: '', jobTitle: '', employmentType: '',  // PAYG / Self-Employed / etc.
    startDate: '', income: '', payFrequency: '',
    payslipUrl: '',   // Vercel Blob URL (set after payslip extraction in Step2)
    // ...
  }],
  previousEmployments: [{
    employerName: '', abn: '', endDate: '', // ABN included for previous employment
    // ...
  }]
}
```

## Notion Integration

**Databases:**
- Pipeline DB: `264d5849ccf68068b10ffe2b2d18125f`
- Brokers DB: `87ea47cb17de4ca9856fbccd2c4f360a`

**Pipeline DB properties set on submission:**
`Applicant` (title), `Application Received` (date), `Status` → "Pending Assignment", `Transaction Type` (multi_select), `Client Type` (multi_select), `Priority` (select), `Lender` (multi_select — from `formData.lenderPreference`), `Manager` (person — Rita Khaya), `Files & media` (files — Blob URLs for DL/payslip images)

**Page layout** (`notion-submit.js`) uses rich block children: `column_list`, `callout`, `toggle`, `table`, `heading_2/3`, `bookmark`. Notion constraint: `column_list` can only appear at page level, not inside toggle children.

**Blob → Notion files:** DL images and payslips are uploaded to Vercel Blob in Step1/Step2 and their URLs stored on the applicant/employment record. `notion-submit.js` collects these via `collectDocumentFiles(formData)` and passes them as the `Files & media` property (type: `external`).

## Google Maps Integration

`AddressAutocomplete.jsx` uses a `callback=__onMapsLoad` bridge pattern — the Maps script is loaded with a global callback that resolves a promise. Requires `VITE_GOOGLE_MAPS_KEY`.

## Vercel Blob Upload Pattern

```js
// In api/upload-blob.js
const blobRes = await fetch(`https://blob.vercel-storage.com/${filename}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    'Content-Type': contentType,
    'x-content-type': contentType,
  },
  body: Buffer.from(base64, 'base64'),
});
```

Client sends `{ base64, filename, contentType }` to `/api/upload-blob`. Response is `{ url }`.
