# Payslip Extraction — AI Prompting Notes

## How It Works

`api/extract-payslip.js` sends payslip images to the Anthropic Claude API (vision). The prompt instructs Claude to return a structured JSON object.

## Key Extraction Fields

```json
{
  "employerName": "",
  "jobTitle": "",
  "employmentType": "PAYG",
  "payPeriodStart": "YYYY-MM-DD",
  "payPeriodEnd": "YYYY-MM-DD",
  "payFrequency": "Fortnightly",
  "grossThisPeriod": 0,
  "ytdGross": 0,
  "taxThisPeriod": 0,
  "hecsThisPeriod": 0,
  "netThisPeriod": 0,
  "superThisPeriod": 0,
  "annualisedGross": 0,
  "confidence": "high | medium | low",
  "notes": ""
}
```

## Common Payslip Formats in Australia

- **Xero Payroll** — most common for SMEs; YTD figures in right column
- **MYOB** — older format; YTD column labelled "Year to Date"
- **ADP / Micropay** — large employers; multiple deduction lines
- **Government (NSW/Vic payroll)** — custom formats, often PDF; high confidence usually achievable
- **Handwritten or non-standard** — flag as low confidence

## Prompt Tips

When refining the extraction prompt, be explicit about:
- Returning `null` (not 0) for fields not found on the payslip
- Distinguishing "current period" vs "YTD" columns — these are often adjacent and easy to swap
- Handling payslips where gross = net + tax (no separate gross line)
- Reading ABN from payslip header for self-employed/contractor payslips

## Driver's Licence Extraction

`api/extract-license.js` extracts from DL images:

```json
{
  "firstName": "",
  "lastName": "",
  "middleName": "",
  "dob": "YYYY-MM-DD",
  "licenceNumber": "",
  "address": "",
  "expiryDate": "YYYY-MM-DD",
  "state": "",
  "confidence": "high | medium | low"
}
```

Australian DL formats vary significantly by state — QLD uses card number + licence number; NSW, VIC, WA all differ. The AI handles most formats well but confidence should be shown to the broker.
