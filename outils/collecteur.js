// Collecteur externe : GitHub telecharge les pages (aucune limite de
// sous-requetes), le worker extrait et stocke.
const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
             "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.8,it;q=0.7" };
const MAX_SOURCES = parseInt(process.env.MAX_SOURCES || "999", 10);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

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

(async () => {
  const plan = (await (await fetch(BASE + "/api/plan-collecte")).json()).sources || [];
  console.log("sources a traiter : " + plan.length);
  let totalStocke = 0, totalPages = 0;

  for (const src of plan.slice(0, MAX_SOURCES)) {
    let stocke = 0, erreur = null, pages = 0;
    try {
      for (const page of src.pages) {
        const rep = await telecharger(page);
        pages++;
        if (rep.status !== 200) { erreur = "HTTP " + rep.status; continue; }

        if (src.mode === "two_step") {
          const liste = await versWorker({ source_name: src.name, url: page, html: rep.html, is_list: true });
          const liens = (liste.links || []).slice(0, src.max_details);
          for (const lien of liens) {
            const abs = /^https?:\/\//i.test(lien) ? lien : (src.link_base || "").replace(/\/$/, "") + "/" + lien.replace(/^\//, "");
            try {
              const d = await telecharger(abs);
              pages++;
              if (d.status !== 200) continue;
              const res = await versWorker({ source_name: src.name, url: abs, html: d.html, is_detail: true });
              stocke += res.stored || 0;
            } catch (e) { /* une annonce en echec ne doit pas arreter la source */ }
            await pause(250);
          }
        } else {
          const res = await versWorker({ source_name: src.name, url: page, html: rep.html });
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
  console.log("\nTOTAL : " + totalStocke + " annonces sur " + totalPages + " pages telechargees");
  const st = await (await fetch(BASE + "/api/recalculer")).text();
  console.log("recalcul : " + st.slice(0, 200));
})();
