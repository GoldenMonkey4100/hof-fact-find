/**
 * Voice input — combined handler (replaces wispr-transcribe + voice-extract)
 *
 * POST /api/voice  { action: 'transcribe', audio: base64WAV }
 *   → { transcript }
 *
 * POST /api/voice  { action: 'extract', transcript, step }
 *   → { fields }
 */

import Anthropic from '@anthropic-ai/sdk';

const STEP_SCHEMAS = {
  0: `Step 0 — Loan Strategy. Available fields:
- brokerName: string
- clientType: "New" | "Existing" | "Family & Friends"
- priority: "Urgent" | "High" | "Medium" | "Low"
- leadSource: string
- lenderPreference: array of strings
- brokerNotes: string
- securities[0].address: string
- securities[0].propertyValue: number (no $ or commas)
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
- applicants[1].firstName: string
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body || {};

  // ── Transcribe ─────────────────────────────────────────────────────────────
  if (action === 'transcribe') {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ error: 'audio (base64 WAV) required' });

    const apiKey = process.env.WISPR_FLOW_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'WISPR_FLOW_API_KEY not configured in Vercel environment variables' });

    const baseUrl = (process.env.WISPR_FLOW_BASE_URL || 'https://api.wisprflow.ai').replace(/\/$/, '');
    try {
      const response = await fetch(`${baseUrl}/api`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, format: 'wav', sample_rate: 16000 }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { text }; }
      if (!response.ok) return res.status(response.status).json({ error: data.error || data.message || text });
      const transcript = data.text ?? data.transcript ?? data.result ?? '';
      return res.status(200).json({ transcript });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Extract fields ─────────────────────────────────────────────────────────
  if (action === 'extract') {
    const { transcript, step } = req.body;
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
- Only include fields explicitly and clearly stated
- Use exact field path format as the key (e.g. "applicants[0].firstName")
- Numbers: plain digits, no currency symbols or commas

Transcript: "${transcript}"

JSON output:`
        }]
      });
      const raw = message.content[0].text.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      return res.status(200).json({ fields: match ? JSON.parse(match[0]) : {} });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'action must be transcribe or extract' });
}
