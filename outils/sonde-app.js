const id = "4003423036";
const formats = [
  "https://www.immoscout24.ch/buy/" + id,
  "https://www.immoscout24.ch/fr/d/" + id,
  "https://www.immoscout24.ch/fr/acheter/" + id,
  "https://www.immoscout24.ch/kaufen/" + id,
  "https://www.immoscout24.ch/de/d/" + id,
  "https://www.immoscout24.ch/it/acquistare/" + id
];
(async () => {
  for (const u of formats) {
    try {
      const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" } });
      console.log(String(r.status).padEnd(4) + (r.headers.get("location") || "").slice(0, 90).padEnd(92) + u);
    } catch (e) { console.log("ERR  " + u + " " + e.message); }
  }
})();
