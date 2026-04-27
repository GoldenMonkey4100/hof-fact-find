import https from 'https';

// Use Node's https module directly — more reliable in Vercel than native fetch
function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('Request timed out after 10s')); });
  });
}

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
  const baseUrl = 'https://apis.connective.com.au/mercury/v1';

  if (!apiKey || !apiToken) {
    return res.status(500).json({
      error: `Mercury credentials missing. Found MERCURY keys: ${Object.keys(process.env).filter(k => k.includes('MERCURY')).join(', ') || 'none'}`
    });
  }

  const trySearch = async (fieldName, value) => {
    const searchParams = encodeURIComponent(JSON.stringify({ [fieldName]: value }));
    const url = `${baseUrl}/${apiToken}/contacts?search=true&searchParams=${searchParams}&count=5`;
    const { status, body } = await httpsGet(url, { 'x-api-key': apiKey });
    if (status !== 200) {
      throw new Error(`Mercury ${status} (field: "${fieldName}"): ${body.slice(0, 300)}`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`Non-JSON response (${status}): ${body.slice(0, 200)}`);
    }
  };

  try {
    let data = null;
    let lastError = null;

    if (email) {
      for (const fieldName of ['email', 'email1', 'emailAddress']) {
        try {
          data = await trySearch(fieldName, email);
          if (data.results && data.results.length > 0) break;
        } catch (err) {
          lastError = err;
          console.error(`email search attempt (${fieldName}):`, err.message);
        }
      }
    }

    if ((!data || !data.results || data.results.length === 0) && phone) {
      const cleanPhone = phone.replace(/\s/g, '');
      for (const fieldName of ['mobile', 'mobilePhone', 'phone']) {
        try {
          data = await trySearch(fieldName, cleanPhone);
          if (data.results && data.results.length > 0) break;
        } catch (err) {
          lastError = err;
          console.error(`phone search attempt (${fieldName}):`, err.message);
        }
      }
    }

    if (!data && lastError) throw lastError;

    return res.status(200).json(data || { totalCount: 0, count: 0, offset: 0, results: [] });
  } catch (err) {
    console.error('Mercury search final error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
