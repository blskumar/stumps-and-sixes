// PWA checks over real HTTP: manifest, icons, share tags, service worker install, offline reload, iOS install hint.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ck = (n, c, d) => { if (c) pass++; else { fail++; console.log('FAIL', n, d === undefined ? '' : d); } };
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

(async () => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end('nf'); }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
  }).listen(0);
  const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch();

  // ---------- desktop: manifest, icons, share tags, service worker, offline ----------
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = [], csp = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
  await p.goto(base);
  await p.waitForSelector('#hmPlay');
  const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, state: (r.active || {}).state }; });
  ck('service worker registered and active', reg.state === 'activated' && reg.scope === base, JSON.stringify(reg));
  await p.waitForTimeout(300);

  const mfHref = await p.evaluate(() => document.querySelector('link[rel=manifest]').href);
  const mfRes = await p.request.get(mfHref);
  ck('manifest served with a manifest content type', mfRes.ok() && /manifest\+json/.test(mfRes.headers()['content-type']));
  const mf = await mfRes.json();
  ck('manifest has name/start_url/scope/display', mf.name === 'Stumps & Sixes' && mf.start_url && mf.scope === './' && mf.display === 'fullscreen');
  ck('manifest has 192, 512 and a maskable icon', ['192x192', '512x512'].every(s => mf.icons.some(i => i.sizes === s && i.purpose === 'any')) && mf.icons.some(i => i.purpose === 'maskable'));
  for (const i of mf.icons) {
    const r = await p.request.get(new URL(i.src, base).href);
    ck('icon ' + i.src + ' loads as PNG', r.ok() && r.headers()['content-type'] === 'image/png' && (await r.body()).length > 1000);
  }
  const dims = await p.evaluate(async () => { const o = {}; for (const f of ['assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png', 'assets/og-image.png']) { const im = new Image(); im.src = f; await im.decode(); o[f] = [im.naturalWidth, im.naturalHeight]; } return o; });
  ck('icon sizes are exact', dims['assets/icon-192.png'] + '' === '192,192' && dims['assets/icon-512.png'] + '' === '512,512' && dims['assets/icon-maskable-512.png'] + '' === '512,512' && dims['assets/apple-touch-icon.png'] + '' === '180,180', JSON.stringify(dims));
  ck('share image is 1200x630', dims['assets/og-image.png'] + '' === '1200,630');

  const meta = await p.evaluate(() => { const g = (s, a) => (document.querySelector(s) || {}).getAttribute && document.querySelector(s).getAttribute(a); return {
    ogt: g('meta[property="og:title"]', 'content'), ogi: g('meta[property="og:image"]', 'content'), ogu: g('meta[property="og:url"]', 'content'),
    tw: g('meta[name="twitter:card"]', 'content'), can: g('link[rel=canonical]', 'href'), ati: g('link[rel=apple-touch-icon]', 'href'), th: g('meta[name=theme-color]', 'content') }; });
  ck('open-graph + twitter tags present and point at the custom domain', /Stumps/.test(meta.ogt) && meta.ogi === 'https://stumpsnd6s.space/assets/og-image.png' && meta.ogu === 'https://stumpsnd6s.space/' && meta.tw === 'summary_large_image' && meta.can === 'https://stumpsnd6s.space/', JSON.stringify(meta));

  // go offline and reload: the game must still load and be playable
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector('#hmPlay', { timeout: 8000 });
  ck('offline reload shows the home screen', await p.isVisible('#hmPlay'));
  await p.click('#hmPlay'); await p.waitForTimeout(400);
  const st = await p.evaluate(() => window.__cricket.getState());
  ck('offline: a match starts', st.appState === 'play' && st.mode === 'match', JSON.stringify(st));
  await p.evaluate(() => { const c = window.__cricket; for (let i = 0; i < 240 * 3; i++) c.update(1 / 240); });
  ck('offline: physics steps without error', errs.length === 0, errs.join(' | '));
  await ctx.setOffline(false);
  ck('no CSP violations', csp.length === 0, csp.join(' | '));
  ck('no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();

  // ---------- new SW version replaces the old cache ----------
  const ctx2 = await b.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(base); await p2.evaluate(() => navigator.serviceWorker.ready);
  const keys = await p2.evaluate(() => caches.keys());
  ck('exactly one versioned cache present', keys.length === 1 && /^stumps-sixes-v/.test(keys[0]), JSON.stringify(keys));
  const cached = await p2.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).map(r => new URL(r.url).pathname));
  ck('shell files are precached', ['/index.html', '/manifest.webmanifest', '/assets/icon-512.png', '/assets/apple-touch-icon.png'].every(f => cached.includes(f)), JSON.stringify(cached));
  await ctx2.close();

  // ---------- iPhone: install hint button ----------
  const ios = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p3 = await ios.newPage();
  await p3.goto(base); await p3.waitForSelector('#hmPlay');
  ck('iOS: Install App button is shown with Add-to-Home-Screen hint', await p3.isVisible('#hmInstall') && /Home Screen/.test(await p3.textContent('#hmInstallSub')));
  await p3.click('#hmInstall');
  ck('iOS: tapping it gives Safari instructions and stays on home', /Share/.test(await p3.textContent('#hmInstallSub')) && (await p3.evaluate(() => window.__cricket.getState().appState)) === 'home');
  await p3.screenshot({ path: require('os').tmpdir() + '/pwa_ios_home.png' });
  await ios.close();

  // ---------- Android/Chrome style install prompt ----------
  const and = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
  const p4 = await and.newPage();
  await p4.goto(base); await p4.waitForSelector('#hmPlay');
  await p4.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  ck('install prompt event reveals the Install App button', await p4.isVisible('#hmInstall'));
  await p4.click('#hmInstall'); await p4.waitForTimeout(100);
  ck('clicking Install triggers the browser prompt once', await p4.evaluate(() => window.__prompted === true));
  await p4.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  ck('button disappears after install', !(await p4.isVisible('#hmInstall')));
  await and.close();

  await b.close(); srv.close();
  console.log('pwa e2e: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
