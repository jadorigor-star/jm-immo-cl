const puppeteer = require("puppeteer");
const BASE = "https://jm-immo-cl.jadorigor.workers.dev";
(async () => {
  const nav = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await nav.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36");
  await page.goto("https://www.gruyere-immo.ch/acheter", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((x) => setTimeout(x, 2500));
  const liste = await page.content();
  const rep = await (await fetch(BASE + "/api/ingest-raw", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_name: "Gruyère Immo SA (site propre)", url: "https://www.gruyere-immo.ch/acheter", html: liste, is_list: true }) })).json();
  console.log("liens extraits par le worker : " + (rep.links || []).length);
  const lien = (rep.links || [])[0];
  console.log("premier lien : " + lien);
  if (!lien) { await nav.close(); return; }
  await page.goto(lien, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((x) => setTimeout(x, 2500));
  const d = await page.content();
  console.log("\npage de detail rendue : " + d.length + " octets");
  const head = d.slice(0, d.indexOf("</head>") + 7);
  console.log("taille du head : " + head.length);
  for (const re of [/<title>([^<]{4,140})/i, /og:title" content="([^"]{4,140})/i, /og:description" content="([^"]{4,200})/i, /og:image" content="([^"]{10,140})/i]) {
    const m = re.exec(head); console.log("  " + re.source.slice(0, 24) + " -> " + (m ? m[1].slice(0, 110) : "ABSENT"));
  }
  const prix = [...d.matchAll(/CHF[\s'’]*([\d'’\s]{5,})/g)].slice(0, 5).map((m) => m[0].trim());
  console.log("prix dans la page : " + JSON.stringify(prix));
  const pm = [...d.matchAll(/([\d.,]+)\s*(?:pi[eè]ces?|pces)/gi)].slice(0, 3).map((m) => m[0]);
  const sm = [...d.matchAll(/([\d']{2,6})\s*m(?:2|²)/gi)].slice(0, 3).map((m) => m[0]);
  console.log("pieces : " + JSON.stringify(pm) + " | surface : " + JSON.stringify(sm));
  const res = await (await fetch(BASE + "/api/ingest-raw", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_name: "Gruyère Immo SA (site propre)", url: lien, html: d, is_detail: true }) })).json();
  console.log("\nreponse du worker : " + JSON.stringify(res));
  await nav.close();
})();
