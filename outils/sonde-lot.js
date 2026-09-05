// Sonde par lot : diagnostique plusieurs sources muettes en une passe.
const cibles = JSON.parse(require('fs').readFileSync('outils/cibles.json', 'utf8'));

function compte(re, s) { const m = s.match(re); return m ? m.length : 0; }

(async () => {
  const lignes = ["Sonde du " + new Date().toISOString(), ""];
  for (const c of cibles) {
    lignes.push("=".repeat(64));
    lignes.push("#" + c.id + "  " + c.nom);
    lignes.push(c.url);
    try {
      const r = await fetch(c.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
                   "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.8,it;q=0.7" },
        redirect: "follow"
      });
      const html = await r.text();
      lignes.push("HTTP " + r.status + " | " + html.length + " octets");
      if (r.status !== 200) { lignes.push(""); continue; }

      // donnees structurees
      const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
      const types = new Set();
      let ldAvecPrix = 0;
      for (const m of ld) {
        try {
          const d = JSON.parse(m[1].trim());
          for (const o of (Array.isArray(d) ? d : [d])) {
            if (o && o["@type"]) types.add(String(o["@type"]));
            if (JSON.stringify(o).match(/"price"\s*:\s*"?\d{5,}/)) ldAvecPrix++;
          }
        } catch (e) {}
      }
      lignes.push("JSON-LD : " + ld.length + " bloc(s), types=[" + [...types].join(",") + "], avec prix=" + ldAvecPrix);
      lignes.push("PINIA : " + (html.includes("window.__PINIA_STATE__") ? "oui" : "non")
        + " | NEXT_DATA : " + (html.includes("__NEXT_DATA__") ? "oui" : "non")
        + " | casawp : " + (html.toLowerCase().includes("casawp") ? "oui" : "non"));
      lignes.push("prix CHF visibles : " + compte(/CHF[\s'’.\u00a0]*\d[\d'’.\s]{4,}/g, html)
        + " | 'kaufen|acheter|vendre|vendita' : " + compte(/kaufen|acheter|à vendre|in vendita/gi, html));

      // liens candidats vers des annonces
      const liens = [...html.matchAll(/href="([^"]{6,200})"/g)].map(m => m[1]);
      const motifs = [/\/immobilie[nr]?\//i, /\/objekt/i, /\/object/i, /\/bien/i, /\/annonce/i, /\/property/i, /\/immobile/i, /\/vendre|\/acheter|\/kaufen|\/vendita/i, /\/listing/i, /id=\d{3,}/i];
      const retenus = [...new Set(liens.filter(u => motifs.some(m => m.test(u))))];
      lignes.push("liens candidats : " + retenus.length);
      retenus.slice(0, 5).forEach(u => lignes.push("   " + u.slice(0, 120)));
      if (html.includes("window.__PINIA_STATE__")) {
        const seg = html.slice(html.indexOf("window.__PINIA_STATE__"), html.indexOf("window.__PINIA_STATE__") + 400000);
        lignes.push("offerType BUY : " + compte(/"offerType"\s*:\s*"BUY"/g, seg) + " | RENT : " + compte(/"offerType"\s*:\s*"RENT"/g, seg));
      }
    } catch (e) {
      lignes.push("ERREUR : " + e.message);
    }
    lignes.push("");
  }
  console.log(lignes.join("\n"));
})();
