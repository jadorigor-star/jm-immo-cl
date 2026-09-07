// Verifie que le rendu JavaScript expose bien les annonces
const puppeteer = require("puppeteer");
(async () => {
  const nav = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await nav.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36");
  const r = await page.goto("https://www.gruyere-immo.ch/acheter", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((x) => setTimeout(x, 2500));
  const html = await page.content();
  console.log("HTTP " + r.status() + " | HTML rendu : " + html.length + " octets");
  const prix = [...html.matchAll(/CHF[\s'’]*[\d'’\s]{5,}/g)].slice(0, 6).map((m) => m[0].trim());
  console.log("prix visibles : " + JSON.stringify(prix));
  const liens = [...new Set([...html.matchAll(/href="([^"]{6,120})"/g)].map((m) => m[1]))]
    .filter((u) => /bien|objet|propriet|annonce|detail|\/\d{3,}/i.test(u));
  console.log("liens candidats : " + liens.length);
  liens.slice(0, 8).forEach((l) => console.log("   " + l.slice(0, 100)));
  await nav.close();
})();
