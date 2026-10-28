/* Phrasebook engine: renders any language pack registered in self.GL_PACKS */
const PACKS = self.GL_PACKS || {};
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const packId = PACKS[store.get("gl-pack","ja")] ? store.get("gl-pack","ja") : Object.keys(PACKS)[0];
const P = PACKS[packId];
const AUD = (self.GL_AUDIO && self.GL_AUDIO[packId]) || {};
const CACHE_AUDIO = "gl-audio-v1";

/* ---------- index ---------- */
const ALL = {};
const mk = a => ({j:a[0],k:a[1]||"",c:a[2],r:a[3],t:a[4],e:a[5]||"",n:a[6]||""});
P.SITS.forEach(s=>{
  s.phrases.forEach((p,i)=>{ALL[`p-${s.id}-${i}`]={kind:"p",sid:s.id,...mk(p)}});
  s.hear.forEach((p,i)=>{ALL[`h-${s.id}-${i}`]={kind:"h",sid:s.id,...mk(p)}});
});
P.CATS.forEach(c=>{
  c.ids=[];
  c.d.trim().split("\n").forEach((l,i)=>{const id=`w-${c.id}-${i}`;ALL[id]={kind:"w",cat:c.id,...mk(l.split("|"))};c.ids.push(id)});
});
P.TPL.forEach((t,ti)=>t.items.forEach((x,ii)=>{
  ALL[`b-${ti}-${ii}`]={kind:"b",j:x[0]+t.parts.join(""),k:(x[1]||x[0])+t.kt,c:x[2]+" "+t.ct,r:x[3]+" "+t.rt,t:x[5],e:x[6],n:""};
}));
const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ё/g,"е");
Object.values(ALL).forEach(o=>{o.hay=norm([o.j,o.k,o.c,o.r,o.t,o.e].join(" "))});
const sitIds = s => [...s.phrases.map((_,i)=>`p-${s.id}-${i}`),...s.hear.map((_,i)=>`h-${s.id}-${i}`)];
/* same rule as tools/build-audio.js: the text that was voiced for an item */
function speechText(o){
  let t = o.kind==="w" ? ((o.k && !o.k.includes("/")) ? o.k : o.j) : o.j;
  return cleanSpeech(t);
}
const cleanSpeech = t => (P.fixSpeech ? P.fixSpeech(t) : t).replace(/[～…]/g,"").replace(/^[、。\s]+/,"").trim();

/* ---------- state ---------- */
const favs=new Set(store.get(`gl-favs-${packId}`,store.get("jp-favs",[])).filter(id=>ALL[id]));
const known=new Set(store.get(`gl-known-${packId}`,[]).filter(id=>ALL[id]));
const S=Object.assign({romaji:true,en:true,kana:true},store.get("gl-settings",{}));
function applySettings(){const r=document.documentElement;r.classList.toggle("no-romaji",!S.romaji);r.classList.toggle("no-en",!S.en);r.classList.toggle("no-kana",!S.kana)}
applySettings();
const isFav=id=>favs.has(id);

/* ---------- helpers ---------- */
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const say=c=>esc(P.mark?P.mark(c):c);
const plural=(n,f)=>{const a=n%10,b=n%100;return f[(a===1&&b!==11)?0:(a>=2&&a<=4&&(b<10||b>=20))?1:2]};
const IC={
 speaker:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
 star:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
 showme:'<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.5 9.5h5M9.5 13h5"/><path d="M1.5 9c1 1.8 1 4.2 0 6M22.5 9c-1 1.8-1 4.2 0 6"/></svg>',
 back:'<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
 chev:'<svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
 search:'<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
 copy:'<svg class="ic" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
 install:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>',
 translate:'<svg class="ic" viewBox="0 0 24 24"><path d="M3 5h10M8 3v2M5 5c1 4 4 7 7 8M11 5c-1 4-4 7-8 9"/><path d="M13 21l4-10 4 10M14.5 17.5h5"/></svg>'
};
const badge=(s,big)=>`<span class="badge${big?" big":""}" style="--lc:${s.col}"><b>${s.L}</b><i>${String(P.SITS.indexOf(s)+1).padStart(2,"0")}</i></span>`;
const favLabel=f=>f?"Сохранено":"Сохранить";
function tools(id){const f=isFav(id);return `<button class="act" data-act="speak" data-id="${id}">${IC.speaker}<span>Слушать</span></button><button class="act fav${f?" on":""}" data-act="fav" data-id="${id}" aria-pressed="${f}">${IC.star}<span>${favLabel(f)}</span></button><button class="act show-act" data-act="show" data-id="${id}">${IC.showme}<span>Показать</span></button>`}
const jpEl=(id,txt,cls="jp")=>`<div class="${cls} tap" lang="${P.id}" role="button" tabindex="0" data-act="show" data-id="${id}" title="Открыть крупно">${esc(txt)}</div>`;
function card(id){const p=ALL[id];return `<article class="card${p.kind==="h"?" hear":""}">${p.kind==="h"?'<span class="hear-tag">Тебе скажут</span>':""}${jpEl(id,p.j)}${p.k&&p.k!==p.j?`<div class="kana" lang="${P.id}">${esc(p.k)}</div>`:""}<div class="say">${say(p.c)}</div><div class="romaji">${esc(p.r)}</div><div class="mean">${esc(p.t)}</div>${p.e?`<div class="en"><span>EN</span>${esc(p.e)}</div>`:""}${p.n?`<p class="note">${esc(p.n)}</p>`:""}<div class="acts">${tools(id)}</div></article>`}
function row(id){const w=ALL[id];const f=isFav(id);return `<div class="row${w.cat===P.signsCat?" sign":""}"><button class="row-main" data-act="show" data-id="${id}"><span class="row-jpw"><span class="row-jp" lang="${P.id}">${esc(w.j)}</span>${w.k&&w.k!==w.j?`<span class="row-kana" lang="${P.id}">${esc(w.k)}</span>`:""}</span><span class="row-txt"><span class="row-say">${say(w.c)}</span><span class="romaji">${esc(w.r)}</span><span class="row-mean">${esc(w.t)}</span>${w.n?`<span class="row-note">${esc(w.n)}</span>`:""}</span></button><button class="tool sm" data-act="speak" data-id="${id}" aria-label="Слушать" title="Слушать">${IC.speaker}</button><button class="tool sm fav${f?" on":""}" data-act="fav" data-id="${id}" aria-label="Сохранить в избранное" title="Сохранить в избранное" aria-pressed="${f}">${IC.star}</button></div>`}

/* ---------- illustration helpers used by packs ---------- */
function person(x,ang,o={}){
  const arm=o.hands?`<path class="st" d="M${x} 40 L${x+13} 46"/>`:`<path class="st" d="M${x} 40 L${x+3} 58"/>`;
  const g=`<g><path class="st" d="M${x} 62 L${x-5} 92 M${x} 62 L${x+5} 92"/><g transform="rotate(${ang} ${x} 62)"><path class="st" d="M${x} 62 V34"/>${arm}<circle class="st fl-s" cx="${x}" cy="25" r="8"/></g></g>`;
  return o.flip?`<g transform="translate(${2*x} 0) scale(-1 1)">${g}</g>`:g;
}
const fig=(title,svg,cap)=>`<figure class="fig">${title?`<h3>${title}</h3>`:""}${svg}${cap?`<figcaption>${cap}</figcaption>`:""}</figure>`;

/* ---------- install ---------- */
let installEvt=null;
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;const b=document.getElementById("install-slot");if(b)b.innerHTML=installTile()});
function installTile(){
  if(isStandalone()) return "";
  if(installEvt) return `<button class="install" data-act="install">${IC.install}<span><b>Установить как приложение</b><small>Работает без интернета — удобно в поездке</small></span></button>`;
  if(isIOS()) return `<div class="install"><span>${IC.install}</span><span><b>Установить на iPhone</b><small>Нажми «Поделиться» в Safari, затем «На экран Домой»</small></span></div>`;
  return "";
}

/* ---------- views ---------- */
const view=document.getElementById("view");
/* long lists show a preview; the rest unfolds in place. Open lists stay open across re-renders */
const OPEN=new Set();
const NOUN={ph:["фразу","фразы","фраз"],w:["слово","слова","слов"]};
const moreLabel=(open,n,noun)=>open?"Свернуть":`Показать ещё ${n} ${plural(n,NOUN[noun])}`;
function more(key,html,limit,cls,noun,inline){
  if(html.length-limit<3)limit=html.length; /* hiding one or two items saves nothing */
  const extra=html.length-limit,open=OPEN.has(key);
  const items=html.map((h,i)=>i<limit?h:h.replace(/^<(\w+) class="/,'<$1 class="extra ')).join("");
  const btn=extra>0?`<button class="more${inline?" inline":""}" data-act="more" data-key="${key}" data-n="${extra}" data-noun="${noun}" aria-expanded="${open}">${moreLabel(open,extra,noun)}</button>`:"";
  return `<div class="${cls} clp${open?" open":""}" data-clp="${key}">${items}${inline?btn:""}</div>${inline?"":btn}`;
}
/* the viewer's saved items first (newest first), then the pack's defaults */
const quickIds=()=>[...[...favs].reverse(),...P.QUICK.filter(id=>!favs.has(id))];
const gtLink=raw=>{const ru=/[а-яё]/i.test(raw);return `https://translate.google.com/?sl=${ru?"ru":"auto"}&tl=${ru?P.id:"ru"}&text=${encodeURIComponent(raw)}&op=translate`};
function vHome(){
  const nP=Object.values(ALL).filter(o=>o.kind==="p"||o.kind==="h").length, nW=Object.values(ALL).filter(o=>o.kind==="w").length;
  return `<section class="hero"><span class="eyebrow">${P.eyebrow}</span><h1>${P.title}</h1><p class="lead">${P.lead}</p><div class="stats"><span>${P.SITS.length} ситуаций</span><span>${nP} ${plural(nP,["фраза","фразы","фраз"])}</span><span>${nW} ${plural(nW,["слово","слова","слов"])}</span></div></section>
  <div id="install-slot">${installTile()}</div>
  <section class="sec"><h2>Нужно прямо сейчас</h2>${favs.size?"":`<p class="hint">Нажимай «Сохранить» на нужных фразах — они появятся здесь первыми.</p>`}${more("quick",quickIds().map(id=>{const p=ALL[id];return `<button class="qchip${favs.has(id)?" mine":""}" data-act="show" data-id="${id}"><span class="q-jp" lang="${P.id}">${esc(p.j)}</span><span class="q-ru">${favs.has(id)?IC.star:""}${esc(p.t.split(" / ")[0])}</span></button>`}),8,"quick","ph",true)}</section>
  <section class="sec"><h2>Маршрут поездки</h2><div class="linemap">${P.SITS.map(s=>{const n=s.phrases.length+s.hear.length;return `<a class="stop" href="#s-${s.id}" style="--lc:${s.col}">${badge(s)}<span><span class="stop-t">${s.title}</span><span class="stop-s">${s.sub}</span></span><span class="stop-n">${n} ${plural(n,["фраза","фразы","фраз"])}${IC.chev}</span></a>`}).join("")}</div><p class="map-note">${P.mapNote}</p></section>
  <section class="sec"><h2>Инструменты</h2><div class="tools-grid">
    <a class="tool-tile" href="#build"><span class="tt-jp" lang="${P.id}">${P.builderJp}</span><b>Конструктор фраз</b><span>Собери свою фразу из слова и «хвостика»</span></a>
    <a class="tool-tile" href="#words-${P.signsCat}"><span class="tt-jp" lang="${P.id}">${P.signsJp}</span><b>Таблички</b><span>Выход, вход, туалет, «закрыто»</span></a>
    <a class="tool-tile" href="#learn"><span class="tt-jp" lang="${P.id}">${P.learnJp}</span><b>Учить карточки</b><span>Проверь себя перед поездкой</span></a>
    <a class="tool-tile" href="#read"><span class="tt-jp" lang="${P.id}">${P.readJp}</span><b>Как читать</b><span>Азбуки, произношение, настройки</span></a>
  </div></section>`;
}
function vSit(id){
  const s=P.SITS.find(x=>x.id===id); if(!s) return vHome();
  const i=P.SITS.indexOf(s), prev=P.SITS[i-1], next=P.SITS[i+1];
  const jumps=[["sec-phrases","Фразы"]];
  if(s.hear.length) jumps.push(["sec-hear","Тебе скажут"]);
  jumps.push(["sec-dialog","Диалог"],["sec-tips","Советы"],["sec-words","Слова"]);
  return `<div style="--lc:${s.col}"><a class="back" href="#home">${IC.back}Маршрут</a>
  <div class="track">${badge(s,true)}${next?`<a class="nexttag" href="#s-${next.id}" style="--lc:${next.col}">Дальше: ${next.title}</a>`:""}</div>
  <h1>${s.title}</h1><p class="lead">${s.intro}</p>
  <div class="jump">${jumps.map(([t,l])=>`<button class="chip" data-act="jump" data-target="${t}">${l}</button>`).join("")}</div>
  <section class="sec" id="sec-phrases"><h2>Фразы <small>${s.phrases.length}</small></h2><p class="hint">Нажми на японский текст — он откроется крупно, чтобы показать собеседнику.</p>${more("ph-"+s.id,s.phrases.map((_,k)=>card(`p-${s.id}-${k}`)),6,"stack","ph")}</section>
  ${s.hear.length?`<section class="sec" id="sec-hear"><h2>Что тебе скажут</h2><p class="lead" style="margin:-4px 0 12px">Эти фразы говорить не нужно — важно понять их на слух.</p>${more("h-"+s.id,s.hear.map((_,k)=>card(`h-${s.id}-${k}`)),3,"stack","ph")}</section>`:""}
  <section class="sec" id="sec-dialog"><h2>Как это звучит</h2><div class="dlg"><div class="dlg-title">Ты и ${s.dialog.them.toLowerCase()}</div>${s.dialog.lines.map(([w,j,c,t])=>`<div class="bub ${w}"><span class="who">${w==="y"?"Ты":s.dialog.them}</span><div><div class="jp" lang="${P.id}">${esc(j)}</div><div class="say">${say(c)}</div><div class="mean">${esc(t)}</div></div><button class="tool" data-act="say" data-text="${esc(j)}" aria-label="Слушать" title="Слушать">${IC.speaker}</button></div>`).join("")}</div></section>
  <section class="sec" id="sec-tips"><h2>Полезно знать</h2><ul class="tips">${s.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>${s.ill.length?`<div class="figs">${s.ill.map(k=>P.ILL[k]()).join("")}</div>`:""}${s.src?`<p class="src">Подробнее: <a href="${s.src}" target="_blank" rel="noopener">статья на wrenjapan.com</a></p>`:""}</section>
  <section class="sec" id="sec-words"><h2>Слова по теме</h2><div class="chips-wrap">${s.words.map(c=>{const cat=P.CATS.find(x=>x.id===c);return `<a class="chip" href="#words-${c}">${cat.title} <span class="cnt">${cat.ids.length}</span></a>`}).join("")}</div></section>
  <section class="sec"><div class="tools-grid">${prev?`<a class="tool-tile" href="#s-${prev.id}"><span class="stop-n">${IC.back}Назад</span><b>${prev.title}</b></a>`:"<span></span>"}${next?`<a class="tool-tile" href="#s-${next.id}" style="text-align:right;align-items:flex-end"><span class="stop-n">Дальше${IC.chev}</span><b>${next.title}</b></a>`:""}</div></section></div>`;
}
function vWords(cat){
  const c=P.CATS.find(x=>x.id===cat);
  const chips=`<div class="jump"><a class="chip${!c?" on":""}" href="#words">Все</a>${P.CATS.map(x=>`<a class="chip${c&&c.id===x.id?" on":""}" href="#words-${x.id}">${x.title}</a>`).join("")}</div>`;
  const block=x=>`${x.intro?`<p class="cat-intro">${esc(x.intro)}</p>`:""}<div class="rows">${x.ids.map(row).join("")}</div>`;
  return `<section><h1>Словарь</h1><p class="lead">${Object.values(ALL).filter(o=>o.kind==="w").length} слов по темам. Нажми на слово — оно откроется крупно. Кнопка со звуком — послушать, звёздочка — сохранить в избранное.</p>${chips}</section>
  ${c?`<section class="sec" style="margin-top:16px"><h2 style="margin-bottom:12px">${c.title}</h2>${block(c)}</section>`:P.CATS.map(x=>`<section class="sec" style="margin-top:22px"><h2 style="margin-bottom:10px"><a class="cat-link" href="#words-${x.id}">${x.title}${IC.chev}</a> <small>${x.ids.length}</small></h2>${more("w-"+x.id,x.ids.map(row),4,"rows","w")}</section>`).join("")}`;
}
let B={t:0,i:0};
function buildBox(){
  const T=P.TPL[B.t],it=T.items[B.i];
  return `<div class="tpl-list">${P.TPL.map((t,i)=>`<button class="tpl${i===B.t?" on":""}" data-act="tpl" data-i="${i}"><span class="tpl-jp" lang="${P.id}">～${t.parts.join("")}</span><span class="tpl-ru">${t.name}</span></button>`).join("")}</div>
  <div class="formula"><span class="blk slot" lang="${P.id}">${esc(it[0])}</span>${T.parts.map((p,k)=>`<span class="plus">+</span><span class="blk p${k}" lang="${P.id}">${p}</span>`).join("")}</div>
  <p class="how">${esc(T.how)}</p>
  <h2 class="h-sm">Выбери слово</h2>
  <div class="chips-wrap">${T.items.map((x,i)=>`<button class="chip${i===B.i?" on":""}" data-act="item" data-i="${i}"><span lang="${P.id}">${esc(x[0])}</span> ${esc(x[4])}</button>`).join("")}</div>
  <h2 class="h-sm">Готовая фраза</h2>${card(`b-${B.t}-${B.i}`)}`;
}
function vBuild(){return `<section><h1>Конструктор фраз</h1><p class="lead">Фразы собираются как конструктор: берёшь слово и пристёгиваешь к нему «хвостик». Выбери формулу, потом слово — и покажи готовую фразу собеседнику.</p></section><div id="build-box">${buildBox()}</div>`}
let L={deck:null,dir:"jr",queue:[],i:0,rev:false};
function deckInfo(key){
  if(key==="fav") return {name:"Избранное",ids:[...favs]};
  const [t,id]=key.split(":");
  if(t==="s"){const s=P.SITS.find(x=>x.id===id);return {name:s.title,ids:sitIds(s)}}
  const c=P.CATS.find(x=>x.id===id);return {name:c.title,ids:c.ids};
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deckChip(key){const d=deckInfo(key);const k=d.ids.filter(id=>known.has(id)).length;return `<button class="chip" data-act="deck" data-deck="${key}"${d.ids.length?"":" disabled"}>${d.name} <span class="cnt">${k}/${d.ids.length}</span></button>`}
function learnBox(){
  if(!L.deck) return `<div class="seg" role="group" aria-label="Сторона карточки"><button class="${L.dir==="jr"?"on":""}" data-act="dir" data-dir="jr">${P.name} → русский</button><button class="${L.dir==="rj"?"on":""}" data-act="dir" data-dir="rj">Русский → ${P.name.toLowerCase()}</button></div>
  <div class="deck-h">Своя колода</div><div class="chips-wrap">${deckChip("fav")}</div>
  <div class="deck-h">Ситуации</div><div class="chips-wrap">${P.SITS.map(s=>deckChip("s:"+s.id)).join("")}</div>
  <div class="deck-h">Слова</div><div class="chips-wrap">${P.CATS.map(c=>deckChip("w:"+c.id)).join("")}</div>
  <p class="map-note">Цифры показывают, сколько карточек ты уже отметил «Знаю». Отметки хранятся только на этом устройстве.</p>`;
  const d=deckInfo(L.deck);
  const kn=d.ids.filter(id=>known.has(id)).length;
  if(L.i>=L.queue.length) return `<div class="learn-top"><b>${d.name}</b></div><div class="flash"><div class="front-ru">Готово!</div><p class="lead" style="text-align:center">Ты прошёл все карточки. Выучено ${kn} из ${d.ids.length}.</p></div><div class="btns"><button class="btn pri" data-act="restart">Ещё раз</button><button class="btn" data-act="decks">Другая колода</button></div>`;
  const id=L.queue[L.i],p=ALL[id];
  const jpBlock=`<div class="jp" lang="${P.id}">${esc(p.j)}</div>${p.k&&p.k!==p.j?`<div class="kana" lang="${P.id}">${esc(p.k)}</div>`:""}`;
  const front=L.dir==="jr"?jpBlock:`<div class="front-ru">${esc(p.t)}</div>`;
  const back=L.dir==="jr"?`<div class="say">${say(p.c)}</div><div class="romaji">${esc(p.r)}</div><div class="mean">${esc(p.t)}</div>`:`${jpBlock}<div class="say">${say(p.c)}</div><div class="romaji">${esc(p.r)}</div>`;
  return `<div class="learn-top"><button class="chip" data-act="decks">${IC.back}Колоды</button><b>${d.name} · ${L.i+1} из ${L.queue.length}</b></div><div class="progress"><i style="width:${Math.round(L.i/L.queue.length*100)}%"></i></div>
  <div class="flash">${front}${L.rev?`<div class="divider"></div>${back}`:""}</div>
  <div class="btns">${L.rev?`<button class="btn" data-act="again">Ещё повторю</button><button class="btn good" data-act="know">Знаю</button>`:`<button class="btn pri wide" data-act="reveal">Показать ответ</button>`}<button class="btn wide" data-act="speak" data-id="${id}">${IC.speaker}Слушать</button></div>`;
}
function vLearn(){return `<section><h1>Учить</h1><p class="lead">Посмотри на карточку, вспомни ответ, потом проверь себя. Невыученные карточки идут первыми.</p></section><div id="learn-box">${learnBox()}</div>`}
function vFav(){
  const ids=[...favs];
  if(!ids.length) return `<section><h1>Избранное</h1></section><div class="empty" style="margin-top:16px"><b>Пока пусто</b>Нажимай «Сохранить» на любой фразе или звёздочку у слова — они появятся здесь. Так перед поездкой можно собрать свой мини-разговорник.</div>`;
  const ph=ids.filter(id=>ALL[id].kind!=="w"),wd=ids.filter(id=>ALL[id].kind==="w");
  return `<section><h1>Избранное</h1><p class="lead">Твой личный разговорник. Хранится только на этом устройстве.</p></section>
  ${ph.length?`<section class="sec"><h2>Фразы <small>${ph.length}</small></h2>${more("fav-ph",ph.map(card),6,"stack","ph")}</section>`:""}
  ${wd.length?`<section class="sec"><h2>Слова <small>${wd.length}</small></h2>${more("fav-w",wd.map(row),8,"rows","w")}</section>`:""}`;
}
function vRead(){
  const total=Object.keys(AUD).length;
  return `<section><h1>Как читать</h1><p class="lead">Для поездки хватит понимать, что есть что, и знать пару правил произношения.</p></section>
  ${P.readHtml()}
  <section class="sec"><h2>Что показывать на карточках</h2><div class="prose">
   ${P.kanaLabel?`<div class="setting"><label for="set-kana">${P.kanaLabel}</label><input type="checkbox" id="set-kana" data-setting="kana"${S.kana?" checked":""}></div>`:""}
   <div class="setting"><label for="set-romaji">Латиница</label><input type="checkbox" id="set-romaji" data-setting="romaji"${S.romaji?" checked":""}></div>
   <div class="setting"><label for="set-en">Английский запасной вариант</label><input type="checkbox" id="set-en" data-setting="en"${S.en?" checked":""}></div>
  </div></section>
  <section class="sec"><h2>Без интернета</h2><div class="prose"><p id="offline-status">${"serviceWorker" in navigator?"Проверяю, что уже сохранено на устройстве…":"Этот браузер не умеет сохранять страницу для работы без интернета."}</p><p>Когда всё сохранено, разговорник и озвучка (${total} ${plural(total,["запись","записи","записей"])}) работают в самолёте, метро и горах.</p></div><div id="install-slot" style="margin-top:12px">${installTile()}</div></section>
  <section class="sec"><h2>Откуда всё это</h2><div class="prose"><p>Формат — как в тематических словарях-журналах: слова и фразы по ситуациям, с примерами. ${P.source}</p></div></section>`;
}
async function offlineStatus(){
  const el=document.getElementById("offline-status");if(!el||!("caches" in self))return;
  try{
    const c=await caches.open(CACHE_AUDIO);const n=(await c.keys()).length;const total=Object.keys(AUD).length;
    const ready=navigator.serviceWorker&&navigator.serviceWorker.controller;
    el.textContent=!ready?"Сохранение начнётся после первого открытия по ссылке сайта (на https).":n>=total?`Всё сохранено: разговорник работает без интернета.`:`Сохраняю озвучку для работы без интернета: ${n} из ${total}. Не закрывай страницу, пока есть интернет.`;
  }catch(e){}
}
let lastQ="";
function vSearch(){return `<section><h1>Поиск и перевод</h1><label class="searchbox" for="q">${IC.search}<input id="q" type="search" placeholder="Найти фразу или слово" autocomplete="off" enterkeyhint="search"></label></section><div id="qres"></div>`}
function renderSearch(){
  const box=document.getElementById("qres");if(!box)return;
  const raw=lastQ.trim(),q=norm(raw);
  if(!q){box.innerHTML=`<div class="empty" style="margin-top:16px"><b>Что ищем?</b>Например: туалет, вода, eki, ありがとう<br><br>Нет нужной фразы? Напиши её по-русски — и открой перевод в Google Переводчике.</div><p class="map-note">Совет: в приложении Google Переводчик скачай ${P.name.toLowerCase()} для работы без интернета, а меню и вывески переводи камерой.</p>`;return}
  const gt=`<a class="gt" href="${esc(gtLink(raw))}" target="_blank" rel="noopener">${IC.translate}<span><b>Перевести «${esc(raw)}»</b><small>Откроется Google Переводчик, нужен интернет</small></span></a>`;
  const hits=Object.entries(ALL).filter(([,o])=>o.hay.includes(q));
  const ph=hits.filter(([,o])=>o.kind==="p"||o.kind==="h").slice(0,40).map(([id])=>id);
  const wd=hits.filter(([,o])=>o.kind==="w").slice(0,60).map(([id])=>id);
  if(!ph.length&&!wd.length){box.innerHTML=`<div class="empty" style="margin-top:16px"><b>В разговорнике такого нет</b>Попробуй другое слово, загляни в конструктор фраз или переведи через Google.</div>${gt}`;return}
  box.innerHTML=gt+`${wd.length?`<section class="sec" style="margin-top:20px"><h2>Слова <small>${wd.length}</small></h2>${more("q-w",wd.map(row),6,"rows","w")}</section>`:""}${ph.length?`<section class="sec" style="margin-top:20px"><h2>Фразы <small>${ph.length}</small></h2>${more("q-ph",ph.map(card),4,"stack","ph")}</section>`:""}`;
}

/* ---------- router ---------- */
function route(){
  const h=decodeURIComponent((location.hash||"").slice(1))||"home";
  const i=h.indexOf("-"),v=i<0?h:h.slice(0,i),arg=i<0?"":h.slice(i+1);
  const V={s:()=>vSit(arg),words:()=>vWords(arg),build:vBuild,learn:vLearn,fav:vFav,read:vRead,search:vSearch};
  view.innerHTML=(V[v]||vHome)();
  const tab=v==="s"?"home":v;
  document.querySelectorAll(".tab").forEach(t=>{const on=t.dataset.tab===tab||(!V[v]&&t.dataset.tab==="home");t.classList.toggle("on",on);if(on)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current")});
  window.scrollTo({top:0,behavior:"instant"});
  if(v==="search"){const q=document.getElementById("q");q.value=lastQ;renderSearch();setTimeout(()=>q.focus(),60)}
  if(v==="read")offlineStatus();
}
addEventListener("hashchange",route);

/* ---------- sound: recorded clip first, device voice as fallback ---------- */
let voices=[],player=null;
function loadVoices(){try{voices=speechSynthesis.getVoices()}catch(e){}}
if("speechSynthesis" in self){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function deviceVoice(text){
  if(!("speechSynthesis" in self)){toast("Звук недоступен в этом браузере");return}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);u.lang=P.lang;u.rate=.85;
    const v=voices.find(v=>v.lang.replace("_","-").toLowerCase().startsWith(P.id));if(v)u.voice=v;
    speechSynthesis.speak(u);
  }catch(e){toast("Не получилось включить звук")}
}
function play(text){
  text=cleanSpeech(text);
  const key=AUD[text];
  if(player){player.pause();player=null}
  if(!key){deviceVoice(text);return}
  player=new Audio(`audio/${packId}/${key}.mp3`);
  player.play().catch(()=>deviceVoice(text));
}

/* ---------- show overlay ---------- */
const show=document.getElementById("show");let wakeLock=null,lastFocus=null;
function openShow(id){
  const p=ALL[id];lastFocus=document.activeElement;
  const jp=document.getElementById("show-jp");jp.textContent=p.j;jp.lang=P.id;jp.dataset.len=p.j.length<=6?"s":p.j.length<=14?"m":"l";
  const kn=document.getElementById("show-kana");kn.textContent=p.k&&p.k!==p.j?p.k:"";kn.lang=P.id;
  document.getElementById("show-en").textContent=p.e||"";
  document.getElementById("show-ru").innerHTML=`<b>${say(p.c)}</b> — ${esc(p.t)}`;
  const f=isFav(id);
  document.getElementById("show-tools").innerHTML=`<button class="btn" data-act="speak" data-id="${id}">${IC.speaker}Слушать</button><button class="btn act-fav" data-act="fav" data-id="${id}" aria-pressed="${f}">${IC.star}<span>${favLabel(f)}</span></button>`;
  show.hidden=false;document.body.classList.add("lock");
  document.getElementById("show-close").focus();
  try{navigator.wakeLock&&navigator.wakeLock.request("screen").then(l=>{wakeLock=l}).catch(()=>{})}catch(e){}
}
function closeShow(){show.hidden=true;document.body.classList.remove("lock");try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null;if(lastFocus&&lastFocus.focus)lastFocus.focus()}

let tt;function toast(m){const t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{t.hidden=true},2600)}

/* ---------- events ---------- */
function toggleFav(id){
  if(favs.has(id))favs.delete(id);else favs.add(id);
  store.set(`gl-favs-${packId}`,[...favs]);
  const on=favs.has(id);
  document.querySelectorAll(`[data-act="fav"][data-id="${id}"]`).forEach(b=>{b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);const s=b.querySelector("span");if(s)s.textContent=favLabel(on)});
  toast(on?"Сохранено в избранное":"Убрано из избранного");
  if((location.hash||"")==="#fav"&&show.hidden){const y=scrollY;view.innerHTML=vFav();scrollTo(0,y)}
}
function startDeck(key){
  const d=deckInfo(key);if(!d.ids.length)return;
  L.deck=key;L.i=0;L.rev=false;
  const un=d.ids.filter(id=>!known.has(id)),kn=d.ids.filter(id=>known.has(id));
  L.queue=[...shuffle(un),...shuffle(kn)];
}
const reLearn=()=>{const b=document.getElementById("learn-box");if(b)b.innerHTML=learnBox()};
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;
  const a=b.dataset.act,id=b.dataset.id;
  if(a==="speak")play(speechText(ALL[id]));
  else if(a==="say")play(b.dataset.text);
  else if(a==="fav")toggleFav(id);
  else if(a==="show")openShow(id);
  else if(a==="close-show")closeShow();
  else if(a==="more"){const k=b.dataset.key,box=document.querySelector(`[data-clp="${k}"]`),open=!OPEN.has(k);if(open)OPEN.add(k);else OPEN.delete(k);box.classList.toggle("open",open);b.setAttribute("aria-expanded",open);b.textContent=moreLabel(open,+b.dataset.n,b.dataset.noun);if(!open&&box.getBoundingClientRect().top<0)box.scrollIntoView({block:"start"})}
  else if(a==="jump"){const t=document.getElementById(b.dataset.target);if(t)t.scrollIntoView({block:"start"})}
  else if(a==="tpl"){B={t:+b.dataset.i,i:0};document.getElementById("build-box").innerHTML=buildBox()}
  else if(a==="item"){B.i=+b.dataset.i;document.getElementById("build-box").innerHTML=buildBox()}
  else if(a==="dir"){L.dir=b.dataset.dir;reLearn()}
  else if(a==="deck"){startDeck(b.dataset.deck);reLearn();scrollTo(0,0)}
  else if(a==="decks"){L.deck=null;reLearn()}
  else if(a==="reveal"){L.rev=true;reLearn()}
  else if(a==="know"||a==="again"){const cid=L.queue[L.i];if(a==="know")known.add(cid);else{known.delete(cid);L.queue.push(cid)}store.set(`gl-known-${packId}`,[...known]);L.i++;L.rev=false;reLearn()}
  else if(a==="restart"){startDeck(L.deck);reLearn()}
  else if(a==="install"&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;document.querySelectorAll("#install-slot").forEach(s=>s.innerHTML=installTile())})}
  else if(a==="copy"){const txt=b.dataset.copy;const sel=()=>{const el=document.getElementById("hotline-num");const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);toast("Номер выделен — скопируй его")};try{navigator.clipboard.writeText(txt).then(()=>toast("Номер скопирован"),sel)}catch(err){sel()}}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!show.hidden){closeShow();return}
  if((e.key==="Enter"||e.key===" ")&&e.target.matches('[role="button"][data-act]')){e.preventDefault();e.target.click()}
});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.setting;if(!k)return;S[k]=e.target.checked;store.set("gl-settings",S);applySettings()});
document.addEventListener("input",e=>{if(e.target.id==="q"){lastQ=e.target.value;OPEN.delete("q-w");OPEN.delete("q-ph");renderSearch()}});

document.title=P.title;
document.getElementById("brand-native").textContent=P.native;
document.getElementById("brand-native").lang=P.id;
route();

if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  navigator.serviceWorker.ready.then(r=>{r.active&&r.active.postMessage("cache-audio")});
  setInterval(()=>{if(location.hash==="#read")offlineStatus()},4000);
}
