const adresses = [
  "Strada d'Indémen 28, 6574 Vira (Gambarogno)",
  "Strada dal Castèl 20, 6574 Vira (Gambarogno)",
  "Via Cabella, 6863 Besazio"
];
async function geoAdmin(q) {
  const u = "https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=address&limit=3&sr=4326&searchText=" + encodeURIComponent(q);
  const r = await fetch(u, { headers: { "User-Agent": "JMImmo/1.0" } });
  const j = await r.json();
  return (j.results || []).map((x) => ({ label: String(x.attrs.label).replace(/<[^>]+>/g, ""), lat: x.attrs.lat, lon: x.attrs.lon }));
}
async function arret(lat, lon) {
  const r = await fetch("https://transport.opendata.ch/v1/locations?x=" + lat + "&y=" + lon + "&type=station");
  const j = await r.json();
  return (j.stations || []).filter((s) => s.coordinate && typeof s.coordinate.x === "number").slice(0, 4)
    .map((s) => s.name + " (" + Math.round(1000 * Math.hypot((s.coordinate.x - lat) * 111, (s.coordinate.y - lon) * 78)) + " m)");
}
(async () => {
  for (const a of adresses) {
    console.log("\n" + a);
    const g = await geoAdmin(a);
    if (!g.length) { console.log("  geo.admin : aucun resultat"); continue; }
    for (const x of g.slice(0, 2)) console.log("  geo.admin -> " + x.label.slice(0, 62) + "  [" + x.lat.toFixed(5) + ", " + x.lon.toFixed(5) + "]");
    const st = await arret(g[0].lat, g[0].lon);
    console.log("  arrets les plus proches : " + st.join(" | "));
  }
})();
