// Sonde de portail : robots.txt, donnees structurees embarquees, forme des liens, pagination.
// Telechargement simple uniquement, aucune contre-mesure.
const URLS = (process.env.URLS || "").split(/\s+/).filter(Boolean);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function trouverTableaux(o, chemin, out, prof) {
  if (prof > 9 || o == null || typeof o !== "object") return;
  if (Array.isArray(o)) {
    if (o.length >= 5 && o[0] && typeof o[0] === "object" && Object.keys(o[0]).some((k) => /price|prix/i.test(k))) out.push({ chemin, n: o.length, ex: o[0] });
    o.slice(0, 3).forEach((v, i) => trouverTableaux(v, chemin + "[" + i + "]", out, prof + 1));
    return;
  }
  for (const k of Object.keys(o)) trouverTableaux(o[k], chemin ? chemin + "." + k : k, out, prof + 1);
}

(async () => {
  console.log("== Sonde portail " + new Date().toISOString() + " ==");
  const vus = new Set();
  for (const url of URLS) {
    const u = new URL(url);
    console.log("\n#### " + url);
    if (!vus.has(u.origin)) {
      vus.add(u.origin);
      try {
        const r = await fetch(u.origin + "/robots.txt", { headers: { "User-Agent": UA } });
        const t = await r.text();
        console.log("[robots.txt] HTTP " + r.status + " | " + t.length + " car.");
        const lignes = t.split(/\r?\n/).filter((l) => /^(user-agent|disallow|allow|crawl-delay|content-signal|sitemap)/i.test(l.trim()));
        console.log(lignes.slice(0, 70).join("\n"));
      } catch (e) { console.log("[robots.txt] erreur " + e.message); }
    }
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" }, redirect: "follow" });
      const html = await r.text();
      console.log("[page] HTTP " + r.status + " | " + html.length + " car. | " + ((html.match(/<title>([^<]*)/i) || [])[1] || "").slice(0, 100));
      const ids = [...html.matchAll(/<script[^>]*\bid="([^"]+)"[^>]*type="application\/json"|<script[^>]*type="application\/json"[^>]*\bid="([^"]+)"/gi)].map((m) => m[1] || m[2]);
      console.log("[json embarque] scripts application/json : " + (ids.join(", ") || "aucun"));
      console.log("[json embarque] ld+json : " + (html.match(/application\/ld\+json/gi) || []).length + " | window.__ : " + [...new Set([...html.matchAll(/window\.(__[A-Z_a-z0-9]+__)\s*=/g)].map((m) => m[1]))].join(", "));
      // JSON de la page
      const cand = [];
      for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
        try { const j = JSON.parse(m[1]); const out = []; trouverTableaux(j, "", out, 0); out.forEach((x) => cand.push(x)); } catch (e) {}
      }
      console.log("[json embarque] tableaux d'annonces (avec prix) : " + cand.length);
      cand.slice(0, 4).forEach((c) => console.log("  chemin=" + c.chemin + " n=" + c.n + "\n  exemple=" + JSON.stringify(c.ex).slice(0, 1300)));
      // liens
      const formes = {};
      for (const m of html.matchAll(/href="([^"#]+)"/g)) {
        const f = m[1].replace(/\d+/g, "#").replace(/[a-f0-9]{16,}/g, "H").slice(0, 70);
        formes[f] = (formes[f] || 0) + 1;
      }
      const top = Object.entries(formes).filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1]).slice(0, 14);
      console.log("[liens frequents] " + top.map(([f, n]) => n + "x " + f).join("\n  "));
      console.log("[pagination] page= : " + (html.match(/[?&]page=\d+/g) || []).slice(0, 4).join(" ") + " | pn= : " + (html.match(/[?&]pn=\d+/g) || []).slice(0, 2).join(" "));
    } catch (e) { console.log("[page] erreur " + e.message); }
  }
})();
