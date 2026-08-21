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
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
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

let db = { clienti: [], prodotti: [], lotti: [], movimenti: [], biglietti: [], pagamenti: [], chiusure: [], registro: [] };
let accessConfig = { membri: [], amministratori: [] };
let currentAccess = null;
let currentProfile = null;
let current = 'home';
let selectedClient = '';
let selectedProduct = '';
let pitazzoDate = '';
let expandedPitLot = '';
let ticketsDate = '';
let closingDate = '';
let homeSearch = '';
let expandedHomeProduct = '';
let editingSaleId = '';
let editingTicketId = '';
let returningSaleId = '';
let returnsSearch = '';
let returnsDate = '';
let pitClientDraft = {
  clienteNome: '',
  statoPagamento: 'credito',
  metodoPagamento: 'Contanti',
  ivaModalita: 'nessuna',
  righe: [],
};
let lastPitClientTicket = null;
let adminSessionUnlocked = false;
let signedUser = null;
let unsubscribe;
let presenceUnsubscribe;
let presenceTimer;
let onlineUsers = [];
let presenceSessionActive = false;
let presenceLifecycleBound = false;
let baseDb = null;
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

const empty = () => ({ clienti: [], prodotti: [], lotti: [], movimenti: [], biglietti: [], pagamenti: [], chiusure: [], registro: [] });

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
    .pit-stock-prefix{display:inline-flex;align-items:center;margin:0 9px 6px 0;padding:5px 8px;border-radius:8px;background:#e9f7f1;color:#0d7654;font-size:12px;font-weight:900;letter-spacing:.03em}.pit-live-stock{color:#11704f!important;font-weight:800}
    .pit-product-row .metric{text-align:right}.pit-product-row .chevron{color:#13845e;font-size:20px;transition:transform .2s ease}.pit-product-card.open .chevron{transform:rotate(90deg)}
    .pit-buyers{padding:0 18px 17px;animation:pitOpen .2s ease both}.pit-buyers table{margin:0}
    @keyframes pitOpen{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
    .ticket-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.ticket-card{border:1px solid #dbe4e7;border-radius:16px;background:#fff;padding:18px;box-shadow:0 8px 24px #173b4e0b}.ticket-card h3{margin:4px 0}.ticket-card .ticket-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ticket-card .ticket-actions button{width:auto}.returned{opacity:.65;text-decoration:line-through}.return-badge{display:inline-block;padding:3px 7px;border-radius:999px;background:#fff0e8;color:#a6461c;font-size:10px;font-weight:800;text-decoration:none}
    .price-choice{display:grid;grid-template-columns:1fr 1fr;gap:7px}.price-choice label{margin:0}.price-choice input{position:absolute;opacity:0;pointer-events:none}.price-choice span{display:block;padding:11px 9px;border:1px solid #ccd8dc;border-radius:10px;text-align:center;cursor:pointer;transition:.15s ease}.price-choice input:checked+span{border-color:#16835f;background:#eaf8f2;color:#0d7252;font-weight:800}
    .variant-list{display:grid;gap:10px;margin:15px 0}.variant-row{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:10px;align-items:end;padding:12px;border:1px solid #dce5e7;border-radius:13px;background:#f8fbfa}.variant-row button{width:auto;min-width:44px}.variant-row:first-child [data-remove-variant]{visibility:hidden}.secondary-panel{margin-top:18px;border:1px solid #dce5e7;border-radius:14px;background:#fbfdfc}.secondary-panel summary{padding:16px 18px;cursor:pointer;font-weight:800;color:#116c50}.secondary-panel>div{padding:0 18px 18px}.quality-chip{display:inline-block;margin-top:4px;padding:3px 8px;border-radius:999px;background:#eef6f2;color:#166c51;font-size:11px;font-weight:800}.mobile-nav-toggle,.nav-scrim{display:none}
    .presence-dot{display:inline-block;width:9px;height:9px;margin:0 7px;border-radius:50%;background:#38d37a;box-shadow:0 0 0 0 #38d37a99;animation:presencePulse 1.8s infinite;vertical-align:middle}.presence-dot.offline{background:#e45445;box-shadow:none;animation:none}.presence-list{display:grid;gap:9px}.presence-user{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid #dce7e4;border-radius:12px;background:#f8fcfa}.presence-user.offline{border-color:#efd8d4;background:#fff9f8}.presence-person{display:flex;align-items:center;min-width:0}.presence-person>span:last-child{min-width:0}.presence-person b,.presence-person small{display:block}.presence-person small{margin-top:2px;color:#718093}.presence-times{display:grid;gap:2px;flex:0 0 auto;text-align:right}.presence-times b{font-size:12px}.presence-times small{color:#718093;font-size:11px}.presence-online{color:#11704f}.presence-offline{color:#b33d31}.status-ok{color:#11704f;font-weight:800}.status-missing{color:#ad3b2d;font-weight:800}.status-extra{color:#a26108;font-weight:800}.closing-row input{min-width:105px}.account-negative{color:#b23a2c}.account-positive{color:#11704f}@keyframes presencePulse{0%{box-shadow:0 0 0 0 #38d37a99}70%{box-shadow:0 0 0 7px #38d37a00}100%{box-shadow:0 0 0 0 #38d37a00}}
    .home-welcome{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(250px,360px) minmax(0,1fr);align-items:center;gap:32px;margin:0 0 18px;padding:25px 32px;border:0;border-radius:26px;background:linear-gradient(125deg,#102d3f 0%,#105947 52%,#1f9d69 100%);box-shadow:0 18px 45px #10283b24;overflow:hidden}.home-welcome::before,.home-welcome::after{content:'';position:absolute;z-index:-1;border-radius:50%;filter:blur(2px)}.home-welcome::before{width:330px;height:330px;right:-95px;top:-190px;background:#bdf58b2c}.home-welcome::after{width:220px;height:220px;left:27%;bottom:-185px;background:#ffffff14}.home-brand-logo{display:grid;place-items:center;min-height:116px;padding:0;background:transparent}.home-brand-logo img{display:block;width:100%;height:auto;max-height:128px;object-fit:contain;filter:drop-shadow(0 10px 18px #071b2560)}.home-greeting .eyebrow{color:#a8efcf}.home-greeting h1{margin:4px 0 7px;color:#fff;font-size:clamp(29px,3.3vw,45px);line-height:1.04}.home-greeting h1 em{color:#c7ffad;font-style:normal}.home-greeting p:last-child{margin:0;color:#deefe9;font-size:15px}.home-market-card{padding:22px!important}.home-market-card .section-head{margin-bottom:14px}.home-market-card .section-head h2{margin-bottom:0}.home-market-card .home-market-grid{grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px}.home-market-card .market-product>button{padding:14px}.home-market-card .market-product>button strong{font-size:18px}.home-market-card .market-product>button small{font-size:12px}.home-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}.home-compact-search{position:relative;display:flex;align-items:center;gap:7px;width:min(285px,42vw);min-width:210px;border:1px solid #c8d8d4;border-radius:11px;background:#fff;padding:0 9px;transition:border-color .18s ease,box-shadow .18s ease}.home-compact-search:focus-within{border-color:#159268;box-shadow:0 0 0 4px #15926816}.home-compact-search input{width:100%;min-height:40px;padding:7px 0;border:0;box-shadow:none!important;background:transparent;font-size:13px}.home-compact-search button{width:auto;min-width:30px;min-height:30px;padding:3px;background:transparent;color:#647586}.home-search-results{margin:13px 0 4px;padding:13px;border:1px solid #d9e5e4;border-radius:14px;background:#f6fbf9}.home-search-results:empty{display:none}.search-results-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.search-result-group{padding:14px;border:1px solid #dce7e5;border-radius:14px;background:#fff}.search-result-group h3{margin:0 0 9px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#617386}.search-result{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:5px 0;padding:10px 11px;border:0;border-radius:10px;background:#f4f8f7;color:#173044;text-align:left}.search-result:hover{background:#e8f6f0}.search-result strong{display:block}.search-result small{display:block;color:#6b7b8d;margin-top:2px}.owner-badge{display:inline-flex;align-items:center;padding:7px 10px;border-radius:9px;background:#edf5f2;color:#154f40;font-weight:850}.inventory-product-name{font-size:16px;color:#142b3c}
    .market-table{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.market-product{overflow:hidden;border:1px solid #dce7e4;border-radius:15px;background:#fff}.market-product>button{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px;border:0;background:#fff;color:#173044;text-align:left}.market-product>button:hover{background:#edf9f4}.market-product>button strong{display:block;font-size:20px}.market-product>button small{display:block;margin-top:4px;color:#718093}.market-lots{padding:0 13px 13px}.market-lot{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px;border-top:1px solid #e3ebe9}.market-lot b{display:block}.market-lot small{display:block;color:#718093;margin-top:3px}.market-arrival-qty{color:#102d3f;font-size:15px}.home-price-history{margin:4px 13px 13px;border:1px solid #d7e5e1;border-radius:12px;background:#f5faf8;overflow:hidden}.home-price-history>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;list-style:none;color:#173044;font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.055em;cursor:pointer;transition:background .16s ease}.home-price-history>summary::-webkit-details-marker{display:none}.home-price-history>summary:hover{background:#e9f6f1}.home-price-history>summary::after{content:'+';display:grid;place-items:center;flex:0 0 auto;width:25px;height:25px;border-radius:50%;background:#fff;color:#0d7252;font-size:18px;line-height:1}.home-price-history[open]>summary::after{content:'−'}.home-price-panel{padding:0 10px 10px}.home-price-list{display:grid;gap:8px}.home-price-row{display:grid;gap:4px;min-width:0;padding:10px;border:1px solid #e2ebe8;border-radius:10px;background:#fff;box-shadow:0 3px 10px #173b4e08}.home-price-head{display:grid;gap:2px;min-width:0}.home-price-head strong{color:#0d7252;font-size:14px;line-height:1.25;white-space:normal}.home-price-head time{color:#718093;font-size:10px;font-weight:700}.home-price-client{display:block;min-width:0;color:#1a3142;font-size:12px;line-height:1.3;white-space:normal;word-break:normal}.home-price-detail{display:block;min-width:0;color:#718093;font-size:11px;line-height:1.35;white-space:normal;word-break:normal}.pit-waste-summary{color:#a55c09!important;font-weight:850}.pit-waste-row{background:#fff8eb}.waste-badge{display:inline-flex;padding:4px 7px;border-radius:999px;background:#fff0d5;color:#9a5600;font-size:10px;font-weight:850}.stock-low{color:#a76000;font-weight:850}.stock-ended{color:#a63e31;font-weight:850}.stock-ok{color:#11704f;font-weight:850}.edit-sale{margin-top:12px;padding:14px;border:1px solid #cfe1dc;border-radius:13px;background:#f6fbf9}.edit-sale .grid{margin-top:10px}
    .pit-client-ticket{margin-top:15px;border:2px solid #d6e2df;border-radius:16px;background:#fff;overflow:hidden}.pit-client-bar{display:grid;grid-template-columns:minmax(240px,2fr) 1fr 1fr;gap:12px;padding:16px;background:#f3f8f6;border-bottom:1px solid #dce7e4}.pit-client-bar input{font-size:18px;font-weight:800}.pit-client-label-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.pit-client-label-row button{width:auto;min-height:30px;padding:5px 9px;font-size:11px}.pit-line-form{display:grid;grid-template-columns:minmax(210px,2fr) .7fr .7fr .9fr 1.2fr 1.15fr auto;gap:10px;align-items:end;padding:16px}.pit-line-form button{white-space:nowrap}.pit-keyboard-hint{margin:-3px 16px 13px;padding:9px 11px;border-radius:10px;background:#eef7f3;color:#47675e;font-size:12px}.pit-keyboard-hint kbd{display:inline-block;padding:2px 6px;border:1px solid #c6d8d2;border-bottom-width:2px;border-radius:5px;background:#fff;color:#244c40;font:700 11px/1.3 system-ui}.pit-product-search-wrap{position:relative}.pit-product-results{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:30;max-height:320px;overflow:auto;padding:7px;border:1px solid #cbdad8;border-radius:12px;background:#fff;box-shadow:0 16px 35px #10283b2b}.pit-product-results:empty{display:none}.pit-product-option{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;margin:3px 0;padding:10px;border:0;border-radius:9px;background:#f4f8f7;color:#183044;text-align:left}.pit-product-option:hover,.pit-product-option:focus,.pit-product-option:focus-visible{background:#e6f6ef;outline:3px solid #1592683b}.pit-product-option strong,.pit-product-option small{display:block}.pit-product-option small{margin-top:2px;color:#718093}.pit-product-option>span:last-child{color:#0d7252;text-align:right;font-size:11px;font-weight:800}.pit-draft-wrap{padding:0 16px 16px}.pit-draft-table td,.pit-draft-table th{vertical-align:middle}.pit-draft-table button{width:auto;min-width:38px;padding:7px}.pit-ticket-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 16px;border-top:1px solid #dce7e4;background:#fbfdfc}.pit-ticket-footer>div{display:flex;gap:8px;flex-wrap:wrap}.pit-ticket-total{font-size:20px;color:#0e7352}.vat-pill{display:inline-flex;padding:4px 7px;border-radius:999px;background:#edf3ff;color:#365d99;font-size:10px;font-weight:800}.pit-last-ticket{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px;padding:14px 16px;border:1px solid #aedcc9;border-radius:13px;background:#eaf8f2}.pit-last-ticket strong,.pit-last-ticket small{display:block}.pit-last-ticket small{margin-top:3px;color:#547065}.pit-last-ticket button{width:auto}.client-ticket-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.client-ticket-card{padding:15px;border:1px solid #d9e5e2;border-radius:14px;background:#fbfdfc}.client-ticket-card h3{margin:2px 0 5px}.client-ticket-card p{margin:4px 0}.client-ticket-card button{width:100%;margin-top:10px}.danger-zone{border-color:#efb6ad!important;background:linear-gradient(135deg,#fffafa,#fff4f1)!important}.danger-zone button{background:#b43227}.danger-zone button:hover{background:#92271f}
    .return-modal-backdrop{position:fixed;inset:0;z-index:2500;display:grid;place-items:center;padding:20px;background:#071923a8;backdrop-filter:blur(5px)}.return-modal{width:min(720px,100%);max-height:92dvh;overflow:auto;padding:24px;border:1px solid #ffffff78;border-radius:20px;background:#fff;box-shadow:0 28px 90px #06172180}.return-modal h2{margin:3px 0 8px}.return-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:17px 0;padding:14px;border:1px solid #cce2db;border-radius:14px;background:#f1faf6}.return-summary div{min-width:0}.return-summary small,.return-summary b{display:block}.return-summary small{margin-bottom:3px;color:#68798b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.return-summary b{overflow:hidden;text-overflow:ellipsis}.return-preview{margin:14px 0;padding:13px;border-radius:12px;background:#eaf8f2;color:#145c47;font-weight:750}.return-preview.error{background:#fff0ed;color:#a23e30}.return-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:16px}.return-actions button{width:auto}.return-all{margin-top:8px;width:auto!important}.return-history{margin:10px 0;padding-left:20px;color:#5f7082;font-size:13px}
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
      .pit-client-bar,.pit-line-form{grid-template-columns:1fr}.pit-line-form>div:first-child{grid-column:1/-1}.pit-product-results{position:static;margin-top:6px;max-height:240px}.pit-ticket-footer,.pit-last-ticket{align-items:stretch;flex-direction:column}.pit-ticket-footer>div,.pit-ticket-footer button,.pit-last-ticket button{width:100%}.return-summary{grid-template-columns:1fr}.return-modal{padding:18px}.return-actions{flex-direction:column-reverse}.return-actions button{width:100%}.presence-user{align-items:flex-start}.presence-times{text-align:right}
      .home-welcome{grid-template-columns:1fr;gap:12px;padding:20px}.home-brand-logo{min-height:0;padding:0}.home-brand-logo img{max-width:360px;max-height:108px}.home-greeting{text-align:center}.home-market-card .home-market-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home-top-actions{width:100%;justify-content:stretch}.home-compact-search{width:100%;min-width:0}.home-top-actions>button{width:100%}
    }
    @media(max-width:480px){body.eurofrutta-shell #nav{width:88vw}.ticket-card{padding:14px}.price-choice{grid-template-columns:1fr}.pit-product-row strong{font-size:16px}.home-welcome{padding:16px}.home-brand-logo img{max-height:86px}.home-greeting h1{font-size:29px}.home-market-card{padding:15px!important}.home-market-card .home-market-grid{grid-template-columns:1fr}.presence-user{display:grid;gap:8px}.presence-times{text-align:left;padding-left:23px}}
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
    <button data-page="resi">↩ <span>Resi</span></button>
    <button data-page="biglietti">▥ <span>Biglietti</span></button>
    <button data-page="conti">◉ <span>Conti clienti</span></button>
    <div class="nav-group">Controllo</div>
    <button data-page="chiusura">✓ <span>Chiusura giornata</span></button>
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
  return `${name('prodotti', lot.prodotto_id)}${quality} · ${lot.proprietario || 'Proprietario non indicato'} · ${partitaLabel(lot)} · ${stockState(packages, 'colli')} / ${stockState(weight, 'kg')}`;
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
  return `${name('prodotti', lot.prodotto_id)}${quality} · ${lot.proprietario || 'Provenienza non indicata'} · ${partitaLabel(lot)}`;
}

function partitaLabel(lot) {
  if (!lot) return 'Arrivo';
  const custom = String(lot.partita || '').trim();
  if (custom && !/^P-\d{8}-[A-Z0-9]{4}$/i.test(custom) && !/^scarico\s+\d+$/i.test(custom)) return custom;
  const groups = [...new Set(db.lotti
    .filter((item) => item.prodotto_id === lot.prodotto_id
      && normalized(item.proprietario) === normalized(lot.proprietario)
      && String(item.dateKey || '') === String(lot.dateKey || ''))
    .sort((a, b) => `${a.dateKey || ''}-${a.id}`.localeCompare(`${b.dateKey || ''}-${b.id}`))
    .map((item) => lotGroupId(item)))];
  const position = Math.max(0, groups.indexOf(lotGroupId(lot))) + 1;
  const date = displayDateOnly(lot.dataCarico, lot.dateKey);
  const shortDate = date === '—' ? '' : date.replace(/\/(\d{4})$/, '');
  return `Arrivo${shortDate ? ` ${shortDate}` : ''}${groups.length > 1 ? ` · ${position}°` : ''}`;
}

function lotStatus(lot) {
  const values = [];
  if (Number(lot.colli_iniziali || 0) > 0) values.push(Number(lot.colli_rimanenti || 0));
  if (Number(lot.peso_iniziale || 0) > 0) values.push(Number(lot.peso_rimanente || 0));
  if (values.length && values.every((value) => value <= 0)) return 'terminata';
  const lowPackages = Number(lot.colli_iniziali || 0) > 0 && Number(lot.colli_rimanenti || 0) <= 10;
  const lowWeight = Number(lot.peso_iniziale || 0) > 0 && Number(lot.peso_rimanente || 0) <= 100;
  return lowPackages || lowWeight ? 'bassa' : 'disponibile';
}

function lotStatusHtml(lot) {
  const state = lotStatus(lot);
  if (state === 'terminata') return '<span class="stock-ended">Terminata</span>';
  if (state === 'bassa') return '<span class="stock-low">Sta finendo</span>';
  return '<span class="stock-ok">Disponibile</span>';
}

function lotPrimaryRemaining(lot) {
  if (Number(lot?.colli_iniziali || 0) > 0) return `R ${formatQty(lot.colli_rimanenti)} colli`;
  return `R ${formatQty(lot?.peso_rimanente)} kg`;
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
  if (!query) return null;
  const available = db.lotti.filter(lotIsOpen);
  const exact = available.find((lot) => normalized(lotSearchName(lot)) === query);
  if (exact) return exact;
  const matches = matchingLots(value, 20);
  return matches.length === 1 ? matches[0] : null;
}

function matchingLots(value, limit = 8) {
  const tokens = normalized(value).split(/\s+/).filter(Boolean);
  const lots = db.lotti.filter(lotIsOpen);
  const matches = tokens.length ? lots.filter((lot) => {
    const searchable = normalized([
      name('prodotti', lot.prodotto_id),
      lot.qualita || 'Standard',
      lot.proprietario || '',
      partitaLabel(lot),
      lotSearchName(lot),
    ].join(' '));
    return tokens.every((token) => searchable.includes(token));
  }) : lots;
  return matches
    .sort((left, right) => lotSearchName(left).localeCompare(lotSearchName(right), 'it'))
    .slice(0, limit);
}

function pitProductSearchResults(value) {
  return matchingLots(value).map((lot) => `<button type="button" class="pit-product-option" data-pick-pit-lot="${lot.id}"><span><strong>${esc(name('prodotti', lot.prodotto_id))}${lot.qualita && lot.qualita !== 'Standard' ? ` · ${esc(lot.qualita)}` : ''}</strong><small>${esc(lot.proprietario || 'Provenienza non indicata')} · ${esc(partitaLabel(lot))}</small></span><span>${esc(lotPrimaryRemaining(lot))}</span></button>`).join('');
}

function homeProductStockSummary(product, lots) {
  const tracksPackages = lots.some((lot) => Number(lot.colli_iniziali || 0) > 0);
  const unit = tracksPackages ? 'colli' : 'kg';
  const initial = roundQty(lots.reduce((sum, lot) => (
    sum + Number(tracksPackages ? lot.colli_iniziali : lot.peso_iniziale || 0)
  ), 0));
  const remaining = roundQty(lots.reduce((sum, lot) => (
    sum + Number(tracksPackages ? lot.colli_rimanenti : lot.peso_rimanente || 0)
  ), 0));
  const groups = new Set(lots.map(lotGroupId)).size;
  return {
    headline: tracksPackages
      ? `${formatQty(initial)} ${product.nome}`
      : `${formatQty(initial)} kg ${product.nome}`,
    detail: `${tracksPackages ? 'colli arrivati' : 'arrivo in kg'} · ${stockState(remaining, unit)} · ${groups} ${groups === 1 ? 'arrivo' : 'arrivi'}`,
  };
}

function homeProductPrices(productId, limit = 6) {
  const rows = db.movimenti
    .filter((movement) => movement.tipo === 'uscita'
      && movement.prodotto_id === productId
      && !movement.annullato
      && Number(movement.prezzo || 0) > 0)
    .slice()
    .reverse()
    .slice(0, limit);
  if (!rows.length) return '<p class="muted">Nessun prezzo di vendita ancora registrato.</p>';
  return `<div class="home-price-list">${rows.map((movement) => {
    const lot = lotById(movement.lotto_id);
    const quality = lot?.qualita && lot.qualita !== 'Standard' ? lot.qualita : '';
    const client = name('clienti', movement.cliente_id);
    const description = [quality, movement.proprietario || lot?.proprietario, partitaLabel(lot)]
      .filter((value) => value && value !== '—')
      .join(' · ');
    return `<article class="home-price-row"><div class="home-price-head"><strong>${eur(movement.prezzo)} / ${movement.unita_prezzo === 'collo' ? 'collo' : 'kg'}</strong><time>${esc(displayDateOnly(movement.data, movement.dateKey))}</time></div><b class="home-price-client">Cliente: ${esc(client)}</b><small class="home-price-detail">${esc(description || 'Vendita registrata')}</small></article>`;
  }).join('')}</div>`;
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

function normalizeVatMode(value, legacyPercent = 0) {
  if (value === 'aggiungi' || value === 'compresa') return value;
  return Number(legacyPercent || 0) === 4 ? 'aggiungi' : 'nessuna';
}

function vatModeLabel(value, legacyPercent = 0) {
  const mode = normalizeVatMode(value, legacyPercent);
  if (mode === 'aggiungi') return 'IVA 4% aggiunta';
  if (mode === 'compresa') return 'IVA 4% compresa';
  return 'Senza IVA';
}

function saleAmounts(price, priceUnit, packages, weight, vatMode = 'nessuna') {
  const base = roundMoney(Number(price || 0) * (priceUnit === 'kg' ? Number(weight || 0) : Number(packages || 0)));
  const mode = normalizeVatMode(vatMode);
  if (mode === 'aggiungi') {
    const vat = roundMoney(base * 0.04);
    return { taxable: base, vat, total: roundMoney(base + vat), vatPercent: 4, vatMode: mode };
  }
  if (mode === 'compresa') {
    const taxable = roundMoney(base / 1.04);
    const vat = roundMoney(base - taxable);
    return { taxable, vat, total: base, vatPercent: 4, vatMode: mode };
  }
  return { taxable: base, vat: 0, total: base, vatPercent: 0, vatMode: 'nessuna' };
}

function pitazzoGroupStock(groupLots, dateKey) {
  const lots = groupLots.filter(Boolean);
  const lotIds = new Set(lots.map((lot) => lot.id));
  const pendingRows = (pitClientDraft.righe || []).filter((row) => lotIds.has(row.lotto_id));
  const tracksPackages = lots.some((lot) => Number(lot.colli_iniziali || 0) !== 0);
  const unit = tracksPackages ? 'colli' : 'kg';
  const initial = roundQty(lots.reduce((sum, lot) => sum + Number(tracksPackages ? lot.colli_iniziali : lot.peso_iniziale || 0), 0));
  const savedRemaining = lots.reduce((sum, lot) => sum + Number(tracksPackages ? lot.colli_rimanenti : lot.peso_rimanente || 0), 0);
  const pendingSold = pendingRows.reduce((sum, row) => sum + Number(tracksPackages ? row.colli : row.peso || 0), 0);
  const remaining = roundQty(savedRemaining - pendingSold);
  const isArrival = lots.some((lot) => lot.dateKey === dateKey);
  return {
    headline: `${isArrival ? 'N' : 'R'} ${formatQty(isArrival ? initial : remaining)} ${unit}`,
    remaining: stockState(remaining, unit),
  };
}

function stockState(value, unit) {
  const amount = roundQty(value);
  if (amount < 0) return `−${formatQty(Math.abs(amount))} ${unit}`;
  if (amount === 0) return 'Terminata';
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
  if (amount < 0) return `<span class="warn"><b>−${formatQty(Math.abs(amount))} ${unit}</b></span>`;
  if (amount === 0) return '<span class="stock-ended"><b>Terminata</b></span>';
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

function operatorGreetingName() {
  return String(operatorName() || 'Operatore').trim().split(/\s+/)[0] || 'Operatore';
}

function dayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Buonasera';
  if (hour < 13) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
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

async function logout() {
  adminSessionUnlocked = false;
  try {
    sessionStorage.removeItem('eurofrutta-admin-unlocked');
  } catch (error) {
    // Ignora browser che non rendono disponibile sessionStorage.
  }
  await stopPresence();
  return signOut(auth);
}

async function resetAllBusinessData() {
  if (userEmail() !== OWNER_EMAIL || !adminSessionUnlocked) throw new Error('Solo il proprietario può azzerare i dati.');
  const code = window.prompt('Inserisci il codice amministrazione per azzerare tutti i dati');
  if (code === null) return false;
  if (await sha256(code) !== ADMIN_CODE_HASH) throw new Error('Codice amministrazione errato.');
  if (!window.confirm('Confermi? Verranno eliminati clienti, prodotti, scarichi, vendite, biglietti, pagamenti e registro. Gli account autorizzati resteranno attivi.')) return false;

  const cleanData = empty();
  await setDoc(doc(store, 'eurofrutta', 'dati'), cleanData);
  db = JSON.parse(JSON.stringify(cleanData));
  baseDb = JSON.parse(JSON.stringify(cleanData));
  selectedClient = '';
  selectedProduct = '';
  expandedPitLot = '';
  expandedHomeProduct = '';
  editingSaleId = '';
  editingTicketId = '';
  returningSaleId = '';
  homeSearch = '';
  lastPitClientTicket = null;
  pitClientDraft = {
    clienteNome: '',
    statoPagamento: 'credito',
    metodoPagamento: 'Contanti',
    ivaModalita: 'nessuna',
    righe: [],
  };
  return true;
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
  const dataRef = doc(store, 'eurofrutta', 'dati');
  const local = JSON.parse(JSON.stringify(db));
  const base = JSON.parse(JSON.stringify(baseDb || empty()));
  const keys = ['clienti', 'prodotti', 'lotti', 'movimenti', 'biglietti', 'pagamenti', 'chiusure', 'registro'];
  await runTransaction(store, async (transaction) => {
    const snapshot = await transaction.get(dataRef);
    const remote = snapshot.exists() ? snapshot.data() : empty();
    const merged = {};
    keys.forEach((key) => {
      const baseItems = Array.isArray(base[key]) ? base[key] : [];
      const localItems = Array.isArray(local[key]) ? local[key] : [];
      const remoteItems = Array.isArray(remote[key]) ? remote[key] : [];
      const localIds = new Set(localItems.map((item) => item.id));
      const removedIds = new Set(baseItems.filter((item) => !localIds.has(item.id)).map((item) => item.id));
      const baseMap = new Map(baseItems.map((item) => [item.id, item]));
      const resultMap = new Map(remoteItems.filter((item) => !removedIds.has(item.id)).map((item) => [item.id, item]));
      localItems.forEach((item) => {
        const previous = baseMap.get(item.id);
        if (!previous || JSON.stringify(previous) !== JSON.stringify(item)) resultMap.set(item.id, item);
      });
      merged[key] = [...resultMap.values()];
    });
    transaction.set(dataRef, merged);
  });
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
  const page = ({ home, pitazzo, movimento, magazzino, prodotti, clienti, vendite, resi, biglietti, conti, chiusura, report, registro })[current]();
  $('#app').innerHTML = `${page}${returnSaleDialog()}`;
  bind();
  renderOnlineUsers();
}

function accountForClient(clientId) {
  const sales = db.movimenti
    .filter((movement) => movement.tipo === 'uscita' && movement.cliente_id === clientId && !movement.annullato && ['credito', 'pagato'].includes(movement.stato_pagamento))
    .slice()
    .sort((a, b) => String(a.dateKey || '').localeCompare(String(b.dateKey || '')));
  const payments = (db.pagamenti || []).filter((payment) => payment.cliente_id === clientId && !payment.annullato);
  const purchased = roundMoney(sales.reduce((sum, sale) => sum + Number(sale.totale || 0), 0));
  const paid = roundMoney(payments.reduce((sum, payment) => sum + Number(payment.importo || 0), 0));
  let availablePayments = paid;
  let oldestUnpaid = '';
  sales.forEach((sale) => {
    const covered = Math.min(availablePayments, Number(sale.totale || 0));
    availablePayments -= covered;
    if (!oldestUnpaid && Number(sale.totale || 0) - covered > 0.005) oldestUnpaid = sale.dateKey || '';
  });
  const balance = roundMoney(purchased - paid);
  const days = oldestUnpaid ? Math.max(0, Math.floor((new Date(`${today()}T12:00:00`) - new Date(`${oldestUnpaid}T12:00:00`)) / 86400000)) : 0;
  return { sales, payments, purchased, paid, balance, oldestUnpaid, days };
}

function accountBalanceHtml(account) {
  if (account.balance > 0) return `<b class="account-negative">Da incassare ${eur(account.balance)}</b>${account.oldestUnpaid ? `<br><small>Credito aperto da ${account.days} giorni</small>` : ''}`;
  if (account.balance < 0) return `<b class="account-positive">Credito cliente ${eur(Math.abs(account.balance))}</b>`;
  return '<b class="account-positive">Saldato</b>';
}

function conti() {
  const rows = db.clienti.map((client) => ({ client, account: accountForClient(client.id) }))
    .sort((a, b) => b.account.balance - a.account.balance);
  const totalDue = roundMoney(rows.reduce((sum, row) => sum + Math.max(0, row.account.balance), 0));
  return `
    <section class="pit-title"><div><p class="eyebrow">CONTI CLIENTI</p><h2>Pagamenti e crediti</h2><p>Controlla chi deve ancora pagare e da quanto tempo.</p></div><div class="date"><small>DA INCASSARE</small>${eur(totalDue)}</div></section>
    <section class="card"><div class="table-scroll"><table>
      <tr><th>Cliente</th><th>Acquisti</th><th>Pagamenti</th><th>Situazione</th><th></th></tr>
      ${rows.map(({ client, account }) => `<tr><td><b>${esc(client.nome)}</b></td><td>${eur(account.purchased)}</td><td>${eur(account.paid)}</td><td>${accountBalanceHtml(account)}</td><td><button class="ghost" data-account-client="${client.id}">Apri conto</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nessun cliente registrato.</td></tr>'}
    </table></div></section>`;
}

function closingStatus(diff, unit) {
  if (Math.abs(diff) < 0.005) return '<span class="status-ok">0</span>';
  return diff < 0
    ? `<span class="status-missing">−${formatQty(Math.abs(diff))} ${unit}</span>`
    : `<span class="status-extra">+${formatQty(diff)} ${unit}</span>`;
}

function savedClosing(dateKey) {
  return (db.chiusure || []).find((closing) => closing.dateKey === dateKey);
}

function currentClosingRows() {
  return db.lotti.filter((lot) => Number(lot.colli_rimanenti || 0) !== 0 || Number(lot.peso_rimanente || 0) !== 0).map((lot) => ({
    lotto_id: lot.id,
    prodotto: name('prodotti', lot.prodotto_id),
    proprietario: lot.proprietario || '',
    qualita: lot.qualita || 'Standard',
    expectedColli: roundQty(Number(lot.colli_rimanenti || 0)),
    expectedKg: roundQty(Number(lot.peso_rimanente || 0)),
    tracksColli: Number(lot.colli_iniziali || 0) > 0,
    tracksKg: Number(lot.peso_iniziale || 0) > 0,
  }));
}

function chiusura() {
  const date = closingDate || today();
  const closing = savedClosing(date);
  const rows = closing?.righe || currentClosingRows();
  return `
    <section class="pit-simple-title"><h2>Chiusura giornata</h2><div><label>Giornata</label><input id="closing-date" type="date" value="${date}"></div></section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">CONTA DI FINE GIORNATA</p><h2>Rimanenze attese e rimanenze contate</h2></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ghost" data-print-closing="${date}" ${closing ? '' : 'disabled'}>Stampa / salva PDF</button></div></div>
      <p class="muted">Gli operai scrivono la quantità contata. Il programma mostra subito merce mancante o in eccedenza.</p>
      <form id="closing-form" data-date="${date}"><div class="table-scroll"><table>
        <tr><th>Articolo</th><th>Fornitore</th><th>Pezzatura</th><th>Attesi colli</th><th>Contati colli</th><th>Attesi kg</th><th>Contati kg</th><th>Differenza</th></tr>
        ${rows.map((row) => {
          const actualColli = row.actualColli ?? row.expectedColli;
          const actualKg = row.actualKg ?? row.expectedKg;
          const status = [row.tracksColli ? closingStatus(Number(actualColli) - Number(row.expectedColli), 'colli') : '', row.tracksKg ? closingStatus(Number(actualKg) - Number(row.expectedKg), 'kg') : ''].filter(Boolean).join('<br>');
          return `<tr class="closing-row" data-closing-lot="${row.lotto_id}"><td><b>${esc(row.prodotto)}</b></td><td>${esc(row.proprietario || '—')}</td><td>${esc(row.qualita || 'Standard')}</td><td>${row.tracksColli ? formatQty(row.expectedColli) : '—'}</td><td>${row.tracksColli ? `<input name="colli_${row.lotto_id}" type="number" step="0.01" value="${actualColli}">` : '—'}</td><td>${row.tracksKg ? formatQty(row.expectedKg) : '—'}</td><td>${row.tracksKg ? `<input name="kg_${row.lotto_id}" type="number" step="0.01" value="${actualKg}">` : '—'}</td><td>${status}</td></tr>`;
        }).join('') || '<tr><td colspan="8" class="empty">Non ci sono rimanenze da contare.</td></tr>'}
      </table></div><div style="margin-top:16px"><button ${rows.length ? '' : 'disabled'}>Salva chiusura</button></div></form><p id="closing-msg"></p>
      ${closing ? `<p class="notice">Chiusura salvata da ${esc(closing.operatore || '—')} il ${esc(closing.salvataIl || '')}.</p>` : ''}
    </section>`;
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
    name('prodotti', lot.prodotto_id), lot.proprietario, lot.qualita, lot.partita, lot.note,
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
    ${group('Magazzino e fornitori', lots.map((lot) => `<button type="button" class="search-result" data-search-product="${lot.prodotto_id}"><span><strong>${esc(name('prodotti', lot.prodotto_id))}${lot.qualita && lot.qualita !== 'Standard' ? ` · ${esc(lot.qualita)}` : ''}</strong><small>Fornitore: ${esc(lot.proprietario || '—')} · ${esc(partitaLabel(lot))} · ${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</small></span><b>›</b></button>`))}
    ${group('Vendite e movimenti', movements.map((movement) => `<button type="button" class="search-result" data-search-product="${movement.prodotto_id}"><span><strong>${esc(name('prodotti', movement.prodotto_id))} · ${esc(name('clienti', movement.cliente_id))}</strong><small>${esc(displayDateOnly(movement.data, movement.dateKey))} · ${formatQty(movement.colli)} colli · ${formatQty(movement.peso)} kg</small></span><b>›</b></button>`))}
  </div>`;
}

function home() {
  const openLots = db.lotti.filter(lotIsOpen);
  const marketProducts = db.prodotti.map((product) => ({
    product,
    lots: openLots.filter((lot) => lot.prodotto_id === product.id),
  })).filter((entry) => entry.lots.length).sort((a, b) => a.product.nome.localeCompare(b.product.nome, 'it'));

  return `
    <section class="home-welcome">
      <div class="home-brand-logo">
        <img src="logo-eurofrutta.png" alt="Eurofrutta · Commercio Ingrosso Frutta e Verdura">
      </div>
      <div class="home-greeting">
        <p class="eyebrow">EUROFRUTTA</p>
        <h1>${dayGreeting()}, <em>${esc(operatorGreetingName())}</em>.</h1>
        <p>Ecco la merce disponibile oggi.</p>
      </div>
    </section>
    <section class="card home-market-card">
      <div class="section-head">
        <div><p class="eyebrow">TAVOLO MERCE</p><h2>Cosa abbiamo oggi</h2></div>
        <div class="home-top-actions">
          <div class="home-compact-search"><span aria-hidden="true">⌕</span><input id="global-search" type="search" value="${esc(homeSearch)}" placeholder="Cerca prodotto, fornitore, cliente…" autocomplete="off"><button id="clear-global-search" type="button" aria-label="Cancella ricerca">×</button></div>
          <button class="ghost" data-go="magazzino">Apri magazzino →</button>
        </div>
      </div>
      <div class="market-table home-market-grid">${marketProducts.map(({ product, lots }) => {
        const open = expandedHomeProduct === product.id;
        const summary = homeProductStockSummary(product, lots);
        return `<article class="market-product"><button type="button" data-home-product="${product.id}" aria-expanded="${open}"><span><strong>${esc(summary.headline)}</strong><small>${esc(summary.detail)}</small></span><b>${open ? '⌃' : '⌄'}</b></button>${open ? `<div class="market-lots">${lots.map((lot) => `<div class="market-lot"><span><span class="market-arrival-qty">${initialLotQuantity(lot)}</span><b>${esc(lot.qualita || 'Standard')} · ${esc(lot.proprietario || '—')}</b><small>${esc(partitaLabel(lot))}</small></span><span>${remainingLotQuantity(lot)}<br>${lotStatusHtml(lot)}</span></div>`).join('')}</div><details class="home-price-history"><summary>Ultimi prezzi praticati</summary><div class="home-price-panel">${homeProductPrices(product.id)}</div></details>` : ''}</article>`;
      }).join('') || '<p class="empty">Nessuna merce disponibile.</p>'}</div>
      <div id="global-search-results" class="home-search-results">${homeSearch.trim() ? globalSearchResults(homeSearch) : ''}</div>
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
        <div><label>IVA</label><select name="iva_modalita"><option value="nessuna">Senza IVA</option><option value="aggiungi">Aggiungi IVA 4%</option><option value="compresa">Prezzo già IVA compresa</option></select></div>
        <div><label>Pagamento</label><select name="stato_pagamento"><option value="credito">Da pagare / a credito</option><option value="pagato">Pagato subito</option></select></div>
        <div><label>Metodo</label><select name="metodo_pagamento"><option>Contanti</option><option>Bonifico</option><option>Carta</option><option>Altro</option></select></div>
        <div><label>&nbsp;</label><button>Salva vendita</button></div>
      </form>
      ${!db.lotti.some(lotIsOpen) ? '<p class="message error">Prima registra uno scarico nella sezione Magazzino.</p>' : ''}
    </section>`;
}

function pitazzo() {
  const date = pitazzoDate || today();
  const daily = db.movimenti.filter((movement) => ['uscita', 'scarto'].includes(movement.tipo) && movement.dateKey === date);
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
  const activeDaily = daily.filter((movement) => movement.tipo === 'uscita' && !movement.annullato);
  const dailyWaste = daily.filter((movement) => movement.tipo === 'scarto' && !movement.annullato);
  const draftRows = Array.isArray(pitClientDraft.righe) ? pitClientDraft.righe : [];
  const draftTotal = roundMoney(draftRows.reduce((sum, row) => sum + Number(row.totale || 0), 0));
  const currentVatMode = normalizeVatMode(pitClientDraft.ivaModalita);
  const lastClientTicket = lastPitClientTicket?.dateKey === date
    ? clientTicketData(date, lastPitClientTicket.clientId)
    : null;

  return `
    <section class="pit-simple-title">
      <h2>Pitazzo giornaliero</h2>
      <div><label>Giornata visualizzata</label><input id="pit-date" type="date" value="${date}"></div>
    </section>
    <section class="pit-entry">
      <div class="quick-head">
        <div class="quick-icon">▤</div>
        <div><h3>Biglietto cliente</h3><p>Scrivi il cliente una sola volta, poi aggiungi tutte le righe della sua spesa.</p></div>
      </div>
      <div class="pit-client-ticket">
        <div class="pit-client-bar">
          <div><div class="pit-client-label-row"><label>Cliente attivo *</label><button type="button" class="ghost" data-new-pit-client>Cambia cliente</button></div><input id="pit-client-name" value="${esc(pitClientDraft.clienteNome)}" required list="client-suggestions" autocomplete="off" placeholder="Scrivi il cliente…">${clientSuggestions()}</div>
          <div><label>Pagamento</label><select id="pit-payment-status"><option value="credito" ${pitClientDraft.statoPagamento !== 'pagato' ? 'selected' : ''}>Da pagare / a credito</option><option value="pagato" ${pitClientDraft.statoPagamento === 'pagato' ? 'selected' : ''}>Pagato subito</option></select></div>
          <div><label>Metodo</label><select id="pit-payment-method"><option ${pitClientDraft.metodoPagamento === 'Contanti' ? 'selected' : ''}>Contanti</option><option ${pitClientDraft.metodoPagamento === 'Bonifico' ? 'selected' : ''}>Bonifico</option><option ${pitClientDraft.metodoPagamento === 'Carta' ? 'selected' : ''}>Carta</option><option ${pitClientDraft.metodoPagamento === 'Altro' ? 'selected' : ''}>Altro</option></select></div>
        </div>
        <form id="pit-line-form" class="pit-line-form" novalidate>
        <div><label>Cerca articolo / provenienza</label><div class="pit-product-search-wrap"><input id="pit-product-search" name="lotto_nome" required autocomplete="off" placeholder="Scrivi prodotto, qualità o fornitore…"><div id="pit-product-results" class="pit-product-results"></div></div></div>
        <div><label>Colli</label><input name="colli" type="number" min="0" step="1" placeholder="0" inputmode="decimal"></div>
        <div><label>Peso kg</label><input name="peso" type="number" min="0" step="1" placeholder="0" inputmode="decimal"></div>
        <div><label>Prezzo unitario</label><input name="prezzo" required type="number" min="0" step="1" placeholder="0,00" inputmode="decimal"></div>
        <div><label>Tipo prezzo</label><div class="price-choice"><label><input name="unita_prezzo" type="radio" value="kg" checked><span>Al kg</span></label><label><input name="unita_prezzo" type="radio" value="collo"><span>A collo</span></label></div></div>
        <div><label>IVA della riga</label><select id="pit-vat-mode" name="iva_modalita"><option value="nessuna" ${currentVatMode === 'nessuna' ? 'selected' : ''}>Senza IVA</option><option value="aggiungi" ${currentVatMode === 'aggiungi' ? 'selected' : ''}>Aggiungi IVA 4%</option><option value="compresa" ${currentVatMode === 'compresa' ? 'selected' : ''}>IVA già compresa</option></select></div>
        <button type="submit" ${!db.lotti.some(lotIsOpen) ? 'disabled' : ''}>+ Aggiungi riga</button>
        </form>
        <p class="pit-keyboard-hint"><kbd>Invio</kbd> passa al campo successivo · <kbd>↑</kbd> <kbd>↓</kbd> sceglie l’articolo · <kbd>Spazio</kbd> o <kbd>Invio</kbd> conferma il riquadro selezionato.</p>
        ${draftRows.length ? `<div class="pit-draft-wrap"><div class="table-scroll"><table class="pit-draft-table"><tr><th>Colli / kg</th><th>Articolo</th><th>Prezzo</th><th>IVA</th><th>Totale</th><th></th></tr>${draftRows.map((row) => `<tr><td><b>${row.colli ? `${formatQty(row.colli)} colli` : ''}${row.colli && row.peso ? '<br>' : ''}${row.peso ? `${formatQty(row.peso)} kg` : ''}</b></td><td><b>${esc(row.articolo)}</b><br><small>${esc(row.proprietario)} · ${esc(row.qualita || 'Standard')}</small></td><td>${eur(row.prezzo)} / ${row.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><span class="vat-pill">${esc(vatModeLabel(row.iva_modalita))}</span></td><td><b>${eur(row.totale)}</b></td><td><button type="button" class="ghost" data-remove-pit-row="${row.id}" aria-label="Elimina riga">×</button></td></tr>`).join('')}</table></div></div>` : '<p class="empty" style="margin:12px 16px">Aggiungi il primo articolo al biglietto.</p>'}
        <div class="pit-ticket-footer"><b class="pit-ticket-total">Totale biglietto: ${eur(draftTotal)}</b><div><button type="button" class="ghost" data-clear-pit-draft ${draftRows.length ? '' : 'disabled'}>Svuota</button><button type="button" id="save-pit-ticket" ${draftRows.length ? '' : 'disabled'}>Registra tutto sul Pitazzo →</button></div></div>
      </div>
      <p id="pit-msg"></p>
      ${lastClientTicket ? `<div class="pit-last-ticket"><div><strong>✓ Biglietto di ${esc(lastClientTicket.cliente.nome)} registrato</strong><small>${lastClientTicket.rows.length} ${lastClientTicket.rows.length === 1 ? 'articolo' : 'articoli'} · totale ${eur(lastClientTicket.totale)}. Il cliente resta attivo per inserire altre righe.</small></div><button type="button" data-print-client-ticket="${lastClientTicket.clientId}" data-ticket-date="${date}">Stampa biglietto cliente</button></div>` : ''}
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
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><b>${activeDaily.length} vendite · ${eur(activeDaily.reduce((sum, movement) => sum + Number(movement.totale), 0))}${dailyWaste.length ? ` · ${dailyWaste.length} lavorati/scartati` : ''}</b><button type="button" data-generate-day="${date}">Genera biglietti →</button></div>
      </div>
      <p id="ticket-msg"></p>
      <div class="pit-product-list">${groupedSales.map(([groupId, sales]) => {
        const firstLot = lotById(sales[0]?.lotto_id);
        const groupLots = lotsInGroup(groupId);
        const activeSales = sales.filter((movement) => movement.tipo === 'uscita' && !movement.annullato);
        const wasteRows = sales.filter((movement) => movement.tipo === 'scarto' && !movement.annullato);
        const packages = activeSales.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
        const weight = activeSales.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
        const total = activeSales.reduce((sum, movement) => sum + Number(movement.totale || 0), 0);
        const wastePackages = wasteRows.reduce((sum, movement) => sum + Number(movement.colli || 0), 0);
        const wasteWeight = wasteRows.reduce((sum, movement) => sum + Number(movement.peso || 0), 0);
        const open = expandedPitLot === groupId;
        const qualities = [...new Set(groupLots.map((lot) => lot.qualita).filter((value) => value && value !== 'Standard'))];
        const stock = pitazzoGroupStock(groupLots.length ? groupLots : [firstLot], date);
        return `<article class="pit-product-card ${open ? 'open' : ''}">
          <button type="button" class="pit-product-row" data-expand-lot="${groupId}">
            <span><span class="pit-stock-prefix">${esc(stock.headline)}</span><strong>${esc(name('prodotti', firstLot?.prodotto_id))} · ${esc(firstLot?.proprietario || '—')}</strong><small class="pit-live-stock">Rimanenza aggiornata: ${esc(stock.remaining)}</small>${wasteRows.length ? `<small class="pit-waste-summary">Lavorati/scartati: ${wastePackages ? `${formatQty(wastePackages)} colli` : ''}${wastePackages && wasteWeight ? ' · ' : ''}${wasteWeight ? `${formatQty(wasteWeight)} kg` : ''}</small>` : ''}<small>${activeSales.length} ${activeSales.length === 1 ? 'vendita' : 'vendite'}${wasteRows.length ? ` · ${wasteRows.length} ${wasteRows.length === 1 ? 'lavorazione/scarto' : 'lavorazioni/scarti'}` : ''} · clicca per i dettagli</small>${qualities.length ? `<span class="quality-chip">${qualities.map(esc).join(' · ')}</span>` : ''}</span>
            <span class="metric"><b>${formatQty(packages)} colli</b><small>venduti</small></span>
            <span class="metric"><b>${formatQty(weight)} kg</b><small>venduti</small></span>
            <span class="metric"><b>${eur(total)}</b><small>importo</small></span>
            <span class="chevron">›</span>
          </button>
          ${open ? `<div class="pit-buyers"><div class="table-scroll"><table>
            <tr><th>Descrizione</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Importo</th><th>Operatore</th><th>Azione</th></tr>
            ${sales.map((sale) => { const saleLot = lotById(sale.lotto_id); if (sale.tipo === 'scarto') return `<tr class="pit-waste-row"><td><b>LAVORATI / SCARTO</b>${saleLot?.qualita && saleLot.qualita !== 'Standard' ? `<br><small>${esc(saleLot.qualita)}</small>` : ''}${sale.note ? `<br><small>${esc(sale.note)}</small>` : ''}</td><td>${formatQty(sale.colli)}</td><td>${formatQty(sale.peso)}</td><td>—</td><td>—</td><td>${esc(sale.operatore || '—')}</td><td><span class="waste-badge">SCARTO</span></td></tr>`; return `<tr class="${sale.annullato ? 'returned' : ''}"><td><b>${esc(name('clienti', sale.cliente_id))}</b>${saleLot?.qualita && saleLot.qualita !== 'Standard' ? `<br><small>${esc(saleLot.qualita)}</small>` : ''}${saleReturnBadge(sale)}</td><td>${formatQty(sale.colli)}</td><td>${formatQty(sale.peso)}</td><td>${eur(sale.prezzo)} / ${sale.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(sale.totale)}</b></td><td>${esc(sale.operatore || '—')}</td><td>${sale.annullato ? '<span class="return-badge">CHIUSA</span>' : `<button type="button" class="ghost" data-return-sale="${sale.id}">Reso</button>`}</td></tr>`; }).join('')}
          </table></div></div>` : ''}
        </article>`;
      }).join('') || '<p class="empty">Nessun articolo registrato nella giornata scelta.</p>'}</div>
    </section>`;
}

function addPitDraftRow(form) {
  const clientName = String($('#pit-client-name')?.value || '').trim();
  const lot = findLotByText(form.get('lotto_nome'));
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  const price = Number(form.get('prezzo') || 0);
  const priceUnit = form.get('unita_prezzo') === 'collo' ? 'collo' : 'kg';
  const vatMode = normalizeVatMode(form.get('iva_modalita'));
  if (clientName.length < 2) throw new Error('Scrivi prima il nome del cliente in alto.');
  if (!lot) throw new Error('Scrivi l’articolo e scegli il risultato corretto. Se ne resta uno solo puoi premere Invio.');
  if (packages < 0 || weight < 0) throw new Error('Colli e kg non possono essere negativi.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci i colli venduti, i kg oppure entrambi.');
  if (Number(lot.colli_iniziali || 0) > 0 && packages <= 0) throw new Error('Questa partita richiede anche i colli.');
  if (Number(lot.peso_iniziale || 0) > 0 && weight <= 0) throw new Error('Questa partita richiede anche i kg.');
  if (priceUnit === 'kg' && weight <= 0) throw new Error('Per il prezzo al kg devi inserire i kg venduti.');
  if (priceUnit === 'collo' && packages <= 0) throw new Error('Per il prezzo a collo devi inserire i colli venduti.');
  const amounts = saleAmounts(price, priceUnit, packages, weight, vatMode);
  pitClientDraft = {
    clienteNome: clientName,
    statoPagamento: $('#pit-payment-status')?.value === 'pagato' ? 'pagato' : 'credito',
    metodoPagamento: String($('#pit-payment-method')?.value || 'Contanti'),
    ivaModalita: vatMode,
    righe: [...(pitClientDraft.righe || []), {
      id: id(),
      lotto_id: lot.id,
      articolo: name('prodotti', lot.prodotto_id),
      proprietario: lot.proprietario || '',
      qualita: lot.qualita || 'Standard',
      colli: packages,
      peso: weight,
      prezzo: price,
      unita_prezzo: priceUnit,
      iva_modalita: vatMode,
      imponibile: amounts.taxable,
      iva: amounts.vat,
      totale: amounts.total,
    }],
  };
}

function commitPitClientDraft(dateKey) {
  const rows = Array.isArray(pitClientDraft.righe) ? pitClientDraft.righe : [];
  if (!rows.length) throw new Error('Aggiungi almeno un articolo al biglietto.');
  if (String(pitClientDraft.clienteNome || '').trim().length < 2) throw new Error('Scrivi il nome del cliente.');
  const backup = JSON.parse(JSON.stringify(db));
  const results = [];
  try {
    rows.forEach((row) => {
      const values = {
        lotto_id: row.lotto_id,
        cliente_nome: pitClientDraft.clienteNome,
        colli: row.colli,
        peso: row.peso,
        prezzo: row.prezzo,
        unita_prezzo: row.unita_prezzo,
        iva_modalita: row.iva_modalita,
        stato_pagamento: pitClientDraft.statoPagamento,
        metodo_pagamento: pitClientDraft.metodoPagamento,
        data_movimento: dateKey,
      };
      results.push(addSale({ get: (key) => values[key] }, true));
    });
  } catch (error) {
    db = backup;
    throw error;
  }
  pitClientDraft = {
    clienteNome: pitClientDraft.clienteNome,
    statoPagamento: pitClientDraft.statoPagamento,
    metodoPagamento: pitClientDraft.metodoPagamento,
    ivaModalita: normalizeVatMode(pitClientDraft.ivaModalita),
    righe: [],
  };
  return results;
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
        <p>Un solo arrivo può contenere più pezzature dello stesso articolo.</p>
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
        <div><label>Nome dell’arrivo (facoltativo)</label><input name="partita" placeholder="Es. Porro mattina"></div>
        <div><label>Tipo di biglietto</label><select name="provvigione_percentuale"><option value="0">Normale · nessuna trattenuta</option><option value="10" selected>Normale · trattenuta 10%</option><option value="12">Padronale · provvigione 12%</option></select></div>
        <div><label>Note generali</label><input name="note" placeholder="Facoltative"></div>
        </div>
        <div class="section-head" style="margin-top:18px"><div><p class="eyebrow">PEZZATURE</p><h3>Colli e peso per descrizione</h3></div><button type="button" class="ghost" data-add-variant>+ Aggiungi pezzatura</button></div>
        <div class="variant-list" id="variant-list">${loadVariantRow()}</div>
        <button ${!db.prodotti.length ? 'disabled' : ''}>Registra tutto l’arrivo</button>
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
    <details class="secondary-panel">
      <summary>Correggi una pezzatura senza creare una falsa vendita</summary>
      <div>
        <p class="muted">Sposta colli o kg tra due pezzature dello stesso prodotto, per esempio da Fiorone a Doppia prima. La correzione resta nel registro.</p>
        <form id="correction-form" class="grid">
          <div><label>Data *</label><input name="data_movimento" required type="date" value="${today()}"></div>
          <div><label>Da pezzatura *</label><select name="origine_id" required><option value="">— scegli —</option>${db.lotti.map((lot) => `<option value="${lot.id}">${esc(lotLabel(lot))}</option>`).join('')}</select></div>
          <div><label>A pezzatura *</label><select name="destinazione_id" required><option value="">— scegli —</option>${db.lotti.map((lot) => `<option value="${lot.id}">${esc(lotLabel(lot))}</option>`).join('')}</select></div>
          <div><label>Colli da spostare</label><input name="colli" type="number" min="0" step="0.01" placeholder="0"></div>
          <div><label>Kg da spostare</label><input name="peso" type="number" min="0" step="0.01" placeholder="0"></div>
          <div><label>Motivo</label><input name="note" placeholder="Es. pezzatura registrata male"></div>
          <div><label>&nbsp;</label><button>Registra correzione</button></div>
        </form><p id="correction-msg"></p>
      </div>
    </details>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">DISPONIBILITÀ</p><h2>Rimanenze per articolo e pezzatura</h2></div>
      </div>
      <div class="table-scroll"><table>
        <tr><th>Articolo / pezzatura</th><th>Partita</th><th>Proprietario / fornitore</th><th>Arrivati</th><th>Usciti</th><th>Rimanenza colli</th><th>Rimanenza kg</th><th>Stato</th></tr>
        ${inventory.map((lot) => {
          const tracksPackages = Number(lot.colli_iniziali || 0) > 0;
          const tracksWeight = Number(lot.peso_iniziale || 0) > 0;
          const soldPackages = roundQty(Number(lot.colli_iniziali || 0) - Number(lot.colli_rimanenti || 0));
          const soldWeight = roundQty(Number(lot.peso_iniziale || 0) - Number(lot.peso_rimanente || 0));
          return `<tr>
            <td><button class="ghost" data-open-product="${lot.prodotto_id}"><strong class="inventory-product-name">${esc(name('prodotti', lot.prodotto_id))}</strong></button>${lot.qualita && lot.qualita !== 'Standard' ? `<br><span class="quality-chip">${esc(lot.qualita)}</span>` : ''}<br><small>${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</small></td>
            <td><b>${esc(partitaLabel(lot))}</b><br><small>${esc(displayDateOnly(lot.dataCarico, lot.dateKey))}</small></td>
            <td><span class="owner-badge">${esc(lot.proprietario || '—')}</span></td>
            <td>${measure(tracksPackages, lot.colli_iniziali, 'colli')}<br><small>${measure(tracksWeight, lot.peso_iniziale, 'kg')}</small></td>
            <td>${measure(tracksPackages, soldPackages, 'colli')}<br><small>${measure(tracksWeight, soldWeight, 'kg')}</small></td>
            <td>${tracksPackages ? stockStateHtml(lot.colli_rimanenti, 'colli') : '—'}</td>
            <td>${tracksWeight ? stockStateHtml(lot.peso_rimanente, 'kg') : '—'}</td>
            <td>${lotStatusHtml(lot)}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="8" class="empty">Nessuna merce registrata. Registra il primo scarico.</td></tr>'}
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
        <tr><th>Data</th><th>Cliente</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th><th>Operatore</th><th>Azione</th></tr>
        ${sales.map((movement) => `<tr class="${movement.annullato ? 'returned' : ''}">
          <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td><td>${esc(name('clienti', movement.cliente_id))}</td><td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${formatQty(movement.colli)}</td><td>${formatQty(movement.peso)}</td><td>${eur(movement.totale)}${saleReturnBadge(movement)}</td><td>${esc(movement.operatore || '—')}</td>
          <td>${movement.annullato ? '<span class="return-badge">CHIUSA</span>' : `<button type="button" class="ghost" data-return-sale="${movement.id}">Reso</button>`}</td>
        </tr>`).join('') || '<tr><td colspan="8" class="empty">Nessuna vendita.</td></tr>'}
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
        <tr><th>Data</th><th>Articolo</th><th>Proprietario lotto</th><th>Colli</th><th>Kg</th><th>Totale</th><th>Azione</th></tr>
        ${history.map((movement) => {
          const lot = lotById(movement.lotto_id);
          return `<tr class="${movement.annullato ? 'returned' : ''}">
            <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td>
            <td><b>${esc(name('prodotti', movement.prodotto_id))}</b></td>
            <td>${esc(lot?.proprietario || movement.proprietario || '—')}</td>
            <td>${movement.colli}</td>
            <td>${movement.peso}</td>
            <td>${eur(movement.totale)}${saleReturnBadge(movement)}</td>
            <td>${movement.annullato ? '<span class="return-badge">CHIUSA</span>' : `<button type="button" class="ghost" data-return-sale="${movement.id}">Reso</button>`}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" class="empty">Nessuna vendita per questo cliente.</td></tr>'}
      </table></div>
    </section>`;
}

function clienti() {
  const client = db.clienti.find((item) => item.id === selectedClient);
  const account = client ? accountForClient(client.id) : null;

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
      <section class="stats">
        <article class="stat"><i>€</i><div><h3>Acquisti</h3><div class="big">${eur(account.purchased)}</div><p>Vendite attive</p></div></article>
        <article class="stat"><i>✓</i><div><h3>Pagamenti</h3><div class="big">${eur(account.paid)}</div><p>Importi incassati</p></div></article>
        <article class="stat"><i>!</i><div><h3>Situazione</h3><div class="big">${account.balance > 0 ? eur(account.balance) : account.balance < 0 ? eur(Math.abs(account.balance)) : '€ 0.00'}</div><p>${account.balance > 0 ? `Da incassare · ${account.days} giorni` : account.balance < 0 ? 'Credito del cliente' : 'Saldato'}</p></div></article>
      </section>
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
      <section class="card">
        <div class="section-head"><div><p class="eyebrow">CONTO CLIENTE</p><h2>Registra un pagamento</h2></div>${accountBalanceHtml(account)}</div>
        <form id="payment-form" data-client-id="${client.id}" class="grid">
          <div><label>Data *</label><input name="data_pagamento" type="date" required value="${today()}"></div>
          <div><label>Importo *</label><input name="importo" type="number" min="0.01" step="0.01" required placeholder="0,00"></div>
          <div><label>Metodo</label><select name="metodo"><option>Contanti</option><option>Bonifico</option><option>Carta</option><option>Altro</option></select></div>
          <div><label>Nota</label><input name="note" placeholder="Facoltativa"></div>
          <div><label>&nbsp;</label><button>Registra pagamento</button></div>
        </form><p id="payment-msg"></p>
        <div class="table-scroll"><table><tr><th>Data</th><th>Importo</th><th>Metodo</th><th>Nota</th><th>Operatore</th></tr>
          ${account.payments.slice().reverse().map((payment) => `<tr><td>${esc(displayDateOnly(payment.data, payment.dateKey))}</td><td><b class="${Number(payment.importo || 0) < 0 ? 'account-negative' : ''}">${Number(payment.importo || 0) < 0 ? `Rimborso ${eur(Math.abs(Number(payment.importo || 0)))}` : eur(payment.importo)}</b></td><td>${esc(payment.metodo || '—')}</td><td>${esc(payment.note || '—')}</td><td>${esc(payment.operatore || '—')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nessun pagamento registrato.</td></tr>'}
        </table></div>
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
        <tr><th>Data</th><th>Prodotto / pezzatura</th><th>Proprietario lotto</th><th>Cliente</th><th>Colli</th><th>Kg</th><th>Prezzo</th><th>Totale</th><th>Operatore</th><th>Azione</th></tr>
        ${sales.map((movement) => `<tr class="${movement.annullato ? 'returned' : ''}">
          <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td>
          <td><button class="ghost" data-open-product="${movement.prodotto_id}"><b>${esc(name('prodotti', movement.prodotto_id))}</b></button>${movement.qualita && movement.qualita !== 'Standard' ? `<br><span class="quality-chip">${esc(movement.qualita)}</span>` : ''}</td>
          <td>${esc(movement.proprietario || lotById(movement.lotto_id)?.proprietario || '—')}</td>
          <td>${esc(name('clienti', movement.cliente_id))}</td>
          <td>${formatQty(movement.colli)}</td><td>${formatQty(movement.peso)}</td><td>${eur(movement.prezzo)} / ${movement.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td><td><b>${eur(movement.totale)}</b>${saleReturnBadge(movement)}</td><td>${esc(movement.operatore || '—')}</td>
          <td>${movement.annullato ? '<span class="return-badge">CHIUSA</span>' : `<button type="button" class="ghost" data-return-sale="${movement.id}">Reso</button>`}</td>
        </tr>`).join('') || '<tr><td colspan="10" class="empty">Nessuna vendita registrata.</td></tr>'}
      </table></div>
    </section>`;
}

function resi() {
  const query = normalized(returnsSearch);
  const activeSales = db.movimenti
    .filter((movement) => movement.tipo === 'uscita' && !movement.annullato)
    .filter((movement) => !returnsDate || movement.dateKey === returnsDate)
    .filter((movement) => !query || searchMatches([
      name('clienti', movement.cliente_id),
      name('prodotti', movement.prodotto_id),
      movement.qualita,
      movement.proprietario,
      lotById(movement.lotto_id)?.proprietario,
      movement.note,
      movement.data,
    ], query))
    .slice()
    .sort((left, right) => String(right.dateKey || right.data || '').localeCompare(String(left.dateKey || left.data || '')));

  const returnHistory = db.movimenti
    .filter((movement) => movement.tipo === 'uscita')
    .flatMap((movement) => saleReturns(movement).map((returnRecord) => ({ movement, returnRecord })))
    .sort((left, right) => String(right.returnRecord.dateKey || right.returnRecord.data || '').localeCompare(String(left.returnRecord.dateKey || left.returnRecord.data || '')));
  const returnedValue = roundMoney(returnHistory.reduce((sum, item) => sum + Number(item.returnRecord.importo || 0), 0));

  return `
    <section class="pit-title">
      <div><p class="eyebrow">RESI</p><h2>Restituzioni clienti</h2><p>Cerca la vendita originale e premi “Registra reso”. Merce, conto cliente, totale e biglietti si sistemano insieme.</p></div>
      <div class="date"><small>RESI REGISTRATI</small>${returnHistory.length}</div>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">CERCA LA VENDITA</p><h2>Quale merce è stata restituita?</h2></div></div>
      <form id="returns-filter-form" class="grid">
        <div><label>Cliente o prodotto</label><input name="ricerca" type="search" value="${esc(returnsSearch)}" placeholder="Es. Simone oppure Cipolle"></div>
        <div><label>Data della vendita</label><input name="data_vendita" type="date" value="${esc(returnsDate)}"></div>
        <div><label>&nbsp;</label><button type="submit">Cerca vendita</button></div>
        <div><label>&nbsp;</label><button id="clear-returns-filter" class="ghost" type="button">Mostra tutte</button></div>
      </form>
      <div class="table-scroll"><table>
        <tr><th>Data vendita</th><th>Cliente</th><th>Prodotto</th><th>Fornitore / pezzatura</th><th>Quantità rimasta nella vendita</th><th>Totale attuale</th><th>Azione</th></tr>
        ${activeSales.map((movement) => {
          const lot = lotById(movement.lotto_id);
          const quantity = [
            Number(movement.colli || 0) ? `${formatQty(movement.colli)} colli` : '',
            Number(movement.peso || 0) ? `${formatQty(movement.peso)} kg` : '',
          ].filter(Boolean).join(' · ') || '—';
          return `<tr>
            <td>${esc(displayDateOnly(movement.data, movement.dateKey))}</td>
            <td><b>${esc(name('clienti', movement.cliente_id))}</b></td>
            <td><b>${esc(name('prodotti', movement.prodotto_id))}</b>${saleReturnBadge(movement)}</td>
            <td>${esc(movement.proprietario || lot?.proprietario || '—')}${movement.qualita && movement.qualita !== 'Standard' ? `<br><small>${esc(movement.qualita)}</small>` : ''}</td>
            <td>${esc(quantity)}</td>
            <td><b>${eur(movement.totale)}</b></td>
            <td><button type="button" data-return-sale="${movement.id}">Registra reso</button></td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" class="empty">Nessuna vendita trovata. Prova a cancellare i filtri.</td></tr>'}
      </table></div>
    </section>
    <section class="card">
      <div class="section-head"><div><p class="eyebrow">STORICO RESI</p><h2>Resi già registrati</h2></div><b>${returnHistory.length} resi · ${eur(returnedValue)}</b></div>
      <div class="table-scroll"><table>
        <tr><th>Data reso</th><th>Cliente</th><th>Prodotto</th><th>Quantità restituita</th><th>Importo sistemato</th><th>Operatore</th><th>Nota</th></tr>
        ${returnHistory.map(({ movement, returnRecord }) => {
          const quantity = [
            Number(returnRecord.colli || 0) ? `${formatQty(returnRecord.colli)} colli` : '',
            Number(returnRecord.peso || 0) ? `${formatQty(returnRecord.peso)} kg` : '',
          ].filter(Boolean).join(' · ') || '—';
          return `<tr>
            <td>${esc(displayDateOnly(returnRecord.data, returnRecord.dateKey))}</td>
            <td>${esc(name('clienti', movement.cliente_id))}</td>
            <td><b>${esc(name('prodotti', movement.prodotto_id))}</b></td>
            <td>${esc(quantity)}</td>
            <td><b>${eur(returnRecord.importo)}</b></td>
            <td>${esc(returnRecord.operatore || '—')}</td>
            <td>${esc(returnRecord.note || '—')}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" class="empty">Non hai ancora registrato nessun reso.</td></tr>'}
      </table></div>
    </section>`;
}

function clientTicketData(dateKey, clientId) {
  const client = db.clienti.find((item) => item.id === clientId);
  if (!client) return null;
  const rows = db.movimenti
    .filter((movement) => movement.tipo === 'uscita' && movement.dateKey === dateKey && movement.cliente_id === clientId && !movement.annullato)
    .slice()
    .sort((left, right) => String(left.data || '').localeCompare(String(right.data || '')))
    .map((movement) => {
      const lot = lotById(movement.lotto_id);
      const quantity = movement.unita_prezzo === 'collo'
        ? Number(movement.colli || 0)
        : Number(movement.peso || 0);
      return {
        ...movement,
        articolo: name('prodotti', movement.prodotto_id || lot?.prodotto_id),
        qualita: movement.qualita || lot?.qualita || 'Standard',
        proprietario: movement.proprietario || lot?.proprietario || '',
        totale_cliente: roundMoney(quantity * Number(movement.prezzo || 0)),
      };
    });
  if (!rows.length) return null;
  return {
    dateKey,
    clientId,
    cliente: client,
    rows,
    totale: roundMoney(rows.reduce((sum, row) => sum + Number(row.totale_cliente || 0), 0)),
  };
}

function dailyClientTickets(dateKey) {
  return [...new Set(db.movimenti
    .filter((movement) => movement.tipo === 'uscita' && movement.dateKey === dateKey && movement.cliente_id && !movement.annullato)
    .map((movement) => movement.cliente_id))]
    .map((clientId) => clientTicketData(dateKey, clientId))
    .filter(Boolean)
    .sort((left, right) => left.cliente.nome.localeCompare(right.cliente.nome, 'it'));
}

function biglietti() {
  const date = ticketsDate || today();
  const clientTickets = dailyClientTickets(date);
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
        <div><p class="eyebrow">BIGLIETTI CLIENTI · ${esc(formatDateKey(date))}</p><h2>Spesa e totale di ogni cliente</h2><p class="muted">Sono già pronti: includono tutti gli articoli acquistati dal cliente nella giornata.</p></div>
        <button type="button" data-print-client-day="${date}" ${clientTickets.length ? '' : 'disabled'}>Stampa tutti i clienti</button>
      </div>
      ${clientTickets.length ? `<div class="client-ticket-grid">${clientTickets.map((ticket) => `<article class="client-ticket-card"><p class="eyebrow">CLIENTE</p><h3>${esc(ticket.cliente.nome)}</h3><p>${ticket.rows.length} ${ticket.rows.length === 1 ? 'articolo registrato' : 'articoli registrati'}</p><p><b>Totale ${eur(ticket.totale)}</b></p><button type="button" data-print-client-ticket="${ticket.clientId}" data-ticket-date="${date}">Visualizza / stampa</button></article>`).join('')}</div>` : '<p class="empty">Nessuna vendita cliente registrata in questa giornata.</p>'}
    </section>
    <section class="card">
      <div class="section-head">
        <div><p class="eyebrow">BIGLIETTI MERCE / FORNITORI · ${esc(formatDateKey(date))}</p><h2>${tickets.length} ${tickets.length === 1 ? 'biglietto' : 'biglietti'} salvati</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" data-generate-day="${date}">Genera / aggiorna</button>
          <button type="button" class="ghost" data-print-day="${date}" ${tickets.length ? '' : 'disabled'}>Visualizza e stampa tutti</button>
        </div>
      </div>
      <p id="ticket-msg"></p>
      ${tickets.length ? `<p class="notice">Totale lordo ${eur(gross)} · Totale netto ${eur(net)}. I biglietti restano salvati e puoi riaprirli quando vuoi.</p>` : '<p class="empty">Non ci sono ancora biglietti per questa data. Premi “Genera / aggiorna”.</p>'}
    </section>
    <section class="ticket-grid">${tickets.map((ticket) => {
      const printRows = ticketPrintRows(ticket);
      const linkedSales = ticketLinkedSales(ticket);
      const openedSale = linkedSales.some((sale) => sale.id === editingSaleId);
      return `
      <article class="ticket-card">
        <div class="section-head">
          <div><p class="eyebrow">${esc(displayDateOnly(ticket.data, ticket.dateKey))}</p><h3>${esc(ticket.prodotto)} · ${esc(ticket.proprietario)}</h3></div>
          <span class="quality-chip">${esc(ticketTypeLabel(ticket))}</span>
        </div>
        <p class="muted">${esc(ticketScaricoLabel(ticket))} · ${ticketQuantityTitle(ticket)}${ticket.qualita?.length ? ` · ${ticket.qualita.map(esc).join(' / ')}` : ''}</p>
        <div class="table-scroll"><table>
          <tr><th>Colli</th><th>Descrizione</th><th>Peso</th><th>Prezzo</th><th>Totale</th></tr>
          ${printRows.map((sale) => `<tr class="${sale.annullato ? 'returned' : ''}"><td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td><td><b>${esc(sale.descrizione || 'Standard')}</b>${sale.annullato ? '<br><span class="return-badge">RESO</span>' : ''}${sale.iva_percentuale ? `<br><small>${esc(vatModeLabel(sale.iva_modalita, sale.iva_percentuale))}: ${eur(sale.iva)}</small>` : ''}</td><td>${Number(sale.peso || 0) ? `${formatQty(sale.peso)} kg` : '—'}</td><td>${sale.tipo === 'scarto' ? '—' : `${eur(sale.prezzo)} / ${sale.unita_prezzo === 'kg' ? 'kg' : 'collo'}`}</td><td><b>${sale.tipo === 'scarto' ? '—' : eur(sale.totale)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nessuna riga nel biglietto.</td></tr>'}
        </table></div>
        <p><b>Rimanenza:</b> ${ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasWeightData ? stockState(ticket.remainingKg, 'kg') : ''}</p>
        <p><b>Lordo ${eur(ticket.gross)}</b> · ${Number(ticket.commissionPercent ?? 10) ? `Trattenuta ${Number(ticket.commissionPercent ?? 10)}% arrotondata ${eur(ticket.deduction)}` : 'Nessuna trattenuta'} · <b>Netto ${eur(ticket.net)}</b></p>
        <div class="ticket-actions">
          <button type="button" data-print-ticket="${ticket.id}">Visualizza / stampa PDF</button>
          <button type="button" class="ghost" data-share-ticket="${ticket.id}">Condividi</button>
          <button type="button" class="ghost" data-edit-ticket="${ticket.id}">Tipo e trattenuta</button>
        </div>
        ${editingTicketId === ticket.id ? ticketSettingsForm(ticket) : ''}
        <details class="edit-sale" ${openedSale ? 'open' : ''}>
          <summary><b>Modifica vendite collegate</b></summary>
          <p class="muted">I nomi dei clienti non compaiono sul biglietto. Da qui puoi correggere anche le vendite dei biglietti passati: il resto si aggiorna automaticamente.</p>
          <div class="ticket-actions">${linkedSales.map((sale, index) => {
            const quantity = Number(sale.colli || 0) ? `${formatQty(sale.colli)} colli` : `${formatQty(sale.peso)} kg`;
            const label = `${index + 1}. ${sale.qualita || lotById(sale.lotto_id)?.qualita || 'Standard'} · ${quantity} · ${eur(sale.prezzo)} / ${sale.unita_prezzo === 'collo' ? 'collo' : 'kg'}`;
            return sale.annullato
              ? `<span class="return-badge">${esc(label)} · RESO COMPLETO</span>`
              : `<button type="button" class="ghost" data-edit-sale="${sale.id}">${esc(label)}</button><button type="button" class="ghost" data-return-sale="${sale.id}">Reso</button>${saleReturnBadge(sale)}`;
          }).join('') || '<span class="muted">Nessuna vendita collegata trovata. Premi “Genera / aggiorna” per riallineare questo biglietto.</span>'}</div>
        </details>
        ${openedSale ? saleEditForm(editingSaleId) : ''}
      </article>`;
    }).join('')}</section>`;
}

function saleEditForm(movementId) {
  const sale = db.movimenti.find((movement) => movement.id === movementId && movement.tipo === 'uscita');
  if (!sale) return '';
  const vatMode = normalizeVatMode(sale.iva_modalita, sale.iva_percentuale);
  return `<form id="sale-edit-form" class="edit-sale" data-sale-id="${sale.id}">
    <div class="section-head"><div><p class="eyebrow">MODIFICA COLLEGATA</p><h3>Correggi la vendita</h3><p class="muted">Magazzino, conto cliente e biglietti verranno ricalcolati insieme.</p></div><button type="button" class="ghost" data-cancel-sale-edit>Annulla</button></div>
    <div class="grid">
      <div><label>Data</label><input name="data_movimento" type="date" required value="${esc(sale.dateKey || today())}"></div>
      <div><label>Partita / pezzatura</label><select name="lotto_id" required>${db.lotti.map((lot) => `<option value="${lot.id}" ${lot.id === sale.lotto_id ? 'selected' : ''}>${esc(lotSearchName(lot))}</option>`).join('')}</select></div>
      <div><label>Cliente</label><select name="cliente_id" required>${db.clienti.map((client) => `<option value="${client.id}" ${client.id === sale.cliente_id ? 'selected' : ''}>${esc(client.nome)}</option>`).join('')}</select></div>
      <div><label>Colli</label><input name="colli" type="number" min="0" step="0.01" value="${Number(sale.colli || 0)}"></div>
      <div><label>Kg</label><input name="peso" type="number" min="0" step="0.01" value="${Number(sale.peso || 0)}"></div>
      <div><label>Prezzo unitario</label><input name="prezzo" type="number" min="0" step="0.01" required value="${Number(sale.prezzo || 0)}"></div>
      <div><label>Tipo prezzo</label><select name="unita_prezzo"><option value="kg" ${sale.unita_prezzo !== 'collo' ? 'selected' : ''}>Al kg</option><option value="collo" ${sale.unita_prezzo === 'collo' ? 'selected' : ''}>A collo</option></select></div>
      <div><label>IVA</label><select name="iva_modalita"><option value="nessuna" ${vatMode === 'nessuna' ? 'selected' : ''}>Senza IVA</option><option value="aggiungi" ${vatMode === 'aggiungi' ? 'selected' : ''}>Aggiungi IVA 4%</option><option value="compresa" ${vatMode === 'compresa' ? 'selected' : ''}>Prezzo già IVA compresa</option></select></div>
      <div><label>&nbsp;</label><button>Salva tutte le correzioni</button></div>
    </div><p id="sale-edit-msg"></p>
  </form>`;
}

function editSale(form) {
  const sale = db.movimenti.find((movement) => movement.id === form.dataset.saleId && movement.tipo === 'uscita');
  if (!sale || sale.annullato) throw new Error('Vendita non modificabile.');
  const oldLot = lotById(sale.lotto_id);
  const newLot = lotById(new FormData(form).get('lotto_id'));
  const data = new FormData(form);
  const packages = Number(data.get('colli') || 0);
  const weight = Number(data.get('peso') || 0);
  const price = Number(data.get('prezzo') || 0);
  const priceUnit = data.get('unita_prezzo') === 'collo' ? 'collo' : 'kg';
  const vatMode = normalizeVatMode(data.get('iva_modalita'), data.get('iva_percentuale'));
  if (!oldLot || !newLot) throw new Error('Partita non trovata.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci colli o kg.');
  if (Number(newLot.colli_iniziali || 0) > 0 && packages <= 0) throw new Error('Questa partita richiede i colli.');
  if (Number(newLot.peso_iniziale || 0) > 0 && weight <= 0) throw new Error('Questa partita richiede i kg.');

  if (Number(oldLot.colli_iniziali || 0) > 0) oldLot.colli_rimanenti = roundQty(Number(oldLot.colli_rimanenti || 0) + Number(sale.colli || 0));
  if (Number(oldLot.peso_iniziale || 0) > 0) oldLot.peso_rimanente = roundQty(Number(oldLot.peso_rimanente || 0) + Number(sale.peso || 0));
  if (Number(newLot.colli_iniziali || 0) > 0) newLot.colli_rimanenti = roundQty(Number(newLot.colli_rimanenti || 0) - packages);
  if (Number(newLot.peso_iniziale || 0) > 0) newLot.peso_rimanente = roundQty(Number(newLot.peso_rimanente || 0) - weight);

  const amounts = saleAmounts(price, priceUnit, packages, weight, vatMode);
  const oldDate = sale.dateKey;
  Object.assign(sale, {
    dateKey: String(data.get('data_movimento') || today()), data: formatDateKey(String(data.get('data_movimento') || today())),
    gruppo_id: lotGroupId(newLot), lotto_id: newLot.id, prodotto_id: newLot.prodotto_id,
    proprietario: newLot.proprietario, partita: partitaLabel(newLot), qualita: newLot.qualita || 'Standard',
    cliente_id: String(data.get('cliente_id') || ''), colli: packages, peso: weight, prezzo: price,
    unita_prezzo: priceUnit, imponibile: amounts.taxable, iva_modalita: amounts.vatMode,
    iva_percentuale: amounts.vatPercent, iva: amounts.vat, totale: amounts.total,
    modificatoIl: stamp(), modificatoDa: operatorName(),
  });
  const linkedPayment = (db.pagamenti || []).find((payment) => payment.movimento_id === sale.id && !payment.annullato);
  if (linkedPayment) Object.assign(linkedPayment, { cliente_id: sale.cliente_id, dateKey: sale.dateKey, data: sale.data, importo: amounts.total });
  audit('Vendita modificata', `${name('prodotti', sale.prodotto_id)} · ${partitaLabel(newLot)} · ${name('clienti', sale.cliente_id)} · ${eur(amounts.total)}`);
  return [...new Set([oldDate, sale.dateKey])];
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
      <div class="section-head"><div><p class="eyebrow">PRESENZA IN TEMPO REALE</p><h2>Presenze operatori</h2></div><b><span class="presence-dot"></span>Aggiornamento automatico</b></div>
      <p class="muted">Verde significa online, rosso significa offline. L’uscita viene rilevata anche quando si chiude direttamente la finestra; se il browser interrompe l’ultimo invio, lo stato diventa rosso automaticamente entro circa un minuto.</p>
      <div id="online-panel">${onlineUsers.length ? '<p class="muted">Aggiornamento elenco…</p>' : '<p class="empty">Caricamento presenze…</p>'}</div>
    </section>
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
    ${userEmail() === OWNER_EMAIL ? `<section class="card danger-zone">
      <div class="section-head">
        <div><p class="eyebrow">RIPARTENZA PULITA</p><h2>Azzera tutti i dati di lavoro</h2></div>
        <button type="button" data-reset-all>AZZERA TUTTO</button>
      </div>
      <p>Elimina clienti, prodotti, scarichi, vendite, rimanenze, biglietti, pagamenti e registro per iniziare da zero.</p>
      <p class="muted">Non elimina il sito, le funzioni, il tuo account né le persone autorizzate. Il comando richiede di nuovo il codice amministrazione.</p>
    </section>` : ''}
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
    const commissionPercent = [0, 10, 12].includes(Number(firstLot.provvigione_percentuale)) ? Number(firstLot.provvigione_percentuale) : 10;
    const net = commissionPercent ? roundMoney(Math.round((gross * (1 - commissionPercent / 100) + Number.EPSILON) * 2) / 2) : gross;
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
      commissionPercent,
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
    commissionPercent: ticket.commissionPercent,
    partita: partitaLabel(ticket.lot),
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
        cliente: '',
        descrizione: isWaste
          ? `LAVORATI / SCARTO${quality !== 'Standard' ? ` · ${quality}` : ''}${row.note ? ` · ${row.note}` : ''}`
          : quality,
        colli: Number(row.colli || 0),
        peso: Number(row.peso || 0),
        prezzo: Number(row.prezzo || 0),
        unita_prezzo: row.unita_prezzo || (Number(row.peso || 0) > 0 ? 'kg' : 'collo'),
        imponibile: Number(row.imponibile ?? row.totale ?? 0),
        iva_modalita: normalizeVatMode(row.iva_modalita, row.iva_percentuale),
        iva_percentuale: Number(row.iva_percentuale || 0),
        iva: Number(row.iva || 0),
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

function ticketPrintRows(ticket) {
  const rows = (Array.isArray(ticket.righe) ? ticket.righe : []).map((row) => {
    const movement = db.movimenti.find((item) => item.id === (row.movimento_id || row.id));
    const quality = row.qualita || movement?.qualita || 'Standard';
    const type = row.tipo || movement?.tipo || 'uscita';
    return {
      ...row,
      tipo: type,
      qualita: quality,
      descrizione: type === 'scarto'
        ? (String(row.descrizione || '').trim() || `LAVORATI / SCARTO${quality !== 'Standard' ? ` · ${quality}` : ''}${movement?.note ? ` · ${movement.note}` : ''}`)
        : quality,
    };
  });
  const grouped = new Map();
  rows.forEach((row) => {
    if (row.tipo !== 'uscita' || row.annullato) {
      grouped.set(`singola-${row.id}`, { ...row });
      return;
    }
    const key = [row.qualita || 'Standard', Number(row.prezzo || 0), row.unita_prezzo || 'kg', normalizeVatMode(row.iva_modalita, row.iva_percentuale)].join('|');
    if (!grouped.has(key)) grouped.set(key, { ...row, colli: 0, peso: 0, imponibile: 0, iva: 0, totale: 0 });
    const item = grouped.get(key);
    item.colli += Number(row.colli || 0);
    item.peso += Number(row.peso || 0);
    item.imponibile += Number(row.imponibile || 0);
    item.iva += Number(row.iva || 0);
    item.totale += Number(row.totale || 0);
    item.descrizione = row.qualita || 'Standard';
  });
  return [...grouped.values()].map((row) => ({
    ...row,
    colli: roundQty(row.colli), peso: roundQty(row.peso), imponibile: roundMoney(row.imponibile),
    iva: roundMoney(row.iva), totale: roundMoney(row.totale),
  }));
}

function ticketLinkedSales(ticket) {
  const groupId = ticket.gruppo_id || lotGroupId(lotById(ticket.lotto_id));
  const rowIds = new Set((ticket.righe || []).map((row) => row.movimento_id || row.id).filter(Boolean));
  return db.movimenti.filter((movement) => (
    movement.tipo === 'uscita'
    && movement.dateKey === ticket.dateKey
    && (rowIds.has(movement.id) || (groupId && (movement.gruppo_id || lotGroupId(lotById(movement.lotto_id))) === groupId))
  ));
}

function ticketTypeLabel(ticket) {
  const percentage = Number(ticket.commissionPercent ?? 10);
  if (percentage === 12) return 'Padronale · provvigione 12%';
  if (percentage === 0) return 'Normale · nessuna trattenuta';
  return 'Normale · trattenuta 10%';
}

function ticketScaricoLabel(ticket) {
  const lot = lotById(ticket.lotto_id);
  if (lot) return partitaLabel(lot);
  const saved = String(ticket.partita || '').trim();
  if (saved && !/^P-\d{8}-[A-Z0-9]{4}$/i.test(saved) && !/^scarico\s+\d+$/i.test(saved)) return saved;
  return 'Arrivo';
}

function ticketSettingsForm(ticket) {
  const percentage = Number(ticket.commissionPercent ?? 10);
  return `<form id="ticket-settings-form" class="edit-sale" data-ticket-id="${ticket.id}">
    <div class="section-head"><div><p class="eyebrow">TIPO BIGLIETTO</p><h3>Modifica trattenuta</h3><p class="muted">La scelta viene salvata anche nell’arrivo collegato.</p></div><button type="button" class="ghost" data-cancel-ticket-edit>Annulla</button></div>
    <div class="grid"><div><label>Tipo</label><select name="provvigione_percentuale"><option value="0" ${percentage === 0 ? 'selected' : ''}>Normale · nessuna trattenuta</option><option value="10" ${percentage === 10 ? 'selected' : ''}>Normale · trattenuta 10%</option><option value="12" ${percentage === 12 ? 'selected' : ''}>Padronale · provvigione 12%</option></select></div><div><label>&nbsp;</label><button>Salva e ricalcola</button></div></div>
    <p id="ticket-settings-msg"></p>
  </form>`;
}

function updateTicketSettings(form) {
  const ticket = db.biglietti.find((item) => item.id === form.dataset.ticketId);
  if (!ticket) throw new Error('Biglietto non trovato.');
  const percentage = Number(new FormData(form).get('provvigione_percentuale'));
  if (![0, 10, 12].includes(percentage)) throw new Error('Scegli 0%, 10% oppure 12%.');
  const groupId = ticket.gruppo_id || lotGroupId(lotById(ticket.lotto_id));
  let lots = groupId ? lotsInGroup(groupId) : [];
  if (!lots.length && lotById(ticket.lotto_id)) lots = [lotById(ticket.lotto_id)];
  lots.forEach((lot) => {
    lot.provvigione_percentuale = percentage;
    lot.conto_commissione = percentage === 12;
    lot.modificatoIl = stamp();
    lot.modificatoDa = operatorName();
  });
  ticketLinkedSales(ticket).forEach((sale) => {
    sale.provvigione_percentuale = percentage;
  });
  const dateKey = ticket.dateKey;
  db.biglietti = db.biglietti.filter((item) => item.dateKey !== dateKey);
  createTicketRecords(dateKey);
  audit('Tipo biglietto modificato', `${ticket.prodotto} · ${ticket.proprietario} · ${ticketTypeLabel({ commissionPercent: percentage })}`);
  return dateKey;
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
      <div class="lot-subtitle"><b>${esc(ticket.proprietario)}</b> · <b>${esc(ticketScaricoLabel(ticket))}</b>${ticket.qualita?.length ? ` · ${ticket.qualita.map(esc).join(' / ')}` : ''}<br>${esc(ticketTypeLabel(ticket))}<br>Rimanenza iniziale: ${ticket.hasPackageData ? `<b>${formatQty(ticket.startPackages)} colli</b>` : ''}${ticket.hasWeightData && ticket.hasPackageData ? ' · ' : ''}${ticket.hasWeightData ? `<b>${formatQty(ticket.startKg)} kg</b>` : ''}</div>
      <table>
        <thead><tr><th>Colli</th><th>Descrizione</th><th>Peso</th><th>Prezzo</th><th>Totale</th></tr></thead>
        <tbody>${ticketPrintRows(ticket).map((sale) => `<tr>
          <td>${Number(sale.colli || 0) ? formatQty(sale.colli) : '—'}</td>
          <td>${esc(sale.descrizione || 'Standard')}${sale.annullato ? '<br><b class="returned-label">RESO — IMPORTO ANNULLATO</b>' : ''}${sale.iva_percentuale ? `<br><small>${esc(vatModeLabel(sale.iva_modalita, sale.iva_percentuale))}</small>` : ''}</td>
          <td>${Number(sale.peso || 0) ? `${formatQty(sale.peso)} kg` : '—'}</td>
          <td>${sale.tipo === 'scarto' ? '—' : `${eur(sale.prezzo)} / ${sale.unita_prezzo === 'kg' ? 'kg' : 'collo'}`}</td>
          <td><b>${sale.tipo === 'scarto' ? '—' : eur(sale.totale)}</b></td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="totals">
        <div class="remaining"><span>VENDUTO</span><b>${ticket.hasPackageData ? `${formatQty(ticket.soldTodayPackages)} colli` : `${formatQty(ticket.soldTodayKg)} kg`}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? `${formatQty(ticket.soldTodayKg)} kg` : ''}</small></div>
        <div class="remaining"><span>RIMANENZA</span><b>${ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : stockState(ticket.remainingKg, 'kg')}</b><small>${ticket.hasWeightData && ticket.hasPackageData ? stockState(ticket.remainingKg, 'kg') : ''}</small></div>
        <dl>
          <dt>Totale lordo</dt><dd>${eur(ticket.gross)}</dd>
          <dt>${Number(ticket.commissionPercent ?? 10) ? `${Number(ticket.commissionPercent ?? 10)}% arrotondato` : 'Nessuna trattenuta'}</dt><dd>− ${eur(ticket.deduction)}</dd>
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
      @page{size:A6 portrait;margin:6mm}*{box-sizing:border-box}body{margin:0;background:#eef2f0;color:#172334;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:14px;background:#15334a}.toolbar button{border:0;border-radius:8px;padding:11px 18px;font-weight:700;cursor:pointer}.toolbar .print{background:#35b779;color:#fff}.ticket{width:105mm;min-height:148mm;margin:18px auto;padding:6mm;background:#fff;box-shadow:0 4px 24px #0002;page-break-after:always;display:flex;flex-direction:column}.ticket:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #aab3bc;padding-bottom:5px}header div{display:flex;flex-direction:column}small{color:#6b7788}.ticket-date{text-align:right;font-size:8px}.lot-title{margin:9px 0 3px;color:#c43232;font-size:17px;font-weight:900;text-transform:uppercase}.lot-subtitle{margin-bottom:8px;color:#4d5968;line-height:1.35;font-size:9px}table{width:100%;border-collapse:collapse;font-size:8px}th,td{border:1px solid #aab3bc;padding:4px 3px;text-align:left;vertical-align:top}th{background:#eef2f0;text-transform:uppercase;font-size:7px}th:nth-child(n+3),td:nth-child(n+3){text-align:right}.returned-label{color:#b14528;font-size:7px}.totals{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.remaining{border:1px solid #172334;padding:5px;display:flex;flex-direction:column}.remaining span{font-size:7px;font-weight:700;color:#637082}.remaining b{font-size:12px;margin-top:2px}.remaining small{min-height:9px;font-size:7px}dl{grid-column:1/-1;margin:0 0 0 auto;width:72%;display:grid;grid-template-columns:1fr auto;gap:2px 10px;border-top:1px solid #aab3bc;padding-top:5px;font-size:9px}dt,dd{margin:0}dd{text-align:right;font-weight:700}.net{margin-top:3px;padding-top:4px;border-top:1px solid #172334;font-size:11px;font-weight:800}footer{margin-top:auto;padding-top:8px;text-align:center;color:#7a8490;font-size:6px}@media(max-width:650px){.ticket{width:100%;min-height:0;margin:0;padding:16px}.toolbar{position:relative}.totals{grid-template-columns:1fr}dl{width:100%}}@media print{body{background:#fff}.toolbar{display:none}.ticket{margin:0;padding:0;box-shadow:none;width:auto;min-height:136mm}}
    </style></head><body>
      <div class="toolbar"><button class="print" onclick="window.print()">Stampa / Salva PDF</button><button onclick="window.close()">Chiudi</button></div>
      ${ticketHtml}
    </body></html>`);
  preview.document.close();
  preview.focus();
  return tickets.length;
}

function openClientTicketPreview(tickets) {
  const validTickets = tickets.filter(Boolean);
  if (!validTickets.length) throw new Error('Non ci sono biglietti cliente da visualizzare.');
  const ticketHtml = validTickets.map((ticket, index) => `
    <section class="ticket">
      <header><b>EUROFRUTTA</b><small>${esc(formatDateKey(ticket.dateKey))}</small></header>
      <div class="client-label">CLIENTE</div>
      <h1>${esc(ticket.cliente.nome)}</h1>
      <table>
        <thead><tr><th>Colli / kg</th><th>Articolo</th><th>Prezzo</th><th>Totale</th></tr></thead>
        <tbody>${ticket.rows.map((row) => `<tr>
          <td>${Number(row.colli || 0) ? `${formatQty(row.colli)} colli` : ''}${Number(row.colli || 0) && Number(row.peso || 0) ? '<br>' : ''}${Number(row.peso || 0) ? `${formatQty(row.peso)} kg` : ''}</td>
          <td><b>${esc(row.articolo)}</b>${row.qualita && row.qualita !== 'Standard' ? `<br><small>${esc(row.qualita)}</small>` : ''}</td>
          <td>${eur(row.prezzo)} / ${row.unita_prezzo === 'collo' ? 'collo' : 'kg'}</td>
          <td><b>${eur(row.totale_cliente ?? row.totale)}</b></td>
        </tr>`).join('')}</tbody>
      </table>
      <dl>
        <dt class="total">TOTALE</dt><dd class="total">${eur(ticket.totale)}</dd>
      </dl>
      <footer>Biglietto cliente ${index + 1} di ${validTickets.length}</footer>
    </section>`).join('');
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Il browser ha bloccato la finestra. Consenti i popup e riprova.');
  preview.document.open();
  preview.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biglietti clienti Eurofrutta</title><style>
    @page{size:A6 portrait;margin:6mm}*{box-sizing:border-box}body{margin:0;background:#eef2f0;color:#172334;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:14px;background:#15334a}.toolbar button{border:0;border-radius:8px;padding:11px 18px;font-weight:700;cursor:pointer}.toolbar .print{background:#35b779;color:#fff}.ticket{width:105mm;min-height:148mm;margin:18px auto;padding:6mm;background:#fff;box-shadow:0 4px 24px #0002;page-break-after:always;display:flex;flex-direction:column}.ticket:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #19374c;padding-bottom:5px;font-size:10px}header small{font-size:8px}.client-label{margin-top:9px;color:#11835c;font-size:7px;font-weight:900;letter-spacing:1.5px}h1{margin:2px 0 9px;font-size:18px}table{width:100%;border-collapse:collapse;font-size:7.5px}th,td{border:1px solid #aab3bc;padding:4px 3px;text-align:left;vertical-align:top}th{background:#eef2f0;text-transform:uppercase;font-size:6.5px}th:nth-child(n+3),td:nth-child(n+3){text-align:right}td small{color:#647386}dl{margin:10px 0 0 auto;width:66%;display:grid;grid-template-columns:1fr auto;gap:3px 10px;border-top:1px solid #aab3bc;padding-top:6px;font-size:9px}dt,dd{margin:0}dd{text-align:right;font-weight:700}.total{margin-top:3px;padding-top:4px;border-top:1px solid #172334;font-size:12px;font-weight:900}footer{margin-top:auto;padding-top:8px;text-align:center;color:#7a8490;font-size:6px}@media(max-width:650px){.ticket{width:100%;min-height:0;margin:0;padding:16px}.toolbar{position:relative}dl{width:100%}}@media print{body{background:#fff}.toolbar{display:none}.ticket{width:auto;min-height:136mm;margin:0;padding:0;box-shadow:none}}
  </style></head><body><div class="toolbar"><button class="print" onclick="window.print()">Stampa / Salva PDF</button><button onclick="window.close()">Chiudi</button></div>${ticketHtml}</body></html>`);
  preview.document.close();
  preview.focus();
  return validTickets.length;
}

async function shareTicket(ticket) {
  const quantities = [
    ticket.hasPackageData ? stockState(ticket.remainingPackages, 'colli') : '',
    ticket.hasWeightData ? stockState(ticket.remainingKg, 'kg') : '',
  ].filter(Boolean).join(' · ');
  const percentage = Number(ticket.commissionPercent ?? 10);
  const deductionText = percentage ? `${percentage}% ${eur(ticket.deduction)}` : 'nessuna trattenuta';
  const text = `${ticket.prodotto} · ${ticket.proprietario}\nData ${displayDateOnly(ticket.data, ticket.dateKey)}\n${ticketTypeLabel(ticket)}\n${quantities}\nLordo ${eur(ticket.gross)} · ${deductionText} · Netto ${eur(ticket.net)}`;
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
  const vatMode = normalizeVatMode(form.get('iva_modalita'), form.get('iva_percentuale'));
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
  const movementId = id();
  const amounts = saleAmounts(price, priceUnit, packages, weight, vatMode);
  db.movimenti.push({
    id: movementId,
    data: formatDateKey(dateKey),
    dateKey,
    tipo: 'uscita',
    gruppo_id: lotGroupId(lot),
    lotto_id: lot.id,
    prodotto_id: lot.prodotto_id,
    proprietario: lot.proprietario,
    partita: partitaLabel(lot),
    qualita: lot.qualita || 'Standard',
    cliente_id: client.id,
    colli: packages,
    peso: weight,
    prezzo: price,
    unita_prezzo: priceUnit,
    imponibile: amounts.taxable,
    iva_modalita: amounts.vatMode,
    iva_percentuale: amounts.vatPercent,
    iva: amounts.vat,
    totale: amounts.total,
    stato_pagamento: form.get('stato_pagamento') === 'pagato' ? 'pagato' : 'credito',
    operatore: operatorName(),
    operatore_uid: signedUser?.uid || '',
    operatore_email: userEmail(),
  });
  if (form.get('stato_pagamento') === 'pagato' && amounts.total > 0) {
    if (!Array.isArray(db.pagamenti)) db.pagamenti = [];
    db.pagamenti.push({
      id: id(), cliente_id: client.id, movimento_id: movementId, dateKey, data: formatDateKey(dateKey),
      importo: amounts.total, metodo: String(form.get('metodo_pagamento') || 'Contanti'), note: 'Vendita pagata subito',
      operatore: operatorName(), operatore_uid: signedUser?.uid || '',
    });
  }
  const finished = lotStatus(lot) === 'terminata';
  if (finished) lot.terminatoIl = stamp();
  audit('Vendita registrata', `${name('prodotti', lot.prodotto_id)} · ${lot.proprietario} · ${partitaLabel(lot)} · ${packages ? `${formatQty(packages)} colli` : ''}${packages && weight ? ' · ' : ''}${weight ? `${formatQty(weight)} kg` : ''} · prezzo a ${priceUnit} · ${vatModeLabel(amounts.vatMode)} · cliente ${client.nome}${finished ? ' · PARTITA TERMINATA' : ''}`);
  return { finished, partita: partitaLabel(lot), dateKey, movementId, clientId: client.id };
}

function addPayment(form, clientId) {
  const amount = Number(form.get('importo') || 0);
  const dateKey = String(form.get('data_pagamento') || today());
  if (!db.clienti.some((client) => client.id === clientId)) throw new Error('Cliente non trovato.');
  if (amount <= 0) throw new Error('Inserisci un importo maggiore di zero.');
  if (!Array.isArray(db.pagamenti)) db.pagamenti = [];
  db.pagamenti.push({
    id: id(), cliente_id: clientId, dateKey, data: formatDateKey(dateKey), importo: roundMoney(amount),
    metodo: String(form.get('metodo') || 'Contanti'), note: String(form.get('note') || '').trim(),
    operatore: operatorName(), operatore_uid: signedUser?.uid || '',
  });
  audit('Pagamento cliente registrato', `${name('clienti', clientId)} · ${eur(amount)}`);
}

function addCorrection(form) {
  const source = lotById(form.get('origine_id'));
  const target = lotById(form.get('destinazione_id'));
  const packages = Number(form.get('colli') || 0);
  const weight = Number(form.get('peso') || 0);
  const dateKey = String(form.get('data_movimento') || today());
  if (!source || !target) throw new Error('Scegli entrambe le pezzature.');
  if (source.id === target.id) throw new Error('Origine e destinazione devono essere diverse.');
  if (source.prodotto_id !== target.prodotto_id) throw new Error('Puoi correggere soltanto pezzature dello stesso prodotto.');
  if (packages <= 0 && weight <= 0) throw new Error('Inserisci i colli o i kg da spostare.');
  if (packages > 0 && (!Number(source.colli_iniziali || 0) || !Number(target.colli_iniziali || 0))) throw new Error('Entrambe le pezzature devono tenere il conto dei colli.');
  if (weight > 0 && (!Number(source.peso_iniziale || 0) || !Number(target.peso_iniziale || 0))) throw new Error('Entrambe le pezzature devono tenere il conto dei kg.');
  if (packages > Number(source.colli_rimanenti || 0) || weight > Number(source.peso_rimanente || 0)) throw new Error('La quantità supera la rimanenza della pezzatura di origine.');
  source.colli_rimanenti = roundQty(Number(source.colli_rimanenti || 0) - packages);
  source.peso_rimanente = roundQty(Number(source.peso_rimanente || 0) - weight);
  target.colli_rimanenti = roundQty(Number(target.colli_rimanenti || 0) + packages);
  target.peso_rimanente = roundQty(Number(target.peso_rimanente || 0) + weight);
  db.movimenti.push({
    id: id(), tipo: 'rettifica', dateKey, data: formatDateKey(dateKey), prodotto_id: source.prodotto_id,
    lotto_id: source.id, lotto_destinazione_id: target.id, proprietario: source.proprietario,
    origine: source.qualita || 'Standard', destinazione: target.qualita || 'Standard', colli: packages, peso: weight,
    note: String(form.get('note') || '').trim(), operatore: operatorName(), operatore_uid: signedUser?.uid || '', totale: 0,
  });
  audit('Correzione tra pezzature', `${name('prodotti', source.prodotto_id)} · ${source.qualita || 'Standard'} → ${target.qualita || 'Standard'} · ${formatQty(packages)} colli / ${formatQty(weight)} kg`);
}

function addLoad(form) {
  const productId = form.get('prodotto_id');
  const owner = String(form.get('proprietario') || '').trim();
  const dateKey = String(form.get('data_carico') || today());
  const commission = [0, 10, 12].includes(Number(form.get('provvigione_percentuale'))) ? Number(form.get('provvigione_percentuale')) : 10;
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
  const partita = String(form.get('partita') || '').trim();
  const note = String(form.get('note') || '').trim();
  variants.forEach((variant) => {
    const lot = {
      id: id(),
      gruppo_id: groupId,
      dataCarico: formatDateKey(dateKey),
      dateKey,
      prodotto_id: productId,
      proprietario: owner,
      partita,
      provvigione_percentuale: commission,
      conto_commissione: commission === 12,
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
      partita,
      provvigione_percentuale: commission,
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
  audit('Arrivo registrato', `${name('prodotti', productId)} · ${owner} · ${partita || formatDateKey(dateKey)} · trattenuta ${commission}% · ${variants.map((variant) => `${variant.qualita}: ${formatQty(variant.colli)} colli / ${formatQty(variant.peso)} kg`).join(' · ')} · totale ${formatQty(totalPackages)} colli / ${formatQty(totalWeight)} kg`);
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

function saleReturns(movement) {
  return Array.isArray(movement?.resi) ? movement.resi : [];
}

function saleReturnLabel(movement) {
  if (movement?.annullato) return 'RESO COMPLETO';
  const returns = saleReturns(movement);
  if (!returns.length) return '';
  const packages = roundQty(returns.reduce((sum, item) => sum + Number(item.colli || 0), 0));
  const weight = roundQty(returns.reduce((sum, item) => sum + Number(item.peso || 0), 0));
  const quantities = [packages ? `${formatQty(packages)} colli` : '', weight ? `${formatQty(weight)} kg` : ''].filter(Boolean).join(' · ');
  return `RESO ${quantities || 'parziale'}`;
}

function saleReturnBadge(movement) {
  const label = saleReturnLabel(movement);
  return label ? `<br><span class="return-badge">${esc(label)}</span>` : '';
}

function calculateSaleReturn(movement, packages, weight) {
  if (!movement) throw new Error('Vendita non trovata.');
  const currentPackages = roundQty(Number(movement.colli || 0));
  const currentWeight = roundQty(Number(movement.peso || 0));
  const returnedPackages = roundQty(Number(packages || 0));
  const returnedWeight = roundQty(Number(weight || 0));
  if (returnedPackages < 0 || returnedWeight < 0) throw new Error('La quantità restituita non può essere negativa.');
  if (returnedPackages <= 0 && returnedWeight <= 0) throw new Error('Inserisci almeno i colli oppure i kg restituiti.');
  if (returnedPackages > currentPackages || returnedWeight > currentWeight) throw new Error('Il reso supera la quantità ancora presente nella vendita.');
  if (currentPackages > 0 && currentWeight > 0 && (returnedPackages <= 0 || returnedWeight <= 0)) {
    throw new Error('Questa vendita tiene sia colli sia kg: indica entrambe le quantità restituite.');
  }
  if (movement.unita_prezzo === 'collo' && returnedPackages <= 0) throw new Error('Per questa vendita devi indicare i colli restituiti.');
  if (movement.unita_prezzo !== 'collo' && returnedWeight <= 0) throw new Error('Per questa vendita devi indicare i kg restituiti.');

  const remainingPackages = roundQty(currentPackages - returnedPackages);
  const remainingWeight = roundQty(currentWeight - returnedWeight);
  const amounts = saleAmounts(
    movement.prezzo,
    movement.unita_prezzo === 'collo' ? 'collo' : 'kg',
    remainingPackages,
    remainingWeight,
    normalizeVatMode(movement.iva_modalita, movement.iva_percentuale),
  );
  const refund = roundMoney(Number(movement.totale || 0) - amounts.total);
  const full = remainingPackages <= 0 && remainingWeight <= 0;
  return { returnedPackages, returnedWeight, remainingPackages, remainingWeight, amounts, refund, full };
}

function returnSaleDialog() {
  const movement = db.movimenti.find((item) => item.id === returningSaleId && item.tipo === 'uscita' && !item.annullato);
  if (!movement) return '';
  const lot = lotById(movement.lotto_id);
  const linkedPaid = (db.pagamenti || []).some((payment) => payment.movimento_id === movement.id && !payment.annullato && Number(payment.importo || 0) > 0);
  const previousReturns = saleReturns(movement);
  return `<div class="return-modal-backdrop" data-return-backdrop>
    <section class="return-modal" role="dialog" aria-modal="true" aria-labelledby="return-title">
      <div class="section-head">
        <div><p class="eyebrow">RESO CLIENTE</p><h2 id="return-title">Restituisci merce e sistema tutto</h2></div>
        <button type="button" class="ghost" data-cancel-return>Chiudi</button>
      </div>
      <p class="muted">Indica soltanto ciò che il cliente riporta. La merce torna nella stessa partita e vendita, conto cliente e biglietti vengono ricalcolati insieme.</p>
      <div class="return-summary">
        <div><small>Cliente</small><b>${esc(name('clienti', movement.cliente_id))}</b></div>
        <div><small>Articolo</small><b>${esc(name('prodotti', movement.prodotto_id))}${movement.qualita && movement.qualita !== 'Standard' ? ` · ${esc(movement.qualita)}` : ''}</b></div>
        <div><small>Vendita attuale</small><b>${Number(movement.colli || 0) ? `${formatQty(movement.colli)} colli · ` : ''}${Number(movement.peso || 0) ? `${formatQty(movement.peso)} kg · ` : ''}${eur(movement.totale)}</b></div>
      </div>
      ${previousReturns.length ? `<p><b>Resi già registrati:</b></p><ul class="return-history">${previousReturns.map((item) => `<li>${esc(displayDateOnly(item.data, item.dateKey))} · ${Number(item.colli || 0) ? `${formatQty(item.colli)} colli · ` : ''}${Number(item.peso || 0) ? `${formatQty(item.peso)} kg · ` : ''}${eur(item.importo)}${item.note ? ` · ${esc(item.note)}` : ''}</li>`).join('')}</ul>` : ''}
      <form id="sale-return-form" data-sale-id="${movement.id}">
        <div class="grid">
          <div><label>Data del reso *</label><input name="data_reso" type="date" required value="${today()}"></div>
          ${Number(movement.colli || 0) > 0 ? `<div><label>Colli restituiti *</label><input name="colli" type="number" min="0" max="${Number(movement.colli || 0)}" step="0.01" placeholder="Massimo ${formatQty(movement.colli)}"></div>` : '<input name="colli" type="hidden" value="0">'}
          ${Number(movement.peso || 0) > 0 ? `<div><label>Kg restituiti *</label><input name="peso" type="number" min="0" max="${Number(movement.peso || 0)}" step="0.01" placeholder="Massimo ${formatQty(movement.peso)}"></div>` : '<input name="peso" type="hidden" value="0">'}
          <div><label>Come sistemare il conto</label><select name="gestione_conto"><option value="rimborso" ${linkedPaid ? 'selected' : ''}>Soldi restituiti al cliente</option><option value="credito" ${linkedPaid ? '' : 'selected'}>Scala soltanto dal credito</option></select></div>
          <div><label>Metodo rimborso</label><select name="metodo"><option>Contanti</option><option>Bonifico</option><option>Carta</option><option>Altro</option></select></div>
          <div><label>Motivo / nota</label><input name="note" placeholder="Es. merce non gradita"></div>
        </div>
        <button type="button" class="ghost return-all" data-return-all>Restituisci tutta la riga</button>
        <p id="return-preview" class="return-preview">Inserisci la quantità restituita per vedere il rimborso.</p>
        <div class="return-actions"><button type="button" class="ghost" data-cancel-return>Annulla</button><button type="submit">Registra reso</button></div>
      </form>
    </section>
  </div>`;
}

function applySaleReturn(form) {
  const movement = db.movimenti.find((item) => item.id === form.dataset.saleId && item.tipo === 'uscita');
  if (!movement || movement.annullato) throw new Error('Questa vendita non è più disponibile per un reso.');
  const lot = lotById(movement.lotto_id);
  if (!lot) throw new Error('La partita collegata alla vendita non esiste più.');
  const data = new FormData(form);
  const result = calculateSaleReturn(movement, data.get('colli'), data.get('peso'));
  const returnDate = String(data.get('data_reso') || today());
  const accountAction = data.get('gestione_conto') === 'rimborso' ? 'rimborso' : 'credito';
  const method = String(data.get('metodo') || 'Contanti');
  const note = String(data.get('note') || '').trim();

  if (movement.colliOriginali === undefined) movement.colliOriginali = Number(movement.colli || 0);
  if (movement.pesoOriginale === undefined) movement.pesoOriginale = Number(movement.peso || 0);
  if (movement.totaleOriginale === undefined) movement.totaleOriginale = Number(movement.totale || 0);
  if (movement.imponibileOriginale === undefined) movement.imponibileOriginale = Number(movement.imponibile || movement.totale || 0);
  if (movement.ivaOriginale === undefined) movement.ivaOriginale = Number(movement.iva || 0);

  if (Number(lot.colli_iniziali || 0) > 0) lot.colli_rimanenti = roundQty(Number(lot.colli_rimanenti || 0) + result.returnedPackages);
  if (Number(lot.peso_iniziale || 0) > 0) lot.peso_rimanente = roundQty(Number(lot.peso_rimanente || 0) + result.returnedWeight);
  if (lotStatus(lot) !== 'terminata') delete lot.terminatoIl;

  movement.colli = result.remainingPackages;
  movement.peso = result.remainingWeight;
  movement.imponibile = result.amounts.taxable;
  movement.iva = result.amounts.vat;
  movement.totale = result.amounts.total;
  movement.annullato = result.full;
  movement.resoParziale = !result.full;
  movement.resoIl = stamp();
  movement.resoDateKey = returnDate;
  movement.resoDa = operatorName();
  if (!Array.isArray(movement.resi)) movement.resi = [];
  movement.resi.push({
    id: id(), dateKey: returnDate, data: formatDateKey(returnDate), colli: result.returnedPackages,
    peso: result.returnedWeight, importo: result.refund, gestioneConto: accountAction, metodo: method,
    note, operatore: operatorName(), operatore_uid: signedUser?.uid || '',
  });

  if (accountAction === 'rimborso' && result.refund > 0) {
    if (!Array.isArray(db.pagamenti)) db.pagamenti = [];
    db.pagamenti.push({
      id: id(), cliente_id: movement.cliente_id, reso_movimento_id: movement.id,
      dateKey: returnDate, data: formatDateKey(returnDate), importo: roundMoney(-result.refund), metodo: method,
      note: `Rimborso reso · ${name('prodotti', movement.prodotto_id)}${note ? ` · ${note}` : ''}`,
      operatore: operatorName(), operatore_uid: signedUser?.uid || '',
    });
  }

  const returnedText = [result.returnedPackages ? `${formatQty(result.returnedPackages)} colli` : '', result.returnedWeight ? `${formatQty(result.returnedWeight)} kg` : ''].filter(Boolean).join(' · ');
  audit(result.full ? 'Reso completo' : 'Reso parziale', `${name('prodotti', movement.prodotto_id)} · cliente ${name('clienti', movement.cliente_id)} · ${returnedText} · ${accountAction === 'rimborso' ? `rimborsati ${eur(result.refund)}` : `credito ridotto di ${eur(result.refund)}`}`);
  return movement.dateKey || today();
}

function formDataObject(form, fields) {
  const data = new FormData(form);
  return Object.fromEntries(fields.map((field) => [field, String(data.get(field) || '').trim()]));
}

function saveClosing(form) {
  const dateKey = form.dataset.date || today();
  const formData = new FormData(form);
  const rows = currentClosingRows().map((row) => ({
    ...row,
    actualColli: row.tracksColli ? roundQty(Number(formData.get(`colli_${row.lotto_id}`) || 0)) : 0,
    actualKg: row.tracksKg ? roundQty(Number(formData.get(`kg_${row.lotto_id}`) || 0)) : 0,
  }));
  const record = { id: `chiusura-${dateKey}`, dateKey, data: formatDateKey(dateKey), salvataIl: stamp(), operatore: operatorName(), operatore_uid: signedUser?.uid || '', righe: rows };
  if (!Array.isArray(db.chiusure)) db.chiusure = [];
  db.chiusure = db.chiusure.filter((closing) => closing.dateKey !== dateKey).concat(record);
  audit('Chiusura giornata salvata', `${formatDateKey(dateKey)} · ${rows.length} rimanenze controllate`);
  return record;
}

function openClosingPreview(closing) {
  if (!closing) throw new Error('Salva prima la chiusura della giornata.');
  const rows = closing.righe || [];
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Il browser ha bloccato la finestra. Consenti i popup e riprova.');
  const body = rows.map((row) => {
    const diffColli = roundQty(Number(row.actualColli || 0) - Number(row.expectedColli || 0));
    const diffKg = roundQty(Number(row.actualKg || 0) - Number(row.expectedKg || 0));
    const difference = [row.tracksColli ? (diffColli === 0 ? 'Coincide' : `${diffColli > 0 ? '+' : ''}${formatQty(diffColli)} colli`) : '', row.tracksKg ? (diffKg === 0 ? 'Coincide' : `${diffKg > 0 ? '+' : ''}${formatQty(diffKg)} kg`) : ''].filter(Boolean).join(' / ');
    return `<tr><td><b>${esc(row.prodotto)}</b></td><td>${esc(row.proprietario || '—')}</td><td>${esc(row.qualita || 'Standard')}</td><td>${row.tracksColli ? formatQty(row.expectedColli) : '—'}</td><td>${row.tracksColli ? formatQty(row.actualColli) : '—'}</td><td>${row.tracksKg ? formatQty(row.expectedKg) : '—'}</td><td>${row.tracksKg ? formatQty(row.actualKg) : '—'}</td><td><b>${difference}</b></td></tr>`;
  }).join('');
  preview.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Chiusura ${esc(closing.data)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:12px Arial;color:#172334;margin:20px}header{display:flex;justify-content:space-between;border-bottom:3px solid #147654;padding-bottom:10px;margin-bottom:18px}h1{margin:0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aeb8be;padding:8px;text-align:left}th{background:#eef4f1;font-size:10px;text-transform:uppercase}.toolbar{margin-bottom:16px}.toolbar button{padding:10px 15px;border:0;border-radius:8px;background:#147654;color:#fff;font-weight:700}@media print{.toolbar{display:none}body{margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Stampa / Salva PDF</button></div><header><div><small>EUROFRUTTA</small><h1>Rimanenze di fine giornata</h1></div><b>${esc(displayDateOnly(closing.data, closing.dateKey))}</b></header><table><tr><th>Articolo</th><th>Fornitore</th><th>Pezzatura</th><th>Attesi colli</th><th>Contati colli</th><th>Attesi kg</th><th>Contati kg</th><th>Differenza</th></tr>${body}</table><p>Conteggio registrato da ${esc(closing.operatore || '—')}.</p></body></html>`);
  preview.document.close();
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
      globalSearchResultsElement.innerHTML = homeSearch.trim() ? globalSearchResults(homeSearch) : '';
    };
    $('#clear-global-search').onclick = () => {
      homeSearch = '';
      globalSearch.value = '';
      globalSearchResultsElement.innerHTML = '';
      globalSearch.focus();
    };
    bindGlobalSearchNavigation();
  }

  const returnsFilterForm = $('#returns-filter-form');
  if (returnsFilterForm) {
    returnsFilterForm.onsubmit = (event) => {
      event.preventDefault();
      const data = new FormData(returnsFilterForm);
      returnsSearch = String(data.get('ricerca') || '').trim();
      returnsDate = String(data.get('data_vendita') || '');
      render();
    };
    $('#clear-returns-filter').onclick = () => {
      returnsSearch = '';
      returnsDate = '';
      render();
    };
  }

  document.querySelectorAll('[data-home-product]').forEach((button) => {
    button.onclick = () => {
      expandedHomeProduct = expandedHomeProduct === button.dataset.homeProduct ? '' : button.dataset.homeProduct;
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
        message.textContent = 'Registrazione arrivo…';
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

  const correctionForm = $('#correction-form');
  if (correctionForm) {
    correctionForm.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#correction-msg');
      try {
        addCorrection(new FormData(correctionForm));
        await save();
        message.className = 'message';
        message.textContent = 'Correzione salvata.';
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

  document.querySelectorAll('[data-account-client]').forEach((button) => {
    button.onclick = () => {
      selectedClient = button.dataset.accountClient;
      current = 'clienti';
      render();
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

  const paymentForm = $('#payment-form');
  if (paymentForm) {
    paymentForm.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#payment-msg');
      try {
        addPayment(new FormData(paymentForm), paymentForm.dataset.clientId);
        await save();
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  const closingDateInput = $('#closing-date');
  if (closingDateInput) {
    closingDateInput.onchange = () => {
      closingDate = closingDateInput.value || today();
      render();
    };
  }
  const closingForm = $('#closing-form');
  if (closingForm) {
    closingForm.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#closing-msg');
      try {
        saveClosing(closingForm);
        await save();
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }
  document.querySelectorAll('[data-print-closing]').forEach((button) => {
    button.onclick = () => {
      try { openClosingPreview(savedClosing(button.dataset.printClosing)); } catch (error) { alert(`Errore: ${error.message}`); }
    };
  });

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
        const result = addSale(new FormData(movementForm));
        await save();
        current = 'home';
        render();
        if (result.finished) alert(`Partita ${result.partita} terminata. Ora puoi generare il biglietto della giornata.`);
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
    };
  }

  const pitLineForm = $('#pit-line-form');
  if (pitLineForm) {
    const productInput = $('#pit-product-search');
    const productResults = $('#pit-product-results');
    const refreshProductResults = () => {
      if (productInput?.dataset.selectedLotId) {
        if (productResults) productResults.innerHTML = '';
        return;
      }
      if (productResults) productResults.innerHTML = pitProductSearchResults(productInput?.value || '');
    };
    const selectPitLot = (lot) => {
      if (!lot || !productInput) return;
      productInput.value = lotSearchName(lot);
      productInput.dataset.selectedLotId = lot.id;
      productInput.setAttribute('aria-expanded', 'false');
      if (productResults) productResults.innerHTML = '';
      pitLineForm.querySelector('[name="colli"]')?.focus();
    };
    const moveFormFocus = (target) => {
      const controls = [...pitLineForm.querySelectorAll('input:not([type="hidden"]), select, button:not([disabled])')]
        .filter((control) => control.offsetParent !== null && !control.closest('#pit-product-results'));
      let index = controls.indexOf(target);
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        while (controls[index + 1] instanceof HTMLInputElement
          && controls[index + 1].type === 'radio'
          && controls[index + 1].name === target.name) index += 1;
      }
      controls[index + 1]?.focus();
    };
    if (productInput) {
      productInput.oninput = () => {
        delete productInput.dataset.selectedLotId;
        productInput.setAttribute('aria-expanded', 'true');
        refreshProductResults();
      };
      productInput.onfocus = refreshProductResults;
      productInput.onblur = () => {
        window.setTimeout(() => {
          if (!productResults?.contains(document.activeElement)) productResults.innerHTML = '';
        }, 120);
      };
      productInput.onkeydown = (event) => {
        const options = [...(productResults?.querySelectorAll('[data-pick-pit-lot]') || [])];
        if (event.key === 'ArrowDown' && options.length) {
          event.preventDefault();
          options[0].focus();
          return;
        }
        if (event.key === 'Escape') {
          if (productResults) productResults.innerHTML = '';
          return;
        }
        if (event.key !== 'Enter') return;
        const matches = matchingLots(productInput.value, 20);
        event.preventDefault();
        if (matches.length === 1) selectPitLot(matches[0]);
        else options[0]?.focus();
      };
    }
    if (productResults) {
      productResults.onclick = (event) => {
        const button = event.target.closest('[data-pick-pit-lot]');
        if (!button) return;
        selectPitLot(lotById(button.dataset.pickPitLot));
      };
      productResults.onkeydown = (event) => {
        const button = event.target.closest('[data-pick-pit-lot]');
        if (!button) return;
        const options = [...productResults.querySelectorAll('[data-pick-pit-lot]')];
        const index = options.indexOf(button);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          options[Math.min(index + 1, options.length - 1)]?.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (index <= 0) productInput?.focus();
          else options[index - 1]?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          productInput?.focus();
          productResults.innerHTML = '';
        }
      };
    }
    pitLineForm.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.isComposing || event.key !== 'Enter') return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.tagName === 'BUTTON') return;
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        event.preventDefault();
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        moveFormFocus(target);
        return;
      }
      if (target.matches('input, select')) {
        event.preventDefault();
        moveFormFocus(target);
      }
    });
    pitLineForm.onsubmit = (event) => {
      event.preventDefault();
      const message = $('#pit-msg');
      try {
        addPitDraftRow(new FormData(pitLineForm));
        render();
        $('#pit-product-search')?.focus();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  const pitClientNameInput = $('#pit-client-name');
  if (pitClientNameInput) pitClientNameInput.oninput = () => { pitClientDraft.clienteNome = pitClientNameInput.value; };
  const pitPaymentStatus = $('#pit-payment-status');
  if (pitPaymentStatus) pitPaymentStatus.onchange = () => { pitClientDraft.statoPagamento = pitPaymentStatus.value === 'pagato' ? 'pagato' : 'credito'; };
  const pitPaymentMethod = $('#pit-payment-method');
  if (pitPaymentMethod) pitPaymentMethod.onchange = () => { pitClientDraft.metodoPagamento = pitPaymentMethod.value || 'Contanti'; };
  const pitVatMode = $('#pit-vat-mode');
  if (pitVatMode) pitVatMode.onchange = () => { pitClientDraft.ivaModalita = normalizeVatMode(pitVatMode.value); };

  $('[data-new-pit-client]')?.addEventListener('click', () => {
    if (pitClientDraft.righe?.length && !confirm('Cambiare cliente e cancellare le righe non ancora registrate?')) return;
    pitClientDraft = {
      clienteNome: '',
      statoPagamento: 'credito',
      metodoPagamento: 'Contanti',
      ivaModalita: normalizeVatMode(pitClientDraft.ivaModalita),
      righe: [],
    };
    lastPitClientTicket = null;
    render();
    $('#pit-client-name')?.focus();
  });

  const savePitTicket = $('#save-pit-ticket');
  if (savePitTicket) {
    savePitTicket.onclick = async () => {
      const message = $('#pit-msg');
      const dbBackup = JSON.parse(JSON.stringify(db));
      const draftBackup = JSON.parse(JSON.stringify(pitClientDraft));
      try {
        pitClientDraft.clienteNome = String($('#pit-client-name')?.value || pitClientDraft.clienteNome).trim();
        pitClientDraft.statoPagamento = $('#pit-payment-status')?.value === 'pagato' ? 'pagato' : 'credito';
        pitClientDraft.metodoPagamento = String($('#pit-payment-method')?.value || 'Contanti');
        pitClientDraft.ivaModalita = normalizeVatMode($('#pit-vat-mode')?.value || pitClientDraft.ivaModalita);
        message.className = 'message';
        message.textContent = 'Registrazione del biglietto…';
        const results = commitPitClientDraft(pitazzoDate || today());
        await save();
        if (results[0]?.clientId) lastPitClientTicket = { dateKey: results[0].dateKey, clientId: results[0].clientId };
        render();
        const finished = results.filter((result) => result.finished).map((result) => result.partita);
        if (finished.length) alert(`Partita terminata: ${finished.join(', ')}. Ora puoi generare i biglietti della giornata.`);
      } catch (error) {
        db = dbBackup;
        pitClientDraft = draftBackup;
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  document.querySelectorAll('[data-remove-pit-row]').forEach((button) => {
    button.onclick = () => {
      pitClientDraft.righe = (pitClientDraft.righe || []).filter((row) => row.id !== button.dataset.removePitRow);
      render();
    };
  });

  $('[data-clear-pit-draft]')?.addEventListener('click', () => {
    if (pitClientDraft.righe?.length && !confirm('Svuotare tutte le righe del biglietto cliente?')) return;
    pitClientDraft = {
      clienteNome: pitClientDraft.clienteNome,
      statoPagamento: pitClientDraft.statoPagamento,
      metodoPagamento: pitClientDraft.metodoPagamento,
      ivaModalita: normalizeVatMode(pitClientDraft.ivaModalita),
      righe: [],
    };
    render();
  });

  document.querySelectorAll('[data-client]').forEach((button) => {
    button.onclick = () => {
      const client = db.clienti.find((item) => item.id === button.dataset.client);
      const input = $('#pit-client-name');
      if (client && input) {
        if (pitClientDraft.righe?.length && normalized(pitClientDraft.clienteNome) !== normalized(client.nome) && !confirm('Cambiare cliente e cancellare le righe non ancora registrate?')) return;
        if (normalized(pitClientDraft.clienteNome) !== normalized(client.nome)) pitClientDraft.righe = [];
        input.value = client.nome;
        pitClientDraft.clienteNome = client.nome;
      }
    };
  });

  document.querySelectorAll('[data-lot]').forEach((button) => {
    button.onclick = () => {
      const lot = lotById(button.dataset.lot);
      const input = $('#pit-product-search');
      if (lot && input) {
        input.value = lotSearchName(lot);
        const results = $('#pit-product-results');
        if (results) results.innerHTML = '';
        $('#pit-line-form [name="colli"]')?.focus();
      }
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

  document.querySelectorAll('[data-print-client-ticket]').forEach((button) => {
    button.onclick = () => {
      try {
        openClientTicketPreview([clientTicketData(button.dataset.ticketDate || ticketsDate || pitazzoDate || today(), button.dataset.printClientTicket)]);
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('[data-print-client-day]').forEach((button) => {
    button.onclick = () => {
      try {
        openClientTicketPreview(dailyClientTickets(button.dataset.printClientDay || ticketsDate || today()));
      } catch (error) {
        alert(`Errore: ${error.message}`);
      }
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

  document.querySelectorAll('[data-edit-ticket]').forEach((button) => {
    button.onclick = () => {
      editingTicketId = button.dataset.editTicket;
      editingSaleId = '';
      render();
      $('#ticket-settings-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
  $('[data-cancel-ticket-edit]')?.addEventListener('click', () => {
    editingTicketId = '';
    render();
  });
  const ticketSettings = $('#ticket-settings-form');
  if (ticketSettings) {
    ticketSettings.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#ticket-settings-msg');
      try {
        const dateKey = updateTicketSettings(ticketSettings);
        await save();
        ticketsDate = dateKey;
        editingTicketId = '';
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  document.querySelectorAll('[data-edit-sale]').forEach((button) => {
    button.onclick = () => {
      editingSaleId = button.dataset.editSale;
      editingTicketId = '';
      render();
      $('#sale-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
  $('[data-cancel-sale-edit]')?.addEventListener('click', () => {
    editingSaleId = '';
    render();
  });
  const saleEdit = $('#sale-edit-form');
  if (saleEdit) {
    saleEdit.onsubmit = async (event) => {
      event.preventDefault();
      const message = $('#sale-edit-msg');
      try {
        const dates = editSale(saleEdit);
        dates.forEach((dateKey) => {
          db.biglietti = db.biglietti.filter((ticket) => ticket.dateKey !== dateKey);
          if (dailyTicketData(dateKey).length) createTicketRecords(dateKey);
        });
        await save();
        editingSaleId = '';
        render();
      } catch (error) {
        message.className = 'message error';
        message.textContent = `Errore: ${error.message}`;
      }
    };
  }

  document.querySelectorAll('[data-return-sale]').forEach((button) => {
    button.onclick = () => {
      returningSaleId = button.dataset.returnSale;
      editingSaleId = '';
      editingTicketId = '';
      render();
      $('#sale-return-form input[name="colli"], #sale-return-form input[name="peso"]')?.focus();
    };
  });

  document.querySelectorAll('[data-cancel-return]').forEach((button) => {
    button.onclick = () => {
      returningSaleId = '';
      render();
    };
  });
  $('[data-return-backdrop]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return;
    returningSaleId = '';
    render();
  });

  const saleReturn = $('#sale-return-form');
  if (saleReturn) {
    const movement = db.movimenti.find((item) => item.id === saleReturn.dataset.saleId && item.tipo === 'uscita');
    const preview = $('#return-preview');
    const updateReturnPreview = () => {
      try {
        const data = new FormData(saleReturn);
        const result = calculateSaleReturn(movement, data.get('colli'), data.get('peso'));
        preview.className = 'return-preview';
        const remainingText = [
          result.remainingPackages ? `${formatQty(result.remainingPackages)} colli` : '',
          result.remainingWeight ? `${formatQty(result.remainingWeight)} kg` : '',
        ].filter(Boolean).join(' e ') || 'zero';
        preview.textContent = `${result.full ? 'Reso completo' : 'Reso parziale'} · importo ${eur(result.refund)} · restano nella vendita ${remainingText}.`;
      } catch (error) {
        preview.className = 'return-preview error';
        preview.textContent = error.message;
      }
    };
    saleReturn.querySelectorAll('input[name="colli"],input[name="peso"]').forEach((input) => input.addEventListener('input', updateReturnPreview));
    $('[data-return-all]')?.addEventListener('click', () => {
      const packages = saleReturn.querySelector('input[name="colli"]');
      const weight = saleReturn.querySelector('input[name="peso"]');
      if (packages) packages.value = Number(movement?.colli || 0);
      if (weight) weight.value = Number(movement?.peso || 0);
      updateReturnPreview();
    });
    saleReturn.onsubmit = async (event) => {
      event.preventDefault();
      const previousDb = JSON.parse(JSON.stringify(db));
      try {
        const ticketDate = applySaleReturn(saleReturn);
        db.biglietti = db.biglietti.filter((ticket) => ticket.dateKey !== ticketDate);
        if (dailyTicketData(ticketDate).length) createTicketRecords(ticketDate);
        await save();
        returningSaleId = '';
        ticketsDate = ticketDate;
        render();
        alert('Reso registrato. Magazzino, totale, conto cliente e biglietti sono stati aggiornati.');
      } catch (error) {
        db = previousDb;
        preview.className = 'return-preview error';
        preview.textContent = `Errore: ${error.message}`;
      }
    };
  }

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

  const resetAllButton = $('[data-reset-all]');
  if (resetAllButton) {
    resetAllButton.onclick = async () => {
      resetAllButton.disabled = true;
      resetAllButton.textContent = 'Azzeramento…';
      try {
        if (!(await resetAllBusinessData())) {
          resetAllButton.disabled = false;
          resetAllButton.textContent = 'AZZERA TUTTO';
          return;
        }
        current = 'home';
        render();
        alert('Dati di lavoro azzerati. Eurofrutta è pronto per iniziare da zero.');
      } catch (error) {
        resetAllButton.disabled = false;
        resetAllButton.textContent = 'AZZERA TUTTO';
        alert(`Errore: ${error.message}`);
      }
    };
  }
}

const PRESENCE_TIMEOUT_MS = 65000;

function presenceRecord(online = true, transition = 'heartbeat') {
  const now = Date.now();
  const record = {
    uid: signedUser?.uid || '',
    email: userEmail(),
    username: operatorName(),
    ruolo: isAdmin() ? 'amministratore' : 'operatore',
    online,
    aggiornato: now,
  };
  if (transition === 'enter') record.ultimo_accesso = now;
  if (transition === 'exit') record.ultima_uscita = now;
  return record;
}

function presenceDateTime(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return '—';
  return new Date(numericValue).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function presenceIsOnline(person) {
  return Boolean(person?.online) && Number(person?.aggiornato || 0) > Date.now() - PRESENCE_TIMEOUT_MS;
}

function renderOnlineUsers() {
  const panel = $('#online-panel');
  if (!panel) return;
  const people = onlineUsers.slice().sort((first, second) => {
    const onlineDifference = Number(presenceIsOnline(second)) - Number(presenceIsOnline(first));
    return onlineDifference || Number(second.aggiornato || 0) - Number(first.aggiornato || 0);
  });
  panel.innerHTML = people.length ? `<div class="presence-list">${people.map((person) => {
    const online = presenceIsOnline(person);
    const lastExit = person.ultima_uscita || (!online ? person.aggiornato : 0);
    return `<div class="presence-user${online ? '' : ' offline'}"><span class="presence-person"><span class="presence-dot${online ? '' : ' offline'}"></span><span><b>${esc(person.username || 'Utente')}</b><small>${esc(person.ruolo || 'operatore')}</small></span></span><span class="presence-times"><b class="${online ? 'presence-online' : 'presence-offline'}">${online ? 'Online adesso' : 'Offline'}</b><small>Entrato: ${esc(presenceDateTime(person.ultimo_accesso))}</small><small>Uscito: ${esc(presenceDateTime(lastExit))}</small></span></div>`;
  }).join('')}</div>` : '<p class="empty">Nessuna presenza ancora registrata.</p>';
}

async function heartbeatPresence(online = true, transition = 'heartbeat') {
  if (!signedUser || !isAuthorized()) return;
  try {
    await setDoc(doc(store, 'presenze', signedUser.uid), presenceRecord(online, transition), { merge: true });
  } catch (error) {
    // La presenza non deve mai bloccare il lavoro nel gestionale.
  }
}

function markPresenceEntered() {
  if (!signedUser || !isAuthorized()) return Promise.resolve();
  if (presenceSessionActive) return heartbeatPresence(true);
  presenceSessionActive = true;
  return heartbeatPresence(true, 'enter');
}

function markPresenceExited() {
  if (!signedUser || !isAuthorized() || !presenceSessionActive) return Promise.resolve();
  presenceSessionActive = false;
  return heartbeatPresence(false, 'exit');
}

function bindPresenceLifecycle() {
  if (presenceLifecycleBound) return;
  presenceLifecycleBound = true;
  const announceExit = () => { void markPresenceExited(); };
  window.addEventListener('pagehide', announceExit);
  window.addEventListener('beforeunload', announceExit);
  window.addEventListener('pageshow', () => {
    if (signedUser && isAuthorized()) void markPresenceEntered();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && signedUser && isAuthorized()) void markPresenceEntered();
  });
}

function startPresence() {
  if (!signedUser) return;
  if (presenceTimer) clearInterval(presenceTimer);
  if (presenceUnsubscribe) presenceUnsubscribe();
  bindPresenceLifecycle();
  void markPresenceEntered();
  presenceTimer = setInterval(() => {
    if (!document.hidden) void heartbeatPresence(true);
    renderOnlineUsers();
  }, 25000);
  if (isAdmin()) {
    presenceUnsubscribe = onSnapshot(collection(store, 'presenze'), (snapshot) => {
      onlineUsers = snapshot.docs.map((item) => item.data());
      renderOnlineUsers();
    }, () => { onlineUsers = []; renderOnlineUsers(); });
  }
}

async function stopPresence() {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  if (presenceUnsubscribe) presenceUnsubscribe();
  presenceUnsubscribe = null;
  await markPresenceExited();
}

function startDataSubscription() {
  ensureAppStyles();
  document.body.classList.add('eurofrutta-shell');
  ensureDynamicNav();
  $('#nav').hidden = false;
  $('#user').innerHTML = `<span class="presence-dot" title="Sei online"></span>${isAdmin() ? '<span title="Amministratore">♛</span> ' : ''}<b>${esc(operatorName())}</b>${isAdmin() ? ' · Amministratore' : ' · Operatore'} <button id="out">Esci</button>`;
  $('#out').onclick = logout;
  startPresence();

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
        pagamenti: Array.isArray(saved.pagamenti) ? saved.pagamenti : [],
        chiusure: Array.isArray(saved.chiusure) ? saved.chiusure : [],
        registro: Array.isArray(saved.registro) ? saved.registro : [],
      };
      baseDb = JSON.parse(JSON.stringify(db));
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
  if (!user && (presenceTimer || presenceUnsubscribe)) await stopPresence();
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
