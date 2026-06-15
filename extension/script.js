(function(){
'use strict';

/* ═══════════════════════════ Constants ═══════════════════════════ */
const ENGINES={bing:q=>`https://www.bing.com/search?q=${encodeURIComponent(q)}`,google:q=>`https://www.google.com/search?q=${encodeURIComponent(q)}`,baidu:q=>`https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,duckduckgo:q=>`https://duckduckgo.com/?q=${encodeURIComponent(q)}`,sogou:q=>`https://www.sogou.com/web?query=${encodeURIComponent(q)}`};
const DEF={searchBar:{show:true,width:520,height:48,radius:50,posX:50,posY:50,opacityDef:25,opacityHover:100,dragBtnOpacity:10},clock:{show:true,color:'light',fontSize:100,opacity:100,fontWeight:600,posX:50,posY:40,dragBtnOpacity:10},engine:'bing',videoVolume:0};

/* ═══════════════════════════ State ═══════════════════════════ */
let state=JSON.parse(JSON.stringify(DEF));
let _bgBlobUrl=null,_thumbBlobUrls=[];

// Restore saved state
(function(){try{const s=JSON.parse(localStorage.getItem('ntp_state'));if(s){Object.assign(state.searchBar,s.searchBar);Object.assign(state.clock,s.clock);if(s.engine)state.engine=s.engine;if(s.videoVolume!==undefined)state.videoVolume=s.videoVolume}}catch(e){}})();
// First load: clock position relative to search bar
(function(){if(!localStorage.getItem('ntp_state'))calcRelativeClockPos()})();

/* ═══════════════════════════ Helpers ═══════════════════════════ */
const $=id=>document.getElementById(id);
const clamp=(min,v,max)=>v<min?min:v>max?max:+v;
function calcPos(w,h,pX,pY){return{l:(innerWidth*pX/100)-w/2,t:(innerHeight*pY/100)-h/2}}
function posToPct(w,h,l,t){return{pX:((l+w/2)/innerWidth)*100,pY:((t+h/2)/innerHeight)*100}}
function calcRelativeClockPos(){const sb=state.searchBar,clk=state.clock,clkHalf=clk.fontSize/2,btnH=30,gap=30,sbTop=innerHeight*sb.posY/100-sb.height/2,cc=sbTop-gap-btnH-clkHalf;clk.posY=Math.max(5,Math.round(cc/innerHeight*100))}
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
  R.setProperty('--sb-font-size',Math.round(s.height*.34)+'px');
  R.setProperty('--sb-input-opacity',String(s.opacityDef/100));
  R.setProperty('--clk-color',c.color==='dark'?'#000':'#fff');
  R.setProperty('--clk-opacity',String(c.opacity/100));
}

function applyPositions(){
  const s=state.searchBar,c=state.clock;
  sb.classList.toggle('hidden',!s.show);
  if(s.show){const p=calcPos(s.width,s.height,s.posX,s.posY);sb.style.left=p.l+'px';sb.style.top=p.t+'px'}
  clk.classList.toggle('show',c.show);
  if(c.show){
    ci.style.fontSize=c.fontSize+'px';ci.style.fontWeight=c.fontWeight;
    const cw=clk.offsetWidth,ch=clk.offsetHeight;
    if(cw>0&&ch>0){const p=calcPos(cw,ch,c.posX,c.posY);clk.style.left=p.l+'px';clk.style.top=p.t+'px'}
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
  ct.checked=c.show;csz.value=c.fontSize;co.value=c.opacity;cfw.value=c.fontWeight;
  cx.value=Math.round(c.posX);cy.value=Math.round(c.posY);cd.value=c.dragBtnOpacity;
  cszv.textContent=c.fontSize+'px';cov.textContent=c.opacity+'%';cfwv.textContent=c.fontWeight;
  cxv.textContent=Math.round(c.posX)+'%';cyv.textContent=Math.round(c.posY)+'%';
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
  s.opacityDef=+sod.value;s.opacityHover=+soh.value;s.dragBtnOpacity=+sd.value;applyAll()
}
function onCS(e){
  const c=state.clock;c.show=ct.checked;c.color=ccol.value;c.fontSize=+csz.value;
  c.opacity=+co.value;c.fontWeight=+cfw.value;
  if(e&&(e.target===cx||e.target===cy)){c.posX=+cx.value;c.posY=+cy.value}
  c.dragBtnOpacity=+cd.value;applyAll()
}

sbTog.addEventListener('change',onSS);sw.addEventListener('input',onSS);sh.addEventListener('input',onSS);
sr.addEventListener('input',onSS);sx.addEventListener('input',onSS);sy.addEventListener('input',onSS);
sod.addEventListener('input',onSS);soh.addEventListener('input',onSS);sd.addEventListener('input',onSS);
ct.addEventListener('change',onCS);ccol.addEventListener('change',onCS);csz.addEventListener('input',onCS);
co.addEventListener('input',onCS);cfw.addEventListener('input',onCS);cx.addEventListener('input',onCS);
cy.addEventListener('input',onCS);cd.addEventListener('input',onCS);
es.addEventListener('change',()=>{state.engine=es.value;autoSave()});
vol.addEventListener('input',()=>{state.videoVolume=+vol.value;vv.textContent=vol.value+'%';const v=document.getElementById('cv');if(v)activateAudio(v);autoSave()});
rSb.addEventListener('click',()=>{Object.assign(state.searchBar,DEF.searchBar);applyAll();toast('搜索栏已还原')});
rClk.addEventListener('click',()=>{Object.assign(state.clock,DEF.clock);calcRelativeClockPos();applyAll();toast('时间已还原')});

/* ═══════════════════════════ Panel Toggle ═══════════════════════════ */
function op(){pn.classList.add('open');ov.classList.add('show')}
function cp(){pn.classList.remove('open');ov.classList.remove('show')}
gear.addEventListener('click',()=>pn.classList.contains('open')?cp():op());
ov.addEventListener('click',cp);
document.querySelectorAll('.collapse-header').forEach(h=>{h.addEventListener('click',()=>{const t=document.getElementById(h.dataset.target);if(!t)return;h.querySelector('.arrow').classList.toggle('open');t.classList.toggle('closed')})});

/* ═══════════════════════════ Search ═══════════════════════════ */
si.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=si.value.trim();if(q)window.open(getSearchUrl(es.value,q),'_blank')}});

/* ═══════════════════════════ Drag ═══════════════════════════ */
document.querySelectorAll('.drag-btn').forEach(btn=>{
  const p=btn.parentElement;let drag=null;
  btn.addEventListener('mousedown',e=>{const r=p.getBoundingClientRect();drag={ox:e.clientX-r.left,oy:e.clientY-r.top,sx:r.left,sy:r.top};e.preventDefault()});
  document.addEventListener('mousemove',e=>{if(!drag)return;p.style.transform='translate('+(e.clientX-drag.ox-drag.sx)+'px,'+(e.clientY-drag.oy-drag.sy)+'px)'});
  document.addEventListener('mouseup',()=>{if(!drag)return;const r=p.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;p.style.transform='';if(p===clk){state.clock.posX=(cx/innerWidth)*100;state.clock.posY=(cy/innerHeight)*100}else{const s=posToPct(state.searchBar.width,state.searchBar.height,r.left,r.top);state.searchBar.posX=s.pX;state.searchBar.posY=s.pY}drag=null;syncSlidersUI();applyAll();try{localStorage.setItem('ntp_state',JSON.stringify(sSt()))}catch(e){}});
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
    else safeBgGet(m.id).then(e=>{if(e&&e.data){const u=typeof e.data==='string'?e.data:URL.createObjectURL(e.data);if(typeof e.data!=='string')_thumbBlobUrls.push(u);th.style.backgroundImage='url('+u+')'}}).catch(()=>{});
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
  const v=document.getElementById('cv');if(v)v.remove();
  const url=typeof e.data==='string'?e.data:URL.createObjectURL(e.data);
  if(typeof e.data!=='string')_bgBlobUrl=url;
  if(e.type==='video'){
    const v2=document.createElement('video');v2.id='cv';v2.src=url;
    v2.autoplay=true;v2.loop=true;v2.muted=true;v2.playsInline=true;
    if(state.videoVolume>0){v2.muted=false;v2.volume=state.videoVolume/100;v2.play().catch(()=>{v2.muted=true})}else{v2.play().catch(()=>{})}
    v2.disablePictureInPicture=true;v2.setAttribute('controlslist','nodownload nofullscreen noremoteplayback');
    v2.style.cssText='position:fixed;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;';
    bgL.after(v2)
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
function rBgF(){if(_bgBlobUrl){URL.revokeObjectURL(_bgBlobUrl);_bgBlobUrl=null}const v=document.getElementById('cv');if(v)v.remove();bgL.style.display='';bgL.style.backgroundImage='';bgL.classList.remove('uploaded');bgUp.value='';sAB(null);uBgA(null)}

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
rBg.addEventListener('click',()=>{state.videoVolume=0;vol.value=0;vv.textContent='0%';rBgF();autoSave();toast('背景已还原')});
(async()=>{const a=gAB();if(a)await aBg(a);buildBgLst()})();

/* ═══════════════════════════ Clock Tick ═══════════════════════════ */
function tk(){ci.textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
tk();setInterval(tk,10000);

/* ═══════════════════════════ Templates ═══════════════════════════ */
function gTP(){try{return JSON.parse(localStorage.getItem('ntp_templates')||'[]')}catch{return[]}}
function sTP(t){localStorage.setItem('ntp_templates',JSON.stringify(t))}
function sSt(){return{searchBar:{...state.searchBar},clock:{...state.clock},engine:state.engine,backgroundId:gAB(),videoVolume:state.videoVolume}}
let _as;function autoSave(){clearTimeout(_as);_as=setTimeout(()=>{try{localStorage.setItem('ntp_state',JSON.stringify(sSt()))}catch(e){}},500)}
function aTP(tpl){Object.assign(state.searchBar,tpl.searchBar);Object.assign(state.clock,tpl.clock);state.engine=tpl.engine;if(tpl.videoVolume!==undefined)state.videoVolume=tpl.videoVolume;applyAll();es.value=tpl.engine;if(tpl.backgroundId)aBg(tpl.backgroundId);else rBgF();toast('已切换: '+tpl.name)}
function bTP(){
  const tpls=gTP();if(!tpls.length){tplLst.innerHTML='<div class="tpl-empty">暂无模板</div>';return}
  tplLst.innerHTML=tpls.map((t,i)=>'<div class="tpl-item" data-idx="'+i+'"><span class="tpl-name">'+eH(t.name)+'</span><button class="tpl-del" data-idx="'+i+'">×</button></div>').join('');
  tplLst.querySelectorAll('.tpl-item').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('.tpl-del'))return;const t=gTP(),i=+el.dataset.idx;if(t[i])aTP(t[i])})});
  tplLst.querySelectorAll('.tpl-del').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();const t=gTP(),i=+b.dataset.idx;if(t[i]){t.splice(i,1);sTP(t);bTP();toast('已删除')}})});
}
tplSv.addEventListener('click',()=>{const n=tplN.value.trim();if(!n){toast('请输入模板名称');return}const tpls=gTP(),d=sSt();d.name=n;const ex=tpls.findIndex(t=>t.name===n);if(ex>=0){tpls[ex]=d;toast('已覆盖: '+n)}else{tpls.push(d);toast('已保存: '+n)}sTP(tpls);tplN.value='';bTP()});
tplN.addEventListener('keydown',e=>{if(e.key==='Enter')tplSv.click()});
function eH(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

/* ═══════════════════════════ Toast ═══════════════════════════ */
let tt;function toast(m){ht.textContent=m;ht.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>ht.classList.remove('show'),2000)}

/* ═══════════════════════════ Init ═══════════════════════════ */
applyAll();bTP();setTimeout(()=>toast('⚪ 底部圆钮拖拽 · ⚙ 齿轮设置'),1500);

/* ═══════════════════════════ Window Events ═══════════════════════════ */
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(applyAll,150)});
document.addEventListener('visibilitychange',()=>{const v=document.getElementById('cv');if(!v)return;if(document.hidden){v.muted=true}else if(state.videoVolume>0){v.muted=false;v.volume=state.videoVolume/100;v.play().catch(()=>{})}});
function activateAudio(v){if(state.videoVolume>0){v.muted=false;v.volume=state.videoVolume/100;v.play().catch(()=>{})}else{v.muted=true}}
document.addEventListener('pointerdown',()=>{const v=document.getElementById('cv');if(v)activateAudio(v)},{once:true});
})();
