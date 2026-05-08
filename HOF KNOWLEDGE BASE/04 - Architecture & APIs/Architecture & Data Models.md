# Architecture & Data Models

## System Overview

```
Browser (React SPA)
    │
    │  fetch('/api/*')
    ▼
Vercel Serverless Functions (api/*.js)   ← max 12 on Hobby plan (currently 11)
    │
    ├── Notion REST API   →  Pipeline database
    ├── Anthropic API     →  Claude vision (DL / payslip extraction + voice field extraction)
    ├── Wispr Flow API    →  Voice transcription (audio → text)
    ├── Vercel Blob       →  Image storage (DL photos, payslip scans)
    ├── Mercury CRM API   →  Client lookup
    ├── ABR API           →  ABN validation
    └── DocuSeal API      →  E-signature
```

---

## Frontend (src/)

| File | Role |
|---|---|
| `main.jsx` | React entry — mounts `<App />` |
| `App.jsx` | Root component — owns all `formData` state, step navigation, submission logic, theme, VoiceBar |
| `Step0-LoanStrategy-Polished.jsx` | Step 0 — securities, loan structure, pill toggles for client type / priority / loan type |
| `Step1-Applicants-Polished.jsx` | Step 1 — applicants, DL upload + AI extraction |
| `Step2-Employment-Polished.jsx` | Step 2 — employment, payslip upload, pill toggles for employment type / pay frequency |
| `Step3-AssetsLiabilities-Polished.jsx` | Step 3 — assets and liabilities tables |
| `Step4-Review-Polished.jsx` | Step 4 — summary + submission trigger |
| `SmartCard.jsx` | Collapsible section card with Empty/In Progress/Complete status badge + chevron — used in all step files |
| `VoiceBar.jsx` | Floating voice input bar — recording states, transcript display, field application |
| `audioUtils.js` | Browser-side mic recorder — captures at 16kHz, encodes PCM WAV as base64 |
| `AddressAutocomplete.jsx` | Google Maps Places autocomplete |
| `mercuryApiService.js` | Mercury CRM API wrapper |
| `utils.js` | Shared utilities (`getBrokerEmail`, `formatCurrency`, etc.) |
| `styles.css` | Full design system — HOF brand CSS variables, light + dark themes, all utility classes |

The `*-Polished.jsx` files are the live components. The plain versions (e.g. `Step0-LoanStrategy.jsx`) are legacy/draft and not imported by `App.jsx`.

---

## Backend (api/)

All files are ES modules (`export default async function handler(req, res)`). Deployed as Vercel serverless functions.

> ⚠️ Vercel Hobby plan allows max **12** serverless functions. Currently at **11**. Do not add new separate `api/` files without consolidating.

| File | Purpose |
|---|---|
| `notion-submit.js` | Pipeline duplicate check + full Notion page creation |
| `upload-blob.js` | base64 → Vercel Blob → URL proxy |
| `extract-license.js` | Claude vision — parse driver's licence |
| `extract-payslip.js` | Claude vision — parse payslip + tax analysis |
| `voice.js` | Wispr Flow transcription + Claude field extraction (combined) |
| `mercury-search.js` | Mercury CRM client lookup |
| `abn-lookup.js` | ABR ABN validation proxy |
| `docuseal-send.js` | DocuSeal — initiate e-signature |
| `docuseal-status.js` | DocuSeal — check signing status |
| `docuseal-download.js` | DocuSeal — proxy signed PDF download |
| `adobe-sign.js` | Adobe Sign — send / status / download (legacy, combined handler) |

### `notion-submit.js` — Main pipeline integration

**Two actions:**
- `action: 'check'` — searches existing pipeline pages by applicant name, returns `{ exists, matches }`
- `action: 'submit'` — creates full Notion page with rich block layout

**Block building helpers:**
```js
rt(text, opts)          // rich text object
para(texts)             // paragraph block
h2(text) / h3(text)     // heading blocks
divider()               // horizontal rule
callout(emoji, texts, colour)
toggle(title, children)
table(rows)             // 3-column table (header row + data rows)
tableRow(cells)
imageBlock(url)
bookmarkBlock(url, caption)
toDo(text, checked)
colList(...cols)        // column_list — PAGE LEVEL ONLY
```

**Key constants:**
```js
PIPELINE_DB_ID = '264d5849ccf68068b10ffe2b2d18125f'
BROKERS_DB_ID  = '87ea47cb17de4ca9856fbccd2c4f360a'
RITA_USER_ID   = '263d872b-594c-81bf-8c33-00024f1c5613'  // ⚠️ verify this ID
```

**Critical data access patterns:**
```js
// Ownership (NOT sec.owners):
sec.ownershipRows.map(o => `${o.name} (${o.percentage}%)`)

// Split loan (flat fields, NOT array):
sec.split1Amount, sec.split1Type, sec.split1RateType, sec.split1FixedYears, sec.split1IOYears

// Equity source resolution:
const srcSec = securities[parseInt(sec.equityPropertyIndex)];

// Document file collection:
collectDocumentFiles(formData)  // returns array for Files & media property
```

**esbuild / SmartCard JSX rule:** Each step wraps sections in `<SmartCard>` (from `./SmartCard`). When `SmartCard` is inside a `.map()`, the map callback MUST use explicit `=> { ... return (...); }` form, not implicit `=> (...)`. Implicit returns cannot declare variables for `summary`/`status` props. Also ensure every `<div>` opened inside a `SmartCard` is closed before `</SmartCard>` — esbuild will fail the build with a misleading tag-mismatch error if a `<div>` wrapper is left open.

### `voice.js` — Voice input combined handler

Dispatches on `action` field in POST body:

- `action: 'transcribe'` — forwards base64 WAV audio to Wispr Flow, returns `{ transcript }`
- `action: 'extract'` — sends transcript + step number to Claude Haiku, returns `{ fields }` (object of path → value pairs)

Field paths from extract (e.g. `"applicants[0].firstName"`) are applied to `formData` in `App.jsx` via `deepSet()`, which safely traverses nested arrays and objects without creating new array elements.

---

## formData Shape (root)

```js
{
  // Step 0
  applicantType, brokerName, brokerEmail, clientType, leadSource,
  numApplicants, numGuarantors, priority, brokerNotes,
  lenderPreference: [],   // string[]
  securities: [{ /* see Security shape */ }],

  // Step 1
  applicants: [{ /* see Applicant shape */ }],

  // Step 2
  employment: [{ applicantId, currentEmployments: [], previousEmployments: [] }],

  // Step 3
  assets: { realProperty: [], savings: [], superannuation: [], shares: [], vehicles: [] },
  liabilities: { creditCards: [], personalLoans: [], hecs: [], otherLiabilities: [] },

  // Metadata
  submittedAt: null,
  submittedBy: ''
}
```

See [[Step-by-Step Field Reference]] for complete field lists.

---

## Notion Page Layout Structure

When a submission is created, the Notion page has this block structure:

```
📋 [Applicant Name] — [Transaction Types] | [Lender]
Properties: Applicant, Status, Transaction Type, Client Type, Priority,
            Lender, Manager, Files & media, Application Received

Page blocks:
├── H2: 📊 Application Summary
│   ├── Callout: 💰 Financial Position (total security, loan, LVR, net equity)
│   ├── Callout: 📋 Application Details (type, priority, client type, lead source)
│   └── Callout: ✍️ E-Signature (bookmark to DocuSeal signed doc)
│
├── H2: 🏘️ Securities & Loan Structure
│   └── [For each security:]
│       ├── H3: Security N — Address
│       └── column_list (page-level)
│           ├── Column 1: Callout 📍 Property Details
│           ├── Column 2: Callout 🏦 Loan Structure
│           └── Column 3: Callout 📄 Transaction Details
│
├── H2: 👥 Applicants
│   └── [For each applicant:]
│       └── Toggle: Applicant Name
│           ├── Callout: Personal Details
│           ├── Callout: 🏠 Address History
│           └── [DL images if available]
│
├── H2: 💼 Employment
│   └── [For each applicant:]
│       └── Toggle: Employment — Applicant Name
│           ├── Callout: 🟢 Current Employment
│           └── Callout: Previous Employment (if any)
│
├── H2: 💰 Assets & Liabilities
│   ├── Table: Assets
│   └── Table: Liabilities + Net Position
│
└── H2: 📎 Documents
    └── Table: Document | Status | Details
```
