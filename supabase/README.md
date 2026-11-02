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

