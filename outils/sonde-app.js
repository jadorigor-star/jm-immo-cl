(async () => {
  for (let i = 1; i <= 6; i++) {
    try {
      const r = await fetch("https://jm-immo-cl.jadorigor.workers.dev/api/refresh?force=1&recompute=0", { signal: AbortSignal.timeout(250000) });
      const j = await r.json();
      const n = (j.ingestion || []).reduce((a, x) => a + (x.stored || 0), 0);
      console.log("passe " + i + " : " + n + " annonces reecrites");
    } catch (e) { console.log("passe " + i + " : " + e.message); }
  }
  const st = await (await fetch("https://jm-immo-cl.jadorigor.workers.dev/api/refresh")).json();
  console.log("recalcul final : " + JSON.stringify(st).slice(0, 200));
})();
