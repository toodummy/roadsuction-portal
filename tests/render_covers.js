const {chromium}=require(process.env.PW||'playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const jobs=JSON.parse(process.argv[2]);
await Promise.all([0,1,2].map(async k=>{for(let i=k;i<jobs.length;i+=3){const [n,w,h,d,cz]=jobs[i];const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:d});
 await p.goto(`http://127.0.0.1:8096/index.html?cover=1&env=city&time=night&cz=${cz}`);await p.addStyleTag({content:'#hud,#tb,#tc,#ann,#pop,#big,#bint,#ui,.dmgn,.bub,#bossb{display:none!important}'});await p.waitForTimeout(4500);await p.screenshot({path:`/tmp/rend/${n}.png`});await p.close()}}));
await b.close()})()
