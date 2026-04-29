import Anthropic from '@anthropic-ai/sdk';

// Convert ALL CAPS names to Title Case (e.g. "JOHN SMITH" → "John Smith")
const toTitleCase = (str) => {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images } = req.body || {};
  if (!images || !images.length) return res.status(400).json({ error: 'images array required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });

  try {
    const client = new Anthropic({ apiKey });

    // Build one content block per file — images use "image" type, PDFs use "document" type
    const fileBlocks = images.map(({ base64, mediaType }) => {
      if (mediaType === 'application/pdf') {
        return {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 }
        };
      }
      return {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      };
    });

    const isTwoSided = images.length > 1;

    const prompt = isTwoSided
      ? `You are extracting data from an Australian driver licence. You have been given TWO images — the FRONT and BACK of the same licence.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON:
{
  "firstName": "",
  "lastName": "",
  "middleName": "",
  "dob": "",
  "licenceNumber": "",
  "address": "",
  "gender": ""
}
Rules:
- dob must be in YYYY-MM-DD format if visible, otherwise empty string
- gender must be "Male", "Female", or empty string
- ADDRESS PRIORITY: If the back of the licence has a sticker or handwritten updated address, use THAT address as it is the most recent. Otherwise use the address printed on the front
- Names must be in Title Case (e.g. "John Smith"), NOT all capitals
- Return empty string for any field that is not clearly visible`
      : `You are extracting data from an Australian driver licence image.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON:
{
  "firstName": "",
  "lastName": "",
  "middleName": "",
  "dob": "",
  "licenceNumber": "",
  "address": "",
  "gender": ""
}
Rules:
- dob must be in YYYY-MM-DD format if visible, otherwise empty string
- gender must be "Male", "Female", or empty string
- address should be the full residential address shown on the licence
- Names must be in Title Case (e.g. "John Smith"), NOT all capitals
- Return empty string for any field that is not clearly visible`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [...fileBlocks, { type: 'text', text: prompt }]
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not extract data from document', raw });

    const result = JSON.parse(jsonMatch[0]);

    // Normalise name casing server-side as a safety net in case model returns ALL CAPS
    if (result.firstName)  result.firstName  = toTitleCase(result.firstName);
    if (result.lastName)   result.lastName   = toTitleCase(result.lastName);
    if (result.middleName) result.middleName = toTitleCase(result.middleName);

    return res.status(200).json(result);
  } catch (err) {
    console.error('extract-license error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
