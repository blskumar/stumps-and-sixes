# Stumps & Sixes

A 2D side-view cricket batting game in a single HTML file. No libraries, no assets, no build step: everything is drawn on an HTML5 canvas and all sound is synthesised with the Web Audio API.

**Play:** https://blskumar.github.io/stumps-and-sixes/

## Modes
- **Play Match** - five levels (Club Nets to Storm Chasers), each faster than the last. You are only out if you miss the ball *and* it hits the stumps (BOWLED). Scores go into a local top-10 table.
- **Practice** - no wickets; choose the delivery (yorker, bouncer, swing, off-break, googly...) and level. Coaching tips appear before and after every ball.
- **Watch Demo** - the computer bats.
- **Players** - create several profiles (up to 12) on one device; each keeps their own top-10 scores, personal best and a "My scores" view. Switching player mid-match saves the current innings for whoever was batting.
- **How to Play / Controls / High Scores** from the home screen; a home icon is on every screen.

## How it plays
- A bowler bowls a red ball every 5 seconds. Press **Space** / click / tap to swing.
- Timing decides the shot: PERFECT (+-20 ms), Good (+-50), Average (+-100), Poor/Edge, Miss.
- A **FOUR** is a ball that bounces and then crosses the rope; a **SIX** crosses the rope without bouncing - for any shot, edges included.
- Controls: `Space` swing, `Esc` menu/pause, `R` restart, `H` high scores, `M` mute, `Up/Down` volume.

## Physics
Fixed-step simulation (240 Hz) in real units: gravity 9.81 m/s^2, quadratic air drag, bounce restitution and friction, swing and spin (turn at the first bounce), seam rotation. The bat is a swept capsule with hands that move through the shot; contact is an impulse collision using the bat's speed, effective mass, restitution and sweet-spot quality. Deliveries are solved so the ball pitches where intended and then travels on the intended line.

## Run locally
Open `index.html` in a browser (or `npx serve .`). Install and offline mode need `http(s)`, e.g. `npx serve .`.

## Install as an app (PWA)
The game is an installable web app: full-screen, its own icon, and playable offline after the first visit.
- Android / desktop Chrome and Edge: use the **Install App** button on the home screen (or the browser's install icon).
- iPhone / iPad: Safari, **Share, then Add to Home Screen**.

Files: `manifest.webmanifest`, `sw.js` (network-first for pages, cache-first for icons; bump `VERSION` in `sw.js` whenever a shipped file changes), `assets/`. Regenerate the icons and share image with `python3 tools/make-assets.py`.

## Custom domain (GitHub Pages)
`CNAME` holds `stumpsnd6s.space`. In the domain's DNS add four `A` records for the apex (`@`) pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a `CNAME` for `www` pointing to `blskumar.github.io`. Then in the repo: Settings, Pages, Custom domain, enable **Enforce HTTPS** once the certificate is issued.

## Optional visitor counter
Off by default (the game makes no network calls). `hostinger/counter.php` is a cookie-free, IP-free counter (visits and matches started, per day) you can upload to Hostinger PHP hosting. To turn it on set `ANALYTICS_URL` in `index.html` to its URL and add that origin to `connect-src` in the page's CSP.

## Tests
```
npm install
npm test          # levels/deliveries, boundary rules, dismissal rule, audio + high scores (Node, headless canvas)
npm run test:e2e  # real-browser checks (Playwright): home screen, modes, practice tips, player profiles, install/offline
npm run sweep     # brute-force every swing timing against many deliveries
npm run soak      # long random-play stress test
```

## Security notes
Static page with no network access by default (CSP `default-src 'none'`; only same-origin icons, manifest and service worker are allowed), no external resources and no cookies. The only persisted data is the volume, mute flag, player names and local high scores in `localStorage` (nothing leaves your browser); stored text is HTML-escaped before it is shown and names are stripped of markup.

## License
MIT
