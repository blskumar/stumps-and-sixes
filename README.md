# Stumps & Sixes

A 2D side-view cricket batting game in a single HTML file. No libraries, no assets, no build step: everything is drawn on an HTML5 canvas and all sound is synthesised with the Web Audio API.

**Play:** https://blskumar.github.io/stumps-and-sixes/

## Modes
- **Play Match** - five levels (Club Nets to Storm Chasers), each faster than the last. You are only out if you miss the ball *and* it hits the stumps (BOWLED). Scores go into a local top-10 table.
- **Practice** - no wickets; choose the delivery (yorker, bouncer, swing, off-break, googly...) and level. Coaching tips appear before and after every ball.
- **Watch Demo** - the computer bats.
- **How to Play / Controls / High Scores** from the home screen; a home icon is on every screen.

## How it plays
- A bowler bowls a red ball every 5 seconds. Press **Space** / click / tap to swing.
- Timing decides the shot: PERFECT (+-20 ms), Good (+-50), Average (+-100), Poor/Edge, Miss.
- A **FOUR** is a ball that bounces and then crosses the rope; a **SIX** crosses the rope without bouncing - for any shot, edges included.
- Controls: `Space` swing, `Esc` menu/pause, `R` restart, `H` high scores, `M` mute, `Up/Down` volume.

## Physics
Fixed-step simulation (240 Hz) in real units: gravity 9.81 m/s^2, quadratic air drag, bounce restitution and friction, swing and spin (turn at the first bounce), seam rotation. The bat is a swept capsule with hands that move through the shot; contact is an impulse collision using the bat's speed, effective mass, restitution and sweet-spot quality. Deliveries are solved so the ball pitches where intended and then travels on the intended line.

## Run locally
Open `index.html` in a browser (or `npx serve .`).

## Tests
```
npm install
npm test          # levels/deliveries, boundary rules, dismissal rule, audio + high scores (Node, headless canvas)
npm run test:e2e  # real-browser checks (Playwright): home screen, modes, practice tips
npm run sweep     # brute-force every swing timing against many deliveries
npm run soak      # long random-play stress test
```

## Security notes
Static page with no network access (CSP `default-src 'none'`), no external resources and no cookies. The only persisted data is the volume, mute flag and local high scores in `localStorage`; stored text is HTML-escaped before it is shown.

## License
MIT
