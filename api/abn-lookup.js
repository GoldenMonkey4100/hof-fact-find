/**
 * ABN Lookup — proxy for the Australian Business Register JSON API
 *
 * GET /api/abn-lookup?abn=51824753556        → lookup by ABN
 * GET /api/abn-lookup?name=house+of+finance  → search by name (returns up to 10)
 *
 * Environment variable required:
 *   ABN_LOOKUP_GUID  — GUID issued at abr.business.gov.au/Webservices/RegisterForWebService
 */

const API_BASE = 'https://abr.business.gov.au/json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const guid = process.env.ABN_LOOKUP_GUID;
  if (!guid) return res.status(500).json({ error: 'ABN_LOOKUP_GUID not configured in Vercel environment variables' });

  const { abn, name } = req.query;

  try {
    if (abn) {
      // ── Lookup by ABN ──────────────────────────────────────────────────────
      const cleanABN = abn.replace(/\D/g, '');
      if (cleanABN.length !== 11) {
        return res.status(400).json({ error: 'ABN must be 11 digits' });
      }

      const response = await fetch(`${API_BASE}/AbnDetails.aspx?abn=${cleanABN}&guid=${guid}`);
      const text     = await response.text();
      const data     = JSON.parse(text);

      if (!data.EntityName && data.Message) {
        return res.status(404).json({ error: data.Message || 'ABN not found or invalid' });
      }

      return res.status(200).json({
        abn:          data.Abn,
        status:       data.AbnStatus,          // 'Active' | 'Cancelled'
        entityName:   data.EntityName,
        tradingNames: data.BusinessName || [], // array of trading names
        entityType:   data.EntityTypeName,
        entityCode:   data.EntityTypeCode,
        gstRegistered: !!data.Gst,
        gstDate:      data.Gst || null,
        state:        data.AddressState,
        postcode:     data.AddressPostcode,
      });

    } else if (name) {
      // ── Search by name ─────────────────────────────────────────────────────
      const response = await fetch(
        `${API_BASE}/MatchingNames.aspx?name=${encodeURIComponent(name)}&maxResults=10&guid=${guid}`
      );
      const text = await response.text();
      const data = JSON.parse(text);

      if (data.Message && (!data.Names || data.Names.length === 0)) {
        return res.status(404).json({ error: data.Message || 'No results found' });
      }

      return res.status(200).json({
        results: (data.Names || []).map(n => ({
          abn:    n.Abn,
          name:   n.Name,
          state:  n.State,
          status: n.AbnStatus,
        })),
      });

    } else {
      return res.status(400).json({ error: 'Provide either abn or name query parameter' });
    }

  } catch (err) {
    console.error('abn-lookup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
