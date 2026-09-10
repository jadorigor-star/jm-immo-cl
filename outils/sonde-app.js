const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };
const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
(async () => {
  const r = await (await fetch(BASE + "/api/search?limit=1000", { headers: { "X-Espace": "principal" } })).json();
  const vus = new Set(); const cibles = [];
  for (const b of r.results) for (const s of (b.sources || [])) {
    const d = (s.url || "").split("/")[2] || "";
    const cle = d + "|" + ((vus.get ? 0 : 0));
    if (!s.url) continue;
    const n = cibles.filter((c) => c.d === d).length;
    if (n < 2) cibles.push({ d, url: s.url, bien: b.locality });
  }
  console.log("liens a tester : " + cibles.length);
  const res = {};
  for (const c of cibles) {
    let code = "ERR";
    try {
      const rep = await fetch(c.url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) });
      code = rep.status;
      if (code === 200) {
        const t = (await rep.text()).toLowerCase();
        if (/listing is gone|n'existe plus|non piu disponibile|no longer available|objet vendu|page introuvable|404/.test(t.slice(0, 60000))) code = "200 mais retiré";
      }
    } catch (e) { code = "ERR " + String(e.message).slice(0, 22); }
    res[code] = (res[code] || 0) + 1;
    if (String(code) !== "200") console.log("  " + String(code).padEnd(18) + c.url.slice(0, 92));
  }
  console.log("\n=== SYNTHESE ===");
  for (const k of Object.keys(res).sort()) console.log("  " + String(k).padEnd(20) + res[k]);
})();
