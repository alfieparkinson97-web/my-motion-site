/* Kits4U ad — step 3: record kits4u-ad.html to MP4 + cover PNG.

   The page exposes renderAt(t). We step t = frame / 30 for every frame and
   screenshot it as a lossless PNG into stills/frames (resumable: re-running
   skips frames already rendered), then encode with ffmpeg (H.264, yuv420p,
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
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const run = (cmd, a) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit' }).on('close', (c) => (c ? rej(new Error(cmd + ' exited ' + c)) : res())));

(async () => {
  const errors = [];
  let browser, page;
  async function open() {
    browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
    page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    await page.goto(PAGE);
    await page.waitForFunction(() => window.adReady === true, null, { timeout: 60000 });
  }
  async function restart() { try { await browser.close(); } catch (e) { /* already gone */ } await open(); }
  await open();
  const AD_INFO = await page.evaluate(() => window.AD);
  const frame = async (t) => { await page.evaluate((t) => window.renderAt(t), t); return page.screenshot({ type: 'png', timeout: 30000 }); };

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

  // 1) render every frame to disk; a hung frame restarts the browser and retries
  const framesDir = path.join(AD, 'stills', 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  const fname = (i) => path.join(framesDir, 'f' + String(i).padStart(4, '0') + '.png');
  const auditFile = path.join(AD, 'stills', 'audit-frames.json');
  const audit = fs.existsSync(auditFile) ? JSON.parse(fs.readFileSync(auditFile, 'utf8')) : {};
  const started = Date.now();
  let done = 0;
  for (let i = 0; i < AD_INFO.FRAMES; i++) {
    if (fs.existsSync(fname(i)) && audit[i] !== undefined) continue;
    const t = i / AD_INFO.FPS;
    let png, a;
    for (let attempt = 0; ; attempt++) {
      try {
        png = await withTimeout(frame(t), 40000);
        a = await withTimeout(page.evaluate(() => window.adAudit()), 20000);
        break;
      } catch (e) {
        if (attempt >= 2) throw e;
        console.log('frame', i, 'failed (' + e.message + '), restarting browser');
        await restart();
      }
    }
    fs.writeFileSync(fname(i), png);
    audit[i] = a;
    if (++done % 30 === 0) {
      fs.writeFileSync(auditFile, JSON.stringify(audit));
      console.log('frame', i + 1, '/', AD_INFO.FRAMES, ((Date.now() - started) / done).toFixed(0) + ' ms/frame');
    }
  }
  fs.writeFileSync(auditFile, JSON.stringify(audit));
  await browser.close();

  // 2) encode: H.264 High, yuv420p, 30fps CFR, plus a silent AAC track (no music)
  const out = path.join(AD, 'kits4u-launch.mp4');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(AD_INFO.FPS), '-i', path.join(framesDir, 'f%04d.png'),
    '-f', 'lavfi', '-t', String(AD_INFO.DURATION), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(AD_INFO.FPS), '-g', String(AD_INFO.FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
  // cover = the final frame of the video, as a lossless PNG
  fs.copyFileSync(fname(AD_INFO.FRAMES - 1), path.join(AD, 'kits4u-cover.png'));
  const issues = Object.keys(audit).filter((k) => audit[k].length).map((k) => ({ frame: +k, t: +(k / AD_INFO.FPS).toFixed(3), issues: audit[k] }));
  fs.writeFileSync(path.join(AD, 'stills', 'audit.json'), JSON.stringify({ errors, issues }, null, 1));
  console.log('done in', ((Date.now() - started) / 1000).toFixed(0) + 's;', issues.length, 'frames with text issues;', errors.length, 'page errors');
})().catch((e) => { console.error(e); process.exit(1); });
