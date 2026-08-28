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
    return config.mode === "single" && Array.isArray(config.urls) && config.urls.length > 0;
  });

  console.log(candidates.length + " source(s) éligible(s) au relais ce passage.");

  let totalStored = 0;
  for (const src of candidates) {
    const config = JSON.parse(src.config_json);
    for (const url of config.urls) {
      try {
        const pageRes = await fetch(url, {
          headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "fr-CH,fr;q=0.9" },
        });
        if (!pageRes.ok) {
          console.log(src.name + " (" + url + ") : HTTP " + pageRes.status);
          continue;
        }
        const html = await pageRes.text();
        const hasCHF = html.includes("CHF");
        const hasPrice = /\d{3}[',.]?\d{3}/.test(html);
        console.log(src.name + " (" + url + ") : page recue, " + html.length + " caracteres, contient 'CHF' : " + hasCHF + ", ressemble a un prix : " + hasPrice);

        const ingestRes = await fetch(WORKER_URL + "/api/ingest-raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_name: src.name, html: html, url: url }),
        });
        const result = await ingestRes.json();
        const stored = result.stored || 0;
        totalStored += stored;
        console.log(src.name + " (" + url + ") : " + stored + " annonce(s) stockee(s)");
      } catch (e) {
        console.log(src.name + " (" + url + ") : erreur - " + e.message);
      }
    }
  }

  console.log("");
  console.log("Total : " + totalStored + " annonce(s) transmise(s) au Worker.");
}

main().catch(function (e) {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
