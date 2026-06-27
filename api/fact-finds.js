import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, brokerEmail, id, formData } = req.body || {};
  if (!brokerEmail) return res.status(400).json({ error: 'brokerEmail required' });

  try {
    if (action === 'list') {
      const { data, error } = await supabase
        .from('fact_finds')
        .select('id, status, client_name, created_at, updated_at, mercury_url, mercury_title')
        .eq('broker_email', brokerEmail)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }

    if (action === 'get') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase
        .from('fact_finds')
        .select('*')
        .eq('id', id)
        .eq('broker_email', brokerEmail)
        .single();
      if (error) throw error;
      return res.status(200).json({ item: data });
    }

    if (action === 'save') {
      const applicants = formData?.applicants || [];
      const first = applicants[0];
      const clientName = first
        ? [first.firstName, first.lastName].filter(Boolean).join(' ') || null
        : null;

      const payload = {
        broker_email: brokerEmail,
        broker_name: formData?.brokerName || null,
        status: 'draft',
        form_data: formData || {},
        client_name: clientName,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (id) {
        const { data, error } = await supabase
          .from('fact_finds')
          .update(payload)
          .eq('id', id)
          .eq('broker_email', brokerEmail)
          .select('id')
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('fact_finds')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        result = data;
      }
      return res.status(200).json({ id: result.id });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase
        .from('fact_finds')
        .delete()
        .eq('id', id)
        .eq('broker_email', brokerEmail)
        .eq('status', 'draft');
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('fact-finds error:', err);
    return res.status(500).json({ error: err.message });
  }
}
