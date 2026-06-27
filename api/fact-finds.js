import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, brokerEmail, userEmail, id, formData, creditAnalysis, assignedProcessor } = req.body || {};

  // Queue/admin actions don't require brokerEmail
  const queueActions = ['list-queue', 'save-analysis', 'send-to-processor', 'update-status', 'list-all', 'admin-update'];
  if (!brokerEmail && !queueActions.includes(action)) {
    return res.status(400).json({ error: 'brokerEmail required' });
  }

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

    // Analysts + processors: fetch by status array
    if (action === 'list-queue') {
      const { statuses } = req.body || {};
      if (!statuses || !Array.isArray(statuses)) return res.status(400).json({ error: 'statuses array required' });
      const { data, error } = await supabase
        .from('fact_finds')
        .select('id, status, client_name, broker_name, broker_email, created_at, updated_at, credit_analysis, assigned_analyst, assigned_processor')
        .in('status', statuses)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }

    if (action === 'get') {
      if (!id) return res.status(400).json({ error: 'id required' });
      // Brokers can only get their own; analysts/processors pass userEmail instead
      let query = supabase.from('fact_finds').select('*').eq('id', id);
      if (brokerEmail) query = query.eq('broker_email', brokerEmail);
      const { data, error } = await query.single();
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

    // Credit analyst saves their analysis (auto-sets status to in_review)
    if (action === 'save-analysis') {
      if (!id || !userEmail) return res.status(400).json({ error: 'id and userEmail required' });
      const { error } = await supabase
        .from('fact_finds')
        .update({
          credit_analysis: creditAnalysis || {},
          assigned_analyst: userEmail,
          status: 'in_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Credit analyst sends to processor
    if (action === 'send-to-processor') {
      if (!id || !userEmail) return res.status(400).json({ error: 'id and userEmail required' });
      const updatePayload = {
        status: 'pending_lodgement',
        assigned_analyst: userEmail,
        updated_at: new Date().toISOString(),
      };
      if (creditAnalysis) updatePayload.credit_analysis = creditAnalysis;
      if (assignedProcessor) updatePayload.assigned_processor = assignedProcessor;
      const { error } = await supabase.from('fact_finds').update(updatePayload).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Generic status update (used by processors: lodged, approved)
    if (action === 'update-status') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { status, mercuryUrl, mercuryTitle } = req.body || {};
      const payload = { status, updated_at: new Date().toISOString() };
      if (mercuryUrl)   payload.mercury_url   = mercuryUrl;
      if (mercuryTitle) payload.mercury_title = mercuryTitle;
      const { error } = await supabase.from('fact_finds').update(payload).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Admin: fetch all fact finds across all brokers
    if (action === 'list-all') {
      const { statuses } = req.body || {};
      let query = supabase
        .from('fact_finds')
        .select('id, status, client_name, broker_name, broker_email, assigned_analyst, assigned_processor, credit_analysis, created_at, updated_at, mercury_url, mercury_title')
        .order('updated_at', { ascending: false });
      if (statuses && Array.isArray(statuses) && statuses.length > 0) {
        query = query.in('status', statuses);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }

    // Admin: update status, assigned_analyst, assigned_processor unrestricted
    if (action === 'admin-update') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { status, assignedAnalyst, assignedProcessor: ap, mercuryUrl, mercuryTitle } = req.body || {};
      const payload = { updated_at: new Date().toISOString() };
      if (status)       payload.status             = status;
      if (assignedAnalyst !== undefined) payload.assigned_analyst   = assignedAnalyst;
      if (ap !== undefined)              payload.assigned_processor = ap;
      if (mercuryUrl)   payload.mercury_url         = mercuryUrl;
      if (mercuryTitle) payload.mercury_title       = mercuryTitle;
      const { error } = await supabase.from('fact_finds').update(payload).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('fact-finds error:', err);
    return res.status(500).json({ error: err.message });
  }
}
