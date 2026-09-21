// Diagnostic photos RealAdvisor : forme du champ images et accessibilite reelle des URL (avec/sans Referer).
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const PAGES = (process.env.URLS || "https://realadvisor.ch/fr/acheter/commune-jaun https://realadvisor.ch/fr/acheter/ville-bulle").split(/\s+/).filter(Boolean);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function flux(h) { let o = ""; for (const m of h.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { o += JSON.parse(m[1]); } catch (e) {} } return o; }
function objetApres(s, idx) {
  const i = s.indexOf("{", idx); let d = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) { const c = s[j];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (d === 0) return s.slice(i, j + 1); } }
  return null;
}
function urlImg(im) {
  const src = "https://storage.googleapis.com/" + (im.bucket_name || "aggregator-images") + "/" + im.file_name;
  return { src, imgproxy: "https://img.realadvisor.ch/_/rs:fill:600:0:1:0/q:60/" + Buffer.from(src, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_") + ".webp" };
}
async function tester(u, entetes) {
  try {
    const r = await fetch(u, { headers: Object.assign({ "User-Agent": UA }, entetes), redirect: "follow" });
    const b = Buffer.from(await r.arrayBuffer());
    return "HTTP " + r.status + " | " + (r.headers.get("content-type") || "-") + " | " + b.length + " octets | debut " + b.subarray(0, 4).toString("hex");
  } catch (e) { return "erreur " + e.message; }
}
(async () => {
  console.log("== Diagnostic photos " + new Date().toISOString() + " ==");
  const echantillon = [];
  for (const page of PAGES) {
    const r = await fetch(page, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9" } });
    const f = flux(await r.text());
    const forms = {}; let n = 0;
    for (const m of f.matchAll(/"listing":\{/g)) {
      const o = objetApres(f, m.index); if (!o) continue;
      let l; try { l = JSON.parse(o); } catch (e) { continue; }
      n++;
      const t = Array.isArray(l.images) ? (l.images.length ? "tableau(" + (l.images[0].file_name ? "file_name" : "sans file_name") + ")" : "tableau vide") : typeof l.images + ":" + String(l.images).slice(0, 12);
      forms[t] = (forms[t] || 0) + 1;
      if (Array.isArray(l.images) && l.images[0] && l.images[0].file_name && echantillon.length < 3) echantillon.push(l.images[0]);
    }
    console.log(page + " -> HTTP " + r.status + " | annonces " + n + " | forme du champ images : " + JSON.stringify(forms));
    await pause(1500);
  }
  for (const im of echantillon) {
    const u = urlImg(im);
    console.log("\n[image] " + im.file_name.slice(0, 70) + " (bucket " + im.bucket_name + ")");
    console.log("  imgproxy sans Referer : " + await tester(u.imgproxy, {}));
    console.log("  imgproxy Referer app  : " + await tester(u.imgproxy, { Referer: "https://jm-immo-cl.jadorigor.workers.dev/" }));
    console.log("  imgproxy Referer site : " + await tester(u.imgproxy, { Referer: "https://realadvisor.ch/" }));
    console.log("  source GCS directe    : " + await tester(u.src, {}));
    await pause(800);
  }
})();
