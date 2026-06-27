import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, currentPassword, newPassword, adminEmail, targetEmail } = req.body || {};

  try {
    if (action === 'login') {
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });
      const { data, error } = await supabase
        .from('hof_users')
        .select('email, name, role, password')
        .eq('email', email.toLowerCase().trim())
        .single();
      if (error || !data) return res.status(401).json({ error: 'Incorrect email or password.' });
      if (data.password !== password) return res.status(401).json({ error: 'Incorrect email or password.' });
      return res.status(200).json({ user: { email: data.email, name: data.name, role: data.role } });
    }

    if (action === 'change-password') {
      if (!email || !currentPassword || !newPassword) return res.status(400).json({ error: 'email, currentPassword, newPassword required' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      const { data, error } = await supabase
        .from('hof_users')
        .select('password')
        .eq('email', email.toLowerCase().trim())
        .single();
      if (error || !data) return res.status(404).json({ error: 'User not found.' });
      if (data.password !== currentPassword) return res.status(401).json({ error: 'Current password is incorrect.' });
      const { error: updateError } = await supabase
        .from('hof_users')
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('email', email.toLowerCase().trim());
      if (updateError) throw updateError;
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-reset') {
      if (!adminEmail || !targetEmail || !newPassword) return res.status(400).json({ error: 'adminEmail, targetEmail, newPassword required' });
      const { data: admin } = await supabase
        .from('hof_users')
        .select('role')
        .eq('email', adminEmail.toLowerCase().trim())
        .single();
      if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Not authorised.' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      const { error } = await supabase
        .from('hof_users')
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('email', targetEmail.toLowerCase().trim());
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('auth error:', err);
    return res.status(500).json({ error: err.message });
  }
}
