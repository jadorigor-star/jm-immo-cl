// Relais de collecte JM Immo — exécuté par GitHub Actions
//
// Principe : ce script récupère la liste des sources ET leur configuration
// directement depuis l'API du Worker (déjà en place, aucune duplication de
// logique). Il va chercher chaque page depuis le réseau GitHub (différent de
// celui de Cloudflare, potentiellement moins reconnu par les protections
// anti-robot), puis transmet le HTML brut au Worker pour extraction.
//
// Ce script est volontairement générique : il ne connaît le nom d'aucune
// source en dur. Toute source ajoutée ou modifiée en base de données sera
// automatiquement prise en compte au prochain passage, sans jamais avoir à
// modifier ce fichier ni à le retransmettre.

const WORKER_URL = process.env.WORKER_URL || "https://jm-immo-cl.jadorigor.workers.dev";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const HEADERS = { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "fr-CH,fr;q=0.9" };

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}

async function ingest(sourceName, html, url, extra) {
  const body = Object.assign({ source_name: sourceName, html: html, url: url }, extra || {});
  const res = await fetch(WORKER_URL + "/api/ingest-raw", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json();
}

async function handleSingle(src, config) {
  let stored = 0;
  for (const url of config.urls) {
    try {
      const html = await fetchPage(url);
      console.log(src.name + " (" + url + ") : page recue, " + html.length + " caracteres");
      const result = await ingest(src.name, html, url);
      stored += result.stored || 0;
      console.log(src.name + " (" + url + ") : " + (result.stored || 0) + " annonce(s) stockee(s)");
    } catch (e) {
      console.log(src.name + " (" + url + ") : erreur - " + e.message);
    }
  }
  return stored;
}

async function handleTwoStep(src, config) {
  let stored = 0;
  try {
    const listHtml = await fetchPage(config.list_url);
    console.log(src.name + " (liste) : page recue, " + listHtml.length + " caracteres");
    const listResult = await ingest(src.name, listHtml, config.list_url, { is_list: true });
    const links = listResult.links || [];
    console.log(src.name + " : " + links.length + " fiche(s) individuelle(s) trouvee(s)");
    for (const link of links) {
      try {
        const detailHtml = await fetchPage(link);
        const result = await ingest(src.name, detailHtml, link, { is_detail: true });
        stored += result.stored || 0;
      } catch (e) {
        console.log(src.name + " (" + link + ") : erreur - " + e.message);
      }
    }
    console.log(src.name + " : " + stored + " annonce(s) stockee(s) au total");
  } catch (e) {
    console.log(src.name + " (liste) : erreur - " + e.message);
  }
  return stored;
}

async function main() {
  console.log("Récupération de la liste des sources depuis " + WORKER_URL + "...");
  const srcRes = await fetch(WORKER_URL + "/api/sources");
  if (!srcRes.ok) {
    console.error("Impossible de lire /api/sources : HTTP " + srcRes.status);
    process.exit(1);
  }
  const { results } = await srcRes.json();

  const candidates = results.filter(function (src) {
    if (!src.enabled) return false;
    if (src.adapter === "demo" || src.adapter === "manuel_uniquement") return false;
    let config;
    try { config = JSON.parse(src.config_json || "{}"); } catch (e) { return false; }
    if (config.mode === "single") return Array.isArray(config.urls) && config.urls.length > 0;
    if (config.mode === "two_step") return !!config.list_url;
    return false;
  });

  console.log(candidates.length + " source(s) éligible(s) au relais ce passage.");

  let totalStored = 0;
  for (const src of candidates) {
    const config = JSON.parse(src.config_json);
    if (config.mode === "two_step") totalStored += await handleTwoStep(src, config);
    else totalStored += await handleSingle(src, config);
  }

  console.log("");
  console.log("Total : " + totalStored + " annonce(s) transmise(s) au Worker.");
}

main().catch(function (e) {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
