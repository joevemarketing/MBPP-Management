const { createClient } = require('@supabase/supabase-js');

function hasSupabaseConfig() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
}

function supabaseAnon() {
  if (!hasSupabaseConfig()) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function supabaseService() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { hasSupabaseConfig, supabaseAnon, supabaseService };

