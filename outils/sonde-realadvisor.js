// Sonde images RealAdvisor : comment les photos sont-elles adressees ? (une requete, aucun parametre)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const URL0 = (process.env.URLS || "https://realadvisor.ch/fr/acheter/commune-jaun").split(/\s+/)[0];
function flux(h) { let o = ""; for (const m of h.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { o += JSON.parse(m[1]); } catch (e) {} } return o; }
function objetApres(s, idx) {
  const i = s.indexOf("{", idx); let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) { const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return s.slice(i, j + 1); } }
  return null;
}
(async () => {
  console.log("== Sonde images RealAdvisor " + new Date().toISOString() + " ==\n" + URL0);
  const r = await fetch(URL0, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
  const h = await r.text(); const f = flux(h);
  console.log("HTTP " + r.status + " | html " + h.length + " | flux " + f.length);
  const m = f.match(/"listing":\{/); const l = JSON.parse(objetApres(f, m.index));
  const im = l.images && l.images[0]; console.log("[image 0] " + JSON.stringify(im).slice(0, 300));
  const base = im.file_name.split("/").pop();
  console.log("[basename] " + base);
  for (const [nom, src] of [["html", h], ["flux", f]]) {
    let n = 0, i = -1; while ((i = src.indexOf(base, i + 1)) >= 0 && n < 2) { n++; console.log("[" + nom + " contexte " + n + "] " + src.slice(Math.max(0, i - 260), i + 120).replace(/\s+/g, " ")); }
    if (n === 0) console.log("[" + nom + "] basename absent");
  }
  const urlsImg = [...new Set([...h.matchAll(/https:\/\/img\.realadvisor\.ch\/[^"'\s,)\\]+/g)].map((x) => x[0].replace(/&amp;/g, "&")))];
  console.log("[img.realadvisor.ch] " + urlsImg.length + " URL distinctes");
  const dec = (u) => { const m = u.match(/\/q:\d+\/([A-Za-z0-9_-]+=*)\.(?:webp|jpg|png)/); if (!m) return null; try { return Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch (e) { return null; } };
  const sources = [...new Set(urlsImg.map(dec).filter(Boolean))];
  console.log("[sources decodees] " + sources.length);
  const motifs = {}; sources.forEach((x) => { const k = x.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<uuid>").replace(/[A-Z0-9]{20,}/g, "<H>").slice(0, 110); motifs[k] = (motifs[k] || 0) + 1; });
  console.log("[motifs de chemin] " + JSON.stringify(motifs, null, 1).slice(0, 1200));
  const trouve = sources.filter((x) => x.includes(base));
  console.log("[sources contenant le basename] " + trouve.length + "\n   " + trouve.slice(0, 3).join("\n   "));
  const exemple = urlsImg.find((u) => (dec(u) || "").includes(base));
  console.log("[URL imgproxy complete pour l'image 0] " + exemple);
})();
