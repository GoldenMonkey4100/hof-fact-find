# HOF Knowledge Base

> Obsidian vault for the HOF Broker Fact Find project. Import the parent folder into Obsidian.

---

## How to Use

**Building or editing a step:** Load [[Shared Core]] + the relevant step file.
**Domain knowledge / training:** Load the specific domain file(s) from the library below.
**Deep architecture / API reference:** Load from `04 - Architecture & APIs/` or `05 - Notion Integration/`.

---

## Build Context Files

| File | When to load |
|---|---|
| [[Shared Core]] | Always — design system, SmartCard, formData shape, Vercel limits, Notion block rules |
| [[Step 0 — Loan Strategy]] | Working on securities, loan structure, transaction types, lender preference |
| [[Step 1 — Applicants]] | Working on applicant fields, DL extraction, address autocomplete |
| [[Step 2 — Employment]] | Working on employment, payslip extraction, ABN lookup |
| [[Step 3 — Assets & Liabilities]] | Working on assets/liabilities tables |
| [[Step 4 — Review & Submit]] | Working on Notion submission, page layout, DocuSeal, duplicate detection |

---

## Domain Knowledge Library

### 02 - Income Verification
- [[Income Verification Guide]] — Annualisation methods, employment types, HECS, rental income, document checklist
- [[Payslip Extraction — AI Prompting Notes]] — AI extraction fields, payslip formats, DL extraction fields

### 03 - Bank Policies
- [[LVR & Lender Tiers]] — LVR thresholds, lender tier framework, genuine savings, serviceability buffer
- [[Transaction Type Policy Notes]] — Purchase, refinance, cashout, construction, FHB schemes, equity cross-security flow
- [[Loan Structure Options]] — P&I vs IO, fixed vs variable, split loans, offset, redraw, common scenarios

#### Per-Lender Policies (subfolders — add as needed)
```
03 - Bank Policies/
  CBA/
  ANZ/
  NAB/
  Westpac/
  Macquarie/
  ING/
  Pepper/
  La Trobe/
  ...
```

### 04 - Architecture & APIs
- [[Architecture & Data Models]] — Full system diagram, file map, formData shape, Notion page layout
- [[API Endpoints Reference]] — All `/api/*` endpoints with request/response shapes

### 05 - Notion Integration
- [[Notion Integration Guide]] — DB schema, block constraints, duplicate detection, troubleshooting

---

## Quick Reference

| Thing | Value |
|---|---|
| Dev command | `npm run dev` |
| Build command | `npm run build` |
| Project path | `C:\Users\ck\OneDrive\Documents\Claude Code\` |
| GitHub | `https://github.com/GoldenMonkey4100/hof-fact-find` |
| Pipeline DB | `264d5849ccf68068b10ffe2b2d18125f` |
| Brokers DB | `87ea47cb17de4ca9856fbccd2c4f360a` |
| Main submit file | `api/notion-submit.js` |
| CLAUDE.md | `C:\Users\ck\OneDrive\Documents\Claude Code\CLAUDE.md` |
| Vercel function limit | 12 (Hobby) — currently **11** |

---

## ⚠️ Open Issues

- [ ] **Rita Khaya Notion user ID** — verify via `notion-get-users` MCP. Code uses `263d872b-594c-81bf-8c33-00024f1c5613`; template showed `221d872b-594c-811c-95bf-0002f22fb09c`
- [ ] **Full end-to-end test** — split loan + equity source + all documents → verify Notion page correct
- [ ] **Wispr Flow** — add `WISPR_FLOW_API_KEY` to Vercel env vars; confirm base URL `https://api.wisprflow.ai` is correct
