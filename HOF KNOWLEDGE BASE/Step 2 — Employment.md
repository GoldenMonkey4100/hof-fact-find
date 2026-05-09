# Step 2 — Employment

> **Component:** `src/Step2-Employment-Polished.jsx`
> **Load alongside:** [[Shared Core]]
> **Domain refs:** [[Income Verification Guide]] · [[Payslip Extraction — AI Prompting Notes]]
> **APIs used:** `/api/extract-payslip` · `/api/upload-blob` · `/api/abn-lookup`

---

## Data Structure

One record per applicant in `formData.employment[]`:
```js
{
  applicantId: 1,
  currentEmployments: [{ /* see below */ }],
  previousEmployments: [{ /* see below */ }]
}
```

---

## Fields — Current Employment

| Field | Key | Notes |
|---|---|---|
| Employer Name | `employerName` | Pre-filled from payslip extraction |
| Job Title | `jobTitle` | Pre-filled from payslip extraction |
| Employment Type | `employmentType` | PAYG / Self-Employed / Contractor / Casual — pill toggle |
| Start Date | `startDate` | |
| Income | `income` | Pre-filled from payslip extraction (gross per annum) |
| Pay Frequency | `payFrequency` | Weekly / Fortnightly / Monthly — pill toggle |
| ABN | `abn` | Self-employed — validated via `/api/abn-lookup` |
| Payslip URL | `payslipUrl` | Vercel Blob URL — set after payslip upload |

## Fields — Previous Employment

| Field | Key | Notes |
|---|---|---|
| Employer Name | `employerName` | |
| ABN | `abn` | Included for previous self-employed roles |
| End Date | `endDate` | |

---

## Payslip Extraction — `POST /api/extract-payslip`

**Request:**
```json
{ "images": [{ "base64": "...", "mediaType": "image/jpeg" }] }
```

**Response:**
```json
{
  "employeeName": "",
  "employerName": "",
  "employerABN": "",
  "jobTitle": "",
  "payFrequency": "fortnightly",
  "payDate": "YYYY-MM-DD",
  "grossPay": "3846.15",
  "netPay": "2731.15",
  "ytdGross": "84615.38",
  "ytdTax": "18000.00",
  "hoursWorked": "76",
  "baseHourlyRate": "",
  "payPeriodNumber": "22",
  "taxAnalysis": {
    "annualisedIncome": 100000,
    "annualisedTax": 24000,
    "expectedTax": 22000,
    "variance": 2000,
    "variancePct": 9.1,
    "flag": "higher_than_expected",
    "note": "Tax withheld is higher than standard rate — may indicate HECS/HELP debt or voluntary withholding"
  }
}
```

Returns `null` (not `0`) for fields not found on the payslip.

---

## Document Upload + AI Extraction Flow (Payslip)

1. User selects payslip file(s) via `<input type="file">`
2. Display previews
3. Click "Extract with AI" → POST to `/api/extract-payslip`
4. Extracted fields pre-fill the form — broker reviews and corrects
5. POST base64 to `/api/upload-blob` → receive Blob URL
6. Store URL: `currentEmployments[n].payslipUrl`

Blob URLs must be stored **before Step 4 submission**.

---

## ABN Lookup — `GET /api/abn-lookup?abn=12345678901`

```json
{ "entityName": "Acme Pty Ltd", "abn": "12 345 678 901", "gst": true, "status": "Active" }
```

Triggered when the ABN field is filled for Self-Employed employment type.

---

## Pill Toggles in Step 2

- **Employment Type** (current + previous): PAYG / Self-Employed / Contractor / Casual
- **Pay Frequency**: Weekly / Fortnightly / Monthly
