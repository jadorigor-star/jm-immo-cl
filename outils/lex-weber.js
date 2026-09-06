// Telecharge l'inventaire officiel des logements (ARE) et extrait la part
// de residences secondaires par commune.
const fs = require("fs");
const XLSX = require("xlsx");

const PAGES = [
  "https://www.are.admin.ch/are/fr/home/developpement-et-amenagement-du-territoire/droit-de-l-amenagement-du-territoire/residences-secondaires.html",
  "https://www.are.admin.ch/fr/inventaire-des-logements",
  "https://www.are.admin.ch/de/wohnungsinventar"
];
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

(async () => {
  let lien = null;
  for (const p of PAGES) {
    try {
      const r = await fetch(p, { headers: UA, redirect: "follow" });
      console.log("page " + p + " -> HTTP " + r.status);
      if (r.status !== 200) continue;
      const html = await r.text();
      const liens = [...html.matchAll(/href="([^"]+\.xlsx)"/gi)].map((m) => m[1]);
      console.log("  xlsx trouves : " + liens.length);
      liens.slice(0, 6).forEach((l) => console.log("   " + l.slice(0, 130)));
      if (liens.length) {
        lien = liens[0].startsWith("http") ? liens[0] : new URL(liens[0], p).href;
        break;
      }
    } catch (e) { console.log("  erreur : " + e.message); }
  }
  if (!lien) { console.log("AUCUN FICHIER TROUVE"); return; }

  console.log("\ntelechargement : " + lien);
  const r = await fetch(lien, { headers: UA });
  console.log("HTTP " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync("/tmp/inventaire.xlsx", buf);
  console.log("taille : " + buf.length + " octets");

  const wb = XLSX.readFile("/tmp/inventaire.xlsx");
  console.log("feuilles : " + wb.SheetNames.join(", "));
  const ws = wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
  const lignes = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log("lignes : " + lignes.length);
  for (let i = 0; i < Math.min(8, lignes.length); i++) {
    console.log("  [" + i + "] " + JSON.stringify(lignes[i]).slice(0, 260));
  }
  // reperage de la ligne d'en-tete
  let iEnt = lignes.findIndex((l) => l.some((c) => /gemeinde|commune|comune/i.test(String(c))));
  console.log("\nen-tete ligne " + iEnt + " : " + JSON.stringify(lignes[iEnt]));
  const ent = lignes[iEnt].map((c) => String(c).trim());
  const iNom = ent.findIndex((c) => /gemeindename|nom.*commune|name/i.test(c));
  const iPart = ent.findIndex((c) => /anteil|proportion|quota|%/i.test(c));
  const iStatut = ent.findIndex((c) => /status|statut|stato/i.test(c));
  console.log("colonnes -> nom=" + iNom + " part=" + iPart + " statut=" + iStatut);

  const communes = [];
  for (const l of lignes.slice(iEnt + 1)) {
    const nom = String(l[iNom] || "").trim();
    if (!nom) continue;
    const part = parseFloat(String(l[iPart]).replace(",", "."));
    communes.push({ nom, part: isFinite(part) ? part : null, statut: String(l[iStatut] || "").trim() });
  }
  console.log("communes lues : " + communes.length);
  const auDessus = communes.filter((c) => c.part !== null && c.part > 20);
  console.log("communes au-dessus de 20% : " + auDessus.length);
  console.log("\nexemples : " + JSON.stringify(communes.slice(0, 3)));
  fs.writeFileSync("outils/lex-weber-communes.json", JSON.stringify(communes, null, 0));
  console.log("fichier ecrit : outils/lex-weber-communes.json");
})();
