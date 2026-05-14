/**
 * HMAC Password-Gated Document Proxy
 *
 * GET  /api/documents?blob={encodedUrl}&sig={hmac}
 *   → HTML password form
 *
 * POST /api/documents  (body: blob, sig, password)
 *   → 302 redirect to Blob URL (correct password)
 *   → 401 HTML error page (wrong password)
 */

import { createHmac } from 'crypto';

const HTML = (title, body, status = 200) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — House of Finance</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f5f7;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:40px;max-width:400px;width:100%;text-align:center}
  .logo{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:12px;background:#1a1a2e;color:#d4a843;font-weight:800;font-size:13px;letter-spacing:.08em;margin-bottom:20px}
  h1{font-size:20px;font-weight:700;color:#1a1a2e;margin-bottom:8px}
  p{font-size:13px;color:#6b7280;margin-bottom:24px;line-height:1.6}
  label{display:block;font-size:12px;font-weight:600;color:#374151;text-align:left;margin-bottom:6px}
  input[type=password]{width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;outline:none;transition:border-color .15s}
  input[type=password]:focus{border-color:#1a1a2e}
  button{width:100%;margin-top:14px;padding:12px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.03em}
  button:hover{background:#2d2d4e}
  .error{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;font-size:13px;color:#b91c1c;margin-bottom:18px}
  .note{font-size:11px;color:#9ca3af;margin-top:16px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">HOF</div>
  ${body}
  <p class="note">This document is for authorised House of Finance staff only.</p>
</div>
</body>
</html>`;

const verifyHmac = (blobUrl, password, sig, secret) => {
  const expected = createHmac('sha256', secret).update(`${blobUrl}|${password}`).digest('hex');
  return expected === sig;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = process.env.DOCUMENT_SIGNING_SECRET;
  if (!secret) return res.status(500).send(HTML('Error', '<h1>Configuration Error</h1><p>Document signing not configured.</p>'));

  // ── GET — serve password form ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const { blob, sig } = req.query;
    if (!blob || !sig) {
      return res.status(400).send(HTML('Invalid Link', '<h1>Invalid Link</h1><p>This document link is missing required parameters.</p>'));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(HTML('Document Access', `
      <h1>Document Access</h1>
      <p>Enter the document password from your Teams notification to view this file.</p>
      <form method="POST" action="/api/documents">
        <input type="hidden" name="blob" value="${encodeURIComponent(blob)}">
        <input type="hidden" name="sig"  value="${sig}">
        <label for="password">Document Password</label>
        <input type="password" id="password" name="password" placeholder="Enter password" autocomplete="off" autofocus required>
        <button type="submit">View Document →</button>
      </form>
    `));
  }

  // ── POST — verify password and redirect ───────────────────────────────────
  if (req.method === 'POST') {
    let blob, sig, password;

    if (typeof req.body === 'string') {
      const params = new URLSearchParams(req.body);
      blob     = params.get('blob');
      sig      = params.get('sig');
      password = params.get('password');
    } else if (req.body && typeof req.body === 'object') {
      blob     = req.body.blob;
      sig      = req.body.sig;
      password = req.body.password;
    }

    // blob may be double-encoded from the hidden input
    try { blob = decodeURIComponent(blob || ''); } catch { /* already decoded */ }

    if (!blob || !sig || !password) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(HTML('Error', `
        <h1>Missing Fields</h1>
        <p>Please go back and try again.</p>
      `));
    }

    if (!verifyHmac(blob, password, sig, secret)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(401).send(HTML('Access Denied', `
        <h1>Incorrect Password</h1>
        <div class="error">The password you entered is incorrect.</div>
        <form method="POST" action="/api/documents">
          <input type="hidden" name="blob" value="${encodeURIComponent(blob)}">
          <input type="hidden" name="sig"  value="${sig}">
          <label for="password">Document Password</label>
          <input type="password" id="password" name="password" placeholder="Try again" autocomplete="off" autofocus required>
          <button type="submit">View Document →</button>
        </form>
      `));
    }

    // Correct password — redirect to blob URL
    return res.redirect(302, blob);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
