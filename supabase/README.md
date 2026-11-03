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

## Adding a driver & Driver Dispatch RBAC
1. In the Supabase **SQL Editor**, run [`004_driver_dispatch_rbac.sql`](004_driver_dispatch_rbac.sql) to add `assigned_driver_id`, `declined_by`, the atomic `accept_ride`/`decline_ride`/`complete_ride` RPCs, and strict RBAC policies/triggers.
2. Add the driver account in **Authentication → Users → Add user** (enter e-mail + password, tick *Auto Confirm User*).
3. Link the account in the SQL Editor with `role = 'driver'`:
   ```sql
   insert into public.staff (user_id, name, role)
   select id, 'Naam Chauffeur', 'driver'
   from auth.users
   where email = 'chauffeur@ippataxi.nl';
   ```
4. Drivers can log in at `https://ippataxi.nl/driver/` (or `https://ippataxi.nl/admin/`, which automatically switches to Driver Mode for `driver` accounts).
   - Drivers can only view unassigned pending rides and rides assigned to their own `user_id`.
   - Clicking **Accept** immediately assigns their `user_id` (`assigned_driver_id`) and name (`driver`) to the ride, changes `status` to `'accepted'`, and removes it from the available pool for other drivers.
   - Clicking **Decline** hides the ride from that driver's pool while keeping it available for other drivers.
   - Drivers are strictly blocked (at both the database RLS/trigger layer and UI layer) from deleting rides, cancelling rides, or editing customer details.


## Customer notifications (status page + e-mail)
1. SQL Editor: run [002_status_tracking.sql](002_status_tracking.sql). Do this BEFORE pushing the new site code.
2. Create a free account at https://resend.com and copy an API key.
3. Supabase: Edge Functions -> Deploy a new function -> Via Editor. Name it `notify-status` and paste [functions/notify-status/index.ts](functions/notify-status/index.ts). Deploy.
4. Edge Functions -> Secrets: add `RESEND_API_KEY`, and `MAIL_FROM` (e.g. `IPPATAXI <noreply@ippataxi.nl>`).
5. To mail customers (not just yourself), verify ippataxi.nl in Resend (add the DNS records it shows). Until then, e-mails only reach your own Resend account address.

