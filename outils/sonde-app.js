(async () => {
  for (let i = 1; i <= 4; i++) {
    const r = await fetch("https://jm-immo-cl.jadorigor.workers.dev/api/refresh?force=1&recompute=0", { signal: AbortSignal.timeout(250000) });
    const j = await r.json();
    const prod = (j.ingestion || []).filter((x) => x.stored > 0);
    console.log("passe " + i + " : HTTP " + r.status + " | sources productives : " + prod.map((x) => x.source.slice(0, 22) + "=" + x.stored).join(", "));
  }
})();
