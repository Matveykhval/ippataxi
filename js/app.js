/**
 * IPPATAXI.NL - Core Application & Booking Logic
 * Features:
 * - Dynamic fare estimator with smart rate calculation
 * - Pre-filled route selectors
 * - WhatsApp instant dispatcher
 * - Full Dutch / English bilingual toggle
 * - Booking confirmation modal & toast manager
 * - FAQ accordion & mobile drawer
 */

// Application State
const appState = {
  currentLang: localStorage.getItem('ippa_lang') || 'nl',
  activeTab: 'standard', // 'standard' | 'airport' | 'hourly'
  vehicleType: 'sedan',  // 'sedan' | 'estate' | 'van'
  rates: {
    baseFare: 4.05,
    perKm: 2.50,
    perMinute: 0.45,
    vanMultiplier: 1.45,
    estateMultiplier: 1.15
  },
  routesPreset: {
    'ams-schiphol': { from: 'Amsterdam Centrum', to: 'Schiphol Airport (AMS)', km: 18, basePrice: 45 },
    'utr-schiphol': { from: 'Utrecht', to: 'Schiphol Airport (AMS)', km: 48, basePrice: 85 },
    'dh-schiphol': { from: 'Den Haag', to: 'Schiphol Airport (AMS)', km: 45, basePrice: 80 },
    'rtm-schiphol': { from: 'Rotterdam', to: 'Schiphol Airport (AMS)', km: 60, basePrice: 110 },
    'hlm-schiphol': { from: 'Haarlem', to: 'Schiphol Airport (AMS)', km: 20, basePrice: 49 },
    'alm-schiphol': { from: 'Almere', to: 'Schiphol Airport (AMS)', km: 42, basePrice: 79 },
    'ehv-schiphol': { from: 'Eindhoven', to: 'Schiphol Airport (AMS)', km: 125, basePrice: 195 },
    'ams-rotterdam': { from: 'Amsterdam', to: 'Rotterdam The Hague Airport (RTM)', km: 70, basePrice: 130 }
  },
  // Default WhatsApp Dispatch Phone (+31 6 12345678)
  dispatchPhone: '31612345678'
};

// Bilingual Translations Dictionary
const translations = {
  nl: {
    topBarLive: 'Direct taxi nodig? Binnen 10-15 min voorgereden',
    topBarSchiphol: 'Vaste Schiphol tarieven',
    callNow: 'Bel Direct: 06 - 12 34 56 78',
    navHome: 'Home',
    navTariffs: 'Tarieven & Boeken',
    navAirport: 'Schiphol Vervoer',
    navFleet: 'Onze Vloot',
    navServices: 'Diensten',
    navWhyUs: 'Waarom Ons',
    navContact: 'Contact',
    btnBookNav: 'Direct Reserveren',
    heroTag: 'Luxe Taxivervoer in Heel Nederland',
    heroTitle: 'Zakelijk & Particulier Taxi Vervoer Zonder Zorgen',
    heroDesc: 'Ervaar eersteklas comfort met IPPATAXI. Van vaste Schiphol transfers tot directievervoer en stadsritten. Transparante prijzen, representatieve chauffeurs en luxe voertuigen.',
    feat1: 'Vaste prijzen, geen meter-verrassingen',
    feat2: 'Altijd representatief in pak',
    feat3: 'Schiphol Vluchtmonitoring inbegrepen',
    feat4: 'PIN, Creditcard, Tikkie & Factuur',
    btnHeroWa: 'Direct Boeken via WhatsApp',
    btnHeroCall: 'Telefonisch Reserveren',
    cardTitle: 'Bereken Uw Ritprijs',
    cardSubtitle: 'Directe prijsindicatie & online reservering',
    tabStandard: 'Standaard Rit',
    tabAirport: 'Schiphol Transfer',
    tabHourly: 'Zakelijk / Uur',
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
    fareTag: 'Vast Tarief Indicatie',
    fareNote: '✓ Inclusief btw, bagage & instaptarief',
    btnBookSubmit: 'Rit Reserveren & Bevestigen',
    statRides: 'Succesvolle Ritten',
    statRating: 'Gemiddelde Beoordeling',
    statAvailability: 'Beschikbaarheid',
    statAirports: 'Luchthavens Gedekt',
    routesTag: 'Populaire Routes',
    routesTitle: 'Vaste Scherpe Schiphol Tarieven',
    routesDesc: 'Geen file-opslag of onverwachte kosten. U weet vooraf precies waar u aan toe bent.',
    btnBookRoute: 'Boek Deze Rit',
    srvTag: 'Onze Specialisaties',
    srvTitle: 'Diensten Op Maat Voor Elke Gelegenheid',
    fltTag: 'Eersteklas Comfort',
    fltTitle: 'Onze Exclusieve Vloot',
    fltDesc: 'Al onze auto’s zijn brandschoon, voorzien van airconditioning, lederen bekleding en gratis WiFi.',
    whyTag: 'Waarom Ippataxi',
    whyTitle: 'De Zekerheden Van IPPATAXI',
    faqTag: 'Vragen & Antwoorden',
    faqTitle: 'Veelgestelde Vragen',
    contactTag: '24/7 Bereikbaar',
    contactTitle: 'Neem Contact Op Of Reserveer Direct',
    contactDesc: 'Heeft u met spoed een taxi nodig of een speciale ritwens? Onze centrale is dag en nacht bereikbaar.'
  },
  en: {
    topBarLive: 'Need a taxi immediately? Arrives within 10-15 mins',
    topBarSchiphol: 'Fixed Airport Rates',
    callNow: 'Call Direct: +31 6 12 34 56 78',
    navHome: 'Home',
    navTariffs: 'Fares & Booking',
    navAirport: 'Airport Transfer',
    navFleet: 'Our Fleet',
    navServices: 'Services',
    navWhyUs: 'Why Us',
    navContact: 'Contact',
    btnBookNav: 'Book Online',
    heroTag: 'Premium Taxi Service in the Netherlands',
    heroTitle: 'Executive & Private Taxi Rides With Complete Peace of Mind',
    heroDesc: 'Experience first-class comfort with IPPATAXI. From fixed-fare Amsterdam Airport transfers to executive corporate travel. Transparent pricing, suited drivers, and immaculate luxury vehicles.',
    feat1: 'Fixed pricing, no meter surprises',
    feat2: 'Polite, suited professional chauffeurs',
    feat3: 'Schiphol flight monitoring included',
    feat4: 'Card, Cash, Apple Pay & Corporate Invoicing',
    btnHeroWa: 'Book Instantly via WhatsApp',
    btnHeroCall: 'Book by Phone',
    cardTitle: 'Calculate Your Ride Fare',
    cardSubtitle: 'Instant price estimation & simple booking',
    tabStandard: 'Point-to-Point',
    tabAirport: 'Airport Transfer',
    tabHourly: 'Hourly / Corporate',
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
    fareTag: 'Fixed Fare Estimate',
    fareNote: '✓ Inclusive of VAT, luggage & fees',
    btnBookSubmit: 'Reserve & Confirm Ride',
    statRides: 'Completed Rides',
    statRating: 'Customer Rating',
    statAvailability: 'Availability',
    statAirports: 'Airports Served',
    routesTag: 'Popular Destinations',
    routesTitle: 'Fixed-Rate Airport Transfers',
    routesDesc: 'No traffic surcharges or hidden fees. Transparent, guaranteed fixed pricing.',
    btnBookRoute: 'Book This Route',
    srvTag: 'Our Specializations',
    srvTitle: 'Tailored Services For Every Occasion',
    fltTag: 'First-Class Comfort',
    fltTitle: 'Our Executive Fleet',
    fltDesc: 'All vehicles are pristine, climate controlled, feature leather upholstery and complimentary Wi-Fi.',
    whyTag: 'Why Choose Us',
    whyTitle: 'The IPPATAXI Guarantee',
    faqTag: 'Questions & Answers',
    faqTitle: 'Frequently Asked Questions',
    contactTag: '24/7 Support',
    contactTitle: 'Get in Touch or Reserve Now',
    contactDesc: 'Need a taxi urgently or planning an executive transfer? Our dispatch is available 24/7.'
  }
};

// DOM Elements
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

  // Apply stored language
  applyTranslations(appState.currentLang);
}

function setLanguage(lang) {
  appState.currentLang = lang;
  localStorage.setItem('ippa_lang', lang);

  // Update button active state
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

  // Update HTML lang attribute
  document.documentElement.lang = lang;
}

/**
 * Set default date & time in the booking form
 */
function setDefaultDateTime() {
  const dtInput = document.getElementById('ride-datetime');
  if (!dtInput) return;

  const now = new Date();
  now.setMinutes(now.getMinutes() + 45); // default to 45 mins from now
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');

  dtInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
}

/**
 * Booking Tab Switcher (Standard / Airport / Hourly)
 */
function initBookingTabs() {
  const tabs = document.querySelectorAll('.booking-tab-btn');
  const dropoffInput = document.getElementById('ride-dropoff');
  const pickupInput = document.getElementById('ride-pickup');

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
      } else if (mode === 'hourly') {
        if (dropoffInput) dropoffInput.placeholder = 'Zakelijk / Meerdere stops';
      } else {
        if (dropoffInput) dropoffInput.placeholder = 'Bijv. Schiphol Airport, Utrecht...';
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
 * Fare Calculation Logic
 */
function initFareCalculation() {
  const pickupInput = document.getElementById('ride-pickup');
  const dropoffInput = document.getElementById('ride-dropoff');
  const passengersInput = document.getElementById('ride-passengers');

  if (pickupInput) pickupInput.addEventListener('input', debounce(updateFareDisplay, 250));
  if (dropoffInput) dropoffInput.addEventListener('input', debounce(updateFareDisplay, 250));
  if (passengersInput) passengersInput.addEventListener('change', updateFareDisplay);

  updateFareDisplay();
}

function calculateEstimatedFare() {
  const pickup = (document.getElementById('ride-pickup')?.value || '').toLowerCase().trim();
  const dropoff = (document.getElementById('ride-dropoff')?.value || '').toLowerCase().trim();
  const passengers = parseInt(document.getElementById('ride-passengers')?.value || '1', 10);

  // If user has chosen Minibus (or > 4 passengers auto-selects minivan)
  let vehicleMultiplier = 1.0;
  if (appState.vehicleType === 'estate') {
    vehicleMultiplier = appState.rates.estateMultiplier;
  } else if (appState.vehicleType === 'van' || passengers > 4) {
    vehicleMultiplier = appState.rates.vanMultiplier;
  }

  // Check known airport routes
  let basePrice = 0;
  let distanceKm = 15; // default fallback distance

  // Known city pairs matcher
  const pairs = [
    { match: ['amsterdam', 'schiphol'], base: 45, km: 18 },
    { match: ['utrecht', 'schiphol'], base: 85, km: 48 },
    { match: ['den haag', 'schiphol'], base: 80, km: 45 },
    { match: ['rotterdam', 'schiphol'], base: 110, km: 60 },
    { match: ['haarlem', 'schiphol'], base: 49, km: 20 },
    { match: ['almere', 'schiphol'], base: 79, km: 42 },
    { match: ['amstelveen', 'schiphol'], base: 35, km: 12 },
    { match: ['eindhoven', 'schiphol'], base: 195, km: 125 },
    { match: ['rotterdam', 'den haag'], base: 55, km: 26 },
    { match: ['amsterdam', 'rotterdam'], base: 130, km: 70 },
    { match: ['amsterdam', 'utrecht'], base: 80, km: 42 }
  ];

  let matched = false;
  for (const pair of pairs) {
    const has0 = pickup.includes(pair.match[0]) || dropoff.includes(pair.match[0]);
    const has1 = pickup.includes(pair.match[1]) || dropoff.includes(pair.match[1]);
    if (has0 && has1) {
      basePrice = pair.base;
      distanceKm = pair.km;
      matched = true;
      break;
    }
  }

  if (!matched) {
    // If not a known pair, calculate dynamic baseline
    if (pickup.length > 2 && dropoff.length > 2) {
      // Approximate 25km typical intercity / airport ride
      distanceKm = 22;
      basePrice = appState.rates.baseFare + (distanceKm * appState.rates.perKm) + (25 * appState.rates.perMinute);
    } else {
      // Default base starting fare
      basePrice = 45;
    }
  }

  let finalPrice = Math.round(basePrice * vehicleMultiplier);
  // Ensure minimum fare
  if (finalPrice < 25) finalPrice = 25;

  return {
    price: finalPrice,
    distanceKm: distanceKm
  };
}

function updateFareDisplay() {
  const result = calculateEstimatedFare();
  const priceDisplay = document.getElementById('fare-amount-display');
  const distanceDisplay = document.getElementById('fare-distance-display');

  if (priceDisplay) {
    priceDisplay.textContent = `€${result.price.toFixed(2)}`;
  }
  if (distanceDisplay) {
    const isEn = appState.currentLang === 'en';
    distanceDisplay.textContent = isEn 
      ? `Est. ~${result.distanceKm} km • Direct Dispatch`
      : `Geschat ~${result.distanceKm} km • Direct voorgereden`;
  }
}

/**
 * Quick Preset Airport Routes Buttons
 */
function initPresetRoutes() {
  const routeButtons = document.querySelectorAll('.btn-route-book');
  const pickupInput = document.getElementById('ride-pickup');
  const dropoffInput = document.getElementById('ride-dropoff');
  const bookingWidget = document.getElementById('booking-calculator');

  routeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.currentTarget.getAttribute('data-from');
      const to = e.currentTarget.getAttribute('data-to');

      if (pickupInput && from) pickupInput.value = from;
      if (dropoffInput && to) dropoffInput.value = to;

      // Select Airport Tab
      const airportTab = document.querySelector('[data-tab="airport"]');
      if (airportTab) airportTab.click();

      updateFareDisplay();

      // Scroll smoothly to the booking widget
      if (bookingWidget) {
        bookingWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      showToast(appState.currentLang === 'en' ? `Route selected: ${from} → ${to}` : `Route ingesteld: ${from} → ${to}`);
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
  const waDirectBtn = document.getElementById('btn-modal-whatsapp');

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

  // Close on outside click
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleReservationSubmit);
  }

  if (waDirectBtn) {
    waDirectBtn.addEventListener('click', () => {
      openWhatsAppDispatch();
    });
  }

  // Hero WhatsApp button direct dispatch
  const heroWaBtn = document.getElementById('btn-hero-wa');
  if (heroWaBtn) {
    heroWaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openWhatsAppDispatch();
    });
  }
}

function populateModalSummary() {
  const pickup = document.getElementById('ride-pickup')?.value || 'Amsterdam';
  const dropoff = document.getElementById('ride-dropoff')?.value || 'Schiphol Airport';
  const datetime = document.getElementById('ride-datetime')?.value || 'Zo snel mogelijk';
  const passengers = document.getElementById('ride-passengers')?.value || '1';
  const luggage = document.getElementById('ride-luggage')?.value || '1';
  const { price } = calculateEstimatedFare();

  const vNames = {
    sedan: 'Executive Sedan',
    estate: 'Stationwagen',
    van: 'VIP Taxibus (tot 8p)'
  };
  const vehicleName = vNames[appState.vehicleType] || 'Executive Sedan';

  document.getElementById('sum-pickup').textContent = pickup;
  document.getElementById('sum-dropoff').textContent = dropoff;
  document.getElementById('sum-datetime').textContent = datetime.replace('T', ' om ');
  document.getElementById('sum-vehicle').textContent = vehicleName;
  document.getElementById('sum-passengers').textContent = `${passengers} pers. / ${luggage} koffers`;
  document.getElementById('sum-fare').textContent = `€${price.toFixed(2)}`;
}

function openWhatsAppDispatch() {
  const pickup = document.getElementById('ride-pickup')?.value || 'Ophaaladres';
  const dropoff = document.getElementById('ride-dropoff')?.value || 'Bestemming';
  const datetime = document.getElementById('ride-datetime')?.value || 'Direct';
  const passengers = document.getElementById('ride-passengers')?.value || '1-2';
  const luggage = document.getElementById('ride-luggage')?.value || '1';
  const { price } = calculateEstimatedFare();

  const vNames = {
    sedan: 'Executive Sedan',
    estate: 'Stationwagen',
    van: 'VIP Taxibus'
  };

  const isEn = appState.currentLang === 'en';
  let message = '';

  if (isEn) {
    message = `Hello IPPATAXI (ippataxi.nl),\nI would like to book a taxi:\n\n📍 Pickup: ${pickup}\n🏁 Destination: ${dropoff}\n📅 Date & Time: ${datetime}\n👥 Passengers: ${passengers}\n🧳 Luggage: ${luggage}\n🚘 Vehicle: ${vNames[appState.vehicleType]}\n💶 Estimated fare: €${price.toFixed(2)}\n\nPlease confirm availability!`;
  } else {
    message = `Hallo IPPATAXI (ippataxi.nl),\nIk wil graag een taxi reserveren:\n\n📍 Ophaaladres: ${pickup}\n🏁 Bestemming: ${dropoff}\n📅 Datum & Tijd: ${datetime}\n👥 Aantal personen: ${passengers}\n🧳 Bagage: ${luggage} stuks\n🚘 Voertuig: ${vNames[appState.vehicleType]}\n💶 Geschat vast tarief: €${price.toFixed(2)}\n\nKunt u deze rit bevestigen?`;
  }

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${appState.dispatchPhone}?text=${encoded}`;
  window.open(url, '_blank');
}

function handleReservationSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-name')?.value.trim();
  const phone = document.getElementById('modal-phone')?.value.trim();
  const flight = document.getElementById('modal-flight')?.value.trim();
  const payment = document.getElementById('modal-payment')?.value;

  if (!name || !phone) {
    alert(appState.currentLang === 'en' ? 'Please fill in your name and phone number.' : 'Vul alstublieft uw naam en telefoonnummer in.');
    return;
  }

  // Generate a random luxury booking reference
  const refCode = 'IPP-' + Math.floor(100000 + Math.random() * 900000);
  const modal = document.getElementById('booking-modal');
  modal.classList.remove('active');

  const isEn = appState.currentLang === 'en';
  const successMsg = isEn 
    ? `Booking received! Ref: ${refCode}. We will contact you at ${phone}.`
    : `Reservering ontvangen! Ref: ${refCode}. We nemen direct contact op via ${phone}.`;

  showToast(successMsg);

  // Prompt WhatsApp as backup confirmation option
  setTimeout(() => {
    if (confirm(isEn ? 'Would you also like to receive confirmation directly on WhatsApp?' : 'Wilt u de bevestiging tevens direct via WhatsApp openen?')) {
      openWhatsAppDispatch();
    }
  }, 600);
}

/**
 * Quick Contact Form in Section
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const isEn = appState.currentLang === 'en';
    showToast(isEn ? 'Thank you! Your message has been sent to IPPATAXI.' : 'Hartelijk dank! Uw bericht is verzonden naar IPPATAXI.');
    form.reset();
  });
}

/**
 * Toast Notification Helper
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
    <span style="color: #22c55e; font-size: 1.2rem;">✓</span>
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

/**
 * Debounce helper
 */
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
