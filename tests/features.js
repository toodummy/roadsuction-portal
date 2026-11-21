// v15 feature checks (dev source + dist/none). node tests/features.js   (needs `python3 -m http.server 8096` + `python3 build.py`)
const {chromium}=require(process.env.PW||'/workspace/pwtest/node_modules/playwright-core');
const BASE='http://127.0.0.1:8096',SHOTS=process.env.SHOTS||'/tmp/rs-shots';require('fs').mkdirSync(SHOTS,{recursive:true});
const R=[];const ok=(n,p,i='')=>{R.push(p);console.log((p?'PASS ':'FAIL ')+n+(i?'  '+i:''))};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function page(url,vp,ctx){const c=await b.newContext({viewport:vp||{width:960,height:540},...(ctx||{})});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await c.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE+url);await p.waitForFunction(()=>document.getElementById('go')||(window.__rd&&__rd.st==='play'),null,{timeout:60000});await p.waitForTimeout(800);return {c,p,errs}}
const X=(p,code)=>p.evaluate(c=>__rd.x(c),code);
// 1) title @800x450: buttons visible, daily missions + streak + top10 panel
{const {c,p,errs}=await page('/index.html',{width:800,height:450});
 const r=await p.evaluate(()=>{const vis=id=>{const e=document.getElementById(id);if(!e)return false;const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&b.width>0};return {go:vis('go'),shop:vis('shopb'),lb:vis('lbb'),daily:/DAILY MISSIONS/.test(document.body.innerText),streak:/day streak/.test(document.body.innerText),n:document.querySelectorAll('.msl > div').length}});
 ok('title 800x450: LAUNCH/SHOP/TOP 10 visible, 3 daily missions + streak',r.go&&r.shop&&r.lb&&r.daily&&r.streak&&r.n>=3,JSON.stringify(r));
 const d1=await X(p,'JSON.stringify(dailyEnsure().list.map(m=>m.id))'),d2=await X(p,"(()=>{const R=seedRnd('RS-'+dayKey());return JSON.stringify(DPOOL.map(cat=>{const q=cat[R()*cat.length|0];R();return q.id}))})()");
 ok('daily missions are date-seeded (deterministic for today)',d1===d2,d1+' vs '+d2);
 const other=await X(p,"(()=>{const out=new Set();for(let i=0;i<10;i++){const R=seedRnd('RS-2026-12-'+(10+i));out.add(DPOOL.map(cat=>cat[R()*cat.length|0].id+(R()*3|0)).join())}return out.size})()");ok('different days give different mission sets',other>=6,'distinct sets over 10 days: '+other);
 // leaderboard: 12 runs -> top 10 sorted
 const lb=await X(p,"(()=>{SAVE.lb=[];for(const d of [500,1200,80,3000,2200,900,1500,40,2600,700,1800,350])lbAdd(d,d*3);fxSave();const saved=JSON.parse(LS.get('rd_save')).lb;return {n:SAVE.lb.length,first:SAVE.lb[0].d,last:SAVE.lb[9].d,sorted:SAVE.lb.every((e,i,a)=>!i||a[i-1].d>=e.d),saved:saved.length}})()");
 ok('local top-10: keeps best 10 distances, sorted, persisted via LS',lb.n===10&&lb.first===3000&&lb.last===350&&lb.sorted&&lb.saved===10,JSON.stringify(lb));
 await X(p,'title()');await p.click('#lbb');await p.waitForTimeout(300);const lbt=await p.evaluate(()=>{const e=document.querySelector('.lb');return e?e.innerText:''});ok('🏆 TOP 10 panel lists runs',/3,000 m/.test(lbt)&&(lbt.match(/ m\n/g)||[]).length>=9,lbt.slice(0,80).replace(/\n/g,' | '));
 await p.screenshot({path:SHOTS+'/title-top10-800x450.png'});
 // daily completion + streak
 const sk=await X(p,"(()=>{const D=dailyEnsure();SAVE.streak={n:2,last:dayKey(1)};D.claimed=false;start();for(const m of D.list){m.done=false;m.base=m.n}fxMissions();const r={done:D.list.every(m=>m.done),bonus:RUN.bonus,streak:SAVE.streak.n,last:SAVE.streak.last===dayKey()};over('t');return r})()");
 ok('finishing all 3 daily missions pays rewards and grows the streak (2 -> 3, +150)',sk.done&&sk.streak===3&&sk.last&&sk.bonus>=150,JSON.stringify(sk));
 const ac=await X(p,"(()=>{const D=dailyEnsure();const m=D.list[0];m.done=false;m.base=0;D.claimed=true;start();if(m.k==='dist')dist=m.n*0.4;else if(m.k==='cr')RUN.cr=Math.ceil(m.n*.4);else if(m.k==='flips')flips=Math.ceil(m.n*.4);else if(m.k==='loops')loops=Math.ceil(m.n*.4);else RUN[m.k]=Math.ceil(m.n*.4);over('t');const b1=m.base;return {k:m.k,n:m.n,base:b1}})()");
 ok('daily progress adds up across runs (banked at game over)',ac.base>0&&ac.base<ac.n,JSON.stringify(ac));
 ok('title/leaderboard: no console errors',!errs.length,errs.join(' | '));await c.close()}
// 2) events + ramp in play (dev source)
for(const ev of ['meteor','rival','chips']){const {c,p,errs}=await page('/index.html?event='+ev+'&time=day');await p.waitForTimeout(2500);
 const r=await X(p,"({cur:EVT.cur&&EVT.cur.k,rocks:EVT.rocks.length,rival:!!EVT.rival,pk:PK.length,st})");
 await p.screenshot({path:`${SHOTS}/event-${ev}.png`});
 const good=ev==='meteor'?r.rocks>0:ev==='rival'?r.rival:r.pk>0;ok(`event ${ev}: starts and runs without errors`,good&&r.cur===ev&&!errs.length,JSON.stringify(r)+(errs.length?' ERR '+errs.join('|'):''));
 if(ev==='rival'){const w=await X(p,"(()=>{const rv=EVT.rival;rv.phase='lead';rv.rz=-6;rv.x=P.x;fxDamage(rv,500,'shot');return {ph:rv.phase,rivals:RUN.rivals}})()");ok('rival can be beaten (tag with shots) -> RUN.rivals++',w.ph==='spin'&&w.rivals===1,JSON.stringify(w))}
 await c.close()}
{const {c,p,errs}=await page('/index.html?time=day');await X(p,"(()=>{start();clearObs();dist=400;introT=40;nextZ=-dist-400;P.x=0;const R0=Math.random,q=[.35];Math.random=()=>q.length?q.shift():R0();spawn(-dist-20);Math.random=R0})()");
 const before=await X(p,'obs.filter(o=>o.kind==="ramp").length');let peak=await X(p,"(()=>{let pk=0;for(let i=0;i<90;i++){update(1/60);pk=Math.max(pk,P.y);if(RUN.ramps>0&&P.y>2)break}return +pk.toFixed(2)})()");
 await p.screenshot({path:SHOTS+'/ramp-jump.png'});const r=await X(p,'({ramps:RUN.ramps,mode:P.mode,y:+P.y.toFixed(2)})');r.peak=peak;ok('ramp: driving over it launches the car (RUN.ramps++)',before===1&&r.ramps>=1&&r.mode==='air'&&peak>2,JSON.stringify(r)+(errs.length?' ERR '+errs.join('|'):''));await c.close()}
// 3) touch play (dev, ?touch=1, phone landscape): hold FLY, fire, strafe
{const {c,p,errs}=await page('/index.html?touch=1',{width:844,height:390},{isMobile:true,hasTouch:true,deviceScaleFactor:1});await p.tap('#go');await p.waitForTimeout(1500);
 const vis=await p.evaluate(()=>getComputedStyle(document.getElementById('tc')).display);const box=async id=>{const e=await p.$('#'+id);return e.boundingBox()};
 const f=await box('tF');await p.touchscreen.tap(f.x+f.width/2,f.y+f.height/2);await p.waitForTimeout(100);const y=await X(p,'P.mode');
 const fx=await box('tX');await p.dispatchEvent('#tX','pointerdown',{pointerId:7,pointerType:'touch'});await p.waitForTimeout(600);const fired=await X(p,'PJ.length>0||fireHeld');await p.dispatchEvent('#tX','pointerup',{pointerId:7,pointerType:'touch'});
 await p.waitForTimeout(4000);const st=await X(p,'({st,dist:Math.round(dist),hud:document.getElementById("hud").style.display})');await p.screenshot({path:SHOTS+'/touch-play-844x390.png'});
 ok('?touch=1: touch controls shown, FLY lifts off, FIRE shoots, run keeps going, no errors',vis==='block'&&y==='air'&&fired&&st.st==='play'&&st.dist>0&&!errs.length,JSON.stringify({vis,y,fired,st})+(errs.length?' ERR '+errs.join('|'):''));await c.close()}
// 4) dist/none: plays 6 s, game over shows distance/rank line, no errors, no dev hooks
{const {c,p,errs}=await page('/dist/none/index.html',{width:907,height:510});await p.click('#go');await p.waitForTimeout(6000);const r=await p.evaluate(()=>({dev:!!window.__rd,hud:document.getElementById('hud').style.display!=='none',msn:document.getElementById('msn').innerText.split('\n').length}));
 ok('dist/none: run starts, daily missions on HUD, no dev hooks, no errors',!r.dev&&r.hud&&r.msn>=3&&!errs.length,JSON.stringify(r)+(errs.length?' ERR '+errs.join('|'):''));await c.close()}
await b.close();console.log(`\n${R.filter(Boolean).length}/${R.length} passed`);process.exit(R.every(Boolean)?0:1)})();
