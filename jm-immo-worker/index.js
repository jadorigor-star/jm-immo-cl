/**
 * JM Immo — Worker Cloudflare complet (fichier unique)
 * Implémente le cahier des charges Phase 2 (baseline V9.3.8) avec
 * persistance réelle D1 : Écartés, Favoris, préférences, historique
 * survivent aux redéploiements (art. 2, 24).
 */

// =========================================================================
// RÈGLES MÉTIER (art. 3-4, 10, 16-20)
// =========================================================================
const SOURCE_TIMEOUT_MS = 8000; // limite par requête individuelle, art. 25
const REGION_MAP = {
  "lugano":"Tessin","bellinzona":"Tessin","locarno":"Tessin","mendrisio":"Tessin","chiasso":"Tessin",
  "ascona":"Tessin","biasca":"Tessin","gordola":"Tessin","gordevio":"Tessin","riva san vitale":"Tessin",
  "massagno":"Tessin","paradiso":"Tessin","lamone":"Tessin","agno":"Tessin","caslano":"Tessin",
  "minusio":"Tessin","muralto":"Tessin","losone":"Tessin","tenero":"Tessin","giubiasco":"Tessin",
  "saignelégier":"Jura – Franches-Montagnes","saignelegier":"Jura – Franches-Montagnes",
  "le noirmont":"Jura – Franches-Montagnes","les bois":"Jura – Franches-Montagnes",
  "muriaux":"Jura – Franches-Montagnes","montfaucon":"Jura – Franches-Montagnes",
  "les breuleux":"Jura – Franches-Montagnes","le bémont":"Jura – Franches-Montagnes",
  "les genevez":"Jura – Franches-Montagnes","lajoux":"Jura – Franches-Montagnes",
  "saint-ursanne":"Jura – Clos du Doubs","st-ursanne":"Jura – Clos du Doubs",
  "ocourt":"Jura – Clos du Doubs","épauvillers":"Jura – Clos du Doubs","epauvillers":"Jura – Clos du Doubs",
  "montenol":"Jura – Clos du Doubs","montmelon":"Jura – Clos du Doubs","seleute":"Jura – Clos du Doubs",
  "soubey":"Jura – Clos du Doubs",
  "zweisimmen":"Zweisimmen","st. stephan":"Zweisimmen","saint-etienne":"Zweisimmen",
  "grubenwald":"Zweisimmen","reidenbach":"Zweisimmen",
  "gruyères":"Gruyère","gruyeres":"Gruyère","bulle":"Gruyère","charmey":"Gruyère","broc":"Gruyère",
  "riaz":"Gruyère","vuadens":"Gruyère","jaun":"Gruyère","crésuz":"Gruyère","cresuz":"Gruyère",
  "la roche":"Gruyère","porsel":"Gruyère","montbovon":"Gruyère","im fang":"Gruyère","enney":"Gruyère",
  "saint-martin":"Gruyère","botterens":"Gruyère","corbières":"Gruyère","echarlens":"Gruyère",
  "grandvillard":"Gruyère","pont-la-ville":"Gruyère","sorens":"Gruyère","haut-intyamon":"Gruyère",
  "bas-intyamon":"Gruyère",
  "neuchâtel":"Neuchâtel","neuchatel":"Neuchâtel","la chaux-de-fonds":"Neuchâtel","le locle":"Neuchâtel",
  "peseux":"Neuchâtel","corcelles":"Neuchâtel","cormondrèche":"Neuchâtel","boudry":"Neuchâtel",
  "colombier":"Neuchâtel","hauterive":"Neuchâtel","saint-blaise":"Neuchâtel","cortaillod":"Neuchâtel",
  "auvernier":"Neuchâtel","marin":"Neuchâtel","le landeron":"Neuchâtel","val-de-ruz":"Neuchâtel",
};
const JURA_HORS_PERIMETRE = new Set([
  "delémont","delemont","porrentruy","courgenay","bassecourt","develier","soyhières","soyhieres",
  "vicques","courroux","courtételle","boncourt","ajoie",
]);
const ALLOWED_REGIONS = ["Tessin","Jura – Franches-Montagnes","Jura – Clos du Doubs","Zweisimmen","Gruyère","Neuchâtel"];
const TYPES = ["Appartement","Maison","Chalet","Rustico","Villa","Maison historique","PPE"];
const CONF_ORDER = { "Vérifiée": 3, "Probable": 2, "À contrôler": 1 };
const CACHET_KEYWORDS = ["rénové","historique","authentique","cachet","poutres","cheminée","charme","chalet","ferme","voûte","madrier"];
const TOURISTIC_REGIONS = new Set(["Tessin","Gruyère","Zweisimmen"]);

function computeRegion(locality, extra) {
  extra = extra || { map: {}, excluded: new Set() };
  const key = (locality || "").trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, "");
  if (JURA_HORS_PERIMETRE.has(key) || extra.excluded.has(key)) return null;
  return REGION_MAP[key] || extra.map[key] || null;
}
function isPlausiblePrice(p) {
  if (typeof p !== "number" || isNaN(p) || !isFinite(p)) return false;
  if (p < 50000 || p > 5000000) return false;
  if (/^0[1-9]/.test(String(Math.round(p)))) return false;
  if (String(Math.round(p)).length === 4 && p < 9999) return false;
  return true;
}
function bienKey(locality, type, rooms, surface) {
  const loc = (locality || "").trim().toLowerCase();
  const roomsR = Math.round((rooms || 0) * 2) / 2;
  const surfR = Math.round((surface || 0) / 5) * 5;
  return loc + "|" + type + "|" + roomsR + "|" + surfR;
}
function estimateDealScore(price, regionPrices) {
  if (!regionPrices || regionPrices.length === 0) return 55;
  const sorted = [...regionPrices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 0) return 55;
  const score = 100 - (price / median - 1) * 120;
  return Math.max(0, Math.min(100, Math.round(score)));
}
function estimateCachetScore(title, cachetFlag) {
  const base = cachetFlag ? 88 : 15;
  const hits = CACHET_KEYWORDS.filter(k => (title || "").toLowerCase().includes(k)).length;
  return Math.max(0, Math.min(100, base + hits * 4));
}
function estimateRetraiteScore(rooms, surface, region) {
  let score = 50;
  if (rooms && rooms <= 4) score += 10;
  if (surface && surface <= 140) score += 10;
  if (["Jura – Clos du Doubs", "Jura – Franches-Montagnes", "Gruyère"].includes(region)) score += 8;
  return Math.max(0, Math.min(100, score));
}
function estimateLocatifScore(region, rooms) {
  let score = 35;
  if (TOURISTIC_REGIONS.has(region)) score += 25;
  if (rooms && rooms <= 3.5) score += 15;
  return Math.max(0, Math.min(100, score));
}
function estimateRiskScore(confidence, historyLen) {
  let score = { "Vérifiée": 80, "Probable": 62, "À contrôler": 45 }[confidence] || 50;
  if (historyLen >= 3) score -= 8;
  return Math.max(0, Math.min(100, score));
}
function jmFit(scores, weights) {
  const wsum = Math.max(1, Object.values(weights).reduce((a, b) => a + b, 0));
  const fit = (scores.deal*weights.deal + scores.retraite*weights.retraite + scores.locatif*weights.locatif
             + scores.cachet*weights.cachet + scores.risk*weights.risk) / wsum;
  return Math.max(0, Math.min(100, Math.round(fit)));
}
function explainFit(scores, weights) {
  const labels = { deal:"prix intéressant", retraite:"potentiel retraite", locatif:"potentiel locatif", cachet:"cachet", risk:"faible risque" };
  const hits = Object.keys(scores).filter(k => weights[k] > 0 && scores[k] >= 60).sort((a,b) => scores[b]-scores[a]).slice(0,3).map(k => labels[k]);
  return hits.length ? hits.join(", ") : "profil équilibré";
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// =========================================================================
// ADAPTATEURS DE COLLECTE (art. 6-9, 25)
// =========================================================================
const DEMO_LISTINGS = [
  { source:"Demo", external_id:"d1", url:"https://exemple.ch/1", title:"Appartement 3.5p rénové, vue lac", locality:"Lugano", type:"Appartement", rooms:3.5, surface:95, price:478000, confidence:"Vérifiée", history:[["2026-06-02",478000]] },
  { source:"Demo", external_id:"d1b", url:"https://exemple2.ch/1", title:"Bel appartement 3.5 pièces – Lugano centre", locality:"Lugano", type:"Appartement", rooms:3.5, surface:96, price:478000, confidence:"Probable", history:[["2026-06-05",478000]] },
  { source:"Demo", external_id:"d2", url:"https://exemple.ch/2", title:"Ferme jurassienne rénovée avec cachet", locality:"Saignelégier", type:"Maison", rooms:5.5, surface:140, price:395000, confidence:"À contrôler", cachet:true, history:[["2026-05-10",415000],["2026-08-19",395000]] },
  { source:"Demo", external_id:"d3", url:"https://exemple.ch/3", title:"Maison historique au cœur du village médiéval", locality:"Saint-Ursanne", type:"Maison historique", rooms:6, surface:160, price:275000, confidence:"À contrôler", cachet:true, history:[["2026-03-11",298000],["2026-08-16",275000]] },
  { source:"Demo", external_id:"d4", url:"https://exemple.ch/4", title:"Chalet avec cachet, vue alpage", locality:"Zweisimmen", type:"Chalet", rooms:4.5, surface:110, price:459000, confidence:"Vérifiée", cachet:true, history:[["2026-04-14",479000],["2026-08-22",459000]] },
  { source:"Demo", external_id:"d5", url:"https://exemple.ch/5", title:"Rustico authentique, cachet indispensable", locality:"Charmey", type:"Rustico", rooms:3.5, surface:85, price:340000, confidence:"Probable", cachet:true, history:[["2026-05-28",340000]] },
  { source:"Demo", external_id:"d6", url:"https://exemple.ch/6", title:"Appartement 3 pièces, quartier calme", locality:"La Chaux-de-Fonds", type:"Appartement", rooms:3, surface:72, price:289000, confidence:"Vérifiée", history:[["2026-05-02",310000],["2026-07-10",299000],["2026-08-21",289000]] },
  { source:"Demo", external_id:"d7", url:"https://exemple.ch/7", title:"Villa contemporaine avec jardin", locality:"Bulle", type:"Villa", rooms:6, surface:180, price:495000, confidence:"Vérifiée", history:[["2026-06-25",495000]] },
  { source:"Demo", external_id:"d8", url:"https://exemple.ch/8", title:"Appartement 2 pièces centre-ville", locality:"Delémont", type:"Appartement", rooms:2, surface:55, price:320000, confidence:"Probable", history:[["2026-07-01",320000]] },
  { source:"Demo", external_id:"d9", url:"https://exemple.ch/9", title:"PPE neuve avec balcon", locality:"Neuchâtel", type:"PPE", rooms:4, surface:100, price:512000, confidence:"Vérifiée", history:[["2026-07-15",512000]] },
];

function demoAdapter() {
  return {
    name: "Demo",
    async check() { return "accessible"; },
    async fetchListings() { return DEMO_LISTINGS.map(l => Object.assign({}, l)); },
  };
}

// =========================================================================
// MOTEUR D'ADAPTATEUR GÉNÉRIQUE (art. 6-9) — piloté entièrement par la
// configuration stockée dans sources.config_json. Ajouter ou corriger une
// source ne nécessite plus de modifier ce fichier : une simple requête SQL
// sur la table `sources` suffit (voir README / art. 2 — la baseline n'est
// jamais dégradée par une évolution).
// =========================================================================
function decodeEntitiesGeneric(s) {
  return (s || "")
    .replace(/&#0*39;/g, "'").replace(/&#x0*27;/gi, "'")
    .replace(/&rsquo;/g, "\u2019").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
function parsePriceGeneric(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[.,]00$/, "").replace(/['’,.]/g, "");
  const price = parseFloat(cleaned);
  return isFinite(price) ? price : null;
}
function findKnownLocalityGeneric(text, extra) {
  extra = extra || { map: {} };
  const lower = (text || "").toLowerCase();
  let best = null, bestIdx = Infinity;
  for (const key in REGION_MAP) {
    const idx = lower.indexOf(key);
    if (idx !== -1 && idx < bestIdx) { bestIdx = idx; best = key; }
  }
  for (const key in extra.map) {
    const idx = lower.indexOf(key);
    if (idx !== -1 && idx < bestIdx) { bestIdx = idx; best = key; }
  }
  return best;
}
function extractFieldsGeneric(m, fields, config, extra) {
  const priceMin = config.price_min || 50000;
  const out = { price: null, rooms: null, surface: null, locality: null, type: null, url: null };
  if (fields.price != null && m[fields.price]) out.price = parsePriceGeneric(m[fields.price]);
  if (fields.rooms != null && m[fields.rooms]) out.rooms = parseFloat(String(m[fields.rooms]).replace(",", "."));
  if (fields.surface != null && m[fields.surface]) out.surface = parseFloat(m[fields.surface]);
  if (fields.type != null && m[fields.type]) out.type = m[fields.type].trim();
  if (fields.url != null && m[fields.url]) {
    out.url = m[fields.url].trim();
    // reconstruction de l'URL absolue quand le site ne fournit que des liens
    // relatifs (fréquent) ; sans ça le lien affiché à l'utilisateur casserait.
    if (config.url_prefix && out.url && !/^https?:\/\//i.test(out.url)) {
      out.url = config.url_prefix.replace(/\/$/, "") + "/" + out.url.replace(/^\//, "");
    }
  }
  if (fields.locality != null && m[fields.locality]) {
    const raw = m[fields.locality];
    out.locality = config.locality_lookup ? findKnownLocalityGeneric(raw, extra) : raw.trim();
  }
  // recherche secondaire optionnelle : certains champs ne sont pas capturables
  // de façon fiable dans un seul motif linéaire (ordre variable dans la page).
  // On les cherche alors indépendamment à l'intérieur du bloc déjà isolé (m[0]).
  if (config.sub_fields) {
    for (const key in config.sub_fields) {
      if (out[key] != null) continue; // ne pas écraser une valeur déjà trouvée
      const re = new RegExp(config.sub_fields[key], "i");
      const sm = re.exec(m[0]);
      if (!sm || !sm[1]) continue;
      if (key === "rooms") out.rooms = parseFloat(sm[1].replace(",", "."));
      else if (key === "surface") out.surface = parseFloat(sm[1]);
      else if (key === "price") out.price = parsePriceGeneric(sm[1]);
      else if (key === "locality") out.locality = config.locality_lookup ? findKnownLocalityGeneric(sm[1], extra) : sm[1].trim();
      else if (key === "type") out.type = sm[1].trim();
    }
  }
  if (!out.price || out.price < priceMin) return null;
  if (!out.locality) return null;
  return out;
}

function getByPath(obj, path) {
  if (!path) return void 0;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : void 0), obj);
}
function extractJsonAfterMarker(html, marker) {
  // Beaucoup de sites modernes (Vue/Nuxt/Next) intègrent leurs données dans un
  // objet JSON directement dans la page (ex. window.__PINIA_STATE__ = {...}).
  // Ce motif est bien plus stable qu'un motif texte, car il ne dépend pas des
  // noms de classes CSS générés (qui changent à chaque déploiement du site).
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const i = html.indexOf("{", idx + marker.length);
  if (i === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return html.slice(i, j + 1); }
  }
  return null;
}
function extractStateJsonGeneric(html, config) {
  const jsonText = extractJsonAfterMarker(html, config.state_json_marker);
  if (!jsonText) return [];
  let root;
  try { root = JSON.parse(jsonText); } catch (e) { return []; }
  // Selon la variante de page (constatée sur ImmoScout24 : certaines pages
  // ont la liste directement à la racine, d'autres sous "agencyProfile"),
  // le chemin exact peut varier. On accepte donc soit un chemin unique, soit
  // une liste de chemins candidats essayés dans l'ordre jusqu'au premier qui
  // renvoie un vrai tableau — pas besoin de deviner au cas par cas.
  const candidatePaths = Array.isArray(config.state_json_list_path)
    ? config.state_json_list_path : [config.state_json_list_path];
  let items = null;
  for (const path of candidatePaths) {
    const found = getByPath(root, path);
    if (Array.isArray(found)) { items = found; break; }
  }
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const item of items) {
    if (config.state_json_filter) {
      const val = getByPath(item, config.state_json_filter.path);
      if (val !== config.state_json_filter.equals) continue;
    }
    const f = config.state_json_fields || {};
    const price = f.price ? getByPath(item, f.price) : null;
    if (!price) continue;
    const locality = f.locality ? getByPath(item, f.locality) : null;
    const rooms = f.rooms ? getByPath(item, f.rooms) : null;
    const surface = f.surface ? getByPath(item, f.surface) : null;
    const id = f.id ? getByPath(item, f.id) : null;
    const url = config.url_prefix && id != null
      ? config.url_prefix.replace(/\/$/, "") + "/" + (config.url_path_prefix || "") + id
      : null;
    out.push({ price: parseFloat(price), locality, rooms, surface, url, type: null });
  }
  return out;
}
function extractJsonLdGeneric(html) {
  // Motif le plus robuste quand disponible : schema.org structuré, présent
  // sur beaucoup de sites indépendamment de la mise en page HTML.
  const out = [];
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const roots = Array.isArray(data) ? data : [data];
      // Déballage des pages de résultats structurées en ItemList (ex. pages
      // de recherche avec plusieurs annonces via schema.org SearchResultsPage)
      // — motif générique, pas spécifique à un site en particulier.
      const items = [];
      for (const entry of roots) {
        const list = entry.mainEntity && entry.mainEntity.itemListElement;
        if (Array.isArray(list)) {
          for (const li of list) { if (li.item) items.push(li.item); }
        } else {
          items.push(entry);
        }
      }
      for (const obj of items) {
        const price = obj.price || (obj.offers && obj.offers.price);
        if (!price) continue;
        const addr = obj.address || (obj.offers && obj.offers.address) ||
          (obj.contentLocation && obj.contentLocation.address) || {};
        let surface = (obj.floorSize && obj.floorSize.value) || null;
        if (!surface && typeof obj.size === "string") {
          const sm = /([\d.]+)/.exec(obj.size);
          if (sm) surface = parseFloat(sm[1]);
        }
        out.push({
          url: obj.url || null, title: obj.name || null,
          locality: addr.addressLocality || null,
          address: addr.streetAddress || null,
          type: obj.category || null,
          rooms: obj.numberOfRooms || null,
          surface: surface,
          price: parseFloat(price),
        });
      }
    } catch (e) { /* bloc JSON-LD invalide, ignoré */ }
  }
  return out;
}

function extractSingleGeneric(html, config, extra) {
  if (config.try_json_ld) {
    const ldResults = extractJsonLdGeneric(html).filter(r => {
      if (!r.price || r.price < (config.price_min || 50000)) return false;
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      return !!r.locality;
    });
    if (ldResults.length > 0) return ldResults;
  }
  if (config.state_json_marker) {
    const stateResults = extractStateJsonGeneric(html, config).filter(r => {
      if (!r.price || r.price < (config.price_min || 50000)) return false;
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      return !!r.locality;
    });
    if (stateResults.length > 0) return stateResults;
  }
  const patterns = [config.block_pattern, config.fallback_pattern].filter(Boolean);
  for (const pattern of patterns) {
    const re = new RegExp(pattern, "gi");
    const out = []; let m;
    while ((m = re.exec(html)) !== null) {
      if (config.reject_if && new RegExp(config.reject_if, "i").test(m[0]) &&
          !(config.reject_unless && new RegExp(config.reject_unless, "i").test(m[0]))) {
        continue;
      }
      const rec = extractFieldsGeneric(m, config.fields, config, extra);
      if (rec) out.push(rec);
    }
    if (out.length > 0) return out;
  }
  return [];
}
function extractLinksGeneric(html, config) {
  const re = new RegExp(config.link_pattern, "gi");
  const seen = new Set(); const out = []; let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[config.link_group || 1];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}
function extractDetailGeneric(html, config, extra) {
  if (config.reject_if && new RegExp(config.reject_if, "i").test(html) &&
      !(config.reject_unless && new RegExp(config.reject_unless, "i").test(html))) {
    return null;
  }
  if (config.try_json_ld) {
    const ldResults = extractJsonLdGeneric(html);
    if (ldResults.length > 0) {
      const r = ldResults[0];
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      if (r.price >= (config.price_min || 50000) && r.locality) return r;
    }
  }
  const patterns = [config.detail_pattern, config.detail_fallback_pattern].filter(Boolean);
  for (const pattern of patterns) {
    const re = new RegExp(pattern, "gi");
    const m = re.exec(html);
    if (m) {
      const rec = extractFieldsGeneric(m, config.detail_fields || config.fields, config, extra);
      if (rec) return rec;
    }
  }
  return null;
}

function genericAdapter(sourceRow, extra) {
  let config = {};
  try { config = JSON.parse(sourceRow.config_json || "{}"); } catch (e) { config = {}; }
  const headers = config.headers || {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml", "Accept-Language": "fr-CH,fr;q=0.9",
  };

  async function fetchText(fetchFn, url) {
    // Limite de temps par requête individuelle (art. 25) : un site lent ou qui
    // ne répond jamais ne doit jamais bloquer le traitement des autres sources.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, { headers, signal: controller.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return decodeEntitiesGeneric(await res.text());
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Delai depasse (" + SOURCE_TIMEOUT_MS + "ms)");
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  function extractSingle(html) { return extractSingleGeneric(html, config, extra); }
  function extractLinks(html) { return extractLinksGeneric(html, config); }
  function extractDetail(html) { return extractDetailGeneric(html, config, extra); }

  return {
    name: sourceRow.name,
    async check(fetchFn) {
      const urls = config.mode === "two_step" ? [config.list_url] : (config.urls || [config.list_url]);
      await fetchText(fetchFn, urls[0]);
      return "accessible";
    },
    async fetchListings(fetchFn) {
      const out = [];
      if (config.mode === "two_step") {
        const listHtml = await fetchText(fetchFn, config.list_url);
        const links = extractLinks(listHtml);
        for (const url of links.slice(0, config.max_details || 20)) {
          try {
            const detHtml = await fetchText(fetchFn, url);
            const detail = extractDetail(detHtml);
            if (!detail) continue;
            out.push({
              external_id: url.split("/").filter(Boolean).pop(), url,
              title: (detail.type || "Bien") + " — " + detail.locality,
              locality: detail.locality, type: detail.type || "Appartement",
              rooms: detail.rooms, surface: detail.surface, price: detail.price,
              confidence: config.confidence || "Vérifiée",
            });
          } catch (e) { /* dégrade cette fiche uniquement */ }
        }
      } else {
        const urls = config.urls || [];
        for (const url of urls) {
          try {
            const html = await fetchText(fetchFn, url);
            for (const rec of extractSingle(html)) {
              out.push({
                external_id: (rec.url || (rec.locality + rec.price)).split("/").filter(Boolean).pop(),
                url: rec.url || config.list_url || urls[0],
                title: (rec.type || "Bien") + " — " + rec.locality,
                locality: rec.locality, type: rec.type || "Appartement",
                rooms: rec.rooms, surface: rec.surface, price: rec.price, address: rec.address || null,
                confidence: config.confidence || "Probable",
              });
            }
          } catch (e) { /* dégrade cette URL uniquement */ }
        }
      }
      return out;
    },
  };
}

// =========================================================================
// PIPELINE (art. 23)
// =========================================================================
async function loadExtraLocalities(db) {
  // Complément au référentiel codé en dur (art. 3) — vit en base pour que
  // l'ajout d'une localité ne nécessite plus de redéploiement.
  const map = {}; const excluded = new Set();
  try {
    const res = await db.prepare("SELECT name, region FROM localities").all();
    for (const row of res.results) map[row.name.toLowerCase()] = row.region;
    const exRes = await db.prepare("SELECT name FROM localities_excluded").all();
    for (const row of exRes.results) excluded.add(row.name.toLowerCase());
  } catch (e) { /* tables absentes ou base indisponible -> comportement inchangé */ }
  return { map, excluded };
}

async function ingest(db, fetchFn) {
  const report = [];
  const extra = await loadExtraLocalities(db);
  const sourcesRes = await db.prepare("SELECT * FROM sources WHERE enabled=1").all();

  for (const srcRow of sourcesRes.results) {
    const adapter = srcRow.adapter === "demo" ? demoAdapter() : genericAdapter(srcRow, extra);
    let state = "enregistrée", error = null, stored = 0;
    try {
      state = await adapter.check(fetchFn);
      const rawListings = await adapter.fetchListings(fetchFn);
      for (const rl of rawListings) stored += await storeListing(db, srcRow, rl, extra);
      if (stored > 0) state = "productive";
    } catch (e) { error = String(e && e.message ? e.message : e); }
    await db.prepare("UPDATE sources SET state=?, last_checked=?, last_error=?, last_productive_count=? WHERE id=?")
      .bind(state, new Date().toISOString(), error, stored, srcRow.id).run();
    report.push({ source: srcRow.name, state, stored, error });
  }
  return report;
}

async function storeListing(db, srcRow, rl, extra) {
  if (!rl.title || !rl.locality || !isPlausiblePrice(rl.price)) return 0;
  if (rl.is_rental) return 0;
  const region = computeRegion(rl.locality, extra);
  if (!region) return 0;

  const listingId = srcRow.id + ":" + rl.external_id;
  const bId = bienKey(rl.locality, rl.type, rl.rooms, rl.surface);
  const today = todayISO();
  const existing = await db.prepare("SELECT first_seen FROM listings WHERE id=?").bind(listingId).all();
  const firstSeen = existing.results.length ? existing.results[0].first_seen : today;

  await db.prepare("INSERT INTO listings (id, source_id, external_id, url, title, locality, region, type, rooms, surface, price, currency, is_rental, cachet, status, confidence, first_seen, last_seen, bien_id, address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, price=excluded.price, status=excluded.status, confidence=excluded.confidence, last_seen=excluded.last_seen, region=excluded.region, address=excluded.address")
    .bind(listingId, srcRow.id, rl.external_id, rl.url || "", rl.title, rl.locality, region, rl.type || "",
      rl.rooms ?? null, rl.surface ?? null, rl.price, "CHF", rl.is_rental?1:0, rl.cachet?1:0, "active",
      rl.confidence || "À contrôler", firstSeen, today, bId, rl.address || null).run();

  const history = rl.history && rl.history.length ? rl.history : [[today, rl.price]];
  for (const pair of history) {
    const hDate = pair[0], hPrice = pair[1];
    const exists = await db.prepare("SELECT 1 FROM price_history WHERE bien_id=? AND date=? AND price=?").bind(bId, hDate, hPrice).all();
    if (!exists.results.length) await db.prepare("INSERT INTO price_history (bien_id, date, price) VALUES (?,?,?)").bind(bId, hDate, hPrice).run();
  }
  return 1;
}

// Calcule l'enregistrement complet d'UN SEUL bien (scores, historique, statut
// écarté/repêché). Fonction extraite pour être réutilisable aussi bien par un
// recalcul complet que par un recalcul ciblé sur quelques biens seulement.
async function computeBienRecord(db, bId, listings, weights, regionPrices, opportunityThreshold) {
  const sorted = [...listings].sort((a,b) => (a.last_seen < b.last_seen ? -1 : 1));
  const latest = sorted[sorted.length-1];
  // Si plusieurs sources rapportent le même bien (même localité/type/pièces/
  // surface) à des prix différents, on retient le prix le plus bas plutôt
  // que celui de la source la plus récemment vue — c'est ce qui compte pour
  // l'utilisateur, pas la fraîcheur de la donnée en elle-même.
  const cheapestPrice = Math.min(...sorted.map(l => l.price));
  const bestConf = sorted.reduce((acc,l) => (CONF_ORDER[l.confidence] > CONF_ORDER[acc] ? l.confidence : acc), "À contrôler");
  const firstSeen = sorted.reduce((acc,l) => (l.first_seen < acc ? l.first_seen : acc), sorted[0].first_seen);
  const cachet = sorted.some(l => l.cachet);
  // Retient la premiere adresse exacte disponible parmi les sources (certaines
  // la communiquent, d'autres la masquent tant qu'on ne s'est pas inscrit).
  const address = sorted.map(l => l.address).find(a => a) || null;

  const histRes = await db.prepare("SELECT date, price FROM price_history WHERE bien_id=? ORDER BY date ASC").bind(bId).all();
  const history = histRes.results;

  const discRes = await db.prepare("SELECT * FROM discarded WHERE bien_id=?").bind(bId).all();
  const disc = discRes.results[0];
  let discardedNow = false, rescue = null;
  if (disc) {
    if (cheapestPrice < disc.price_at_exclusion) {
      rescue = { bienId: bId, oldPrice: disc.price_at_exclusion, newPrice: cheapestPrice };
      await db.prepare("DELETE FROM discarded WHERE bien_id=?").bind(bId).run();
    } else { discardedNow = true; }
  }

  let priceDrop = null;
  if (history.length >= 2) {
    const prev = history[history.length-2].price, cur = history[history.length-1].price;
    if (cur < prev) priceDrop = { old: prev, current: cur, pct: Math.round((1-cur/prev)*1000)/10 };
  }

  const scores = {
    deal: estimateDealScore(cheapestPrice, regionPrices[latest.region] || []),
    retraite: estimateRetraiteScore(latest.rooms, latest.surface, latest.region),
    locatif: estimateLocatifScore(latest.region, latest.rooms),
    cachet: estimateCachetScore(latest.title, cachet),
    risk: estimateRiskScore(bestConf, history.length),
  };
  const fit = discardedNow ? 0 : jmFit(scores, weights);
  const explain = discardedNow ? "" : explainFit(scores, weights);

  return {
    record: {
      id: bId, title: latest.title, locality: latest.locality, region: latest.region, type: latest.type,
      rooms: latest.rooms, surface: latest.surface, price: cheapestPrice, cachet: cachet?1:0, confidence: bestConf,
      address: address,
      first_seen: firstSeen, last_seen: latest.last_seen, deal_score: scores.deal, retraite_score: scores.retraite,
      locatif_score: scores.locatif, cachet_score: scores.cachet, risk_score: scores.risk, jm_fit: fit,
      is_opportunity: discardedNow?0:(fit>=(opportunityThreshold||70)?1:0), explain, price_drop_json: priceDrop ? JSON.stringify(priceDrop) : null,
    },
    sources: sorted,
    rescue,
  };
}

async function upsertBien(db, computed) {
  const r = computed.record;
  await db.prepare(`INSERT INTO biens (id,title,locality,region,type,rooms,surface,price,cachet,confidence,first_seen,last_seen,deal_score,retraite_score,locatif_score,cachet_score,risk_score,jm_fit,is_opportunity,explain,price_drop_json,address)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, locality=excluded.locality, region=excluded.region, type=excluded.type,
      rooms=excluded.rooms, surface=excluded.surface, price=excluded.price, cachet=excluded.cachet, confidence=excluded.confidence,
      first_seen=excluded.first_seen, last_seen=excluded.last_seen, deal_score=excluded.deal_score, retraite_score=excluded.retraite_score,
      locatif_score=excluded.locatif_score, cachet_score=excluded.cachet_score, risk_score=excluded.risk_score, jm_fit=excluded.jm_fit,
      is_opportunity=excluded.is_opportunity, explain=excluded.explain, price_drop_json=excluded.price_drop_json, address=excluded.address`)
    .bind(r.id, r.title, r.locality, r.region, r.type, r.rooms, r.surface, r.price, r.cachet, r.confidence,
      r.first_seen, r.last_seen, r.deal_score, r.retraite_score, r.locatif_score, r.cachet_score, r.risk_score,
      r.jm_fit, r.is_opportunity, r.explain, r.price_drop_json, r.address).run();

  await db.prepare("DELETE FROM bien_sources WHERE bien_id=?").bind(r.id).run();
  for (const l of computed.sources) {
    const srcRes = await db.prepare("SELECT name FROM sources WHERE id=?").bind(l.source_id).all();
    const srcName = srcRes.results[0] ? srcRes.results[0].name : "?";
    await db.prepare("INSERT OR IGNORE INTO bien_sources (bien_id, source_name, url) VALUES (?,?,?)").bind(r.id, srcName, l.url).run();
  }
}

// Recalcul complet : reconstruit tous les biens depuis zéro. Nécessaire
// quand un changement affecte potentiellement TOUS les biens à la fois
// (ex. modification des pondérations de préférences).
// Marque comme inactives les annonces qu'aucune source n'a revues depuis
// longtemps — signe probable qu'elles ne sont plus en ligne (vendu, retire).
// Ne supprime rien physiquement : conserve l'historique, juste exclu des
// résultats actifs (comme le fait deja le statut 'active' partout ailleurs).
async function cleanupStaleListings(db, maxAgeDays) {
  const seuil = new Date(Date.now() - (maxAgeDays || 21) * 24 * 3600 * 1000).toISOString();
  const res = await db.prepare("UPDATE listings SET status='inactive' WHERE status='active' AND last_seen < ?").bind(seuil).run();
  return res.meta ? res.meta.changes : 0;
}

async function recomputeFull(db) {
  const prefsRes = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const weights = JSON.parse(prefsRes.results[0].weights_json);
  const opportunityThreshold = prefsRes.results[0].opportunity_threshold || 70;

  const activeRes = await db.prepare("SELECT * FROM listings WHERE status='active'").all();
  const groups = {};
  for (const l of activeRes.results) { if (!l.bien_id) continue; (groups[l.bien_id] = groups[l.bien_id] || []).push(l); }

  const regionPrices = {};
  for (const bId in groups) {
    const latest = groups[bId][groups[bId].length - 1];
    (regionPrices[latest.region] = regionPrices[latest.region] || []).push(latest.price);
  }

  await db.prepare("DELETE FROM biens").run();
  await db.prepare("DELETE FROM bien_sources").run();

  const rescuesThisRun = [];
  let biensCount = 0;
  for (const bId in groups) {
    const computed = await computeBienRecord(db, bId, groups[bId], weights, regionPrices, opportunityThreshold);
    await upsertBien(db, computed);
    if (computed.rescue) rescuesThisRun.push(computed.rescue);
    biensCount++;
  }
  for (const r of rescuesThisRun) {
    await db.prepare("INSERT INTO rescues (bien_id, old_price, new_price, date) VALUES (?,?,?,?)").bind(r.bienId, r.oldPrice, r.newPrice, new Date().toISOString()).run();
  }
  return { biens: biensCount, rescues: rescuesThisRun.length };
}

// Recalcul ciblé : ne retraite que les biens explicitement listés (ex. ceux
// concernés par les toutes dernières annonces reçues, ou celui qu'on vient
// d'écarter/restaurer). La médiane de prix par région reste calculée sur
// l'ensemble des annonces actives (nécessaire pour rester juste), mais le
// travail coûteux (historique, statut écarté, sources) ne porte que sur les
// biens réellement concernés — pas sur toute la base à chaque fois.
async function recomputeTargeted(db, bienIds) {
  if (!bienIds || bienIds.length === 0) return { biens: 0, rescues: 0 };
  const prefsRes = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const weights = JSON.parse(prefsRes.results[0].weights_json);
  const opportunityThreshold = prefsRes.results[0].opportunity_threshold || 70;

  const activeRes = await db.prepare("SELECT * FROM listings WHERE status='active'").all();
  const groups = {};
  for (const l of activeRes.results) { if (!l.bien_id) continue; (groups[l.bien_id] = groups[l.bien_id] || []).push(l); }

  const regionPrices = {};
  for (const bId in groups) {
    const latest = groups[bId][groups[bId].length - 1];
    (regionPrices[latest.region] = regionPrices[latest.region] || []).push(latest.price);
  }

  const rescuesThisRun = [];
  let biensCount = 0;
  for (const bId of new Set(bienIds)) {
    if (!groups[bId]) {
      // Plus aucune annonce active pour ce bien (ex. dernière source retirée) :
      // on le retire proprement plutôt que de laisser une fiche fantôme.
      await db.prepare("DELETE FROM biens WHERE id=?").bind(bId).run();
      await db.prepare("DELETE FROM bien_sources WHERE bien_id=?").bind(bId).run();
      continue;
    }
    const computed = await computeBienRecord(db, bId, groups[bId], weights, regionPrices, opportunityThreshold);
    await upsertBien(db, computed);
    if (computed.rescue) rescuesThisRun.push(computed.rescue);
    biensCount++;
  }
  for (const r of rescuesThisRun) {
    await db.prepare("INSERT INTO rescues (bien_id, old_price, new_price, date) VALUES (?,?,?,?)").bind(r.bienId, r.oldPrice, r.newPrice, new Date().toISOString()).run();
  }
  return { biens: biensCount, rescues: rescuesThisRun.length };
}

async function fullRefresh(db, fetchFn) {
  const report = await ingest(db, fetchFn);
  const stats = await recomputeFull(db);
  return Object.assign({ ingestion: report }, stats);
}

// =========================================================================
// RECHERCHE (facettes + texte libre)
// =========================================================================
async function getPreferences(db) {
  const res = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const row = res.results[0];
  return { budgetMax: row.budget_max, typesAllowed: JSON.parse(row.types_allowed),
    regionsAllowed: JSON.parse(row.regions_allowed), surfaceMin: row.surface_min, roomsMin: row.rooms_min,
    cachetRequired: !!row.cachet_required, weights: JSON.parse(row.weights_json) };
}

async function search(db, opts) {
  opts = opts || {};
  const prefs = await getPreferences(db);
  const budgetMax = opts.budgetMax !== undefined ? opts.budgetMax : prefs.budgetMax;
  const roomsMin = opts.roomsMin !== undefined ? opts.roomsMin : prefs.roomsMin;
  const surfaceMin = opts.surfaceMin !== undefined ? opts.surfaceMin : prefs.surfaceMin;
  const cachet = opts.cachet !== undefined ? opts.cachet : prefs.cachetRequired;
  const regions = opts.region ? [opts.region] : (prefs.regionsAllowed.length ? prefs.regionsAllowed : null);

  const discRes = await db.prepare("SELECT bien_id FROM discarded").all();
  const discardedIds = new Set(discRes.results.map(r => r.bien_id));
  const favRes = await db.prepare("SELECT bien_id FROM favoris").all();
  const favoriteIds = new Set(favRes.results.map(r => r.bien_id));

  const allRes = await db.prepare("SELECT * FROM biens").all();
  let rows = allRes.results.filter(b => !discardedIds.has(b.id));

  if (opts.q) {
    const q = opts.q.toLowerCase();
    rows = rows.filter(b => (b.title||"").toLowerCase().includes(q) || (b.locality||"").toLowerCase().includes(q) || (b.type||"").toLowerCase().includes(q));
  }
  rows = rows.filter(b => b.price <= budgetMax);
  rows = rows.filter(b => (b.surface||0) >= surfaceMin);
  rows = rows.filter(b => (b.rooms||0) >= roomsMin);
  if (cachet) rows = rows.filter(b => b.cachet);
  if (opts.type) rows = rows.filter(b => b.type === opts.type);
  if (regions) rows = rows.filter(b => regions.includes(b.region));
  if (opts.favorisOnly) rows = rows.filter(b => favoriteIds.has(b.id));
  if (opts.opportunitiesOnly) rows = rows.filter(b => b.is_opportunity);

  const sortFns = {
    jmfit: (a,b) => b.jm_fit - a.jm_fit, price_asc: (a,b) => a.price - b.price,
    price_desc: (a,b) => b.price - a.price, recent: (a,b) => (b.first_seen||"").localeCompare(a.first_seen||""),
  };
  rows.sort(sortFns[opts.sort || "jmfit"]);

  const out = [];
  for (const r of rows.slice(0, opts.limit || 1000)) {
    const srcRes = await db.prepare("SELECT source_name, url FROM bien_sources WHERE bien_id=?").bind(r.id).all();
    out.push(Object.assign({}, r, { is_favori: favoriteIds.has(r.id), sources: srcRes.results,
      price_drop: r.price_drop_json ? JSON.parse(r.price_drop_json) : null }));
  }
  return out;
}

// =========================================================================
// API + ROUTAGE
// =========================================================================
function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}

const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JM Immo</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0E1116;--panel:#161B22;--panel2:#1D2430;--line:#262E3A;--text:#E7EAEE;--muted:#8992A3;--gold:#D6A24E;--teal:#4FA98C;--clay:#C1573B;--blue:#6C93C7;}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;background:var(--bg);color:var(--text);font-family:'IBM Plex Sans',sans-serif;}
body{padding-bottom:40px;}
h1{font-family:'Fraunces',serif;font-size:19px;margin:0;}
.mono{font-family:'IBM Plex Mono',monospace;}
header{position:sticky;top:0;z-index:20;background:rgba(14,17,22,0.96);backdrop-filter:blur(8px);padding:14px 16px 10px;border-bottom:1px solid var(--line);}
.searchbar{display:flex;gap:8px;margin-top:10px;}
.searchbar input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font-size:14px;}
.searchbar button{padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--gold);color:#1a1408;font-weight:600;font-size:13px;}
.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px;scrollbar-width:none;}
.tabs::-webkit-scrollbar{display:none;}
.tab{flex:none;padding:6px 12px;border-radius:999px;font-size:12.5px;color:var(--muted);border:1px solid var(--line);cursor:pointer;white-space:nowrap;}
.tab.active{background:var(--panel2);color:var(--text);border-color:#3a4353;}
.filters{display:flex;gap:8px;overflow-x:auto;margin-top:10px;scrollbar-width:none;}
.filters::-webkit-scrollbar{display:none;}
.filters select{flex:none;padding:7px 8px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font-size:12px;}
main{padding:14px 16px;max-width:660px;margin:0 auto;}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;}
.card-top{display:flex;justify-content:space-between;gap:10px;}
.title{font-family:'Fraunces',serif;font-size:16px;font-weight:600;line-height:1.25;}
.locality{color:var(--muted);font-size:12.5px;margin-top:2px;}
.price{font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;white-space:nowrap;}
.fit-badge{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--panel2);border:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;flex:none;}
.fit-badge.hot{background:#241d10;border-color:#4a3a1e;color:var(--gold);}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}
.tag{font-size:10.5px;padding:3px 8px;border-radius:6px;background:var(--panel2);color:var(--muted);border:1px solid var(--line);}
.tag.opp{color:var(--gold);border-color:#4a3a1e;background:#241d10;}
.tag.drop{color:var(--teal);border-color:#1c3a32;background:#0f2620;}
.explain{font-size:12.5px;color:var(--gold);margin-top:8px;}
.meta-row{display:flex;gap:14px;margin-top:9px;font-size:12.5px;color:var(--muted);}
.sources-line{font-size:11.5px;color:var(--muted);margin-top:8px;}
.sources-line a{color:var(--blue);}
.actions{display:flex;gap:8px;margin-top:12px;}
.btn{flex:1;padding:9px 8px;border-radius:9px;font-size:12.5px;font-weight:500;border:1px solid var(--line);background:var(--panel2);color:var(--text);cursor:pointer;}
.btn.discard{color:var(--clay);}
.btn.fav.on{background:#241d10;border-color:#4a3a1e;color:var(--gold);}
.btn.restore{color:var(--teal);border-color:#1c3a32;}
.empty{padding:50px 20px;text-align:center;color:var(--muted);}
.sources-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.sources-table td,.sources-table th{padding:9px 6px;border-bottom:1px solid var(--line);text-align:left;}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;}
.dot.productive{background:var(--teal);}.dot.accessible{background:var(--gold);}.dot.enregistree{background:var(--clay);}
.status{padding:8px 16px;font-size:12px;color:var(--muted);}
.pref-block{margin-bottom:16px;}
.pref-block label{display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px;}
.chip-row{display:flex;flex-wrap:wrap;gap:7px;}
.chip{padding:6px 11px;border-radius:999px;border:1px solid var(--line);font-size:12px;background:var(--panel2);color:var(--muted);cursor:pointer;}
.chip.on{background:#1d2938;color:var(--blue);border-color:#2c4260;}
.slider-row{display:flex;align-items:center;gap:10px;}
.slider-row input[type=range]{flex:1;accent-color:var(--gold);}
</style>
</head>
<body>
<header>
  <h1>JM Immo</h1>
  <button id="btnRefresh" style="margin:8px 0;padding:8px 12px;border-radius:8px;border:1px solid #262E3A;background:#1D2430;color:#E7EAEE;font-size:12.5px;cursor:pointer">&#8635; Rafraichir les sources</button>
  <div class="searchbar">
    <input id="q" placeholder="Rechercher (village, type, mot-cle)...">
    <button id="btnSearch">Chercher</button>
  </div>
  <div class="filters">
    <select id="fRegion"><option value="">Toutes regions</option></select>
    <select id="fType"><option value="">Tous types</option></select>
    <select id="fBudget">
      <option value="500000">Moins de CHF 500000</option>
      <option value="400000">Moins de CHF 400000</option>
      <option value="300000">Moins de CHF 300000</option>
    </select>
    <select id="fSort">
      <option value="jmfit">Tri : JM Fit</option>
      <option value="price_asc">Tri : prix croissant</option>
      <option value="recent">Tri : plus recents</option>
    </select>
  </div>
  <div class="tabs" id="tabs"></div>
</header>
<main id="main"><div class="status">Chargement...</div></main>

<script>
const TABS = [
  {id:"tous", label:"Tous"}, {id:"opportunites", label:"Opportunites"}, {id:"favoris", label:"Favoris"},
  {id:"baisses", label:"Baisses"}, {id:"ecartes", label:"Ecartes"}, {id:"sources", label:"Sources"},
  {id:"preferences", label:"Preferences"},
];
let activeTab = "tous";
const REGIONS = ["Tessin","Jura - Franches-Montagnes","Jura - Clos du Doubs","Zweisimmen","Gruyere","Neuchatel"];
const TYPES = ["Appartement","Maison","Chalet","Rustico","Villa","Maison historique","PPE"];

document.getElementById("fRegion").innerHTML += REGIONS.map(function(r){return "<option value=\"" + r + "\">" + r + "</option>";}).join("");
document.getElementById("fType").innerHTML += TYPES.map(function(t){return "<option value=\"" + t + "\">" + t + "</option>";}).join("");
document.getElementById("tabs").innerHTML = TABS.map(function(t){return "<div class=\"tab " + (t.id===activeTab?"active":"") + "\" data-tab=\"" + t.id + "\">" + t.label + "</div>";}).join("");

function fmtCHF(n){ return "CHF " + Math.round(n).toLocaleString("fr-CH"); }
async function api(path, opts){ const res = await fetch(path, opts); return res.json(); }

function bienCard(b){
  const tags = ["<span class=\"tag\">" + (b.type||"") + "</span>", "<span class=\"tag\">" + (b.region||"") + "</span>", "<span class=\"tag\">" + (b.confidence||"") + "</span>"];
  if (b.cachet) tags.push("<span class=\"tag\">cachet</span>");
  if (b.is_opportunity) tags.push("<span class=\"tag opp\">Opportunite</span>");
  if (b.price_drop) tags.push("<span class=\"tag drop\">-" + b.price_drop.pct + "%</span>");
  const sources = (b.sources||[]).map(function(s){return "<a href=\"" + s.url + "\" target=\"_blank\" rel=\"noopener\">" + s.source_name + "</a>";}).join(" - ");
  const explain = b.explain ? ("<div class=\"explain\">JM Fit " + b.jm_fit + "/100 - " + b.explain + "</div>") : "";
  return "<div class=\"card\"><div class=\"card-top\"><div><div class=\"title\">" + b.title + "</div><div class=\"locality\">" + b.locality + " - " + b.region + "</div></div>" +
    "<div class=\"fit-badge " + (b.is_opportunity?"hot":"") + "\">" + (b.jm_fit != null ? b.jm_fit : "") + "</div></div>" +
    "<div class=\"price\" style=\"margin-top:8px\">" + fmtCHF(b.price) + "</div>" +
    "<div class=\"meta-row\"><span>" + (b.rooms||"?") + " pieces</span><span>" + (b.surface||"?") + " m2</span></div>" +
    "<div class=\"tags\">" + tags.join("") + "</div>" + explain +
    "<div class=\"sources-line\">" + (b.sources||[]).length + " source(s) : " + sources + "</div>" +
    "<div class=\"actions\"><button class=\"btn discard\" onclick=\"discard('" + b.id + "')\">Ecarter</button>" +
    "<button class=\"btn fav " + (b.is_favori?"on":"") + "\" onclick=\"toggleFav('" + b.id + "', " + (!!b.is_favori) + ")\">" + (b.is_favori?"Favori (retirer)":"Favori (ajouter)") + "</button></div></div>";
}
function ecarteCard(d){
  return "<div class=\"card\"><div class=\"card-top\"><div><div class=\"title\">" + d.title_at_exclusion + "</div><div class=\"locality\">" + (d.locality||"") + " - " + (d.region||"") + "</div></div></div>" +
    "<div class=\"price\" style=\"margin-top:8px\">" + fmtCHF(d.price_at_exclusion) + " <span style=\"font-size:11px;color:var(--muted)\">(prix a l'exclusion)</span></div>" +
    "<div class=\"actions\"><button class=\"btn restore\" onclick=\"restore('" + d.bien_id + "')\">Restaurer</button></div></div>";
}

async function discard(id){ await api("/api/discard", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bien_id:id})}); load(); }
async function restore(id){ await api("/api/restore", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bien_id:id})}); load(); }
async function toggleFav(id, isOn){
  if (isOn) await api("/api/favori/"+id, {method:"DELETE"});
  else await api("/api/favori", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bien_id:id})});
  load();
}

async function loadPrefs(){
  const p = await api("/api/preferences");
  const weights = JSON.parse(p.weights_json);
  const regionsAllowed = JSON.parse(p.regions_allowed);
  const labels = {deal:"Qualite de l'affaire",retraite:"Interet retraite",locatif:"Potentiel locatif",cachet:"Cachet",risk:"Faible risque"};
  let slidersHtml = "";
  ["deal","retraite","locatif","cachet","risk"].forEach(function(k){
    slidersHtml += "<div class=\"pref-block\"><label>" + labels[k] + " - <span class=\"mono\">" + weights[k] + "/5</span></label>" +
      "<div class=\"slider-row\"><input type=\"range\" min=\"0\" max=\"5\" value=\"" + weights[k] + "\" oninput=\"updateWeight('" + k + "', this.value)\"></div></div>";
  });
  const regionChips = REGIONS.map(function(r){return "<span class=\"chip " + (regionsAllowed.includes(r)?"on":"") + "\" onclick=\"togglePrefRegion('" + r + "')\">" + r + "</span>";}).join("");
  const html = "<div class=\"card\">" +
    "<div class=\"pref-block\"><label>Cachet indispensable</label><div class=\"chip-row\"><span class=\"chip " + (p.cachet_required?"on":"") + "\" onclick=\"togglePrefCachet()\">" + (p.cachet_required?"Active":"Desactive") + "</span></div></div>" +
    "<div class=\"pref-block\"><label>Regions autorisees</label><div class=\"chip-row\">" + regionChips + "</div></div>" +
    slidersHtml + "</div>";
  document.getElementById("main").innerHTML = html;
  window._prefsCache = p;
}
async function togglePrefCachet(){
  const p = window._prefsCache;
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:JSON.parse(p.regions_allowed),
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required: !p.cachet_required, weights: JSON.parse(p.weights_json)})});
  loadPrefs();
}
async function togglePrefRegion(r){
  const p = window._prefsCache;
  let regions = JSON.parse(p.regions_allowed);
  regions = regions.includes(r) ? regions.filter(function(x){return x!==r;}) : regions.concat([r]);
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:regions,
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required:!!p.cachet_required, weights: JSON.parse(p.weights_json)})});
  loadPrefs();
}
async function updateWeight(k, v){
  const p = window._prefsCache;
  const weights = JSON.parse(p.weights_json); weights[k] = parseInt(v);
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:JSON.parse(p.regions_allowed),
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required:!!p.cachet_required, weights:weights})});
  window._prefsCache.weights_json = JSON.stringify(weights);
}

async function load(){
  const main = document.getElementById("main");
  main.innerHTML = "<div class=\"status\">Chargement...</div>";

  if (activeTab === "preferences"){ return loadPrefs(); }
  if (activeTab === "sources"){
    const r = await api("/api/sources");
    main.innerHTML = "<div class=\"card\"><table class=\"sources-table\"><thead><tr><th>Source</th><th>Etat</th><th>Annonces</th></tr></thead><tbody>" +
      r.results.map(function(s){return "<tr><td><span class=\"dot " + s.state + "\"></span>" + s.name + "</td><td>" + s.state + "</td><td class=\"mono\">" + (s.last_productive_count||0) + "</td></tr>";}).join("") +
      "</tbody></table></div>";
    return;
  }
  if (activeTab === "ecartes"){
    const r = await api("/api/ecartes");
    main.innerHTML = r.results.length ? r.results.map(ecarteCard).join("") : "<div class=\"empty\">Aucun bien ecarte.</div>";
    return;
  }
  if (activeTab === "baisses"){
    const r = await api("/api/baisses");
    main.innerHTML = r.results.length ? r.results.map(bienCard).join("") : "<div class=\"empty\">Aucune baisse detectee.</div>";
    return;
  }

  const params = new URLSearchParams();
  const q = document.getElementById("q").value.trim();
  if (q) params.set("q", q);
  const region = document.getElementById("fRegion").value; if (region) params.set("region", region);
  const type_ = document.getElementById("fType").value; if (type_) params.set("type", type_);
  params.set("budget_max", document.getElementById("fBudget").value);
  params.set("sort", document.getElementById("fSort").value);
  if (activeTab === "opportunites") params.set("opportunites", "1");
  if (activeTab === "favoris") params.set("favoris", "1");

  const r = await api("/api/search?" + params.toString());
  main.innerHTML = r.results.length ? r.results.map(bienCard).join("") : "<div class=\"empty\">Aucun resultat pour ces criteres.</div>";
}

document.getElementById("tabs").addEventListener("click", function(e){
  const t = e.target.closest("[data-tab]"); if(!t) return;
  activeTab = t.dataset.tab;
  document.querySelectorAll(".tab").forEach(function(el){el.classList.toggle("active", el.dataset.tab===activeTab);});
  load();
});
document.getElementById("btnSearch").onclick = load;
document.getElementById("btnRefresh").onclick = async function(){
  const btn = document.getElementById("btnRefresh");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Actualisation en cours...";
  try {
    await fetch("/api/refresh");
  } catch(e) { /* le rechargement des donnees ci-dessous montrera l etat reel meme en cas d erreur reseau */ }
  btn.disabled = false;
  btn.innerHTML = original;
  load();
};
["fRegion","fType","fBudget","fSort"].forEach(function(id){document.getElementById(id).onchange = load;});
document.getElementById("q").addEventListener("keydown", function(e){ if(e.key==="Enter") load(); });
load();
</script>
</body></html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const db = env.DB;

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
      }

      if (url.pathname === "/api/health") return json({ status: "ok", time: new Date().toISOString() });

      if (url.pathname === "/api/refresh" && (request.method === "POST" || request.method === "GET")) {
        const report = await fullRefresh(db, fetch.bind(globalThis));
        return json(report);
      }

      if (url.pathname === "/api/ingest-raw" && request.method === "POST") {
        // Relais externe (ex. GitHub Actions) : le HTML est déjà récupéré
        // ailleurs (réseau différent de Cloudflare) et fourni tel quel ici.
        // Réutilise exactement le même moteur d'extraction que le mode
        // automatique — aucune logique dupliquée (art. flexibilité).
        const body = await request.json();
        const srcRes = await db.prepare("SELECT * FROM sources WHERE name=?").bind(body.source_name).all();
        const srcRow = srcRes.results[0];
        if (!srcRow) return json({ error: "source inconnue : " + body.source_name }, 404);
        let config = {};
        try { config = JSON.parse(srcRow.config_json || "{}"); } catch (e) {}
        const extra = await loadExtraLocalities(db);
        const html = decodeEntitiesGeneric(body.html || "");
        // Capture systématique du HTML brut reçu (art. flexibilité) : permet
        // une consultation directe en base pour concevoir/corriger un motif
        // d'extraction sans jamais avoir besoin d'un nouvel envoi côté relais.
        try {
          await db.prepare("INSERT INTO debug_captures (source_name, url, html, captured_at) VALUES (?,?,?,?) ON CONFLICT(source_name) DO UPDATE SET url=excluded.url, html=excluded.html, captured_at=excluded.captured_at")
            .bind(body.source_name, body.url || "", html.slice(0, 300000), new Date().toISOString()).run();
        } catch (e) { /* la capture de diagnostic ne doit jamais bloquer l'ingestion réelle */ }
        let records = [];
        if (config.mode === "two_step" && body.is_list) {
          // Étape 1 du mode deux temps via relais externe : la page de liste
          // est fournie, on en extrait les liens et on les renvoie — c'est le
          // relais qui ira ensuite chercher chaque fiche individuellement.
          const links = extractLinksGeneric(html, config).slice(0, config.max_details || 20);
          return json({ ok: true, links });
        }
        if (config.mode === "two_step" && body.is_detail) {
          const rec = extractDetailGeneric(html, config, extra);
          if (rec) records = [Object.assign({ url: body.url }, rec)];
        } else {
          records = extractSingleGeneric(html, config, extra);
        }
        let stored = 0;
        let hitLimit = false;
        const dirtyBienIds = new Set();
        // Aucune limite fixée à l'avance : chaque annonce est traitée
        // individuellement, et la boucle s'arrête proprement dès qu'elle
        // approche la vraie limite technique de Cloudflare (variable selon
        // le plan, le volume de données, etc.), sans jamais faire échouer
        // toute la requête. Le reste sera traité au prochain passage du
        // relais — plus jamais besoin de deviner ou d'ajuster un chiffre.
        for (const rec of records) {
          try {
            const rl = {
              external_id: (rec.url || body.url || (rec.locality + rec.price)).split("/").filter(Boolean).pop(),
              url: rec.url || body.url, title: (rec.type || "Bien") + " — " + rec.locality,
              locality: rec.locality, type: rec.type || "Appartement",
              rooms: rec.rooms, surface: rec.surface, price: rec.price, address: rec.address || null,
              confidence: config.confidence || "Probable",
            };
            const ok = await storeListing(db, srcRow, rl, extra);
            if (ok) { stored++; dirtyBienIds.add(bienKey(rl.locality, rl.type, rl.rooms, rl.surface)); }
          } catch (e) {
            hitLimit = true;
            break;
          }
        }
        const newState = stored > 0 ? "productive" : "accessible";
        try {
          await db.prepare("UPDATE sources SET state=?, last_checked=?, last_error=NULL, last_productive_count=last_productive_count+? WHERE id=?")
            .bind(newState, new Date().toISOString(), stored, srcRow.id).run();
        } catch (e) { /* si la limite est atteinte même ici, ce n'est pas grave : le prochain passage réessaiera */ }
        if (dirtyBienIds.size > 0) {
          // Recalcul ciblé uniquement sur les biens réellement concernés par
          // ce lot d'annonces — pas toute la base à chaque passage.
          try { await recomputeTargeted(db, [...dirtyBienIds]); } catch (e) { /* sera retenté au prochain passage */ }
        }
        return json({ ok: true, stored, hitLimit, remaining: hitLimit ? records.length - stored : 0, source: srcRow.name });
      }

      if (url.pathname === "/api/search") {
        const q = url.searchParams;
        const results = await search(db, {
          q: q.get("q"), region: q.get("region"), type: q.get("type"),
          budgetMax: q.has("budget_max") ? parseFloat(q.get("budget_max")) : undefined,
          roomsMin: q.has("rooms_min") ? parseFloat(q.get("rooms_min")) : undefined,
          surfaceMin: q.has("surface_min") ? parseFloat(q.get("surface_min")) : undefined,
          cachet: q.has("cachet") ? q.get("cachet") === "1" : undefined,
          sort: q.get("sort") || "jmfit",
          favorisOnly: q.get("favoris") === "1", opportunitiesOnly: q.get("opportunites") === "1",
        });
        return json({ count: results.length, results });
      }

      if (url.pathname === "/api/favoris") {
        const results = await search(db, { favorisOnly: true, limit: 500 });
        return json({ results });
      }

      if (url.pathname === "/api/ecartes") {
        const res = await db.prepare("SELECT * FROM discarded ORDER BY date_exclusion DESC").all();
        return json({ results: res.results });
      }

      if (url.pathname === "/api/baisses") {
        const res = await db.prepare("SELECT * FROM biens WHERE price_drop_json IS NOT NULL AND id NOT IN (SELECT bien_id FROM discarded)").all();
        const resc = await db.prepare("SELECT * FROM rescues ORDER BY date DESC LIMIT 30").all();
        return json({ results: res.results, rescues: resc.results });
      }

      if (url.pathname === "/api/sources") {
        const res = await db.prepare("SELECT * FROM sources ORDER BY name").all();
        return json({ results: res.results });
      }

      if (url.pathname === "/api/preferences" && request.method === "GET") {
        const res = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
        return json(res.results[0]);
      }
      if (url.pathname === "/api/preferences" && request.method === "PUT") {
        const body = await request.json();
        // Ne relance un recalcul complet (couteux : plusieurs centaines de
        // requetes D1 a l'echelle actuelle) que si les ponderations ou le
        // seuil "Opportunite" changent reellement — ce sont les seuls
        // reglages qui affectent les scores deja stockes. Region, cachet et
        // origine du trajet sont de simples filtres appliques a la recherche,
        // sans impact sur les scores : les changer ne necessite aucun
        // recalcul, et forcer un recalcul a chaque fois risquait de faire
        // echouer silencieusement la sauvegarde a mesure que la base grossit.
        const beforeRes = await db.prepare("SELECT weights_json, opportunity_threshold FROM preferences WHERE id=1").all();
        const before = beforeRes.results[0];
        const newWeightsJson = JSON.stringify(body.weights || {deal:4,retraite:2,locatif:2,cachet:3,risk:3});
        const newThreshold = body.opportunity_threshold || 70;
        const needsRecompute = before.weights_json !== newWeightsJson || before.opportunity_threshold !== newThreshold;

        await db.prepare("UPDATE preferences SET budget_max=?, types_allowed=?, regions_allowed=?, surface_min=?, rooms_min=?, cachet_required=?, weights_json=?, origine_trajet=?, opportunity_threshold=? WHERE id=1")
          .bind(body.budget_max || 500000, JSON.stringify(body.types_allowed||[]), JSON.stringify(body.regions_allowed||[]),
            body.surface_min || 0, body.rooms_min || 0, body.cachet_required?1:0,
            newWeightsJson, body.origine_trajet || "Fribourg", newThreshold).run();
        if (needsRecompute) await recomputeFull(db);
        return json({ ok: true, recomputed: needsRecompute });
      }

      if (url.pathname.indexOf("/api/biens/") === 0) {
        const id = url.pathname.slice("/api/biens/".length);
        const res = await db.prepare("SELECT * FROM biens WHERE id=?").bind(id).all();
        if (!res.results.length) return json({ error: "not found" }, 404);
        return json(res.results[0]);
      }

      if (url.pathname === "/api/discard" && request.method === "POST") {
        const body = await request.json();
        const bRes = await db.prepare("SELECT * FROM biens WHERE id=?").bind(body.bien_id).all();
        const b = bRes.results[0];
        if (!b) return json({ error: "bien introuvable" }, 404);
        await db.prepare("INSERT INTO discarded (bien_id, price_at_exclusion, date_exclusion, title_at_exclusion, locality, region, type, rooms, surface) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(bien_id) DO NOTHING")
          .bind(body.bien_id, b.price, new Date().toISOString(), b.title, b.locality, b.region, b.type, b.rooms, b.surface).run();
        await db.prepare("DELETE FROM favoris WHERE bien_id=?").bind(body.bien_id).run();
        await recomputeTargeted(db, [body.bien_id]);
        return json({ ok: true });
      }
      if (url.pathname === "/api/restore" && request.method === "POST") {
        const body = await request.json();
        await db.prepare("DELETE FROM discarded WHERE bien_id=?").bind(body.bien_id).run();
        await recomputeTargeted(db, [body.bien_id]);
        return json({ ok: true });
      }
      if (url.pathname === "/api/favori" && request.method === "POST") {
        const body = await request.json();
        const discRes = await db.prepare("SELECT 1 FROM discarded WHERE bien_id=?").bind(body.bien_id).all();
        if (discRes.results.length) return json({ error: "bien écarté" }, 400);
        await db.prepare("INSERT OR IGNORE INTO favoris (bien_id, date_added) VALUES (?,?)").bind(body.bien_id, new Date().toISOString()).run();
        return json({ ok: true });
      }
      if (url.pathname.indexOf("/api/favori/") === 0 && request.method === "DELETE") {
        const id = url.pathname.slice("/api/favori/".length);
        await db.prepare("DELETE FROM favoris WHERE bien_id=?").bind(id).run();
        return json({ ok: true });
      }

      if (url.pathname === "/api/report-check" && request.method === "POST") {
        // Permet au relais de signaler un echec (ex. HTTP 403) meme sans
        // contenu HTML a traiter — sans cette route, une source bloquee de
        // maniere persistante ne voit jamais sa date de derniere verification
        // mise a jour, donnant l'illusion trompeuse qu'elle n'est jamais
        // tentee alors qu'elle est en realite tentee puis rejetee a chaque
        // passage.
        const body = await request.json();
        const srcRes = await db.prepare("SELECT * FROM sources WHERE name=?").bind(body.source_name).all();
        const srcRow = srcRes.results[0];
        if (!srcRow) return json({ error: "source inconnue : " + body.source_name }, 404);
        await db.prepare("UPDATE sources SET last_checked=?, last_error=? WHERE id=?")
          .bind(new Date().toISOString(), body.error || null, srcRow.id).run();
        return json({ ok: true });
      }

      if (url.pathname === "/") {
        // Le frontend vit en base (art. 6 : modifications d'interface sans
        // redéploiement). FRONTEND_HTML codé en dur sert uniquement de
        // filet de sécurité si la base est indisponible (art. 25).
        let html = FRONTEND_HTML;
        try {
          const row = await db.prepare("SELECT value FROM app_config WHERE key='frontend_html'").all();
          if (row.results.length && row.results[0].value) html = row.results[0].value;
        } catch (e) { /* filet de sécurité : sert la version codée en dur */ }
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      return json({ error: "route inconnue" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    // La collecte réelle se fait désormais uniquement via le relais externe
    // (GitHub Actions) — jamais depuis Cloudflare directement, pour éviter
    // la limite technique de sous-requêtes sur les sources à fort volume.
    // Cette tâche planifiée nettoie d'abord les annonces plus revues depuis
    // longtemps (probablement plus en ligne), puis recalcule les scores.
    ctx.waitUntil((async () => {
      await cleanupStaleListings(env.DB, 21);
      await recomputeFull(env.DB);
    })());
  },
};
