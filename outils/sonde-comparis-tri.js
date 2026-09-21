// Cherche quelle valeur de ?sort= trie par prix croissant sur Comparis (telechargement simple).
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const B = "https://www.comparis.ch/immobilien/marktplatz/kanton/freiburg/kaufen";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function lire(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
  const h = await r.text();
  const m = h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { status: r.status, erreur: "pas de JSON" };
  const pp = JSON.parse(m[1]).props.pageProps;
  const d = pp.initialResultData;
  return { status: r.status, sort: d.sort, tri: pp.initialListingsSortingType, total: d.numberOfResults, prix: (d.resultItems || []).slice(0, 6).map((x) => x.Price), ids: (d.resultItems || []).slice(0, 3).map((x) => x.AdId) };
}
(async () => {
  console.log("== Sonde tri Comparis " + new Date().toISOString() + " ==");
  const essais = [""];
  for (const k of ["sort", "Sort", "sorting", "sortType"]) for (const v of [1, 2, 3, 5, 10, 11, 12, 13]) essais.push("?" + k + "=" + v);
  for (const q of essais) {
    try { console.log((q || "(defaut)").padEnd(14) + " " + JSON.stringify(await lire(B + q))); } catch (e) { console.log(q + " erreur " + e.message); }
    await pause(600);
  }
})();
