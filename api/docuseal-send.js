/**
 * DocuSeal — Send Credit Guide for e-signature
 *
 * POST /api/docuseal-send
 * Body: { signerName, signerEmail, signerPhone, brokerName, applicantRef }
 * Returns: { submissionId, signingUrl, status, sentAt }
 *
 * Environment variables (set in Vercel dashboard):
 *   DOCUSEAL_API_KEY              — API key from DocuSeal Settings → API
 *   DOCUSEAL_TEMPLATE_YOUSIF     — Template ID for Yousif Jirjis Credit Guide
 *   DOCUSEAL_TEMPLATE_LAITH      — Template ID for Laith Hana Credit Guide
 *   DOCUSEAL_TEMPLATE_MEHDI      — Template ID for Mehdi Amirilayeghi Credit Guide
 */

const BROKER_TEMPLATES = {
  'Yousif Jirjis':      process.env.DOCUSEAL_TEMPLATE_YOUSIF || '',
  'Laith Hana':         process.env.DOCUSEAL_TEMPLATE_LAITH  || '',
  'Mehdi Amirilayeghi': process.env.DOCUSEAL_TEMPLATE_MEHDI  || '',
};

const BROKER_EMAILS = {
  'Yousif Jirjis':      'yousif@houseoffinance.com.au',
  'Laith Hana':         'laith@houseoffinance.com.au',
  'Mehdi Amirilayeghi': 'mehdi@houseoffinance.com.au',
};

const API_BASE = 'https://api.docuseal.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { signerName, signerEmail, signerPhone, brokerName, applicantRef } = req.body || {};

  if (!signerName || !signerEmail)
    return res.status(400).json({ error: 'signerName and signerEmail are required' });
  if (!brokerName)
    return res.status(400).json({ error: 'brokerName is required' });

  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: 'DOCUSEAL_API_KEY not configured in Vercel environment variables' });

  const templateId = BROKER_TEMPLATES[brokerName];
  if (!templateId)
    return res.status(400).json({ error: `No Credit Guide template found for broker: ${brokerName}` });

  try {
    const submitterPayload = {
      role:       'Signer',
      name:       signerName,
      email:      signerEmail,
      // Pre-fill any template fields you've named in DocuSeal:
      values: {
        ...(applicantRef ? { 'Applicant Reference': applicantRef } : {}),
      },
    };
    if (signerPhone) submitterPayload.phone = signerPhone;

    const response = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: {
        'X-Auth-Token':  apiKey,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        template_id: parseInt(templateId, 10),
        send_email:  true,
        message: {
          subject: `Credit Guide — Please sign before we proceed`,
          body: `Hi ${signerName.split(' ')[0]},\n\nPlease review and sign the attached Credit Guide. This is required before we can run a credit check on your behalf.\n\nKind regards,\n${brokerName}\nHouse of Finance`,
        },
        submitters: [submitterPayload],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DocuSeal API error:', data);
      return res.status(500).json({ error: data.error || 'DocuSeal API error', details: data });
    }

    // DocuSeal returns an array of submitter objects (one per submitter)
    const submitter = Array.isArray(data) ? data[0] : data;
    const submissionId = submitter.submission_id ?? submitter.id;
    const signingUrl   = submitter.slug ? `https://docuseal.com/s/${submitter.slug}` : null;

    return res.status(200).json({
      submissionId,
      signingUrl,
      status:  'pending',
      sentAt:  new Date().toISOString(),
    });

  } catch (err) {
    console.error('docuseal-send error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
