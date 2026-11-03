// Supabase Edge Function: e-mails the customer when staff change a booking status.
// Called from the dashboard (admin/admin.js) with the logged-in staff member's session.
// Security: the booking is read with the CALLER's token, so Row Level Security guarantees
// only staff can trigger e-mails. Secrets (set in the Supabase dashboard, never in the repo):
//   RESEND_API_KEY  - from resend.com
//   MAIL_FROM       - e.g. "IPPATAXI <noreply@ippataxi.nl>" (domain must be verified in Resend)
//   SITE_URL        - optional, defaults to https://ippataxi.nl
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const MESSAGES: Record<string, { subject: string; title: string; text: string }> = {
  confirmed: {
    subject: 'Uw rit is bevestigd',
    title: 'Uw rit is bevestigd ✓',
    text: 'Goed nieuws: wij hebben uw reservering bevestigd.',
  },
  accepted: {
    subject: 'Uw chauffeur heeft uw rit geaccepteerd',
    title: 'Uw chauffeur staat voor u klaar ✓',
    text: 'Goed nieuws: een chauffeur heeft uw rit geaccepteerd en is aan uw reservering gekoppeld.',
  },
  assigned: {
    subject: 'Uw chauffeur is toegewezen',
    title: 'Uw chauffeur staat voor u klaar',
    text: 'Er is een chauffeur aan uw rit toegewezen.',
  },
  cancelled: {
    subject: 'Uw rit is geannuleerd',
    title: 'Uw rit is geannuleerd',
    text: 'Uw reservering is geannuleerd. Heeft u vragen? Neem gerust contact met ons op.',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { bookingId } = await req.json();
    const { data: b, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (error || !b) return json({ sent: false, reason: 'forbidden' }, 403);

    const msg = MESSAGES[b.status];
    if (!msg) return json({ sent: false, reason: 'status_not_notified' });
    if (!b.email) return json({ sent: false, reason: 'no_email' });

    const site = Deno.env.get('SITE_URL') ?? 'https://ippataxi.nl';
    const link = `${site}/status.html?t=${b.track_token}`;
    const when = b.pickup_at
      ? new Date(b.pickup_at).toLocaleString('nl-NL', {
          timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })
      : 'Zo snel mogelijk';
    const driverLine = (b.status === 'assigned' || b.status === 'accepted') && b.driver ? `<p>Uw chauffeur: <b>${esc(b.driver)}</b></p>` : '';
    const ippaLine = b.status !== 'cancelled' && b.ippa
      ? `<p style="color:#b88b39"><b>Betaling:</b> ${esc(b.ippa)} aan de chauffeur bij aankomst.</p>` : '';

    const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1d1d1f">
  <h1 style="font-size:24px;letter-spacing:-.02em">${esc(msg.title)}</h1>
  <p>Hallo ${esc(String(b.name).split(' ')[0])},</p>
  <p>${esc(msg.text)}</p>
  <div style="background:#f5f5f7;border-radius:14px;padding:16px 18px;margin:18px 0">
    <div style="color:#6e6e73;font-size:13px">Referentie ${esc(b.ref)}</div>
    <div style="font-size:17px;margin:6px 0"><b>${esc(b.pickup)}</b> → <b>${esc(b.dropoff)}</b></div>
    <div style="color:#6e6e73">${esc(when)} · ${esc(b.vehicle)}</div>
  </div>
  ${driverLine}${ippaLine}
  <p><a href="${link}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:11px 22px;border-radius:980px">Bekijk uw rit</a></p>
  <p style="color:#6e6e73;font-size:12px;margin-top:28px">IPPATAXI · ippataxi.nl</p>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') ?? 'IPPATAXI <onboarding@resend.dev>',
        to: [b.email],
        subject: `${msg.subject} (${b.ref})`,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return json({ sent: false, reason: 'mail_provider_error' }, 502);
    }
    return json({ sent: true });
  } catch (e) {
    console.error(e);
    return json({ sent: false, reason: 'error' }, 500);
  }
});

