(async () => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch("https://jm-immo-cl.jadorigor.workers.dev/api/reanalyser-localites?limit=140", { headers: { "X-Espace": "principal" } });
    const j = await r.json();
    console.log("passe " + (i + 1) + " : HTTP " + r.status + " | examinees=" + j.examinees + " corrigees=" + j.corrigees);
    (j.details || []).forEach((d) => console.log("   " + d));
    if (!j.corrigees) break;
  }
})();
