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
const provider = new GoogleAuthProvider();

let db = { clienti: [], prodotti: [], lotti: [], movimenti: [] };
let current = 'home';
let selectedClient = '';
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

const empty = () => ({ clienti: [], prodotti: [], lotti: [], movimenti: [] });

function ensureMagazzinoNav() {
  const nav = $('#nav');
  if (!nav || nav.querySelector('[data-page="magazzino"]')) return;
  const button = document.createElement('button');
  button.dataset.page = 'magazzino';
  button.innerHTML = '▦ <span>Magazzino</span>';
  nav.insertBefore(button, nav.querySelector('[data-page="prodotti"]'));
}

ensureMagazzinoNav();

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
      <h2>Il tuo lavoro, sempre disponibile.</h2>
      <p>Accedi con il tuo account Google autorizzato per aprire il gestionale.</p>
      <button id="google"><span class="g">G</span> Accedi con Google</button>
      <p id="login-error" class="message error" hidden></p>
    </section>`;

  $('#google').onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const message = $('#login-error');
      message.hidden = false;
      message.textContent = `Accesso non riuscito: ${error.message}`;
    }
  };
}

function render() {
  document.querySelectorAll('#nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === current);
  });
  $('#app').innerHTML = ({ home, pitazzo, movimento, magazzino, prodotti, clienti, report })[current]();
  bind();
}

function home() {
  const sales = db.movimenti.filter((movement) => movement.tipo === 'uscita');
  const total = sales.reduce((sum, movement) => sum + Number(movement.totale), 0);
  const openLots = db.lotti.filter((lot) => Number(lot.colli_rimanenti) > 0);
  const remaining = openLots.reduce((sum, lot) => sum + Number(lot.colli_rimanenti), 0);
  const latest = db.movimenti.slice().reverse().slice(0, 4);

  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">PANORAMICA OPERATIVA</p>
        <h2>Il lavoro,<br><em>sotto controllo.</em></h2>
        <p>Merce, clienti e vendite sempre aggiornati. Apri il gestionale da qualsiasi dispositivo.</p>
        <button data-go="pitazzo">Apri il pitazzo →</button>
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
      <article class="stat"><i>♙</i><div><h3>Clienti</h3><div class="big">${db.clienti.length}</div><p>Registrati</p></div></article>
      <article class="stat"><i>€</i><div><h3>Vendite</h3><div class="big">${eur(total)}</div><p>${sales.length} movimenti</p></div></article>
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">ATTIVITÀ</p><h2>Ultimi movimenti</h2></div>
        <button class="ghost" data-go="report">Vedi riepilogo →</button>
      </div>
      ${latest.map((movement) => `
        <div class="activity-row">
          <i>${movement.tipo === 'uscita' ? '↗' : '↙'}</i>
          <div>
            <b>${esc(name('prodotti', movement.prodotto_id))}</b>
            <small>${esc(movement.data)} · ${esc(movement.tipo)}</small>
          </div>
          <strong>${movement.tipo === 'uscita' ? eur(movement.totale) : `${movement.colli} colli`}</strong>
        </div>`).join('') || '<p class="notice">Inizia dal Pitazzo per registrare le prime vendite.</p>'}
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

function prodotti() {
  return `
    <section class="card">
      <p class="eyebrow">ARCHIVIO</p>
      <h2>Prodotti</h2>
      <form data-add="prodotti" class="grid">
        <div><label>Nome articolo</label><input name="nome" required placeholder="Es. Arance"></div>
        <div><label>&nbsp;</label><button>Aggiungi prodotto</button></div>
      </form>
    </section>
    <section class="card">
      <div class="table-scroll"><table>
        <tr><th>Nome</th><th></th></tr>
        ${db.prodotti.map((product) => `<tr><td><b>${esc(product.nome)}</b></td><td><button class="del" data-kind="prodotti" data-id="${product.id}">Elimina</button></td></tr>`).join('') || '<tr><td colspan="2" class="empty">Nessun prodotto.</td></tr>'}
      </table></div>
    </section>`;
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
            <button class="del" data-kind="clienti" data-id="${item.id}">Elimina</button>
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
            <td><b>${esc(product.nome)}</b></td>
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
  });
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
  });
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

  document.querySelectorAll('[data-add]').forEach((form) => {
    form.onsubmit = async (event) => {
      event.preventDefault();
      const productName = String(new FormData(form).get('nome') || '').trim();
      if (!productName) return;
      db.prodotti.push({ id: id(), nome: productName });
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
      db[button.dataset.kind] = db[button.dataset.kind].filter((item) => item.id !== button.dataset.id);
      if (selectedClient === button.dataset.id) selectedClient = '';
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
}

onAuthStateChanged(auth, (user) => {
  if (unsubscribe) unsubscribe();
  if (!user) {
    login();
    return;
  }

  $('#nav').hidden = false;
  $('#user').innerHTML = `${esc(user.email || '')}<button id="out">Esci</button>`;
  $('#out').onclick = () => signOut(auth);

  unsubscribe = onSnapshot(
    doc(store, 'eurofrutta', 'dati'),
    (snapshot) => {
      const saved = snapshot.exists() ? snapshot.data() : empty();
      db = {
        clienti: Array.isArray(saved.clienti) ? saved.clienti : [],
        prodotti: Array.isArray(saved.prodotti) ? saved.prodotti : [],
        lotti: Array.isArray(saved.lotti) ? saved.lotti : [],
        movimenti: Array.isArray(saved.movimenti) ? saved.movimenti : [],
      };
      render();
    },
    (error) => {
      $('#app').innerHTML = `<section class="card"><h2>Accesso ai dati bloccato</h2><p class="message error">${esc(error.message)}</p></section>`;
    },
  );
});
