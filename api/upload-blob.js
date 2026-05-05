/**
 * Generic file upload to Vercel Blob Storage
 *
 * POST /api/upload-blob
 *   Body: { base64: string, filename: string, contentType: string }
 *   Returns: { url: string }
 *
 * Environment variable required:
 *   BLOB_READ_WRITE_TOKEN  — auto-populated when you create a Blob store in Vercel dashboard
 */

// Allow larger payloads for image/PDF uploads (default is 1mb)
export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured — create a Blob store in Vercel dashboard' });

  const { base64, filename, contentType } = req.body || {};
  if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename are required' });

  try {
    const buffer = Buffer.from(base64, 'base64');

    const blobRes = await fetch(`https://blob.vercel-storage.com/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-api-version': '7',
      },
      body: buffer,
    });

    if (!blobRes.ok) {
      const errText = await blobRes.text();
      return res.status(500).json({ error: `Blob upload failed: ${errText}` });
    }

    const data = await blobRes.json();
    return res.status(200).json({ url: data.url });

  } catch (err) {
    console.error('[upload-blob] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
