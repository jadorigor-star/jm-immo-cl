const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
(async () => {
  const st = await (await fetch(BASE + "/api/stats", { headers: { "X-Espace": "principal" } })).json();
  console.log("/api/stats : " + JSON.stringify(st));
  const r = await fetch(BASE + "/api/sources");
  const t = await r.text();
  console.log("\n/api/sources : HTTP " + r.status + " | " + t.length + " octets");
  try {
    const j = JSON.parse(t);
    const res = j.results || [];
    console.log("lignes renvoyees : " + res.length);
    const parEtat = {};
    for (const s of res) { const k = (s.enabled ? "active/" : "off/") + s.state; parEtat[k] = (parEtat[k] || 0) + 1; }
    console.log(JSON.stringify(parEtat, null, 1));
    console.log("\n5 premieres :");
    res.slice(0, 5).forEach((s) => console.log("   " + String(s.name).slice(0, 34).padEnd(36) + s.state + " | " + (s.last_productive_count || 0)));
  } catch (e) {
    console.log("REPONSE NON JSON : " + t.slice(0, 400));
  }
})();
