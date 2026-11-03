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
  activeTab: 'standard', // 'standard' | 'airport' | 'hourly'
  vehicleType: 'sedan',  // 'sedan' | 'estate' | 'van'
  isBookingSubmitting: false,
  bookingCompleted: false,
  routesPreset: {
    'ams-schiphol': { from: 'Amsterdam Centrum', to: 'Schiphol Airport (AMS)', km: 18, tier: 'B', tierName: 'Type B IPPA' },
    'utr-schiphol': { from: 'Utrecht', to: 'Schiphol Airport (AMS)', km: 48, tier: 'B', tierName: 'Type B IPPA' },
    'dh-schiphol': { from: 'Den Haag', to: 'Schiphol Airport (AMS)', km: 45, tier: 'B', tierName: 'Type B IPPA' },
    'rtm-schiphol': { from: 'Rotterdam', to: 'Schiphol Airport (AMS)', km: 60, tier: 'C', tierName: 'Type C IPPA' },
    'hlm-schiphol': { from: 'Haarlem', to: 'Schiphol Airport (AMS)', km: 20, tier: 'B', tierName: 'Type B IPPA' },
    'alm-schiphol': { from: 'Almere', to: 'Schiphol Airport (AMS)', km: 42, tier: 'B', tierName: 'Type B IPPA' },
    'ams-stad': { from: 'Amsterdam Centrum', to: 'Amsterdam Zuid / Station', km: 8, tier: 'A', tierName: 'Type A IPPA' },
    'ehv-schiphol': { from: 'Eindhoven', to: 'Schiphol Airport (AMS)', km: 125, tier: 'C', tierName: 'Type C IPPA' }
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
  initFareCalculation();
  initPresetRoutes();
  initFAQAccordion();
  initModal();
  initMobileNav();
  initContactForm();
  setDefaultDateTime();
  initNavigationScrollspy();
  loadRecaptcha();
});

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
 * 3-TIER IPPA CALCULATION LOGIC
 * Distance-based tier assignment:
 * - < 15 km: Type A IPPA (Korte rit)
 * - 15 - 50 km: Type B IPPA (Middelmatige rit)
 * - > 50 km: Type C IPPA (Lange rit)
 */
function calculateEstimatedFare() {
  const pickup = (document.getElementById('ride-pickup')?.value || '').toLowerCase().trim();
  const dropoff = (document.getElementById('ride-dropoff')?.value || '').toLowerCase().trim();

  // Known city pairs matcher
  const pairs = [
    { match: ['amsterdam', 'schiphol'], km: 18, tier: 'B' },
    { match: ['utrecht', 'schiphol'], km: 48, tier: 'B' },
    { match: ['den haag', 'schiphol'], km: 45, tier: 'B' },
    { match: ['rotterdam', 'schiphol'], km: 60, tier: 'C' },
    { match: ['haarlem', 'schiphol'], km: 20, tier: 'B' },
    { match: ['almere', 'schiphol'], km: 42, tier: 'B' },
    { match: ['amstelveen', 'schiphol'], km: 12, tier: 'A' },
    { match: ['eindhoven', 'schiphol'], km: 125, tier: 'C' },
    { match: ['rotterdam', 'den haag'], km: 26, tier: 'B' },
    { match: ['amsterdam', 'rotterdam'], km: 70, tier: 'C' },
    { match: ['amsterdam', 'utrecht'], km: 42, tier: 'B' },
    { match: ['centrum', 'zuid'], km: 7, tier: 'A' },
    { match: ['centrum', 'noord'], km: 8, tier: 'A' }
  ];

  let distanceKm = 18;
  let tier = 'B';
  let matched = false;

  for (const pair of pairs) {
    const has0 = pickup.includes(pair.match[0]) || dropoff.includes(pair.match[0]);
    const has1 = pickup.includes(pair.match[1]) || dropoff.includes(pair.match[1]);
    if (has0 && has1) {
      distanceKm = pair.km;
      tier = pair.tier;
      matched = true;
      break;
    }
  }

  if (!matched) {
    if (pickup.includes('schiphol') || dropoff.includes('schiphol')) {
      distanceKm = 25;
      tier = 'B';
    } else if (pickup.length > 2 && dropoff.length > 2) {
      distanceKm = 12;
      tier = 'A';
    } else {
      distanceKm = 18;
      tier = 'B';
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

  return {
    distanceKm: distanceKm,
    ...tierInfo[tier]
  };
}

function initFareCalculation() {
  const pickupInput = document.getElementById('ride-pickup');
  const dropoffInput = document.getElementById('ride-dropoff');
  const passengersInput = document.getElementById('ride-passengers');

  if (pickupInput) pickupInput.addEventListener('input', debounce(updateFareDisplay, 250));
  if (dropoffInput) dropoffInput.addEventListener('input', debounce(updateFareDisplay, 250));
  if (passengersInput) passengersInput.addEventListener('change', updateFareDisplay);

  updateFareDisplay();
}

function updateFareDisplay() {
  const result = calculateEstimatedFare();
  const box = document.getElementById('ippa-result-box');
  const tierNameEl = document.getElementById('ippa-tier-name');
  const distanceEl = document.getElementById('ippa-distance-display');
  const paymentPill = document.getElementById('ippa-payment-pill');

  if (box) {
    box.className = `ippa-result-box ${result.badgeClass}`;
  }

  if (tierNameEl) {
    tierNameEl.textContent = result.name;
  }

  if (distanceEl) {
    const isEn = appState.currentLang === 'en';
    const sub = isEn ? result.subtextEn : result.subtext;
    distanceEl.textContent = `Geschat ~${result.distanceKm} km • ${sub}`;
  }

  if (paymentPill) {
    paymentPill.textContent = result.giveText;
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
  const luggage = document.getElementById('ride-luggage')?.value || '1';
  const res = calculateEstimatedFare();

  const vNames = {
    sedan: 'Executive Sedan',
    estate: 'Stationwagen',
    van: 'VIP Taxibus'
  };
  const vehicleName = vNames[appState.vehicleType] || 'Executive Sedan';

  document.getElementById('sum-pickup').textContent = pickup;
  document.getElementById('sum-dropoff').textContent = dropoff;
  document.getElementById('sum-datetime').textContent = datetime.replace('T', ' om ');
  document.getElementById('sum-vehicle').textContent = vehicleName;
  document.getElementById('sum-passengers').textContent = `${passengers} pers.`;
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
    ippa: res.giveText,
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
      statusBox.innerHTML = appState.currentLang === 'en'
        ? `✓ <strong>Reservation successfully sent!</strong> Details dispatched to our team.<br>Ref: <strong>${refCode}</strong>. Hand <strong>${res.giveText}</strong> to your driver upon arrival.<br><a href="${statusUrl}" style="color:inherit;text-decoration:underline">Track your ride status →</a>`
        : `✓ <strong>Reservering succesvol verzonden!</strong> De ritdetails zijn doorgestuurd naar de centrale.<br>Referentie: <strong>${refCode}</strong>. U overhandigt <strong>${res.giveText}</strong> aan de chauffeur bij aankomst.<br><a href="${statusUrl}" style="color:inherit;text-decoration:underline">Bekijk de status van uw rit →</a>`;
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
