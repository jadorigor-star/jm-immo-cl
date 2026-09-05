const base = "https://jm-immo-cl.jadorigor.workers.dev";
async function ap(chemin, espace, opts) {
  const o = Object.assign({}, opts || {});
  o.headers = Object.assign({}, o.headers || {}, espace ? { "X-Espace": espace } : {});
  const r = await fetch(base + chemin, o);
  const t = await r.text();
  return { code: r.status, texte: t };
}
(async () => {
  console.log("--- isolation des espaces ---");
  const a = await ap("/api/preferences", "principal");
  const b = await ap("/api/preferences", "esp-amie01");
  console.log("principal :", a.texte.slice(0, 110));
  console.log("amie      :", b.texte.slice(0, 110));

  const favA = await ap("/api/search?favoris=1", "principal");
  const favB = await ap("/api/search?favoris=1", "esp-amie01");
  console.log("favoris principal :", JSON.parse(favA.texte).count);
  console.log("favoris amie      :", JSON.parse(favB.texte).count);

  const ecA = await ap("/api/ecartes", "principal");
  const ecB = await ap("/api/ecartes", "esp-amie01");
  const nA = (JSON.parse(ecA.texte).results || []).length;
  const nB = (JSON.parse(ecB.texte).results || []).length;
  console.log("ecartes principal :", nA, "| ecartes amie :", nB);

  const sA = JSON.parse((await ap("/api/search", "principal")).texte).count;
  const sB = JSON.parse((await ap("/api/search", "esp-amie01")).texte).count;
  console.log("biens visibles principal :", sA, "| amie :", sB, "(l'amie voit aussi les biens ecartes par JM)");
})();
