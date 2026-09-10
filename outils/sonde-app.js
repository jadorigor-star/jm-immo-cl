const puppeteer = require("puppeteer");
(async () => {
  const nav = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await nav.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36");
  for (const u of ["https://www.casebertolotti.ch/it/ricerca-immobili", "https://www.casebertolotti.ch/immobili/cabe05-oc"]) {
    const r = await page.goto(u, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((x) => setTimeout(x, 2500));
    const h = await page.content();
    console.log("\n=== " + u.slice(30) + " === HTTP " + r.status() + " | " + h.length + " o");
    const liens = [...new Set([...h.matchAll(/href="([^"]*immobili\/[^"]{3,60})"/g)].map((m) => m[1]))];
    if (liens.length) console.log("  annonces : " + liens.length + " -> " + liens.slice(0, 6).join(", "));
    for (const [n, re] of [
      ["og:title", /og:title"\s+content="([^"]{4,140})/i],
      ["og:description", /og:description"\s+content="([^"]{10,260})/i],
      ["og:image", /og:image"\s+content="([^"]{10,150})/i],
      ["prix", /CHF[\s'’]*([\d'’\s]{5,})/i],
      ["locali", /([\d.,]+)\s*locali/i],
      ["m2", /([\d']{2,6})\s*m(?:2|²)/i],
      ["npa+ville", /(6[0-9]{3})\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ\-' ]{2,24})/],
      ["lat", /"lat(?:itude)?"\s*:\s*"?(4[5-7]\.\d{3,})/i]
    ]) { const m = re.exec(h); console.log("  " + n.padEnd(15) + (m ? String(m[0]).slice(0, 90) : "ABSENT")); }
  }
  await nav.close();
})();
