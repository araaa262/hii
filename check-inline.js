document.documentElement.classList.add('hld','lk');window._f=setTimeout(()=>document.documentElement.classList.remove('hld','lk'),12000)

const $=s=>document.querySelector(s),u=$('#u'),out=$('#out'),ic=n=>`<svg width="16" height="16"><use href="#i-${n}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>n==null?'—':n>=1e6?(n/1e6).toFixed(1)+' jt':n>=1e3?(n/1e3).toFixed(1)+' rb':n;
const setMenu=o=>{$('#mw').classList.toggle('open',o);$('#mb').classList.toggle('open',o);$('#mb').setAttribute('aria-expanded',o)};
const go=h=>{setMenu(false);document.querySelector(h)?.scrollIntoView({behavior:'smooth',block:'start'})};
function toast(m,err){const e=document.createElement('div');e.className='t'+(err?' e':'');e.innerHTML='<i></i><span></span>';e.lastChild.textContent=m;$('#ts').append(e);setTimeout(()=>e.remove(),2200)}
async function copy(s){try{await navigator.clipboard.writeText(s)}catch{const a=document.createElement('textarea');a.value=s;document.body.append(a);a.select();document.execCommand('copy');a.remove()}toast('Link udah disalin!')}
const src={description:'Dari deskripsi',bio:'Dari bio',bioLink:'Dari link bio',comment:'Dari komentar'};
let links=[];

$('#mb').onclick=e=>{e.stopPropagation();setMenu(!$('#mw').classList.contains('open'))};
document.addEventListener('click',e=>{if(!e.target.closest('#mw'))setMenu(false)});
document.addEventListener('keydown',e=>e.key==='Escape'&&setMenu(false));
document.querySelectorAll('.bn a').forEach(a=>a.onclick=e=>{e.preventDefault();if(a.dataset.k==='donasi')return window.openDonate&&openDonate();setNav(a.dataset.k);go(a.getAttribute('href'))});
const setNav=k=>{const L=[...document.querySelectorAll('.bn a')];L.forEach(a=>a.classList.toggle('on',a.dataset.k===k));$('.ind').style.transform=`translateX(${L.findIndex(a=>a.dataset.k===k)*100}%)`};
['cari','hasil','info'].forEach(id=>{new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&setNav(id)),{rootMargin:'-40% 0px -50% 0px'}).observe(document.getElementById(id))});

const flash=(b,st,ms=1700)=>{clearTimeout(b._t);b.dataset.s=st;b._t=setTimeout(()=>b.dataset.s='idle',ms)};
u.oninput=()=>{const c=$('#cl');c.classList.toggle('hid',!u.value);c.dataset.s=u.value?'idle':'hid'};
$('#cl').onclick=()=>{u.value='';u.oninput();u.focus()};
$('#pc').onclick=async()=>{const b=$('#pc');try{u.value=(await navigator.clipboard.readText()).trim();u.oninput();flash(b,'ok',1200);if(u.value)search()}catch{flash(b,'err',1400);u.focus();toast('Clipboard nggak diizinkan, tempel manual aja ya',1)}};
$('#go').onclick=search;u.onkeydown=e=>e.key==='Enter'&&search();
out.onclick=e=>{const b=e.target.closest('[data-c]');if(b){copy(links[b.dataset.c]);flash(b,'ok',1800)}};

async function search(){
  const v=u.value.trim();if(!v){const f=document.querySelector('.field');f.classList.remove('sh');void f.offsetWidth;f.classList.add('sh');return u.focus()}
  const b=$('#go');clearTimeout(b._t);b.dataset.s='busy';
  out.innerHTML='<div class="card empty"><span class="ic"><span class="dot live"></span></span><h3>Lagi ngecek videonya…</h3><p>Deskripsi, bio, komentar, sama balasan lagi dicek satu-satu. Bisa sampai setengah menit, sabar ya.</p></div>';
  try{
    const r=await fetch('/api/find?url='+encodeURIComponent(v)),t=await r.text();let j;try{j=JSON.parse(t)}catch{throw new Error(r.status===404||/not found/i.test(t)?'Server-nya belum nemu /api/find. Pastikan project di-deploy ke Vercel lengkap sama folder api/-nya ya.':'Server ngasih respon aneh, coba lagi ya')}
    if(!j.ok)throw new Error(j.error||'Ada yang error, coba lagi ya');
    render(j);history.replaceState(null,'','?url='+encodeURIComponent(v));
    const n=j.presets.length;toast(n?`${n} preset ketemu!`:'Yah, presetnya nggak ketemu',!n);
    if(n){$('#gok').textContent=`${n} preset ketemu!`;flash(b,'ok')}else{$('#gerr').textContent='Nggak ketemu';flash(b,'err')}
  }catch(e){out.innerHTML='<div class="card empty"><span class="ic err"><svg width="26" height="26"><use href="#i-info"/></svg></span><h3>Yah, gagal</h3><p class="err">'+esc(e.message)+'</p></div>';toast(e.message,1);$('#gerr').textContent='Yah, gagal';flash(b,'err')}
}

const PI={p:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',z:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',m:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',u:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'};
document.addEventListener('click',e=>{
  const b=e.target.closest('.frame [data-a]');const f=e.target.closest('.frame');if(!f)return;
  const v=f.querySelector('video');if(!v)return;
  if(b&&b.dataset.a==='mu'){v.muted=!v.muted;return}
  if(b&&b.dataset.a==='pp'||!b){v.paused?v.play():v.pause()}
});
document.addEventListener('volumechange',e=>{const v=e.target;if(v.tagName!=='VIDEO')return;const b=v.closest('.frame')?.querySelector('[data-a=mu]');if(b)b.innerHTML=v.muted||v.volume===0?PI.m:PI.u},true);
document.addEventListener('play',e=>{const b=e.target.closest?.('.frame')?.querySelector('[data-a=pp]');if(b)b.innerHTML=PI.z},true);
document.addEventListener('pause',e=>{const b=e.target.closest?.('.frame')?.querySelector('[data-a=pp]');if(b)b.innerHTML=PI.p},true);
document.addEventListener('loadedmetadata',e=>{const v=e.target;if(v.tagName!=='VIDEO'||!v.videoWidth||!v.videoHeight)return;const f=v.closest('.frame');if(f)f.style.setProperty('--ar',v.videoWidth+'/'+v.videoHeight)},true);
document.addEventListener('timeupdate',e=>{const v=e.target;if(v.tagName!=='VIDEO')return;const g=v.closest('.frame')?.querySelector('.pbar b');if(g&&v.duration)g.style.width=(v.currentTime/v.duration*100)+'%'},true);
document.addEventListener('error',e=>{const v=e.target;if(v.tagName!=='VIDEO')return;if(v.dataset.alt){const a=v.dataset.alt;v.dataset.alt='';v.src=a;v.load();v.play().catch(()=>{});return}const f=v.closest('.frame');if(!f)return;f.innerHTML=fb(window.__v||{})},true);
const fly=(e,n,d=0)=>{if(!e||!n||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const a=e.getBoundingClientRect(),b=n.getBoundingClientRect(),c=v=>Math.max(-120,Math.min(120,v));e.animate([{opacity:0,transform:`translate(${c(b.left+b.width/2-a.left-a.width/2)}px,${c(b.top+b.height/2-a.top-a.height/2)}px) scale(.94)`},{opacity:1,transform:'none'}],{duration:700,delay:d,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})};
function fb(v){
  const e=v.platform==='youtube'&&v.id?'https://www.youtube.com/embed/'+encodeURIComponent(v.id)+'?playsinline=1&rel=0':v.platform!=='instagram'&&v.embed?v.embed:'';
  return e?'<iframe class="pif" src="'+esc(e)+'" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>':'<div class="pnone"><span>Video belum bisa diputar</span></div>'
}
function render(j){
  const {video:v,author:a,presets:p}=j;links=p.map(x=>x.url);
  window.__v=v;const isIg=v.platform==='instagram';
  let h=`<div class="stitle"><b class="d">Video</b></div>
  <div class="card"><div class="vid${v.platform==='youtube'&&!v.vertical?' yt':''}">
    <div class="frame" ${v.cover?`style="background-image:url('${esc(v.cover)}')"`:''}>${v.src?`<video class="pv" src="${esc(v.src)}" data-alt="${esc(v.proxy||'')}" data-px="${esc(v.proxy||'')}" data-from="${esc(v.srcFrom||'')}" referrerpolicy="no-referrer" ${v.cover?`poster="${esc(v.cover)}"`:''} autoplay loop playsinline preload="metadata"></video>
      <div class="pctl"><button class="pbtn" data-a="pp" aria-label="Pause/Play"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button><button class="pbtn" data-a="mu" aria-label="Suara"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      <i class="pbar"><b></b></i>`:v.kind==='image'?`<a class="pimg" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Postingan foto"><span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>${v.count>1?v.count:'Foto'}</span></a>`:fb(v)}</div>
    <div style="min-width:0">
      <p class="desc">${esc(v.description)||'<span style="color:var(--mute2)">Nggak ada deskripsi</span>'}</p>
      ${isIg?'':`<div class="stats">
        <div class="stat"><small>Akun</small><b class="acc">${a.avatar?`<img src="${esc(a.avatar)}" alt="" referrerpolicy="no-referrer">`:''}<span style="overflow:hidden;text-overflow:ellipsis">${v.platform==='youtube'?'':'@'}${esc(a.uniqueId)}</span></b></div>
        <div class="stat"><small>Komentar</small><b>${v.comments==null?'—':num(v.comments)}</b></div>
        <div class="stat"><small>Views</small><b>${num(v.views)}</b></div>
        <div class="stat"><small>Likes</small><b>${v.likes==null?'—':num(v.likes)}</b></div>
      </div>`}
      <div class="chips">${isIg?'':`<span class="chip"><span class="dot"></span>${j.scanned.comments} komentar${j.scanned.replies?` + ${j.scanned.replies} balasan`:''} udah dicek</span>`}</div>
    </div>
  </div></div>
  <div class="stitle" style="margin-top:32px"><b class="d">Link preset</b><span class="badge">${p.length}</span></div>`;
  if(!p.length)h+=`<div class="card empty"><span class="ic"><svg width="26" height="26"><use href="#i-link"/></svg></span><h3>Presetnya nggak ketemu</h3><p>${isIg?'Udah dicek deskripsi postingannya, tapi nggak ada link preset. Komentar Instagram nggak bisa dibaca tanpa login.':'Udah dicek deskripsi, bio, komentar, sama balasannya, tapi nggak ada link preset di video ini.'}</p></div>`;
  else h+='<div class="card">'+p.map((x,i)=>{
    const am=x.type==='5mb',by=x.byAuthor||['description','bio','bioLink'].includes(x.source);
    return `<div class="pre"><div class="th" ${x.thumb?`style="background-image:url('${esc(x.thumb)}')"`:''}>${x.thumb?'':(am?'5MB':'XML')}</div><div class="pb">
      <h3 class="d">${esc(x.title||(am?'Preset Alight Motion':'File preset'))}</h3>
      <div class="chips" style="margin:8px 0 0"><span class="chip hi">${am?'5MB':'XML'}</span>${x.size?`<span class="chip">${esc(x.size)}</span>`:''}${by?'<span class="chip">Dari pemilik video</span>':''}${x.pinned?'<span class="chip">Dipin</span>':''}</div>
      <p class="who">${x.detail?esc(x.detail)+' · ':''}${src[x.source]||''}</p>
      <p class="m">${esc(x.url)}</p>
      <div class="act"><a class="btn p" href="${esc(x.url)}" target="_blank" rel="noopener">${am?'Buka preset':'Ambil file'}<svg class="arr" width="15" height="15"><use href="#i-out"/></svg></a><button class="btn o" data-c="${i}" data-s="idle"><span class="mi" style="width:16px;height:16px"><svg data-st="idle" viewBox="0 0 24 24"><use href="#i-copy"/></svg><svg data-st="ok" viewBox="0 0 24 24"><use href="#i-ok"/></svg></span><span class="lbs"><span data-st="idle">Salin</span><span data-st="ok">Udah disalin</span></span></button></div>
    </div></div>`}).join('')+'</div>';
  out.innerHTML=h;
  const pv=out.querySelector('video.pv');if(pv){pv.muted=false;pv.play().catch(()=>{})}
  const fr=out.querySelector('.frame'),st=out.querySelector('.stitle');let pr=st;
  rv(out.querySelector('.vid>div:last-child'),fr,0);rv(st,fr,120);
  out.querySelectorAll('.pre,.card.empty').forEach((e,i)=>{rv(e,pr,220+i*90);pr=e});
}
const q=new URLSearchParams(location.search).get('url'),rl=performance.getEntriesByType?.('navigation')[0]?.type==='reload';
if(q&&rl)history.replaceState(null,'',location.pathname);
else if(q){u.value=q;u.oninput();search()}


(()=>{
const h=document.documentElement,g=s=>document.querySelector(s),ig=g('#ig'),bx=g('.igb'),inn=g('.igi'),p1=g('#ip1'),p2=g('#ip2');
const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;clearTimeout(window._f);
const W=()=>Math.min(innerWidth*.88,340)+'px',fit=()=>{bx.style.height=inn.scrollHeight+'px'};
const open=()=>{bx.style.width=W();bx.style.borderRadius='28px';fit();bx.classList.add('o')};
setTimeout(open,rm?0:900);
document.fonts?.ready.then(()=>bx.classList.contains('o')&&fit());
addEventListener('resize',()=>{if(bx.classList.contains('o')){bx.style.width=W();fit()}});
const asm=o=>{
  const vh=innerHeight,fly=(e,dl)=>{const r=e.getBoundingClientRect();
    if(r.top>vh)return e.animate([{opacity:0},{opacity:1}],{duration:600,delay:dl,fill:'backwards'});
    const dx=o.x-(r.left+r.width/2),dy=o.y-(r.top+r.height/2);
    e.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3)`},{opacity:1,offset:.35},{opacity:1,transform:'none'}],{duration:1000,delay:dl,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})};
  let i=0;
  ['header','.hero>*','#cari .card','#out .card','.fi','.foot','.bn'].forEach(q=>document.querySelectorAll(q).forEach(e=>{e._d=i++*65;fly(e,e._d)}));
  document.querySelectorAll('.card,.fi').forEach(c=>c.querySelectorAll('.ic,h2,h3,p,.field,.go').forEach(t=>t.animate([{opacity:0},{opacity:1}],{duration:550,delay:(c._d||0)+260,easing:'ease-out',fill:'backwards'})));
};
let first=true,ready=false;
const close=()=>{
  if(ig.classList.contains('out'))return;
  if(!first){ig.animate([{opacity:1},{opacity:0}],{duration:240,fill:'forwards'}).onfinish=()=>{ig.classList.add('out');h.classList.remove('lk')};return}
  first=false;const r=bx.getBoundingClientRect(),o={x:r.left+r.width/2,y:r.top+r.height/2};
  ig.classList.add('out');h.classList.remove('lk','hld');if(!rm)asm(o);setTimeout(startRv,rm?0:1500)};
window.openDonate=()=>{if(first||h.classList.contains('lk'))return;const m=g('#mw');if(m&&m.classList.contains('open'))g('#mb').click();
  ig.getAnimations().forEach(a=>a.cancel());ig.classList.remove('out');ig.classList.add('re');h.classList.add('lk');pane(2);
  ig.animate([{opacity:0},{opacity:1}],{duration:260});bx.animate([{opacity:0,transform:'scale(.9) translateY(14px)'},{opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'})};
g('[data-donate]').onclick=e=>{e.preventDefault();openDonate()};
const list=[];let io,dY=1,ly=scrollY;addEventListener('scroll',()=>{dY=scrollY>=ly?1:-1;ly=scrollY},{passive:true});
const inV=e=>{const r=e.getBoundingClientRect();return r.top<innerHeight-40&&r.bottom>40};
const play=e=>{e._t=performance.now();
  if(e._n&&!e._p){e._p=1;return fly(e,e._n,e._d)}
  e.animate([{opacity:0,transform:`translateY(${dY*40}px) scale(.92)`},{opacity:1,transform:'none'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  if(e.matches('.card,.fi'))e.querySelectorAll('.ic,h2,h3,p,.field,.go').forEach(t=>t.animate([{opacity:0},{opacity:1}],{duration:600,delay:220,easing:'ease-out',fill:'backwards'}))};
const place=e=>{if(inV(e)){e._on=true;e._t=performance.now();if(e._n&&!e._p)play(e)}else{e._on=false;e.style.opacity='0'}io.observe(e)};
function startRv(){ready=true;
  io=new IntersectionObserver(es=>es.forEach(({target:e,isIntersecting:x})=>{
    if(x&&e._on===false){e._on=true;e.style.opacity='';play(e)}
    else if(!x&&e._on&&performance.now()-e._t>1300){e._on=false;e.style.opacity='0'}
  }),{threshold:.1});
  ['.hero>*','#cari .card','#hasil .card.empty','.fi','.foot'].forEach(q=>document.querySelectorAll(q).forEach(e=>list.push(e)));
  list.splice(0).forEach(place)}
window.rv=(e,n,d)=>{if(rm||!e)return;e._n=n;e._d=d;ready?place(e):list.push(e)};
const pane=n=>{p1.hidden=n!==1;p2.hidden=n!==2;(n===1?p1:p2).animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:380,easing:'ease-out'});fit()};
g('#ibd').onclick=()=>pane(2);g('#ibk').onclick=()=>pane(1);g('#ibx').onclick=g('#ibt').onclick=close;
addEventListener('keydown',e=>e.key==='Escape'&&close());
})();


(()=>{
  const b=e=>{e.preventDefault();e.stopImmediatePropagation()};
  document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k))||(e.ctrlKey&&k==='u'))b(e)},true);
  document.addEventListener('contextmenu',b,true);
  if(matchMedia('(pointer:coarse)').matches)return;
  let d=false,dpr=devicePixelRatio,bw=outerWidth-innerWidth,bh=outerHeight-innerHeight;
  setInterval(()=>{
    if(devicePixelRatio!==dpr){dpr=devicePixelRatio;bw=outerWidth-innerWidth;bh=outerHeight-innerHeight;d=false;return}
    if(outerWidth-innerWidth-bw>160||outerHeight-innerHeight-bh>160){if(!d){d=true;document.documentElement.innerHTML="<body style='background:#000;color:#fff;display:grid;place-items:center;height:100vh;font:20px sans-serif'>Developer Tools tidak diizinkan.\n</body>"}}else d=false;
  },500);
})();


/* Live theme/settings controller — local commands are plain; `global` applies to everyone. */
(()=>{
  const root=document.documentElement;
  const presets={
    blue:{name:'ELECTRIC BLUE',primary:'#145cff',secondary:'#00c8ff',accent:'#d9ff00'},
    pink:{name:'HOT PINK',primary:'#ff2d8d',secondary:'#ff78bd',accent:'#ffe45e'},
    purple:{name:'PURPLE',primary:'#7c3aed',secondary:'#c084fc',accent:'#facc15'},
    lime:{name:'LIME',primary:'#65a30d',secondary:'#a3e635',accent:'#38bdf8'},
    orange:{name:'ORANGE',primary:'#ff6b00',secondary:'#ffad33',accent:'#d9ff00'}
  };
  const hexToHsl=hex=>{let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2;if(max!==min){let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h/=6}return [h*360,s*100,l*100]};
  const setTheme=(key,save=true)=>{
    let t=presets[key];
    if(!t){const [h,s,l]=hexToHsl(key);t={name:'CUSTOM '+key.toUpperCase(),primary:key,secondary:`hsl(${(h+22)%360} ${Math.min(100,s+5)}% ${Math.min(72,l+13)}%)`,accent:`hsl(${(h+70)%360} 90% 65%)`}}
    root.style.setProperty('--neo-blue',t.primary);root.style.setProperty('--neo-blue-2',t.secondary);root.style.setProperty('--neo-yellow',t.accent);
    const name=document.querySelector('#themeName');if(name)name.textContent=t.name;
    const input=document.querySelector('#themeColor');if(input&&t.primary[0]==='#')input.value=t.primary;
    if(save)localStorage.setItem('raaa-theme',key);
    return t.name;
  };
  const out=document.querySelector('#themeTerminalOut'),form=document.querySelector('#themeTerminalForm'),input=document.querySelector('#themeTerminal');
  const log=(line,cls='')=>{if(!out)return;const d=document.createElement('div');d.className=cls;d.textContent=line;out.appendChild(d);out.scrollTop=out.scrollHeight};
  const storeKey='raaa-live-settings';
  const defaults={logo:'',modal:'qris.png',wa:'https://whatsapp.com/channel/0029VbDPWOjFMqrdmBdXu82R',tiktok:'https://www.tiktok.com/@ancklo',bg:''};
  let settings={...defaults},globalSettings={...defaults};
  try{settings={...settings,...JSON.parse(localStorage.getItem(storeKey)||'{}')}}catch{}
  const validUrl=v=>{try{const u=new URL(v,location.href);return ['http:','https:','data:','blob:'].includes(u.protocol)||v.startsWith('/')}catch{return false}};
  const isVideoUrl=v=>{
    const x=String(v||'').trim();
    return /\.(mp4|webm|ogv|ogg)(?:[?#].*)?$/i.test(x) || /\.m3u8(?:[?#].*)?$/i.test(x) || /^data:video\//i.test(x);
  };
  let bgAudioEnabled=false;
  const bgSoundBtn=document.querySelector('#bgSoundBtn');
  const setBgSoundUI=on=>{
    if(!bgSoundBtn)return;
    bgSoundBtn.style.display=settings.bg&&isVideoUrl(settings.bg)?'flex':'none';
    bgSoundBtn.classList.toggle('on',!!on);
    bgSoundBtn.setAttribute('aria-label',on?'Matikan suara video background':'Aktifkan suara video background');
    bgSoundBtn.innerHTML=on
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a9 9 0 0 1 0 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>';
  };
  const enableBackgroundAudio=async()=>{
    const v=document.querySelector('#customBgVideo');
    if(!v || !settings.bg || !isVideoUrl(settings.bg))return;
    try{
      v.muted=false;
      v.defaultMuted=false;
      v.removeAttribute('muted');
      v.volume=1;
      await v.play();
      bgAudioEnabled=true;
      setBgSoundUI(true);
    }catch{
      bgAudioEnabled=false;
      setBgSoundUI(false);
    }
  };
  const disableBackgroundAudio=()=>{
    const v=document.querySelector('#customBgVideo');
    if(!v)return;
    v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');bgAudioEnabled=false;setBgSoundUI(false);
  };
  bgSoundBtn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();bgAudioEnabled?disableBackgroundAudio():enableBackgroundAudio()});
  ['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(!bgAudioEnabled)enableBackgroundAudio();},{passive:true}));

  const applySettings=save=>{
    const safe=v=>String(v||'').replace(/"/g,'');
    const logo=document.querySelector('.logo .sq');
    if(logo){
      logo.style.backgroundImage=settings.logo?`url("${safe(settings.logo)}")`:'';
      logo.style.backgroundSize='cover';logo.style.backgroundPosition='center';logo.style.backgroundRepeat='no-repeat';
      if(settings.logo)logo.innerHTML='';else logo.innerHTML='<svg width="20" height="20"><use href="#i-search"/></svg>';
    }
    document.querySelectorAll('.qr img,[data-qr-image]').forEach(img=>{
      img.src=settings.modal||defaults.modal;
      img.onerror=()=>{img.onerror=null;img.src=defaults.modal};
    });
    document.querySelectorAll('a[href*="whatsapp.com/channel"],a[data-global-link="whatsapp"]').forEach(a=>a.href=settings.wa);
    document.querySelectorAll('a[href*="tiktok.com/@ancklo"],a[data-global-link="tiktok"]').forEach(a=>a.href=settings.tiktok);
    const bgVideo=document.querySelector('#customBgVideo'),shade=document.querySelector('#customBgShade');
    document.body.classList.remove('has-custom-bg','has-custom-bg-image');
    if(bgVideo){
      if(settings.bg && isVideoUrl(settings.bg)){
        const wanted=safe(settings.bg);
        const mediaSrc=/^(https?:\/\/)/i.test(wanted)?('/api/media?url='+encodeURIComponent(wanted)):wanted;
        bgVideo.style.display='block';
        // Start muted for Android autoplay, then enable video audio on first user interaction.
        disableBackgroundAudio();
        bgVideo.volume=1;
        bgVideo.setAttribute('playsinline','');
        bgVideo.setAttribute('autoplay','');
        bgVideo.setAttribute('loop','');
        if(bgVideo.dataset.src!==mediaSrc){
          bgVideo.dataset.src=mediaSrc;
          bgVideo.src=mediaSrc;
          bgVideo.load();
        }
        if(shade)shade.style.display='block';
        document.body.style.backgroundImage='none';
        document.body.classList.add('has-custom-bg');
        const tryPlay=()=>{bgVideo.muted=true;bgVideo.setAttribute('muted','');bgVideo.play().catch(()=>{});setBgSoundUI(bgAudioEnabled)};
        tryPlay();
        bgVideo.addEventListener('loadeddata',tryPlay,{once:true});
      }else{
        bgVideo.pause();
        bgAudioEnabled=false;
        bgVideo.muted=true;
        bgVideo.dataset.src='';
        bgVideo.removeAttribute('src');
        bgVideo.load();
        bgVideo.style.display='none';
        if(shade)shade.style.display='none';
        setBgSoundUI(false);
        document.body.style.backgroundImage=settings.bg?`url(\"${safe(settings.bg)}\")`:'';
        document.body.style.backgroundSize=settings.bg?'cover':'';
        document.body.style.backgroundAttachment=settings.bg?'fixed':'';
        document.body.style.backgroundPosition=settings.bg?'center':'';
        if(settings.bg)document.body.classList.add('has-custom-bg','has-custom-bg-image');
      }
    }
    if(save)localStorage.setItem(storeKey,JSON.stringify(settings));
  };
  const pushGlobal=async(next)=>{
    const r=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
    if(!r.ok)throw new Error('global settings API unavailable');
    return await r.json();
  };
  const loadGlobal=async()=>{
    try{const r=await fetch('/api/settings',{cache:'no-store'});if(r.ok)globalSettings={...defaults,...await r.json()};settings={...globalSettings,...JSON.parse(localStorage.getItem(storeKey)||'{}')};applySettings(false)}catch{}
  };
  const setLocal=(key,value)=>{settings[key]=value;applySettings(true)};
  const setGlobal=async(key,value)=>{
    const next={...globalSettings,[key]:value};
    const saved=await pushGlobal(next);globalSettings={...defaults,...saved};
    settings={...globalSettings,...JSON.parse(localStorage.getItem(storeKey)||'{}')};
    applySettings(false);
  };
  document.querySelectorAll('.theme-swatch').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.theme;setTheme(k);log('> theme '+k,'cmd');log('local theme applied: '+presets[k].name,'ok')}));
  document.querySelector('#themeColor')?.addEventListener('input',e=>{setTheme(e.target.value);log('> color '+e.target.value,'cmd');log('local color applied','ok')});
  form?.addEventListener('submit',async e=>{
    e.preventDefault();const raw=input.value.trim();if(!raw)return;log('> '+raw,'cmd');
    const parts=raw.split(/\s+/),cmd=parts.shift().toLowerCase(),arg=parts.join(' ').trim();
    // Local commands use the command name directly.
    // Global commands use only the `global` prefix.
    const isGlobal=cmd==='global';
    const actual=isGlobal?(parts.shift()?.toLowerCase()||''):cmd;
    const actualArg=isGlobal?parts.join(' ').trim():arg;
    const apply=async(key,value)=>{if(isGlobal){await setGlobal(key,value)}else setLocal(key,value)};
    try{
      if((actual==='theme'||actual==='color')&&(!isGlobal||isGlobal) && (actual==='theme'?presets[actualArg.toLowerCase()]:/^#[0-9a-f]{6}$/i.test(actualArg))){
        if(actual==='theme'){if(isGlobal){/* global visual theme remains local by design; save via separate theme key below */localStorage.setItem('raaa-global-theme',actualArg.toLowerCase());setTheme(actualArg.toLowerCase(),false)}else setTheme(actualArg.toLowerCase())}
        else {setTheme(actualArg);if(!isGlobal)localStorage.setItem('raaa-theme',actualArg)}
        log((isGlobal?'global':'local')+' '+actual+' applied','ok');
      } else if(actual==='logo'&&(actualArg==='reset'||validUrl(actualArg))){await apply('logo',actualArg==='reset'?'':actualArg);log((isGlobal?'global ':'')+(actualArg==='reset'?'logo reset':'logo updated'),'ok')}
      else if((actual==='modal'||actual==='qr'||actual==='qris')&&(actualArg==='reset'||validUrl(actualArg))){await apply('modal',actualArg==='reset'?defaults.modal:actualArg);log((isGlobal?'global ':'')+'qr updated','ok')}
      else if(actual==='link'){
        const p=actualArg.split(/\s+/),sub=(p.shift()||'').toLowerCase(),url=p.join(' ').trim();
        if((sub==='wa'||sub==='whatsapp'||sub==='tiktok')&&validUrl(url)){await apply(sub==='tiktok'?'tiktok':'wa',url);log((isGlobal?'global ':'')+sub+' link updated','ok')}
        else log('usage: link wa <url> | link tiktok <url>','err')
      }
      else if((actual==='background'||actual==='bg'||actual==='baground'||actual==='backround')&&(actualArg==='reset'||validUrl(actualArg))){await apply('bg',actualArg==='reset'?'':actualArg);log((isGlobal?'global ':'')+(actualArg==='reset'?'background reset':(isVideoUrl(actualArg)?'background video updated':'background image updated')),'ok')}
      else if(actual==='status'&&!isGlobal){log('scope: local');log('theme: '+(document.querySelector('#themeName')?.textContent||'unknown'));log('logo: '+(settings.logo?'custom':'default'));log('modal: '+(settings.modal?'custom/default':'none'));log('background: '+(settings.bg?'custom':'default'))}
      else if(actual==='clear'&&!isGlobal){out.innerHTML=''}
      else if(actual==='reset'){
        // Reset ALWAYS clears both local and global customization, regardless of `ra`/`raa`.
        localStorage.removeItem(storeKey);
        localStorage.removeItem('raaa-theme');
        localStorage.removeItem('raaa-global-theme');
        settings={...defaults};
        globalSettings={...defaults};
        try{await pushGlobal({...defaults})}catch{}
        setTheme('blue',false);
        applySettings(false);
        log('all settings reset — local + global','ok');
      }
      else if(actual==='help'&&!isGlobal){
        log('theme blue | pink | purple | lime | orange');
        log('color #RRGGBB');
        log('logo <image-url> | logo reset');
        log('qr <image-url> | qr reset');
        log('link wa <url> | link tiktok <url>');
        log('background <image-or-video-url> | baground <url> | background reset');
        log('status | clear | reset');
        log('global <command> <value>');
      }
      else log('command not found — type help','err')
    }catch(err){log((isGlobal?'global ':'')+'update failed: '+err.message,'err')}
    input.value='';
  });
  const saved=localStorage.getItem('raaa-theme');if(saved&&(presets[saved]||/^#[0-9a-f]{6}$/i.test(saved)))setTheme(saved,false);
  applySettings(false);loadGlobal();
})();
