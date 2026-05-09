# Step 4 — Review & Submit

> **Component:** `src/Step4-Review-Polished.jsx`
> **Main API:** `api/notion-submit.js`
> **Load alongside:** [[Shared Core]]
> **Deep ref:** [[Notion Integration Guide]] (troubleshooting, full block constraint details)

---

## Submission Flow

Two-phase flow managed in `App.jsx`:

**Phase 1 — Duplicate check:**
```js
POST /api/notion-submit
{ "action": "check", "formData": { ... } }
// → { "exists": false }
// → { "exists": true, "matches": [{ "id", "title", "status", "url" }] }
```

**Phase 2 — Create page:**
```js
POST /api/notion-submit
{ "action": "submit", "formData": { ... } }
// → { "pageUrl": "https://notion.so/...", "title": "..." }
```

---

## Submission UX (App.jsx overlays)

Three modal states rendered in `App.jsx` (not inside the step component):
1. **Duplicate found** — lists matching pipeline entries; broker can create anyway or cancel
2. **Success** — "Open in Notion →" link to new page
3. **Error** — raw error message for debugging

Loading states: "checking" and "submitting" disable the submit button and show a spinner.

---

## Notion Page Properties

| Property | Type | Value |
|---|---|---|
| `Applicant` | title | Applicant name(s) |
| `Application Received` | date | `submittedAt` ISO timestamp |
| `Status` | status | `"Pending Assignment"` (hardcoded) |
| `Transaction Type` | multi_select | `primaryTransactionTypes` from each security |
| `Client Type` | multi_select | `clientType` |
| `Priority` | select | `priority` |
| `Lender` | multi_select | `lenderPreference[]` — sent as-is, no filtering |
| `Manager` | person | Rita Khaya — set via Notion user ID |
| `Files & media` | files | DL + payslip Blob URLs (type: `external`) |
| `Broker` | relation | Linked from Brokers DB by broker email |

---

## Key Constants in `notion-submit.js`

```js
PIPELINE_DB_ID = '264d5849ccf68068b10ffe2b2d18125f'
BROKERS_DB_ID  = '87ea47cb17de4ca9856fbccd2c4f360a'
RITA_USER_ID   = '263d872b-594c-81bf-8c33-00024f1c5613'
```

> ⚠️ **Rita's user ID is unverified.** Two candidates:
> - Code currently uses: `263d872b-594c-81bf-8c33-00024f1c5613`
> - Template showed: `221d872b-594c-811c-95bf-0002f22fb09c`
>
> Verify via `notion-get-users` MCP tool before relying on this.

---

## Notion Page Layout Structure

```
📋 [Applicant Name] — [Transaction Types] | [Lender]

├── H2: 📊 Application Summary
│   ├── Callout: 💰 Financial Position (total security value, total loan, blended LVR, net equity)
│   ├── Callout: 📋 Application Details (type, priority, client type, lead source, broker notes)
│   └── Callout: ✍️ E-Signature (bookmark to DocuSeal signed doc URL)
│
├── H2: 🏘️ Securities & Loan Structure
│   └── [Per security:]
│       ├── H3: Security N — Address
│       └── column_list  ← PAGE LEVEL ONLY (not inside toggle/callout)
│           ├── Column 1: Callout 📍 Property Details
│           ├── Column 2: Callout 🏦 Loan Structure
│           └── Column 3: Callout 📄 Transaction Details
│
├── H2: 👥 Applicants
│   └── Toggle: Applicant Name
│       ├── Callout: Personal Details
│       ├── Callout: 🏠 Address History
│       └── DL images (imageBlock — if Blob URLs present)
│
├── H2: 💼 Employment
│   └── Toggle: Employment — Applicant Name
│       ├── Callout: 🟢 Current Employment
│       └── Callout: Previous Employment (if any)
│
├── H2: 💰 Assets & Liabilities
│   ├── Table: Assets
│   └── Table: Liabilities + Net Position
│
└── H2: 📎 Documents
    └── Table: Document | Status | Details
```

---

## Block Building Helpers (`notion-submit.js`)

```js
rt(text, opts)             // rich text object
para(texts)                // paragraph block
h2(text) / h3(text)        // heading blocks
divider()                  // horizontal rule
callout(emoji, texts, colour)
toggle(title, children)    // max 96 children safe (100 hard limit)
table(rows)                // 3-column: header row + data rows
tableRow(cells)
imageBlock(url)            // external image
bookmarkBlock(url, caption)
toDo(text, checked)
colList(...cols)           // column_list — PAGE LEVEL ONLY, not inside toggles or callouts
```

---

## Files & Media Collection

```js
// collectDocumentFiles(formData) — builds the Files & media property array
const docFiles = [];
for (const app of formData.applicants || []) {
  if (app.dlFrontUrl) docFiles.push({ name: `DL Front — ${app.firstName}`, type: 'external', external: { url: app.dlFrontUrl } });
  if (app.dlBackUrl)  docFiles.push({ name: `DL Back — ${app.firstName}`,  type: 'external', external: { url: app.dlBackUrl } });
}
for (const emp of formData.employment || []) {
  for (const ce of emp.currentEmployments || []) {
    if (ce.payslipUrl) docFiles.push({ name: `Payslip — Applicant ${emp.applicantId}`, type: 'external', external: { url: ce.payslipUrl } });
  }
}
properties['Files & media'] = { files: docFiles };
```

Blob URLs are stored in Step 1 (`applicant.dlFrontUrl`, `applicant.dlBackUrl`) and Step 2 (`currentEmployments[n].payslipUrl`). All must be uploaded **before** Notion submission.

---

## Duplicate Detection Logic

```js
const searchRes = await notion.search({
  query: primaryApplicantName,
  filter: { property: 'object', value: 'page' },
});
const matches = searchRes.results.filter(p => p.parent?.database_id === PIPELINE_DB_ID);
// If matches.length > 0 → return { exists: true, matches }
```

---

## DocuSeal E-Signature

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/docuseal-send` | POST | Initiate signing — returns `submissionId` |
| `/api/docuseal-status?submissionId=...` | GET | `pending` \| `completed` \| `declined` |
| `/api/docuseal-download?submissionId=...&type=signed` | GET | Returns download URL for signed PDF |

Signed doc URL is added as a `bookmarkBlock` inside the E-Signature callout in Application Summary.
