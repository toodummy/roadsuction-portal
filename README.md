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
