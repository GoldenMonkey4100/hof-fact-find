# Step 1 — Applicants

> **Component:** `src/Step1-Applicants-Polished.jsx`
> **Load alongside:** [[Shared Core]]
> **APIs used:** `/api/extract-license` · `/api/upload-blob`

---

## Fields — Per Applicant (`formData.applicants[]`)

| Field | Key | Notes |
|---|---|---|
| First Name | `firstName` | Pre-filled from DL extraction |
| Last Name | `lastName` | Pre-filled from DL extraction |
| DOB | `dob` | `YYYY-MM-DD` — pre-filled from DL extraction |
| Mobile | `mobile` | |
| Email | `email` | |
| Residential Address | `residentialAddress` | Google Maps autocomplete |
| Years at Address | `yearsAtAddress` | |
| Previous Address | `previousAddress` | Shown if `yearsAtAddress` < 3 |
| Years at Previous Address | `yearsAtPreviousAddress` | |
| DL Front URL | `dlFrontUrl` | Vercel Blob URL — set after upload |
| DL Back URL | `dlBackUrl` | Vercel Blob URL — set after upload |

---

## DL Extraction — `POST /api/extract-license`

**Request:**
```json
{
  "front": "base64string...",
  "back": "base64string...",
  "frontType": "image/jpeg",
  "backType": "image/jpeg"
}
```

**Response:**
```json
{
  "firstName": "",
  "lastName": "",
  "middleName": "",
  "dob": "YYYY-MM-DD",
  "licenceNumber": "",
  "address": "",
  "expiryDate": "YYYY-MM-DD",
  "state": "NSW",
  "confidence": "high | medium | low"
}
```

**State format variations:** QLD uses separate card number + licence number. NSW, VIC, WA all differ in layout. Always surface `confidence` to the broker — they must review extracted values.

---

## Document Upload + AI Extraction Flow (DL)

1. User selects front + back images via `<input type="file">`
2. Display file previews
3. Click "Extract with AI" → POST to `/api/extract-license` with base64 images
4. Extracted fields pre-fill the form — broker reviews and corrects
5. Simultaneously: POST base64 to `/api/upload-blob` → receive Blob URL
6. Store Blob URLs: `applicant.dlFrontUrl` and `applicant.dlBackUrl`

Blob URLs must be stored **before Step 4 submission** — they are collected by `collectDocumentFiles(formData)` in `notion-submit.js`.

### Blob Upload Request Shape
```json
{ "base64": "...", "filename": "dl-front-1234567890.jpg", "contentType": "image/jpeg" }
// Response: { "url": "https://blob.vercel-storage.com/..." }
```

Max body size configured: `export const config = { api: { bodyParser: { sizeLimit: '12mb' } } }`

---

## Multi-Applicant Tab Pattern

Horizontal tab bar to switch between applicants. Active applicant index is local state in the component. Tab label = `applicant.firstName + ' ' + applicant.lastName` or `"Applicant N"` if not yet entered. Tab count = `formData.numApplicants + formData.numGuarantors`.

---

## Address Autocomplete

`src/AddressAutocomplete.jsx` uses a `callback=__onMapsLoad` bridge pattern — the Maps script is loaded with a global callback that resolves a promise. Requires `VITE_GOOGLE_MAPS_KEY` (must be `VITE_` prefixed for client-side Vite access).
