// Headless test suite. Usage: node tests/run.js   (expects `python3 -m http.server 8096` in the repo root and a fresh `python3 build.py`)
const {chromium}=require(process.env.PW||'/workspace/runner/node_modules/playwright-core');
const MOCK=require('./mock-sdks.js');
const BASE='http://127.0.0.1:8096';
const SDKURL={crazygames:'sdk.crazygames.com',poki:'game-cdn.poki.com',gd:'html5.api.gamedistribution.com',gamemonetize:'api.gamemonetize.com'};
const results=[];const ok=(name,pass,info='')=>{results.push({name,pass,info});console.log((pass?'PASS ':'FAIL ')+name+(info?'  '+info:''))};
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
async function ctxFor(opts={}){const c=await b.newContext({viewport:opts.vp||{width:1000,height:640},...(opts.ctx||{})});
 const errs=[],ext=[];
 await c.route('**/*',r=>{const u=r.request().url();for(const [k,h] of Object.entries(SDKURL))if(u.includes(h))return r.fulfill({contentType:'application/javascript',body:MOCK[k]});
  if(!u.startsWith(BASE)){ext.push(u);return r.abort()}return r.continue()});
 if(opts.blockStorage)await c.addInitScript(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError')}})});
 const p=await c.newPage();p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 return {c,p,errs,ext}}
const gameFrame=p=>p.frames().find(f=>f.url().split('?')[0].endsWith('/index.html'))||p.mainFrame();
const realErrs=e=>e.filter(x=>!/favicon/.test(x));

// 1) every dist build inside an iframe at 800x450 and 907x510, with and without storage
for(const portal of ['none','gamemonetize','crazygames','poki','gd'])for(const [w,h] of [[800,450],[907,510]])for(const bs of [false,true]){
 const {c,p,errs,ext}=await ctxFor({vp:{width:w+40,height:h+40},blockStorage:bs});
 await p.goto(`${BASE}/tests/frame.html?w=${w}&h=${h}&src=${encodeURIComponent('/dist/'+portal+'/index.html')}`);await p.waitForTimeout(2200);
 const f=gameFrame(p);const r=await f.evaluate(()=>{const vis=id=>{const e=document.getElementById(id);if(!e)return null;const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth&&b.width>0};
  return {go:vis('go'),shop:vis('shopb'),ctl:vis('ctl'),canvas:!!document.querySelector('canvas'),persistent:LS.persistent,portal:PORTAL.name,dev:!!window.__rd,share:/SHARE/.test(document.body.innerText)}}).catch(e=>({err:e.message}));
 ok(`dist/${portal} ${w}x${h}${bs?' storage-blocked'+(portal==='crazygames'?' (falls back to CG data module)':' (in-memory fallback)'):''}: LAUNCH/SHOP visible, no errors`,r.go&&r.shop&&r.canvas&&!r.dev&&r.portal===portal&&!realErrs(errs).length&&!ext.length&&(bs?r.persistent===(portal==='crazygames'):true),JSON.stringify(r)+(realErrs(errs).length?' ERR '+realErrs(errs).join(' | '):'')+(ext.length?' EXT '+ext.join(','):''));
 if(portal==='none'&&w===800&&!bs)await p.screenshot({path:'/tmp/pt-title-800x450.png'});
 if(portal==='none'&&w===907&&bs)await p.screenshot({path:'/tmp/pt-title-907-nostorage.png'});
 // storage-blocked: actually start a run and keep going (no crash)
 if(bs&&w===907&&portal==='none'){await f.click('#go');await p.waitForTimeout(1500);const st=await f.evaluate(()=>document.getElementById('hud').style.display!=='none');ok('dist/none storage-blocked: run starts, HUD shown',st&&!realErrs(errs).length,realErrs(errs).join('|'))}
 await c.close()}

// 2) debug params ignored in dist
{const {c,p,errs}=await ctxFor();await p.goto(`${BASE}/dist/none/index.html?autoplay=1&boss=1&shop=1&cover=1&rectcheck=1`);await p.waitForTimeout(1800);
 const r=await p.evaluate(()=>({go:!!document.getElementById('go'),ui:getComputedStyle(document.getElementById('ui')).display}));ok('dist ignores debug URL params (?autoplay ?boss ?shop ?cover)',r.go&&r.ui!=='none'&&!realErrs(errs).length,JSON.stringify(r));await c.close()}

// 3) ad flow per backend (dev source with ?portal=, same adapter code)
for(const portal of ['crazygames','poki','gd','gamemonetize','none']){
 const {c,p,errs}=await ctxFor({vp:{width:907,height:510}});
 await p.goto(`${BASE}/index.html?portal=${portal}`);await p.waitForTimeout(1800);
 const log=()=>p.evaluate(()=>(window.__sdklog||[]).slice());
 await p.click('#go');await p.waitForFunction(()=>__rd.st==='play'&&!PORTAL.adActive,null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(300);
 const s1=await p.evaluate(()=>__rd.st);
 await p.evaluate(()=>__rd.over('test'));await p.waitForSelector('#ag',{timeout:5000}).catch(()=>{});await p.waitForTimeout(200);
 const btn=await p.evaluate(()=>{const a=document.getElementById('ag'),r=document.getElementById('rw');const A=a&&a.getBoundingClientRect(),B=r&&r.getBoundingClientRect();return {ag:!!a,rw:!!r,eq:!!(A&&B&&Math.abs(A.width-B.width)<1&&Math.abs(A.height-B.height)<1),agFirst:!!(A&&B&&(A.left<B.left||A.top<B.top)),rwColor:r&&getComputedStyle(r).backgroundColor}});
 let rew=null;
 if(btn.rw){const cr0=await p.evaluate(()=>__rd.SAVE.cr);const tot=await p.evaluate(()=>__rd.RUN.total);await p.click('#rw');await p.waitForTimeout(400);
  const mid=await p.evaluate(()=>({adActive:PORTAL.adActive,blocker:!!document.getElementById('adblocker-overlay'),ac:__rd.AC&&__rd.AC.state}));
  await p.keyboard.press('Space');// must be swallowed
  await p.waitForTimeout(900);const after=await p.evaluate(()=>({cr:__rd.SAVE.cr,txt:document.getElementById('rw').textContent,st:__rd.st,adActive:PORTAL.adActive,ac:__rd.AC&&__rd.AC.state,saved:JSON.parse(LS.get('rd_save')).cr}));
  rew={cr0,tot,mid,after};
  ok(`${portal}: rewarded '🎬 DOUBLE CREDITS' pauses+mutes+blocks input, then pays once`,mid.adActive&&mid.blocker&&mid.ac==='suspended'&&after.cr===cr0+tot&&after.saved===after.cr&&after.st==='over'&&!after.adActive&&after.ac==='running'&&/ADDED/.test(after.txt),JSON.stringify(rew));
  await p.click('#rw',{force:true}).catch(()=>{});await p.waitForTimeout(300);const cr2=await p.evaluate(()=>__rd.SAVE.cr);ok(`${portal}: rewarded cannot be claimed twice`,cr2===after.cr)}
 ok(`${portal}: game-over shows CONTINUE${btn.rw?' + equal-size 🎬 button (Continue first, not green)':' (no rewarded button for this backend)'}`,btn.ag&&(portal==='gamemonetize'||portal==='none'?!btn.rw:(btn.rw&&btn.eq&&btn.agFirst&&!/rgb\(\d+, (1\d\d|2\d\d), \d+\)/.test(btn.rwColor.replace(/rgb\((2\d\d), /,'rgb(X, ')))),JSON.stringify(btn));
 await p.click('#ag');await p.waitForTimeout(300);const mid2=await p.evaluate(()=>({st:__rd.st,adActive:PORTAL.adActive}));await p.waitForTimeout(1200);
 const s3=await p.evaluate(()=>__rd.st);const L=await log();
 // no duplicate consecutive start/stop
 const ev=L.filter(x=>x==='gameplayStart'||x==='gameplayStop');let dup=false;for(let i=1;i<ev.length;i++)if(ev[i]===ev[i-1])dup=true;
 const expectAd={crazygames:'requestAd:midgame',poki:'commercialBreak',gd:'showAd:interstitial',gamemonetize:'showBanner'}[portal];
 ok(`${portal}: LAUNCH->play, Retry runs midgame ad then resumes play; start/stop events not duplicated`,s1==='play'&&s3==='play'&&(portal==='none'||(L.includes(expectAd)&&(mid2.adActive||mid2.st!=='play')))&&!dup&&!realErrs(errs).length,'log='+JSON.stringify(L)+' mid='+JSON.stringify(mid2)+(realErrs(errs).length?' ERR '+realErrs(errs).join('|'):''));
 // pause -> stop, resume -> start
 if(portal==='poki'||portal==='crazygames'){await p.keyboard.press('KeyP');await p.waitForTimeout(150);await p.keyboard.press('KeyP');await p.waitForTimeout(150);const L2=await log();ok(`${portal}: pause/resume fire gameplayStop/gameplayStart`,L2.slice(-2).join(',')==='gameplayStop,gameplayStart',JSON.stringify(L2.slice(-4)))}
 if(portal==='crazygames')await p.screenshot({path:'/tmp/pt-cg-play.png'});
 await c.close()}

// 4) GD preroll on LAUNCH + gameId
{const {c,p}=await ctxFor();await p.goto(`${BASE}/dist/gd/index.html`);await p.waitForTimeout(1500);await p.click('#go');await p.waitForTimeout(1300);const L=await p.evaluate(()=>__sdklog);ok('dist/gd: preroll on LAUNCH and gameId passed',L.includes('showAd:interstitial')&&L.some(x=>x.startsWith('loaded:')),JSON.stringify(L));await c.close()}

// 5) game-over screenshot 800x450 (poki dev)
{const {c,p}=await ctxFor({vp:{width:800,height:450}});await p.goto(`${BASE}/index.html?portal=poki`);await p.waitForTimeout(1500);await p.click('#go');await p.waitForTimeout(400);await p.evaluate(()=>__rd.over('test'));await p.waitForTimeout(1100);
 const r=await p.evaluate(()=>['ag','rw','shopb2'].map(id=>{const e=document.getElementById(id);const b=e&&e.getBoundingClientRect();return [id,!!b&&b.bottom<=innerHeight&&b.top>=0]}));ok('game-over buttons visible at 800x450',r.every(x=>x[1]),JSON.stringify(r));await p.screenshot({path:'/tmp/pt-over-800x450.png'});await c.close()}

// 6) touch rectcheck (dev source)
for(const [w,h] of [[800,450],[907,510],[390,844],[844,390],[1024,768]]){const {c,p}=await ctxFor({vp:{width:w,height:h},ctx:{isMobile:true,hasTouch:true,deviceScaleFactor:2}});const logs=[];p.on('console',m=>{if(m.text().startsWith('RECTS '))logs.push(m.text().slice(6))});
 await p.goto(`${BASE}/index.html?touch=1&rectcheck=1`);await p.waitForTimeout(1500);const last=logs.length?JSON.parse(logs[logs.length-1]):null;ok(`touch rectcheck ${w}x${h}`,!!last&&last.rects.every(r=>r[5]),last?JSON.stringify(last.rects.filter(r=>!r[5])):'no RECTS log');await c.close()}

await b.close();const f=results.filter(r=>!r.pass);console.log(`\n${results.length-f.length}/${results.length} passed`);process.exit(f.length?1:0)})();
