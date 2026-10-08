(function(){
'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const st=document.createElement('style');
st.textContent=`#stOv{position:fixed;left:12px;top:12px;z-index:9999;width:392px;max-height:92vh;overflow:auto;
background:rgba(10,10,18,.92);color:#e8e8f0;font:12px/1.5 ui-monospace,Consolas,monospace;border:1px solid #3a3a55;
border-radius:10px;padding:10px 12px}
#stOv h3{margin:0 0 6px;font-size:13px;color:#8cf}
#stOv button{cursor:pointer;background:#2b3a67;color:#fff;border:1px solid #4a5b8c;border-radius:6px;padding:6px 12px;font-size:12px;margin:4px 6px 6px 0}
#stOv pre{white-space:pre-wrap;word-break:break-word;margin:4px 0;font-size:11.5px}`;
document.head.appendChild(st);
const ov=document.createElement('div');ov.id='stOv';
ov.innerHTML='<h3>Nix 体检 · 帧级自测</h3><div id="stMeta">就绪</div><button id="stRun">开始自测</button><button id="stCopy" style="display:none">复制结果</button><pre id="stOut"></pre>';
document.body.appendChild(ov);
const out=ov.querySelector('#stOut'),meta=ov.querySelector('#stMeta');
let lines=[];
window.__stDone=false;window.__stErr=null;window.__stStage='idle';
function say(s){lines.push(s);out.textContent=lines.join('\n');out.scrollTop=out.scrollHeight;}
function sample(durMs){return new Promise(res=>{
  let done=false;const a=[];let last=performance.now(),t0=last;
  const guard=setTimeout(()=>{if(!done){done=true;res(a.slice(2));}},durMs+1500);
  (function tick(){if(done)return;const n=performance.now();a.push(n-last);last=n;
    if(n-t0<durMs)requestAnimationFrame(tick);else{done=true;clearTimeout(guard);res(a.slice(2));}})();});}
function stats(a){if(!a||!a.length)return null;const s=[...a].sort((x,y)=>x-y),med=s[s.length>>1];
  return{n:a.length,med:+med.toFixed(2),p95:+s[Math.floor(s.length*.95)].toFixed(2),max:+Math.max(...a).toFixed(2),
  drop:a.filter(x=>x>med*1.6).length,fps:+(1000/med).toFixed(1)};}
function fmt(name,r){if(!r)return name.padEnd(22)+' | 采样失败';return name.padEnd(22)+' | 中位 '+String(r.med).padStart(6)+'ms | '+String(r.fps).padStart(5)+'fps | 掉'+String(r.drop).padStart(3)+' | 最大 '+r.max+'ms';}
function gradCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#101a3a');gr.addColorStop(.5,'#6a2f7a');gr.addColorStop(1,'#f07a2a');
  g.fillStyle=gr;g.fillRect(0,0,w,h);return{c,g};}
function toUrl(c){return new Promise(r=>{try{c.toBlob(b=>r(b?URL.createObjectURL(b):null),'image/jpeg',.9)}catch(e){r(null)}});}
function setBg(url){const b=document.getElementById('bg-layer'),v=document.getElementById('cv');if(v)v.remove();
  b.style.display='';if(url){b.style.backgroundImage='url('+url+')';b.classList.add('uploaded');}else{b.style.backgroundImage='';b.classList.remove('uploaded');}}

async function dragTest(mode){
  const btn=document.querySelector('#search-bar .drag-btn');const el=document.getElementById('search-bar');
  if(!btn)return{err:'找不到拖拽钮'};
  const r=btn.getBoundingClientRect();const x0=r.left+r.width/2,y0=r.top+r.height/2;
  const mk=(t,x,y,b)=>new MouseEvent(t,{clientX:x,clientY:y,buttons:b,bubbles:true,button:0,view:window});
  btn.dispatchEvent(mk('mousedown',x0,y0,1));await sleep(80);
  const dur=2000,dx=Math.min(500,innerWidth*.4),dy=160,t0=performance.now();let lx=x0,ly=y0;const samp=[];
  let nPtr=0,timer=null;
  const at=p=>({x:x0+dx*p,y:y0+dy*p});
  if(mode==='timer'){timer=setInterval(()=>{const p=Math.min(1,(performance.now()-t0)/dur);const q=at(p);lx=q.x;ly=q.y;nPtr++;
    document.dispatchEvent(mk('mousemove',lx,ly,1));},8);}
  await new Promise(res=>{let last=performance.now();const g=setTimeout(res,dur+2000);
    (function tick(){const n=performance.now();samp.push({dt:n-last,tf:getComputedStyle(el).transform});last=n;
      if(mode==='perframe'){const p=Math.min(1,(n-t0)/dur);for(let k=1;k<=3;k++){const q=at(Math.min(1,p+(k-1)*0.004));lx=q.x;ly=q.y;nPtr++;document.dispatchEvent(mk('mousemove',lx,ly,1));}}
      if(n-t0<dur)requestAnimationFrame(tick);else{clearTimeout(g);res();}})();});
  if(timer)clearInterval(timer);document.dispatchEvent(mk('mouseup',lx,ly,0));
  const parse=t=>{const m=/(-?[\d.]+),\s*(-?[\d.]+)\)\s*$/.exec(t||'');return m?[+m[1],+m[2]]:null;};
  let stall=0,prev=null;for(const f of samp){const v=parse(f.tf);if(prev&&v&&Math.abs(v[0]-prev[0])<0.01&&Math.abs(v[1]-prev[1])<0.01)stall++;if(v)prev=v;}
  return Object.assign({frames:samp.length,stall,ptrEvents:nPtr,ptrHz:Math.round(nPtr/(dur/1000))},stats(samp.map(f=>f.dt)));
}

async function run(){
  out.textContent='';lines=[];
  window.__stStage='env';
  let gpu='n/a';try{const gl=document.createElement('canvas').getContext('webgl');
    if(gl){const e=gl.getExtension('WEBGL_debug_renderer_info');if(e)gpu=String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)).slice(0,70);}}catch(e){}
  say('=== 环境 ===');
  say('屏幕 '+screen.width+'x'+screen.height+' @'+devicePixelRatio+'x  窗口 '+innerWidth+'x'+innerHeight);
  say('CPU 核数 '+navigator.hardwareConcurrency);
  say('渲染器 '+gpu);
  window.__stStage='baseline';
  const base=stats(await sample(2000));
  say('刷新率估计 ≈ '+(base?base.fps:'?')+'Hz（空闲中位帧间隔 '+(base?base.med:'?')+'ms）');
  say('');say('=== 1. 空闲基线 ===');say(fmt('渐变背景',base));
  say('');say('=== 2. 拖拽：两组指针速率对比 ===');
  window.__stStage='drag';
  let dispHz=base?base.fps:144;
  for(const [name,mode] of [['A 低速率指针(~125Hz)',['timer'][0]],['B 每帧多发(≈3×刷新率)',['perframe'][0]]]){
    try{const d=await dragTest(mode);
      if(d.err){say('✗ '+d.err);continue;}
      const pct=(d.stall/d.frames*100).toFixed(1);
      say(name+'：'+fmt(' ',d).trim()+' | 采样 '+d.frames+' 帧 | 指针事件 '+d.ptrEvents+'(≈'+d.ptrHz+'Hz)');
      say('   → 指针动而元素不动的帧 '+d.stall+'/'+d.frames+' = '+pct+'%   理论下限 '+Math.max(0,(1-d.ptrHz/dispHz)*100).toFixed(1)+'%');
      await sleep(400);
    }catch(e){say(name+' 异常: '+e.message);}
  }
  say('   （判读：若 B 组掉到接近理论下限/近 0，说明只是输入采样率，不是 Nix 缺陷）');
  window.__stStage='bg';
  say('');say('=== 3. 背景档位 ===');
  const tiers=[];
  try{const a=gradCanvas(1920,1080);tiers.push(['1080p 图片',await toUrl(a.c)]);
    const b=gradCanvas(3840,2160);
    b.g.fillStyle='rgba(255,255,255,.28)';
    for(let i=0;i<2500;i++)b.g.fillRect(Math.random()*3840,Math.random()*2160,Math.random()*90,Math.random()*90);
    tiers.push(['4K 图片+2.5k细节',await toUrl(b.c)]);}catch(e){say('生成素材异常: '+e.message);}
  for(const [n,u] of tiers){setBg(u);await sleep(700);const s=stats(await sample(2200));say(fmt(n,s));if(u)URL.revokeObjectURL(u);}
  setBg(null);await sleep(400);
  window.__stStage='canvas';
  try{
    const cv=document.createElement('canvas');cv.width=1280;cv.height=720;
    cv.style.cssText='position:fixed;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;';
    document.getElementById('bg-layer').style.display='none';document.getElementById('bg-layer').after(cv);
    const g2=cv.getContext('2d');let raf=0;
    (function anim(){const i=raf++;const gr=g2.createLinearGradient(0,0,1280,720);
      gr.addColorStop(0,'hsl('+i%360+',70%,45%)');gr.addColorStop(1,'hsl('+(i+120)%360+',70%,25%)');
      g2.fillStyle=gr;g2.fillRect(0,0,1280,720);for(let k=0;k<30;k++){g2.beginPath();g2.arc((i*7+k*97)%1280,(i*5+k*61)%720,36,0,7);g2.fill();}
      requestAnimationFrame(anim);})();
    await sleep(700);say(fmt('实时重绘画布720p',stats(await sample(2200))));
    cv.remove();document.getElementById('bg-layer').style.display='';
  }catch(e){say('画布档异常: '+e.message);}
  window.__stStage='video';
  try{
    const cv2=document.createElement('canvas');cv2.width=960;cv2.height=540;const g3=cv2.getContext('2d');
    let raf2=0;(function anim2(){const i=raf2++;g3.fillStyle='hsl('+i%360+',60%,40%)';g3.fillRect(0,0,960,540);
      g3.fillStyle='#fff';g3.fillRect((i*9)%960,220,110,110);requestAnimationFrame(anim2);})();
    const stream=cv2.captureStream(30);const vid=document.createElement('video');vid.id='cv';
    vid.autoplay=true;vid.loop=true;vid.muted=true;vid.playsInline=true;vid.srcObject=stream;
    vid.style.cssText='position:fixed;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;';
    document.getElementById('bg-layer').after(vid);
    await Promise.race([vid.play(),sleep(1500)]).catch(()=>{});
    await sleep(900);say(fmt('视频流 540p@30',stats(await sample(2200))));
    vid.remove();stream.getTracks().forEach(t=>t.stop());
  }catch(e){say('视频档异常: '+e.message);}
  window.__stStage='panel';
  try{
    document.getElementById('bg-layer').style.display='';document.getElementById('settings-panel').classList.add('open');
    document.getElementById('panel-overlay').classList.add('show');await sleep(800);
    say(fmt('设置面板开(毛玻璃blur24)',stats(await sample(2200))));
    document.getElementById('settings-panel').classList.remove('open');document.getElementById('panel-overlay').classList.remove('show');
  }catch(e){say('面板档异常: '+e.message);}
  say('');say('=== 口径 ===');
  say('· 掉帧 = 帧间隔 > 中位数×1.6');
  say('· 拖拽「元素不动帧」>20% 视为微卡顿信号');
  say('· 页面内自测，采样本身有轻微观测者效应');
  window.__stStage='done';window.__stDone=true;
  ov.querySelector('#stCopy').style.display='inline-block';
  meta.textContent='完成 · 屏幕约 '+(base?base.fps:'?')+'Hz';
}
ov.querySelector('#stRun').addEventListener('click',async e=>{e.target.disabled=true;meta.textContent='测试中…';
  try{await run()}catch(err){say('✗ 顶层异常: '+err.message);window.__stErr=err.message;window.__stDone=true;}e.target.disabled=false;});
ov.querySelector('#stCopy').addEventListener('click',()=>{navigator.clipboard.writeText(lines.join('\n')).then(()=>{meta.textContent='已复制到剪贴板';}).catch(()=>{meta.textContent='复制失败，请手动截图'});});
})();
