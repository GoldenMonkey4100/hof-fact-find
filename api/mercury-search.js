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

  const apiKey = process.env.VITE_MERCURY_API_KEY;
  const apiToken = process.env.VITE_MERCURY_API_TOKEN;
  const baseUrl = process.env.VITE_MERCURY_API_URL || 'https://apis.connective.com.au/mercury/v1';

  if (!apiKey || !apiToken) {
    return res.status(500).json({
      error: `Mercury credentials missing. Found keys: ${Object.keys(process.env).filter(k => k.includes('MERCURY')).join(', ') || 'none'}`
    });
  }

  const trySearch = async (fieldName, value) => {
    const searchParams = encodeURIComponent(JSON.stringify({ [fieldName]: value }));
    const url = `${baseUrl}/${apiToken}/contacts?search=true&searchParams=${searchParams}&count=5`;
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Mercury ${response.status} on field "${fieldName}": ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }
  };

  try {
    let data = null;
    let lastError = null;

    // Mercury contact methods may be stored under different field names — try all variants
    if (email) {
      for (const fieldName of ['email', 'email1', 'emailAddress', 'Email1']) {
        try {
          data = await trySearch(fieldName, email);
          if (data.results && data.results.length > 0) break;
        } catch (err) {
          lastError = err;
        }
      }
    }

    // Fall back to phone/mobile variants
    if ((!data || !data.results || data.results.length === 0) && phone) {
      const cleanPhone = phone.replace(/\s/g, '');
      for (const fieldName of ['mobile', 'mobilePhone', 'phone', 'Mobile']) {
        try {
          data = await trySearch(fieldName, cleanPhone);
          if (data.results && data.results.length > 0) break;
        } catch (err) {
          lastError = err;
        }
      }
    }

    if (!data && lastError) throw lastError;

    return res.status(200).json(data || { totalCount: 0, count: 0, offset: 0, results: [] });
  } catch (err) {
    console.error('Mercury search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
