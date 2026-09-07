const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };
(async () => {
  const plan = (await (await fetch(BASE + "/api/plan-collecte")).json()).sources;
  const src = plan.find((s) => s.name.includes("Noirmont"));
  console.log("source : " + src.name + "\npage : " + src.pages[0]);
  const liste = await (await fetch(src.pages[0], { headers: UA })).text();
  console.log("liste : " + liste.length + " octets");
  const rep = await (await fetch(BASE + "/api/ingest-raw", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_name: src.name, url: src.pages[0], html: liste, is_list: true }) })).json();
  const liens = rep.links || [];
  console.log("liens extraits : " + liens.length);
  liens.slice(0, 3).forEach((l) => console.log("   " + l.slice(0, 100)));
  if (!liens.length) return;
  const d = await (await fetch(liens[0], { headers: UA })).text();
  console.log("\npage de detail : " + d.length + " octets");
  const t = /<title>([^<]*)<\/title>/i.exec(d);
  console.log("titre HTML : " + (t ? t[1].slice(0, 120) : "aucun"));
  const og = /og:title" content="([^"]{4,120})/.exec(d);
  console.log("og:title   : " + (og ? og[1] : "aucun"));
  const canon = /canonical"[^>]{0,80}?href="([^"]+)"/.exec(d);
  console.log("canonical  : " + (canon ? canon[1].slice(0, 110) : "aucun"));
  const res = await (await fetch(BASE + "/api/ingest-raw", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_name: src.name, url: liens[0], html: d, is_detail: true }) })).json();
  console.log("\nreponse du worker : " + JSON.stringify(res).slice(0, 300));
})();
