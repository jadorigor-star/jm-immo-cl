const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
             "Accept-Language": "it-CH,it;q=0.9,fr;q=0.8" };
const candidats = [
  "https://www.casebertolotti.ch/",
  "https://www.casebertolotti.ch/vendita",
  "https://www.casebertolotti.ch/it/vendita",
  "https://casebertolotti.ch/"
];
async function get(u) {
  try {
    const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(25000) });
    return { status: r.status, url: r.url, html: await r.text() };
  } catch (e) { return { status: "ERR " + e.message.slice(0, 40), html: "" }; }
}
(async () => {
  let base = null;
  for (const u of candidats) {
    const r = await get(u);
    console.log(u.padEnd(46) + " -> " + r.status + (r.html ? " | " + r.html.length + " o" : ""));
    if (r.status === 200 && !base) base = r;
  }
  if (!base) return;
  const html = base.html;
  console.log("\nURL finale : " + base.url);
  console.log("JSON-LD : " + (html.match(/ld\+json/g) || []).length + " | PINIA : " + html.includes("__PINIA_STATE__") + " | NEXT : " + html.includes("__NEXT_DATA__"));
  const prix = [...html.matchAll(/CHF[\s'’]*[\d'’\s]{5,}/gi)].slice(0, 5).map((m) => m[0].trim());
  console.log("prix visibles : " + JSON.stringify(prix));
  const liens = [...new Set([...html.matchAll(/href="([^"]{4,150})"/g)].map((m) => m[1]))];
  console.log("\nliens totaux : " + liens.length);
  const interessants = liens.filter((u) => /vendit|vendre|immobil|oggett|propriet|object|detail|scheda|\/\d{3,}/i.test(u));
  console.log("liens candidats : " + interessants.length);
  interessants.slice(0, 14).forEach((l) => console.log("   " + l.slice(0, 110)));
})();
