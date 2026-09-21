// RealAdvisor : structure du flux Next.js (RSC), forme d'une annonce, liens de communes.
// Requetes simples, sans parametres (robots.txt), espacees de 2 s.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const URLS = (process.env.URLS || "https://realadvisor.ch/fr/acheter/canton-fribourg").split(/\s+/).filter(Boolean);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function flux(h) {
  let out = "";
  for (const m of h.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { out += JSON.parse(m[1]); } catch (e) {} }
  return out;
}
function objetApres(s, idx) {
  const i = s.indexOf("{", idx);
  let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return s.slice(i, j + 1); }
  }
  return null;
}
(async () => {
  console.log("== Sonde RealAdvisor v2 " + new Date().toISOString() + " ==");
  for (const url of URLS) {
    console.log("\n#### " + url);
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
    const h = await r.text();
    console.log("HTTP " + r.status + " | " + h.length + " car. | titre: " + ((h.match(/<title>([^<]*)/i) || [])[1] || "").slice(0, 110));
    const f = flux(h);
    console.log("[flux] " + f.length + " car. decodes");
    const marques = [...f.matchAll(/"listing":\{/g)].map((m) => m.index);
    console.log("[annonces] occurrences de \"listing\":{ : " + marques.length);
    const objs = [];
    for (const ix of marques) { const o = objetApres(f, ix); if (o) { try { objs.push(JSON.parse(o)); } catch (e) {} } }
    console.log("[annonces] objets JSON lisibles : " + objs.length + " | ids distincts : " + new Set(objs.map((o) => o.id || o.listingId || o.slug)).size);
    if (objs[0]) {
      console.log("[annonce] cles : " + Object.keys(objs[0]).join(","));
      console.log("[annonce 1] " + JSON.stringify(objs[0]).slice(0, 2600));
    }
    if (objs[1]) console.log("[annonce 2 resume] " + JSON.stringify(objs[1]).slice(0, 700));
    const liens = [...new Set([...h.matchAll(/href="(\/fr\/acheter\/[^"#?]+)"/g)].map((m) => m[1]))];
    console.log("[liens /fr/acheter/] " + liens.length + " distincts : " + liens.slice(0, 60).join(" "));
    const suivant = (h.match(/rel="next"[^>]*href="([^"]+)"/) || [])[1];
    console.log("[pagination] rel=next : " + (suivant || "aucun") + " | texte 'page' : " + (h.match(/Page \d+ (sur|of) \d+/i) || ["-"])[0]);
    await pause(2000);
  }
})();
