# API Endpoints Reference

All endpoints are Vercel serverless functions at `/api/*`. ES module format — `export default async function handler(req, res)`.

> **Vercel Hobby plan limit:** 12 serverless functions. Current count: 11. Do not add new separate files without consolidating first.

---

## POST /api/notion-submit

**Duplicate check:**
```json
// Request
{ "action": "check", "formData": { ... } }

// Response — no match
{ "exists": false }

// Response — matches found
{ "exists": true, "matches": [{ "id": "...", "title": "...", "status": "...", "url": "..." }] }
```

**Submit:**
```json
// Request
{ "action": "submit", "formData": { ... } }

// Response
{ "pageUrl": "https://notion.so/...", "title": "Applicant Name — Transaction | Lender" }
```

---

## POST /api/upload-blob

```json
// Request
{ "base64": "...", "filename": "dl-front-1234567890.jpg", "contentType": "image/jpeg" }

// Response
{ "url": "https://blob.vercel-storage.com/..." }
```

Max body size: 12 MB (`export const config = { api: { bodyParser: { sizeLimit: '12mb' } } }`).

---

## POST /api/extract-license

```json
// Request
{
  "front": "base64string...",
  "back": "base64string...",
  "frontType": "image/jpeg",
  "backType": "image/jpeg"
}

// Response
{
  "firstName": "John", "lastName": "Smith", "middleName": "",
  "dob": "1985-03-15", "licenceNumber": "12345678",
  "address": "123 Main St, Sydney NSW 2000",
  "expiryDate": "2028-03-15", "state": "NSW", "confidence": "high"
}
```

---

## POST /api/extract-payslip

```json
// Request
{ "images": [{ "base64": "...", "mediaType": "image/jpeg" }] }

// Response
{
  "employeeName": "", "employerName": "", "employerABN": "", "jobTitle": "",
  "payFrequency": "fortnightly", "payDate": "YYYY-MM-DD",
  "grossPay": "3846.15", "netPay": "2731.15",
  "ytdGross": "84615.38", "ytdTax": "18000.00",
  "hoursWorked": "76", "baseHourlyRate": "",
  "payPeriodNumber": "22",
  "taxAnalysis": {
    "annualisedIncome": 100000, "annualisedTax": 24000, "expectedTax": 22000,
    "variance": 2000, "variancePct": 9.1,
    "flag": "higher_than_expected",
    "note": "Tax withheld is higher than standard rate — may indicate HECS/HELP debt or voluntary withholding"
  }
}
```

---

## POST /api/voice

Combined handler for voice input (replaces the previous `wispr-transcribe` and `voice-extract` endpoints).

**Transcribe audio:**
```json
// Request
{ "action": "transcribe", "audio": "base64WAVstring" }

// Response
{ "transcript": "The client is John Smith, PAYG employee at Acme Corp..." }
```

Forwards audio to Wispr Flow (`WISPR_FLOW_BASE_URL/api`, default `https://api.wisprflow.ai`).  
Audio must be 16kHz mono PCM WAV encoded as base64 — produced by `src/audioUtils.js`.

**Extract form fields from transcript:**
```json
// Request
{ "action": "extract", "transcript": "...", "step": 0 }
// step: 0=LoanStrategy, 1=Applicants, 2=Employment, 3=Assets

// Response
{
  "fields": {
    "applicants[0].firstName": "John",
    "applicants[0].lastName": "Smith",
    "securities[0].loanType": "Principal & Interest"
  }
}
```

Uses Claude Haiku with a step-specific field schema prompt.  
Field paths are applied to `formData` via `deepSet()` in `App.jsx`.

---

## POST /api/mercury-search

```json
// Request
{ "query": "John Smith" }

// Response
{ "clients": [{ "id": "...", "name": "John Smith", "email": "...", "phone": "...", "broker": "..." }] }
```

---

## GET /api/abn-lookup?abn=12345678901

```json
// Response
{ "entityName": "Acme Pty Ltd", "abn": "12 345 678 901", "gst": true, "status": "Active" }
```

---

## DocuSeal (e-signature)

### POST /api/docuseal-send

Initiates e-signature for Credit Guide. Returns `submissionId` stored on the applicant record.

### GET /api/docuseal-status?submissionId=...

Returns signing status: `pending` | `completed` | `declined`.

### GET /api/docuseal-download?submissionId=...&type=signed

Returns download URL for signed document. URL bookmarked in Notion page under E-Signature section.

---

## Adobe Sign (legacy — combined handler)

### POST /api/adobe-sign

Send agreement (previously `adobe-sign-send`):
```json
// Request
{ "signerName": "John Smith", "signerEmail": "...", "brokerName": "Yousif Jirjis" }
// Response
{ "agreementId": "...", "signingUrl": "...", "status": "OUT_FOR_SIGNATURE", "sentAt": "..." }
```

### GET /api/adobe-sign?action=status&agreementId=...

Returns agreement status (previously `adobe-sign-status`).

### GET /api/adobe-sign?action=download&agreementId=...&type=signed|audit

Proxies PDF download (previously `adobe-sign-download`).

---

## Environment Variables

| Variable | Used By | Notes |
|---|---|---|
| `NOTION_API_KEY` | `notion-submit.js` | Notion integration token |
| `BLOB_READ_WRITE_TOKEN` | `upload-blob.js` | Vercel Blob |
| `ANTHROPIC_API_KEY` | `extract-license.js`, `extract-payslip.js`, `voice.js` | Claude API |
| `MERCURY_API_KEY` | `mercury-search.js` | Mercury CRM |
| `DOCUSEAL_API_KEY` | `docuseal-*.js` | DocuSeal e-signatures |
| `VITE_GOOGLE_MAPS_KEY` | `AddressAutocomplete.jsx` | Client-side — must be `VITE_` prefixed |
| `WISPR_FLOW_API_KEY` | `voice.js` | Wispr Flow transcription |
| `WISPR_FLOW_BASE_URL` | `voice.js` | Optional override, default `https://api.wisprflow.ai` |
| `ADOBE_SIGN_API_KEY` | `adobe-sign.js` | Legacy — Adobe Sign integration key |
| `ADOBE_SIGN_API_BASE` | `adobe-sign.js` | Legacy — e.g. `api.na4.adobesign.com` |

All environment variables must be set in Vercel project settings → Environment Variables.
