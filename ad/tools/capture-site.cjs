/* Kits4U ad — step 1: capture the real storefront at phone size.
   Serves the repo root on a local port, opens the pages in a 390x844 phone
   viewport and saves the screenshots used in the ad's website montage. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(__dirname, '../src/shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    }).listen(0, () => resolve(srv));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  async function shot(url, file, opts) {
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (opts.scrollY) await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
    await page.waitForTimeout(opts.wait || 2500);
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 86, fullPage: !!opts.full,
      clip: opts.clip });
    console.log('saved', file);
  }

  // hero with the live 3D flag football, after the entrance choreography
  await shot('index.html', 'hero.jpg', { wait: 4000 });
  // featured kits + the nation-orb grid ("Explore Kits for U")
  await shot('index.html', 'home.jpg', { full: true, wait: 4000, clip: { x: 0, y: 880, width: 390, height: 1640 } });
  // country collections page
  await shot('collections.html', 'collections.jpg', { full: true, wait: 3000, clip: { x: 0, y: 0, width: 390, height: 1800 } });

  await browser.close();
  srv.close();
})();
