/**
 * IPPATAXI dashboard.
 * All security is enforced server-side by Supabase Row Level Security (see supabase/schema.sql).
 * This script only renders what the logged-in user is allowed to read.
 */
(function () {
  'use strict';

  const cfg = window.IPPA_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const views = { login: $('login-view'), app: $('app-view'), denied: $('denied-view') };

  const STATUS = {
    bookings: [
      ['new', 'Nieuw'], ['confirmed', 'Bevestigd'], ['assigned', 'Toegewezen'],
      ['completed', 'Afgerond'], ['cancelled', 'Geannuleerd']
    ],
    messages: [
      ['new', 'Nieuw'], ['read', 'Gelezen'], ['replied', 'Beantwoord'], ['archived', 'Gearchiveerd']
    ]
  };
  const LABEL = Object.fromEntries([...STATUS.bookings, ...STATUS.messages]);

  const state = { tab: 'bookings', filter: 'open', search: '', data: { bookings: [], messages: [] }, staff: null };

  if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) {
    show('login');
    showError('Supabase is nog niet ingesteld in js/config.js.');
    return;
  }
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  /* ---------------------------------------------------------- helpers */
  function show(name) {
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
  }
  function showError(msg) {
    const el = $('login-error'); el.textContent = msg; el.hidden = !msg;
  }
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
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
  function statusColor(s) { return `var(--s-${s})`; }

  /* ------------------------------------------------------------- auth */
  async function boot() {
    const { data } = await db.auth.getSession();
    if (data.session) await enter(); else show('login');
  }

  async function enter() {
    const { data: userData } = await db.auth.getUser();
    const uid = userData?.user?.id;
    const { data: staff } = await db.from('staff').select('name, role').eq('user_id', uid).maybeSingle();
    if (!staff) { show('denied'); return; }
    state.staff = staff;
    $('who').textContent = staff.name;
    show('app');
    buildFilters();
    await load();
    clearInterval(state.timer);
    state.timer = setInterval(load, 30000);
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const btn = $('login-btn'); btn.disabled = true;
    const { error } = await db.auth.signInWithPassword({
      email: $('login-email').value.trim(),
      password: $('login-password').value
    });
    btn.disabled = false;
    if (error) { showError('Inloggen mislukt. Controleer e-mail en wachtwoord.'); return; }
    $('login-password').value = '';
    await enter();
  });

  async function logout() {
    clearInterval(state.timer);
    await db.auth.signOut();
    state.data = { bookings: [], messages: [] };
    show('login');
  }
  $('logout-btn').addEventListener('click', logout);
  $('denied-logout').addEventListener('click', logout);
  $('refresh-btn').addEventListener('click', load);

  /* -------------------------------------------------------------- data */
  async function load() {
    const [b, m] = await Promise.all([
      db.from('bookings').select('*').order('created_at', { ascending: false }).limit(500),
      db.from('messages').select('*').order('created_at', { ascending: false }).limit(500)
    ]);
    if (b.error || m.error) {
      if ((b.error || m.error).code === 'PGRST301') return logout(); // expired session
      console.error(b.error || m.error);
    }
    state.data.bookings = b.data || [];
    state.data.messages = m.data || [];
    updateBadges();
    render();
  }

  async function update(table, id, patch, indicator) {
    const { error } = await db.from(table).update(patch).eq('id', id);
    if (error) { alert('Opslaan mislukt: ' + error.message); return false; }
    const row = state.data[table].find((r) => r.id === id);
    Object.assign(row, patch);
    updateBadges();
    if (indicator) {
      indicator.textContent = 'Opgeslagen ✓';
      setTimeout(() => { if (indicator.textContent === 'Opgeslagen ✓') indicator.textContent = ''; }, 2000);
    }
    return true;
  }

  // Statuses that e-mail the customer (see supabase/functions/notify-status)
  const NOTIFY = ['confirmed', 'assigned', 'cancelled'];

  function toast(text, ok = true) {
    const t = el('div', { class: 'toast' + (ok ? '' : ' bad'), text });
    document.body.append(t);
    setTimeout(() => t.remove(), 5000);
  }

  // Supabase function slug (its endpoint URL: /functions/v1/smart-action). The slug is fixed at creation.
  const NOTIFY_FUNCTION = 'smart-action';

  async function notifyCustomer(row) {
    if (!NOTIFY.includes(row.status)) return;
    if (!row.email) return toast('Opgeslagen · geen e-mail bekend voor deze klant', false);
    const { data, error } = await db.functions.invoke(NOTIFY_FUNCTION, { body: { bookingId: row.id } });
    if (!error && data?.sent) return toast(`E-mail verstuurd naar ${row.email} ✓`);
    console.error('notify-status failed', error, data);
    toast('E-mail versturen mislukt ✗ (zie console of function logs)', false);
  }

  function updateBadges() {
    ['bookings', 'messages'].forEach((t) => {
      const n = state.data[t].filter((r) => r.status === 'new').length;
      const badge = $('badge-' + t);
      badge.textContent = n; badge.hidden = n === 0;
    });
  }

  /* ----------------------------------------------------------- filters */
  function buildFilters() {
    const wrap = $('filters'); wrap.replaceChildren();
    const doneStates = state.tab === 'bookings' ? ['completed', 'cancelled'] : ['archived'];
    const options = [['open', 'Open'], ['all', 'Alles'], ...STATUS[state.tab]];
    options.forEach(([key, label]) => {
      wrap.append(el('button', {
        class: 'chip' + (state.filter === key ? ' active' : ''), text: label,
        onclick: () => { state.filter = key; buildFilters(); render(); }
      }));
    });
    state.doneStates = doneStates;
  }

  document.querySelectorAll('.seg').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === btn));
    state.tab = btn.dataset.tab; state.filter = 'open';
    buildFilters(); render();
  }));
  $('search').addEventListener('input', (e) => { state.search = e.target.value.toLowerCase(); render(); });

  /* ------------------------------------------------------------ render */
  function visibleRows() {
    return state.data[state.tab].filter((r) => {
      if (state.filter === 'open' && state.doneStates.includes(r.status)) return false;
      if (!['open', 'all'].includes(state.filter) && r.status !== state.filter) return false;
      if (state.search) {
        return Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(state.search));
      }
      return true;
    });
  }

  function render() {
    const rows = visibleRows();
    const list = $('list'); list.replaceChildren();
    $('empty').hidden = rows.length > 0;
    rows.forEach((r) => list.append(state.tab === 'bookings' ? bookingCard(r) : messageCard(r)));
  }

  function statusSelect(table, row) {
    const sel = el('select', {}, STATUS[table].map(([k, l]) => el('option', { value: k, text: l, ...(row.status === k ? { selected: '' } : {}) })));
    return sel;
  }

  function contactActions(row) {
    const acts = [];
    if (row.phone) {
      acts.push(el('a', { href: 'tel:' + digits(row.phone), text: 'Bel' }));
      acts.push(el('a', { href: 'https://wa.me/' + waNumber(row.phone), target: '_blank', rel: 'noopener', text: 'WhatsApp' }));
    }
    if (row.email) acts.push(el('a', { href: 'mailto:' + row.email, text: 'E-mail' }));
    return acts;
  }

  function deleteButton(table, row) {
    if (state.staff?.role !== 'owner') return null;
    return el('button', {
      class: 'small danger', text: 'Verwijderen',
      onclick: async () => {
        if (!confirm('Definitief verwijderen?')) return;
        const { error } = await db.from(table).delete().eq('id', row.id);
        if (error) return alert('Verwijderen mislukt: ' + error.message);
        state.data[table] = state.data[table].filter((r) => r.id !== row.id);
        updateBadges(); render();
      }
    });
  }

  function bookingCard(r) {
    const saved = el('span', { class: 'saved' });
    const status = statusSelect('bookings', r);
    const pill = el('span', { class: 'pill', text: LABEL[r.status] });
    pill.style.background = statusColor(r.status);
    status.addEventListener('change', async () => {
      if (await update('bookings', r.id, { status: status.value }, saved)) {
        pill.textContent = LABEL[r.status]; pill.style.background = statusColor(r.status);
        notifyCustomer(r);
        if (state.filter !== 'all') render();
      }
    });

    const driver = el('input', { type: 'text', placeholder: 'Naam chauffeur', value: r.driver || '' });
    driver.addEventListener('change', () => update('bookings', r.id, { driver: driver.value.trim() || null }, saved));
    const internal = el('textarea', { placeholder: 'Interne notitie (niet zichtbaar voor klant)' });
    internal.value = r.internal_note || '';
    internal.addEventListener('change', () => update('bookings', r.id, { internal_note: internal.value.trim() || null }, saved));

    return el('article', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h3', { text: r.name }), el('span', { class: 'ref', text: `${r.ref} · ${fmtCreated(r.created_at)}` }), pill
      ]),
      el('div', { class: 'route' }, [
        document.createTextNode(r.pickup), el('span', { class: 'arrow', text: '→' }), document.createTextNode(r.dropoff)
      ]),
      el('div', { class: 'meta' }, [
        el('span', {}, [document.createTextNode('📅 '), el('b', { text: fmtDate(r.pickup_at) })]),
        el('span', { text: `🚗 ${r.vehicle || '-'}` }),
        el('span', { text: `👥 ${r.passengers ?? '-'}` }),
        el('span', { class: 'ippa-tag', text: r.ippa || '' })
      ]),
      r.notes ? el('div', { class: 'note', text: r.notes }) : null,
      el('div', { class: 'edit' }, [
        el('div', {}, [el('label', { text: 'Status' }), status]),
        el('div', {}, [el('label', { text: 'Chauffeur' }), driver]),
        el('div', { class: 'full' }, [el('label', { text: 'Interne notitie' }), internal])
      ]),
      el('div', { class: 'actions' }, [...contactActions(r), deleteButton('bookings', r), saved])
    ]);
  }

  function messageCard(r) {
    const saved = el('span', { class: 'saved' });
    const status = statusSelect('messages', r);
    const pill = el('span', { class: 'pill', text: LABEL[r.status] });
    pill.style.background = statusColor(r.status);
    status.addEventListener('change', async () => {
      if (await update('messages', r.id, { status: status.value }, saved)) {
        pill.textContent = LABEL[r.status]; pill.style.background = statusColor(r.status);
        if (state.filter !== 'all') render();
      }
    });
    return el('article', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h3', { text: r.name }), el('span', { class: 'ref', text: fmtCreated(r.created_at) }), pill
      ]),
      el('div', { class: 'meta' }, [el('span', { text: r.email }), r.phone ? el('span', { text: r.phone }) : null]),
      el('p', { class: 'message-body', text: r.message }),
      el('div', { class: 'actions' }, [
        ...contactActions(r),
        el('div', { style: 'min-width:150px' }, [status]),
        deleteButton('messages', r), saved
      ])
    ]);
  }

  boot();
})();
