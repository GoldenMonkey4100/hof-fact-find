/**
 * Adobe Acrobat Sign — combined handler (replaces adobe-sign-send/status/download)
 *
 * POST /api/adobe-sign                              → send agreement
 * GET  /api/adobe-sign?action=status&agreementId=X  → agreement status
 * GET  /api/adobe-sign?action=download&agreementId=X&type=signed|audit → proxy PDF
 */

const BROKER_TEMPLATES = {
  'Yousif Jirjis':      'CBJCHBCAABAAaDbceDRqLXTiHECUpNnK2q66JH5xHKI8',
  'Laith Hana':         process.env.ADOBE_SIGN_TEMPLATE_LAITH || '',
  'Mehdi Amirilayeghi': process.env.ADOBE_SIGN_TEMPLATE_MEHDI || '',
};

const BROKER_EMAILS = {
  'Yousif Jirjis':      'yousif@houseoffinance.com.au',
  'Laith Hana':         'laith@houseoffinance.com.au',
  'Mehdi Amirilayeghi': 'mehdi@houseoffinance.com.au',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey  = process.env.ADOBE_SIGN_API_KEY;
  const apiBase = process.env.ADOBE_SIGN_API_BASE;
  if (!apiKey || !apiBase) {
    return res.status(500).json({ error: 'ADOBE_SIGN_API_KEY / ADOBE_SIGN_API_BASE not configured' });
  }
  const headers = { Authorization: `Bearer ${apiKey}` };

  // ── POST → send agreement ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { signerName, signerEmail, brokerName } = req.body || {};
    if (!signerName || !signerEmail) return res.status(400).json({ error: 'signerName and signerEmail are required' });
    if (!brokerName) return res.status(400).json({ error: 'brokerName is required' });
    const templateId = BROKER_TEMPLATES[brokerName];
    if (!templateId) return res.status(400).json({ error: `No template found for broker: ${brokerName}` });

    try {
      const agrRes = await fetch(`https://${apiBase}/api/rest/v6/agreements`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileInfos: [{ libraryDocumentId: templateId }],
          name: `Credit Guide — ${signerName}`,
          message: `Hi ${signerName.split(' ')[0]}, please sign the Credit Guide before we proceed with your loan application.`,
          participantSetsInfo: [{ memberInfos: [{ email: signerEmail, name: signerName }], order: 1, role: 'SIGNER' }],
          signatureType: 'ESIGN',
          state: 'IN_PROCESS',
          ccsInfo: BROKER_EMAILS[brokerName] ? [{ email: BROKER_EMAILS[brokerName] }] : [],
        }),
      });
      const agrData = await agrRes.json();
      if (!agrRes.ok) return res.status(500).json({ error: agrData.message || 'Adobe Sign API error', details: agrData });

      const urlRes = await fetch(`https://${apiBase}/api/rest/v6/agreements/${agrData.id}/signingUrls`, { headers });
      const urlData = await urlRes.json();
      return res.status(200).json({
        agreementId: agrData.id,
        signingUrl: urlData?.signingUrlSetInfos?.[0]?.signingUrls?.[0]?.esignUrl || null,
        status: 'OUT_FOR_SIGNATURE',
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET → status or download ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { action, agreementId, type } = req.query;
    if (!agreementId) return res.status(400).json({ error: 'agreementId is required' });

    if (action === 'status') {
      try {
        const agrRes = await fetch(`https://${apiBase}/api/rest/v6/agreements/${agreementId}`, { headers });
        const agreement = await agrRes.json();
        if (!agrRes.ok) return res.status(500).json({ error: agreement.message || 'Could not retrieve agreement' });
        const resp = { status: agreement.status, agreementName: agreement.name, createdDate: agreement.createdDate, modifiedDate: agreement.modifiedDate };
        if (agreement.status === 'SIGNED') {
          resp.signedDocumentUrl = `https://${apiBase}/api/rest/v6/agreements/${agreementId}/combinedDocument`;
          resp.auditTrailUrl = `https://${apiBase}/api/rest/v6/agreements/${agreementId}/auditTrail`;
          resp.signedAt = agreement.modifiedDate;
        }
        return res.status(200).json(resp);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (action === 'download') {
      if (!['signed', 'audit'].includes(type)) return res.status(400).json({ error: 'type must be signed or audit' });
      const endpoint = type === 'audit'
        ? `https://${apiBase}/api/rest/v6/agreements/${agreementId}/auditTrail`
        : `https://${apiBase}/api/rest/v6/agreements/${agreementId}/combinedDocument`;
      try {
        const upstream = await fetch(endpoint, { headers });
        if (!upstream.ok) return res.status(upstream.status).json({ error: 'Adobe Sign download failed' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${type === 'audit' ? 'audit-trail' : 'signed-credit-guide'}-${agreementId}.pdf"`);
        return res.send(Buffer.from(await upstream.arrayBuffer()));
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(400).json({ error: 'action must be status or download' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
