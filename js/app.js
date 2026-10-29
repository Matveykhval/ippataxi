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
    topBarLive: 'Geen geld nodig • Betaal je rit simpelweg met IPPA',
    topBarSchiphol: 'Korte rit: Type A | Middel: Type B | Lang: Type C',
    callNow: '24/7 Digitale Dispatch',
    navHome: 'Home',
    navTariffs: 'Bereken IPPA',
    navIppaSystem: 'Wat is IPPA?',
    navAirport: 'Schiphol Transfers',
    navFleet: 'Onze Vloot',
    navServices: 'Diensten',
    navWhyUs: 'Waarom IPPA',
    navContact: 'Contact',
    btnBookNav: 'Reserveer met IPPA',
    heroTag: 'Reizen Zonder Geld • 100% IPPA',
    heroTitle: 'Betaal Uw Taxirit Met IPPA In Plaats Van Geld',
    heroDesc: 'Vergeet euro’s, pinpassen en meters. Bij IPPATAXI reist u in eersteklas luxe en betaalt u de chauffeur simpelweg met een IPPA: Type A voor korte ritten, Type B voor middellange ritten en Type C voor lange afstanden.',
    feat1: 'Geen contant geld of euro’s nodig',
    feat2: '1 ding, 3 soorten (Type A, B & C)',
    feat3: 'Luxe Mercedes vloot & privéchauffeur',
    feat4: 'Schiphol vluchtmonitoring inbegrepen',
    btnHeroWa: 'Boek via WhatsApp (IPPA)',
    btnHeroCall: 'Telefonisch Reserveren',
    cardTitle: 'Welke IPPA Heeft U Nodig?',
    cardSubtitle: 'Bereken direct of uw rit Type A, B of C vereist',
    tabStandard: 'Standaard Rit',
    tabAirport: 'Schiphol Transfer',
    tabHourly: 'Lange Afstand',
    lblPickup: 'Ophaaladres / Stad',
    lblDropoff: 'Bestemming / Luchthaven',
    lblDateTime: 'Datum & Ophaaltijd',
    lblPassengers: 'Passagiers',
    lblLuggage: 'Bagage (koffers)',
    lblVehicle: 'Kies Gewenst Voertuig',
    vehSedan: 'Executive Sedan',
    vehSedanSub: '1-4 pers • 3 koffers',
    vehEstate: 'Stationwagen',
    vehEstateSub: '1-4 pers • 4-5 koffers',
    vehVan: 'VIP Taxibus',
    vehVanSub: 'Tot 8 pers • 8 koffers',
    fareTag: 'Benodigde Betaling:',
    fareNote: '✓ Geef de chauffeur simpelweg 1x deze IPPA bij aankomst',
    btnBookSubmit: 'Rit Reserveren met IPPA',
    statRides: 'Tevreden Klanten',
    statRating: 'Gemiddelde Beoordeling',
    statAvailability: '24/7 Bereikbaar',
    statAirports: 'Heel Nederland Gedekt',
    routesTag: 'Populaire Bestemmingen',
    routesTitle: 'Vaste IPPA Ritten',
    routesDesc: 'Weet direct welk type IPPA u aan de chauffeur geeft voor uw rit.',
    btnBookRoute: 'Kies Deze Rit',
    srvTag: 'Eersteklas Vervoer',
    srvTitle: 'Luxe Chauffeursdiensten Op IPPA',
    fltTag: 'Eersteklas Vloot',
    fltTitle: 'Onze Exclusieve Voertuigen',
    fltDesc: 'Stap in een brandschone Mercedes, leun achterover en geef bij aankomst uw IPPA.',
    whyTag: 'Waarom IPPATAXI',
    whyTitle: 'De Revolutie Van IPPA Vervoer',
    faqTag: 'Alles over IPPA',
    faqTitle: 'Veelgestelde Vragen Over IPPA',
    contactTag: '24/7 Bereikbaar',
    contactTitle: 'Vragen Over IPPA Of Direct Boeken?',
    contactDesc: 'Heeft u een vraag over welk type IPPA u nodig heeft voor uw rit? Neem direct contact op met onze dispatch.'
  },
  en: {
    topBarLive: 'No money required • Simply pay your ride with IPPA',
    topBarSchiphol: 'Short: Type A | Medium: Type B | Long: Type C',
    callNow: '24/7 Digital Dispatch',
    navHome: 'Home',
    navTariffs: 'Calculate IPPA',
    navIppaSystem: 'What is IPPA?',
    navAirport: 'Airport Transfers',
    navFleet: 'Our Fleet',
    navServices: 'Services',
    navWhyUs: 'Why IPPA',
    navContact: 'Contact',
    btnBookNav: 'Book with IPPA',
    heroTag: 'Travel Without Money • 100% IPPA',
    heroTitle: 'Pay For Your Taxi Ride With IPPA Instead Of Money',
    heroDesc: 'Forget euros, credit cards and meters. At IPPATAXI you ride in first-class luxury and simply hand your driver an IPPA: Type A for short trips, Type B for medium trips, and Type C for long distances.',
    feat1: 'No cash or euros needed',
    feat2: '1 thing, 3 tiers (Type A, B & C)',
    feat3: 'Luxury Mercedes fleet & suited drivers',
    feat4: 'Schiphol flight monitoring included',
    btnHeroWa: 'Book via WhatsApp (IPPA)',
    btnHeroCall: 'Book by Phone',
    cardTitle: 'Which IPPA Do You Need?',
    cardSubtitle: 'Calculate whether your ride requires Type A, B or C',
    tabStandard: 'Point-to-Point',
    tabAirport: 'Airport Transfer',
    tabHourly: 'Long Distance',
    lblPickup: 'Pickup Address / City',
    lblDropoff: 'Destination / Airport',
    lblDateTime: 'Date & Pickup Time',
    lblPassengers: 'Passengers',
    lblLuggage: 'Luggage bags',
    lblVehicle: 'Select Vehicle Class',
    vehSedan: 'Executive Sedan',
    vehSedanSub: '1-4 guests • 3 bags',
    vehEstate: 'Station Wagon',
    vehEstateSub: '1-4 guests • 4-5 bags',
    vehVan: 'VIP Minivan',
    vehVanSub: 'Up to 8 guests • 8 bags',
    fareTag: 'Required Payment:',
    fareNote: '✓ Simply hand the driver 1x this IPPA upon arrival',
    btnBookSubmit: 'Reserve Ride with IPPA',
    statRides: 'Happy Travelers',
    statRating: 'Customer Rating',
    statAvailability: '24/7 Available',
    statAirports: 'All Netherlands Covered',
    routesTag: 'Popular Destinations',
    routesTitle: 'Fixed IPPA Routes',
    routesDesc: 'Instantly know which type of IPPA to hand your driver.',
    btnBookRoute: 'Select Route',
    srvTag: 'First-Class Travel',
    srvTitle: 'Executive Chauffeur Services On IPPA',
    fltTag: 'First-Class Fleet',
    fltTitle: 'Our Executive Vehicles',
    fltDesc: 'Step inside a pristine Mercedes, relax in comfort, and hand your IPPA at dropoff.',
    whyTag: 'Why IPPATAXI',
    whyTitle: 'The IPPA Travel Revolution',
    faqTag: 'Everything about IPPA',
    faqTitle: 'Frequently Asked Questions',
    contactTag: '24/7 Support',
    contactTitle: 'Questions About IPPA Or Ready To Book?',
    contactDesc: 'Need assistance determining which IPPA type your trip requires? Reach out anytime.'
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

  // Handle all links targeting #calculator
  document.querySelectorAll('a[href="#calculator"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const calcEl = document.getElementById('calculator') || document.getElementById('booking-calculator');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        calcEl.classList.remove('highlight-pulse');
        void calcEl.offsetWidth; // trigger reflow
        calcEl.classList.add('highlight-pulse');
        // If mobile drawer is open, close it
        const drawer = document.querySelector('.mobile-nav-drawer');
        if (drawer) drawer.classList.remove('open');
      }
    });
  });

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
      }

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

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      populateModalSummary();
      modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleReservationSubmit);
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


// Official Formspree Endpoint (100% private - your email address is safely hidden on Formspree)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mzeegqwr';

function handleReservationSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-name')?.value.trim();
  const phone = document.getElementById('modal-phone')?.value.trim();
  const email = document.getElementById('modal-email')?.value.trim() || 'Niet opgegeven';
  const notes = document.getElementById('modal-notes')?.value.trim() || 'Geen';
  const statusBox = document.getElementById('modal-form-status');
  const confirmBtn = document.getElementById('btn-confirm-reservation');

  if (!name || !phone) {
    if (statusBox) {
      statusBox.className = 'form-status-error';
      statusBox.textContent = appState.currentLang === 'en' 
        ? 'Please enter your name and phone number.' 
        : 'Vul alstublieft uw naam en telefoonnummer in.';
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

  // Set loading state on button
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner"></span> ' + (appState.currentLang === 'en' ? 'Sending to dispatch...' : 'Bezig met versturen naar centrale...');
  }
  if (statusBox) statusBox.style.display = 'none';

  const payload = {
    _subject: `🚖 Nieuwe IPPATAXI Reservering - ${name} (${res.giveText})`,
    _template: 'table',
    _captcha: 'false',
    Referentie: refCode,
    Klantnaam: name,
    Telefoonnummer: phone,
    Email: email,
    Ophaaladres: pickup,
    Bestemming: dropoff,
    Datum_en_Tijd: datetime.replace('T', ' om '),
    Voertuig: vehicleName,
    Aantal_Passagiers: passengers,
    Betaling_IPPA: res.giveText,
    Opmerkingen: notes
  };

  fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(async response => {
    if (response.ok) {
      return response.json().catch(() => ({ ok: true }));
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Submission error');
    }
  })
  .then(data => {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '✓ ' + (appState.currentLang === 'en' ? 'Reservation Sent!' : 'Reservering Verzonden!');
    }

    if (statusBox) {
      statusBox.className = 'form-status-success';
      statusBox.innerHTML = appState.currentLang === 'en'
        ? `✓ <strong>Reservation successfully sent!</strong> Details dispatched to our team.<br>Ref: <strong>${refCode}</strong>. Hand <strong>${res.giveText}</strong> to your driver upon arrival.`
        : `✓ <strong>Reservering succesvol verzonden!</strong> De ritdetails zijn doorgestuurd naar de centrale.<br>Referentie: <strong>${refCode}</strong>. U overhandigt <strong>${res.giveText}</strong> aan de chauffeur bij aankomst.`;
      statusBox.style.display = 'block';
    }

    showToast(appState.currentLang === 'en' 
      ? `Booking sent to dispatch! Ref: ${refCode}` 
      : `Reservering verstuurd naar centrale! Ref: ${refCode}`);

    // Auto close modal after 3 seconds
    setTimeout(() => {
      const modal = document.getElementById('booking-modal');
      if (modal) modal.classList.remove('active');
    }, 3000);
  })
  .catch(err => {
    console.error('Error submitting reservation:', err);
    if (confirmBtn) {
      confirmBtn.disabled = false;
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

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

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

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Bezig met versturen...';
    }
    if (statusBox) statusBox.style.display = 'none';

    const payload = {
      _subject: `✉️ IPPATAXI Vraag van ${name}`,
      _replyto: email,
      _template: 'table',
      _captcha: 'false',
      Naam: name,
      Telefoonnummer: phone || 'Niet opgegeven',
      Email: email,
      Vraag_of_Ritdetails: message
    };

    fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(async response => {
      if (response.ok) {
        return response.json().catch(() => ({ ok: true }));
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Submission error');
      }
    })
    .then(data => {
      if (submitBtn) {
        submitBtn.disabled = false;
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
        if (submitBtn) submitBtn.textContent = 'Verstuur Bericht naar Centrale';
      }, 5000);
    })
    .catch(err => {
      console.error('Error submitting contact form:', err);
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
    <span style="color: #e5b869; font-size: 1.2rem;">💎</span>
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
