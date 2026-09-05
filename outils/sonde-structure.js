// Sonde : telecharge une page et decrit la structure JSON d'une annonce.
const URL_CIBLE = process.env.URL_CIBLE;
const MARQUEUR = "window.__PINIA_STATE__ = ";

function chemins(obj, prefixe = "", sortie = [], profondeur = 0) {
  if (profondeur > 6 || obj === null || obj === undefined) return sortie;
  if (Array.isArray(obj)) {
    if (obj.length) chemins(obj[0], prefixe + "[0]", sortie, profondeur + 1);
    else sortie.push(prefixe + " = [] (vide)");
    return sortie;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) chemins(obj[k], prefixe ? prefixe + "." + k : k, sortie, profondeur + 1);
    return sortie;
  }
  let v = String(obj);
  if (v.length > 110) v = v.slice(0, 110) + "…";
  sortie.push(prefixe + " = " + v);
  return sortie;
}

(async () => {
  const r = await fetch(URL_CIBLE, { headers: { "User-Agent": "Mozilla/5.0 (compatible; JMImmo/1.0)" } });
  const html = await r.text();
  const lignes = ["URL : " + URL_CIBLE, "HTTP : " + r.status, "Taille : " + html.length, ""];
  const i = html.indexOf(MARQUEUR);
  if (i < 0) { lignes.push("MARQUEUR PINIA ABSENT"); console.log(lignes.join("\n")); return; }
  let j = i + MARQUEUR.length, prof = 0, debut = j, fini = false;
  for (; j < html.length && !fini; j++) {
    if (html[j] === "{") prof++;
    else if (html[j] === "}") { prof--; if (prof === 0) fini = true; }
  }
  let etat;
  try { etat = JSON.parse(html.slice(debut, j)); }
  catch (e) { lignes.push("JSON illisible : " + e.message); console.log(lignes.join("\n")); return; }

  const candidats = [etat?.search?.fullSearch?.result?.listings, etat?.agencyProfile?.search?.fullSearch?.result?.listings];
  const liste = candidats.find((c) => Array.isArray(c) && c.length);
  if (!liste) { lignes.push("Aucune liste d'annonces trouvee. Cles racine : " + Object.keys(etat).join(", ")); console.log(lignes.join("\n")); return; }

  lignes.push("Nombre d'annonces : " + liste.length, "", "=== STRUCTURE DE LA PREMIERE ANNONCE ===");
  lignes.push(...chemins(liste[0]));
  console.log(lignes.join("\n"));
})();
