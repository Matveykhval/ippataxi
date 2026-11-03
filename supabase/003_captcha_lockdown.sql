-- Lock the public door: after the submit-form function is deployed AND the new website is live,
-- run this once. From then on visitors cannot write to the database directly (bots can't bypass
-- the captcha); only the submit-form function can.

drop policy if exists "public can create bookings" on public.bookings;
drop policy if exists "public can send messages"   on public.messages;
revoke insert on public.bookings, public.messages from anon;

