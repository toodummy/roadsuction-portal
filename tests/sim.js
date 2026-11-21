// Balance sim: runs the game logic headless (update() only, no rendering) with a passive player and a simple bot.
// node tests/sim.js [runs] [seconds]   (needs `python3 -m http.server 8096` in the repo root)
const {chromium}=require(process.env.PW||'/workspace/pwtest/node_modules/playwright-core');
const RUNS=+process.argv[2]||6,SECS=+process.argv[3]||75;
const SIM=`(()=>{SAVE.cr=0;start();const T=[];let t=0,firstEnemy=null,firstHit=null,bossAt=null;const dt=1/60;
 while(t<window.__sim.SECS&&st==='play'){
  if(window.__sim.mode==='bot'){fireHeld=true;const z=-dist;let thr=false;
   for(const o of obs){if(o.kind!=='car'||o.dead)continue;const ahead=z-o.z0;if(ahead<26&&z>o.z1-3&&Math.abs(P.x-o.x)<o.w/2+1.4)thr=true}
   for(const e of EN)if(!e.dead&&e.type!=='drone'&&Math.abs(e.rz)<9&&Math.abs(P.x-e.x)<2.5)thr=true;
   if(boss&&boss.parts)for(const q of boss.parts)if(q.hp>0&&Math.abs(q.z-z)<14&&Math.abs(q.x-P.x)<2.5&&q.y<4)thr=true;
   let dodge=0;for(const c of CIRC)if(Math.abs(c.x-P.x)<c.R+1)dodge=c.x>P.x?-1:1;for(const w of WARN)if(Math.abs(w.x-P.x)<w.w/2+1)dodge=w.x>P.x?-1:1;
   if(typeof EVT!=='undefined')for(const m of EVT.rocks||[])if(!m.dead&&m.z>z-30&&m.z<z&&Math.abs(m.x-P.x)<2.2)dodge=m.x>P.x?-1:1;
   inp.steer=dodge;
   if(thr&&!inp.thrust)thrustOn();else if(!thr)thrustOff();
  }
  update(dt);t+=dt;
  if(firstEnemy==null&&EN.length)firstEnemy=t;if(firstHit==null&&hits>0)firstHit=t;if(bossAt==null&&boss)bossAt=t;
  if(Math.abs(t-30)<dt/2||Math.abs(t-60)<dt/2)T.push({t:Math.round(t),hp:Math.round(hp),d:Math.round(dist)});}
 const r={alive:st==='play',t:Math.round(t),hp:Math.round(hp),hits,dist:Math.round(dist),kills:RUN.kills,bosses:RUN.bosses,cr:RUN.cr,ramps:RUN.ramps,rivals:RUN.rivals,dodged:RUN.dodged,flips,loops,firstEnemy:firstEnemy&&+firstEnemy.toFixed(1),firstHit:firstHit&&+firstHit.toFixed(1),bossAt:bossAt&&+bossAt.toFixed(1),bossHpLeft:boss?Math.round(100*boss.parts.reduce((a,p)=>a+Math.max(0,p.hp),0)/boss.max):null,T,events:typeof EVT!=='undefined'?EVT.log.slice():[]};
 if(st==='play')over('sim');thrustOff();fireHeld=false;inp.steer=0;return r})()`;
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:480,height:270}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:8096/index.html?portal=none');await p.waitForTimeout(2000);
const out={};
for(const mode of (process.env.MODES||'passive,bot').split(',')){out[mode]=[];for(let r=0;r<RUNS;r++){
 const res=await p.evaluate(([mode,SECS,SIM])=>{window.__sim={mode,SECS};return __rd.x(SIM)},[mode,SECS,SIM]);
 out[mode].push(res);console.log(mode,JSON.stringify(res));await p.waitForTimeout(800)}}
const avg=(a,k)=>{const v=a.filter(r=>r[k]!=null);return v.length?(v.reduce((s,r)=>s+(+r[k]||0),0)/v.length).toFixed(1):'-'};
for(const m in out){const a=out[m];console.log(`${m}: survived ${a.filter(r=>r.alive).length}/${a.length} · avg t ${avg(a,'t')}s · dist ${avg(a,'dist')} · hits ${avg(a,'hits')} · hp ${avg(a,'hp')} · kills ${avg(a,'kills')} · bosses ${avg(a,'bosses')} · cr ${avg(a,'cr')} · ramps ${avg(a,"ramps")} · rivals ${avg(a,"rivals")} · dodged ${avg(a,"dodged")} · firstEnemy ${avg(a,'firstEnemy')}s · firstHit ${avg(a,'firstHit')}s · bossAt ${avg(a,'bossAt')}s · bossHpLeft ${avg(a,'bossHpLeft')}%`)}
console.log('errors:',errs.length?errs.slice(0,5):'none');await b.close()})();
