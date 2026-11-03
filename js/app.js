/**
 * IPPATAXI.NL - 3-Tier IPPA System Application Logic
 * Concept: Customers pay the driver with IPPA instead of money!
 * - Type A IPPA: Short rides (< 15 km)
 * - Type B IPPA: Medium rides (15 - 50 km, e.g., Schiphol transfers)
 * - Type C IPPA: Long rides (> 50 km, e.g., Intercity & regional)
 */

// Application State
const appState = {
  currentLang: localStorage.getItem('ippa_lang') || 'nl',
  currencyMode: localStorage.getItem('ippa_currency_mode') || 'ippa', // 'ippa' | 'real_money'
  paymentMethod: 'ideal', // 'ideal' | 'stripe' | 'taxi'
  activeTab: 'standard', // 'standard' | 'airport' | 'hourly'
  vehicleType: 'sedan',  // 'sedan' | 'estate' | 'van'
  isBookingSubmitting: false,
  bookingCompleted: false,
  routeCache: {},        // key -> { distanceKm, durationMin, source }
  liveRouteMetrics: null, // { key, distanceKm, durationMin, source }
  routesPreset: {
    'ams-schiphol': { from: 'Amsterdam Centrum', to: 'Schiphol Airport (AMS)', km: 18, min: 20, tier: 'B', tierName: 'Type B IPPA' },
    'utr-schiphol': { from: 'Utrecht', to: 'Schiphol Airport (AMS)', km: 48, min: 35, tier: 'B', tierName: 'Type B IPPA' },
    'dh-schiphol': { from: 'Den Haag', to: 'Schiphol Airport (AMS)', km: 45, min: 35, tier: 'B', tierName: 'Type B IPPA' },
    'rtm-schiphol': { from: 'Rotterdam', to: 'Schiphol Airport (AMS)', km: 60, min: 45, tier: 'C', tierName: 'Type C IPPA' },
    'hlm-schiphol': { from: 'Haarlem', to: 'Schiphol Airport (AMS)', km: 20, min: 22, tier: 'B', tierName: 'Type B IPPA' },
    'alm-schiphol': { from: 'Almere', to: 'Schiphol Airport (AMS)', km: 42, min: 34, tier: 'B', tierName: 'Type B IPPA' },
    'ams-stad': { from: 'Amsterdam Centrum', to: 'Amsterdam Zuid / Station', km: 7, min: 15, tier: 'A', tierName: 'Type A IPPA' },
    'ehv-schiphol': { from: 'Eindhoven', to: 'Schiphol Airport (AMS)', km: 125, min: 80, tier: 'C', tierName: 'Type C IPPA' }
  }
};

// Bilingual Translations Dictionary
const translations = {
  nl: {
    navHome: 'Home',
    navIppaSystem: 'Het Concept',
    navAirport: 'Schiphol & Routes',
    navFleet: 'Wagenpark',
    navWhyUs: 'Zekerheden',
    navContact: 'Contact',
    btnBookNav: 'Rit Reserveren',
    heroTag: '24/7 Chauffeursservice • Heel Nederland',
    heroTitle: 'Eersteklas taxivervoer, eenvoudig betaald met IPPA.',
    heroDesc: 'Geen lopende meter, geen contant geld en geen pinpas. U reist in een comfortabele Mercedes met privéchauffeur en voldoet uw rit bij aankomst met één vaste IPPA op basis van de afstand.',
    feat1: 'Vast tarieftype vooraf — nooit verrassingen achteraf',
    feat2: 'Luxe Mercedes-Benz vloot met gecertificeerde chauffeurs',
    feat3: 'Inclusief Schiphol vluchtmonitoring en wachttijdservice',
    btnHeroWa: 'Boek via WhatsApp',
    btnHeroCall: 'Bel Centrale (24/7)',
    cardTitle: 'Bereken & Reserveer Uw Rit',
    cardSubtitle: 'Zie direct welk type IPPA uw route vereist',
    tabStandard: 'Standaard Rit',
    tabAirport: 'Schiphol Transfer',
    tabHourly: 'Lange Afstand',
    lblPickup: 'Ophaaladres of plaats',
    lblDropoff: 'Bestemming of luchthaven',
    lblDateTime: 'Datum & tijd',
    lblPassengers: 'Passagiers',
    lblVehicle: 'Kies voertuigklasse',
    vehSedan: 'Executive Sedan',
    vehSedanSub: '1–4 pers • 3 koffers',
    vehEstate: 'Stationwagen',
    vehEstateSub: '1–4 pers • 5 koffers',
    vehVan: 'VIP Taxibus',
    vehVanSub: 'Tot 8 pers • 8 koffers',
    fareTag: 'Benodigde betaling',
    fareNote: 'Overhandig bij aankomst',
    btnBookSubmit: 'Rit Reserveren met IPPA',
    statAvailability: 'Dag en nacht beschikbaar',
    routesTag: 'Schiphol & Steden',
    routesTitle: 'Veelgeboekte Vaste Routes',
    routesDesc: 'Selecteer een veelgekozen traject om de gegevens direct in de reserveringsmodule in te vullen.',
    btnBookRoute: 'Selecteer rit',
    fltTag: 'Ons Wagenpark',
    fltTitle: 'Representatieve Mercedes-Benz Vloot',
    fltDesc: 'Elk voertuig is jong, rookvrij, voorzien van klimaatregeling en wordt bestuurd door een gecertificeerde privéchauffeur.',
    whyTag: 'Onze Standaard',
    whyTitle: 'Waarom Reizigers Kiezen Voor IPPATAXI',
    faqTag: 'Veelgestelde Vragen',
    faqTitle: 'Heldere Antwoorden Over IPPA',
    contactTag: '24/7 Centrale',
    contactTitle: 'Persoonlijk Contact Of Maatwerk Rit?',
    contactDesc: 'Heeft u een specifieke vraag over meerdere tussenstops, zakelijk vervoer of welk type IPPA uw route vereist? Neem direct contact op met onze centrale.'
  },
  en: {
    navHome: 'Home',
    navIppaSystem: 'How It Works',
    navAirport: 'Schiphol & Routes',
    navFleet: 'Our Fleet',
    navWhyUs: 'Guarantees',
    navContact: 'Contact',
    btnBookNav: 'Book a Ride',
    heroTag: '24/7 Chauffeur Service • Netherlands',
    heroTitle: 'First-class chauffeur service, paid simply with IPPA.',
    heroDesc: 'No running meter, no cash and no card terminals. Travel in a pristine Mercedes with a private chauffeur and settle your ride upon arrival with a single IPPA based on distance.',
    feat1: 'Fixed tier upfront — never any surprises',
    feat2: 'Luxury Mercedes-Benz fleet with suited chauffeurs',
    feat3: 'Schiphol flight tracking & waiting time included',
    btnHeroWa: 'Book via WhatsApp',
    btnHeroCall: 'Call Dispatch (24/7)',
    cardTitle: 'Calculate & Book Your Ride',
    cardSubtitle: 'Instantly see whether your route requires Type A, B or C',
    tabStandard: 'Point-to-Point',
    tabAirport: 'Airport Transfer',
    tabHourly: 'Long Distance',
    lblPickup: 'Pickup address or city',
    lblDropoff: 'Destination or airport',
    lblDateTime: 'Date & time',
    lblPassengers: 'Passengers',
    lblVehicle: 'Select vehicle class',
    vehSedan: 'Executive Sedan',
    vehSedanSub: '1–4 guests • 3 bags',
    vehEstate: 'Station Wagon',
    vehEstateSub: '1–4 guests • 5 bags',
    vehVan: 'VIP Minivan',
    vehVanSub: 'Up to 8 guests • 8 bags',
    fareTag: 'Required payment',
    fareNote: 'Hand to driver upon arrival',
    btnBookSubmit: 'Reserve Ride with IPPA',
    statAvailability: 'Available 24/7',
    routesTag: 'Airport & Cities',
    routesTitle: 'Popular Fixed Routes',
    routesDesc: 'Select a popular route to pre-fill the booking form instantly.',
    btnBookRoute: 'Select route',
    fltTag: 'Our Fleet',
    fltTitle: 'Executive Mercedes-Benz Vehicles',
    fltDesc: 'Every vehicle is immaculate, smoke-free, climate-controlled and driven by a certified private chauffeur.',
    whyTag: 'Our Standard',
    whyTitle: 'Why Travelers Choose IPPATAXI',
    faqTag: 'FAQ',
    faqTitle: 'Clear Answers About IPPA',
    contactTag: '24/7 Dispatch',
    contactTitle: 'Personal Assistance Or Custom Trip?',
    contactDesc: 'Have a question about multiple stops, corporate travel, or which IPPA tier your route requires? Contact our dispatch directly.'
  }
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initBookingTabs();
  initVehicleSelector();
  initPaymentGatewayScaffold();
  initFareCalculation();
  initPresetRoutes();
  initFAQAccordion();
  initModal();
  initMobileNav();
  initContactForm();
  setDefaultDateTime();
  initNavigationScrollspy();
  loadRecaptcha();
  initCurrencyModeSync();
});

/**
 * Global Currency Mode Synchronization ('ippa' vs 'real_money')
 * Syncs with Supabase public.site_settings, BroadcastChannel, and localStorage.
 */
function isRealMoneyMode() {
  return appState.currencyMode === 'real_money';
}

function formatEuro(amount) {
  return '€ ' + Number(amount || 0).toFixed(2).replace('.', ',');
}

function get2026Rates() {
  const cfgRates = window.IPPA_CONFIG?.taxiRates2026 || {};
  return {
    baseFare: cfgRates.baseFare ?? 4.31,
    perKm: cfgRates.perKm ?? 3.17,
    perMin: cfgRates.perMin ?? 0.52
  };
}

function calculate2026DutchTaxiFare(distanceKm, durationMin) {
  const r = get2026Rates();
  const km = Math.max(1, Number(distanceKm) || 18);
  const min = Math.max(3, Number(durationMin) || Math.round(km * 1.15));
  const basePart = r.baseFare;
  const kmPart = km * r.perKm;
  const minPart = min * r.perMin;
  const total = +(basePart + kmPart + minPart).toFixed(2);
  return {
    baseFare: basePart,
    perKm: r.perKm,
    perMin: r.perMin,
    distanceKm: +km.toFixed(1),
    durationMin: Math.round(min),
    kmCost: +kmPart.toFixed(2),
    minCost: +minPart.toFixed(2),
    totalFare: total,
    formattedTotal: formatEuro(total)
  };
}

function setCurrencyModeLocal(mode) {
  const normalized = mode === 'real_money' ? 'real_money' : 'ippa';
  const changed = appState.currencyMode !== normalized;
  appState.currencyMode = normalized;
  localStorage.setItem('ippa_currency_mode', normalized);
  applyCurrencyModeUI();
  updateFareDisplay();
  if (changed && document.getElementById('booking-modal')?.classList.contains('active')) {
    populateModalSummary();
  }
}

async function fetchGlobalCurrencyMode() {
  const cfg = window.IPPA_CONFIG || {};
  if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) return;

  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/site_settings?key=eq.currency_mode&select=value`, {
      headers: {
        'apikey': cfg.supabaseAnonKey,
        'Authorization': `Bearer ${cfg.supabaseAnonKey}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
        setCurrencyModeLocal(rows[0].value);
        return;
      }
    }
  } catch (_) {}
}

function initCurrencyModeSync() {
  // Apply current cached mode immediately
  applyCurrencyModeUI();
  updateFareDisplay();

  // Fetch authoritative mode from Supabase DB
  fetchGlobalCurrencyMode();
  setInterval(fetchGlobalCurrencyMode, 15000);

  // Instant cross-tab sync via BroadcastChannel & storage event
  try {
    const bc = new BroadcastChannel('ippa_currency_channel');
    bc.onmessage = (ev) => {
      if (ev.data && ev.data.currencyMode) {
        setCurrencyModeLocal(ev.data.currencyMode);
      }
    };
  } catch (_) {}

  window.addEventListener('storage', (e) => {
    if (e.key === 'ippa_currency_mode' && e.newValue) {
      setCurrencyModeLocal(e.newValue);
    }
  });
}

function applyCurrencyModeUI() {
  const isEn = appState.currentLang === 'en';
  const realMoney = isRealMoneyMode();

  // 1. Toggle Payment Scaffolds visibility
  const calcScaffold = document.getElementById('calc-payment-scaffold');
  const modalGateway = document.getElementById('modal-payment-gateway');
  const breakdownEl = document.getElementById('real-money-breakdown');
  const sumBreakdownRow = document.getElementById('sum-rate-breakdown-row');

  if (calcScaffold) calcScaffold.hidden = !realMoney;
  if (modalGateway) modalGateway.hidden = !realMoney;
  if (breakdownEl) breakdownEl.hidden = !realMoney;
  if (sumBreakdownRow) sumBreakdownRow.hidden = !realMoney;

  // 2. Update Hero & Calculator texts dynamically based on active mode
  const heroTitle = document.querySelector('[data-i18n="heroTitle"]');
  const heroDesc = document.querySelector('[data-i18n="heroDesc"]');
  const cardSubtitle = document.querySelector('[data-i18n="cardSubtitle"]');
  const btnBookSubmitText = document.getElementById('btn-submit-booking-text') || document.querySelector('[data-i18n="btnBookSubmit"]');
  const fareTag = document.getElementById('calc-fare-tag');
  const fareNote = document.getElementById('calc-fare-note');

  if (realMoney) {
    if (heroTitle) {
      heroTitle.textContent = isEn
        ? 'First-class chauffeur service with transparent 2026 fixed euro fares.'
        : 'Eersteklas taxivervoer met vaste 2026 tarieven vooraf in euro’s.';
    }
    if (heroDesc) {
      heroDesc.textContent = isEn
        ? 'Calculate your exact distance and travel time upfront based on official 2026 Dutch rates (Base €4.31 • €3.17/km • €0.52/min) and pay securely via iDEAL, Stripe or in the taxi.'
        : 'Bereken direct uw ritprijs vooraf op basis van de officiële 2026 Nederlandse taxitarieven (Start € 4,31 • € 3,17/km • € 0,52/min) en betaal veilig via iDEAL, Creditcard of in de taxi.';
    }
    if (cardSubtitle) {
      cardSubtitle.textContent = isEn
        ? 'Live route & fare calculation (2026 Rates: €4.31 + €3.17/km + €0.52/min)'
        : 'Live route- & prijsberekening (Tarief 2026: € 4,31 + € 3,17/km + € 0,52/min)';
    }
    if (fareTag) {
      fareTag.textContent = isEn ? 'Estimated Total Fare (2026 Rate)' : 'Berekende Ritprijs (Tarief 2026)';
    }
    if (fareNote) {
      fareNote.textContent = isEn ? 'Fixed price upfront • Incl. VAT' : 'Vast tarief vooraf • Incl. btw';
    }
    if (btnBookSubmitText) {
      btnBookSubmitText.textContent = isEn ? 'Book & Pay Ride (€)' : 'Rit Reserveren & Betalen (€)';
    }
  } else {
    const t = translations[appState.currentLang] || translations.nl;
    if (heroTitle) heroTitle.textContent = t.heroTitle;
    if (heroDesc) heroDesc.textContent = t.heroDesc;
    if (cardSubtitle) cardSubtitle.textContent = t.cardSubtitle;
    if (fareTag) fareTag.textContent = t.fareTag;
    if (fareNote) fareNote.textContent = t.fareNote;
    if (btnBookSubmitText) btnBookSubmitText.textContent = t.btnBookSubmit;
  }

  // 3. Update Popular Preset Route Cards dynamically (€ vs IPPA)
  const routeData = [
    { km: 18, min: 20, tier: 'B' },
    { km: 48, min: 35, tier: 'B' },
    { km: 45, min: 35, tier: 'B' },
    { km: 60, min: 45, tier: 'C' },
    { km: 7,  min: 15, tier: 'A' },
    { km: 125, min: 80, tier: 'C' }
  ];
  document.querySelectorAll('.airport-routes-grid .route-card').forEach((card, idx) => {
    const info = routeData[idx];
    if (!info) return;
    const badgeEl = card.querySelector('.route-badge');
    const priceEl = card.querySelector('.route-price-val');
    if (realMoney) {
      const calc = calculate2026DutchTaxiFare(info.km, info.min);
      if (badgeEl) badgeEl.textContent = isEn ? '2026 Fixed Rate' : 'Vast Tarief 2026';
      if (priceEl) priceEl.textContent = calc.formattedTotal;
    } else {
      if (badgeEl) badgeEl.textContent = `Type ${info.tier} IPPA`;
      if (priceEl) priceEl.textContent = `1x Type ${info.tier} IPPA`;
    }
  });

  // 4. Update Fleet Rate Labels dynamically
  document.querySelectorAll('.fleet-rate-val').forEach((el) => {
    el.textContent = realMoney
      ? (isEn ? '€4.31 base + €3.17/km' : '€ 4,31 start + € 3,17/km')
      : (isEn ? '1x IPPA per ride' : '1x IPPA per rit');
  });
}

function initPaymentGatewayScaffold() {
  const calcPills = document.querySelectorAll('#calc-payment-pills .pay-pill');
  const modalTabs = document.querySelectorAll('#modal-payment-tabs .pg-tab');

  function selectPaymentMethod(method) {
    appState.paymentMethod = method;
    calcPills.forEach(p => p.classList.toggle('active', p.dataset.pay === method));
    modalTabs.forEach(t => t.classList.toggle('active', t.dataset.pg === method));

    const idealPanel = document.getElementById('pg-panel-ideal');
    const stripePanel = document.getElementById('pg-panel-stripe');
    const taxiPanel = document.getElementById('pg-panel-taxi');
    if (idealPanel) idealPanel.hidden = method !== 'ideal';
    if (stripePanel) stripePanel.hidden = method !== 'stripe';
    if (taxiPanel) taxiPanel.hidden = method !== 'taxi';
  }

  calcPills.forEach(pill => {
    pill.addEventListener('click', () => selectPaymentMethod(pill.dataset.pay));
  });
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => selectPaymentMethod(tab.dataset.pg));
  });
}

/**
 * Language Switching Handler
 */
function initLanguage() {
  const langButtons = document.querySelectorAll('.lang-btn');
  
  langButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedLang = e.currentTarget.getAttribute('data-lang');
      if (selectedLang && selectedLang !== appState.currentLang) {
        setLanguage(selectedLang);
      }
    });
  });

  applyTranslations(appState.currentLang);
}

function setLanguage(lang) {
  appState.currentLang = lang;
  localStorage.setItem('ippa_lang', lang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  applyTranslations(lang);
  applyCurrencyModeUI();
  updateFareDisplay();
}

function applyTranslations(lang) {
  const t = translations[lang];
  if (!t) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  document.documentElement.lang = lang;
}

/**
 * Default Date & Time Setup
 */
function setDefaultDateTime() {
  const dtInput = document.getElementById('ride-datetime');
  if (!dtInput) return;

  const now = new Date();
  now.setMinutes(now.getMinutes() + 45);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');

  dtInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
}

/**
 * Booking Tab Switcher
 */
function initBookingTabs() {
  const tabs = document.querySelectorAll('.booking-tab-btn');
  const dropoffInput = document.getElementById('ride-dropoff');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.getAttribute('data-tab');
      appState.activeTab = mode;

      if (mode === 'airport') {
        if (!dropoffInput.value || dropoffInput.value.trim() === '') {
          dropoffInput.value = 'Schiphol Airport (AMS)';
        }
      }

      updateFareDisplay();
    });
  });
}

/**
 * Vehicle Selection
 */
function initVehicleSelector() {
  const vehicleLabels = document.querySelectorAll('.vehicle-radio-label');
  
  vehicleLabels.forEach(label => {
    label.addEventListener('click', () => {
      vehicleLabels.forEach(l => l.classList.remove('selected'));
      label.classList.add('selected');
      const radio = label.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        appState.vehicleType = radio.value;
      }
      updateFareDisplay();
    });
  });
}

/**
 * DUTCH LOCATION GAZETTEER & LIVE ROUTING API (OSRM / Mapbox / Google Maps)
 */
const DUTCH_COORDS = {
  'schiphol': [4.7641, 52.3086],
  'ams': [4.7641, 52.3086],
  'amsterdam zuid': [4.8729, 52.3389],
  'amsterdam noord': [4.9314, 52.3913],
  'amsterdam oost': [4.9367, 52.3563],
  'amsterdam west': [4.8535, 52.3731],
  'amsterdam sloterdijk': [4.8377, 52.3888],
  'amsterdam arena': [4.9417, 52.3144],
  'amsterdam': [4.8952, 52.3702],
  'amstelveen': [4.8639, 52.3009],
  'haarlem': [4.6462, 52.3874],
  'zaandam': [4.8286, 52.4388],
  'hoofddorp': [4.6889, 52.3025],
  'aalsmeer': [4.7606, 52.2665],
  'almere': [5.2647, 52.3508],
  'hilversum': [5.1764, 52.2292],
  'utrecht': [5.1214, 52.0907],
  'amersfoort': [5.3878, 52.1561],
  'leiden': [4.4970, 52.1601],
  'den haag': [4.3007, 52.0705],
  'the hague': [4.3007, 52.0705],
  'scheveningen': [4.2756, 52.1047],
  'delft': [4.3571, 52.0116],
  'zoetermeer': [4.4931, 52.0575],
  'rotterdam airport': [4.4372, 51.9555],
  'rotterdam': [4.4777, 51.9244],
  'gouda': [4.7105, 52.0115],
  'dordrecht': [4.6901, 51.8133],
  'alkmaar': [4.7534, 52.6324],
  'hoorn': [5.0597, 52.6424],
  'lelystad': [5.4714, 52.5185],
  'zwolle': [6.0830, 52.5168],
  'apeldoorn': [5.9699, 52.2112],
  'arnhem': [5.8987, 51.9851],
  'nijmegen': [5.8372, 51.8126],
  'den bosch': [5.3037, 51.6978],
  'breda': [4.7683, 51.5719],
  'tilburg': [5.0913, 51.5555],
  'eindhoven airport': [5.3921, 51.4584],
  'eindhoven': [5.4697, 51.4416],
  'maastricht': [5.6910, 50.8514],
  'groningen': [6.5665, 53.2194],
  'leeuwarden': [5.7999, 53.2012],
  'enschede': [6.8937, 52.2215],
  'venlo': [6.1724, 51.3704],
  'roermond': [5.9875, 51.1942],
  'antwerpen': [4.4025, 51.2194],
  'brussel': [4.3517, 50.8503],
  'dusseldorf': [6.7735, 51.2277]
};

function findKnownCoords(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return null;
  for (const [key, coords] of Object.entries(DUTCH_COORDS)) {
    if (q.includes(key)) return coords;
  }
  return null;
}

async function geocodeAddressNL(query) {
  const known = findKnownCoords(query);
  if (known) return known;

  const cfg = window.IPPA_CONFIG || {};
  if (cfg.mapboxAccessToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=nl,be,de&limit=1&access_token=${encodeURIComponent(cfg.mapboxAccessToken)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features?.[0]?.center) return data.features[0].center;
      }
    } catch (_) {}
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl,be,de&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'nl' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.lon && data[0]?.lat) {
        return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      }
    }
  } catch (_) {}
  return null;
}

async function fetchLiveDrivingRoute(pickup, dropoff) {
  const p = (pickup || '').trim();
  const d = (dropoff || '').trim();
  if (p.length < 2 || d.length < 2) return null;

  const cacheKey = `${p.toLowerCase()}__${d.toLowerCase()}`;
  if (appState.routeCache[cacheKey]) {
    appState.liveRouteMetrics = { key: cacheKey, ...appState.routeCache[cacheKey] };
    return appState.liveRouteMetrics;
  }

  const c1 = await geocodeAddressNL(p);
  const c2 = await geocodeAddressNL(d);
  if (!c1 || !c2) return null;

  const cfg = window.IPPA_CONFIG || {};

  // 1. Optional Mapbox Directions API
  if (cfg.mapboxAccessToken) {
    try {
      const mbUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${c1[0]},${c1[1]};${c2[0]},${c2[1]}?overview=false&access_token=${encodeURIComponent(cfg.mapboxAccessToken)}`;
      const res = await fetch(mbUrl);
      if (res.ok) {
        const json = await res.json();
        const route = json.routes?.[0];
        if (route) {
          const metrics = {
            distanceKm: Math.max(1, +(route.distance / 1000).toFixed(1)),
            durationMin: Math.max(3, Math.round(route.duration / 60)),
            source: 'Mapbox Routing'
          };
          appState.routeCache[cacheKey] = metrics;
          appState.liveRouteMetrics = { key: cacheKey, ...metrics };
          return appState.liveRouteMetrics;
        }
      }
    } catch (_) {}
  }

  // 2. OSRM Public Driving Route API
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${c1[0]},${c1[1]};${c2[0]},${c2[1]}?overview=false`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const json = await res.json();
      const route = json.routes?.[0];
      if (route) {
        const metrics = {
          distanceKm: Math.max(1, +(route.distance / 1000).toFixed(1)),
          durationMin: Math.max(3, Math.round(route.duration / 60)),
          source: 'Live Route API'
        };
        appState.routeCache[cacheKey] = metrics;
        appState.liveRouteMetrics = { key: cacheKey, ...metrics };
        return appState.liveRouteMetrics;
      }
    }
  } catch (_) {}

  // 3. Haversine road-factor fallback if offline
  const R = 6371;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLon = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadKm = Math.max(2, +(straightKm * 1.26).toFixed(1));
  const roadMin = Math.max(5, Math.round((roadKm / 55) * 60 + 5));
  const metrics = { distanceKm: roadKm, durationMin: roadMin, source: 'NL Wegennet' };
  appState.routeCache[cacheKey] = metrics;
  appState.liveRouteMetrics = { key: cacheKey, ...metrics };
  return appState.liveRouteMetrics;
}

/**
 * DUAL-MODE FARE CALCULATION LOGIC (3-Tier IPPA + 2026 Real Money Rates)
 * - IPPA Mode:
 *   < 15 km: Type A IPPA | 15 - 50 km: Type B IPPA | > 50 km: Type C IPPA
 * - Real Money Mode (2026 Dutch Taxi Rates):
 *   Base: € 4,31 | Per KM: € 3,17 | Per Min: € 0,52
 */
function calculateEstimatedFare() {
  const pickupRaw = document.getElementById('ride-pickup')?.value || '';
  const dropoffRaw = document.getElementById('ride-dropoff')?.value || '';
  const pickup = pickupRaw.toLowerCase().trim();
  const dropoff = dropoffRaw.toLowerCase().trim();
  const cacheKey = `${pickup}__${dropoff}`;

  // Known city pairs matcher (instant baseline)
  const pairs = [
    { match: ['amsterdam', 'schiphol'], km: 18, min: 20, tier: 'B' },
    { match: ['utrecht', 'schiphol'], km: 48, min: 35, tier: 'B' },
    { match: ['den haag', 'schiphol'], km: 45, min: 35, tier: 'B' },
    { match: ['rotterdam', 'schiphol'], km: 60, min: 45, tier: 'C' },
    { match: ['haarlem', 'schiphol'], km: 20, min: 22, tier: 'B' },
    { match: ['almere', 'schiphol'], km: 42, min: 34, tier: 'B' },
    { match: ['amstelveen', 'schiphol'], km: 12, min: 15, tier: 'A' },
    { match: ['eindhoven', 'schiphol'], km: 125, min: 80, tier: 'C' },
    { match: ['rotterdam', 'den haag'], km: 26, min: 25, tier: 'B' },
    { match: ['amsterdam', 'rotterdam'], km: 70, min: 55, tier: 'C' },
    { match: ['amsterdam', 'utrecht'], km: 42, min: 35, tier: 'B' },
    { match: ['centrum', 'zuid'], km: 7, min: 15, tier: 'A' },
    { match: ['centrum', 'noord'], km: 8, min: 16, tier: 'A' }
  ];

  let distanceKm = 18;
  let durationMin = 20;
  let tier = 'B';
  let matched = false;
  let routeSource = 'Standaard traject';

  if (appState.routeCache[cacheKey]) {
    distanceKm = appState.routeCache[cacheKey].distanceKm;
    durationMin = appState.routeCache[cacheKey].durationMin;
    routeSource = appState.routeCache[cacheKey].source || 'Live Route API';
    tier = distanceKm < 15 ? 'A' : (distanceKm <= 50 ? 'B' : 'C');
    matched = true;
  } else {
    for (const pair of pairs) {
      const has0 = pickup.includes(pair.match[0]) || dropoff.includes(pair.match[0]);
      const has1 = pickup.includes(pair.match[1]) || dropoff.includes(pair.match[1]);
      if (has0 && has1) {
        distanceKm = pair.km;
        durationMin = pair.min;
        tier = pair.tier;
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (pickup.includes('schiphol') || dropoff.includes('schiphol')) {
        distanceKm = 25;
        durationMin = 26;
        tier = 'B';
      } else if (pickup.length > 2 && dropoff.length > 2) {
        distanceKm = 12;
        durationMin = 17;
        tier = 'A';
      } else {
        distanceKm = 18;
        durationMin = 20;
        tier = 'B';
      }
    }
  }

  // Tier metadata
  const tierInfo = {
    A: {
      tier: 'A',
      name: 'Type A IPPA',
      subtext: 'Korte Rit (Stad / Binnen regio)',
      subtextEn: 'Short Ride (City / Local)',
      badgeClass: 'tier-a',
      giveText: '1x Type A IPPA'
    },
    B: {
      tier: 'B',
      name: 'Type B IPPA',
      subtext: 'Middelmatige Rit (Schiphol / Regio)',
      subtextEn: 'Medium Ride (Airport / Regional)',
      badgeClass: 'tier-b',
      giveText: '1x Type B IPPA'
    },
    C: {
      tier: 'C',
      name: 'Type C IPPA',
      subtext: 'Lange Rit (Intercity / Provincie)',
      subtextEn: 'Long Distance (Intercity)',
      badgeClass: 'tier-c',
      giveText: '1x Type C IPPA'
    }
  };

  const euroCalc = calculate2026DutchTaxiFare(distanceKm, durationMin);

  if (isRealMoneyMode()) {
    const isEn = appState.currentLang === 'en';
    return {
      currencyMode: 'real_money',
      distanceKm: euroCalc.distanceKm,
      durationMin: euroCalc.durationMin,
      routeSource,
      tier: tier,
      name: euroCalc.formattedTotal,
      subtext: `~${euroCalc.durationMin} min rijtijd (${routeSource})`,
      subtextEn: `~${euroCalc.durationMin} min drive (${routeSource})`,
      badgeClass: 'tier-euro',
      giveText: euroCalc.formattedTotal,
      euroCalc
    };
  }

  return {
    currencyMode: 'ippa',
    distanceKm: distanceKm,
    durationMin: durationMin,
    routeSource,
    euroCalc,
    ...tierInfo[tier]
  };
}

const triggerAsyncRouteCalculation = debounce(async () => {
  const pickup = document.getElementById('ride-pickup')?.value || '';
  const dropoff = document.getElementById('ride-dropoff')?.value || '';
  if (pickup.trim().length < 2 || dropoff.trim().length < 2) return;
  const route = await fetchLiveDrivingRoute(pickup, dropoff);
  if (route) {
    updateFareDisplay(true);
  }
}, 400);

function initFareCalculation() {
  const pickupInput = document.getElementById('ride-pickup');
  const dropoffInput = document.getElementById('ride-dropoff');
  const passengersInput = document.getElementById('ride-passengers');

  if (pickupInput) {
    pickupInput.addEventListener('input', () => {
      updateFareDisplay();
      triggerAsyncRouteCalculation();
    });
  }
  if (dropoffInput) {
    dropoffInput.addEventListener('input', () => {
      updateFareDisplay();
      triggerAsyncRouteCalculation();
    });
  }
  if (passengersInput) passengersInput.addEventListener('change', () => updateFareDisplay());

  updateFareDisplay();
  triggerAsyncRouteCalculation();
}

function updateFareDisplay(skipAsync = false) {
  const result = calculateEstimatedFare();
  const box = document.getElementById('ippa-result-box');
  const tierNameEl = document.getElementById('ippa-tier-name');
  const distanceEl = document.getElementById('ippa-distance-display');
  const paymentPill = document.getElementById('ippa-payment-pill');
  const breakdownEl = document.getElementById('real-money-breakdown');

  if (box) {
    box.className = `ippa-result-box ${result.badgeClass}`;
  }

  if (tierNameEl) {
    tierNameEl.textContent = result.name;
  }

  if (distanceEl) {
    const isEn = appState.currentLang === 'en';
    const sub = isEn ? result.subtextEn : result.subtext;
    distanceEl.textContent = `${isEn ? 'Est.' : 'Geschat'} ~${result.distanceKm} km • ${sub}`;
  }

  if (paymentPill) {
    paymentPill.textContent = result.giveText;
  }

  if (breakdownEl) {
    if (isRealMoneyMode() && result.euroCalc) {
      const ec = result.euroCalc;
      const isEn = appState.currentLang === 'en';
      breakdownEl.hidden = false;
      breakdownEl.textContent = isEn
        ? `2026 Rate: Base ${formatEuro(ec.baseFare)} + ${ec.distanceKm} km × €3,17 (${formatEuro(ec.kmCost)}) + ${ec.durationMin} min × €0,52 (${formatEuro(ec.minCost)})`
        : `Tarief 2026: Start ${formatEuro(ec.baseFare)} + ${ec.distanceKm} km × € 3,17 (${formatEuro(ec.kmCost)}) + ${ec.durationMin} min × € 0,52 (${formatEuro(ec.minCost)})`;
    } else {
      breakdownEl.hidden = true;
    }
  }

  if (!skipAsync) {
    triggerAsyncRouteCalculation();
  }
}

/**
 * Quick Preset Airport Routes Buttons
 */
function initPresetRoutes() {
  const routeButtons = document.querySelectorAll('.btn-route-book');
  const pickupInput = document.getElementById('ride-pickup');
  const dropoffInput = document.getElementById('ride-dropoff');
  const bookingWidget = document.getElementById('calculator') || document.getElementById('booking-calculator');

  routeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.currentTarget.getAttribute('data-from');
      const to = e.currentTarget.getAttribute('data-to');

      if (pickupInput && from) pickupInput.value = from;
      if (dropoffInput && to) dropoffInput.value = to;

      const airportTab = document.querySelector('[data-tab="airport"]');
      if (airportTab) airportTab.click();

      updateFareDisplay();

      if (bookingWidget) {
        bookingWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bookingWidget.classList.remove('highlight-pulse');
        void bookingWidget.offsetWidth;
        bookingWidget.classList.add('highlight-pulse');
      }
      setActiveNav('calculator');

      const res = calculateEstimatedFare();
      showToast(`Gekozen: ${from} → ${to} (${res.giveText})`);
    });
  });
}

/**
 * FAQ Accordion
 */
function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/**
 * Mobile Navigation Drawer
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  });
}

/**
 * Booking Confirmation Modal & WhatsApp Generator
 */
function initModal() {
  const modal = document.getElementById('booking-modal');
  const openBtn = document.getElementById('btn-submit-booking');
  const closeBtn = document.getElementById('modal-close-btn');
  const confirmBtn = document.getElementById('btn-confirm-reservation');
  const form = document.getElementById('modal-booking-form');

  function resetModalState() {
    appState.bookingCompleted = false;
    appState.isBookingSubmitting = false;
    const statusBox = document.getElementById('modal-form-status');
    if (statusBox) {
      statusBox.style.display = 'none';
      statusBox.innerHTML = '';
      statusBox.className = 'form-status-box';
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.cursor = '';
      confirmBtn.innerHTML = appState.currentLang === 'en' ? 'Confirm Reservation' : 'Bevestig Reservering';
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // If previous reservation completed, reset the modal for a fresh booking
      if (appState.bookingCompleted) {
        resetModalState();
      }
      populateModalSummary();
      modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      if (appState.bookingCompleted) {
        resetModalState();
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      if (appState.bookingCompleted) {
        resetModalState();
      }
    }
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleReservationSubmit);
  }
  if (form) {
    form.addEventListener('submit', handleReservationSubmit);
  }
}

function populateModalSummary() {
  const pickup = document.getElementById('ride-pickup')?.value || 'Amsterdam';
  const dropoff = document.getElementById('ride-dropoff')?.value || 'Schiphol Airport';
  const datetime = document.getElementById('ride-datetime')?.value || 'Zo snel mogelijk';
  const passengers = document.getElementById('ride-passengers')?.value || '1';
  const res = calculateEstimatedFare();
  const realMoney = isRealMoneyMode();
  const isEn = appState.currentLang === 'en';

  const vNames = {
    sedan: 'Executive Sedan',
    estate: 'Stationwagen',
    van: 'VIP Taxibus'
  };
  const vehicleName = vNames[appState.vehicleType] || 'Executive Sedan';

  document.getElementById('sum-pickup').textContent = pickup;
  document.getElementById('sum-dropoff').textContent = dropoff;
  const routeMetricsEl = document.getElementById('sum-route-metrics');
  if (routeMetricsEl) {
    routeMetricsEl.textContent = `~${res.distanceKm} km • ~${res.durationMin} min`;
  }
  document.getElementById('sum-datetime').textContent = datetime.replace('T', ' om ');
  document.getElementById('sum-vehicle').textContent = vehicleName;
  document.getElementById('sum-passengers').textContent = `${passengers} pers.`;

  const sumPayLabel = document.getElementById('sum-payment-label');
  const sumBreakdownRow = document.getElementById('sum-rate-breakdown-row');
  const sumBreakdownVal = document.getElementById('sum-rate-breakdown');
  const modalGateway = document.getElementById('modal-payment-gateway');
  const confirmBtn = document.getElementById('btn-confirm-reservation');

  if (realMoney && res.euroCalc) {
    const ec = res.euroCalc;
    if (sumPayLabel) sumPayLabel.textContent = isEn ? 'Total Fare (2026 Rate)' : 'Totale Ritprijs (2026 Tarief)';
    if (sumBreakdownRow) sumBreakdownRow.hidden = false;
    if (sumBreakdownVal) {
      sumBreakdownVal.textContent = `${formatEuro(ec.baseFare)} start + ${formatEuro(ec.kmCost)} (${ec.distanceKm} km) + ${formatEuro(ec.minCost)} (${ec.durationMin} min)`;
    }
    if (modalGateway) modalGateway.hidden = false;
    if (confirmBtn && !appState.bookingCompleted) {
      confirmBtn.innerHTML = isEn
        ? `Confirm & Pay (${res.giveText})`
        : `Bevestig & Betaal (${res.giveText})`;
    }
  } else {
    if (sumPayLabel) sumPayLabel.textContent = isEn ? 'Payment upon arrival' : 'Betaling bij aankomst';
    if (sumBreakdownRow) sumBreakdownRow.hidden = true;
    if (modalGateway) modalGateway.hidden = true;
    if (confirmBtn && !appState.bookingCompleted) {
      confirmBtn.innerHTML = isEn ? 'Confirm Reservation' : 'Bevestig Reservering';
    }
  }

  document.getElementById('sum-ippa').textContent = res.giveText;
}


/**
 * Dynamically loads Google reCAPTCHA v3 if recaptchaSiteKey is configured in js/config.js.
 */
function loadRecaptcha() {
  const siteKey = window.IPPA_CONFIG?.recaptchaSiteKey;
  if (!siteKey) return;
  if (document.querySelector('script[data-recaptcha]')) return;
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
  script.async = true;
  script.defer = true;
  script.setAttribute('data-recaptcha', 'true');
  document.head.appendChild(script);
}

/**
 * Obtains a Google reCAPTCHA v3 token for the given action ('booking' | 'contact').
 */
async function getRecaptchaToken(action) {
  const siteKey = window.IPPA_CONFIG?.recaptchaSiteKey;
  if (!siteKey || !window.grecaptcha) return null;
  try {
    return await new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action }).then(resolve, reject);
      });
    });
  } catch (err) {
    console.warn('reCAPTCHA token error:', err);
    return null;
  }
}

/**
 * Saves a row to Supabase with Google reCAPTCHA v3 protection.
 * Settings live in js/config.js.
 */
async function sendToSupabase(table, row) {
  const cfg = window.IPPA_CONFIG || {};
  if (!cfg.supabaseUrl || cfg.supabaseUrl.includes('YOUR-PROJECT')) {
    throw new Error('Supabase is not configured (js/config.js)');
  }

  const action = table === 'bookings' ? 'booking' : 'contact';
  const token = await getRecaptchaToken(action);

  // If reCAPTCHA token is available and submitFunction is configured, try Edge Function first
  if (token && cfg.submitFunction) {
    try {
      const fnResp = await fetch(`${cfg.supabaseUrl}/functions/v1/${cfg.submitFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseAnonKey,
          'Authorization': `Bearer ${cfg.supabaseAnonKey}`
        },
        body: JSON.stringify({ type: action, token, data: row })
      });
      if (fnResp.ok) return;
      if (fnResp.status === 403 || fnResp.status === 400) {
        const err = await fnResp.json().catch(() => ({}));
        throw new Error(err.error || 'Spam check failed');
      }
      // If 404 (Edge Function not deployed yet), fall through to direct REST insert
    } catch (err) {
      if (err.message === 'Spam check failed' || err.message?.includes('Captcha')) {
        throw err;
      }
      // Network/CORS on undeployed function -> fall through to REST insert
    }
  }

  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': cfg.supabaseAnonKey,
      'Authorization': `Bearer ${cfg.supabaseAnonKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Submission error');
  }
}

function handleReservationSubmit(e) {
  if (e) e.preventDefault();

  // Prevent duplicate submissions if already submitting or if already sent
  if (appState.isBookingSubmitting || appState.bookingCompleted) {
    return;
  }

  const name = document.getElementById('modal-name')?.value.trim();
  const phone = document.getElementById('modal-phone')?.value.trim();
  const email = document.getElementById('modal-email')?.value.trim();
  const notes = document.getElementById('modal-notes')?.value.trim() || 'Geen';
  const statusBox = document.getElementById('modal-form-status');
  const confirmBtn = document.getElementById('btn-confirm-reservation');

  if (!name || !phone || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (statusBox) {
      statusBox.className = 'form-status-error';
      statusBox.textContent = appState.currentLang === 'en' 
        ? 'Please enter your name, phone number and a valid e-mail address.' 
        : 'Vul alstublieft uw naam, telefoonnummer en een geldig e-mailadres in.';
      statusBox.style.display = 'block';
    }
    return;
  }

  const pickup = document.getElementById('ride-pickup')?.value || 'Niet opgegeven';
  const dropoff = document.getElementById('ride-dropoff')?.value || 'Niet opgegeven';
  const datetime = document.getElementById('ride-datetime')?.value || 'Zo snel mogelijk';
  const passengers = document.getElementById('ride-passengers')?.value || '1';
  const res = calculateEstimatedFare();
  const vNames = { sedan: 'Executive Sedan', estate: 'Stationwagen', van: 'VIP Taxibus' };
  const vehicleName = vNames[appState.vehicleType] || 'Executive Sedan';
  const refCode = 'IPPA-' + Math.floor(1000 + Math.random() * 9000);

  // Mark in-flight to lock out double clicks
  appState.isBookingSubmitting = true;

  // Set loading state on button
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner"></span> ' + (appState.currentLang === 'en' ? 'Sending to dispatch...' : 'Bezig met versturen naar centrale...');
  }
  if (statusBox) statusBox.style.display = 'none';

  const pickupDate = new Date(datetime);
  let paymentValue = res.giveText;
  if (isRealMoneyMode()) {
    const bank = document.getElementById('ideal-bank-select')?.value || 'ING';
    if (appState.paymentMethod === 'ideal') {
      paymentValue = `${res.giveText} (iDEAL - ${bank})`;
    } else if (appState.paymentMethod === 'stripe') {
      paymentValue = `${res.giveText} (Stripe Card)`;
    } else {
      paymentValue = `${res.giveText} (Pin in taxi)`;
    }
  }

  const row = {
    track_token: crypto.randomUUID(),
    ref: refCode,
    name,
    phone,
    email,
    pickup,
    dropoff,
    pickup_at: isNaN(pickupDate) ? null : pickupDate.toISOString(),
    vehicle: vehicleName,
    passengers: parseInt(passengers, 10) || 1,
    ippa: paymentValue,
    notes: notes === 'Geen' ? null : notes
  };

  sendToSupabase('bookings', row)
  .then(() => {
    appState.isBookingSubmitting = false;
    appState.bookingCompleted = true;

    // Keep button disabled so clicking "Reservering Verzonden" cannot create duplicates!
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.style.cursor = 'default';
      confirmBtn.innerHTML = '✓ ' + (appState.currentLang === 'en' ? 'Reservation Sent!' : 'Reservering Verzonden!');
    }

    if (statusBox) {
      const statusUrl = `status.html?t=${row.track_token}`;
      statusBox.className = 'form-status-success';
      const paymentSummaryLine = isRealMoneyMode()
        ? (appState.currentLang === 'en'
            ? `Total Fare: <strong>${paymentValue}</strong>.`
            : `Ritprijs & Betaling: <strong>${paymentValue}</strong>.`)
        : (appState.currentLang === 'en'
            ? `Hand <strong>${res.giveText}</strong> to your driver upon arrival.`
            : `U overhandigt <strong>${res.giveText}</strong> aan de chauffeur bij aankomst.`);

      statusBox.innerHTML = appState.currentLang === 'en'
        ? `✓ <strong>Reservation successfully sent!</strong> Details dispatched to our team.<br>Ref: <strong>${refCode}</strong>. ${paymentSummaryLine}<br><a href="${statusUrl}" style="color:inherit;text-decoration:underline">Track your ride status →</a>`
        : `✓ <strong>Reservering succesvol verzonden!</strong> De ritdetails zijn doorgestuurd naar de centrale.<br>Referentie: <strong>${refCode}</strong>. ${paymentSummaryLine}<br><a href="${statusUrl}" style="color:inherit;text-decoration:underline">Bekijk de status van uw rit →</a>`;
      statusBox.style.display = 'block';
    }

    showToast(appState.currentLang === 'en' 
      ? `Booking sent to dispatch! Ref: ${refCode}` 
      : `Reservering verstuurd naar centrale! Ref: ${refCode}`);

    // Auto close modal after 3.5 seconds
    setTimeout(() => {
      const modal = document.getElementById('booking-modal');
      if (modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    }, 3500);
  })
  .catch(err => {
    console.error('Error submitting reservation:', err);
    appState.isBookingSubmitting = false;
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.cursor = '';
      confirmBtn.textContent = appState.currentLang === 'en' ? 'Try Again' : 'Opnieuw Proberen';
    }
    if (statusBox) {
      statusBox.className = 'form-status-error';
      statusBox.innerHTML = appState.currentLang === 'en'
        ? 'Could not connect. Please try again or reach out to info@ippataxi.nl.'
        : 'Verbindingsfout. Probeer het opnieuw of mail naar info@ippataxi.nl.';
      statusBox.style.display = 'block';
    }
  });
}

/**
 * Contact Form
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit-btn');
  const statusBox = document.getElementById('contact-form-status');
  let isSubmitting = false;

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const name = document.getElementById('contact-name')?.value.trim();
    const phone = document.getElementById('contact-phone')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !email || !message) {
      if (statusBox) {
        statusBox.className = 'form-status-error';
        statusBox.textContent = 'Vul alstublieft uw naam, e-mail en vraag in.';
        statusBox.style.display = 'block';
      }
      return;
    }

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Bezig met versturen...';
    }
    if (statusBox) statusBox.style.display = 'none';

    sendToSupabase('messages', { name, phone: phone || null, email, message })
    .then(() => {
      if (submitBtn) {
        submitBtn.disabled = true; // keep disabled briefly
        submitBtn.textContent = '✓ Bericht Verzonden!';
      }
      if (statusBox) {
        statusBox.className = 'form-status-success';
        statusBox.innerHTML = `✓ <strong>Hartelijk dank ${name}!</strong> Uw bericht is succesvol verstuurd naar de centrale. We nemen snel contact met u op via ${email} of ${phone}.`;
        statusBox.style.display = 'block';
      }
      showToast(`Bericht succesvol verzonden naar de centrale!`);
      form.reset();

      setTimeout(() => {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verstuur Bericht naar Centrale';
        }
      }, 5000);
    })
    .catch(err => {
      console.error('Error submitting contact form:', err);
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verstuur Bericht naar Centrale';
      }
      if (statusBox) {
        statusBox.className = 'form-status-error';
        statusBox.textContent = 'Er trad een verbindingsfout op. Probeer het opnieuw of mail naar info@ippataxi.nl.';
        statusBox.style.display = 'block';
      }
    });
  });
}

/**
 * Toast Helper
 */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2c15a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Navigation Bar Scrollspy & Active State Handler
 * Updates the active navigation indicator (yellow underline) dynamically on scroll and click.
 */
function setActiveNav(targetId) {
  if (!targetId) return;
  const rawId = targetId.replace(/^#/, '');
  const cleanId = rawId === 'calculator' ? 'home' : rawId;

  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-drawer .mobile-nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkId = href.replace(/^#/, '');
    link.classList.toggle('active', linkId === cleanId);
  });

  mobileNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkId = href.replace(/^#/, '');
    link.classList.toggle('active', linkId === cleanId);
  });
}

function initNavigationScrollspy() {
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-drawer .mobile-nav-link');
  const brandLogo = document.getElementById('main-brand-logo');
  const drawer = document.querySelector('.mobile-nav-drawer');

  // Trackable sections in vertical order
  const sectionIds = ['home', 'ippa-system', 'routes', 'fleet', 'why-us', 'contact'];
  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  let isManualScroll = false;
  let manualScrollTimer = null;
  let ticking = false;

  function scrollToSection(targetId) {
    setActiveNav(targetId);

    // Suppress scrollspy during smooth scroll animation
    isManualScroll = true;
    clearTimeout(manualScrollTimer);
    manualScrollTimer = setTimeout(() => {
      isManualScroll = false;
    }, 850);

    if (drawer && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
    }

    if (history.pushState) {
      history.pushState(null, '', '#' + targetId);
    }

    if (targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (targetId === 'calculator') {
      const calcEl = document.getElementById('calculator');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        calcEl.classList.remove('highlight-pulse');
        void calcEl.offsetWidth;
        calcEl.classList.add('highlight-pulse');
      }
    } else {
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const headerHeight = document.querySelector('.site-header')?.offsetHeight || 76;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 10);
        window.scrollTo({
          top: Math.max(0, targetPos),
          behavior: 'smooth'
        });
      }
    }
  }

  // Handle all nav links (desktop + mobile)
  const allNavLinks = [...navLinks, ...mobileNavLinks];
  allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.replace(/^#/, '');
        scrollToSection(targetId);
      }
    });
  });

  // Handle Brand Logo click -> Home
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSection('home');
    });
  }

  // Handle other anchor links on the page (buttons, cards, footer)
  document.querySelectorAll('a[href^="#"]:not(.nav-link):not(.mobile-nav-link):not(.brand-logo)').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const targetId = href.replace(/^#/, '');
      if (targetId === 'calculator') {
        e.preventDefault();
        scrollToSection('calculator');
      } else if (targetId === 'home') {
        e.preventDefault();
        scrollToSection('home');
      } else if (targetId === 'contact') {
        e.preventDefault();
        scrollToSection('contact');
      } else if (document.getElementById(targetId)) {
        e.preventDefault();
        scrollToSection(targetId);
      }
    });
  });

  // Scrollspy logic
  function updateScrollspy() {
    if (isManualScroll) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // Bottom of the page -> activate contact
    if (windowHeight + scrollY >= docHeight - 80) {
      setActiveNav('contact');
      return;
    }

    // Top of page -> activate home
    if (scrollY < 120) {
      setActiveNav('home');
      return;
    }

    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 76;
    const scrollMarker = scrollY + headerHeight + 140;

    let currentSection = sections[0].id;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (sec.offsetTop <= scrollMarker) {
        currentSection = sec.id;
      }
    }

    if (currentSection) {
      setActiveNav(currentSection);
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScrollspy();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Initial state based on location hash or default to home
  if (window.location.hash) {
    const hashId = window.location.hash.replace(/^#/, '');
    if (document.getElementById(hashId) || hashId === 'calculator') {
      setActiveNav(hashId);
    } else {
      setActiveNav('home');
    }
  } else {
    setActiveNav('home');
  }
}
