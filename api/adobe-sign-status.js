/**
 * Adobe Acrobat Sign — Get agreement status + download links
 *
 * GET /api/adobe-sign-status?agreementId=XXXX
 * Returns: { status, signerName, signerEmail, signedAt, signedDocumentUrl, auditTrailUrl }
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { agreementId } = req.query;
  if (!agreementId) return res.status(400).json({ error: 'agreementId is required' });

  const apiKey  = process.env.ADOBE_SIGN_API_KEY;
  const apiBase = process.env.ADOBE_SIGN_API_BASE;

  if (!apiKey || !apiBase) {
    return res.status(500).json({ error: 'Adobe Sign environment variables not configured' });
  }

  const headers = { 'Authorization': `Bearer ${apiKey}` };

  try {
    // Get agreement details
    const agreementRes = await fetch(`https://${apiBase}/api/rest/v6/agreements/${agreementId}`, { headers });
    const agreement = await agreementRes.json();

    if (!agreementRes.ok) {
      return res.status(500).json({ error: agreement.message || 'Could not retrieve agreement', details: agreement });
    }

    const isSigned = agreement.status === 'SIGNED';

    const response = {
      status: agreement.status,         // OUT_FOR_SIGNATURE | SIGNED | DECLINED | EXPIRED | CANCELLED
      agreementName: agreement.name,
      createdDate: agreement.createdDate,
      modifiedDate: agreement.modifiedDate,
    };

    // If signed, include download URLs for signed PDF and audit trail
    if (isSigned) {
      response.signedDocumentUrl  = `https://${apiBase}/api/rest/v6/agreements/${agreementId}/combinedDocument`;
      response.auditTrailUrl      = `https://${apiBase}/api/rest/v6/agreements/${agreementId}/auditTrail`;
      response.signedAt           = agreement.modifiedDate;
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('adobe-sign-status error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
