/* =============================
   GTAG & CONSENT MODE (aucune redéfinition ici)
   -> dataLayer/gtag sont définis dans le <head>
============================= */

/* =============================
   Conversion LEAD (unique)
============================= */
function gtag_report_conversion() {
  try {
    gtag('event', 'conversion', {
      send_to: 'AW-11242044118/DO1tCKLg97sbENb1z_Ap',
      value: 1.0,
      currency: 'EUR'
    });
  } catch (e) { /* noop */ }
  return true;
}

/* Conversion SIMULATION (anti-doublon) */
window.__simConvSent = false;
function gtag_report_simulation() {
  if (window.__simConvSent) return;
  try {
    gtag('event', 'conversion', {
      send_to: 'AW-11242044118/TM3qCM3e1Z8bENbiz_Ap',
      value: 1.0,
      currency: 'EUR'
    });
    window.__simConvSent = true;
  } catch (e) { /* noop */ }
}

/* =============================
   UTILITAIRES
============================= */
function parseNum(x, fallback = 0) {
  if (x === null || x === undefined) return fallback;
  const s = String(x)
    .replace(/\u00A0/g, ' ')
    .replace(/[\s€]/g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

/* =============================
   MASQUE TÉLÉPHONE (FR) — #gate-phone
============================= */
function attachPhoneMask() {
  const telInput = document.getElementById('gate-phone');
  if (!telInput) return;
  telInput.setAttribute('inputmode', 'numeric');
  telInput.setAttribute('maxlength', '14'); // 00 00 00 00 00

  const format = (v) => {
    let digits = v.replace(/\D/g, '').substring(0, 10);
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  telInput.addEventListener('input', (e) => {
    const oldVal = e.target.value;
    const oldCursor = e.target.selectionStart;
    const digitsBeforeCursor = oldVal.substring(0, oldCursor).replace(/\D/g, '');
    e.target.value = format(oldVal);
    let newCursor = 0, digitsCounted = 0;
    while (newCursor < e.target.value.length && digitsCounted < digitsBeforeCursor.length) {
      if (/\d/.test(e.target.value[newCursor])) digitsCounted++;
      newCursor++;
    }
    if (oldVal.length < e.target.value.length && e.target.value[newCursor - 1] === ' ') newCursor++;
    e.target.setSelectionRange(newCursor, newCursor);
  });

  telInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    telInput.value = format(txt);
  });
}

/* =============================
   BANDEAU COOKIES (Consent Mode)
============================= */
(function () {
  const KEY = 'consent_v2',
    banner = document.getElementById('consent-banner'),
    btnAccept = document.getElementById('consent-accept'),
    btnReject = document.getElementById('consent-reject');

  if (!banner || !btnAccept || !btnReject) return;

  function updateConsent(state) {
    gtag('consent', 'update', {
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage: state.ads ? 'granted' : 'denied',
      ad_user_data: state.adUserData ? 'granted' : 'denied',
      ad_personalization: state.adPersonal ? 'granted' : 'denied'
    });
  }

  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  const saved = load();
  if (saved) {
    updateConsent(saved);
    banner.style.display = 'none';
  } else {
    banner.style.display = 'block';
    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
    });
  }

  btnAccept.addEventListener('click', () => {
    const s = { analytics: true, ads: true, adUserData: true, adPersonal: true };
    updateConsent(s); save(s); banner.style.display = 'none';
  });

  btnReject.addEventListener('click', () => {
    const s = { analytics: false, ads: false, adUserData: false, adPersonal: false };
    updateConsent(s); save(s); banner.style.display = 'none';
  });
})();

/* =============================
   UTM / GCLID tracking (localStorage)
============================= */
(function () {
  const p = new URLSearchParams(location.search);
  const track = {
    utm_source: (p.get('utm_source') || ''),
    utm_medium: (p.get('utm_medium') || ''),
    utm_campaign: (p.get('utm_campaign') || ''),
    utm_adgroup: (p.get('utm_adgroup') || ''),
    utm_term: (p.get('utm_term') || ''),
    utm_matchtype: (p.get('utm_matchtype') || ''),
    utm_device: (p.get('utm_device') || ''),
    gclid: (p.get('gclid') || ''),
    gbraid: (p.get('gbraid') || ''),
    wbraid: (p.get('wbraid') || '')
  };
  const isAds = track.gclid || track.gbraid || track.wbraid ||
    (track.utm_source.toLowerCase() === 'google' && track.utm_medium.toLowerCase() === 'cpc');

  if (isAds) {
    try { localStorage.setItem('ads_tracking_v1', JSON.stringify({ t: Date.now(), ...track })); } catch (e) { }
  }

  window.__getAdsTrack = function () {
    try {
      const raw = localStorage.getItem('ads_tracking_v1');
      if (!raw) return track;
      const obj = JSON.parse(raw);
      // Expire au bout de 7 jours
      if (Date.now() - (obj.t || 0) > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('ads_tracking_v1');
        return track;
      }
      return obj;
    } catch (e) { return track; }
  };
})();

/* =============================
   SCÉNARIOS (cache 24h)
============================= */
const SC_STATIC_URL = 'https://raw.githubusercontent.com/BiofranceEnergies/Solution-solaire.pro/main/scenarios/scenarios.json';
const SC_TTL_MS = 15 * 60 * 1000; // 15 minutes


const SC_CACHE_KEY = 'scenarios_all_v1';

function normalizeRow(row) {
  return {
    departement: String(row.Departement || '').trim(),
    prixKwh: parseNum(row.PrixKwh, 0.25),
    puissance: String(row.Puissance || '').trim(),
    prod: parseNum(row.Prod, 0),
    seuil: parseNum(row.Seuil, 0),
    panels: parseInt(parseNum(row.Panels, 0), 10),
    prix: parseNum(row.Prix, 0),
    remiseChantier: parseNum(row.RemiseChantier, 0),
    mensualite: parseNum(row.Mensualite, 0),
    dureeMois: parseInt(parseNum(row.Mois, 0), 10),
    taeg: parseNum(row.Taeg, 0),
    total: parseNum(row.Total, 0)
  };
}

function readAllScenariosFromCache() {
  try {
    const raw = localStorage.getItem(SC_CACHE_KEY);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (!t || !Array.isArray(data)) return null;
    if (Date.now() - t > SC_TTL_MS) return null;
    return data;
  } catch { return null; }
}
function writeAllScenariosToCache(rows) {
  try { localStorage.setItem(SC_CACHE_KEY, JSON.stringify({ t: Date.now(), data: rows })); } catch { }
}

async function fetchScenarios(departement) {
  const cachedAll = readAllScenariosFromCache();
  if (cachedAll) {
    const subset = cachedAll.filter(r => String(r.departement) === String(departement));
    if (subset.length) return subset;
  }
  const r = await fetch(SC_STATIC_URL, { cache: 'no-store' });
  if (!r.ok) {
    console.error('fetchScenarios: échec JSON statique', r.status);
    alert("Impossible de charger les scénarios. Réessayez dans un instant.");
    return [];
  }
  const raw = await r.json();
  const all = (raw || []).map(normalizeRow);
  writeAllScenariosToCache(all);
  const subset = all.filter(x => String(x.departement) === String(departement));
  if (!subset.length) console.warn(`Aucun scénario trouvé pour le département ${departement}`);
  return subset;
}

/* =============================
   SESSION
============================= */
const SESSION_KEY = 'sim_session_id_v1';
function getSessionId() {
  try {
    const ex = localStorage.getItem(SESSION_KEY);
    if (ex) return ex;
    const id = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch (e) {
    return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
const SESSION_ID = getSessionId();

/* =============================
   POST Google Sheets
============================= */
const G_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhlyD_FMMm2g9JIQAm2Se2xehUqIM2MzWMl1YGl_gP1DJKM_-jZFj_YStDMhWi-0F8XA/exec';

function getAdsTrack() {
  if (typeof window.__getAdsTrack === 'function') {
    try { return window.__getAdsTrack() || {}; } catch (e) { return {}; }
  }
  return {};
}

function postToSheet(payload) {
  const merged = { ...payload, ...getAdsTrack() };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) params.append(k, v ?? '');
  const bodyString = params.toString();

  if (navigator.sendBeacon) {
    try {
      const ok = navigator.sendBeacon(G_SCRIPT_URL, new Blob([bodyString], { type: 'application/x-www-form-urlencoded' }));
      if (ok) return;
    } catch (e) { /* noop */ }
  }
  fetch(G_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyString,
    mode: 'no-cors'
  }).catch(() => { });
}

/* =============================
   OVERLAY + VALIDATIONS
============================= */
const overlay = document.getElementById('calc-overlay');
const btnSim = document.getElementById('simuler');
const inputCP = document.getElementById('codePostal');
const inputFact = document.getElementById('facture');

function showCalcOverlay(msg) {
  // Si le formulaire est dans un modal, on le ferme au moment du calcul
  const modal = document.getElementById('form-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  if (!overlay) return;
  if (msg) {
    const t = overlay.querySelector('#calc-title');
    if (t) t.textContent = msg;
  }
  overlay.style.display = 'flex';
  document.body.classList.add('no-scroll');
  overlay.querySelector('.panel')?.focus();
  if (btnSim) {
    btnSim.disabled = true;
    btnSim.style.opacity = '0.7';
  }
}

function hideCalcOverlay() {
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.classList.remove('no-scroll');
  if (btnSim) { btnSim.disabled = false; btnSim.style.opacity = '1'; }
}
function validateStep1() {
  const cp = (inputCP?.value || '').trim();
  const factureRaw = (inputFact?.value || '');
  const num = parseFloat(factureRaw.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
  const okCP = /^[0-9]{5}$/.test(cp);
  const okFact = Number.isFinite(num) && num > 0;
  if (!okCP) { alert('Veuillez entrer un code postal valide (5 chiffres).'); return false; }
  if (!okFact) { alert("Veuillez indiquer une facture annuelle valide."); return false; }
  return true;
}

/* =============================
   SOMMAIRE / RÉSULTATS
============================= */
let simulationData = {}; // stockage inter-étapes

window.__handleSubmitEtape1 = async function (ev) {
  ev.preventDefault();
  showCalcOverlay('Calcul en cours…');
  if (!validateStep1()) { hideCalcOverlay(); return false; }

  const departement = (inputCP.value.trim()).substring(0, 2);
  const scenarios = await fetchScenarios(departement);
  if (!scenarios.length) { hideCalcOverlay(); return false; }

  const cp = inputCP.value.trim();
  const facture = parseFloat((inputFact.value || '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, ''));

  const inputConsoElem = document.getElementById('conso');
  let conso, prixKwh, sourceConso = "facture";

  if (inputConsoElem && inputConsoElem.value.trim()) {
    const consoVal = parseFloat((inputConsoElem.value || '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(consoVal) && consoVal > 0) {
      conso = consoVal;
      prixKwh = (conso > 0) ? facture / conso : (scenarios[0]?.prixKwh || 0.25);
      sourceConso = "kwh";
    } else {
      alert("Consommation kWh invalide, calcul basé sur la facture uniquement.");
      prixKwh = scenarios[0]?.prixKwh || 0.25;
      conso = (prixKwh > 0) ? facture / prixKwh : 0;
    }
  } else {
    prixKwh = scenarios[0]?.prixKwh || 0.25;
    conso = (prixKwh > 0) ? facture / prixKwh : 0;
  }

  const minProd = Math.min(...scenarios.map(s => s.prod || Infinity), Infinity);
  if (conso < minProd) { alert("Consommation trop faible : installation non conseillée."); hideCalcOverlay(); return false; }

  let sc = scenarios.filter(s => (s.prod || 0) <= conso).sort((a, b) => (b.prod || 0) - (a.prod || 0))[0];
  if (!sc) sc = scenarios.sort((a, b) => (b.prod || 0) - (a.prod || 0))[0];
  if (!sc) { alert("Erreur: Aucun scénario applicable trouvé."); hideCalcOverlay(); return false; }

  const autocons = Math.min(sc.prod || 0, conso || 0);
  const gainAn = autocons * (Number.isFinite(prixKwh) && prixKwh > 0 ? prixKwh : 0);
  const gainMois = gainAn / 12;
  const tauxHausse = 0.03;
  const dureeProjection = 15;
  const facteurCumul = (tauxHausse > 0)
    ? (Math.pow(1 + tauxHausse, dureeProjection) - 1) / tauxHausse
    : dureeProjection;
  const gain15 = gainAn * facteurCumul;

  simulationData = {
    cp,
    facture,
    conso: Math.round(conso),
    prixKwh,
    sc,
    gainAn: Math.round(gainAn),
    gainMois: Math.round(gainMois),
    gain15: Math.round(gain15),
    autocons: Math.round(autocons),
    sourceConso
  };
  window.simulationData = simulationData; // pour le PDF

  // Rendu HTML
  const recapDiv = document.getElementById('recap');
  if (!recapDiv) { console.warn('#recap manquant'); hideCalcOverlay(); return false; }

  recapDiv.innerHTML = `
    <div class="result-card" role="region" aria-label="Votre estimation personnalisée">
      <h2>Votre estimation personnalisée</h2>
      <div class="result-grid" style="margin-top:12px">
        ${generateVisiblePartHTML(simulationData)}
      </div>
      <div class="lock-zone" id="lock-zone">
        <div class="result-grid lock-blur" id="lock-blur" style="margin-top:12px">
          ${generateLockedPartHTML(simulationData)}
        </div>
        ${generateGateHTML()}
      </div>
    </div>`;

  attachPhoneMask();
  recapDiv.style.display = 'block';
  document.body.classList.add('results-mode');
  recapDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Conversion Google Ads "Simulation"
  gtag_report_simulation();

  // Init Gate (téléphone)
  initGateForm();

  // Envoi non bloquant : ligne "simulation" (sans téléphone/email)
  const scSel = simulationData.sc || {};
  postToSheet({
    event: 'simulation',
    unlock: '0',
    session_id: SESSION_ID,
    timestamp: new Date().toISOString(),
    code_postal: simulationData.cp || '',
    facture: simulationData.facture || 0,
    conso: simulationData.conso || 0,
    source_conso: simulationData.sourceConso || '',
    prix_kwh: simulationData.prixKwh || 0,
    puissance: scSel.puissance || '',
    panneaux: scSel.panels || 0,
    prod: scSel.prod || 0,
    prix: scSel.prix || 0,
    remise: scSel.remiseChantier || 0,
    mensualite: scSel.mensualite || 0,
    taeg: scSel.taeg || 0,
    totalcredit: scSel.total || 0,
    mois: scSel.dureeMois || 0,
    eco1: simulationData.gainAn || 0,
    ecomensuelle: simulationData.gainMois || 0,
    eco15: simulationData.gain15 || 0,
    email: '',
    telephone: '',
    emailUser: '',
    tel: ''
  });

  hideCalcOverlay();
  return false;
};

/* =============================
   Gate (déblocage résultats)
============================= */
function initGateForm() {
  const form = document.getElementById('gate-form');
  const blurDiv = document.getElementById('lock-blur');
  const gateDiv = document.getElementById('gate-sticky');

  if (!form || !blurDiv || !gateDiv) {
    console.error("Éléments Gate manquants.");
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById('gate-phone');
    const emailInput = document.getElementById('gate-email');
    const phone = String(phoneInput?.value || '').trim();
    const email = String(emailInput?.value || '').trim();
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 10) {
      alert('Merci d’indiquer un numéro de téléphone valide (10 chiffres).');
      phoneInput?.focus();
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      alert('Merci d’indiquer un email valide.');
      emailInput?.focus();
      return;
    }

    // Conversion Google Ads "Lead"
    gtag_report_conversion();

    // Envoi non bloquant Google Sheets (LEAD)
    if (simulationData && simulationData.sc) {
      const sc = simulationData.sc;
      const payload = {
        event: 'lead',
        unlock: '1',
        session_id: SESSION_ID,
        timestamp: new Date().toISOString(),
        code_postal: simulationData.cp || '',
        facture: simulationData.facture || 0,
        conso: simulationData.conso || 0,
        source_conso: simulationData.sourceConso || '',
        prix_kwh: simulationData.prixKwh || 0,
        puissance: sc.puissance || '',
        panneaux: sc.panels || 0,
        prod: sc.prod || 0,
        prix: sc.prix || 0,
        remise: sc.remiseChantier || 0,
        mensualite: sc.mensualite || 0,
        taeg: sc.taeg || 0,
        totalcredit: sc.total || 0,
        mois: sc.dureeMois || 0,
        eco1: simulationData.gainAn || 0,
        ecomensuelle: simulationData.gainMois || 0,
        eco15: simulationData.gain15 || 0,
        email: email,
        telephone: digits,
        emailUser: email,
        tel: digits
      };
      postToSheet(payload);
    } else {
      console.warn("Données de simulation non disponibles. Envoi GSheet (lead) annulé.");
    }

    // Déverrouillage UI + bouton PDF
    blurDiv.classList.remove('lock-blur');
    gateDiv.remove();
    insertPdfCta();
  });
}

/* =============================
   Mentions légales (popup) & FAQ accordéon
============================= */
document.addEventListener('click', (e) => {
  if (e.target.closest('summary')) {
    const d = e.target.closest('details');
    if (!d) return;
    const group = d.parentElement;
    group.querySelectorAll('details[open]').forEach(x => { if (x !== d) x.removeAttribute('open'); });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("mentions-legales-link"),
    popup = document.getElementById("mentions-popup"),
    close = document.getElementById("close-mentions");
  if (link && popup && close) {
    link.addEventListener("click", e => { e.preventDefault(); popup.style.display = "block"; });
    close.addEventListener("click", e => { e.preventDefault(); popup.style.display = "none"; });
  }
});

/* =============================
   Impression PDF
============================= */
function insertPdfCta() {
  if (document.getElementById('btn-pdf')) return;
  const card = document.querySelector('#recap .result-card');
  if (!card) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'kpi';
  wrapper.style.cssText = 'grid-column:1/-1; text-align:center; padding-top:6px;';
  wrapper.innerHTML = `
    <button id="btn-pdf" type="button" class="gate-cta" style="width:min(420px,100%);">
      Télécharger mon estimation en PDF
      <span class="arrow" aria-hidden="true">→</span>
    </button>
  `;
  card.appendChild(wrapper);
  attachPdfHandler();
}

function attachPdfHandler() {
  const btn = document.getElementById('btn-pdf');
  if (!btn) return;
  btn.addEventListener('click', () => {
    try { prepareAndPrint(); }
    catch (e) {
      console.error('Erreur impression PDF', e);
      alert("Impossible de préparer le PDF. Réessayez.");
    }
  });
}

function prepareAndPrint() {
  const recap = document.getElementById('recap');
  if (!recap) { window.print(); return; }

  const cp = (window.simulationData && window.simulationData.cp) ? String(window.simulationData.cp) : '';
  const dep = cp ? cp.slice(0, 2) : '78';
  const sc = (window.simulationData && window.simulationData.sc) ? window.simulationData.sc : {};
  const titreLigne = `Estimation photovoltaïque – Yvelines (${dep})`;
  const sousTitre = cp
    ? `Code postal : ${cp} · Puissance : ${sc.puissance || '—'} · Production : ${(sc.prod || 0).toLocaleString('fr-FR')} kWh/an`
    : `Puissance : ${sc.puissance || '—'} · Production : ${(sc.prod || 0).toLocaleString('fr-FR')} kWh/an`;

  const header = document.createElement('div');
  header.className = 'print-header';
  header.innerHTML = `
    <div style="text-align:center;">
      <img src="https://raw.githubusercontent.com/BiofranceEnergies/biofrance-images/687b0f048a98e03f86e7852020887ff4f05eb913/logo%20SSP.webp"
           alt="Solution Solaire Pro" style="height:48px;width:auto;display:inline-block;margin-bottom:6px;">
      <div style="font-weight:900;font-size:18px;line-height:1.2;color:#111">${titreLigne}</div>
      <div style="font-size:12px;color:#374151;margin-top:2px;">${sousTitre}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div style="height:6px;margin:10px auto 0;width:100%;max-width:120px;border-radius:999px;
                   background:linear-gradient(180deg,#f59e0b,#fbbf24);"></div>
    </div>
  `;
  const card = recap.querySelector('.result-card');
  if (card) { card.insertAdjacentElement('afterbegin', header); }

  const cleanup = () => {
    header.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

/* =============================
   GÉNÉRATION HTML DES BLOCS
============================= */
function generateVisiblePartHTML(data) {
  const { cp = 'N/A', conso = 0, prixKwh = 0, facture = 0, sc = {} } = data;
  return `
    <div class="kpi">
      <div class="label">Code postal</div>
      <div class="value">${cp}</div>
    </div>
    <div class="kpi">
      <div class="label">Conso annuelle estimée</div>
      <div class="value" style="color:#0f172a">${conso.toLocaleString('fr-FR')} kWh</div>
    </div>
    <div class="kpi">
      <div class="label">Prix du kWh utilisé</div>
      <div class="value">${Number(prixKwh).toFixed(3)} €</div>
    </div>
    <div class="kpi">
      <div class="label">Facture annuelle</div>
      <div class="value">${Number(facture).toLocaleString('fr-FR')} €</div>
    </div>
    <div class="kpi kpi--highlight" style="grid-column:1/-1">
      <div class="label">Dimensionnement proposé</div>
      <div class="value">
        ${sc.puissance || 'N/A'} — ${sc.panels || 0} panneaux (500 W) • Production estimée
        <span style="color:#16a34a;font-weight:800">
          ${(sc.prod || 0).toLocaleString('fr-FR')} kWh/an
        </span>
      </div>
    </div>`;
}

function generateLockedPartHTML(data) {
  const { sc = {}, gainAn = 0, gainMois = 0, gain15 = 0, autocons = 0, conso = 0 } = data;
  const pctCouverture = (conso > 0) ? ((autocons / conso) * 100).toFixed(1) : 0;
  const tauxHausse = 0.03;
  return `
    <div class="kpi" style="grid-column:1/-1">
      <div class="value" style="font-size:18px;font-weight:700;color:#16a34a;margin-bottom:6px">
        ${pctCouverture} % <span style="color:#0f172a;font-weight:600">de votre consommation est couverte par votre production</span>
      </div>
      <div style="color:#334155;font-size:13px;line-height:1.5;margin-top:2px">
        Votre production est valorisée à 100&nbsp;% grâce à la batterie virtuelle...
        <em>Hypothèse standard...</em>
      </div>
    </div>
    <div class="kpi">
      <div class="label">Gain 1ʳᵉ année (ordre de grandeur)</div>
      <div class="value" style="color:#16a34a">${gainAn.toLocaleString('fr-FR')} € / an</div>
    </div>
    <div class="kpi">
      <div class="label">Économie moyenne mensuelle</div>
      <div class="value" style="color:#16a34a">${gainMois.toLocaleString('fr-FR')} € / mois</div>
    </div>
    <div class="kpi" style="grid-column:1/-1">
      <div class="label">Économie cumulée sur 15 ans</div>
      <div class="value" style="color:#16a34a">${gain15.toLocaleString('fr-FR')} €</div>
      <div class="note" style="margin-top:4px">
        Hypothèses&nbsp;: prix du kWh +${(tauxHausse * 100)}&nbsp;%/an...
      </div>
    </div>
    ${generateRemiseBannerHTML(sc)}
    ${generateFinancementCardHTML(sc)}`;
}

function generateRemiseBannerHTML(sc) {
  if (Number.isFinite(sc?.remiseChantier) && sc.remiseChantier > 0) {
    return `
      <div class="financial-banner" style="grid-column: 1 / -1;">
        <div style="font-weight:700; color:#7c2d12; margin-bottom:4px">
          Offre spéciale « Groupage chantiers »
        </div>
        <div style="font-size:22px; font-weight:900; color:#7c2d12;">
          ${Math.round(sc.remiseChantier).toLocaleString('fr-FR')} € de remise immédiate
        </div>
        <div class="note" style="margin-top:6px; color:#334155">
          (à déduire du prix TTC indiqué ci-dessous)
        </div>
        <div class="note" style="margin-top:4px; color:#334155">
          <strong>Valable jusqu’au 31 décembre 2025</strong>
        </div>
      </div>`;
  }
  return '';
}

/* =============================
   Bloc "Coût et financement" + phrase d’autofinancement
============================= */
function generateFinancementCardHTML(sc) {
  // Récupère l'économie mensuelle à partir des données de simulation
  let economieMensuelle = null;
  if (window.simulationData && Number.isFinite(window.simulationData.gainMois)) {
    economieMensuelle = window.simulationData.gainMois;
  }

  // Bloc "prix de l'installation"
  const prixHTML = Number.isFinite(sc?.prix)
    ? `<p style="margin:0 0 8px">
         <strong>Installation ${sc.puissance || ''}</strong> :
         <span class="token">${Math.round(sc.prix).toLocaleString('fr-FR')} € TTC</span>
         <span class="note">(prix indicatif hors options)</span>
       </p>`
    : '';

  let financementDetailsHTML = '';

  if (Number.isFinite(sc?.mensualite) && sc.mensualite > 0) {
    const dureeHTML = Number.isFinite(sc?.dureeMois) && sc.dureeMois > 0
      ? `<span class="token">Durée : ${sc.dureeMois} mois</span>`
      : '';

    const taegHTML = Number.isFinite(sc?.taeg)
      ? `<span class="token">TAEG fixe : ${sc.taeg}%</span>`
      : '';

    const totalHTML = Number.isFinite(sc?.total) && sc.total > 0
      ? `<p style="margin:6px 0 0">
           <strong>Prix total</strong> :
           <span class="token">
             ${Number(sc.total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
           </span>
         </p>`
      : '';

    // Phrase d'autofinancement (optionnelle)
    let phraseAutofinancement = '';
    if (
      Number.isFinite(economieMensuelle) &&
      Number.isFinite(sc.mensualite) &&
      sc.mensualite > 0 &&
      economieMensuelle >= sc.mensualite
    ) {
      phraseAutofinancement = `
        <p class="note"
           style="
             margin:18px 0 0;
             padding:10px 18px;
             font-weight:600;
             font-size:15px;
             line-height:1.5;
             text-align:center;
             color:#0f172a;
             background:linear-gradient(
               135deg,
               rgba(252, 211, 77, 0.16),
               rgba(251, 191, 36, 0.04)
             );
             border-radius:999px;
             box-shadow:0 18px 45px rgba(15, 23, 42, 0.10);
           ">
          <span style="font-size:18px;margin-right:4px;">💡</span>
          Votre économie mensuelle
          (<strong>${economieMensuelle.toLocaleString('fr-FR', {
            minimumFractionDigits:0,
            maximumFractionDigits:0
          })} €</strong>)
          est supérieure à la mensualité
          (<strong>${sc.mensualite.toLocaleString('fr-FR', {
            minimumFractionDigits:2,
            maximumFractionDigits:2
          })} €</strong>).
          <br>
          <span style="font-weight:700;">Le projet s’autofinance.</span>
        </p>
      `;
    }


    // Bloc financement complet
    financementDetailsHTML = `
      <p style="margin:10px 0 4px; font-weight:700">
        Option financement <span class="note">(facultatif)</span>
      </p>
      <div class="tokens">
        <span class="token">
          ${sc.mensualite.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / mois
        </span>
        ${dureeHTML}
        ${taegHTML}
      </div>
      ${totalHTML}
      <p class="note" style="margin:10px 0 0">
        Financement proposé par notre partenaire, sous réserve d’acceptation.
      </p>
      <div class="note note-alert">
        ⚠️ Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.
      </div>
      <p class="note" style="margin:8px 0 0">
        Estimation indicative. Visite technique nécessaire...
      </p>
      ${phraseAutofinancement}
    `;
  }

  if (prixHTML || financementDetailsHTML) {
    return `
      <div class="financial-card" style="grid-column: 1 / -1;">
        <h3 class="financial-title">Coût et financement</h3>
        ${prixHTML}
        ${financementDetailsHTML}
      </div>
    `;
  }
  return '';
}

/* =============================
   Gate sticky (bandeau bas de page)
============================= */
function generateGateHTML() {
  return `
<div id="gate-sticky" class="gate-sticky" role="region" aria-label="Vérification de faisabilité">
  <div class="gate-inner">
    <p class="gate-msg">
      🔎 <strong>Vérifiez la faisabilité de votre projet solaire</strong> — réponse par SMS, sans engagement.
    </p>

    <form id="gate-form" class="gate-form" novalidate>
      <label class="sr-only" for="gate-phone">Téléphone</label>
      <input id="gate-phone" class="gate-input" type="tel" placeholder="06 12 34 56 78" autocomplete="tel" required>

      <!-- Email facultatif, masqué visuellement -->
      <input id="gate-email" class="gate-input gate-input--optional" type="email"
             placeholder="Votre email (facultatif)" autocomplete="email" style="display:none">

      <button class="gate-cta" type="submit">Vérifier ma faisabilité</button>
    </form>
  </div>
</div>`;
}
/* =============================
   Lazy Form Reveal (modal formulaire)
============================= */
document.addEventListener('DOMContentLoaded', () => {
  const modal     = document.getElementById('form-modal');
  const openBtn   = document.getElementById('reveal-form');
  const closeBtn  = modal ? modal.querySelector('.modal-close') : null;
  const firstInput = modal ? modal.querySelector('#codePostal') : null;

  if (!modal || !openBtn) return;

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // Ouverture via le bouton "Faire une estimation maintenant"
  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  // Fermeture via bouton croix
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // Fermeture en cliquant sur le fond flouté
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Fermeture via Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
});
