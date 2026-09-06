const base = "https://api3.geo.admin.ch/rest/services/api/SearchServer";
async function chercher(q, origins) {
  const u = base + "?searchText=" + encodeURIComponent(q) + "&type=locations&limit=4&sr=4326"
    + (origins ? "&origins=" + origins : "");
  const r = await fetch(u, { headers: { "User-Agent": "JMImmo/1.0" } });
  const j = await r.json();
  return (j.results || []).map((x) => ({
    label: String(x.attrs.label).replace(/<[^>]+>/g, ""),
    origin: x.attrs.origin, lat: Math.round(x.attrs.lat * 1e4) / 1e4, lon: Math.round(x.attrs.lon * 1e4) / 1e4
  }));
}
(async () => {
  for (const o of ["gg25,zipcode,gazetteer", "gazetteer", ""]) {
    console.log("\n===== origins=" + (o || "(defaut)") + " =====");
    for (const q of ["Cabbio", "Besazio", "Rancate", "Albeuve", "Les Brenets", "Zzzinexistant"]) {
      try {
        const r = await chercher(q, o);
        console.log("  " + q.padEnd(15) + JSON.stringify(r.slice(0, 2)));
      } catch (e) { console.log("  " + q + " ERREUR " + e.message); }
    }
  }
})();
