(async () => {
  for (const terme of ["Rancate", "Cabbio", "Besazio", "Scudellate"]) {
    const u = "https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=gazetteer&limit=6&sr=4326&searchText=" + encodeURIComponent(terme);
    const r = await fetch(u, { headers: { "User-Agent": "JMImmo/1.0" } });
    const j = await r.json();
    console.log("\n" + terme + "  HTTP " + r.status + "  resultats=" + (j.results || []).length);
    for (const x of (j.results || []).slice(0, 3)) {
      const brut = String(x.attrs.label);
      const label = brut.replace(/<[^>]+>/g, "");
      const mm = /^Populated Place\s+(.+?)\s+\(([A-Z]{2})\)\s*-\s*(.+)$/.exec(label);
      console.log("   brut   : " + JSON.stringify(brut.slice(0, 90)));
      console.log("   nettoye: " + JSON.stringify(label.slice(0, 90)));
      console.log("   regex  : " + (mm ? JSON.stringify(mm.slice(1)) : "AUCUNE CORRESPONDANCE"));
    }
  }
})();
