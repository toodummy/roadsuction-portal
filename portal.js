/* ROADSUCTION portal adapter.
 * One API for every web portal; the backend is chosen at build time (build.py replaces the
 * PORTAL_NAME / GAME_ID placeholders) or, in the dev source only, via ?portal=<name>.
 * Backends: none (no-op), gamemonetize, crazygames (SDK v3), poki, gd (GameDistribution).
 *
 * window.LS        safe storage: CrazyGames data module -> localStorage -> in-memory fallback
 * window.PORTAL    { name, ready, loadingDone(), gameplayStart(), gameplayStop(reason),
 *                    preroll(), midgame(), rewarded() -> Promise<boolean>, hasRewarded,
 *                    adActive, onAdStart, onAdEnd }
 */
(function () {
  'use strict';
  var NAME = '__PORTAL_NAME__';             // replaced by build.py
  var GAME_ID = '__GAME_ID__';              // GameDistribution / GameMonetize game id, replaced by build.py
  if (NAME.indexOf('__') === 0) {           // dev source: allow ?portal=
    try { NAME = new URLSearchParams(location.search).get('portal') || 'none'; } catch (e) { NAME = 'none'; }
  }
  NAME = String(NAME).toLowerCase();
  var SRC = {
    crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
    poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
    gd: 'https://html5.api.gamedistribution.com/main.min.js',
    gamemonetize: 'https://api.gamemonetize.com/sdk.js'
  };
  if (!SRC[NAME]) NAME = 'none';

  /* ---------- safe storage ---------- */
  var mem = {}, real = null;
  try { var k = '__rd_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); real = localStorage; } catch (e) { real = null; }
  var cgData = null;
  var LS = {
    get: function (key) {
      try { if (cgData) { var v = cgData.getItem(key); if (v != null) return String(v); } } catch (e) {}
      try { if (real) return real.getItem(key); } catch (e) {}
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },
    set: function (key, val) {
      val = String(val); mem[key] = val;
      try { if (cgData) cgData.setItem(key, val); } catch (e) {}
      try { if (real) real.setItem(key, val); } catch (e) {}
    },
    get persistent() { return !!(real || cgData); }
  };
  window.LS = LS;

  /* ---------- ad overlay / input block ---------- */
  var P = {
    name: NAME, adActive: false, hasRewarded: false,
    onAdStart: null, onAdEnd: null, _playing: false, _sdk: null
  };
  var blocker = null;
  var muted = false;
  function mute() { if (muted) return; muted = true; try { P.onAdStart && P.onAdStart(); } catch (e) { console.warn(e); } }
  function blockOn(noMute) {
    if (!noMute) mute();
    if (P.adActive) return;
    P.adActive = true;
    if (!blocker) {
      blocker = document.createElement('div');
      blocker.id = 'adblocker-overlay';
      blocker.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:transparent;touch-action:none';
      ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'contextmenu'].forEach(function (t) {
        blocker.addEventListener(t, function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      });
    }
    if (document.body && !blocker.parentNode) document.body.appendChild(blocker);
  }
  function blockOff() {
    if (muted) { muted = false; try { P.onAdEnd && P.onAdEnd(); } catch (e) { console.warn(e); } }
    if (!P.adActive) return;
    P.adActive = false;
    if (blocker && blocker.parentNode) blocker.parentNode.removeChild(blocker);
  }
  // swallow keyboard input during ads (capture phase runs before the game's listeners)
  addEventListener('keydown', function (e) { if (P.adActive) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error('sdk load failed')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }

  /* ---------- backends ---------- */
  // Each backend: init() -> Promise, start(), stop(reason), preroll(), midgame(), rewarded() -> Promise<bool>
  var B = {};
  B.none = {
    init: function () { return Promise.resolve(); }, start: function () {}, stop: function () {},
    preroll: function () { return Promise.resolve(); }, midgame: function () { return Promise.resolve(); },
    rewarded: function () { return Promise.resolve(false); }, rewardedAvailable: false
  };

  B.crazygames = {
    rewardedAvailable: true,
    sdk: function () { return window.CrazyGames && window.CrazyGames.SDK; },
    init: function () {
      var self = this;
      return loadScript(SRC.crazygames).then(function () { return self.sdk().init(); }).then(function () {
        try { var d = self.sdk().data; if (d && d.getItem) { cgData = d; migrateToCG(); } } catch (e) {}
        try { self.sdk().game.loadingStart && self.sdk().game.loadingStart(); } catch (e) {}
      });
    },
    loadingDone: function () { try { var s = this.sdk(); s && s.game.loadingStop && s.game.loadingStop(); } catch (e) {} },
    start: function () { try { this.sdk().game.gameplayStart(); } catch (e) {} },
    // CrazyGames: don't report a stop when the player merely switches tab/focus
    stop: function (reason) { if (reason === 'hidden') return false; try { this.sdk().game.gameplayStop(); } catch (e) {} },
    preroll: function () { return Promise.resolve(); },
    _ad: function (type) {
      var self = this;
      return new Promise(function (res) {
        var s = self.sdk(); if (!s) return res(false);
        var done = false; function fin(ok) { if (done) return; done = true; blockOff(); res(ok); }
        blockOn(true);  // UI blocked from request until adFinished/adError; audio muted only once the ad really starts
        try {
          s.ad.requestAd(type, {
            adStarted: function () { mute(); },
            adFinished: function () { fin(true); },
            adError: function () { fin(false); }
          });
        } catch (e) { fin(false); }
        setTimeout(function () { fin(false); }, 90000);  // safety net
      });
    },
    midgame: function () { return this._ad('midgame').then(function () {}); },
    rewarded: function () { return this._ad('rewarded'); }
  };

  B.poki = {
    rewardedAvailable: true,
    init: function () {
      return loadScript(SRC.poki).then(function () { return window.PokiSDK.init().catch(function () {}); });
    },
    loadingDone: function () { try { window.PokiSDK.gameLoadingFinished(); } catch (e) {} },
    start: function () { try { window.PokiSDK.gameplayStart(); } catch (e) {} },
    stop: function () { try { window.PokiSDK.gameplayStop(); } catch (e) {} },
    preroll: function () { return Promise.resolve(); },
    midgame: function () {
      if (!window.PokiSDK) return Promise.resolve();
      blockOn(true);
      return window.PokiSDK.commercialBreak(function () { mute(); })
        .catch(function () {}).then(function () { blockOff(); });
    },
    rewarded: function () {
      if (!window.PokiSDK) return Promise.resolve(false);
      blockOn(true);
      return window.PokiSDK.rewardedBreak(function () { mute(); })
        .catch(function () { return false; }).then(function (ok) { blockOff(); return !!ok; });
    }
  };

  // GameDistribution and GameMonetize share the SDK_GAME_PAUSE / SDK_GAME_START event model
  function evBackend(kind) {
    var waiters = [], rewardedOK = false;
    function onEvent(ev) {
      var n = ev && ev.name;
      if (n === 'SDK_GAME_PAUSE') blockOn();
      else if (n === 'SDK_GAME_START') { blockOff(); var w = waiters; waiters = []; w.forEach(function (f) { f(); }); }
      else if (n === 'SDK_REWARDED_WATCH_COMPLETE') rewardedOK = true;
    }
    function showAndWait(call) {
      // resolves when the SDK hands control back (SDK_GAME_START), or quickly if no ad starts
      return new Promise(function (res) {
        var settled = false; function fin() { if (settled) return; settled = true; res(); }
        waiters.push(fin);
        var r; try { r = call(); } catch (e) { r = null; }
        if (r && r.then) r.then(function () { if (!P.adActive) fin(); }, function () { if (!P.adActive) fin(); });
        setTimeout(function () { if (!P.adActive) fin(); }, 2500);   // no ad was shown
        setTimeout(function () { blockOff(); fin(); }, 90000);       // hard safety net
      });
    }
    return {
      rewardedAvailable: kind === 'gd',
      init: function () {
        if (kind === 'gd') window.GD_OPTIONS = { gameId: GAME_ID, onEvent: onEvent };
        else window.SDK_OPTIONS = { gameId: GAME_ID, onEvent: onEvent };
        return loadScript(SRC[kind]);
      },
      start: function () {}, stop: function () {},
      preroll: function () { return this.midgame(); },
      midgame: function () {
        return showAndWait(function () {
          if (kind === 'gd') { if (typeof gdsdk !== 'undefined' && gdsdk.showAd) return gdsdk.showAd(); }
          else if (typeof sdk !== 'undefined' && sdk.showBanner) return sdk.showBanner();
        });
      },
      rewarded: function () {
        if (kind !== 'gd' || typeof gdsdk === 'undefined' || !gdsdk.showAd) return Promise.resolve(false);
        rewardedOK = false;
        return showAndWait(function () { return gdsdk.showAd('rewarded'); }).then(function () { return rewardedOK; });
      }
    };
  }
  B.gd = evBackend('gd');
  B.gamemonetize = evBackend('gamemonetize');

  function migrateToCG() {
    // copy existing browser saves into the CrazyGames data module once
    try {
      if (!real || cgData.getItem('rd_migrated')) return;
      ['rd_save', 'rd_best', 'rd_music', 'rd_fx7', 'rd_touchui'].forEach(function (k) {
        var v = real.getItem(k); if (v != null && cgData.getItem(k) == null) cgData.setItem(k, v);
      });
      cgData.setItem('rd_migrated', '1');
    } catch (e) {}
  }

  /* ---------- public API ---------- */
  var be = B[NAME], busy = false;
  P.ready = timeout(be.init().catch(function (e) { console.warn('[portal] init failed, continuing without SDK', e); be = B.none; }), 4000)
    .then(function () { P.hasRewarded = !!be.rewardedAvailable && be !== B.none; });
  P.loadingDone = function () { try { be.loadingDone && be.loadingDone(); } catch (e) {} };
  P.gameplayStart = function () { if (P._playing || P.adActive) return; P._playing = true; be.start(); };
  P.gameplayStop = function (reason) { if (!P._playing || P.adActive) return; if (be.stop(reason) === false) return; P._playing = false; };
  function guard(fn, fallback) {
    return function () {
      if (busy) return Promise.resolve(fallback);
      busy = true;
      if (P._playing) P.gameplayStop('ad');
      return Promise.resolve().then(fn).catch(function () { return fallback; })
        .then(function (r) { busy = false; blockOff(); return r; });
    };
  }
  P.preroll = guard(function () { return be.preroll(); });
  P.midgame = guard(function () { return be.midgame(); });
  P.rewarded = guard(function () { return be.rewarded(); }, false);
  window.PORTAL = P;
})();
