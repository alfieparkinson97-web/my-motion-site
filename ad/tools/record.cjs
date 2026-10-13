/* Kits4U ad — step 3: record kits4u-ad.html to MP4 + cover PNG.

   The page exposes renderAt(t). We step t = frame / 30 for every frame,
   screenshot it and pipe lossless PNGs straight into ffmpeg (H.264, yuv420p,
   30fps CFR, silent AAC track so TikTok/editors treat it as a normal video).
   Frame-stepping means no dropped or duplicated frames, however slow a frame is.

   node tools/record.cjs                       -> kits4u-launch.mp4 + kits4u-cover.png + audit
   node tools/record.cjs --stills 0.6,4.1,...  -> review PNGs in ./stills (no video)  */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const AD = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(AD, 'kits4u-ad.html') + '?record';
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction(() => window.adReady === true, null, { timeout: 60000 });
  const AD_INFO = await page.evaluate(() => window.AD);
  const frame = async (t) => { await page.evaluate((t) => window.renderAt(t), t); return page.screenshot({ type: 'png' }); };

  if (stillsArg) {
    const dir = path.join(AD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stillsArg.split(',').map(Number)) {
      fs.writeFileSync(path.join(dir, 't' + s.toFixed(2) + '.png'), await frame(s));
      const a = await page.evaluate(() => window.adAudit());
      console.log('still', s, a.length ? JSON.stringify(a) : 'ok');
    }
    if (errors.length) console.log('page errors:', errors);
    await browser.close();
    return;
  }

  const out = path.join(AD, 'kits4u-launch.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(AD_INFO.FPS), '-c:v', 'png', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a', '-shortest',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-r', String(AD_INFO.FPS), '-g', String(AD_INFO.FPS), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res())));

  const audit = [];
  const started = Date.now();
  let last;
  for (let i = 0; i < AD_INFO.FRAMES; i++) {
    const t = i / AD_INFO.FPS;
    last = await frame(t);
    const a = await page.evaluate(() => window.adAudit());
    if (a.length) audit.push({ frame: i, t: +t.toFixed(3), issues: a });
    if (!ff.stdin.write(last)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log('frame', i, '/', AD_INFO.FRAMES, ((Date.now() - started) / (i + 1)).toFixed(0) + ' ms/frame');
  }
  ff.stdin.end();
  await ffDone;
  // cover = the final frame of the video, as a lossless PNG
  fs.writeFileSync(path.join(AD, 'kits4u-cover.png'), last);
  fs.mkdirSync(path.join(AD, 'stills'), { recursive: true });
  fs.writeFileSync(path.join(AD, 'stills', 'audit.json'), JSON.stringify({ errors, audit }, null, 1));
  console.log('done in', ((Date.now() - started) / 1000).toFixed(0) + 's;', audit.length, 'frames with text outside the safe zone;', errors.length, 'page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
