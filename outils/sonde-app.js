// Recense les agences referencees par immobilier.ch dans les cantons cibles
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "fr-CH,fr;q=0.9" };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(25000) }); return { s: r.status, h: await r.text() }; } catch (e) { return { s: "ERR", h: "" }; } };
(async () => {
  const agences = new Map();
  for (const canton of ["fribourg", "neuchatel", "jura"]) {
    for (let p = 1; p <= 8; p++) {
      const u = "https://www.immobilier.ch/fr/acheter/appartement-maison/" + canton + "/page-" + p;
      const r = await get(u);
      if (r.s !== 200) { console.log(canton + " page-" + p + " -> HTTP " + r.s); break; }
      const trouves = [...r.h.matchAll(/\/fr\/acheter\/(?:appartement|maison|immeuble|chalet|villa)\/[a-z\-]+\/[a-z\-]+\/([a-z0-9\-]+?-(\d{2,6}))\//g)];
      for (const m of trouves) agences.set(m[1], (agences.get(m[1]) || 0) + 1);
      const avant = agences.size;
      console.log(canton + " page-" + p + " : " + trouves.length + " liens | agences connues : " + avant);
      await new Promise((x) => setTimeout(x, 400));
    }
  }
  const tri = [...agences.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\n=== " + tri.length + " AGENCES DISTINCTES ===");
  tri.forEach(([slug, n]) => console.log("  " + String(n).padStart(3) + "  " + slug));
})();
