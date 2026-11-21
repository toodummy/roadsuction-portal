// Gameplay trailer recorder: drives the dev build with a virtual clock (deterministic 60 fps steps),
// screenshots every 2nd step (30 fps) and stitches frames with ffmpeg.
// node tests/trailer.js <W> <H> <out.mp4> [scaleW scaleH]     (needs `python3 -m http.server 8096` in the repo root)
const {chromium}=require(process.env.PW||'/workspace/pwtest/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const W=+process.argv[2]||1280,H=+process.argv[3]||720,OUT=process.argv[4]||'assets/trailer/roadsuction-trailer-1280x720.mp4',SW=+process.argv[5]||W,SH=+process.argv[6]||H;
const FR=`/tmp/rs-frames-${W}x${H}`,ONLY=process.env.ONLY?process.env.ONLY.split(','):null,want=k=>!ONLY||ONLY.includes(k);if(!ONLY)fs.rmSync(FR,{recursive:true,force:true});fs.mkdirSync(FR,{recursive:true});// ONLY=A,G re-records just those segments
const VCLOCK=()=>{let vt=0;const q=[];let tid=1;const timers=new Map();const rN=performance.now.bind(performance);
 performance.now=()=>vt;window.requestAnimationFrame=cb=>{q.push(cb);return q.length};window.cancelAnimationFrame=()=>{};
 window.setTimeout=(f,ms,...a)=>{const id=tid++;timers.set(id,{f,a,at:vt+(+ms||0)});return id};window.clearTimeout=id=>timers.delete(id);
 window.setInterval=(f,ms,...a)=>{const id=tid++;const e={f,a,at:vt+(+ms||0),every:Math.max(1,+ms||1)};timers.set(id,e);return id};window.clearInterval=id=>timers.delete(id);
 window.__step=(n,ms)=>{for(let i=0;i<n;i++){vt+=ms||1000/60;for(const [id,t] of [...timers]){if(t.at<=vt){if(t.every)t.at+=t.every;else timers.delete(id);try{t.f(...t.a)}catch(e){console.error(e)}}}const cbs=q.splice(0);for(const cb of cbs)cb(vt)}}};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(VCLOCK);await p.addInitScript(()=>{try{localStorage.setItem('rd_best','48210');localStorage.setItem('rd_save',JSON.stringify({cr:1250,runs:9,skin:'gunmetal',skins:['gunmetal'],weapons:['pulse','spread','foam'],weapon:'pulse'}))}catch(e){}});
await p.goto('http://127.0.0.1:8096/index.html?portal=none');await p.waitForFunction(()=>window.__rd&&document.getElementById('go'),null,{timeout:60000});
await p.evaluate(()=>{const s=document.createElement('style');s.textContent=`#trl{position:fixed;inset:0;z-index:50;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;opacity:0}
#trl .bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,#05030c88 0%,#05030cdd 85%)}#trl h1{position:relative;margin:0;font-size:min(9.5vw,128px);font-weight:900;letter-spacing:.12em;text-shadow:0 0 18px #00e5ff,0 0 44px #ff2bd6,0 4px 10px #000}
#trl .tg{position:relative;margin-top:2vh;font-size:min(5vw,40px);font-weight:800;letter-spacing:.35em;color:#ffd166;text-shadow:0 0 12px #ff2bd6}#trl .cta{position:relative;margin-top:4vh;font-size:min(3.4vw,26px);font-weight:800;letter-spacing:.2em;padding:.6em 1.2em;border:2px solid #00e5ff;border-radius:10px;box-shadow:0 0 18px #00e5ff88;background:#00e5ff22}
#cap{position:fixed;left:0;right:0;bottom:12%;z-index:49;text-align:center;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-weight:900;font-size:min(7vw,56px);letter-spacing:.14em;color:#fff;text-shadow:0 0 14px #ff2bd6,0 0 30px #00e5ff,0 3px 6px #000;opacity:0}
#tc,#tb{display:none!important}`;document.head.appendChild(s);const t=document.createElement('div');t.id='trl';t.innerHTML='<div class="bg"></div><h1>ROADSUCTION</h1><div class="tg">FLY · FLIP · SUC</div><div class="cta" style="display:none">PLAY FREE IN YOUR BROWSER</div>';document.body.appendChild(t);const c=document.createElement('div');c.id='cap';document.body.appendChild(c)});
let fno=0;const X=c=>p.evaluate(c=>__rd.x(c),c);
const BOT=`(()=>{fa=0;fn=0;if(st!=='play')return;fireHeld=true;const z=-dist;let thr=false;for(const o of obs){if(o.kind!=='car'||o.dead)continue;const ah=z-o.z0;if(ah<26&&z>o.z1-3&&Math.abs(P.x-o.x)<o.w/2+1.4)thr=true}
 for(const e of EN)if(!e.dead&&e.type!=='drone'&&Math.abs(e.rz)<9&&Math.abs(P.x-e.x)<2.5)thr=true;if(boss&&boss.parts)for(const q of boss.parts)if(q.hp>0&&Math.abs(q.z-z)<14&&Math.abs(q.x-P.x)<2.5&&q.y<4)thr=true;
 let d=window.__steer||0;for(const r of EVT.rocks)if(!r.dead&&r.z>z-34&&r.z<z&&Math.abs(r.x-P.x)<2.4)d=r.x>P.x?-1:1;for(const c of CIRC)if(Math.abs(c.x-P.x)<c.R+1)d=c.x>P.x?-1:1;for(const w of WARN)if(Math.abs(w.x-P.x)<w.w/2+1)d=w.x>P.x?-1:1;inp.steer=d;
 if(window.__noThr)thr=false;if(thr&&!inp.thrust)thrustOn();else if(!thr&&inp.thrust&&!window.__hold)thrustOff();if(invT>0)invT=Math.min(invT,.05);hp=Math.max(hp,MAXHP*.6)})()`;
async function frames(n,perFrame){for(let i=0;i<n;i++){if(perFrame)await perFrame(i);await X(BOT);await p.evaluate(()=>window.__step(1,1000/30));await p.screenshot({path:`${FR}/f${String(fno++).padStart(4,'0')}.jpg`,type:'jpeg',quality:90,timeout:120000})}}
const ov=(o,cta)=>p.evaluate(([o,cta])=>{const t=document.getElementById('trl');t.style.opacity=o;t.querySelector('.cta').style.display=cta?'':'none'},[o,cta]);
const cap=(txt,o)=>p.evaluate(([txt,o])=>{const c=document.getElementById('cap');c.textContent=txt;c.style.opacity=o},[txt,o]);
const capFade=(txt,n)=>i=>cap(txt,Math.min(1,i/5,(n-i)/5));
const scene=async(code)=>{await X(code);await p.evaluate(()=>window.__step(30))};// settle 0.5 s (not recorded)
const SET=(d,cu,wx)=>`if(st!=='play')start();clearObs();ceils=[];fxReset();dist=${d};nextZ=-dist-60;introT=40;CU=${cu};wInit=false;WX.k='${wx}';WX.next=999;P.x=0;P.y=0;P.vx=0;P.mode='ground';upright();hp=MAXHP;bossNext=dist+99999;EVT.t=999;CAM.position.set(0,3.4,-dist+9.5);`;
const FORCE=(r,z)=>`{const R0=Math.random,q=[${r}];Math.random=()=>q.length?q.shift():R0();const L=spawn(${z});Math.random=R0;nextZ=Math.min(nextZ,${z}-L-55)}`;
// A: title card over the orbiting car (city, night) 2.0 s
if(want('A')){
await scene(`title();dist=150;CU=.234;wInit=false;$('ui').style.display='none';`);
await frames(60,i=>ov(Math.min(1,i/8,(60-i)/8)*0.92));await ov(0);
}else fno+=60;
// B: ramp jump + front flip (countryside, day) 2.5 s
if(want('B')){
await scene(`$('ui').style.display='';`+SET(1900,.79,'clear')+FORCE('.35',-1900-34)+`window.__steer=0;`);
await frames(75,async i=>{await capFade('HIT THE RAMPS',75)(i);if(i===40)await X(`trick('p',-1)`);if(i===58)await X(`trick('r',1)`)});
}else fno+=75;
// C: loop-the-loop (city, night, rain) 2.0 s
if(want('C')){
await scene(SET(620,.234,'rain')+FORCE('.05',-620-26));
await frames(60,capFade('LOOP · FLIP · STICK',60));
}else fno+=60;
// D: meteor shower (desert, sunset) 2.2 s
if(want('D')){
await scene(SET(3500,.9625,'clear')+`evtStart('meteor');EVT.cur.sp=0;for(let i=0;i<5;i++){rockSpawn(curSpeed());const r=EVT.rocks[EVT.rocks.length-1];r.y=4+i*4;r.vy=-14}`);
await frames(66,capFade('DODGE SPACE ROCKS',66));
}else fno+=66;
// E: rival race (coast, day) 2.2 s
if(want('E')){
await scene(SET(5300,.79,'clear')+`evtStart('rival');EVT.rival.rz=-9;EVT.rival.phase='lead';EVT.rival.hp=160;RUN.w='foam';AMMO.foam=40;`);
await frames(66,async i=>{await capFade('RACE TURBO NOODLE',66)(i);if(i===34)await X(`P.boostT=1.4;P.fuel=1`)});
}else fno+=66;
// F: boss knockout (snowy mountains, snow) 2.5 s
if(want('F')){
await scene(SET(7000,.79,'snow')+`RUN.w='spread';AMMO.spread=60;startBoss('kaiju');boss.t=1.2;boss.rz=Math.max(boss.rz,-16);if(boss.home)boss.home=-16;$('bint').style.display='none';`);
await frames(75,async i=>{await capFade('BOSS KNOCKOUTS',75)(i);if(i===44)await X(`if(boss)fxBossDown()`)});await cap('',0);
}else fno+=75;
// G: end card 1.8 s
if(want('G')){
await scene(`$('bint').style.display='';over('trailer');`);await p.evaluate(()=>window.__step(60));await scene(`title();dist=300;CU=.234;wInit=false;$('ui').style.display='none';`);
await frames(54,i=>ov(Math.min(1,i/6)*0.92,true));
}else fno+=54;
console.log('frames',fno,'errors',errs.length?errs.slice(0,5):'none');fs.writeFileSync(OUT+'.log','frames '+fno+' errors '+JSON.stringify(errs.slice(0,10)));await b.close();
const vf=SW!==W?`scale=${SW}:${SH}:flags=lanczos,format=yuv420p`:'format=yuv420p';
execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',`${FR}/f%04d.jpg`,'-vf',vf,'-c:v','libx264','-preset','slow','-crf','19','-movflags','+faststart','-r','30',OUT]);
console.log('wrote',OUT,(fs.statSync(OUT).size/1024/1024).toFixed(2)+' MB');})();
