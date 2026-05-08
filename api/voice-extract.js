// Uses Claude Haiku to parse a transcription and extract structured form field values.

import Anthropic from '@anthropic-ai/sdk';

const STEP_SCHEMAS = {
  0: `Step 0 — Loan Strategy. Available fields:
- brokerName: string (broker full name)
- clientType: "New" | "Existing" | "Family & Friends"
- priority: "Urgent" | "High" | "Medium" | "Low"
- leadSource: string (referral source)
- lenderPreference: array of strings (lender names)
- brokerNotes: string (free-text notes)
- securities[0].address: string
- securities[0].propertyValue: number (dollars, no $ or commas)
- securities[0].loanAmount: number
- securities[0].loanType: "Principal & Interest" | "Interest Only" | "Split"
- securities[0].intendedOccupancy: "Owner Occupied" | "Investment"
- securities[0].applicationType: "Full Doc" | "Low Doc"`,

  1: `Step 1 — Applicants. Available fields:
- applicants[0].firstName: string
- applicants[0].lastName: string
- applicants[0].dob: date YYYY-MM-DD
- applicants[0].mobile: string (e.g. 0412 345 678)
- applicants[0].email: string
- applicants[0].residentialAddress: string
- applicants[1].firstName: string (second applicant if mentioned)
- applicants[1].lastName: string`,

  2: `Step 2 — Employment. Available fields:
- employment[0].currentEmployments[0].employerName: string
- employment[0].currentEmployments[0].jobTitle: string
- employment[0].currentEmployments[0].employmentType: "PAYG" | "Self-Employed" | "Contractor" | "Casual" | "Part-Time" | "Unemployed" | "Retired"
- employment[0].currentEmployments[0].startDate: date YYYY-MM-DD
- employment[0].currentEmployments[0].baseIncome: number
- employment[0].currentEmployments[0].payFrequency: "weekly" | "fortnightly" | "monthly" | "annual"
- employment[0].currentEmployments[0].hoursPerWeek: number`,

  3: `Step 3 — Assets & Liabilities. Available fields:
- assets.savings[0].institution: string
- assets.savings[0].amount: number
- assets.vehicles[0].description: string
- assets.vehicles[0].value: number
- liabilities.creditCards[0].institution: string
- liabilities.creditCards[0].limit: number
- liabilities.creditCards[0].balance: number
- liabilities.personalLoans[0].institution: string
- liabilities.personalLoans[0].amount: number
- liabilities.personalLoans[0].repayment: number`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, step } = req.body || {};
  if (!transcript) return res.status(400).json({ error: 'transcript required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const schema = STEP_SCHEMAS[step ?? 0] ?? 'Extract any relevant mortgage application fields.';

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Extract mortgage fact-find data from a broker's dictation. Return ONLY valid JSON — no markdown, no commentary.

${schema}

Rules:
- Only include fields explicitly and clearly stated in the transcript
- Omit any field that is ambiguous or not mentioned
- Use exact field path format as the key (e.g. "applicants[0].firstName")
- Numbers should be plain digits with no currency symbols or commas

Transcript: "${transcript}"

JSON output:`
      }]
    });

    const raw = message.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const fields = match ? JSON.parse(match[0]) : {};
    return res.status(200).json({ fields });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
