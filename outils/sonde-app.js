const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };
(async () => {
  console.log("=== codes de cantons ===");
  const acc = await (await fetch("https://www.lookmove.ch/en", { headers: UA })).text();
  const liens = [...new Set([...acc.matchAll(/\/en\/properties\/buy\/[a-z\-]+,\d+\/([a-z\-]+),(\d+)/g)].map((m) => m[1] + "," + m[2]))];
  console.log(liens.slice(0, 30).join("\n"));

  const u = "https://www.lookmove.ch/en/properties/buy/apartment-house,3/fribourg-fr,100007";
  console.log("\n=== page de resultats Fribourg ===");
  const r = await fetch(u, { headers: UA });
  const html = await r.text();
  console.log("HTTP " + r.status + " | " + html.length + " octets");
  console.log("NEXT_DATA : " + html.includes("__NEXT_DATA__") + " | NUXT : " + html.includes("__NUXT__"));
  const prix = [...html.matchAll(/CHF[\s'’]*[\d'’\s]{5,}/g)].slice(0, 5).map((m) => m[0].trim());
  console.log("prix visibles : " + JSON.stringify(prix));
  const ann = [...new Set([...html.matchAll(/href="(\/en\/(?:property|properties\/detail)\/[^"]+)"/g)].map((m) => m[1]))];
  console.log("liens d'annonce : " + ann.length);
  ann.slice(0, 4).forEach((a) => console.log("   " + a.slice(0, 110)));
  const tousLiens = [...new Set([...html.matchAll(/href="(\/en\/[a-z\-]+\/[^"]{10,90})"/g)].map((m) => m[1]))];
  console.log("\nautres motifs de liens :");
  tousLiens.slice(0, 12).forEach((a) => console.log("   " + a.slice(0, 100)));
})();
