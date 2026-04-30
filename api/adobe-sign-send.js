/**
 * Adobe Acrobat Sign — Send Credit Guide for e-signature
 *
 * POST /api/adobe-sign-send
 * Body: { signerName, signerEmail, brokerName, applicantRef }
 * Returns: { agreementId, signingUrl, status }
 *
 * Environment variables required (set in Vercel dashboard):
 *   ADOBE_SIGN_API_KEY   — Integration Key from Adobe Sign API settings
 *   ADOBE_SIGN_API_BASE  — e.g. api.na4.adobesign.com (no https://, no trailing slash)
 */

// Map broker names to their Adobe Sign Library Template IDs.
// Add the other two brokers' template IDs once you've created them.
const BROKER_TEMPLATES = {
  'Yousif Jirjis':         'CBJCHBCAABAAaDbceDRqLXTiHECUpNnK2q66JH5xHKI8',
  'Laith Hana':            process.env.ADOBE_SIGN_TEMPLATE_LAITH   || '',
  'Mehdi Amirilayeghi':    process.env.ADOBE_SIGN_TEMPLATE_MEHDI   || '',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { signerName, signerEmail, brokerName, applicantRef } = req.body || {};

  if (!signerName || !signerEmail) {
    return res.status(400).json({ error: 'signerName and signerEmail are required' });
  }
  if (!brokerName) {
    return res.status(400).json({ error: 'brokerName is required' });
  }

  const apiKey  = process.env.ADOBE_SIGN_API_KEY;
  const apiBase = process.env.ADOBE_SIGN_API_BASE;

  if (!apiKey)  return res.status(500).json({ error: 'ADOBE_SIGN_API_KEY not configured in Vercel environment variables' });
  if (!apiBase) return res.status(500).json({ error: 'ADOBE_SIGN_API_BASE not configured in Vercel environment variables' });

  const templateId = BROKER_TEMPLATES[brokerName];
  if (!templateId) {
    return res.status(400).json({ error: `No Credit Guide template found for broker: ${brokerName}` });
  }

  try {
    // Create the agreement (sends email to signer automatically)
    const agreementRes = await fetch(`https://${apiBase}/api/rest/v6/agreements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileInfos: [{ libraryDocumentId: templateId }],
        name: `Credit Guide — ${signerName}`,
        message: `Hi ${signerName.split(' ')[0]}, please sign the attached Credit Guide before we proceed with your loan application. This is required before we can run a credit check on your behalf.`,
        participantSetsInfo: [
          {
            memberInfos: [{ email: signerEmail, name: signerName }],
            order: 1,
            role: 'SIGNER',
          },
        ],
        signatureType: 'ESIGN',
        state: 'IN_PROCESS',
        // CC the broker so they're notified when it's signed
        ccsInfo: brokerName ? [{ email: getBrokerEmail(brokerName) }].filter(c => c.email) : [],
      }),
    });

    const agreementData = await agreementRes.json();

    if (!agreementRes.ok) {
      console.error('Adobe Sign API error:', agreementData);
      return res.status(500).json({ error: agreementData.message || 'Adobe Sign API error', details: agreementData });
    }

    const agreementId = agreementData.id;

    // Retrieve the signing URL so we can also show it in the UI if needed
    const urlRes = await fetch(`https://${apiBase}/api/rest/v6/agreements/${agreementId}/signingUrls`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const urlData = await urlRes.json();
    const signingUrl = urlData?.signingUrlSetInfos?.[0]?.signingUrls?.[0]?.esignUrl || null;

    return res.status(200).json({
      agreementId,
      signingUrl,
      status: 'OUT_FOR_SIGNATURE',
      sentAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('adobe-sign-send error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// Broker email lookup — update these to match real broker emails
function getBrokerEmail(brokerName) {
  const emails = {
    'Yousif Jirjis':      'yousif@houseoffinance.com.au',
    'Laith Hana':         'laith@houseoffinance.com.au',
    'Mehdi Amirilayeghi': 'mehdi@houseoffinance.com.au',
  };
  return emails[brokerName] || '';
}
