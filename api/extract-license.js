import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType || 'image/jpeg',
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: `You are extracting data from an Australian driver licence image.
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
- Return empty string for any field that is not clearly visible`
          }
        ]
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not extract data from document', raw });

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('extract-license error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
