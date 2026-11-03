// Supabase Edge Function: receives bookings/messages from the public website,
// verifies the Google reCAPTCHA v3 token, validates the data, then stores it.
// Visitors can no longer write to the database directly (see 003_captcha_lockdown.sql).
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   RECAPTCHA_SECRET  - the *secret* key from google.com/recaptcha/admin
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MIN_SCORE = 0.5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown, min: number, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);

  try {
    const { type, token, data } = await req.json();
    if (!['booking', 'message', 'contact'].includes(type) || typeof token !== 'string' || typeof data !== 'object' || !data) {
      return json({ ok: false, reason: 'bad_request' }, 400);
    }

    // 1) Captcha
    const secret = Deno.env.get('RECAPTCHA_SECRET_KEY') ?? Deno.env.get('RECAPTCHA_SECRET') ?? '';
    const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    }).then((r) => r.json());
    if (!verify.success || (verify.score ?? 0) < MIN_SCORE || verify.action !== type) {
      console.warn('captcha rejected', JSON.stringify({ success: verify.success, score: verify.score, action: verify.action, errors: verify['error-codes'] }));
      return json({ ok: false, reason: 'captcha' }, 403);
    }

    // 2) Validate + whitelist fields
    let table: string;
    let row: Record<string, unknown>;

    if (type === 'booking') {
      table = 'bookings';
      const email = str(data.email, 5, 150);
      const pickupAt = data.pickup_at ? new Date(String(data.pickup_at)) : null;
      row = {
        ref: str(data.ref, 3, 20),
        name: str(data.name, 1, 100),
        phone: str(data.phone, 5, 30),
        email: email && EMAIL.test(email) ? email : null,
        pickup: str(data.pickup, 1, 200),
        dropoff: str(data.dropoff, 1, 200),
        pickup_at: pickupAt && !isNaN(pickupAt.getTime()) ? pickupAt.toISOString() : null,
        vehicle: str(data.vehicle, 1, 60),
        passengers: Math.min(Math.max(parseInt(String(data.passengers), 10) || 1, 1), 20),
        ippa: str(data.ippa, 1, 60),
        notes: data.notes ? str(data.notes, 1, 500) : null,
        track_token: typeof data.track_token === 'string' && UUID.test(data.track_token) ? data.track_token : undefined,
      };
      if (!row.ref || !row.name || !row.phone || !row.email || !row.pickup || !row.dropoff) {
        return json({ ok: false, reason: 'invalid' }, 422);
      }
    } else {
      table = 'messages';
      const email = str(data.email, 3, 150);
      row = {
        name: str(data.name, 1, 100),
        phone: data.phone ? str(data.phone, 1, 30) : null,
        email: email && EMAIL.test(email) ? email : null,
        message: str(data.message, 1, 2000),
        status: 'new',
      };
      if (!row.name || !row.email || !row.message) return json({ ok: false, reason: 'invalid' }, 422);
    }

    // 3) Store (service role bypasses RLS - that's why validation above is strict)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.from(table).insert(row);
    if (error) {
      console.error('insert failed', error);
      return json({ ok: false, reason: 'db' }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ ok: false, reason: 'error' }, 500);
  }
});

