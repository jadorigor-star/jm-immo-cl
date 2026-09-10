const puppeteer = require("puppeteer");
(async () => {
  const nav = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await nav.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36");
  await page.goto("https://www.casebertolotti.ch/immobili/cabe05-oc", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((x) => setTimeout(x, 3000));
  const texte = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  console.log("texte visible : " + texte.length + " caracteres");
  console.log("\nextrait :\n" + texte.slice(0, 700));
  console.log("\n=== recherche de prix ===");
  for (const [n, re] of [
    ["nombre a 6-7 chiffres", /\b\d[\d'’. ]{5,10}\b/g],
    ["mot prezzo/prix", /(prezzo|prix|preis|price)[^.]{0,60}/gi],
    ["su richiesta", /(su richiesta|auf anfrage|sur demande|on request)/gi]
  ]) {
    const t = [...texte.matchAll(re)].slice(0, 6).map((m) => m[0].trim());
    console.log("  " + n.padEnd(24) + JSON.stringify(t));
  }
  await nav.close();
})();
