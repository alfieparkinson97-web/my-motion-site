/* Kits4U ad — step 0: download the brand fonts (Latin subset, woff2) so the
   built ad embeds them and renders identically offline. Fonts are from
   Google Fonts under the SIL Open Font License. */
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(__dirname, '../src/fonts');
const CSS = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&family=Prata&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const css = await (await fetch(CSS, { headers: { 'User-Agent': UA } })).text();
  const blocks = css.split('/* ').slice(1).filter((b) => b.startsWith('latin */'));
  const faces = [], byUrl = {};
  for (const b of blocks) {
    const family = /font-family: '([^']+)'/.exec(b)[1];
    const weight = +/font-weight: (\d+)/.exec(b)[1];
    const url = /url\((https:[^)]+\.woff2)\)/.exec(b)[1];
    // variable fonts come back as the same file for every weight: keep one
    if (byUrl[url]) { byUrl[url].weight[1] = weight; continue; }
    const file = family.replace(/\s+/g, '') + '-' + weight + '.woff2';
    fs.writeFileSync(path.join(OUT, file), Buffer.from(await (await fetch(url)).arrayBuffer()));
    faces.push((byUrl[url] = { family, weight: [weight, weight], file }));
    console.log('saved', file);
  }
  fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify(faces, null, 2) + '\n');
})();
