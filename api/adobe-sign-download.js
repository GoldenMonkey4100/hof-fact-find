/**
 * Adobe Acrobat Sign — Proxy download of signed PDF or audit trail
 * (Streams the file through so browser downloads it directly)
 *
 * GET /api/adobe-sign-download?agreementId=XXXX&type=signed   → signed PDF
 * GET /api/adobe-sign-download?agreementId=XXXX&type=audit    → audit trail PDF
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { agreementId, type } = req.query;
  if (!agreementId) return res.status(400).json({ error: 'agreementId is required' });
  if (!['signed', 'audit'].includes(type)) return res.status(400).json({ error: 'type must be signed or audit' });

  const apiKey  = process.env.ADOBE_SIGN_API_KEY;
  const apiBase = process.env.ADOBE_SIGN_API_BASE;
  if (!apiKey || !apiBase) return res.status(500).json({ error: 'Adobe Sign not configured' });

  const endpoint = type === 'audit'
    ? `https://${apiBase}/api/rest/v6/agreements/${agreementId}/auditTrail`
    : `https://${apiBase}/api/rest/v6/agreements/${agreementId}/combinedDocument`;

  const filename = type === 'audit'
    ? `audit-trail-${agreementId}.pdf`
    : `signed-credit-guide-${agreementId}.pdf`;

  try {
    const upstream = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: 'Adobe Sign download failed', details: err });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('adobe-sign-download error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
