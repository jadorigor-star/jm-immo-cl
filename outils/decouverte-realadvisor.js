// Decouverte RealAdvisor : structure des lignes, sous-pages par type, cantons, districts, communes.
// Aucun parametre d'URL (robots.txt), 2 s entre deux requetes.
const fs = require("fs");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const B = "https://realadvisor.ch";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let nReq = 0;
async function get(path) {
  await pause(2000); nReq++;
  const r = await fetch(B + path, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
  return { status: r.status, html: await r.text() };
}
function flux(h) { let o = ""; for (const m of h.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { o += JSON.parse(m[1]); } catch (e) {} } return o; }
function objetApres(s, idx) {
  const i = s.indexOf("{", idx); let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) { const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return { txt: s.slice(i, j + 1), fin: j + 1 }; } }
  return null;
}
function annonces(f) {
  const out = [];
  for (const m of f.matchAll(/"listing":\{/g)) { const o = objetApres(f, m.index); if (o) { try { out.push({ l: JSON.parse(o.txt), fin: o.fin, deb: m.index }); } catch (e) {} } }
  return out;
}
const titre = (h) => ((h.match(/<title>([^<]*)/i) || [])[1] || "").replace(/&#x27;/g, "'").slice(0, 90);
const liens = (h) => [...new Set([...h.matchAll(/href="(\/fr\/acheter\/[^"#?]+)"/g)].map((m) => m[1]))];

(async () => {
  console.log("== Decouverte RealAdvisor " + new Date().toISOString() + " ==");
  // 1. structure des lignes
  let p = await get("/fr/acheter/canton-fribourg");
  let f = flux(p.html); let an = annonces(f);
  console.log("\n[fribourg] HTTP " + p.status + " | " + titre(p.html) + " | annonces " + an.length);
  const dist = {}; an.forEach((a) => { const k = a.l.property_main_type + "/" + a.l.property_type; dist[k] = (dist[k] || 0) + 1; });
  console.log("[types] " + JSON.stringify(dist));
  console.log("[portal/state] " + [...new Set(an.map((a) => a.l.portal + "/" + a.l.state))].join(", "));
  an.slice(0, 3).forEach((a, i) => {
    console.log("[ligne " + i + "] avant : " + f.slice(Math.max(0, a.deb - 160), a.deb).replace(/\s+/g, " "));
    console.log("[ligne " + i + "] apres : " + f.slice(a.fin, a.fin + 420).replace(/\s+/g, " "));
    console.log("[ligne " + i + "] clickout=" + a.l.clickout_url + " | desc=" + a.l.description + " | rooms=" + a.l.number_of_rooms + " | surf=" + a.l.living_surface + " | lat=" + a.l.lat);
  });
  const d0 = String(an[0] && an[0].l.description || "").replace("$", "");
  const im = f.indexOf("\n" + d0 + ":"); const im2 = f.startsWith(d0 + ":") ? 0 : im;
  console.log("[description " + d0 + "] " + (im2 >= 0 ? f.slice(im2, im2 + 260).replace(/\s+/g, " ") : "ligne introuvable"));
  const lc = liens(p.html);
  console.log("[canton fribourg] liens : district=" + lc.filter((x) => /district-/.test(x)).length + " commune=" + lc.filter((x) => /\/(commune|ville)-/.test(x)).length + " npa=" + lc.filter((x) => /\/\d{4}-/.test(x) && x.split("/").length === 4).length);
  console.log("[districts fribourg] " + lc.filter((x) => /district-/.test(x)).join(" "));

  // 2. grande commune : pages par type
  for (const u of ["/fr/acheter/ville-bulle", "/fr/acheter/ville-bulle/appartement", "/fr/acheter/ville-bulle/maison"]) {
    const r = await get(u); const a = annonces(flux(r.html));
    console.log("[" + u + "] HTTP " + r.status + " | " + titre(r.html) + " | annonces " + a.length);
  }

  // 3. cantons
  const cantons = ["canton-neuchatel", "canton-jura", "canton-tessin", "canton-ticino", "canton-vaud", "canton-berne", "canton-bern"];
  const districts = {};
  for (const c of cantons) {
    const r = await get("/fr/acheter/" + c);
    const l = liens(r.html); const d = l.filter((x) => /district-/.test(x));
    console.log("[" + c + "] HTTP " + r.status + " | " + titre(r.html) + " | annonces " + annonces(flux(r.html)).length + " | districts " + d.length);
    if (r.status === 200) districts[c] = d;
  }
  districts["canton-fribourg"] = lc.filter((x) => /district-/.test(x));
  for (const c of Object.keys(districts)) console.log("[districts " + c + "] " + districts[c].map((x) => x.replace("/fr/acheter/district-", "")).join(", "));

  // 4. districts du perimetre -> communes
  const PERIM = /gruy|veveyse|sarine|sense|singine|franches|neuch|boudry|val-de|locle|chaux|lugano|locarno|bellinzona|mendrisio|vallemaggia|riviera|blenio|leventina|aigle|enhaut|simmental|ticino|tessin/;
  const sortie = {};
  for (const c of Object.keys(districts)) for (const d of districts[c]) {
    if (!PERIM.test(d)) continue;
    const r = await get(d);
    const l = liens(r.html).filter((x) => /\/(commune|ville)-[^/]+$/.test(x) || (/\/\d{4}-[^/]+$/.test(x)));
    const a = annonces(flux(r.html)).length;
    console.log("[" + d + "] HTTP " + r.status + " | " + titre(r.html) + " | annonces " + a + " | communes liees " + l.length);
    sortie[d] = { status: r.status, annonces: a, communes: l };
  }
  fs.writeFileSync("diagnostic/realadvisor-urls.json", JSON.stringify({ districts, sortie }, null, 1));
  console.log("\nrequetes : " + nReq);
})();
