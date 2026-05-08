// Server-side proxy for Wispr Flow transcription API.
// Keeps the API key out of the browser bundle.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { audio } = req.body || {};
  if (!audio) return res.status(400).json({ error: 'audio (base64 WAV) required' });

  const apiKey = process.env.WISPR_FLOW_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'WISPR_FLOW_API_KEY not configured in Vercel environment variables' });
  }

  // Base URL can be overridden via env var if the endpoint changes
  const baseUrl = (process.env.WISPR_FLOW_BASE_URL || 'https://api.wisprflow.ai').replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/api`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio, format: 'wav', sample_rate: 16000 }),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { text }; }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data.message || text });
    }

    // Wispr Flow may return { text }, { transcript }, or { result } — normalise to { transcript }
    const transcript = data.text ?? data.transcript ?? data.result ?? '';
    return res.status(200).json({ transcript });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
