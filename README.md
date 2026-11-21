# ROADSUCTION: portal edition

This is a copy of [ROADSUCTION](https://github.com/toodummy/roadsuction) prepared for web game portals (CrazyGames, Poki, GameDistribution, GameMonetize). The Telegram/Vercel version lives in the original repo and is unchanged.

## What's different from the original
- `portal.js` is one adapter for every portal. The backend is chosen at build time (dev source: `?portal=none|gamemonetize|crazygames|poki|gd`). It covers:
  - gameplay start/stop events (never fired twice in a row; CrazyGames doesn't get a stop on a tab switch)
  - a preroll on LAUNCH (GameDistribution/GameMonetize only)
  - a midgame ad on **Continue** (retry) after a knockout
  - an optional rewarded **🎬 DOUBLE CREDITS** button, the same size as Continue and shown after it, not green, once per run (CrazyGames, Poki, GameDistribution)
  - during any ad: the game is frozen, audio is suspended, and input is blocked by a full-screen overlay plus a keydown capture
- `LS` safe storage: the CrazyGames data module, then localStorage, then an in-memory fallback. The game runs with storage blocked (incognito).
- Removed: the SHARE button (`navigator.share`/clipboard/`alert`/`prompt`) and the screenshot download.
- The title screen fits 800×450: HOW TO DRIVE is collapsed behind **❔ CONTROLS**, with a one-line hint.
- Audio resumes on any tap, click or key.
- Uses the minified three.js r160.
- Debug URL params (`autoplay, showcase, cover, boss, shop, rectcheck, ...`) only work in the dev source. `build.py` sets `DEV=false` and strips the `//@dev` hooks.

## v15 additions (portal edition only)
- **New original car**: a cartoony "hover hot-rod" (wedge nose, jet canopy with roll hoop, shark-fin spine, side pods, raked big rear wheels, twin thruster cans, tall wing) in dark gunmetal with cyan/magenta glow accents. It is not modelled on any real car or brand.
- **Balance**: softer first minute (damage ×0.6 for the first 30 s and ×0.8 until 60 s, more space between early traffic, faster out-of-combat repair). The first enemy is always a drone. The first boss of a run has 75% HP and each later boss gets +12%. Ammo crates show up more often. There are short hints for a player's first 4 runs. `node tests/sim.js [runs] [seconds]` runs the headless balance sim (a passive player and a simple bot).
- **Daily missions**: 3 missions a day, chosen by the date (tricks/loops/ramps, distance/rocks/credits, bosses/takedowns/overrides/rival). Progress adds up across the day's runs and each mission pays credits. Finishing all 3 grows a day streak (+50 ◈ per streak day, max +350). Saved in `rd_save` through the `LS` safe storage.
- **Leaderboard**: a local top-10 of best distances (🏆 TOP 10 on the title screen, rank shown on game over). `PORTAL.submitScore(distance)` sends a new longest run to the CrazyGames leaderboard when the game is invited to that feature and built with `CG_LB_KEY=<base64 key> python3 build.py`. Poki, GameDistribution and GameMonetize have no leaderboard API, so it does nothing there.
- **Run variety**: jump ramps (from 90 m), loops, C-ramps and tunnels earlier (from 220 m), and random events every ~30–40 s:
  - ☄ meteor shower: cute googly-eyed space rocks you dodge
  - 🏁 TURBO NOODLE: a goofy rival car that drops rubber ducks. Beat it by boosting past, roof-hopping it or tagging it with shots.
  - ◈ chip storm
- **Fix**: weapon crates were counted as coins, which set run credits to NaN and never gave the weapon.
- **Trailer**: `assets/trailer/` (recorded in headless Chromium with `tests/trailer.js` and a virtual clock, then encoded with ffmpeg).
- Dev-only debug params: `?event=meteor|rival|chips` plus `__rd.x(code)` for tests (stripped from portal builds).

## Build
```
GD_GAME_ID=xxxx GM_GAME_ID=yyyy python3 build.py     # -> dist/<portal>/ and dist/<portal>.zip
```
Each zip has `index.html` at its root and 13 files, about 235 KB. GameDistribution and GameMonetize need the game id from their dashboards. Without one, a `REPLACE_WITH_..._GAME_ID` placeholder is used.

## Test
```
python3 -m http.server 8096 --bind 127.0.0.1 &   # in this folder
python3 build.py && node tests/run.js           # mock SDKs: tests/mock-sdks.js
```

## Assets
`assets/` holds covers and thumbnails made from real in-game renders (`tests/render_covers.js`, then `assets/make_assets.py`), plus `assets/metadata.md` (description and instructions).
