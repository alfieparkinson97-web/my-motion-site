// Renders the kits4u "tier-list TikTok.
//   node rank/render.mjs preview   → rank/out/preview/*.png key frames
//   node rank/render.mjs video     → rank/out/frames.mp4 (silent, 30fps)
//   node rank/render.mjs cover     → rank/out/kits4u-rank-cover.png
// Set the site address with URL=yoursite.com
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'tiktok', 'rank', 'out');
const FPS = 30, DURATION = 26;
const mode = process.argv[2] || 'preview';
const SITE_URL = process.env.URL || 'kits4u.store';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/tiktok/rank/index.html`;

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none']
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.error('[page error]', e.message));
await page.goto(base);
await page.evaluate(() => window.ready);
await page.evaluate(u => window.setUrl(u), SITE_URL);
fs.mkdirSync(OUT, { recursive: true });

if (mode === 'preview') {
  const dir = path.join(OUT, 'preview');
  fs.mkdirSync(dir, { recursive: true });
  const shots = (process.env.TIMES || '1,2.3,3.0,3.7,4.6,6.0,9.6,13.8,18.8,19.9,21.5,25').split(',').map(Number);
  for (const t of shots) {
    await page.evaluate(t => window.renderFrame(t), t);
    const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
    await page.screenshot({ path: f });
    console.log('preview', f);
  }
} else if (mode === 'cover') {
  await page.evaluate(() => window.renderCover());
  await page.screenshot({ path: path.join(OUT, 'kits4u-rank-cover.png') });
  console.log('cover written');
} else if (mode === 'video') {
  const frames = Math.round(DURATION * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, 'frames.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.renderFrame(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video frames written');
}

await browser.close();
server.close();
