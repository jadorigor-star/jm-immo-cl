const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };
const u = "https://www.immobilier.ch/fr/acheter/appartement/neuchatel/couvet/pro-conseils-1594/appartement-b-25-pieces-balcon-cadre-agreable-couvet-1564437";
(async () => {
  const html = await (await fetch(u, { headers: UA })).text();
  console.log("page : " + html.length + " octets");
  console.log("\n=== indices d'adresse ===");
  for (const [nom, re] of [
    ["og:description", /og:description" content="([^"]{10,300})/i],
    ["meta description", /name="description" content="([^"]{10,300})/i],
    ["rue + numero", /((?:Rue|Route|Chemin|Avenue|Grand-Rue|Quartier|Place|Impasse|Ruelle)[^<>",]{3,40}\s\d{1,4}[a-z]?)/gi],
    ["code postal + ville", /(\d{4})\s+(Couvet|Fleurier|Travers|M[oô]tiers)/gi],
    ["adresse json", /"(?:streetAddress|address|adresse)"\s*:\s*"([^"]{4,60})"/gi],
    ["coordonnees", /"(?:lat|latitude)"\s*:\s*(4[5-7]\.\d{3,})/gi]
  ]) {
    const t = [...html.matchAll(re instanceof RegExp && re.global ? re : new RegExp(re.source, "gi"))].slice(0, 4).map((m) => (m[1] || m[0]).trim());
    console.log("  " + nom.padEnd(18) + JSON.stringify(t));
  }
  const ld = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].replace(/\s+/g, " ").slice(0, 320));
  console.log("\n=== JSON-LD (" + ld.length + ") ===");
  ld.slice(0, 2).forEach((x) => console.log("  " + x));
})();
