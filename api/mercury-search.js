export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, phone } = req.query;
  if (!email && !phone) {
    return res.status(400).json({ error: 'email or phone query param required' });
  }

  const apiKey = process.env.MERCURY_API_KEY;
  const apiToken = process.env.MERCURY_API_TOKEN;

  if (!apiKey || !apiToken) {
    return res.status(500).json({ error: 'Mercury API credentials not configured' });
  }

  // Try email first (more unique), fall back to mobile
  const trySearch = async (fieldName, value) => {
    const searchParams = encodeURIComponent(JSON.stringify({ [fieldName]: value }));
    const url = `https://apis.connective.com.au/mercury/v1/${apiToken}/contacts?search=true&searchParams=${searchParams}&count=5`;
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mercury ${response.status}: ${text}`);
    }
    return response.json();
  };

  try {
    let data = null;

    if (email) {
      data = await trySearch('email', email);
    }

    // If email search returned nothing but we have a phone, try phone
    if ((!data || !data.results || data.results.length === 0) && phone) {
      data = await trySearch('mobile', phone);
    }

    return res.status(200).json(data || { totalCount: 0, count: 0, offset: 0, results: [] });
  } catch (err) {
    console.error('Mercury search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
