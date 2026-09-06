const cible = "https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=gazetteer&limit=6&sr=4326&searchText=Rancate";
(async () => {
  const u = "https://jm-immo-cl.jadorigor.workers.dev/api/debug-source?id=104&url=" + encodeURIComponent(cible);
  const r = await fetch(u);
  const t = await r.text();
  console.log("via le worker : HTTP " + r.status);
  console.log(t.slice(0, 900));
})();
