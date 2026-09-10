const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "it-CH,it;q=0.9" };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) }); return { s: r.status, u: r.url, h: await r.text() }; } catch (e) { return { s: "ERR", h: "" }; } };
(async () => {
  const page = "https://www.casebertolotti.ch/it/ricerca-immobili";
  const r = await get(page);
  const brut = [...new Set([...r.h.matchAll(/href="([^"]*immobili\/[^"]{3,60})"/g)].map((m) => m[1]))];
  console.log("lien brut : " + brut[0]);
  console.log("resolu par URL() : " + new URL(brut[0], r.u).href);
  const variantes = [
    new URL(brut[0], r.u).href,
    "https://www.casebertolotti.ch/it/immobili/cabe05-oc",
    "https://www.casebertolotti.ch/immobili/cabe05-oc",
    "https://www.casebertolotti.ch/it/ricerca-immobili/immobili/cabe05-oc",
    "https://www.casebertolotti.ch/it/immobili/cabe05"
  ];
  for (const v of [...new Set(variantes)]) {
    const d = await get(v);
    let info = "";
    if (d.s === 200) {
      const t = (/<title>([^<]{4,120})/i.exec(d.h) || [])[1] || "";
      const p = (/CHF[\s'’]*([\d'’\s]{5,})/i.exec(d.h) || [])[1] || "aucun prix";
      info = " | " + d.h.length + " o | " + t.slice(0, 46) + " | prix " + String(p).trim();
    }
    console.log(String(d.s).padEnd(5) + v.slice(30).padEnd(48) + info);
  }
})();
