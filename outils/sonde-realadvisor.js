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
  const liees = urlsImg.filter((u) => u.includes(base));
  console.log("[URL contenant le basename] " + liees.length + "\n   " + liees.slice(0, 4).join("\n   "));
  console.log("[exemples generaux]\n   " + urlsImg.slice(0, 6).join("\n   "));
  const tagOk = [...h.matchAll(/<img[^>]+img\.realadvisor\.ch[^>]*>/g)].slice(0, 1).map((x) => x[0].replace(/&amp;/g, "&").slice(0, 900));
  console.log("[balise img complete] " + tagOk.join(""));
})();
