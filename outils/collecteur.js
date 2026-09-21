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

(async () => {
  const plan = (await (await fetch(BASE + "/api/plan-collecte")).json()).sources || [];
  console.log("sources a traiter : " + plan.length);
  let totalStocke = 0, totalPages = 0;

  for (const src of plan.slice(0, MAX_SOURCES)) {
    let stocke = 0, erreur = null, pages = 0;
    try {
      if (src.pagination) {
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
