import Anthropic from '@anthropic-ai/sdk';

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
- Return empty string for any field not clearly visible on the payslip`
          }
        ]
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not extract payslip data', raw });

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('extract-payslip error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
