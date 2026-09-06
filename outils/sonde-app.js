const u = "https://www.immobilier.ch/fr/acheter/maison/fribourg/albeuve/accordia-immo-2989/maison-bi-familiale-albeuve-1471303";
(async () => {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" } });
  const html = await r.text();
  console.log("HTTP " + r.status + " | " + html.length + " octets");
  const head = html.slice(html.indexOf("<head"), html.indexOf("</head>"));
  console.log("\n=== META OG ET DESCRIPTION ===");
  for (const m of head.matchAll(/<meta[^>]+(property|name)="(og:[^"]+|description|keywords)"[^>]*>/gi)) {
    console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 190));
  }
  console.log("\n=== TITRE ===");
  console.log("  " + (/<title>([^<]*)<\/title>/i.exec(head) || [])[1]);
  console.log("\n=== JSON-LD ===");
  for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    console.log("  " + m[1].replace(/\s+/g, " ").slice(0, 400));
  }
  console.log("\n=== INDICES PIECES / SURFACE DANS LE CORPS ===");
  for (const re of [/([\d.,]+)\s*(?:pi[eè]ces?|locali|Zimmer)/gi, /([\d'’]+)\s*m(?:²|2)\b/gi, /surface[^<]{0,60}/gi]) {
    const t = [...html.matchAll(re)].slice(0, 4).map((x) => x[0].replace(/\s+/g, " ").trim());
    console.log("  " + JSON.stringify(t));
  }
})();
