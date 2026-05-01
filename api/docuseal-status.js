/**
 * DocuSeal — Get submission status
 *
 * GET /api/docuseal-status?submissionId=XXXX
 * Returns: { status, signedAt, signingUrl, documents, auditLogUrl }
 *
 * status values: pending | completed | declined | expired
 */

const API_BASE = 'https://api.docuseal.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { submissionId } = req.query;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required' });

  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DOCUSEAL_API_KEY not configured' });

  try {
    const response = await fetch(`${API_BASE}/submissions/${submissionId}`, {
      headers: { 'X-Auth-Token': apiKey },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Could not retrieve submission', details: data });
    }

    const isCompleted = data.status === 'completed';
    const submitter   = data.submitters?.[0] || {};

    return res.status(200).json({
      status:       data.status,                   // pending | completed | declined | expired
      signedAt:     submitter.completed_at || null,
      // Proxy download URLs through our own endpoint (avoids exposing DocuSeal API key to browser)
      signedDocUrl: isCompleted ? `/api/docuseal-download?submissionId=${submissionId}&type=signed` : null,
      auditLogUrl:  isCompleted ? `/api/docuseal-download?submissionId=${submissionId}&type=audit`  : null,
      // Raw DocuSeal document URLs (for internal use / debugging)
      _documents:   data.documents || [],
      _auditLogUrl: data.audit_log_url || null,
    });

  } catch (err) {
    console.error('docuseal-status error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
