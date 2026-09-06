const base = "https://api3.geo.admin.ch/rest/services/api/SearchServer";
async function chercher(q) {
  const u = base + "?searchText=" + encodeURIComponent(q) + "&type=locations&origins=gg25,zipcode&limit=3&sr=4326";
  const r = await fetch(u, { headers: { "User-Agent": "JMImmo/1.0" } });
  const j = await r.json();
  const res = (j.results || []).map((x) => ({
    label: String(x.attrs.label).replace(/<[^>]+>/g, ""),
    detail: x.attrs.detail, origin: x.attrs.origin,
    lat: x.attrs.lat, lon: x.attrs.lon
  }));
  console.log(q.padEnd(16) + "HTTP " + r.status + " -> " + JSON.stringify(res.slice(0, 2)));
}
(async () => {
  for (const q of ["Cabbio", "Rancate", "Besazio", "Albeuve", "Les Brenets", "Muralto", "Saignelegier", "Zzzinexistant"]) {
    try { await chercher(q); } catch (e) { console.log(q + " ERREUR " + e.message); }
  }
})();
