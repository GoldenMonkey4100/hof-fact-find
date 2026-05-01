import Anthropic from '@anthropic-ai/sdk';

// ── Australian income tax calculator (2024–25 FY) ─────────────────────────────
function calcAnnualTax(annualIncome) {
  let tax = 0;
  if (annualIncome <= 18200)       tax = 0;
  else if (annualIncome <= 45000)  tax = (annualIncome - 18200) * 0.19;
  else if (annualIncome <= 120000) tax = 5092 + (annualIncome - 45000) * 0.325;
  else if (annualIncome <= 180000) tax = 29467 + (annualIncome - 120000) * 0.37;
  else                             tax = 51667 + (annualIncome - 180000) * 0.45;

  // Low Income Tax Offset (LITO)
  let lito = 0;
  if (annualIncome <= 37500)       lito = 700;
  else if (annualIncome <= 45000)  lito = 700 - (annualIncome - 37500) * 0.05;
  else if (annualIncome <= 66667)  lito = 325 - (annualIncome - 45000) * 0.015;
  tax = Math.max(0, tax - lito);

  // Medicare Levy (2%)
  const medicare = annualIncome > 26000 ? annualIncome * 0.02 : 0;

  return Math.round(tax + medicare);
}

function calcTaxAnalysis(data) {
  try {
    const ytdGross = parseFloat(data.ytdGross);
    const ytdTax   = parseFloat(data.ytdTax);
    const periods  = parseInt(data.payPeriodNumber);
    const freq     = data.payFrequency;

    if (!ytdGross || !ytdTax || !periods || periods < 1) return null;

    const periodsPerYear = freq === 'weekly' ? 52 : freq === 'monthly' ? 12 : 26;
    const annualisedIncome = (ytdGross / periods) * periodsPerYear;
    const annualisedTax    = (ytdTax   / periods) * periodsPerYear;
    const expectedTax      = calcAnnualTax(annualisedIncome);
    const variance         = annualisedTax - expectedTax;
    const variancePct      = expectedTax > 0 ? (variance / expectedTax) * 100 : 0;

    // Flag if actual tax is >8% higher than expected (likely HECS/HELP or salary sacrifice)
    const flag = variancePct > 8  ? 'higher_than_expected'
               : variancePct < -8 ? 'lower_than_expected'
               : 'within_normal_range';

    return {
      annualisedIncome: Math.round(annualisedIncome),
      annualisedTax:    Math.round(annualisedTax),
      expectedTax,
      variance:         Math.round(variance),
      variancePct:      Math.round(variancePct * 10) / 10,
      flag,
      note: flag === 'higher_than_expected'
        ? 'Tax withheld is higher than standard rate — may indicate HECS/HELP debt or voluntary withholding'
        : flag === 'lower_than_expected'
        ? 'Tax withheld appears lower than expected — verify with applicant'
        : 'Tax withheld is consistent with standard Australian rates',
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images } = req.body || {};
  if (!images || !images.length) return res.status(400).json({ error: 'images array required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });

  try {
    const client = new Anthropic({ apiKey });

    const fileBlocks = images.map(({ base64, mediaType }) => {
      if (mediaType === 'application/pdf') {
        return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
      }
      return { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
    });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          ...fileBlocks,
          {
            type: 'text',
            text: `Extract data from this Australian employee payslip. Return ONLY valid JSON — no markdown, no explanation:
{
  "employeeName": "",
  "employerName": "",
  "employerABN": "",
  "jobTitle": "",
  "payFrequency": "",
  "payDate": "",
  "periodStart": "",
  "periodEnd": "",
  "grossPay": "",
  "netPay": "",
  "ytdGross": "",
  "ytdTax": "",
  "hoursWorked": "",
  "baseHourlyRate": "",
  "payPeriodNumber": ""
}
Rules:
- payFrequency must be exactly one of: "weekly", "fortnightly", "monthly", or "unknown"
- payDate, periodStart, periodEnd: YYYY-MM-DD format if visible, otherwise empty string
- grossPay: gross earnings for THIS pay period only (numeric, no $ or commas)
- ytdGross: year-to-date gross earnings (numeric, no $ or commas)
- ytdTax: year-to-date tax withheld (numeric, no $ or commas)
- netPay: take-home pay this period (numeric, no $ or commas)
- hoursWorked: ordinary hours worked this pay period (numeric)
- baseHourlyRate: base hourly pay rate if shown (numeric)
- payPeriodNumber: which pay period this is in the financial year (e.g. "15"), empty string if not shown
- jobTitle: the employee's job title or position as shown on the payslip, empty string if not shown
- employerABN: the employer's ABN as shown (digits only, no spaces), empty string if not visible
- Return empty string for any field not clearly visible on the payslip`
          }
        ]
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not extract payslip data', raw });

    const extracted = JSON.parse(jsonMatch[0]);

    // ── Australian tax validation ──────────────────────────────────────────────
    // Annualise ytdGross using pay period number, then compute expected tax.
    // Compare against annualised ytdTax to detect HECS/HELP or other deductions.
    const taxAnalysis = calcTaxAnalysis(extracted);

    return res.status(200).json({ ...extracted, taxAnalysis });
  } catch (err) {
    console.error('extract-payslip error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
