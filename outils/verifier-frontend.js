// Garde-fou : verifie que le JavaScript servi au navigateur est analysable.
const src = require('fs').readFileSync('jm-immo-worker/index.js', 'utf8');
const i = src.indexOf('var FRONTEND_HTML = `');
if (i < 0) { console.log('FRONTEND_HTML introuvable'); process.exit(1); }
const html = eval(src.slice(i + 20, src.indexOf('`;', i + 30) + 1));
const d = html.lastIndexOf('<script');
const f = html.indexOf('</script>', d);
const script = html.slice(html.indexOf('>', d) + 1, f);
try {
  new Function(script);
  console.log('JS du frontend : VALIDE (' + script.length + ' caracteres)');
} catch (e) {
  console.log('JS du frontend : CASSE -> ' + e.message);
  const m = /position (\d+)/.exec(e.message);
  console.log('Extrait :', script.slice(0, 200));
  process.exit(1);
}
