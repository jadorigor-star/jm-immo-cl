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

// Respecte un delai minimal entre deux requetes vers le MEME site — sans ca,
// plusieurs pages du meme portail (ex. ImmoScout24) contactees en rafale
// depuis la meme adresse GitHub declenchent une protection anti-robot par
// volume (confirme le 29.08 : 13 pages ImmoScout24 en 10s -> blocage HTTP 403
// generalise, alors que les memes pages fonctionnent individuellement).
const domainLastRequest = {};
const MIN_DELAY_PER_DOMAIN_MS = 2500;
function getDomain(url) {
  try { return new URL(url).hostname; } catch (e) { return url; }
}
async function throttledFetch(url, opts) {
  const domain = getDomain(url);
  const now = Date.now();
  // Reservation immediate et synchrone du creneau (avant tout await) : c'est
  // ce qui garantit un espacement correct meme quand plusieurs requetes vers
  // le meme domaine partent en parallele — sans ca, elles liraient toutes la
  // meme valeur "derniere requete" avant qu'aucune ne l'ait mise a jour.
  const prevReserved = domainLastRequest[domain] || 0;
  const myTurn = Math.max(now, prevReserved + MIN_DELAY_PER_DOMAIN_MS);
  domainLastRequest[domain] = myTurn;
  const wait = myTurn - now;
  if (wait > 0) await new Promise(function (r) { setTimeout(r, wait); });
  return fetch(url, opts);
}

async function fetchPage(url, config) {
  if (config && config.js_rendered) return fetchPageWithBrowser(url, config.wait_selector);
  const res = await throttledFetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}

// Rendu JavaScript via navigateur headless (Puppeteer), pour les sites dont
// la liste d'annonces se charge apres coup en JavaScript (ex. Immolife
// Ticino, Domusdea sur leur propre site) — une simple requete HTTP ne voit
// que la coquille vide de la page, pas les vraies annonces. Le module n'est
// charge que si une source l'exige reellement (config.js_rendered), pour ne
// jamais ralentir ni casser le fonctionnement des sources classiques.
let puppeteerModule = null;
let browserInstance = null;
async function getBrowser() {
  if (!browserInstance) {
    if (!puppeteerModule) puppeteerModule = require("puppeteer");
    browserInstance = await puppeteerModule.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}
async function fetchPageWithBrowser(url, waitSelector) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    if (waitSelector) {
      // Si le selecteur n'apparait pas (structure du site modifiee, ou page
      // vide), on continue quand meme avec ce qui a pu etre charge plutot
      // que de tout faire echouer sur ce seul point.
      await page.waitForSelector(waitSelector, { timeout: 8000 }).catch(function () {});
    }
    return await page.content();
  } finally {
    await page.close();
  }
}
async function closeBrowserIfOpen() {
  if (browserInstance) { await browserInstance.close(); browserInstance = null; }
}

async function ingest(sourceName, html, url, extra) {
  const body = Object.assign({ source_name: sourceName, html: html, url: url }, extra || {});
  const res = await fetch(WORKER_URL + "/api/ingest-raw", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json();
}

async function reportError(sourceName, errorMsg) {
  try {
    await fetch(WORKER_URL + "/api/report-check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_name: sourceName, error: errorMsg })
    });
  } catch (e) { /* si meme ce signalement echoue, tant pis : le prochain passage reessaiera */ }
}

async function handleSingle(src, config) {
  let stored = 0;
  for (const url of config.urls) {
    try {
      const html = await fetchPage(url, config);
      console.log(src.name + " (" + url + ") : page recue, " + html.length + " caracteres");
      const result = await ingest(src.name, html, url);
      stored += result.stored || 0;
      console.log(src.name + " (" + url + ") : " + (result.stored || 0) + " annonce(s) stockee(s)");
    } catch (e) {
      console.log(src.name + " (" + url + ") : erreur - " + e.message);
      await reportError(src.name, e.message);
    }
  }
  return stored;
}

async function handleTwoStep(src, config) {
  let stored = 0;
  try {
    const listHtml = await fetchPage(config.list_url, config);
    console.log(src.name + " (liste) : page recue, " + listHtml.length + " caracteres");
    const listResult = await ingest(src.name, listHtml, config.list_url, { is_list: true });
    const links = listResult.links || [];
    console.log(src.name + " : " + links.length + " fiche(s) individuelle(s) trouvee(s)");
    // Les fiches individuelles sont generalement rendues cote serveur meme
    // quand la page de LISTE elle-meme est chargee en JavaScript (confirme
    // pour Immolife Ticino) — inutile d'alourdir chaque fiche avec un
    // navigateur complet si une simple requete HTTP suffit deja.
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

const FORCE_ALL = process.env.FORCE_ALL === "true";

function isDue(src) {
  // Le forcage manuel (case a cocher au declenchement) ignore les
  // intervalles pour un passage complet ponctuel, sans jamais modifier ce
  // qui se passe automatiquement le reste du temps.
  if (FORCE_ALL) return true;
  if (!src.last_checked) return true;
  const intervalMs = (src.check_interval_hours || 6) * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(src.last_checked).getTime();
  return elapsed >= intervalMs;
}

async function processSource(src) {
  const config = JSON.parse(src.config_json);
  if (config.mode === "two_step") return handleTwoStep(src, config);
  return handleSingle(src, config);
}

async function main() {
  console.log("Récupération de la liste des sources depuis " + WORKER_URL + "...");
  const srcRes = await fetch(WORKER_URL + "/api/sources");
  if (!srcRes.ok) {
    console.error("Impossible de lire /api/sources : HTTP " + srcRes.status);
    process.exit(1);
  }
  const { results } = await srcRes.json();

  const eligible = results.filter(function (src) {
    if (!src.enabled) return false;
    if (src.adapter === "demo" || src.adapter === "manuel_uniquement") return false;
    let config;
    try { config = JSON.parse(src.config_json || "{}"); } catch (e) { return false; }
    if (config.mode === "single") return Array.isArray(config.urls) && config.urls.length > 0;
    if (config.mode === "two_step") return !!config.list_url;
    return false;
  });

  const candidates = eligible.filter(isDue);
  const skipped = eligible.length - candidates.length;
  if (FORCE_ALL) console.log("Forçage manuel actif : intervalles ignorés pour ce passage.");
  console.log(eligible.length + " source(s) éligible(s), " + candidates.length + " due(s) ce passage (" + skipped + " ignorée(s), pas encore dues).");

  // Plafond volontaire sur ImmoScout24 par passage : confirme le 30.08, un
  // volume cumule trop eleve de requetes vers ce domaine en une seule
  // execution declenche un blocage global (HTTP 403) qui touche meme des
  // sources habituellement productives. Plutot que de tout tenter d'un coup,
  // on repartit sur plusieurs cycles — l'exces reste "due" et sera repris au
  // prochain passage automatiquement (rien n'est perdu, juste reporte).
  const IMMOSCOUT_CAP_PER_RUN = 15;
  function isImmoScoutSource(src) {
    try {
      const config = JSON.parse(src.config_json || "{}");
      const urls = config.mode === "single" ? (config.urls || []) : [config.list_url];
      return urls.some(function(u) { return u && u.indexOf("immoscout24.ch") !== -1; });
    } catch (e) { return false; }
  }
  let immoscoutCount = 0;
  const cappedCandidates = [];
  for (const src of candidates) {
    if (isImmoScoutSource(src)) {
      if (immoscoutCount >= IMMOSCOUT_CAP_PER_RUN) continue;
      immoscoutCount++;
    }
    cappedCandidates.push(src);
  }
  const deferred = candidates.length - cappedCandidates.length;
  if (deferred > 0) console.log(deferred + " source(s) ImmoScout24 reportee(s) au prochain passage (plafond de " + IMMOSCOUT_CAP_PER_RUN + " par execution, pour eviter le blocage global constate).");

  // Traitement par lots parallèles : plusieurs sources contactées en même
  // temps plutôt qu'une par une. Nécessaire pour que 60+ sources tiennent
  // dans un temps d'exécution raisonnable.
  const BATCH_SIZE = 6;
  let totalStored = 0;
  for (let i = 0; i < cappedCandidates.length; i += BATCH_SIZE) {
    const batch = cappedCandidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(function (src) {
      return processSource(src).catch(function (e) {
        console.log(src.name + " : erreur de lot - " + e.message);
        return 0;
      });
    }));
    totalStored += results.reduce(function (a, b) { return a + b; }, 0);
  }

  console.log("");
  console.log("Total : " + totalStored + " annonce(s) transmise(s) au Worker.");
  await closeBrowserIfOpen();
}

main().catch(async function (e) {
  console.error("Erreur fatale :", e);
  await closeBrowserIfOpen();
  process.exit(1);
});
