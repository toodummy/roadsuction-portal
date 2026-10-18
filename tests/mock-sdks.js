// Mock portal SDKs for headless tests. Each logs calls into window.__sdklog.
module.exports = {
crazygames: `window.__sdklog=[];const L=x=>__sdklog.push(x);window.CrazyGames={SDK:{init:()=>{L('init');return Promise.resolve()},
 game:{gameplayStart:()=>L('gameplayStart'),gameplayStop:()=>L('gameplayStop'),loadingStart:()=>L('loadingStart'),loadingStop:()=>L('loadingStop')},
 data:(()=>{const m={};return{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>delete m[k],clear:()=>{}}})(),
 ad:{requestAd:(t,cb)=>{L('requestAd:'+t);setTimeout(()=>{L('adStarted');cb.adStarted&&cb.adStarted()},150);setTimeout(()=>{L('adFinished');cb.adFinished&&cb.adFinished()},700)}}}};`,
poki: `window.__sdklog=[];const L=x=>__sdklog.push(x);window.PokiSDK={init:()=>{L('init');return Promise.resolve()},gameLoadingFinished:()=>L('gameLoadingFinished'),
 gameplayStart:()=>L('gameplayStart'),gameplayStop:()=>L('gameplayStop'),
 commercialBreak:(cb)=>{L('commercialBreak');return new Promise(r=>setTimeout(()=>{cb&&cb();L('adStarted')},150)&&setTimeout(()=>{L('adFinished');r()},700))},
 rewardedBreak:(cb)=>{L('rewardedBreak');return new Promise(r=>setTimeout(()=>{cb&&cb();L('adStarted')},150)&&setTimeout(()=>{L('adFinished');r(true)},700))}};`,
gd: `window.__sdklog=[];const L=x=>__sdklog.push(x);const E=n=>GD_OPTIONS.onEvent({name:n});L('loaded:'+GD_OPTIONS.gameId);
 window.gdsdk={showAd:(t)=>{L('showAd:'+(t||'interstitial'));return new Promise(r=>{setTimeout(()=>{E('SDK_GAME_PAUSE');L('adStarted')},150);setTimeout(()=>{if(t==='rewarded')E('SDK_REWARDED_WATCH_COMPLETE');L('adFinished');E('SDK_GAME_START');r()},700)})}};setTimeout(()=>E('SDK_READY'),10);`,
gamemonetize: `window.__sdklog=[];const L=x=>__sdklog.push(x);const E=n=>SDK_OPTIONS.onEvent({name:n});L('loaded:'+SDK_OPTIONS.gameId);
 window.sdk={showBanner:()=>{L('showBanner');setTimeout(()=>{E('SDK_GAME_PAUSE');L('adStarted')},150);setTimeout(()=>{L('adFinished');E('SDK_GAME_START')},700)}};setTimeout(()=>E('SDK_READY'),10);`
};
