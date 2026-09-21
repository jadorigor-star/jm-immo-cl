// Une seule requete : structure d'une page de resultats RealAdvisor (pas de contre-mesure).
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const URL0 = process.env.URLS || "https://realadvisor.ch/fr/acheter/canton-fribourg";
(async () => {
  console.log("== Sonde RealAdvisor " + new Date().toISOString() + " ==\n" + URL0);
  const r = await fetch(URL0, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
  const h = await r.text();
  console.log("HTTP " + r.status + " | " + h.length + " car.");
  // ld+json
  const ld = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  ld.forEach((raw, i) => {
    try { const j = JSON.parse(raw); const l = j.itemListElement || (j.mainEntity && j.mainEntity.itemListElement);
      console.log("[ld+json " + i + "] @type=" + j["@type"] + " | items=" + (Array.isArray(l) ? l.length : "-") + " | " + raw.slice(0, 350).replace(/\s+/g, " "));
      if (Array.isArray(l) && l[0]) console.log("   premier: " + JSON.stringify(l[0]).slice(0, 700));
    } catch (e) { console.log("[ld+json " + i + "] illisible " + raw.slice(0, 120)); }
  });
  console.log("[rsc] self.__next_f.push : " + (h.match(/self\.__next_f\.push/g) || []).length + " | __NEXT_DATA__ : " + h.includes("__NEXT_DATA__"));
  // formes de liens (seuil 2)
  const formes = {};
  for (const m of h.matchAll(/href="([^"#]+)"/g)) { const f = m[1].replace(/\d+/g, "#").replace(/[a-f0-9-]{20,}/g, "H").slice(0, 80); formes[f] = (formes[f] || 0) + 1; }
  console.log("[liens] " + Object.entries(formes).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([f, n]) => n + "x " + f).join("\n  "));
  // contexte autour de prix et surfaces
  const i1 = h.search(/CHF\s?[\d'’ ]{6,}/);
  console.log("[contexte CHF] " + (i1 >= 0 ? h.slice(Math.max(0, i1 - 500), i1 + 300).replace(/\s+/g, " ") : "aucun"));
  const nb = (h.match(/CHF\s?[\d'’ ]{6,}/g) || []).length;
  console.log("[prix CHF visibles] " + nb);
  // cles JSON avec price dans le HTML/RSC
  const cles = {}; for (const m of h.matchAll(/\\?"(price|listingPrice|salePrice|askingPrice|priceValue)\\?":\s*\{?\\?"?(\d[\d.]*)/g)) cles[m[1]] = (cles[m[1]] || 0) + 1;
  console.log("[cles prix JSON] " + JSON.stringify(cles));
  const k = h.search(/\\?"(listings|properties|items|results)\\?":\s*\[/);
  console.log("[tableau candidat] " + (k >= 0 ? h.slice(k, k + 900).replace(/\s+/g, " ") : "aucun"));
})();
