const cibles = [
  ["page d'accueil", "https://jm-immo-cl.jadorigor.workers.dev/"],
  ["/api/health",    "https://jm-immo-cl.jadorigor.workers.dev/api/health"],
  ["/api/stats",     "https://jm-immo-cl.jadorigor.workers.dev/api/stats"],
  ["/api/search",    "https://jm-immo-cl.jadorigor.workers.dev/api/search"],
  ["/api/preferences","https://jm-immo-cl.jadorigor.workers.dev/api/preferences"],
  ["/api/sources",   "https://jm-immo-cl.jadorigor.workers.dev/api/sources"]
];
(async () => {
  for (const [nom, url] of cibles) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      const txt = await r.text();
      console.log(nom.padEnd(18), "HTTP " + r.status, "| " + (Date.now() - t0) + " ms | " + txt.length + " octets | " + txt.slice(0, 150).replace(/\s+/g, " "));
    } catch (e) {
      console.log(nom.padEnd(18), "ECHEC apres " + (Date.now() - t0) + " ms : " + e.message);
    }
    clearTimeout(to);
  }
})();
