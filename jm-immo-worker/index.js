// BUILD-MARKER 1788357728 padding-357: 7yfRYr1m9VAeolBATFDFTxg4mD8k6xsxwNKO2GeRQtJhbuWzPb7aA4JwvUDXkZ5kUIenVI3h6Oo58cRplq5BqcKtJhVLSpSwZZFspR8fvxufM6zrr9Ut1HxMOBaBXvg1A7qAqzevUV4B3aRYqvmUEANhaXMFJVLgxttqNDn7pm5bPJiaK3Q5JXC1znSnhFwGAtXea2AcE7BNuzIfwogdZcxzl6S74MHp31BH11pNYuCLjnGYeDPlPzoWKmyqpuZ5dnBCvpFykVsQw1dMsuw6lVSwmMou1LZxuSTDDL5mGt4JqVsUjQf5DjBzfiIw4UsumThuyXH8gVcqosuHi127XVfFmdW5KkddtbOZl
// VERSION_MARKER_JMIMMO_20260901_DATAACTION_v3
// index.js
var SOURCE_TIMEOUT_MS = 8e3;
var REGION_MAP = {
  "lugano": "Tessin",
  "bellinzona": "Tessin",
  "locarno": "Tessin",
  "mendrisio": "Tessin",
  "chiasso": "Tessin",
  "ascona": "Tessin",
  "biasca": "Tessin",
  "gordola": "Tessin",
  "gordevio": "Tessin",
  "riva san vitale": "Tessin",
  "massagno": "Tessin",
  "paradiso": "Tessin",
  "lamone": "Tessin",
  "agno": "Tessin",
  "caslano": "Tessin",
  "minusio": "Tessin",
  "muralto": "Tessin",
  "losone": "Tessin",
  "tenero": "Tessin",
  "giubiasco": "Tessin",
  "saignel\xE9gier": "Jura \u2013 Franches-Montagnes",
  "saignelegier": "Jura \u2013 Franches-Montagnes",
  "le noirmont": "Jura \u2013 Franches-Montagnes",
  "les bois": "Jura \u2013 Franches-Montagnes",
  "muriaux": "Jura \u2013 Franches-Montagnes",
  "montfaucon": "Jura \u2013 Franches-Montagnes",
  "les breuleux": "Jura \u2013 Franches-Montagnes",
  "le b\xE9mont": "Jura \u2013 Franches-Montagnes",
  "les genevez": "Jura \u2013 Franches-Montagnes",
  "lajoux": "Jura \u2013 Franches-Montagnes",
  "saint-ursanne": "Jura \u2013 Clos du Doubs",
  "st-ursanne": "Jura \u2013 Clos du Doubs",
  "ocourt": "Jura \u2013 Clos du Doubs",
  "\xE9pauvillers": "Jura \u2013 Clos du Doubs",
  "epauvillers": "Jura \u2013 Clos du Doubs",
  "montenol": "Jura \u2013 Clos du Doubs",
  "montmelon": "Jura \u2013 Clos du Doubs",
  "seleute": "Jura \u2013 Clos du Doubs",
  "soubey": "Jura \u2013 Clos du Doubs",
  "zweisimmen": "Zweisimmen",
  "st. stephan": "Zweisimmen",
  "saint-etienne": "Zweisimmen",
  "grubenwald": "Zweisimmen",
  "reidenbach": "Zweisimmen",
  "gruy\xE8res": "Gruy\xE8re",
  "gruyeres": "Gruy\xE8re",
  "bulle": "Gruy\xE8re",
  "charmey": "Gruy\xE8re",
  "broc": "Gruy\xE8re",
  "riaz": "Gruy\xE8re",
  "vuadens": "Gruy\xE8re",
  "jaun": "Gruy\xE8re",
  "cr\xE9suz": "Gruy\xE8re",
  "cresuz": "Gruy\xE8re",
  "la roche": "Gruy\xE8re",
  "porsel": "Gruy\xE8re",
  "montbovon": "Gruy\xE8re",
  "im fang": "Gruy\xE8re",
  "enney": "Gruy\xE8re",
  "saint-martin": "Gruy\xE8re",
  "botterens": "Gruy\xE8re",
  "corbi\xE8res": "Gruy\xE8re",
  "echarlens": "Gruy\xE8re",
  "grandvillard": "Gruy\xE8re",
  "pont-la-ville": "Gruy\xE8re",
  "sorens": "Gruy\xE8re",
  "haut-intyamon": "Gruy\xE8re",
  "bas-intyamon": "Gruy\xE8re",
  "neuch\xE2tel": "Neuch\xE2tel",
  "neuchatel": "Neuch\xE2tel",
  "la chaux-de-fonds": "Neuch\xE2tel",
  "le locle": "Neuch\xE2tel",
  "peseux": "Neuch\xE2tel",
  "corcelles": "Neuch\xE2tel",
  "cormondr\xE8che": "Neuch\xE2tel",
  "boudry": "Neuch\xE2tel",
  "colombier": "Neuch\xE2tel",
  "hauterive": "Neuch\xE2tel",
  "saint-blaise": "Neuch\xE2tel",
  "cortaillod": "Neuch\xE2tel",
  "auvernier": "Neuch\xE2tel",
  "marin": "Neuch\xE2tel",
  "le landeron": "Neuch\xE2tel",
  "val-de-ruz": "Neuch\xE2tel"
};
var JURA_HORS_PERIMETRE = /* @__PURE__ */ new Set([
  "del\xE9mont",
  "delemont",
  "porrentruy",
  "courgenay",
  "bassecourt",
  "develier",
  "soyhi\xE8res",
  "soyhieres",
  "vicques",
  "courroux",
  "court\xE9telle",
  "boncourt",
  "ajoie"
]);
var CONF_ORDER = { "V\xE9rifi\xE9e": 3, "Probable": 2, "\xC0 contr\xF4ler": 1 };
var CACHET_KEYWORDS = ["r\xE9nov\xE9", "historique", "authentique", "cachet", "poutres", "chemin\xE9e", "charme", "chalet", "ferme", "vo\xFBte", "madrier"];
var RESIDENCE_SECONDAIRE_KEYWORDS = ["residenza secondaria", "r\xE9sidence secondaire", "ressidenza secondaria", "zweitwohnung", "seconda casa"];
var TOURISTIC_REGIONS = /* @__PURE__ */ new Set(["Tessin", "Gruy\xE8re", "Zweisimmen"]);
function computeRegion(locality, extra) {
  extra = extra || { map: {}, excluded: /* @__PURE__ */ new Set() };
  const key = (locality || "").trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, "");
  if (JURA_HORS_PERIMETRE.has(key) || extra.excluded.has(key)) return null;
  return REGION_MAP[key] || extra.map[key] || null;
}
function isPlausiblePrice(p) {
  if (typeof p !== "number" || isNaN(p) || !isFinite(p)) return false;
  if (p < 5e4 || p > 5e6) return false;
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
  const hits = CACHET_KEYWORDS.filter((k) => (title || "").toLowerCase().includes(k)).length;
  return Math.max(0, Math.min(100, base + hits * 4));
}
function estimateRetraiteScore(rooms, surface, region) {
  let score = 50;
  if (rooms && rooms <= 4) score += 10;
  if (surface && surface <= 140) score += 10;
  if (["Jura \u2013 Clos du Doubs", "Jura \u2013 Franches-Montagnes", "Gruy\xE8re"].includes(region)) score += 8;
  return Math.max(0, Math.min(100, score));
}
function estimateLocatifScore(region, rooms) {
  let score = 35;
  if (TOURISTIC_REGIONS.has(region)) score += 25;
  if (rooms && rooms <= 3.5) score += 15;
  return Math.max(0, Math.min(100, score));
}
function estimateRiskScore(confidence, historyLen) {
  let score = { "V\xE9rifi\xE9e": 80, "Probable": 62, "\xC0 contr\xF4ler": 45 }[confidence] || 50;
  if (historyLen >= 3) score -= 8;
  return Math.max(0, Math.min(100, score));
}
function jmFit(scores, weights) {
  const wAccessibilite = weights.accessibilite || 0;
  const wsum = Math.max(1, (weights.deal || 0) + (weights.retraite || 0) + (weights.locatif || 0) + (weights.cachet || 0) + (weights.risk || 0) + wAccessibilite);
  const fit = (scores.deal * weights.deal + scores.retraite * weights.retraite + scores.locatif * weights.locatif + scores.cachet * weights.cachet + scores.risk * weights.risk + scores.accessibilite * wAccessibilite) / wsum;
  return Math.max(0, Math.min(100, Math.round(fit)));
}
function explainFit(scores, weights) {
  const labels = { deal: "prix int\xE9ressant", retraite: "potentiel retraite", locatif: "potentiel locatif", cachet: "cachet", risk: "faible risque", accessibilite: "dernier km facile" };
  const hits = Object.keys(scores).filter((k) => weights[k] > 0 && scores[k] >= 60).sort((a, b) => scores[b] - scores[a]).slice(0, 3).map((k) => labels[k]);
  return hits.length ? hits.join(", ") : "profil \xE9quilibr\xE9";
}
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
var DEMO_LISTINGS = [
  { source: "Demo", external_id: "d1", url: "https://exemple.ch/1", title: "Appartement 3.5p r\xE9nov\xE9, vue lac", locality: "Lugano", type: "Appartement", rooms: 3.5, surface: 95, price: 478e3, confidence: "V\xE9rifi\xE9e", history: [["2026-06-02", 478e3]] },
  { source: "Demo", external_id: "d1b", url: "https://exemple2.ch/1", title: "Bel appartement 3.5 pi\xE8ces \u2013 Lugano centre", locality: "Lugano", type: "Appartement", rooms: 3.5, surface: 96, price: 478e3, confidence: "Probable", history: [["2026-06-05", 478e3]] },
  { source: "Demo", external_id: "d2", url: "https://exemple.ch/2", title: "Ferme jurassienne r\xE9nov\xE9e avec cachet", locality: "Saignel\xE9gier", type: "Maison", rooms: 5.5, surface: 140, price: 395e3, confidence: "\xC0 contr\xF4ler", cachet: true, history: [["2026-05-10", 415e3], ["2026-08-19", 395e3]] },
  { source: "Demo", external_id: "d3", url: "https://exemple.ch/3", title: "Maison historique au c\u0153ur du village m\xE9di\xE9val", locality: "Saint-Ursanne", type: "Maison historique", rooms: 6, surface: 160, price: 275e3, confidence: "\xC0 contr\xF4ler", cachet: true, history: [["2026-03-11", 298e3], ["2026-08-16", 275e3]] },
  { source: "Demo", external_id: "d4", url: "https://exemple.ch/4", title: "Chalet avec cachet, vue alpage", locality: "Zweisimmen", type: "Chalet", rooms: 4.5, surface: 110, price: 459e3, confidence: "V\xE9rifi\xE9e", cachet: true, history: [["2026-04-14", 479e3], ["2026-08-22", 459e3]] },
  { source: "Demo", external_id: "d5", url: "https://exemple.ch/5", title: "Rustico authentique, cachet indispensable", locality: "Charmey", type: "Rustico", rooms: 3.5, surface: 85, price: 34e4, confidence: "Probable", cachet: true, history: [["2026-05-28", 34e4]] },
  { source: "Demo", external_id: "d6", url: "https://exemple.ch/6", title: "Appartement 3 pi\xE8ces, quartier calme", locality: "La Chaux-de-Fonds", type: "Appartement", rooms: 3, surface: 72, price: 289e3, confidence: "V\xE9rifi\xE9e", history: [["2026-05-02", 31e4], ["2026-07-10", 299e3], ["2026-08-21", 289e3]] },
  { source: "Demo", external_id: "d7", url: "https://exemple.ch/7", title: "Villa contemporaine avec jardin", locality: "Bulle", type: "Villa", rooms: 6, surface: 180, price: 495e3, confidence: "V\xE9rifi\xE9e", history: [["2026-06-25", 495e3]] },
  { source: "Demo", external_id: "d8", url: "https://exemple.ch/8", title: "Appartement 2 pi\xE8ces centre-ville", locality: "Del\xE9mont", type: "Appartement", rooms: 2, surface: 55, price: 32e4, confidence: "Probable", history: [["2026-07-01", 32e4]] },
  { source: "Demo", external_id: "d9", url: "https://exemple.ch/9", title: "PPE neuve avec balcon", locality: "Neuch\xE2tel", type: "PPE", rooms: 4, surface: 100, price: 512e3, confidence: "V\xE9rifi\xE9e", history: [["2026-07-15", 512e3]] }
];
function demoAdapter() {
  return {
    name: "Demo",
    async check() {
      return "accessible";
    },
    async fetchListings() {
      return DEMO_LISTINGS.map((l) => Object.assign({}, l));
    }
  };
}
function decodeEntitiesGeneric(s) {
  return (s || "").replace(/&#0*39;/g, "'").replace(/&#x0*27;/gi, "'").replace(/&rsquo;/g, "\u2019").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
function parsePriceGeneric(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[.,]00$/, "").replace(/['\u2019,.]/g, "");
  const price = parseFloat(cleaned);
  return isFinite(price) ? price : null;
}
function findKnownLocalityGeneric(text, extra) {
  extra = extra || { map: {} };
  const lower = (text || "").toLowerCase();
  let best = null, bestIdx = Infinity;
  function checkMap(map) {
    for (const key in map) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(^|[^a-z0-9\xE0-\xFF])" + escaped + "($|[^a-z0-9\xE0-\xFF])", "i");
      const m = re.exec(lower);
      if (m && m.index < bestIdx) {
        bestIdx = m.index;
        best = key;
      }
    }
  }
  checkMap(REGION_MAP);
  checkMap(extra.map);
  return best;
}
function extractFieldsGeneric(m, fields, config, extra) {
  const priceMin = config.price_min || 5e4;
  const out = { price: null, rooms: null, surface: null, locality: null, type: null, url: null };
  if (fields.price != null && m[fields.price]) out.price = parsePriceGeneric(m[fields.price]);
  if (fields.rooms != null && m[fields.rooms]) out.rooms = parseFloat(String(m[fields.rooms]).replace(",", "."));
  if (fields.surface != null && m[fields.surface]) out.surface = parseFloat(m[fields.surface]);
  if (fields.type != null && m[fields.type]) out.type = m[fields.type].trim();
  if (fields.url != null && m[fields.url]) {
    out.url = m[fields.url].trim();
    if (config.url_prefix && out.url && !/^https?:\/\//i.test(out.url)) {
      out.url = config.url_prefix.replace(/\/$/, "") + "/" + out.url.replace(/^\//, "");
    }
  }
  if (fields.locality != null && m[fields.locality]) {
    const raw = m[fields.locality];
    out.locality = config.locality_lookup ? findKnownLocalityGeneric(raw, extra) : raw.trim();
  }
  if (config.sub_fields) {
    for (const key in config.sub_fields) {
      if (out[key] != null) continue;
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
  return path.split(".").reduce((acc, key) => acc && acc[key] !== void 0 ? acc[key] : void 0, obj);
}
function extractJsonAfterMarker(html, marker) {
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
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(i, j + 1);
    }
  }
  return null;
}
function extractStateJsonGeneric(html, config) {
  const jsonText = extractJsonAfterMarker(html, config.state_json_marker);
  if (!jsonText) return [];
  let root;
  try {
    root = JSON.parse(jsonText);
  } catch (e) {
    return [];
  }
  const candidatePaths = Array.isArray(config.state_json_list_path) ? config.state_json_list_path : [config.state_json_list_path];
  let items = null;
  for (const path of candidatePaths) {
    const found = getByPath(root, path);
    if (Array.isArray(found)) {
      items = found;
      break;
    }
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
    const url = config.url_prefix && id != null ? config.url_prefix.replace(/\/$/, "") + "/" + (config.url_path_prefix || "") + id : null;
    let address = f.address ? getByPath(item, f.address) : null;
    if (!address && f.locality) {
      const addrBase = f.locality.replace(/\.[^.]+$/, "");
      const street = getByPath(item, addrBase + ".street");
      const houseNumber = getByPath(item, addrBase + ".houseNumber");
      const postalCode = getByPath(item, addrBase + ".postalCode");
      if (street) {
        address = String(street) + (houseNumber ? " " + houseNumber : "") + (postalCode ? ", " + postalCode + " " + (locality || "") : locality ? ", " + locality : "");
      }
    }
    out.push({ price: parseFloat(price), locality, rooms, surface, url, address: address || null, type: null });
  }
  return out;
}
function extractJsonLdGeneric(html) {
  const out = [];
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const roots = Array.isArray(data) ? data : [data];
      const items = [];
      for (const entry of roots) {
        const list = entry.mainEntity && entry.mainEntity.itemListElement;
        if (Array.isArray(list)) {
          for (const li of list) {
            if (li.item) items.push(li.item);
          }
        } else {
          items.push(entry);
        }
      }
      for (const obj of items) {
        const price = obj.price || obj.offers && obj.offers.price;
        if (!price) continue;
        const addr = obj.address || obj.offers && obj.offers.address || obj.contentLocation && obj.contentLocation.address || {};
        let surface = obj.floorSize && obj.floorSize.value || null;
        if (!surface && typeof obj.size === "string") {
          const sm = /([\d.]+)/.exec(obj.size);
          if (sm) surface = parseFloat(sm[1]);
        }
        const streetAddress = addr.streetAddress || null;
        const fullAddress = streetAddress ? streetAddress + (addr.addressLocality ? ", " + (addr.postalCode ? addr.postalCode + " " : "") + addr.addressLocality : "") : null;
        out.push({
          url: obj.url || null,
          title: obj.name || null,
          locality: addr.addressLocality || null,
          address: fullAddress,
          type: obj.category || null,
          rooms: obj.numberOfRooms || null,
          surface,
          price: parseFloat(price),
          description: obj.description || null
        });
      }
    } catch (e) {
    }
  }
  return out;
}
function extractSingleGeneric(html, config, extra) {
  if (config.try_json_ld) {
    const ldResults = extractJsonLdGeneric(html).filter((r) => {
      if (!r.price || r.price < (config.price_min || 5e4)) return false;
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      if (config.locality_lookup && !r.locality && r.title) r.locality = findKnownLocalityGeneric(r.title, extra);
      return !!r.locality;
    });
    if (ldResults.length > 0) return ldResults;
  }
  if (config.state_json_marker) {
    const stateResults = extractStateJsonGeneric(html, config).filter((r) => {
      if (!r.price || r.price < (config.price_min || 5e4)) return false;
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      return !!r.locality;
    });
    if (stateResults.length > 0) return stateResults;
  }
  const patterns = [config.block_pattern, config.fallback_pattern].filter(Boolean);
  for (const pattern of patterns) {
    const re = new RegExp(pattern, "gi");
    const out = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      if (config.reject_if && new RegExp(config.reject_if, "i").test(m[0]) && !(config.reject_unless && new RegExp(config.reject_unless, "i").test(m[0]))) {
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
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    let url = m[config.link_group || 1];
    if (!url) continue;
    if (config.link_base && !/^https?:\/\//i.test(url)) {
      url = config.link_base.replace(/\/$/, "") + (url.startsWith("/") ? "" : "/") + url;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}
function extractDetailGeneric(html, config, extra) {
  if (config.reject_if && new RegExp(config.reject_if, "i").test(html) && !(config.reject_unless && new RegExp(config.reject_unless, "i").test(html))) {
    return null;
  }
  if (config.try_json_ld) {
    const ldResults = extractJsonLdGeneric(html);
    if (ldResults.length > 0) {
      const r = ldResults[0];
      if (config.locality_lookup && r.locality) r.locality = findKnownLocalityGeneric(r.locality, extra);
      if (config.locality_lookup && !r.locality && r.title) r.locality = findKnownLocalityGeneric(r.title, extra);
      if (!r.address && config.address_pattern) {
        const am = new RegExp(config.address_pattern, "i").exec(html);
        if (am) r.address = am[1].trim();
      }
      if (r.price >= (config.price_min || 5e4) && r.locality) return r;
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
  try {
    config = JSON.parse(sourceRow.config_json || "{}");
  } catch (e) {
    config = {};
  }
  const headers = config.headers || {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "fr-CH,fr;q=0.9"
  };
  async function fetchText(fetchFn, url, budget) {
    if (budget && budget.remaining <= 0) throw new Error("Budget de requetes epuise pour ce rafraichissement");
    if (budget) budget.remaining--;
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
  function extractSingle(html) {
    return extractSingleGeneric(html, config, extra);
  }
  function extractLinks(html) {
    return extractLinksGeneric(html, config);
  }
  function extractDetail(html) {
    return extractDetailGeneric(html, config, extra);
  }
  return {
    name: sourceRow.name,
    async check(fetchFn, budget) {
      const urls = config.mode === "two_step" ? [config.list_url] : config.urls || [config.list_url];
      await fetchText(fetchFn, urls[0], budget);
      return "accessible";
    },
    async fetchListings(fetchFn, budget) {
      const out = [];
      if (config.mode === "two_step") {
        const listHtml = await fetchText(fetchFn, config.list_url, budget);
        const links = extractLinks(listHtml);
        for (const url of links.slice(0, config.max_details || 20)) {
          try {
            const detHtml = await fetchText(fetchFn, url, budget);
            const detail = extractDetail(detHtml);
            if (!detail) continue;
            out.push({
              external_id: url.split("/").filter(Boolean).pop(),
              url,
              title: (detail.type || "Bien") + " \u2014 " + detail.locality,
              locality: detail.locality,
              type: detail.type || "Appartement",
              rooms: detail.rooms,
              surface: detail.surface,
              price: detail.price,
              confidence: config.confidence || "V\xE9rifi\xE9e"
            });
          } catch (e) {
            if (budget && budget.remaining <= 0) throw e;
          }
        }
      } else {
        const urls = config.urls || [];
        for (const url of urls) {
          try {
            const html = await fetchText(fetchFn, url, budget);
            for (const rec of extractSingle(html)) {
              out.push({
                external_id: (rec.url || rec.locality + rec.price).split("/").filter(Boolean).pop(),
                url: rec.url || config.list_url || urls[0],
                title: (rec.type || "Bien") + " \u2014 " + rec.locality,
                locality: rec.locality,
                type: rec.type || "Appartement",
                rooms: rec.rooms,
                surface: rec.surface,
                price: rec.price,
                address: rec.address || null,
                confidence: config.confidence || "Probable"
              });
            }
          } catch (e) {
            if (budget && budget.remaining <= 0) throw e;
          }
        }
      }
      return out;
    }
  };
}
async function loadExtraLocalities(db) {
  const map = {};
  const excluded = /* @__PURE__ */ new Set();
  try {
    const res = await db.prepare("SELECT name, region FROM localities").all();
    for (const row of res.results) map[row.name.toLowerCase()] = row.region;
    const exRes = await db.prepare("SELECT name FROM localities_excluded").all();
    for (const row of exRes.results) excluded.add(row.name.toLowerCase());
  } catch (e) {
  }
  return { map, excluded };
}
async function getSourceOffset(db) {
  try {
    const res = await db.prepare("SELECT value FROM app_config WHERE key='source_offset'").all();
    if (res.results.length) return parseInt(res.results[0].value) || 0;
  } catch (e) {
  }
  return 0;
}
async function setSourceOffset(db, offset) {
  try {
    await db.prepare("INSERT INTO app_config (key, value) VALUES ('source_offset', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(offset)).run();
  } catch (e) {
  }
}
async function ingest(db, fetchFn) {
  const report = [];
  const extra = await loadExtraLocalities(db);
  const sourcesRes = await db.prepare("SELECT * FROM sources WHERE enabled=1 ORDER BY id ASC").all();
  const allSources = sourcesRes.results;
  if (allSources.length === 0) return report;
  const offset = (await getSourceOffset(db)) % allSources.length;
  const rotated = allSources.slice(offset).concat(allSources.slice(0, offset));
  const fetchBudget = { remaining: 35 };
  let attempted = 0;
  for (const srcRow of rotated) {
    if (fetchBudget.remaining <= 0) break;
    attempted++;
    const adapter = srcRow.adapter === "demo" ? demoAdapter() : genericAdapter(srcRow, extra);
    let state = "enregistr\xE9e", error = null, stored = 0;
    try {
      state = await adapter.check(fetchFn, fetchBudget);
      const rawListings = await adapter.fetchListings(fetchFn, fetchBudget);
      for (const rl of rawListings) stored += await storeListing(db, srcRow, rl, extra);
      if (stored > 0) state = "productive";
    } catch (e) {
      error = String(e && e.message ? e.message : e);
    }
    await db.prepare("UPDATE sources SET state=?, last_checked=?, last_error=?, last_productive_count=? WHERE id=?").bind(state, (/* @__PURE__ */ new Date()).toISOString(), error, stored, srcRow.id).run();
    report.push({ source: srcRow.name, state, stored, error });
  }
  await setSourceOffset(db, (offset + attempted) % allSources.length);
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
  await db.prepare("INSERT INTO listings (id, source_id, external_id, url, title, locality, region, type, rooms, surface, price, currency, is_rental, cachet, status, confidence, first_seen, last_seen, bien_id, address, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, price=excluded.price, status=excluded.status, confidence=excluded.confidence, last_seen=excluded.last_seen, region=excluded.region, address=excluded.address, description=excluded.description").bind(
    listingId,
    srcRow.id,
    rl.external_id,
    rl.url || "",
    rl.title,
    rl.locality,
    region,
    rl.type || "",
    rl.rooms ?? null,
    rl.surface ?? null,
    rl.price,
    "CHF",
    rl.is_rental ? 1 : 0,
    rl.cachet ? 1 : 0,
    "active",
    rl.confidence || "\xC0 contr\xF4ler",
    firstSeen,
    today,
    bId,
    rl.address || null,
    rl.description || null
  ).run();
  const history = rl.history && rl.history.length ? rl.history : [[today, rl.price]];
  for (const pair of history) {
    const hDate = pair[0], hPrice = pair[1];
    const exists = await db.prepare("SELECT 1 FROM price_history WHERE bien_id=? AND date=? AND price=?").bind(bId, hDate, hPrice).all();
    if (!exists.results.length) await db.prepare("INSERT INTO price_history (bien_id, date, price) VALUES (?,?,?)").bind(bId, hDate, hPrice).run();
  }
  return 1;
}
async function cleanupStaleListings(db, maxAgeDays) {
  const seuil = new Date(Date.now() - (maxAgeDays || 21) * 24 * 3600 * 1e3).toISOString();
  const res = await db.prepare("UPDATE listings SET status='inactive' WHERE status='active' AND last_seen < ?").bind(seuil).run();
  return res.meta ? res.meta.changes : 0;
}

// --- Accessibilite dernier km (gare -> adresse) via OpenRouteService + transport.opendata.ch ---
function estimateAccessibiliteScore(lastMileDurationMin, lastMileElevationM, transitDurationMin, transitTransfers) {
  let score = 100;
  if (lastMileDurationMin != null) {
    if (lastMileDurationMin > 5) score -= (lastMileDurationMin - 5) * 3;
  }
  if (lastMileElevationM != null && lastMileElevationM > 20) {
    score -= (lastMileElevationM - 20) * 0.5;
  }
  if (transitDurationMin != null && transitDurationMin > 120) {
    score -= (transitDurationMin - 120) * 0.15;
  }
  if (transitTransfers != null && transitTransfers > 2) {
    score -= (transitTransfers - 2) * 8;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function geocodeAddressORS(address, orsApiKey) {
  const url = "https://api.heigit.org/geocode/search?api_key=" + encodeURIComponent(orsApiKey) + "&text=" + encodeURIComponent(address) + "&size=1&boundary.country=CH";
  const res = await fetch(url, { headers: { "Authorization": orsApiKey } });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error("ORS geocode HTTP " + res.status + " : " + bodyText.slice(0, 300));
  }
  const data = await res.json();
  const feature = data.features && data.features[0];
  if (!feature) return null;
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon };
}

async function findNearestStopSwiss(lat, lon) {
  const url = "https://transport.opendata.ch/v1/locations?x=" + lat + "&y=" + lon + "&type=station";
  const res = await fetch(url);
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error("transport.opendata.ch locations HTTP " + res.status + " : " + bodyText.slice(0, 300));
  }
  const data = await res.json();
  const stop = data.stations && data.stations[0];
  if (!stop || !stop.coordinate) return null;
  return { name: stop.name, lat: stop.coordinate.x, lon: stop.coordinate.y };
}

async function computeWalkingSegmentORS(fromLat, fromLon, toLat, toLon, orsApiKey) {
  const res = await fetch("https://api.heigit.org/v2/directions/foot-walking/geojson", {
    method: "POST",
    headers: { "Authorization": orsApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[fromLon, fromLat], [toLon, toLat]], elevation: true })
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error("ORS directions HTTP " + res.status + " : " + bodyText.slice(0, 300));
  }
  const data = await res.json();
  const feature = data.features && data.features[0];
  const summary = feature && feature.properties && feature.properties.summary;
  if (!summary) return null;
  const ascent = feature.properties.ascent || 0;
  const descent = feature.properties.descent || 0;
  return {
    distanceM: summary.distance,
    durationMin: summary.duration / 60,
    elevationM: Math.max(ascent, descent)
  };
}

async function computeTrainJourneySwiss(originStopName, destStopName) {
  const url = "https://transport.opendata.ch/v1/connections?from=" + encodeURIComponent(originStopName) + "&to=" + encodeURIComponent(destStopName) + "&limit=1";
  const res = await fetch(url);
  if (!res.ok) throw new Error("transport.opendata.ch connections HTTP " + res.status);
  const data = await res.json();
  const conn = data.connections && data.connections[0];
  if (!conn) return null;
  const dep = new Date(conn.from.departure).getTime();
  const arr = new Date(conn.to.arrival).getTime();
  return {
    durationMin: Math.round((arr - dep) / 6e4),
    transfers: conn.transfers != null ? conn.transfers : null
  };
}

async function computeAccessibility(address, originStopName, env, db, bId) {
  if (!address) return null;
  if (!env.ORS_API_KEY) {
    if (db) {
      try {
        await db.prepare("INSERT INTO access_debug (bien_id, address, stage, error, ts) VALUES (?,?,?,?,?)").bind(bId, address, "config", "ORS_API_KEY manquant", (/* @__PURE__ */ new Date()).toISOString()).run();
      } catch (e2) {
      }
    }
    return null;
  }
  try {
    const addrPoint = await geocodeAddressORS(address, env.ORS_API_KEY);
    if (!addrPoint) {
      if (db) {
        try {
          await db.prepare("INSERT INTO access_debug (bien_id, address, stage, error, ts) VALUES (?,?,?,?,?)").bind(bId, address, "geocode", "aucun resultat", (/* @__PURE__ */ new Date()).toISOString()).run();
        } catch (e2) {
        }
      }
      return null;
    }
    const stop = await findNearestStopSwiss(addrPoint.lat, addrPoint.lon);
    if (!stop) {
      if (db) {
        try {
          await db.prepare("INSERT INTO access_debug (bien_id, address, stage, error, ts) VALUES (?,?,?,?,?)").bind(bId, address, "nearest_stop", "aucune gare trouvee", (/* @__PURE__ */ new Date()).toISOString()).run();
        } catch (e2) {
        }
      }
      return null;
    }
    const walk = await computeWalkingSegmentORS(stop.lat, stop.lon, addrPoint.lat, addrPoint.lon, env.ORS_API_KEY);
    if (!walk) {
      if (db) {
        try {
          await db.prepare("INSERT INTO access_debug (bien_id, address, stage, error, ts) VALUES (?,?,?,?,?)").bind(bId, address, "walking", "pas de sommaire dans la reponse", (/* @__PURE__ */ new Date()).toISOString()).run();
        } catch (e2) {
        }
      }
      return null;
    }
    let transit = null;
    try {
      transit = await computeTrainJourneySwiss(originStopName || "Fribourg", stop.name);
    } catch (e) {
    }
    const accessibiliteScore = estimateAccessibiliteScore(
      walk.durationMin,
      walk.elevationM,
      transit ? transit.durationMin : null,
      transit ? transit.transfers : null
    );
    return {
      nearest_stop_name: stop.name,
      last_mile_distance_m: Math.round(walk.distanceM),
      last_mile_duration_min: Math.round(walk.durationMin * 10) / 10,
      last_mile_elevation_m: Math.round(walk.elevationM),
      transit_duration_min: transit ? transit.durationMin : null,
      transit_transfers: transit ? transit.transfers : null,
      accessibilite_score: accessibiliteScore
    };
  } catch (e) {
    if (db) {
      try {
        await db.prepare("INSERT INTO access_debug (bien_id, address, stage, error, ts) VALUES (?,?,?,?,?)").bind(bId, address, "exception", String(e && e.message ? e.message : e), (/* @__PURE__ */ new Date()).toISOString()).run();
      } catch (e2) {
      }
    }
    return null;
  }
}

async function getOrComputeAccess(db, bId, address, originStopName, env, budget) {
  if (!address) return null;
  let cached = null;
  try {
    const cacheRes = await db.prepare("SELECT * FROM access_cache WHERE bien_id=?").bind(bId).all();
    cached = cacheRes.results[0] || null;
  } catch (e) {
    return null;
  }
  if (cached && cached.address === address) return cached;
  if (budget && budget.remaining <= 0) return cached;
  if (budget) budget.remaining--;
  const fresh = await computeAccessibility(address, originStopName, env, db, bId);
  if (!fresh) return cached;
  try {
    await db.prepare(`INSERT INTO access_cache (bien_id, address, nearest_stop_name, last_mile_distance_m, last_mile_duration_min, last_mile_elevation_m, transit_duration_min, transit_transfers, accessibilite_score, computed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(bien_id) DO UPDATE SET address=excluded.address, nearest_stop_name=excluded.nearest_stop_name, last_mile_distance_m=excluded.last_mile_distance_m,
        last_mile_duration_min=excluded.last_mile_duration_min, last_mile_elevation_m=excluded.last_mile_elevation_m, transit_duration_min=excluded.transit_duration_min,
        transit_transfers=excluded.transit_transfers, accessibilite_score=excluded.accessibilite_score, computed_at=excluded.computed_at`).bind(
      bId, address, fresh.nearest_stop_name, fresh.last_mile_distance_m, fresh.last_mile_duration_min,
      fresh.last_mile_elevation_m, fresh.transit_duration_min, fresh.transit_transfers, fresh.accessibilite_score, todayISO()
    ).run();
  } catch (e) {
  }
  return Object.assign({ bien_id: bId, address }, fresh);
}

async function computeBienRecord(db, bId, listings, weights, regionPrices, opportunityThreshold, historyByBien, discardedByBien, originStopName, env, budget) {
  const sorted = [...listings].sort((a, b) => a.last_seen < b.last_seen ? -1 : 1);
  const latest = sorted[sorted.length - 1];
  const cheapestPrice = Math.min(...sorted.map((l) => l.price));
  const bestConf = sorted.reduce((acc, l) => CONF_ORDER[l.confidence] > CONF_ORDER[acc] ? l.confidence : acc, "\xC0 contr\xF4ler");
  const firstSeen = sorted.reduce((acc, l) => l.first_seen < acc ? l.first_seen : acc, sorted[0].first_seen);
  const titreLower = (sorted[sorted.length - 1].title || "").toLowerCase();
  const cachetParMotsCles = CACHET_KEYWORDS.filter((k) => titreLower.includes(k)).length >= 2;
  const cachet = sorted.some((l) => l.cachet) || cachetParMotsCles;
  const address = sorted.map((l) => l.address).find((a) => a) || null;
  const texteComplet = sorted.map((l) => (l.title || "") + " " + (l.description || "")).join(" ").toLowerCase();
  const residenceSecondaire = RESIDENCE_SECONDAIRE_KEYWORDS.some((k) => texteComplet.includes(k));
  const history = historyByBien.get(bId) || [];
  const disc = discardedByBien.get(bId);
  let discardedNow = false, rescue = null;
  if (disc) {
    if (cheapestPrice < disc.price_at_exclusion) {
      rescue = { bienId: bId, oldPrice: disc.price_at_exclusion, newPrice: cheapestPrice };
      await db.prepare("DELETE FROM discarded WHERE bien_id=?").bind(bId).run();
    } else {
      discardedNow = true;
    }
  }
  let priceDrop = null;
  if (history.length >= 2) {
    const prev = history[history.length - 2].price, cur = history[history.length - 1].price;
    if (cur < prev) priceDrop = { old: prev, current: cur, pct: Math.round((1 - cur / prev) * 1e3) / 10 };
  }
  const access = await getOrComputeAccess(db, bId, address, originStopName, env, budget);
  const scores = {
    deal: estimateDealScore(cheapestPrice, regionPrices[latest.region] || []),
    retraite: estimateRetraiteScore(latest.rooms, latest.surface, latest.region),
    locatif: estimateLocatifScore(latest.region, latest.rooms),
    cachet: estimateCachetScore(latest.title, cachet),
    risk: estimateRiskScore(bestConf, history.length),
    accessibilite: access && access.accessibilite_score != null ? access.accessibilite_score : 55
  };
  const fit = discardedNow ? 0 : jmFit(scores, weights);
  const explain = discardedNow ? "" : explainFit(scores, weights);
  return {
    record: {
      id: bId,
      title: latest.title,
      locality: latest.locality,
      region: latest.region,
      type: latest.type,
      rooms: latest.rooms,
      surface: latest.surface,
      price: cheapestPrice,
      cachet: cachet ? 1 : 0,
      confidence: bestConf,
      address,
      residence_secondaire: residenceSecondaire ? 1 : 0,
      first_seen: firstSeen,
      last_seen: latest.last_seen,
      deal_score: scores.deal,
      retraite_score: scores.retraite,
      locatif_score: scores.locatif,
      cachet_score: scores.cachet,
      risk_score: scores.risk,
      accessibilite_score: scores.accessibilite,
      nearest_stop_name: access ? access.nearest_stop_name : null,
      last_mile_distance_m: access ? access.last_mile_distance_m : null,
      last_mile_duration_min: access ? access.last_mile_duration_min : null,
      last_mile_elevation_m: access ? access.last_mile_elevation_m : null,
      transit_duration_min: access ? access.transit_duration_min : null,
      transit_transfers: access ? access.transit_transfers : null,
      jm_fit: fit,
      is_opportunity: discardedNow ? 0 : fit >= (opportunityThreshold || 70) ? 1 : 0,
      explain,
      price_drop_json: priceDrop ? JSON.stringify(priceDrop) : null
    },
    sources: sorted,
    rescue
  };
}

async function loadRecomputeCaches(db) {
  const sourcesRes = await db.prepare("SELECT id, name FROM sources").all();
  const sourceNamesMap = new Map(sourcesRes.results.map((s) => [s.id, s.name]));
  const discRes = await db.prepare("SELECT bien_id, price_at_exclusion FROM discarded").all();
  const discardedByBien = new Map(discRes.results.map((d) => [d.bien_id, d]));
  const histRes = await db.prepare("SELECT bien_id, date, price FROM price_history ORDER BY date ASC").all();
  const historyByBien = /* @__PURE__ */ new Map();
  for (const h of histRes.results) {
    if (!historyByBien.has(h.bien_id)) historyByBien.set(h.bien_id, []);
    historyByBien.get(h.bien_id).push({ date: h.date, price: h.price });
  }
  return { sourceNamesMap, discardedByBien, historyByBien };
}

async function writeBiensInBatches(db, allComputed, sourceNamesMap, skipPerBienSourceDelete) {
  const BATCH_SIZE = 3;
  for (let i = 0; i < allComputed.length; i += BATCH_SIZE) {
    const batch = allComputed.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
    const values = [];
    for (const c of batch) {
      const r = c.record;
      values.push(
        r.id,
        r.title,
        r.locality,
        r.region,
        r.type,
        r.rooms,
        r.surface,
        r.price,
        r.cachet,
        r.confidence,
        r.first_seen,
        r.last_seen,
        r.deal_score,
        r.retraite_score,
        r.locatif_score,
        r.cachet_score,
        r.risk_score,
        r.accessibilite_score,
        r.nearest_stop_name,
        r.last_mile_distance_m,
        r.last_mile_duration_min,
        r.last_mile_elevation_m,
        r.transit_duration_min,
        r.transit_transfers,
        r.jm_fit,
        r.is_opportunity,
        r.explain,
        r.price_drop_json,
        r.address,
        r.residence_secondaire
      );
    }
    if (values.length > 100) throw new Error("writeBiensInBatches : lot de " + values.length + " parametres depasse la limite D1 de 100 \u2014 reduire BATCH_SIZE");
    await db.prepare(`INSERT INTO biens (id,title,locality,region,type,rooms,surface,price,cachet,confidence,first_seen,last_seen,deal_score,retraite_score,locatif_score,cachet_score,risk_score,accessibilite_score,nearest_stop_name,last_mile_distance_m,last_mile_duration_min,last_mile_elevation_m,transit_duration_min,transit_transfers,jm_fit,is_opportunity,explain,price_drop_json,address,residence_secondaire)
      VALUES ${placeholders}
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, locality=excluded.locality, region=excluded.region, type=excluded.type,
        rooms=excluded.rooms, surface=excluded.surface, price=excluded.price, cachet=excluded.cachet, confidence=excluded.confidence,
        first_seen=excluded.first_seen, last_seen=excluded.last_seen, deal_score=excluded.deal_score, retraite_score=excluded.retraite_score,
        locatif_score=excluded.locatif_score, cachet_score=excluded.cachet_score, risk_score=excluded.risk_score,
        accessibilite_score=excluded.accessibilite_score, nearest_stop_name=excluded.nearest_stop_name,
        last_mile_distance_m=excluded.last_mile_distance_m, last_mile_duration_min=excluded.last_mile_duration_min,
        last_mile_elevation_m=excluded.last_mile_elevation_m, transit_duration_min=excluded.transit_duration_min,
        transit_transfers=excluded.transit_transfers, jm_fit=excluded.jm_fit,
        is_opportunity=excluded.is_opportunity, explain=excluded.explain, price_drop_json=excluded.price_drop_json, address=excluded.address,
        residence_secondaire=excluded.residence_secondaire`).bind(...values).run();
  }
  if (!skipPerBienSourceDelete) {
    for (const c of allComputed) {
      await db.prepare("DELETE FROM bien_sources WHERE bien_id=?").bind(c.record.id).run();
    }
  }
  const allSourceRows = [];
  for (const c of allComputed) {
    for (const l of c.sources) {
      const srcName = sourceNamesMap.get(l.source_id) || "?";
      allSourceRows.push([c.record.id, srcName, l.url]);
    }
  }
  const SRC_BATCH_SIZE = 30;
  for (let i = 0; i < allSourceRows.length; i += SRC_BATCH_SIZE) {
    const batch = allSourceRows.slice(i, i + SRC_BATCH_SIZE);
    const placeholders = batch.map(() => "(?,?,?)").join(",");
    const values = batch.flat();
    await db.prepare(`INSERT OR IGNORE INTO bien_sources (bien_id, source_name, url) VALUES ${placeholders}`).bind(...values).run();
  }
}

function isComparisOnly(listings, sourceNamesMap) {
  const names = new Set(listings.map((l) => sourceNamesMap.get(l.source_id) || "?"));
  return names.size === 1 && names.has("Comparis");
}
async function recomputeFull(db, env, budgetSize) {
  const prefsRes = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const weights = JSON.parse(prefsRes.results[0].weights_json);
  const opportunityThreshold = prefsRes.results[0].opportunity_threshold || 70;
  const originStopName = prefsRes.results[0].origine_trajet || "Fribourg";
  const activeRes = await db.prepare("SELECT * FROM listings WHERE status='active'").all();
  const groups = {};
  for (const l of activeRes.results) {
    if (!l.bien_id) continue;
    (groups[l.bien_id] = groups[l.bien_id] || []).push(l);
  }
  const regionPrices = {};
  for (const bId in groups) {
    const latest = groups[bId][groups[bId].length - 1];
    (regionPrices[latest.region] = regionPrices[latest.region] || []).push(latest.price);
  }
  const { sourceNamesMap, discardedByBien, historyByBien } = await loadRecomputeCaches(db);
  const oldBiensRes = await db.prepare("SELECT id, title, locality, region, type, rooms, surface, price FROM biens").all();
  const oldBiens = oldBiensRes.results;
  await db.prepare("DELETE FROM biens").run();
  await db.prepare("DELETE FROM bien_sources").run();
  const allComputed = [];
  const rescuesThisRun = [];
  const accessBudget = { remaining: budgetSize || 6 };
  for (const bId in groups) {
    if (isComparisOnly(groups[bId], sourceNamesMap)) continue;
    const computed = await computeBienRecord(db, bId, groups[bId], weights, regionPrices, opportunityThreshold, historyByBien, discardedByBien, originStopName, env, accessBudget);
    allComputed.push(computed);
    if (computed.rescue) rescuesThisRun.push(computed.rescue);
  }
  if (allComputed.length > 0) await writeBiensInBatches(db, allComputed, sourceNamesMap, true);
  for (const r of rescuesThisRun) {
    await db.prepare("INSERT INTO rescues (bien_id, old_price, new_price, date) VALUES (?,?,?,?)").bind(r.bienId, r.oldPrice, r.newPrice, (/* @__PURE__ */ new Date()).toISOString()).run();
  }
  for (const old of oldBiens) {
    if (!groups[old.id]) {
      try {
        await db.prepare("INSERT INTO vendus (bien_id, title, locality, region, type, rooms, surface, last_price, date_vendu) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(bien_id) DO NOTHING").bind(old.id, old.title, old.locality, old.region, old.type, old.rooms, old.surface, old.price, (/* @__PURE__ */ new Date()).toISOString()).run();
      } catch (e) {
      }
    }
  }
  for (const bId in groups) {
    try {
      await db.prepare("DELETE FROM vendus WHERE bien_id=?").bind(bId).run();
    } catch (e) {
    }
  }
  return { biens: allComputed.length, rescues: rescuesThisRun.length };
}

async function recomputeTargeted(db, bienIds, env) {
  if (!bienIds || bienIds.length === 0) return { biens: 0, rescues: 0 };
  const prefsRes = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const weights = JSON.parse(prefsRes.results[0].weights_json);
  const opportunityThreshold = prefsRes.results[0].opportunity_threshold || 70;
  const originStopName = prefsRes.results[0].origine_trajet || "Fribourg";
  const activeRes = await db.prepare("SELECT * FROM listings WHERE status='active'").all();
  const groups = {};
  for (const l of activeRes.results) {
    if (!l.bien_id) continue;
    (groups[l.bien_id] = groups[l.bien_id] || []).push(l);
  }
  const regionPrices = {};
  for (const bId in groups) {
    const latest = groups[bId][groups[bId].length - 1];
    (regionPrices[latest.region] = regionPrices[latest.region] || []).push(latest.price);
  }
  const { sourceNamesMap, discardedByBien, historyByBien } = await loadRecomputeCaches(db);
  const allComputed = [];
  const rescuesThisRun = [];
  const accessBudget = { remaining: 6 };
  for (const bId of new Set(bienIds)) {
    if (!groups[bId] || isComparisOnly(groups[bId], sourceNamesMap)) {
      await db.prepare("DELETE FROM biens WHERE id=?").bind(bId).run();
      await db.prepare("DELETE FROM bien_sources WHERE bien_id=?").bind(bId).run();
      continue;
    }
    const computed = await computeBienRecord(db, bId, groups[bId], weights, regionPrices, opportunityThreshold, historyByBien, discardedByBien, originStopName, env, accessBudget);
    allComputed.push(computed);
    if (computed.rescue) rescuesThisRun.push(computed.rescue);
  }
  if (allComputed.length > 0) await writeBiensInBatches(db, allComputed, sourceNamesMap);
  for (const r of rescuesThisRun) {
    await db.prepare("INSERT INTO rescues (bien_id, old_price, new_price, date) VALUES (?,?,?,?)").bind(r.bienId, r.oldPrice, r.newPrice, (/* @__PURE__ */ new Date()).toISOString()).run();
  }
  return { biens: allComputed.length, rescues: rescuesThisRun.length };
}

async function fullRefresh(db, fetchFn, env) {
  const report = await ingest(db, fetchFn);
  const stats = await recomputeFull(db, env);
  return Object.assign({ ingestion: report }, stats);
}

async function getPreferences(db) {
  const res = await db.prepare("SELECT * FROM preferences WHERE id=1").all();
  const row = res.results[0];
  return {
    budgetMax: row.budget_max,
    typesAllowed: JSON.parse(row.types_allowed),
    regionsAllowed: JSON.parse(row.regions_allowed),
    surfaceMin: row.surface_min,
    roomsMin: row.rooms_min,
    cachetRequired: !!row.cachet_required,
    weights: JSON.parse(row.weights_json),
    originStop: row.origine_trajet || "Fribourg"
  };
}

async function search(db, opts) {
  opts = opts || {};
  const prefs = await getPreferences(db);
  const budgetMax = opts.budgetMax !== void 0 ? opts.budgetMax : prefs.budgetMax;
  const roomsMin = opts.roomsMin !== void 0 ? opts.roomsMin : prefs.roomsMin;
  const surfaceMin = opts.surfaceMin !== void 0 ? opts.surfaceMin : prefs.surfaceMin;
  const cachet = opts.cachet !== void 0 ? opts.cachet : prefs.cachetRequired;
  const regions = opts.region ? [opts.region] : prefs.regionsAllowed.length ? prefs.regionsAllowed : null;
  const discRes = await db.prepare("SELECT bien_id FROM discarded").all();
  const discardedIds = new Set(discRes.results.map((r) => r.bien_id));
  const favRes = await db.prepare("SELECT bien_id FROM favoris").all();
  const favoriteIds = new Set(favRes.results.map((r) => r.bien_id));
  const vusRes = await db.prepare("SELECT bien_id FROM vus").all();
  const vusIds = new Set(vusRes.results.map((r) => r.bien_id));
  const allRes = await db.prepare("SELECT * FROM biens").all();
  let rows = allRes.results.filter((b) => !discardedIds.has(b.id));
  if (opts.q) {
    const q = opts.q.toLowerCase();
    rows = rows.filter((b) => (b.title || "").toLowerCase().includes(q) || (b.locality || "").toLowerCase().includes(q) || (b.type || "").toLowerCase().includes(q));
  }
  rows = rows.filter((b) => b.price <= budgetMax);
  rows = rows.filter((b) => (b.surface || 0) >= surfaceMin);
  rows = rows.filter((b) => (b.rooms || 0) >= roomsMin);
  if (cachet) rows = rows.filter((b) => b.cachet);
  if (opts.type) rows = rows.filter((b) => b.type === opts.type);
  if (regions) rows = rows.filter((b) => regions.includes(b.region));
  if (opts.favorisOnly) rows = rows.filter((b) => favoriteIds.has(b.id));
  if (opts.opportunitiesOnly) rows = rows.filter((b) => b.is_opportunity);
  const sortFns = {
    jmfit: (a, b) => b.jm_fit - a.jm_fit,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    recent: (a, b) => (b.first_seen || "").localeCompare(a.first_seen || "")
  };
  rows.sort(sortFns[opts.sort || "jmfit"]);
  const out = [];
  for (const r of rows.slice(0, opts.limit || 1e3)) {
    const srcRes = await db.prepare("SELECT source_name, url FROM bien_sources WHERE bien_id=?").bind(r.id).all();
    out.push(Object.assign({}, r, {
      is_favori: favoriteIds.has(r.id),
      is_new: !vusIds.has(r.id),
      sources: srcRes.results,
      price_drop: r.price_drop_json ? JSON.parse(r.price_drop_json) : null
    }));
  }
  return out;
}
function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
var FRONTEND_HTML = `<!DOCTYPE html>
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
.access-row{font-size:12px;color:var(--muted);margin-top:8px;padding:8px 10px;background:var(--panel2);border-radius:8px;}
.access-row.warn{color:var(--clay);}
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
  <button id="btnComputeAccess" style="margin:0 0 8px 0;padding:8px 12px;border-radius:8px;border:1px solid #262E3A;background:#1D2430;color:#E7EAEE;font-size:12.5px;cursor:pointer">Calculer accessibilite (dernier km)</button>
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
  {id:"baisses", label:"Baisses"}, {id:"ecartes", label:"Ecartes"}, {id:"vendus", label:"Vendus"}, {id:"sources", label:"Sources"},
  {id:"preferences", label:"Preferences"},
];
let activeTab = "tous";
const REGIONS = ["Tessin","Jura - Franches-Montagnes","Jura - Clos du Doubs","Zweisimmen","Gruyere","Neuchatel"];
const TYPES = ["Appartement","Maison","Chalet","Rustico","Villa","Maison historique","PPE"];

document.getElementById("fRegion").innerHTML += REGIONS.map(function(r){return "<option value='" + r + "'>" + r + "</option>";}).join("");
document.getElementById("fType").innerHTML += TYPES.map(function(t){return "<option value='" + t + "'>" + t + "</option>";}).join("");
document.getElementById("tabs").innerHTML = TABS.map(function(t){return "<div class='tab " + (t.id===activeTab?"active":"") + "' data-tab='" + t.id + "'>" + t.label + "</div>";}).join("");

function fmtCHF(n){ return "CHF " + Math.round(n).toLocaleString("fr-CH"); }
async function api(path, opts){ const res = await fetch(path, opts); return res.json(); }

function accessLine(b){
  if (!b.nearest_stop_name || b.last_mile_duration_min == null) {
    return "<div class='access-row'>Dernier km non calcule (adresse manquante ou cle ORS absente)</div>";
  }
  const pente = (b.last_mile_elevation_m && b.last_mile_distance_m) ? Math.round((b.last_mile_elevation_m / b.last_mile_distance_m) * 100) : null;
  const warn = (pente != null && pente >= 15) || b.last_mile_duration_min > 12;
  let txt = "A pied : " + b.last_mile_duration_min + " min depuis " + b.nearest_stop_name +
    " (" + b.last_mile_distance_m + "m, deniv. " + (b.last_mile_elevation_m||0) + "m" + (pente!=null?(", pente ~"+pente+"%"):"") + ")";
  if (b.transit_duration_min != null) {
    const hh = Math.floor(b.transit_duration_min/60), mm = b.transit_duration_min%60;
    txt += " - trajet " + hh + "h" + (mm<10?"0":"") + mm + (b.transit_transfers!=null?(" (" + b.transit_transfers + " chgt)"):"");
  }
  return "<div class='access-row" + (warn?" warn":"") + "'>" + txt + "</div>";
}

function bienCard(b){
  const tags = ["<span class='tag'>" + (b.type||"") + "</span>", "<span class='tag'>" + (b.region||"") + "</span>", "<span class='tag'>" + (b.confidence||"") + "</span>"];
  if (b.cachet) tags.push("<span class='tag'>cachet</span>");
  if (b.is_opportunity) tags.push("<span class='tag opp'>Opportunite</span>");
  if (b.price_drop) tags.push("<span class='tag drop'>-" + b.price_drop.pct + "%</span>");
  const sources = (b.sources||[]).map(function(s){return "<a href='" + s.url + "' target='_blank' rel='noopener'>" + s.source_name + "</a>";}).join(" - ");
  const primaryUrl = (b.sources && b.sources[0]) ? b.sources[0].url : null;
  const star = b.is_new ? " <span title='Nouveaute jamais consultee' style='color:var(--gold)'>\u2605</span>" : "";
  const titleHtml = primaryUrl
    ? "<a href='" + primaryUrl + "' target='_blank' rel='noopener' data-action='markview' data-id='" + b.id + "' style='color:inherit;text-decoration:none'>" + b.title + "</a>" + star
    : b.title + star;
  const mapQuery = encodeURIComponent(b.address || ((b.locality||"") + " " + (b.region||"")));
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + mapQuery;
  const explain = b.explain ? ("<div class='explain'>JM Fit " + b.jm_fit + "/100 - " + b.explain + "</div>") : "";
  return "<div class='card'><div class='card-top'><div><div class='title'>" + titleHtml + "</div><div class='locality'>" + b.locality + " - " + b.region + " - <a href='" + mapUrl + "' target='_blank' rel='noopener'>Carte</a></div></div>" +
    "<div class='fit-badge " + (b.is_opportunity?"hot":"") + "'>" + (b.jm_fit != null ? b.jm_fit : "") + "</div></div>" +
    "<div class='price' style='margin-top:8px'>" + fmtCHF(b.price) + "</div>" +
    "<div class='meta-row'><span>" + (b.rooms||"?") + " pieces</span><span>" + (b.surface||"?") + " m2</span></div>" +
    "<div class='tags'>" + tags.join("") + "</div>" + explain + accessLine(b) +
    "<div class='sources-line'>" + (b.sources||[]).length + " source(s) : " + sources + "</div>" +
    "<div class='actions'><button class='btn discard' data-action='discard' data-id='" + b.id + "'>Ecarter</button>" +
    "<button class='btn fav " + (b.is_favori?"on":"") + "' data-action='togglefav' data-id='" + b.id + "' data-fav='" + (!!b.is_favori) + "'>" + (b.is_favori?"Favori (retirer)":"Favori (ajouter)") + "</button></div></div>";
}
function ecarteCard(d){
  return "<div class='card'><div class='card-top'><div><div class='title'>" + d.title_at_exclusion + "</div><div class='locality'>" + (d.locality||"") + " - " + (d.region||"") + "</div></div></div>" +
    "<div class='price' style='margin-top:8px'>" + fmtCHF(d.price_at_exclusion) + " <span style='font-size:11px;color:var(--muted)'>(prix a l'exclusion)</span></div>" +
    "<div class='actions'><button class='btn restore' data-action='restore' data-id='" + d.bien_id + "'>Restaurer</button></div></div>";
}
function venduCard(d){
  return "<div class='card'><div class='card-top'><div><div class='title'>" + (d.title||"") + "</div><div class='locality'>" + (d.locality||"") + " - " + (d.region||"") + "</div></div></div>" +
    "<div class='price' style='margin-top:8px'>" + fmtCHF(d.last_price) + " <span style='font-size:11px;color:var(--muted)'>(dernier prix connu)</span></div>" +
    "<div class='meta-row'><span>" + (d.rooms||"?") + " pieces</span><span>" + (d.surface||"?") + " m2</span></div>" +
    "<div class='sources-line'>Disparu de toutes les sources le " + (d.date_vendu||"").slice(0,10) + "</div></div>";
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
  const labels = {deal:"Qualite de l'affaire",retraite:"Interet retraite",locatif:"Potentiel locatif",cachet:"Cachet",risk:"Faible risque",accessibilite:"Accessibilite (dernier km)"};
  let slidersHtml = "";
  ["deal","retraite","locatif","cachet","risk","accessibilite"].forEach(function(k){
    const v = weights[k] != null ? weights[k] : 0;
    slidersHtml += "<div class='pref-block'><label>" + labels[k] + " - <span class='mono'>" + v + "/5</span></label>" +
      "<div class='slider-row'><input type='range' min='0' max='5' value='" + v + "' data-weight-key='" + k + "'></div></div>";
  });
  const regionChips = REGIONS.map(function(r){return "<span class='chip " + (regionsAllowed.includes(r)?"on":"") + "' data-action='toggleregion' data-region='" + r + "'>" + r + "</span>";}).join("");
  const html = "<div class='card'>" +
    "<div class='pref-block'><label>Cachet indispensable</label><div class='chip-row'><span class='chip " + (p.cachet_required?"on":"") + "' data-action='togglecachet'>" + (p.cachet_required?"Active":"Desactive") + "</span></div></div>" +
    "<div class='pref-block'><label>Gare / ville de depart pour le calcul du trajet</label><div class='chip-row'><input id='originStopInput' value='" + (p.origine_trajet||"Fribourg") + "' style='padding:6px 10px;border-radius:8px;border:1px solid #262E3A;background:#1D2430;color:#E7EAEE;font-size:12.5px;width:100%'></div></div>" +
    "<div class='pref-block'><label>Regions autorisees</label><div class='chip-row'>" + regionChips + "</div></div>" +
    slidersHtml + "</div>";
  document.getElementById("main").innerHTML = html;
  window._prefsCache = p;
  const originInput = document.getElementById("originStopInput");
  if (originInput) originInput.addEventListener("change", function(){ updateOriginStop(originInput.value); });
  document.querySelectorAll("input[data-weight-key]").forEach(function(el){
    el.addEventListener("input", function(){ updateWeight(el.dataset.weightKey, el.value); });
  });
}
async function togglePrefCachet(){
  const p = window._prefsCache;
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:JSON.parse(p.regions_allowed),
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required: !p.cachet_required, weights: JSON.parse(p.weights_json), origine_trajet:p.origine_trajet})});
  loadPrefs();
}
async function togglePrefRegion(r){
  const p = window._prefsCache;
  let regions = JSON.parse(p.regions_allowed);
  regions = regions.includes(r) ? regions.filter(function(x){return x!==r;}) : regions.concat([r]);
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:regions,
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required:!!p.cachet_required, weights: JSON.parse(p.weights_json), origine_trajet:p.origine_trajet})});
  loadPrefs();
}
async function updateWeight(k, v){
  const p = window._prefsCache;
  const weights = JSON.parse(p.weights_json); weights[k] = parseInt(v);
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:JSON.parse(p.regions_allowed),
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required:!!p.cachet_required, weights:weights, origine_trajet:p.origine_trajet})});
  window._prefsCache.weights_json = JSON.stringify(weights);
}
async function updateOriginStop(v){
  const p = window._prefsCache;
  await api("/api/preferences", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    budget_max:p.budget_max, types_allowed:JSON.parse(p.types_allowed), regions_allowed:JSON.parse(p.regions_allowed),
    surface_min:p.surface_min, rooms_min:p.rooms_min, cachet_required:!!p.cachet_required, weights: JSON.parse(p.weights_json), origine_trajet:v})});
  window._prefsCache.origine_trajet = v;
}

async function load(){
  const main = document.getElementById("main");
  main.innerHTML = "<div class='status'>Chargement...</div>";

  if (activeTab === "preferences"){ return loadPrefs(); }
  if (activeTab === "sources"){
    const r = await api("/api/sources");
    main.innerHTML = "<div class='card'><table class='sources-table'><thead><tr><th>Source</th><th>Etat</th><th>Annonces</th></tr></thead><tbody>" +
      r.results.map(function(s){return "<tr><td><span class='dot " + s.state + "'></span>" + s.name + "</td><td>" + s.state + "</td><td class='mono'>" + (s.last_productive_count||0) + "</td></tr>";}).join("") +
      "</tbody></table></div>";
    return;
  }
  if (activeTab === "ecartes"){
    const r = await api("/api/ecartes");
    main.innerHTML = r.results.length ? r.results.map(ecarteCard).join("") : "<div class='empty'>Aucun bien ecarte.</div>";
    return;
  }
  if (activeTab === "vendus"){
    const r = await api("/api/vendus");
    main.innerHTML = r.results.length ? r.results.map(venduCard).join("") : "<div class='empty'>Aucun bien marque vendu pour l'instant.</div>";
    return;
  }
  if (activeTab === "baisses"){
    const r = await api("/api/baisses");
    main.innerHTML = r.results.length ? r.results.map(bienCard).join("") : "<div class='empty'>Aucune baisse detectee.</div>";
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
  main.innerHTML = r.results.length ? r.results.map(bienCard).join("") : "<div class='empty'>Aucun resultat pour ces criteres.</div>";
}

document.getElementById("main").addEventListener("click", function(e){
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  if (action === "discard") discard(id);
  else if (action === "togglefav") toggleFav(id, el.dataset.fav === "true");
  else if (action === "restore") restore(id);
  else if (action === "togglecachet") togglePrefCachet();
  else if (action === "toggleregion") togglePrefRegion(el.dataset.region);
  else if (action === "markview") { fetch("/api/marquer-vu", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bien_id:id})}).catch(function(){}); }
});
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
document.getElementById("btnComputeAccess").onclick = async function(){
  const btn = document.getElementById("btnComputeAccess");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Calcul en cours...";
  try {
    await fetch("/api/compute-access");
  } catch(e) { }
  btn.disabled = false;
  btn.innerHTML = original;
  load();
};
["fRegion","fType","fBudget","fSort"].forEach(function(id){document.getElementById(id).onchange = load;});
document.getElementById("q").addEventListener("keydown", function(e){ if(e.key==="Enter") load(); });
load();
<\/script>
</body></html>`;
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const db = env.DB;
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
      }
      if (url.pathname === "/api/health") return json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
      if (url.pathname === "/api/refresh" && (request.method === "POST" || request.method === "GET")) {
        const report = await fullRefresh(db, fetch.bind(globalThis), env);
        return json(report);
      }
      if (url.pathname === "/api/compute-access" && (request.method === "POST" || request.method === "GET")) {
        const stats = await recomputeFull(db, env, 10);
        return json(stats);
      }
      if (url.pathname === "/api/ingest-raw" && request.method === "POST") {
        const body = await request.json();
        const srcRes = await db.prepare("SELECT * FROM sources WHERE name=?").bind(body.source_name).all();
        const srcRow = srcRes.results[0];
        if (!srcRow) return json({ error: "source inconnue : " + body.source_name }, 404);
        let config = {};
        try {
          config = JSON.parse(srcRow.config_json || "{}");
        } catch (e) {
        }
        const extra = await loadExtraLocalities(db);
        const html = decodeEntitiesGeneric(body.html || "");
        try {
          await db.prepare("INSERT INTO debug_captures (source_name, url, html, captured_at) VALUES (?,?,?,?) ON CONFLICT(source_name) DO UPDATE SET url=excluded.url, html=excluded.html, captured_at=excluded.captured_at").bind(body.source_name, body.url || "", html.slice(0, 3e5), (/* @__PURE__ */ new Date()).toISOString()).run();
        } catch (e) {
        }
        let records = [];
        if (config.mode === "two_step" && body.is_list) {
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
        const dirtyBienIds = /* @__PURE__ */ new Set();
        for (const rec of records) {
          try {
            const rl = {
              external_id: (rec.url || body.url || rec.locality + rec.price).split("/").filter(Boolean).pop(),
              url: rec.url || body.url,
              title: (rec.type || "Bien") + " \u2014 " + rec.locality,
              locality: rec.locality,
              type: rec.type || "Appartement",
              rooms: rec.rooms,
              surface: rec.surface,
              price: rec.price,
              address: rec.address || null,
              confidence: config.confidence || "Probable"
            };
            const ok = await storeListing(db, srcRow, rl, extra);
            if (ok) {
              stored++;
              dirtyBienIds.add(bienKey(rl.locality, rl.type, rl.rooms, rl.surface));
            }
          } catch (e) {
            hitLimit = true;
            break;
          }
        }
        const newState = stored > 0 ? "productive" : "accessible";
        try {
          await db.prepare("UPDATE sources SET state=?, last_checked=?, last_error=NULL, last_productive_count=last_productive_count+? WHERE id=?").bind(newState, (/* @__PURE__ */ new Date()).toISOString(), stored, srcRow.id).run();
        } catch (e) {
        }
        if (dirtyBienIds.size > 0) {
          try {
            await recomputeTargeted(db, [...dirtyBienIds], env);
          } catch (e) {
          }
        }
        return json({ ok: true, stored, hitLimit, remaining: hitLimit ? records.length - stored : 0, source: srcRow.name });
      }
      if (url.pathname === "/api/search") {
        const q = url.searchParams;
        const results = await search(db, {
          q: q.get("q"),
          region: q.get("region"),
          type: q.get("type"),
          budgetMax: q.has("budget_max") ? parseFloat(q.get("budget_max")) : void 0,
          roomsMin: q.has("rooms_min") ? parseFloat(q.get("rooms_min")) : void 0,
          surfaceMin: q.has("surface_min") ? parseFloat(q.get("surface_min")) : void 0,
          cachet: q.has("cachet") ? q.get("cachet") === "1" : void 0,
          sort: q.get("sort") || "jmfit",
          favorisOnly: q.get("favoris") === "1",
          opportunitiesOnly: q.get("opportunites") === "1"
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
      if (url.pathname === "/api/vendus") {
        const res = await db.prepare("SELECT * FROM vendus ORDER BY date_vendu DESC").all();
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
        const beforeRes = await db.prepare("SELECT weights_json, opportunity_threshold, origine_trajet FROM preferences WHERE id=1").all();
        const before = beforeRes.results[0];
        const newWeightsJson = JSON.stringify(body.weights || { deal: 4, retraite: 2, locatif: 2, cachet: 3, risk: 3, accessibilite: 3 });
        const newThreshold = body.opportunity_threshold || 70;
        const newOriginStop = body.origine_trajet || "Fribourg";
        const needsRecompute = before.weights_json !== newWeightsJson || before.opportunity_threshold !== newThreshold || before.origine_trajet !== newOriginStop;
        await db.prepare("UPDATE preferences SET budget_max=?, types_allowed=?, regions_allowed=?, surface_min=?, rooms_min=?, cachet_required=?, weights_json=?, origine_trajet=?, opportunity_threshold=? WHERE id=1").bind(
          body.budget_max || 5e5,
          JSON.stringify(body.types_allowed || []),
          JSON.stringify(body.regions_allowed || []),
          body.surface_min || 0,
          body.rooms_min || 0,
          body.cachet_required ? 1 : 0,
          newWeightsJson,
          newOriginStop,
          newThreshold
        ).run();
        if (needsRecompute) await recomputeFull(db, env);
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
        await db.prepare("INSERT INTO discarded (bien_id, price_at_exclusion, date_exclusion, title_at_exclusion, locality, region, type, rooms, surface) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(bien_id) DO NOTHING").bind(body.bien_id, b.price, (/* @__PURE__ */ new Date()).toISOString(), b.title, b.locality, b.region, b.type, b.rooms, b.surface).run();
        await db.prepare("DELETE FROM favoris WHERE bien_id=?").bind(body.bien_id).run();
        await recomputeTargeted(db, [body.bien_id], env);
        return json({ ok: true });
      }
      if (url.pathname === "/api/restore" && request.method === "POST") {
        const body = await request.json();
        await db.prepare("DELETE FROM discarded WHERE bien_id=?").bind(body.bien_id).run();
        await recomputeTargeted(db, [body.bien_id], env);
        return json({ ok: true });
      }
      if (url.pathname === "/api/marquer-vu" && request.method === "POST") {
        const body = await request.json();
        if (!body.bien_id) return json({ error: "bien_id manquant" }, 400);
        await db.prepare("INSERT INTO vus (bien_id, date_vu) VALUES (?,?) ON CONFLICT(bien_id) DO NOTHING").bind(body.bien_id, (/* @__PURE__ */ new Date()).toISOString()).run();
        return json({ ok: true });
      }
      if (url.pathname === "/api/favori" && request.method === "POST") {
        const body = await request.json();
        const discRes = await db.prepare("SELECT 1 FROM discarded WHERE bien_id=?").bind(body.bien_id).all();
        if (discRes.results.length) return json({ error: "bien \xE9cart\xE9" }, 400);
        await db.prepare("INSERT OR IGNORE INTO favoris (bien_id, date_added) VALUES (?,?)").bind(body.bien_id, (/* @__PURE__ */ new Date()).toISOString()).run();
        return json({ ok: true });
      }
      if (url.pathname.indexOf("/api/favori/") === 0 && request.method === "DELETE") {
        const id = url.pathname.slice("/api/favori/".length);
        await db.prepare("DELETE FROM favoris WHERE bien_id=?").bind(id).run();
        return json({ ok: true });
      }
      if (url.pathname === "/api/report-check" && request.method === "POST") {
        const body = await request.json();
        const srcRes = await db.prepare("SELECT * FROM sources WHERE name=?").bind(body.source_name).all();
        const srcRow = srcRes.results[0];
        if (!srcRow) return json({ error: "source inconnue : " + body.source_name }, 404);
        await db.prepare("UPDATE sources SET last_checked=?, last_error=? WHERE id=?").bind((/* @__PURE__ */ new Date()).toISOString(), body.error || null, srcRow.id).run();
        return json({ ok: true });
      }
      if (url.pathname === "/") {
        let html = FRONTEND_HTML;
        try {
          const row = await db.prepare("SELECT value FROM app_config WHERE key='frontend_html'").all();
          if (row.results.length && row.results[0].value) html = row.results[0].value;
        } catch (e) {
        }
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      return json({ error: "route inconnue" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await cleanupStaleListings(env.DB, 21);
      await recomputeFull(env.DB, env);
    })());
  }
};
export {
  index_default as default
};
