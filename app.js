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
let signedUser = null;
let unsubscribe;

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
    .ticket-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.ticket-card{border:1px solid #dbe4e7;border-radius:16px;background:#fff;padding:18px;box-shadow:0 8px 24px #173b4e0b}.ticket-card h3{margin:4px 0}.ticket-card .ticket-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ticket-card .ticket-actions button{width:auto}
    .price-choice{display:grid;grid-template-columns:1fr 1fr;gap:7px}.price-choice label{margin:0}.price-choice input{position:absolute;opacity:0;pointer-events:none}.price-choice span{display:block;padding:11px 9px;border:1px solid #ccd8dc;border-radius:10px;text-align:center;cursor:pointer;transition:.15s ease}.price-choice input:checked+span{border-color:#16835f;background:#eaf8f2;color:#0d7252;font-weight:800}
    @media(max-width:900px){body.eurofrutta-shell{padding-left:0;padding-bottom:76px}body.eurofrutta-shell #nav{inset:auto 0 0 0;width:100%;height:68px;flex-direction:row;gap:4px;padding:8px 7px;overflow-x:auto;overflow-y:hidden;border-top:1px solid #ffffff20}body.eurofrutta-shell #nav::before,body.eurofrutta-shell #nav::after{display:none}body.eurofrutta-shell #nav button{min-width:76px;flex-direction:column;justify-content:center;gap:2px;padding:6px 8px;font-size:15px}body.eurofrutta-shell #nav button span{font-size:9px}body.eurofrutta-shell #nav button:hover{transform:none}.pit-product-row{grid-template-columns:1fr auto}.pit-product-row .metric{display:none}.pit-simple-title{align-items:flex-start;flex-direction:column}}
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
  addNavButton('magazzino', '▦', 'Magazzino', 'prodotti');
  addNavButton('vendite', '€', 'Vendite', 'report');
  addNavButton('biglietti', '▤', 'Biglietti', 'report');
  addNavButton('registro', '♛', 'Amministrazione');
  const registerButton = $('#nav [data-page="registro"]');
  if (registerButton) registerButton.hidden = !isAdmin();
}

function opts(items, selected = '') {
  return '<option value="">— scegli —</option>' + items.map((item) => (
    `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${esc(item.nome)}</option>`
  )).join('');
}

function lotLabel(lot) {
  const packages = Number(lot.colli_rimanenti || 0);
  const weight = Number(lot.peso_rimanente || 0);
  return `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario || 'Proprietario non indicato'} · R ${packages} colli / ${weight} kg`;
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
  return `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario || 'Provenienza non indicata'}`;
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

function formatDateKey(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(dateKey || '');
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
  $('#out').onclick = () => signOut(auth);
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
  $('#out').onclick = () => signOut(auth);
  $('#app').innerHTML = `
    <section class="card login">
      <div class="mark">EF</div>
      <p class="eyebrow">ACCESSO NON AUTORIZZATO</p>
      <h2>Chiedi l’abilitazione</h2>
      <p>Un amministratore deve prima aggiungere il tuo account Google nella sezione Amministrazione.</p>
      <button id="denied-out" type="button">Esci</button>
    </section>`;
  $('#denied-out').onclick = () => signOut(auth);
}

function render() {
  ensureDynamicNav();
  document.querySelectorAll('#nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === current);
  });
  if (current === 'registro' && !isAdmin()) current = 'home';
  $('#app').innerHTML = ({ home, pitazzo, movimento, magazzino, prodotti, clienti, vendite, biglietti, report, registro })[current]();
  bind();
}

function home() {
  const openLots = db.lotti.filter(lotIsOpen);
  const remaining = openLots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti), 0);
  const remainingKg = openLots.reduce((sum, lot) => sum + Number(lot.peso_rimanente || 0), 0);
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
    <section class="stats">
      <article class="stat"><i>▦</i><div><h3>Magazzino</h3><div class="big">${remainingKg} kg</div><p>R ${remaining} colli · ${openLots.length} lotti</p></div></article>
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
          <td>${formatQty(lot.peso_iniziale)} kg<br><small>${formatQty(lot.colli_iniziali)} colli</small></td>
          <td class="pit-money"><b>R ${formatQty(lot.peso_rimanente)} kg</b><br><small>${formatQty(lot.colli_rimanenti)} colli</small></td>
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
  const dailyLotIds = [...new Set(daily.map((movement) => movement.lotto_id).filter(Boolean))];
  const dailyLots = dailyLotIds.map(lotById).filter(Boolean).sort((a, b) => lotSearchName(a).localeCompare(lotSearchName(b), 'it'));

  return `
    <section class="pit-simple-title">
      <h2>Pitazzo giornaliero</h2>
      <div><label>Giornata visualizzata</label><input id="pit-date" type="date" value="${date}"></div>
    </section>
    <section class="pit-entry">
      <div class="quick-head">
        <div class="quick-icon">▤</div>
        <div><h3>Inserimento rapido</h3><p>Puoi scrivere le prime lettere e scegliere dai suggerimenti.</p></div>
      </div>
      <form id="pit-form" class="pit-form" novalidate>
        <input name="data_movimento" type="hidden" value="${date}">
        <div><label>Cliente</label><input name="cliente_nome" required list="client-suggestions" autocomplete="off" placeholder="Scrivi il cliente…">${clientSuggestions()}</div>
        <div><label>Articolo / provenienza</label><input name="lotto_nome" required list="lot-suggestions" autocomplete="off" placeholder="Scrivi l’articolo…">${lotSuggestions()}</div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" required type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
        <div><label>Tipo prezzo</label><div class="price-choice"><label><input name="unita_prezzo" type="radio" value="kg" checked><span>Al kg</span></label><label><input name="unita_prezzo" type="radio" value="collo"><span>A collo</span></label></div></div>
        <button type="submit" ${!db.clienti.length || !db.lotti.some(lotIsOpen) ? 'disabled' : ''}>Salva sul pitazzo →</button>
      </form>
      <p id="pit-msg"></p>
      ${!db.clienti.length ? '<p class="message error">Aggiungi prima almeno un cliente.</p>' : ''}
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
        <div style="display:flex;align-items:center;gap:12px"><b>${daily.length} vendite · ${eur(daily.reduce((sum, movement) => sum + Number(movement.totale), 0))}</b><button type="button" data-generate-day="${date}">Genera biglietti →</button></div>
      </div>
      <p id="ticket-msg"></p>
      <div class="pit-product-list">${dailyLots.map((lot) => {
        const sales = daily.filter((movement) => movement.lotto_id === lot.id);
        const packages = sales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
        const weight = sales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
        const total = sales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
        const open = expandedPitLot === lot.id;
        return `<article class="pit-product-card ${open ? 'open' : ''}">
          <button type="button" class="pit-product-row" data-expand-lot="${lot.id}">
            <span><strong>${esc(name('prodotti', lot.prodotto_id))} · ${esc(lot.proprietario || '—')}</strong><small>${sales.length} ${sales.length === 1 ? 'cliente/registrazione' : 'registrazioni'} · clicca per i dettagli</small></span>
            <span class="metric"><b>${formatQty(packages)} colli</b><small>venduti</small></span>
            <span class="metric"><b>${formatQty(weight)} kg</b><small>venduti</small></span>
            <span class="metric"><b>${eur(total)}</b><small>importo</small></span>
            <span class="chevron">›</span>
          </button>
          ${open ? `<div class="pit-buyers"><div class="table-scroll"><table>
            <tr><th>Cliente</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Importo</th><th>Operatore</th></tr>
            ${sales.map((sale) => `<tr><td><b>${esc(name('clienti', sale.cliente_id))}</b></td><td>${formatQty(sale.colli)}</td><td>${formatQty(sale.peso)}</td><td>${eur(sale.prezzo)} / ${sale.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(sale.totale)}</b></td><td>${esc(sale.operatore || '—')}</td></tr>`).join('')}
          </table></div></div>` : ''}
        </article>`;
      }).join('') || '<p class="empty">Nessun articolo registrato nella giornata scelta.</p>'}</div>
    </section>`;
}

function magazzino() {
  const openLots = db.lotti
    .filter(lotIsOpen)
    .slice()
    .reverse();
  const closedLots = db.lotti
    .filter((lot) => !lotIsOpen(lot))
    .slice()
    .reverse();
  const totalRemaining = openLots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti), 0);
  const totalRemainingKg = openLots.reduce((sum, lot) => sum + Number(lot.peso_rimanente || 0), 0);
  const owners = [...new Set(db.lotti.map((lot) => lot.proprietario).filter(Boolean))];

  const rows = (lots) => lots.map((lot) => {
    const initial = Number(lot.colli_iniziali || 0);
    const remaining = Number(lot.colli_rimanenti || 0);
    const sold = roundQty(initial - remaining);
    return `<tr>
      <td>${esc(lot.dataCarico || '—')}</td>
      <td><b>${esc(name('prodotti', lot.prodotto_id))}</b></td>
      <td>${esc(lot.proprietario || '—')}</td>
      <td>${initial}</td>
      <td>${sold}</td>
      <td class="pit-money"><b>R ${remaining}</b></td>
      <td>${Number(lot.peso_rimanente || 0)} kg</td>
    </tr>`;
  }).join('');

  return `
    <section class="pit-title">
      <div>
        <p class="eyebrow">MAGAZZINO</p>
        <h2>Rimanenze sempre aggiornate</h2>
        <p>Ogni scarico crea un lotto separato per prodotto e proprietario.</p>
      </div>
      <div class="date"><small>KG DISPONIBILI</small>R ${formatQty(totalRemainingKg)}<small>${formatQty(totalRemaining)} colli</small></div>
    </section>
    <section class="card">
      <p class="eyebrow">NUOVO SCARICO</p>
      <h2>Registra merce arrivata</h2>
      <form id="load-form" class="grid">
        <div><label>Prodotto *</label><select name="prodotto_id" required>${opts(db.prodotti)}</select></div>
        <div><label>Proprietario / fornitore *</label><input name="proprietario" required list="owners" placeholder="Es. Angelo"><datalist id="owners">${owners.map((owner) => `<option value="${esc(owner)}">`).join('')}</datalist></div>
        <div><label>Colli arrivati</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso totale kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Note</label><input name="note" placeholder="Facoltative"></div>
        <div><label>&nbsp;</label><button ${!db.prodotti.length ? 'disabled' : ''}>Registra scarico</button></div>
      </form>
      <p class="muted">Inserisci almeno i colli oppure i kg. Puoi compilare anche entrambi.</p>
      <p id="load-msg"></p>
      ${!db.prodotti.length ? '<p class="message error">Prima aggiungi almeno un articolo nella sezione Prodotti.</p>' : ''}
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">DISPONIBILE</p><h2>Lotti aperti</h2></div>
        <b>${openLots.length} lotti · R ${formatQty(totalRemainingKg)} kg / ${formatQty(totalRemaining)} colli</b>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Carico</th><th>Prodotto</th><th>Proprietario</th><th>Iniziali</th><th>Venduti</th><th>Rimanenza</th><th>Peso rimasto</th></tr>
        ${rows(openLots) || '<tr><td colspan="7" class="empty">Nessun lotto disponibile. Registra il primo scarico.</td></tr>'}
      </table></div>
    </section>
    ${closedLots.length ? `<section class="card">
      <div class="section-head"><div><p class="eyebrow">ARCHIVIO</p><h2>Lotti terminati</h2></div><b>${closedLots.length} chiusi</b></div>
      <div class="table-scroll"><table>
        <tr><th>Carico</th><th>Prodotto</th><th>Proprietario</th><th>Iniziali</th><th>Venduti</th><th>Rimanenza</th><th>Peso rimasto</th></tr>
        ${rows(closedLots)}
      </table></div>
    </section>` : ''}`;
}

function productDetail(product) {
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita' && movement.prodotto_id === product.id).slice().reverse();
  const lots = db.lotti.filter((lot) => lot.prodotto_id === product.id).slice().reverse();
  const remaining = lots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti || 0), 0);
  const remainingKg = lots.reduce((sum, lot) => sum + Number(lot.peso_rimanente || 0), 0);
  const soldPackages = sales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
  const salesTotal = sales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);

  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">SCHEDA PRODOTTO</p><h2>${esc(product.nome)}</h2></div>
        <button class="ghost" id="close-product">Chiudi scheda</button>
      </div>
      <section class="stats">
        <article class="stat"><i>▦</i><div><h3>Rimanenza</h3><div class="big">R ${formatQty(remainingKg)} kg</div><p>${formatQty(remaining)} colli · ${lots.filter(lotIsOpen).length} lotti aperti</p></div></article>
        <article class="stat"><i>↗</i><div><h3>Colli venduti</h3><div class="big">${soldPackages}</div><p>${sales.length} vendite</p></div></article>
        <article class="stat"><i>€</i><div><h3>Totale storico</h3><div class="big">${eur(salesTotal)}</div><p>Valore vendite</p></div></article>
      </section>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">MAGAZZINO</p><h2>Lotti del prodotto</h2></div><b>${lots.length} totali</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data carico</th><th>Proprietario / provenienza</th><th>Iniziali</th><th>Rimanenza</th></tr>
        ${lots.map((lot) => `<tr><td>${esc(lot.dataCarico || '—')}</td><td>${esc(lot.proprietario || '—')}</td><td>${formatQty(lot.peso_iniziale)} kg<br><small>${formatQty(lot.colli_iniziali)} colli</small></td><td class="pit-money">R ${formatQty(lot.peso_rimanente)} kg<br><small>${formatQty(lot.colli_rimanenti)} colli</small></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nessun lotto.</td></tr>'}
      </table></div>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">VENDITE</p><h2>Storico del prodotto</h2></div><b>${sales.length} righe</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Cliente</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th><th>Operatore</th></tr>
        ${sales.map((movement) => `<tr>
          <td>${esc(movement.data)}</td><td>${esc(name('clienti', movement.cliente_id))}</td><td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${Number(movement.colli || 0)}</td><td>${Number(movement.peso || 0)}</td><td>${eur(movement.totale)}</td><td>${esc(movement.operatore || '—')}</td>
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
  const total = history.reduce((sum, movement) => sum + Number(movement.totale), 0);

  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">STORICO CLIENTE</p><h2>Vendite registrate</h2></div>
        <b>${history.length} righe · ${eur(total)}</b>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Articolo</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th></tr>
        ${history.map((movement) => {
          const lot = lotById(movement.lotto_id);
          return `<tr>
            <td>${esc(movement.data)}</td>
            <td><b>${esc(name('prodotti', movement.prodotto_id))}</b></td>
            <td>${esc(lot?.proprietario || movement.proprietario || '—')}</td>
            <td>${movement.colli}</td>
            <td>${movement.peso}</td>
            <td>${eur(movement.totale)}</td>
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
  const total = sales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
  const packages = sales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);

  return `
    <section class="pit-title">
      <div><p class="eyebrow">VENDITE</p><h2>Storico completo</h2><p>Tutte le vendite registrate, separate dalla dashboard.</p></div>
      <div class="date"><small>TOTALE STORICO</small>${eur(total)}</div>
    </section>
    <section class="stats">
      <article class="stat"><i>↗</i><div><h3>Vendite</h3><div class="big">${sales.length}</div><p>Operazioni registrate</p></div></article>
      <article class="stat"><i>▦</i><div><h3>Colli</h3><div class="big">${packages}</div><p>Colli venduti</p></div></article>
      <article class="stat"><i>€</i><div><h3>Valore</h3><div class="big">${eur(total)}</div><p>Totale storico</p></div></article>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">ARCHIVIO</p><h2>Elenco vendite</h2></div><b>${sales.length} righe</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data</th><th>Prodotto</th><th>Proprietario lotto</th><th>Cliente</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Totale</th><th>Operatore</th></tr>
        ${sales.map((movement) => `<tr>
          <td>${esc(movement.data)}</td>
          <td><button class="ghost" data-open-product="${movement.prodotto_id}"><b>${esc(name('prodotti', movement.prodotto_id))}</b></button></td>
          <td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${esc(name('clienti', movement.cliente_id))}</td>
          <td>${formatQty(movement.colli)}</td><td>${formatQty(movement.peso)}</td><td>${eur(movement.prezzo)} / ${movement.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(movement.totale)}</b></td><td>${esc(movement.operatore || '—')}</td>
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
        <p class="eyebrow">${esc(ticket.data)}</p>
        <h3>${esc(ticket.prodotto)} · ${esc(ticket.proprietario)}</h3>
        <p class="muted">${ticketQuantityTitle(ticket)} · ${ticket.righe.length} ${ticket.righe.length === 1 ? 'vendita' : 'vendite'}</p>
        <div class="table-scroll"><table>
          <tr><th>Cliente</th><th>Colli</th><th>Kg</th><th>Importo</th></tr>
          ${ticket.righe.map((sale) => `<tr><td>${esc(sale.cliente)}</td><td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td><td>${Number(sale.peso || 0) ? formatQty(sale.peso) : '—'}</td><td><b>${eur(sale.totale)}</b></td></tr>`).join('')}
        </table></div>
        <p><b>Rimanenza:</b> ${ticket.hasWeightData ? `R ${formatQty(ticket.remainingKg)} kg` : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasPackageData ? `R ${formatQty(ticket.remainingPackages)} colli` : ''}</p>
        <p><b>Lordo ${eur(ticket.gross)}</b> · 10% ${eur(ticket.deduction)} · <b>Netto ${eur(ticket.net)}</b></p>
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
  if (!isAdmin()) return '<section class="card"><h2>Area riservata all’amministratore</h2></section>';
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
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita');
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
  const daySales = db.movimenti.filter((movement) => (
    movement.tipo === 'uscita' && movement.dateKey === dateKey
  ));
  const groups = new Map();

  daySales.forEach((movement) => {
    const key = movement.lotto_id || `${movement.prodotto_id || 'prodotto'}-${movement.proprietario || 'senza-provenienza'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(movement);
  });

  return [...groups.entries()].map(([key, sales]) => {
    const first = sales[0];
    const lot = lotById(first.lotto_id) || {
      id: key,
      prodotto_id: first.prodotto_id,
      proprietario: first.proprietario || '',
      colli_iniziali: 0,
      peso_iniziale: 0,
    };
    const previousSales = db.movimenti.filter((movement) => (
      movement.tipo === 'uscita'
      && movement.lotto_id === first.lotto_id
      && movement.dateKey < dateKey
    ));
    const soldBeforeKg = previousSales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
    const soldBeforePackages = previousSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
    const soldTodayKg = sales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
    const soldTodayPackages = sales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
    const recordedInitialKg = Number(lot.peso_iniziale || 0);
    const recordedInitialPackages = Number(lot.colli_iniziali || 0);
    const startKg = recordedInitialKg > 0 ? Math.max(0, recordedInitialKg - soldBeforeKg) : soldTodayKg;
    const startPackages = recordedInitialPackages > 0
      ? Math.max(0, recordedInitialPackages - soldBeforePackages)
      : soldTodayPackages;
    const gross = roundMoney(sales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0));
    const deduction = Math.floor(((gross * 0.10) + Number.EPSILON) * 10) / 10;

    return {
      lot,
      sales,
      product: name('prodotti', lot.prodotto_id),
      owner: lot.proprietario || 'Provenienza non indicata',
      startKg: roundQty(startKg),
      startPackages: roundQty(startPackages),
      soldTodayKg: roundQty(soldTodayKg),
      soldTodayPackages: roundQty(soldTodayPackages),
      remainingKg: roundQty(Math.max(0, startKg - soldTodayKg)),
      remainingPackages: roundQty(Math.max(0, startPackages - soldTodayPackages)),
      hasPackageData: recordedInitialPackages > 0 || soldTodayPackages > 0,
      hasWeightData: recordedInitialKg > 0 || soldTodayKg > 0,
      gross,
      deduction,
      net: roundMoney(gross - deduction),
    };
  });
}

function createTicketRecords(dateKey) {
  const calculated = dailyTicketData(dateKey);
  if (!calculated.length) throw new Error(`Non ci sono vendite registrate il ${formatDateKey(dateKey)}.`);
  if (!Array.isArray(db.biglietti)) db.biglietti = [];
  const records = calculated.map((ticket) => ({
    id: `${dateKey}-${ticket.lot.id}`,
    dateKey,
    data: formatDateKey(dateKey),
    creatoIl: stamp(),
    creatoDa: operatorName(),
    lotto_id: ticket.lot.id,
    prodotto: ticket.product,
    proprietario: ticket.owner,
    startKg: ticket.startKg,
    startPackages: ticket.startPackages,
    soldTodayKg: ticket.soldTodayKg,
    soldTodayPackages: ticket.soldTodayPackages,
    remainingKg: ticket.remainingKg,
    remainingPackages: ticket.remainingPackages,
    hasPackageData: ticket.hasPackageData,
    hasWeightData: ticket.hasWeightData,
    gross: ticket.gross,
    deduction: ticket.deduction,
    net: ticket.net,
    righe: ticket.sales.map((sale) => ({
      id: sale.id,
      cliente: name('clienti', sale.cliente_id),
      colli: Number(sale.colli || 0),
      peso: Number(sale.peso || 0),
      prezzo: Number(sale.prezzo || 0),
      unita_prezzo: sale.unita_prezzo || (Number(sale.peso || 0) > 0 ? 'kg' : 'collo'),
      totale: Number(sale.totale || 0),
    })),
  }));
  db.biglietti = db.biglietti.filter((ticket) => ticket.dateKey !== dateKey).concat(records);
  audit('Biglietti generati', `${formatDateKey(dateKey)} · ${records.length} biglietti`);
  return records;
}

function ticketQuantityTitle(ticket) {
  const parts = [];
  if (ticket.hasWeightData) parts.push(`${formatQty(ticket.startKg)} KG`);
  if (ticket.hasPackageData) parts.push(`${formatQty(ticket.startPackages)} COLLI`);
  return parts.length ? `R ${parts.join(' / ')}` : 'RIMANENZA';
}

function openTicketPreview(tickets) {
  if (!tickets.length) throw new Error('Non ci sono biglietti da visualizzare.');

  const ticketHtml = tickets.map((ticket, index) => `
    <section class="ticket">
      <header>
        <div><small>SIGNOR / AZIENDA</small><strong>${esc(ticket.proprietario)}</strong></div>
        <div class="ticket-date"><small>DATA</small><strong>${esc(ticket.data)}</strong></div>
      </header>
      <div class="lot-title">${ticketQuantityTitle(ticket)} · ${esc(ticket.prodotto)} · ${esc(ticket.proprietario)}</div>
      <div class="lot-subtitle">Rimanenza iniziale: ${ticket.hasWeightData ? `<b>${formatQty(ticket.startKg)} kg</b>` : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasPackageData ? `<b>${formatQty(ticket.startPackages)} colli</b>` : ''}</div>
      <table>
        <thead><tr><th>Colli</th><th>Cliente</th><th>Peso</th><th>Prezzo</th><th>Importo</th></tr></thead>
        <tbody>${ticket.righe.map((sale) => `<tr>
          <td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td>
          <td>${esc(sale.cliente)}</td>
          <td>${Number(sale.peso || 0) ? `${formatQty(sale.peso)} kg` : '—'}</td>
          <td>${eur(sale.prezzo)} / ${sale.unita_prezzo === 'kg' ? 'kg' : 'collo'}</td>
          <td><b>${eur(sale.totale)}</b></td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="totals">
        <div class="remaining"><span>VENDUTO</span><b>${ticket.hasWeightData ? `${formatQty(ticket.soldTodayKg)} kg` : `${formatQty(ticket.soldTodayPackages)} colli`}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? `${formatQty(ticket.soldTodayPackages)} colli` : ''}</small></div>
        <div class="remaining"><span>RIMANENZA</span><b>${ticket.hasWeightData ? `R ${formatQty(ticket.remainingKg)} kg` : `R ${formatQty(ticket.remainingPackages)} colli`}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? `R ${formatQty(ticket.remainingPackages)} colli` : ''}</small></div>
        <dl>
          <dt>Totale lordo</dt><dd>${eur(ticket.gross)}</dd>
          <dt>10%</dt><dd>− ${eur(ticket.deduction)}</dd>
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
      @page{size:A5 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;background:#eef2f0;color:#172334;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:14px;background:#15334a}.toolbar button{border:0;border-radius:8px;padding:11px 18px;font-weight:700;cursor:pointer}.toolbar .print{background:#35b779;color:#fff}.ticket{width:148mm;min-height:210mm;margin:18px auto;padding:10mm;background:#fff;box-shadow:0 4px 24px #0002;page-break-after:always;display:flex;flex-direction:column}.ticket:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #172334;padding-bottom:7px}header div{display:flex;flex-direction:column}small{color:#6b7788}.ticket-date{text-align:right}.lot-title{margin:13px 0 4px;color:#c43232;font-size:20px;font-weight:800;text-transform:uppercase}.lot-subtitle{margin-bottom:14px;color:#4d5968}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #aab3bc;padding:7px 5px;text-align:left}th{background:#eef2f0;text-transform:uppercase;font-size:10px}th:nth-child(n+3),td:nth-child(n+3){text-align:right}.totals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.remaining{border:2px solid #172334;padding:9px;display:flex;flex-direction:column}.remaining span{font-size:10px;font-weight:700;color:#637082}.remaining b{font-size:19px;margin-top:3px}.remaining small{min-height:14px}dl{grid-column:1/-1;margin:0 0 0 auto;width:64%;display:grid;grid-template-columns:1fr auto;gap:4px 20px;border-top:1px solid #aab3bc;padding-top:9px}dt,dd{margin:0}dd{text-align:right;font-weight:700}.net{margin-top:5px;padding-top:7px;border-top:2px solid #172334;font-size:16px;font-weight:800}footer{margin-top:auto;padding-top:18px;text-align:center;color:#7a8490;font-size:9px}@media print{body{background:#fff}.toolbar{display:none}.ticket{margin:0;padding:0;box-shadow:none;width:auto;min-height:190mm}}
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
    ticket.hasWeightData ? `Rimanenza: ${formatQty(ticket.remainingKg)} kg` : '',
    ticket.hasPackageData ? `Rimanenza: ${formatQty(ticket.remainingPackages)} colli` : '',
  ].filter(Boolean).join(' · ');
  const text = `${ticket.prodotto} · ${ticket.proprietario}\nData ${ticket.data}\n${quantities}\nLordo ${eur(ticket.gross)} · 10% ${eur(ticket.deduction)} · Netto ${eur(ticket.net)}`;
  if (navigator.share) {
    await navigator.share({ title: `Biglietto ${ticket.prodotto}`, text });
    return;
  }
  await navigator.clipboard.writeText(text);
  alert('Riepilogo copiato. Ora puoi incollarlo su WhatsApp o in un messaggio.');
}

function addSale(form) {
  const lot = lotById(form.get('lotto_id')) || findLotByText(form.get('lotto_nome'));
  const client = db.clienti.find((item) => item.id === form.get('cliente_id')) || findClientByText(form.get('cliente_nome'));
  if (!lot) throw new Error('Scegli l’articolo dai suggerimenti.');
  if (!client) throw new Error('Scegli il cliente dai suggerimenti.');
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
  if (Number(lot.colli_iniziali || 0) > 0 && packages > remainingPackages) {
    throw new Error(`Disponibili soltanto ${formatQty(remainingPackages)} colli per questo lotto.`);
  }
  if (Number(lot.peso_iniziale || 0) > 0 && weight > remainingWeight) {
    throw new Error(`Disponibili soltanto ${formatQty(remainingWeight)} kg per questo lotto.`);
  }

  if (Number(lot.colli_iniziali || 0) > 0) lot.colli_rimanenti = roundQty(Math.max(0, remainingPackages - packages));
  if (Number(lot.peso_iniziale || 0) > 0) lot.peso_rimanente = roundQty(Math.max(0, remainingWeight - weight));
  db.movimenti.push({
    id: id(),
    data: formatDateKey(dateKey),
    dateKey,
    tipo: 'uscita',
    lotto_id: lot.id,
    prodotto_id: lot.prodotto_id,
    proprietario: lot.proprietario,
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
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  if (!productId) throw new Error('Scegli il prodotto.');
  if (!owner) throw new Error('Scrivi il proprietario o fornitore.');
  if (packages < 0 || weight < 0) throw new Error('Colli e kg non possono essere negativi.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci almeno i colli arrivati oppure il peso totale in kg.');

  const lot = {
    id: id(),
    dataCarico: stamp(),
    dateKey: today(),
    prodotto_id: productId,
    proprietario: owner,
    colli_iniziali: packages,
    colli_rimanenti: packages,
    peso_iniziale: weight,
    peso_rimanente: weight,
    note: String(form.get('note') || '').trim(),
  };
  db.lotti.push(lot);
  db.movimenti.push({
    id: id(),
    data: stamp(),
    dateKey: today(),
    tipo: 'entrata',
    lotto_id: lot.id,
    prodotto_id: productId,
    proprietario: owner,
    cliente_id: '',
    colli: packages,
    peso: weight,
    prezzo: 0,
    totale: 0,
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
  });
  audit('Scarico registrato', `${name('prodotti', productId)} · ${owner} · ${formatQty(weight)} kg${packages ? ` · ${formatQty(packages)} colli` : ''}`);
}

function formDataObject(form, fields) {
  const data = new FormData(form);
  return Object.fromEntries(fields.map((field) => [field, String(data.get(field) || '').trim()]));
}

function bind() {
  document.querySelectorAll('[data-page],[data-go]').forEach((button) => {
    button.onclick = () => {
      current = button.dataset.page || button.dataset.go;
      render();
    };
  });

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
        addSale(form);
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
  $('#out').onclick = () => signOut(auth);

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
