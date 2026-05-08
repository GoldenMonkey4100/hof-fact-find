# HOF Broker Fact Find — Project Overview

## What Is This?

A web-based digital fact find for HOF brokers. Brokers complete a structured multi-step form during or after client consultation — including voice dictation — then submit directly to a Notion pipeline page for the processing team.

**Live URL:** Deployed on Vercel (auto-deploys from `main` branch on GitHub)  
**Tech stack:** React 18 + Vite (frontend) · Vercel Serverless Functions (backend) · Notion API (CRM/pipeline) · Vercel Blob (file storage)

---

## Form Flow (5 Steps)

| Step | Name | Key Captures |
|---|---|---|
| 0 | Loan Strategy | Securities, lender preferences, transaction types, loan structure |
| 1 | Applicants | Personal details, ID documents (DL upload + AI extraction) |
| 2 | Employment | Employment history, payslips (upload + AI extraction) |
| 3 | Assets & Liabilities | Real property, savings, super, shares, vehicles, loans, credit cards, HECS |
| 4 | Review & Submit | Summary + duplicate check + Notion submission |

---

## Integrations

| Integration | Purpose |
|---|---|
| **Notion API** | Create pipeline page + set properties |
| **Vercel Blob** | Store DL and payslip images for permanent URLs |
| **Anthropic Claude API** | AI extraction from DL images, payslips, and voice transcripts |
| **Wispr Flow** | Voice-to-text transcription for broker dictation during fact find |
| **Mercury CRM** | Client lookup at start of form |
| **Google Maps Places** | Address autocomplete throughout form |
| **ABR (abr.business.gov.au)** | ABN validation for self-employed applicants |
| **DocuSeal** | E-signature sending, status check, download |
| **Adobe Sign** | E-signature (legacy/alternative — combined into `api/adobe-sign.js`) |

---

## Design System

The app uses the HOF brand visual identity:

- **Dark Luxe Black** `#12110D` — header, primary buttons
- **Royal Gold** `#CBB26B` — accents, active states, focus rings
- **Porcelain White** `#F5F4F2` — light mode background
- **Fonts:** Montserrat (headings/buttons) + Open Sans (body)
- **Light / Dark theme** toggle in header, persisted to localStorage

See [[Form UX Design Principles]] for full CSS variable reference and component patterns.

---

## Repository

**Local path:** `C:\Users\ck\OneDrive\Documents\Claude Code\`  
**GitHub:** `https://github.com/GoldenMonkey4100/hof-fact-find`  
**Branch:** `main` (auto-deploys to Vercel on push)  
**CLAUDE.md:** Located at project root — read this before any code work

---

## Key Contacts / IDs

- **Notion Pipeline DB:** `264d5849ccf68068b10ffe2b2d18125f`
- **Notion Brokers DB:** `87ea47cb17de4ca9856fbccd2c4f360a`
- **Processing Manager (Rita Khaya):** Notion person ID — verify via `notion-get-users` before hardcoding

---

## Vercel Plan Note

The project runs on Vercel's **Hobby plan**, which allows a maximum of **12 serverless functions**. Currently using 11. Do not add new separate files in `api/` without consolidating an existing pair first.

---

## Related Notes

- [[Architecture & Data Models]]
- [[API Endpoints Reference]]
- [[Form UX Design Principles]]
- [[Step-by-Step Field Reference]]
