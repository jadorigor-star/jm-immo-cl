// Decouverte RealAdvisor v2 : clickout (portail d'origine), rattachement annonce -> URL de detail, communes par canton.
// Aucun parametre d'URL (robots.txt), 2 s entre deux requetes.
const fs = require("fs");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const B = "https://realadvisor.ch";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path) { await pause(2000); const r = await fetch(B + path, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } }); return { status: r.status, html: await r.text() }; }
function flux(h) { let o = ""; for (const m of h.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { o += JSON.parse(m[1]); } catch (e) {} } return o; }
function objetApres(s, idx) {
  const i = s.indexOf("{", idx); let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) { const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return s.slice(i, j + 1); } }
  return null;
}
function annonces(f) { const out = []; for (const m of f.matchAll(/"listing":\{/g)) { const o = objetApres(f, m.index); if (o) { try { out.push(JSON.parse(o)); } catch (e) {} } } return out; }
const liens = (h) => [...new Set([...h.matchAll(/href="(\/fr\/acheter\/[^"#?]+)"/g)].map((m) => m[1]))];
const slugType = { HOUSE: "maison", APPT: "appartement", PROP: "terrain", MFH: "immeuble", COMM: "commercial" };

(async () => {
  console.log("== Decouverte RealAdvisor v2 " + new Date().toISOString() + " ==");
  const cantons = { fribourg: "canton-fribourg", neuchatel: "canton-neuchatel", jura: "canton-jura", tessin: "canton-tessin", vaud: "canton-vaud", berne: "canton-berne" };
  const sortie = {};
  for (const [nom, slug] of Object.entries(cantons)) {
    const r = await get("/fr/acheter/" + slug);
    const f = flux(r.html); const an = annonces(f); const l = liens(r.html);
    const communes = l.filter((x) => x.split("/").length === 4 && /\/(commune|ville)-[^/]+$|\/\d{4}-[^/]+$/.test(x));
    sortie[nom] = communes;
    console.log("\n[" + nom + "] HTTP " + r.status + " | annonces " + an.length + " | communes/localites liees " + communes.length);
    if (nom === "fribourg") {
      console.log("[clickout brut 0] " + JSON.stringify(an[0].clickout_url).slice(0, 500));
      const doms = {}; an.forEach((a) => { const c = a.clickout_url; const u = c && (c.url || c.href || c.link || JSON.stringify(c)); const d = (String(u).match(/https?:\/\/([^/"]+)/) || [])[1] || "(sans url)"; doms[d] = (doms[d] || 0) + 1; });
      console.log("[clickout domaines] " + JSON.stringify(doms));
      console.log("[agences] " + [...new Set(an.map((a) => a.agency_name))].slice(0, 12).join(" | "));
      // rattachement annonce -> URL de detail
      const detail = l.filter((x) => x.split("/").length === 4 && /^\/fr\/acheter\/(maison|appartement|terrain|immeuble|commercial|hotellerie)\//.test(x));
      console.log("[detail] liens de detail sur la page : " + detail.length + " pour " + an.length + " annonces");
      let uniques = 0, multiples = 0, aucun = 0;
      for (const a of an) {
        const t = slugType[a.property_main_type] || "?";
        const c = detail.filter((x) => x.startsWith("/fr/acheter/" + t + "/") && x.includes("-" + a.postcode + "-"));
        if (c.length === 1) uniques++; else if (c.length > 1) multiples++; else aucun++;
      }
      console.log("[rattachement type+NPA] unique=" + uniques + " multiple=" + multiples + " aucun=" + aucun);
      console.log("[exemples] " + an.slice(0, 4).map((a) => a.id + " " + a.postcode + " " + a.sub_locality + " " + a.property_type + " -> " + detail.filter((x) => x.includes("-" + a.postcode + "-")).join(" ; ")).join("\n   "));
    }
  }
  fs.writeFileSync("diagnostic/realadvisor-urls.json", JSON.stringify(sortie, null, 1));
  console.log("\nfichier realadvisor-urls.json ecrit : " + Object.entries(sortie).map(([k, v]) => k + "=" + v.length).join(" "));
})();
