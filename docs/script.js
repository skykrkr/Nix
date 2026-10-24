(function(){
'use strict';

/* ═══════════════════════════ Constants ═══════════════════════════ */
const ENGINES={bing:q=>`https://www.bing.com/search?q=${encodeURIComponent(q)}`,google:q=>`https://www.google.com/search?q=${encodeURIComponent(q)}`,baidu:q=>`https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,duckduckgo:q=>`https://duckduckgo.com/?q=${encodeURIComponent(q)}`,sogou:q=>`https://www.sogou.com/web?query=${encodeURIComponent(q)}`};
const DEF={searchBar:{show:true,width:520,height:48,radius:50,posX:50,posY:50,opacityDef:25,opacityHover:100,dragBtnOpacity:10},clock:{show:true,color:'light',fontSize:100,opacity:100,fontWeight:600,posX:50,posY:40,dragBtnOpacity:10},engine:'bing',videoVolume:100};

/* ═══════════════════════════ State ═══════════════════════════ */
let state=JSON.parse(JSON.stringify(DEF));
let _bgBlobUrl=null,_thumbBlobUrls=[],_cv=null;

// Restore saved state
(function(){try{const s=JSON.parse(localStorage.getItem('ntp_state'));if(s){Object.assign(state.searchBar,s.searchBar);Object.assign(state.clock,s.clock);if(s.design)state.design=s.design;if(s.globalScale!=null)state.globalScale=s.globalScale;if(s.snapX!=null)state.snapX=s.snapX;if(s.snapPair!=null)state.snapPair=s.snapPair;if(s.volDef100)state.volDef100=s.volDef100;if(s.engine)state.engine=s.engine;if(s.videoVolume!==undefined)state.videoVolume=s.videoVolume}}catch(e){}})();
// Compute clock posY as center of composite block above search bar
function calcBlockLayout(){const clkH=DEF.clock.fontSize,gap=30,sbH=DEF.searchBar.height,totalH=clkH+gap+sbH,topY=(innerHeight-totalH)/2;return{topY,clkH,gap,sbH}}
function computeClockPosY(){const b=calcBlockLayout();return Math.round((b.topY+b.clkH/2)/innerHeight*100)}
function computeSearchBarPosY(){const b=calcBlockLayout();return Math.round((b.topY+b.clkH+b.gap+b.sbH/2)/innerHeight*100)}
// First load: compute composite block layout (clock above search bar, block centered)
(function(){if(!localStorage.getItem('ntp_state')){state.clock.posY=computeClockPosY();state.searchBar.posY=computeSearchBarPosY()}})();
// 设计画布：旧数据（视口百分比）首次升级时把当前视口当作画布尺寸，视觉零变化
(function(){
  if(!state.design) state.design={w:innerWidth||1280,h:innerHeight||800};
  if(state.searchBar.scale==null) state.searchBar.scale=1;
  if(state.clock.scale==null) state.clock.scale=1;
  if(state.globalScale==null) state.globalScale=1;
  if(state.snapX==null) state.snapX=false;
  if(state.snapPair==null) state.snapPair=false;
  if(state.videoVolume==null) state.videoVolume=100;
  if(!state.volDef100){if(state.videoVolume===0)state.videoVolume=100;state.volDef100=true}
})();

/* ═══════════════════════════ Helpers ═══════════════════════════ */
const $=id=>document.getElementById(id);
function calcPos(w,h,pX,pY){return{l:(innerWidth*pX/100)-w/2,t:(innerHeight*pY/100)-h/2}}
function posToPct(w,h,l,t){return{pX:((l+w/2)/innerWidth)*100,pY:((t+h/2)/innerHeight)*100}}
// 位置统一由 transform 表达：拖拽与落位同一条渲染路径，避免合成层/布局层取整不一致导致 1px 跳变
function placeHandle(el,t,h,k){const kk=k||1;const below=innerHeight-(t+h*kk);el.classList.remove('handle-top','handle-in');if(below<30*kk){if(t>=30*kk)el.classList.add('handle-top');else el.classList.add('handle-in')}}
function setPos(el,l,t,k){el.style.left='0px';el.style.top='0px';el.style.transform='translate3d('+l+'px,'+t+'px,0) scale('+(k==null?1:k)+')'}
// 越界钳制：把中心点百分比夹到「元素整体不出视口」的范围内
/* 设计画布：位置以设计坐标的百分比保存，渲染时整体等比缩放到当前视口 */
function viewT(){const d=state.design,g=state.globalScale||1;const raw=Math.min(innerWidth/d.w,innerHeight/d.h);const sc=raw*g;return{s:sc,ox:(innerWidth-d.w*sc)/2,oy:(innerHeight-d.h*sc)/2}}

let _guideT=null;
function setGuide(on,x){
  const g=$('snap-guide');if(!g)return;
  clearTimeout(_guideT);
  if(on&&x!=null)g.style.left=x+'px';
  g.classList.toggle('on',!!on);
}
function snapCenter(vx,el){
  const TH=8;
  // 优先贴另一个组件的中线
  if(state.snapPair){
    const others=[sb,clk].filter(function(o){return o&&o!==el&&o.getBoundingClientRect().width>0});
    for(let i=0;i<others.length;i++){
      const r=others[i].getBoundingClientRect(),c=r.left+r.width/2;
      if(Math.abs(vx-c)<=TH){setGuide(true,c);return c}
    }
  }
  if(state.snapX){
    const mid=innerWidth/2;
    if(Math.abs(vx-mid)<=TH){setGuide(true,mid);return mid}
  }
  setGuide(false);return vx;
}
function designPx(pX,pY,w,h,k){const t=viewT(),kk=t.s*(k||1);const cx=pX/100*state.design.w,cy=pY/100*state.design.h;return{x:t.ox+cx*t.s-w*kk/2,y:t.oy+cy*t.s-h*kk/2,k:kk}}
function clampPct(w,h,pX,pY,k){const t=viewT(),kk=t.s*(k||1),hw=w*kk/2,hh=h*kk/2;let vx=t.ox+(pX/100*state.design.w)*t.s,vy=t.oy+(pY/100*state.design.h)*t.s;
  // 元素小于视口：中心夹在 [hw, W-hw]，两边不出界
  // 元素大于视口：区间反转，要求元素始终覆盖视口；拖到端点时贴边，不露背景
  const loX=Math.min(hw,innerWidth-hw),hiX=Math.max(hw,innerWidth-hw),loY=Math.min(hh,innerHeight-hh),hiY=Math.max(hh,innerHeight-hh);
  vx=Math.min(Math.max(vx,loX),hiX);vy=Math.min(Math.max(vy,loY),hiY);
  return{pX:((vx-t.ox)/t.s)/state.design.w*100,pY:((vy-t.oy)/t.s)/state.design.h*100}}

function clampState(){const s=state.searchBar,c=state.clock;const a=clampPct(s.width,s.height,s.posX,s.posY,s.scale);s.posX=a.pX;s.posY=a.pY;const cw=clk.offsetWidth,ch=clk.offsetHeight;if(cw>0&&ch>0){const b=clampPct(cw,ch,c.posX,c.posY,c.scale);c.posX=b.pX;c.posY=b.pY}else{c.posX=Math.min(100,Math.max(0,c.posX));c.posY=Math.min(100,Math.max(0,c.posY))}}
function getSearchUrl(engine,q){return(ENGINES[engine]||ENGINES.bing)(q.trim())}

/* ═══════════════════════════ DOM Refs ═══════════════════════════ */
const bgL=$('bg-layer'),sb=$('search-bar'),si=$('search-input');
const gear=$('gear-btn'),pn=$('settings-panel'),ov=$('panel-overlay');
const es=$('engine-select'),clk=$('clock'),ci=clk.querySelector('.clock-inner');
const ht=$('hint'),bgLst=$('bg-list'),bgUp=document.querySelector('#bgc input[type="file"]'),rBg=$('reset-bg');
const tplLst=$('tpl-list'),tplN=$('tpl-name'),tplSv=$('tpl-save');
const sbTog=$('sb-toggle');
const sw=$('sw'),swv=$('swv'),sh=$('sh'),shv=$('shv'),sr=$('sr'),srv=$('srv');
const sx=$('sx'),sxv=$('sxv'),sy=$('sy'),syv=$('syv'),sod=$('sod'),sodv=$('sodv'),soh=$('soh'),sohv=$('sohv');
const rSb=$('reset-search'),ct=$('ct'),ccol=$('ccol'),ccolv=$('ccolv');
const csz=$('csz'),cszv=$('cszv'),co=$('co'),cov=$('cov'),cfw=$('cfw'),cfwv=$('cfwv');
const cx=$('cx'),cxv=$('cxv'),cy=$('cy'),cyv=$('cyv'),rClk=$('reset-clock');
const sd=$('sd'),sdv=$('sdv'),cd=$('cd'),cdv=$('cdv');
const vol=$('vol'),vv=$('vv');

/* ═══════════════════════════ Rendering ═══════════════════════════ */
function applyCSS(){
  const s=state.searchBar,c=state.clock,R=document.documentElement.style;
  R.setProperty('--sb-width',s.width+'px');
  R.setProperty('--sb-height',s.height+'px');
  R.setProperty('--sb-pad',Math.round(s.height*.5)+'px');
  R.setProperty('--sb-radius',s.radius+'px');
  R.setProperty('--sb-bg','rgba(255,255,255,'+(0.10*(s.opacityDef/100))+')');
  R.setProperty('--sb-bg-hover','rgba(255,255,255,'+(0.14*(s.opacityHover/100))+')');
  R.setProperty('--sb-font-size',Math.round(s.height*.36)+'px');
  // 文字不透明度与「底色透明度」解耦：底色可以很淡，字必须看得清
  R.setProperty('--sb-input-opacity','0.92');
  R.setProperty('--clk-color',c.color==='dark'?'#000':'#fff');
  R.setProperty('--clk-opacity',String(c.opacity/100));
}

function applyPositions(){
  clampState();
  const s=state.searchBar,c=state.clock;
  sb.classList.toggle('hidden',!s.show);
  if(s.show){const p=designPx(s.posX,s.posY,s.width,s.height,s.scale);setPos(sb,p.x,p.y,p.k);placeHandle(sb,p.y,s.height,p.k)}
  clk.classList.toggle('show',c.show);
  if(c.show){
    ci.style.fontSize=c.fontSize+'px';ci.style.fontWeight=c.fontWeight;
    const cw=clk.offsetWidth,ch=clk.offsetHeight;
    if(cw>0&&ch>0){const p=designPx(c.posX,c.posY,cw,ch,c.scale);setPos(clk,p.x,p.y,p.k);placeHandle(clk,p.y,ch,p.k)}
  }
  const sbBtn=sb.querySelector('.drag-btn'),clkBtn=clk.querySelector('.drag-btn');
  if(sbBtn)sbBtn.style.background='rgba(255,255,255,'+(s.dragBtnOpacity/100)+')';
  if(clkBtn)clkBtn.style.background='rgba(255,255,255,'+(c.dragBtnOpacity/100)+')';
}

function syncSlidersUI(){
  const s=state.searchBar,c=state.clock;
  sbTog.checked=s.show;sw.value=s.width;sh.value=s.height;sr.value=s.radius;
  sx.value=Math.round(s.posX);sy.value=Math.round(s.posY);sod.value=s.opacityDef;soh.value=s.opacityHover;
  swv.textContent=s.width+'px';shv.textContent=s.height+'px';srv.textContent=s.radius+'px';
  sxv.textContent=Math.round(s.posX)+'%';syv.textContent=Math.round(s.posY)+'%';
  sodv.textContent=s.opacityDef+'%';sohv.textContent=s.opacityHover+'%';
  sdv.textContent=s.dragBtnOpacity+'%';sd.value=s.dragBtnOpacity;
  {const e1=$('ssc'),e2=$('sscv');if(e1){e1.value=Math.round((s.scale||1)*100);if(e2)e2.textContent=Math.round((s.scale||1)*100)+'%'}}
  {const e1=$('csc'),e2=$('cscv');if(e1){e1.value=Math.round((c.scale||1)*100);if(e2)e2.textContent=Math.round((c.scale||1)*100)+'%'}}

  ct.checked=c.show;csz.value=c.fontSize;co.value=c.opacity;cfw.value=c.fontWeight;
  cx.value=Math.round(c.posX);cy.value=Math.round(c.posY);cd.value=c.dragBtnOpacity;
  cszv.textContent=c.fontSize+'px';cov.textContent=c.opacity+'%';cfwv.textContent=c.fontWeight;
  cxv.textContent=Math.round(c.posX)+'%';cyv.textContent=Math.round(c.posY)+'%';
  {const g=$('gsc'),gv=$('gscv'),sn=$('snapx');if(g){g.value=Math.round((state.globalScale||1)*100);if(gv)gv.textContent=g.value+'%'}if(sn)sn.checked=!!state.snapX;const sp2=$('snapp');if(sp2)sp2.checked=!!state.snapPair}
  cdv.textContent=c.dragBtnOpacity+'%';
  ccol.value=c.color;ccolv.textContent=c.color==='light'?'白色':'黑色';
  es.value=state.engine;
  vv.textContent=state.videoVolume+'%';vol.value=state.videoVolume;
}

function applyAll(){applyCSS();applyPositions();syncSlidersUI();autoSave()}

/* ═══════════════════════════ Slider Handlers ═══════════════════════════ */
function onSS(e){
  const s=state.searchBar;s.show=sbTog.checked;
  s.width=+sw.value;s.height=+sh.value;s.radius=+sr.value;
  if(e&&(e.target===sx||e.target===sy)){s.posX=+sx.value;s.posY=+sy.value}
  {const el=$('ssc');if(el){s.scale=+el.value/100}}
  s.opacityDef=+sod.value;s.opacityHover=+soh.value;s.dragBtnOpacity=+sd.value;applyAll()
}
function onCS(e){
  const c=state.clock;c.show=ct.checked;c.color=ccol.value;c.fontSize=+csz.value;
  c.opacity=+co.value;c.fontWeight=+cfw.value;
  if(e&&(e.target===cx||e.target===cy)){c.posX=+cx.value;c.posY=+cy.value}
  {const el=$('csc');if(el){c.scale=+el.value/100}}
  c.dragBtnOpacity=+cd.value;applyAll()
}

sbTog.addEventListener('change',onSS);sw.addEventListener('input',onSS);sh.addEventListener('input',onSS);
sr.addEventListener('input',onSS);sx.addEventListener('input',onSS);sy.addEventListener('input',onSS);
sod.addEventListener('input',onSS);soh.addEventListener('input',onSS);sd.addEventListener('input',onSS);
ct.addEventListener('change',onCS);ccol.addEventListener('change',onCS);csz.addEventListener('input',onCS);
co.addEventListener('input',onCS);cfw.addEventListener('input',onCS);cx.addEventListener('input',onCS);
cy.addEventListener('input',onCS);cd.addEventListener('input',onCS);
es.addEventListener('change',()=>{state.engine=es.value;autoSave()});
vol.addEventListener('input',()=>{state.videoVolume=+vol.value;vv.textContent=vol.value+'%';if(_cv)activateAudio(_cv);autoSave()});
rSb.addEventListener('click',()=>{Object.assign(state.searchBar,DEF.searchBar);state.searchBar.posY=computeSearchBarPosY();applyAll();toast('搜索栏已还原')});
rClk.addEventListener('click',()=>{Object.assign(state.clock,DEF.clock);state.clock.posY=computeClockPosY();applyAll();toast('时间已还原')});

/* ═══════════════════════════ Panel Toggle ═══════════════════════════ */
function op(){pn.classList.add('open');ov.classList.add('show')}
function cp(){pn.classList.remove('open');ov.classList.remove('show')}
gear.addEventListener('click',()=>pn.classList.contains('open')?cp():op());
ov.addEventListener('click',cp);
document.querySelectorAll('.collapse-header').forEach(h=>{h.addEventListener('click',()=>{const t=document.getElementById(h.dataset.target);if(!t)return;h.querySelector('.arrow').classList.toggle('open');if(t.classList.contains('closed')){t.classList.remove('closed');t.style.maxHeight=t.scrollHeight+'px'}else{t.style.maxHeight='0';t.addEventListener('transitionend',()=>t.classList.add('closed'),{once:true})}})});

/* ═══════════════════════════ Search ═══════════════════════════ */
si.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=si.value.trim();if(q)window.open(getSearchUrl(es.value,q),'_blank')}});

/* ═══════════════════════════ Drag ═══════════════════════════ */
document.querySelectorAll('.drag-btn').forEach(btn=>{
  const p=btn.parentElement;let drag=null;
  const sizeOf=()=>{
    if(p===clk)return{w:clk.offsetWidth,h:clk.offsetHeight,k:state.clock.scale};
    return{w:state.searchBar.width,h:state.searchBar.height,k:state.searchBar.scale};
  };
  btn.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    const r=p.getBoundingClientRect();
    drag={ox:e.clientX-r.left,oy:e.clientY-r.top,pid:e.pointerId,lx:e.clientX,ly:e.clientY,
          vx:r.left+r.width/2,vy:r.top+r.height/2,px:e.clientX,py:e.clientY};
    if(btn.setPointerCapture)try{btn.setPointerCapture(e.pointerId)}catch(err){}
    p.classList.add('dragging');e.preventDefault();
  });
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pid)return;
    drag.lx=e.clientX;drag.ly=e.clientY;
    const t=viewT(),d=state.design;
    const vx=snapCenter(drag.vx+(e.clientX-drag.px),p),vy=drag.vy+(e.clientY-drag.py);
    const pX=((vx-t.ox)/t.s)/d.w*100,pY=((vy-t.oy)/t.s)/d.h*100;
    const z=sizeOf(),q=designPx(pX,pY,z.w,z.h,z.k);
    setPos(p,q.x,q.y,q.k);
  });
  function endDrag(e){
    if(!drag)return;
    if(e&&e.pointerId!==drag.pid)return;
    const t=viewT(),d=state.design;
    const px=(e&&e.clientX!=null)?e.clientX:drag.lx;
    const py=(e&&e.clientY!=null)?e.clientY:drag.ly;
    const vx=snapCenter(drag.vx+(px-drag.px),p),vy=drag.vy+(py-drag.py);
    const pX=((vx-t.ox)/t.s)/d.w*100,pY=((vy-t.oy)/t.s)/d.h*100;
    const z=sizeOf(),c=clampPct(z.w,z.h,pX,pY,z.k);
    if(p===clk){state.clock.posX=c.pX;state.clock.posY=c.pY}
    else{state.searchBar.posX=c.pX;state.searchBar.posY=c.pY}
    setGuide(false);p.classList.remove('dragging');drag=null;syncSlidersUI();applyAll();
    try{localStorage.setItem('ntp_state',JSON.stringify(sSt()))}catch(err){}
  }
  document.addEventListener('pointerup',endDrag);
  document.addEventListener('pointercancel',endDrag);
});

/* ═══════════════════════════ Background Storage ═══════════════════════════ */
function odb(){return new Promise((res,rej)=>{const r=indexedDB.open('ntp-bg-store',2);r.onupgradeneeded=e=>{const d=e.target.result;if(d.objectStoreNames.contains('backgrounds'))d.deleteObjectStore('backgrounds');if(!d.objectStoreNames.contains('bgs'))d.createObjectStore('bgs',{keyPath:'id'})};r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error)})}
async function bgP(id,n,t,b){const db=await odb(),tx=db.transaction('bgs','readwrite');tx.objectStore('bgs').put({id,name:n,type:t,data:b,at:Date.now()});await new Promise(r=>tx.oncomplete=r)}
async function bgG(id){const db=await odb();return new Promise((res,rej)=>{const r=db.transaction('bgs','readonly').objectStore('bgs').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function bgD(id){const db=await odb(),tx=db.transaction('bgs','readwrite');tx.objectStore('bgs').delete(id);await new Promise(r=>tx.oncomplete=r)}
// Safe wrappers for IndexedDB operations
async function safeBgGet(id){try{return await bgG(id)}catch{return null}}
async function safeBgDel(id){try{await bgD(id)}catch{}}

function gBM(){try{return JSON.parse(localStorage.getItem('ntp_bg_meta')||'[]')}catch{return[]}}
function sBM(m){localStorage.setItem('ntp_bg_meta',JSON.stringify(m))}
function gAB(){return localStorage.getItem('ntp_active_bg')||null}
function sAB(id){if(id)localStorage.setItem('ntp_active_bg',id);else localStorage.removeItem('ntp_active_bg')}

function buildBgLst(){
  for(const u of _thumbBlobUrls)URL.revokeObjectURL(u);_thumbBlobUrls=[];
  const meta=gBM().sort((a,b)=>b.at-a.at),aid=gAB();
  if(!meta.length){bgLst.innerHTML='<div class="bg-empty">暂无已保存背景</div>';return}
  bgLst.innerHTML='';
  for(const m of meta){
    const el=document.createElement('div');el.className='bg-item'+(m.id===aid?' active':'');el.dataset.bgId=m.id;
    const th=document.createElement('div');th.className='bg-thumb'+(m.type==='video'?' vt':'');
    if(m.type==='video')th.textContent='🎬'
    else safeBgGet(m.id).then(e=>{if(e&&e.data){const u=getMediaUrl(e.data);if(isBlobData(e.data))_thumbBlobUrls.push(u);th.style.backgroundImage='url('+u+')'}}).catch(()=>{});
    const nm=document.createElement('span');nm.className='bg-name';nm.textContent=m.name;
    const dl=document.createElement('button');dl.className='bg-del';dl.textContent='×';
    dl.addEventListener('click',async e=>{e.stopPropagation();await safeBgDel(m.id);const m2=gBM().filter(x=>x.id!==m.id);sBM(m2);if(gAB()===m.id)rBgF();buildBgLst();toast('已删除: '+m.name)});
    el.appendChild(th);el.appendChild(nm);el.appendChild(dl);
    el.addEventListener('click',()=>{aBg(m.id);toast('已切换: '+m.name)});
    bgLst.appendChild(el);
  }
}
function uBgA(id){bgLst.querySelectorAll('.bg-item').forEach(e=>e.classList.toggle('active',e.dataset.bgId===id))}
async function aBg(id){
  if(_bgBlobUrl){URL.revokeObjectURL(_bgBlobUrl);_bgBlobUrl=null}
  if(!id){rBgF();sAB(null);uBgA(null);return}
  bgL.style.display='none';bgL.style.backgroundImage='';bgL.classList.remove('uploaded');
  const e=await safeBgGet(id);if(!e){rBgF();sAB(null);uBgA(null);return}
  sAB(id);uBgA(id);
  if(_cv){_cv.remove();_cv=null}
  const url=getMediaUrl(e.data);
  if(isBlobData(e.data))_bgBlobUrl=url;
  if(e.type==='video'){
    _cv=document.createElement('video');_cv.id='cv';_cv.src=url;
    _cv.autoplay=true;_cv.loop=true;_cv.muted=true;_cv.playsInline=true;
    if(state.videoVolume>0){_cv.muted=false;_cv.volume=state.videoVolume/100;_cv.play().catch(()=>{_cv.muted=true})}else{_cv.play().catch(()=>{})}
    _cv.disablePictureInPicture=true;_cv.setAttribute('controlslist','nodownload nofullscreen noremoteplayback');
    _cv.style.cssText='position:fixed;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;';
    bgL.after(_cv)
  }else{bgL.style.display='';bgL.style.backgroundImage='url('+url+')';bgL.classList.add('uploaded')}
}
async function cImg(f,mP){
  try{
    const i=await new Promise((y,n)=>{const I=new Image();I.onload=()=>y(I);I.onerror=n;I.src=URL.createObjectURL(f)});
    if(i.width*i.height<=mP){URL.revokeObjectURL(i.src);return null}
    const s=Math.sqrt(mP/(i.width*i.height)),c=document.createElement('canvas');
    c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);
    c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(i.src);
    return new Promise(r=>c.toBlob(r,'image/jpeg',0.85))
  }catch{return null}
}
function getMediaUrl(d){return typeof d==='string'?d:URL.createObjectURL(d)}
function isBlobData(d){return typeof d!=='string'}

function rBgF(){if(_bgBlobUrl){URL.revokeObjectURL(_bgBlobUrl);_bgBlobUrl=null}if(_cv){_cv.remove();_cv=null}bgL.style.display='';bgL.style.backgroundImage='';bgL.classList.remove('uploaded');bgUp.value='';sAB(null);uBgA(null)}

/* ═══════════════════════════ Background Upload ═══════════════════════════ */
bgUp.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const meta=gBM();if(meta.some(x=>x.name===f.name)){toast('已有同名背景: '+f.name);e.target.value='';return}
  let t=f.type.startsWith('video/')?'video':'image',blobToStore=f;
  if(t==='image'){
    const cp=await cImg(f,1920*1080);
    if(cp){blobToStore=cp;toast('图片已压缩 ('+Math.round(f.size/1024)+'KB→'+Math.round(cp.size/1024)+'KB)')}
  }
  const id='bg_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  try{
    await bgP(id,f.name,t,blobToStore);
    meta.push({id,name:f.name,type:t,at:Date.now()});sBM(meta);
    await aBg(id);buildBgLst();toast('背景已保存: '+f.name);cp()
  }catch(e){toast('保存失败，请重试')}
});
rBg.addEventListener('click',()=>{state.videoVolume=100;vol.value=100;vv.textContent='100%';rBgF();autoSave();toast('背景已还原')});
(async()=>{const a=gAB();if(a)await aBg(a);buildBgLst()})();

/* ═══════════════════════════ Clock Tick ═══════════════════════════ */
function tk(){ci.textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
tk();setInterval(tk,10000);

/* ═══════════════════════════ Templates ═══════════════════════════ */
function gTP(){try{return JSON.parse(localStorage.getItem('ntp_templates')||'[]')}catch{return[]}}
function sTP(t){localStorage.setItem('ntp_templates',JSON.stringify(t))}
function sSt(){return{design:{...state.design},globalScale:state.globalScale,snapX:state.snapX,snapPair:state.snapPair,volDef100:state.volDef100,searchBar:{...state.searchBar},clock:{...state.clock},engine:state.engine,backgroundId:gAB(),videoVolume:state.videoVolume}}
let _as;function autoSave(){clearTimeout(_as);_as=setTimeout(()=>{try{localStorage.setItem('ntp_state',JSON.stringify(sSt()))}catch(e){}},500)}
function aTP(tpl){Object.assign(state.searchBar,tpl.searchBar);Object.assign(state.clock,tpl.clock);if(tpl.videoVolume!==undefined){state.videoVolume=tpl.videoVolume;vol.value=tpl.videoVolume;vv.textContent=tpl.videoVolume+'%'}applyAll();if(tpl.backgroundId)aBg(tpl.backgroundId);else rBgF();autoSave();toast('已切换: '+tpl.name)}
function bTP(){
  const tpls=gTP();if(!tpls.length){tplLst.innerHTML='<div class="tpl-empty">暂无模板</div>';return}
  tplLst.innerHTML=tpls.map((t,i)=>'<div class="tpl-item" data-idx="'+i+'"><span class="tpl-name">'+eH(t.name)+'</span><button class="tpl-del" data-idx="'+i+'">×</button></div>').join('');
  tplLst.querySelectorAll('.tpl-item').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('.tpl-del'))return;const t=gTP(),i=+el.dataset.idx;if(t[i])aTP(t[i])})});
  tplLst.querySelectorAll('.tpl-del').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();const t=gTP(),i=+b.dataset.idx;if(t[i]){t.splice(i,1);sTP(t);bTP();toast('已删除')}})});
}
tplSv.addEventListener('click',()=>{const n=tplN.value.trim();if(!n){toast('请输入模板名称');return}const tpls=gTP();const d={name:n,searchBar:{...state.searchBar},clock:{...state.clock},backgroundId:gAB(),videoVolume:state.videoVolume};const ex=tpls.findIndex(t=>t.name===n);if(ex>=0){tpls[ex]=d;toast('已覆盖: '+n)}else{tpls.push(d);toast('已保存: '+n)}sTP(tpls);tplN.value='';bTP()});
tplN.addEventListener('keydown',e=>{if(e.key==='Enter')tplSv.click()});
function eH(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

/* ═══════════════════════════ Toast ═══════════════════════════ */
let tt;function toast(m){ht.textContent=m;ht.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>ht.classList.remove('show'),2000)}

/* ═══════════════════════════ Init ═══════════════════════════ */
applyAll();bTP();setTimeout(()=>toast('⚪ 底部圆钮拖拽 · ⚙ 齿轮设置'),1500);

/* ═══════════════════════════ Window Events ═══════════════════════════ */
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(applyAll,150)});
document.addEventListener('visibilitychange',()=>{if(!_cv)return;if(document.hidden){_cv.muted=true}else if(state.videoVolume>0){_cv.muted=false;_cv.volume=state.videoVolume/100;_cv.play().catch(()=>{})}});
function activateAudio(v){if(state.videoVolume>0){v.muted=false;v.volume=state.videoVolume/100;v.play().catch(()=>{})}else{v.muted=true}}
document.addEventListener('pointerdown',()=>{if(_cv)activateAudio(_cv)},{once:true});

(function(){const g=$('gsc'),sn=$('snapx'),sp=$('snapp'),a=$('ssc'),b=$('csc');if(g)g.addEventListener('input',()=>{state.globalScale=+g.value/100;syncSlidersUI();applyAll()});if(sn)sn.addEventListener('change',()=>{state.snapX=sn.checked;autoSave()});
if(sp)sp.addEventListener('change',()=>{state.snapPair=sp.checked;autoSave()});if(a)a.addEventListener('input',()=>{state.searchBar.scale=+a.value/100;applyAll()});if(b)b.addEventListener('input',()=>{state.clock.scale=+b.value/100;applyAll()});})();

const REFRESH_SVG='<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.2v4.6h4.6"/></svg>';
/* 单项还原：给每个可调项注入 ↺ 按钮 */
(function(){
  const MAP={
    sc:{'宽度':'searchBar.width','高度':'searchBar.height','圆角':'searchBar.radius','整体大小':'searchBar.scale','水平位置':'searchBar.posX','垂直位置':'searchBar.posY','默认透明度':'searchBar.opacityDef','悬停透明度':'searchBar.opacityHover','拖拽钮常显透明度':'searchBar.dragBtnOpacity'},
    cc:{'字体颜色':'clock.color','字号':'clock.fontSize','透明度':'clock.opacity','字重':'clock.fontWeight','整体大小':'clock.scale','水平位置':'clock.posX','垂直位置':'clock.posY','拖拽钮常显透明度':'clock.dragBtnOpacity'},
    misc:{'全局缩放系数':'globalScale'}
  };
  const DEFV={globalScale:1};
  function getDef(path){const p=path.split('.');return p.length===1?(DEFV[p[0]]):DEF[p[0]][p[1]]}
  function setPath(path,v){const p=path.split('.');if(p.length===1)state[p[0]]=v;else state[p[0]][p[1]]=v}
  Object.keys(MAP).forEach(function(sec){
    const body=document.getElementById(sec);if(!body)return;
    body.querySelectorAll('.setting-row').forEach(function(row){
      const lab=row.querySelector('.row-header label');if(!lab)return;
      const path=MAP[sec][lab.textContent.trim()];if(!path)return;
      const hd=row.querySelector('.row-header');if(!hd||hd.querySelector('.reset-one'))return;
      const b=document.createElement('button');
      b.className='reset-one';b.type='button';b.title='还原该项默认值';
      b.innerHTML=REFRESH_SVG;
      b.addEventListener('click',function(ev){
        ev.preventDefault();ev.stopPropagation();
        setPath(path,getDef(path));
        applyAll();syncSlidersUI();
        try{localStorage.setItem('ntp_state',JSON.stringify(sSt()))}catch(e){}
      });
      const wrap=document.createElement('span');wrap.className='lab-wrap';
      lab.parentNode.insertBefore(wrap,lab);wrap.appendChild(lab);wrap.appendChild(b);
    });
  });
})();
(function(){['reset-search','reset-clock'].forEach(function(id){var b=document.getElementById(id);if(b)b.innerHTML=REFRESH_SVG+' 还原全部默认'});
var rb=document.getElementById('reset-bg');if(rb)rb.innerHTML=REFRESH_SVG+' 还原默认背景';})();
addEventListener('resize',()=>applyAll());
})();
