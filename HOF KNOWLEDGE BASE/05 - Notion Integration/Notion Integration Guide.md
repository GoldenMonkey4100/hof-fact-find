# Notion Integration Guide

## Database IDs

| Database | ID |
|---|---|
| Pipeline | `264d5849ccf68068b10ffe2b2d18125f` |
| Brokers | `87ea47cb17de4ca9856fbccd2c4f360a` |

---

## Pipeline Database Properties

| Property | Type | Set By |
|---|---|---|
| `Applicant` | title | Applicant name(s) |
| `Application Received` | date | `submittedAt` ISO timestamp |
| `Status` | status | Hardcoded: "Pending Assignment" |
| `Transaction Type` | multi_select | `primaryTransactionTypes` from each security |
| `Client Type` | multi_select | `clientType` (Existing / New / Family & Friends) |
| `Priority` | select | `priority` (Low / Medium / High / Critical) |
| `Lender` | multi_select | `lenderPreference[]` — sent as-is, no filtering |
| `Manager` | person | Rita Khaya — set via Notion user ID |
| `Files & media` | files | DL + payslip Blob URLs (type: external) |
| `Broker` | relation | Linked from Brokers DB by broker email |
| `Assignee` | relation | Left for processing team to assign |
| `Days` | formula | Auto-calculated by Notion |

---

## Notion API Version

All requests use header: `Notion-Version: 2022-06-28`

---

## Block Type Constraints

### column_list
- **Can only appear at page-level block children** — NOT inside toggles, callouts, or other containers
- Each `column_list` contains `column` children, each with their own `children` array
- Used for side-by-side layout of security callouts (Property / Loan / Transaction)

### toggle
- Content goes in `children` array
- **Limit: 100 blocks** per toggle children array — use `.slice(0, 96)` as safety buffer
- Can contain tables, callouts, headings, paragraphs — but NOT column_list

### table
- Must specify `table_width` (number of columns)
- First row should have `is_header: true`
- Each row is a `table_row` with `cells: [[rich_text], [rich_text], ...]`

### image
- Type must be `external` for URLs: `{ type: 'external', external: { url } }`
- Blob URLs work as external images in Notion

### bookmark
- `{ type: 'bookmark', bookmark: { url, caption: [rich_text] } }`
- Used for DocuSeal e-sign links in the Application Summary section

---

## Files & Media Property

To attach DL and payslip images to the pipeline page:

```js
// In notion-submit.js — collectDocumentFiles(formData)
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

// Set on page properties:
properties['Files & media'] = { files: docFiles };
```

Files must be uploaded to Vercel Blob **before** Notion submission. The Blob URLs are stored on `applicant.dlFrontUrl`, `applicant.dlBackUrl`, and `employment[n].currentEmployments[n].payslipUrl`.

---

## Duplicate Detection Logic

Before creating a new page, `action: 'check'` searches the Pipeline database:

```js
// Search by applicant title containing the primary applicant's name
const searchRes = await notion.search({
  query: primaryApplicantName,
  filter: { property: 'object', value: 'page' },
});
// Filter to pages in the Pipeline database
const matches = searchRes.results.filter(p => p.parent?.database_id === PIPELINE_DB_ID);
```

If matches found: return them to the frontend. Broker can choose to create a new page anyway or cancel.

---

## Notion Page Icon & Cover

- **Icon:** `{ type: 'emoji', emoji: '📋' }`
- **Cover:** Not set (inherits database default or template)

---

## Rita Khaya — Manager Assignment

⚠️ **Verify the user ID before relying on it.**

The constant `RITA_USER_ID` in `notion-submit.js` should match Rita's actual Notion account UUID. To verify:

1. Load the `notion-get-users` MCP tool
2. Call it and find Rita Khaya's user ID
3. Update the constant if different from `263d872b-594c-81bf-8c33-00024f1c5613`

The template page showed `221d872b-594c-811c-95bf-0002f22fb09c` — one of these may be correct.

Set via:
```js
properties['Manager'] = { people: [{ id: RITA_USER_ID }] };
```

---

## Troubleshooting Common Errors

| Error | Cause | Fix |
|---|---|---|
| `[property] is not a property that exists` | Property deleted or renamed in Notion DB | Check DB schema — re-add the property or remove the mapping |
| `body failed validation` | Block structure invalid (e.g. column_list inside toggle) | Move column_list to page-level children |
| `Could not find block with ID` | Invalid parent block ID | Check that toggle/callout parent IDs are correct |
| `Request body too large` | Base64 image too big | Reduce image size before sending or increase body parser limit |
| Files & media blank in Notion | Blob upload failed or URLs not saved | Check `upload-blob.js` response; confirm `BLOB_READ_WRITE_TOKEN` is set |
