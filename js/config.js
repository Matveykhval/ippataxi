/**
 * Supabase connection settings.
 * The anon key is PUBLIC by design - it is safe to commit. What it can do is limited
 * by the Row Level Security policies in supabase/schema.sql (insert-only for visitors).
 * NEVER put the "service_role" key here.
 */
window.IPPA_CONFIG = {
  supabaseUrl: 'https://wrkcvdpcziomirkarrws.supabase.co',
  supabaseAnonKey: 'sb_publishable_vx5l1eAUzIFUUVFu3TglaQ_t4PIpeDB'
};

