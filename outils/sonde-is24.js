// Sonde ImmoScout24 : compare un telechargement simple et un vrai navigateur.
// Ne contourne aucune protection : si une page de verification apparait, on le constate et on s'arrete.
const URLS = (process.env.URLS || "").split(/\s+/).filter(Boolean);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const MARQUEURS = ["captcha", "px-captcha", "datadome", "access denied", "just a moment", "unusual traffic", "are you a robot", "pardon our interruption", "request blocked", "vérification", "verifying you are human"];

function chemin(o, p) { return p.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }

(async () => {
  const puppeteer = require("puppeteer");
  console.log("== Sonde IS24 " + new Date().toISOString() + " ==");
  for (const url of URLS) {
    console.log("\n#### " + url);
    // 1. telechargement simple
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" }, redirect: "follow" });
      const t = await r.text();
      console.log("[fetch simple] HTTP " + r.status + " | " + t.length + " car. | pinia=" + t.includes("__PINIA_STATE__") + " | server=" + (r.headers.get("server") || "-"));
    } catch (e) { console.log("[fetch simple] erreur " + e.message); }

    // 2. vrai navigateur
    const nav = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      const page = await nav.newPage();
      await page.setUserAgent(UA);
      await page.setViewport({ width: 1280, height: 900 });
      await page.setExtraHTTPHeaders({ "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.8,it;q=0.7" });
      const xhr = [];
      page.on("response", (res) => {
        try {
          const ct = res.headers()["content-type"] || "";
          const u = res.url();
          if (ct.includes("json") && /immoscout24/.test(u)) xhr.push(res.status() + " " + u.slice(0, 150));
        } catch (e) {}
      });
      const rep = await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await pause(2500);
      const html = await page.content();
      const titre = await page.title();
      const bas = html.toLowerCase();
      const trouves = MARQUEURS.filter((m) => bas.includes(m));
      console.log("[navigateur] HTTP " + (rep ? rep.status() : "?") + " | url finale " + page.url().slice(0, 120));
      console.log("[navigateur] titre : " + titre.slice(0, 100) + " | " + html.length + " car.");
      console.log("[navigateur] marqueurs de blocage : " + (trouves.length ? trouves.join(", ") : "aucun"));
      const etat = await page.evaluate(() => (window.__PINIA_STATE__ ? Object.keys(window.__PINIA_STATE__) : null));
      console.log("[navigateur] __PINIA_STATE__ : " + (etat ? "present, cles=" + etat.join(",") : "absent"));
      if (etat) {
        const info = await page.evaluate(() => {
          const s = window.__PINIA_STATE__;
          const res = {};
          for (const p of ["search.fullSearch.result", "agencyProfile.search.fullSearch.result"]) {
            const o = p.split(".").reduce((a, k) => (a == null ? a : a[k]), s);
            if (o) {
              res[p] = { cles: Object.keys(o), n: Array.isArray(o.listings) ? o.listings.length : null,
                total: o.resultCount != null ? o.resultCount : (o.totalCount != null ? o.totalCount : (o.pagination || null)) };
              if (Array.isArray(o.listings) && o.listings[0]) res[p].exemple = JSON.stringify(o.listings[0]).slice(0, 900);
            }
          }
          return res;
        });
        console.log("[navigateur] etat de recherche : " + JSON.stringify(info, null, 1).slice(0, 2600));
      } else {
        const texte = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : "");
        console.log("[navigateur] debut du texte : " + texte.replace(/\s+/g, " "));
      }
      console.log("[navigateur] appels JSON vus : " + (xhr.length ? "\n  " + xhr.slice(0, 12).join("\n  ") : "aucun"));
    } catch (e) {
      console.log("[navigateur] erreur : " + String(e.message).slice(0, 200));
    } finally { await nav.close(); }
    await pause(3000);
  }
})();
