// Collecteur externe : GitHub telecharge les pages (aucune limite de
// sous-requetes), le worker extrait et stocke.
const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
             "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.8,it;q=0.7" };
const MAX_SOURCES = parseInt(process.env.MAX_SOURCES || "999", 10);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Navigateur mutualise, demarre seulement si une source en a besoin
let navigateur = null;
async function obtenirNavigateur() {
  if (navigateur) return navigateur;
  const puppeteer = require("puppeteer");
  navigateur = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  console.log("navigateur demarre");
  return navigateur;
}
async function telechargerRendu(url, attente) {
  const nav = await obtenirNavigateur();
  const page = await nav.newPage();
  try {
    await page.setUserAgent(UA["User-Agent"]);
    await page.setViewport({ width: 1280, height: 900 });
    const rep = await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    if (attente) { try { await page.waitForSelector(attente, { timeout: 12000 }); } catch (e) {} }
    await pause(1200);
    const html = await page.content();
    return { status: rep ? rep.status() : 0, html };
  } finally { await page.close(); }
}

async function telecharger(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow", signal: ctrl.signal });
    const html = await r.text();
    return { status: r.status, html };
  } finally { clearTimeout(t); }
}

async function versWorker(charge) {
  const r = await fetch(BASE + "/api/ingest-raw", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(charge)
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { return { error: t.slice(0, 120) }; }
}


// --- Sources paginees avec tri par prix (Comparis) -----------------------------
function lireComparis(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const d = JSON.parse(m[1]).props.pageProps.initialResultData;
    return { liste: d.resultItems || [], totalPages: d.totalPages || 1 };
  } catch (e) { return null; }
}
function nettoyer(txt, max) {
  return String(txt || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/[<>&]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function coquilleComparis(liste) {
  // On n'envoie au worker que l'utile, sans entites ni balises : le HTML complet pese 400 Ko.
  const items = liste.map((it) => ({
    AdId: it.AdId, Title: nettoyer(it.Title, 200), PropertyTypeText: it.PropertyTypeText,
    Address: (it.Address || []).map((a) => nettoyer(a, 120)), EssentialInformation: (it.EssentialInformation || []).map((a) => nettoyer(a, 40)),
    Price: String(it.Price || "").replace(/[^0-9]/g, ""), Date: it.Date, ImageUrl: it.ImageUrl, Remarks: nettoyer(it.Remarks, 1200)
  }));
  return '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { initialResultData: { resultItems: items } } } }) + "</script>";
}

// Signature de navigateur complete et en-tetes usuels pour les sources paginees
const ENTETES_COMPLETS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.8,it;q=0.7"
};
async function telechargerComplet(url) {
  const ctrl = new AbortController();
  const tmo = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: ENTETES_COMPLETS, redirect: "follow", signal: ctrl.signal });
    const html = await r.text();
    return { status: r.status, html, server: r.headers.get("server") };
  } finally { clearTimeout(tmo); }
}
async function collecterPaginee(src) {
  const pg = src.pagination;
  let stocke = 0, pages = 0, erreur = null;
  for (const base of src.pages) {
    for (let p = 0; p < (pg.max_pages || 100); p++) {
      const url = p === 0 ? base : base + (base.includes("?") ? "&" : "?") + (pg.param || "page") + "=" + p;
      let rep;
      try { rep = await telechargerComplet(url); } catch (e) { erreur = "reseau : " + String(e.message).slice(0, 80); break; }
      pages++;
      if (rep.status !== 200) {
        erreur = "HTTP " + rep.status + " (" + (rep.server || "-") + ") " + String(rep.html || "").replace(/\s+/g, " ").slice(0, 90);
        console.log("   refus " + url + " -> " + erreur);
        break;
      }
      const lu = lireComparis(rep.html);
      if (!lu) { erreur = "JSON de page absent"; break; }
      if (!lu.liste.length) break;
      const res = await versWorker({ source_name: src.name, url, html: coquilleComparis(lu.liste), defer: true });
      stocke += res.stored || 0;
      const prix = lu.liste.map((it) => parseInt(String(it.Price || "").replace(/[^0-9]/g, ""), 10)).filter((n) => n > 0);
      // tri croissant : quand le plus bas prix de la page depasse le plafond, la suite aussi
      if (prix.length && Math.min.apply(null, prix) > (pg.stop_above_price || 6e5)) break;
      if (p >= lu.totalPages - 1) break;
      await pause(pg.pause_ms || 900);
    }
  }
  return { stocke, pages, erreur };
}


// --- RealAdvisor : flux Next.js (RSC), une page de commune = jusqu'a 24 annonces -----------------
function fluxRsc(html) {
  let o = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { o += JSON.parse(m[1]); } catch (e) {} }
  return o;
}
function objetApres(s, idx) {
  const i = s.indexOf("{", idx); let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return s.slice(i, j + 1); }
  }
  return null;
}
function textesRsc(f) {
  // lignes "72:T80c,<texte>" : la longueur (hexadecimale) est en octets UTF-8
  const map = {}; const re = /([0-9a-f]{1,4}):T([0-9a-f]+),/g; let m;
  while ((m = re.exec(f)) !== null) {
    const L = parseInt(m[2], 16); const debut = m.index + m[0].length;
    const txt = Buffer.from(f.slice(debut, debut + L), "utf8").subarray(0, L).toString("utf8");
    map["$" + m[1]] = txt; re.lastIndex = debut + txt.length;
  }
  return map;
}
function annoncesRsc(f) {
  const vus = new Set(), out = [];
  for (const m of f.matchAll(/"listing":\{/g)) {
    const o = objetApres(f, m.index); if (!o) continue;
    try { const l = JSON.parse(o); if (l && l.id && !vus.has(l.id)) { vus.add(l.id); out.push(l); } } catch (e) {}
  }
  return out;
}
function imageRsc(l) {
  // meme adressage que le site : source GCS encodee en base64 (URL-safe) dans une URL imgproxy
  const im = l.images && l.images[0]; if (!im || !im.file_name) return null;
  const src = "https://storage.googleapis.com/" + (im.bucket_name || "aggregator-images") + "/" + im.file_name;
  return "https://img.realadvisor.ch/_/rs:fill:600:0:1:0/q:60/" + Buffer.from(src, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_") + ".webp";
}
function lienDetail(html) {
  return [...new Set([...html.matchAll(/href="(\/fr\/acheter\/(?:maison|appartement|terrain|immeuble|commercial|hotellerie)\/[^"#?]+)"/g)].map((m) => m[1]))];
}
function typeHref(l) {
  if (/multiple_dwelling/.test(l.property_type || "")) return "immeuble";
  return { APPT: "appartement", HOUSE: "maison", PROP: "terrain" }[l.property_main_type] || "?";
}
function coquilleRa(liste, html, flux, chemin, base, photos) {
  const textes = textesRsc(flux); const details = lienDetail(html); const pris = new Set();
  let nImg = 0, nDetail = 0;
  const items = liste.filter((l) => l.property_main_type === "APPT" || l.property_main_type === "HOUSE").map((l) => {
    const pc = String(l.postcode || "");
    const cands = details.filter((x) => !pris.has(x) && (x.includes("/" + pc + "-") || x.includes("-" + pc + "-")));
    const choix = cands.find((x) => x.startsWith("/fr/acheter/" + typeHref(l) + "/")) || cands[0] || null;
    if (choix) { pris.add(choix); nDetail++; }
    const desc = String(textes[l.description] || (typeof l.description === "string" && l.description[0] !== "$" ? l.description : "") || "");
    const img = photos ? imageRsc(l) : null; if (img) nImg++;
    const titre = (l.translated_titles && l.translated_titles.fr) || l.title || "";
    return {
      id: l.id, main: l.property_main_type, pt: l.property_type, sale_price: l.sale_price, rooms: l.number_of_rooms, living: l.living_surface,
      route: nettoyer(l.route, 120), street_number: nettoyer(l.street_number, 12), postcode: l.postcode, sub_locality: nettoyer(l.sub_locality, 80), locality: nettoyer(l.locality, 80),
      lat: l.lat, lng: l.lng, title: nettoyer(titre, 200), desc: nettoyer(desc, 1200), img, date: l.created_at,
      url: choix ? base + choix : base + chemin + "#annonce-" + l.id
    };
  });
  return { html: '<script id="__RA_DATA__" type="application/json">' + JSON.stringify({ items }).replace(/&/g, "\\u0026").replace(/</g, "\\u003c") + "</script>", n: items.length, nImg, nDetail };
}
async function collecterRsc(src) {
  const base = "https://realadvisor.ch";
  let stocke = 0, pages = 0, echecs = 0, dernier = null, tot = 0, img = 0, det = 0, geo = 0, photos = null;
  for (const chemin of src.pages) {
    let rep;
    try { rep = await telechargerComplet(base + chemin); } catch (e) { echecs++; dernier = "reseau : " + String(e.message).slice(0, 60); await pause(src.pause_ms || 1500); continue; }
    pages++;
    if (rep.status !== 200) {
      echecs++; dernier = "HTTP " + rep.status + " " + chemin;
      console.log("   refus " + chemin + " -> HTTP " + rep.status + " (" + (rep.server || "-") + ")");
      if (rep.status === 403 || rep.status === 429) break; // blocage : on s'arrete, on n'insiste pas
      await pause(src.pause_ms || 1500); continue;
    }
    const flux = fluxRsc(rep.html); const liste = annoncesRsc(flux);
    if (liste.length) {
      if (photos === null) {
        const essai = liste.map(imageRsc).find(Boolean);
        if (essai) {
          try { const h = await fetch(essai, { method: "HEAD", headers: ENTETES_COMPLETS }); photos = h.status === 200; console.log("   test image : HTTP " + h.status + " " + (h.headers.get("content-type") || "")); } catch (e) { photos = false; console.log("   test image : echec reseau"); }
        }
      }
      const co = coquilleRa(liste, rep.html, flux, chemin, base, photos === true);
      const res = await versWorker({ source_name: src.name, url: base + chemin, html: co.html, defer: true });
      stocke += res.stored || 0; tot += co.n; img += co.nImg; det += co.nDetail;
      geo += liste.filter((l) => l.lat != null && l.lng != null).length;
    }
    await pause(src.pause_ms || 1500);
  }
  console.log("   realadvisor : " + tot + " annonces lues, " + img + " photos, " + det + " liens de detail, " + geo + " avec coordonnees, " + echecs + " page(s) en echec");
  return { stocke, pages, erreur: (echecs > 0 && echecs >= pages) ? dernier : null };
}

(async () => {
  let plan = (await (await fetch(BASE + "/api/plan-collecte" + (process.env.ONLY_SOURCE ? "?force=1" : ""))).json()).sources || [];
  if (process.env.ONLY_SOURCE) plan = plan.filter((x) => x.name === process.env.ONLY_SOURCE);
  console.log("sources a traiter : " + plan.length);
  let totalStocke = 0, totalPages = 0;

  for (const src of plan.slice(0, MAX_SOURCES)) {
    let stocke = 0, erreur = null, pages = 0;
    try {
      if (src.rsc) {
        const r = await collecterRsc(src);
        stocke = r.stocke; pages = r.pages; erreur = r.erreur;
      } else if (src.pagination) {
        const r = await collecterPaginee(src);
        stocke = r.stocke; pages = r.pages; erreur = r.erreur;
      } else
      for (const page of src.pages) {
        const rep = src.render ? await telechargerRendu(page, src.attente) : await telecharger(page);
        pages++;
        if (rep.status !== 200) { erreur = "HTTP " + rep.status; continue; }

        if (src.mode === "two_step") {
          const liste = await versWorker({ source_name: src.name, url: page, html: rep.html, is_list: true });
          const liens = (liste.links || []).slice(0, src.max_details);
          for (const lien of liens) {
            const abs = /^https?:\/\//i.test(lien) ? lien : (src.link_base || "").replace(/\/$/, "") + "/" + lien.replace(/^\//, "");
            try {
              const d = src.render ? await telechargerRendu(abs, src.attente) : await telecharger(abs);
              pages++;
              if (d.status !== 200) continue;
              const res = await versWorker({ source_name: src.name, url: abs, html: d.html, is_detail: true, defer: true });
              stocke += res.stored || 0;
            } catch (e) { /* une annonce en echec ne doit pas arreter la source */ }
            await pause(250);
          }
        } else {
          const res = await versWorker({ source_name: src.name, url: page, html: rep.html, defer: true });
          stocke += res.stored || 0;
        }
        await pause(300);
      }
    } catch (e) {
      erreur = String(e && e.message ? e.message : e).slice(0, 120);
    }
    totalStocke += stocke; totalPages += pages;
    await fetch(BASE + "/api/marquer-source", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: src.name, stored: stocke, error: erreur, state: erreur ? "en échec" : (stocke > 0 ? "productive" : "accessible") })
    });
    console.log((stocke + "").padStart(4) + " annonces | " + (pages + "").padStart(3) + " pages | " + src.name.slice(0, 40) + (erreur ? "  [" + erreur + "]" : ""));
  }
  if (navigateur) { await navigateur.close(); console.log("navigateur ferme"); }
  console.log("\nTOTAL : " + totalStocke + " annonces sur " + totalPages + " pages telechargees");
  const st = await (await fetch(BASE + "/api/recalculer")).text();
  console.log("recalcul : " + st.slice(0, 200));
})();
