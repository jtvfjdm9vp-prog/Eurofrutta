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

let db = { clienti: [], prodotti: [], lotti: [], movimenti: [], registro: [] };
let accessConfig = { membri: [], amministratori: [] };
let currentAccess = null;
let currentProfile = null;
let current = 'home';
let selectedClient = '';
let selectedProduct = '';
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

const empty = () => ({ clienti: [], prodotti: [], lotti: [], movimenti: [], registro: [] });

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
  return `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario || 'Proprietario non indicato'} · R ${Number(lot.colli_rimanenti || 0)} colli`;
}

function lotOpts(selected = '') {
  const available = db.lotti.filter((lot) => Number(lot.colli_rimanenti) > 0);
  return '<option value="">— scegli lotto —</option>' + available.map((lot) => (
    `<option value="${lot.id}" ${lot.id === selected ? 'selected' : ''}>${esc(lotLabel(lot))}</option>`
  )).join('');
}

function lotById(lotId) {
  return db.lotti.find((lot) => lot.id === lotId);
}

function roundQty(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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
  $('#app').innerHTML = ({ home, pitazzo, movimento, magazzino, prodotti, clienti, vendite, report, registro })[current]();
  bind();
}

function home() {
  const openLots = db.lotti.filter((lot) => Number(lot.colli_rimanenti) > 0);
  const remaining = openLots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti), 0);
  const lowLots = openLots.filter((lot) => Number(lot.colli_rimanenti) <= 10);
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
      <article class="stat"><i>▦</i><div><h3>Magazzino</h3><div class="big">R ${remaining}</div><p>${openLots.length} lotti aperti</p></div></article>
      <article class="stat"><i>◇</i><div><h3>Prodotti</h3><div class="big">${db.prodotti.length}</div><p>In catalogo</p></div></article>
      <article class="stat"><i>!</i><div><h3>In esaurimento</h3><div class="big">${lowLots.length}</div><p>Lotti con 10 colli o meno</p></div></article>
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
          <td>${Number(lot.colli_iniziali || 0)} colli</td>
          <td class="pit-money"><b>R ${Number(lot.colli_rimanenti || 0)}</b></td>
          <td>${Number(lot.colli_rimanenti) <= 10 ? '<span class="warn">In esaurimento</span>' : '<span class="notice">Disponibile</span>'}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="empty">Nessuna merce in magazzino.</td></tr>'}
      </table></div>
    </section>`;
}

function movimento() {
  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">VENDITA SINGOLA</p><h2>Registra vendita</h2></div>
        <button type="button" class="ghost" data-go="magazzino">Devi registrare uno scarico? Apri Magazzino →</button>
      </div>
      <form id="mov-form" class="grid">
        <div><label>Lotto / articolo</label><select name="lotto_id" required>${lotOpts()}</select></div>
        <div><label>Cliente</label><select name="cliente_id" required>${opts(db.clienti)}</select></div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso (kg)</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
        <div><label>&nbsp;</label><button>Salva vendita</button></div>
      </form>
      ${!db.lotti.some((lot) => Number(lot.colli_rimanenti) > 0) ? '<p class="message error">Prima registra uno scarico nella sezione Magazzino.</p>' : ''}
    </section>`;
}

function pitazzo() {
  const date = today();
  const daily = db.movimenti.filter((movement) => movement.tipo === 'uscita' && movement.dateKey === date);
  const dailyClients = [...new Set(daily.map((movement) => movement.cliente_id).filter(Boolean))];
  const recentClients = [...new Set(db.movimenti.slice().reverse().map((movement) => movement.cliente_id).filter(Boolean))].slice(0, 5);
  const recentLots = [...new Set(db.movimenti.slice().reverse().map((movement) => movement.lotto_id).filter(Boolean))]
    .map(lotById)
    .filter((lot) => lot && Number(lot.colli_rimanenti) > 0)
    .slice(0, 6);
  const visibleLots = db.lotti.filter((lot) => (
    Number(lot.colli_rimanenti) > 0 || daily.some((movement) => movement.lotto_id === lot.id)
  ));

  const cell = (clientId, lot) => {
    const movements = daily.filter((movement) => movement.cliente_id === clientId && movement.lotto_id === lot.id);
    if (!movements.length) return '<span class="muted">—</span>';
    const packages = movements.reduce((sum, movement) => sum + Number(movement.colli), 0);
    const weight = movements.reduce((sum, movement) => sum + Number(movement.peso), 0);
    const total = movements.reduce((sum, movement) => sum + Number(movement.totale), 0);
    return `<b>${packages} c.</b><small>${weight} kg · ${eur(total)}</small>`;
  };

  return `
    <section class="pit-title">
      <div>
        <p class="eyebrow">PITAZZO GIORNALIERO</p>
        <h2>Foglio merce di oggi</h2>
        <p>Ogni lotto ha la sua colonna. Le vendite scalano automaticamente la rimanenza.</p>
      </div>
      <div class="date"><small>OGGI</small>${date.split('-').reverse().join('.')}</div>
    </section>
    <section class="pit-entry">
      <div class="quick-head">
        <div class="quick-icon">▤</div>
        <div><h3>Inserimento rapido</h3><p>Scrivi cliente, articolo, colli, peso e prezzo. Fatto.</p></div>
      </div>
      <form id="pit-form" class="pit-form" novalidate>
        <div><label>Cliente</label><select name="cliente_id">${opts(db.clienti)}</select></div>
        <div><label>Lotto / articolo</label><select name="lotto_id">${lotOpts()}</select></div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>
        <button type="submit" ${!db.clienti.length || !db.lotti.some((lot) => Number(lot.colli_rimanenti) > 0) ? 'disabled' : ''}>Salva sul pitazzo →</button>
      </form>
      <p id="pit-msg"></p>
      ${!db.clienti.length ? '<p class="message error">Aggiungi prima almeno un cliente.</p>' : ''}
      ${!db.lotti.some((lot) => Number(lot.colli_rimanenti) > 0) ? '<p class="message error">Non ci sono lotti disponibili. Registra prima uno scarico in Magazzino.</p>' : ''}
      <div class="suggest">
        <span>Suggerimenti rapidi</span>
        <div>${recentClients.map((clientId) => `<button type="button" data-client="${clientId}">♙ ${esc(name('clienti', clientId))}</button>`).join('') || '<span class="muted">Appariranno dopo le prime registrazioni.</span>'}</div>
        <div>${recentLots.map((lot) => `<button type="button" data-lot="${lot.id}">▦ ${esc(lotLabel(lot))}</button>`).join('')}</div>
      </div>
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">OGGI</p><h2>Il pitazzo</h2></div>
        <b>${daily.length} righe · ${eur(daily.reduce((sum, movement) => sum + Number(movement.totale), 0))}</b>
      </div>
      <div class="table-scroll">
        <table class="pit-table">
          <tr><th>Cliente</th>${visibleLots.map((lot) => `<th>${esc(name('prodotti', lot.prodotto_id))}<small>${esc(lot.proprietario)}<br>R ${Number(lot.colli_rimanenti)} colli</small></th>`).join('')}<th>Totale</th></tr>
          ${dailyClients.map((clientId) => {
            const clientMovements = daily.filter((movement) => movement.cliente_id === clientId);
            const total = clientMovements.reduce((sum, movement) => sum + Number(movement.totale), 0);
            return `<tr>
              <td class="pit-client"><b>${esc(name('clienti', clientId))}</b><small>${clientMovements.length} registrazioni</small></td>
              ${visibleLots.map((lot) => `<td>${cell(clientId, lot)}</td>`).join('')}
              <td class="pit-money">${eur(total)}</td>
            </tr>`;
          }).join('') || `<tr><td class="empty" colspan="${visibleLots.length + 2}">Il pitazzo di oggi è vuoto.</td></tr>`}
        </table>
      </div>
    </section>`;
}

function magazzino() {
  const openLots = db.lotti
    .filter((lot) => Number(lot.colli_rimanenti) > 0)
    .slice()
    .reverse();
  const closedLots = db.lotti
    .filter((lot) => Number(lot.colli_rimanenti) <= 0)
    .slice()
    .reverse();
  const totalRemaining = openLots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti), 0);
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
      <div class="date"><small>COLLI DISPONIBILI</small>R ${totalRemaining}</div>
    </section>
    <section class="card">
      <p class="eyebrow">NUOVO SCARICO</p>
      <h2>Registra merce arrivata</h2>
      <form id="load-form" class="grid">
        <div><label>Prodotto *</label><select name="prodotto_id" required>${opts(db.prodotti)}</select></div>
        <div><label>Proprietario / fornitore *</label><input name="proprietario" required list="owners" placeholder="Es. Angelo"><datalist id="owners">${owners.map((owner) => `<option value="${esc(owner)}">`).join('')}</datalist></div>
        <div><label>Colli arrivati *</label><input name="colli" required type="number" min="0.01" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso totale kg</label><input name="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>
        <div><label>Note</label><input name="note" placeholder="Facoltative"></div>
        <div><label>&nbsp;</label><button ${!db.prodotti.length ? 'disabled' : ''}>Registra scarico</button></div>
      </form>
      <p id="load-msg"></p>
      ${!db.prodotti.length ? '<p class="message error">Prima aggiungi almeno un articolo nella sezione Prodotti.</p>' : ''}
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">DISPONIBILE</p><h2>Lotti aperti</h2></div>
        <b>${openLots.length} lotti · R ${totalRemaining} colli</b>
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
  const soldPackages = sales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
  const salesTotal = sales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);

  return `
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">SCHEDA PRODOTTO</p><h2>${esc(product.nome)}</h2></div>
        <button class="ghost" id="close-product">Chiudi scheda</button>
      </div>
      <section class="stats">
        <article class="stat"><i>▦</i><div><h3>Rimanenza</h3><div class="big">R ${remaining}</div><p>${lots.filter((lot) => Number(lot.colli_rimanenti) > 0).length} lotti aperti</p></div></article>
        <article class="stat"><i>↗</i><div><h3>Colli venduti</h3><div class="big">${soldPackages}</div><p>${sales.length} vendite</p></div></article>
        <article class="stat"><i>€</i><div><h3>Totale storico</h3><div class="big">${eur(salesTotal)}</div><p>Valore vendite</p></div></article>
      </section>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">MAGAZZINO</p><h2>Lotti del prodotto</h2></div><b>${lots.length} totali</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data carico</th><th>Proprietario</th><th>Iniziali</th><th>Rimanenza</th></tr>
        ${lots.map((lot) => `<tr><td>${esc(lot.dataCarico || '—')}</td><td>${esc(lot.proprietario || '—')}</td><td>${Number(lot.colli_iniziali || 0)}</td><td class="pit-money">R ${Number(lot.colli_rimanenti || 0)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nessun lotto.</td></tr>'}
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
          <td>${Number(movement.colli || 0)}</td><td>${Number(movement.peso || 0)}</td><td>${eur(movement.prezzo)}</td><td><b>${eur(movement.totale)}</b></td><td>${esc(movement.operatore || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="9" class="empty">Nessuna vendita registrata.</td></tr>'}
      </table></div>
    </section>`;
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

function addSale(form) {
  const lot = lotById(form.get('lotto_id'));
  if (!lot) throw new Error('Scegli un lotto disponibile.');
  const price = Number(form.get('prezzo') || 0);
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  const remaining = Number(lot.colli_rimanenti || 0);
  if (packages <= 0) throw new Error('Inserisci il numero di colli venduti.');
  if (packages > remaining) throw new Error(`Disponibili soltanto ${remaining} colli per questo lotto.`);

  lot.colli_rimanenti = roundQty(remaining - packages);
  lot.peso_rimanente = roundQty(Math.max(0, Number(lot.peso_rimanente || 0) - weight));
  db.movimenti.push({
    id: id(),
    data: stamp(),
    dateKey: today(),
    tipo: 'uscita',
    lotto_id: lot.id,
    prodotto_id: lot.prodotto_id,
    proprietario: lot.proprietario,
    cliente_id: form.get('cliente_id'),
    colli: packages,
    peso: weight,
    prezzo: price,
    totale: price * packages,
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
  });
  audit('Vendita registrata', `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario} · ${packages} colli · cliente ${name('clienti', form.get('cliente_id'))}`);
}

function addLoad(form) {
  const productId = form.get('prodotto_id');
  const owner = String(form.get('proprietario') || '').trim();
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  if (!productId) throw new Error('Scegli il prodotto.');
  if (!owner) throw new Error('Scrivi il proprietario o fornitore.');
  if (packages <= 0) throw new Error('Inserisci i colli arrivati.');

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
  audit('Scarico registrato', `${name('prodotti', productId)} · ${owner} · ${packages} colli`);
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
      const clientId = form.get('cliente_id');
      const lotId = form.get('lotto_id');
      if (!clientId || !lotId) {
        message.className = 'message error';
        message.textContent = 'Scegli prima cliente e lotto.';
        return;
      }
      try {
        message.className = 'message';
        message.textContent = 'Salvataggio…';
        addSale(form);
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
      $('#pit-form [name="cliente_id"]').value = button.dataset.client;
    };
  });

  document.querySelectorAll('[data-lot]').forEach((button) => {
    button.onclick = () => {
      $('#pit-form [name="lotto_id"]').value = button.dataset.lot;
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
