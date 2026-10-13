/* Kits4U ad — step 2: build one self-contained HTML file.
   Inlines the site's real engine (assets/js/data.js, flags.js, jersey.js,
   gl.js) verbatim, the ad timeline, the brand fonts and the site screenshots
   into ad/kits4u-ad.html. No network needed to play or record it. */
const fs = require('fs');
const path = require('path');

const AD = path.resolve(__dirname, '..');
const SITE = path.resolve(AD, '../assets');
const read = (p) => fs.readFileSync(p, 'utf8');
const b64 = (p) => fs.readFileSync(p).toString('base64');
function script(src, file) {
  if (/<\/script/i.test(src)) throw new Error(file + ' contains </script>');
  return '<script>/* ' + file + ' */\n' + src + '\n</script>';
}

let html = read(path.join(AD, 'src/ad.html'));
const faces = JSON.parse(read(path.join(AD, 'src/fonts/fonts.json')));
const fontCSS = faces.map((f) => "@font-face{font-family:'" + f.family + "';font-style:normal;font-weight:" + f.weight.join(' ') +
  ";font-display:block;src:url(data:font/woff2;base64," + b64(path.join(AD, 'src/fonts', f.file)) + ") format('woff2')}").join('\n');

html = html
  .replace('<!--@FONTS-->', () => '<style>\n' + fontCSS + '\n</style>')
  .replace(/<!--@SITE:([\w.]+)-->/g, (m, f) => script(read(path.join(SITE, 'js', f)), 'assets/js/' + f + ' (from the Kits4U site, unmodified)'))
  .replace(/<!--@AD:([\w.]+)-->/g, (m, f) => script(read(path.join(AD, 'src', f)), 'ad/src/' + f))
  .replace(/%SHOT:(\w+)%/g, (m, f) => 'data:image/jpeg;base64,' + b64(path.join(AD, 'src/shots', f + '.jpg')))
  .replace('%MARK%', () => 'data:image/svg+xml;base64,' + b64(path.join(SITE, 'img/favicon.svg')));

const out = path.join(AD, 'kits4u-ad.html');
fs.writeFileSync(out, html);
console.log('built', path.relative(process.cwd(), out), (html.length / 1024 / 1024).toFixed(2) + ' MB');
