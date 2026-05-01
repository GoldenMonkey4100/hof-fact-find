/**
 * DocuSeal — Proxy download of signed PDF or audit trail
 *
 * GET /api/docuseal-download?submissionId=XXXX&type=signed  → signed PDF
 * GET /api/docuseal-download?submissionId=XXXX&type=audit   → audit trail PDF
 *
 * Streams the file back so the browser downloads it directly
 * without exposing the DocuSeal API key or raw document URLs.
 */

const API_BASE = 'https://api.docuseal.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { submissionId, type } = req.query;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required' });
  if (!['signed', 'audit'].includes(type)) return res.status(400).json({ error: 'type must be signed or audit' });

  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DOCUSEAL_API_KEY not configured' });

  try {
    // Fetch submission to get document URLs
    const statusRes = await fetch(`${API_BASE}/submissions/${submissionId}`, {
      headers: { 'X-Auth-Token': apiKey },
    });
    const submission = await statusRes.json();

    if (!statusRes.ok) {
      return res.status(statusRes.status).json({ error: 'Could not retrieve submission', details: submission });
    }

    if (submission.status !== 'completed') {
      return res.status(400).json({ error: 'Submission is not yet completed', status: submission.status });
    }

    let downloadUrl, filename;

    if (type === 'audit') {
      downloadUrl = submission.audit_log_url;
      filename    = `audit-trail-${submissionId}.pdf`;
    } else {
      // First document in the array is the signed combined PDF
      downloadUrl = submission.documents?.[0]?.url;
      filename    = `signed-credit-guide-${submissionId}.pdf`;
    }

    if (!downloadUrl) {
      return res.status(404).json({ error: `No ${type} document available for this submission` });
    }

    // Proxy the PDF to the browser
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      return res.status(fileRes.status).json({ error: 'Failed to download document from DocuSeal' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const buffer = await fileRes.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('docuseal-download error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
