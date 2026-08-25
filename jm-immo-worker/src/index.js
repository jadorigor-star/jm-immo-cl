/**
 * JM Immo — Worker Cloudflare
 * Contrairement au sandbox de développement, ce Worker a un vrai accès
 * réseau sortant : la collecte Bussard Immobilier est donc une tentative
 * RÉELLE en direct (marquée "best-effort" tant qu'elle n'a pas tourné en
 * production — cf. art. 25, une source en échec ne doit jamais casser le
 * moteur : en cas d'échec, on retombe silencieusement sur le jeu de démo).
 *
 * Pas de base de données ici (D1 non provisionnée) : Écartés/Favoris/
 * préférences restent gérés côté navigateur (localStorage), comme dans
 * la version autonome. Le Worker ne fournit que les annonces.
 */

// ---------- art. 3 — référentiel régional ----------
const REGION_MAP = {
  "lugano":"Tessin","bellinzona":"Tessin","locarno":"Tessin","mendrisio":"Tessin","chiasso":"Tessin",
  "saignelégier":"Jura – Franches-Montagnes","le noirmont":"Jura – Franches-Montagnes",
  "saint-ursanne":"Jura – Clos du Doubs","ocourt":"Jura – Clos du Doubs",
  "zweisimmen":"Zweisimmen",
  "gruyères":"Gruyère","bulle":"Gruyère","charmey":"Gruyère","broc":"Gruyère","riaz":"Gruyère",
  "vuadens":"Gruyère","jaun":"Gruyère","crésuz":"Gruyère","la roche":"Gruyère","porsel":"Gruyère",
  "montbovon":"Gruyère","im fang":"Gruyère","enney":"Gruyère","saint-martin":"Gruyère",
  "neuchâtel":"Neuchâtel","la chaux-de-fonds":"Neuchâtel",
};
const JURA_HORS_PERIMETRE = new Set(["delémont","porrentruy","courgenay","bassecourt","develier","soyhières"]);

function computeRegion(locality) {
  const key = (locality || "").trim().toLowerCase().replace(/\s*\([^)]*\)/, "");
  if (JURA_HORS_PERIMETRE.has(key)) return null;
  return REGION_MAP[key] || null;
}

function isPlausiblePrice(p) {
  if (typeof p !== "number" || isNaN(p)) return false;
  if (p < 50000 || p > 5000000) return false;
  return true;
}

function bienKey(locality, type, rooms, surface) {
  const loc = (locality || "").trim().toLowerCase();
  const roomsR = Math.round((rooms || 0) * 2) / 2;
  const surfR = Math.round((surface || 0) / 5) * 5;
  return `${loc}|${type}|${roomsR}|${surfR}`;
}

// ---------- art. 20 — signaux (heuristiques, cf. limites documentées) ----------
function scoreListing(l) {
  const cachetKw = ["rénové","historique","authentique","cachet","charme","chalet"];
  const cachet = cachetKw.some(k => (l.title || "").toLowerCase().includes(k));
  return {
    deal: 55,
    retraite: (l.rooms && l.rooms <= 4.5) ? 65 : 50,
    locatif: 45,
    cachet: cachet ? 85 : 20,
    risk: 60,
  };
}
function jmFit(scores, weights) {
  const wsum = Math.max(1, Object.values(weights).reduce((a,b)=>a+b,0));
  const fit = (scores.deal*weights.deal + scores.retraite*weights.retraite + scores.locatif*weights.locatif
             + scores.cachet*weights.cachet + scores.risk*weights.risk) / wsum;
  return Math.round(Math.max(0, Math.min(100, fit)));
}

// ---------- Jeu de démo (filet de sécurité — art. 25) ----------
const DEMO_LISTINGS = [
  {source:"Comparis", url:"https://comparis.ch/immobilier/annonce/482910", title:"Appartement 3.5p rénové, vue lac", locality:"Lugano", type:"Appartement", rooms:3.5, surface:95, price:478000, confidence:"Vérifiée"},
  {source:"Agence des Franches-Montagnes", url:"https://agence-fm.ch/biens/ferme-12", title:"Ferme jurassienne rénovée avec cachet", locality:"Saignelégier", type:"Maison", rooms:5.5, surface:140, price:395000, confidence:"À contrôler"},
  {source:"Agence de Zweisimmen", url:"https://agence-zweisimmen.ch/chalet-9", title:"Chalet avec cachet, vue alpage", locality:"Zweisimmen", type:"Chalet", rooms:4.5, surface:110, price:459000, confidence:"Vérifiée"},
  {source:"Fidimmobil", url:"https://fidimmobil.ch/bien/chaux-3", title:"Appartement 3 pièces, quartier calme", locality:"La Chaux-de-Fonds", type:"Appartement", rooms:3, surface:72, price:289000, confidence:"Vérifiée"},
];

// ---------- Collecte live Bussard Immobilier (Gruyère) — best-effort réel ----------
async function fetchBussardLive() {
  try {
    const res = await fetch("https://www.bussard.ch/fr/acheter", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JMImmoBot/1.0)" },
    });
    if (!res.ok) return { listings: [], state: "accessible", error: `HTTP ${res.status}` };
    const html = await res.text();

    // Motif observé sur le site (titre localité > titre bien > type|pièces|surface|prix > lien)
    // Tolérant : essaie plusieurs variantes de structure HTML.
    const listings = [];
    const blockRe = /<h5[^>]*>([^<(]+)(?:\([^)]*\))?<\/h5>[\s\S]{0,600}?(Appartement|Maison|Terrain|Immeuble|Business)[\s\S]{0,20}?(?:([\d.]+)\s*pi[eè]ces?)?[\s\S]{0,20}?(?:([\d.]+)\s*m2)?[\s\S]{0,60}?CHF\s*([\d'’]+)\.-[\s\S]{0,300}?href="([^"]+)"/gi;
    let m;
    while ((m = blockRe.exec(html)) !== null) {
      const price = parseFloat(m[5].replace(/['’]/g, ""));
      if (!isPlausiblePrice(price)) continue;
      listings.push({
        source: "Bussard Immobilier", url: m[6].startsWith("http") ? m[6] : "https://www.bussard.ch" + m[6],
        title: m[1].trim() + " — " + m[2], locality: m[1].trim(), type: m[2],
        rooms: m[3] ? parseFloat(m[3]) : null, surface: m[4] ? parseFloat(m[4]) : null,
        price, confidence: "Probable",
      });
    }
    return { listings, state: listings.length ? "productive" : "accessible", error: null };
  } catch (e) {
    // art. 25 — dégrade cette source uniquement, jamais le moteur entier
    return { listings: [], state: "enregistrée", error: String(e) };
  }
}

// ---------- Pipeline (ordre art. 23, simplifié : pas d'Écartés côté serveur ici) ----------
function runPipeline(rawListings, weights) {
  const groups = {};
  for (const l of rawListings) {
    if (!l.title || !l.locality || !isPlausiblePrice(l.price)) continue;
    const region = computeRegion(l.locality);
    if (!region) continue;
    const key = bienKey(l.locality, l.type, l.rooms, l.surface);
    if (!groups[key]) groups[key] = { ...l, id: key, region, sources: [] };
    groups[key].sources.push({ name: l.source, url: l.url });
  }
  const biens = Object.values(groups).map(b => {
    const scores = scoreListing(b);
    const fit = jmFit(scores, weights);
    return { ...b, jmFit: fit, isOpportunity: fit >= 70 };
  });
  biens.sort((a, b) => b.jmFit - a.jmFit);
  return biens;
}

const DEFAULT_WEIGHTS = { deal: 4, retraite: 2, locatif: 2, cachet: 3, risk: 3 };

// ---------- Frontend minimal (persistance Écartés/Favoris en localStorage) ----------
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JM Immo — live</title>
<style>
body{background:#0E1116;color:#E7EAEE;font-family:sans-serif;margin:0;padding:16px;}
h1{font-size:20px;} .card{background:#161B22;border:1px solid #262E3A;border-radius:12px;padding:14px;margin-bottom:10px;}
.price{font-weight:700;} .tag{font-size:11px;background:#1D2430;padding:3px 8px;border-radius:6px;margin-right:5px;color:#8992A3;}
.btn{padding:7px 10px;border-radius:8px;border:1px solid #262E3A;background:#1D2430;color:#E7EAEE;font-size:12px;margin-right:6px;}
.btn.on{background:#241d10;color:#D6A24E;} .muted{color:#8992A3;font-size:12px;}
</style></head><body>
<h1>JM Immo — collecte live</h1>
<p class="muted" id="status">Chargement…</p>
<div id="list"></div>
<script>
const favoris = JSON.parse(localStorage.getItem('jm-favoris')||'[]');
const discarded = JSON.parse(localStorage.getItem('jm-discarded')||'{}');
function save(){ localStorage.setItem('jm-favoris', JSON.stringify(favoris)); localStorage.setItem('jm-discarded', JSON.stringify(discarded)); render(); }
let DATA = [];
async function load(){
  const res = await fetch('/api/listings');
  const data = await res.json();
  DATA = data.biens;
  document.getElementById('status').textContent =
    data.bussard_state === 'productive' ? ('Collecte live Bussard : ' + data.bussard_count + ' annonce(s) réelles + démo')
    : 'Collecte live indisponible pour le moment (' + data.bussard_state + ') — démo affichée';
  render();
}
function render(){
  document.getElementById('list').innerHTML = DATA.filter(b=>!discarded[b.id]).map(b => \`
    <div class="card">
      <b>\${b.title}</b><br><span class="muted">\${b.locality} · \${b.region}</span>
      <div class="price">CHF \${Math.round(b.price).toLocaleString('fr-CH')}</div>
      <div><span class="tag">\${b.type}</span><span class="tag">JM Fit \${b.jmFit}</span>\${b.isOpportunity?'<span class="tag">Opportunité</span>':''}</div>
      <div class="muted">\${b.sources.length} source(s) : \${b.sources.map(s=>s.name).join(', ')}</div>
      <div style="margin-top:8px">
        <button class="btn" onclick="discard('\${b.id}')">Écarter</button>
        <button class="btn \${favoris.includes(b.id)?'on':''}" onclick="fav('\${b.id}')">\${favoris.includes(b.id)?'★':'☆'} Favori</button>
      </div>
    </div>\`).join('');
}
function discard(id){ discarded[id]=true; save(); }
function fav(id){ const i=favoris.indexOf(id); if(i>=0) favoris.splice(i,1); else favoris.push(id); save(); }
load();
</script>
</body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/listings") {
      const bussard = await fetchBussardLive();
      const allRaw = [...DEMO_LISTINGS, ...bussard.listings];
      const biens = runPipeline(allRaw, DEFAULT_WEIGHTS);
      return new Response(JSON.stringify({
        biens, bussard_state: bussard.state, bussard_count: bussard.listings.length, bussard_error: bussard.error,
      }), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response(FRONTEND_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
