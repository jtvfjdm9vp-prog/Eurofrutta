import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBPjPrPcfSluKKWfWY9qKGgQMKQpJQ_iFM',
  authDomain: 'eurofrutta-d0607.firebaseapp.com',
  projectId: 'eurofrutta-d0607',
  storageBucket: 'eurofrutta-d0607.firebasestorage.app',
  messagingSenderId: '295810282880',
  appId: '1:295810282880:web:8bf0cb43d896013e8afd65',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const store = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const OWNER_EMAIL = 'angysuperakab@gmail.com';

let db = { clienti: [], prodotti: [], lotti: [], movimenti: [], biglietti: [], registro: [] };
let accessConfig = { membri: [], amministratori: [] };
let currentAccess = null;
let currentProfile = null;
let current = 'home';
let selectedClient = '';
let selectedProduct = '';
let pitazzoDate = '';
let expandedPitLot = '';
let ticketsDate = '';
let homeSearch = '';
let adminSessionUnlocked = false;
let signedUser = null;
let unsubscribe;
const ADMIN_CODE_HASH = '4dd75592eec0dbdf1f491c6413c01b8573e8908b255b67c78f35f0d2bb2d4565';
try {
  adminSessionUnlocked = sessionStorage.getItem('eurofrutta-admin-unlocked') === '1';
} catch (error) {
  adminSessionUnlocked = false;
}

const $ = (selector) => document.querySelector(selector);
const id = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toLocaleDateString('en-CA');
const stamp = () => new Date().toLocaleString('it-IT');
const eur = (value) => `€ ${Number(value || 0).toFixed(2)}`;
const esc = (value) => String(value ?? '').replace(
  /[&<>"']/g,
  (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character],
);

const empty = () => ({ clienti: [], prodotti: [], lotti: [], movimenti: [], biglietti: [], registro: [] });

function ensureAppStyles() {
  if (document.querySelector('#eurofrutta-layout-styles')) return;
  const style = document.createElement('style');
  style.id = 'eurofrutta-layout-styles';
  style.textContent = `
    body.eurofrutta-shell{padding-left:244px;transition:padding-left .25s ease}
    body.eurofrutta-shell #nav{position:fixed;inset:0 auto 0 0;width:244px;height:100vh;z-index:1000;display:flex!important;flex-direction:column;align-items:stretch;gap:7px;padding:112px 14px 20px;background:linear-gradient(180deg,#10283b 0%,#173b4e 58%,#116b55 130%);border:0;box-shadow:12px 0 35px #10283b1a;overflow-y:auto}
    body.eurofrutta-shell #nav::before{content:'EUROFRUTTA';position:absolute;top:32px;left:22px;color:#fff;font-size:19px;font-weight:900;letter-spacing:.12em}
    body.eurofrutta-shell #nav::after{content:'GESTIONALE OPERATIVO';position:absolute;top:60px;left:22px;color:#9fc1ca;font-size:9px;font-weight:800;letter-spacing:.18em}
    body.eurofrutta-shell #nav button{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid transparent;border-radius:12px;background:transparent;color:#d7e5e8;text-align:left;font-size:14px;transform:translateX(0);transition:background .18s ease,color .18s ease,transform .18s ease,border-color .18s ease}
    body.eurofrutta-shell #nav button:hover{background:#ffffff12;color:#fff;transform:translateX(4px);border-color:#ffffff18}
    body.eurofrutta-shell #nav button.active{background:#fff;color:#0c6f51;box-shadow:0 7px 20px #061c2738;font-weight:800}
    body.eurofrutta-shell #nav button span{white-space:nowrap}
    body.eurofrutta-shell #nav .nav-group{margin:14px 13px 2px;color:#81aab4;font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
    body.eurofrutta-shell #nav .nav-group:first-of-type{margin-top:0}
    body.eurofrutta-shell header{position:sticky;top:0;z-index:50;box-shadow:0 7px 24px #10283b0c}
    .pit-simple-title{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:6px 0 22px;padding:4px 2px}
    .pit-simple-title h2{margin:0;font-size:clamp(28px,4vw,44px)}
    .pit-simple-title label{display:block;margin-bottom:6px;color:#637286;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
    .pit-product-list{display:grid;gap:10px}
    .pit-product-card{overflow:hidden;border:1px solid #dbe4e7;border-radius:15px;background:#fff;box-shadow:0 7px 20px #173b4e0a}
    .pit-product-row{width:100%;display:grid;grid-template-columns:minmax(210px,1fr) auto auto auto auto;align-items:center;gap:18px;padding:17px 18px;border:0;background:#fff;color:#172334;text-align:left;transition:background .18s ease,transform .18s ease}
    .pit-product-row:hover{background:#f1faf6;transform:translateY(-1px)}
    .pit-product-row strong{font-size:18px}.pit-product-row small{display:block;margin-top:3px;color:#718093}
    .pit-product-row .metric{text-align:right}.pit-product-row .chevron{color:#13845e;font-size:20px;transition:transform .2s ease}.pit-product-card.open .chevron{transform:rotate(90deg)}
    .pit-buyers{padding:0 18px 17px;animation:pitOpen .2s ease both}.pit-buyers table{margin:0}
    @keyframes pitOpen{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
    .ticket-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.ticket-card{border:1px solid #dbe4e7;border-radius:16px;background:#fff;padding:18px;box-shadow:0 8px 24px #173b4e0b}.ticket-card h3{margin:4px 0}.ticket-card .ticket-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ticket-card .ticket-actions button{width:auto}.returned{opacity:.65;text-decoration:line-through}.return-badge{display:inline-block;padding:3px 7px;border-radius:999px;background:#fff0e8;color:#a6461c;font-size:10px;font-weight:800;text-decoration:none}
    .price-choice{display:grid;grid-template-columns:1fr 1fr;gap:7px}.price-choice label{margin:0}.price-choice input{position:absolute;opacity:0;pointer-events:none}.price-choice span{display:block;padding:11px 9px;border:1px solid #ccd8dc;border-radius:10px;text-align:center;cursor:pointer;transition:.15s ease}.price-choice input:checked+span{border-color:#16835f;background:#eaf8f2;color:#0d7252;font-weight:800}
    .variant-list{display:grid;gap:10px;margin:15px 0}.variant-row{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:10px;align-items:end;padding:12px;border:1px solid #dce5e7;border-radius:13px;background:#f8fbfa}.variant-row button{width:auto;min-width:44px}.variant-row:first-child [data-remove-variant]{visibility:hidden}.secondary-panel{margin-top:18px;border:1px solid #dce5e7;border-radius:14px;background:#fbfdfc}.secondary-panel summary{padding:16px 18px;cursor:pointer;font-weight:800;color:#116c50}.secondary-panel>div{padding:0 18px 18px}.quality-chip{display:inline-block;margin-top:4px;padding:3px 8px;border-radius:999px;background:#eef6f2;color:#166c51;font-size:11px;font-weight:800}.mobile-nav-toggle,.nav-scrim{display:none}
    .home-search{margin:22px 0;padding:22px;border:1px solid #d9e5e4;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#f4fbf8 100%);box-shadow:0 9px 28px #173b4e0b}.home-search-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:13px}.home-search h2{margin:0;font-size:22px}.home-search-box{display:flex;align-items:center;gap:10px;border:2px solid #cbdad8;border-radius:14px;background:#fff;padding:0 12px;transition:border-color .18s ease,box-shadow .18s ease}.home-search-box:focus-within{border-color:#159268;box-shadow:0 0 0 4px #15926818}.home-search-box input{width:100%;border:0;box-shadow:none!important;background:transparent;font-size:17px}.home-search-box button{width:auto;min-width:38px;padding:7px;background:transparent;color:#647586}.search-results-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}.search-result-group{padding:14px;border:1px solid #dce7e5;border-radius:14px;background:#fff}.search-result-group h3{margin:0 0 9px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#617386}.search-result{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:5px 0;padding:10px 11px;border:0;border-radius:10px;background:#f4f8f7;color:#173044;text-align:left}.search-result:hover{background:#e8f6f0}.search-result strong{display:block}.search-result small{display:block;color:#6b7b8d;margin-top:2px}.owner-badge{display:inline-flex;align-items:center;padding:7px 10px;border-radius:9px;background:#edf5f2;color:#154f40;font-weight:850}.inventory-product-name{font-size:16px;color:#142b3c}
    @media(max-width:900px){
      body.eurofrutta-shell{padding-left:0;overflow-x:hidden}
      body.eurofrutta-shell.nav-open{overflow:hidden}
      body.eurofrutta-shell #nav{inset:0 auto 0 0;width:min(82vw,310px);height:100dvh;padding:104px 16px 24px;transform:translateX(-105%);transition:transform .24s ease;box-shadow:20px 0 50px #081b2680}
      body.eurofrutta-shell.nav-open #nav{transform:translateX(0)}
      body.eurofrutta-shell #nav button{min-height:46px;font-size:15px}
      body.eurofrutta-shell #nav button:hover{transform:none}
      body.eurofrutta-shell .mobile-nav-toggle{display:grid;place-items:center;position:fixed;top:12px;left:12px;z-index:1400;width:46px;height:46px;padding:0;border:1px solid #ffffff45;border-radius:12px;background:#15354b;color:#fff;box-shadow:0 7px 20px #0d263852;font-size:22px}
      body.eurofrutta-shell .nav-scrim{display:block;position:fixed;inset:0;z-index:900;background:#081b2685;opacity:0;pointer-events:none;transition:opacity .24s ease}
      body.eurofrutta-shell.nav-open .nav-scrim{opacity:1;pointer-events:auto}
      body.eurofrutta-shell header{min-height:70px;padding-left:68px!important}
      body.eurofrutta-shell header>*,body.eurofrutta-shell #user{max-width:100%}
      body.eurofrutta-shell #user{font-size:12px;line-height:1.25;text-align:right}
      body.eurofrutta-shell #user button{padding:9px 10px}
      main,#app{max-width:100%;overflow-x:hidden}
      .grid,.pit-form,.stats{grid-template-columns:1fr!important}
      .card,.pit-entry{padding:17px!important;border-radius:16px!important}
      .section-head,.pit-simple-title,.pit-title{align-items:flex-start!important;flex-direction:column!important;gap:12px!important}
      .section-head>div:last-child{width:100%}
      .section-head button{width:100%}
      input,select,textarea,button{min-height:44px}
      .pit-product-row{grid-template-columns:1fr auto;padding:15px 14px}
      .pit-product-row .metric{display:none}
      .pit-simple-title{margin-top:0}
      .table-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .table-scroll table{min-width:680px}
      .ticket-grid{grid-template-columns:1fr}
      .search-results-grid{grid-template-columns:1fr}
      .variant-row{grid-template-columns:1fr 1fr}.variant-row>div:first-child{grid-column:1/-1}.variant-row button{width:100%}
      .hero{padding:24px 18px!important}.hero-art{display:none!important}.hero-copy h2{font-size:38px!important}
    }
    @media(max-width:480px){body.eurofrutta-shell #nav{width:88vw}.ticket-card{padding:14px}.price-choice{grid-template-columns:1fr}.pit-product-row strong{font-size:16px}.home-search{padding:16px}.home-search-head{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);
}

function addNavButton(page, icon, label, beforePage = '') {
  const nav = $('#nav');
  if (!nav || nav.querySelector(`[data-page="${page}"]`)) return;
  const button = document.createElement('button');
  button.dataset.page = page;
  button.innerHTML = `${icon} <span>${label}</span>`;
  nav.insertBefore(button, beforePage ? nav.querySelector(`[data-page="${beforePage}"]`) : null);
}

function ensureDynamicNav() {
  const nav = $('#nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="nav-group">Lavoro</div>
    <button data-page="home">⌂ <span>Home</span></button>
    <button data-page="pitazzo">▤ <span>Pitazzo</span></button>
    <button data-page="magazzino">▦ <span>Magazzino</span></button>
    <div class="nav-group">Archivi</div>
    <button data-page="prodotti">◇ <span>Prodotti</span></button>
    <button data-page="clienti">♙ <span>Clienti</span></button>
    <button data-page="vendite">€ <span>Vendite</span></button>
    <button data-page="biglietti">▥ <span>Biglietti</span></button>
    <div class="nav-group">Controllo</div>
    <button data-page="report">▥ <span>Riepilogo</span></button>
    ${isAdmin() ? '<button data-page="registro">♛ <span>Amministrazione</span></button>' : ''}`;

  if (!document.querySelector('#mobile-nav-toggle')) {
    const toggle = document.createElement('button');
    toggle.id = 'mobile-nav-toggle';
    toggle.className = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Apri menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
    toggle.onclick = () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '×' : '☰';
    };
    const scrim = document.createElement('button');
    scrim.type = 'button';
    scrim.className = 'nav-scrim';
    scrim.setAttribute('aria-label', 'Chiudi menu');
    scrim.onclick = closeMobileNav;
    document.body.append(toggle, scrim);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileNav();
    });
  }
}

function closeMobileNav() {
  document.body.classList.remove('nav-open');
  const toggle = document.querySelector('#mobile-nav-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }
}

function opts(items, selected = '') {
  return '<option value="">— scegli —</option>' + items.map((item) => (
    `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${esc(item.nome)}</option>`
  )).join('');
}

function lotLabel(lot) {
  const packages = Number(lot.colli_rimanenti || 0);
  const weight = Number(lot.peso_rimanente || 0);
  const quality = lot.qualita && lot.qualita !== 'Standard' ? ` · ${lot.qualita}` : '';
  return `${name('prodotti', lot.prodotto_id)}${quality} · ${lot.proprietario || 'Proprietario non indicato'} · ${stockState(packages, 'colli')} / ${stockState(weight, 'kg')}`;
}

function lotGroupId(lot) {
  return lot?.gruppo_id || lot?.id || '';
}

function lotsInGroup(groupId) {
  return db.lotti.filter((lot) => lotGroupId(lot) === groupId);
}

function lotIsOpen(lot) {
  return Number(lot.colli_rimanenti || 0) > 0 || Number(lot.peso_rimanente || 0) > 0;
}

function lotOpts(selected = '') {
  const available = db.lotti.filter(lotIsOpen);
  return '<option value="">— scegli lotto —</option>' + available.map((lot) => (
    `<option value="${lot.id}" ${lot.id === selected ? 'selected' : ''}>${esc(lotLabel(lot))}</option>`
  )).join('');
}

function lotById(lotId) {
  return db.lotti.find((lot) => lot.id === lotId);
}

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase('it-IT');
}

function lotSearchName(lot) {
  const quality = lot.qualita && lot.qualita !== 'Standard' ? ` · ${lot.qualita}` : '';
  return `${name('prodotti', lot.prodotto_id)}${quality} · ${lot.proprietario || 'Provenienza non indicata'}`;
}

function findClientByText(value) {
  const query = normalized(value);
  const exact = db.clienti.find((client) => normalized(client.nome) === query);
  if (exact) return exact;
  const matches = db.clienti.filter((client) => normalized(client.nome).startsWith(query));
  return matches.length === 1 ? matches[0] : null;
}

function findLotByText(value) {
  const query = normalized(value);
  const available = db.lotti.filter(lotIsOpen);
  const exact = available.find((lot) => normalized(lotSearchName(lot)) === query);
  if (exact) return exact;
  const matches = available.filter((lot) => normalized(lotSearchName(lot)).startsWith(query));
  return matches.length === 1 ? matches[0] : null;
}

function clientSuggestions() {
  return `<datalist id="client-suggestions">${db.clienti.map((client) => `<option value="${esc(client.nome)}"></option>`).join('')}</datalist>`;
}

function lotSuggestions() {
  return `<datalist id="lot-suggestions">${db.lotti.filter(lotIsOpen).map((lot) => `<option value="${esc(lotSearchName(lot))}">${esc(lotLabel(lot))}</option>`).join('')}</datalist>`;
}

function roundQty(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

function stockState(value, unit) {
  const amount = roundQty(value);
  if (amount < 0) return `GAP +${formatQty(Math.abs(amount))} ${unit}`;
  if (amount === 0) return 'Esaurito';
  return `R ${formatQty(amount)} ${unit}`;
}

function loadVariantRow(quality = '', packages = '', weight = '') {
  return `<div class="variant-row" data-variant-row>
    <div><label>Descrizione / pezzatura</label><input name="qualita" value="${esc(quality)}" placeholder="Es. Fiorone, Prima, Doppia prima"></div>
    <div><label>Colli</label><input name="colli_variante" type="number" min="0" step="0.01" value="${esc(packages)}" placeholder="0" inputmode="decimal"></div>
    <div><label>Peso kg</label><input name="peso_variante" type="number" min="0" step="0.01" value="${esc(weight)}" placeholder="0" inputmode="decimal"></div>
    <button type="button" class="ghost" data-remove-variant aria-label="Elimina riga">×</button>
  </div>`;
}

function stockStateHtml(value, unit) {
  const amount = roundQty(value);
  if (amount < 0) return `<span class="warn"><b>GAP +${formatQty(Math.abs(amount))} ${unit}</b></span>`;
  if (amount === 0) return '<span class="muted"><b>Esaurito</b></span>';
  return `<span class="pit-money"><b>R ${formatQty(amount)} ${unit}</b></span>`;
}

function initialLotQuantity(lot) {
  const packages = Number(lot.colli_iniziali || 0);
  const weight = Number(lot.peso_iniziale || 0);
  if (packages > 0) {
    return `<b>${formatQty(packages)} colli</b>${weight > 0 ? `<br><small>${formatQty(weight)} kg</small>` : ''}`;
  }
  if (weight > 0) return `<b>${formatQty(weight)} kg</b>`;
  return '<span class="muted">—</span>';
}

function remainingLotQuantity(lot) {
  const tracksPackages = Number(lot.colli_iniziali || 0) > 0;
  const tracksWeight = Number(lot.peso_iniziale || 0) > 0;
  if (tracksPackages) {
    return `${stockStateHtml(lot.colli_rimanenti, 'colli')}${tracksWeight ? `<br><small>${stockState(lot.peso_rimanente, 'kg')}</small>` : ''}`;
  }
  if (tracksWeight) return stockStateHtml(lot.peso_rimanente, 'kg');
  return '<span class="muted">—</span>';
}

function formatDateKey(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(dateKey || '');
}

function displayDateOnly(value, dateKey = '') {
  if (dateKey) return formatDateKey(dateKey);
  const text = String(value || '').trim();
  if (!text) return '—';
  const italian = text.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (italian) return italian[1];
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text.split(',')[0].trim();
}

function name(kind, itemId) {
  return db[kind].find((item) => item.id === itemId)?.nome || '—';
}

function userEmail(user = signedUser) {
  return String(user?.email || '').trim().toLowerCase();
}

function operatorName() {
  return currentProfile?.username || signedUser?.displayName || 'Operatore';
}

function isAdmin(user = signedUser) {
  const email = userEmail(user);
  return email === OWNER_EMAIL || currentAccess?.ruolo === 'amministratore';
}

function isAuthorized(user = signedUser) {
  const email = userEmail(user);
  return email === OWNER_EMAIL || currentAccess?.abilitato === true;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function unlockAdministration() {
  if (!isAdmin()) return false;
  if (adminSessionUnlocked) return true;
  const code = window.prompt('Inserisci il codice dell’area Amministrazione');
  if (code === null) return false;
  if (await sha256(code) !== ADMIN_CODE_HASH) {
    alert('Codice amministrazione errato.');
    return false;
  }
  adminSessionUnlocked = true;
  try {
    sessionStorage.setItem('eurofrutta-admin-unlocked', '1');
  } catch (error) {
    // La sessione resta comunque sbloccata finché questa pagina rimane aperta.
  }
  return true;
}

function logout() {
  adminSessionUnlocked = false;
  try {
    sessionStorage.removeItem('eurofrutta-admin-unlocked');
  } catch (error) {
    // Ignora browser che non rendono disponibile sessionStorage.
  }
  return signOut(auth);
}

function audit(action, detail) {
  if (!Array.isArray(db.registro)) db.registro = [];
  db.registro.push({
    id: id(),
    data: stamp(),
    dateKey: today(),
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
    azione: action,
    dettaglio: detail,
  });
  if (db.registro.length > 1500) db.registro = db.registro.slice(-1500);
}

function valueOrDash(value) {
  return value ? esc(value) : '<span class="muted">Non indicato</span>';
}

async function save() {
  await setDoc(doc(store, 'eurofrutta', 'dati'), db);
}

function login() {
  ensureAppStyles();
  document.body.classList.remove('eurofrutta-shell');
  document.querySelector('header').style.display = 'flex';
  $('#user').textContent = '';
  $('#nav').hidden = true;
  $('#app').innerHTML = `
    <section class="card login">
      <div class="mark">EF</div>
      <p class="eyebrow">EUROFRUTTA ONLINE</p>
      <h2>Accedi al gestionale</h2>
      <p>Usa il tuo account Google personale. Nel gestionale verrà mostrato soltanto il nome utente che sceglierai.</p>
      <button id="google-login" type="button">G&nbsp;&nbsp; Accedi con Google</button>
      <p id="login-error" class="message error" hidden></p>
    </section>`;

  $('#google-login').onclick = async () => {
    const message = $('#login-error');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      message.hidden = false;
      message.textContent = 'Accesso Google non riuscito. Riprova.';
    }
  };
}

function usernameSetup() {
  ensureAppStyles();
  document.body.classList.remove('eurofrutta-shell');
  $('#nav').hidden = true;
  $('#user').innerHTML = '<button id="out">Esci</button>';
  $('#out').onclick = logout;
  $('#app').innerHTML = `
    <section class="card login">
      <div class="mark">EF</div>
      <p class="eyebrow">PRIMO ACCESSO</p>
      <h2>Scegli il tuo nome utente</h2>
      <p>Questo sarà il nome visibile nel gestionale e nel registro delle modifiche. Dopo il salvataggio resterà fisso.</p>
      <form id="username-form">
        <label>Nome utente</label>
        <input name="username" required minlength="2" maxlength="30" autocomplete="off" placeholder="Es. Angelo o Maria">
        <button>Salva e continua</button>
      </form>
      <p id="username-error" class="message error" hidden></p>
    </section>`;

  $('#username-form').onsubmit = async (event) => {
    event.preventDefault();
    const username = String(new FormData(event.currentTarget).get('username') || '').trim();
    const message = $('#username-error');
    if (username.length < 2) {
      message.hidden = false;
      message.textContent = 'Scrivi un nome utente di almeno 2 caratteri.';
      return;
    }
    try {
      currentProfile = {
        username,
        email: userEmail(),
        creatoIl: stamp(),
      };
      await setDoc(doc(store, 'profili', signedUser.uid), currentProfile);
      startDataSubscription();
    } catch (error) {
      message.hidden = false;
      message.textContent = `Non riesco a salvare il nome utente: ${error.message}`;
    }
  };
}

function accessDenied() {
  ensureAppStyles();
  document.body.classList.remove('eurofrutta-shell');
  $('#nav').hidden = true;
  $('#user').innerHTML = '<button id="out">Esci</button>';
  $('#out').onclick = logout;
  $('#app').innerHTML = `
    <section class="card login">
      <div class="mark">EF</div>
      <p class="eyebrow">ACCESSO NON AUTORIZZATO</p>
      <h2>Chiedi l’abilitazione</h2>
      <p>Un amministratore deve prima aggiungere il tuo account Google nella sezione Amministrazione.</p>
      <button id="denied-out" type="button">Esci</button>
    </section>`;
  $('#denied-out').onclick = logout;
}

function render() {
  ensureDynamicNav();
  if (current === 'registro' && (!isAdmin() || !adminSessionUnlocked)) current = 'home';
  document.querySelectorAll('#nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === current);
  });
  $('#app').innerHTML = ({ home, pitazzo, movimento, magazzino, prodotti, clienti, vendite, biglietti, report, registro })[current]();
  bind();
}

function searchMatches(values, query) {
  return normalized(values.filter(Boolean).join(' ')).includes(query);
}

function globalSearchResults(rawQuery) {
  const query = normalized(rawQuery);
  if (!query) return '<p class="muted">Cerca prodotti, fornitori, clienti, pezzature, note e vendite.</p>';

  const products = db.prodotti.filter((product) => searchMatches([product.nome], query)).slice(0, 8);
  const clients = db.clienti.filter((client) => searchMatches([
    client.nome, client.telefono, client.email, client.indirizzo, client.citta, client.piva, client.note,
  ], query)).slice(0, 8);
  const lots = db.lotti.filter((lot) => searchMatches([
    name('prodotti', lot.prodotto_id), lot.proprietario, lot.qualita, lot.note,
  ], query)).slice(0, 8);
  const movements = db.movimenti.filter((movement) => searchMatches([
    name('prodotti', movement.prodotto_id), name('clienti', movement.cliente_id), movement.proprietario,
    movement.qualita, movement.note, movement.operatore, movement.data,
  ], query)).slice().reverse().slice(0, 8);
  const total = products.length + clients.length + lots.length + movements.length;
  if (!total) return '<p class="empty">Nessun risultato. Prova con un’altra parola.</p>';

  const group = (title, rows) => rows.length ? `<section class="search-result-group"><h3>${title}</h3>${rows.join('')}</section>` : '';
  return `<div class="search-results-grid">
    ${group('Prodotti', products.map((product) => `<button type="button" class="search-result" data-search-product="${product.id}"><span><strong>${esc(product.nome)}</strong><small>Apri la scheda prodotto</small></span><b>›</b></button>`))}
    ${group('Clienti', clients.map((client) => `<button type="button" class="search-result" data-search-client="${client.id}"><span><strong>${esc(client.nome)}</strong><small>${esc([client.citta, client.telefono || client.email].filter(Boolean).join(' · ') || 'Scheda cliente')}</small></span><b>›</b></button>`))}
    ${group('Magazzino e fornitori', lots.map((lot) => `<button type="button" class="search-result" data-search-product="${lot.prodotto_id}"><span><strong>${esc(name('prodotti', lot.prodotto_id))}${lot.qualita && lot.qualita !== 'Standard' ? ` · ${esc(lot.qualita)}` : ''}</strong><small>Fornitore: ${esc(lot.proprietario || '—')} · ${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</small></span><b>›</b></button>`))}
    ${group('Vendite e movimenti', movements.map((movement) => `<button type="button" class="search-result" data-search-product="${movement.prodotto_id}"><span><strong>${esc(name('prodotti', movement.prodotto_id))} · ${esc(name('clienti', movement.cliente_id))}</strong><small>${esc(displayDateOnly(movement.data, movement.dateKey))} · ${formatQty(movement.colli)} colli · ${formatQty(movement.peso)} kg</small></span><b>›</b></button>`))}
  </div>`;
}

function home() {
  const openLots = db.lotti.filter(lotIsOpen);
  const availableArticles = new Set(openLots.map((lot) => `${lot.prodotto_id}::${normalized(lot.proprietario)}`)).size;
  const lowLots = openLots.filter((lot) => (
    Number(lot.peso_rimanente || 0) > 0
      ? Number(lot.peso_rimanente) <= 100
      : Number(lot.colli_rimanenti || 0) <= 10
  ));
  const stockRows = openLots.slice().reverse().slice(0, 8);

  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">BUON LAVORO, ${esc(operatorName().toUpperCase())}</p>
        <h2>Tutto pronto<br><em>per iniziare.</em></h2>
        <p>Apri il pitazzo, registra uno scarico oppure controlla le rimanenze disponibili.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button data-go="pitazzo">Apri il pitazzo →</button>
          <button data-go="magazzino">Registra scarico</button>
        </div>
      </div>
      <div class="hero-art">
        <svg viewBox="0 0 310 220" fill="none">
          <path d="M60 181h200" stroke="#ffffff66" stroke-width="2"/>
          <path d="M92 146c25 0 46 18 46 40H47c0-22 20-40 45-40Z" fill="#f8b842"/>
          <path d="M138 186H47v12h91v-12Z" fill="#e69226"/>
          <path d="M190 108c24 0 45 18 45 40h-90c0-22 20-40 45-40Z" fill="#ffcf69"/>
          <path d="M235 148h-90v12h90v-12Z" fill="#eb9d28"/>
          <circle cx="90" cy="154" r="8" fill="#fff1a2"/>
          <circle cx="116" cy="165" r="7" fill="#fff1a2"/>
          <circle cx="187" cy="116" r="8" fill="#fff1a2"/>
          <path d="M72 182c4-28 14-48 34-64" stroke="#4e9f63" stroke-width="8" stroke-linecap="round"/>
          <path d="M78 133c-14-13-29-12-35-11 4 16 18 28 35 25" fill="#73c77e"/>
          <path d="M104 123c14-13 29-11 35-9-5 16-18 26-35 24" fill="#73c77e"/>
        </svg>
      </div>
    </section>
    <section class="home-search">
      <div class="home-search-head"><div><p class="eyebrow">RICERCA RAPIDA</p><h2>Cerca in tutto Eurofrutta</h2></div><span class="muted">Prodotti · fornitori · clienti · vendite</span></div>
      <div class="home-search-box"><span aria-hidden="true">⌕</span><input id="global-search" type="search" value="${esc(homeSearch)}" placeholder="Scrivi un prodotto, un fornitore o un cliente…" autocomplete="off"><button id="clear-global-search" type="button" aria-label="Cancella ricerca">×</button></div>
      <div id="global-search-results">${globalSearchResults(homeSearch)}</div>
    </section>
    <section class="stats">
      <article class="stat"><i>▦</i><div><h3>Magazzino</h3><div class="big">${availableArticles}</div><p>Rimanenze divise per articolo</p></div></article>
      <article class="stat"><i>◇</i><div><h3>Prodotti</h3><div class="big">${db.prodotti.length}</div><p>In catalogo</p></div></article>
      <article class="stat"><i>!</i><div><h3>In esaurimento</h3><div class="big">${lowLots.length}</div><p>Lotti con poca merce rimasta</p></div></article>
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">MAGAZZINO</p><h2>Rimanenze principali</h2></div>
        <button class="ghost" data-go="magazzino">Apri tutto il magazzino →</button>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Prodotto</th><th>Proprietario</th><th>Carico iniziale</th><th>Rimanenza</th><th>Stato</th></tr>
        ${stockRows.map((lot) => `<tr>
          <td><button class="ghost" data-open-product="${lot.prodotto_id}"><b>${esc(name('prodotti', lot.prodotto_id))}</b></button></td>
          <td>${esc(lot.proprietario || '—')}</td>
          <td>${initialLotQuantity(lot)}</td>
          <td>${remainingLotQuantity(lot)}</td>
          <td>${lowLots.includes(lot) ? '<span class="warn">In esaurimento</span>' : '<span class="notice">Disponibile</span>'}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="empty">Nessuna merce in magazzino.</td></tr>'}
      </table></div>
    </section>`;
}

function movimento() {
  const date = today();
  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">VENDITA SINGOLA</p><h2>Registra vendita</h2></div>
        <button type="button" class="ghost" data-go="magazzino">Devi registrare uno scarico? Apri Magazzino →</button>
      </div>
      <form id="mov-form" class="grid">
        <div><label>Data *</label><input name="data_movimento" required type="date" value="${date}"></div>
        <div><label>Articolo / provenienza *</label><input name="lotto_nome" required list="lot-suggestions" autocomplete="off" placeholder="Scrivi le prime lettere…">${lotSuggestions()}</div>
        <div><label>Cliente *</label><input name="cliente_nome" required list="client-suggestions" autocomplete="off" placeholder="Scrivi le prime lettere…">${clientSuggestions()}</div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso (kg)</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" required type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
        <div><label>Calcola il prezzo</label><div class="price-choice"><label><input name="unita_prezzo" type="radio" value="kg" checked><span>Al kg</span></label><label><input name="unita_prezzo" type="radio" value="collo"><span>A collo</span></label></div></div>
        <div><label>&nbsp;</label><button>Salva vendita</button></div>
      </form>
      ${!db.lotti.some(lotIsOpen) ? '<p class="message error">Prima registra uno scarico nella sezione Magazzino.</p>' : ''}
    </section>`;
}

function pitazzo() {
  const date = pitazzoDate || today();
  const daily = db.movimenti.filter((movement) => movement.tipo === 'uscita' && movement.dateKey === date);
  const recentClients = [...new Set(db.movimenti.slice().reverse().map((movement) => movement.cliente_id).filter(Boolean))].slice(0, 5);
  const recentLots = [...new Set(db.movimenti.slice().reverse().map((movement) => movement.lotto_id).filter(Boolean))]
    .map(lotById)
    .filter((lot) => lot && lotIsOpen(lot))
    .slice(0, 6);
  const dailyGroups = new Map();
  daily.forEach((movement) => {
    const lot = lotById(movement.lotto_id);
    const groupId = lotGroupId(lot) || movement.lotto_id;
    if (!dailyGroups.has(groupId)) dailyGroups.set(groupId, []);
    dailyGroups.get(groupId).push(movement);
  });
  const groupedSales = [...dailyGroups.entries()].sort(([, left], [, right]) => {
    const leftLot = lotById(left[0]?.lotto_id);
    const rightLot = lotById(right[0]?.lotto_id);
    return `${name('prodotti', leftLot?.prodotto_id)} ${leftLot?.proprietario || ''}`.localeCompare(`${name('prodotti', rightLot?.prodotto_id)} ${rightLot?.proprietario || ''}`, 'it');
  });
  const activeDaily = daily.filter((movement) => !movement.annullato);

  return `
    <section class="pit-simple-title">
      <h2>Pitazzo giornaliero</h2>
      <div><label>Giornata visualizzata</label><input id="pit-date" type="date" value="${date}"></div>
    </section>
    <section class="pit-entry">
      <div class="quick-head">
        <div class="quick-icon">▤</div>
        <div><h3>Inserimento rapido</h3><p>Scrivi cliente e articolo, poi scegli il suggerimento.</p></div>
      </div>
      <form id="pit-form" class="pit-form" novalidate>
        <input name="data_movimento" type="hidden" value="${date}">
        <div><label>Cliente</label><input name="cliente_nome" required list="client-suggestions" autocomplete="off" placeholder="Scrivi il cliente…">${clientSuggestions()}</div>
        <div><label>Articolo / provenienza</label><input name="lotto_nome" required list="lot-suggestions" autocomplete="off" placeholder="Scrivi l’articolo…">${lotSuggestions()}</div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" required type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
        <div><label>Tipo prezzo</label><div class="price-choice"><label><input name="unita_prezzo" type="radio" value="kg" checked><span>Al kg</span></label><label><input name="unita_prezzo" type="radio" value="collo"><span>A collo</span></label></div></div>
        <button type="submit" ${!db.lotti.some(lotIsOpen) ? 'disabled' : ''}>Salva sul pitazzo →</button>
      </form>
      <p id="pit-msg"></p>
      <p class="muted">Se il cliente non esiste ancora, verrà creato automaticamente con il nome scritto. Potrai completare la sua scheda in seguito.</p>
      ${!db.lotti.some(lotIsOpen) ? '<p class="message error">Non ci sono lotti disponibili. Registra prima uno scarico in Magazzino.</p>' : ''}
      <div class="suggest">
        <span>Suggerimenti rapidi</span>
        <div>${recentClients.map((clientId) => `<button type="button" data-client="${clientId}">♙ ${esc(name('clienti', clientId))}</button>`).join('') || '<span class="muted">Appariranno dopo le prime registrazioni.</span>'}</div>
        <div>${recentLots.map((lot) => `<button type="button" data-lot="${lot.id}">▦ ${esc(lotSearchName(lot))}</button>`).join('')}</div>
      </div>
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">${esc(formatDateKey(date))}</p><h2>Articoli movimentati</h2></div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><b>${activeDaily.length} vendite · ${eur(activeDaily.reduce((sum, movement) => sum + Number(movement.totale), 0))}</b><button type="button" data-generate-day="${date}">Genera biglietti →</button></div>
      </div>
      <p id="ticket-msg"></p>
      <div class="pit-product-list">${groupedSales.map(([groupId, sales]) => {
        const firstLot = lotById(sales[0]?.lotto_id);
        const groupLots = lotsInGroup(groupId);
        const activeSales = sales.filter((movement) => !movement.annullato);
        const packages = activeSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
        const weight = activeSales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
        const total = activeSales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
        const open = expandedPitLot === groupId;
        const qualities = [...new Set(groupLots.map((lot) => lot.qualita).filter((value) => value && value !== 'Standard'))];
        return `<article class="pit-product-card ${open ? 'open' : ''}">
          <button type="button" class="pit-product-row" data-expand-lot="${groupId}">
            <span><strong>${esc(name('prodotti', firstLot?.prodotto_id))} · ${esc(firstLot?.proprietario || '—')}</strong><small>${activeSales.length} ${activeSales.length === 1 ? 'registrazione' : 'registrazioni'} · clicca per i dettagli</small>${qualities.length ? `<span class="quality-chip">${qualities.map(esc).join(' · ')}</span>` : ''}</span>
            <span class="metric"><b>${formatQty(packages)} colli</b><small>venduti</small></span>
            <span class="metric"><b>${formatQty(weight)} kg</b><small>venduti</small></span>
            <span class="metric"><b>${eur(total)}</b><small>importo</small></span>
            <span class="chevron">›</span>
          </button>
          ${open ? `<div class="pit-buyers"><div class="table-scroll"><table>
            <tr><th>Descrizione</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Importo</th><th>Operatore</th></tr>
            ${sales.map((sale) => { const saleLot = lotById(sale.lotto_id); return `<tr class="${sale.annullato ? 'returned' : ''}"><td><b>${esc(name('clienti', sale.cliente_id))}</b>${saleLot?.qualita && saleLot.qualita !== 'Standard' ? `<br><small>${esc(saleLot.qualita)}</small>` : ''}${sale.annullato ? '<br><span class="return-badge">RESO</span>' : ''}</td><td>${formatQty(sale.colli)}</td><td>${formatQty(sale.peso)}</td><td>${eur(sale.prezzo)} / ${sale.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(sale.totale)}</b></td><td>${esc(sale.operatore || '—')}</td></tr>`; }).join('')}
          </table></div></div>` : ''}
        </article>`;
      }).join('') || '<p class="empty">Nessun articolo registrato nella giornata scelta.</p>'}</div>
    </section>`;
}

function magazzino() {
  const owners = [...new Set(db.lotti.map((lot) => lot.proprietario).filter(Boolean))];
  const inventory = db.lotti.slice().sort((a, b) => (
    `${name('prodotti', a.prodotto_id)} ${a.proprietario} ${a.qualita || ''}`.localeCompare(`${name('prodotti', b.prodotto_id)} ${b.proprietario} ${b.qualita || ''}`, 'it')
  ));
  const measure = (tracked, value, unit) => tracked ? `${formatQty(value)} ${unit}` : '—';

  return `
    <section class="pit-title">
      <div>
        <p class="eyebrow">MAGAZZINO</p>
        <h2>Rimanenze sempre aggiornate</h2>
        <p>Un solo scarico può contenere più pezzature dello stesso articolo.</p>
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">NUOVO SCARICO</p>
      <h2>Registra merce arrivata</h2>
      <form id="load-form">
        <div class="grid">
        <div><label>Data arrivo *</label><input name="data_carico" required type="date" value="${today()}"></div>
        <div><label>Prodotto *</label><select name="prodotto_id" required>${opts(db.prodotti)}</select></div>
        <div><label>Proprietario / fornitore *</label><input name="proprietario" required list="owners" placeholder="Es. Angelo"><datalist id="owners">${owners.map((owner) => `<option value="${esc(owner)}">`).join('')}</datalist></div>
        <div><label>Note generali</label><input name="note" placeholder="Facoltative"></div>
        </div>
        <div class="section-head" style="margin-top:18px"><div><p class="eyebrow">PEZZATURE</p><h3>Colli e peso per descrizione</h3></div><button type="button" class="ghost" data-add-variant>+ Aggiungi pezzatura</button></div>
        <div class="variant-list" id="variant-list">${loadVariantRow()}</div>
        <button ${!db.prodotti.length ? 'disabled' : ''}>Registra tutto lo scarico</button>
      </form>
      <p class="muted">Esempio: Fiorone 200 colli, Prima 20, Doppia prima 30. Rimarranno nello stesso arrivo e nello stesso biglietto.</p>
      <p id="load-msg"></p>
      ${!db.prodotti.length ? '<p class="message error">Prima aggiungi almeno un articolo nella sezione Prodotti.</p>' : ''}
    </section>
    <details class="secondary-panel">
      <summary>Registra merce lavorata o scartata</summary>
      <div>
        <p class="muted">I colli marci o lavorati vengono scalati dalla rimanenza e scritti nel biglietto.</p>
        <form id="waste-form" class="grid">
          <div><label>Data *</label><input name="data_movimento" required type="date" value="${today()}"></div>
          <div><label>Articolo / pezzatura *</label><input name="lotto_nome" required list="lot-suggestions" autocomplete="off" placeholder="Scrivi l’articolo…">${lotSuggestions()}</div>
          <div><label>Colli lavorati</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
          <div><label>Peso lavorato kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
          <div><label>Motivo / nota</label><input name="note" placeholder="Es. merce marcia"></div>
          <div><label>&nbsp;</label><button>Registra lavorazione</button></div>
        </form>
        <p id="waste-msg"></p>
      </div>
    </details>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">DISPONIBILITÀ</p><h2>Rimanenze per articolo e pezzatura</h2></div>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Articolo / pezzatura</th><th>Proprietario / fornitore</th><th>Arrivati</th><th>Usciti</th><th>Rimanenza colli</th><th>Rimanenza kg</th></tr>
        ${inventory.map((lot) => {
          const tracksPackages = Number(lot.colli_iniziali || 0) > 0;
          const tracksWeight = Number(lot.peso_iniziale || 0) > 0;
          const soldPackages = roundQty(Number(lot.colli_iniziali || 0) - Number(lot.colli_rimanenti || 0));
          const soldWeight = roundQty(Number(lot.peso_iniziale || 0) - Number(lot.peso_rimanente || 0));
          return `<tr>
            <td><button class="ghost" data-open-product="${lot.prodotto_id}"><strong class="inventory-product-name">${esc(name('prodotti', lot.prodotto_id))}</strong></button>${lot.qualita && lot.qualita !== 'Standard' ? `<br><span class="quality-chip">${esc(lot.qualita)}</span>` : ''}<br><small>${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</small></td>
            <td><span class="owner-badge">${esc(lot.proprietario || '—')}</span></td>
            <td>${measure(tracksPackages, lot.colli_iniziali, 'colli')}<br><small>${measure(tracksWeight, lot.peso_iniziale, 'kg')}</small></td>
            <td>${measure(tracksPackages, soldPackages, 'colli')}<br><small>${measure(tracksWeight, soldWeight, 'kg')}</small></td>
            <td>${tracksPackages ? stockStateHtml(lot.colli_rimanenti, 'colli') : '—'}</td>
            <td>${tracksWeight ? stockStateHtml(lot.peso_rimanente, 'kg') : '—'}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" class="empty">Nessuna merce registrata. Registra il primo scarico.</td></tr>'}
      </table></div>
    </section>`;
}

function productDetail(product) {
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita' && movement.prodotto_id === product.id).slice().reverse();
  const activeSales = sales.filter((movement) => !movement.annullato);
  const lots = db.lotti.filter((lot) => lot.prodotto_id === product.id).slice().reverse();
  const remaining = lots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti || 0), 0);
  const remainingKg = lots.reduce((sum, lot) => sum + Number(lot.peso_rimanente || 0), 0);
  const soldPackages = activeSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
  const salesTotal = activeSales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
  const hasPackages = lots.some((lot) => Number(lot.colli_iniziali || 0) > 0);
  const hasWeight = lots.some((lot) => Number(lot.peso_iniziale || 0) > 0);

  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">SCHEDA PRODOTTO</p><h2>${esc(product.nome)}</h2></div>
        <button class="ghost" id="close-product">Chiudi scheda</button>
      </div>
      <section class="stats">
        <article class="stat"><i>▦</i><div><h3>Rimanenza articolo</h3><div class="big">${hasPackages ? stockState(remaining, 'colli') : stockState(remainingKg, 'kg')}</div><p>${hasPackages && hasWeight ? `${stockState(remainingKg, 'kg')} · ` : ''}${lots.length} carichi registrati</p></div></article>
        <article class="stat"><i>↗</i><div><h3>Colli venduti</h3><div class="big">${soldPackages}</div><p>${activeSales.length} vendite attive</p></div></article>
        <article class="stat"><i>€</i><div><h3>Totale storico</h3><div class="big">${eur(salesTotal)}</div><p>Valore vendite</p></div></article>
      </section>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">MAGAZZINO</p><h2>Lotti del prodotto</h2></div><b>${lots.length} totali</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data carico</th><th>Proprietario / provenienza</th><th>Pezzatura</th><th>Iniziali</th><th>Rimanenza</th></tr>
        ${lots.map((lot) => `<tr><td>${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</td><td><span class="owner-badge">${esc(lot.proprietario || '—')}</span></td><td>${esc(lot.qualita || 'Standard')}</td><td>${initialLotQuantity(lot)}</td><td>${remainingLotQuantity(lot)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nessun lotto.</td></tr>'}
      </table></div>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">VENDITE</p><h2>Storico del prodotto</h2></div><b>${sales.length} righe</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Cliente</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th><th>Operatore</th></tr>
        ${sales.map((movement) => `<tr class="${movement.annullato ? 'returned' : ''}">
          <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td><td>${esc(name('clienti', movement.cliente_id))}</td><td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${Number(movement.colli || 0)}</td><td>${Number(movement.peso || 0)}</td><td>${eur(movement.totale)}${movement.annullato ? '<br><span class="return-badge">RESO</span>' : ''}</td><td>${esc(movement.operatore || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="7" class="empty">Nessuna vendita.</td></tr>'}
      </table></div>
    </section>`;
}

function prodotti() {
  const selected = db.prodotti.find((product) => product.id === selectedProduct);
  return `
    ${isAdmin() ? `<section class="card">
      <p class="eyebrow">AMMINISTRAZIONE</p>
      <h2>Aggiungi prodotto</h2>
      <form data-add="prodotti" class="grid">
        <div><label>Nome articolo</label><input name="nome" required placeholder="Es. Arance"></div>
        <div><label>&nbsp;</label><button>Aggiungi prodotto</button></div>
      </form>
    </section>` : ''}
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">ARCHIVIO</p><h2>Prodotti</h2></div><b>${db.prodotti.length} articoli</b></div>
      <div class="table-scroll"><table>
        <tr><th>Nome</th><th></th></tr>
        ${db.prodotti.map((product) => `<tr><td><button class="ghost" data-open-product="${product.id}"><b>${esc(product.nome)}</b></button></td><td><button class="ghost" data-open-product="${product.id}">Apri scheda →</button>${isAdmin() ? ` <button class="del" data-kind="prodotti" data-id="${product.id}">Elimina</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">Nessun prodotto.</td></tr>'}
      </table></div>
    </section>
    ${selected ? productDetail(selected) : ''}`;
}

function clientHistory(clientId) {
  const history = db.movimenti
    .filter((movement) => movement.cliente_id === clientId && movement.tipo === 'uscita')
    .slice()
    .reverse();
  const activeHistory = history.filter((movement) => !movement.annullato);
  const total = activeHistory.reduce((sum, movement) => sum + Number(movement.totale), 0);

  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">STORICO CLIENTE</p><h2>Vendite registrate</h2></div>
        <b>${activeHistory.length} vendite attive · ${eur(total)}</b>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Articolo</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th></tr>
        ${history.map((movement) => {
          const lot = lotById(movement.lotto_id);
          return `<tr class="${movement.annullato ? 'returned' : ''}">
            <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td>
            <td><b>${esc(name('prodotti', movement.prodotto_id))}</b></td>
            <td>${esc(lot?.proprietario || movement.proprietario || '—')}</td>
            <td>${movement.colli}</td>
            <td>${movement.peso}</td>
            <td>${eur(movement.totale)}${movement.annullato ? '<br><span class="return-badge">RESO</span>' : ''}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" class="empty">Nessuna vendita per questo cliente.</td></tr>'}
      </table></div>
    </section>`;
}

function clienti() {
  const client = db.clienti.find((item) => item.id === selectedClient);

  return `
    <section class="card">
      <p class="eyebrow">NUOVO CLIENTE</p>
      <h2>Crea la scheda cliente</h2>
      <p class="muted">Solo il nome è obbligatorio. Tutti gli altri campi sono facoltativi.</p>
      <form id="client-form" class="grid">
        <div><label>Nome / Ragione sociale *</label><input name="nome" required placeholder="Nome del cliente"></div>
        <div><label>Telefono</label><input name="telefono" type="tel" placeholder="Facoltativo"></div>
        <div><label>Email</label><input name="email" type="email" placeholder="Facoltativa"></div>
        <div><label>Indirizzo</label><input name="indirizzo" placeholder="Facoltativo"></div>
        <div><label>Città</label><input name="citta" placeholder="Facoltativa"></div>
        <div><label>Partita IVA / Codice fiscale</label><input name="piva" placeholder="Facoltativo"></div>
        <div><label>Note</label><input name="note" placeholder="Facoltative"></div>
        <div><label>&nbsp;</label><button>Crea cliente</button></div>
      </form>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">RUBRICA</p><h2>Clienti</h2></div><b>${db.clienti.length} registrati</b></div>
      <div class="table-scroll"><table>
        <tr><th>Cliente</th><th>Contatti</th><th>Sede</th><th></th></tr>
        ${db.clienti.map((item) => `<tr>
          <td><b>${esc(item.nome)}</b></td>
          <td>${valueOrDash(item.telefono || item.email)}</td>
          <td>${valueOrDash(item.citta)}</td>
          <td>
            <button class="ghost" data-open-client="${item.id}">Apri scheda</button>
            ${isAdmin() ? `<button class="del" data-kind="clienti" data-id="${item.id}">Elimina</button>` : ''}
          </td>
        </tr>`).join('') || '<tr><td colspan="4" class="empty">Nessun cliente.</td></tr>'}
      </table></div>
    </section>
    ${client ? `
      <section class="card">
        <div class="section-head">
          <div><p class="eyebrow">SCHEDA CLIENTE</p><h2>${esc(client.nome)}</h2></div>
          <button class="ghost" id="close-client">Chiudi scheda</button>
        </div>
        <form id="client-edit-form" data-id="${client.id}" class="grid">
          <div><label>Nome / Ragione sociale *</label><input name="nome" required value="${esc(client.nome)}"></div>
          <div><label>Telefono</label><input name="telefono" type="tel" value="${esc(client.telefono || '')}" placeholder="Facoltativo"></div>
          <div><label>Email</label><input name="email" type="email" value="${esc(client.email || '')}" placeholder="Facoltativa"></div>
          <div><label>Indirizzo</label><input name="indirizzo" value="${esc(client.indirizzo || '')}" placeholder="Facoltativo"></div>
          <div><label>Città</label><input name="citta" value="${esc(client.citta || '')}" placeholder="Facoltativa"></div>
          <div><label>Partita IVA / Codice fiscale</label><input name="piva" value="${esc(client.piva || '')}" placeholder="Facoltativo"></div>
          <div><label>Note</label><input name="note" value="${esc(client.note || '')}" placeholder="Facoltative"></div>
          <div><label>&nbsp;</label><button>Salva modifiche</button></div>
        </form>
        <p id="client-msg"></p>
      </section>
      ${clientHistory(client.id)}` : ''}`;
}

function vendite() {
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita').slice().reverse();
  const activeSales = sales.filter((movement) => !movement.annullato);
  const total = activeSales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
  const packages = activeSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);

  return `
    <section class="pit-title">
      <div><p class="eyebrow">VENDITE</p><h2>Storico completo</h2><p>Tutte le vendite registrate, separate dalla dashboard.</p></div>
      <div class="date"><small>TOTALE STORICO</small>${eur(total)}</div>
    </section>
    <section class="stats">
      <article class="stat"><i>↗</i><div><h3>Vendite</h3><div class="big">${activeSales.length}</div><p>Operazioni attive</p></div></article>
      <article class="stat"><i>▦</i><div><h3>Colli</h3><div class="big">${packages}</div><p>Colli venduti</p></div></article>
      <article class="stat"><i>€</i><div><h3>Valore</h3><div class="big">${eur(total)}</div><p>Totale storico</p></div></article>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">ARCHIVIO</p><h2>Elenco vendite</h2></div><b>${sales.length} righe</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Prodotto / pezzatura</th><th>Proprietario lotto</th><th>Cliente</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Totale</th><th>Operatore</th></tr>
        ${sales.map((movement) => `<tr class="${movement.annullato ? 'returned' : ''}">
          <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td>
          <td><button class="ghost" data-open-product="${movement.prodotto_id}"><b>${esc(name('prodotti', movement.prodotto_id))}</b></button>${movement.qualita && movement.qualita !== 'Standard' ? `<br><span class="quality-chip">${esc(movement.qualita)}</span>` : ''}</td>
          <td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${esc(name('clienti', movement.cliente_id))}</td>
          <td>${formatQty(movement.colli)}</td><td>${formatQty(movement.peso)}</td><td>${eur(movement.prezzo)} / ${movement.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(movement.totale)}</b>${movement.annullato ? '<br><span class="return-badge">RESO</span>' : ''}</td><td>${esc(movement.operatore || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="9" class="empty">Nessuna vendita registrata.</td></tr>'}
      </table></div>
    </section>`;
}

function biglietti() {
  const date = ticketsDate || today();
  const tickets = (Array.isArray(db.biglietti) ? db.biglietti : [])
    .filter((ticket) => ticket.dateKey === date)
    .slice()
    .sort((a, b) => String(a.prodotto).localeCompare(String(b.prodotto), 'it'));
  const gross = tickets.reduce((sum, ticket) => sum + Number(ticket.gross || 0), 0);
  const net = tickets.reduce((sum, ticket) => sum + Number(ticket.net || 0), 0);

  return `
    <section class="pit-simple-title">
      <h2>Biglietti</h2>
      <div><label>Giornata</label><input id="tickets-date" type="date" value="${date}"></div>
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">${esc(formatDateKey(date))}</p><h2>${tickets.length} ${tickets.length === 1 ? 'biglietto' : 'biglietti'} salvati</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" data-generate-day="${date}">Genera / aggiorna</button>
          <button type="button" class="ghost" data-print-day="${date}" ${tickets.length ? '' : 'disabled'}>Visualizza e stampa tutti</button>
        </div>
      </div>
      <p id="ticket-msg"></p>
      ${tickets.length ? `<p class="notice">Totale lordo ${eur(gross)} · Totale netto ${eur(net)}. I biglietti restano salvati e puoi riaprirli quando vuoi.</p>` : '<p class="empty">Non ci sono ancora biglietti per questa data. Premi “Genera / aggiorna”.</p>'}
    </section>
    <section class="ticket-grid">${tickets.map((ticket) => `
      <article class="ticket-card">
        <p class="eyebrow">${esc(displayDateOnly(ticket.data, ticket.dateKey))}</p>
        <h3>${esc(ticket.prodotto)} · ${esc(ticket.proprietario)}</h3>
        <p class="muted">${ticketQuantityTitle(ticket)}${ticket.qualita?.length ? ` · ${ticket.qualita.map(esc).join(' / ')}` : ''} · ${ticket.righe.length} righe</p>
        <div class="table-scroll"><table>
          <tr><th>Colli</th><th>Descrizione</th><th>Peso</th><th>Prezzo</th><th>Totale</th><th></th></tr>
          ${ticket.righe.map((sale) => `<tr class="${sale.annullato ? 'returned' : ''}"><td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td><td>${esc(sale.descrizione || sale.cliente || '—')}${sale.annullato ? '<br><span class="return-badge">RESO</span>' : ''}</td><td>${Number(sale.peso || 0) ? `${formatQty(sale.peso)} kg` : '—'}</td><td>${sale.tipo === 'scarto' ? '—' : `${eur(sale.prezzo)} / ${sale.unita_prezzo === 'kg' ? 'kg' : 'collo'}`}</td><td><b>${eur(sale.totale)}</b></td><td>${sale.tipo === 'uscita' && !sale.annullato ? `<button type="button" class="ghost" data-return-sale="${sale.movimento_id || sale.id}">Segna reso</button>` : ''}</td></tr>`).join('')}
        </table></div>
        <p><b>Rimanenza:</b> ${ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasWeightData ? stockState(ticket.remainingKg, 'kg') : ''}</p>
        <p><b>Lordo ${eur(ticket.gross)}</b> · Trattenuta 10% arrotondata ${eur(ticket.deduction)} · <b>Netto ${eur(ticket.net)}</b></p>
        <div class="ticket-actions">
          <button type="button" data-print-ticket="${ticket.id}">Visualizza / stampa PDF</button>
          <button type="button" class="ghost" data-share-ticket="${ticket.id}">Condividi</button>
        </div>
      </article>`).join('')}</section>`;
}

async function saveAccessConfig() {
  accessConfig = {
    membri: [...new Set(accessConfig.membri.map((email) => String(email).toLowerCase()))],
    amministratori: [...new Set(accessConfig.amministratori.map((email) => String(email).toLowerCase()))],
  };
  await setDoc(doc(store, 'eurofrutta', 'config'), accessConfig);
}

function registro() {
  if (!isAdmin() || !adminSessionUnlocked) return '<section class="card"><h2>Area Amministrazione protetta</h2></section>';
  const entries = db.registro.slice().reverse();
  const authorized = [...new Set([...accessConfig.membri, ...accessConfig.amministratori])]
    .filter((email) => email !== OWNER_EMAIL)
    .sort();
  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">AREA PROTETTA</p><h2>Persone e amministratori</h2></div>
        <b>♛ ${esc(operatorName())} · Amministratore</b>
      </div>
      <p class="muted">Aggiungi prima l’email Google della persona. Al primo accesso sceglierà il proprio nome utente fisso e vedrà gli stessi dati condivisi.</p>
      <div class="grid">
        <form id="member-form">
          <label>Autorizza un operatore</label>
          <input name="email" type="email" required placeholder="email@gmail.com">
          <button>Autorizza operatore</button>
        </form>
        <form id="admin-form">
          <label>Aggiungi un amministratore</label>
          <input name="email" type="email" required placeholder="email@gmail.com">
          <button>Aggiungi amministratore</button>
        </form>
      </div>
      <p id="access-msg"></p>
      <div class="table-scroll"><table>
        <tr><th>Account Google autorizzato</th><th>Ruolo</th></tr>
        <tr><td>${OWNER_EMAIL}</td><td><b>♛ Proprietario</b></td></tr>
        ${authorized.map((email) => `<tr><td>${esc(email)}</td><td>${accessConfig.amministratori.includes(email) ? '<b>♛ Amministratore</b>' : 'Operatore'}</td></tr>`).join('')}
      </table></div>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">AMMINISTRAZIONE</p><h2>Registro delle modifiche</h2></div><b>${entries.length} attività</b></div>
      <p class="muted">Qui puoi controllare chi ha registrato vendite, scarichi o modificato gli archivi.</p>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Nome utente</th><th>Account</th><th>Azione</th><th>Dettaglio</th></tr>
        ${entries.map((entry) => `<tr><td>${esc(entry.data)}</td><td><b>${esc(entry.operatore || '—')}</b></td><td>${esc(entry.operatore_email || '—')}</td><td>${esc(entry.azione || '—')}</td><td>${esc(entry.dettaglio || '—')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Il registro è ancora vuoto.</td></tr>'}
      </table></div>
    </section>`;
}

function report() {
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita' && !movement.annullato);
  return `
    <section class="card">
      <p class="eyebrow">RIEPILOGO</p>
      <h2>Vendite per articolo</h2>
      <div class="table-scroll"><table>
        <tr><th>Articolo</th><th>Colli</th><th>Kg</th><th>Totale</th></tr>
        ${db.prodotti.map((product) => {
          const rows = sales.filter((movement) => movement.prodotto_id === product.id);
          return `<tr>
            <td><button class="ghost" data-open-product="${product.id}"><b>${esc(product.nome)}</b></button></td>
            <td>${rows.reduce((sum, movement) => sum + Number(movement.colli), 0)}</td>
            <td>${rows.reduce((sum, movement) => sum + Number(movement.peso), 0)}</td>
            <td>${eur(rows.reduce((sum, movement) => sum + Number(movement.totale), 0))}</td>
          </tr>`;
        }).join('')}
      </table></div>
    </section>`;
}

function dailyTicketData(dateKey) {
  const dayRows = db.movimenti.filter((movement) => (
    ['uscita', 'scarto'].includes(movement.tipo) && movement.dateKey === dateKey
  ));
  const groups = new Map();

  dayRows.forEach((movement) => {
    const lot = lotById(movement.lotto_id);
    const key = movement.gruppo_id || lotGroupId(lot) || movement.lotto_id || `${movement.prodotto_id || 'prodotto'}-${movement.proprietario || 'senza-provenienza'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(movement);
  });

  return [...groups.entries()].map(([key, rows]) => {
    const first = rows[0];
    const firstLot = lotById(first.lotto_id) || {
      id: key,
      prodotto_id: first.prodotto_id,
      proprietario: first.proprietario || '',
      colli_iniziali: 0,
      peso_iniziale: 0,
    };
    const lots = lotsInGroup(key).length ? lotsInGroup(key) : [firstLot];
    const lotIds = new Set(lots.map((lot) => lot.id));
    const previousRows = db.movimenti.filter((movement) => (
      ['uscita', 'scarto'].includes(movement.tipo)
      && lotIds.has(movement.lotto_id)
      && movement.dateKey < dateKey
      && !movement.annullato
    ));
    const activeRows = rows.filter((movement) => !movement.annullato);
    const sales = rows.filter((movement) => movement.tipo === 'uscita');
    const activeSales = activeRows.filter((movement) => movement.tipo === 'uscita');
    const waste = activeRows.filter((movement) => movement.tipo === 'scarto');
    const usedBeforeKg = previousRows.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
    const usedBeforePackages = previousRows.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
    const soldTodayKg = activeSales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
    const soldTodayPackages = activeSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
    const wasteTodayKg = waste.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
    const wasteTodayPackages = waste.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
    const recordedInitialKg = lots.reduce((sum, lot) => sum + Number(lot.peso_iniziale || 0), 0);
    const recordedInitialPackages = lots.reduce((sum, lot) => sum + Number(lot.colli_iniziali || 0), 0);
    const startKg = recordedInitialKg > 0 ? recordedInitialKg - usedBeforeKg : soldTodayKg + wasteTodayKg;
    const startPackages = recordedInitialPackages > 0 ? recordedInitialPackages - usedBeforePackages : soldTodayPackages + wasteTodayPackages;
    const gross = roundMoney(activeSales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0));
    const net = roundMoney(Math.round((gross * 0.9 + Number.EPSILON) * 2) / 2);
    const deduction = roundMoney(gross - net);

    return {
      lot: firstLot,
      lots,
      groupId: key,
      rows,
      sales,
      product: name('prodotti', firstLot.prodotto_id),
      owner: firstLot.proprietario || 'Provenienza non indicata',
      qualities: [...new Set(lots.map((lot) => lot.qualita).filter((value) => value && value !== 'Standard'))],
      startKg: roundQty(startKg),
      startPackages: roundQty(startPackages),
      soldTodayKg: roundQty(soldTodayKg),
      soldTodayPackages: roundQty(soldTodayPackages),
      wasteTodayKg: roundQty(wasteTodayKg),
      wasteTodayPackages: roundQty(wasteTodayPackages),
      remainingKg: roundQty(startKg - soldTodayKg - wasteTodayKg),
      remainingPackages: roundQty(startPackages - soldTodayPackages - wasteTodayPackages),
      hasPackageData: recordedInitialPackages > 0 || soldTodayPackages > 0 || wasteTodayPackages > 0,
      hasWeightData: recordedInitialKg > 0 || soldTodayKg > 0 || wasteTodayKg > 0,
      gross,
      deduction,
      net,
    };
  });
}

function createTicketRecords(dateKey) {
  const calculated = dailyTicketData(dateKey);
  if (!calculated.length) throw new Error(`Non ci sono vendite o lavorazioni registrate il ${formatDateKey(dateKey)}.`);
  if (!Array.isArray(db.biglietti)) db.biglietti = [];
  const records = calculated.map((ticket) => ({
    id: `${dateKey}-${ticket.groupId}`,
    dateKey,
    data: formatDateKey(dateKey),
    creatoIl: stamp(),
    creatoDa: operatorName(),
    gruppo_id: ticket.groupId,
    lotto_id: ticket.lot.id,
    prodotto: ticket.product,
    proprietario: ticket.owner,
    qualita: ticket.qualities,
    startKg: ticket.startKg,
    startPackages: ticket.startPackages,
    soldTodayKg: ticket.soldTodayKg,
    soldTodayPackages: ticket.soldTodayPackages,
    wasteTodayKg: ticket.wasteTodayKg,
    wasteTodayPackages: ticket.wasteTodayPackages,
    remainingKg: ticket.remainingKg,
    remainingPackages: ticket.remainingPackages,
    hasPackageData: ticket.hasPackageData,
    hasWeightData: ticket.hasWeightData,
    gross: ticket.gross,
    deduction: ticket.deduction,
    net: ticket.net,
    righe: ticket.rows.map((row) => {
      const lot = lotById(row.lotto_id);
      const quality = row.qualita || lot?.qualita || 'Standard';
      const isWaste = row.tipo === 'scarto';
      return {
        id: row.id,
        movimento_id: row.id,
        tipo: row.tipo,
        annullato: Boolean(row.annullato),
        qualita: quality,
        cliente: isWaste ? '' : name('clienti', row.cliente_id),
        descrizione: isWaste
          ? `LAVORATI / SCARTO${quality !== 'Standard' ? ` · ${quality}` : ''}${row.note ? ` · ${row.note}` : ''}`
          : `${name('clienti', row.cliente_id)}${quality !== 'Standard' ? ` · ${quality}` : ''}`,
        colli: Number(row.colli || 0),
        peso: Number(row.peso || 0),
        prezzo: Number(row.prezzo || 0),
        unita_prezzo: row.unita_prezzo || (Number(row.peso || 0) > 0 ? 'kg' : 'collo'),
        totale: Number(row.totale || 0),
      };
    }),
  }));
  db.biglietti = db.biglietti.filter((ticket) => ticket.dateKey !== dateKey).concat(records);
  audit('Biglietti generati', `${formatDateKey(dateKey)} · ${records.length} biglietti`);
  return records;
}

function ticketQuantityTitle(ticket) {
  const parts = [];
  if (ticket.hasPackageData) parts.push(`${formatQty(ticket.startPackages)} COLLI`);
  if (ticket.hasWeightData) parts.push(`${formatQty(ticket.startKg)} KG`);
  return parts.length ? `R ${parts.join(' / ')}` : 'RIMANENZA';
}

function openTicketPreview(tickets) {
  if (!tickets.length) throw new Error('Non ci sono biglietti da visualizzare.');

  const ticketHtml = tickets.map((ticket, index) => `
    <section class="ticket">
      <header>
        <div><small>EUROFRUTTA · PITAZZO</small></div>
        <div class="ticket-date"><small>${esc(displayDateOnly(ticket.data, ticket.dateKey))}</small></div>
      </header>
      <div class="lot-title">${esc(ticket.prodotto)}</div>
      <div class="lot-subtitle"><b>${esc(ticket.proprietario)}</b>${ticket.qualita?.length ? ` · ${ticket.qualita.map(esc).join(' / ')}` : ''}<br>Rimanenza iniziale: ${ticket.hasPackageData ? `<b>${formatQty(ticket.startPackages)} colli</b>` : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasWeightData ? `<b>${formatQty(ticket.startKg)} kg</b>` : ''}</div>
      <table>
        <thead><tr><th>Colli</th><th>Descrizione</th><th>Peso</th><th>Prezzo</th><th>Totale</th></tr></thead>
        <tbody>${ticket.righe.map((sale) => `<tr>
          <td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td>
          <td>${esc(sale.descrizione || sale.cliente || '—')}${sale.annullato ? '<br><b class="returned-label">RESO — IMPORTO ANNULLATO</b>' : ''}</td>
          <td>${Number(sale.peso || 0) ? `${formatQty(sale.peso)} kg` : '—'}</td>
          <td>${sale.tipo === 'scarto' ? '—' : `${eur(sale.prezzo)} / ${sale.unita_prezzo === 'kg' ? 'kg' : 'collo'}`}</td>
          <td><b>${eur(sale.totale)}</b></td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="totals">
        <div class="remaining"><span>VENDUTO</span><b>${ticket.hasPackageData ? `${formatQty(ticket.soldTodayPackages)} colli` : `${formatQty(ticket.soldTodayKg)} kg`}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? `${formatQty(ticket.soldTodayKg)} kg` : ''}</small></div>
        <div class="remaining"><span>RIMANENZA / GAP</span><b>${ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : stockState(ticket.remainingKg, 'kg')}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? stockState(ticket.remainingKg, 'kg') : ''}</small></div>
        <dl>
          <dt>Totale lordo</dt><dd>${eur(ticket.gross)}</dd>
          <dt>10% arrotondato</dt><dd>− ${eur(ticket.deduction)}</dd>
          <dt class="net">TOTALE NETTO</dt><dd class="net">${eur(ticket.net)}</dd>
        </dl>
      </div>
      <footer>Eurofrutta · Biglietto ${index + 1} di ${tickets.length} · Generato da ${esc(ticket.creatoDa || operatorName())}</footer>
    </section>`).join('');

  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Il browser ha bloccato la finestra. Consenti i popup e riprova.');
  preview.document.open();
  preview.document.write(`<!doctype html>
    <html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Biglietti Eurofrutta</title>
    <style>
      @page{size:A5 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;background:#eef2f0;color:#172334;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:14px;background:#15334a}.toolbar button{border:0;border-radius:8px;padding:11px 18px;font-weight:700;cursor:pointer}.toolbar .print{background:#35b779;color:#fff}.ticket{width:148mm;min-height:210mm;margin:18px auto;padding:10mm;background:#fff;box-shadow:0 4px 24px #0002;page-break-after:always;display:flex;flex-direction:column}.ticket:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #aab3bc;padding-bottom:7px}header div{display:flex;flex-direction:column}small{color:#6b7788}.ticket-date{text-align:right;font-size:10px}.lot-title{margin:15px 0 4px;color:#c43232;font-size:24px;font-weight:900;text-transform:uppercase}.lot-subtitle{margin-bottom:14px;color:#4d5968;line-height:1.55}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #aab3bc;padding:7px 5px;text-align:left;vertical-align:top}th{background:#eef2f0;text-transform:uppercase;font-size:10px}th:nth-child(n+3),td:nth-child(n+3){text-align:right}.returned-label{color:#b14528;font-size:9px}.totals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.remaining{border:2px solid #172334;padding:9px;display:flex;flex-direction:column}.remaining span{font-size:10px;font-weight:700;color:#637082}.remaining b{font-size:19px;margin-top:3px}.remaining small{min-height:14px}dl{grid-column:1/-1;margin:0 0 0 auto;width:64%;display:grid;grid-template-columns:1fr auto;gap:4px 20px;border-top:1px solid #aab3bc;padding-top:9px}dt,dd{margin:0}dd{text-align:right;font-weight:700}.net{margin-top:5px;padding-top:7px;border-top:2px solid #172334;font-size:16px;font-weight:800}footer{margin-top:auto;padding-top:18px;text-align:center;color:#7a8490;font-size:9px}@media(max-width:650px){.ticket{width:100%;min-height:0;margin:0;padding:16px}.toolbar{position:relative}.totals{grid-template-columns:1fr}dl{width:100%}}@media print{body{background:#fff}.toolbar{display:none}.ticket{margin:0;padding:0;box-shadow:none;width:auto;min-height:190mm}}
    </style></head><body>
      <div class="toolbar"><button class="print" onclick="window.print()">Stampa / Salva PDF</button><button onclick="window.close()">Chiudi</button></div>
      ${ticketHtml}
    </body></html>`);
  preview.document.close();
  preview.focus();
  return tickets.length;
}

async function shareTicket(ticket) {
  const quantities = [
    ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : '',
    ticket.hasWeightData ? stockState(ticket.remainingKg, 'kg') : '',
  ].filter(Boolean).join(' · ');
  const text = `${ticket.prodotto} · ${ticket.proprietario}\nData ${displayDateOnly(ticket.data, ticket.dateKey)}\n${quantities}\nLordo ${eur(ticket.gross)} · 10% ${eur(ticket.deduction)} · Netto ${eur(ticket.net)}`;
  if (navigator.share) {
    await navigator.share({ title: `Biglietto ${ticket.prodotto}`, text });
    return;
  }
  await navigator.clipboard.writeText(text);
  alert('Riepilogo copiato. Ora puoi incollarlo su WhatsApp o in un messaggio.');
}

function addSale(form, createClientIfMissing = false) {
  const lot = lotById(form.get('lotto_id')) || findLotByText(form.get('lotto_nome'));
  let client = db.clienti.find((item) => item.id === form.get('cliente_id')) || findClientByText(form.get('cliente_nome'));
  let pendingClientName = '';
  if (!lot) throw new Error('Scegli l’articolo dai suggerimenti.');
  if (!client && createClientIfMissing) {
    pendingClientName = String(form.get('cliente_nome') || '').trim();
    if (pendingClientName.length < 2) throw new Error('Scrivi il nome del cliente.');
  }
  if (!client && !pendingClientName) throw new Error('Scegli il cliente dai suggerimenti.');
  const price = Number(form.get('prezzo') || 0);
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  const priceUnit = form.get('unita_prezzo') === 'collo' ? 'collo' : 'kg';
  const dateKey = String(form.get('data_movimento') || today());
  const remainingPackages = Number(lot.colli_rimanenti || 0);
  const remainingWeight = Number(lot.peso_rimanente || 0);
  if (packages < 0 || weight < 0) throw new Error('Colli e kg non possono essere negativi.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci i colli venduti, i kg oppure entrambi.');
  if (Number(lot.colli_iniziali || 0) > 0 && packages <= 0) {
    throw new Error('Questo lotto tiene anche la rimanenza in colli: inserisci i colli venduti.');
  }
  if (Number(lot.peso_iniziale || 0) > 0 && weight <= 0) {
    throw new Error('Questo lotto tiene anche la rimanenza in kg: inserisci i kg venduti.');
  }
  if (priceUnit === 'kg' && weight <= 0) throw new Error('Per il prezzo al kg devi inserire i kg venduti.');
  if (priceUnit === 'collo' && packages <= 0) throw new Error('Per il prezzo a collo devi inserire i colli venduti.');

  if (!client) {
    client = {
      id: id(),
      nome: pendingClientName,
      telefono: '',
      email: '',
      indirizzo: '',
      citta: '',
      piva: '',
      note: '',
      creatoDaPitazzo: true,
      creatoIl: stamp(),
    };
    db.clienti.push(client);
    audit('Cliente creato dal Pitazzo', client.nome);
  }
  if (Number(lot.colli_iniziali || 0) > 0) lot.colli_rimanenti = roundQty(remainingPackages - packages);
  if (Number(lot.peso_iniziale || 0) > 0) lot.peso_rimanente = roundQty(remainingWeight - weight);
  db.movimenti.push({
    id: id(),
    data: formatDateKey(dateKey),
    dateKey,
    tipo: 'uscita',
    gruppo_id: lotGroupId(lot),
    lotto_id: lot.id,
    prodotto_id: lot.prodotto_id,
    proprietario: lot.proprietario,
    qualita: lot.qualita || 'Standard',
    cliente_id: client.id,
    colli: packages,
    peso: weight,
    prezzo: price,
    unita_prezzo: priceUnit,
    totale: roundMoney(price * (priceUnit === 'kg' ? weight : packages)),
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
  });
  audit('Vendita registrata', `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario} · ${packages ? `${formatQty(packages)} colli` : ''}${packages && weight ? ' · ' : ''}${weight ? `${formatQty(weight)} kg` : ''} · prezzo a ${priceUnit} · cliente ${client.nome}`);
}

function addLoad(form) {
  const productId = form.get('prodotto_id');
  const owner = String(form.get('proprietario') || '').trim();
  const dateKey = String(form.get('data_carico') || today());
  const qualities = form.getAll('qualita');
  const packagesList = form.getAll('colli_variante');
  const weightsList = form.getAll('peso_variante');
  const variants = Array.from({ length: Math.max(qualities.length, packagesList.length, weightsList.length) }, (_, index) => ({
    qualita: String(qualities[index] || '').trim() || 'Standard',
    colli: Number(packagesList[index] || 0),
    peso: Number(weightsList[index] || 0),
  })).filter((variant) => variant.colli > 0 || variant.peso > 0);
  if (!productId) throw new Error('Scegli il prodotto.');
  if (!owner) throw new Error('Scrivi il proprietario o fornitore.');
  if (variants.some((variant) => variant.colli < 0 || variant.peso < 0)) throw new Error('Colli e kg non possono essere negativi.');
  if (!variants.length) throw new Error('Inserisci almeno i colli oppure i kg in una pezzatura.');

  const groupId = id();
  const note = String(form.get('note') || '').trim();
  variants.forEach((variant) => {
    const lot = {
      id: id(),
      gruppo_id: groupId,
      dataCarico: formatDateKey(dateKey),
      dateKey,
      prodotto_id: productId,
      proprietario: owner,
      qualita: variant.qualita,
      colli_iniziali: variant.colli,
      colli_rimanenti: variant.colli,
      peso_iniziale: variant.peso,
      peso_rimanente: variant.peso,
      note,
    };
    db.lotti.push(lot);
    db.movimenti.push({
      id: id(),
      data: formatDateKey(dateKey),
      dateKey,
      tipo: 'entrata',
      gruppo_id: groupId,
      lotto_id: lot.id,
      prodotto_id: productId,
      proprietario: owner,
      qualita: variant.qualita,
      cliente_id: '',
      colli: variant.colli,
      peso: variant.peso,
      prezzo: 0,
      totale: 0,
      operatore: operatorName(),
      operatore_uid: signedUser?.uid || '',
      operatore_email: userEmail(),
    });
  });
  const totalPackages = variants.reduce((sum, variant) => sum + variant.colli, 0);
  const totalWeight = variants.reduce((sum, variant) => sum + variant.peso, 0);
  audit('Scarico registrato', `${name('prodotti', productId)} · ${owner} · ${variants.map((variant) => `${variant.qualita}: ${formatQty(variant.colli)} colli / ${formatQty(variant.peso)} kg`).join(' · ')} · totale ${formatQty(totalPackages)} colli / ${formatQty(totalWeight)} kg`);
}

function addWaste(form) {
  const lot = lotById(form.get('lotto_id')) || findLotByText(form.get('lotto_nome'));
  if (!lot) throw new Error('Scegli l’articolo dai suggerimenti.');
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  const dateKey = String(form.get('data_movimento') || today());
  if (packages < 0 || weight < 0) throw new Error('Colli e kg non possono essere negativi.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci i colli lavorati, i kg oppure entrambi.');
  if (Number(lot.colli_iniziali || 0) > 0) lot.colli_rimanenti = roundQty(Number(lot.colli_rimanenti || 0) - packages);
  if (Number(lot.peso_iniziale || 0) > 0) lot.peso_rimanente = roundQty(Number(lot.peso_rimanente || 0) - weight);
  db.movimenti.push({
    id: id(),
    data: formatDateKey(dateKey),
    dateKey,
    tipo: 'scarto',
    gruppo_id: lotGroupId(lot),
    lotto_id: lot.id,
    prodotto_id: lot.prodotto_id,
    proprietario: lot.proprietario,
    qualita: lot.qualita || 'Standard',
    cliente_id: '',
    colli: packages,
    peso: weight,
    prezzo: 0,
    totale: 0,
    note: String(form.get('note') || '').trim(),
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
  });
  audit('Merce lavorata/scartata', `${lotSearchName(lot)} · ${packages ? `${formatQty(packages)} colli` : ''}${packages && weight ? ' · ' : ''}${weight ? `${formatQty(weight)} kg` : ''}`);
}

function markSaleReturned(movementId) {
  const movement = db.movimenti.find((item) => item.id === movementId && item.tipo === 'uscita');
  if (!movement) throw new Error('Vendita non trovata. Rigenera i biglietti e riprova.');
  if (movement.annullato) throw new Error('Questa vendita è già stata segnata come reso.');
  const lot = lotById(movement.lotto_id);
  if (!lot) throw new Error('Il lotto collegato a questa vendita non esiste più.');

  if (Number(lot.colli_iniziali || 0) > 0) {
    lot.colli_rimanenti = roundQty(Number(lot.colli_rimanenti || 0) + Number(movement.colli || 0));
  }
  if (Number(lot.peso_iniziale || 0) > 0) {
    lot.peso_rimanente = roundQty(Number(lot.peso_rimanente || 0) + Number(movement.peso || 0));
  }

  movement.totaleOriginale = Number(movement.totale || 0);
  movement.totale = 0;
  movement.annullato = true;
  movement.resoIl = stamp();
  movement.resoDateKey = today();
  movement.resoDa = operatorName();
  audit('Reso registrato', `${name('prodotti', movement.prodotto_id)} · ${name('clienti', movement.cliente_id)} · importo restituito ${eur(movement.totaleOriginale)}`);
  return movement.dateKey || today();
}

function formDataObject(form, fields) {
  const data = new FormData(form);
  return Object.fromEntries(fields.map((field) => [field, String(data.get(field) || '').trim()]));
}

function bind() {
  document.querySelectorAll('[data-page],[data-go]').forEach((button) => {
    button.onclick = async () => {
      const destination = button.dataset.page || button.dataset.go;
      if (destination === 'registro' && !(await unlockAdministration())) return;
      current = destination;
      closeMobileNav();
      render();
    };
  });

  const globalSearch = $('#global-search');
  const globalSearchResultsElement = $('#global-search-results');
  const bindGlobalSearchNavigation = () => {
    if (!globalSearchResultsElement) return;
    globalSearchResultsElement.onclick = (event) => {
      const productButton = event.target.closest('[data-search-product]');
      const clientButton = event.target.closest('[data-search-client]');
      if (productButton) {
        selectedProduct = productButton.dataset.searchProduct;
        current = 'prodotti';
        render();
      } else if (clientButton) {
        selectedClient = clientButton.dataset.searchClient;
        current = 'clienti';
        render();
      }
    };
  };
  if (globalSearch && globalSearchResultsElement) {
    globalSearch.oninput = () => {
      homeSearch = globalSearch.value;
      globalSearchResultsElement.innerHTML = globalSearchResults(homeSearch);
    };
    $('#clear-global-search').onclick = () => {
      homeSearch = '';
      globalSearch.value = '';
      globalSearchResultsElement.innerHTML = globalSearchResults('');
      globalSearch.focus();
    };
    bindGlobalSearchNavigation();
  }

  document.querySelectorAll('[data-open-product]').forEach((button) => {
    button.onclick = () => {
      selectedProduct = button.dataset.openProduct;
      current = 'prodotti';
      render();
      $('#close-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  const closeProduct = $('#close-product');
  if (closeProduct) {
    closeProduct.onclick = () => {
      selectedProduct = '';
      render();
    };
  }

  document.querySelectorAll('[data-add]').forEach((form) => {
    form.onsubmit = async (event) => {
      event.preventDefault();
      const productName = String(new FormData(form).get('nome') || '').trim();
      if (!productName) return;
      db.prodotti.push({ id: id(), nome: productName });
      audit('Prodotto creato', productName);
      await save();
      render();
    };
  });

  const loadForm = $('#load-form');
  if (loadForm) {
    const variantList = $('#variant-list');
    const bindVariantRemovers = () => {
      variantList?.querySelectorAll('[data-remove-variant]').forEach((button) => {
        button.onclick = () => {
          const rows = variantList.querySelectorAll('[data-variant-row]');
          if (rows.length <= 1) return;
          button.closest('[data-variant-row]')?.remove();
        };
      });
    };
    $('[data-add-variant]')?.addEventListener('click', () => {
      variantList?.insertAdjacentHTML('beforeend', loadVariantRow());
      bindVariantRemovers();
      variantList?.lastElementChild?.querySelector('input')?.focus();
    });
    bindVariantRemovers();

    loadForm.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#load-msg');
      try {
        message.className = 'message';
        message.textContent = 'Registrazione scarico…';
        addLoad(new FormData(loadForm));
        await save();
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  const wasteForm = $('#waste-form');
  if (wasteForm) {
    wasteForm.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#waste-msg');
      try {
        message.className = 'message';
        message.textContent = 'Registrazione lavorazione…';
        addWaste(new FormData(wasteForm));
        await save();
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  const clientForm = $('#client-form');
  if (clientForm) {
    clientForm.onsubmit = async (event) => {
      event.preventDefault();
      const fields = ['nome', 'telefono', 'email', 'indirizzo', 'citta', 'piva', 'note'];
      const client = { id: id(), ...formDataObject(clientForm, fields) };
      if (!client.nome) return;
      db.clienti.push(client);
      selectedClient = client.id;
      audit('Cliente creato', client.nome);
      await save();
      render();
    };
  }

  document.querySelectorAll('[data-open-client]').forEach((button) => {
    button.onclick = () => {
      selectedClient = button.dataset.openClient;
      render();
      $('#client-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  const closeClient = $('#close-client');
  if (closeClient) {
    closeClient.onclick = () => {
      selectedClient = '';
      render();
    };
  }

  const clientEditForm = $('#client-edit-form');
  if (clientEditForm) {
    clientEditForm.onsubmit = async (event) => {
      event.preventDefault();
      const fields = ['nome', 'telefono', 'email', 'indirizzo', 'citta', 'piva', 'note'];
      const clientIndex = db.clienti.findIndex((item) => item.id === clientEditForm.dataset.id);
      if (clientIndex < 0) return;
      const updated = formDataObject(clientEditForm, fields);
      if (!updated.nome) return;
      db.clienti[clientIndex] = { ...db.clienti[clientIndex], ...updated };
      audit('Cliente modificato', updated.nome);
      const message = $('#client-msg');
      message.className = 'message';
      message.textContent = 'Scheda cliente salvata.';
      await save();
    };
  }

  document.querySelectorAll('.del').forEach((button) => {
    button.onclick = async () => {
      if (button.dataset.kind === 'prodotti' && db.lotti.some((lot) => lot.prodotto_id === button.dataset.id)) {
        alert('Questo prodotto è collegato a uno o più lotti di magazzino e non può essere eliminato.');
        return;
      }
      if (!confirm('Eliminare definitivamente questo elemento?')) return;
      const removed = db[button.dataset.kind].find((item) => item.id === button.dataset.id);
      db[button.dataset.kind] = db[button.dataset.kind].filter((item) => item.id !== button.dataset.id);
      if (selectedClient === button.dataset.id) selectedClient = '';
      if (selectedProduct === button.dataset.id) selectedProduct = '';
      audit('Elemento eliminato', `${button.dataset.kind}: ${removed?.nome || button.dataset.id}`);
      await save();
      render();
    };
  });

  const movementForm = $('#mov-form');
  if (movementForm) {
    movementForm.onsubmit = async (event) => {
      event.preventDefault();
      try {
        addSale(new FormData(movementForm));
        await save();
        current = 'home';
        render();
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
    };
  }

  const pitForm = $('#pit-form');
  if (pitForm) {
    pitForm.onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(pitForm);
      const message = $('#pit-msg');
      try {
        message.className = 'message';
        message.textContent = 'Salvataggio…';
        addSale(form, true);
        pitazzoDate = String(form.get('data_movimento') || today());
        await save();
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  document.querySelectorAll('[data-client]').forEach((button) => {
    button.onclick = () => {
      const client = db.clienti.find((item) => item.id === button.dataset.client);
      const input = $('#pit-form [name="cliente_nome"]');
      if (client && input) input.value = client.nome;
    };
  });

  document.querySelectorAll('[data-lot]').forEach((button) => {
    button.onclick = () => {
      const lot = lotById(button.dataset.lot);
      const input = $('#pit-form [name="lotto_nome"]');
      if (lot && input) input.value = lotSearchName(lot);
    };
  });

  const pitDate = $('#pit-date');
  if (pitDate) {
    pitDate.onchange = () => {
      pitazzoDate = pitDate.value || today();
      expandedPitLot = '';
      render();
    };
  }

  document.querySelectorAll('[data-expand-lot]').forEach((button) => {
    button.onclick = () => {
      expandedPitLot = expandedPitLot === button.dataset.expandLot ? '' : button.dataset.expandLot;
      render();
    };
  });

  const ticketsDateInput = $('#tickets-date');
  if (ticketsDateInput) {
    ticketsDateInput.onchange = () => {
      ticketsDate = ticketsDateInput.value || today();
      render();
    };
  }

  document.querySelectorAll('[data-generate-day]').forEach((button) => {
    button.onclick = async () => {
      const dateKey = button.dataset.generateDay || pitazzoDate || ticketsDate || today();
      const message = $('#ticket-msg');
      try {
        if (message) {
          message.className = 'message';
          message.textContent = 'Generazione e salvataggio…';
        }
        const records = createTicketRecords(dateKey);
        await save();
        ticketsDate = dateKey;
        current = 'biglietti';
        render();
      } catch (error) {
        if (message) {
          message.className = 'message error';
          message.textContent = `Errore: ${error.message}`;
        } else {
          alert(`Errore: ${error.message}`);
        }
      }
    };
  });

  document.querySelectorAll('[data-print-ticket]').forEach((button) => {
    button.onclick = () => {
      const ticket = db.biglietti.find((item) => item.id === button.dataset.printTicket);
      if (ticket) openTicketPreview([ticket]);
    };
  });

  document.querySelectorAll('[data-print-day]').forEach((button) => {
    button.onclick = () => {
      const tickets = db.biglietti.filter((ticket) => ticket.dateKey === button.dataset.printDay);
      try {
        openTicketPreview(tickets);
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('[data-share-ticket]').forEach((button) => {
    button.onclick = async () => {
      const ticket = db.biglietti.find((item) => item.id === button.dataset.shareTicket);
      if (!ticket) return;
      try {
        await shareTicket(ticket);
      } catch (error) {
        if (error.name !== 'AbortError') alert(`Errore: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('[data-return-sale]').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Confermi il reso? L’importo sarà azzerato e colli/kg torneranno in magazzino.')) return;
      try {
        const ticketDate = markSaleReturned(button.dataset.returnSale);
        createTicketRecords(ticketDate);
        await save();
        ticketsDate = ticketDate;
        current = 'biglietti';
        render();
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
    };
  });

  const memberForm = $('#member-form');
  if (memberForm) {
    memberForm.onsubmit = async (event) => {
      event.preventDefault();
      const email = String(new FormData(memberForm).get('email') || '').trim().toLowerCase();
      const message = $('#access-msg');
      if (!email) return;
      try {
        if (!accessConfig.membri.includes(email) && !accessConfig.amministratori.includes(email)) {
          accessConfig.membri.push(email);
          await setDoc(doc(store, 'accessi', email), {
            email,
            ruolo: 'operatore',
            abilitato: true,
            aggiornatoIl: stamp(),
          });
          await saveAccessConfig();
          audit('Operatore autorizzato', email);
          await save();
        }
        message.className = 'message';
        message.textContent = 'Operatore autorizzato. Ora può accedere con Google.';
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  const adminForm = $('#admin-form');
  if (adminForm) {
    adminForm.onsubmit = async (event) => {
      event.preventDefault();
      const email = String(new FormData(adminForm).get('email') || '').trim().toLowerCase();
      const message = $('#access-msg');
      if (!email) return;
      try {
        accessConfig.membri = accessConfig.membri.filter((item) => item !== email);
        if (!accessConfig.amministratori.includes(email) && email !== OWNER_EMAIL) {
          accessConfig.amministratori.push(email);
          await setDoc(doc(store, 'accessi', email), {
            email,
            ruolo: 'amministratore',
            abilitato: true,
            aggiornatoIl: stamp(),
          });
          await saveAccessConfig();
          audit('Amministratore aggiunto', email);
          await save();
        }
        message.className = 'message';
        message.textContent = 'Amministratore aggiunto.';
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }
}

function startDataSubscription() {
  ensureAppStyles();
  document.body.classList.add('eurofrutta-shell');
  ensureDynamicNav();
  $('#nav').hidden = false;
  $('#user').innerHTML = `${isAdmin() ? '<span title="Amministratore">♛</span> ' : ''}<b>${esc(operatorName())}</b>${isAdmin() ? ' · Amministratore' : ' · Operatore'} <button id="out">Esci</button>`;
  $('#out').onclick = logout;

  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(
    doc(store, 'eurofrutta', 'dati'),
    (snapshot) => {
      const saved = snapshot.exists() ? snapshot.data() : empty();
      db = {
        clienti: Array.isArray(saved.clienti) ? saved.clienti : [],
        prodotti: Array.isArray(saved.prodotti) ? saved.prodotti : [],
        lotti: Array.isArray(saved.lotti) ? saved.lotti : [],
        movimenti: Array.isArray(saved.movimenti) ? saved.movimenti : [],
        biglietti: Array.isArray(saved.biglietti) ? saved.biglietti : [],
        registro: Array.isArray(saved.registro) ? saved.registro : [],
      };
      render();
    },
    (error) => {
      $('#app').innerHTML = `<section class="card"><h2>Accesso ai dati bloccato</h2><p class="message error">${esc(error.message)}</p></section>`;
    },
  );
}

async function initializeUser(user) {
  try {
    const email = userEmail(user);
    const owner = email === OWNER_EMAIL;
    currentAccess = owner ? { ruolo: 'proprietario', abilitato: true } : null;

    if (!owner) {
      const accessSnapshot = await getDoc(doc(store, 'accessi', email));
      currentAccess = accessSnapshot.exists() ? accessSnapshot.data() : null;
    }

    if (!isAuthorized(user)) {
      accessDenied();
      return;
    }

    if (isAdmin(user)) {
      const configRef = doc(store, 'eurofrutta', 'config');
      const configSnapshot = await getDoc(configRef);
      if (!configSnapshot.exists() && owner) {
        accessConfig = { membri: [], amministratori: [] };
        await setDoc(configRef, accessConfig);
      } else {
        const savedConfig = configSnapshot.exists() ? configSnapshot.data() : {};
        accessConfig = {
          membri: Array.isArray(savedConfig.membri) ? savedConfig.membri.map((item) => String(item).toLowerCase()) : [],
          amministratori: Array.isArray(savedConfig.amministratori) ? savedConfig.amministratori.map((item) => String(item).toLowerCase()) : [],
        };
      }
    } else {
      accessConfig = { membri: [], amministratori: [] };
    }

    const profileSnapshot = await getDoc(doc(store, 'profili', user.uid));
    if (!profileSnapshot.exists()) {
      usernameSetup();
      return;
    }
    currentProfile = profileSnapshot.data();
    startDataSubscription();
  } catch (error) {
    $('#nav').hidden = true;
    $('#app').innerHTML = `<section class="card"><h2>Configurazione accesso non riuscita</h2><p class="message error">${esc(error.message)}</p><p>Controlla le regole Firestore e riprova.</p></section>`;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  signedUser = user;
  currentProfile = null;
  currentAccess = null;
  if (!user) {
    accessConfig = { membri: [], amministratori: [] };
    login();
    return;
  }
  await initializeUser(user);
});
