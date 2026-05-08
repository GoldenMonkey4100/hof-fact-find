# HOF Knowledge Base

> Obsidian vault for the HOF Broker Fact Find project. Import the parent folder into Obsidian.

---

## 📁 Sections

### [[Project Overview]]
System overview, integration map, key IDs, design system summary.

### 01 - UX & UI Design
- [[Form UX Design Principles]] — Design system, CSS variables, HOF brand palette, light/dark theme, pill toggles, voice input, component patterns
- [[Step-by-Step Field Reference]] — Complete field list for all 5 steps with data types and keys

### 02 - Income Verification
- [[Income Verification Guide]] — Annualisation methods, employment types, HECS, rental income, document checklist
- [[Payslip Extraction — AI Prompting Notes]] — AI extraction fields, common formats, DL extraction

### 03 - Bank Policies
- [[LVR & Lender Tiers]] — LVR thresholds, lender tier framework, genuine savings, serviceability buffer
- [[Transaction Type Policy Notes]] — Purchase, refinance, cashout, construction; First Home Buyer schemes; equity cross-security flow
- [[Loan Structure Options]] — P&I vs IO, fixed vs variable, split loans, offset, redraw

### 04 - Architecture & APIs
- [[Architecture & Data Models]] — System diagram, file map, formData shape, Notion page layout, Vercel function limit
- [[API Endpoints Reference]] — All `/api/*` endpoints with request/response shapes and env vars

### 05 - Notion Integration
- [[Notion Integration Guide]] — Database IDs, property schema, block constraints, duplicate detection, troubleshooting

---

## 🔑 Quick Reference

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
| Vercel function limit | 12 (Hobby plan) — currently using **11** |

---

## ⚠️ Known Issues / To Verify

- [ ] **Rita Khaya Notion user ID** — verify via `notion-get-users` MCP tool. Code uses `263d872b-594c-81bf-8c33-00024f1c5613` but template shows `221d872b-594c-811c-95bf-0002f22fb09c`
- [ ] **Full end-to-end test** — submit a complete fact find with split loan + equity source + all documents and verify Notion page is correct
- [ ] **Wispr Flow API endpoint** — add `WISPR_FLOW_API_KEY` to Vercel env vars. Default base URL is `https://api.wisprflow.ai` — verify this is correct once API access is confirmed; override via `WISPR_FLOW_BASE_URL` if needed
