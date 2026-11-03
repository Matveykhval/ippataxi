/**
 * IPPATAXI Dispatch & Driver Dashboard
 * Enforces Role-Based Access Control (RBAC) in tandem with Supabase RLS & Triggers:
 *  - 'owner' (Admin): Full dispatch table with Assigned Driver column ('Pending' when unassigned),
 *    driver assignment, status control, customer detail editing, cancellation, and deletion.
 *  - 'driver' (Chauffeur): Available Rides pool with Accept / Decline buttons and My Rides view
 *    with Complete button. Strictly no delete, cancel, or edit customer details permissions.
 */
(function () {
  'use strict';

  const cfg = window.IPPA_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const views = { login: $('login-view'), app: $('app-view'), denied: $('denied-view') };
  const forceDriverMode = Boolean(window.IPPA_FORCE_DRIVER_VIEW);

  const STATUS = {
    bookings: [
      ['pending', 'Pending'],
      ['accepted', 'Accepted'],
      ['confirmed', 'Confirmed'],
      ['completed', 'Completed'],
      ['cancelled', 'Cancelled']
    ],
    messages: [
      ['new', 'Nieuw'],
      ['read', 'Gelezen'],
      ['replied', 'Beantwoord'],
      ['archived', 'Gearchiveerd']
    ]
  };

  const LABEL = {
    pending: 'Pending',
    new: 'Pending',
    confirmed: 'Confirmed',
    accepted: 'Accepted',
    assigned: 'Accepted',
    completed: 'Completed',
    cancelled: 'Cancelled',
    read: 'Gelezen',
    replied: 'Beantwoord',
    archived: 'Gearchiveerd'
  };

  const state = {
    uid: null,
    staff: null,        // { user_id, name, role, is_blocked }
    staffList: [],      // all staff rows (loaded for owner)
    staffMap: {},       // user_id -> { user_id, name, role }
    staffOverview: [],  // staff dashboard metrics & auth details
    staffHistory: {},   // user_id -> rides driven history cache
    expandedStaffId: null, // expanded driver ride history card ID
    tab: 'bookings',    // owner tabs: 'bookings' | 'messages' | 'staff'
    driverTab: 'available', // driver tabs: 'available' | 'my-rides' | 'messages'
    filter: 'open',
    search: '',
    expandedId: null,   // expanded booking row ID in admin table
    declinedIds: new Set(),
    data: { bookings: [], messages: [] }
  };

  if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) {
    show('login');
    showError('Supabase is nog niet ingesteld in js/config.js.');
    return;
  }
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  /* ---------------------------------------------------------- helpers */
  function show(name) {
    Object.entries(views).forEach(([k, el]) => { if (el) el.hidden = k !== name; });
  }
  function showError(msg) {
    const el = $('login-error');
    if (el) { el.textContent = msg; el.hidden = !msg; }
  }
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children).forEach((c) => c && node.append(c));
    return node;
  }

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Zo snel mogelijk';
  const fmtCreated = (iso) => new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const digits = (p) => (p || '').replace(/[^\d+]/g, '');
  const waNumber = (p) => {
    let d = digits(p).replace(/^\+/, '');
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = '31' + d.slice(1);
    return d;
  };

  function normalizeStatus(s) {
    if (s === 'new') return 'pending';
    if (s === 'assigned') return 'accepted';
    return s || 'pending';
  }

  function statusColor(s) {
    return `var(--s-${normalizeStatus(s)})`;
  }

  function formatRole(role) {
    switch (role) {
      case 'owner': return 'Eigenaar (Owner)';
      case 'admin': return 'Beheerder (Admin)';
      case 'senior_driver': return 'Senior Chauffeur';
      case 'driver': return 'Chauffeur';
      default: return role || 'Onbekend';
    }
  }

  function isDriverView() {
    return forceDriverMode || state.staff?.role === 'driver' || state.staff?.role === 'senior_driver';
  }

  function isSeniorDriver() {
    return state.staff?.role === 'senior_driver';
  }

  function isOwner() {
    return (state.staff?.role === 'owner' || state.staff?.role === 'admin') && !forceDriverMode;
  }

  function isRealOwner() {
    return state.staff?.role === 'owner' && !forceDriverMode;
  }

  /**
   * Resolves the assigned driver's display name for a ride.
   * Returns null if unassigned (rendered as 'Pending').
   */
  function getAssignedDriverName(row) {
    if (row.assigned_driver_id && state.staffMap[row.assigned_driver_id]) {
      return state.staffMap[row.assigned_driver_id].name;
    }
    if (row.driver && String(row.driver).trim()) {
      return String(row.driver).trim();
    }
    return null;
  }

  function isRideUnassigned(row) {
    return !row.assigned_driver_id && (!row.driver || !String(row.driver).trim());
  }

  function isRideAvailableForDriver(row) {
    const norm = normalizeStatus(row.status);
    if (!isRideUnassigned(row)) return false;
    if (!['pending', 'confirmed'].includes(norm)) return false;
    if (Array.isArray(row.declined_by) && row.declined_by.includes(state.uid)) return false;
    if (state.declinedIds.has(row.id)) return false;
    return true;
  }

  function isRideAssignedToCurrentDriver(row) {
    if (!state.uid) return false;
    if (row.assigned_driver_id === state.uid) return true;
    if (!row.assigned_driver_id && row.driver && state.staff?.name && row.driver.toLowerCase() === state.staff.name.toLowerCase()) {
      return true;
    }
    return false;
  }

  function loadLocalDeclined() {
    if (!state.uid) return;
    try {
      const raw = localStorage.getItem(`ippa_declined_${state.uid}`);
      const arr = raw ? JSON.parse(raw) : [];
      state.declinedIds = new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      state.declinedIds = new Set();
    }
  }

  function saveLocalDeclined() {
    if (!state.uid) return;
    try {
      localStorage.setItem(`ippa_declined_${state.uid}`, JSON.stringify([...state.declinedIds]));
    } catch (_) {}
  }

  /* ------------------------------------------------------------- auth */
  async function boot() {
    const { data } = await db.auth.getSession();
    if (data.session) await enter();
    else show('login');
  }

  async function enter() {
    const { data: userData } = await db.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { show('login'); return; }

    const { data: staff } = await db.from('staff').select('*').eq('user_id', uid).maybeSingle();
    if (!staff) { show('denied'); return; }

    if (staff.is_blocked) {
      show('denied');
      const p = $('denied-view')?.querySelector('p');
      if (p) p.textContent = 'Uw account is geblokkeerd door de beheerder. Neem contact op voor herstel.';
      return;
    }

    state.uid = uid;
    state.staff = staff;
    loadLocalDeclined();

    // Silently record login timestamp in background
    try { await db.rpc('record_staff_login'); } catch (_) {}

    // Configure UI chrome based on strict role boundaries
    const driverMode = isDriverView();
    document.title = driverMode ? 'Driver - ippataxi' : 'Admin - ippataxi';

    if ($('who')) $('who').textContent = `${staff.name} (${formatRole(staff.role)})`;
    const roleBadge = $('role-badge');
    if (roleBadge) {
      roleBadge.textContent = driverMode ? (isSeniorDriver() ? 'Senior Chauffeur' : 'Chauffeur') : (staff.role === 'owner' ? 'Owner' : 'Admin');
      roleBadge.className = 'role-badge ' + (staff.role === 'senior_driver' ? 'senior' : staff.role);
    }

    if ($('admin-tabs')) $('admin-tabs').hidden = driverMode;
    if ($('driver-tabs')) $('driver-tabs').hidden = !driverMode;
    if ($('stats-bar')) $('stats-bar').hidden = driverMode;
    if ($('driver-portal-link')) $('driver-portal-link').hidden = driverMode;

    const banner = $('driver-rbac-banner');
    if (banner) {
      banner.hidden = !driverMode;
      if (driverMode) {
        const descDiv = banner.querySelector('div');
        if (descDiv) {
          descDiv.innerHTML = isSeniorDriver()
            ? '<strong>Senior Chauffeursmodus</strong> — U heeft toegang tot beschikbare ritten, eigen ritten én het klantenberichten-inbox met directe contactopties via telefoon, WhatsApp en e-mail.'
            : '<strong>Chauffeursmodus</strong> — Bekijk openstaande ritten en klik op <b>Accept</b> om een rit te koppelen, of op <b>Decline</b> om te verbergen.';
        }
      }
    }

    const dtabMsg = $('dtab-messages');
    if (dtabMsg) {
      dtabMsg.hidden = !isSeniorDriver();
    }

    show('app');
    state.filter = driverMode ? 'all' : 'open';
    buildFilters();
    await load();
    subscribeRealtime();

    clearInterval(state.timer);
    state.timer = setInterval(load, 20000);
  }

  $('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const btn = $('login-btn');
    btn.disabled = true;
    const { error } = await db.auth.signInWithPassword({
      email: $('login-email').value.trim(),
      password: $('login-password').value
    });
    btn.disabled = false;
    if (error) {
      showError('Inloggen mislukt. Controleer e-mail en wachtwoord.');
      return;
    }
    $('login-password').value = '';
    await enter();
  });

  async function logout() {
    clearInterval(state.timer);
    if (state.realtimeChannel) {
      db.removeChannel(state.realtimeChannel);
      state.realtimeChannel = null;
    }
    await db.auth.signOut();
    state.data = { bookings: [], messages: [] };
    show('login');
  }
  $('logout-btn')?.addEventListener('click', logout);
  $('denied-logout')?.addEventListener('click', logout);
  $('refresh-btn')?.addEventListener('click', load);

  function subscribeRealtime() {
    if (state.realtimeChannel) return;
    try {
      state.realtimeChannel = db
        .channel('bookings-dispatch-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          load();
        })
        .subscribe();
    } catch (_) {}
  }

  /* -------------------------------------------------------------- data */
  async function loadStaff() {
    if (!isOwner()) return;
    try {
      const { data, error } = await db.rpc('get_staff_dashboard');
      if (!error && data) {
        state.staffOverview = data;
      } else {
        // Fallback: build staff overview from local staff list & bookings
        const { data: fallbackStaff } = await db.from('staff').select('*').order('name', { ascending: true });
        if (fallbackStaff) {
          state.staffOverview = fallbackStaff.map(st => ({
            user_id: st.user_id,
            name: st.name,
            email: st.user_id === state.uid ? 'Huidige account' : 'Geregistreerd account',
            role: st.role,
            is_blocked: Boolean(st.is_blocked),
            last_login_at: st.last_login_at,
            created_at: null,
            total_assigned: state.data.bookings.filter(b => b.assigned_driver_id === st.user_id).length,
            total_completed: state.data.bookings.filter(b => b.assigned_driver_id === st.user_id && b.status === 'completed').length,
            active_rides: state.data.bookings.filter(b => b.assigned_driver_id === st.user_id && ['accepted', 'assigned'].includes(b.status)).length
          }));
        }
      }
    } catch (_) {}

    const badge = $('badge-staff-count');
    if (badge) {
      badge.textContent = state.staffOverview.length;
      badge.hidden = state.staffOverview.length === 0;
    }
  }

  async function loadDriverRideHistory(driverId) {
    if (state.staffHistory[driverId]) return state.staffHistory[driverId];
    try {
      const { data, error } = await db.rpc('get_driver_ride_history', { p_driver_id: driverId });
      if (!error && data) {
        state.staffHistory[driverId] = data;
        return data;
      }
    } catch (_) {}
    // Fallback from loaded bookings cache
    const localRides = state.data.bookings.filter(b => b.assigned_driver_id === driverId);
    state.staffHistory[driverId] = localRides;
    return localRides;
  }

  async function handleUpdateStaffRole(targetStaff, newRole) {
    if (targetStaff.role === 'owner' && !isRealOwner()) {
      return toast('U kunt de eigenaar niet wijzigen.', false);
    }
    if (!confirm(`Weet u zeker dat u de rol van ${targetStaff.name} wilt wijzigen naar ${formatRole(newRole)}?`)) return;

    try {
      const { error } = await db.rpc('update_staff_member', {
        p_target_id: targetStaff.user_id,
        p_role: newRole,
        p_is_blocked: Boolean(targetStaff.is_blocked)
      });
      if (error) {
        const { error: directErr } = await db.from('staff').update({ role: newRole }).eq('user_id', targetStaff.user_id);
        if (directErr) return toast('Rol wijzigen mislukt: ' + (error.message || directErr.message), false);
      }
    } catch (e) {
      const { error: directErr } = await db.from('staff').update({ role: newRole }).eq('user_id', targetStaff.user_id);
      if (directErr) return toast('Rol wijzigen mislukt: ' + directErr.message, false);
    }

    targetStaff.role = newRole;
    toast(`Rol van ${targetStaff.name} succesvol gewijzigd naar ${formatRole(newRole)} ✓`);
    await load();
  }

  async function handleToggleStaffBlock(targetStaff) {
    if (targetStaff.role === 'owner') {
      return toast('U kunt de eigenaar niet blokkeren.', false);
    }
    const nextBlocked = !targetStaff.is_blocked;
    const actionName = nextBlocked ? 'blokkeren' : 'deblokkeren';
    if (!confirm(`Weet u zeker dat u ${targetStaff.name} wilt ${actionName}?`)) return;

    try {
      const { error } = await db.rpc('update_staff_member', {
        p_target_id: targetStaff.user_id,
        p_role: targetStaff.role,
        p_is_blocked: nextBlocked
      });
      if (error) {
        const { error: directErr } = await db.from('staff').update({ is_blocked: nextBlocked }).eq('user_id', targetStaff.user_id);
        if (directErr) return toast(`Medewerker ${actionName} mislukt: ` + (error.message || directErr.message), false);
      }
    } catch (e) {
      const { error: directErr } = await db.from('staff').update({ is_blocked: nextBlocked }).eq('user_id', targetStaff.user_id);
      if (directErr) return toast(`Medewerker ${actionName} mislukt: ` + directErr.message, false);
    }

    targetStaff.is_blocked = nextBlocked;
    toast(`${targetStaff.name} is nu ${nextBlocked ? 'geblokkeerd' : 'gedeblokkeerd'} ✓`);
    await load();
  }

  async function load() {
    if (isDriverView()) {
      const queries = [
        db.from('bookings').select('*').order('created_at', { ascending: false }).limit(300)
      ];
      if (isSeniorDriver()) {
        queries.push(db.from('messages').select('*').order('created_at', { ascending: false }).limit(300));
      }
      const [b, m] = await Promise.all(queries);
      if (b.error) {
        if (b.error.code === 'PGRST301') return logout();
        console.error(b.error);
      }
      state.data.bookings = b.data || [];
      state.data.messages = m?.data || [];
    } else {
      // Owner / Admin loads bookings, messages, staff directory, and staff dashboard
      const [b, m, s] = await Promise.all([
        db.from('bookings').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('messages').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('staff').select('user_id, name, role, is_blocked, last_login_at').order('name', { ascending: true })
      ]);
      if (b.error || m.error) {
        if ((b.error || m.error)?.code === 'PGRST301') return logout();
        console.error(b.error || m.error);
      }
      state.data.bookings = b.data || [];
      state.data.messages = m.data || [];
      state.staffList = s.data || [];
      state.staffMap = Object.fromEntries(state.staffList.map((st) => [st.user_id, st]));
      await loadStaff();
    }
    updateBadges();
    renderStats();
    render();
  }

  async function update(table, id, patch, indicator) {
    // Client-side RBAC guard backing up the Postgres trigger
    if (!isOwner()) {
      toast('Actie geweigerd: alleen beheerders mogen ritgegevens wijzigen.', false);
      return false;
    }
    const { error } = await db.from(table).update(patch).eq('id', id);
    if (error) {
      toast('Opslaan mislukt: ' + error.message, false);
      return false;
    }
    const row = state.data[table].find((r) => r.id === id);
    if (row) Object.assign(row, patch);
    updateBadges();
    renderStats();
    if (indicator) {
      indicator.textContent = 'Opgeslagen ✓';
      setTimeout(() => { if (indicator.textContent === 'Opgeslagen ✓') indicator.textContent = ''; }, 2000);
    }
    return true;
  }

  /* --------------------------------------------------- driver actions */
  /**
   * Driver clicks "Accept":
   * Immediately assigns their user ID (assigned_driver_id) and name to the ride,
   * changes status to 'accepted', and removes it from the available pool for other drivers.
   */
  async function handleDriverAccept(row, btn) {
    if (btn) btn.disabled = true;

    // 1. Try atomic RPC accept_ride first
    let updatedRow = null;
    const rpcRes = await db.rpc('accept_ride', { p_booking_id: row.id });

    if (!rpcRes.error && rpcRes.data) {
      updatedRow = rpcRes.data;
    } else if (rpcRes.error && (rpcRes.error.code === 'PGRST202' || rpcRes.error.message?.includes('accept_ride'))) {
      // Fallback if 004_driver_dispatch_rbac.sql RPC hasn't been executed yet
      const patch = {
        assigned_driver_id: state.uid,
        driver: state.staff.name,
        status: 'accepted'
      };
      const { data, error } = await db
        .from('bookings')
        .update(patch)
        .eq('id', row.id)
        .is('assigned_driver_id', null)
        .select('*')
        .maybeSingle();

      if (error) {
        // Fallback if assigned_driver_id column doesn't exist yet on remote DB
        const fallbackPatch = { driver: state.staff.name, status: 'assigned' };
        const res2 = await db
          .from('bookings')
          .update(fallbackPatch)
          .eq('id', row.id)
          .is('driver', null)
          .select('*')
          .maybeSingle();
        if (res2.error || !res2.data) {
          if (btn) btn.disabled = false;
          return toast(res2.error?.message || 'Rit is al door een andere chauffeur geaccepteerd.', false);
        }
        updatedRow = res2.data;
      } else if (!data) {
        if (btn) btn.disabled = false;
        await load();
        return toast('Deze rit is zojuist door een andere chauffeur geaccepteerd.', false);
      } else {
        updatedRow = data;
      }
    } else {
      if (btn) btn.disabled = false;
      await load();
      return toast(rpcRes.error?.message || 'Kon rit niet accepteren.', false);
    }

    // Update local state immediately so it leaves the available pool
    const idx = state.data.bookings.findIndex((b) => b.id === row.id);
    if (idx !== -1 && updatedRow) {
      state.data.bookings[idx] = updatedRow;
    } else {
      Object.assign(row, {
        assigned_driver_id: state.uid,
        driver: state.staff.name,
        status: 'accepted'
      });
    }

    toast(`Rit ${row.ref} geaccepteerd en aan u toegewezen ✓`);
    notifyCustomer(state.data.bookings[idx] || row);
    updateBadges();
    render();
  }

  /**
   * Driver clicks "Decline":
   * Removes the ride from this driver's available pool while keeping it available for other drivers.
   */
  async function handleDriverDecline(row, btn) {
    if (btn) btn.disabled = true;
    state.declinedIds.add(row.id);
    saveLocalDeclined();

    try {
      await db.rpc('decline_ride', { p_booking_id: row.id });
    } catch (_) {}

    toast(`Rit ${row.ref} geweigerd en verborgen uit uw lijst.`);
    updateBadges();
    render();
  }

  /**
   * Driver clicks "Rit Afronden" (Complete) on their own accepted ride.
   */
  async function handleDriverComplete(row, btn) {
    if (btn) btn.disabled = true;
    const rpcRes = await db.rpc('complete_ride', { p_booking_id: row.id });
    if (rpcRes.error) {
      const { error } = await db
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', row.id);
      if (error) {
        if (btn) btn.disabled = false;
        return toast('Afronden mislukt: ' + error.message, false);
      }
    }
    row.status = 'completed';
    toast(`Rit ${row.ref} gemarkeerd als afgerond ✓`);
    updateBadges();
    render();
  }

  // Statuses that e-mail the customer (see supabase/functions/notify-status)
  const NOTIFY = ['confirmed', 'accepted', 'assigned', 'cancelled'];
  const NOTIFY_FUNCTION = 'smart-action';

  function toast(text, ok = true) {
    const t = el('div', { class: 'toast' + (ok ? '' : ' bad'), text });
    document.body.append(t);
    setTimeout(() => t.remove(), 4500);
  }

  async function notifyCustomer(row) {
    if (!NOTIFY.includes(row.status)) return;
    if (!row.email) return;
    const { data, error } = await db.functions.invoke(NOTIFY_FUNCTION, { body: { bookingId: row.id } });
    if (!error && data?.sent) {
      toast(`Bevestigingsmail verstuurd naar ${row.email} ✓`);
    }
  }

  function updateBadges() {
    if (isDriverView()) {
      const availCount = state.data.bookings.filter(isRideAvailableForDriver).length;
      const myActiveCount = state.data.bookings.filter(
        (r) => isRideAssignedToCurrentDriver(r) && normalizeStatus(r.status) === 'accepted'
      ).length;
      const bAvail = $('badge-available');
      const bMine = $('badge-my-rides');
      if (bAvail) { bAvail.textContent = availCount; bAvail.hidden = availCount === 0; }
      if (bMine) { bMine.textContent = myActiveCount; bMine.hidden = myActiveCount === 0; }

      if (isSeniorDriver()) {
        const newMsgCount = state.data.messages.filter(m => m.status === 'new').length;
        const bMsg = $('badge-driver-messages');
        if (bMsg) { bMsg.textContent = newMsgCount; bMsg.hidden = newMsgCount === 0; }
      }
      return;
    }

    const pendingBookings = state.data.bookings.filter((r) => isRideUnassigned(r) && normalizeStatus(r.status) === 'pending').length;
    const newMessages = state.data.messages.filter((r) => r.status === 'new').length;
    const bBook = $('badge-bookings');
    const bMsg = $('badge-messages');
    if (bBook) { bBook.textContent = pendingBookings; bBook.hidden = pendingBookings === 0; }
    if (bMsg) { bMsg.textContent = newMessages; bMsg.hidden = newMessages === 0; }

    const bStaff = $('badge-staff-count');
    if (bStaff && state.staffOverview) {
      bStaff.textContent = state.staffOverview.length;
      bStaff.hidden = state.staffOverview.length === 0;
    }
  }

  function renderStats() {
    const bar = $('stats-bar');
    if (!bar || isDriverView() || state.tab !== 'bookings') {
      if (bar) bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const all = state.data.bookings;
    const unassignedCount = all.filter((r) => isRideUnassigned(r) && normalizeStatus(r.status) !== 'cancelled' && normalizeStatus(r.status) !== 'completed').length;
    const acceptedCount = all.filter((r) => !isRideUnassigned(r) && ['accepted', 'confirmed'].includes(normalizeStatus(r.status))).length;
    const completedCount = all.filter((r) => normalizeStatus(r.status) === 'completed').length;

    bar.replaceChildren(
      el('div', { class: 'stat-card pending' }, [
        el('span', { class: 'stat-label', text: 'Pending (Unassigned)' }),
        el('span', { class: 'stat-val', text: String(unassignedCount) })
      ]),
      el('div', { class: 'stat-card accepted' }, [
        el('span', { class: 'stat-label', text: 'Accepted (Toegewezen)' }),
        el('span', { class: 'stat-val', text: String(acceptedCount) })
      ]),
      el('div', { class: 'stat-card completed' }, [
        el('span', { class: 'stat-label', text: 'Completed (Afgerond)' }),
        el('span', { class: 'stat-val', text: String(completedCount) })
      ]),
      el('div', { class: 'stat-card' }, [
        el('span', { class: 'stat-label', text: 'Totaal Ritten' }),
        el('span', { class: 'stat-val', text: String(all.length) })
      ])
    );
  }

  /* ----------------------------------------------------------- filters */
  function buildFilters() {
    const wrap = $('filters');
    if (!wrap) return;
    wrap.replaceChildren();

    if (isDriverView()) {
      if (state.driverTab === 'messages') {
        const msgOptions = [['all', 'Alle Berichten'], ...STATUS.messages];
        msgOptions.forEach(([key, label]) => {
          wrap.append(el('button', {
            class: 'chip' + (state.filter === key ? ' active' : ''),
            text: label,
            onclick: () => { state.filter = key; buildFilters(); render(); }
          }));
        });
        return;
      }

      const driverOptions = state.driverTab === 'available'
        ? [['all', 'Alle beschikbare ritten']]
        : [['all', 'Alles'], ['accepted', 'Actief (Accepted)'], ['completed', 'Afgerond (Completed)']];

      driverOptions.forEach(([key, label]) => {
        wrap.append(el('button', {
          class: 'chip' + (state.filter === key ? ' active' : ''),
          text: label,
          onclick: () => { state.filter = key; buildFilters(); render(); }
        }));
      });
      return;
    }

    if (state.tab === 'staff') {
      const staffOptions = [
        ['all', 'Alle Medewerkers'],
        ['admins', 'Beheerders (Admins)'],
        ['senior', 'Senior Chauffeurs'],
        ['drivers', 'Chauffeurs'],
        ['blocked', 'Geblokkeerd']
      ];
      staffOptions.forEach(([key, label]) => {
        wrap.append(el('button', {
          class: 'chip' + (state.filter === key ? ' active' : ''),
          text: label,
          onclick: () => { state.filter = key; buildFilters(); render(); }
        }));
      });
      return;
    }

    const doneStates = state.tab === 'bookings' ? ['completed', 'cancelled'] : ['archived'];
    const options = [['open', 'Open'], ['all', 'Alles'], ...STATUS[state.tab]];
    options.forEach(([key, label]) => {
      wrap.append(el('button', {
        class: 'chip' + (state.filter === key ? ' active' : ''),
        text: label,
        onclick: () => { state.filter = key; buildFilters(); render(); }
      }));
    });
    state.doneStates = doneStates;
  }

  // Admin tab switcher
  document.querySelectorAll('#admin-tabs .seg').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('#admin-tabs .seg').forEach((b) => b.classList.toggle('active', b === btn));
    state.tab = btn.dataset.tab;
    state.filter = state.tab === 'staff' ? 'all' : 'open';
    buildFilters();
    renderStats();
    render();
  }));

  // Driver tab switcher
  document.querySelectorAll('#driver-tabs .seg').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('#driver-tabs .seg').forEach((b) => b.classList.toggle('active', b === btn));
    state.driverTab = btn.dataset.dtab;
    state.filter = 'all';
    buildFilters();
    render();
  }));

  $('search')?.addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    render();
  });

  /* ------------------------------------------------------------ render */
  function matchesSearch(r) {
    if (!state.search) return true;
    const driverName = getAssignedDriverName(r) || 'pending';
    return (
      Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(state.search)) ||
      driverName.toLowerCase().includes(state.search)
    );
  }

  function visibleStaffRows() {
    if (!state.staffOverview) return [];
    return state.staffOverview.filter((st) => {
      if (state.filter === 'admins' && !['owner', 'admin'].includes(st.role)) return false;
      if (state.filter === 'senior' && st.role !== 'senior_driver') return false;
      if (state.filter === 'drivers' && st.role !== 'driver') return false;
      if (state.filter === 'blocked' && !st.is_blocked) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        return (
          st.name.toLowerCase().includes(q) ||
          (st.email && st.email.toLowerCase().includes(q)) ||
          st.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  function visibleRows() {
    if (isDriverView()) {
      if (state.driverTab === 'messages') {
        return state.data.messages.filter((r) => {
          if (state.filter !== 'all' && r.status !== state.filter) return false;
          return matchesSearch(r);
        });
      }

      return state.data.bookings.filter((r) => {
        if (state.driverTab === 'available') {
          if (!isRideAvailableForDriver(r)) return false;
        } else {
          if (!isRideAssignedToCurrentDriver(r)) return false;
          const norm = normalizeStatus(r.status);
          if (state.filter !== 'all' && norm !== state.filter) return false;
        }
        return matchesSearch(r);
      });
    }

    if (state.tab === 'staff') {
      return visibleStaffRows();
    }

    return state.data[state.tab].filter((r) => {
      const norm = state.tab === 'bookings' ? normalizeStatus(r.status) : r.status;
      if (state.filter === 'open' && state.doneStates.includes(norm)) return false;
      if (!['open', 'all'].includes(state.filter) && norm !== state.filter) return false;
      return matchesSearch(r);
    });
  }

  function render() {
    const list = $('list');
    if (!list) return;
    list.replaceChildren();

    if (state.tab === 'staff' && !isDriverView()) {
      const staffList = visibleStaffRows();
      if ($('empty')) $('empty').hidden = staffList.length > 0;
      if (staffList.length === 0) return;
      const grid = el('div', { class: 'staff-overview-grid' });
      staffList.forEach((st) => grid.append(staffDashboardCard(st)));
      list.append(grid);
      return;
    }

    const rows = visibleRows();
    if ($('empty')) $('empty').hidden = rows.length > 0;
    if (rows.length === 0) return;

    if (isDriverView()) {
      if (state.driverTab === 'messages') {
        rows.forEach((r) => list.append(messageCard(r)));
        return;
      }
      rows.forEach((r) => list.append(driverRideCard(r)));
      return;
    }

    if (state.tab === 'bookings') {
      list.append(adminBookingsTable(rows));
    } else {
      rows.forEach((r) => list.append(messageCard(r)));
    }
  }

  /* ------------------------------------------- Staff Dashboard Card */
  function staffDashboardCard(st) {
    const isOwnerCard = st.role === 'owner';
    const isMe = st.user_id === state.uid;
    const isBlocked = Boolean(st.is_blocked);
    const card = el('article', { class: 'staff-card' + (isBlocked ? ' is-blocked' : '') });

    let badgeClass = 'role-badge';
    if (st.role === 'owner') badgeClass += ' owner';
    else if (st.role === 'admin') badgeClass += ' admin';
    else if (st.role === 'senior_driver') badgeClass += ' senior';
    else badgeClass += ' driver';

    const roleBadge = el('span', { class: badgeClass, text: formatRole(st.role) });
    const statusBadge = isBlocked
      ? el('span', { class: 'role-badge blocked', text: '✕ Geblokkeerd' })
      : el('span', { class: 'role-badge driver', text: '✓ Actief' });

    const head = el('div', { class: 'staff-card-header' }, [
      el('div', {}, [
        el('div', { class: 'staff-name-title' }, [
          document.createTextNode(st.name),
          isMe ? el('span', { class: 'pill', style: 'background:#5e5ce6;font-size:0.68rem', text: 'Jij' }) : null
        ]),
        el('div', { class: 'staff-email-sub', text: st.email || 'Geen e-mailadres' })
      ]),
      el('div', { style: 'display:flex;gap:6px;flex-direction:column;align-items:flex-end' }, [
        roleBadge, statusBadge
      ])
    ]);

    const lastLoginText = st.last_login_at
      ? fmtCreated(st.last_login_at)
      : 'Nog niet ingelogd';
    const createdText = st.created_at ? fmtCreated(st.created_at) : '-';

    const metaRow = el('div', { class: 'staff-meta-row' }, [
      el('span', {}, [document.createTextNode('🕒 Laatst ingelogd: '), el('strong', { text: lastLoginText })]),
      el('span', {}, [document.createTextNode('📅 Aangemaakt: '), el('strong', { text: createdText })])
    ]);

    const metrics = el('div', { class: 'staff-metrics' }, [
      el('div', { class: 'staff-metric-box' }, [
        el('div', { class: 'staff-metric-val', text: String(st.total_assigned || 0) }),
        el('div', { class: 'staff-metric-lbl', text: 'Toegewezen' })
      ]),
      el('div', { class: 'staff-metric-box' }, [
        el('div', { class: 'staff-metric-val', style: 'color:#30a46c', text: String(st.total_completed || 0) }),
        el('div', { class: 'staff-metric-lbl', text: 'Afgerond' })
      ]),
      el('div', { class: 'staff-metric-box' }, [
        el('div', { class: 'staff-metric-val', style: 'color:#5e5ce6', text: String(st.active_rides || 0) }),
        el('div', { class: 'staff-metric-lbl', text: 'Actief Nu' })
      ])
    ]);

    const isHistoryOpen = state.expandedStaffId === st.user_id;
    const historyToggleBtn = el('button', {
      class: 'btn ghost small',
      text: isHistoryOpen ? 'Verberg Ritten ▲' : `Ritten Bekijken (${st.total_assigned || 0}) ▼`,
      onclick: async () => {
        state.expandedStaffId = state.expandedStaffId === st.user_id ? null : st.user_id;
        render();
      }
    });

    const actionRow = el('div', { class: 'staff-card-actions' });

    if (!isOwnerCard && (!isMe || isRealOwner())) {
      const roleSelect = el('select', { class: 'staff-role-select' }, [
        el('option', { value: 'driver', text: 'Chauffeur', ...(st.role === 'driver' ? { selected: true } : {}) }),
        el('option', { value: 'senior_driver', text: 'Senior Chauffeur', ...(st.role === 'senior_driver' ? { selected: true } : {}) }),
        el('option', { value: 'admin', text: 'Admin (Beheerder)', ...(st.role === 'admin' ? { selected: true } : {}) })
      ]);
      if (isRealOwner()) {
        roleSelect.append(el('option', { value: 'owner', text: 'Eigenaar (Owner)', ...(st.role === 'owner' ? { selected: true } : {}) }));
      }
      roleSelect.addEventListener('change', () => handleUpdateStaffRole(st, roleSelect.value));
      actionRow.append(roleSelect);

      const blockBtn = isBlocked
        ? el('button', { class: 'btn success small', text: '✓ Deblokkeren', onclick: () => handleToggleStaffBlock(st) })
        : el('button', { class: 'btn decline small', text: '✕ Blokkeren', onclick: () => handleToggleStaffBlock(st) });
      actionRow.append(blockBtn);
    } else if (isOwnerCard) {
      actionRow.append(el('span', { class: 'muted', style: 'font-size:0.8rem', text: '★ Primaire Eigenaar' }));
    }

    actionRow.append(historyToggleBtn);

    card.append(head, metaRow, metrics, actionRow);

    if (isHistoryOpen) {
      const historyDrawer = el('div', { class: 'staff-history-drawer' });
      historyDrawer.append(el('div', { class: 'staff-history-title', text: `Ritgeschiedenis van ${st.name}` }));

      const listEl = el('div', { class: 'staff-history-list' }, [
        el('div', { class: 'muted', text: 'Laden van ritten…' })
      ]);
      historyDrawer.append(listEl);
      card.append(historyDrawer);

      loadDriverRideHistory(st.user_id).then((rides) => {
        listEl.replaceChildren();
        if (!rides || rides.length === 0) {
          listEl.append(el('div', { class: 'muted', text: 'Nog geen ritten gereden door deze chauffeur.' }));
          return;
        }
        rides.forEach((ride) => {
          const item = el('div', { class: 'staff-history-item' }, [
            el('div', {}, [
              el('span', { class: 'ref-badge', text: ride.ref }),
              document.createTextNode(' · '),
              el('span', { class: 'route-text', text: `${ride.pickup} → ${ride.dropoff}` }),
              el('div', { class: 'cell-sub', text: `${fmtDate(ride.pickup_at)} · ${ride.vehicle || '-'} · ${ride.ippa || ''}` })
            ]),
            el('span', { class: 'pill', style: `background:${statusColor(ride.status)}`, text: LABEL[ride.status] || ride.status })
          ]);
          listEl.append(item);
        });
      });
    }

    return card;
  }

  /* -------------------------------------------- Driver Dashboard Cards */
  function driverRideCard(r) {
    const norm = normalizeStatus(r.status);
    const pill = el('span', { class: 'pill', text: LABEL[norm] || norm });
    pill.style.background = statusColor(norm);

    const availableMode = state.driverTab === 'available';

    let actionArea = null;
    if (availableMode) {
      const acceptBtn = el('button', {
        class: 'btn success',
        text: '✓ Accept (Rit Accepteren)',
        onclick: () => handleDriverAccept(r, acceptBtn)
      });
      const declineBtn = el('button', {
        class: 'btn decline',
        text: '✕ Decline (Weigeren)',
        onclick: () => handleDriverDecline(r, declineBtn)
      });
      actionArea = el('div', { class: 'driver-actions' }, [acceptBtn, declineBtn]);
    } else {
      const children = [...contactActions(r)];
      if (norm !== 'completed') {
        const completeBtn = el('button', {
          class: 'btn primary',
          text: '✓ Markeer als Completed',
          onclick: () => handleDriverComplete(r, completeBtn)
        });
        children.push(completeBtn);
      }
      actionArea = el('div', { class: 'driver-actions' }, children);
    }

    return el('article', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h3', { text: availableMode ? `${r.name.split(' ')[0]} (${r.ref})` : r.name }),
        el('span', { class: 'ref', text: `${r.ref} · ${fmtCreated(r.created_at)}` }),
        pill
      ]),
      el('div', { class: 'route' }, [
        document.createTextNode(r.pickup),
        el('span', { class: 'arrow', text: '→' }),
        document.createTextNode(r.dropoff)
      ]),
      el('div', { class: 'meta' }, [
        el('span', {}, [document.createTextNode('Ophaaltijd: '), el('b', { text: fmtDate(r.pickup_at) })]),
        el('span', { text: `Voertuig: ${r.vehicle || '-'}` }),
        el('span', { text: `Passagiers: ${r.passengers ?? '-'}` }),
        el('span', { class: 'ippa-tag', text: r.ippa || '' })
      ]),
      r.notes ? el('div', { class: 'note', text: `Opmerking klant: ${r.notes}` }) : null,
      actionArea
    ]);
  }

  /* ---------------------------------------------- Admin Dispatch Table */
  function adminBookingsTable(rows) {
    const tbody = el('tbody');

    rows.forEach((r) => {
      const norm = normalizeStatus(r.status);
      const assignedName = getAssignedDriverName(r);
      const isExpanded = state.expandedId === r.id;

      // Dedicated Assigned Driver Column: shows driver's name or 'Pending'
      const driverBadge = assignedName
        ? el('span', { class: 'driver-badge assigned' }, [
            el('span', { class: 'driver-dot' }),
            document.createTextNode(assignedName)
          ])
        : el('span', { class: 'driver-badge pending' }, [
            el('span', { class: 'driver-dot' }),
            document.createTextNode('Pending')
          ]);

      const statusPill = el('span', { class: 'pill', text: LABEL[norm] || norm });
      statusPill.style.background = statusColor(norm);

      const toggleBtn = el('button', {
        class: 'btn ghost',
        text: isExpanded ? 'Sluiten ▲' : 'Beheer ▼',
        onclick: () => {
          state.expandedId = state.expandedId === r.id ? null : r.id;
          render();
        }
      });

      const tr = el('tr', { class: 'ride-row' }, [
        el('td', {}, [
          el('div', { class: 'cell-ref', text: r.ref }),
          el('div', { class: 'cell-sub', text: fmtDate(r.pickup_at) })
        ]),
        el('td', {}, [
          el('div', { style: 'font-weight:600', text: r.name }),
          el('div', { class: 'cell-sub', text: r.phone || r.email || '-' })
        ]),
        el('td', { class: 'cell-route' }, [
          document.createTextNode(r.pickup),
          el('span', { class: 'arrow', text: '→' }),
          document.createTextNode(r.dropoff)
        ]),
        el('td', {}, [
          el('div', { text: `${r.vehicle || '-'} (${r.passengers ?? 1}p)` }),
          el('div', { class: 'cell-sub ippa-tag', text: r.ippa || '-' })
        ]),
        // Requirement 4: Assigned Driver column right next to every ride
        el('td', {}, [driverBadge]),
        el('td', {}, [statusPill]),
        el('td', { style: 'text-align:right' }, [toggleBtn])
      ]);

      tbody.append(tr);

      if (isExpanded) {
        tbody.append(adminDetailRow(r));
      }
    });

    const table = el('table', { class: 'dispatch-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { text: 'Ref / Ophaaltijd' }),
          el('th', { text: 'Klant' }),
          el('th', { text: 'Route (Van → Naar)' }),
          el('th', { text: 'Voertuig & IPPA' }),
          el('th', { text: 'Assigned Driver' }),
          el('th', { text: 'Status' }),
          el('th', { style: 'text-align:right', text: 'Actie' })
        ])
      ]),
      tbody
    ]);

    return el('div', { class: 'table-wrap' }, [table]);
  }

  function adminDetailRow(r) {
    const saved = el('span', { class: 'saved' });
    const norm = normalizeStatus(r.status);

    // Status dropdown
    const statusSel = el('select', {}, STATUS.bookings.map(([k, l]) =>
      el('option', { value: k, text: l, ...(norm === k ? { selected: true } : {}) })
    ));

    // Assigned Driver selector (links assigned_driver_id to staff table)
    const driverOptions = [
      el('option', { value: '', text: '— Pending (Geen chauffeur toegewezen) —' }),
      ...state.staffList.map((st) =>
        el('option', {
          value: st.user_id,
          text: `${st.name} (${st.role === 'owner' ? 'Owner' : (st.role === 'admin' ? 'Admin' : 'Driver')})`,
          ...(r.assigned_driver_id === st.user_id ? { selected: true } : {})
        })
      )
    ];
    const driverSelect = el('select', {}, driverOptions);

    // Manual driver name override (for external/partner drivers)
    const driverTextInput = el('input', {
      type: 'text',
      placeholder: 'Of typ naam chauffeur handmatig…',
      value: r.driver || ''
    });

    statusSel.addEventListener('change', async () => {
      const nextStatus = statusSel.value;
      const patch = { status: nextStatus };
      if (nextStatus === 'pending') {
        patch.assigned_driver_id = null;
        patch.driver = null;
      }
      if (await update('bookings', r.id, patch, saved)) {
        notifyCustomer(r);
        render();
      }
    });

    driverSelect.addEventListener('change', async () => {
      const selectedUid = driverSelect.value || null;
      const staffMember = selectedUid ? state.staffMap[selectedUid] : null;
      const patch = {
        assigned_driver_id: selectedUid,
        driver: staffMember ? staffMember.name : null,
        status: selectedUid && normalizeStatus(r.status) === 'pending' ? 'accepted' : r.status
      };
      if (await update('bookings', r.id, patch, saved)) {
        driverTextInput.value = patch.driver || '';
        notifyCustomer(r);
        render();
      }
    });

    driverTextInput.addEventListener('change', async () => {
      const customName = driverTextInput.value.trim() || null;
      const patch = {
        driver: customName,
        assigned_driver_id: customName ? r.assigned_driver_id : null,
        status: customName && normalizeStatus(r.status) === 'pending' ? 'accepted' : r.status
      };
      if (await update('bookings', r.id, patch, saved)) {
        render();
      }
    });

    // Customer detail fields (Editable ONLY by Admin / Owner)
    const custNameInput = el('input', { type: 'text', value: r.name || '' });
    const custPhoneInput = el('input', { type: 'text', value: r.phone || '' });
    const custEmailInput = el('input', { type: 'email', value: r.email || '' });
    const pickupInput = el('input', { type: 'text', value: r.pickup || '' });
    const dropoffInput = el('input', { type: 'text', value: r.dropoff || '' });
    const internalInput = el('textarea', { placeholder: 'Interne notitie voor centrale (niet zichtbaar voor klant)' });
    internalInput.value = r.internal_note || '';

    custNameInput.addEventListener('change', () => update('bookings', r.id, { name: custNameInput.value.trim() }, saved));
    custPhoneInput.addEventListener('change', () => update('bookings', r.id, { phone: custPhoneInput.value.trim() }, saved));
    custEmailInput.addEventListener('change', () => update('bookings', r.id, { email: custEmailInput.value.trim() || null }, saved));
    pickupInput.addEventListener('change', () => update('bookings', r.id, { pickup: pickupInput.value.trim() }, saved));
    dropoffInput.addEventListener('change', () => update('bookings', r.id, { dropoff: dropoffInput.value.trim() }, saved));
    internalInput.addEventListener('change', () => update('bookings', r.id, { internal_note: internalInput.value.trim() || null }, saved));

    const content = el('div', {}, [
      r.notes ? el('div', { class: 'note', style: 'margin-top:0;margin-bottom:14px', text: `Klantnotitie: ${r.notes}` }) : null,
      el('div', { class: 'edit-grid' }, [
        el('div', {}, [el('label', { text: 'Rit Status' }), statusSel]),
        el('div', {}, [el('label', { text: 'Koppel Chauffeur Account' }), driverSelect]),
        el('div', {}, [el('label', { text: 'Weergavenaam Chauffeur' }), driverTextInput]),

        el('div', { class: 'edit-section-title', text: 'Klant- & Ritgegevens Bewerken (Alleen Admin)' }),
        el('div', {}, [el('label', { text: 'Naam Klant' }), custNameInput]),
        el('div', {}, [el('label', { text: 'Telefoonnummer' }), custPhoneInput]),
        el('div', {}, [el('label', { text: 'E-mailadres' }), custEmailInput]),
        el('div', {}, [el('label', { text: 'Ophaaladres' }), pickupInput]),
        el('div', { class: 'span-2' }, [el('label', { text: 'Bestemming' }), dropoffInput]),
        el('div', { class: 'full' }, [el('label', { text: 'Interne Notitie' }), internalInput])
      ]),
      el('div', { class: 'actions' }, [
        ...contactActions(r),
        el('a', { href: `../status.html?t=${r.track_token}`, target: '_blank', rel: 'noopener', text: 'Statuspagina Klant ↗' }),
        deleteButton('bookings', r),
        saved
      ])
    ]);

    return el('tr', { class: 'detail-row' }, [
      el('td', { colspan: '7' }, [content])
    ]);
  }

  function contactActions(row) {
    const acts = [];
    if (row.phone) {
      acts.push(el('a', { href: 'tel:' + digits(row.phone), text: 'Bel Klant' }));
      acts.push(el('a', { href: 'https://wa.me/' + waNumber(row.phone), target: '_blank', rel: 'noopener', text: 'WhatsApp' }));
    }
    if (row.email && (isOwner() || isSeniorDriver())) {
      acts.push(el('a', { href: 'mailto:' + row.email, text: 'E-mail' }));
    }
    return acts;
  }

  function deleteButton(table, row) {
    if (!isOwner()) return null;
    return el('button', {
      class: 'small danger',
      text: 'Verwijderen',
      onclick: async () => {
        if (!confirm('Deze rit definitief verwijderen?')) return;
        const { error } = await db.from(table).delete().eq('id', row.id);
        if (error) return toast('Verwijderen mislukt: ' + error.message, false);
        state.data[table] = state.data[table].filter((r) => r.id !== row.id);
        updateBadges();
        renderStats();
        render();
      }
    });
  }

  function messageCard(r) {
    const saved = el('span', { class: 'saved' });
    const status = el('select', {}, STATUS.messages.map(([k, l]) =>
      el('option', { value: k, text: l, ...(r.status === k ? { selected: true } : {}) })
    ));
    const pill = el('span', { class: 'pill', text: LABEL[r.status] });
    pill.style.background = statusColor(r.status);
    status.addEventListener('change', async () => {
      if (await update('messages', r.id, { status: status.value }, saved)) {
        pill.textContent = LABEL[r.status];
        pill.style.background = statusColor(r.status);
        if (state.filter !== 'all') render();
      }
    });
    return el('article', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h3', { text: r.name }),
        el('span', { class: 'ref', text: fmtCreated(r.created_at) }),
        pill
      ]),
      el('div', { class: 'meta' }, [
        el('span', { text: r.email }),
        r.phone ? el('span', { text: r.phone }) : null
      ]),
      el('p', { class: 'message-body', text: r.message }),
      el('div', { class: 'actions' }, [
        ...contactActions(r),
        el('div', { style: 'min-width:150px' }, [status]),
        deleteButton('messages', r),
        saved
      ])
    ]);
  }

  boot();
})();
