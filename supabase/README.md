# Dashboard setup (free: GitHub Pages + Supabase free tier)

The dashboard lives at `ippataxi.nl/admin/`. Bookings and messages from the website are stored in Supabase;
only logged-in staff can read them.

## One-time setup

1. Create a free project at https://supabase.com (pick an EU region).
2. **SQL Editor** → paste all of [`schema.sql`](schema.sql) → Run.
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user** → create your account (e-mail + strong password, tick auto-confirm).
5. Back in the SQL Editor, make yourself owner (see the bottom of `schema.sql`).
6. **Project Settings → API** → copy the *Project URL* and the *anon public* key into [`js/config.js`](../js/config.js).
   Never use the `service_role` key there.
7. Commit and push. Done.

## Adding a driver
Add the user in Authentication → Users, then run the `insert into public.staff ... 'driver'` statement.
Drivers can see and update bookings/messages but cannot delete. Per-driver visibility can be added later
by tightening the `select` policy to `driver = <their name>`.


## Customer notifications (status page + e-mail)
1. SQL Editor: run [002_status_tracking.sql](002_status_tracking.sql). Do this BEFORE pushing the new site code.
2. Create a free account at https://resend.com and copy an API key.
3. Supabase: Edge Functions -> Deploy a new function -> Via Editor. Name it `notify-status` and paste [functions/notify-status/index.ts](functions/notify-status/index.ts). Deploy.
4. Edge Functions -> Secrets: add `RESEND_API_KEY`, and `MAIL_FROM` (e.g. `IPPATAXI <noreply@ippataxi.nl>`).
5. To mail customers (not just yourself), verify ippataxi.nl in Resend (add the DNS records it shows). Until then, e-mails only reach your own Resend account address.

