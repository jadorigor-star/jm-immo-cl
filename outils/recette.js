const base = "https://jm-immo-cl.jadorigor.workers.dev";
const TEST = "esp-recette01";
let ok = 0, ko = 0;

async function ap(chemin, espace, opts) {
  const o = Object.assign({}, opts || {});
  o.headers = Object.assign({}, o.headers || {}, { "X-Espace": espace });
  const r = await fetch(base + chemin, o);
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch (e) {}
  return { code: r.status, texte: t, json: j };
}
function verifier(nom, condition, detail) {
  if (condition) { ok++; console.log("  OK   " + nom); }
  else { ko++; console.log("  ECHEC " + nom + (detail ? " -> " + detail : "")); }
}
const post = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

(async () => {
  // remise a zero de l'espace de recette pour un test reproductible
  await ap("/api/preferences", TEST, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budget_max: 9000000, surface_min: 0, rooms_min: 0, cachet_required: 0,
      types_allowed: [], regions_allowed: [], weights: { deal: 4, retraite: 2, locatif: 2, cachet: 3, risk: 3, accessibilite: 3 },
      origine_trajet: "Fribourg", opportunity_threshold: 70, access_good_threshold_min: 12 }) });

  console.log("=== 1. Points d'entree ===");
  for (const c of ["/", "/api/health", "/api/stats", "/api/sources", "/api/preferences", "/api/search", "/api/ecartes", "/api/vendus", "/api/baisses"]) {
    const r = await ap(c, TEST);
    verifier(c.padEnd(18) + " HTTP " + r.code, r.code === 200);
  }

  console.log("=== 2. Tris et filtres ===");
  for (const tri of ["jmfit", "price_asc", "price_desc", "recent", "access", "surface"]) {
    const r = await ap("/api/search?sort=" + tri, TEST);
    verifier("tri " + tri.padEnd(11) + " (" + (r.json ? r.json.count : "?") + " biens)", r.code === 200 && r.json && Array.isArray(r.json.results));
  }
  const filtres = await ap("/api/search?budget_max=400000&rooms_min=3&q=lugano", TEST);
  verifier("filtres combines", filtres.code === 200 && filtres.json);

  console.log("=== 3. Actions personnelles (espace de recette) ===");
  const refFav = (await ap("/api/search?favoris=1", "principal")).json.count;
  const refEc = (await ap("/api/ecartes", "principal")).json.results.length;
  console.log("  (reference espace principal : " + refFav + " favoris, " + refEc + " ecartes)");
  const restes = await ap("/api/ecartes", TEST);
  for (const r of (restes.json.results || [])) await ap("/api/restore", TEST, post({ bien_id: r.bien_id }));
  const avant = await ap("/api/search", TEST);
  const cible = avant.json.results[0];
  verifier("un bien de reference existe", !!cible, "aucun bien");
  if (cible) {
    await ap("/api/favori", TEST, post({ bien_id: cible.id }));
    const favApres = await ap("/api/search?favoris=1", TEST);
    verifier("ajout favori", favApres.json.count === 1, "compte=" + favApres.json.count);

    await ap("/api/discard", TEST, post({ bien_id: cible.id }));
    const ec = await ap("/api/ecartes", TEST);
    verifier("ecarter", (ec.json.results || []).length === 1);
    const favVide = await ap("/api/search?favoris=1", TEST);
    verifier("ecarter retire des favoris", favVide.json.count === 0);
    const listeSansEcarte = await ap("/api/search", TEST);
    verifier("bien ecarte masque de la liste", !listeSansEcarte.json.results.some((b) => b.id === cible.id));

    await ap("/api/restore", TEST, post({ bien_id: cible.id }));
    const ec2 = await ap("/api/ecartes", TEST);
    verifier("restaurer", (ec2.json.results || []).length === 0);

    await ap("/api/marquer-vu", TEST, post({ bien_id: cible.id }));
    const apresVu = await ap("/api/search", TEST);
    const b2 = apresVu.json.results.find((b) => b.id === cible.id);
    verifier("marquer vu (is_new passe a false)", b2 && b2.is_new === false, "is_new=" + (b2 && b2.is_new));
  }

  console.log("=== 4. Preferences par espace ===");
  const pr = await ap("/api/preferences", TEST);
  const modif = Object.assign({}, pr.json, { budget_max: 333000, opportunity_threshold: 77 });
  const put = await ap("/api/preferences", TEST, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modif) });
  verifier("ecriture preferences", put.code === 200, "HTTP " + put.code + " | " + put.texte.slice(0, 220));
  const relu = await ap("/api/preferences", TEST);
  verifier("relecture preferences", relu.json.budget_max === 333000 && relu.json.opportunity_threshold === 77,
    "budget=" + relu.json.budget_max + " seuil=" + relu.json.opportunity_threshold);
  const principal = await ap("/api/preferences", "principal");
  verifier("espace principal intact", principal.json.budget_max !== 333000, "budget principal=" + principal.json.budget_max);

  console.log("=== 5. Non-regression de l'espace principal ===");
  const fp2 = (await ap("/api/search?favoris=1", "principal")).json.count;
  const ep2 = (await ap("/api/ecartes", "principal")).json.results.length;
  verifier("favoris principal inchanges (" + refFav + " -> " + fp2 + ")", fp2 === refFav);
  verifier("ecartes principal inchanges (" + refEc + " -> " + ep2 + ")", ep2 === refEc);
  const prefP = await ap("/api/preferences", "principal");
  verifier("preferences principal non polluees", prefP.json.budget_max !== 9000000 && prefP.json.budget_max !== 333000,
    "budget=" + prefP.json.budget_max);

  console.log("=== 6. Robustesse ===");
  const sansEntete = await fetch(base + "/api/search");
  verifier("appel sans en-tete d'espace", sansEntete.status === 200);
  const bizarre = await ap("/api/search", "../../etc/passwd' OR 1=1--");
  verifier("identifiant d'espace hostile neutralise", bizarre.code === 200);

  // nettoyage de l'espace de recette
  if (cible) { await ap("/api/restore", TEST, post({ bien_id: cible.id })); await ap("/api/favori/" + encodeURIComponent(cible.id), TEST, { method: "DELETE" }); }

  console.log("\n=== RESULTAT : " + ok + " OK, " + ko + " ECHEC ===");
})();
