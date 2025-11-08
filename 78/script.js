/* =============================
   GTAG + CONSENT MODE
============================= */
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

/* Consent par défaut : refus */
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});

/* Recos Google */
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);

/* Init */
gtag('js', new Date());
gtag('config', 'AW-11242044118');

function gtag_report_conversion() {
  try { gtag('event','conversion',{ send_to:'AW-11242044118/MslOCKGZzo0bENb1z_Ap' }); } catch(e){}
  return true;
}

// Flag pour ne déclencher la conversion "simulation" qu'une fois
window.__simConvSent = false;

function gtag_report_simulation() {
  if (window.__simConvSent) return; // Ne pas renvoyer
  try {
    gtag('event','conversion',{
      send_to:'AW-11242044118/TM3qCM3e1Z8bENbiz_Ap',
      value:1.0,currency:'EUR'
    });
    window.__simConvSent = true; // Marquer comme envoyé
  } catch(e){}
}

/* =============================
   UI FAQ + Mentions légales (popup)
============================= */
document.addEventListener('click', (e)=>{
  if(e.target.closest('summary')){
    const d = e.target.closest('details');
    if(!d) return;
    const group = d.parentElement;
    group.querySelectorAll('details[open]').forEach(x => { if(x!==d) x.removeAttribute('open'); });
  }
});

document.addEventListener("DOMContentLoaded", ()=>{
  const link=document.getElementById("mentions-legales-link"),
        popup=document.getElementById("mentions-popup"),
        close=document.getElementById("close-mentions");
  if(link && popup && close){
    link.addEventListener("click", e=>{e.preventDefault();popup.style.display="block";});
    close.addEventListener("click", e=>{e.preventDefault();popup.style.display="none";});
  }
});

/* =============================
   MASQUE TÉLÉPHONE (FR) — #gate-phone
============================= */
function attachPhoneMask() {
  const telInput = document.getElementById('gate-phone');
  if (!telInput) {
    console.warn("attachPhoneMask: Champ #gate-phone non trouvé !");
    return;
  }

  telInput.setAttribute('inputmode','numeric');
  telInput.setAttribute('maxlength','14'); // 00 00 00 00 00

  const format = (v) => {
    let digits = v.replace(/\D/g,'').substring(0,10);
    return digits.replace(/(\d{2})(?=\d)/g,'$1 ').trim();
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
   IIFE PRINCIPALE
============================= */
(function(){
  let simulationData = {}; // stockage inter-étapes
  const overlay    = document.getElementById('calc-overlay');
  const btn        = document.getElementById('simuler');
  const inputCP    = document.getElementById('codePostal');
  const inputFact  = document.getElementById('facture');

  // URL unique Apps Script (GET JSON + POST lignes)
  const G_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhlyD_FMMm2g9JIQAm2Se2xehUqIM2MzWMl1YGl_gP1DJKM_-jZFj_YStDMhWi-0F8XA/exec';

  // -----------------------------
  // Session ID (lien simulation ↔ lead)
  // -----------------------------
  const SESSION_KEY = 'sim_session_id_v1';
  function getSessionId(){
    try{
      const ex = localStorage.getItem(SESSION_KEY);
      if (ex) return ex;
      const id = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      localStorage.setItem(SESSION_KEY, id);
      return id;
    } catch(e){
      return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    }
  }
  const SESSION_ID = getSessionId();

  // -----------------------------
  // UTM/GCLID → objet
  // -----------------------------
  function getAdsTrack(){
    if (typeof window.__getAdsTrack === 'function') {
      try{ return window.__getAdsTrack() || {}; } catch(e){ return {}; }
    }
    return {};
  }

  // -----------------------------
  // Envoi non bloquant vers Sheets
  // - sendBeacon si dispo (x-www-form-urlencoded)
  // - sinon fetch POST sans await (no-cors)
  // -----------------------------
  function postToSheet(payload){
    const merged = { ...payload, ...getAdsTrack() };

    const params = new URLSearchParams();
    for (const [k,v] of Object.entries(merged)) params.append(k, v ?? '');

    const bodyString = params.toString();

    // Try Beacon (non bloquant, background-friendly)
    if (navigator.sendBeacon) {
      try {
        const ok = navigator.sendBeacon(G_SCRIPT_URL, new Blob([bodyString], {type:'application/x-www-form-urlencoded'}));
        if (ok) return; // expédié
      } catch(e){}
    }

    // Fallback non bloquant: fetch sans await
    fetch(G_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: bodyString,
      mode: 'no-cors'
    }).catch(()=>{});
  }

  // -----------------------------
  // Overlay + validations
  // -----------------------------
  function showCalcOverlay(msg){
    if (!overlay) return;
    if (msg) {
      const t = overlay.querySelector('#calc-title');
      if (t) t.textContent = msg;
    }
    overlay.style.display = 'flex';
    document.body.classList.add('no-scroll');
    overlay.querySelector('.panel')?.focus();
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }
  }

  function hideCalcOverlay(){
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.classList.remove('no-scroll');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }

  function validateStep1(){
    const cp = (inputCP?.value || '').trim();
    const factureRaw = (inputFact?.value || '');
    const num = parseFloat(factureRaw.replace(/\s/g,'').replace(',', '.').replace(/[^0-9.]/g,''));
    const okCP = /^[0-9]{5}$/.test(cp);
    const okFact = Number.isFinite(num) && num > 0;
    if (!okCP) { alert('Veuillez entrer un code postal valide (5 chiffres).'); return false; }
    if (!okFact){ alert("Veuillez indiquer une facture annuelle valide."); return false; }
    return true;
  }

  // -----------------------------
  // Cache scénarios par département
  // -----------------------------
  const scenariosCache = new Map(); // clé: '78' → tableau

  // Lecture des scénarios (GET JSON)
  async function fetchScenarios(departement){
    if (scenariosCache.has(departement)) return scenariosCache.get(departement);
    try{
      const r = await fetch(G_SCRIPT_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const rows = (data || [])
        .filter(row => String(row.Departement||'') === String(departement))
        .map(row => ({
          prixKwh: parseFloat(String(row.PrixKwh||'').replace(',', '.').replace(/[^0-9.]/g,'') || 0.25),
          puissance: String(row.Puissance || ''),
          prod: parseFloat(row.Prod || 0),
          seuil: parseFloat(row.Seuil || 0),
          panels: parseInt(row.Panels || 0),
          prix: parseFloat(row.Prix || 0),
          remiseChantier: parseFloat(String(row.RemiseChantier||'').replace(',', '.').replace(/[^0-9.]/g,'') || 0),
          mensualite: parseFloat(row.Mensualite || 0),
          taeg: parseFloat(row.Taeg || 0),
          total: parseFloat(row.Total || 0),
          dureeMois: parseInt(row.Mois || 0)
        }));
      scenariosCache.set(departement, rows);
      return rows;
    }catch(e){
      console.error('fetchScenarios error', e);
      alert("Impossible de charger les données de simulation. Veuillez réessayer.");
      return [];
    }
  }

  // -----------------------------
  // Soumission ÉTAPE 1 (simulation)
  // -----------------------------
  window.__handleSubmitEtape1 = async function(ev){
    ev.preventDefault();
    showCalcOverlay('Calcul en cours…');
    if (!validateStep1()){ hideCalcOverlay(); return false; }

    const departement = (inputCP.value.trim()).substring(0,2);
    const scenarios = await fetchScenarios(departement);
    if (!scenarios.length){ hideCalcOverlay(); return false; }

    // Calculs
    const cp = inputCP.value.trim();
    const facture = parseFloat((inputFact.value || '').replace(/\s/g,'').replace(',', '.').replace(/[^0-9.]/g,''));
    const inputConsoElem = document.getElementById('conso');
    let conso, prixKwh, sourceConso = "facture";

    if (inputConsoElem && inputConsoElem.value.trim()) {
      const consoVal = parseFloat((inputConsoElem.value || '').replace(/\s/g,'').replace(',', '.').replace(/[^0-9.]/g,''));
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

    let sc = scenarios.filter(s => (s.prod||0) <= conso).sort((a,b)=> (b.prod||0) - (a.prod||0))[0];
    if (!sc) sc = scenarios.sort((a,b)=> (b.prod||0) - (a.prod||0))[0];
    if (!sc) { alert("Erreur: Aucun scénario applicable trouvé."); hideCalcOverlay(); return false; }

    const autocons = Math.min(sc.prod || 0, conso || 0);
    const gainAn   = autocons * (Number.isFinite(prixKwh) && prixKwh > 0 ? prixKwh : 0);
    const gainMois = gainAn / 12;
    const tauxHausse = 0.03;
    const dureeProjection = 15;
    const facteurCumul = (tauxHausse > 0) ? (Math.pow(1 + tauxHausse, dureeProjection) - 1) / tauxHausse : dureeProjection;
    const gain15 = gainAn * facteurCumul;

    simulationData = {
      cp, facture, conso: Math.round(conso), prixKwh, sc,
      gainAn: Math.round(gainAn), gainMois: Math.round(gainMois),
      gain15: Math.round(gain15), autocons: Math.round(autocons), sourceConso
    };
    // Expose global pour prepareAndPrint()
    window.simulationData = simulationData;

    // Rendu HTML (avant tout envoi réseau pour fluidité)
    const recapDiv = document.getElementById('recap');
    if (!recapDiv){ console.warn('#recap manquant'); hideCalcOverlay(); return false; }

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
    if (typeof gtag_report_simulation === 'function') { gtag_report_simulation(); }

    // Initialiser le formulaire Gate (Étape 2)
    initGateForm();

    // ENVOI NON BLOQUANT : ligne "simulation" (sans téléphone/email)
    const scSel = simulationData.sc || {};
    postToSheet({
      event:        'simulation',
      unlock:       '0',
      session_id:   SESSION_ID,
      timestamp:    new Date().toISOString(),
      code_postal:  simulationData.cp || '',
      facture:      simulationData.facture || 0,
      conso:        simulationData.conso || 0,
      source_conso: simulationData.sourceConso || '',
      prix_kwh:     simulationData.prixKwh || 0,
      puissance:    scSel.puissance || '',
      panneaux:     scSel.panels || 0,
      prod:         scSel.prod || 0,
      prix:         scSel.prix || 0,
      remise:       scSel.remiseChantier || 0,
      mensualite:   scSel.mensualite || 0,
      taeg:         scSel.taeg || 0,
      totalcredit:  scSel.total || 0,
      mois:         scSel.dureeMois || 0,
      eco1:         simulationData.gainAn || 0,
      ecomensuelle: simulationData.gainMois || 0,
      eco15:        simulationData.gain15 || 0,
      email:        '',
      telephone:    '',
      emailUser:    '',
      tel:          ''
    });

    hideCalcOverlay();
    return false;
  }; // fin __handleSubmitEtape1

  // -----------------------------
  // Étape 2 : Gate (téléphone/email)
  // -----------------------------
  function initGateForm(){
    const form   = document.getElementById('gate-form');
    const blurDiv = document.getElementById('lock-blur');
    const gateDiv = document.getElementById('gate-overlay');
    if(!form || !blurDiv || !gateDiv) { console.error("Éléments Gate manquants."); return; }

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const phoneInput = document.getElementById('gate-phone');
      const emailInput = document.getElementById('gate-email');
      const phone = String(phoneInput?.value || '').trim();
      const email = String(emailInput?.value || '').trim();
      const digits = phone.replace(/\D/g,'');

      // Validation
      if(digits.length < 10){ alert('Merci d’indiquer un numéro de téléphone valide (10 chiffres).'); phoneInput?.focus(); return; }
      if(email && !/^\S+@\S+\.\S+$/.test(email)) { alert('Merci d\'indiquer un email valide.'); emailInput?.focus(); return; }

      // 1) Conversion Google Ads "Lead"
      if (typeof gtag_report_conversion === 'function') { gtag_report_conversion(); }

      // 2) Envoi non bloquant Google Sheets (LEAD)
      if (simulationData && simulationData.sc) {
        const sc = simulationData.sc;

        const payload = {
          event:        'lead',
          unlock:       '1',
          session_id:   SESSION_ID,
          timestamp:    new Date().toISOString(),
          code_postal:  simulationData.cp || '',
          facture:      simulationData.facture || 0,
          conso:        simulationData.conso || 0,
          source_conso: simulationData.sourceConso || '',
          prix_kwh:     simulationData.prixKwh || 0,
          puissance:    sc.puissance || '',
          panneaux:     sc.panels || 0,
          prod:         sc.prod || 0,
          prix:         sc.prix || 0,
          remise:       sc.remiseChantier || 0,
          mensualite:   sc.mensualite || 0,
          taeg:         sc.taeg || 0,
          totalcredit:  sc.total || 0,
          mois:         sc.dureeMois || 0,
          eco1:         simulationData.gainAn || 0,
          ecomensuelle: simulationData.gainMois || 0,
          eco15:        simulationData.gain15 || 0,
          email:        email,
          telephone:    digits,
          emailUser:    email,
          tel:          digits
        };

        postToSheet(payload);
      } else {
        console.warn("Données de simulation non disponibles. Envoi GSheet (lead) annulé.");
      }

      // 3) Déverrouillage UI + bouton PDF
      blurDiv.classList.remove('lock-blur');
      gateDiv.remove();
      insertPdfCta();
    });
  }

  // -----------------------------
  // PDF (impression)
  // -----------------------------
  function insertPdfCta(){
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

  function attachPdfHandler(){
    const btn = document.getElementById('btn-pdf');
    if(!btn) return;
    btn.addEventListener('click', () => {
      try{ prepareAndPrint(); }
      catch(e){ console.error('Erreur impression PDF', e); alert("Impossible de préparer le PDF. Réessayez."); }
    });
  }

  function prepareAndPrint(){
    const recap = document.getElementById('recap');
    if(!recap){ window.print(); return; }

    const cp = (window.simulationData && window.simulationData.cp) ? String(window.simulationData.cp) : '';
    const dep = cp ? cp.slice(0,2) : '28';
    const sc  = (window.simulationData && window.simulationData.sc) ? window.simulationData.sc : {};
    const titreLigne = `Estimation photovoltaïque – Yvelines (${dep})`;
    const sousTitre  = cp ? `Code postal : ${cp} · Puissance : ${sc.puissance || '—'} · Production : ${(sc.prod || 0).toLocaleString('fr-FR')} kWh/an`
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
    if(card){ card.insertAdjacentElement('afterbegin', header); }

    const cleanup = () => {
      header.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  // -----------------------------
  // Génération HTML des résultats
  // -----------------------------
  function generateVisiblePartHTML(data) {
    const { cp = 'N/A', conso = 0, prixKwh = 0, facture = 0, sc = {} } = data;
    return `
      <div class="kpi"> <div class="label">Code postal</div> <div class="value">${cp}</div> </div>
      <div class="kpi"> <div class="label">Conso annuelle estimée</div> <div class="value" style="color:#0f172a">${conso.toLocaleString('fr-FR')} kWh</div> </div>
      <div class="kpi"> <div class="label">Prix du kWh utilisé</div> <div class="value">${Number(prixKwh).toFixed(3)} €</div> </div>
      <div class="kpi"> <div class="label">Facture annuelle</div> <div class="value">${Number(facture).toLocaleString('fr-FR')} €</div> </div>
      <div class="kpi kpi--highlight" style="grid-column:1/-1">
        <div class="label">Dimensionnement proposé</div>
        <div class="value">${sc.puissance || 'N/A'} — ${sc.panels || 0} panneaux (500 W) • Production estimée
          <span style="color:#16a34a;font-weight:800">${(sc.prod || 0).toLocaleString('fr-FR')} kWh/an</span>
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
      <div class="kpi"> <div class="label">Gain 1ʳᵉ année (ordre de grandeur)</div> <div class="value" style="color:#16a34a"> ${gainAn.toLocaleString('fr-FR')} € / an </div> </div>
      <div class="kpi"> <div class="label">Économie moyenne mensuelle</div> <div class="value" style="color:#16a34a"> ${gainMois.toLocaleString('fr-FR')} € / mois </div> </div>
      <div class="kpi" style="grid-column:1/-1">
        <div class="label">Économie cumulée sur 15 ans</div>
        <div class="value" style="color:#16a34a"> ${gain15.toLocaleString('fr-FR')} € </div>
        <div class="note" style="margin-top:4px">Hypothèses&nbsp;: prix du kWh +${(tauxHausse*100)}&nbsp;%/an...</div>
      </div>
      ${generateRemiseBannerHTML(sc)}
      ${generateFinancementCardHTML(sc)}`;
  }

  function generateRemiseBannerHTML(sc) {
    if (Number.isFinite(sc?.remiseChantier) && sc.remiseChantier > 0) {
      return `
        <div class="financial-banner" style="grid-column: 1 / -1;">
          <div style="font-weight:700; color:#7c2d12; margin-bottom:4px">Offre spéciale « Groupage chantiers »</div>
          <div style="font-size:22px; font-weight:900; color:#7c2d12;"> ${Math.round(sc.remiseChantier).toLocaleString('fr-FR')} € de remise immédiate </div>
          <div class="note" style="margin-top:6px; color:#334155">(à déduire du prix TTC indiqué ci-dessous)</div>
          <div class="note" style="margin-top:4px; color:#334155"><strong>Valable jusqu’au 31 décembre 2025</strong></div>
        </div>`;
    }
    return '';
  }

  function generateFinancementCardHTML(sc) {
    const prixHTML = Number.isFinite(sc?.prix)
      ? `<p style="margin:0 0 8px"><strong>Installation ${sc.puissance || ''}</strong> : <span class="token">${Math.round(sc.prix).toLocaleString('fr-FR')} € TTC</span> <span class="note">(prix indicatif hors options)</span></p>`
      : '';

    let financementDetailsHTML = '';
    if (Number.isFinite(sc?.mensualite) && sc.mensualite > 0) {
      const dureeHTML = Number.isFinite(sc?.dureeMois) && sc.dureeMois > 0 ? `<span class="token">Durée : ${sc.dureeMois} mois</span>` : '';
      const taegHTML  = Number.isFinite(sc?.taeg) ? `<span class="token">TAEG fixe : ${sc.taeg}%</span>` : '';
      const totalHTML = Number.isFinite(sc?.total) && sc.total > 0
        ? `<p style="margin:6px 0 0"><strong>Prix total</strong> : <span class="token">${Number(sc.total).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})} €</span></p>`
        : '';

      financementDetailsHTML = `
        <p style="margin:10px 0 4px; font-weight:700">Option financement <span class="note">(facultatif)</span></p>
        <div class="tokens">
          <span class="token">${(sc.mensualite).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})} € / mois</span>
          ${dureeHTML} ${taegHTML}
        </div>
        ${totalHTML}
        <p class="note" style="margin:10px 0 0">Financement proposé par notre partenaire, sous réserve d’acceptation.</p>
        <div class="note note-alert">⚠️Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</div>
        <p class="note" style="margin:8px 0 0">Estimation indicative. Visite technique nécessaire...</p>
        <p style="margin: 18px 0 4px; text-align: center; font-size: 16px; font-weight: 700; color: var(--accent); line-height: 1.5;">
          <span style="white-space: nowrap;">Cette estimation vous a été offerte par Solution Solaire Pro filiale de Biofrance energies.</span><br>
          <span style="white-space: nowrap;">Vous pouvez contacter votre conseiller régional</span><br>
          <span style="white-space: nowrap;">
            au <a href="tel:0648893480" style="color: inherit; text-decoration: underline; font-weight: 800;">06 48 89 34 80</a>.
          </span>
        </p>`;
    }

    if (prixHTML || financementDetailsHTML) {
      return `
        <div class="financial-card" style="grid-column: 1 / -1;">
          <h3 class="financial-title">Coût et financement</h3>
          ${prixHTML}
          ${financementDetailsHTML}
        </div>`;
    }
    return '';
  }

  function generateGateHTML() {
    return `
      <div class="gate-overlay" id="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div class="gate-card">
          <h3 id="gate-title" class="gate-title">DÉBLOQUEZ Votre PRIX FINAL & ÉCONOMIES DÉTAILLÉES</h3>
          <p class="gate-sub">
            Téléchargez le PDF de votre étude complète et confirmez la faisabilité technique de votre installation solaire — avec remise immédiate (jusqu’au 31/12/2025).
          </p>
          <div class="gate-badges" aria-hidden="true">
            <div class="badge"><span>🔒</span><b>Données protégées</b></div>
            <div class="badge"><span>⚡</span><b>Affichage immédiat</b></div>
            <div class="badge"><span>🔐</span><b>100% sans démarchage</b></div>
          </div>
          <form id="gate-form" class="gate-form" novalidate>
            <label style="width:100%"><span class="sr-only">Votre email (facultatif)</span>
              <input id="gate-email" class="gate-input" type="email" placeholder="Votre email (facultatif)" autocomplete="email" />
            </label>
            <label style="width:100%"><span class="sr-only">Téléphone (obligatoire)</span>
              <input id="gate-phone" class="gate-input" type="tel" placeholder="Téléphone (obligatoire)" autocomplete="tel" required />
            </label>
            <p class="gate-hint full" id="rgpd-info">
              En validant, vous acceptez d’être contacté uniquement par <strong>SMS</strong> pour votre étude.
            </p>
            <button class="gate-cta full" type="submit" aria-label="Afficher mes résultats détaillés">
              Afficher mes résultats détaillés <span class="arrow" aria-hidden="true">→</span>
            </button>
          </form>
          <div class="gate-note">Un SMS de confirmation vous sera envoyé.</div>
        </div>
      </div>`;
  }
})(); // Fin IIFE principale

/* =============================
   Bandeau cookies — Consent Mode
============================= */
(function(){
  const KEY='consent_v2',
        banner=document.getElementById('consent-banner'),
        btnAccept=document.getElementById('consent-accept'),
        btnReject=document.getElementById('consent-reject');

  if (!banner || !btnAccept || !btnReject) return;

  function updateConsent(state){
    gtag('consent','update',{
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage:       state.ads ? 'granted' : 'denied',
      ad_user_data:     state.adUserData ? 'granted' : 'denied',
      ad_personalization: state.adPersonal ? 'granted' : 'denied'
    });
  }

  function save(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }

  const saved=load();
  if(saved){
    updateConsent(saved);
    banner.style.display='none';
  } else {
    banner.style.display='block';
    requestAnimationFrame(()=>{
      banner.style.opacity='1';
      banner.style.transform='translateY(0)';
    });
  }

  btnAccept.addEventListener('click', ()=>{
    const s={analytics:true,ads:true,adUserData:true,adPersonal:true};
    updateConsent(s); save(s); banner.style.display='none';
  });

  btnReject.addEventListener('click', ()=>{
    const s={analytics:false,ads:false,adUserData:false,adPersonal:false};
    updateConsent(s); save(s); banner.style.display='none';
  });
})();

/* =============================
   Trace UTM / GCLID (localStorage)
============================= */
(function(){
  const p = new URLSearchParams(location.search);
  const track = {
    utm_source:(p.get('utm_source')||''),
    utm_medium:(p.get('utm_medium')||''),
    utm_campaign:(p.get('utm_campaign')||''),
    utm_adgroup:(p.get('utm_adgroup')||''),
    utm_term:(p.get('utm_term')||''),
    utm_matchtype:(p.get('utm_matchtype')||''),
    utm_device:(p.get('utm_device')||''),
    gclid:(p.get('gclid')||''),
    gbraid:(p.get('gbraid')||''),
    wbraid:(p.get('wbraid')||'')
  };
  const isAds = track.gclid || track.gbraid || track.wbraid ||
    (track.utm_source.toLowerCase()==='google' && track.utm_medium.toLowerCase()==='cpc');

  if(isAds){
    try{ localStorage.setItem('ads_tracking_v1', JSON.stringify({ t: Date.now(), ...track })); }catch(e){}
  }

  window.__getAdsTrack = function(){
    try{
      const raw = localStorage.getItem('ads_tracking_v1');
      if(!raw) return track;
      const obj = JSON.parse(raw);
      // Expiration 7 jours
      if(Date.now()-(obj.t||0) > 7*24*60*60*1000) {
        localStorage.removeItem('ads_tracking_v1');
        return track;
      }
      return obj;
    }catch(e){ return track; }
  };
})();
