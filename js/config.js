/**
 * Supabase connection settings.
 * The anon key is PUBLIC by design - it is safe to commit. What it can do is limited
 * by the Row Level Security policies in supabase/schema.sql (insert-only for visitors).
 * NEVER put the "service_role" key here.
 */
window.IPPA_CONFIG = {
  supabaseUrl: 'https://wrkcvdpcziomirkarrws.supabase.co',
  supabaseAnonKey: 'sb_publishable_vx5l1eAUzIFUUVFu3TglaQ_t4PIpeDB',

  // Edge Function slug that verifies reCAPTCHA and inserts bookings/messages
  submitFunction: 'submit-form',

  // Google reCAPTCHA v3 site key (public). Get one free at:
  // https://www.google.com/recaptcha/admin/create -> select "reCAPTCHA v3" -> add domain ippataxi.nl
  // Leave empty ('') until you have created the key and deployed the submit-form function.
  recaptchaSiteKey: '6LekMg4uAAAAAJBgLPKbjd8BQayhFbmQkfx0UM8j',

  // Standard 2026 Dutch Taxi Rates (Wettelijke Maximumtarieven 2026)
  taxiRates2026: {
    baseFare: 4.31, // € 4,31 starttarief
    perKm: 3.17,    // € 3,17 per kilometer
    perMin: 0.52    // € 0,52 per minuut
  },

  // Platform commission percentage deducted in Real Money Mode for Driver Payouts
  platformCommissionRate: 0.15, // 15% platform commission -> 85% driver payout

  // Optional Routing API keys (Mapbox or Google Maps).
  // When empty, the calculator automatically uses live OSRM Driving Routing + OpenStreetMap NL Geocoding.
  mapboxAccessToken: '',
  googleMapsApiKey: ''
};

