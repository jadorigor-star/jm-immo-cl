const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
             "Accept-Language": "it-CH,it;q=0.9" };
const get = async (u) => { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(25000) }); return { s: r.status, u: r.url, h: await r.text() }; };
(async () => {
  for (const u of ["https://www.casebertolotti.ch/it/ricerca-immobili", "https://www.casebertolotti.ch/it/acquistare-immobile-ticino"]) {
    const r = await get(u);
    const liens = [...new Set([...r.h.matchAll(/href="([^"]*immobili\/[^"]{3,60})"/g)].map((m) => m[1]))];
    console.log(u.slice(30).padEnd(34) + " HTTP " + r.s + " | " + r.h.length + " o | annonces : " + liens.length);
    liens.slice(0, 6).forEach((l) => console.log("     " + l));
  }
  console.log("\n=== PAGE DE DETAIL ===");
  const d = await get("https://www.casebertolotti.ch/it/immobili/cabe05-oc");
  console.log("HTTP " + d.s + " | " + d.h.length + " octets");
  for (const [n, re] of [
    ["<title>", /<title>([^<]{4,140})/i],
    ["og:title", /og:title"\s+content="([^"]{4,140})/i],
    ["og:description", /og:description"\s+content="([^"]{10,300})/i],
    ["og:image", /og:image"\s+content="([^"]{10,150})/i],
    ["prix", /CHF[\s'’]*([\d'’\s]{5,})/i],
    ["locali/pieces", /([\d.,]+)\s*(?:locali|pi[eè]ces?)/i],
    ["m2", /([\d']{2,6})\s*m(?:2|²)/i],
    ["localite", /(?:6[0-9]{3})\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ\-' ]{2,24})/],
    ["coordonnees", /"lat(?:itude)?"\s*:\s*"?(4[5-7]\.\d{3,})/i]
  ]) {
    const m = re.exec(d.h);
    console.log("  " + n.padEnd(16) + (m ? String(m[1]).slice(0, 100) : "ABSENT"));
  }
  const ld = [...d.h.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].replace(/\s+/g, " ").slice(0, 260));
  console.log("  JSON-LD : " + ld.length);
  ld.forEach((x) => console.log("     " + x));
})();
