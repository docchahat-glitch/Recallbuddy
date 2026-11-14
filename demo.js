/* js/core.js */
/* Core registry. Each subject file calls IM.subject(...) once and IM.cards(...) as many times as it likes. */
(function(){
  var IM=window.IM={subjects:{},order:[]};

  /* IM.subject({id,title,blurb, numbers?, cheat?, scenarios?}) */
  IM.subject=function(s){
    if(!IM.subjects[s.id]){IM.order.push(s.id);IM.subjects[s.id]={cards:[]}}
    var t=IM.subjects[s.id];
    for(var k in s)t[k]=s[k];
    if(!t.cards)t.cards=[];
  };
  /* IM.cards('surgery',[...]) appends cards to a subject */
  IM.cards=function(id,list){
    if(!IM.subjects[id]){IM.subject({id:id,title:id,blurb:''})}
    list.forEach(function(c){c.subject=id;IM.subjects[id].cards.push(c)});
  };

  /* Card helper for fact tables.
     IM.facts(id, title, section, hook, rows, extra)
     rows: [[key, value], ...]; a row ['#','Group heading'] starts a group.
     extra: {note, qs:[{q,opts,a,why}], keyLabel, valLabel} */
  IM.facts=function(id,title,section,hook,rows,extra){
    var c={kind:'facts',id:id,title:title,section:section,hook:hook||'',rows:rows};
    for(var k in (extra||{}))c[k]=extra[k];
    return c;
  };

  /* IM.questions('surgery','sirs',[ [question, correct, [wrong, wrong, wrong], why?], ... ])
     The correct answer is written FIRST; options are shuffled when the quiz runs. */
  IM.questions=function(subj,cardId,list){
    var s=IM.subjects[subj],card=s&&s.cards.filter(function(c){return c.id===cardId})[0];
    if(!card){if(window.console)console.warn('IM.questions: no card',subj,cardId);return}
    card.qs=card.qs||[];
    list.forEach(function(l){card.qs.push({q:l[0],opts:[l[1]].concat(l[2]),a:0,why:l[3]||('Answer: '+l[1]+'. See the \u201c'+card.title+'\u201d card.')})});
  };

  /* Safe storage */
  IM.store={
    get:function(k,d){try{var v=localStorage.getItem('im-'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
    set:function(k,v){try{localStorage.setItem('im-'+k,JSON.stringify(v))}catch(e){}}
  };

  IM.shuffle=function(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a};
  IM.esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
})();
;
/* js/viz.js */
/* Picture blocks for cards. IM.psm(id,title,section,hook,blocks,extraRows) builds a card whose recall table is derived from its pictures. */
(function(){var IM=window.IM,e=IM.esc;
function I(i){return i?'<span class="vi">'+i+'</span>':''}function N(n){return n?'<span class="vnew">NEW</span>':''}
function num(x){return parseInt(String(x).replace(/\D/g,''),10)||0}
var B={
banner:function(b){return '<div class="vbanner '+(b.c||'')+'">'+I(b.i)+'<div><b>'+e(b.h)+'</b>'+(b.p?'<span>'+e(b.p)+'</span>':'')+'</div></div>'},
tiles:function(b){return '<div class="vtiles">'+b.items.map(function(t){var k=t.p&&!b.show,g=k?'button type="button"':'div';return '<'+g+' class="vt '+(t.c||'')+(t.n?' isnew':'')+(b.show?' show':'')+'">'+I(t.i)+N(t.n)+'<b>'+e(t.h)+'</b>'+(t.p?'<span class="vp">'+e(t.p)+'</span>':'')+'</'+(k?'button':'div')+'>'}).join('')+'</div>'},
hub:function(b){return '<div class="vhub">'+B.tiles({items:b.items,show:1})+'<span class="vdown">⬇</span><div class="vhc">'+I(b.i)+e(b.h)+'</div></div>'},
lists:function(b){return '<div class="vlists">'+b.cols.map(function(c){return '<div class="vl '+(c.c||'')+'"><div class="vlh">'+I(c.i)+'<b>'+e(c.h)+'</b></div><ol start="'+(c.s||1)+'">'+c.items.map(function(x){return '<li>'+e(x)+'</li>'}).join('')+'</ol>'+(c.nw?'<div class="vlnew">'+N(1)+'<span>'+e(c.nw)+'</span></div>':'')+'</div>'}).join('')+'</div>'},
flow:function(b){return '<div class="vflow">'+b.steps.map(function(s,k){return (k?'<span class="varr">›</span>':'')+'<div class="vs'+(s.n?' isnew':'')+'">'+I(s.i)+N(s.n)+'<b>'+e(s.h)+'</b>'+(s.p?'<small>'+e(s.p)+'</small>':'')+'</div>'}).join('')+'</div>'},
cmp:function(b){var d=b.diff!==false;return '<div class="vcmp"><div class="vch"><span class="a">'+e(b.a||'OLD')+'</span><span></span><span class="b">'+e(b.b||'NEW')+'</span></div>'+b.rows.map(function(r){return '<div class="vcr'+(d&&r[1]!==r[2]?' chg':'')+'"><div class="vcl">'+e(r[0])+'</div><div class="vcv"><span class="a">'+e(r[1])+'</span><i>'+e(b.sep||'→')+'</i><span class="b">'+e(r[2])+'</span></div></div>'}).join('')+'</div>'},
visits:function(b){return '<div class="vvis">'+b.rows.map(function(r){var u=r.old.concat(r.nw.filter(function(x){return r.old.indexOf(x)<0})).sort(function(x,y){return num(x)-num(y)});return '<div class="vvr"><div class="vvh"><b>'+I(r.i)+' '+e(r.h)+'</b><span class="cnt"><s>'+r.old.length+'</s> → <strong>'+r.nw.length+' visits</strong></span></div><div class="vchips">'+u.map(function(x){var o=r.old.indexOf(x)>=0,n=r.nw.indexOf(x)>=0;return '<span class="vc '+(o&&n?'keep':o?'gone':'add')+'">'+e(x)+'</span>'}).join('')+'</div></div>'}).join('')+'<div class="vkey"><span class="vc keep">kept</span><span class="vc gone">dropped</span><span class="vc add">added</span></div></div>'},
range:function(b){return '<div class="vrng">'+b.rows.map(function(r){var p=function(v){return Math.max(0,Math.min(100,(v-r.lo)/(r.hi-r.lo)*100))};return '<div><div class="vrh"><b>'+e(r.l)+'</b><span class="vval">'+e(r.show)+'</span>'+(r.t!=null?'<span class="vtag">🎯 SDG target '+r.t+'</span>':'')+'</div><div class="vtrack"><i class="vmk" style="left:'+p(r.v)+'%"></i>'+(r.t!=null?'<i class="vtg" style="left:'+p(r.t)+'%"></i>':'')+'</div><div class="vends"><span>Lowest: '+e(r.lon)+'</span><span>Highest: '+e(r.hin)+'</span></div></div>'}).join('')+'</div>'},
pills:function(b){return '<div class="vpills">'+b.items.map(function(p){return '<div class="vpill"><span class="vcap '+(p.c||'')+'">'+I(p.i||'💊')+'<b>'+e(p.h)+'</b></span><div class="vpd"><strong>'+e(p.d)+'</strong><span>📍 '+e(p.p)+'</span></div></div>'}).join('')+'</div>'},
path:function(b){return '<div class="vpath"><div class="vpb">'+b.opts.map(function(o,k){return '<button type="button" class="vpbtn'+(k?'':' on')+'" data-p="'+k+'">'+e(o.h)+'</button>'}).join('')+'</div>'+b.opts.map(function(o,k){return '<ol class="vsteps'+(k?'':' on')+'" data-pp="'+k+'">'+o.steps.map(function(s){return '<li class="'+(s[1]||'')+'">'+e(s[0])+'</li>'}).join('')+'</ol>'}).join('')+'</div>'},
ladder:function(b){return '<div class="vlad">'+b.steps.slice().reverse().map(function(s,k){var l=b.steps.length-k;return '<button type="button" class="vlr" data-l="'+l+'" style="--w:'+(40+60*l/b.steps.length)+'%"><b>'+I(s.i)+' '+e(s.h)+'</b><span class="vp">'+e(s.p)+'</span></button>'}).join('')+'</div>'},
rings:function(b){return '<div class="vrings">'+b.items.map(function(r){return '<div class="vring"><div class="vrc" style="--p:'+r.p+'"><span>'+r.p+'%</span></div><b>'+e(r.h)+'</b></div>'}).join('')+'</div>'},
letters:function(b){return '<div class="vlet">'+b.items.map(function(x){return '<div class="vlt '+(x.c||'')+(x.n?' isnew':'')+'"><span class="lt">'+e(x.l)+'</span><div><b>'+e(x.h)+'</b>'+(x.p?'<small>'+e(x.p)+'</small>':'')+'</div>'+N(x.n)+'</div>'}).join('')+'</div>'}};
var g=function(d,c,a,s){return a*Math.exp(-Math.pow((d-c)/s,2))},qrs=function(d){return g(d,-3,-4,1.2)+g(d,0,26,1.6)+g(d,3,-7,1.4)},Pw=function(d){return g(d,-14,6,4)},Tw=function(d,a,s){return g(d,22,a==null?7:a,s||6)},
rg=function(n,sp,st){var r=[];for(var i=0;i<n;i++)r.push(st+i*sp);return r},bt=function(bs,f){return function(x){return bs.reduce(function(m,r){return m+f(x-r,r)},0)}},nz=function(x){return 2*Math.sin(x*1.9)+1.5*Math.sin(x*3.1+1)},
nb5=rg(5,60,30),sm=Math.sin,
JV=function(a,x,v,y){return bt([25,155,285],function(d){return g(d,0,a,7)+g(d,16,3,4)+g(d,34,-x,7)+g(d,70,v,11)+g(d,96,-y,8)})},
PU=function(h,w,n){return bt(rg(4,75,30),function(d){return g(d,0,h,w)+(n?g(d,22,n,3):0)})},
WV={normal:bt(nb5,function(d){return Pw(d)+qrs(d)+Tw(d)}),af:function(x){return bt([28,60,92,128,158,205,238,270],function(d){return qrs(d)+Tw(d,4)})(x)+nz(x)},flutter:function(x){return bt([40,120,200,280],qrs)(x)+((x%22)/22)*9-4},psvt:bt(rg(8,38,16),function(d){return qrs(d)+Tw(d,-3,4)}),
 mat:bt([25,70,95,150,200,230,275],function(d,r){return qrs(d)+g(d,-14,[8,3,-4][Math.round(r/5)%3],4)+Tw(d,4)}),vfib:function(x){return 16*sm(x*.7)*sm(x*.23+1)+8*sm(x*1.9)},vt:function(x){return 26*sm(x*2*Math.PI/38)},torsades:function(x){return(26*Math.abs(sm(x/38))+3)*sm(x*.95)},
 hyperk:bt(nb5,function(d){return qrs(d)+Tw(d,24,4)}),hypok:bt(nb5,function(d){return Pw(d)+qrs(d)+Tw(d,2)+g(d,40,5,7)}),stelev:bt(nb5,function(d){return Pw(d)+qrs(d)+g(d,16,12,10)}),pericard:bt(nb5,function(d){return qrs(d)+g(d,-12,-3,5)+g(d,14,9,13)}),
 digitalis:bt(nb5,function(d){return Pw(d)+qrs(d)+g(d,16,-8,10)}),bigeminy:bt([30,75,120,165,210,255],function(d,r){return((r-30)/45)%2?g(d,0,24,5)+g(d,16,-10,7):Pw(d)+qrs(d)+Tw(d)}),sine:function(x){return 20*sm(x*.12)},
 jn:JV(10,5,6,4),jtr:JV(4,3,22,4),jps:JV(22,5,6,4),jchb:bt([25,100,215],function(d){return g(d,0,30,5)}),jaf:JV(0,5,6,4),jtam:JV(10,14,8,0),jcon:JV(10,14,8,12),
 pn:PU(16,9,4),phypo:PU(6,16),phyper:PU(30,8),pwh:bt(rg(4,75,30),function(d){return g(d,0,36,5)+g(d,16,-8,6)}),pbis:bt(rg(4,75,30),function(d){return g(d,-6,18,5)+g(d,8,18,5)}),
 pbig:bt(rg(4,75,30),function(d,r){return g(d,0,r<100?22:r<200?10:22,8)}),palt:bt(rg(4,75,30),function(d,r){return g(d,0,(r-30)/75%2?12:22,8)})};
B.waves=function(b){return '<div class="vwaves">'+b.items.map(function(w){var f=WV[w.k],p=[];for(var x=0;x<=300;x+=2)p.push(x+','+(46-f(x)).toFixed(1));return '<div class="vwv"><svg viewBox="0 0 300 76" role="img" aria-label="'+e(w.h)+'"><polyline points="'+p.join(' ')+'" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><b>'+e(w.h)+'</b><small>'+e(w.p)+'</small></div>'}).join('')+'</div>'};
B.grid=function(b){return '<div class="vgrid"><table><thead><tr>'+b.cols.map(function(c){return '<th>'+e(c)+'</th>'}).join('')+'</tr></thead><tbody>'+b.rows.map(function(r){return '<tr>'+r.map(function(c,i){return i?'<td>'+e(c)+'</td>':'<th scope="row">'+e(c)+'</th>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'};
B.tree=function(b){var i=0;function n(x,d){var id=++i;return '<li class="'+(x.c||'')+'" style="--d:'+(id*.13).toFixed(2)+'s"><span class="vtn d'+d+'"><b>'+e(x.h)+'</b>'+(x.p?'<small>'+e(x.p)+'</small>':'')+'</span>'+(x.kids?'<ul>'+x.kids.map(function(k){return n(k,d+1)}).join('')+'</ul>':'')+'</li>'}
return '<div class="vtree play"><button type="button" class="vrep">▶ Replay</button><ul><li style="--d:0s"><span class="vtn d0"><b>'+e(b.root)+'</b>'+(b.p?'<small>'+e(b.p)+'</small>':'')+'</span><ul>'+b.kids.map(function(k){return n(k,1)}).join('')+'</ul></li></ul></div>'};
B.seesaw=function(b){return '<div class="vsee"><div class="vbeam"><div class="vend l"><b>'+e(b.l[0])+'</b><small>'+e(b.l[1])+'</small></div><div class="vend r"><b>'+e(b.r[0])+'</b><small>'+e(b.r[1])+'</small></div></div><div class="vpivot">▲</div></div>'};
B.figs=function(b){return '<div class="vfigs">'+b.items.map(function(f){return '<figure class="vfig"><svg viewBox="0 0 90 110" role="img" aria-label="'+e(f.cap)+'">'+f.svg+'</svg><figcaption><b>'+e(f.cap)+'</b>'+(f.p?'<span>'+e(f.p)+'</span>':'')+'</figcaption></figure>'}).join('')+'</div>'};
B.pics=function(b){return '<div class="vpics">'+b.items.map(function(f){return '<figure class="vpic"><img class="vpimg" src="'+f.src+'" alt="'+e(f.cap)+'" loading="lazy"><figcaption>'+e(f.cap)+'</figcaption></figure>'}).join('')+'</div>'};
IM.vizHTML=function(bl){return '<div class="viz">'+bl.map(function(b){return B[b.t]?'<section class="vb">'+(b.title?'<h4 class="vtitle">'+e(b.title)+'</h4>':'')+B[b.t](b)+'</section>':''}).join('')+'</div>'};
var D={tiles:function(b){return b.nr?[]:b.items.filter(function(t){return t.p}).map(function(t){return [t.h,t.p]})},
 letters:function(b){return b.items.map(function(x){return [x.k||x.l,x.h+(x.p?': '+x.p:'')]})},
 cmp:function(b){return b.rows.map(function(r){return [r[0],r[2]]})},
 lists:function(b){var o=[];b.cols.forEach(function(c){o.push([c.h,c.items.join('; ')+(c.nw?'; NEW: '+c.nw:'')]);if(c.nw)o.push([c.h+', new item',c.nw])});return o},
 visits:function(b){return b.rows.map(function(r){return [r.h,r.nw.join(', ')+' ('+r.nw.length+' visits)']})},
 pills:function(b){var o=[];b.items.forEach(function(p){o.push([p.h,p.d]);o.push([p.h+': platform',p.p])});return o},
 hub:function(b){return b.items.map(function(t){return [t.h,t.p]})},
 ladder:function(b){return b.steps.map(function(s){return [s.h,s.p]})},
 rings:function(b){return b.items.map(function(r){return [r.h,r.p+'%']})},
 flow:function(b){return b.steps.filter(function(s){return s.p}).map(function(s){return [s.h,s.p]})},
 range:function(b){var o=[];b.rows.forEach(function(r){o.push([r.l,r.show],[r.l+', highest',r.hin],[r.l+', lowest',r.lon])});return o}};
 D.grid=function(b){return b.rows.map(function(r){return [r[0],r.slice(1).join(' · ')]})};
 D.seesaw=function(b){return [b.l,b.r]};
 D.tree=function(b){var o=[];(function f(a){a.forEach(function(k){if(k.p)o.push([k.h,k.p]);if(k.kids)f(k.kids)})})(b.kids);return o};
 D.waves=function(b){return b.items.map(function(x){return [x.h,x.p]})};
IM.psm=function(id,title,sec,hook,bl,extra){var rows=[];bl.forEach(function(b){if(D[b.t])rows=rows.concat(D[b.t](b))});var c=IM.facts(id,title,sec,hook,rows.concat(extra||[]));c.viz=bl;c.noauto=true;c.gen=true;return c};
IM.psmFinish=function(sid){var s=IM.subjects[sid];if(!s)return;s.cards.forEach(function(c){if(!c.gen)return;c.qs=c.qs||[];c.rows.forEach(function(r,i){if(r[0]==='#'||r[1].length>110)return;var o=IM.distractors(s,c,r[1],3,i);if(o.length<3)return;c.qs.push({q:'In “'+c.title+'”: '+r[0]+'?',opts:[r[1]].concat(o),a:0,why:'Answer: '+r[1]})})})};
document.addEventListener('click',function(ev){var t=ev.target,x;
 if((x=t.closest('.vrep'))){var v=x.closest('.vtree');v.classList.remove('play');void v.offsetWidth;v.classList.add('play');return}
 if((x=t.closest('button.vt'))){x.classList.toggle('open');return}
 if((x=t.closest('.vlr'))){x.classList.toggle('open');return}
 if((x=t.closest('.vpbtn'))){var h=x.closest('.vpath');[].forEach.call(h.querySelectorAll('.vpbtn'),function(b){b.classList.toggle('on',b===x)});[].forEach.call(h.querySelectorAll('.vsteps'),function(l){l.classList.toggle('on',l.dataset.pp===x.dataset.p)})}});
})();

(function(){document.addEventListener('click',function(ev){var i=ev.target.closest&&ev.target.closest('img.vpimg');var z=document.getElementById('imgzoom');if(i){if(!z){z=document.createElement('div');z.id='imgzoom';z.innerHTML='<img alt="">';document.body.appendChild(z)}z.firstChild.src=i.src;z.firstChild.alt=i.alt;z.className='on';return}if(z&&z.className==='on')z.className=''});document.addEventListener('keydown',function(ev){var z=document.getElementById('imgzoom');if(ev.key==='Escape'&&z)z.className=''})})();
;
/* js/listen.js */
/* Listen mode: say a card from memory. Definitions and facts are matched by meaning-ish keywords (number words, fuzzy spelling, split words) and every point can be opened in the report. */
(function(){var IM=window.IM,e=IM.esc,SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=null,live=null;
var STOP=' the and with for from that this than then into per are was were have has been their they them also only when which while'.split(' '),
NW={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function norm(s){s=String(s).toLowerCase().replace(/[₀-₉]/g,function(c){return c.charCodeAt(0)-8320}).replace(/per cent|percent/g,' ').replace(/\b[a-z]+\b/g,function(w){return NW[w]!=null?NW[w]:w}).replace(/(\d+)\s*hundred/g,function(m,n){return n*100}).replace(/(\d+)\s*thousand/g,function(m,n){return n*1000});return s.replace(/[^a-z0-9. ]+/g,' ')}
function W(s){return norm(s).split(/\s+/).map(function(w){return w.replace(/^\.+|\.+$/g,'')}).filter(function(w){return w&&(w.length>3||/\d/.test(w))&&STOP.indexOf(w)<0})}
function K(w){return /\d/.test(w)?w:w.slice(0,5)}
function lev(a,b){if(Math.abs(a.length-b.length)>1)return 9;var i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++}else{d++;if(d>1)return 9;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}}return d+(a.length-i)+(b.length-j)}
function find(id){var s,i,c;for(s in IM.subjects){c=IM.subjects[s].cards;for(i=0;i<c.length;i++)if(c[i].id===id)return c[i]}}
function say(t){try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}catch(x){}}
IM.listenHTML=function(){return '<details class="lsn"><summary>🎤 Listen: say it from memory</summary><div class="lbody"><p class="lhint">'+(SR?'Tap Start, say the definitions and facts you remember, then tap Check.':'Voice input is not available in this browser. Type your recall, or use your keyboard’s dictation mic.')+'</p><div class="lbtns">'+(SR?'<button type="button" data-lstart>🎙️ Start</button>':'')+'<button type="button" data-lcheck>✅ Check</button><button type="button" data-lfacts>📖 Facts</button><button type="button" data-lclear>Clear</button></div><textarea rows="4" placeholder="Your recall appears here"></textarea><div class="lrep" aria-live="polite"></div></div></details>'};
function item(r,ic,note){return '<details class="litem"><summary>'+ic+' <b>'+e(r[0])+'</b></summary><p>'+e(r[1])+'</p>'+(note?'<p class="lnote">'+note+'</p>':'')+'</details>'}
function facts(card){return '<p class="lscore lgood"><b>All facts on this card</b>: tap a point to open it.</p>'+card.rows.filter(function(r){return r[0]!=='#'}).map(function(r){return item(r,'📘')}).join('')}
function check(card,box){var said=box.querySelector('textarea').value,rep=box.querySelector('.lrep'),rows=card.rows.filter(function(r){return r[0]!=='#'}),sw=W(said);
 if(!sw.length){rep.innerHTML='<p class="lbad">Nothing heard yet. Say or type your recall first.</p>';return}
 var keys=sw.map(K),j=norm(said).split(/\s+/);for(var i=0;i<j.length-1;i++)keys.push(K(j[i]+j[i+1]));
 var hit=function(k){return keys.some(function(h){return h===k||(k.length>=5&&h.length>=5&&lev(h,k)<=1)})},
 all={};rows.forEach(function(r){W(r[0]+' '+r[1]).forEach(function(w){all[K(w)]=1})});
 var wrong=[],seen={};sw.forEach(function(w){if(/^\d/.test(w)&&!all[K(w)]&&!seen[w]){seen[w]=1;wrong.push(w)}});
 var G={ok:[],part:[],miss:[]};
 rows.forEach(function(r){var aw=W(r[1]),ak=aw.map(K),tk=W(r[0]).map(K),c=ak.length?ak.filter(hit).length/ak.length:1,t=tk.length?tk.filter(hit).length/tk.length:0,
  s=c>=.6?'ok':(c>=.25||(t>=.6&&c>0))?'part':'miss',m=aw.filter(function(w){return !hit(K(w))}).filter(function(w,i,a){return a.indexOf(w)===i}).slice(0,6);
  G[s].push(item(r,s==='ok'?'✅':s==='part'?'🟡':'❌',s==='ok'?'':'Missing: '+m.map(e).join(', ')))});
 var n=rows.length,sc=G.ok.length+G.part.length/2,pct=Math.round(sc/n*100),bad=wrong.length||G.miss.length||G.part.length,
 mark=pct>=80?'Strong recall.':pct>=50?'Good start. Revise the points below.':'Needs another pass. Read the card, then try again.',
 h='<p class="lscore '+(bad?'lbad':'lgood')+'"><b>'+(bad?'Wrong or incomplete':'Correct')+'</b>: '+G.ok.length+' correct, '+G.part.length+' partly, '+G.miss.length+' missed of '+n+' ('+pct+'%). '+mark+'</p>';
 if(wrong.length)h+='<p class="lbad">❌ Check these numbers you said: '+wrong.map(e).join(', ')+' (not found on this card)</p>';
 if(G.miss.length)h+='<p class="lh">Missed ('+G.miss.length+')</p>'+G.miss.join('');
 if(G.part.length)h+='<p class="lh">Partly correct ('+G.part.length+')</p>'+G.part.join('');
 if(G.ok.length)h+='<p class="lh">Correct ('+G.ok.length+')</p>'+G.ok.join('');
 rep.innerHTML=h;
 var first=G.miss.concat(G.part).slice(0,2).map(function(x){return x.replace(/<[^>]+>/g,' ').split('Missing')[0].replace(/[❌🟡]/g,'').trim()});
 say(bad?'Wrong. '+(G.miss.length+G.part.length?'You missed or half-said '+(G.miss.length+G.part.length)+' point'+(G.miss.length+G.part.length>1?'s':'')+(first.length?', starting with '+first.join(' and '):''):'You said a number that is not on this card')+'.':'Correct. You covered every point.')}
document.addEventListener('click',function(ev){var b=ev.target.closest('[data-lstart],[data-lcheck],[data-lclear],[data-lfacts]');if(!b)return;var box=b.closest('.lsn'),ta=box.querySelector('textarea'),card=find(b.closest('.card').dataset.id);
 if(b.hasAttribute('data-lclear')){ta.value='';box.querySelector('.lrep').innerHTML='';return}
 if(b.hasAttribute('data-lfacts')){box.querySelector('.lrep').innerHTML=facts(card);return}
 if(b.hasAttribute('data-lcheck')){if(rec&&live)rec.stop();check(card,box);return}
 if(rec&&live===b){rec.stop();return}
 if(rec)rec.stop();rec=new SR();live=b;rec.lang='en-IN';rec.continuous=true;rec.interimResults=false;
 rec.onresult=function(r){for(var i=r.resultIndex;i<r.results.length;i++)if(r.results[i].isFinal)ta.value+=(ta.value?' ':'')+r.results[i][0].transcript};
 rec.onend=function(){b.textContent='🎙️ Start';b.classList.remove('on');rec=null;live=null};rec.onerror=function(){};
 b.textContent='⏹ Stop';b.classList.add('on');rec.start()});
})();
;
/* js/subjects/imnci.js */
/* IMNCI subject: the Master Chart cards, triage scenarios, key numbers and cheat sheet. */
(function(){

var TOPICS=[
{id:'psbi',n:1,age:'infant',title:'Possible serious bacterial infection / pneumonia',hook:'Fast breathing in the first 7 days is red. From day 7 to 59 the same rate is yellow.',bands:[
 {l:'red',c:'Possible serious bacterial infection / very severe disease',a:'Urgent referral',i:['Not feeding well, or not feeding at all','Convulsions','RR ≥60/min in a baby under 7 days','Severe chest indrawing','Temperature ≥37.5°C','Temperature <35.5°C','Movement only when stimulated, or no movement']},
 {l:'yellow',c:'Pneumonia',a:'Oral amoxicillin + follow up',i:['RR ≥60/min at 7–59 days (without the severe signs above)']},
 {l:'yellow',c:'Local bacterial infection',a:'Local treatment',i:['Umbilicus red or draining pus','Skin pustules']},
 {l:'green',c:'Infection unlikely',a:'Home care',i:['None of the above']}]},
{id:'jaundice',n:2,age:'infant',title:'Jaundice',hook:'Early (under 24 hours) or deep (palms and soles) is red.',bands:[
 {l:'red',c:'Severe jaundice',i:['Jaundice in the first 24 hours','Yellow palms and soles at any age']},
 {l:'yellow',c:'Jaundice',i:['Jaundice after 24 hours (palms and soles not yellow)']},
 {l:'green',c:'No jaundice',i:['No jaundice']}]},
{id:'diarrI',n:3,age:'infant',title:'Diarrhoea',hook:'Two signs decide: movement, eyes and the skin pinch. Any 2 puts you in the band.',bands:[
 {l:'red',c:'Severe dehydration',r:'any 2',i:['Movement only on stimulation, or no movement','Sunken eyes','Skin pinch goes back very slowly']},
 {l:'yellow',c:'Some dehydration',r:'any 2',i:['Restless, irritable','Sunken eyes','Skin pinch goes back slowly']},
 {l:'green',c:'No dehydration',i:['Not enough signs for the bands above']}]},
{id:'feed',n:4,age:'infant',title:'Feeding / low weight',hook:'Weight sets red. Feeding problems and mild low weight are yellow.',bands:[
 {l:'red',c:'Very low weight',i:['<1800 g if under 7 days old','WFA < −3 SD at 7–59 days']},
 {l:'yellow',c:'Feeding problem and / or low weight',i:['Poor attachment or ineffective suckling','<8 breastfeeds per day','Other feeds given','Thrush or breast problem','WFA < −2 SD']},
 {l:'green',c:'No feeding problem',i:['WFA ≥ −2 SD','No feeding problem']}]},
{id:'danger',n:5,age:'child',title:'General danger signs',special:true,hook:'Four signs, any one is red: drink, vomit, sleepy, fits.'},
{id:'cough',n:6,age:'child',title:'Cough or difficult breathing',hook:'Red: danger sign, stridor, low oxygen. Yellow: indrawing or fast breathing.',bands:[
 {l:'red',c:'Severe pneumonia / very severe disease',a:'Urgent referral',i:['Any danger sign','Stridor in a calm child','SpO₂ <90%']},
 {l:'yellow',c:'Pneumonia',i:['Chest indrawing','Fast breathing']},
 {l:'green',c:'No pneumonia: cough / cold',i:['Neither chest indrawing nor fast breathing']}],
 foot:'Fast breathing: 2–12 months ≥50/min. 12 months–5 years ≥40/min.'},
{id:'diarrC',n:7,age:'child',title:'Diarrhoea',hook:'Check eyes, thirst, alertness and skin pinch. Then count the days (14) and look for blood.',bands:[
 {g:'A. Dehydration',l:'red',c:'Severe dehydration',r:'any 2',i:['Lethargic or unconscious','Sunken eyes','Unable to drink, or drinking poorly','Skin pinch goes back very slowly']},
 {l:'yellow',c:'Some dehydration',r:'any 2',i:['Restless, irritable','Sunken eyes','Drinks eagerly, thirsty','Skin pinch goes back slowly']},
 {l:'green',c:'No dehydration',i:['Not enough signs for the bands above']},
 {g:'B. Duration',l:'red',c:'Severe persistent diarrhoea',i:['≥14 days + dehydration']},
 {l:'yellow',c:'Persistent diarrhoea',i:['≥14 days without dehydration']},
 {g:'C. Blood in stool',l:'yellow',c:'Dysentery',a:'Cefixime 5 days + Zinc',i:['Blood in stool']}]},
{id:'fever',n:8,age:'child',title:'Fever',hook:'Danger sign or stiff neck first. Then the malaria test.',bands:[
 {g:'A. Very severe febrile disease',l:'red',c:'Very severe febrile disease',r:'any 1',i:['Any general danger sign','Stiff neck']},
 {g:'B. Malaria',l:'yellow',c:'Malaria / suspected malaria',i:['Positive malaria RDT','RDT not available or negative, and no obvious alternative cause']},
 {l:'green',c:'Malaria unlikely',i:['Fever + another obvious cause + negative RDT']}]},
{id:'dengue',n:9,age:'child',title:'Dengue',hook:'Warning signs: cold limbs, belly pain, bleeding, positive tourniquet.',bands:[
 {g:'A. Severe dengue / warning signs',l:'red',c:'Severe dengue / dengue with warning signs',a:'Urgent referral',r:'any 1',i:['Any general danger sign','Cold extremities','Severe abdominal pain','Bleeding from any site','Positive tourniquet test']},
 {g:'B. Dengue fever',l:'yellow',c:'Dengue fever',i:['Fever in dengue season with continuous fever for 2–7 days, but no warning signs']}]},
{id:'measles',n:10,age:'child',title:'Measles',pre:'Generalized rash + any one of: cough, runny nose, red eyes.',hook:'Check the eyes and mouth. Every measles case gets Vitamin A.',bands:[
 {l:'red',c:'Severe complicated measles',i:['Any general danger sign','Corneal clouding','Deep or extensive mouth ulcers']},
 {l:'yellow',c:'Measles with eye / mouth complications',i:['Pus draining from the eye','Mouth ulcers']},
 {l:'green',c:'Measles',i:['Measles without the complications above']}],
 foot:'All measles → Vitamin A. Severe complicated measles → Vitamin A + IM ampicillin / gentamicin + urgent referral.'},
{id:'ear',n:11,age:'child',title:'Ear problem',hook:'Swelling behind the ear is red. The 14-day line splits acute from chronic.',bands:[
 {l:'red',c:'Mastoiditis',i:['Tender swelling behind the ear']},
 {l:'yellow',c:'Acute ear infection',i:['Ear pain','Pus or discharge for <14 days']},
 {l:'yellow',c:'Chronic ear infection',i:['Pus or discharge for ≥14 days']},
 {l:'green',c:'No ear infection',i:['No ear pain','No pus or discharge']}]},
{id:'mal',n:12,age:'child',title:'Malnutrition (5–60 months)',hook:'MUAC lines are 11.5 and 12.5 cm. Any complication makes SAM red.',bands:[
 {l:'red',c:'SAM with complications',i:['Any medical complication present*']},
 {l:'yellow',c:'SAM without complications',i:['WFL < −3 SD and / or MUAC <11.5 cm','No complications']},
 {l:'yellow',c:'MAM',i:['WFL < −2 SD and / or MUAC 11.5–12.4 cm','No oedema']},
 {l:'green',c:'No acute malnutrition',i:['WFL ≥ −2 SD + MUAC ≥12.5 cm']}],
 foot:'*Complications: danger sign, any severe classification, pneumonia, diarrhoea with dehydration, poor appetite, bilateral oedema.'},
{id:'anaemia',n:13,age:'child',title:'Anaemia',hook:'Look at the palms first. Hb cut-offs are 7 and 11.',bands:[
 {l:'red',c:'Severe anaemia',i:['Severe palmar pallor, or Hb <7 g/dL']},
 {l:'yellow',c:'Anaemia',i:['Some palmar pallor, or Hb 7–10.9 g/dL']},
 {l:'green',c:'No anaemia',i:['No palmar pallor, or Hb ≥11 g/dL']}]}
];

var DANGER=[
 ['Unable to drink / feed','<svg viewBox="0 0 24 24"><path d="M6 4h12l-1.5 14.5a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z"/><path d="M3 21 21 3"/></svg>'],
 ['Vomits everything','<svg viewBox="0 0 24 24"><path d="M3 8c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/><path d="M3 13c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/><path d="M3 18c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/></svg>'],
 ['Lethargic / unconscious','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7.5 10.5q1.5 1.2 3 0M13.5 10.5q1.5 1.2 3 0M9.5 16h5"/></svg>'],
 ['Convulsions / convulsing now','<svg viewBox="0 0 24 24"><path d="M13 2 5 14h6l-1 8 9-12h-6z"/></svg>']
];

var SCEN=[
 ['Young infant, 5 days','RR 64/min. Feeding well, temperature 36.8°C, no chest indrawing.','red','Fast breathing (RR ≥60/min) in a baby under 7 days is red: possible serious bacterial infection.','Possible serious bacterial infection'],
 ['Young infant, 3 weeks','RR 62/min. Feeding well, no chest indrawing, temperature 36.9°C.','yellow','RR ≥60/min at 7–59 days without severe signs is yellow: pneumonia, oral amoxicillin and follow up.','Possible serious bacterial infection'],
 ['Young infant, 4 days','Umbilicus is red with pus draining. Breathing, feeding and temperature are normal.','yellow','Red umbilicus or pus, or skin pustules, is a local bacterial infection: yellow, local treatment.','Possible serious bacterial infection'],
 ['Young infant, 12 days','Axillary temperature 38.0°C. Otherwise well and feeding.','red','Temperature ≥37.5°C (or <35.5°C) is a red sign in a young infant.','Possible serious bacterial infection'],
 ['Young infant, 2 weeks','Moves only when stimulated. Breathing rate normal.','red','Movement only when stimulated, or no movement, is a red sign.','Possible serious bacterial infection'],
 ['Young infant, 3 days','Yellow skin on the face and chest. Palms and soles are not yellow.','yellow','Jaundice after 24 hours with palms and soles not yellow is yellow: jaundice.','Jaundice'],
 ['Young infant, 10 days','Yellow skin, including yellow palms and soles.','red','Yellow palms and soles at any age is severe jaundice.','Jaundice'],
 ['Newborn, 2 days','Mother noticed yellow skin at 20 hours of age.','red','Jaundice in the first 24 hours is severe jaundice, whatever the palms and soles look like.','Jaundice'],
 ['Young infant with diarrhoea','Restless and irritable, with sunken eyes. Skin pinch goes back slowly.','yellow','Restless or irritable, sunken eyes and slow skin pinch: any 2 gives some dehydration.','Diarrhoea (young infant)'],
 ['Young infant with diarrhoea','Moves only when stimulated. Skin pinch goes back very slowly.','red','Any 2 of: movement only on stimulation, sunken eyes, very slow skin pinch gives severe dehydration.','Diarrhoea (young infant)'],
 ['Young infant, 5 days','Weight 1700 g.','red','<1800 g in the first 7 days is very low weight.','Feeding / low weight'],
 ['Young infant, 3 weeks','Only 6 breastfeeds a day. WFA ≥ −2 SD.','yellow','<8 breastfeeds a day is a feeding problem: yellow.','Feeding / low weight'],
 ['Child, 9 months','Cough. RR 52/min, no chest indrawing, no danger signs.','yellow','For 2–12 months, fast breathing is ≥50/min: pneumonia, yellow.','Cough or difficult breathing'],
 ['Child, 18 months','Cough. RR 44/min, no chest indrawing, no danger signs.','yellow','For 12 months–5 years, fast breathing is ≥40/min: pneumonia, yellow.','Cough or difficult breathing'],
 ['Child, 3 years','Cough and runny nose. RR 36/min, no chest indrawing, no danger signs.','green','No fast breathing and no chest indrawing: no pneumonia, cough or cold.','Cough or difficult breathing'],
 ['Child, 3 years','Cough. RR 36/min. Makes a harsh noise when breathing in, even when calm.','red','Stridor in a calm child is a red sign.','Cough or difficult breathing'],
 ['Child, 2 years','Cough and difficulty breathing. SpO₂ 88%.','red','SpO₂ <90% is a red sign: severe pneumonia / very severe disease.','Cough or difficult breathing'],
 ['Child, 1 year','Cough. Cannot be fed, vomits everything.','red','Unable to drink or feed and vomiting everything are general danger signs: any one is red.','General danger signs'],
 ['Child, 2 years with diarrhoea','Lethargic. Eyes are sunken. Skin pinch normal.','red','Any 2 of lethargic, sunken eyes, unable to drink, very slow skin pinch gives severe dehydration.','Diarrhoea (child)'],
 ['Child, 3 years with diarrhoea','Restless. Drinks eagerly and is thirsty.','yellow','Two signs of some dehydration (restless, drinks eagerly): yellow.','Diarrhoea (child)'],
 ['Child, 2 years with diarrhoea','Diarrhoea for 16 days. No signs of dehydration.','yellow','≥14 days without dehydration is persistent diarrhoea.','Diarrhoea (child)'],
 ['Child, 2 years with diarrhoea','Diarrhoea for 16 days. Sunken eyes and drinking poorly.','red','≥14 days with dehydration is severe persistent diarrhoea.','Diarrhoea (child)'],
 ['Child, 4 years with diarrhoea','Blood in the stool. No dehydration.','yellow','Blood in stool is dysentery: yellow, Cefixime for 5 days and Zinc.','Diarrhoea (child)'],
 ['Child, 3 years','Fever and a stiff neck.','red','Stiff neck (or any danger sign) with fever is very severe febrile disease.','Fever'],
 ['Child, 5 years','Fever. Malaria RDT is positive. No danger signs.','yellow','A positive malaria RDT is malaria: yellow.','Fever'],
 ['Child, 4 years','Fever with an obvious sore throat. Malaria RDT is negative.','green','Fever with another obvious cause and a negative RDT is malaria unlikely.','Fever'],
 ['Child, 6 years in dengue season','Fever with bleeding gums and severe abdominal pain.','red','Bleeding from any site or severe abdominal pain is a warning sign: severe dengue, urgent referral.','Dengue'],
 ['Child, 4 years in dengue season','Continuous fever for 4 days. No warning signs.','yellow','Continuous fever for 2–7 days without warning signs is dengue fever.','Dengue'],
 ['Child, 2 years','Measles rash and red eyes. The cornea looks cloudy.','red','Corneal clouding is a red sign: severe complicated measles.','Measles'],
 ['Child, 3 years','Measles rash and cough. Pus draining from one eye.','yellow','Pus draining from the eye or mouth ulcers is measles with eye / mouth complications.','Measles'],
 ['Child, 3 years','Measles rash, cough and runny nose. No eye or mouth problems, no danger signs.','green','Measles without complications is green. Vitamin A still goes to all measles cases.','Measles'],
 ['Child, 4 years','Ear pain and a tender swelling behind the ear.','red','Tender swelling behind the ear is mastoiditis.','Ear problem'],
 ['Child, 3 years','Ear pain. Pus from the ear for 3 days.','yellow','Pus or discharge under 14 days is an acute ear infection.','Ear problem'],
 ['Child, 5 years','Pus draining from the ear for 3 weeks. No swelling behind the ear.','yellow','Discharge for ≥14 days is a chronic ear infection.','Ear problem'],
 ['Child, 2 years','No ear pain and no discharge.','green','No ear pain and no pus or discharge: no ear infection.','Ear problem'],
 ['Child, 2 years','MUAC 11.0 cm. Eating well, no complications.','yellow','MUAC <11.5 cm without complications is SAM without complications: yellow.','Malnutrition'],
 ['Child, 2 years','MUAC 11.0 cm and poor appetite.','red','Poor appetite is a complication, so SAM with complications: red.','Malnutrition'],
 ['Child, 3 years','MUAC 12.0 cm. No oedema.','yellow','MUAC 11.5–12.4 cm without oedema is MAM: yellow.','Malnutrition'],
 ['Child, 3 years','MUAC 13.0 cm. WFL ≥ −2 SD.','green','MUAC ≥12.5 cm and WFL ≥ −2 SD: no acute malnutrition.','Malnutrition'],
 ['Child, 2 years','Severe palmar pallor.','red','Severe palmar pallor, or Hb <7 g/dL, is severe anaemia.','Anaemia'],
 ['Child, 3 years','Some palmar pallor. Hb 9.0 g/dL.','yellow','Hb 7–10.9 g/dL is anaemia: yellow.','Anaemia'],
 ['Child, 4 years','No palmar pallor. Hb 12.0 g/dL.','green','Hb ≥11 g/dL with no palmar pallor: no anaemia.','Anaemia']
];

var NUMS=[
 {g:'Fast breathing, per minute',bar:60,items:[['Young infant, under 2 months','≥60','/min',60],['Child, 2–12 months','≥50','/min',50],['Child, 12 months–5 years','≥40','/min',40]]},
 {g:'Temperature',items:[['Fever (axillary)','≥37.5','°C'],['High fever, give paracetamol','≥38.5','°C'],['Hypothermia, young infant','<35.5','°C']]},
 {g:'Duration and timing',items:[['Persistent diarrhoea','≥14','days'],['Acute ear infection, discharge','<14','days'],['Chronic ear infection, discharge','≥14','days'],['Jaundice starting before this is severe','<24','hours']]},
 {g:'Weight and oxygen',items:[['Very low weight, young infant under 7 days','<1800','g'],['Very low weight at 7–59 days (WFA)','< −3','SD'],['Low weight, young infant (WFA)','< −2','SD'],['SAM by weight-for-length','< −3','SD'],['MAM by weight-for-length','< −2','SD'],['Severe pneumonia if SpO₂','<90','%']]}
];

var CHEAT=[
 ['General','Any danger sign','–','–'],
 ['Pneumonia','Severe pneumonia / very severe disease','Pneumonia','Cough / cold'],
 ['Diarrhoea','Severe dehydration','Some dehydration','No dehydration'],
 ['Duration','Severe persistent diarrhoea','Persistent diarrhoea','–'],
 ['Blood','–','Dysentery','–'],
 ['Fever','Very severe febrile disease','Malaria / suspected malaria','Malaria unlikely'],
 ['Dengue','Severe dengue / warning signs','Dengue fever','–'],
 ['Measles','Severe complicated measles','Eye / mouth complications','Measles'],
 ['Ear','Mastoiditis','Acute / chronic ear infection','No ear infection'],
 ['Nutrition','SAM + complications','SAM without complications / MAM','No acute malnutrition'],
 ['Anaemia','Severe anaemia','Anaemia','No anaemia']
];

IM.subject({
  id:'imnci',
  title:'IMNCI',
  blurb:'Integrated Management of Newborn & Childhood Illness. Start with red, then yellow, then green.',
  numbers:NUMS,
  cheat:CHEAT,
  scenarios:SCEN,
  numbersExtra:'<div class="nsec"><h2>Measuring tapes</h2>'+
   '<div class="strip-card"><h3>MUAC, cm</h3><div class="strip"><div class="red" style="flex:37.5">SAM</div><div class="yellow" style="flex:25">MAM</div><div class="green" style="flex:37.5">Normal</div></div>'+
   '<div class="ticks"><span class="l" style="left:0">10</span><span class="secret" tabindex="0" style="left:37.5%">&lt;11.5 | 11.5–12.4</span><span class="secret r" tabindex="0" style="left:100%">≥12.5</span></div></div>'+
   '<div class="strip-card"><h3>Haemoglobin, g/dL</h3><div class="strip"><div class="red" style="flex:30">Severe anaemia</div><div class="yellow" style="flex:40">Anaemia</div><div class="green" style="flex:30">No anaemia</div></div>'+
   '<div class="ticks"><span class="l" style="left:0">4</span><span class="secret" tabindex="0" style="left:30%">&lt;7</span><span class="secret" tabindex="0" style="left:50%">7–10.9</span><span class="secret r" tabindex="0" style="left:100%">≥11</span></div></div></div>',
  legend:true
});
IM.cards('imnci',TOPICS.map(function(t){
  t.section=t.age==='infant'?'Young infant, up to 2 months':'Child, 2 months to 5 years';
  if(t.special){
    return {kind:'tiles',id:t.id,n:t.n,title:t.title,section:t.section,hook:t.hook,banner:'ANY ONE = RED',bannerNote:'very severe disease',
      tiles:DANGER.map(function(d){return {t:d[0],icon:d[1]}})};
  }
  t.kind='bands';
  return t;
}));
})();
;
/* beta/generated/stub-surgery.js */
IM.subject({"id":"surgery","title":"Surgery","heroTitle":"","blurb":"Scores and classifications from the Surgery section: trauma, vascular, biliary, liver, GI, breast and more.","locked":true,"lockedCards":26});
;
/* beta/generated/stub-paeds.js */
IM.subject({"id":"paeds","title":"Paediatrics","heroTitle":"","blurb":"Neonatal and paediatric scores: Apgar, Silverman Anderson, Downes, NEC, HIE and dehydration.","locked":true,"lockedCards":5});
;
/* beta/generated/stub-obg.js */
IM.subject({"id":"obg","title":"OBG","heroTitle":"","blurb":"Biophysical profile, Bishop score, antiphospholipid syndrome criteria and POP-Q.","locked":true,"lockedCards":12});
;
/* beta/generated/stub-medicine.js */
IM.subject({"id":"medicine","title":"Medicine","heroTitle":"","blurb":"SLE, ARDS, CURB-65, Wells, ABPA, CHA₂DS₂-VASc, ABCD² and West Haven grading.","locked":true,"lockedCards":6});
;
/* beta/generated/stub-psm.js */
IM.subject({"id":"psm","title":"PSM 2026","heroTitle":"PSM Updates 2026","blurb":"Every 2026 update as pictures: tap, flip and test yourself.","locked":true,"lockedCards":22});
;
/* js/subjects/micro-att.js */
/* Micro: ATT drugs, resistance definitions, DR-TB regimens, TB in pregnancy. */
IM.subject({id:'micro',title:'Micro: ATT',heroTitle:'ATT and TB treatment',blurb:'Spot the drug from its clue, then walk the DR-TB and pregnancy flowcharts.'});
var D='Drugs',R='Resistance',X='Treatment';
IM.cards('micro',[
IM.psm('attdrugs','ATT: clue to drug',D,'Hepatotoxicity order: Z > H > R. Eye = Ethambutol, Psycho = Cycloserine.',[
 {t:'tiles',nr:1,items:[
  {i:'💊',h:'Isoniazid (H)',c:'c-bl',p:'Mycolic acid synthesis inhibitor · CYP inhibitor · hepatotoxic · neuropathy · sideroblastic anaemia · lupus'},
  {i:'💊',h:'Pyrazinamide (Z)',c:'c-am',p:'FA synthesis inhibitor · most hepatotoxic · hyperuricaemia · acts on intracellular bacteria'},
  {i:'👁️',h:'Ethambutol (E)',c:'c-gr',p:'Arabinogalactan synthesis inhibitor · red-green colour blindness'},
  {i:'🟠',h:'Rifampicin (R)',c:'c-rd',p:'Maximum cidal action · RNA polymerase inhibitor · enzyme inducer · pulmonary syndrome · orange urine'},
  {i:'👀',h:'Rifabutin',c:'c-rd',p:'Pseudojaundice · uveitis · minimal enzyme inducer'},
  {i:'🦋',h:'Ethionamide',c:'c-pu',p:'Hepatotoxic · hypothyroidism'},
  {i:'🧠',h:'Cycloserine',c:'c-pu',p:'Psychosis ("Psycho-serine")'},
  {i:'❤️',h:'Bedaquiline',c:'c-pk',p:'ATP synthase inhibitor · QT prolongation'},
  {i:'❤️',h:'Pretomanid',c:'c-pk',p:'QT prolongation · acts through nitro radicals and blocks mycolic acid synthesis'},
  {i:'🩸',h:'Linezolid',c:'c-tl',p:'Bone marrow suppression · peripheral neuropathy'},
  {i:'🦵',h:'Moxifloxacin',c:'c-tl',p:'QT prolongation · tendon rupture · seizures'},
  {i:'🤰',h:'Streptomycin',c:'c-gy',p:'Contraindicated in pregnancy'}]}],
 [['Mycolic acid inhibitor with neuropathy, lupus, sideroblastic anaemia','Isoniazid'],['FA synthesis inhibitor with hyperuricaemia','Pyrazinamide'],['Arabinogalactan inhibitor, red-green colour blindness','Ethambutol'],['Max cidal, RNA polymerase inhibitor, orange urine','Rifampicin'],['Pseudojaundice, uveitis, minimal enzyme inducer','Rifabutin'],['Hepatotoxic with hypothyroidism','Ethionamide'],['Psychosis','Cycloserine'],['ATP synthase inhibitor','Bedaquiline'],['QT prolongation (two drugs)','Bedaquiline and pretomanid'],['Contraindicated in pregnancy','Streptomycin'],['Hepatotoxicity order','Z > H > R']]),
IM.psm('resdef','MDR, pre-XDR and XDR-TB',R,'Each step adds a drug class to H + R. XDR also loses a Group A drug.',[
 {t:'ladder',steps:[{i:'1️⃣',h:'Poly-drug resistance',p:'Resistance to any 2 drugs other than H + R'},{i:'2️⃣',h:'MDR-TB',p:'Resistant to H + R'},{i:'3️⃣',h:'Pre-XDR TB',p:'H + R + fluoroquinolone (FQ)'},{i:'4️⃣',h:'XDR-TB',p:'H + R (+ FQ) + any Group A drug (bedaquiline, linezolid, moxifloxacin per your note)'}]}]),
IM.psm('drtbflow','DR-TB: which regimen?',X,'R-resistant, 14+ yrs, eligible: BPaLM for 6 months. First-line failure: ZERO.',[
 {t:'path',title:'Tap the case',opts:[
  {h:'R-resistant, over 14 yrs',steps:[['Eligible for BPaLM? Note: under 1 month second-line exposure, QT normal, LFT normal, no severe bone, CNS or disseminated TB'],['Yes: BPaLM for 6 months (bedaquiline, pretomanid, linezolid, moxifloxacin)','ok'],['No: check eligibility for the 9–11 month shorter oral regimen'],['Not eligible for either: longer regimen (18–20 months)','warn']]},
  {h:'R-resistant, under 14 yrs',steps:[['BPaLM is not used: go to the 9–11 month shorter oral regimen'],['If not eligible: longer regimen']]},
  {h:'9–11 month shorter',steps:[['(2) Lzd · (4–6) Lfx Cfz Z E Hh · (6–9) Bdq'],['Continuation: (5) Lfx Cfz Z E'],['Lzd can be swapped for ethionamide'],['InhA and KatG mutations both present: Lzd-containing regimen allowed; Eto-containing not allowed','warn']]},
  {h:'Longer (XDR) regimen',steps:[['Bedaquiline (6 months or longer)'],['(18–20) Lfx, Lzd, Cfz, Cs (cycloserine)'],['Used when additional resistance, intolerance, drug unavailable, or exclusion criteria appear','warn']]},
  {h:'R not resistant',steps:[['First line: 2 HRZE / 4 HRE'],['Test for H resistance'],['H resistance detected: 6–9 months Lfx RZE ("ZERO")','warn'],['Not detected or awaited: continue first line','ok']]}]}],
 [['Shorter oral regimen: FQ resistance','Must not be detected'],['Shorter oral regimen: previous second-line exposure','None for more than 1 month'],['Shorter oral regimen: excluded forms','CNS, spinal or skeletal, miliary, disseminated TB'],['H resistance with R sensitive','6–9 months Lfx RZE ("ZERO")'],['BPaLM duration','6 months']]),
IM.psm('tbpreg','MDR/XDR-TB in pregnancy',X,'Under 20 weeks: advise MTP. After 20 weeks: no BPaLM.',[
 {t:'path',title:'Tap the gestation',opts:[
  {h:'Under 20 (or 24) weeks',steps:[['Advise MTP'],['MTP done: start or continue BPaLM, or 9-month shorter oral regimen (with Lzd), or longer oral M/XDR regimen','ok'],['Patient unwilling for MTP: follow the over 20 weeks path','warn']]},
  {h:'Over 20 (or 24) weeks',steps:[['9-month shorter oral regimen (with Lzd), OR','ok'],['Longer oral M/XDR regimen (18–20 Lfx, Bdq, Lzd, Cfz, Cs)','ok'],['BPaLM is not listed on this branch','warn']]},
  {h:'Footnotes',steps:[['BPaLM: Bdq, Pa, Lzd, Mfx'],['Lzd can be replaced with Eto if required after MTP, or only after 32 weeks'],['Modify the longer regimen if a drug cannot be used (resistance, tolerability, contraindication, availability)'],['Drop drugs in the order Z, E, PAS'],['Eto may be considered after 32 weeks gestation']]}]}],
 [['BPaLM in pregnancy','Only after MTP, not if continuing beyond 20 weeks'],['Streptomycin in pregnancy','Contraindicated'],['Ethionamide in pregnancy','Only after MTP or after 32 weeks']])
]);
;
/* js/subjects/cvs.js */
/* Cardio. Waveforms are drawn in the app (see WV in js/viz.js). */
IM.subject({id:'cvs',title:'Cardio',heroTitle:'Cardiology: ECG, pulses, murmurs',blurb:'Rhythms, ECG signs, JVP, pulses, sounds and murmurs, with the waveforms drawn.'});
var t=function(i,h,p,c){return{i:i,h:h,p:p,c:c}},C=IM.psm;
IM.cards('cvs',[
C('svt','Supraventricular tachyarrhythmias','Rhythms','AF irregular, flutter sawtooth, PSVT regular no P, MAT multifocal P.',[
 {t:'waves',items:[{h:'Atrial fibrillation',p:'Irregularly irregular, absent P waves',k:'af'},{h:'Atrial flutter',p:'Regular, sawtooth flutter waves',k:'flutter'},{h:'PSVT',p:'Regular, narrow, absent P waves',k:'psvt'},{h:'MAT',p:'Irregularly irregular, multifocal P waves',k:'mat'}]},
 {t:'tiles',show:1,items:[t('🌀','AF treatment','Unstable: synchronised cardioversion 200 J. Stable: rate control, esmolol (DOC) or verapamil in asthmatics. With acute heart failure: digoxin. Anticoagulate by CHA₂DS₂-VASc','c-rd'),
 t('〰️','Flutter treatment','Unstable: cardioversion 25–50 J. Stable: esmolol or ibutilide','c-am'),
 t('⚡','PSVT treatment','Unstable: cardioversion. Stable: vagal manoeuvres or carotid massage, then IV adenosine, then esmolol > verapamil for rate. FROG sign (neck pulsations) in AVNRT','c-bl'),
 t('🔀','PSVT types','AVNRT (over 60%, more common) and AVRT (e.g. WPW syndrome)'),
 t('🫁','MAT','DOC verapamil. Linked to hypoxia (COPD exacerbation most common) and pneumonia. Cardioversion has no role','c-tl'),
 t('🧮','CHA₂DS₂-VASc','CHF, hypertension, age over 75 (2), diabetes, stroke/TIA/TE (2), vascular disease, age over 65, female sex. Max 9. Score 0 no anticoagulant, 1 aspirin, 2 or more DOACs','c-pu'),
 t('💊','Warfarin','Choice in moderate-severe MS and prosthetic valves; monitor INR, target 2–3. DOACs need no routine coagulation monitoring','c-gr')]}]),
C('vt','Ventricular tachyarrhythmias','Rhythms','Unstable: shock. Stable VT: amiodarone. Torsades: magnesium.',[
 {t:'waves',items:[{h:'Ventricular fibrillation',p:'No discernible rhythm pattern',k:'vfib'},{h:'Monomorphic VT',p:'Wide complex, regular tachycardia',k:'vt'},{h:'Torsades de pointes',p:'Polymorphic VT, twisting QRS (long QT)',k:'torsades'}]},
 {t:'tiles',show:1,items:[t('⚡','VF / VT treatment','Unstable: defibrillation. Stable: IV amiodarone. Lignocaine historically used','c-rd'),
 t('🧪','Torsades','DOC IV MgSO₄. Romano-Ward: no SNHL. Jervell and Lange-Nielsen: SNHL present. Causes: hypokalaemia, hypomagnesaemia, hypocalcaemia, hypothermia'),
 t('🎯','Special beats','Capture beat: SA node briefly conducts, one normal QRS amid wide VT. Fusion beat: SAN and ventricular signals fuse into a partly wide QRS'),
 t('💊','Long QT drugs: ABCDE','Anti-arrhythmics (1A, 3); Antibiotics/ATT/antifungals (macrolides, FQs, bedaquiline, pretomanid, azoles); Antipsychotics (haloperidol, ziprasidone, quetiapine, risperidone); Antidepressants (TCA, SSRI); Antiemetics (setrons except palonosetron, domperidone). Also chloroquine, HCQ, methadone, protease inhibitors; CAT drugs withdrawn (cisapride, astemizole, terfenadine)','c-am'),
 t('🧲','Uses of MgSO₄','Eclampsia, fetal neuroprotection (under 32 weeks), tocolysis, acute asthma, cellulitis dressing, aluminium phosphide poisoning, oral laxative','c-gr')]}]),
C('ecgs','Digitalis, potassium and calcium ECGs','ECG','Peaked T = high K. U wave = low K. Moustache = digoxin.',[
 {t:'waves',items:[{h:'Hyperkalaemia',p:'Peaked T waves',k:'hyperk'},{h:'Hypokalaemia',p:'U wave and QT prolongation',k:'hypok'},{h:'Digitalis effect',p:'Scooped ST: Salvador Dali moustache or hockey stick sign',k:'digitalis'},{h:'Ventricular bigeminy',p:'Normal beat alternating with wide ventricular ectopic',k:'bigeminy'},{h:'Severe hyperkalaemia',p:'Sine wave, then VF or asystole',k:'sine'}]},
 {t:'tiles',show:1,items:[t('🌼','Digoxin','From foxglove. Blocks Na⁺/K⁺-ATPase: more intracellular Ca²⁺ (inotropy) and more vagal tone (slows AV). Side effects: hyperkalaemia, cholinergic effects, yellow vision'),
 t('📈','Digoxin arrhythmias','Most common: ventricular bigeminy. Most specific: NPAT with AV block. ECG: short QT, flat T, scooped ST, long PR'),
 t('☠️','Digoxin toxicity','Low K, low Mg, high Ca, renal failure, verapamil, amiodarone, clarithromycin, cyclosporine, quinidine (P-gp inhibition). Rx: DigiBind antibody fragments; lignocaine for arrhythmias','c-rd'),
 t('🔺','Hyperkalaemia ECG','Mild 5.5–6.5: peaked T, long PR. Moderate 6.5–8: P lost, ST elevation, ectopics. Severe over 8: sine wave, VF, asystole','c-am'),
 t('💉','Hyperkalaemia treatment','Calcium gluconate (stabilises heart, does not lower K) · insulin + dextrose · salbutamol (shift K into cells)','c-gr'),
 t('🦴','Calcium and QT','Hypocalcaemia lengthens QT; hypercalcaemia shortens QT')]}]),
C('stelev','ST elevation','ECG','Convex = STEMI, concave = pericarditis. LAD = widow maker.',[
 {t:'waves',items:[{h:'STEMI',p:'Convex ST elevation (Pardee sign)',k:'stelev'},{h:'Acute pericarditis',p:'Concave-up ST elevation with PR depression',k:'pericard'}]},
 {t:'tiles',show:1,items:[t('📋','Causes','Hyperkalaemia, STEMI, acute pericarditis, Prinzmetal angina, Takotsubo, ventricular aneurysm, Brugada (V1–V3)'),
 t('❤️','STEMI territories','I, aVL lateral · V1–V2 anteroseptal · V3–V4 anteroapical · V5–V6 anterolateral · II, III, aVF inferior. LAD = widow maker','c-rd'),
 t('🔄','Posterior MI','ST depression V1–V3, tall broad R waves, upright T. Confirm with V7–V9 ST elevation of 0.5 mm or more'),
 t('🫀','Acute pericarditis','Sharp pleuritic pain, worse on inspiration, better sitting forward; rub. Viral (coxsackie, mumps) commonest; post-MI = Dressler. Rx NSAIDs, colchicine','c-bl'),
 t('🏺','Takotsubo','Stress (broken heart) cardiomyopathy: mid-ventricular narrowing, hypokinetic mid ventricle with normal apex. Biomarkers up; told apart from STEMI only by angiography','c-pu'),
 t('🧬','Brugada','Coved ST V1–V3 with RBBB-like pattern. SCN5A sodium channel gene, autosomal dominant. Rx ICD','c-am')]}]),
C('jvp','JVP waveforms, tamponade, constriction','Signs','Large V = TR. Large a = stiff RV. Cannon = heart block. No a = AF.',[
 {t:'waves',items:[{h:'Normal JVP',p:'a, c, v waves with x and y descents',k:'jn'},{h:'Tricuspid regurgitation',p:'Large V wave; Lancisi sign',k:'jtr'},{h:'TS / PS / PAH / TOF',p:'Large a wave',k:'jps'},{h:'Complete heart block',p:'Cannon a wave',k:'jchb'},{h:'Atrial fibrillation',p:'Absent a waves',k:'jaf'},{h:'Cardiac tamponade',p:'Prominent x descent, loss of y',k:'jtam'},{h:'Constrictive pericarditis',p:'Prominent x and y descents',k:'jcon'}]},
 {t:'tiles',show:1,items:[t('⚠️','Tamponade','Beck’s triad: hypotension, raised JVP, muffled heart sounds. Also pulsus paradoxus, Ewart’s sign, diastolic collapse on echo, electrical alternans','c-rd'),
 t('🧱','Constrictive pericarditis','Kussmaul sign, pulsus paradoxus, pericardial knock, low voltage ECG'),
 t('🫁','Pulsus paradoxus','SBP falls by over 10 mmHg on inspiration. Tamponade, constrictive pericarditis, pulmonary embolism, pregnancy, asthma'),
 t('↩️','Reverse pulsus paradoxus','SBP rises on inspiration: PPV and HOCM')]}]),
C('pulse','Pulse types and aortic regurgitation signs','Signs','Waterhammer = AR. Parvus et tardus = AS. Alternans = LVF.',[
 {t:'waves',items:[{h:'Normal',p:'Dicrotic notch = aortic valve closure',k:'pn'},{h:'Hypokinetic',p:'Low stroke volume; parvus et tardus (AS)',k:'phypo'},{h:'Hyperkinetic',p:'Wet beriberi, AR, thyrotoxicosis, pregnancy',k:'phyper'},{h:'Waterhammer / collapsing',p:'AR (pseudo-collapsing pulse: MR)',k:'pwh'},{h:'Pulsus bisferiens',p:'Outflow obstruction: HOCM, AS + AR',k:'pbis'},{h:'Bigeminal',p:'PAC or PVC',k:'pbig'},{h:'Pulsus alternans',p:'LVF (Frank-Starling law)',k:'palt'}]},
 {t:'tiles',show:1,items:[t('🔎','AR peripheral signs','Corrigan: collapsing carotid · Müller: uvular pulsation · Landolfi: pupillary · Quincke: nail bed capillary · de Musset: head nodding · Hill: popliteal SBP over brachial by more than 20 mmHg','c-rd')]}]),
C('sounds','Heart sounds, splits and tumours','Heart sounds','S3 ventricular gallop, S4 atrial gallop. Fixed split = ASD.',[
 {t:'tiles',show:1,items:[t('1️⃣','S1','Mitral and tricuspid closure. Loud: MS, short PR (WPW), hyperdynamic. Soft: MR, TR, CHF, calcified valves, long PR'),
 t('2️⃣','S2 splits','Variable wide: PAH, PS, RBBB, MR. Fixed wide: ASD, TAPVC. Paradoxical: AS, LBBB, HTN','c-bl'),
 t('🐎','Gallops','S4 (atrial): stiff ventricle, HOCM, chronic HTN. S3 (ventricular): high output, CHF, DCM, pregnancy','c-am'),
 t('🔔','Added sounds','Ejection click: AS · mid-systolic click: MVP · opening snap: MS · pericardial knock: constrictive pericarditis · tumour plop: atrial myxoma'),
 t('🟣','Cardiac tumours','Atrial myxoma: commonest in adults, high IL-6, lepidic cells. Rhabdomyoma: commonest in children, tuberous sclerosis, spider cells','c-pu'),
 t('🩺','Stethoscope','Bell: low pitch (S3, S4, tumour plop, MS, TS). Diaphragm: high pitch. Listen APTM: aortic, pulmonic, tricuspid, mitral; Erb’s point at left sternal border')]}]),
C('murmurs','Valvular murmurs','Heart sounds','Diastolic = ARMS. Aortic stenosis radiates to carotids.',[
 {t:'tiles',show:1,items:[t('📈','Aortic stenosis','Crescendo-decrescendo ejection systolic, radiates to carotids, paradoxical split, Gallavardin phenomenon (holosystolic high-pitched, radiates to apex)','c-rd'),
 t('🖱️','MVP','Mid-systolic click then late systolic murmur'),
 t('💨','MR / TR','Holosystolic blowing. MR radiates to axilla; TR heard at tricuspid area. Early systolic murmur: acute MR'),
 t('🧱','VSD','Holosystolic, harsh, loudest at tricuspid area'),
 t('📉','Aortic regurgitation','Early diastolic decrescendo, high-pitched blowing. Austin Flint: mid-diastolic murmur in AR','c-bl'),
 t('🚪','Mitral stenosis','Opening snap, mid-to-late diastolic rumble with presystolic accentuation (lost in AF), best with bell. Shorter S2–OS gap = more severe. Severe: MVA under 1.5 cm², AF, PAH. Rx mitral valve replacement','c-am'),
 t('⚙️','PDA','Continuous machinery murmur'),
 t('📝','Eponyms','Still: benign flow murmur in children · Carvallo: TR louder on inspiration · Graham Steell: early diastolic in PAH · Carey Coombs: mid-diastolic in acute rheumatic fever')]}]),
C('cycle','Cardiac cycle and Wiggers diagram','Heart sounds','P a4 QRS 1 cx T 2dn v 3y. Coronary flow is in diastole.',[
 {t:'flow',title:'Phases',steps:[{i:'①',h:'Isovolumetric contraction'},{i:'②',h:'Rapid, then reduced ejection'},{i:'③',h:'Isovolumetric relaxation'},{i:'④',h:'Rapid filling'},{i:'⑤',h:'Reduced filling'}]},
 {t:'banner',i:'🧠',h:'P a4 QRS 1 cx T 2dn v 3y',p:'P with a wave and S4; QRS with S1; c and x; T with S2 and dicrotic notch; v; S3 and y'},
 {t:'tiles',show:1,items:[t('⏱️','Timing','Cycle = 60 ÷ heart rate = 0.8 s. Atria: systole 0.1 s, diastole 0.7 s. Ventricles: systole 0.3 s, diastole 0.5 s'),
 t('🏃','Tachycardia','Diastole (2/3 of cycle) shortens disproportionately, so coronary perfusion falls and ischaemia risk rises. Max HR = 220 − age','c-rd'),
 t('📊','Pressure curves','AS: LV above aortic pressure. AR: sudden aortic dip, large pulse pressure. MS: LA above LV pressure. MR: tall V wave'),
 t('👴','Age changes','Diastolic function falls, LA enlarges. Concentric remodelling: LV cavity smaller, wall thicker. Aorta dilates with rightward shift')]}])
]);
;
/* beta/generated/stub-cns.js */
IM.subject({"id":"cns","title":"CNS drugs","heroTitle":"CNS pharmacology master chart","blurb":"Two balancing acts: the monoamine seesaw and the electrical pedal system.","locked":true,"lockedCards":19});
;
/* js/subjects/derma.js */
/* Derma: biologics, psoriasis, NACO STI kits, syphilis, drug reactions, contact allergens. */
IM.subject({id:'derma',title:'Derma',heroTitle:'Dermatology: tap, match, recall',blurb:'Biologics tree, colour-coded STI kits, tap-to-reveal drug reactions and allergens.'});
var t=function(i,h,p,c){return{i:i,h:h,p:p,c:c}},C=IM.psm;
IM.cards('derma',[
C('biol','Skin biologics family tree','Biologics','Name the target, name the disease: IL-17, IL-23, IL-12/23, JAK, PDE4.',[
 {t:'tree',root:'Skin biologics and targeted drugs',kids:[
  {h:'Hereditary angioedema',c:'c-rd',kids:[{h:'C1 esterase inhibitor',p:'Replaces deficient C1 inhibitor: DOC',c:'c-rd'},{h:'Ecallantide, lanadelumab, berotralstat',p:'Plasma kallikrein inhibitors',c:'c-am'},{h:'Icatibant',p:'Bradykinin B2 receptor antagonist',c:'c-pk'}]},
  {h:'Atopic dermatitis (Th2: IL-4, IL-5)',c:'c-bl',kids:[{h:'Dupilumab',p:'IL-4 inhibitor',c:'c-bl'},{h:'Crisaborole',p:'PDE4 inhibitor',c:'c-tl'}]},
  {h:'Psoriasis',c:'c-gr',kids:[{h:'Apremilast',p:'PDE-4 inhibitor',c:'c-tl'},{h:'Ixekizumab, secukinumab',p:'IL-17 inhibitors',c:'c-gr'},{h:'Risankizumab, guselkumab, tildrakizumab',p:'IL-23 inhibitors',c:'c-pu'},{h:'Ustekinumab',p:'IL-12 and IL-23 inhibitor',c:'c-am'},{h:'Tofacitinib',p:'JAK 1/3 inhibitor',c:'c-rd'}]}]}],
 [['Hereditary angioedema DOC','C1 esterase inhibitor'],['IL-4 inhibitor for atopic dermatitis','Dupilumab'],['JAK 1/3 inhibitor in psoriasis','Tofacitinib'],['IL-12 and IL-23 inhibitor','Ustekinumab']]),
C('hae','Hereditary angioedema vs histamine angioedema','Biologics','HAE = bradykinin, C4 low, no wheals.',[
 {t:'cmp',a:'Hereditary angioedema',b:'Histamine angioedema',diff:false,sep:'vs',rows:[['Mediator','Bradykinin','Histamine'],['Wheals','No wheals','Wheals (urticaria)'],['Complement','C4 low','Not low'],['Treatment','C1 inhibitor, kallikrein inhibitors, icatibant','Antihistamines']]}]),
C('psor','Psoriasis: pick the treatment','Psoriasis','<10% steroids, >10% phototherapy then MTX, pustular acitretin, guttate macrolides.',[
 {t:'path',title:'Tap the presentation',opts:[
  {h:'Under 10% BSA',steps:[['Topical steroids','ok']]},
  {h:'Over 10% BSA',steps:[['Phototherapy: PUVA or NB-UVB (311 nm)'],['Then methotrexate (MTX)']]},
  {h:'Arthritis or erythrodermic',steps:[['Methotrexate']]},
  {h:'Pustular / von Zumbusch',steps:[['Acitretin'],['Avoid pregnancy for 3 years','warn']]},
  {h:'Impetigo herpetiformis',steps:[['In pregnancy: systemic steroids']]},
  {h:'Guttate (after strep URTI)',steps:[['Macrolides']]},
  {h:'Atopic dermatitis',steps:[['Steroids and calcineurin inhibitors']]}]},
 {t:'tiles',show:1,items:[t('⚠️','Worsens psoriasis','Lithium, chloroquine, β-blockers, NSAIDs, steroids; alcohol and smoking','c-rd'),t('🩹','Jarisch-Herxheimer','Treat with NSAIDs; penicillin is not contraindicated')]}],
 [['Pustular psoriasis treatment','Acitretin'],['Guttate psoriasis treatment','Macrolides'],['Psoriasis over 10% BSA','Phototherapy, then MTX'],['Acitretin: avoid pregnancy for','3 years']]),
C('sti','STI kits (NACO colour code)','STI kits','Grey 1 discharge, green 2 vaginal, white 3 ulcer, blue 4 allergic, red 5 herpes, yellow 6 pelvic pain, black 7 bubo.',[
 {t:'pills',items:[
  {i:'1️⃣',c:'c-gy',h:'Kit 1 · Grey',d:'Azithromycin 1 g + cefixime 400 mg stat',p:'Urethral discharge, cervical discharge, painful scrotal swelling. Partners: all recent (cervical: when symptomatic)'},
  {i:'2️⃣',c:'c-gr',h:'Kit 2 · Green',d:'Secnidazole 2 g + fluconazole 150 mg stat',p:'Vaginal discharge. Partner: when symptomatic'},
  {i:'3️⃣',c:'c-wh',h:'Kit 3 · White',d:'Benzathine penicillin 2.4 MU IM + azithromycin 1 g',p:'Non-herpetic genital ulcer. Partners: all in past 3 months'},
  {i:'4️⃣',c:'c-bl',h:'Kit 4 · Blue',d:'Doxycycline 100 mg BD × 15 days + azithromycin 1 g',p:'Non-herpetic ulcer, penicillin allergic. Partners: past 3 months'},
  {i:'5️⃣',c:'c-rd',h:'Kit 5 · Red',d:'Acyclovir 400 mg TDS × 7 days',p:'Herpetic genital ulcer. No partner treatment'},
  {i:'6️⃣',c:'c-am',h:'Kit 6 · Yellow',d:'Cefixime 400 mg stat + metronidazole 400 mg BD × 14 d + doxycycline 100 mg BD × 14 d',p:'Lower abdominal pain. Male partners get Kit 1'},
  {i:'7️⃣',c:'c-bk',h:'Kit 7 · Black',d:'Doxycycline 100 mg BD × 21 days',p:'Inguinal bubo. Partners: past 3 weeks'},
  {i:'🟤',c:'c-br',h:'Brown kit',d:'Cefixime 800 mg stat + doxycycline 100 mg × 7 days',p:'Anorectal discharge'}]},
 {t:'tiles',show:1,items:[t('🔬','Pearls','Chlamydia is more common than gonorrhoea; investigation of choice is NAAT')]}]),
C('syph','Syphilis and Jarisch-Herxheimer','Syphilis','Early: one dose. Late: three weekly doses. Neuro: aqueous penicillin.',[
 {t:'path',title:'Tap the stage',opts:[
  {h:'1°, 2°, early latent',steps:[['Benzathine penicillin 2.4 MU IM, single dose','ok']]},
  {h:'Late latent, 3°',steps:[['Benzathine penicillin 2.4 MU IM, 3 weekly doses']]},
  {h:'Neurosyphilis',steps:[['Aqueous (procaine) penicillin'],['Can cause Hoigne syndrome (psychosis)','warn']]},
  {h:'Pregnant + penicillin allergy',steps:[['Desensitize to penicillin']]},
  {h:'Jarisch-Herxheimer',steps:[['Treat with NSAIDs'],['Penicillin is not contraindicated','ok']]}]}],
 [['Late latent syphilis','Benzathine penicillin 2.4 MU weekly × 3'],['Neurosyphilis drug','Aqueous penicillin'],['Hoigne syndrome','Psychosis after procaine penicillin']]),
C('rxn','Drug skin reactions: tap to reveal','Drug reactions','Read the reaction, guess the drug, tap to check.',[
 {t:'tiles',min:150,nr:0,items:[t('🔴','Red man syndrome','Vancomycin','c-rd'),t('🍼','Grey baby syndrome','Chloramphenicol','c-gy'),t('🟡','Pseudo-jaundice','Rifabutin, β-carotene','c-am'),t('🖐️','Skin and nail pigmentation (ART)','Zidovudine','c-br'),t('🦶','Palm and sole pigmentation','Emtricitabine','c-br'),t('🧤','Hand-foot syndrome','5-FU, oral capecitabine','c-pk'),t('🟣','Purple toe syndrome','Warfarin','c-pu'),t('🧤','Pseudolymphoma / purple glove syndrome','Phenytoin','c-pu'),t('💧','Vesicular eruptions','Barbiturates','c-bl'),t('🐟','Ichthyosis, copper discolouration','Clofazimine','c-am'),t('⚡','Flagellate pigmentation','Bleomycin','c-bk'),t('🔵','Ceruloderma','Amiodarone','c-bl'),t('📍','Fixed drug eruption (type 4, hyperpigmentation)','NSAIDs, metronidazole','c-tl'),t('🔥','SJS (under 10% BSA) / TEN (over 30% BSA), graded by SCORTEN','Antiepileptics, allopurinol, NSAIDs, sulfa drugs','c-rd'),t('🌸','Morbilliform rash','Penicillin in infectious mononucleosis','c-pk')]}]),
C('allergen','Contact allergens: tap to reveal','Contact allergens','Nickel jewellery, chromium cement, PTBP bindi, PPD hair dye.',[
 {t:'tiles',items:[t('💍','Nickel (most common)','Artificial jewellery','c-gy'),t('🧱','Chromium','Cement','c-am'),t('🔴','PTBP','Bindi','c-rd'),t('💇','PPD','Hair dyes','c-bk'),t('🧴','Neomycin','Topical ointments','c-gr'),t('🧤','MBEH (monobenzyl ether of hydroquinone)','Contact leucoderma, as seen with rubber','c-pu')]}])
]);
;
/* beta/generated/stub-fmt.js */
IM.subject({"id":"fmt","title":"FMT","heroTitle":"Forensic Medicine: sections and tests","blurb":"Toxicology pages added. Tap a section number to reveal it; compare live birth with stillbirth and declaration with deposition.","locked":true,"lockedCards":16});
;
/* js/questions/imnci.js */
/* Curated knowledge questions for IMNCI. Triage scenarios are in js/subjects/imnci.js. */
(function(){
var I='imnci';
IM.questions(I,'psbi',[
 ['Which axillary temperatures are red signs in a young infant?','37.5°C or above, or below 35.5°C',['38°C or above, or below 36°C','37°C or above, or below 35°C','38.5°C or above, or below 36.5°C']],
 ['A red umbilicus or pus draining from it in a young infant is classified as:','Local bacterial infection (yellow)',['Possible serious bacterial infection (red)','Pneumonia (yellow)','Infection unlikely (green)']]
]);
IM.questions(I,'jaundice',[
 ['Jaundice in the first 24 hours of life is classified as:','Severe jaundice (red)',['Jaundice (yellow)','No jaundice (green)']]
]);
IM.questions(I,'diarrI',[
 ['Severe dehydration in a young infant needs any 2 of:','Movement only on stimulation, sunken eyes, very slow skin pinch',['Restless, sunken eyes, thirsty','Lethargic, drinks poorly, sunken eyes','Irritable, slow skin pinch, thirsty']]
]);
IM.questions(I,'feed',[
 ['A young infant weighing below which value in the first week is red?','1800 g',['2000 g','2500 g','1500 g']]
]);
IM.questions(I,'danger',[
 ['Which of these is a general danger sign?','Vomits everything',['Fever','Cough','Diarrhoea']],
 ['How many general danger signs are needed to classify as red?','Any one',['Any two','Any three','All four']]
]);
IM.questions(I,'cough',[
 ['Fast breathing at 2 to 12 months is:','50/min or more',['40/min or more','60/min or more','30/min or more']],
 ['Fast breathing at 12 months to 5 years is:','40/min or more',['50/min or more','30/min or more','60/min or more']],
 ['An SpO₂ below which value is a red sign in cough or difficult breathing?','90%',['94%','85%','92%']]
]);
IM.questions(I,'diarrC',[
 ['Persistent diarrhoea means diarrhoea lasting at least:','14 days',['7 days','10 days','21 days']],
 ['Blood in the stool (dysentery) is treated with:','Cefixime for 5 days plus zinc',['Zinc only','ORS only','Amoxicillin for 3 days']]
]);
IM.questions(I,'fever',[
 ['Fever with a stiff neck is classified as:','Very severe febrile disease (red)',['Malaria (yellow)','Malaria unlikely (green)','Dengue fever (yellow)']]
]);
IM.questions(I,'dengue',[
 ['Which is a warning sign of severe dengue?','Cold extremities',['Rash','Cough','Sore throat']],
 ['Dengue fever (yellow) means continuous fever for:','2 to 7 days',['1 day','10 days','More than 14 days']]
]);
IM.questions(I,'measles',[
 ['Which treatment do all measles cases receive?','Vitamin A',['Zinc','Iron','Cefixime']],
 ['Corneal clouding in measles is classified as:','Severe complicated measles (red)',['Measles with eye or mouth complications (yellow)','Measles (green)','Pneumonia (yellow)']]
]);
IM.questions(I,'ear',[
 ['Ear discharge for 14 days or more is:','Chronic ear infection',['Acute ear infection','Mastoiditis','No ear infection']],
 ['A tender swelling behind the ear is:','Mastoiditis (red)',['Acute ear infection (yellow)','Chronic ear infection (yellow)','No ear infection (green)']]
]);
IM.questions(I,'mal',[
 ['A MUAC below which value defines SAM?','11.5 cm',['12.5 cm','10 cm','13 cm']],
 ['A MUAC of 11.5 to 12.4 cm without oedema is:','MAM',['SAM','Normal','SAM with complications']]
]);
IM.questions(I,'anaemia',[
 ['An Hb below which value is severe anaemia?','7 g/dL',['11 g/dL','5 g/dL','9 g/dL']],
 ['An Hb of 7 to 10.9 g/dL is classified as:','Anaemia (yellow)',['Severe anaemia (red)','No anaemia (green)']]
]);
})();
;
/* js/ui.js */
/* Cards tab: rendering of cards and the recall modes (reveal, choose, type). */
(function(){
var IM=window.IM, esc=IM.esc;
var LV={red:'RED',yellow:'YELLOW',green:'GREEN'};
IM.LV=LV;

/* ---------- helpers shared with study.js ---------- */
IM.rowKey=function(card,i){return card.subject+':'+card.id+'#'+i};
IM.weak=function(){return IM.store.get('weak',{})};
IM.markWeak=function(key,on){var w=IM.weak();if(on)w[key]=1;else delete w[key];IM.store.set('weak',w)};

/* Which rows of a table are true like-for-like alternatives of each other?
   A pool is one of: (1) short numeric answers (scores, cut-offs), (2) short code keys such as A, B, C or I, IIA, IIB,
   (3) keys of the form "Type A", "Stage IIB", "Grade 2". Rows outside a pool never become auto questions or options. */
IM.rowPools=function(c){
  if(c._pools)return c._pools;
  var map={},gs=[],cur={name:'',idx:[]},rows=c.rows;
  rows.forEach(function(r,i){if(r[0]==='#'){if(cur.idx.length)gs.push(cur);cur={name:r[1],idx:[]}}else cur.idx.push(i)});
  if(cur.idx.length)gs.push(cur);
  gs.forEach(function(g){
    var used={};
    function avail(){return g.idx.filter(function(i){return !used[i]})}
    function take(list){if(list.length>=4)list.forEach(function(i){used[i]=1;map[i]={g:g.name,pool:list}})}
    take(avail().filter(function(i){var a=rows[i][1];return a.length<=14&&/\d/.test(a)}));
    take(avail().filter(function(i){return rows[i][0].length<=5&&/[A-Za-z]/.test(rows[i][0])&&rows[i][1].length>=6&&rows[i][1].length<=90}));
    var by={};
    avail().forEach(function(i){
      var m=/^([A-Za-z]{3,}) [A-Za-z0-9.\-]+(\s*\(.*\))?$/.exec(rows[i][0]);
      if(m&&rows[i][1].length>=3&&rows[i][1].length<=90)(by[m[1]]=by[m[1]]||[]).push(i);
    });
    Object.keys(by).forEach(function(w){take(by[w])});
  });
  c._pools=map;return map;
};

/* Wrong answers for a row: like-for-like pool first, then the rest of the same group, then the rest of the card,
   then other cards in the same section. Closest in length comes first within a tier. */
IM.distractors=function(subj,card,ans,n,idx){
  var seen={},tiers=[[],[],[],[]];seen[IM.norm(ans)]=1;
  var lo=0,hi=card.rows.length-1,a,b,info=idx!=null?IM.rowPools(card)[idx]:null,inPool={};
  if(info)info.pool.forEach(function(i){inPool[i]=1});
  if(idx!=null){
    for(a=idx;a>=0;a--){if(card.rows[a][0]==='#'){lo=a+1;break}}
    for(b=idx+1;b<card.rows.length;b++){if(card.rows[b][0]==='#'){hi=b-1;break}}
  }
  function add(t,v){var k=IM.norm(v);if(v&&!seen[k]&&v.length<=Math.max(120,ans.length*2)){seen[k]=1;tiers[t].push(v)}}
  card.rows.forEach(function(r,i){if(r[0]!=='#'&&i!==idx)add(inPool[i]?0:(i>=lo&&i<=hi?1:2),r[1])});
  subj.cards.forEach(function(c){if(c!==card&&c.kind==='facts'&&c.section===card.section)c.rows.forEach(function(r){if(r[0]!=='#')add(3,r[1])})});
  var out=[];
  tiers.forEach(function(t){
    if(out.length>=n)return;
    t.sort(function(x,y){return Math.abs(x.length-ans.length)-Math.abs(y.length-ans.length)});
    var take=IM.shuffle(t.slice(0,Math.max(n*2,4)));
    out=out.concat(take.slice(0,n-out.length));
  });
  return out;
};
IM.norm=function(s){return String(s).toLowerCase().replace(/\bpoints?\b/g,'').replace(/[^a-z0-9<>≥≤.%µ]+/g,' ').trim()};
IM.looseMatch=function(typed,ans){
  var t=IM.norm(typed),a=IM.norm(ans);if(!t)return false;if(t===a)return true;
  var at=a.split(' ').filter(Boolean),tt={};t.split(' ').forEach(function(w){tt[w]=1});
  if(at.length<2)return false;
  var hit=at.filter(function(w){return tt[w]}).length;return hit/at.length>=0.6;
};

/* ---------- card markup ---------- */
function bandHTML(b){
  var h='';
  if(b.g)h+='<div class="grp">'+esc(b.g)+'</div>';
  h+='<div class="band '+b.l+'"><button class="band-head" type="button" aria-expanded="true"><span class="lvl">'+LV[b.l]+'</span><span><span class="cls">'+esc(b.c)+(b.r?'<span class="rule">'+esc(b.r)+'</span>':'')+'</span>'+(b.a?'<span class="act">'+esc(b.a)+'</span>':'')+'</span></button>'+
   '<p class="tap">Tap to reveal the signs</p><ul class="finds">'+b.i.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>';
  return h;
}
function factsHTML(c){
  var h='<div class="twrap"><table class="facts"><tbody>';
  c.rows.forEach(function(r,i){
    if(r[0]==='#')h+='<tr class="grow"><th colspan="2">'+esc(r[1])+'</th></tr>';
    else h+='<tr data-r="'+i+'"><th scope="row">'+esc(r[0])+'</th><td class="v"><span class="ans">'+esc(r[1])+'</span><div class="rc"></div></td></tr>';
  });
  return h+'</tbody></table></div>';
}
function head(c,idx){return '<div class="card-head"><span class="num">'+(c.n||idx+1)+'</span><div class="ttl"><h3>'+esc(c.title)+'</h3><span class="chip">'+esc(c.section||'')+'</span></div></div>'}
function cardHTML(c,idx){
  var h='<article class="card'+(c.kind==='tiles'||c.viz?' wide':'')+'" id="c-'+c.id+'" data-id="'+c.id+'">'+head(c,idx);
  if(c.pre)h+='<p class="pre">'+esc(c.pre)+'</p>';
  if(c.hook)h+='<p class="hook"><b>Remember</b>'+esc(c.hook)+'</p>';
  if(c.kind==='bands')h+=c.bands.map(bandHTML).join('');
  else if(c.kind==='facts'){if(c.viz)h+=IM.vizHTML(c.viz)+'<details class="tbl"><summary>Facts table (use Reveal, Choose or Type above to test yourself)</summary>'+factsHTML(c)+'</details>';else h+=factsHTML(c)}
  else if(c.kind==='tiles'){
    h+='<div class="danger-banner">'+esc(c.banner)+' <small>'+esc(c.bannerNote||'')+'</small></div><div class="danger-grid">'+
      c.tiles.map(function(t){return '<div class="tile">'+(t.icon||'')+'<span>'+esc(t.t)+'</span></div>'}).join('')+'</div>';
  }
  if(c.note)h+='<p class="foot">'+esc(c.note)+'</p>';
  if(c.foot)h+='<p class="foot">'+esc(c.foot)+'</p>';
  if(c.kind==='facts'&&IM.listenHTML)h+=IM.listenHTML();
  return h+'<button class="learn" type="button" data-learn="'+c.id+'">Mark as learned</button></article>';
}

/* ---------- render ---------- */
IM.ui={q:'',sec:'all',mode:IM.store.get('mode','off')};
IM.renderCards=function(){
  var subj=IM.cur(), host=document.getElementById('cards');
  var secs=[];subj.cards.forEach(function(c){if(secs.indexOf(c.section)<0)secs.push(c.section)});
  // section chips
  var chips='<button class="chipbtn" data-sec="all" aria-pressed="'+(IM.ui.sec==='all')+'">All</button>'+
    secs.map(function(s,i){return '<button class="chipbtn" data-sec="'+i+'" aria-pressed="'+(IM.ui.sec===String(i))+'">'+esc(s)+'</button>'}).join('');
  document.getElementById('secchips').innerHTML=secs.length>1?chips:'';
  var q=IM.ui.q.toLowerCase(),html='',any=false,Lh=IM.store.get('learned',{});
  secs.forEach(function(s,si){
    if(IM.ui.sec!=='all'&&IM.ui.sec!==String(si))return;
    var list=subj.cards.filter(function(c){
      if(c.section!==s)return false;
      if(IM.ui.hideDone&&Lh[IM.curId+':'+c.id])return false;
      if(!q)return true;
      var blob=(c.title+' '+(c.hook||'')+' '+(c.rows||[]).join(' ')+' '+(c.bands||[]).map(function(b){return b.c+' '+b.i.join(' ')}).join(' ')).toLowerCase();
      return blob.indexOf(q)>=0;
    });
    if(!list.length)return;any=true;
    var wide=list.filter(function(c){return c.kind==='tiles'||c.viz}),rest=list.filter(function(c){return c.kind!=='tiles'&&!c.viz});
    html+='<div class="group"><div class="group-h"><h2>'+esc(s)+'</h2><span>'+list.length+(list.length===1?' card':' cards')+'</span></div>'+
      wide.map(function(c){return cardHTML(c,subj.cards.indexOf(c))}).join('')+
      '<div class="cols">'+rest.map(function(c){return cardHTML(c,subj.cards.indexOf(c))}).join('')+'</div></div>';
  });
  host.innerHTML=any?html:'<p class="empty">'+(IM.ui.hideDone&&!q?'Every card here is marked as learned. Nice work.':'No cards match that search.')+'</p>';
  IM.syncLearned();IM.arm();
};

/* ---------- learned ---------- */
IM.syncLearned=function(){
  var subj=IM.cur(),L=IM.store.get('learned',{}),n=0;
  $$('.card').forEach(function(c){
    var on=!!L[subj.id+':'+c.dataset.id];c.classList.toggle('done',on);
    var b=c.querySelector('.learn');if(b){b.textContent=on?'Learned':'Mark as learned';b.setAttribute('aria-pressed',on)}
  });
  subj.cards.forEach(function(c){if(L[subj.id+':'+c.id])n++});
  document.getElementById('segs').innerHTML=subj.cards.map(function(c){return '<i class="'+(L[subj.id+':'+c.id]?'on':'')+'"></i>'}).join('');
  document.getElementById('progtxt').textContent=n+' of '+subj.cards.length+' cards learned';
};
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

/* ---------- recall modes ---------- */
IM.setMode=function(m){
  IM.ui.mode=m;IM.store.set('mode',m);
  var b=document.body;b.classList.remove('mode-off','mode-reveal','mode-choose','mode-type','recall');
  b.classList.add('mode-'+m);if(m!=='off')b.classList.add('recall');
  $$('#modes [data-mode]').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.mode===m)});
  var hints={off:'',reveal:'Reveal: the details are blurred. Say the answer, then tap to check.',choose:'Choose: pick the right detail from the options. Wrong picks fade out.',type:'Type: write the answer, then press Check. Close wording counts.'};
  var h=document.getElementById('hint');h.textContent=hints[m];h.hidden=!hints[m];
  IM.arm();
};

/* Prepare every hidden cell for the current mode. */
IM.arm=function(){
  var m=IM.ui.mode,subj=IM.cur();
  $$('details.tbl').forEach(function(d){d.open=m!=='off'});
  $$('.band').forEach(function(b){b.classList.remove('open');var h=b.querySelector('.band-head');if(h)h.setAttribute('aria-expanded',m==='off'?'true':'false')});
  $$('.secret').forEach(function(s){s.classList.remove('shown')});
  $$('.card').forEach(function(cEl){
    var card=subj.cards.filter(function(c){return c.id===cEl.dataset.id})[0];
    if(!card||card.kind!=='facts')return;
    $$('tr[data-r]',cEl).forEach(function(tr){
      var td=tr.querySelector('.v'),rc=td.querySelector('.rc'),ans=td.querySelector('.ans');
      td.classList.remove('solved','ok','bad','missed');rc.innerHTML='';ans.classList.remove('shown');
      ans.classList.toggle('secret',m==='reveal');if(m==='reveal')ans.setAttribute('tabindex','0');else ans.removeAttribute('tabindex');
      if(m==='choose'){
        var i=+tr.dataset.r,a=card.rows[i][1];
        var o=IM.distractors(subj,card,a,3,i);o.push(a);IM.shuffle(o);
        rc.innerHTML=o.map(function(t){return '<button type="button" class="opt" data-opt="'+esc(t)+'">'+esc(t)+'</button>'}).join('')+'<button type="button" class="skip" data-skip="1">Show</button>';
      }else if(m==='type'){
        rc.innerHTML='<div class="typebox"><input type="text" class="typein" aria-label="Your answer" placeholder="Your answer" autocomplete="off"><button type="button" class="chk" data-check="1">Check</button><button type="button" class="skip" data-skip="1">Show</button></div>';
      }
    });
  });
};

function solve(td,ok,key){
  td.classList.add('solved');td.classList.add(ok?'ok':'bad');
  if(key)IM.markWeak(key,!ok);
  if(IM.stats)IM.stats.rec(ok);
}
function rowInfo(el){
  var tr=el.closest('tr'),cEl=el.closest('.card');
  var card=IM.cur().cards.filter(function(c){return c.id===cEl.dataset.id})[0];
  return {td:tr.querySelector('.v'),tr:tr,card:card,i:+tr.dataset.r};
}
document.addEventListener('click',function(e){
  var t=e.target,o=t.closest('.opt');
  if(o){var r=rowInfo(o),ans=r.card.rows[r.i][1];
    if(r.td.classList.contains('solved'))return;
    if(o.dataset.opt===ans){solve(r.td,!r.td.classList.contains('missed'),IM.rowKey(r.card,r.i))}
    else{o.disabled=true;o.classList.add('wrongopt');r.td.classList.add('missed');IM.markWeak(IM.rowKey(r.card,r.i),true)}
    return;}
  var k=t.closest('[data-skip]');
  if(k){var r2=rowInfo(k);if(!r2.td.classList.contains('solved'))solve(r2.td,false,IM.rowKey(r2.card,r2.i));return}
  var c=t.closest('[data-check]');
  if(c){var r3=rowInfo(c),val=r3.td.querySelector('.typein').value;
    if(!val.trim()){r3.td.querySelector('.typein').focus();return}
    solve(r3.td,IM.looseMatch(val,r3.card.rows[r3.i][1]),IM.rowKey(r3.card,r3.i));return}
});
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('typein')){
    e.preventDefault();var b=e.target.closest('.typebox').querySelector('[data-check]');b.click();
  }
});
})();
;
/* js/study.js */
/* Study tabs: flashcards, quiz, numbers and cheat sheet. */
(function(){
var IM=window.IM, esc=IM.esc, LV=IM.LV;
function $(s,r){return (r||document).querySelector(s)}

/* ================= Flashcards ================= */
var F={deck:[],i:0,flip:false,known:0,total:0,scope:'all',weak:false,last:-1};
function buildDeck(){
  var subj=IM.cur(),W=IM.weak(),deck=[];
  subj.cards.forEach(function(c){
    if(F.scope!=='all'&&c.id!==F.scope)return;
    if(c.kind==='facts'){
      var ctx='';
      c.rows.forEach(function(r,i){
        if(r[0]==='#'){ctx=r[1];return}
        var k=IM.rowKey(c,i);if(F.weak&&!W[k])return;
        deck.push({k:k,title:c.title,ctx:ctx,front:r[0],back:r[1]});
      });
    }else if(c.kind==='bands'){
      c.bands.forEach(function(b,bi){
        var k=subj.id+':'+c.id+'@'+bi;if(F.weak&&!W[k])return;
        deck.push({k:k,title:c.title,ctx:b.g||'',front:'What gives '+LV[b.l]+': '+b.c+'?',back:b.i.join(' · ')+(b.a?'  →  '+b.a:'')});
      });
    }
  });
  F.deck=IM.shuffle(deck);F.i=0;F.flip=false;F.known=0;F.total=deck.length;F.last=-1;
}
IM.renderFlash=function(){
  var subj=IM.cur(),host=$('#flash'),W=IM.weak(),nweak=Object.keys(W).filter(function(k){return k.indexOf(subj.id+':')===0}).length;
  var sel='<option value="all">Whole subject</option>'+subj.cards.filter(function(c){return c.kind!=='tiles'}).map(function(c){return '<option value="'+c.id+'"'+(F.scope===c.id?' selected':'')+'>'+esc(c.title)+'</option>'}).join('');
  var top='<div class="study-bar"><label>Deck <select id="fscope">'+sel+'</select></label><label class="chk"><input type="checkbox" id="fweak"'+(F.weak?' checked':'')+'> Weak spots only ('+nweak+')</label></div>';
  if(!F.deck.length&&F.total===0&&!F.started){buildDeck();F.started=true}
  if(!F.total){host.innerHTML=top+'<p class="empty">'+(F.weak?'No weak spots yet. Answer in Choose or Type mode, or take a quiz, and misses show up here.':'Nothing to show for this deck.')+'</p>';return}
  if(F.i>=F.deck.length){
    host.innerHTML=top+'<div class="scen res"><div class="who">Deck finished</div><div class="big">'+F.known+'/'+F.total+'</div><p>Known on first or later pass. Cards you missed are now in your weak spots.</p><button class="btn" type="button" data-fres="1">Shuffle and go again</button></div>';return;
  }
  var c=F.deck[F.i],enter=F.last!==F.i;F.last=F.i;
  host.innerHTML=top+'<div class="dstat"><span>Card '+(F.i+1)+' of '+F.deck.length+'</span><span>Known '+F.known+'</span></div>'+
   '<div class="dbar"><i style="width:'+(F.i/F.deck.length*100)+'%"></i></div>'+
   '<button type="button" class="fc'+(enter?' enter':'')+(F.flip?' flipped':'')+'" data-flip="1"><small>'+esc(c.title)+(c.ctx?' · '+esc(c.ctx):'')+'</small><strong>'+esc(c.front)+'</strong>'+
   (F.flip?'<span class="fc-back">'+esc(c.back)+'</span>':'<em>Tap to see the answer</em>')+'</button>'+
   (F.flip?'<div class="fc-actions"><button type="button" class="btn again" data-fgrade="again">Again <kbd>←</kbd></button><button type="button" class="btn got" data-fgrade="got">Got it <kbd>→</kbd></button></div>':'')+
   '<p class="kbhint">Space flips the card. ← Again, → Got it. On a phone, tap to flip, then swipe left for Again or right for Got it.</p>';
};

/* ================= Quiz ================= */
var Q={items:[],i:0,score:0,streak:0,best:0,picked:null,missed:[],src:'all',len:10,scope:'subject',retry:false};
function rawPool(){
  var P=[],subs=Q.scope==='all'?IM.order.map(function(id){return IM.subjects[id]}):[IM.cur()];
  subs.forEach(function(subj){
  subj.cards.forEach(function(c){
    (c.qs||[]).forEach(function(q){P.push({t:'curated',q:q.q,opts:q.opts,a:q.a,why:q.why,card:c.title})});
    /* Auto questions only for rows that belong to a like-for-like pool; options come only from that pool. */
    if(c.kind==='facts'&&!c.noauto){
      var pools=IM.rowPools(c);
      Object.keys(pools).forEach(function(k){var info=pools[k];P.push({t:'auto',c:c,g:{name:info.g},ok:info.pool,i:+k,card:c.title})});
    }
  });
  (subj.scenarios||[]).forEach(function(s){P.push({t:'scenario',q:s[0]+'. '+s[1],opts:['RED','YELLOW','GREEN'],a:['red','yellow','green'].indexOf(s[2]),why:s[3],card:s[4],tri:true})});
  });
  return P;
}
function expand(p){
  if(p.t==='curated'){
    var correct=p.opts[p.a],o=IM.shuffle(p.opts.slice());
    return {t:'curated',q:p.q,opts:o,a:o.indexOf(correct),why:p.why,card:p.card};
  }
  if(p.t!=='auto')return p;
  var rows=p.c.rows,ans=rows[p.i][1],seen={},pool=[];
  seen[IM.norm(ans)]=1;
  p.ok.forEach(function(j){
    var v=rows[j][1],n=IM.norm(v);
    if(j!==p.i&&!seen[n]){seen[n]=1;pool.push({v:v,s:Math.abs(v.length-ans.length)})}
  });
  if(pool.length<3)return null;
  pool.sort(function(x,y){return x.s-y.s});
  var d=IM.shuffle(pool.slice(0,5)).slice(0,3).map(function(x){return x.v});
  var o2=IM.shuffle(d.concat([ans]));
  return {t:'auto',q:(p.g.name?'In \u201c'+p.g.name+'\u201d, which':'Which')+' is correct for \u201c'+rows[p.i][0]+'\u201d?',opts:o2,a:o2.indexOf(ans),why:'Answer: '+ans,card:p.c.title,k:IM.rowKey(p.c,p.i)};
}
/* Pick up to n items, at most 2 per card on the first pass so a round covers different topics. */
function spread(list,n){
  var out=[],cnt={};
  list.forEach(function(p){var k=p.card;if(out.length<n&&(cnt[k]||0)<2){cnt[k]=(cnt[k]||0)+1;out.push(p)}});
  list.forEach(function(p){if(out.length<n&&out.indexOf(p)<0)out.push(p)});
  return out;
}
function startQuiz(){
  var W=IM.weak(),P=rawPool(),exam,auto,pool;
  exam=P.filter(function(p){return p.t==='curated'||p.t==='scenario'});
  auto=P.filter(function(p){return p.t==='auto'});
  if(Q.src==='all')pool=IM.shuffle(exam).concat(IM.shuffle(auto));
  else if(Q.src==='weak')pool=IM.shuffle(auto.filter(function(p){return W[IM.rowKey(p.c,p.i)]}));
  else pool=IM.shuffle(P.filter(function(p){return p.t===Q.src}));
  var items=[];
  spread(pool,Math.max(60,Q.len*4)).some(function(p){var e=expand(p);if(e)items.push(e);return items.length>=Q.len});
  Q.items=items;Q.retry=false;Q.i=0;Q.score=0;Q.streak=0;Q.best=0;Q.picked=null;Q.missed=[];Q.started=true;Q.t0=Date.now();Q.celebrated=false;
}
IM.renderQuiz=function(){
  var subj=IM.cur(),host=$('#quiz'),has={slides:false,scenario:!!subj.scenarios};
  subj.cards.forEach(function(c){if(c.qs&&c.qs.length)has.slides=true});
  var W=IM.weak(),nweak=Object.keys(W).filter(function(k){return k.indexOf(subj.id+':')===0}).length;
  var opts=[['all','Mixed (exam-style first)']];
  if(has.slides)opts.push(['curated','Exam-style questions only']);
  if(has.scenario)opts.push(['scenario','Triage scenarios']);
  opts.push(['auto','Table drills (options from the same table)']);
  opts.push(['weak','Weak spots ('+nweak+')']);
  if(!opts.some(function(o){return o[0]===Q.src}))Q.src='all';
  var bar='<div class="study-bar"><label>Questions from <select id="qsrc">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(Q.src===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label>'+
   '<label>Scope <select id="qscope"><option value="subject"'+(Q.scope==='subject'?' selected':'')+'>This subject</option><option value="all"'+(Q.scope==='all'?' selected':'')+'>All subjects mixed</option></select></label>'+
   '<label>Length <select id="qlen">'+[10,20,30,50].map(function(n){return '<option value="'+n+'"'+(Q.len===n?' selected':'')+'>'+n+' questions</option>'}).join('')+'</select></label></div>';
  if(!Q.started)startQuiz();
  if(!Q.items.length){host.innerHTML=bar+'<p class="empty">'+(Q.src==='weak'?'No weak spots yet for this subject.':'No questions available here.')+'</p>';return}
  if(Q.i>=Q.items.length){
    var msg=Q.score>=Q.items.length*0.9?'Excellent.':Q.score>=Q.items.length*0.7?'Solid. Review the misses below.':'Keep going. Revisit the cards for the misses below.';
    host.innerHTML=bar+'<div class="scen res"><div class="who">Round complete</div><div class="big">'+Q.score+'/'+Q.items.length+'</div><p>'+msg+' Best streak: '+Q.best+'.</p>'+
     (Q.missed.length?'<ul class="miss">'+Q.missed.map(function(s){return '<li><b>'+esc(s.card)+'</b>: '+esc(s.q)+'<br>Answer: <b>'+esc(s.opts[s.a])+'</b>. '+esc(s.why)+'</li>'}).join('')+'</ul>':'')+
     '<div class="resbtns"><button class="btn" type="button" data-qrestart="1">New round</button>'+(Q.missed.length&&!Q.retry?'<button class="btn alt" type="button" data-qretry="1">Retry the '+Q.missed.length+' missed</button>':'')+'</div></div>';
    if(Q.score>=Q.items.length*0.9&&Q.items.length>=5&&!Q.celebrated){Q.celebrated=true;IM.confetti&&IM.confetti()}
    return;
  }
  var s=Q.items[Q.i],p=Q.picked;
  var h=bar+'<div class="dstat"><span>Question '+(Q.i+1)+' of '+Q.items.length+'</span><span>Score '+Q.score+'</span><span>Streak '+Q.streak+(Q.streak>=3?' 🔥':'')+'</span></div><div class="dbar"><i style="width:'+(Q.i/Q.items.length*100)+'%"></i></div>'+
   '<div class="scen"><div class="who">'+esc(s.card)+'</div><p>'+esc(s.q)+'</p><div class="'+(s.tri?'picks':'choices')+'">'+
   s.opts.map(function(o,j){
     var cl=s.tri?'pick '+['red','yellow','green'][j]:'choice';
     if(p!==null){if(j===s.a)cl+=' right';else if(j===p)cl+=' wrong'}
     return '<button class="'+cl+'" type="button" data-qpick="'+j+'"'+(p!==null?' disabled':'')+'>'+esc(o)+'</button>';
   }).join('')+'</div>';
  if(p!==null){var ok=p===s.a;h+='<div class="fb '+(ok?'ok':'no')+'"><b>'+(ok?'Correct':'Not quite')+'</b>'+esc(s.why)+'</div><button class="btn" type="button" data-qnext="1">'+(Q.i+1===Q.items.length?'See result':'Next')+'</button>'}
  host.innerHTML=h+'<p class="kbhint">Keys: 1–4 or A–D to answer, Enter for next.</p></div>';
};

/* ================= Numbers and cheat sheet (IMNCI) ================= */
IM.renderNumbers=function(){
  var subj=IM.cur(),h='';
  (subj.numbers||[]).forEach(function(g){
    h+='<div class="nsec"><h2>'+esc(g.g)+'</h2><div class="ngrid">'+g.items.map(function(it){
      return '<div class="ncell"><span class="lab">'+esc(it[0])+'</span><span class="val secret" tabindex="0">'+esc(it[1])+'<small>'+esc(it[2])+'</small></span>'+(g.bar?'<div class="bar"><i style="width:'+(it[3]/g.bar*100)+'%"></i></div>':'')+'</div>';
    }).join('')+'</div></div>';
  });
  $('#numbers').innerHTML=h+(subj.numbersExtra||'');
};
IM.renderCheat=function(){
  var subj=IM.cur(),rows=subj.cheat||[];
  $('#cheat').innerHTML='<thead><tr><th class="c">Condition</th><th class="r">RED</th><th class="y">YELLOW</th><th class="g">GREEN</th></tr></thead><tbody>'+
   rows.map(function(r){return '<tr><td class="c">'+esc(r[0])+'</td>'+[1,2,3].map(function(i){var cls=['','r','y','g'][i];return r[i]==='–'?'<td class="n">–</td>':'<td class="'+cls+'"><span class="secret" tabindex="0">'+esc(r[i])+'</span></td>'}).join('')+'</tr>'}).join('')+'</tbody>';
};

/* ================= events ================= */
document.addEventListener('click',function(e){
  var t=e.target;
  if(t.closest('[data-flip]')){F.flip=true;IM.renderFlash();return}
  var g=t.closest('[data-fgrade]');
  if(g){
    var c=F.deck[F.i];
    if(g.dataset.fgrade==='again'){IM.markWeak(c.k,true);F.deck.push(c);IM.stats&&IM.stats.rec(false)}
    else{F.known++;IM.markWeak(c.k,false);IM.stats&&IM.stats.rec(true)}
    F.i++;F.flip=false;IM.renderFlash();return;
  }
  if(t.closest('[data-fres]')){buildDeck();IM.renderFlash();return}
  var p=t.closest('[data-qpick]');
  if(p&&Q.picked===null){
    var s=Q.items[Q.i],j=+p.dataset.qpick;Q.picked=j;
    if(j===s.a){Q.score++;Q.streak++;if(Q.streak>Q.best)Q.best=Q.streak;if(s.k)IM.markWeak(s.k,false)}
    else{Q.streak=0;Q.missed.push(s);if(s.k)IM.markWeak(s.k,true)}
    IM.stats&&IM.stats.rec(j===s.a);
    IM.renderQuiz();return;
  }
  if(t.closest('[data-qnext]')){Q.i++;Q.picked=null;IM.renderQuiz();window.scrollTo({top:0});return}
  if(t.closest('[data-qrestart]')){startQuiz();IM.renderQuiz();return}
  if(t.closest('[data-qretry]')){var m=IM.shuffle(Q.missed.slice());Q.items=m;Q.i=0;Q.score=0;Q.streak=0;Q.best=0;Q.picked=null;Q.missed=[];Q.retry=true;Q.celebrated=false;IM.renderQuiz();window.scrollTo({top:0});return}
});
document.addEventListener('change',function(e){
  if(e.target.id==='fscope'){F.scope=e.target.value;buildDeck();IM.renderFlash()}
  else if(e.target.id==='fweak'){F.weak=e.target.checked;buildDeck();IM.renderFlash()}
  else if(e.target.id==='qsrc'){Q.src=e.target.value;startQuiz();IM.renderQuiz()}
  else if(e.target.id==='qscope'){Q.scope=e.target.value;Q.src='all';startQuiz();IM.renderQuiz()}
  else if(e.target.id==='qlen'){Q.len=+e.target.value;startQuiz();IM.renderQuiz()}
});
/* called when the subject changes */
IM.resetStudy=function(){F={deck:[],i:0,flip:false,known:0,total:0,scope:'all',weak:false,started:false,last:-1};Q.started=false;Q.src='all';Q.scope='subject'};
/* Mixed quiz across every subject (used by the dashboard). */
IM.quizAll=function(){IM.openStudy(IM.curId,'quiz');Q.scope='all';Q.src='all';startQuiz();IM.renderQuiz()};

/* ---- keyboard: flashcards and quiz ---- */
document.addEventListener('keydown',function(e){
  if(IM.view!=='study'||e.ctrlKey||e.metaKey||e.altKey)return;
  var tg=e.target,tn=tg&&tg.tagName;if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT')return;
  var k=e.key,btn;
  if(IM.tab==='quiz'){
    var m=/^[1-4]$/.test(k)?+k-1:/^[a-dA-D]$/.test(k)?k.toLowerCase().charCodeAt(0)-97:-1;
    if(m>=0&&Q.picked===null&&Q.items[Q.i]&&m<Q.items[Q.i].opts.length){btn=document.querySelector('[data-qpick="'+m+'"]');if(btn){e.preventDefault();btn.click()}}
    else if((k==='Enter'||k===' '||k==='ArrowRight')&&Q.picked!==null){btn=document.querySelector('[data-qnext]');if(btn){e.preventDefault();btn.click()}}
    else if((k==='Enter')&&Q.i>=Q.items.length&&Q.items.length){btn=document.querySelector('[data-qrestart]');if(btn)btn.click()}
  }else if(IM.tab==='flash'){
    if(k===' '||k==='Enter'){btn=document.querySelector('[data-flip]');if(btn&&!F.flip){e.preventDefault();btn.click()}}
    else if(k==='ArrowLeft'&&F.flip){btn=document.querySelector('[data-fgrade="again"]');if(btn)btn.click()}
    else if(k==='ArrowRight'&&F.flip){btn=document.querySelector('[data-fgrade="got"]');if(btn)btn.click()}
  }
});
/* ---- swipe on flashcards ---- */
(function(){
  var x0=null,y0=0,swiped=false;
  document.addEventListener('pointerdown',function(e){var f=e.target.closest&&e.target.closest('.fc');if(f&&e.pointerType!=='mouse'){x0=e.clientX;y0=e.clientY}else x0=null});
  document.addEventListener('pointerup',function(e){
    if(x0===null)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;
    swiped=true;setTimeout(function(){swiped=false},400);
    var b=document.querySelector(F.flip?(dx>0?'[data-fgrade="got"]':'[data-fgrade="again"]'):'[data-flip]');if(b)b.click();
  });
  document.addEventListener('click',function(e){if(swiped&&e.target.closest('.fc')){e.stopPropagation();e.preventDefault()}},true);
})();
})();
;
/* js/app.js */
/* App shell: subject switcher, tabs, search, and the small shared interactions. */
(function(){
var IM=window.IM,esc=IM.esc;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

IM.curId=IM.store.get('subject',null);
IM.cur=function(){return IM.subjects[IM.curId]};
IM.tab='cards';

function renderSubjects(){
  $('#subjects').innerHTML=IM.order.map(function(id){
    var s=IM.subjects[id];
    return '<button type="button" class="subj" data-subject="'+id+'" aria-pressed="'+(id===IM.curId)+'">'+esc(s.title)+'<span>'+s.cards.length+'</span></button>';
  }).join('');
}
function renderHero(){
  var s=IM.cur();
  $('#hero-title').textContent=s.heroTitle||(s.id==='imnci'?'IMNCI Master Chart':s.title+': scores and classifications');
  $('#hero-blurb').textContent=s.blurb||'';
  $('#legend').hidden=!s.legend;
  $('#hero-in').classList.toggle('nolegend',!s.legend);
  document.title=(s.heroTitle?s.heroTitle:s.id==='imnci'?'IMNCI Master Chart':s.title+' Scores')+' | Recall Buddy';
}
function renderTabs(){
  var s=IM.cur(),tabs=[['cards','Cards'],['flash','Flashcards'],['quiz','Quiz']];
  if(s.numbers)tabs.push(['numbers','Numbers']);
  if(s.cheat)tabs.push(['cheat','Cheat sheet']);
  if(!tabs.some(function(t){return t[0]===IM.tab}))IM.tab='cards';
  $('#tablist').innerHTML=tabs.map(function(t){return '<button class="tab" role="tab" data-tab="'+t[0]+'" aria-selected="'+(t[0]===IM.tab)+'">'+t[1]+'</button>'}).join('');
}
function showTab(){
  $$('.panel').forEach(function(p){p.hidden=p.id!=='p-'+IM.tab});
  $('#toolbar').hidden=IM.tab!=='cards';
  $('#modebar').hidden=!(IM.tab==='cards'||IM.tab==='numbers'||IM.tab==='cheat');
  if(IM.tab==='cards')IM.renderCards();
  else if(IM.tab==='flash')IM.renderFlash();
  else if(IM.tab==='quiz')IM.renderQuiz();
  else if(IM.tab==='numbers')IM.renderNumbers();
  else if(IM.tab==='cheat')IM.renderCheat();
  if(IM.tab==='numbers'||IM.tab==='cheat')$$('.secret').forEach(function(x){x.classList.remove('shown')});
}
function setSubject(id){
  IM.curId=id;IM.store.set('subject',id);IM.ui.q='';IM.ui.sec='all';$('#search').value='';
  IM.resetStudy();renderSubjects();renderHero();renderTabs();showTab();IM.syncLearned();
}

IM.setSubject=setSubject;
/* open a subject on a given tab (used by the dashboard and search) */
IM.openStudy=function(sid,tab){
  if(!sid||!IM.subjects[sid])sid=IM.order[0];
  if(sid!==IM.curId)setSubject(sid);
  IM.tab=tab||'cards';renderTabs();showTab();
  if(IM.setView)IM.setView('study');
};
/* jump to one card, from search */
IM.goCard=function(sid,cid){
  IM.openStudy(sid,'cards');
  var el=document.getElementById('c-'+cid);
  if(!el){IM.ui.q='';IM.ui.sec='all';$('#search').value='';IM.renderCards();el=document.getElementById('c-'+cid)}
  if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('flash');setTimeout(function(){el.classList.remove('flash')},1800)}
};
document.addEventListener('click',function(e){
  var t=e.target,x;
  if((x=t.closest('[data-subject]'))){setSubject(x.dataset.subject);return}
  if((x=t.closest('[data-tab]'))){IM.tab=x.dataset.tab;renderTabs();showTab();return}
  if((x=t.closest('[data-sec]'))){IM.ui.sec=x.dataset.sec;IM.renderCards();return}
  if((x=t.closest('[data-mode]'))){IM.setMode(x.dataset.mode);if(IM.tab!=='cards')$$('.secret').forEach(function(s){s.classList.remove('shown')});return}
  if((x=t.closest('[data-learn]'))){
    var L=IM.store.get('learned',{}),k=IM.curId+':'+x.dataset.learn;
    if(L[k])delete L[k];else L[k]=1;IM.store.set('learned',L);IM.syncLearned();return;
  }
  if((x=t.closest('.band-head'))&&document.body.classList.contains('recall')){
    var b=x.parentNode,o=b.classList.toggle('open');x.setAttribute('aria-expanded',o?'true':'false');return;
  }
  if((x=t.closest('.secret'))&&document.body.classList.contains('recall')){x.classList.toggle('shown');return}
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('secret')){e.preventDefault();e.target.click()}
});
$('#search').addEventListener('input',function(){IM.ui.q=this.value.trim();IM.renderCards()});

/* boot */
['psm','micro','cvs','cns','derma','fmt','obg'].forEach(IM.psmFinish);
if(!IM.curId||!IM.subjects[IM.curId])IM.curId=IM.order[0];
renderSubjects();renderHero();renderTabs();IM.setMode(IM.ui.mode);showTab();
})();
;
/* js/stats.js */
/* Study stats: answers per day, correct per day, day streak, daily goal. Stored in the browser only. */
(function(){
var IM=window.IM;
function key(d){d=d||new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
var S=IM.stats={
  key:key,
  all:function(){return IM.store.get('stats',{})},
  rec:function(ok){var a=S.all(),k=key(),d=a[k]||(a[k]={a:0,c:0});d.a++;if(ok)d.c++;
    /* keep roughly the last year */
    var ks=Object.keys(a).sort();while(ks.length>400)delete a[ks.shift()];
    IM.store.set('stats',a);
    var before=d.a-1,g=S.goal();if(before<g&&d.a>=g&&IM.toast)IM.toast('🎯 Daily goal reached: '+g+' answers. Nice.');
  },
  today:function(){return S.all()[key()]||{a:0,c:0}},
  goal:function(){return IM.store.get('goal',20)},
  setGoal:function(n){IM.store.set('goal',Math.max(5,Math.min(200,n)))},
  /* consecutive days with at least one answer, ending today (or yesterday if nothing yet today) */
  streak:function(){var a=S.all(),d=new Date(),n=0;if(!(a[key(d)]&&a[key(d)].a))d.setDate(d.getDate()-1);
    while(a[key(d)]&&a[key(d)].a){n++;d.setDate(d.getDate()-1)}return n},
  last:function(n){var a=S.all(),out=[],d=new Date();d.setDate(d.getDate()-(n-1));
    for(var i=0;i<n;i++){var k=key(d);out.push({k:k,day:d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3),a:(a[k]||{}).a||0,c:(a[k]||{}).c||0});d.setDate(d.getDate()+1)}return out},
  total:function(){var a=S.all(),t=0,c=0;Object.keys(a).forEach(function(k){t+=a[k].a;c+=a[k].c});return {a:t,c:c}}
};

/* tiny toast + confetti used across the app */
IM.toast=function(msg){
  var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('on');clearTimeout(IM._tt);IM._tt=setTimeout(function(){t.classList.remove('on')},3200);
};
IM.confetti=function(){
  var host=document.createElement('div');host.className='confetti';host.setAttribute('aria-hidden','true');
  var cols=['#F2B01E','#2A8F55','#C8362B','#2F6FED','#7048E8','#D6336C'];
  for(var i=0;i<46;i++){var s=document.createElement('i');s.style.left=(Math.random()*100)+'%';s.style.background=cols[i%cols.length];
    s.style.animationDelay=(Math.random()*.5)+'s';s.style.animationDuration=(1.6+Math.random()*1.4)+'s';s.style.transform='rotate('+(Math.random()*360)+'deg)';host.appendChild(s)}
  document.body.appendChild(host);setTimeout(function(){host.remove()},3600);
};
})();
;
/* js/qbank/qbank.js */
/* Q Bank: exam-style multiple-choice questions, organised by subject and topic.
   Add questions in js/qbank/<subject>.js with:
     IM.qb.add('OBG', 'Topic name', [
       [ 'Question stem?', 'Correct option', 'Wrong 1', 'Wrong 2', 'Wrong 3', 'Explanation text' ],
     ]);
   (the three wrong options may also be given as one array)
   The correct option is written FIRST; options are shuffled each time a question is shown.
   Every question in the bank is also available to the Grand Test (see gt.js). */
(function(){
var IM=window.IM;
var list=[],seen={};
function nz(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
IM.qb={
  list:list,
  add:function(subj,topic,qs,tags){tags=tags||['PYT'];
    qs.forEach(function(l){
      var q=l[0],c=l[1],w,why;if(Array.isArray(l[2])){w=l[2];why=l[3]}else{w=[l[2],l[3],l[4]];why=l[5]}
      var u={};[c].concat(w).forEach(function(o){u[nz(o)]=1});
      if(!q||w.length!==3||Object.keys(u).length!==4){if(window.console)console.warn('Q bank: skipped',q);return}
      var k=nz(q);if(seen[k]){if(window.console)console.warn('Q bank: duplicate stem',q);return}seen[k]=1;
      list.push({id:list.length,q:q,c:c,w:w,why:why||'',subj:subj,topic:topic,tags:tags});
    });
  },
  subjects:function(){var o={},a=[];list.forEach(function(x){if(!o[x.subj]){o[x.subj]={name:x.subj,n:0,topics:{}};a.push(o[x.subj])}o[x.subj].n++;o[x.subj].topics[x.topic]=(o[x.subj].topics[x.topic]||0)+1});return a},
  /* shuffled 4-option copy of a bank question, in the Grand Test question shape */
  /* Previous-year questions with optional picture and exam label (developer file: js/qbank/pyq.js) */
  pyq:function(items){
    items.forEach(function(it){
      var u={};[it.c].concat(it.w||[]).forEach(function(o){u[nz(o)]=1});
      if(!it.q||!it.s||!it.w||it.w.length!==3||Object.keys(u).length!==4){if(window.console)console.warn('PYQ: skipped',it.q);return}
      var k=nz(it.q);if(seen[k]){if(window.console)console.warn('PYQ: duplicate stem',it.q);return}seen[k]=1;
      list.push({id:list.length,q:it.q,c:it.c,w:it.w,why:it.sol||'',subj:it.s,topic:it.t||'General',tags:['PYQ'].concat(it.exam?[it.exam]:[]),exam:it.exam||'',img:it.img||null});
    });
  },
  shaped:function(x){var o=IM.shuffle([x.c].concat(x.w));return {q:x.q,opts:o,a:o.indexOf(x.c),why:x.why||('Correct answer: '+x.c+'.'),subj:x.subj,kind:'qbank',topic:x.topic,tags:x.tags||[],img:x.img||null}}
};
/* Picture under a question stem. The image is shown exactly as supplied; the credit line is kept. */
IM.fig=function(img){if(!img||!img.src)return '';var e=IM.esc;
  return '<figure class="q-fig"><a href="'+e(img.src)+'" target="_blank" rel="noopener" class="q-fig-img" title="Open full size"><img src="'+e(img.src)+'" alt="'+e(img.alt||'Question image')+'" loading="lazy"></a>'+
   (img.credit?'<figcaption>'+(img.link?'<a href="'+e(img.link)+'" target="_blank" rel="noopener">'+e(img.credit)+'</a>':e(img.credit))+'</figcaption>':'')+'</figure>'};
/* Solution text → HTML. Blank line = paragraph, "• " = bullet, short line ending in ":" = sub-heading. */
IM.sol=function(t){var e=IM.esc,out=[],ul=null;
  String(t||'').split('\n').forEach(function(line){var l=line.trim();
    if(/^[•\-] /.test(l)){if(!ul){ul=[];}ul.push('<li>'+e(l.slice(2))+'</li>');return}
    if(ul){out.push('<ul>'+ul.join('')+'</ul>');ul=null}
    if(!l)return;
    if(/^Answer:/.test(l)){out.push('<p class="sol-ans">'+e(l)+'</p>');return}
    if(l.length<60&&/:$/.test(l)){out.push('<h4>'+e(l.slice(0,-1))+'</h4>');return}
    out.push('<p>'+e(l)+'</p>')});
  if(ul)out.push('<ul>'+ul.join('')+'</ul>');return '<div class="sol">'+out.join('')+'</div>'};
/* Bookmarks and missed questions, stored in this browser as full copies so any test can use them */
function key(q){return nz(q)}
function obj(o){return {q:o.q,opts:o.opts.slice(),a:o.a,why:o.why||'',subj:o.subj||'General',topic:o.topic||'',tags:(o.tags||[]).slice(),img:o.img||null}}
IM.bm={
  all:function(){return IM.store.get('bm',{})},
  has:function(q){return !!IM.bm.all()[key(q)]},
  toggle:function(o){var b=IM.bm.all(),k=key(o.q),on;if(b[k]){delete b[k];on=false}else{b[k]=obj(o);on=true}IM.store.set('bm',b);return on},
  list:function(){var b=IM.bm.all();return Object.keys(b).map(function(k){return b[k]})}
};
IM.missed={
  all:function(){return IM.store.get('gt-missed',{})},
  mark:function(o,ok){var b=IM.missed.all(),k=key(o.q);if(ok){if(!b[k])return;delete b[k]}else{b[k]=obj(o)}
    var ks=Object.keys(b);while(ks.length>400)delete b[ks.shift()];IM.store.set('gt-missed',b)},
  list:function(){var b=IM.missed.all();return Object.keys(b).map(function(k){return b[k]})}
};
IM.qbKey=key;
})();
;
/* js/qbank/videos.js */
/* generated by build.py from videos/videos.csv: YouTube solution links, matched on the question text */
IM.videoMap={};
IM.vid=function(q){var u=IM.videoMap[IM.qbKey(q)];if(!u)return "";return '<p class="vid-wrap"><a class="vid-link" href="'+IM.esc(u)+'" target="_blank" rel="noopener noreferrer"><i>&#9654;</i>Watch solution on YouTube</a></p>'};
;
/* beta/generated/beta-qbank.js */
/* BETA sample (generated by tools/make_beta.js). The locked questions are NOT in this build. */
IM.qb.add("OBG","Anatomy and physiology of pregnancy",[["Which is the correct order of arteries supplying the endometrium, starting from the uterine artery?","Uterine, arcuate, radial, basal (straight) and spiral arteries",["Uterine, radial, arcuate, basal and spiral arteries","Uterine, basal, arcuate, radial and spiral arteries","Uterine, arcuate, basal, radial and spiral arteries"],"The uterine artery gives arcuate branches, which give radial arteries; these divide into basal arteries (supplying the basalis) and spiral arteries (supplying the functionalis)."]],["PYT"]);
IM.qb.add("OBG","Antenatal care and fetal medicine",[["A woman has Rh-negative blood, an Rh-positive husband and no antibodies at 28 weeks. What is the standard management?","Anti-D immunoglobulin 300 micrograms IM at 28 weeks and again within 72 hours of delivery of an Rh-positive baby",["Anti-D only if the indirect Coombs test turns positive","Give anti-D at 36 weeks only","No treatment is needed until delivery"],"Anti-D prophylaxis at 28 weeks and within 72 hours after delivery of an Rh-positive baby prevents sensitisation. It is useless once she is already sensitised."]],["PYT"]);
IM.qb.add("OBG","Contraception and labour",[["The copper IUD Cu T 380A is effective for how many years?","10 years",["3 years","5 years","15 years"],"Cu T 380A has a licensed lifespan of 10 years. Cu T 375 and Cu T 200 last 5 and 3 to 4 years respectively."]],["PYT"]);
IM.qb.add("OBG","Early pregnancy and ectopic",[["A 26-year-old woman with 3 months of amenorrhoea presents with lower abdominal pain, vaginal spotting and BP 90/60 mmHg. Which statement about ectopic pregnancy is correct?","Abdominal pain is the commonest symptom and previous pelvic infection is a major risk factor",["Methotrexate is the treatment of choice even when the patient is in shock","One low progesterone level is enough to diagnose ectopic pregnancy","Pelvic infection does not change the risk of ectopic pregnancy"],"Pain is present in the large majority of symptomatic women and tubal damage from infection raises the risk. A low progesterone only suggests a non-viable pregnancy. Shock or rupture needs urgent surgery, not methotrexate."]],["PYT"]);
IM.qb.add("OBG","Gynaecological oncology and menopause",[["Which vaccine is given by the national programme for the prevention of cervical cancer in girls aged 9 to 14 years?","HPV vaccine",["Hepatitis B vaccine","Rubella vaccine","Tdap"],"HPV types 16 and 18 cause about 70 percent of cervical cancer; WHO advises 1-2 doses before sexual debut."]],["PYT"]);
IM.qb.add("OBG","Gynaecology",[["Primary amenorrhoea is investigated if menses have not started by what age (with normal secondary sexual characteristics)?","15 years",["12 years","18 years","20 years"],"Or by 13 years with no secondary sexual characteristics."]],["PYT"]);
IM.qb.add("OBG","Gynaecology, endocrine and infertility",[["Which of the following is required for the diagnosis of PCOS by the Rotterdam criteria?","Any two of: oligo-anovulation, clinical or biochemical hyperandrogenism, polycystic ovarian morphology",["Obesity","Insulin resistance","Raised prolactin"],"Rotterdam: two of three. Obesity, insulin resistance and acanthosis are associated but not part of the criteria. Exclusion of other causes (thyroid, prolactin, CAH) is required."]],["PYT"]);
IM.qb.add("OBG","Hypertension, eclampsia and diabetes",[["A pregnant woman on magnesium sulphate for eclampsia develops respiratory rate of 10 per minute. What is the correct action?","Stop magnesium and give 10 mL of 10 percent calcium gluconate IV slowly",["Continue magnesium and watch","Give naloxone","Give more oxytocin"],"Magnesium toxicity causes loss of patellar reflexes first, then respiratory depression. The antidote is calcium gluconate 1 g (10 mL of 10 percent) IV over about 10 minutes. Check reflexes, respiratory rate and urine output before each dose."]],["PYT"]);
IM.qb.add("PSM","Biostatistics",[["In a normal distribution, what percentage of observations lie within the mean plus or minus 2 standard deviations?","About 95 percent",["About 68 percent","About 99.7 percent","About 50 percent"],"The empirical rule: 68 percent within 1 SD, 95 percent within 2 SD (1.96 SD) and 99.7 percent within 3 SD."]],["PYT"]);
IM.qb.add("PSM","Biostatistics and Research",[["Which sampling method divides the population into homogeneous groups and samples from each?","Stratified random sampling",["Simple random sampling","Cluster sampling","Convenience sampling"],"Stratification improves precision when subgroups differ."]],["PYT"]);
IM.qb.add("PSM","Communicable Disease Control",[["The most important control measure for cholera in an outbreak is which?","Safe water and sanitation with case treatment",["Mass chemoprophylaxis of the whole population","Mass vaccination alone","Closing borders"],"Rehydration saves lives; safe water, sanitation and hygiene stop spread. Oral cholera vaccine is a supplementary tool."]],["PYT"]);
IM.qb.add("PSM","Communicable Diseases",[["The infectious period of chickenpox lasts until when?","Until all lesions are crusted",["Until the fever ends","For 3 weeks after the rash","Only during the prodrome"],"Infectiousness runs from about 2 days before the rash until all lesions crust (about 5 to 6 days after onset)."]],["PYT"]);
IM.qb.add("PSM","Concepts of Health and Prevention",[["Which level of prevention aims to stop risk factors from developing in the first place?","Primordial prevention",["Primary prevention","Secondary prevention","Tertiary prevention"],"Primordial prevention targets whole populations, for example healthy lifestyles in children to stop obesity and hypertension from emerging."]],["PYT"]);
IM.qb.add("PSM","Environment and Occupational Health",[["The residual chlorine required in drinking water after 1 hour of contact is what?","0.5 mg/L",["5 mg/L","0.05 mg/L","2 mg/L"],"Free chlorine of 0.5 mg/L after an hour's contact ensures disinfection."]],["PYT"]);
IM.qb.add("PSM","Epidemiology",[["Incidence measures what?","New cases occurring in a population over a period",["All existing cases at a point in time","Deaths due to a disease","Cases among contacts only"],"Incidence = new cases ÷ population at risk over a period. Prevalence counts all existing cases."]],["PYT"]);
IM.qb.add("PSM","Epidemiology and screening",[["A screening test has high sensitivity. What does a negative result on this test reliably do?","Rules out the disease (few false negatives)",["Confirms the disease","Gives the same predictive value in every population","Measures the incidence"],"A highly sensitive test misses few true cases, so a negative result is useful to exclude disease (SnNout). A highly specific test is better to confirm (SpPin)."]],["PYT"]);
IM.qb.add("Surgery","Abdomen, HPB and bariatric",[["A 20-year-old woman has migrating pain to the right iliac fossa, nausea, tenderness, rebound, temperature, and a total leucocyte count of 15,000. Using the Alvarado (MANTRELS) score, what is her score?","8 (migration 1, nausea 1, tenderness 2, rebound 1, fever 1, leucocytosis 2)",["4","6","10"],"MANTRELS: Migration 1, Anorexia 1, Nausea 1, Tenderness in RIF 2, Rebound 1, Elevated temperature 1, Leucocytosis 2, Shift to left 1. Maximum 10; a score of 7 or more suggests appendicitis."]],["PYT"]);
IM.qb.add("Surgery","Breast, Thyroid and Endocrine",[["The triple assessment of a breast lump includes which three components?","Clinical examination, imaging and needle biopsy",["History, ultrasound and CT","Mammography, MRI and PET","Examination, tumour markers and X-ray"],"Core needle biopsy is preferred to FNAC."]],["PYT"]);
IM.qb.add("Surgery","Endocrine, breast and oncology",[["A 40-year-old with a 2 x 3 cm papillary thyroid cancer, no lymph node enlargement and a history of neck irradiation. What is the treatment?","Total thyroidectomy",["Hemithyroidectomy","Hemithyroidectomy with neck dissection","Observation"],"A history of radiation exposure is a risk feature that favours total thyroidectomy. Hemithyroidectomy is used for low-risk tumours under 4 cm without extrathyroidal spread, nodes or radiation history."]],["PYT"]);
IM.qb.add("Surgery","Gastrointestinal Surgery",[["Which sign is elicited by pain in the right iliac fossa when pressing the left iliac fossa?","Rovsing sign",["Psoas sign","Obturator sign","Murphy sign"],"Rovsing sign suggests appendicitis. Psoas sign suggests a retrocaecal appendix; obturator sign a pelvic one."]],["PYT"]);
IM.qb.add("Surgery","Hepatobiliary and Pancreas",[["Ranson criteria and the modified Glasgow score assess which condition?","Severity of acute pancreatitis",["Liver cirrhosis","Head injury","Burns"],"Other tools include BISAP and APACHE II; CRP over 150 mg/L at 48 hours also predicts severity."]],["PYT"]);
IM.qb.add("Surgery","Lasers, nutrition and stress response",[["Which laser is preferred for fragmentation of urinary calculi during ureteroscopy?","Holmium:YAG",["Argon","Excimer","Carbon dioxide"],"The holmium:YAG laser (2100 nm) is strongly absorbed by water and stone, making it the standard for lithotripsy, and it is also used for BPH enucleation and urethral strictures."]],["PYT"]);
IM.qb.add("Surgery","Mixed Practice",[["Which is the commonest type of thyroid cancer?","Papillary carcinoma",["Follicular carcinoma","Medullary carcinoma","Anaplastic carcinoma"],"It has an excellent prognosis and spreads to lymph nodes."]],["PYT"]);
IM.qb.add("Surgery","Trauma and Critical Care",[["In the primary survey of a trauma patient, what is assessed first?","Airway with cervical spine protection",["Breathing","Circulation","Disability"],"ATLS order: A (airway with C-spine), B, C (with haemorrhage control), D (neurological status), E (exposure)."]],["PYT"]);
IM.qb.add("Microbiology","Bacteriology",[["Which medium is used for the isolation of Corynebacterium diphtheriae, giving black colonies?","Potassium tellurite agar",["MacConkey agar","Lowenstein-Jensen medium","Thayer-Martin medium"],"Tellurite is reduced to metallic tellurium inside the bacteria, giving grey-black colonies. Loeffler serum slope shows metachromatic granules."]],["PYT"]);
IM.qb.add("Microbiology","Bacteriology and toxins",[["Which toxins act by ADP-ribosylation of elongation factor-2?","Diphtheria toxin and Pseudomonas exotoxin A",["Cholera toxin and pertussis toxin","Shiga toxin and Shiga-like toxin","Tetanus and botulinum toxins"],"EF-2 is inactivated by diphtheria toxin and Pseudomonas exotoxin A, stopping protein synthesis. Cholera toxin ADP-ribosylates Gs; pertussis toxin ADP-ribosylates Gi."]],["PYT"]);
IM.qb.add("Microbiology","Clinical bacteriology",[["Which organism causes scarlet fever?","Streptococcus pyogenes producing erythrogenic (pyrogenic) toxin",["Staphylococcus aureus","Corynebacterium diphtheriae","Measles virus"],"Sandpaper rash, strawberry tongue, circumoral pallor, Pastia lines; treat with penicillin."]],["PYT"]);
IM.qb.add("Microbiology","General Microbiology",[["Which structure gives Gram-negative bacteria their endotoxin activity?","Lipid A of lipopolysaccharide",["Teichoic acid","Peptidoglycan","Capsule"],"Lipid A triggers fever and septic shock through TLR4 on macrophages."]],["PYT"]);
IM.qb.add("Microbiology","General bacteriology",[["Which component makes the Gram-positive cell wall retain crystal violet?","A thick peptidoglycan layer",["An outer membrane with LPS","Mycolic acid","Absence of a cell wall"],"Gram-negative bacteria have a thin peptidoglycan layer and an outer membrane; alcohol decolourises them."]],["PYT"]);
IM.qb.add("Microbiology","Immunology",[["Which immunoglobulin crosses the placenta?","IgG",["IgM","IgA","IgE"],"Maternal IgG protects the newborn for the first months."]],["PYT"]);
IM.qb.add("Microbiology","Immunology, virology and mycology",[["Which immunoglobulin crosses the placenta and gives passive immunity to the newborn?","IgG",["IgM","IgA","IgE"],"IgG is actively transported across the placenta by FcRn. IgM is the first antibody produced in a primary response."]],["PYT"]);
IM.qb.add("Microbiology","Mixed Practice",[["Which organism is the most common cause of urinary tract infection?","Escherichia coli",["Proteus mirabilis","Staphylococcus saprophyticus","Klebsiella"],"Uropathogenic E. coli has P fimbriae that attach to urothelium."]],["PYT"]);
IM.qb.add("Anatomy","Abdomen and Pelvis",[["The deep inguinal ring is an opening in which layer?","Transversalis fascia",["External oblique aponeurosis","Internal oblique muscle","Transversus abdominis aponeurosis"],"The deep ring lies just above the midpoint of the inguinal ligament, lateral to the inferior epigastric vessels."]],["PYT"]);
IM.qb.add("Anatomy","Back, Joints and General Anatomy",[["Which ligament limits hyperflexion of the vertebral column and connects the laminae?","Ligamentum flavum",["Anterior longitudinal ligament","Supraspinous ligament","Posterior longitudinal ligament"],"The ligamentum flavum is elastic and is pierced (felt as a 'give') during epidural injection."]],["PYT"]);
IM.qb.add("Anatomy","Embryology and Histology",[["Which pharyngeal arch gives rise to the muscles of facial expression?","Second arch",["First arch","Third arch","Fourth arch"],"The second arch (facial nerve) gives facial muscles, stapes, styloid process and stylohyoid. The first arch gives muscles of mastication."]],["PYT"]);
IM.qb.add("Anatomy","Embryology, thorax and head and neck",[["What is the postnatal remnant of the distal part of the umbilical artery?","Medial umbilical ligament",["Superior vesical artery","Ligamentum teres","Ligamentum arteriosum"],"The proximal part of the umbilical artery persists as the superior vesical artery; the distal part obliterates into the medial umbilical ligament."]],["PYT"]);
IM.qb.add("Anatomy","Head and Neck",[["Which muscle is the only abductor of the vocal cords?","Posterior cricoarytenoid",["Lateral cricoarytenoid","Cricothyroid","Thyroarytenoid"],"Bilateral recurrent laryngeal nerve injury paralyses it and can cause airway obstruction."]],["PYT"]);
IM.qb.add("Anatomy","Head, Neck and Brain",[["Which artery is the source of bleeding in a classic extradural haematoma?","Middle meningeal artery",["Superior cerebral veins","Middle cerebral artery","Anterior communicating artery"],"A blow at the pterion tears the middle meningeal artery; a lucid interval may follow before deterioration."]],["PYT"]);
IM.qb.add("Anatomy","Limbs, pelvis and joints",[["Which muscles are supplied by the superficial peroneal nerve?","Peroneus longus and peroneus brevis",["Peroneus tertius and extensor hallucis longus","Peroneus longus and tibialis anterior","Extensor digitorum longus only"],"The lateral compartment (peroneus longus and brevis) is supplied by the superficial peroneal nerve. Peroneus tertius, EHL and EDL are in the anterior compartment, supplied by the deep peroneal nerve."]],["PYT"]);
IM.qb.add("Anatomy","Lower Limb",[["Foot drop follows injury to which nerve?","Common peroneal (fibular) nerve",["Tibial nerve","Femoral nerve","Obturator nerve"],"The common peroneal nerve winds around the neck of the fibula and is easily injured; dorsiflexion and eversion are lost."]],["PYT"]);
IM.qb.add("Medicine","Bleeding, thrombosis and platelets",[["A child has petechiae, a platelet count of 10,000/mm3 and normal marrow with increased megakaryocytes. What is the best initial step?","Intravenous immunoglobulin (IVIG)",["Aspirin","Methotrexate","Bone marrow transplant"],"This is immune thrombocytopenia. IVIG, steroids or anti-D raise the platelet count quickly in severe cases."]],["PYT"]);
IM.qb.add("Medicine","Cardiology",[["ST elevation in leads II, III and aVF indicates infarction of which wall?","Inferior wall",["Anterior wall","Lateral wall","Posterior wall"],"The inferior wall is usually supplied by the right coronary artery; check right-sided leads (V4R) for right ventricular involvement."]],["PYT"]);
IM.qb.add("Medicine","ECG and arrhythmias",[["Which pair of CHA2DS2-VASc components each score 2 points?","Age 75 years or more, and prior stroke, TIA or thromboembolism",["Hypertension, and diabetes","Congestive heart failure, and vascular disease","Female sex, and age 65-74 years"],"Age 75 or more and prior stroke, TIA or thromboembolism score 2 points each. The other components score 1 point."]],["PYT"]);
IM.qb.add("Medicine","Endocrinology",[["A woman has weight loss, palpitations, a diffuse goitre and exophthalmos. Which antibody is responsible?","TSH receptor stimulating antibody",["Anti-thyroid peroxidase antibody causing destruction","Anti-thyroglobulin antibody only","Anti-GAD antibody"],"Graves disease is caused by stimulating IgG antibodies against the TSH receptor, giving hyperthyroidism and infiltrative ophthalmopathy."]],["PYT"]);
IM.qb.add("Medicine","Gastroenterology and Hepatology",[["Child-Pugh score includes which parameters?","Bilirubin, albumin, INR, ascites and encephalopathy",["ALT, AST, ALP and GGT","Creatinine, sodium and INR","Platelets, haemoglobin and white count"],"MELD uses bilirubin, INR, creatinine and sodium and guides transplant priority."]],["PYT"]);
IM.qb.add("Medicine","Gastroenterology and hepatology",[["A 35-year-old man has chronic diarrhoea and iron-deficiency anaemia. Duodenal biopsy shows villous atrophy with raised intraepithelial lymphocytes. Which antibody is most specific for his condition?","Anti-tissue transglutaminase IgA",["Anti-Saccharomyces cerevisiae antibody","Anti-mitochondrial antibody","Anti-smooth muscle antibody"],"Villous atrophy with intraepithelial lymphocytosis suggests coeliac disease. IgA anti-tTG (and anti-endomysial) antibodies are the most specific serological tests."]],["PYT"]);
IM.qb.add("Medicine","Haematology: anaemia and iron",[["All of the following are true of anaemia of chronic disease EXCEPT:","Ferroportin is increased",["Hepcidin is increased","Ferritin is normal or raised","TIBC is decreased"],"Hepcidin degrades ferroportin, trapping iron in macrophages. Serum iron and TIBC are low, and ferritin is raised as an acute phase reactant."]],["PYT"]);
IM.qb.add("Medicine","Haemolysis and transfusion",[["A patient has haemolytic anaemia with penicillin therapy and a positive direct Coombs test. What is the mechanism?","Penicillin binds the RBC membrane and antibodies cause extravascular destruction by splenic macrophages",["Complement-mediated intravascular lysis due to direct activation","Immune complexes deposit on RBCs causing intravascular lysis","Direct oxidative damage to haemoglobin"],"Penicillin acts as a hapten. IgG-coated red cells are removed by splenic macrophages, and stopping the drug is the main treatment."]],["PYT"]);
IM.qb.add("ENT","Ear",[["Which is the commonest cause of conductive hearing loss in children?","Otitis media with effusion",["Otosclerosis","Presbycusis","Acoustic neuroma"],"Serous otitis media (glue ear) is the commonest cause of acquired hearing loss in children; it shows a type B tympanogram."]],["PYT"]);
IM.qb.add("ENT","Ear: Anatomy and Hearing Tests",[["The tympanic membrane's cone of light is seen in which quadrant of a normal right ear?","Anteroinferior",["Posterosuperior","Anterosuperior","Posteroinferior"],"It points anteroinferiorly from the umbo in both ears."]],["PYT"]);
IM.qb.add("ENT","Ear: Diseases",[["The most common organism in acute otitis media is which?","Streptococcus pneumoniae",["Pseudomonas aeruginosa","Staphylococcus aureus","Proteus"],"Haemophilus influenzae and Moraxella catarrhalis are the next most common."]],["PYT"]);
IM.qb.add("ENT","Facial Nerve and Miscellaneous",[["Bell palsy is best treated early with which drug?","Oral prednisolone",["Antibiotics","Antihistamines","Carbamazepine"],"Steroids within 72 hours improve recovery; eye protection prevents exposure keratitis."]],["PYT"]);
IM.qb.add("ENT","Larynx and Neck",[["Which part of the larynx has the poorest lymphatic drainage, so its cancers spread late?","Glottis (vocal cords)",["Supraglottis","Subglottis","Pyriform fossa"],"Glottic cancer presents early with hoarseness and has good cure rates."]],["PYT"]);
IM.qb.add("ENT","Mixed Practice",[["Which nerve carries the afferent limb of the gag reflex?","Glossopharyngeal nerve",["Vagus nerve","Hypoglossal nerve","Facial nerve"],"The efferent limb is the vagus."]],["PYT"]);
IM.qb.add("ENT","Nose and Paranasal Sinuses",[["Which is the first paranasal sinus to be present at birth and visible on X-ray?","Maxillary sinus",["Frontal sinus","Sphenoid sinus","Ethmoid sinus"],"Maxillary and ethmoid sinuses are present at birth; the maxillary sinus is first seen on X-ray around 4 to 5 months. Frontal sinuses appear last."]],["PYT"]);
IM.qb.add("ENT","Nose and sinuses",[["What is the commonest site of epistaxis?","Little area (Kiesselbach plexus) on the anterior septum",["Woodruff plexus","Middle turbinate","Sphenoid sinus"],"Treat with pressure (pinch the soft nose, lean forward), cautery and anterior packing."]],["PYT"]);
IM.qb.add("Orthopaedics","Bone Disease, Infection and Tumours",[["The most common organism in acute osteomyelitis in children is which?","Staphylococcus aureus",["Streptococcus pyogenes","Salmonella","Pseudomonas"],"Salmonella is classically linked with sickle cell disease."]],["PYT"]);
IM.qb.add("Orthopaedics","Fracture principles",[["What is the first priority in managing a patient with multiple fractures after a road accident?","Primary survey: airway with cervical spine protection, breathing, circulation (ATLS ABCDE)",["Splinting the most deformed limb","X-ray of all limbs","Giving oral analgesics"],"Life-threatening injuries are treated before limb injuries."]],["PYT"]);
IM.qb.add("Orthopaedics","Fractures and dislocations",[["Which supracondylar fracture is commonest in children, and which complication is most feared?","Extension type; brachial artery injury leading to Volkmann's ischaemic contracture",["Flexion type; radial nerve palsy","Extension type; ulnar nerve palsy only","Flexion type; avascular necrosis"],"Extension fractures from falls on the outstretched hand can injure the brachial artery and anterior interosseous nerve. Missed compartment ischaemia causes Volkmann's contracture."]],["PYT"]);
IM.qb.add("Orthopaedics","Fractures: General Principles",[["Which stage of fracture healing follows haematoma formation?","Inflammation and granulation tissue",["Remodelling","Hard callus","Lamellar bone formation"],"Stages: haematoma, inflammation, soft callus, hard callus and remodelling."]],["PYT"]);
IM.qb.add("Orthopaedics","Hand and soft tissue",[["Which test is positive in de Quervain's tenosynovitis?","Finkelstein's test",["Phalen's test","Tinel's test at the elbow","Cozen's test"],"De Quervain's involves the abductor pollicis longus and extensor pollicis brevis tendons in the first dorsal compartment."]],["PYT"]);
IM.qb.add("Orthopaedics","Infections, tumours and paediatric orthopaedics",[["What is the commonest organism in acute haematogenous osteomyelitis in children?","Staphylococcus aureus",["Streptococcus pneumoniae","E. coli","Pseudomonas"],"Salmonella is classic in sickle cell disease; Kingella kingae in young children."]],["PYT"]);
IM.qb.add("Orthopaedics","Lower Limb Trauma",[["An 80-year-old woman breaks her hip. Which fracture pattern most threatens the blood supply of the femoral head?","Displaced intracapsular (subcapital) femoral neck fracture",["Intertrochanteric fracture","Subtrochanteric fracture","Greater trochanter avulsion"],"Elderly patients usually get hemiarthroplasty or total hip replacement; young patients need urgent reduction and fixation."]],["PYT"]);
IM.qb.add("Orthopaedics","Lower limb and spine injuries",[["Which hip fracture has the highest risk of avascular necrosis?","Displaced intracapsular (subcapital) femoral neck fracture",["Intertrochanteric fracture","Subtrochanteric fracture","Greater trochanter fracture"],"Retinacular vessels are disrupted; in older patients, arthroplasty (hemi or total) is preferred; in young patients urgent reduction and fixation."]],["PYT"]);
IM.qb.add("Radiology","Abdomen, neuro and physics",[["A dilated omega-shaped loop of bowel arising from the pelvis on an abdominal X-ray (coffee bean sign) indicates:","Sigmoid volvulus",["Caecal volvulus","Small bowel obstruction","Toxic megacolon"],"A closed loop of sigmoid colon gives the coffee-bean appearance. Treatment is sigmoidoscopic decompression, then elective sigmoid resection."]],["PYT"]);
IM.qb.add("Radiology","Abdominal and Neuro Imaging",[["The first imaging test for suspected gallstones is which?","Ultrasound",["CT","MRI","Plain X-ray"],"Only about 10 to 15 percent of gallstones are visible on X-ray."]],["PYT"]);
IM.qb.add("Radiology","Abdominal imaging",[["Which imaging is first-line for suspected gallstones and acute cholecystitis?","Ultrasound",["CT","MRI","Plain X-ray"],"Ultrasound shows stones, wall thickening over 3 mm, pericholecystic fluid and a sonographic Murphy sign."]],["PYT"]);
IM.qb.add("Radiology","Chest",[["Kerley B lines on chest X-ray indicate:","Interstitial pulmonary oedema (thickened interlobular septa)",["Pneumothorax","Lobar collapse","Pleural calcification"],"Kerley B lines are short horizontal lines at the lung periphery, seen in left heart failure, mitral stenosis and lymphangitis carcinomatosa."]],["PYT"]);
IM.qb.add("Radiology","Chest Imaging",[["The silhouette sign helps localise lesions by showing what?","Loss of a normal border where an opacity touches it",["A shadow behind the heart","Air in the pleural space","A calcified nodule"],"Loss of the right heart border points to the right middle lobe; loss of the left border to the lingula."]],["PYT"]);
IM.qb.add("Radiology","Chest imaging",[["Which view is the standard chest radiograph?","Posteroanterior (PA) erect in full inspiration",["Anteroposterior supine","Lateral decubitus","Lordotic"],"PA view minimises heart magnification; AP views (portable) exaggerate heart size."]],["PYT"]);
IM.qb.add("Radiology","Mixed Practice",[["The imaging of choice to diagnose an aortic dissection in a stable patient is which?","CT angiography",["Plain chest X-ray","Ultrasound of abdomen","Barium swallow"],"Transoesophageal echo is used in unstable patients."]],["PYT"]);
IM.qb.add("Radiology","Musculoskeletal and paediatric",[["What is the earliest imaging sign of osteomyelitis?","Changes on MRI (marrow oedema) within days; X-ray changes take 10 to 14 days",["Periosteal reaction on day 1 X-ray","Sequestrum on day 2","Bone sclerosis immediately"],"Plain films first show soft-tissue swelling, then lytic areas and periosteal reaction."]],["PYT"]);
IM.qb.add("Pharmacology","Anticancer and Immunosuppressants",[["Which anticancer drug causes haemorrhagic cystitis?","Cyclophosphamide",["Vincristine","Methotrexate","Doxorubicin"],"The metabolite acrolein irritates the bladder. Mesna and hydration prevent it."]],["PYT"]);
IM.qb.add("Pharmacology","Autacoids, Respiratory and GI Drugs",[["Low-dose aspirin prevents thrombosis by which mechanism?","Irreversible inhibition of platelet COX-1",["Reversible inhibition of COX-2","Blocking ADP receptors","Inhibiting thrombin"],"Platelets have no nucleus to make new COX, so the effect lasts the platelet life span (7 to 10 days)."]],["PYT"]);
IM.qb.add("Pharmacology","Autonomic Nervous System",[["Which drug is used to reverse the muscarinic effects of organophosphate poisoning?","Atropine",["Neostigmine","Physostigmine","Pyridostigmine"],"Atropine is given until secretions dry. Pralidoxime reactivates acetylcholinesterase if given before 'ageing'."]],["PYT"]);
IM.qb.add("Pharmacology","Autonomic and CNS drugs",[["Which drug is the treatment of choice for organophosphate poisoning after atropine?","Pralidoxime",["Neostigmine","Physostigmine","Edrophonium"],"Pralidoxime reactivates cholinesterase if given early, before ageing. Atropine blocks muscarinic effects."]],["PYT"]);
IM.qb.add("Pharmacology","CNS Drugs",[["Benzodiazepines enhance GABA-A receptor function by which action?","Increasing the frequency of chloride channel opening",["Increasing the duration of chloride channel opening","Directly opening the channel without GABA","Blocking GABA reuptake"],"Benzodiazepines raise opening frequency; barbiturates prolong opening duration and can open the channel directly at high doses."]],["PYT"]);
IM.qb.add("Pharmacology","Cardiovascular Drugs",[["Which antihypertensive commonly causes a dry cough?","Enalapril",["Losartan","Amlodipine","Hydrochlorothiazide"],"ACE inhibitors stop breakdown of bradykinin, which causes cough and sometimes angioedema. ARBs rarely cause cough."]],["PYT"]);
IM.qb.add("Pharmacology","Cardiovascular, blood and renal drugs",[["Which anticoagulant cannot be reversed by protamine sulfate?","Fondaparinux",["Unfractionated heparin","Enoxaparin","Dalteparin"],"Protamine fully neutralises UFH and partly LMWH, but not the pentasaccharide fondaparinux, which has no effect on thrombin."]],["PYT"]);
IM.qb.add("Pharmacology","Chemotherapy of Infections",[["Which antibiotic class acts by inhibiting cell wall synthesis through binding penicillin-binding proteins?","Beta-lactams",["Aminoglycosides","Macrolides","Tetracyclines"],"Penicillins, cephalosporins, carbapenems and monobactams all inhibit transpeptidation."]],["PYT"]);
IM.qb.add("Pathology","Bone, Skin and CNS Pathology",[["Which bone tumour shows a 'soap bubble' appearance in the epiphysis of a young adult?","Giant cell tumour",["Osteosarcoma","Ewing sarcoma","Osteoid osteoma"],"It occurs around the knee after growth plates close and contains many osteoclast-like giant cells."]],["PYT"]);
IM.qb.add("Pathology","Cardiovascular and Respiratory Pathology",[["The earliest visible lesion of atherosclerosis is which?","Fatty streak",["Fibrous plaque","Complicated plaque","Calcified plaque"],"Fatty streaks made of foam cells appear even in children."]],["PYT"]);
IM.qb.add("Pathology","Cell Injury and Adaptation",[["Which change is the hallmark of irreversible cell injury?","Severe mitochondrial damage and membrane rupture",["Cell swelling","Fatty change","Loss of microvilli"],"Irreversible injury shows inability to restore mitochondrial function, membrane damage and nuclear changes (pyknosis, karyorrhexis, karyolysis)."]],["PYT"]);
IM.qb.add("Pathology","GI and Hepatobiliary Pathology",[["Which gastric polyp type has the highest malignant potential?","Adenomatous polyp",["Hyperplastic polyp","Fundic gland polyp","Inflammatory polyp"],"Adenomas are true neoplasms; hyperplastic polyps are common and rarely become malignant."]],["PYT"]);
IM.qb.add("Pathology","Genetics and Paediatric Pathology",[["Marfan syndrome is caused by mutation in which gene?","Fibrillin-1",["Collagen type I","Collagen type III","Elastin"],"Fibrillin defects weaken connective tissue and increase TGF-beta signalling; aortic root dilatation and dissection are the main risks."]],["PYT"]);
IM.qb.add("Pathology","Haematology",[["Which red cell index best distinguishes microcytic from normocytic anaemia?","Mean corpuscular volume",["Red cell distribution width","Reticulocyte count","MCHC"],"MCV below 80 fL means microcytosis."]],["PYT"]);
IM.qb.add("Pathology","Haematopathology",[["Which finding is expected in a patient with iron deficiency anaemia?","Low ferritin and high TIBC",["High ferritin and low TIBC","High serum iron and low TIBC","Normal ferritin with low transferrin"],"Low iron stores give low ferritin and high TIBC, with raised RDW. In chronic disease ferritin is high and TIBC low."]],["PYT"]);
IM.qb.add("Pathology","Haemodynamics and Immunopathology",[["Virchow triad includes which three factors?","Endothelial injury, abnormal blood flow and hypercoagulability",["Hypertension, diabetes and smoking","Platelet count, fibrinogen and anaemia","Infection, trauma and age"],"These three factors predispose to thrombosis."]],["PYT"]);
IM.qb.add("Physiology","Blood",[["Which cytokine is the main regulator of red cell production?","Erythropoietin",["Thrombopoietin","Interleukin 5","G-CSF"],"Erythropoietin is made mainly by peritubular interstitial cells of the kidney in response to hypoxia, via hypoxia-inducible factor."]],["PYT"]);
IM.qb.add("Physiology","Cardiovascular",[["What is the normal pacemaker of the heart?","Sinoatrial node",["Atrioventricular node","Bundle of His","Purkinje fibres"],"The SA node has the fastest intrinsic rate (about 70 to 80 per minute at rest under vagal tone), so it sets the heart rate."]],["PYT"]);
IM.qb.add("Physiology","Central Nervous System",[["Which tract carries fine touch and proprioception from the body?","Dorsal column-medial lemniscus pathway",["Lateral spinothalamic tract","Anterior spinothalamic tract","Spinocerebellar tract"],"Dorsal column fibres ascend on the same side and cross in the medulla. The lateral spinothalamic tract carries pain and temperature and crosses near its level of entry."]],["PYT"]);
IM.qb.add("Physiology","Endocrine",[["Which anterior pituitary hormone is under predominantly inhibitory hypothalamic control?","Prolactin",["Growth hormone","ACTH","TSH"],"Dopamine from the hypothalamus inhibits prolactin, so stalk section raises prolactin while the other anterior pituitary hormones fall."]],["PYT"]);
IM.qb.add("Physiology","Endocrine and Metabolism",[["Cortisol has which effect on blood glucose?","Raises it by increasing gluconeogenesis",["Lowers it by increasing muscle uptake","Has no effect","Lowers it by increasing glycogenolysis"],"Cortisol is a counter-regulatory hormone: it increases hepatic gluconeogenesis and reduces peripheral glucose uptake."]],["PYT"]);
IM.qb.add("Physiology","Endocrine and neuro-muscular physiology",[["Which cells of the pancreas secrete glucagon?","Alpha cells",["Beta cells","Delta cells","PP cells"],"Alpha cells secrete glucagon in fasting. Beta cells secrete insulin and delta cells secrete somatostatin."]],["PYT"]);
IM.qb.add("Physiology","Exercise and Environment",[["During heavy exercise, oxygen consumption can rise to what multiple of resting values in trained athletes?","About 15 to 20 times",["About 2 times","About 50 times","It does not change"],"VO2 max in trained athletes can reach about 4 to 5 L/min against a resting value of about 0.25 L/min."]],["PYT"]);
IM.qb.add("Physiology","Gastrointestinal",[["Which cells secrete hydrochloric acid in the stomach?","Parietal cells",["Chief cells","G cells","Mucous neck cells"],"Parietal (oxyntic) cells secrete HCl via the H-K ATPase and also secrete intrinsic factor. Chief cells secrete pepsinogen."]],["PYT"]);
IM.qb.add("Paediatrics","Cardiology and Respiratory",[["The most common congenital heart disease overall is which?","Ventricular septal defect",["Atrial septal defect","Tetralogy of Fallot","Patent ductus arteriosus"],"VSD is most common; tetralogy of Fallot is the most common cyanotic lesion after infancy."]],["PYT"]);
IM.qb.add("Paediatrics","Cardiology, haematology and genetics",[["Which congenital heart disease is the commonest cause of cyanosis in a child beyond the neonatal period?","Tetralogy of Fallot",["Transposition of the great arteries","Truncus arteriosus","Ebstein anomaly"],"TOF is the commonest cyanotic congenital heart disease after infancy; TGA is the commonest in the first week."]],["PYT"]);
IM.qb.add("Paediatrics","Development and Behaviour",[["Which primitive reflex normally disappears by about 3 to 6 months?","Moro reflex",["Parachute reflex","Babinski reflex","Plantar grasp"],"Persistence beyond 6 months suggests a neurological problem. The parachute reflex appears around 8 to 9 months and stays."]],["PYT"]);
IM.qb.add("Paediatrics","Emergency and Miscellaneous",[["The first step in paediatric basic life support for an unresponsive child not breathing normally is what?","Give 5 rescue breaths",["Start 30 compressions immediately without breaths","Check blood glucose","Give adrenaline"],"Paediatric BLS starts with 5 rescue breaths because arrests are usually respiratory. Compression to ventilation ratio for health workers is 15:2."]],["PYT"]);
IM.qb.add("Paediatrics","Gastroenterology and Surgery",[["Projectile non-bilious vomiting in a 4-week-old boy with a palpable olive-shaped mass suggests which condition?","Infantile hypertrophic pyloric stenosis",["Duodenal atresia","Malrotation","Gastro-oesophageal reflux"],"Ultrasound confirms it. Correct the hypochloraemic hypokalaemic metabolic alkalosis before Ramstedt pyloromyotomy."]],["PYT"]);
IM.qb.add("Paediatrics","Genetics and Neurology",[["Down syndrome most commonly arises from which mechanism?","Meiotic non-disjunction",["Robertsonian translocation","Mosaicism","Uniparental disomy"],"About 95 percent are free trisomy 21 from non-disjunction, linked to maternal age."]],["PYT"]);
IM.qb.add("Paediatrics","Growth and Development",[["At what age does a typical infant double its birth weight?","About 5 months",["About 2 months","About 1 year","About 2 years"],"Birth weight doubles by about 5 months, triples by 1 year and quadruples by 2 years."]],["PYT"]);
IM.qb.add("Paediatrics","Growth, development and nutrition",[["At what age does a typical child first sit without support?","6 months",["3 months","9 months","12 months"],"Sitting without support is achieved around 6 months; crawling at 8-9 months and walking at 12-15 months."]],["PYT"]);
IM.qb.add("Psychiatry","Anxiety and Related Disorders",[["Generalised anxiety disorder requires excessive worry for at least how long?","6 months",["2 weeks","1 month","1 year"],"SSRIs, SNRIs and cognitive behavioural therapy are first-line."]],["PYT"]);
IM.qb.add("Psychiatry","Anxiety, stress and somatic disorders",[["What is agoraphobia?","Fear and avoidance of situations where escape is difficult or help unavailable, such as crowds, public transport or open spaces",["Fear of heights","Fear of spiders","Fear of social scrutiny only"],"It often accompanies panic disorder; treat with CBT (exposure) and SSRIs."]],["PYT"]);
IM.qb.add("Psychiatry","Child and adolescent psychiatry",[["What is conduct disorder?","A repetitive pattern of violating others' rights and age-appropriate rules (aggression, destruction, deceit, theft) in a child or adolescent",["Defiant behaviour only towards parents","Shyness","Learning disability"],"It may evolve into antisocial personality disorder after 18; parent management training and multisystemic therapy help."]],["PYT"]);
IM.qb.add("Psychiatry","Mixed Practice",[["Which SSRI has the longest half-life, so missed doses cause little withdrawal?","Fluoxetine",["Paroxetine","Sertraline","Escitalopram"],"Paroxetine has a short half-life and the most discontinuation symptoms."]],["PYT"]);
IM.qb.add("Psychiatry","Mood disorders",[["What is the minimum duration of symptoms for a depressive episode?","2 weeks",["2 days","2 months","6 months"],"Core symptoms: low mood, anhedonia; plus sleep, appetite, energy, concentration, guilt, psychomotor change and suicidal thoughts."]],["PYT"]);
IM.qb.add("Psychiatry","Mood, anxiety and psychotic disorders",[["Which of the following is a first-rank symptom of Schneider in schizophrenia?","Thought broadcasting",["Pressure of speech","Flight of ideas","Psychomotor retardation"],"Schneider first-rank symptoms include thought insertion, withdrawal and broadcasting, audible thoughts, passivity phenomena and delusional perception."]],["PYT"]);
IM.qb.add("Psychiatry","Organic, Child and Other Disorders",[["Delirium differs from dementia in which feature?","Acute onset with fluctuating attention",["Gradual onset over years","Normal level of consciousness","Irreversible course"],"Delirium needs a search for the cause (infection, drugs, metabolic). Dementia has preserved consciousness early."]],["PYT"]);
IM.qb.add("Psychiatry","Psychopathology",[["A fixed false belief held firmly despite clear evidence, not shared by the person's culture, is called what?","Delusion",["Illusion","Obsession","Overvalued idea"],"An overvalued idea is held strongly but not with delusional certainty; obsessions are recognised as one's own and unwanted."]],["PYT"]);
IM.qb.add("Biochemistry","Acid-Base and Electrolytes",[["The main buffer system in extracellular fluid is which?","Bicarbonate-carbonic acid",["Phosphate","Haemoglobin","Protein"],"Bicarbonate is the main ECF buffer because CO2 can be removed by the lungs and bicarbonate adjusted by the kidneys."]],["PYT"]);
IM.qb.add("Biochemistry","Amino Acids and Proteins",[["Which amino acid is the main carrier of nitrogen from muscle to liver?","Alanine",["Glutamine","Glycine","Aspartate"],"The glucose-alanine cycle carries amino groups from muscle to liver. Glutamine carries nitrogen from many tissues to the kidney and gut."]],["PYT"]);
IM.qb.add("Biochemistry","Amino acids, nucleotides and vitamins",[["Which enzyme is deficient in classic phenylketonuria?","Phenylalanine hydroxylase",["Tyrosinase","Homogentisate oxidase","Fumarylacetoacetate hydrolase"],"Phenylalanine cannot be converted to tyrosine, so phenylketones appear in urine. Untreated patients have intellectual disability and a mousy odour."]],["PYT"]);
IM.qb.add("Biochemistry","Carbohydrate Chemistry and Metabolism",[["Sucrose is made of which two monosaccharides?","Glucose and fructose",["Glucose and galactose","Two glucose units","Fructose and galactose"],"Sucrose is a non-reducing disaccharide (alpha-1, beta-2 linkage). Lactose is glucose plus galactose; maltose is two glucose units."]],["PYT"]);
IM.qb.add("Biochemistry","Carbohydrate Metabolism",[["Which enzyme catalyses the main rate-limiting step of glycolysis?","Phosphofructokinase-1",["Hexokinase","Pyruvate kinase","Aldolase"],"PFK-1 converts fructose 6-phosphate to fructose 1,6-bisphosphate. It is activated by AMP and fructose 2,6-bisphosphate and inhibited by ATP and citrate."]],["PYT"]);
IM.qb.add("Biochemistry","Carbohydrate and lipid metabolism",[["Which enzyme is the rate-limiting step of glycolysis?","Phosphofructokinase-1",["Hexokinase","Pyruvate kinase","Aldolase"],"PFK-1 is the main regulatory enzyme of glycolysis; it is activated by fructose 2,6-bisphosphate and AMP and inhibited by ATP and citrate."]],["PYT"]);
IM.qb.add("Biochemistry","Clinical Biochemistry",[["Which liver enzyme is relatively specific for cholestasis when raised along with alkaline phosphatase?","Gamma-glutamyl transferase",["Alanine aminotransferase","Lactate dehydrogenase","Creatine kinase"],"GGT rises with ALP in cholestasis, confirming a hepatic source of ALP; it is also induced by alcohol."]],["PYT"]);
IM.qb.add("Biochemistry","Enzymes",[["In competitive inhibition, which kinetic parameter changes?","Km increases; Vmax unchanged",["Vmax decreases; Km unchanged","Both Km and Vmax decrease","Neither changes"],"A competitive inhibitor competes for the active site, so more substrate overcomes it: apparent Km rises, Vmax stays the same."]],["PYT"]);
IM.qb.add("FMT","Asphyxial Deaths",[["In typical hanging, the ligature mark on the neck usually has which feature?","Oblique, incomplete, running upward to the knot",["Horizontal and complete at the same level","Low in the neck below the thyroid","Absent in every case"],"Ligature strangulation leaves a horizontal, complete mark lower down on the neck."]],["PYT"]);
IM.qb.add("FMT","Firearm Injuries",[["Tattooing around a gunshot entry wound is caused by what?","Unburnt and partly burnt powder grains embedded in the skin",["Flame from the muzzle","Bullet lubricant","Carbon monoxide"],"It indicates a close-range discharge and cannot be washed off; smudging (soot) can be wiped away."]],["PYT"]);
IM.qb.add("FMT","Forensic pathology and thanatology",[["Which is the earliest sign of death?","Cessation of circulation and respiration with loss of consciousness",["Rigor mortis","Algor mortis","Putrefaction"],"Somatic death starts with failure of vital functions. The other changes are postmortem changes that appear later."]],["PYT"]);
IM.qb.add("FMT","Identification",[["Which is the most reliable single method of identifying a person?","Fingerprints (dactylography)",["Hair colour","Height","Clothing"],"Fingerprints are unique and permanent; DNA is equally individual except in identical twins."]],["PYT"]);
IM.qb.add("FMT","Injuries",[["What is an abrasion?","Destruction of the superficial layer of skin (epidermis) only",["A tear through full skin thickness","Bleeding into tissues","A cut by a sharp object"],"Abrasions do not bleed much and heal without scars; patterned abrasions can show the weapon's shape."]],["PYT"]);
IM.qb.add("FMT","Injuries, sexual offences and law",[["A wound produced by a blunt force that tears tissue with irregular margins and bridging tissue strands is called what?","Lacerated wound",["Incised wound","Stab wound","Chop wound"],"Lacerations show irregular margins, bruised edges and tissue bridges. Incised wounds are longer than they are deep with clean edges."]],["PYT"]);
IM.qb.add("FMT","Legal Procedures and Medical Ethics",[["Which type of inquest is conducted by a police officer in India?","Police inquest",["Coroner inquest","Magistrate inquest","Medical examiner inquest"],"Magistrate inquests are mandatory for deaths in police custody and dowry deaths within 7 years of marriage."]],["PYT"]);
IM.qb.add("FMT","Legal procedure",[["Which court in India can award a death sentence (subject to confirmation by the High Court)?","Court of Session",["Chief Judicial Magistrate","Judicial Magistrate first class","Executive magistrate"],"A Sessions Judge can pass any sentence authorised by law, but a death sentence must be confirmed by the High Court."]],["PYT"]);
IM.qb.add("Ophthalmology","Anatomy and Optics",[["Which layer of the cornea cannot regenerate once damaged?","Endothelium",["Epithelium","Stroma (heals by scarring only)","Tear film"],"Endothelial cells pump water out of the stroma; cell loss causes corneal oedema. Cell density falls with age and surgery."]],["PYT"]);
IM.qb.add("Ophthalmology","Anatomy and optics",[["What is the refractive power of the normal cornea?","About +43 to +45 dioptres",["About +10 dioptres","About +60 dioptres","About +2 dioptres"],"The cornea provides about two-thirds of the eye's total power (about +60 D); the lens adds about +16 to +20 D."]],["PYT"]);
IM.qb.add("Ophthalmology","Conjunctiva and Cornea",[["Follicles in the conjunctiva are typical of which type of conjunctivitis?","Viral or chlamydial conjunctivitis",["Bacterial conjunctivitis","Vernal keratoconjunctivitis","Allergic conjunctivitis only"],"Papillae are typical of allergic and bacterial conjunctivitis; giant papillae of vernal keratoconjunctivitis."]],["PYT"]);
IM.qb.add("Ophthalmology","Conjunctiva and cornea",[["Which conjunctivitis is typically associated with preauricular lymph nodes and watery discharge?","Adenoviral conjunctivitis",["Bacterial conjunctivitis","Allergic conjunctivitis","Chemical conjunctivitis"],"Highly contagious; hand hygiene; subepithelial infiltrates can follow."]],["PYT"]);
IM.qb.add("Ophthalmology","Cornea, lens and glaucoma",[["Which is the most common cause of reversible blindness worldwide?","Cataract",["Glaucoma","Diabetic retinopathy","Trachoma"],"Cataract is the leading cause of blindness and is treatable with surgery. Glaucoma is the leading cause of irreversible blindness."]],["PYT"]);
IM.qb.add("Ophthalmology","Eye injuries and emergencies",[["What is the first step in a chemical splash to the eye?","Immediate copious irrigation with water or saline for at least 30 minutes",["Wait for an ophthalmologist","Apply antibiotic ointment","Patch the eye"],"Check pH, remove particulate matter, double-evert the lids."]],["PYT"]);
IM.qb.add("Ophthalmology","Lens and Retina",[["The most common type of cataract in adults is which?","Age-related (senile) cataract",["Traumatic cataract","Congenital cataract","Steroid-induced cataract"],"Nuclear sclerosis can cause 'second sight' (better near vision) as myopia develops."]],["PYT"]);
IM.qb.add("Ophthalmology","Lens and glaucoma",[["What is the commonest cause of reversible blindness in India?","Cataract",["Glaucoma","Diabetic retinopathy","Trachoma"],"Cataract surgery with IOL implantation restores vision."]],["PYT"]);
IM.qb.add("Anaesthesia","Airway and Equipment",[["Which device is a second-generation supraglottic airway with a gastric drain channel?","i-gel or ProSeal LMA",["Classic LMA","Guedel airway","Nasopharyngeal airway"],"The drain channel reduces aspiration risk and allows gastric tube passage."]],["PYT"]);
IM.qb.add("Anaesthesia","Airway management",[["Which laryngoscope blade is placed in the vallecula and lifts the epiglottis indirectly?","Macintosh (curved) blade",["Miller (straight) blade","McCoy blade only","Wisconsin blade"],"The curved Macintosh tip goes into the vallecula and tenses the hyoepiglottic ligament. The straight Miller blade lifts the epiglottis directly and is often used in infants."]],["PYT"]);
IM.qb.add("Anaesthesia","Critical Care and Resuscitation",[["In adult cardiac arrest with ventricular fibrillation, what is the immediate priority after starting CPR?","Defibrillation",["IV adrenaline","Intubation","Amiodarone"],"Shock as soon as possible; adrenaline is given after the third shock in shockable rhythms (immediately in non-shockable ones)."]],["PYT"]);
IM.qb.add("Anaesthesia","Mixed Practice",[["Which induction agent is contraindicated in acute porphyria?","Thiopentone",["Propofol","Ketamine with caution","Etomidate in all cases is safe"],"Barbiturates induce ALA synthase and can trigger an attack; propofol is considered safe."]],["PYT"]);
IM.qb.add("Anaesthesia","Monitoring and equipment",[["What are the minimum monitoring standards during general anaesthesia?","ECG, non-invasive BP, pulse oximetry, capnography, inspired oxygen and agent concentration, and airway pressure, with a trained anaesthetist present",["Pulse oximetry alone","ECG alone","Urine output alone"],"The continuous presence of an anaesthetist is the most important monitor; temperature and neuromuscular monitoring are added as needed."]],["PYT"]);
IM.qb.add("Anaesthesia","Pharmacology for Anaesthesia",[["Minimum alveolar concentration measures what?","Potency of an inhaled anaesthetic",["Speed of induction","Solubility in fat","Rate of metabolism"],"MAC is the concentration preventing movement to skin incision in 50 percent of patients; lower MAC means more potent."]],["PYT"]);
IM.qb.add("Anaesthesia","Pharmacology of anaesthesia",[["Which induction agent is preferred in a hypotensive trauma patient?","Ketamine (or a reduced dose of etomidate)",["Full dose propofol","Thiopentone in a large dose","Midazolam infusion alone"],"Ketamine maintains BP by sympathetic stimulation and provides analgesia; doses are still reduced in shock."]],["PYT"]);
IM.qb.add("Anaesthesia","Postoperative care and pain",[["What is the Aldrete score used for?","Discharge readiness from the post-anaesthesia care unit",["Predicting difficult airway","Grading pain","Measuring depth of anaesthesia"],"It scores activity, respiration, circulation, consciousness and oxygen saturation (0 to 2 each); 9 or more allows discharge."]],["PYT"]);
IM.qb.add("Dermatology","Basic dermatology",[["Which cells in the epidermis are antigen-presenting cells?","Langerhans cells",["Merkel cells","Melanocytes","Keratinocytes of the basal layer only"],"Langerhans cells (CD1a, langerin, Birbeck granules) sit in the stratum spinosum and present antigens to T cells; they matter in contact dermatitis."]],["PYT"]);
IM.qb.add("Dermatology","Basics of Skin",[["Which layer of the epidermis contains dividing stem cells?","Stratum basale",["Stratum corneum","Stratum granulosum","Stratum lucidum"],"Basal cells divide and move upward; the full epidermal turnover takes about 28 days."]],["PYT"]);
IM.qb.add("Dermatology","Drug Reactions and Treatment",[["A fixed drug eruption recurs at which site on re-exposure?","The same site each time",["A different site each time","Only mucosal surfaces","Only the palms"],"Common culprits include sulphonamides, NSAIDs and tetracyclines; lesions leave grey-brown pigmentation."]],["PYT"]);
IM.qb.add("Dermatology","Eczema and Urticaria",[["Atopic dermatitis in infants typically affects which areas first?","Face and extensor surfaces",["Flexures only","Palms and soles","Genital area"],"In older children and adults it moves to the flexures."]],["PYT"]);
IM.qb.add("Dermatology","Eczema and urticaria",[["What is the first-line long-term measure in atopic dermatitis?","Regular use of emollients",["Long-term oral steroids","Antibiotics every month","Avoiding all bathing"],"Emollients restore the skin barrier; topical steroids or calcineurin inhibitors treat flares."]],["PYT"]);
IM.qb.add("Dermatology","Infections and Infestations",[["Impetigo with honey-coloured crusts is most commonly caused by which organism?","Staphylococcus aureus",["Streptococcus pneumoniae","Pseudomonas","Candida"],"Group A Streptococcus can also cause it; topical mupirocin or fusidic acid is used for limited disease."]],["PYT"]);
IM.qb.add("Dermatology","Infections and infestations",[["What is the commonest organism causing impetigo?","Staphylococcus aureus (also Streptococcus pyogenes)",["Pseudomonas","Candida","Herpes simplex"],"Honey-coloured crusts (non-bullous) or flaccid blisters (bullous impetigo from staphylococcal exfoliative toxin)."]],["PYT"]);
IM.qb.add("Dermatology","Mixed Practice",[["Which disease shows the 'tram track' calcification pattern and a port-wine stain over the face?","Sturge-Weber syndrome",["Tuberous sclerosis","Neurofibromatosis","Ataxia telangiectasia"],"It affects the ophthalmic division area and causes seizures and glaucoma."]],["PYT"]);
IM.qb.pyq([{"s":"OBG","t":"Abnormal uterine bleeding: perimenopause","exam":"AIIMS 2020","q":"A 50-year-old has had heavy, irregular bleeding for 2 months. What is the most important next step before treatment?","c":"Endometrial sampling (e.g. Pipelle biopsy), with transvaginal ultrasound","w":["Insert an LNG-IUS straight away without investigation","Hysterectomy as the first step","Progestogen-only pills for 3 months and review"],"sol":"Answer: Endometrial sampling to exclude hyperplasia or cancer.\n\nWhen to biopsy in abnormal uterine bleeding:\n• Age 45 or over (FIGO/ACOG, varying 40 to 45).\n• Younger women with risk factors: obesity, PCOS, unopposed oestrogen, tamoxifen, Lynch syndrome, failed treatment, persistent intermenstrual bleeding.\n\nPALM-COEIN classification (FIGO):\n• Structural: Polyp, Adenomyosis, Leiomyoma, Malignancy and hyperplasia.\n• Non-structural: Coagulopathy, Ovulatory dysfunction, Endometrial, Iatrogenic, Not yet classified.\n\nAfter cancer is excluded:\n• LNG-IUS, tranexamic acid, NSAIDs, progestins, endometrial ablation or hysterectomy.","img":null},{"s":"OBG","t":"Abortion: early medical method","exam":"NEET PG 2024","q":"A healthy woman at 8 weeks of gestation requests termination of pregnancy. Which is the preferred medical method?","c":"Mifepristone 200 mg orally, then misoprostol 24 to 48 hours later","w":["Oxytocin infusion","Intra-amniotic hypertonic saline","Dinoprostone pessary alone"],"sol":"Answer: Mifepristone followed by misoprostol. Licensed in India up to 9 weeks (63 days); WHO supports use to 12 weeks and beyond with adjusted doses.\n\nHow it works:\n• Mifepristone: anti-progesterone; detaches the pregnancy and softens the cervix.\n• Misoprostol (800 µg vaginal, buccal or sublingual): prostaglandin E1 analogue; expels the pregnancy.\n\nBefore:\n• Confirm intrauterine pregnancy and dates (exclude ectopic).\n• Check haemoglobin and Rh status; anti-D if Rh-negative (as per local policy).\n\nContraindications:\n• Suspected ectopic, IUCD in place (remove first), chronic adrenal failure, long-term steroids, bleeding disorder or anticoagulants, porphyria, allergy.\n\nFollow-up:\n• Confirm complete abortion (symptoms, urine hCG, or ultrasound).","img":null},{"s":"OBG","t":"Abortion: second-trimester methods","exam":"INI-CET 2022","q":"Which method is NOT used for first-trimester termination of pregnancy?","c":"Extra-amniotic instillation of ethacridine lactate","w":["Mifepristone followed by misoprostol","Manual vacuum aspiration","Electric vacuum aspiration"],"sol":"Answer: Extra-amniotic ethacridine is an older second-trimester method.\n\nFirst trimester (up to 12 weeks):\n• Medical: mifepristone then misoprostol.\n• Surgical: manual or electric vacuum aspiration (preferred over sharp curettage, which WHO advises against).\n\nSecond trimester:\n• Medical: mifepristone then repeated misoprostol (preferred).\n• Dilatation and evacuation by skilled providers.\n• Older methods: ethacridine (extra-amniotic), hypertonic saline (intra-amniotic), oxytocin.\n\nAfter any abortion:\n• Offer contraception at once; anti-D for Rh-negative women per guidance.","img":null},{"s":"OBG","t":"Adolescent gynaecology: heavy bleeding at puberty","exam":"INI-CET 2023","q":"A 13-year-old who started her periods a year ago has heavy, prolonged and irregular bleeding. What is the most common cause?","c":"Anovulatory cycles from an immature hypothalamic-pituitary-ovarian axis","w":["Endometriosis","Endometrial cancer","Fibroids"],"sol":"Answer: Anovulation. Unopposed oestrogen builds a thick, unstable endometrium that sheds irregularly and heavily.\n\nAlways exclude:\n• Bleeding disorders, especially von Willebrand disease (in up to 20% of adolescents with heavy bleeding, particularly if heavy from the first period).\n• Pregnancy, thyroid disease, PCOS.\n\nTests:\n• Full blood count, ferritin, pregnancy test, coagulation screen and von Willebrand studies, thyroid function.\n\nTreatment:\n• Iron, tranexamic acid, NSAIDs.\n• Combined pill or cyclical progestogens.\n• Acute heavy bleeding: high-dose hormones; transfusion if needed.\n• Curettage is rarely needed.","img":null},{"s":"PSM","t":"Ageing: longevity dividend","exam":"NEET PG 2024","q":"What does the \"longevity dividend\" concept propose?","c":"Slowing the ageing process itself would delay the onset of many age-related diseases together, extending healthy lifespan and producing economic and social benefits","w":["Treating each chronic disease separately extends life the most","Increasing birth rates to support older people","Reducing the retirement age"],"sol":"Answer: The idea is that interventions on ageing biology (rather than single diseases) compress morbidity and add healthy years.\n\nRelated concepts:\n• Compression of morbidity (Fries): delaying onset of disability to shorten the period of illness before death.\n• Demographic dividend: economic growth from a large working-age population.\n• Healthy life expectancy (HALE) and disability-adjusted life years (DALYs).\n\nIndia elderly care:\n• National Programme for Health Care of the Elderly (NPHCE).\n• Elderly population about 10%, projected to rise sharply.","img":null},{"s":"PSM","t":"Air pollution: monitoring indicators","exam":"NEET PG 2020","q":"Which pollutants are the classic indicators for routine monitoring of air pollution?","c":"Sulphur dioxide, smoke (soiling index) and suspended particulate matter","w":["Carbon dioxide, oxygen and nitrogen","Ozone only","Radon and noise"],"sol":"Answer: Current National Ambient Air Quality Standards (India) cover 12 pollutants including PM10, PM2.5, SO2, NO2, CO, ozone, lead, ammonia, benzene, benzo(a)pyrene, arsenic, nickel.\n\nAir Quality Index (AQI) categories (India):\n• Good (0 to 50), satisfactory (51 to 100), moderately polluted (101 to 200), poor (201 to 300), very poor (301 to 400), severe (401 to 500).\n\nHealth effects:\n• PM2.5: cardiovascular and respiratory disease, lung cancer; leading environmental risk factor in India.\n\nProgrammes:\n• National Clean Air Programme (NCAP), Graded Response Action Plan (Delhi).","img":null},{"s":"PSM","t":"Anaemia in pregnancy: treatment","exam":"INI-CET 2022","q":"Under Anaemia Mukt Bharat, how is mild to moderate anaemia treated in a pregnant woman who presents early (before about 34 weeks)?","c":"Oral iron (two IFA tablets daily) with follow-up; IV iron sucrose or ferric carboxymaltose if oral iron is not tolerated or response is poor, and for moderate anaemia in later pregnancy","w":["Blood transfusion for all cases","No treatment until delivery","Vitamin B12 injections only"],"sol":"Answer: Anaemia in pregnancy (WHO): Hb under 11 g/dL; mild 10 to 10.9, moderate 7 to 9.9, severe under 7.\n\nApproach:\n• Prophylaxis: 1 IFA tablet (60 mg elemental iron, 500 µg folic acid) daily from second trimester for 180 days, continued 180 days postpartum.\n• Mild-moderate: therapeutic oral iron; IV iron (FCM) after first trimester for poor response, intolerance or late presentation.\n• Severe anaemia: hospital management; transfusion for very low Hb near term or with heart failure.\n• Deworming with albendazole in second trimester.","img":null},{"s":"PSM","t":"Biomedical waste management","exam":"AIIMS 2017","q":"Under India's Bio-Medical Waste Management Rules, 2016, which of these is discarded in the RED bag?","c":"Used IV tubing, catheters and urine bags","w":["Human anatomical waste","Used needles and scalpel blades","Broken glass vials and ampoules"],"sol":"Answer: Used IV tubing, catheters and urine bags.\n\nRED (non-chlorinated plastic bag), contaminated recyclable waste:\n• Tubing, bottles, IV sets, catheters, urine bags, syringes without needles, gloves.\n• Goes for autoclaving or microwaving, then shredding and recycling. It must not be incinerated.\n\nThe other categories:\n• YELLOW: human and animal anatomical waste, soiled dressings and cotton, expired or discarded medicines, chemical waste, microbiology cultures (pre-treated), discarded linen. Usually incinerated or deep-buried.\n• WHITE (translucent, puncture-proof, leak-proof container): sharps such as needles, syringes with fixed needles, scalpel blades.\n• BLUE (cardboard box with a blue marking): glassware, including broken or discarded glass and metallic body implants.\n\nHigh-yield:\n• Untreated waste may not be stored for more than 48 hours.\n• Bags must carry the biohazard or cytotoxic symbol, and the rules call for a bar-code tracking system.","img":null},{"s":"Surgery","t":"Abdominal masses: mesenteric cyst","exam":"AIIMS 2020","q":"A child has a smooth, painless, periumbilical abdominal mass that moves freely at right angles to the line of mesenteric attachment but only slightly along it. What is this sign called and what does it suggest?","c":"Tillaux sign, suggesting a mesenteric cyst","w":["Murphy sign, suggesting cholecystitis","Rovsing sign, suggesting appendicitis","Grey Turner sign, suggesting pancreatitis"],"sol":"Answer: Tillaux sign: a mesenteric cyst moves freely perpendicular to the root of the mesentery (which runs from the left of L2 to the right sacroiliac joint) but only slightly along it. A zone of resonance from overlying bowel may surround it.\n\nMesenteric cysts:\n• Usually lymphatic (lymphangioma, chylolymphatic cyst); also enterogenous duplication cysts, dermoid, hydatid.\n• Often found incidentally or present with a painless mobile mass, pain, or complications: torsion, haemorrhage, infection, intestinal obstruction or volvulus.\n• Investigations: ultrasound, CT.\n• Treatment: complete enucleation (lymphatic cysts); enteric duplication cysts share blood supply with the bowel and need resection of the attached segment.\n\nMesenteric cysts are NOT brilliantly transilluminant through the abdominal wall, and fluctuation may be difficult to elicit.","img":null},{"s":"Surgery","t":"Acute abdomen: clinical signs","exam":"AIIMS 2017","q":"Which clinical sign is NOT used in diagnosing acute appendicitis?","c":"Ballance sign","w":["Rovsing sign","Psoas sign","Obturator sign"],"sol":"Answer: Ballance sign. It belongs to splenic rupture: fixed dullness in the left flank (clotted blood around the spleen) with shifting dullness in the right flank.\n\nSigns of appendicitis:\n• McBurney point tenderness: one-third of the way from the right anterior superior iliac spine to the umbilicus.\n• Rovsing sign: pressing on the left iliac fossa causes pain in the right iliac fossa.\n• Psoas sign: pain on extending the right hip; suggests a retrocaecal appendix.\n• Obturator sign: pain on internal rotation of the flexed right hip; suggests a pelvic appendix.\n• Dunphy sign: pain on coughing.\n\nScoring:\n• Alvarado (MANTRELS) or AIR scores help decide on imaging or surgery.\n• CT is very accurate in adults; ultrasound first in children and pregnancy.","img":null},{"s":"Surgery","t":"Acute abdomen: imaging","exam":"NEET PG 2019","q":"In which condition may the plain abdominal X-ray show a \"gasless abdomen\"?","c":"Acute pancreatitis (from vomiting and fluid-filled loops), among other causes","w":["Ulcerative colitis","Uncomplicated Crohn disease","Sigmoid volvulus"],"sol":"Answer: A gasless abdomen can occur in severe acute pancreatitis (fluid-filled loops, repeated vomiting), as well as in high small bowel obstruction with fluid-filled loops, closed-loop obstruction, mesenteric ischaemia, severe vomiting, ascites and in newborns with oesophageal atresia without fistula.\n\nOther plain X-ray signs in pancreatitis:\n• Sentinel loop (a localised dilated jejunal loop near the pancreas).\n• Colon cut-off sign (gas in the transverse colon stops at the splenic flexure).\n• Calcification in chronic pancreatitis.\n\nCompare: sigmoid volvulus gives a huge \"coffee bean\" loop; ulcerative colitis may show a featureless \"lead pipe\" colon or toxic megacolon.","img":null},{"s":"Surgery","t":"Acute abdomen: perforation","exam":"NEET PG 2022","q":"A man has sudden severe abdominal pain. An erect chest X-ray shows a crescent of free gas under both domes of the diaphragm. He is haemodynamically stable. What is the next step?","c":"Resuscitation, antibiotics and emergency laparotomy (or laparoscopy) to repair the perforation","w":["Gastric lavage","Chest tube insertion","Observation with repeat X-ray in 24 hours"],"sol":"Answer: Pneumoperitoneum from a perforated hollow viscus (commonly perforated duodenal or gastric ulcer): resuscitate, nil by mouth, nasogastric tube, IV PPI and broad-spectrum antibiotics, and urgent surgery (laparotomy or laparoscopy: omental patch repair, Graham patch).\n\nKey points:\n• Erect chest X-ray detects as little as 1 to 2 mL of free air (patient upright for 10 minutes); CT is more sensitive.\n• Left lateral decubitus film if the patient cannot stand.\n• Other signs on supine films: Rigler sign (both sides of the bowel wall visible), football sign, falciform ligament sign.\n\nCauses of pneumoperitoneum:\n• Perforated peptic ulcer (commonest), perforated diverticulitis, appendix, typhoid ileal perforation (common in India), tumours, trauma, ischaemia.\n• Non-surgical: after laparotomy or laparoscopy (can persist up to 1 to 2 weeks), peritoneal dialysis, pneumatosis intestinalis.\n\nNon-operative (Taylor) management of a sealed perforation: only in carefully selected stable patients without peritonitis, with contrast study showing no leak.\n\nTest for H. pylori and treat it after ulcer repair.","img":null},{"s":"Microbiology","t":"Virology: rabies","exam":"AIIMS 2017","q":"A man died a week after developing hydrophobia and agitation, two months after a dog bite. An H&E-stained section of his brain is shown. The pink cytoplasmic inclusions in the neurons are characteristic of which infection?","c":"Rabies","w":["Herpes simplex encephalitis","Cytomegalovirus","Subacute sclerosing panencephalitis"],"sol":"Answer: Rabies. The inclusions are Negri bodies.\n\nNegri bodies are sharply outlined, eosinophilic INTRACYTOPLASMIC inclusions made of viral nucleocapsid. They are best seen in Purkinje cells of the cerebellum and pyramidal cells of the hippocampus. Seller's stain shows them as magenta bodies with basophilic granules.\n\nWhy not the others:\n• Herpes simplex: Cowdry type A INTRANUCLEAR inclusions; temporal lobe necrosis.\n• Cytomegalovirus: \"owl's eye\" intranuclear inclusions in enlarged cells.\n• SSPE (measles): intranuclear and intracytoplasmic inclusions with gliosis; years after measles.\n\nDiagnosis in a living patient:\n• Test of choice: direct fluorescent antibody test on a skin biopsy from the nape of the neck (nerves around hair follicles).\n• Also: direct fluorescent antibody on a corneal impression smear, and RT-PCR on saliva, CSF or skin.\n• Negri bodies are missing in about a fifth of cases, so their absence does not exclude rabies.","img":{"src":"img-pyq-micro-rabies-he.jpg","alt":"H&E section of brain tissue showing neurons with round pink cytoplasmic inclusions","credit":"CDC / Dr Daniel P. Perl, Public Health Image Library · Public domain","link":"https://commons.wikimedia.org/wiki/File:Rabies_encephalitis_Negri_bodies_PHIL_3377_lores.jpg"}},{"s":"Microbiology","t":"Antimicrobial testing: E test","exam":"INI-CET 2024","q":"Which method gives a direct MINIMUM INHIBITORY CONCENTRATION (MIC) value using a plastic strip with a gradient of antibiotic on an agar plate?","c":"E test (epsilometer test)","w":["Elek test","Latex agglutination","CAMP test"],"sol":"Answer: The MIC is read where the elliptical zone of inhibition meets the strip scale.\n\nSusceptibility methods:\n• Disc diffusion (Kirby-Bauer): zone size interpreted as S, I or R using CLSI/EUCAST breakpoints; Mueller-Hinton agar.\n• Broth microdilution: gold standard for MIC.\n• E test: gradient strip MIC.\n• Agar dilution.\n• Automated systems: VITEK 2, Phoenix.\n• Molecular detection of resistance genes (mecA, vanA, carbapenemases).\n\nOther tests named in the options:\n• Elek test: toxigenicity of C. diphtheriae (immunodiffusion).\n• CAMP test: group B streptococcus.\n\nMBC:\n• Minimum bactericidal concentration from subculture of clear tubes.","img":null},{"s":"Microbiology","t":"Bacteria: Clostridioides difficile","exam":"NEET PG 2022","q":"Which statement about Clostridioides difficile infection is correct?","c":"Diagnosis uses stool tests for toxin or toxin genes (two-step GDH or NAAT with toxin EIA) on unformed stool; first-line treatment is oral fidaxomicin or oral vancomycin","w":["Aerobic stool culture is the best test","IV vancomycin is effective because it reaches the colon","Alcohol hand rub reliably kills its spores"],"sol":"Answer: C. difficile is an anaerobic spore-former; spores survive alcohol, so use soap and water and sporicidal (chlorine) cleaning.\n\nRisk factors:\n• Antibiotics (clindamycin, fluoroquinolones, cephalosporins), hospitalisation, age, PPIs.\n\nToxins:\n• Toxin A (enterotoxin) and B (cytotoxin) glucosylate Rho GTPases.\n• Hypervirulent ribotype 027 (binary toxin).\n\nFeatures:\n• Watery diarrhoea, pseudomembranous colitis (yellow plaques), toxic megacolon, leucocytosis.\n\nTreatment:\n• Oral fidaxomicin or oral vancomycin; metronidazole only if others unavailable.\n• Fulminant: oral vancomycin plus IV metronidazole, surgery.\n• Recurrent: fidaxomicin, bezlotoxumab, faecal microbiota transplant.","img":null},{"s":"Microbiology","t":"Bacteria: Haemophilus influenzae type b meningitis","exam":"INI-CET 2023","q":"An unvaccinated 18-month-old has fever, irritability, neck stiffness and positive Kernig sign. CSF Gram stain shows small pleomorphic Gram-negative coccobacilli that grow on chocolate agar and show satellitism around S. aureus on blood agar. What is the organism?","c":"Haemophilus influenzae type b","w":["Neisseria meningitidis","Streptococcus pneumoniae","Listeria monocytogenes"],"sol":"Answer: H. influenzae needs factor X (haemin) and factor V (NAD); S. aureus releases NAD and lyses red cells, giving satellite colonies.\n\nHib disease:\n• Meningitis (6 months to 2 years, unvaccinated), epiglottitis, septic arthritis, cellulitis, pneumonia.\n• Polyribosyl ribitol phosphate (PRP) capsule is the key virulence factor.\n\nTreatment:\n• Ceftriaxone or cefotaxime; dexamethasone before or with the first antibiotic dose reduces hearing loss.\n• Rifampicin prophylaxis for contacts in some settings.\n\nPrevention:\n• Hib conjugate vaccine (pentavalent in India at 6, 10, 14 weeks).\n\nNon-typeable H. influenzae:\n• Otitis media, sinusitis, COPD exacerbations.","img":null},{"s":"Anatomy","t":"Abdomen: adrenal glands","exam":"INI-CET 2023","q":"Which statement about the adrenal glands is correct?","c":"The right gland is pyramidal and lies behind the IVC; the left is semilunar and lies close to the splenic vessels and pancreas","w":["The right adrenal vein drains into the left renal vein","The left gland is pyramidal and the right is semilunar","The zona glomerulosa produces cortisol"],"sol":"Answer: Right: pyramidal, behind the IVC, short vein drains straight into the IVC. Left: semilunar (crescentic), its vein drains into the left renal vein.\n\nBlood supply (three arteries each side):\n• Superior from the inferior phrenic, middle from the aorta, inferior from the renal artery.\n\nZones of the cortex (outside to inside: \"GFR = salt, sugar, sex\"):\n• Zona glomerulosa: aldosterone (sodium and water retention, potassium loss).\n• Zona fasciculata: cortisol (largest zone).\n• Zona reticularis: androgens (DHEA).\n• Medulla: adrenaline and noradrenaline (neural crest origin).\n\nSurgery:\n• Right adrenalectomy: the short vein can tear the IVC.","img":null},{"s":"Anatomy","t":"Abdomen: coeliac trunk branches","exam":"NEET PG 2020","q":"If the common hepatic artery is ligated, which arteries lose their main origin (though collaterals may keep flow)?","c":"Right gastric and right gastro-omental (gastroepiploic) arteries","w":["Left gastric and short gastric arteries","Left gastro-omental and splenic arteries","Inferior pancreaticoduodenal and middle colic arteries"],"sol":"Answer: The common hepatic artery gives the gastroduodenal artery (which forms the right gastro-omental and superior pancreaticoduodenal arteries) and continues as the proper hepatic artery (which usually gives the right gastric).\n\nCoeliac trunk (T12) branches:\n• Left gastric: lesser curvature (oesophageal branches).\n• Splenic: short gastrics, left gastro-omental, pancreatic branches.\n• Common hepatic: gastroduodenal (right gastro-omental, superior pancreaticoduodenal), right gastric, proper hepatic (right and left hepatic; cystic from the right hepatic).\n\nWhy the liver can survive common hepatic ligation:\n• Collaterals via the gastroduodenal and pancreaticoduodenal arcades from the SMA.\n\nPosterior duodenal ulcer:\n• Erodes the gastroduodenal artery, causing major bleeding.","img":null},{"s":"Anatomy","t":"Abdomen: epiploic foramen","exam":"INI-CET 2021","q":"What forms the anterior boundary of the epiploic foramen (of Winslow), the entrance to the lesser sac?","c":"Free border of the lesser omentum containing the portal vein, hepatic artery and common bile duct","w":["Inferior vena cava","Caudate lobe of the liver","First part of the duodenum"],"sol":"Answer: The hepatoduodenal ligament (free edge of the lesser omentum) with the portal triad.\n\nBoundaries:\n• Anterior: hepatoduodenal ligament (portal vein behind, bile duct right and in front, hepatic artery left and in front).\n• Posterior: IVC (covered by peritoneum), right crus.\n• Superior: caudate process of the liver.\n• Inferior: first part of the duodenum.\n\nClinical:\n• Pringle manoeuvre: compressing the hepatoduodenal ligament through the foramen controls bleeding from the hepatic artery and portal vein during liver surgery or trauma (if bleeding continues, suspect hepatic veins or IVC).\n• Internal hernia through the foramen (rare).","img":null},{"s":"Anatomy","t":"Abdomen: gastrosplenic ligament","exam":"INI-CET 2024","q":"During splenectomy, bleeding occurs while dividing the attachment between the stomach and spleen. Which vessels run in this ligament?","c":"Short gastric vessels and left gastro-omental (gastroepiploic) vessels","w":["Splenic artery and vein","Left gastric artery","Right gastro-omental vessels"],"sol":"Answer: The gastrosplenic ligament carries the short gastric and left gastro-omental vessels.\n\nSplenic ligaments:\n• Gastrosplenic: short gastrics, left gastro-omental.\n• Splenorenal (lienorenal): splenic vessels and tail of the pancreas (risk of pancreatic injury and fistula).\n• Phrenicocolic and splenocolic: support the lower pole.\n\nSplenic artery:\n• From the coeliac trunk; tortuous course along the upper border of the pancreas.\n\nAfter splenectomy:\n• Vaccinate against pneumococcus, meningococcus and Hib (ideally 2 weeks before elective surgery).\n• Lifelong risk of overwhelming post-splenectomy infection.\n• Reactive thrombocytosis.","img":null},{"s":"Medicine","t":"Respiratory: pneumonia","exam":"NEET PG 2024","q":"A 67-year-old man has fever, cough and right-sided chest pain. His chest radiograph is shown. Which border is lost because of the opacity?","c":"Right heart border","w":["Right hemidiaphragm","Aortic knuckle","Left heart border"],"sol":"Answer: Right heart border. The X-ray shows right middle lobe consolidation (lobar pneumonia).\n\nSilhouette sign:\n• An opacity touching a structure of the same density erases its outline.\n• Right middle lobe: right heart border.\n• Lingula: left heart border.\n• Lower lobes: the diaphragm on that side.\n• Right upper lobe: right paratracheal stripe; left upper lobe: aortic knuckle.\n\nCommunity-acquired pneumonia:\n• Commonest organism: Streptococcus pneumoniae.\n• Severity by CURB-65: Confusion, Urea above 7 mmol/L, Respiratory rate 30/min or more, BP below 90 systolic or 60 diastolic, age 65 or more. Score 0 to 1 home, 2 hospital, 3 or more consider ICU.","img":{"src":"img-pyq-med-cxr-fever.jpg","alt":"Frontal chest radiograph of an adult man with an opacity in the right lung","credit":"Mikael Häggström, M.D. · CC0, via Wikimedia Commons","link":"https://commons.wikimedia.org/wiki/File:X-ray_of_lobar_pneumonia.jpg"}},{"s":"Medicine","t":"Acid-base","exam":"NEET PG 2024","q":"A 30-year-old woman took an overdose of aspirin. ABG: pH 7.38, PaCO2 22 mmHg, HCO3 13 mmol/L. Na 140, Cl 104 mmol/L. Which describes her acid-base status?","c":"High anion gap metabolic acidosis with an additional primary respiratory alkalosis","w":["Compensated high anion gap metabolic acidosis only","Normal anion gap metabolic acidosis with compensation","Primary respiratory acidosis with metabolic alkalosis"],"sol":"Answer: High anion gap metabolic acidosis with an additional primary respiratory alkalosis (mixed disorder).\n\nStep by step:\n• HCO3 is low (13), so there is a metabolic acidosis.\n• Anion gap = Na − (Cl + HCO3) = 140 − (104 + 13) = 23: high (normal about 12).\n• Expected PaCO2 by Winter's formula = 1.5 × HCO3 + 8 ± 2 = 1.5 × 13 + 8 = 27.5 (range 25.5 to 29.5).\n• Actual PaCO2 is 22, lower than expected, so there is a second, primary respiratory alkalosis.\n• pH is near normal because the two disorders cancel out.\n\nWhy salicylates do this:\n• They stimulate the respiratory centre directly (early respiratory alkalosis).\n• They uncouple oxidative phosphorylation and raise lactate and ketoacids (high anion gap acidosis).\n\nTreatment: IV sodium bicarbonate to alkalinise urine; haemodialysis for severe poisoning (high level, altered sensorium, kidney failure).","img":null},{"s":"Medicine","t":"Acid-base: transfusion","exam":"AIIMS 2019","q":"A man with haemophilia receives many units of blood products during major bleeding. A day later his ABG shows a raised bicarbonate. Which acid-base change is expected from massive transfusion, and why?","c":"Metabolic alkalosis, because the citrate anticoagulant is metabolised to bicarbonate by the liver","w":["Respiratory alkalosis from anxiety only","Respiratory acidosis from citrate","Normal anion gap metabolic acidosis from chloride"],"sol":"Answer: Metabolic alkalosis. Each unit of stored blood contains citrate (anticoagulant), which the liver converts to bicarbonate (each citrate yields 3 bicarbonate).\n\nOther metabolic effects of massive transfusion:\n• Hypocalcaemia: citrate binds ionised calcium (perioral tingling, hypotension, prolonged QT). Give IV calcium.\n• Hypomagnesaemia (citrate binds magnesium).\n• Hyperkalaemia: potassium leaks from stored red cells (more in old or irradiated blood); hypokalaemia can follow as cells take it back up.\n• Early acidosis may occur from shock and the acidic stored blood, before citrate is metabolised.\n• Hypothermia (use blood warmers).\n• Dilutional coagulopathy and thrombocytopenia: transfuse plasma, platelets and cryoprecipitate in balanced ratios (about 1:1:1).\n• TRALI and TACO.\n\nMassive transfusion definition: about 10 or more units of red cells in 24 hours, or replacement of one blood volume.\n\nCitrate toxicity is worse in liver failure and hypothermia (slower citrate metabolism).","img":null},{"s":"Medicine","t":"Acid-base: vomiting","exam":"INI-CET 2023","q":"A 24-year-old has had repeated vomiting for 4 days and is dizzy on standing. Which set of results is expected?","c":"Metabolic alkalosis, hypokalaemia, hypochloraemia and urine chloride below 20 mmol/L","w":["Metabolic acidosis with hyperkalaemia","Respiratory alkalosis with high urine chloride","Normal anion gap metabolic acidosis with hyperchloraemia"],"sol":"Answer: Hypochloraemic, hypokalaemic metabolic alkalosis with low urine chloride (saline-responsive).\n\nMechanism:\n• Vomiting loses HCl from the stomach, so bicarbonate rises (generation of alkalosis).\n• Volume loss activates renin-angiotensin-aldosterone: the kidney keeps sodium and bicarbonate and wastes potassium and H+ (maintenance of alkalosis).\n• Potassium falls mainly through the kidney (aldosterone), not the vomit.\n• Paradoxical aciduria: in severe depletion the kidney excretes H+ despite alkalaemia, to save sodium and potassium.\n• Compensation: hypoventilation (PaCO2 rises).\n\nUrine chloride:\n• Below 20 mmol/L: saline-responsive (vomiting, nasogastric suction, past diuretic use).\n• Above 20: saline-resistant (hyperaldosteronism, Cushing, Bartter, Gitelman, current diuretic use).\n\nTreatment: IV 0.9% saline with potassium chloride.\n\nDiarrhoea alone causes the OPPOSITE: normal anion gap metabolic acidosis.","img":null},{"s":"ENT","t":"Otology: hearing loss","exam":"AIIMS 2017","q":"A 26-year-old woman noticed hearing loss in both ears that became worse during her first pregnancy. Both eardrums look normal and Rinne's test is negative on both sides. Her right-ear audiogram is shown. What is the most likely diagnosis?","c":"Otosclerosis","w":["Ménière's disease","Noise-induced hearing loss","Aminoglycoside ototoxicity"],"sol":"Answer: Otosclerosis.\n\nClues:\n• Young woman, both ears, worse in pregnancy (oestrogen speeds up the disease), normal eardrum.\n• Rinne negative = conductive loss; the audiogram shows an air-bone gap.\n• Carhart's notch: a dip in BONE conduction that is deepest at 2000 Hz (about 15 dB). It is a mechanical effect of the fixed stapes and disappears after successful stapes surgery.\n\nOther features:\n• Paracusis Willisii: hears better in noisy surroundings.\n• Schwartze sign: reddish (flamingo-pink) blush behind the drum in active disease.\n• Tympanometry: type As (stiff). Stapedial reflex absent.\n• Treatment: stapedotomy with a piston, or a hearing aid. Sodium fluoride is used for cochlear otosclerosis.\n\nWhy not the others:\n• Ménière's disease: fluctuating LOW-frequency sensorineural loss with vertigo and tinnitus; Rinne positive.\n• Noise-induced loss: sensorineural, with a notch at 4000 Hz (in both air and bone conduction).\n• Ototoxicity: sensorineural loss starting in the high frequencies.","img":{"src":"img-pyq-ent-audiogram.svg","alt":"Audiogram: air conduction around 45 to 50 dB across frequencies; bone conduction near normal with a dip at 2000 Hz","credit":"Illustration drawn for this app"}},{"s":"ENT","t":"Adenoids: adenoid hypertrophy","exam":"INI-CET 2022","q":"A 6-year-old has recurrent upper respiratory infections, mouth breathing, snoring, poor growth, a high-arched palate and hearing loss with a type B tympanogram. What is the likely cause?","c":"Adenoid hypertrophy with otitis media with effusion (adenoid facies); adenoidectomy (with grommets if needed) is the treatment","w":["Allergic rhinitis alone","Juvenile angiofibroma","Laryngomalacia"],"sol":"Answer: Adenoid facies: open mouth, pinched nose, prominent upper teeth, high-arched palate, short upper lip, dull expression.\n\nComplications:\n• Eustachian tube obstruction (OME, recurrent AOM), sinusitis, obstructive sleep apnoea (cor pulmonale in severe cases), failure to thrive.\n\nDiagnosis:\n• Lateral soft-tissue X-ray of the nasopharynx (adenoid-nasopharyngeal ratio), nasal endoscopy.\n\nContraindications to adenoidectomy:\n• Cleft palate or submucous cleft (velopharyngeal insufficiency), bleeding disorders.","img":null},{"s":"ENT","t":"Airway emergency: choking adult","exam":"NEET PG 2022","q":"A conscious adult in a restaurant suddenly chokes on food and cannot speak or cough effectively. What is the immediate management?","c":"Up to 5 back blows followed by up to 5 abdominal thrusts (Heimlich manoeuvre), repeated; start CPR if the person becomes unconscious","w":["Blind finger sweep immediately","Give water to drink","Wait for the person to cough it out regardless of severity"],"sol":"Answer: If the person can cough effectively, encourage coughing.\n\nSevere obstruction (cannot speak, cough or breathe):\n• Adults and children over 1 year: back blows and abdominal thrusts.\n• Pregnant or obese: chest thrusts.\n• Infants under 1 year: 5 back blows and 5 chest thrusts (no abdominal thrusts).\n• Unconscious: call for help, begin CPR; look in the mouth before rescue breaths.\n\nHospital:\n• Laryngoscopy and Magill forceps; rigid bronchoscopy for airway foreign bodies; emergency cricothyroidotomy if needed.\n\nCommonest site of aspirated foreign bodies:\n• Right main bronchus (wider, shorter, more vertical).","img":null},{"s":"ENT","t":"Airway: mitomycin C","exam":"NEET PG 2021","q":"Topical mitomycin C is applied during endoscopic surgery for which ENT condition, to reduce scarring?","c":"Subglottic (and laryngotracheal) stenosis, as well as choanal atresia repair and dacryocystorhinostomy","w":["Acute tonsillitis","Otosclerosis","Allergic rhinitis"],"sol":"Answer: Mitomycin C inhibits fibroblast proliferation, reducing restenosis.\n\nSubglottic stenosis:\n• Causes: prolonged intubation (commonest acquired), congenital, granulomatosis with polyangiitis, trauma, idiopathic (women).\n• Grading: Myer-Cotton (by percentage obstruction).\n• Treatment: endoscopic dilation and laser with mitomycin, steroids; laryngotracheal reconstruction or cricotracheal resection for severe disease; tracheostomy.\n\nOther uses of mitomycin:\n• Trabeculectomy and pterygium surgery in ophthalmology.","img":null},{"s":"Orthopaedics","t":"Paediatric fractures: elbow","exam":"AIIMS 2017","q":"A 6-year-old boy fell on his outstretched hand and has a swollen, painful elbow. His lateral radiograph is shown. Which artery is most at risk with this injury?","c":"Brachial artery","w":["Radial artery","Ulnar artery","Profunda brachii artery"],"sol":"Answer: Brachial artery.\n\nThe X-ray shows an extension-type supracondylar fracture of the humerus: the distal fragment is displaced and tilted backwards. This is the commonest elbow fracture in children (about 95% are extension type).\n\nWhy the brachial artery:\n• The sharp end of the proximal fragment is driven forwards into the antecubital fossa, where it can injure the brachial artery and the median nerve.\n\nNerves:\n• Anterior interosseous nerve (a median nerve branch) is the nerve most often injured in the extension type. Test: can the child make an \"OK\" sign?\n• Posterolateral displacement puts the median nerve and brachial artery at risk; posteromedial displacement puts the radial nerve at risk.\n• Flexion type: ulnar nerve.\n\nComplications:\n• Volkmann's ischaemic contracture (compartment syndrome of the forearm flexors). Warning sign: pain on passive finger extension.\n• Cubitus varus (\"gunstock deformity\") from malunion: the commonest late complication.\n\nX-ray signs: posterior fat pad sign; the anterior humeral line misses the middle third of the capitellum.\nTreatment: Gartland type II/III → closed reduction and percutaneous K-wire fixation.","img":{"src":"img-pyq-ortho-elbow-xray.png","alt":"Lateral radiograph of a child's elbow","credit":"James Heilman, MD · CC BY-SA 4.0, via Wikimedia Commons","link":"https://commons.wikimedia.org/wiki/File:Supracondylarfrac.png"}},{"s":"Orthopaedics","t":"Amputations: levels","exam":"NEET PG 2024","q":"For an ischaemic leg, a surgeon fashions a long posterior myocutaneous flap and divides the tibia about 12 to 15 cm below the knee joint, cutting the fibula slightly shorter. Which amputation is this?","c":"Below-knee (transtibial) amputation","w":["Above-knee amputation","Knee disarticulation","Syme amputation"],"sol":"Answer: Below-knee (transtibial) amputation, using a long posterior flap (Burgess technique).\n\nTechnical points:\n• The posterior flap (gastrocnemius-soleus) has a better blood supply than anterior skin in ischaemic limbs.\n• Bevel the front of the tibia. Cut the fibula 1 to 2 cm shorter than the tibia.\n• Keep the knee joint: walking with a below-knee prosthesis takes much less energy than above-knee.\n\nOther levels:\n• Syme: through the ankle, keeping the heel pad for end-bearing.\n• Knee disarticulation: through the knee joint; long, end-bearing stump.\n• Above-knee: through the femur; higher energy cost of walking.","img":null},{"s":"Orthopaedics","t":"Arthritis: hand osteoarthritis","exam":"NEET PG 2020","q":"A 62-year-old woman has painful bony swellings of the DIP and PIP joints and pain at the base of the thumb. The wrist and MCP joints are spared. What is the most likely diagnosis?","c":"Primary (nodal) osteoarthritis","w":["Rheumatoid arthritis","Psoriatic arthritis","Calcium pyrophosphate disease (pseudogout)"],"sol":"Answer: Primary nodal osteoarthritis.\n\nTypical joints in the hand:\n• DIP joints: Heberden nodes.\n• PIP joints: Bouchard nodes.\n• First carpometacarpal joint (base of thumb): \"squaring\" of the thumb base.\n• Wrist and MCP joints are usually spared.\n\nCompare:\n• Rheumatoid arthritis: MCP, PIP and wrist; DIP spared; long morning stiffness.\n• Psoriatic arthritis: DIP joints with nail changes, dactylitis, \"pencil-in-cup\" erosions.\n• Pseudogout (CPPD): knee and wrist (triangular fibrocartilage calcification), MCP 2 and 3 in haemochromatosis.\n\nTreatment:\n• Hand exercises, splints for the thumb base, topical NSAIDs.\n• Trapeziectomy for severe thumb base arthritis.","img":null},{"s":"Orthopaedics","t":"Arthritis: osteoarthritis","exam":"INI-CET 2022","q":"A 72-year-old man has pain in one knee. X-ray shows joint space narrowing on the medial side, subchondral sclerosis, cysts and marginal osteophytes. Which pathological change happens FIRST?","c":"Fibrillation and loss of articular cartilage","w":["Pannus formation from inflamed synovium","Caseating granulomas in the synovium","Deposition of urate crystals"],"sol":"Answer: Degeneration of articular cartilage (fibrillation, fissuring and loss) is the primary change.\n\nPathology:\n• Cartilage softens, splits (fibrillation) and wears away.\n• The bone beneath thickens and becomes polished (eburnation, sclerosis).\n• Subchondral cysts form; osteophytes grow at the joint margins.\n• Synovial inflammation is mild and secondary.\n\nX-ray (LOSS):\n• Loss of joint space (often medial compartment in the knee), Osteophytes, Subchondral sclerosis, Subchondral cysts.\n\nTreatment:\n• Weight loss, quadriceps exercise, analgesics (paracetamol, topical or oral NSAIDs).\n• Intra-articular steroids for flares.\n• High tibial osteotomy in younger patients; joint replacement for end-stage disease.\n\nOther options:\n• Pannus: rheumatoid arthritis.\n• Caseating granulomas: tuberculosis.\n• Urate crystals: gout.","img":null},{"s":"Radiology","t":"Spine: metabolic disease","exam":"AIIMS 2017","q":"A 45-year-old man has chronic low-back pain and stiffness. He has bluish-black pigment in the ear cartilage and sclera, and his urine turns dark on standing. His radiograph is shown. Which enzyme is deficient?","c":"Homogentisate 1,2-dioxygenase","w":["Phenylalanine hydroxylase","Fumarylacetoacetate hydrolase","Tyrosinase"],"sol":"Answer: Homogentisate 1,2-dioxygenase. This is alkaptonuria with ochronosis.\n\nRadiograph: dense, wafer-like calcification of many intervertebral discs with narrowing of the disc spaces.\n\nAlkaptonuria:\n• Autosomal recessive; homogentisic acid builds up in the tyrosine breakdown pathway.\n• Urine darkens on standing or when alkalinised.\n• Ochronosis: blue-black pigment in cartilage, sclera and ear; early arthritis of the spine and large joints; aortic valve disease; stones.\n• Treatment: nitisinone, which blocks an earlier enzyme in the pathway.\n\nWhy not the others:\n• Phenylalanine hydroxylase: phenylketonuria.\n• Fumarylacetoacetate hydrolase: tyrosinaemia type 1 (liver failure, cabbage-like odour).\n• Tyrosinase: oculocutaneous albinism.\n\nRadiology differential:\n• Ankylosing spondylitis: thin vertical syndesmophytes, \"bamboo spine\" and fused sacroiliac joints; discs are not densely calcified.\n• Other causes of disc calcification: CPPD disease and haemochromatosis.","img":{"src":"img-pyq-radio-spine-xray.jpg","alt":"Frontal radiograph of the lumbar spine and abdomen","credit":"Gholamreza Bagheri · CC BY-SA 3.0, via Wikimedia Commons","link":"https://commons.wikimedia.org/wiki/File:Ochronosis,_Intervertebral_discs_Calcification._ZB.jpg"}},{"s":"Radiology","t":"Abdominal X-ray: small bowel obstruction","exam":"NEET PG 2021","q":"An erect abdominal X-ray shows multiple centrally placed dilated loops with valvulae conniventes crossing the whole width of the bowel and multiple air-fluid levels in a step-ladder pattern. What is the diagnosis?","c":"Small bowel obstruction (commonest cause overall: adhesions; in many developing regions hernias and TB are also important)","w":["Large bowel obstruction (peripheral loops with haustra)","Paralytic ileus with gas throughout including the rectum","Pneumoperitoneum"],"sol":"Answer: X-ray features:\n• Small bowel: central, valvulae conniventes (\"stack of coins\"), dilated over 3 cm.\n• Large bowel: peripheral, haustra (incomplete bands), dilated over 6 cm (caecum over 9 cm risk of perforation).\n• Ileus: dilated small and large bowel with gas in the rectum.\n\nCT:\n• Imaging of choice: transition point, cause, closed loop, strangulation signs (reduced wall enhancement, mesenteric oedema, free fluid).\n\nManagement:\n• Adhesive SBO without strangulation: \"drip and suck\" (IV fluids, NG decompression), water-soluble contrast (Gastrografin) challenge.\n• Surgery for strangulation, closed loop, hernias, failure of conservative care.","img":null},{"s":"Radiology","t":"Abdominal imaging: gallstone ileus","exam":"AIIMS 2018","q":"An elderly woman with a history of gallstones has vomiting and colicky pain. Abdominal X-ray shows small bowel obstruction, gas in the biliary tree, and an ectopic calcified stone in the right iliac fossa. What is the diagnosis?","c":"Gallstone ileus (Rigler triad: pneumobilia, small bowel obstruction, ectopic gallstone), from a cholecystoduodenal fistula with the stone impacted at the terminal ileum","w":["Emphysematous cholecystitis","Sigmoid volvulus","Mesenteric ischaemia"],"sol":"Answer: Gallstone ileus: elderly women; stones usually over 2.5 cm; ileocaecal valve is the commonest site of impaction.\n\nImaging:\n• CT is most sensitive (shows fistula, pneumobilia, obstructing stone).\n\nTreatment:\n• Enterolithotomy (proximal to the stone) is the main step; fistula repair and cholecystectomy done later or not at all depending on fitness.\n\nOther causes of pneumobilia:\n• Previous sphincterotomy or biliary-enteric anastomosis, emphysematous cholecystitis (gas in gallbladder wall; diabetics), cholangitis with gas-forming organisms.\n\nBouveret syndrome:\n• Gallstone obstructing the duodenum or pylorus (gastric outlet obstruction).","img":null},{"s":"Radiology","t":"Abdominal imaging: pneumoperitoneum","exam":"NEET PG 2019","q":"An erect chest X-ray shows free air under the diaphragm. Which is NOT a cause?","c":"Uncomplicated acute pancreatitis (does not produce free intraperitoneal gas)","w":["Perforated duodenal ulcer","Recent laparotomy or laparoscopy (post-operative air)","Perforated colonic diverticulum or typhoid ileal perforation"],"sol":"Answer: Free gas signs:\n• Erect chest X-ray: crescent under the hemidiaphragm (as little as 1 mL can be seen if upright for 10 minutes).\n• Supine abdominal film: Rigler (double-wall) sign, football sign (large volume in infants), falciform ligament sign, triangle sign.\n• CT is most sensitive.\n\nNon-surgical causes:\n• Post-operative (up to about 1 to 2 weeks), peritoneal dialysis, mechanical ventilation (barotrauma), pneumatosis cystoides intestinalis.\n\nChilaiditi sign:\n• Colon interposed between liver and diaphragm (mimics free air; haustra visible).","img":null},{"s":"Pharmacology","t":"Addiction: disulfiram","exam":"INI-CET 2022","q":"Which statement about disulfiram is correct?","c":"It inhibits aldehyde dehydrogenase, so drinking alcohol causes acetaldehyde build-up with flushing, throbbing headache, nausea, vomiting and hypotension","w":["It reduces craving by blocking opioid receptors","It is safe to start in an intoxicated patient","Effects disappear within an hour of the last dose"],"sol":"Answer: Disulfiram deters drinking; it works only if the patient is motivated and supervised.\n\nKey points:\n• Start at least 12 to 24 hours after the last drink; effect can last up to 2 weeks after stopping.\n• Avoid hidden alcohol (mouthwash, cough syrups, sauces).\n• Side effects: hepatitis, neuropathy, psychosis, metallic taste; contraindicated in heart disease and psychosis.\n\nDrugs with disulfiram-like reactions:\n• Metronidazole, some cephalosporins (cefoperazone), sulfonylureas (chlorpropamide), griseofulvin, procarbazine.\n\nOther drugs for alcohol dependence:\n• Naltrexone (reduces craving and reward; avoid with opioids or liver failure).\n• Acamprosate (NMDA/GABA modulation; renally excreted).\n• Baclofen, topiramate (off-label).\n\nWithdrawal:\n• Benzodiazepines (chlordiazepoxide), thiamine.","img":null},{"s":"Pharmacology","t":"Addiction: opioid maintenance","exam":"NEET PG 2024","q":"Which drug is used for long-term maintenance (substitution) therapy in opioid dependence?","c":"Buprenorphine (often combined with naloxone) or methadone","w":["Naloxone alone","Butorphanol","Clonidine alone"],"sol":"Answer: Buprenorphine (partial mu agonist, kappa antagonist) or methadone (full mu agonist, long half-life).\n\nBuprenorphine:\n• High receptor affinity, slow dissociation: blocks other opioids; ceiling effect on respiratory depression (safer).\n• Sublingual; combined with naloxone to discourage injection.\n• Can cause precipitated withdrawal if given too early (wait for mild withdrawal).\n\nMethadone:\n• Oral, once daily; QT prolongation; many drug interactions.\n\nOther drugs:\n• Naltrexone (antagonist): relapse prevention after detoxification; must be opioid-free.\n• Naloxone: emergency reversal of overdose (short-acting; repeat or infusion).\n• Clonidine, lofexidine: relieve withdrawal symptoms (autonomic).\n\nWithdrawal signs:\n• Yawning, lacrimation, rhinorrhoea, dilated pupils, piloerection, diarrhoea, cramps; not usually life-threatening in adults.","img":null},{"s":"Pharmacology","t":"Adverse drug reactions: ampicillin rash","exam":"AIIMS 2020","q":"A patient with fever and sore throat is given ampicillin and two days later develops a widespread itchy maculopapular rash. Which underlying infection makes this very likely?","c":"Infectious mononucleosis (Epstein-Barr virus)","w":["Streptococcal pharyngitis","Diphtheria","Influenza"],"sol":"Answer: Up to 70 to 100% of people with EBV infection develop a non-allergic maculopapular rash with ampicillin or amoxicillin. It does not mean true penicillin allergy.\n\nClues to EBV:\n• Fever, exudative pharyngitis, posterior cervical lymphadenopathy, splenomegaly, atypical lymphocytes, positive heterophile (Monospot) test.\n\nAdvice:\n• Avoid contact sports for at least 3 to 4 weeks (splenic rupture risk).\n• No specific antiviral.\n\nOther drug rashes:\n• Also seen with ampicillin in CLL and with allopurinol co-administration.\n• True penicillin allergy: urticaria, angioedema, anaphylaxis (IgE).\n• Severe reactions: SJS/TEN, DRESS (fever, eosinophilia, organ involvement).","img":null},{"s":"Pharmacology","t":"Alkylating agents: cyclophosphamide","exam":"INI-CET 2022","q":"Cyclophosphamide is a prodrug. What is its first active metabolite, and which metabolite causes haemorrhagic cystitis?","c":"4-hydroxycyclophosphamide (made by liver CYP enzymes); acrolein causes haemorrhagic cystitis","w":["N-hydroxycyclophosphamide; formaldehyde","Phosphoramide only; ammonia","4-ketocyclophosphamide; NAPQI"],"sol":"Answer: Liver CYP2B6 and others form 4-hydroxycyclophosphamide, which breaks down to phosphoramide mustard (the alkylating agent) and acrolein (bladder toxin).\n\nPrevention of bladder toxicity:\n• Mesna (binds acrolein in the urine), hydration, frequent voiding.\n\nOther side effects:\n• Myelosuppression, alopecia, infertility (ovarian and testicular failure), SIADH, cardiotoxicity at high doses, bladder cancer, secondary leukaemia.\n\nUses:\n• Lymphomas, breast cancer, sarcomas; immunosuppression (lupus nephritis, ANCA vasculitis, nephrotic syndrome); conditioning before stem cell transplant.\n\nIfosfamide:\n• Similar; also nephrotoxicity (Fanconi syndrome) and encephalopathy (treat with methylene blue).","img":null},{"s":"Pathology","t":"Vesiculobullous disorders","exam":"AIIMS 2017","q":"A 40-year-old woman has flaccid skin blisters and painful oral erosions. Direct immunofluorescence (anti-IgG) of skin next to a lesion is shown. Which antigen is the main target in her disease?","c":"Desmoglein 3","w":["BP180 (type XVII collagen)","Type VII collagen","Desmoglein 1 only"],"sol":"Answer: Desmoglein 3. This is pemphigus vulgaris.\n\nThe picture shows IgG deposited BETWEEN keratinocytes all through the epidermis: the \"fishnet\" or \"chicken-wire\" pattern. Autoantibodies against desmoglein 3 break the desmosomes, so cells separate (acantholysis) just above the basal layer.\n\nKey features:\n• Suprabasal blister; basal cells stay attached like a \"row of tombstones\".\n• Tzanck smear: rounded acantholytic cells.\n• Nikolsky sign positive; oral lesions often come first.\n• Mucosal-dominant disease = anti-Dsg3; mucocutaneous disease = anti-Dsg3 and anti-Dsg1.\n\nWhy not the others:\n• BP180 / BP230: bullous pemphigoid. Tense subepidermal blisters, LINEAR IgG and C3 along the basement membrane.\n• Type VII collagen: epidermolysis bullosa acquisita (also linear, on the dermal side of salt-split skin).\n• Desmoglein 1 alone: pemphigus foliaceus. Superficial (subcorneal) blisters with no mouth lesions.\n\nTreatment: systemic corticosteroids with rituximab.","img":{"src":"img-pyq-path-dif-skin.jpg","alt":"Direct immunofluorescence of epidermis: bright green staining outlining the keratinocytes","credit":"Emmanuelm · CC BY 3.0, via Wikimedia Commons","link":"https://commons.wikimedia.org/wiki/File:Pemphigus_immunofluorescence.jpg"}},{"s":"Pathology","t":"Adrenal: incidentaloma","exam":"INI-CET 2023","q":"What is the commonest cause of an adrenal mass found incidentally on CT?","c":"Non-functioning adrenocortical adenoma","w":["Phaeochromocytoma","Adrenocortical carcinoma","Aldosterone-producing adenoma"],"sol":"Answer: Most incidentalomas are benign, non-functioning adenomas (lipid-rich, under 10 HU on non-contrast CT, rapid contrast washout).\n\nWork-up for every incidentaloma:\n• 1 mg overnight dexamethasone suppression test (mild autonomous cortisol secretion is the commonest hormonal abnormality).\n• Plasma or urine metanephrines (phaeochromocytoma).\n• Aldosterone:renin ratio if hypertensive or hypokalaemic.\n\nSuspicious for malignancy:\n• Over 4 cm, irregular, heterogeneous, over 10 HU, slow washout, growth over time.\n\nSurgery:\n• Functioning tumours, suspicious features.","img":null},{"s":"Pathology","t":"Ageing syndromes: Werner syndrome","exam":"NEET PG 2020","q":"Premature ageing in Werner syndrome is caused by a defect in which protein?","c":"A DNA helicase (WRN, RecQ family), causing faulty DNA repair and replication","w":["Increased telomerase activity","Lamin A (seen in progeria)","Collagen type I"],"sol":"Answer: Werner syndrome (\"adult progeria\"): autosomal recessive; onset after puberty: grey hair, cataracts, skin atrophy, diabetes, osteoporosis, atherosclerosis, cancers (sarcomas).\n\nRelated disorders:\n• Hutchinson-Gilford progeria: LMNA mutation (lamin A, progerin), childhood onset, death from heart disease in teens.\n• Bloom syndrome: BLM helicase; short stature, sun-sensitive rash, cancers.\n• Rothmund-Thomson: RECQL4.\n• Ataxia-telangiectasia: ATM.\n• Xeroderma pigmentosum: nucleotide excision repair.\n• Fanconi anaemia: interstrand crosslink repair.","img":null},{"s":"Pathology","t":"Ageing: sirtuins","exam":"INI-CET 2022","q":"What is the role of sirtuins in ageing?","c":"They are NAD-dependent protein deacetylases that promote DNA repair, metabolic efficiency and stress resistance; their activation is linked to longer lifespan (e.g. with caloric restriction)","w":["They shorten telomeres","They promote insulin resistance","They are pro-inflammatory cytokines"],"sol":"Answer: Sirtuins (SIRT1 to SIRT7) act on histones and other proteins.\n\nEffects:\n• Increase expression of genes that improve metabolism and repair, inhibit metabolic and inflammatory pathways (NF-κB), improve insulin sensitivity, protect mitochondria.\n• Activated when NAD+ is high (caloric restriction, exercise).\n• Resveratrol was proposed as an activator (evidence weak).\n\nOther longevity pathways:\n• Reduced IGF-1/insulin signalling, mTOR inhibition (rapamycin extends lifespan in animals), AMPK activation (metformin under study).","img":null},{"s":"Physiology","t":"Bladder physiology: cystometrogram","exam":"NEET PG 2022","q":"On a cystometrogram, bladder pressure stays low while a large volume is added during filling. Which principle mainly explains this?","c":"Law of Laplace (P = 2T/r): as the bladder radius increases, wall tension rises without much increase in pressure; plus smooth muscle stress relaxation","w":["Poiseuille law","Boyle law","Starling law of the heart"],"sol":"Answer: Laplace law and the plasticity of bladder smooth muscle keep pressure low during filling (high compliance).\n\nCystometrogram phases:\n• Ia: small initial rise in pressure with the first volume.\n• Ib: long flat segment (accommodation).\n• II: steep rise near capacity; strong urge; voiding contraction.\n\nVolumes (adult):\n• First desire at about 150 mL, normal desire at about 250 to 300 mL, strong desire and capacity about 400 to 500 mL.\n\nMicturition reflex:\n• Spinal (S2 to S4 parasympathetic) coordinated by the pontine micturition centre; cortex gives voluntary control.\n• Sympathetic (T10 to L2): relaxes detrusor, contracts internal sphincter (storage).\n• Pudendal: external sphincter.\n\nClinical:\n• Detrusor overactivity: involuntary contractions during filling (urge incontinence).\n• Poor compliance (high pressure) damages kidneys (neurogenic bladder).","img":null},{"s":"Physiology","t":"Blood groups: ABO system","exam":"INI-CET 2024","q":"Which statement about the ABO blood group system is INCORRECT?","c":"Anti-A and anti-B antibodies are present at birth","w":["A and B antigens are carbohydrate structures on red cells","Anti-A and anti-B are mainly IgM","Group O has the H antigen without A or B sugar additions"],"sol":"Answer: ABO antibodies are not present at birth; they develop at 3 to 6 months after exposure to similar antigens on gut bacteria and food (\"naturally occurring\").\n\nKey facts:\n• Antigens: oligosaccharides on glycoproteins and glycolipids; added to the H antigen by glycosyltransferases (A adds N-acetylgalactosamine, B adds galactose).\n• Bombay phenotype (hh): lacks H, so has anti-H; can receive only Bombay blood.\n• Antibodies: IgM (do not cross the placenta; cause intravascular haemolysis in mismatched transfusion).\n• Group O mothers can make IgG anti-A/anti-B, causing mild ABO haemolytic disease of the newborn (even in the first pregnancy).\n\nUniversal:\n• Red cell donor: O negative. Plasma donor: AB.\n\nNewborns:\n• Reverse (serum) grouping is not done, because the antibodies may come from the mother or are absent.","img":null},{"s":"Physiology","t":"Body fluids: Darrow-Yannet diagrams","exam":"AIIMS 2018","q":"In a Darrow-Yannet diagram, the extracellular fluid volume increases and the intracellular volume decreases, with osmolality of both rising. Which situation fits?","c":"Infusion of hypertonic saline (or excessive salt intake)","w":["Infusion of isotonic saline","Drinking a large volume of water","Diarrhoea with isotonic fluid loss"],"sol":"Answer: Hypertonic NaCl stays in the ECF and raises its osmolality, drawing water out of cells: ECF expands, ICF shrinks, both become hypertonic.\n\nOther patterns:\n• Isotonic saline infusion: ECF expands; no change in ICF or osmolality.\n• Isotonic fluid loss (diarrhoea, haemorrhage): ECF shrinks; ICF and osmolality unchanged.\n• Water intake or SIADH: both compartments expand; osmolality falls.\n• Water loss (sweating, diabetes insipidus): both shrink; osmolality rises.\n• Salt loss more than water (adrenal insufficiency): ECF shrinks, ICF expands, osmolality falls.\n\nKey rule:\n• Water moves freely across cell membranes to equalise osmolality; sodium stays mainly in the ECF.","img":null},{"s":"Physiology","t":"Body fluids: indicator dilution","exam":"AIIMS 2020","q":"Which indicator is used to measure each body fluid compartment by the dilution principle?","c":"Plasma volume: radio-iodinated albumin or Evans blue; ECF: inulin, mannitol or sucrose; total body water: deuterium oxide or tritiated water","w":["Plasma volume: inulin; ECF: Evans blue","Total body water: mannitol; ECF: heavy water","ICF: measured directly with Evans blue"],"sol":"Answer: Volume = amount given (minus amount excreted) ÷ concentration at equilibrium.\n\nIndicators:\n• Plasma volume: I-125 albumin, Evans blue (T-1824).\n• Blood volume: Cr-51 labelled red cells, or plasma volume ÷ (1 − haematocrit).\n• ECF: inulin, mannitol, sucrose, radioactive sodium, thiosulfate.\n• Total body water: deuterium oxide (D2O), tritiated water, antipyrine.\n\nCalculated:\n• ICF = total body water − ECF.\n• Interstitial fluid = ECF − plasma volume.\n\nExample:\n• 10 g mannitol given; 1 g excreted; plasma concentration 0.6 mg/mL (0.6 g/L) at equilibrium: ECF = (10 − 1) ÷ 0.6 = 15 L.\n\nGibbs-Donnan effect:\n• Non-diffusible negatively charged proteins (mainly inside cells and in plasma) affect the distribution of diffusible ions.","img":null},{"s":"Paediatrics","t":"Cardiology: Nadas criteria","exam":"INI-CET 2024","q":"Nadas criteria help decide whether heart disease is present in a child with a murmur. Which is NOT one of them?","c":"Raised cardiac troponin T","w":["Diastolic murmur","Congestive heart failure","Abnormal chest X-ray"],"sol":"Answer: Troponin is not part of Nadas criteria.\n\nNadas criteria (one major or two minor suggests heart disease):\n• Major: systolic murmur grade 3 or more, diastolic murmur, cyanosis, congestive heart failure.\n• Minor: systolic murmur under grade 3, abnormal second heart sound, abnormal ECG, abnormal chest X-ray, abnormal blood pressure.\n\nInnocent murmurs:\n• Soft (grade 1 to 2), systolic (except venous hum), short, change with posture.\n• No other cardiac signs.\n• Examples: Still murmur (musical, left lower sternal edge), venous hum, pulmonary flow murmur.","img":null},{"s":"Paediatrics","t":"Cardiology: coarctation of the aorta","exam":"INI-CET 2022","q":"An 8-year-old always has cold feet. Femoral pulses are weak and delayed compared with the radial pulse, and right arm blood pressure is 140/90 mmHg. Chest X-ray shows notching of the lower borders of the ribs. What is the anatomical problem?","c":"Narrowing of the aorta just beyond the origin of the left subclavian artery, near the ductus (juxtaductal coarctation)","w":["Hypertrophy of the ductus arteriosus","Narrowing of the ascending aorta above the valve","Stenosis of the pulmonary artery"],"sol":"Answer: Coarctation of the aorta, usually juxtaductal, just distal to the left subclavian artery.\n\nFeatures in older children:\n• Hypertension in the arms, weak and delayed femoral pulses (radiofemoral delay), cold legs, claudication.\n• Systolic murmur at the back between the scapulae; continuous murmurs from collaterals.\n\nX-ray:\n• Rib notching (3rd to 8th ribs) from enlarged intercostal collaterals, usually after age 5.\n• \"Figure 3\" sign of the aorta.\n\nCollateral flow:\n• Subclavian, then internal thoracic artery, then intercostal arteries, then descending aorta below the narrowing.\n\nAssociations:\n• Bicuspid aortic valve, Turner syndrome, berry aneurysms.\n\nNewborns with severe coarctation:\n• Duct-dependent; shock as the duct closes. Prostaglandin E1 keeps it open.\n\nTreatment:\n• Surgical repair or balloon angioplasty and stenting.\n• Long-term hypertension follow-up.","img":null},{"s":"Paediatrics","t":"Cardiology: cyanotic heart disease with high pulmonary flow","exam":"INI-CET 2022","q":"A cyanosed newborn has a chest X-ray showing increased pulmonary vascular markings. Which defect is most likely?","c":"Transposition of the great arteries","w":["Tetralogy of Fallot","Tricuspid atresia with pulmonary stenosis","Pulmonary atresia with intact septum"],"sol":"Answer: Transposition of the great arteries (TGA).\n\nCyanotic heart disease by lung blood flow:\n• Increased: TGA, total anomalous pulmonary venous connection (TAPVC), truncus arteriosus, single ventricle without pulmonary stenosis, hypoplastic left heart.\n• Decreased: tetralogy of Fallot, tricuspid atresia, pulmonary atresia, Ebstein anomaly.\n\nTGA:\n• Commonest cyanotic lesion presenting in the newborn period.\n• \"Egg on a string\" X-ray, severe cyanosis that does not improve with oxygen.\n• Needs prostaglandin E1 to keep the duct open, balloon atrial septostomy, then arterial switch operation in the first weeks.\n\nTetralogy of Fallot:\n• \"Boot-shaped\" heart with oligaemic lungs; tet spells.","img":null},{"s":"Paediatrics","t":"Cardiology: total anomalous pulmonary venous connection","exam":"INI-CET 2021","q":"In which congenital heart defect is oxygen saturation almost the same in all four heart chambers and the great arteries?","c":"Total anomalous pulmonary venous connection (TAPVC)","w":["Tetralogy of Fallot","Transposition of the great arteries","Tricuspid atresia"],"sol":"Answer: TAPVC. All pulmonary venous (oxygenated) blood drains into the right side (systemic veins or right atrium), mixes completely, and reaches the left side only through an ASD or PFO.\n\nTypes:\n• Supracardiac (commonest): into the SVC via a vertical vein. X-ray: \"snowman\" or \"figure-of-8\" heart.\n• Cardiac: into the coronary sinus or right atrium.\n• Infracardiac: below the diaphragm into the portal system. Usually obstructed: severe cyanosis and pulmonary oedema in the newborn (\"white-out\" lungs). A surgical emergency.\n• Mixed.\n\nTreatment:\n• Surgical repair: reconnect the common pulmonary vein to the left atrium.\n\nOther mixing lesions:\n• Truncus arteriosus and single ventricle also mix, but saturations differ slightly between chambers.","img":null},{"s":"Psychiatry","t":"ADHD: non-stimulant treatment","exam":"NEET PG 2024","q":"Which drug for ADHD is a selective NORADRENALINE reuptake inhibitor (non-stimulant)?","c":"Atomoxetine","w":["Methylphenidate (stimulant: blocks dopamine and noradrenaline reuptake)","Guanfacine (alpha-2A agonist)","Modafinil (wakefulness agent)"],"sol":"Answer: ADHD treatment:\n• Stimulants (first-line in school-age children and adults): methylphenidate, amphetamines (lisdexamfetamine). Side effects: appetite loss, insomnia, growth slowing, tachycardia, tics; misuse potential.\n• Non-stimulants: atomoxetine (useful with tics, anxiety, substance misuse risk; warnings for suicidal thoughts and liver injury), viloxazine, guanfacine and clonidine (alpha-2 agonists).\n• Pre-school children: parent training first.\n\nADHD features:\n• Inattention, hyperactivity, impulsivity in two or more settings, onset before 12 years.\n\nComorbidities:\n• Oppositional defiant disorder, conduct disorder, learning disorders, anxiety, substance use in adolescence.","img":null},{"s":"Psychiatry","t":"Adolescent health: HEADSSS assessment","exam":"INI-CET 2023","q":"For which group is the HEADSSS psychosocial interview used?","c":"Adolescents (Home, Education/Employment, Activities, Drugs, Sexuality, Suicide/depression, Safety)","w":["Children under 5 years","Elderly patients with dementia","Pregnant women in labour"],"sol":"Answer: HEADSSS builds rapport and screens risks; best done with the young person alone, with explanation of confidentiality and its limits.\n\nAdolescent health in India:\n• Rashtriya Kishor Swasthya Karyakram (RKSK): nutrition, sexual and reproductive health, mental health, injuries and violence, substance misuse, NCDs; adolescent-friendly health clinics (Ujjwal clinics), peer educators (Saathiya).\n\nWarning signs:\n• School refusal, withdrawal, self-harm, substance use, abuse, eating problems.","img":null},{"s":"Psychiatry","t":"Alcohol: Korsakoff syndrome","exam":"INI-CET 2021","q":"Which statement about Korsakoff syndrome is correct?","c":"It causes severe anterograde (and some retrograde) amnesia with confabulation and preserved alertness, due to thiamine deficiency damaging the mammillary bodies and medial thalamus; it often follows untreated Wernicke encephalopathy","w":["It presents with the triad of confusion, ophthalmoplegia and ataxia (that is Wernicke encephalopathy)","It is fully reversible within days","It is caused by vitamin B12 deficiency"],"sol":"Answer: Wernicke-Korsakoff syndrome:\n• Wernicke: acute; confusion, ophthalmoplegia, ataxia (full triad in a minority); treat urgently with high-dose IV thiamine.\n• Korsakoff: chronic memory disorder; confabulation; often permanent; recovery partial in some.\n\nRisk groups:\n• Alcohol use disorder, hyperemesis gravidarum, bariatric surgery, malnutrition, refeeding.\n\nImaging:\n• MRI: symmetric signal change in mammillary bodies, medial thalami, periaqueductal grey.","img":null},{"s":"Psychiatry","t":"Alcohol: withdrawal management","exam":"NEET PG 2024","q":"A chronic alcohol user admitted after an accident is likely to develop withdrawal. What is the management of alcohol withdrawal?","c":"Benzodiazepines (chlordiazepoxide or diazepam; lorazepam if liver failure or elderly), symptom-triggered using CIWA-Ar, plus IV thiamine BEFORE glucose to prevent Wernicke encephalopathy, fluids and electrolytes (magnesium, potassium)","w":["Antipsychotics as the main treatment","Giving glucose before thiamine","Alcohol infusion"],"sol":"Answer: Withdrawal timeline after last drink:\n• 6 to 24 hours: tremor, anxiety, sweating, tachycardia, insomnia.\n• 12 to 48 hours: withdrawal seizures.\n• 12 to 48 hours: alcoholic hallucinosis (clear sensorium).\n• 48 to 72 hours: delirium tremens (confusion, visual hallucinations, autonomic instability; mortality without treatment).\n\nWernicke encephalopathy:\n• Confusion, ophthalmoplegia (nystagmus, lateral rectus palsy), ataxia; high-dose IV thiamine.\n• Korsakoff syndrome: anterograde amnesia with confabulation.\n\nRelapse prevention:\n• Acamprosate, naltrexone, disulfiram (aversive; acetaldehyde reaction), baclofen; psychosocial support.","img":null},{"s":"Biochemistry","t":"Acid-base chemistry: buffers","exam":"AIIMS 2019","q":"On a titration curve of a weak acid, where is the buffering capacity greatest?","c":"At the pH equal to the pKa, where the acid and its conjugate base are present in equal amounts (flattest part of the curve)","w":["At the start of the titration","At the equivalence point","Two pH units away from the pKa"],"sol":"Answer: Maximum buffering at pH = pKa; useful range about pKa ± 1.\n\nHenderson-Hasselbalch equation:\n• pH = pKa + log ([A-] / [HA]).\n• For bicarbonate: pH = 6.1 + log ([HCO3-] / (0.03 × PCO2)). Normal ratio 20:1 gives pH 7.4.\n\nBody buffers:\n• Bicarbonate: main extracellular buffer; powerful because it is an open system (CO2 removed by lungs, HCO3- by kidneys), despite pKa 6.1.\n• Haemoglobin (histidine imidazole groups, pKa near 7): main buffer in red cells.\n• Phosphate (pKa 6.8): intracellular and urinary buffer (titratable acid).\n• Proteins: intracellular.\n• Ammonia: urinary.\n\nAmino acids:\n• Histidine is the only amino acid with good buffering at physiological pH.","img":null},{"s":"Biochemistry","t":"Amino acid metabolism: BH4 deficiency","exam":"NEET PG 2024","q":"A child with phenylketonuria is on a strict low-phenylalanine diet with good blood levels, yet neurological problems keep worsening. Phenylalanine hydroxylase activity is normal. What is the likely cause?","c":"Tetrahydrobiopterin (BH4) deficiency (e.g. dihydropteridine reductase deficiency), which also blocks dopamine and serotonin synthesis","w":["Non-adherence to the diet","Tyrosinase deficiency","Homogentisate oxidase deficiency"],"sol":"Answer: BH4 deficiency (\"malignant PKU\"). BH4 is the cofactor for phenylalanine hydroxylase, tyrosine hydroxylase and tryptophan hydroxylase, so neurotransmitters (dopamine, serotonin) are also deficient.\n\nTreatment:\n• BH4 (sapropterin), L-dopa with carbidopa, 5-hydroxytryptophan, folinic acid (for DHPR deficiency), plus diet.\n\nClassic PKU:\n• Phenylalanine hydroxylase deficiency; musty odour, fair skin and hair, eczema, intellectual disability if untreated.\n• Treat with low-phenylalanine diet started early; tyrosine becomes essential.\n• Maternal PKU: raised phenylalanine in pregnancy causes microcephaly and heart defects; strict control before conception.\n\nScreening:\n• Newborn blood spot (Guthrie test, tandem mass spectrometry).","img":null},{"s":"Biochemistry","t":"Amino acid metabolism: alkaptonuria","exam":"NEET PG 2023","q":"An infant's nappy urine turns black when left standing. Later in life, cartilage of the ears and sclerae become bluish-black, and early arthritis develops. Which enzyme is deficient?","c":"Homogentisate 1,2-dioxygenase (homogentisic acid oxidase)","w":["Phenylalanine hydroxylase","Tyrosinase","Fumarylacetoacetate hydrolase"],"sol":"Answer: Alkaptonuria (autosomal recessive): homogentisic acid accumulates, oxidises to a dark pigment in urine and connective tissue (ochronosis).\n\nFeatures:\n• Dark urine on standing or with alkali (from infancy).\n• Ochronosis in adulthood: blue-black ear cartilage and sclera.\n• Degenerative arthritis of the spine and large joints, aortic valve calcification, kidney and prostate stones.\n\nTreatment:\n• Nitisinone (inhibits 4-hydroxyphenylpyruvate dioxygenase, reducing homogentisic acid production); low-protein diet; joint care.\n\nOther tyrosine disorders:\n• Tyrosinaemia type I (fumarylacetoacetate hydrolase): liver failure, renal Fanconi, cabbage odour; treat with nitisinone.\n• Albinism (tyrosinase): no melanin.\n• PKU (phenylalanine hydroxylase).","img":null},{"s":"Biochemistry","t":"Amino acid metabolism: arginine derivatives","exam":"NEET PG 2020","q":"Which amino acid is the common precursor of nitric oxide, urea and creatine?","c":"Arginine","w":["Glycine only","Aspartate","Alanine"],"sol":"Answer: Arginine.\n\nArginine products:\n• Nitric oxide (NO synthase, with citrulline as by-product; needs NADPH, BH4): vasodilation (cGMP), neurotransmission, macrophage killing.\n• Urea (arginase in the urea cycle, regenerating ornithine).\n• Creatine: arginine plus glycine (amidinotransferase in the kidney), then methylation by SAM (liver) to creatine; creatine phosphate in muscle; creatinine is its breakdown product.\n• Agmatine, ornithine (polyamines: putrescine, spermidine), proline.\n\nNotes:\n• Arginine is semi-essential (needed in growth, stress).\n• Citrulline is not incorporated into proteins.\n\nClinical:\n• Nitrates and nitroprusside release NO.\n• Sildenafil prevents cGMP breakdown (PDE5 inhibitor).\n• Argininaemia (arginase deficiency): spastic diplegia.","img":null},{"s":"FMT","t":"Asphyxial deaths: strangulation vs hanging","exam":"NEET PG 2022","q":"At autopsy, a ligature mark completely encircles the neck horizontally, at or below the thyroid cartilage, with uniform depth. What does this suggest?","c":"Ligature strangulation (likely homicide)","w":["Typical hanging (oblique, incomplete mark, above thyroid cartilage, with a gap at the knot)","Smothering","Drowning"],"sol":"Answer: Hanging vs ligature strangulation:\n• Hanging: oblique, incomplete mark (gap at the knot), above the thyroid cartilage, deep under the chin; salivary dribbling (ante-mortem sign); usually suicide; fracture of hyoid uncommon in young.\n• Ligature strangulation: horizontal, complete, at or below thyroid, uniform depth; congested face with petechiae; fracture of thyroid cartilage; usually homicide.\n• Manual strangulation (throttling): fingernail abrasions and bruises on the neck; hyoid fracture (inward compression) more common.\n\nOther asphyxial deaths:\n• Smothering, gagging, choking, traumatic asphyxia, positional asphyxia.","img":null},{"s":"FMT","t":"Autopsy techniques","exam":"NEET PG 2023","q":"Which autopsy technique removes the thoracic, abdominal and pelvic organs together as a single block (en masse), from the tongue to the pelvis, for later dissection?","c":"Letulle technique (en masse removal)","w":["Virchow technique (organs removed one by one)","Rokitansky technique (in situ dissection)","Ghon technique (en bloc: organs removed in functional groups)"],"sol":"Answer: Autopsy techniques:\n• Virchow: organs removed one at a time; commonest routine method.\n• Rokitansky: dissection in situ (used in infectious cases to minimise handling, e.g. HIV, hepatitis).\n• Letulle: en masse removal; preserves relationships (vascular, complex surgery cases); bulky to handle.\n• Ghon: en bloc removal in organ systems (thoracic, coeliac, intestinal, urogenital).\n\nHigh-risk autopsies (HIV, hepatitis B/C, TB):\n• Universal precautions, protective equipment, minimal aerosol-generating procedures, avoid unnecessary handling; Rokitansky or limited dissection.","img":null},{"s":"FMT","t":"Burns: ante-mortem vs post-mortem","exam":"INI-CET 2023","q":"At autopsy, a burn blister contains protein-rich fluid with a red, inflamed base. What does this indicate?","c":"An ante-mortem burn (vital reaction: inflammation, protein and leukocytes in the fluid, red line of demarcation)","w":["A post-mortem burn","Decomposition blisters","Barbiturate-induced blisters only"],"sol":"Answer: Vital reactions show the person was alive when injured.\n\nAnte-mortem burns:\n• Blister fluid rich in protein and chloride; red, inflamed base; line of redness around burns.\n• Soot in airways below the vocal cords, carboxyhaemoglobin in blood (over about 10%): alive during the fire.\n\nPost-mortem burns:\n• Blisters contain air or little fluid; pale base; no inflammation.\n\nHeat artefacts:\n• Pugilistic attitude, heat ruptures (mimic lacerations), heat haematoma (extradural).\n\nRule of nines:\n• Head 9, each arm 9, front of trunk 18, back 18, each leg 18, perineum 1 (adults); Lund-Browder chart for children.","img":null},{"s":"FMT","t":"Consent: types","exam":"NEET PG 2022","q":"A woman is counselled about hysterectomy, its benefits and complications, and agrees by signing a form. What type of consent is this?","c":"Expressed (written), informed consent","w":["Implied consent","Blanket consent","Proxy consent without the patient"],"sol":"Answer: Types of consent:\n• Implied: by conduct (patient extends arm for an injection); for routine examination.\n• Expressed: verbal or written; written for procedures, anaesthesia, surgery.\n• Informed: after explanation of nature, purpose, risks, benefits and alternatives, in understandable language.\n• Blanket consent (one general consent for everything) is not valid for specific procedures.\n\nAge:\n• 18 years for medical procedures (under 12 parents give consent; 12 to 18 for examination in some contexts).\n\nExceptions:\n• Emergencies (doctrine of necessity), therapeutic privilege (rare), court orders, notifiable diseases, MTP (woman's consent only if adult and sound mind).","img":null},{"s":"Ophthalmology","t":"Binocular vision: Worth four-dot test","exam":"NEET PG 2024","q":"A patient wearing red-green goggles views the Worth four-dot test and sees five dots. What does this indicate?","c":"Diplopia (strabismus without suppression): two red dots and three green dots seen separately","w":["Normal binocular single vision (four dots)","Suppression of the right eye (two red dots only)","Suppression of the left eye (three green dots only)"],"sol":"Answer: Worth four-dot: 1 red, 2 green, 1 white light; red lens over the right eye, green over the left.\n\nInterpretation:\n• 4 dots: normal fusion (or harmonious abnormal retinal correspondence in manifest squint).\n• 2 red dots: left eye suppression.\n• 3 green dots: right eye suppression.\n• 5 dots: diplopia (red dots on the right of green in uncrossed diplopia: esotropia; on the left in crossed diplopia: exotropia).\n• Alternating 2 and 3: alternating suppression.\n\nOther binocular tests:\n• Bagolini striated glasses, synoptophore (grades of binocular vision), stereo tests (TNO, Titmus fly).","img":null},{"s":"Ophthalmology","t":"Binocular vision: stereopsis tests","exam":"AIIMS 2019","q":"Which test assesses stereopsis (depth perception)?","c":"Titmus fly test, TNO test, Lang stereo test or Frisby test","w":["Ishihara plates","Snellen chart","Schirmer test"],"sol":"Answer: Stereopsis is the highest grade of binocular single vision.\n\nGrades of binocular vision (Worth):\n• Grade 1: simultaneous macular perception.\n• Grade 2: fusion (with fusional range).\n• Grade 3: stereopsis.\n\nTests:\n• Titmus (polaroid glasses; fly, animals, circles), TNO (red-green random dots), Lang (no glasses; good for young children), Frisby (real depth plates).\n• Synoptophore for all grades.\n\nNormal stereoacuity:\n• About 40 to 60 seconds of arc.\n\nPoor stereopsis:\n• Strabismus, amblyopia, anisometropia.","img":null},{"s":"Ophthalmology","t":"COVID-19: eye manifestations","exam":"INI-CET 2022","q":"What is the most common ocular manifestation of COVID-19?","c":"Follicular conjunctivitis","w":["Uveitis","Optic neuritis","Retinal vein occlusion"],"sol":"Answer: Conjunctivitis occurs in a small percentage of patients; tears may contain viral RNA (eye protection advised for health workers).\n\nOther associations:\n• Rhino-orbital-cerebral mucormycosis in diabetic patients given steroids (India 2021): orbital apex syndrome, vision loss, needs amphotericin B and debridement.\n• Retinal microvascular changes (cotton-wool spots), vascular occlusions.\n• Neuro-ophthalmic: cranial nerve palsies.\n\nFollicular conjunctivitis causes:\n• Adenovirus (epidemic keratoconjunctivitis), chlamydia (trachoma, inclusion conjunctivitis), molluscum, drugs (brimonidine).","img":null},{"s":"Ophthalmology","t":"Cataract surgery: IOL power after LASIK","exam":"AIIMS 2020","q":"A patient who had myopic LASIK years ago now needs cataract surgery. Why is IOL power calculation difficult, and what approach is used?","c":"LASIK changes the anterior/posterior corneal curvature ratio and keratometry, so standard formulas overestimate corneal power and cause a hyperopic surprise; special methods (Barrett True-K, Haigis-L, Shammas, clinical history method, ASCRS calculator) are used","w":["No adjustment is ever needed","Use SRK-I formula only","Use only axial length without keratometry"],"sol":"Answer: IOL power formulas use axial length (biometry: A-scan or optical, e.g. IOLMaster) and keratometry, plus effective lens position.\n\nCommon formulas:\n• SRK/T, Hoffer Q (short eyes), Holladay, Haigis, Barrett Universal II (modern, accurate).\n• SRK I: P = A − 2.5L − 0.9K (historical).\n\nPost-refractive surgery:\n• Myopic LASIK: hyperopic surprise if uncorrected.\n• Hyperopic LASIK: myopic surprise.\n• Use multiple methods and choose conservatively; warn patients.\n\nAxial length errors:\n• 1 mm error ≈ 2.5 to 3 D refractive error.","img":null},{"s":"Anaesthesia","t":"Airway assessment: Mallampati classification","exam":"NEET PG 2018","q":"On mouth opening with tongue protrusion, the soft palate, fauces and uvula are visible but the tonsillar pillars are not. Which Mallampati class is this?","c":"Class II (modified Mallampati)","w":["Class I (soft palate, fauces, uvula and pillars all visible)","Class III (soft palate and base of uvula only)","Class IV (only hard palate visible)"],"sol":"Answer: Higher classes predict more difficult laryngoscopy (with limited accuracy alone).\n\nOther airway predictors:\n• Mouth opening (inter-incisor gap under 3 cm), thyromental distance (under 6 cm), sternomental distance (under 12.5 cm), neck movement, upper lip bite test, prominent incisors, receding mandible, obesity, OSA, beard.\n\nCormack-Lehane grades (at laryngoscopy):\n• 1: full glottis; 2: posterior glottis; 3: epiglottis only; 4: no epiglottis.\n\nDifficult airway management:\n• Plan A to D (DAS guidelines): laryngoscopy, SGA, face mask, front-of-neck access (scalpel-bougie-tube cricothyroidotomy).","img":null},{"s":"Anaesthesia","t":"Airway devices: supraglottic airways","exam":"INI-CET 2024","q":"Which is a second-generation supraglottic airway device?","c":"ProSeal LMA (also i-gel, LMA Supreme, Ambu AuraGain): has a gastric drainage channel and higher seal pressure","w":["Classic LMA","Flexible (reinforced) LMA","Ambu Aura40 (first-generation, reusable)"],"sol":"Answer: First-generation SGAs: simple airway tubes (classic LMA, flexible LMA, intubating LMA Fastrach, Ambu Aura40).\n\nSecond-generation features:\n• Oesophageal drain tube (vents gastric contents, allows gastric tube), better seal for positive pressure ventilation, bite block.\n\nUses:\n• Elective anaesthesia, rescue device in failed intubation (Difficult Airway Society guidelines), CPR, conduit for fibreoptic intubation.\n\nContraindications:\n• Full stomach (aspiration risk), high airway pressures (morbid obesity, poor lung compliance), restricted mouth opening, prone surgery (relative).","img":null},{"s":"Anaesthesia","t":"Airway equipment: Murphy eye","exam":"NEET PG 2018","q":"In which device is a Murphy eye found?","c":"Endotracheal tube (a side hole near the tip that allows ventilation if the bevel opening is blocked)","w":["Nasopharyngeal airway","Laryngoscope blade","Bronchoscope"],"sol":"Answer: Endotracheal tube features:\n• Bevel (left-facing for better laryngeal view), Murphy eye, radio-opaque line, cuff (high-volume low-pressure; inflate to 20 to 30 cmH2O to prevent mucosal ischaemia), pilot balloon.\n\nSpecial tubes:\n• Reinforced (armoured) tubes: resist kinking (head and neck surgery, prone).\n• RAE tubes: preformed oral (south-facing) and nasal (north-facing) for head and neck surgery.\n• Double-lumen tubes: lung isolation (thoracic surgery); left-sided preferred.\n• Microlaryngeal tubes: small diameter, long.\n• Laser tubes: metal-wrapped for airway laser surgery.\n\nCuff pressure complications:\n• Tracheal stenosis, ischaemia; nitrous oxide diffuses into cuffs, raising pressure.","img":null},{"s":"Anaesthesia","t":"Airway: basic manoeuvres","exam":"NEET PG 2023","q":"Which manoeuvre opens the airway of an unconscious patient WITHOUT suspected cervical spine injury, and which is preferred when spinal injury is suspected?","c":"Head tilt-chin lift for no spinal injury; jaw thrust (without head tilt) when cervical spine injury is suspected","w":["Jaw thrust is never used","Head tilt-chin lift for all trauma patients","Neck flexion to open the airway"],"sol":"Answer: In unconscious patients, the tongue and soft tissues fall back and obstruct the airway.\n\nAirway adjuncts:\n• Oropharyngeal (Guedel) airway: unconscious patients without gag reflex; size from incisors to angle of jaw.\n• Nasopharyngeal airway: tolerated in semi-conscious patients and with trismus; avoid in basal skull fracture.\n\nPositioning for intubation:\n• \"Sniffing the morning air\": neck flexion and atlanto-occipital extension aligning the oral, pharyngeal and laryngeal axes; ear-to-sternal notch alignment (ramped position) in obesity.","img":null},{"s":"Dermatology","t":"Papulosquamous disorders","exam":"AIIMS 2017","q":"A 35-year-old man has well-demarcated plaques with silvery scale over the elbows and knees. His skin biopsy is shown (A: low power; B: high power, arrows on the upper epidermis). What are the collections of neutrophils within the parakeratotic stratum corneum called?","c":"Munro microabscesses","w":["Pautrier microabscesses","Civatte bodies","Kamino bodies"],"sol":"Answer: Munro microabscesses. This is psoriasis vulgaris.\n\nHistology of psoriasis:\n• Regular (psoriasiform) epidermal hyperplasia with long, evenly sized rete ridges (\"EH\" in panel A).\n• Confluent parakeratosis with loss of the granular layer (hypogranulosis).\n• Munro microabscesses: neutrophils in the stratum corneum.\n• Spongiform pustules of Kogoj: neutrophils in the stratum spinosum.\n• Thinned epidermis over the dermal papillae, which contain dilated, tortuous capillaries. This is why scraping causes pinpoint bleeding (Auspitz sign).\n\nWhy not the others:\n• Pautrier microabscesses: atypical lymphocytes in the epidermis in mycosis fungoides.\n• Civatte (colloid) bodies: dead basal keratinocytes in lichen planus.\n• Kamino bodies: pink globules at the junction in Spitz naevus.","img":{"src":"img-pyq-derm-skin-histo.jpg","alt":"Two H&E skin biopsy panels: thickened epidermis with long rete ridges, and a high-power view of the upper epidermis with arrows","credit":"Giang J, Seelen MAJ, van Doorn MBA, Rissmann R, Prens EP, Damman J. Front Immunol 2018 · CC BY 4.0, via Wikimedia Commons","link":"https://commons.wikimedia.org/wiki/File:Micrograph_of_psoriasis_vulgaris.jpg"}},{"s":"Dermatology","t":"Acne vulgaris: pathogenesis and treatment","exam":"NEET PG 2024","q":"Which factors are central to the pathogenesis of acne vulgaris?","c":"Increased sebum production (androgens), follicular hyperkeratinisation (comedones), Cutibacterium acnes colonisation and inflammation","w":["Sweat gland blockage only","Fungal infection by Malassezia only","Autoimmune destruction of hair follicles"],"sol":"Answer: Lesions:\n• Comedones (open blackheads, closed whiteheads), papules, pustules, nodules, cysts; scars.\n\nTreatment ladder:\n• Mild: topical retinoids (adapalene, tretinoin), benzoyl peroxide, topical antibiotics (clindamycin, always with BPO to limit resistance), azelaic acid.\n• Moderate: add oral doxycycline or minocycline (limit to 3 months), hormonal therapy in women (combined pill, spironolactone).\n• Severe nodulocystic or scarring: oral isotretinoin (teratogenic: pregnancy prevention programme; dry skin, raised lipids, mood monitoring).\n\nAcne fulminans:\n• Systemic symptoms, ulcerated nodules; steroids before isotretinoin.\n\nDrug-induced acne (monomorphic):\n• Steroids, lithium, isoniazid, phenytoin, EGFR inhibitors.","img":null},{"s":"Dermatology","t":"Acne: hormonal treatment","exam":"NEET PG 2023","q":"A young woman with acne not responding to oral antibiotics and isotretinoin also has irregular periods and hirsutism. What is the appropriate additional treatment?","c":"Hormonal therapy for likely PCOS: combined oral contraceptive (e.g. with cyproterone acetate or drospirenone) and/or spironolactone","w":["Increase isotretinoin dose indefinitely","Long-term antibiotics for years","Topical steroids"],"sol":"Answer: Hyperandrogenism clues:\n• Acne along the jaw line, hirsutism, irregular cycles, androgenetic alopecia, acanthosis nigricans.\n\nInvestigations:\n• Testosterone, SHBG, DHEAS, 17-OH progesterone, LH/FSH, prolactin, TSH, pelvic ultrasound, glucose and lipids.\n\nHormonal agents:\n• Combined OCPs (reduce ovarian androgen and raise SHBG), cyproterone acetate, spironolactone (anti-androgen; avoid pregnancy), flutamide (hepatotoxic).\n\nPCOS (Rotterdam criteria):\n• Two of three: oligo- or anovulation, clinical or biochemical hyperandrogenism, polycystic ovaries on ultrasound.","img":null},{"s":"Dermatology","t":"Antifungal drugs: amorolfine","exam":"NEET PG 2020","q":"Which antifungal used as a nail lacquer belongs to the morpholine class?","c":"Amorolfine (inhibits ergosterol synthesis at delta-14 reductase and delta-7,8 isomerase)","w":["Ciclopirox (hydroxypyridone)","Oxiconazole (imidazole)","Terbinafine (allylamine)"],"sol":"Answer: Topical nail lacquers:\n• Amorolfine 5% (weekly), ciclopirox 8% (daily), efinaconazole and tavaborole solutions.\n• Useful for distal subungual onychomycosis involving under half the nail without matrix involvement.\n\nSystemic therapy for onychomycosis:\n• Terbinafine (first-line for dermatophytes): fingernails 6 weeks, toenails 12 weeks; check liver function.\n• Itraconazole pulse therapy (also covers Candida and non-dermatophyte moulds).\n• Fluconazole weekly (alternative).\n\nAntifungal classes:\n• Azoles (lanosterol 14-alpha-demethylase), allylamines (squalene epoxidase), polyenes (bind ergosterol), echinocandins (glucan synthase), griseofulvin (microtubules), flucytosine (nucleic acids).","img":null}]);
;
/* js/qbank/view.js */
/* Q Bank screen: browse by subject and topic, practise with instant feedback and written explanations. */
(function(){
var IM=window.IM,esc=IM.esc;
function $(s,r){return (r||document).querySelector(s)}
function root(){return document.getElementById('qb-view')}
var st={subj:'All',topic:'All',mode:'all',q:'',run:null,exam:''};
function prog(){return IM.store.get('qb-prog',{})}      /* id -> 1 right, 0 wrong (last attempt) */
function setProg(id,ok){var p=prog();p[id]=ok?1:0;IM.store.set('qb-prog',p)}
function asObj(x,shape){return shape?{q:x.q,opts:shape.opts,a:shape.a,why:x.why,subj:x.subj,topic:x.topic,tags:x.tags,img:x.img}:{q:x.q,opts:[x.c].concat(x.w),a:0,why:x.why,subj:x.subj,topic:x.topic,tags:x.tags,img:x.img}}
function tagHTML(x){return (x.tags||[]).map(function(t){return '<span class="gt-tag'+(t==='PYQ'?' pyq':'')+'">'+esc(t)+'</span>'}).join('')}
function star(x,id){var on=IM.bm.has(x.q);return '<button type="button" class="gt-star'+(on?' on':'')+'" data-qbbm="'+id+'" aria-pressed="'+on+'">'+(on?'★ Bookmarked':'☆ Bookmark')+'</button>'}
function pool(){
  var p=prog(),qs=IM.qb.list.filter(function(x){
    if(st.subj!=='All'&&x.subj!==st.subj)return false;
    if(st.topic!=='All'&&x.topic!==st.topic)return false;
    if(st.mode==='new'&&p[x.id]!=null)return false;
    if(st.mode==='wrong'&&p[x.id]!==0)return false;
    if(st.mode==='bm'&&!IM.bm.has(x.q))return false;
    if(st.mode==='pyq'&&(x.tags||[]).indexOf('PYQ')<0)return false;
    if(st.mode==='pyt'&&(x.tags||[]).indexOf('PYT')<0)return false;
    if(st.exam&&!(x.tags||[]).some(function(t){return t.indexOf(st.exam)===0}))return false;
    if(st.q){var t=(x.q+' '+x.c+' '+x.w.join(' ')+' '+x.topic).toLowerCase();if(t.indexOf(st.q)<0)return false}
    return true});
  return qs;
}
function home(){
  var subs=IM.qb.subjects(),p=prog(),total=IM.qb.list.length,done=0,right=0;
  IM.qb.list.forEach(function(x){if(p[x.id]!=null){done++;if(p[x.id]===1)right++}});
  var cur=subs.filter(function(s){return st.subj==='All'||s.name===st.subj})[0];
  var topics=st.subj==='All'?[]:Object.keys(subs.filter(function(s){return s.name===st.subj})[0].topics);
  var n=pool().length,isP=st.mode==='pyq',pyqN=IM.qb.list.filter(function(x){return (x.tags||[]).indexOf('PYQ')>=0}).length;
  if(isP)subs=subs.map(function(s){var c=0,tp={};IM.qb.list.forEach(function(x){if(x.subj===s.name&&(x.tags||[]).indexOf('PYQ')>=0){c++;tp[x.topic]=1}});return {name:s.name,n:c,topics:tp}}).filter(function(s){return s.n});
  var h='<div class="qb-top"><div><p class="eyebrow">'+(isP?'Previous-year questions':'Q Bank')+'</p><h1>'+(isP?'PYQ practice':'Practise by subject')+'</h1><p class="sub">'+(isP?pyqN.toLocaleString('en-IN')+' questions from past NEET PG, AIIMS and INI-CET papers, by subject. Every question has a full solution; image questions show the picture with its source.':total.toLocaleString('en-IN')+' exam-style questions with written explanations. Bookmark any question, then build a Grand Test from your bookmarks, your mistakes, or chosen topics.')+'</p></div>'+
   '<div class="qb-stats"><b>'+done+'</b><span>attempted</span><b>'+(done?Math.round(right/done*100):0)+'%</b><span>last-try accuracy</span></div></div>';
  h='<p class="qb-back"><button type="button" class="gt-link" data-view="practice">← Practice</button></p>'+h;
  if(st.exam)h+='<p class="qb-examnote">Showing <b>'+esc(st.exam)+'</b> only <button type="button" class="lnk" data-qbclrexam="1">show all exams</button></p>';
  h+='<section class="gt-card"><div class="qb-filters"><label>Subject<select id="qb-subj"><option>All</option>'+subs.map(function(s){return '<option'+(st.subj===s.name?' selected':'')+' value="'+esc(s.name)+'">'+esc(s.name)+' ('+s.n+')</option>'}).join('')+'</select></label>'+
   '<label>Topic<select id="qb-topic"'+(st.subj==='All'?' disabled':'')+'><option>All</option>'+topics.map(function(t){return '<option'+(st.topic===t?' selected':'')+' value="'+esc(t)+'">'+esc(t)+'</option>'}).join('')+'</select></label>'+
   '<label>Show<select id="qb-mode">'+[['all','All questions'],['pyq','Previous-year questions (PYQ)'],['pyt','Previous-year topics (PYT)'],['new','Not attempted yet'],['wrong','Got wrong last time'],['bm','Bookmarked ('+IM.bm.list().length+')']].map(function(m){return '<option value="'+m[0]+'"'+(st.mode===m[0]?' selected':'')+'>'+m[1]+'</option>'}).join('')+'</select></label>'+
   '<label class="grow">Search<input id="qb-search" type="search" placeholder="e.g. PPH, Gleason, vaccine" value="'+esc(st.q)+'"></label></div>'+
   '<div class="gt-go"><button class="btn" data-qbstart="1"'+(n?'':' disabled')+'>Practise '+Math.min(n,20)+' of '+n+' questions</button><button class="btn alt" data-qbstart="all"'+(n?'':' disabled')+'>Practise all '+n+'</button><button class="btn ghost" data-qbbrowse="1"'+(n?'':' disabled')+'>Browse with answers</button></div></section>';
  h+='<section class="qb-tiles" aria-label="Subjects">'+subs.map(function(s){var d=0;IM.qb.list.forEach(function(x){if(x.subj===s.name&&p[x.id]!=null&&(!isP||(x.tags||[]).indexOf('PYQ')>=0))d++});var pc=Math.round(d/s.n*100);return '<button type="button" class="qb-tile'+(st.subj===s.name?' on':'')+'" data-qbsub="'+esc(s.name)+'"><b>'+esc(s.name)+'</b><span>'+s.n+(s.n===1?' question · ':' questions · ')+Object.keys(s.topics).length+(Object.keys(s.topics).length===1?' topic':' topics')+'</span><i style="--p:'+pc+'%"></i></button>'}).join('')+'</section>';
  if(!isP&&pyqN)h=h.replace('<section class="qb-tiles"','<section class="qb-pyqcta"><div><b>Previous-year questions</b><span>'+pyqN.toLocaleString('en-IN')+' PYQs with full solutions</span></div><button class="btn" type="button" data-view="pyq">Open PYQs →</button></section><section class="qb-tiles"');
  if(st.browse){var lim=st.lim||25,qs=pool();
    h+='<section class="gt-card"><h2>Browse <small>'+qs.length+' questions</small></h2>'+qs.slice(0,lim).map(function(x){return '<article class="qb-item"><header><span class="gt-subj">'+esc(x.subj)+' · '+esc(x.topic)+'</span>'+tagHTML(x)+star(x,x.id)+'</header><p class="gt-stem sm">'+esc(x.q)+'</p>'+IM.fig(x.img)+'<ul class="gt-ropts">'+[x.c].concat(x.w).map(function(o,i){return '<li class="'+(i===0?'ok':'')+'"><span class="gt-l">'+(i===0?'✓':'•')+'</span>'+esc(o)+(i===0?' <em>correct</em>':'')+'</li>'}).join('')+'</ul><details class="gt-why sol-box"><summary><b>Solution</b></summary>'+IM.sol(x.why)+IM.vid(x.q)+'</details></article>'}).join('')+
    (qs.length>lim?'<div class="gt-go center"><button class="btn alt" data-qbmore="1">Show 25 more</button></div>':'')+'</section>'}
  return h;
}
function practice(){
  var r=st.run,x=r.qs[r.i];
  if(r.i>=r.qs.length){
    var pct=Math.round(r.right/r.qs.length*100);
    return '<section class="gt-card center"><p class="eyebrow">Practice complete</p><h1>'+r.right+' <small>/ '+r.qs.length+'</small></h1><p class="sub">'+pct+'% correct.'+(r.wrongIds.length?' You can revisit the '+r.wrongIds.length+' you missed using the “Got wrong last time” filter.':' Clean sweep.')+'</p><div class="gt-go center"><button class="btn" data-qbhome="1">Back to Q Bank</button></div></section>';
  }
  var s=r.shape;
  var h='<div class="qb-bar"><button class="gt-link" data-qbhome="1">← Q Bank</button><span>Question '+((r.offset||0)+r.i+1)+' of '+(r.total||r.qs.length)+'</span><span>✓ '+r.right+'</span></div>'+
   '<section class="gt-card"><div class="gt-qh"><span class="gt-subj">'+esc(x.subj)+' · '+esc(x.topic)+'</span>'+tagHTML(x)+star(x,x.id)+'</div><p class="gt-stem">'+esc(x.q)+'</p>'+IM.fig(x.img)+'<div class="qb-opts">'+
   s.opts.map(function(o,i){var cls='gt-opt';if(r.sel!=null){if(i===s.a)cls+=' ok';else if(i===r.sel)cls+=' no'}return '<button type="button" class="'+cls+'" data-qbopt="'+i+'"'+(r.sel!=null?' disabled':'')+'><span class="gt-l">'+String.fromCharCode(65+i)+'</span><span>'+esc(o)+'</span></button>'}).join('')+'</div>';
  if(r.sel!=null)h+='<div class="gt-why"><b>'+(r.sel===s.a?'Correct.':'Not quite. Answer: '+String.fromCharCode(65+s.a)+'.')+'</b>'+IM.sol(x.why)+IM.vid(x.q)+'</div><div class="gt-go"><button class="btn" data-qbnext="1">'+(r.i+1<r.qs.length?'Next question':'See result')+'</button></div>';
  return h+'</section>';
}
function saveRun(next){var r=st.run;if(!r)return;
  if(next>=r.qs.length){IM.store.set('qb-run',null);return}
  IM.store.set('qb-run',{pyq:st.mode==='pyq',rem:r.qs.slice(next,next+300).map(function(x){return IM.qbKey(x.q)}),done:next+(r.offset||0),total:r.total||r.qs.length,right:r.right,wrong:r.wrongIds.slice(0,300)});
  if(IM.resume)IM.resume.mark({type:st.mode==='pyq'?'pyq':'qb'});
}
IM.qbResume=function(){
  var sv=IM.store.get('qb-run',null);if(!sv||!sv.rem)return false;
  var byKey={};IM.qb.list.forEach(function(x){byKey[IM.qbKey(x.q)]=x});
  var qs=sv.rem.map(function(k){return byKey[k]}).filter(Boolean);if(!qs.length)return false;
  st.mode=sv.pyq?'pyq':'all';st.subj='All';st.topic='All';st.browse=false;
  st.run={qs:qs,i:0,right:sv.right||0,sel:null,wrongIds:sv.wrong||[],shape:IM.qb.shaped(qs[0]),offset:sv.done||0,total:sv.total||qs.length};
  render();window.scrollTo({top:0});return true;
};
function render(){var el=root();if(!el)return;el.innerHTML=st.run?practice():home()}
IM.qbShow=function(p){if(p!=null&&(st.mode==='pyq')!==!!p&&!(p===false&&(st.mode==='pyt'||st.mode==='wrong'||st.mode==='bm'||st.mode==='new'))){st.mode=p?'pyq':'all';st.subj='All';st.topic='All';st.exam='';st.browse=false;st.run=null}render()};
IM.qbOpen=function(o){IM.setView(o.pyq?'pyq':'qb');st.mode=o.mode||(o.pyq?'pyq':'all');st.subj=o.subj||'All';st.topic='All';st.exam=o.exam||'';st.q='';st.browse=false;st.run=null;render();window.scrollTo({top:0})};
function begin(all){
  var qs=IM.shuffle(pool().slice());if(all!=='all')qs=qs.slice(0,20);
  st.run={qs:qs,i:0,right:0,sel:null,wrongIds:[],shape:qs[0]&&IM.qb.shaped(qs[0])};saveRun(0);render();window.scrollTo({top:0});
}
document.addEventListener('click',function(e){
  var t=e.target,x;if(!root()||!root().contains(t))return;
  if((x=t.closest('[data-qbsub]'))){st.subj=(st.subj===x.dataset.qbsub?'All':x.dataset.qbsub);st.topic='All';st.browse=false;render();return}
  if((x=t.closest('[data-qbstart]'))){begin(x.dataset.qbstart);return}
  if((x=t.closest('[data-qbbm]'))){var it=IM.qb.list[+x.dataset.qbbm];if(it){var on=IM.bm.toggle(asObj(it,st.run&&st.run.shape&&st.run.qs[st.run.i]===it?st.run.shape:null));if(IM.toast)IM.toast(on?'Bookmarked. You can add it to a Grand Test.':'Bookmark removed.');var yy=window.scrollY;render();window.scrollTo({top:yy})}return}
  if(t.closest('[data-qbbrowse]')){st.browse=true;st.lim=25;render();return}
  if(t.closest('[data-qbmore]')){st.lim=(st.lim||25)+25;render();return}
  if(t.closest('[data-qbclrexam]')){st.exam='';render();return}
  if(t.closest('[data-qbhome]')){st.run=null;render();window.scrollTo({top:0});return}
  if((x=t.closest('[data-qbopt]'))&&st.run&&st.run.sel==null){var r=st.run,i=+x.dataset.qbopt,ok=i===r.shape.a;r.sel=i;if(ok)r.right++;else r.wrongIds.push(r.qs[r.i].id);setProg(r.qs[r.i].id,ok);IM.missed.mark(asObj(r.qs[r.i],r.shape),ok);saveRun(r.i+1);if(IM.stats)IM.stats.rec(ok);render();return}
  if(t.closest('[data-qbnext]')&&st.run){var r2=st.run;r2.i++;r2.sel=null;r2.shape=r2.qs[r2.i]&&IM.qb.shaped(r2.qs[r2.i]);render();window.scrollTo({top:0});return}
});
document.addEventListener('change',function(e){
  if(!root()||!root().contains(e.target))return;
  if(e.target.id==='qb-subj'){st.subj=e.target.value;st.topic='All';st.browse=false;render()}
  if(e.target.id==='qb-topic'){st.topic=e.target.value;st.browse=false;render()}
  if(e.target.id==='qb-mode'){st.mode=e.target.value;st.browse=false;render()}
});
document.addEventListener('input',function(e){if(e.target.id==='qb-search'){st.q=e.target.value.trim().toLowerCase();var pos=e.target.selectionStart;render();var n=$('#qb-search');if(n){n.focus();n.setSelectionRange(pos,pos)}}});
})();
;
/* js/gt/gt.js */
/* Grand Test (GT): a timed mock exam.
   200 questions in 4 sections of 50, 45 minutes per section, 3 hours in total.
   Edit GT.config below to change the layout, the section names or the marking.
   Questions go in js/gt/questions.js (see the instructions at the top of that file). */
(function(){
var IM=window.IM,esc=IM.esc;

var GT=window.GT={
  config:{
    title:'Grand Test',
    sections:[
      {name:'Section 1',minutes:45,count:50},
      {name:'Section 2',minutes:45,count:50},
      {name:'Section 3',minutes:45,count:50},
      {name:'Section 4',minutes:45,count:50}
    ],
    marks:{right:1,wrong:-1/3},   /* +1 for a right answer, minus one third for a wrong one. Set wrong to 0 for no negative marking. */
    sampleFill:true               /* default for the "fill empty slots with sample questions" switch */
  },
  bank:[[],[],[],[]]              /* filled by GT.add / GT.addAll from js/gt/questions.js */
};

/* ---------- question bank API ---------- */
function mk(l,subj){
  var q,opts,c,why,sb,tg;
  var im=null;if(Array.isArray(l)){q=l[0];opts=l[1];c=l[2];why=l[3];sb=l[4];tg=l[5];im=l[6]||null}else{q=l.q;opts=l.opts;c=l.a!=null?l.a:l.answer;why=l.why;sb=l.subj;tg=l.tags;im=l.img||null}
  if(typeof c==='string'&&/^[A-Ea-e]$/.test(c))c=c.toUpperCase().charCodeAt(0)-65;
  if(!q||!Array.isArray(opts)||opts.length<2||typeof c!=='number'||c<0||c>=opts.length){if(window.console)console.warn('GT: skipped a malformed question',l);return null}
  return {q:String(q),opts:opts.map(String),a:c,why:why?String(why):'Correct answer: '+LET(c)+'. '+String(opts[c])+'. (No written explanation was added for this question yet.)',subj:sb||subj||'General',kind:'real',tags:tg?[].concat(tg).map(String):[],img:im};
}
/* GT.add(1,[ [question,[A,B,C,D],correct,explanation,subject], ... ])  adds to section 1..4 */
GT.add=function(sec,list){var b=GT.bank[sec-1];if(!b){if(window.console)console.warn('GT.add: no section',sec);return}
  list.forEach(function(l){var q=mk(l);if(q)b.push(q)})};
/* GT.addAll([...]) fills section 1 first, then 2, 3, 4 (up to the count of each) */
GT.addAll=function(list){var si=0;list.forEach(function(l){var q=mk(l);if(!q)return;
  while(si<GT.bank.length&&GT.bank[si].length>=GT.config.sections[si].count)si++;
  if(si<GT.bank.length)GT.bank[si].push(q)})};

/* ---------- helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function root(){return document.getElementById('gt-view')}
function nz(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function fmt(ms){ms=Math.max(0,Math.round(ms/1000));var h=Math.floor(ms/3600),m=Math.floor(ms%3600/60),s=ms%60;return (h?h+':'+('0'+m).slice(-2):('0'+m).slice(-2))+':'+('0'+s).slice(-2)}
function fmtMin(ms){var m=Math.round(ms/60000);return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'}
function num(x){return Math.round(x*100)/100}
function br(s){return esc(s).replace(/\n/g,'<br>')}
function LET(i){return String.fromCharCode(65+i)}
function K(s,i){return s+':'+i}
function save(){IM.store.set('gt-run',run)}
var cfg=GT.config,run=IM.store.get('gt-run',null),last=IM.store.get('gt-last',null),ui={screen:'intro',filter:'all',modal:false,pal:false,open:{}},timer=null;
GT.history=function(){return IM.store.get('gt-hist',[])};
GT.activeRun=function(){return run&&run.phase!=='done'?run:null};
GT.examOpen=function(){return !!(run&&run.phase==='live')};
GT.leave=function(){};
function useSample(){return IM.store.get('gt-sample',cfg.sampleFill)}

/* ---------- exam patterns: NEET PG-style (180 Q, 3 h 30) and INI-CET-style (200 Q, 3 h) ----------
   Edit the numbers here. Each section has its own clock; minutes = questions x minPerQ. */
GT.patterns={
  neet:{id:'neet',name:'NEET PG pattern',title:'Grand Test · NEET PG pattern',maxTotal:180,minPerQ:7/6,marks:{right:4,wrong:-1},
        sections:[{name:'Section 1',minutes:70,count:60},{name:'Section 2',minutes:70,count:60},{name:'Section 3',minutes:70,count:60}],
        line:'180 questions · 3 h 30 min · +4 / −1'},
  inicet:{id:'inicet',name:'INI-CET pattern',title:'Grand Test · INI-CET pattern',maxTotal:200,minPerQ:0.9,marks:{right:1,wrong:-1/3},
        sections:[{name:'Section 1',minutes:45,count:50},{name:'Section 2',minutes:45,count:50},{name:'Section 3',minutes:45,count:50},{name:'Section 4',minutes:45,count:50}],
        line:'200 questions · 3 h · +1 / −⅓'}
};
function applyPattern(id){var p=GT.patterns[id];if(!p)return;
  cfg.pattern=id;cfg.title=p.title;cfg.sections=p.sections.map(function(s){return Object.assign({},s)});cfg.marks=Object.assign({},p.marks);cfg.maxTotal=p.maxTotal;cfg.minPerQ=p.minPerQ;
  while(GT.bank.length<cfg.sections.length)GT.bank.push([]);
  var sp=IM.store.get('gt-pb',null);if(sp){sp.total=p.maxTotal;IM.store.set('gt-pb',sp)}}
GT.setPattern=function(id){if(GT.noPatterns||(run&&run.phase!=='done'))return false;applyPattern(id);IM.store.set('gt-pattern',id);return true};
function ensurePattern(){if(GT.noPatterns)return;
  var id=(run&&run.pattern)||(ui.screen==='result'&&last&&last.pattern)||IM.store.get('gt-pattern','inicet');
  if(cfg.pattern!==id&&GT.patterns[id])applyPattern(id)}

/* ---------- paper builder: choose what goes into the test ---------- */
function defaultSpec(){return {total:cfg.maxTotal||200,qb:true,bm:true,missed:false,own:true,tag:'any',offS:{},offT:{}}}
function spec(){var s=IM.store.get('gt-pb',null),d=defaultSpec();if(!s)return d;Object.keys(d).forEach(function(k){if(s[k]==null)s[k]=d[k]});return s}
function saveSpec(s){IM.store.set('gt-pb',s)}
function ownCount(){return GT.bank.slice(0,cfg.sections.length).reduce(function(a,b){return a+b.length},0)}
function reshuf(o,kind){var c=o.opts[o.a],opts=IM.shuffle(o.opts.slice());return {q:o.q,opts:opts,a:opts.indexOf(c),why:o.why||('Correct answer: '+c+'.'),subj:o.subj||'General',topic:o.topic||'',tags:o.tags||[],img:o.img||null,kind:kind||'real'}}
function qbOK(x,sp){
  if(!sp.qb||sp.offS[x.subj]||sp.offT[x.subj+'|'+x.topic])return false;
  if(sp.tag!=='any'&&(x.tags||[]).indexOf(sp.tag)<0)return false;return true;
}
function sizesFor(total){var base=Math.floor(total/cfg.sections.length),rem=total-base*cfg.sections.length;return cfg.sections.map(function(_,i){return base+(i<rem?1:0)})}
function minsFor(n){return Math.max(1,Math.round(n*(cfg.minPerQ||0.9)))}
/* Builds the paper for a spec. Returns {paper, mins, avail, parts} */
function assemble(sp,dry){
  var seen={},parts={own:0,bm:0,missed:0,qb:0},extra=[];
  var own=sp.own?GT.bank.slice(0,cfg.sections.length).map(function(b){return b.map(function(q){return q})}):cfg.sections.map(function(){return []});
  own.forEach(function(b){b.forEach(function(q){seen[nz(q.q)]=1;parts.own++})});
  function push(o,kind){var k=nz(o.q);if(seen[k])return;seen[k]=1;extra.push({o:o,kind:kind});parts[kind==='bookmark'?'bm':kind==='missed'?'missed':'qb']++}
  if(sp.bm)IM.shuffle(IM.bm.list()).forEach(function(o){push(o,'bookmark')});
  if(sp.missed)IM.shuffle(IM.missed.list()).forEach(function(o){push(o,'missed')});
  var qbl=IM.qb?IM.qb.list.filter(function(x){return qbOK(x,sp)}):[];
  IM.shuffle(qbl.slice()).forEach(function(x){push({q:x.q,opts:[x.c].concat(x.w),a:0,why:x.why,subj:x.subj,topic:x.topic,tags:x.tags,img:x.img},'qbank')});
  var avail=parts.own+extra.length,total=Math.min(sp.total,avail,cfg.maxTotal||1e9);
  if(dry)return {avail:avail,total:total,parts:parts,sizes:sizesFor(total)};
  var sizes=sizesFor(total),paper=[],ex=0;
  /* priority items (bookmarks, missed) come first, so keep the first `need` and shuffle them */
  var ownTaken=own.map(function(b,i){return b.slice(0,sizes[i])}),ownN=ownTaken.reduce(function(a,b){return a+b.length},0);
  var need=total-ownN,chosen=IM.shuffle(extra.slice(0,Math.max(0,need)));
  sizes.forEach(function(n,si){
    var out=ownTaken[si].slice();
    while(out.length<n&&ex<chosen.length){var c=chosen[ex++];out.push(reshuf(c.o,c.kind==='qbank'?'qbank':c.kind))}
    paper.push(out);
  });
  return {paper:paper,mins:paper.map(function(p){return minsFor(p.length)}),avail:avail,total:total,parts:parts};
}

/* ---------- run state ---------- */
function newRun(order){
  var sp=spec(),b=assemble(sp,false);
  return {id:Date.now(),pattern:cfg.pattern||'',mode:order.length===1?'sec':'full',order:order,pos:0,phase:'ready',paper:b.paper,mins:b.mins,q:0,ans:{},mark:{},vis:{},ts:{},used:{},sample:false,started:Date.now()};
}
function curS(){return run.order[run.pos]}
function curQs(){return run.paper[curS()]}
function limitOf(s){return (run&&run.mins?run.mins[s]:cfg.sections[s].minutes)*60000}
function leaveQ(){var now=Date.now();if(run&&run.phase==='live'&&run.qstart){var k=K(curS(),run.q);run.ts[k]=(run.ts[k]||0)+(now-run.qstart)}if(run)run.qstart=now}
function goQ(i){leaveQ();run.q=Math.max(0,Math.min(curQs().length-1,i));run.vis[K(curS(),run.q)]=1;save();render()}
function startSection(){
  var s=curS();run.phase='live';run.secStart=Date.now();run.secEnd=run.secStart+limitOf(s);run.q=0;run.qstart=run.secStart;run.vis[K(s,0)]=1;ui.modal=false;save();render();
}
function submitSection(auto){
  if(!run||run.phase!=='live')return;
  leaveQ();var s=curS();run.used[s]=Math.min(Date.now()-run.secStart,limitOf(s));run.qstart=null;run.pos++;ui.modal=false;stopTimer();
  if(run.pos>=run.order.length)finish();else{run.phase='ready';run.q=0;save();render();if(auto&&IM.toast)IM.toast('Time is up. Section submitted.')}
}
function finish(){
  run.phase='done';run.endedAt=Date.now();var r=evaluate(run);
  run.order.forEach(function(si){run.paper[si].forEach(function(q,i){if(q.kind==='empty')return;var a=run.ans[K(si,i)];if(a==null)return;IM.missed.mark(q,a===q.a)})});
  var h=GT.history();h.unshift({t:run.endedAt,pattern:run.pattern||'',mode:run.mode,order:run.order,score:r.score,max:r.max,pct:r.pct,correct:r.correct,wrong:r.wrong,skipped:r.skipped,used:r.used,sample:run.sample,secs:r.secs.map(function(x){return{name:x.name,score:x.score,max:x.max,correct:x.correct,wrong:x.wrong,skipped:x.skipped}})});
  IM.store.set('gt-hist',h.slice(0,30));
  last=run;IM.store.set('gt-last',last);run=null;IM.store.set('gt-run',null);
  ui.screen='result';ui.filter='wrong';ui.lim=20;render();window.scrollTo({top:0});
  if(r.pct>=75&&IM.confetti)IM.confetti();
}
function evaluate(rn){
  var m=cfg.marks,secs=[],T={score:0,max:0,correct:0,wrong:0,skipped:0,used:0,subj:{}};
  rn.order.forEach(function(s){
    var S={s:s,name:cfg.sections[s].name,correct:0,wrong:0,skipped:0,total:0,used:rn.used[s]||0};
    rn.paper[s].forEach(function(q,i){
      if(q.kind==='empty')return;S.total++;
      var a=rn.ans[K(s,i)],sb=q.subj||'General',b=T.subj[sb]||(T.subj[sb]={t:0,c:0,w:0});b.t++;
      if(a==null||a===undefined){S.skipped++}else if(a===q.a){S.correct++;b.c++}else{S.wrong++;b.w++}
    });
    S.score=num(S.correct*m.right+S.wrong*m.wrong);S.max=num(S.total*m.right);S.pct=S.max?Math.round(S.score/S.max*100):0;
    secs.push(S);T.score+=S.score;T.max+=S.max;T.correct+=S.correct;T.wrong+=S.wrong;T.skipped+=S.skipped;T.used+=S.used;
  });
  T.score=num(T.score);T.max=num(T.max);T.pct=T.max?Math.round(T.score/T.max*100):0;T.secs=secs;return T;
}

/* ---------- timer ---------- */
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function startTimer(){
  if(timer)return;
  timer=setInterval(function(){
    if(!run||run.phase!=='live'||IM.view!=='gt'){stopTimer();return}
    var rem=run.secEnd-Date.now();
    if(rem<=0){submitSection(true);return}
    var t=$('#gt-t'),tt=$('#gt-tt'),box=$('.gt-clock');
    if(t)t.textContent=fmt(rem);
    if(tt)tt.textContent='Total left '+fmt(rem+laterMs());
    if(box){box.classList.toggle('warn',rem<5*60000&&rem>=60000);box.classList.toggle('danger',rem<60000)}
    if(rem<5*60000&&rem>=5*60000-1100&&IM.toast)IM.toast('5 minutes left in this section.');
  },1000);
}
function laterMs(){var n=0;for(var i=run.pos+1;i<run.order.length;i++)n+=limitOf(run.order[i]);return n}
window.addEventListener('beforeunload',function(e){if(run&&run.phase==='live'){e.preventDefault();e.returnValue=''}});

/* ---------- screens ---------- */
function render(){ensurePattern();
  var h;
  if(!run&&ui.screen==='result'&&last)h=resultHTML(last);
  else if(run&&run.phase==='ready')h=readyHTML();
  else if(run&&run.phase==='live')h=examHTML();
  else h=introHTML();
  root().innerHTML=h;
  if(run&&run.phase==='live')startTimer();
}
GT.show=function(){
  if(run&&run.phase==='live'&&Date.now()>=run.secEnd){submitSection(true);return}
  if(!run&&ui.screen==='result'&&!last)ui.screen='intro';
  render();
};

function chip(txt){return '<span class="gt-chip">'+txt+'</span>'}
function cb(id,on,label,extra){return '<label class="gt-cb"><input type="checkbox" data-pb="'+id+'"'+(on?' checked':'')+'><span>'+label+'</span></label>'}
function introHTML(){
  var sp=spec(),dry=assemble(sp,true),hist=GT.history(),m=cfg.marks,
      mk=m.wrong?'+'+m.right+' right, '+(m.wrong===-1/3?'−⅓':'−'+Math.abs(num(m.wrong)))+' wrong':'+'+m.right+' right, no negative marking';
  var totalMin=dry.sizes.reduce(function(a,n){return a+minsFor(n)},0),can=dry.total>0;
  var subs=IM.qb?IM.qb.subjects():[],bmN=IM.bm.list().length,msN=IM.missed.list().length,own=ownCount();
  var nPYQ=IM.qb?IM.qb.list.filter(function(x){return (x.tags||[]).indexOf('PYQ')>=0}).length:0,nPYT=IM.qb?IM.qb.list.filter(function(x){return (x.tags||[]).indexOf('PYT')>=0}).length:0;
  var h='<div class="gt-intro"><div class="gt-hero"><p class="eyebrow">Mock exam</p><h1>'+esc(cfg.title)+'</h1><p class="sub">An online exam in the same format as the computer-based test: one section at a time, its own clock, a question palette, mark for review, and negative marking. You choose what goes into the paper.</p>'+
   '<div class="gt-chips">'+chip('<b>'+dry.total+'</b> questions')+chip('<b>'+cfg.sections.length+'</b> sections')+chip('<b>'+(totalMin>=60?Math.floor(totalMin/60)+' h'+(totalMin%60?' '+(totalMin%60)+' min':''):totalMin+' min')+'</b> total')+chip(mk)+'</div></div>';
  h+='<section class="gt-card"><div class="gt-card-h"><h2>Build your test</h2><span class="gt-note">Pick topics, previous-year material and your own saved questions. Nothing is added unless you choose it.</span></div>';
  if(!GT.noPatterns)h+='<h3 class="gt-h3">1. Exam pattern</h3><div class="gt-seg" role="radiogroup" aria-label="Exam pattern">'+Object.keys(GT.patterns).map(function(k){var p=GT.patterns[k];return '<button type="button" role="radio" aria-checked="'+(cfg.pattern===k)+'" class="gt-segb'+(cfg.pattern===k?' on':'')+'" data-gtpat="'+k+'"><b>'+esc(p.name)+'</b><small>'+esc(p.line)+'</small></button>'}).join('')+'</div>';
  h+='<h3 class="gt-h3">'+(GT.noPatterns?'1':'2')+'. Size of the paper</h3><div class="gt-seg" role="radiogroup" aria-label="Paper size">'+(function(){var M=cfg.maxTotal||200,seen={},L=[[M,'Full paper'],[Math.round(M/2),'Half'],[50,'Mini'],[25,'Quick']];return L.filter(function(x){if(seen[x[0]])return false;seen[x[0]]=1;return true}).map(function(x){return [x[0],x[1],x[0]+' Q · '+fmtMin(minsFor(x[0])*60000)]})})().filter(function(x){return !cfg.maxTotal||x[0]<=cfg.maxTotal}).map(function(x){return '<button type="button" role="radio" aria-checked="'+(sp.total===x[0])+'" class="gt-segb'+(sp.total===x[0]?' on':'')+'" data-pbtotal="'+x[0]+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'}).join('')+'</div>';
  h+='<h3 class="gt-h3">'+(GT.noPatterns?'2':'3')+'. What to include</h3><div class="gt-srcs">'+
   cb('bm',sp.bm,'<b>Bookmarked questions</b> <small>'+bmN+' saved</small>')+
   cb('missed',sp.missed,'<b>Questions I got wrong before</b> <small>'+msN+' saved</small>')+
   cb('own',sp.own,'<b>Curated exam set</b> <small>'+own+' questions'+'</small>')+
   cb('qb',sp.qb,'<b>Q bank topics</b> <small>'+(IM.qb?IM.qb.list.length:0)+' questions</small>')+'</div>';
  if(sp.qb){
    h+='<h3 class="gt-h3">'+(GT.noPatterns?'3':'4')+'. Q bank: subjects and topics</h3><div class="gt-tagrow"><span>Show only</span><div class="gt-seg sm" role="radiogroup" aria-label="Question type">'+[['any','All questions'],['PYT','Previous-year topics (PYT) '+nPYT],['PYQ','Previous-year questions (PYQ) '+nPYQ]].map(function(x){return '<button type="button" role="radio" aria-checked="'+(sp.tag===x[0])+'" class="gt-segb'+(sp.tag===x[0]?' on':'')+'" data-pbtag="'+x[0]+'"><b>'+esc(x[1])+'</b></button>'}).join('')+'</div>'+
     '<button type="button" class="gt-link" data-pball="1">Select all</button><button type="button" class="gt-link" data-pbnone="1">Clear all</button></div>';
    if(sp.tag==='PYQ'&&!nPYQ)h+='<p class="gt-note">No previous-year questions are available yet.</p>';
    h+='<div class="gt-subjgrid">'+subs.map(function(sb){
      var tops=Object.keys(sb.topics),on=!sp.offS[sb.name],open=!!ui.open[sb.name];
      var cnt=IM.qb.list.filter(function(x){return x.subj===sb.name&&qbOK(x,sp)}).length;
      return '<div class="gt-subj-box'+(on?'':' off')+'"><div class="gt-subj-h"><label class="gt-cb"><input type="checkbox" data-pbs="'+esc(sb.name)+'"'+(on?' checked':'')+'><span><b>'+esc(sb.name)+'</b> <small>'+cnt+' of '+sb.n+'</small></span></label><button type="button" class="gt-link" data-pbopen="'+esc(sb.name)+'" aria-expanded="'+open+'">'+(open?'Hide topics':'Topics')+'</button></div>'+
       (open?'<div class="gt-topics">'+tops.map(function(t){return '<label class="gt-cb sm"><input type="checkbox" data-pbt="'+esc(sb.name+'|'+t)+'"'+(!sp.offT[sb.name+'|'+t]&&on?' checked':'')+(on?'':' disabled')+'><span>'+esc(t)+' <small>'+sb.topics[t]+'</small></span></label>'}).join('')+'</div>':'')+'</div>'}).join('')+'</div>';
  }
  h+='<div class="gt-sumbox"><b>'+dry.total+' questions</b> will be in this paper'+(dry.avail<sp.total?' (your selection only has '+dry.avail+')':'')+': '+[dry.parts.bm?dry.parts.bm+' bookmarked':'',dry.parts.missed?dry.parts.missed+' missed before':'',dry.parts.own?dry.parts.own+' of your own':'',dry.parts.qb?'Q bank topics':''].filter(Boolean).join(', ')+'.'+(sp.bm&&dry.parts.bm>0||sp.missed&&dry.parts.missed>0?' Bookmarked and missed questions are used first.':'')+'</div>';
  h+='<div class="gt-go"><button type="button" class="btn big" data-gtstart="full"'+(can?'':' disabled')+'>▶ Start test ('+dry.total+' Q)</button>'+(last?'<button type="button" class="btn alt big" data-gtlast="1">View last result</button>':'')+'</div>';
  h+='<div class="gt-secbtns"><span>Or practise one section only:</span>'+dry.sizes.map(function(n,i){return '<button type="button" class="gt-link" data-gtsec="'+i+'"'+(n?'':' disabled')+'>'+esc(cfg.sections[i].name)+' ('+n+' Q, '+minsFor(n)+' min)</button>'}).join('')+'</div></section>';
  h+='<section class="gt-card"><h2>How the exam works</h2><ul class="gt-rules"><li>The paper is split into '+cfg.sections.length+' sections. Each has its own clock ('+cfg.sections[0].minutes+' minutes for '+cfg.sections[0].count+' questions). When it ends the section is submitted and the next waits for you to press Start.</li>'+
   '<li>You cannot go back to a submitted section.</li><li><b>Save &amp; Next</b> keeps your answer. <b>Mark for Review &amp; Next</b> flags the question. <b>Clear Response</b> removes your answer. Marked questions that are answered still count.</li>'+
   '<li>Use the <b>star</b> to bookmark a question for later. Bookmarked and wrongly answered questions can go into your next test.</li>'+
   '<li>Keys: <kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd> to answer, <kbd>→</kbd> next, <kbd>←</kbd> previous, <kbd>M</kbd> mark, <kbd>B</kbd> bookmark.</li>'+
   '<li>Refreshing the page is safe. Your answers and the clock are kept.</li></ul></section>';
  if(hist.length)h+='<section class="gt-card"><h2>Past attempts</h2><div class="gt-tw"><table class="gt-tbl"><thead><tr><th>Date</th><th>Paper</th><th>Score</th><th>%</th><th>Right</th><th>Wrong</th><th>Left</th></tr></thead><tbody>'+
   hist.slice(0,8).map(function(x){return '<tr><td>'+new Date(x.t).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</td><td>'+(x.mode==='full'?'Full test':'Section')+'</td><td>'+x.score+' / '+x.max+'</td><td><b>'+x.pct+'%</b></td><td>'+x.correct+'</td><td>'+x.wrong+'</td><td>'+x.skipped+'</td></tr>'}).join('')+'</tbody></table></div></section>';
  h+='</div>';
  return h;
}

function readyHTML(){
  var s=curS(),sc=cfg.sections[s],first=run.pos===0,qs=run.paper[s],n=qs.filter(function(q){return q.kind!=='empty'}).length,sm=0;
  var stepper='<ol class="gt-steps">'+run.order.map(function(o,i){return '<li class="'+(i<run.pos?'done':i===run.pos?'on':'')+'"><span>'+(i<run.pos?'✓':(i+1))+'</span>'+esc(cfg.sections[o].name)+'</li>'}).join('')+'</ol>';
  return '<div class="gt-ready">'+stepper+'<div class="gt-card center"><p class="eyebrow">'+(first?'Ready to begin':'Section submitted')+'</p><h1>'+esc(sc.name)+'</h1>'+
   '<div class="gt-chips">'+chip('<b>'+n+'</b> questions')+chip('<b>'+(run.mins?run.mins[s]:sc.minutes)+'</b> minutes')+chip(cfg.marks.wrong?'Negative marking':'No negative marking')+'</div>'+
   (sm?'<p class="gt-note">'+sm+' of these are sample questions from your deck.</p>':'')+
   '<p class="gt-note">'+(first?'The clock starts when you press Start.':'Your earlier answers are locked. The clock for this section starts when you press Start.')+'</p>'+
   '<div class="gt-go center"><button type="button" class="btn big" data-gtbegin="1">Start '+esc(sc.name)+'</button><button type="button" class="btn ghost" data-gtquit="1">'+(first?'Cancel':'Leave and resume later')+'</button></div></div></div>';
}

function counts(){
  var s=curS(),qs=curQs(),c={ans:0,na:0,mk:0,nv:0,mka:0};
  qs.forEach(function(q,i){if(q.kind==='empty')return;var k=K(s,i),a=run.ans[k]!=null,v=run.vis[k],m=run.mark[k];
    if(a)c.ans++;else if(v)c.na++;else c.nv++;if(m){c.mk++;if(a)c.mka++}});
  return c;
}
function examHTML(){
  var s=curS(),sc=cfg.sections[s],qs=curQs(),q=qs[run.q],k=K(s,run.q),sel=run.ans[k],mk=!!run.mark[k],c=counts(),rem=run.secEnd-Date.now();
  var steps=run.order.map(function(o,i){return '<span class="gt-sstep '+(i<run.pos?'done':i===run.pos?'on':'')+'">'+(i<run.pos?'✓ ':'')+esc(cfg.sections[o].name)+'</span>'}).join('');
  var h='<div class="gt-exam"><div class="gt-cand"><div><b>'+esc(cfg.title)+'</b><span>Candidate: '+esc((IM.store.get('profile',{}).name||IM.store.get('gt-name','Candidate')))+'</span></div><div class="gt-cand-r"><button type="button" class="gt-fs" data-gtfs="-1" aria-label="Smaller text">A−</button><button type="button" class="gt-fs" data-gtfs="1" aria-label="Larger text">A+</button></div></div><div class="gt-bar"><div class="gt-ssteps">'+steps+'</div><div class="gt-clock'+(rem<60000?' danger':rem<5*60000?' warn':'')+'"><span class="lbl">Section time left</span><b id="gt-t">'+fmt(rem)+'</b><small id="gt-tt">Total left '+fmt(rem+laterMs())+'</small></div></div><div class="gt-grid"><section class="gt-q fs'+(IM.store.get('gt-fs',0))+'">';
  h+='<div class="gt-qh"><span class="gt-qn">Question '+(run.q+1)+' <small>of '+qs.length+'</small></span>'+(q.kind==='sample'?'<span class="gt-badge">SAMPLE</span>':'')+(q.subj&&q.kind!=='empty'?'<span class="gt-subj">'+esc(q.subj)+'</span>':'')+
   (q.kind!=='empty'?(q.tags||[]).map(function(t){return '<span class="gt-tag'+(t==='PYQ'?' pyq':'')+'">'+esc(t)+'</span>'}).join(''):'')+(q.kind!=='empty'?'<button type="button" class="gt-star'+(IM.bm.has(q.q)?' on':'')+'" data-gtbm="1" aria-pressed="'+IM.bm.has(q.q)+'" aria-label="Bookmark this question">'+(IM.bm.has(q.q)?'★ Bookmarked':'☆ Bookmark')+'</button>':'')+'<button type="button" class="gt-mark'+(mk?' on':'')+'" data-gtmark="1" aria-pressed="'+mk+'">'+(mk?'⚑ Marked for review':'⚐ Mark for review')+'</button></div>';
  if(q.kind==='empty'){
    h+='<div class="gt-empty"><b>This slot is empty.</b><p>This slot is not scored.</p></div>';
  }else{
    h+='<p class="gt-stem">'+br(q.q)+'</p>'+IM.fig(q.img)+'<div class="gt-opts" role="radiogroup" aria-label="Options">'+q.opts.map(function(o,j){return '<button type="button" role="radio" aria-checked="'+(sel===j)+'" class="gt-opt'+(sel===j?' pick':'')+'" data-gtopt="'+j+'"><span class="gt-l">'+LET(j)+'</span><span>'+esc(o)+'</span></button>'}).join('')+'</div>';
  }
  var last=run.q===qs.length-1;
  h+='<div class="gt-acts"><button type="button" class="btn ghost" data-gtprev="1"'+(run.q===0?' disabled':'')+'>← Previous</button><button type="button" class="btn ghost" data-gtclear="1"'+(sel==null?' disabled':'')+'>Clear Response</button>'+
   '<button type="button" class="btn alt" data-gtmarknext="1"'+(last?' disabled':'')+'>Mark for Review &amp; Next</button><button type="button" class="btn" data-gtnext="1"'+(last?' disabled':'')+'>Save &amp; Next →</button></div></section>';
  h+='<aside class="gt-pal"><div class="gt-pal-h"><b>Question palette</b><span>'+c.ans+' answered</span></div><div class="gt-grid-q">'+qs.map(function(x,i){
    var kk=K(s,i),a=run.ans[kk]!=null,m=run.mark[kk],v=run.vis[kk],cl=x.kind==='empty'?'e':m?(a?'ma':'m'):a?'a':v?'n':'';
    return '<button type="button" class="gt-p '+cl+(i===run.q?' cur':'')+'" data-gtgo="'+i+'" aria-label="Question '+(i+1)+(a?', answered':'')+(m?', marked':'')+'"'+(i===run.q?' aria-current="true"':'')+'>'+(i+1)+'</button>'}).join('')+'</div>'+
   '<ul class="gt-legend"><li><i class="a"></i>Answered '+c.ans+'</li><li><i class="n"></i>Not answered '+c.na+'</li><li><i class="m"></i>Marked for review '+(c.mk-c.mka)+'</li><li><i class="ma"></i>Answered &amp; marked '+c.mka+'</li><li><i></i>Not visited '+c.nv+'</li></ul>'+
   '<button type="button" class="btn big full" data-gtsubmit="1">Submit '+esc(sc.name)+'</button></aside></div>';
  if(ui.modal){
    var left=run.order.length-run.pos-1,qn=qs.filter(function(x){return x.kind!=='empty'}).length;
    h+='<div class="gt-modal" role="dialog" aria-modal="true" aria-label="Submit section"><div class="gt-mbox"><h2>Submit '+esc(sc.name)+'?</h2><div class="gt-msum"><div><b>'+c.ans+'</b><span>Answered</span></div><div><b>'+(qn-c.ans)+'</b><span>Not answered</span></div><div><b>'+c.mk+'</b><span>Marked</span></div></div>'+
     '<p>'+fmt(rem)+' is still left on the clock. '+(left?'Once submitted you cannot return to this section.':'This is the last section. Your result opens right after.')+'</p>'+
     '<div class="gt-go"><button type="button" class="btn" data-gtconfirm="1">Yes, submit</button><button type="button" class="btn ghost" data-gtcancel="1">Back to the test</button></div></div></div>';
  }
  return h+'</div>';
}

function med(a){if(!a.length)return 0;a=a.slice().sort(function(x,y){return x-y});var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function insightsHTML(rn,r,acc){
  var m=cfg.marks,T={right:[],wrong:[],skip:[]},slow=[];
  rn.order.forEach(function(s){rn.paper[s].forEach(function(q,i){if(q.kind==='empty')return;var a=rn.ans[K(s,i)],t=(rn.ts[K(s,i)]||0)/1000,st=a==null?'skip':a===q.a?'right':'wrong';T[st].push(t);slow.push({t:t,s:s,i:i})})});
  var lost=num(r.wrong*Math.abs(m.wrong)),p=r.correct+r.wrong?r.correct/(r.correct+r.wrong):0,exp=num(r.skipped*(p*m.right+(1-p)*m.wrong));
  var h='<section class="gt-card"><h2>Insights</h2><div class="gt-ins">';
  h+='<div><b>'+(m.wrong?'−'+lost:'0')+'</b><span>marks lost to wrong answers</span></div>';
  h+='<div><b>'+(exp>0?'+'+exp:'~0')+'</b><span>'+(r.skipped?(exp>0?'expected if you had attempted the '+r.skipped+' skipped at your accuracy':'skipping was fine: guessing at your accuracy would not have helped'):'no skipped questions')+'</span></div>';
  h+='<div><b>'+Math.round(med(T.right))+' s</b><span>median time on right answers</span></div>';
  h+='<div><b>'+Math.round(med(T.wrong))+' s</b><span>median time on wrong answers</span></div></div>';
  var tot=r.correct+r.wrong+r.skipped;
  h+='<p class="gt-note">Average pace: '+(tot?Math.round(r.used/1000/tot):0)+' seconds per question. '+(med(T.wrong)>med(T.right)*1.4&&T.wrong.length>2?'You spent longer on the questions you got wrong. Mark and move on sooner.':med(T.right)>0&&med(T.wrong)<med(T.right)*0.6&&T.wrong.length>2?'Your wrong answers were fast. Slow down on the first read.':'Your timing looks even.')+'</p>';
  var hist=GT.history().slice(0,8).reverse();
  if(hist.length>1)h+='<h3 class="gt-h3">Trend over your last '+hist.length+' attempts</h3><div class="gt-trend" role="img" aria-label="Score percentage over recent attempts">'+hist.map(function(x){return '<div title="'+x.pct+'%"><i style="height:'+Math.max(4,x.pct)+'%"></i><span>'+x.pct+'</span></div>'}).join('')+'</div>';
  var sj=Object.keys(r.subj).map(function(k){var o=r.subj[k];return {k:k,p:o.t?o.c/o.t:0,t:o.t}}).filter(function(x){return x.t>=2}).sort(function(a,b){return a.p-b.p}).slice(0,3),links=[];
  sj.forEach(function(x){var id=IM.order.filter(function(i){return IM.subjects[i].title===x.k})[0];if(id)links.push('<button type="button" class="chipbtn" data-open="'+id+':cards">Revise '+esc(x.k)+' ('+Math.round(x.p*100)+'%)</button>')});
  if(links.length)h+='<h3 class="gt-h3">Revise next</h3><div class="chips">'+links.join('')+'</div>';
  return h+'</section>';
}
function resultHTML(rn){
  var r=evaluate(rn),m=cfg.marks,tot=r.correct+r.wrong+r.skipped,att=r.correct+r.wrong,acc=att?Math.round(r.correct/att*100):0;
  var msg=r.pct>=75?'Excellent paper.':r.pct>=55?'Solid. Study the wrong ones below.':r.pct>=35?'A fair start. Review the explanations.':'Keep going. Revisit the cards for each miss.';
  var c=2*Math.PI*54,p=Math.max(0,Math.min(1,r.pct/100));
  var h='<div class="gt-result"><div class="gt-rtop"><svg class="gt-ring" viewBox="0 0 130 130" role="img" aria-label="Score '+r.pct+' percent"><circle cx="65" cy="65" r="54" class="rb"/><circle cx="65" cy="65" r="54" class="rf" stroke-dasharray="'+(c*p).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 65 65)"/><text x="65" y="68" text-anchor="middle" class="rt">'+r.pct+'%</text></svg>'+
   '<div><p class="eyebrow">'+(rn.mode==='full'?'Full test':'Section practice')+' · '+new Date(rn.endedAt).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+(rn.sample?' · sample questions':'')+'</p><h1>'+r.score+' <small>/ '+r.max+' marks</small></h1><p class="sub">'+msg+'</p>'+
   '<div class="gt-chips">'+chip('<b>'+r.correct+'</b> right')+chip('<b>'+r.wrong+'</b> wrong')+chip('<b>'+r.skipped+'</b> not attempted')+chip('Accuracy <b>'+acc+'%</b>')+chip('Time <b>'+fmtMin(r.used)+'</b>')+'</div></div></div>';
  h+='<section class="gt-card"><h2>Section by section</h2><div class="gt-secgrid">'+r.secs.map(function(x){return '<div class="gt-sec"><b>'+esc(x.name)+'</b><div class="gt-sbar"><i class="rt" style="width:'+(x.total?x.correct/x.total*100:0)+'%"></i><i class="wr" style="width:'+(x.total?x.wrong/x.total*100:0)+'%"></i></div><span><b>'+x.score+'</b> / '+x.max+' · '+x.correct+' right, '+x.wrong+' wrong, '+x.skipped+' left · '+fmtMin(x.used)+'</span></div>'}).join('')+'</div></section>';
  h+=insightsHTML(rn,r,acc);
  var sj=Object.keys(r.subj).map(function(k){var o=r.subj[k];return {k:k,t:o.t,c:o.c,w:o.w,p:o.t?o.c/o.t:0}}).sort(function(a,b){return a.p-b.p});
  if(sj.length>1)h+='<section class="gt-card"><h2>By subject <small>weakest first</small></h2><div class="gt-subjs">'+sj.map(function(x){return '<div class="gt-sj"><span>'+esc(x.k)+'</span><div class="pbar"><i style="width:'+Math.round(x.p*100)+'%"></i></div><b>'+x.c+'/'+x.t+'</b></div>'}).join('')+'</div></section>';
  /* review */
  var items=[];rn.order.forEach(function(s){rn.paper[s].forEach(function(q,i){if(q.kind==='empty')return;var a=rn.ans[K(s,i)],st=a==null?'skip':a===q.a?'right':'wrong';items.push({s:s,i:i,q:q,a:a,st:st,mk:!!rn.mark[K(s,i)],t:rn.ts[K(s,i)]||0})})});
  var F=[['all','All ('+items.length+')'],['wrong','Wrong ('+r.wrong+')'],['skip','Not attempted ('+r.skipped+')'],['mark','Marked ('+items.filter(function(x){return x.mk}).length+')'],['right','Right ('+r.correct+')']];
  var all=items.filter(function(x){return ui.filter==='all'||(ui.filter==='mark'?x.mk:x.st===ui.filter)}),lim=ui.lim||20,shown=all.slice(0,lim);
  h+='<section class="gt-card"><h2>Review every question</h2><div class="chips gt-filters" role="group" aria-label="Filter">'+F.map(function(f){return '<button type="button" class="chipbtn" data-gtfilter="'+f[0]+'" aria-pressed="'+(ui.filter===f[0])+'">'+f[1]+'</button>'}).join('')+'</div><div class="gt-rev">'+
   (shown.length?shown.map(function(x){return '<article class="gt-ri '+x.st+'"><header><b>'+esc(cfg.sections[x.s].name)+' · Q'+(x.i+1)+'</b><span class="gt-res">'+(x.st==='right'?'✓ Right':x.st==='wrong'?'✗ Wrong':'– Not attempted')+'</span>'+(x.q.tags||[]).map(function(t){return '<span class="gt-tag'+(t==='PYQ'?' pyq':'')+'">'+esc(t)+'</span>'}).join('')+'<button type="button" class="gt-star'+(IM.bm.has(x.q.q)?' on':'')+'" data-gtbmr="'+x.s+'|'+x.i+'">'+(IM.bm.has(x.q.q)?'★ Bookmarked':'☆ Bookmark')+'</button>'+(x.mk?'<span class="gt-badge mk">⚑ marked</span>':'')+(x.t?'<span class="gt-time">'+Math.round(x.t/1000)+' s</span>':'')+'</header><p class="gt-stem sm">'+br(x.q.q)+'</p>'+IM.fig(x.q.img)+'<ul class="gt-ropts">'+x.q.opts.map(function(o,j){return '<li class="'+(j===x.q.a?'ok':'')+(j===x.a&&j!==x.q.a?' no':'')+'"><span class="gt-l">'+LET(j)+'</span>'+esc(o)+(j===x.q.a?' <em>correct</em>':'')+(j===x.a?' <em class="you">your answer</em>':'')+'</li>'}).join('')+'</ul>'+'<div class="gt-why"><b>Solution</b>'+IM.sol(x.q.why)+IM.vid(x.q.q)+(x.q.sid?'<button type="button" class="gt-link" data-gtcard="'+x.q.sid+'|'+x.q.cid+'">Revise: '+esc(x.q.ct)+' →</button>':'')+'</div></article>'}).join(''):'<p class="empty">Nothing in this filter.</p>')+'</div>'+(all.length>lim?'<div class="gt-go center"><button type="button" class="btn alt" data-gtmore="1">Show 20 more ('+(all.length-lim)+' left)</button></div>':'')+'</section>';
  return h+'<div class="gt-go center"><button type="button" class="btn big" data-gtback="1">Back to Grand Test</button></div></div>';
}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  if(IM.view!=='gt')return;
  var t=e.target,x;
  if((x=t.closest('[data-gtstart]'))){if(assemble(spec(),true).total===0)return;run=newRun(cfg.sections.map(function(_,i){return i}));save();render();window.scrollTo({top:0});return}
  if((x=t.closest('[data-gtsec]'))){run=newRun([+x.dataset.gtsec]);save();render();window.scrollTo({top:0});return}
  if((x=t.closest('[data-gtpat]'))){GT.setPattern(x.dataset.gtpat);render();return}
  if(t.closest('[data-gtlast]')){ui.screen='result';ui.filter='wrong';ui.lim=20;render();window.scrollTo({top:0});return}
  if((x=t.closest('[data-gtcard]'))){var pp=x.dataset.gtcard.split('|');IM.setView('study');IM.goCard(pp[0],pp[1]);return}
  if(t.closest('[data-gtback]')){ui.screen='intro';render();window.scrollTo({top:0});return}
  if(t.closest('[data-gtbegin]')){startSection();window.scrollTo({top:0});return}
  if(t.closest('[data-gtquit]')){if(run.pos===0){run=null;IM.store.set('gt-run',null);ui.screen='intro'}else{IM.setView('home');return}render();return}
  if((x=t.closest('[data-gtfilter]'))){ui.filter=x.dataset.gtfilter;ui.lim=20;render();return}
  if(t.closest('[data-gtmore]')){ui.lim=(ui.lim||20)+20;var y=window.scrollY;render();window.scrollTo({top:y});return}
  var pbx;
  if((pbx=t.closest('[data-pbtotal]'))){var sp0=spec();sp0.total=+pbx.dataset.pbtotal;saveSpec(sp0);render();return}
  if((pbx=t.closest('[data-pbtag]'))){var sp1=spec();sp1.tag=pbx.dataset.pbtag;saveSpec(sp1);render();return}
  if((pbx=t.closest('[data-pbopen]'))){ui.open[pbx.dataset.pbopen]=!ui.open[pbx.dataset.pbopen];render();return}
  if(t.closest('[data-pball]')){var sp2=spec();sp2.offS={};sp2.offT={};saveSpec(sp2);render();return}
  if(t.closest('[data-pbnone]')){var sp3=spec();IM.qb.subjects().forEach(function(x){sp3.offS[x.name]=1});saveSpec(sp3);render();return}
  if((pbx=t.closest('[data-gtbmr]'))){var pr=pbx.dataset.gtbmr.split('|'),qq=last&&last.paper[+pr[0]][+pr[1]];if(qq){IM.bm.toggle(qq);var yy=window.scrollY;render();window.scrollTo({top:yy})}return}
  if(!run||run.phase!=='live')return;
  var s=curS(),k=K(s,run.q),qs=curQs();
  if(t.closest('[data-gtbm]')){if(qs[run.q].kind!=='empty'){var on=IM.bm.toggle(qs[run.q]);if(IM.toast)IM.toast(on?'Bookmarked. You can include it in your next test.':'Bookmark removed.');render()}return}
  if((pbx=t.closest('[data-gtfs]'))){var f=Math.max(-1,Math.min(2,(+IM.store.get('gt-fs',0))+(+pbx.dataset.gtfs)));IM.store.set('gt-fs',f);render();return}
  if((x=t.closest('[data-gtopt]'))){if(qs[run.q].kind==='empty')return;run.ans[k]=+x.dataset.gtopt;run.vis[k]=1;save();render();return}
  if(t.closest('[data-gtclear]')){delete run.ans[k];save();render();return}
  if(t.closest('[data-gtmark]')){if(run.mark[k])delete run.mark[k];else run.mark[k]=1;save();render();return}
  if(t.closest('[data-gtmarknext]')){run.mark[k]=1;goQ(run.q+1);return}
  if(t.closest('[data-gtnext]')){goQ(run.q+1);return}
  if(t.closest('[data-gtprev]')){goQ(run.q-1);return}
  if((x=t.closest('[data-gtgo]'))){goQ(+x.dataset.gtgo);var p=$('.gt-q');if(p&&window.innerWidth<900)p.scrollIntoView({block:'start'});return}
  if(t.closest('[data-gtsubmit]')){ui.modal=true;render();return}
  if(t.closest('[data-gtcancel]')){ui.modal=false;render();return}
  if(t.closest('[data-gtconfirm]')){submitSection(false);window.scrollTo({top:0});return}
});
document.addEventListener('change',function(e){
  var el=e.target;if(!el||!el.dataset||IM.view!=='gt')return;
  if(el.dataset.pb){var sp=spec();sp[el.dataset.pb]=el.checked;saveSpec(sp);render();return}
  if(el.dataset.pbs!=null){var s2=spec();if(el.checked)delete s2.offS[el.dataset.pbs];else s2.offS[el.dataset.pbs]=1;saveSpec(s2);render();return}
  if(el.dataset.pbt!=null){var s3=spec();if(el.checked)delete s3.offT[el.dataset.pbt];else s3.offT[el.dataset.pbt]=1;saveSpec(s3);render()}
});
document.addEventListener('keydown',function(e){
  if(IM.view!=='gt'||!run||run.phase!=='live'||e.ctrlKey||e.metaKey||e.altKey)return;
  var tn=e.target&&e.target.tagName;if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT')return;
  if(ui.modal){if(e.key==='Escape'){ui.modal=false;render()}return}
  var k=e.key,s=curS(),kk=K(s,run.q),q=curQs()[run.q],j=/^[1-9]$/.test(k)?+k-1:/^[a-eA-E]$/.test(k)?k.toLowerCase().charCodeAt(0)-97:-1;
  if(j>=0&&j<q.opts.length&&q.kind!=='empty'){e.preventDefault();run.ans[kk]=j;run.vis[kk]=1;save();render()}
  else if(k==='ArrowRight'||k==='n'||k==='N'){e.preventDefault();goQ(run.q+1)}
  else if(k==='ArrowLeft'||k==='p'||k==='P'){e.preventDefault();goQ(run.q-1)}
  else if(k==='b'||k==='B'){if(q.kind!=='empty'){IM.bm.toggle(q);render()}}
  else if(k==='m'||k==='M'){if(run.mark[kk])delete run.mark[kk];else run.mark[kk]=1;save();render()}
});
})();
;
/* js/gt/questions.js */
/* Grand Test questions: add your own here.

   Each question is:  [ 'Question text', ['Option A','Option B','Option C','Option D'], correct, 'Explanation (optional)', 'Subject (optional)' ]

   - correct is the position of the right option: 0 = A, 1 = B, 2 = C, 3 = D. You may also write 'A', 'B', 'C' or 'D'.
   - The subject label is used for the "By subject" chart on the result page.

   Two ways to add them:

   1) Into a particular section (1 to 4, up to 50 each):

        GT.add(1, [
          ['Which score grades acute pancreatitis severity at 48 h?', ['Ranson', 'Apgar', 'Bishop', 'Glasgow'], 0, 'Ranson criteria are used at admission and at 48 hours.', 'Surgery'],
        ]);

   2) All 200 in one list. The first 50 go to Section 1, the next 50 to Section 2, and so on:

        GT.addAll([ ... ]);

   Until you add questions, empty slots are filled with sample questions taken from your study deck
   (labelled SAMPLE). Switch that off on the Grand Test page if you prefer blank slots.
   Real questions always replace sample ones, slot by slot. Nothing else needs to change.
*/

GT.add(1, [
  /* paste Section 1 questions here (up to 50) */
]);
GT.add(2, [
  /* paste Section 2 questions here (up to 50) */
]);
GT.add(3, [
  /* paste Section 3 questions here (up to 50) */
]);
GT.add(4, [
  /* paste Section 4 questions here (up to 50) */
]);
;
/* js/daily.js */
/* Daily 20: one 20-question set per day for every student, rebuilt each day from that student's own mistakes.
   Mix (see compose()):
     RETRY  up to 6  questions the student got wrong, options remixed (the wrong option they picked stays in, other
                     distractors are borrowed from the same topic)
     TOPIC  up to 6  new questions from the topics of those mistakes
     PYQ    rest     previous-year questions from high-yield topics (topics that appear most often in past papers)
   A student with no history gets the same date-seeded PYQ set as everyone else.
   AI: set DAILY.ai.endpoint to a URL you host (it must call a language model and keep the API key on YOUR server).
   The app POSTs {n, weak:[{subj,topic}], missed:[{q,correct,picked}]} and expects
   {questions:[{q, c, w:[3 wrong options], why, subj, topic}]}. If it is empty or fails, the built-in set is used. */
(function(){
var IM=window.IM,esc=IM.esc;
function $(s,r){return (r||document).querySelector(s)}
var DAILY={size:20,ai:{endpoint:'',timeoutMs:9000}};
IM.daily=DAILY;
var nz=function(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()};
function root(){return document.getElementById('daily-view')}
function today(){return IM.stats.key()}
function isPYQ(x){return (x.tags||[]).indexOf('PYQ')>=0}

/* seeded random so that students with no history all get the same set on the same day */
function rng(seed){var h=1779033703^seed.length;for(var i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=h<<13|h>>>19}
  var a=h>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuf(a,r){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}

function prog(){return IM.store.get('qb-prog',{})}
function wrongPicks(){return IM.store.get('daily-wrong',{})}

function shape(x,r,opts){
  var o=opts||[x.c].concat(x.w);o=shuf(o,r);
  return {q:x.q,opts:o,a:o.indexOf(x.c),why:x.why||('Correct answer: '+x.c+'.'),subj:x.subj,topic:x.topic||'',tags:x.tags||[],img:x.img||null,qid:x.id==null?null:x.id,src:x.src||'pyq'};
}

/* options for a retried question: correct + the option the student picked last time + 2 distractors from the same topic */
function remix(x,pool,r){
  var picked=wrongPicks()[nz(x.q)],have={},opts=[x.c];have[nz(x.c)]=1;
  if(picked&&!have[nz(picked)]&&x.w.some(function(w){return nz(w)===nz(picked)})){opts.push(picked);have[nz(picked)]=1}
  var cand=[];pool.forEach(function(y){if(y.id===x.id)return;[y.c].concat(y.w).forEach(function(o){if(!have[nz(o)])cand.push(o)})});
  shuf(cand,r).forEach(function(o){if(opts.length<4&&!have[nz(o)]){opts.push(o);have[nz(o)]=1}});
  x.w.forEach(function(o){if(opts.length<4&&!have[nz(o)]){opts.push(o);have[nz(o)]=1}});
  return opts.length===4?opts:[x.c].concat(x.w);
}

function compose(){
  var bank=IM.qb.list,r=rng('rb-daily-'+today()),p=prog(),byKey={};
  bank.forEach(function(x){byKey[nz(x.q)]=x});
  /* weak topics from missed questions and last-wrong answers */
  var missed=IM.missed.list(),wrong=[];
  missed.forEach(function(m){var x=byKey[nz(m.q)];if(x)wrong.push(x)});
  bank.forEach(function(x){if(p[x.id]===0&&wrong.indexOf(x)<0)wrong.push(x)});
  var tw={};wrong.forEach(function(x){var k=x.subj+'|'+x.topic;tw[k]=(tw[k]||0)+1});
  /* how often each topic shows up in previous-year papers */
  var yield_={};bank.forEach(function(x){if(isPYQ(x)){var k=x.subj+'|'+x.topic;yield_[k]=(yield_[k]||0)+1}});
  var used={},out=[];
  function take(x,src,opts){if(!x||used[x.id])return false;used[x.id]=1;var c=Object.assign({},x,{src:src});out.push(shape(c,r,opts));return true}
  /* 1 retry */
  shuf(wrong,r).slice(0,6).forEach(function(x){var pool=bank.filter(function(y){return y.subj===x.subj&&y.topic===x.topic});take(x,'retry',remix(x,pool,r))});
  /* 2 topic follow-ups: unseen questions from topics the student gets wrong */
  var topics=Object.keys(tw).sort(function(a,b){return tw[b]-tw[a]}),n=0;
  var follow=[];topics.forEach(function(k){shuf(bank.filter(function(x){return x.subj+'|'+x.topic===k&&!used[x.id]&&p[x.id]==null}),r).slice(0,2).forEach(function(x){follow.push(x)})});
  follow.slice(0,6).forEach(function(x){take(x,'topic')});
  /* 3 high-yield PYQs, unseen first, weighted by topic frequency */
  var rest=bank.filter(function(x){return isPYQ(x)&&!used[x.id]});
  var unseen=rest.filter(function(x){return p[x.id]==null});if(unseen.length>=DAILY.size)rest=unseen;
  rest=shuf(rest,r).sort(function(a,b){return (yield_[b.subj+'|'+b.topic]||0)-(yield_[a.subj+'|'+a.topic]||0)+(r()-.5)*6});
  var perSubj={};
  rest.forEach(function(x){if(out.length>=DAILY.size)return;if((perSubj[x.subj]||0)>=4)return;if(take(x,'pyq'))perSubj[x.subj]=(perSubj[x.subj]||0)+1});
  /* 4 top up from anything (needed in small banks) */
  shuf(bank.filter(function(x){return !used[x.id]}),r).forEach(function(x){if(out.length<DAILY.size)take(x,isPYQ(x)?'pyq':'topic')});
  out=out.slice(0,DAILY.size);
  /* interleave so retries are not all at the start */
  out=shuf(out,r);
  return {date:today(),items:out,res:[],i:0,ai:false,weak:topics.slice(0,5).map(function(k){var a=k.split('|');return {subj:a[0],topic:a[1]}}),
    missedForAI:wrong.slice(0,8).map(function(x){return {q:x.q,correct:x.c,picked:wrongPicks()[nz(x.q)]||''}})};
}

/* optional AI generation: replaces the TOPIC slots with questions written by your endpoint */
function tryAI(set){
  var ep=DAILY.ai&&DAILY.ai.endpoint;if(!ep||!set.weak.length||!window.fetch)return Promise.resolve(false);
  var ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){ctl&&ctl.abort()},DAILY.ai.timeoutMs||9000);
  return fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({n:6,weak:set.weak,missed:set.missedForAI}),signal:ctl&&ctl.signal})
    .then(function(r){clearTimeout(t);return r.json()}).then(function(j){
      var qs=(j&&j.questions||[]).filter(function(q){return q&&q.q&&q.c&&q.w&&q.w.length===3}).slice(0,6);if(!qs.length)return false;
      var slots=[];set.items.forEach(function(it,i){if(it.src==='topic')slots.push(i)});
      var r=rng('ai-'+today());
      qs.forEach(function(q,k){var it=shape({q:q.q,c:q.c,w:q.w,why:q.why,subj:q.subj||'General',topic:q.topic||'',tags:['AI'],src:'ai'},r);if(k<slots.length)set.items[slots[k]]=it;else if(set.items.length<DAILY.size+6)set.items.push(it)});
      set.items=set.items.slice(0,DAILY.size);set.ai=true;return true}).catch(function(){clearTimeout(t);return false});
}

var cur=null,building=false;
function load(){
  var s=IM.store.get('daily',null);
  if(s&&s.date===today()&&s.items&&s.items.length){s.sel=null;cur=s;return cur}
  cur=null;return null;
}
function save(){IM.store.set('daily',cur)}
function ensure(cb){
  if(load())return cb();
  if(!IM.qb||!IM.qb.list.length){cur={date:today(),items:[],res:[],i:0};return cb()}
  var s=compose();
  cur=s;save();cb();
  if(DAILY.ai&&DAILY.ai.endpoint&&!building){building=true;tryAI(s).then(function(ok){building=false;if(ok&&cur===s&&!s.res.length){save();render()}})}
}

/* ---------- state for the home card ---------- */
IM.dailyState=function(){
  var s=IM.store.get('daily',null);if(!s||s.date!==today())return {n:DAILY.size,done:0,score:0,finished:false};
  var sc=0;s.res.forEach(function(v,i){if(v===s.items[i].a)sc++});
  return {n:s.items.length||DAILY.size,done:s.res.length,score:sc,finished:s.items.length>0&&s.res.length>=s.items.length};
};

/* ---------- screens ---------- */
var BADGE={retry:['Retry','you missed this'],topic:['Weak topic','new question'],pyq:['PYQ topic','high-yield'],ai:['AI','written for you']};
function tag(it){var b=BADGE[it.src]||BADGE.pyq;return '<span class="gt-tag dl-'+it.src+'">'+b[0]+'</span>'}
function result(){
  var n=cur.items.length,sc=0,by={};
  cur.items.forEach(function(it,i){var ok=cur.res[i]===it.a;if(ok)sc++;var b=by[it.subj]||(by[it.subj]={n:0,r:0});b.n++;if(ok)b.r++});
  var pct=Math.round(sc/n*100),wrong=n-sc;
  return '<section class="gt-card center dl-done"><p class="eyebrow">Daily 20 complete</p><h1>'+sc+' <small>/ '+n+'</small></h1><p class="sub">'+pct+'% correct.'+(wrong?' Your '+wrong+' misses will come back, remixed, in tomorrow’s set.':' Clean sweep. Tomorrow’s set will lean on new topics.')+'</p>'+
    '<div class="dl-by">'+Object.keys(by).sort().map(function(k){return '<span>'+esc(k)+' <b>'+by[k].r+'/'+by[k].n+'</b></span>'}).join('')+'</div>'+
    '<div class="gt-go center"><button class="btn" data-view="home">Back to home</button><button class="btn alt" data-dlreview="1">Review answers</button></div></section>';
}
function review(){
  return '<div class="qb-bar"><button class="gt-link" data-view="home">← Home</button><span>Review</span><span></span></div>'+cur.items.map(function(it,i){
    var ok=cur.res[i]===it.a;
    return '<section class="gt-card"><div class="gt-qh"><span class="gt-subj">'+esc(it.subj)+' · '+esc(it.topic)+'</span>'+tag(it)+'</div><p class="gt-stem sm">'+(i+1)+'. '+esc(it.q)+'</p>'+IM.fig(it.img)+
      '<ul class="gt-ropts">'+it.opts.map(function(o,k){return '<li class="'+(k===it.a?'ok':(k===cur.res[i]?'no':''))+'"><span class="gt-l">'+String.fromCharCode(65+k)+'</span>'+esc(o)+(k===it.a?' <em>correct</em>':(k===cur.res[i]?' <em>your answer</em>':''))+'</li>'}).join('')+'</ul>'+
      '<details class="gt-why sol-box"><summary><b>'+(ok?'Solution':'Solution (you missed this)')+'</b></summary>'+IM.sol(it.why)+IM.vid(it.q)+'</details></section>'}).join('');
}
function question(){
  var i=cur.i,it=cur.items[i],sel=cur.sel,n=cur.items.length,right=0;cur.res.forEach(function(v,k){if(v===cur.items[k].a)right++});
  var h='<div class="qb-bar"><button class="gt-link" data-view="home">← Home</button><span>Daily 20 · '+(i+1)+' of '+n+'</span><span>✓ '+right+'</span></div>'+
    '<div class="dl-prog" aria-hidden="true"><i style="width:'+Math.round(i/n*100)+'%"></i></div>'+
    '<section class="gt-card"><div class="gt-qh"><span class="gt-subj">'+esc(it.subj)+' · '+esc(it.topic)+'</span>'+tag(it)+'</div><p class="gt-stem">'+esc(it.q)+'</p>'+IM.fig(it.img)+'<div class="qb-opts">'+
    it.opts.map(function(o,k){var c='gt-opt';if(sel!=null){if(k===it.a)c+=' ok';else if(k===sel)c+=' no'}return '<button type="button" class="'+c+'" data-dlopt="'+k+'"'+(sel!=null?' disabled':'')+'><span class="gt-l">'+String.fromCharCode(65+k)+'</span><span>'+esc(o)+'</span></button>'}).join('')+'</div>';
  if(sel!=null)h+='<div class="gt-why"><b>'+(sel===it.a?'Correct.':'Not quite. Answer: '+String.fromCharCode(65+it.a)+'.')+'</b>'+IM.sol(it.why)+IM.vid(it.q)+'</div><div class="gt-go"><button class="btn" data-dlnext="1">'+(i+1<n?'Next question':'See result')+'</button></div>';
  return h+'</section>';
}
var reviewing=false;
function render(){
  var el=root();if(!el||IM.view!=='daily')return;
  if(!cur)return;
  if(!cur.items.length){el.innerHTML='<section class="gt-card center"><h2>Daily 20</h2><p class="sub">No questions are available yet.</p><button class="btn" data-view="home">Back</button></section>';return}
  cur.sel=cur.sel==null?null:cur.sel;
  if(cur.sel==null&&cur.res.length>=cur.items.length)el.innerHTML=reviewing?review():result();
  else{cur.i=cur.sel!=null?cur.res.length-1:cur.res.length;el.innerHTML=question()}
}
IM.dailyShow=function(){reviewing=false;ensure(render)};

document.addEventListener('click',function(e){
  var t=e.target,x;if(!root()||!root().contains(t)||!cur)return;
  if((x=t.closest('[data-dlopt]'))&&cur.sel==null){
    var k=+x.dataset.dlopt,it=cur.items[cur.res.length],ok=k===it.a;cur.sel=k;cur.res.push(k);
    var p=prog();if(it.qid!=null){p[it.qid]=ok?1:0;IM.store.set('qb-prog',p)}
    IM.missed.mark({q:it.q,opts:it.opts,a:it.a,why:it.why,subj:it.subj,topic:it.topic,tags:it.tags,img:it.img},ok);
    if(!ok){var w=wrongPicks(),ks=Object.keys(w);w[nz(it.q)]=it.opts[k];while(ks.length>300){delete w[ks.shift()]}IM.store.set('daily-wrong',w)}
    if(IM.stats)IM.stats.rec(ok);
    save();if(IM.resume)IM.resume.mark({type:'daily'});render();return}
  if(t.closest('[data-dlnext]')){cur.sel=null;save();render();window.scrollTo({top:0});return}
  if(t.closest('[data-dlreview]')){reviewing=true;render();window.scrollTo({top:0});return}
});
})();
;
/* js/practice.js */
/* Practice hub: everything you solve lives here, sorted into
     PYQ  previous-year questions (by exam: NEET PG, INI-CET, AIIMS)
     PYT  previous-year topics (topic-wise questions, by subject)
     GT   Grand Tests (full-length timed papers)
     My lists: mistakes, bookmarks, not attempted yet.
   Each tile opens the existing Q Bank / PYQ / Grand Test screens, already filtered. */
(function(){
var IM=window.IM,esc=IM.esc;
function root(){return document.getElementById('practice-view')}
function has(x,t){return (x.tags||[]).indexOf(t)>=0}
function examOf(x){var m=(x.tags||[]).map(function(t){var r=/^(NEET PG|INI-CET|AIIMS)\b/.exec(t);return r&&r[1]}).filter(Boolean)[0];return m||null}
function render(){
  var el=root();if(!el||IM.view!=='practice')return;
  var L=IM.qb?IM.qb.list:[],p=IM.store.get('qb-prog',{}),pyq=L.filter(function(x){return has(x,'PYQ')}),pyt=L.filter(function(x){return has(x,'PYT')});
  var ex={};pyq.forEach(function(x){var e=examOf(x);if(e)ex[e]=(ex[e]||0)+1});
  var sj={};pyt.forEach(function(x){sj[x.subj]=(sj[x.subj]||0)+1});
  var tried=function(a){return a.filter(function(x){return p[x.id]!=null}).length};
  var hist=window.GT?GT.history():[],best=hist.reduce(function(m,h){return Math.max(m,h.pct)},0),run=window.GT&&GT.activeRun&&GT.activeRun();
  var miss=IM.missed?IM.missed.list().length:0,bm=IM.bm?IM.bm.list().length:0,fresh=L.filter(function(x){return p[x.id]==null}).length;
  var h='<div class="home-top"><div><p class="eyebrow">Practice</p><h1>Solve</h1><p class="sub">Pick a type of practice. Everything is sorted for you.</p></div></div>';
  /* PYQ */
  h+='<section class="pr-card"><header><span class="pr-k">PYQ</span><div><h2>Previous-year questions</h2><p>'+pyq.length.toLocaleString('en-IN')+' questions from past papers · '+tried(pyq)+' tried</p></div></header>'+
    '<div class="pr-chips"><button type="button" class="btn sm" data-pr="pyq:">All PYQs</button>'+Object.keys(ex).sort().map(function(k){return '<button type="button" class="btn sm alt" data-pr="pyq:'+esc(k)+'">'+esc(k)+' · '+ex[k]+'</button>'}).join('')+'</div></section>';
  /* PYT */
  h+='<section class="pr-card"><header><span class="pr-k pyt">PYT</span><div><h2>Previous-year topics</h2><p>'+pyt.length.toLocaleString('en-IN')+' exam-style questions with explanations · '+tried(pyt)+' tried</p></div></header>'+
    '<div class="pr-chips"><button type="button" class="btn sm" data-pr="pyt:">All subjects</button></div>'+
    '<div class="pr-subs">'+Object.keys(sj).sort(function(a,b){return sj[b]-sj[a]}).map(function(k){return '<button type="button" class="pr-sub" data-pr="pyt:'+esc(k)+'"><b>'+esc(k)+'</b><small>'+sj[k]+'</small></button>'}).join('')+'</div></section>';
  /* GT */
  h+='<section class="pr-card"><header><span class="pr-k gt">GT</span><div><h2>Grand Test</h2><p>'+(run?'A test is in progress.':(hist.length?'Taken '+hist.length+(hist.length===1?' time':' times')+' · best '+best+'%':'Full-length timed paper with a full review.'))+'</p></div></header>'+
    '<div class="pr-chips">'+(run||!window.GT||GT.noPatterns?'<button type="button" class="btn sm" data-pr="gt:">'+(run?'Resume test':'Open Grand Test')+'</button>':Object.keys(GT.patterns).map(function(k,i){var q=GT.patterns[k];return '<button type="button" class="btn sm'+(i?' alt':'')+'" data-pr="gt:'+k+'">'+esc(q.name)+' · '+q.maxTotal+' Q</button>'}).join(''))+'</div></section>';
  /* lists */
  h+='<section class="pr-card"><header><span class="pr-k list">Lists</span><div><h2>My lists</h2><p>Jump to the questions that need you.</p></div></header>'+
    '<div class="pr-chips"><button type="button" class="btn sm alt" data-pr="list:wrong"'+(miss?'':' disabled')+'>Mistakes · '+miss+'</button><button type="button" class="btn sm alt" data-pr="list:bm"'+(bm?'':' disabled')+'>Bookmarks · '+bm+'</button><button type="button" class="btn sm alt" data-pr="list:new">Not tried yet · '+fresh.toLocaleString('en-IN')+'</button></div></section>';
  el.innerHTML=h;
}
IM.practiceShow=render;
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-pr]');if(!b)return;
  var a=b.dataset.pr.split(':'),k=a[0],v=a.slice(1).join(':');
  if(k==='gt'){if(v&&window.GT&&GT.setPattern)GT.setPattern(v);IM.setView('gt')}
  else if(k==='pyq')IM.qbOpen({pyq:true,exam:v});
  else if(k==='pyt')IM.qbOpen({mode:'pyt',subj:v||'All'});
  else if(k==='list')IM.qbOpen({mode:v});
});
})();
;
/* js/home.js */
/* App shell extras: views (Home / Study / Grand Test), dashboard, search across all subjects, theme, random card. */
(function(){
var IM=window.IM,esc=IM.esc;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

/* ---------- theme ---------- */
function applyTheme(t){var r=document.documentElement;if(t==='light'||t==='dark')r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');
  var b=$('#themebtn');if(b){var dark=t==='dark'||(t!=='light'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);b.textContent=dark?'☀️':'🌙';b.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode')}}
function toggleTheme(){var r=document.documentElement,cur=r.getAttribute('data-theme'),dark=cur==='dark'||(!cur&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches),n=dark?'light':'dark';IM.store.set('theme',n);applyTheme(n)}

/* ---------- views ---------- */
IM.view='study';
IM.setView=function(v){
  IM.view=v;IM.store.set('view',v);
  document.body.classList.remove('view-home','view-study','view-gt','view-qb','view-pyq','view-daily','view-practice');document.body.classList.add('view-'+(v==='pyq'?'qb':v));var nv=(v==='qb'||v==='pyq'||v==='gt')?'practice':v;if(v==='pyq')document.body.classList.add('view-pyq');
  $$('.ab-nav [data-view]').forEach(function(b){b.setAttribute('aria-current',b.dataset.view===nv?'page':'false')});
  if(v==='home')IM.renderHome();
  if(v==='daily'&&IM.dailyShow)IM.dailyShow();
  if(v==='practice'&&IM.practiceShow)IM.practiceShow();
  if(v==='gt'&&window.GT)GT.show();
  if((v==='qb'||v==='pyq')&&IM.qbShow)IM.qbShow(v==='pyq');
  if(v!=='gt'&&window.GT&&GT.leave)GT.leave();
  window.scrollTo({top:0});
};

/* ---------- dashboard ---------- */
function learnedCount(sid){var L=IM.store.get('learned',{}),n=0;IM.subjects[sid].cards.forEach(function(c){if(L[sid+':'+c.id])n++});return n}
function weakCount(sid){var W=IM.weak(),n=0;Object.keys(W).forEach(function(k){if(k.indexOf(sid+':')===0)n++});return n}
function ring(p,txt,sub){var r=44,c=2*Math.PI*r;return '<svg class="ring" viewBox="0 0 110 110" role="img" aria-label="'+esc(txt+' '+sub)+'"><circle cx="55" cy="55" r="'+r+'" class="rb"/><circle cx="55" cy="55" r="'+r+'" class="rf" stroke-dasharray="'+(c*p).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 55 55)"/><text x="55" y="53" text-anchor="middle" class="rt">'+esc(txt)+'</text><text x="55" y="72" text-anchor="middle" class="rs">'+esc(sub)+'</text></svg>'}
IM.renderHome=function(){
  var st=IM.stats,t=st.today(),hr=new Date().getHours(),hello=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  var run=window.GT&&GT.activeRun&&GT.activeRun(),hist=window.GT?GT.history():[],best=hist.reduce(function(m,h){return Math.max(m,h.pct)},0);
  var dd=IM.dailyState?IM.dailyState():{n:20,done:0,score:0,finished:false},streak=st.streak();
  var nCards=0;IM.order.forEach(function(id){nCards+=IM.subjects[id].cards.length});
  var nQ=IM.qb?IM.qb.list.length:0,nP=IM.qb?IM.qb.list.filter(function(x){return (x.tags||[]).indexOf('PYQ')>=0}).length:0;
  var dState=dd.finished?'Done today · '+dd.score+'/'+dd.n:(dd.done?'Resume · '+dd.done+'/'+dd.n+' answered':'20 questions · about 15 min');
  var ic={daily:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/>',
    study:'<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13"/>',
    prac:'<path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h9"/>',
    gt:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'};
  function svg(k){return '<span class="hm-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ic[k]+'</svg></span>'}
  var h='<div class="home-top"><div><p class="eyebrow">Recall Buddy</p><h1>'+hello+'.</h1><p class="sub">'+(streak?'🔥 '+streak+'-day streak. ':'')+'What would you like to do?</p></div></div>';
  var rs=IM.resume&&IM.resume.info();
  var resumeCard=rs?'<button type="button" class="hm-opt hm-resume" data-resume="1"><span class="hm-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="hm-t"><b>Continue where you left off</b><small>'+esc(rs.title)+' · '+esc(rs.sub)+'</small></span><span class="hm-tag">Resume</span><span class="hm-d">Pick up from the exact spot you stopped.</span></button>':'';
  h+='<div class="hm-grid">'+resumeCard+
   '<button type="button" class="hm-opt hm-daily'+(dd.finished?' is-done':'')+'" data-view="daily">'+svg('daily')+'<span class="hm-t"><b>Daily 20</b><small>'+dState+'</small></span><span class="hm-tag">'+(dd.finished?'✓ Done':'New today')+'</span><span class="hm-d">Your daily set, rebuilt from your mistakes and high-yield previous-year topics.</span></button>'+
   '<button type="button" class="hm-opt" data-view="study">'+svg('study')+'<span class="hm-t"><b>Study decks</b><small>'+IM.order.length+' subjects · '+nCards+' cards</small></span><span class="hm-d">Cards, flashcards and quizzes for each subject.</span></button>'+
   '<button type="button" class="hm-opt" data-view="practice">'+svg('prac')+'<span class="hm-t"><b>Practice</b><small>'+nQ.toLocaleString('en-IN')+' questions · '+(run?'test in progress':'PYQ · PYT · Grand Tests')+'</small></span><span class="hm-d">Previous-year questions, previous-year topics and full-length Grand Tests (NEET and INI-CET patterns), all in one place.</span></button>'+
   '</div><p class="home-foot"><button type="button" class="lnk" data-progress="1">My progress</button></p>';
  $('#home-view').innerHTML=h;
};

/* ---------- search across all subjects ---------- */
var idx=null;
function buildIdx(){idx=[];IM.order.forEach(function(sid){IM.subjects[sid].cards.forEach(function(c){
  var rows=(c.rows||[]).filter(function(r){return r[0]!=='#'}).map(function(r){return r[0]+': '+r[1]});
  if(c.bands)c.bands.forEach(function(b){rows.push(b.c+': '+b.i.join(', ')+(b.a?' → '+b.a:''))});
  idx.push({sid:sid,id:c.id,title:c.title,sec:c.section||'',st:IM.subjects[sid].title,hook:c.hook||'',rows:rows,blob:(c.title+' '+(c.hook||'')+' '+rows.join(' ')).toLowerCase()})})})}
var sel=0,hits=[];
function gsRender(q){
  var box=$('#gs-list');q=q.trim().toLowerCase();
  if(!q){hits=[];box.innerHTML='<p class="gs-empty">Type to search every card in every subject. Press Enter to open the first result.</p>';return}
  var words=q.split(/\s+/);hits=idx.filter(function(c){return words.every(function(w){return c.blob.indexOf(w)>=0})}).map(function(c){
    var tl=c.title.toLowerCase(),score=(tl.indexOf(q)>=0?3:0)+(tl.indexOf(words[0])>=0?1:0);return {c:c,s:score}}).sort(function(a,b){return b.s-a.s}).slice(0,40).map(function(x){return x.c});
  sel=0;
  box.innerHTML=hits.length?hits.map(function(c,i){
    var row=c.rows.filter(function(r){var l=r.toLowerCase();return words.some(function(w){return l.indexOf(w)>=0})})[0]||c.hook;
    return '<button type="button" class="gs-item'+(i===0?' on':'')+'" data-gcard="'+c.sid+'|'+c.id+'"><b>'+esc(c.title)+'</b><span class="gs-tag">'+esc(c.st)+' · '+esc(c.sec)+'</span>'+(row?'<small>'+esc(row.length>140?row.slice(0,140)+'…':row)+'</small>':'')+'</button>'}).join(''):'<p class="gs-empty">No card matches “'+esc(q)+'”.</p>';
}
function openSearch(){
  if(!idx)buildIdx();
  var g=$('#gsearch');if(!g){g=document.createElement('div');g.id='gsearch';g.className='gs';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-label','Search all cards');
    g.innerHTML='<div class="gs-box"><div class="gs-head"><input id="gs-in" type="search" placeholder="Search all subjects…" autocomplete="off" aria-label="Search all cards"><button type="button" data-gsclose="1" aria-label="Close search">✕</button></div><div id="gs-list" class="gs-list"></div></div>';document.body.appendChild(g)}
  g.hidden=false;var i=$('#gs-in');i.value='';gsRender('');i.focus();
}
function closeSearch(){var g=$('#gsearch');if(g)g.hidden=true}
function gsMove(d){var items=$$('.gs-item');if(!items.length)return;items[sel]&&items[sel].classList.remove('on');sel=(sel+d+items.length)%items.length;items[sel].classList.add('on');items[sel].scrollIntoView({block:'nearest'})}

/* ---------- random card ---------- */
function randomCard(){
  IM.openStudy(IM.curId,'cards');
  var L=IM.store.get('learned',{}),list=IM.cur().cards.filter(function(c){return !L[IM.curId+':'+c.id]});if(!list.length)list=IM.cur().cards;
  var c=list[Math.floor(Math.random()*list.length)];IM.goCard(IM.curId,c.id);
}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  var t=e.target,x;
  if((x=t.closest('[data-view]'))&&x.tagName==='BUTTON'){IM.setView(x.dataset.view);return}
  if(t.closest('#themebtn')){toggleTheme();return}
  if(t.closest('#searchbtn')){openSearch();return}
  if(t.closest('[data-gsclose]')||t.classList.contains('gs')){closeSearch();return}
  if((x=t.closest('[data-gcard]'))){var p=x.dataset.gcard.split('|');closeSearch();IM.goCard(p[0],p[1]);return}
  if((x=t.closest('[data-open]'))){var q=x.dataset.open.split(':');IM.openStudy(q[0],q[1]);return}
  if(t.closest('[data-quizall]')){IM.setView('study');IM.quizAll();return}
  if(t.closest('[data-randcard]')){IM.setView('study');randomCard();return}
  if((x=t.closest('[data-goal]'))){IM.stats.setGoal(IM.stats.goal()+ +x.dataset.goal);IM.renderHome();return}
  if(t.closest('#hidelearned')){IM.ui.hideDone=!IM.ui.hideDone;IM.store.set('hidedone',IM.ui.hideDone);syncHide();IM.renderCards();return}
  if(t.closest('#randbtn')){randomCard();return}
});
document.addEventListener('input',function(e){if(e.target.id==='gs-in')gsRender(e.target.value)});
document.addEventListener('keydown',function(e){
  var g=$('#gsearch'),open=g&&!g.hidden;
  if(open){
    if(e.key==='Escape'){closeSearch();return}
    if(e.key==='ArrowDown'){e.preventDefault();gsMove(1)}else if(e.key==='ArrowUp'){e.preventDefault();gsMove(-1)}
    else if(e.key==='Enter'){var it=$$('.gs-item')[sel];if(it){e.preventDefault();it.click()}}
    return;
  }
  var tn=e.target&&e.target.tagName;
  if(e.key==='/'&&tn!=='INPUT'&&tn!=='TEXTAREA'&&tn!=='SELECT'&&!(window.GT&&GT.examOpen&&GT.examOpen())){e.preventDefault();openSearch()}
});
function syncHide(){var b=$('#hidelearned');if(b){b.setAttribute('aria-pressed',!!IM.ui.hideDone);b.textContent=IM.ui.hideDone?'Showing unlearned only':'Hide learned'}}

/* ---------- boot ---------- */
IM.ui.hideDone=IM.store.get('hidedone',false);syncHide();
applyTheme(IM.store.get('theme',null));
var v=IM.store.get('view','home');if(['home','study','gt','qb','pyq','daily','practice'].indexOf(v)<0)v='home';
if(v==='gt'&&!(window.GT&&GT.activeRun&&GT.activeRun()))v='home';
IM.setView(v);
})();
;
/* js/resume.js */
/* "Continue where you left off": remembers the last thing the student was doing (study subject + tab + scroll position,
   a Q Bank / PYQ practice run, Daily 20, a Grand Test in progress) and puts one card on Home to jump straight back.
   Stored in this browser only: 'last' (what), 'qb-run' (see js/qbank/view.js). */
(function(){
var IM=window.IM,esc=IM.esc;
function now(){return Date.now()}
function set(o){o.t=now();IM.store.set('last',o)}
var R=IM.resume={mark:set};

/* ----- what can be resumed right now ----- */
function info(){
  var l=IM.store.get('last',null);if(!l)return null;
  if(l.type==='study'){var s=IM.subjects[l.sid];if(!s)return null;
    var tabs={cards:'Cards',flash:'Flashcards',quiz:'Quiz',numbers:'Numbers',cheat:'Cheat sheet'};
    return {type:'study',title:s.title,sub:(tabs[l.tab]||'Cards')+' · study deck',l:l}}
  if(l.type==='qb'||l.type==='pyq'){var r=IM.store.get('qb-run',null);if(!r||!r.rem||!r.rem.length)return null;
    return {type:l.type,title:l.type==='pyq'?'Previous-year questions':'Q Bank',sub:'Question '+(r.done+1)+' of '+r.total,l:l}}
  if(l.type==='daily'){var d=IM.dailyState?IM.dailyState():null;if(!d||d.finished||!d.done)return null;
    return {type:'daily',title:'Daily 20',sub:d.done+' of '+d.n+' answered',l:l}}
  if(l.type==='gt'){var run=window.GT&&GT.activeRun&&GT.activeRun();if(!run)return null;
    return {type:'gt',title:'Grand Test',sub:'Test in progress',l:l}}
  return null;
}
R.info=info;

R.go=function(){
  var i=info();if(!i)return false;var l=i.l;
  if(i.type==='study'){
    IM.openStudy(l.sid,l.tab||'cards');
    if(l.card){IM.goCard(l.sid,l.card)}
    else if(l.y)setTimeout(function(){window.scrollTo({top:l.y})},60);
  }else if(i.type==='qb'||i.type==='pyq'){IM.setView(i.type);if(IM.qbResume)IM.qbResume()}
  else if(i.type==='daily')IM.setView('daily');
  else if(i.type==='gt')IM.setView('gt');
  return true;
};

/* ----- tracking ----- */
function saveStudy(){set({type:'study',sid:IM.curId,tab:IM.tab,y:Math.round(window.scrollY||0)})}
var _sv=IM.setView;
IM.setView=function(v){
  var prev=IM.view;
  if(prev==='study'&&v!=='study')saveStudy();
  else if(prev==='gt'&&v!=='gt'&&window.GT&&GT.activeRun&&GT.activeRun())set({type:'gt'});
  var r=_sv.apply(this,arguments);
  if(v==='study')saveStudy();
  if(v==='gt'&&window.GT&&GT.activeRun&&GT.activeRun())set({type:'gt'});
  return r;
};
document.addEventListener('click',function(e){
  var t=e.target;if(IM.view!=='study')return;
  if(t.closest&&(t.closest('[data-tab]')||t.closest('[data-subject]')))setTimeout(saveStudy,0);
});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-resume]')){e.preventDefault();R.go()}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&IM.view==='study')saveStudy()});
window.addEventListener('pagehide',function(){if(IM.view==='study')saveStudy()});
/* first launch: if the app was reloaded while on a study screen, remember it */
if(IM.view==='study')saveStudy();
if(IM.view==='home')IM.renderHome();
})();
;
/* js/shell.js */
/* App shell for launch: welcome/onboarding, settings, analytics, install + offline (PWA), keyboard help, small interactions. */
(function(){
var IM=window.IM,esc=IM.esc,VERSION='1.0.0';
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
var EXAMS={'NEET PG':'NEET PG','INI-CET':'INI-CET','FMGE':'FMGE','Other':'Other PG exam'};
/* Registration details are sent to the owner on WhatsApp (wa.me link, the student presses Send). Change the number here. */
var WA_OWNER='918384014798';IM.waOwner=WA_OWNER;
function examsOf(p){p=p||profile();if(p.exams&&p.exams.length)return p.exams.filter(function(k){return EXAMS[k]});return p.exam?String(p.exam).split(' + ').filter(function(k){return EXAMS[k]}):[]}
function toggleIn(a,k){var i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);return a}
function regLink(p){var ex=examsOf(p);var t='Hi, I am registering on Recall Buddy.\n\nName: '+p.name+'\nWhatsApp: +91 '+p.phone+'\nPreparing for: '+(ex.join(' + ')||'-')+(p.date?'\nNearest exam date: '+p.date:'')+'\nDaily goal: '+p.goal+' questions'+(IM.license?'\nDevice ID: '+IM.license.deviceCode():'');return 'https://wa.me/'+WA_OWNER+'?text='+encodeURIComponent(t)}
function openWA(url){var l=document.createElement('a');l.href=url;l.target='_blank';l.rel='noopener noreferrer';document.body.appendChild(l);l.click();l.remove()}
IM.openWA=openWA;
function sendReg(p){try{openWA(regLink(p))}catch(e){}}
IM.sendReg=function(){var p=profile();sendReg({name:p.name||'',phone:p.phone||'',exams:examsOf(p),date:p.date||'',goal:IM.stats?IM.stats.goal():20})};
function profile(){return IM.store.get('profile',{})}
function setProfile(p){IM.store.set('profile',Object.assign(profile(),p))}
function days(d){if(!d)return null;var t=new Date(d+'T00:00:00');if(isNaN(t))return null;var n=new Date();n.setHours(0,0,0,0);return Math.round((t-n)/864e5)}
function buzz(ms){if(IM.store.get('haptics',true)&&navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}

/* ---------- owner mode ----------
   Backup, restore, reset, install and replay-welcome are for the owner/developer only. Students never see them.
   Unlock: Settings > About Recall Buddy > tap the version number 7 times > paste an OWNER code
   (made with:  node make_license.js --owner --days 365). The code is checked against the public key below. */
var OWNER_KEY={"kty":"EC","x":"k5BwAI5MQLnjkSKaYr9ArjX8YpmFY70cQ2y-lLmJnkY","y":"K4u_F29xAHW6TNayVW4VaTJbO_NsstOBoC13ingdDSw","crv":"P-256","ext":true,"key_ops":["verify"]};
/* keys that tie this browser to a paid licence: never exported, imported or reset */
var LOCKED=['im-device','im-device-fp','im-lic','im-lic-seen','im-owner-code'];
function b64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
IM.checkSigned=function(code){
  code=String(code||'').replace(/\s+/g,'');var parts=code.split('.');
  if(parts.length!==2||!window.crypto||!crypto.subtle)return Promise.resolve(null);
  var pl;try{pl=JSON.parse(new TextDecoder().decode(b64u(parts[0])))}catch(e){return Promise.resolve(null)}
  return crypto.subtle.importKey('jwk',OWNER_KEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify'])
   .then(function(k){return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},k,b64u(parts[1]),new TextEncoder().encode(parts[0]))})
   .then(function(ok){return ok?pl:null}).catch(function(){return null});
};
IM.isOwner=false;
function ownerCheck(code){
  return IM.checkSigned(code==null?IM.store.get('owner-code',''):code).then(function(pl){
    var ok=!!(pl&&pl.role==='owner'&&(!pl.e||pl.e>=IM.stats.key()));if(code==null)IM.isOwner=ok;return ok});
}
IM.ownerReady=ownerCheck();
/* ---------- phones and tablets only ----------
   iPhone, iPad (also when it pretends to be a Mac), Android phones and tablets. Laptops and desktops are blocked.
   The owner can still open the app on a computer with an owner code (tap the logo 7 times on the block screen). */
IM.kind=(function(){var u=navigator.userAgent||'',tp=navigator.maxTouchPoints||0,coarse=false;try{coarse=matchMedia('(pointer: coarse)').matches}catch(e){}
  if(/Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(u))return 'mobile';
  if(/Macintosh/.test(u)&&tp>0)return 'mobile';   /* Macs have no touch screen, so this is an iPad */
  if(tp>0&&coarse)return 'mobile';
  return 'desktop'})();
var logoTaps=0,logoT=0;
function deskBlock(){if(IM.kind!=='desktop'||$('#deskblock'))return;
  var d=document.createElement('div');d.id='deskblock';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.innerHTML='<div class="pw-card"><img class="pw-logo" data-logotap="1" src="img-brand-mark.png" alt="Recall Buddy" width="64"><h1>Open Recall Buddy on your phone or tablet</h1><p class="pw-sub">Recall Buddy works only on <b>iPhone, iPad, Android phones and Android tablets</b>. It is not available on laptops or desktop computers.</p><p class="pw-sub">On your phone or tablet, open this link:</p><p class="pw-link"><b>'+esc(location.origin+location.pathname.replace(/index\.html$/,''))+'</b></p></div>';
  document.body.appendChild(d);document.body.classList.add('desk-blocked')}
function deskUnblock(){var d=$('#deskblock');if(d)d.remove();document.body.classList.remove('desk-blocked')}
deskBlock();IM.ownerReady.then(function(ok){if(ok)deskUnblock()});
var verTaps=0,verT=0;
function ownerSheet(){
  sheet('<header class="sh-head"><h2 id="sh-t">Owner mode</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body"><p class="mut">For the Recall Buddy owner and developers only. Paste your owner code.</p><textarea id="own-code" rows="3" style="width:100%;box-sizing:border-box;font:500 .8rem ui-monospace,monospace" autocomplete="off" spellcheck="false"></textarea><p class="ob-err" id="own-err" role="alert"></p><div class="btns"><button type="button" class="btn" data-ownergo="1">Unlock</button></div></div>');
}

/* ---------- appearance settings applied at boot ---------- */
var FS={s:93,m:100,l:112,xl:125};
function applyPrefs(){var r=document.documentElement,f=IM.store.get('fs','m');r.style.fontSize=(FS[f]||100)+'%';r.classList.toggle('rm',!!IM.store.get('rm',false))}
applyPrefs();

/* ---------- sheet (modal) ---------- */
var lastFocus=null;
function sheet(html,cls){
  closeSheet(true);lastFocus=document.activeElement;
  var s=document.createElement('div');s.id='sheet';s.className='sheet '+(cls||'');s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');
  s.innerHTML='<div class="sheet-bg" data-sheetclose="1"></div><div class="sheet-card" tabindex="-1">'+html+'</div>';
  document.body.appendChild(s);document.body.classList.add('sheet-open');
  requestAnimationFrame(function(){s.classList.add('on');var f=$('input,button,select',s.querySelector('.sheet-card'));(f||s.querySelector('.sheet-card')).focus({preventScroll:true})});
  return s;
}
function closeSheet(quick){var s=$('#sheet');if(!s)return;document.body.classList.remove('sheet-open');if(quick){s.remove()}else{s.classList.remove('on');setTimeout(function(){s.remove()},200)}if(lastFocus&&lastFocus.focus){try{lastFocus.focus({preventScroll:true})}catch(e){}}}
IM.sheet=sheet;IM.closeSheet=closeSheet;

/* ---------- onboarding ---------- */
var ob={step:0,name:'',phone:'',exams:['NEET PG'],date:'',goal:20};
function obView(){
  var h='<div class="ob-dots" aria-hidden="true">'+[0,1,2].map(function(i){return '<i class="'+(i<=ob.step?'on':'')+'"></i>'}).join('')+'</div>';
  if(ob.step===0)h+='<img class="ob-logo-img" src="img-brand-logo-full.png" alt="Recall Buddy"><h2 id="ob-t">Welcome to Recall Buddy</h2><p class="ob-p">Previous-year questions, a full question bank, flashcards and timed Grand Tests, built for PG medical entrance exams. Enter your details to get started. Your details are sent to us on WhatsApp when you finish, so we can set you up.</p><label class="fld">What should we call you?<input id="ob-name" type="text" autocomplete="given-name" maxlength="30" placeholder="Your name" value="'+esc(ob.name)+'" required></label><label class="fld">WhatsApp number<input id="ob-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="10-digit mobile number" value="'+esc(ob.phone)+'" required></label><p class="ob-err" id="ob-err" role="alert"></p>';
  if(ob.step===1)h+='<h2 id="ob-t">Which exams are you preparing for?</h2><p class="ob-p">Pick all that apply. You can prepare for NEET PG and INI-CET together.</p><div class="ob-opts" role="group" aria-label="Target exams">'+Object.keys(EXAMS).map(function(k){var on=ob.exams.indexOf(k)>=0;return '<button type="button" role="checkbox" aria-checked="'+on+'" class="ob-opt'+(on?' on':'')+'" data-obexam="'+esc(k)+'">'+(on?'✓ ':'')+esc(EXAMS[k])+'</button>'}).join('')+'</div><label class="fld">Nearest exam date <small>(optional, for your countdown)</small><input id="ob-date" type="date" value="'+esc(ob.date)+'"></label><p class="ob-err" id="ob-err" role="alert"></p>';
  if(ob.step===2)h+='<h2 id="ob-t">Pick a daily goal</h2><p class="ob-p">Questions you want to answer each day. You can change this any time.</p><div class="ob-goal"><b id="ob-gv">'+ob.goal+'</b><span>questions a day</span></div><input id="ob-goal" type="range" min="10" max="100" step="5" value="'+ob.goal+'" aria-label="Daily goal"><div class="ob-hint">'+(ob.goal<=20?'Easy start':ob.goal<=50?'Steady':'Intense')+'</div>';
  h+='<div class="ob-nav">'+(ob.step?'<button type="button" class="btn ghost" data-obback="1">Back</button>':'')+'<button type="button" class="btn" data-obnext="1">'+(ob.step===2?'Start studying':'Continue')+'</button></div>';
  return h;
}
function obRender(){var c=$('#sheet .sheet-card');if(!c)return;c.innerHTML=obView();var f=$('input,.ob-opt.on',c);if(f&&ob.step!==2)f.focus({preventScroll:true})}
function onboard(){ob={step:0,name:profile().name||'',phone:profile().phone||'',exams:examsOf().length?examsOf():['NEET PG'],date:profile().date||'',goal:IM.stats?IM.stats.goal():20};sheet(obView(),'ob')}
function obFinish(skip){setTimeout(function(){if(IM.license)IM.license.ensure()},50);var prev=profile(),fresh=prev.waSent!==ob.phone;setProfile({done:true,name:ob.name.trim(),phone:ob.phone,exams:ob.exams.slice(),exam:ob.exams.join(' + '),date:ob.date,waSent:ob.phone});IM.stats.setGoal(ob.goal);document.body.classList.remove('gated');closeSheet();if(fresh&&!skip)sendReg({name:ob.name.trim(),phone:ob.phone,exams:ob.exams,date:ob.date,goal:ob.goal});if(IM.view==='home')IM.renderHome();if(!skip&&IM.toast)IM.toast('You are all set'+(ob.name?', '+ob.name.trim():'')+'.')}

/* ---------- analytics ---------- */
function analytics(){
  var p=IM.store.get('qb-prog',{}),by={},src={},tot={n:0,a:0,r:0};
  IM.qb.list.forEach(function(x){var s=by[x.subj]||(by[x.subj]={n:0,a:0,r:0});s.n++;tot.n++;var d=p[x.id];if(d!=null){s.a++;tot.a++;if(d===1){s.r++;tot.r++}}
    (x.tags||[]).forEach(function(t){if(/^(NEET PG|INI-CET|AIIMS) \d{4}$/.test(t)){var q=src[t]||(src[t]={n:0,a:0});q.n++;if(d!=null)q.a++}})});
  return {by:by,src:src,tot:tot};
}
function spark(vals){if(vals.length<2)return '';var w=240,h=56,mx=Math.max.apply(null,vals.concat([100])),mn=Math.min.apply(null,vals.concat([0])),pts=vals.map(function(v,i){return (i/(vals.length-1)*(w-8)+4).toFixed(1)+','+(h-4-(v-mn)/(mx-mn||1)*(h-8)).toFixed(1)}).join(' ');return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Grand Test score trend"><polyline points="'+pts+'" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+vals.map(function(v,i){return '<circle cx="'+(i/(vals.length-1)*(w-8)+4).toFixed(1)+'" cy="'+(h-4-(v-mn)/(mx-mn||1)*(h-8)).toFixed(1)+'" r="3" fill="var(--brand)"/>'}).join('')+'</svg>'}
function openProgress(){
  var A=analytics(),st=IM.stats,t=st.total(),acc=A.tot.a?Math.round(A.tot.r/A.tot.a*100):0,hist=window.GT?GT.history().filter(function(h){return !h.sample}):[];
  var subs=Object.keys(A.by).sort(function(a,b){return A.by[b].a-A.by[a].a||A.by[b].n-A.by[a].n});
  var weak=subs.filter(function(k){return A.by[k].a>=5}).sort(function(a,b){return A.by[a].r/A.by[a].a-A.by[b].r/A.by[b].a}).slice(0,3);
  var h='<header class="sh-head"><h2 id="sh-t">My progress</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body">'+
   '<div class="an-kpis"><div><b>'+A.tot.a+'</b><span>of '+A.tot.n+' questions tried</span></div><div><b>'+acc+'%</b><span>last-try accuracy</span></div><div><b>'+st.streak()+'</b><span>day streak</span></div><div><b>'+t.a+'</b><span>total answers</span></div></div>';
  if(weak.length)h+='<div class="an-weak"><b>Needs attention</b> '+weak.map(function(k){return '<span class="chip-w">'+esc(k)+' '+Math.round(A.by[k].r/A.by[k].a*100)+'%</span>'}).join('')+'</div>';
  h+='<h3>By subject</h3><div class="an-rows">'+subs.map(function(k){var s=A.by[k],a=s.a?Math.round(s.r/s.a*100):0;return '<div class="an-row"><span class="an-n">'+esc(k)+'</span><div class="an-bar" title="'+s.a+' of '+s.n+' tried"><i class="tried" style="width:'+(s.a/s.n*100).toFixed(1)+'%"></i><i class="right" style="width:'+(s.r/s.n*100).toFixed(1)+'%"></i></div><span class="an-v">'+(s.a?a+'%':'–')+'<small> '+s.a+'/'+s.n+'</small></span></div>'}).join('')+'</div><p class="an-key"><i class="r"></i> answered right last time <i class="t"></i> tried</p>';
  var sk=Object.keys(A.src).sort(function(a,b){return b.slice(-4)-a.slice(-4)||a.localeCompare(b)});
  if(sk.length)h+='<h3>Previous-year papers</h3><div class="an-src">'+sk.map(function(k){var s=A.src[k];return '<div class="an-pap"><b>'+esc(k)+'</b><span>'+s.a+'/'+s.n+'</span><i style="width:'+(s.a/s.n*100).toFixed(0)+'%"></i></div>'}).join('')+'</div>';
  if(hist.length)h+='<h3>Grand Tests</h3><div class="an-gt">'+(hist.length>1?spark(hist.slice(0,10).reverse().map(function(x){return x.pct})):'')+'<ul>'+hist.slice(0,5).map(function(x){return '<li><span>'+new Date(x.t).toLocaleDateString(undefined,{day:'numeric',month:'short'})+'</span><b>'+x.pct+'%</b><span>'+x.correct+' right · '+x.wrong+' wrong</span></li>'}).join('')+'</ul></div>';
  h+='</div>';sheet(h,'wide');
}

/* ---------- settings ---------- */
var deferred=null;
function seg(name,cur,opts){return '<div class="seg2" role="group" aria-label="'+name+'">'+opts.map(function(o){return '<button type="button" data-set="'+name+'" data-val="'+o[0]+'" aria-pressed="'+(String(cur)===String(o[0]))+'">'+o[1]+'</button>'}).join('')+'</div>'}
function openSettings(){
  var p=profile(),th=IM.store.get('theme','auto')||'auto';
  var h='<header class="sh-head"><h2 id="sh-t">Settings</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body">'+
  '<section class="set"><h3>Profile</h3><label class="fld">Name<input id="st-name" type="text" maxlength="30" value="'+esc(p.name||'')+'" placeholder="Your first name"></label><div class="row2"><div class="fld">Exams<div class="st-exams" role="group" aria-label="Exams you are preparing for">'+Object.keys(EXAMS).map(function(k){var on=examsOf(p).indexOf(k)>=0;return '<button type="button" role="checkbox" aria-checked="'+on+'" class="chipbtn'+(on?' on':'')+'" data-stexam="'+esc(k)+'">'+esc(EXAMS[k])+'</button>'}).join('')+'</div></div><label class="fld">Exam date<input id="st-date" type="date" value="'+esc(p.date||'')+'"></label></div><label class="fld"><span>Daily goal: <b id="st-gv">'+IM.stats.goal()+'</b> questions</span><input id="st-goal" type="range" min="5" max="200" step="5" value="'+IM.stats.goal()+'"></label></section>'+
  '<section class="set"><h3>Appearance</h3><div class="srow"><span>Theme</span>'+seg('theme',th,[['auto','Auto'],['light','Light'],['dark','Dark']])+'</div><div class="srow"><span>Text size</span>'+seg('fs',IM.store.get('fs','m'),[['s','S'],['m','M'],['l','L'],['xl','XL']])+'</div><div class="srow"><span>Reduce motion</span>'+seg('rm',IM.store.get('rm',false)?1:0,[[0,'Off'],[1,'On']])+'</div><div class="srow"><span>Haptic feedback</span>'+seg('haptics',IM.store.get('haptics',true)?1:0,[[1,'On'],[0,'Off']])+'</div></section>'+
  (IM.isOwner?'<section class="set own"><h3>Owner tools <small>(not shown to students)</small></h3><p class="mut">Backups never include the licence or Device ID, so they cannot move a paid account to another phone.</p><div class="btns"><button type="button" class="btn alt" data-export="1">Export backup</button><label class="btn alt filebtn">Import backup<input id="st-import" type="file" accept="application/json,.json" hidden></label><button type="button" class="btn danger" data-reset="1">Reset progress</button>'+(window.matchMedia&&matchMedia('(display-mode: standalone)').matches?'<span class="mut">Installed on this device.</span>':'<button type="button" class="btn alt" data-install="1">Install app</button>')+'<button type="button" class="btn ghost" data-welcome="1">Replay welcome</button><button type="button" class="btn ghost" data-ownerlock="1">Leave owner mode</button></div></section>':'<section class="set"><h3>Your data</h3><p class="mut">Your progress is saved on this device and stays with your account here.</p></section>')+
  '<section class="set"><h3>Help</h3><div class="btns"><button type="button" class="btn ghost" data-keys="1">Keyboard shortcuts</button><button type="button" class="btn alt" data-resend="1">Send my details on WhatsApp again</button></div></section>'+
  (IM.license?IM.license.settingsHTML():'')+'<section class="set"><h3>About and legal</h3><details><summary>About Recall Buddy</summary><p>Recall Buddy is a revision and practice tool for PG medical entrance exams: previous-year questions, a topic-wise question bank, flashcards and timed Grand Tests. <span data-ver="1" style="cursor:default">Version '+VERSION+'</span>.'+(IM.isOwner?' <b>Owner mode on.</b>':'')+'</p></details>'+
  '<details><summary>Medical disclaimer</summary><p>Recall Buddy is for exam preparation and education only. It is not medical advice and must not be used to diagnose or treat patients. Clinical guidelines change; verify against current standard textbooks and official guidelines. Previous-year questions are reproduced for practice and belong to their respective examining bodies; explanations are original.</p></details>'+
  '<details><summary>Privacy</summary><p>Recall Buddy runs in your browser. Your name, exam date, answers, bookmarks and test history are stored on your device (local storage). When you first register, your name, WhatsApp number, exams and goal are put into a WhatsApp message to the Recall Buddy team, which you send yourself; no other server receives them. Clearing your browser data or using Reset progress removes them. Fonts may load from Google Fonts when you are online.</p></details>'+
  '<details><summary>Terms of use</summary><p>The app and its original content are provided as is, without warranty of any kind. Personal, non-commercial study use only. Copying, redistributing or reselling the content without written permission is not allowed.</p></details>'+
  '<p class="mut legal2">© All rights reserved to Dr. CS Enterprises. Protected under the IP legal sections.</p></section></div>';
  sheet(h,'wide');
}
function keysHelp(){sheet('<header class="sh-head"><h2 id="sh-t">Keyboard shortcuts</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body"><dl class="kbd"><dt><kbd>/</kbd></dt><dd>Search all cards</dd><dt><kbd>?</kbd></dt><dd>Show this help</dd><dt><kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd></dt><dd>Choose an option (Q Bank and PYQ practice)</dd><dt><kbd>Enter</kbd> or <kbd>N</kbd></dt><dd>Next question</dd><dt><kbd>B</kbd></dt><dd>Bookmark the question</dd><dt><kbd>Esc</kbd></dt><dd>Close dialogs and search</dd></dl><p class="mut">In the Grand Test: <kbd>A</kbd>–<kbd>D</kbd> answer, <kbd>B</kbd> bookmark.</p></div>')}
function download(name,txt){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function exportData(){var o={app:'study-deck',v:VERSION,at:new Date().toISOString(),data:{}};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('im-')===0&&LOCKED.indexOf(k)<0)o.data[k]=localStorage.getItem(k)}}catch(e){}download('study-deck-backup-'+IM.stats.key()+'.json',JSON.stringify(o));IM.toast('Backup downloaded')}
function importData(file){var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);if(o.app!=='study-deck'||!o.data)throw 0;Object.keys(o.data).forEach(function(k){if(k.indexOf('im-')===0&&LOCKED.indexOf(k)<0)localStorage.setItem(k,o.data[k])});IM.toast('Backup restored. Reloading…');setTimeout(function(){location.reload()},900)}catch(e){IM.toast('That file is not a Recall Buddy backup')}};r.readAsText(file)}
function confirmReset(){var c=$('#sheet .sheet-card');var d=document.createElement('div');d.className='confirm';d.innerHTML='<p><b>Reset all progress?</b> This deletes your answers, bookmarks, streak, test history and settings on this device. It cannot be undone.</p><div class="btns"><button type="button" class="btn ghost" data-resetno="1">Cancel</button><button type="button" class="btn danger" data-resetyes="1">Yes, reset</button></div>';c.appendChild(d)}
function doReset(){try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('im-')===0&&LOCKED.indexOf(k)<0&&k!=='im-profile')localStorage.removeItem(k)})}catch(e){}location.reload()}

/* ---------- home additions ---------- */
function enhanceHome(){
  var hv=$('#home-view');if(!hv||!hv.firstElementChild||$('.pl',hv))return;
  var p=profile(),h1=$('.home-top h1',hv),A=analytics(),d=days(p.date),left=A.tot.n-A.tot.a;
  if(h1&&p.name)h1.textContent=h1.textContent.replace(/\.$/,'')+', '+p.name+'.';
  var st=IM.stats,t=st.today(),g=st.goal(),weak=0;try{weak=IM.missed?IM.missed.list().length:0}catch(e){}
  var pyqLeft=IM.qb.list.filter(function(x){return (x.tags||[]).indexOf('PYQ')>=0&&IM.store.get('qb-prog',{})[x.id]==null}).length;
  var h='<section class="pl hsec" aria-label="Today"><div class="pl-main">';
  if(d!=null&&d>=0)h+='<div class="cd"><b>'+d+'</b><span>day'+(d===1?'':'s')+' to '+esc(p.exam||'your exam')+'</span>'+(d>0&&left>0?'<em>~'+Math.ceil(left/d)+' questions a day covers the whole bank</em>':'')+'</div>';
  else h+='<div class="cd"><b>'+t.a+'</b><span>answered today</span>'+(!p.date?'<em><button type="button" class="lnk" data-settings="1">Add your exam date</button> for a countdown</em>':'')+'</div>';
  h+='<ul class="tasks"><li class="'+(t.a>=g?'done':'')+'"><i aria-hidden="true"></i><span>Answer '+g+' questions <small>'+Math.min(t.a,g)+'/'+g+'</small></span><button type="button" class="btn sm" data-view="qb">Practise</button></li>'+
   '<li class="'+(weak?'':'done')+'"><i aria-hidden="true"></i><span>Revisit mistakes <small>'+weak+' saved</small></span><button type="button" class="btn sm alt" data-gtbuild="1">Build test</button></li>'+
   '<li><i aria-hidden="true"></i><span>Previous-year questions <small>'+pyqLeft+' not tried</small></span><button type="button" class="btn sm alt" data-view="pyq">Open PYQs</button></li></ul></div>'+
   '<div class="pl-side"><button type="button" class="btn alt" data-progress="1">My progress</button></div></section>';
  var top=$('.kpis',hv);if(top)top.insertAdjacentHTML('beforebegin',h);
  /* install banner */
  if(IM.isOwner&&deferred&&!IM.store.get('inst-dismiss',false)&&!$('.inst',hv))hv.insertAdjacentHTML('afterbegin','<div class="inst" role="region" aria-label="Install"><span>Install Recall Buddy for faster access and offline use.</span><button type="button" class="btn sm" data-install="1">Install</button><button type="button" class="sh-x" data-instno="1" aria-label="Dismiss">×</button></div>');
  /* count-up */
  if(!document.documentElement.classList.contains('rm')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)$$('.kpi .big, .cd b',hv).forEach(function(el){var m=el.firstChild&&/^\d+/.test(el.firstChild.textContent)?el.firstChild:null;if(!m)return;var n=parseInt(m.textContent,10),rest=m.textContent.slice(String(n).length),t0=null;if(n<2)return;(function f(ts){t0=t0||ts;var k=Math.min(1,(ts-t0)/600);m.textContent=Math.round(n*(1-Math.pow(1-k,3)))+rest;if(k<1)requestAnimationFrame(f)})(performance.now())});
}
var _rh=IM.renderHome;IM.renderHome=function(){_rh.apply(this,arguments);try{enhanceHome()}catch(e){if(window.console)console.warn(e)}};
if(IM.view==='home')IM.renderHome();

/* ---------- view transition ---------- */
var _sv=IM.setView;IM.setView=function(v){var r=_sv.apply(this,arguments);document.body.classList.remove('vanim');void document.body.offsetWidth;document.body.classList.add('vanim');return r};

/* ---------- appbar settings button ---------- */
var tools=$('.ab-tools');if(tools&&!$('#settingsbtn')){var b=document.createElement('button');b.type='button';b.id='settingsbtn';b.setAttribute('aria-label','Settings');b.title='Settings';b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';tools.appendChild(b)}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  var t=e.target,x;
  if(t.closest('[data-sheetclose]')){if($('#sheet.ob'))return;closeSheet();return}
  if(t.closest('#settingsbtn')||t.closest('[data-settings]')){openSettings();return}
  if(t.closest('[data-progress]')){openProgress();return}
  if(t.closest('[data-gtbuild]')){IM.setView('gt');return}
  if((x=t.closest('[data-obexam]'))){toggleIn(ob.exams,x.dataset.obexam);var dt0=$('#ob-date');if(dt0)ob.date=dt0.value;obRender();return}
  if((x=t.closest('[data-stexam]'))){var ex=examsOf();toggleIn(ex,x.dataset.stexam);if(!ex.length){IM.toast&&IM.toast('Keep at least one exam selected');return}setProfile({exams:ex,exam:ex.join(' + ')});x.classList.toggle('on');x.setAttribute('aria-checked',ex.indexOf(x.dataset.stexam)>=0);return}
  if(t.closest('[data-resend]')){IM.sendReg();return}
  if(t.closest('[data-obnext]')){var nm=$('#ob-name');if(nm)ob.name=nm.value;var ph=$('#ob-phone');if(ph)ob.phone=ph.value;var dt=$('#ob-date');if(dt)ob.date=dt.value;
    if(ob.step===0){var err=$('#ob-err'),d=String(ob.phone||'').replace(/\D/g,'');if(d.length===12&&d.indexOf('91')===0)d=d.slice(2);
      if(ob.name.trim().length<2){err.textContent='Please enter your name.';nm.focus();return}
      if(!/^[6-9]\d{9}$/.test(d)){err.textContent='Please enter a valid 10-digit mobile number.';ph.focus();return}
      ob.phone=d}
    if(ob.step===1&&!ob.exams.length){$('#ob-err').textContent='Pick at least one exam.';return}
    if(ob.step<2){ob.step++;obRender()}else obFinish(false);return}
  if(t.closest('[data-obback]')){ob.step=Math.max(0,ob.step-1);obRender();return}
  if(t.closest('[data-logotap]')){var lt=Date.now();logoTaps=lt-logoT<1500?logoTaps+1:1;logoT=lt;if(logoTaps>=7){logoTaps=0;ownerSheet()}return}
  if(t.closest('[data-ver]')){var nw=Date.now();verTaps=nw-verT<1500?verTaps+1:1;verT=nw;if(verTaps>=7){verTaps=0;ownerSheet()}return}
  if(t.closest('[data-ownergo]')){var oc=($('#own-code').value||'').trim(),oe=$('#own-err');oe.textContent='Checking…';ownerCheck(oc).then(function(ok){if(!ok){oe.textContent='Not a valid owner code.';return}IM.store.set('owner-code',oc.replace(/\s+/g,''));IM.isOwner=true;if(window.RB_EDITION==='demo'){IM.toast('Owner mode on. Opening the full app…');setTimeout(function(){location.reload()},700);return}deskUnblock();if(IM.license&&IM.license.ensure)IM.license.ensure();IM.toast('Owner mode on');openSettings()});return}
  if(t.closest('[data-ownerlock]')){IM.store.set('owner-code','');IM.isOwner=false;IM.toast('Owner mode off');deskBlock();if(IM.license&&IM.license.ensure)IM.license.ensure();openSettings();return}
  var ownOnly=t.closest('[data-welcome],[data-export],[data-reset],[data-resetyes],[data-install],#st-import');if(ownOnly&&!IM.isOwner)return;
  if(t.closest('[data-welcome]')){onboard();return}
  if((x=t.closest('[data-set]'))){var k=x.dataset.set,v=x.dataset.val;
    if(k==='theme'){IM.store.set('theme',v==='auto'?null:v);var r=document.documentElement;if(v==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',v);var tb=$('#themebtn');if(tb)tb.textContent=(v==='dark'||(v==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))?'☀️':'🌙'}
    else if(k==='fs'){IM.store.set('fs',v);applyPrefs()}
    else if(k==='rm'){IM.store.set('rm',v==='1');applyPrefs()}
    else if(k==='haptics'){IM.store.set('haptics',v==='1')}
    $$('[data-set="'+k+'"]',x.parentNode).forEach(function(b){b.setAttribute('aria-pressed',b===x)});return}
  if(t.closest('[data-export]')){exportData();return}
  if(t.closest('[data-reset]')){confirmReset();return}
  if(t.closest('[data-resetno]')){var cf=$('#sheet .confirm');if(cf)cf.remove();return}
  if(t.closest('[data-resetyes]')){doReset();return}
  if(t.closest('[data-keys]')){keysHelp();return}
  if(t.closest('[data-instno]')){IM.store.set('inst-dismiss',true);var ib=$('.inst');if(ib)ib.remove();return}
  if(t.closest('[data-install]')){
    if(deferred){deferred.prompt();deferred.userChoice.then(function(){deferred=null;var ib=$('.inst');if(ib)ib.remove()})}
    else sheet('<header class="sh-head"><h2 id="sh-t">Install Recall Buddy</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body"><p><b>iPhone / iPad (Safari):</b> tap Share, then Add to Home Screen.</p><p><b>Android (Chrome):</b> open the menu, then Install app or Add to Home screen.</p><p><b>Desktop (Chrome / Edge):</b> click the install icon at the right of the address bar.</p></div>');
    return}
  /* haptics + press feedback on answer options */
  if(t.closest('[data-qbopt],.gt-opt')){buzz(8)}
},true);
document.addEventListener('input',function(e){
  if(e.target.id==='ob-goal'){ob.goal=+e.target.value;var g=$('#ob-gv');if(g)g.textContent=ob.goal;var hn=$('.ob-hint');if(hn)hn.textContent=ob.goal<=20?'Easy start':ob.goal<=50?'Steady':'Intense'}
  if(e.target.id==='st-goal'){IM.stats.setGoal(+e.target.value);var g2=$('#st-gv');if(g2)g2.textContent=IM.stats.goal()}
  if(e.target.id==='st-name')setProfile({name:e.target.value.trim()});
});
document.addEventListener('change',function(e){
  if(e.target.id==='st-date')setProfile({date:e.target.value});
  if(e.target.id==='st-import'&&e.target.files[0]&&IM.isOwner)importData(e.target.files[0]);
  if(e.target.id==='st-date'||e.target.id==='st-goal'){if(IM.view==='home'){var hv=$('#home-view');IM.renderHome()}}
});
document.addEventListener('keydown',function(e){
  var tn=e.target&&e.target.tagName,typing=tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT';
  if(e.key==='Escape'&&$('#sheet')){e.preventDefault();if(!$('#sheet.ob'))closeSheet();return}
  if($('#sheet')){if(e.key==='Tab'){var f=$$('#sheet button,#sheet input,#sheet select,#sheet summary,#sheet label.btn',$('#sheet')).filter(function(n){return !n.disabled&&n.offsetParent});if(f.length){var i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}}if(e.key==='Enter'&&$('#sheet.ob')&&tn==='INPUT'){e.preventDefault();var nx=$('[data-obnext]');if(nx)nx.click()}return}
  if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='?'){e.preventDefault();keysHelp();return}
  /* Q Bank / PYQ practice shortcuts */
  var qv=$('#qb-view');if(qv&&document.body.classList.contains('view-qb')&&qv.offsetParent){
    var k=e.key.toLowerCase(),idx='1234'.indexOf(k);if(idx<0)idx='abcd'.indexOf(k);
    if(idx>=0){var o=$('[data-qbopt="'+idx+'"]:not([disabled])',qv);if(o){e.preventDefault();o.click();return}}
    if(k==='enter'||k==='n'||k==='arrowright'){var nb=$('[data-qbnext]',qv);if(nb){e.preventDefault();nb.click();return}}
    if(k==='b'){var bm=$('.gt-star[data-qbbm]',qv);if(bm){e.preventDefault();bm.click()}}
  }
});

/* ---------- PWA: install prompt, offline, updates ---------- */
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(IM.view==='home')IM.renderHome()});
window.addEventListener('appinstalled',function(){deferred=null;if(IM.toast)IM.toast('Recall Buddy installed')});
function net(){document.body.classList.toggle('offline',!navigator.onLine)}
window.addEventListener('online',function(){net();IM.toast('Back online')});window.addEventListener('offline',function(){net();IM.toast('You are offline. Everything still works.')});net();
window.addEventListener('beforeunload',function(e){if(window.GT&&GT.examOpen&&GT.examOpen()){e.preventDefault();e.returnValue=''}});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').then(function(reg){
    function ready(w){var b=document.createElement('div');b.className='upd';b.setAttribute('role','status');b.innerHTML='<span>A new version is ready.</span><button type="button" class="btn sm">Update</button>';b.querySelector('button').onclick=function(){w.postMessage('skip');};document.body.appendChild(b)}
    if(reg.waiting&&navigator.serviceWorker.controller)ready(reg.waiting);
    reg.addEventListener('updatefound',function(){var w=reg.installing;if(w)w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)ready(w)})});
  }).catch(function(){});
  var rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(rl)return;rl=true;location.reload()});
  });
}

/* ---------- deep links (?view=qb) and first run ---------- */
try{var qv2=new URLSearchParams(location.search).get('view');if(qv2&&['home','study','qb','pyq','gt','daily','practice'].indexOf(qv2)>=0)IM.setView(qv2)}catch(e){}
var sp=$('#splash');if(sp){setTimeout(function(){sp.classList.add('out');setTimeout(function(){sp.remove()},400)},120)}
var _p0=profile();if(!(_p0.done&&_p0.name&&_p0.phone)){document.body.classList.add('gated');setTimeout(onboard,sp?500:100)}
IM.shell={openSettings:openSettings,openProgress:openProgress,onboard:onboard,version:VERSION};
})();
;
/* js/license.js */
/* Recall Buddy FULL edition: paid access, one device, one account.

   How it works (no server needed):
   1. The app creates a random Device ID on this device (shown on the activation screen).
   2. The student picks a plan, pays you (UPI / WhatsApp), and sends you their name, phone number and Device ID.
   3. After you confirm the payment, you create an activation code with the owner tool (make_license.js, kept OFF the website)
      and send it back. The code is signed with your private key and contains: phone, Device ID, plan, expiry date.
   4. The app checks the signature with the PUBLIC key below. The code works only for that phone number on that device,
      and only until the expiry date. A copied code does nothing on another phone.

   Device lock: the Device ID is random but tied to this phone's hardware traits (screen, CPU cores, memory, time zone),
   so copying the app's storage or a backup to another phone gives that phone a NEW Device ID and the code stops working.
   Owner codes (make_license.js --owner) open everything on any device.

   Limits (be aware): this is a "soft lock". All content is in the page files, so a determined developer could bypass it.
   It stops normal sharing of accounts and codes. Hard protection needs a server (login + payment webhook + questions
   served from the server). Clearing browser data creates a new Device ID: the student then needs a new code from you.

   EDIT HERE: LIC.upi (your UPI ID), LIC.payee, prices.                                                              */
(function(){
var IM=window.IM,esc=IM.esc;
function $(s,r){return (r||document).querySelector(s)}
var LIC=IM.license={
  whatsapp:'918384014798',
  upi:'9958321192@upi',                                  /* your UPI ID, e.g. 'name@okbank'. Leave empty to take payment details over WhatsApp. */
  payee:'CHAHAT SAINI',               /* name on the UPI account (as in the QR) */
  upiQR:'img-upi-qr.png',
  plans:[
    {id:'p50', name:'Starter',price:50, line:'Full Q Bank, all PYQs, Daily 20, 2 Grand Tests a month'},
    {id:'p100',name:'Plus',   price:100,line:'Everything in Starter, all study decks, 4 Grand Tests a month'},
    {id:'p150',name:'Pro',    price:150,line:'Everything in Plus, performance analytics, 8 Grand Tests a month'}
  ],
  publicKey:{"kty":"EC","x":"k5BwAI5MQLnjkSKaYr9ArjX8YpmFY70cQ2y-lLmJnkY","y":"K4u_F29xAHW6TNayVW4VaTJbO_NsstOBoC13ingdDSw","crv":"P-256","ext":true,"key_ops":["verify"]},
  graceDays:3                              /* "expires soon" reminder */
};
var state={lic:null,msg:'',busy:false};
/* website mode (set by the page loader, see build_site.py): 'demo' = free demo bundle, 'full' = full bundle after activation */
var SITE=window.RB_EDITION||'';var DEMO=SITE==='demo';
function toDemo(why){if(why)IM.store.set('lic-msg',why);IM.store.set('lic',null);location.reload()}
/* phone / tablet (incl. iPad, which reports itself as a Mac) = full app; computer = Grand Tests only */
LIC.kind=IM.kind||'mobile';   /* computers are blocked in shell.js; only the owner gets here on one */
LIC.kindLabel=function(){return LIC.kind==='mobile'?'Phone / tablet':'Computer (owner)'};
/* screenshot strikes and account block, kept in storage AND a cookie so clearing one does not lift it */
function blockGet(){var b=IM.store.get('lic-block',null),m=document.cookie.match(/(?:^|; )rbblk=(\d+)/);var c=m?+m[1]:0;var at=Math.max(b&&b.at||0,c);return at?{at:at}:null}
function blockSet(at){IM.store.set('lic-block',{at:at});try{document.cookie='rbblk='+at+'; max-age=63072000; path=/; SameSite=Lax'}catch(e){}}
function blockClear(){IM.store.set('lic-block',null);IM.store.set('shot-strikes',0);try{document.cookie='rbblk=; max-age=0; path=/'}catch(e){}}
LIC.blocked=function(){return !!blockGet()};

/* ---------- device id ---------- */
var AB='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/* hardware traits that stay the same on one phone but differ between phones; if they change, this counts as a new device */
function fp(){var sc=window.screen||{},d=[Math.min(sc.width||0,sc.height||0),Math.max(sc.width||0,sc.height||0)];
  var t=[navigator.platform||'',navigator.hardwareConcurrency||0,navigator.deviceMemory||0,d.join('x'),sc.colorDepth||0,Math.round((window.devicePixelRatio||1)*100),(navigator.maxTouchPoints||0)>0?1:0];
  try{t.push(Intl.DateTimeFormat().resolvedOptions().timeZone||'')}catch(e){}
  var s=t.join('|'),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function cookieGet(){var m=document.cookie.match(/(?:^|; )rbdev=([A-Z0-9]{8})\.([a-z0-9]+)/);return m&&m[2]===fp()?m[1]:''}
function cookieSet(v){try{document.cookie='rbdev='+v+'.'+fp()+'; max-age=31536000; path=/; SameSite=Lax'}catch(e){}}
function deviceId(){
  var d=IM.store.get('device',''),f=fp();
  if(!/^[A-Z0-9]{8}$/.test(d||'')||IM.store.get('device-fp','')!==f){
    d=cookieGet();
    if(!d){var a=new Uint8Array(8);(window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach(function(_,i){a[i]=Math.floor(Math.random()*256)});d='';for(var i=0;i<8;i++)d+=AB[a[i]%AB.length]}
    IM.store.set('device',d);IM.store.set('device-fp',f);
  }
  cookieSet(d);return d;
}
LIC.deviceCode=function(){var d=deviceId();return d.slice(0,4)+'-'+d.slice(4)};

/* ---------- code check ---------- */
function b64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function todayStr(){return IM.stats.key()}
function lastSeen(){var s=IM.store.get('lic-seen','');var t=todayStr();if(s>t)return s;IM.store.set('lic-seen',t);return t}   /* clock set back does not extend a licence */
function phone10(){var p=(IM.store.get('profile',{})||{}).phone||'';p=String(p).replace(/\D/g,'');return p.slice(-10)}
function verify(code){
  code=String(code||'').replace(/\s+/g,'');
  var parts=code.split('.');if(parts.length!==2)return Promise.resolve({ok:false,why:'That does not look like an activation code. Paste the whole code we sent you.'});
  if(!window.crypto||!crypto.subtle)return Promise.resolve({ok:false,why:'This browser cannot check codes here. Open Recall Buddy over https (your normal link) in Chrome or Safari.'});
  var pl;try{pl=JSON.parse(new TextDecoder().decode(b64u(parts[0])))}catch(e){return Promise.resolve({ok:false,why:'That code is damaged. Copy it again from WhatsApp.'})}
  return crypto.subtle.importKey('jwk',LIC.publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']).then(function(k){
    return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},k,b64u(parts[1]),new TextEncoder().encode(parts[0]))
  }).then(function(ok){
    if(!ok)return {ok:false,why:'This code is not valid.'};
    if(pl.role==='owner'){if(pl.e&&pl.e<lastSeen())return {ok:false,why:'This owner code has expired.'};return {ok:true,lic:pl,owner:true}}
    if(pl.v!==1)return {ok:false,why:'This code is from a different version.'};
    var devs=[].concat(pl.d||[]);
    if(devs.indexOf(deviceId())<0)return {ok:false,why:'This code was made for a different device. Send us the Device ID shown below and we will issue a code for this one.'};
    if(pl.p!==phone10())return {ok:false,why:'This code belongs to a different phone number than the one you registered with.'};
    if(pl.e&&pl.e<lastSeen())return {ok:false,expired:true,lic:pl,why:'This code expired on '+pl.e+'. Renew to continue.'};
    var bk=blockGet();if(bk){if((pl.i||0)>bk.at||DEMO)blockClear();else return {ok:false,blocked:true,lic:pl,why:'This account was deactivated because screenshots or screen recording were detected. Contact us on WhatsApp to get it reactivated.'}}
    return {ok:true,lic:pl};
  }).catch(function(){return {ok:false,why:'This code is not valid.'}});
}
LIC.verify=verify;

/* ---------- paywall screen ---------- */
function plan(id){return LIC.plans.filter(function(p){return p.id===id})[0]||LIC.plans[1]}
function proofLink(p){
  var pr=IM.store.get('profile',{})||{};
  var t='Hi Recall Buddy team, I have paid for access.\n\nName: '+(pr.name||'')+'\nWhatsApp: +91 '+phone10()+'\nPlan: '+p.name+' (₹'+p.price+')\nDevice ID: '+LIC.deviceCode()+' ('+LIC.kindLabel()+')\n\n(Payment screenshot attached. Please send my activation code.)';
  return 'https://wa.me/'+LIC.whatsapp+'?text='+encodeURIComponent(t);
}
function upiLink(p){return 'upi://pay?pa='+encodeURIComponent(LIC.upi)+'&pn='+encodeURIComponent(LIC.payee)+'&am='+p.price+'&cu=INR&tn='+encodeURIComponent('Recall Buddy '+p.name+' '+phone10())}
function paywall(){
  var el=$('#paywall');if(!el){el=document.createElement('div');el.id='paywall';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Activate Recall Buddy');document.body.appendChild(el)}
  document.body.classList.add('paywalled');
  var pr=IM.store.get('profile',{})||{},sel=IM.store.get('lic-plan','p100'),p=plan(sel),renew=!!(state.lic&&state.lic.expired);
  if(DEMO&&!state.msg)state.msg=IM.store.get('lic-msg','')||'';
  var h='<div class="pw-card">'+(DEMO?'<button type="button" class="sh-x pw-x" data-licclose="1" aria-label="Back to the demo">×</button>':'')+'<img class="pw-logo" src="img-brand-mark.png" alt="" width="64"><h1>'+(DEMO?'Get full access':renew?'Renew Recall Buddy':'Activate Recall Buddy')+'</h1>'+
   '<p class="pw-sub">Full access is for <b>one account</b> on <b>your phone and/or tablet</b> (up to 2 devices). Pay, then paste the activation code we send you.</p>'+
   '<p class="pw-acct">Account: <b>'+esc(pr.name||'')+'</b> · +91 '+esc(phone10())+'</p>'+
   '<h2>1. Choose a plan <small>per month</small></h2><div class="pw-plans" role="radiogroup" aria-label="Plan">'+LIC.plans.map(function(x){return '<button type="button" role="radio" aria-checked="'+(x.id===sel)+'" class="pw-plan'+(x.id===sel?' on':'')+'" data-licplan="'+x.id+'"><span><b>'+esc(x.name)+'</b><small>'+esc(x.line)+'</small></span><span class="pr">₹'+x.price+'</span></button>'}).join('')+'</div>'+(function(){var rp=IM.rb&&IM.rb.plans&&IM.rb.plans.filter(function(z){return z.id===sel})[0];if(!rp||!rp.has)return '';return '<div class="pw-detail"><span class="rb-lbl">What you get with '+esc(rp.name)+'</span><ul class="rb-has">'+rp.has.map(function(z){return '<li>'+esc(z)+'</li>'}).join('')+'</ul>'+(rp.soon&&rp.soon.length?'<span class="rb-lbl soon">Coming later</span><ul class="rb-soon">'+rp.soon.map(function(z){return '<li>'+esc(z)+'</li>'}).join('')+'</ul>':'')+'</div>'})()+
   '<h2>2. Pay ₹'+p.price+'</h2>'+(LIC.upi?'<a class="btn big pw-pay" href="'+esc(upiLink(p))+'">Pay ₹'+p.price+' with UPI</a><p class="pw-note">Or pay to UPI ID <b>'+esc(LIC.upi)+'</b> ('+esc(LIC.payee)+'), or scan this QR from another phone and enter <b>₹'+p.price+'</b>. Keep the screenshot.</p>'+(LIC.upiQR?'<img class="pw-qr" src="'+esc(LIC.upiQR)+'" alt="UPI QR code for '+esc(LIC.upi)+'" width="220" height="220">':''):'<p class="pw-note">Tap step 3 and we will send you the payment details on WhatsApp.</p>')+
   '<h2>3. Send payment proof</h2><a class="btn big alt" target="_blank" rel="noopener noreferrer" href="'+esc(proofLink(p))+'">Send on WhatsApp</a><p class="pw-note">Attach your payment screenshot. Your name, number, plan and Device ID are already in the message. We reply with your activation code.</p>'+
   '<h2>4. Enter your activation code</h2><textarea id="pw-code" rows="3" placeholder="Paste the code here" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><p class="pw-err" id="pw-err" role="alert">'+esc(state.msg||'')+'</p><button type="button" class="btn big" data-licgo="1">Activate</button>'+
   '<div class="pw-dev"><span>Device ID</span><b id="pw-dev">'+LIC.deviceCode()+'</b><button type="button" class="gt-link" data-liccopy="1">Copy</button></div>'+
   '<p class="pw-note">The code works only on the devices you send us (up to 2: a phone and a tablet). For your second device or a new phone, message us from that device with its Device ID. Do not clear browser data, it resets the Device ID.</p></div>';
  el.innerHTML=h;
}
function unlock(){var el=$('#paywall');if(el)el.remove();document.body.classList.remove('paywalled');applyKind()}
/* ---------- computer = Grand Tests only ---------- */
function isOwner(){return !!(state.lic&&state.lic.owner)}
function gtOnly(){return false}   /* computers are no longer allowed at all (see shell.js) */
var _sv=IM.setView;
IM.setView=function(v){if(gtOnly()&&v!=='gt')v='gt';return _sv.call(this,v)};
function applyKind(){document.body.classList.toggle('gt-only',gtOnly());var bar=document.querySelector('.gto-bar');
  if(gtOnly()){if(!bar){var d=document.createElement('div');d.className='gto-bar';d.innerHTML='<b>Computer access: Grand Tests only.</b> Use your phone or tablet for study decks, Q Bank, PYQs and Daily 20.';var ab=document.getElementById('appbar');if(ab)ab.insertAdjacentElement('afterend',d)}if(IM.view!=='gt')IM.setView('gt')}
  else if(bar)bar.remove()}
/* ---------- deactivated screen ---------- */
function blockedScreen(){var el=$('#paywall');if(!el){el=document.createElement('div');el.id='paywall';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  document.body.classList.add('paywalled');var pr=IM.store.get('profile',{})||{};
  var t='Hi Recall Buddy team, my account was deactivated for screenshots / screen recording. I would like to be reactivated.\n\nName: '+(pr.name||'')+'\nWhatsApp: +91 '+phone10()+'\nDevice ID: '+LIC.deviceCode()+' ('+LIC.kindLabel()+')';
  el.innerHTML='<div class="pw-card"><div style="font-size:2.4rem;text-align:center" aria-hidden="true">⛔</div><h1>Account deactivated</h1><p class="pw-sub">Screenshots or screen recording were detected twice on this account. Sharing Recall Buddy content is not allowed.</p><p class="pw-sub">To get access again, contact us. Reactivation is at the owner’s decision and may need a new payment.</p><a class="btn big" target="_blank" rel="noopener noreferrer" href="'+esc('https://wa.me/'+LIC.whatsapp+'?text='+encodeURIComponent(t))+'">Contact us on WhatsApp</a><h2>Have a reactivation code?</h2><textarea id="pw-code" rows="3" placeholder="Paste the new code here" autocomplete="off" spellcheck="false"></textarea><p class="pw-err" id="pw-err" role="alert"></p><button type="button" class="btn big alt" data-licgo="1">Reactivate</button><div class="pw-dev"><span>Device ID</span><b id="pw-dev">'+LIC.deviceCode()+'</b></div></div>'}
LIC.strike=function(how){
  if(DEMO||isOwner()||LIC.blocked())return;
  try{navigator.clipboard&&navigator.clipboard.writeText('Screenshots of Recall Buddy are not allowed.')}catch(e){}
  var n=(IM.store.get('shot-strikes',0)||0)+1;IM.store.set('shot-strikes',n);
  if(SITE==='full'){var sc=(IM.store.get('lic',null)||{}).code;if(sc)fetch('/api/strike',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:sc,device:deviceId()})}).then(function(x){return x.json()}).then(function(j){if(j&&j.blocked&&!LIC.blocked()){blockSet(Date.now());IM.store.set('srv-blocked',1);state.lic={ok:false,blocked:true};if(IM.closeSheet)IM.closeSheet(true);blockedScreen()}}).catch(function(){})}
  if(n>=2){blockSet(Date.now());IM.store.set('srv-blocked',1);state.lic={ok:false,blocked:true};if(IM.closeSheet)IM.closeSheet(true);blockedScreen();return}
  if(IM.sheet)IM.sheet('<header class="sh-head"><h2 id="sh-t">⚠ Screenshot detected</h2></header><div class="sh-body"><p><b>Screenshots and screen recording of Recall Buddy are not allowed.</b></p><p>This is your only warning. If it happens again, your account will be <b>deactivated</b> and you will need to contact us to get it back.</p><div class="btns"><button type="button" class="btn" data-sheetclose="1">I understand</button></div></div>','shot-warn');
};

/* ---------- gate ---------- */
LIC.status=function(){return state.lic&&state.lic.ok?state.lic.lic:null};
LIC.ensure=function(){
  var pr=IM.store.get('profile',{})||{};if(!(pr.done&&pr.name&&pr.phone))return Promise.resolve(false);
  var saved=IM.store.get('lic',null),oc=IM.store.get('owner-code','');
  if(DEMO)return Promise.resolve(false);
  if(!(saved&&saved.code)&&!oc){state.lic=null;if(SITE==='full'){toDemo('');return Promise.resolve(false)}paywall();return Promise.resolve(false)}
  return (oc?verify(oc).then(function(r){return r.ok?r:(saved&&saved.code?verify(saved.code):r)}):verify(saved.code)).then(function(r){
    state.lic=r;
    if(r.ok){unlock();var left=r.lic.e?Math.round((new Date(r.lic.e+'T00:00:00')-new Date(todayStr()+'T00:00:00'))/864e5):null;
      if(left!=null&&left<=LIC.graceDays&&IM.toast)IM.toast('Your access ends in '+(left<=0?'less than a day':left+' day'+(left===1?'':'s'))+'. Renew on WhatsApp to continue.');
      return true}
    state.msg=r.why;if(r.blocked)blockedScreen();else if(SITE==='full')toDemo(r.why);else paywall();return false});
};
LIC.settingsHTML=function(){
  var l=LIC.status();if(!l)return '';if(l.role==='owner')return '<section class="set"><h3>Licence</h3><p class="mut">Owner access'+(l.e?' until <b>'+esc(l.e)+'</b>':'')+'. Device ID: <b>'+LIC.deviceCode()+'</b></p></section>';var p=plan(l.l);
  return '<section class="set"><h3>Licence</h3><p class="mut">Plan: <b>'+esc(p.name)+'</b>'+(l.e?' · valid until <b>'+esc(l.e)+'</b>':'')+'<br>Device ID: <b>'+LIC.deviceCode()+'</b> · account +91 '+esc(phone10())+'</p><p class="mut">Access is tied to this device. To move to a new phone, send your new Device ID on WhatsApp.</p><div class="btns"><a class="btn alt" target="_blank" rel="noopener noreferrer" href="'+esc(proofLink(p))+'">Renew or move device on WhatsApp</a></div></section>';
};

document.addEventListener('click',function(e){
  var t=e.target,x;if(!t.closest)return;
  if(t.closest('[data-licclose]')){unlock();return}
  if((x=t.closest('[data-licplan]'))){IM.store.set('lic-plan',x.dataset.licplan);var v=($('#pw-code')||{}).value;paywall();if(v&&$('#pw-code'))$('#pw-code').value=v;return}
  if(t.closest('[data-liccopy]')){var d=LIC.deviceCode();try{navigator.clipboard.writeText(d);IM.toast&&IM.toast('Device ID copied')}catch(err){}return}
  if(t.closest('[data-licgo]')){
    var code=($('#pw-code').value||'').trim(),err=$('#pw-err');if(!code){err.textContent='Paste your activation code first.';return}
    err.textContent='Checking…';
    verify(code).then(function(r){
      if(r.ok&&DEMO&&LIC.blocked())blockClear();
      if(r.ok&&DEMO){var cc=code.replace(/\s+/g,'');err.textContent='Checking with the server…';
        fetch('/api/unlock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:cc,device:deviceId()})}).then(function(x){if(x.status>=500)throw 0;return x.json()}).then(function(j){
          if(!j.ok){err.textContent=j.why||'This code was not accepted.';return}
          IM.store.set('lic',{code:cc});IM.store.set('fk',{k:j.key,t:Date.now()});IM.store.set('lic-msg','');IM.store.set('srv-blocked',null);err.textContent='Activated. Opening the full app…';setTimeout(function(){location.reload()},600)
        }).catch(function(){err.textContent='No connection to the server. Check your internet and try again.'});return}
      if(r.ok){IM.store.set('lic',{code:code.replace(/\s+/g,'')});state.lic=r;state.msg='';unlock();if(IM.toast)IM.toast('Activated. Welcome'+((IM.store.get('profile',{})||{}).name?', '+IM.store.get('profile',{}).name:'')+'.');if(IM.view==='home')IM.renderHome()}
      else{state.lic=r;err.textContent=r.why}
      if(r.ok)applyKind();
    });return}
});

/* check at start-up (new students are checked right after the welcome screen: see obFinish in shell.js) */
deviceId();
LIC.open=function(){state.msg='';paywall()};
if(DEMO&&IM.store.get('srv-blocked',null))setTimeout(blockedScreen,0);
/* ---------- screenshot / recording guard ----------
   Detectable in a web page: Print Screen, Win+Shift+S, Cmd+Shift+3/4/5/6 (computers). NOT detectable: phone and tablet
   screenshots and any screen recording (the browser is never told). On every device the screen is blurred whenever the
   app loses focus or goes to the app switcher, printing is blocked and text cannot be copied. */
var lastStrike=0;
function hit(){var t=Date.now();if(t-lastStrike<1500)return;lastStrike=t;document.body.classList.add('shield');LIC.strike()}
document.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();
  if(k==='printscreen'||(e.shiftKey&&e.metaKey&&(k==='s'||/^Digit[3456]$/.test(e.code||'')||['3','4','5','6','#','$','%','^'].indexOf(k)>=0)))hit()},true);
document.addEventListener('keyup',function(e){if((e.key||'')==='PrintScreen')hit()},true);
function shield(on){document.body.classList.toggle('shield',!!on&&!isOwner())}
window.addEventListener('blur',function(){shield(true)});
window.addEventListener('focus',function(){shield(false)});
document.addEventListener('visibilitychange',function(){shield(document.hidden)});
document.addEventListener('copy',function(e){if(!isOwner())e.preventDefault()});
document.addEventListener('contextmenu',function(e){if(!isOwner()&&e.target.closest&&e.target.closest('main,.sheet'))e.preventDefault()});
LIC.ensure();
})();
;
/* js/brand.js */
/* Recall Buddy: watermark on every question and study card (all editions).
   A faint logo + a diagonal "RECALL BUDDY · student name" tile is laid over each question, so screenshots
   shared in WhatsApp / Telegram groups still carry the source and the student's name. */
(function(){
var IM=window.IM;
var HOSTS='.gt-exam,.gt-card,.qb-item,.gt-ri,#quiz,#flash,#cards article.card';
/* which hosts really show a question or card (not stats, builder, settings...) */
function isQ(el){
  if(el.matches('#quiz,#flash'))return !!el.querySelector('.q-stem,.gt-stem,.fc,.study-q,h3,p');
  if(el.matches('article.card,.qb-item,.gt-ri'))return true;
  return !!el.querySelector('.gt-stem,.gt-opts,.qb-opts');
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function who(){var p=IM.store.get('profile',{});return (p&&p.name?String(p.name).trim().slice(0,22):'')}
function setTile(){
  var n=who(),t='RECALL BUDDY'+(n?' · '+n.toUpperCase():'');
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><g transform="rotate(-24 150 95)" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="14" fill="#6B7FA3" text-anchor="middle"><text x="150" y="92">'+esc(t)+'</text><text x="150" y="112" font-size="10" font-weight="600">recall-buddy · do not share</text></g></svg>';
  document.documentElement.style.setProperty('--wm-tile','url("data:image/svg+xml;utf8,'+encodeURIComponent(svg).replace(/'/g,'%27')+'")');
}
var busy=false,last='';
function apply(){
  busy=false;
  var n=who();if(n!==last){last=n;setTile()}
  var hosts=document.querySelectorAll(HOSTS);
  for(var i=0;i<hosts.length;i++){
    var h=hosts[i];
    if(h.querySelector(':scope>.wm')){continue}
    if(!isQ(h))continue;
    h.classList.add('wm-host');
    var w=document.createElement('i');w.className='wm';w.setAttribute('aria-hidden','true');
    h.appendChild(w);
    if(h.matches('.gt-exam,.gt-card,.qb-item,.gt-ri,article.card')){
      var t=document.createElement('span');t.className='wm-tag';t.setAttribute('aria-hidden','true');
      t.innerHTML='<img src="img-brand-mark.png" alt="">Recall Buddy';h.appendChild(t);
    }
  }
}
function queue(){if(busy)return;busy=true;(window.requestAnimationFrame||setTimeout)(apply)}
setTile();
new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',queue);queue();
IM.watermark=queue;
})();
;
/* beta/beta.js */
/* Recall Buddy BETA / promo edition (only included when building with:  python3 build.py beta)
   - limits the Grand Test to a short demo paper
   - shows locked subjects, a beta banner and "unlock" cards
   - interest form + price poll that is sent to the owner on WhatsApp (nothing is stored on a server) */
(function(){
var IM=window.IM,esc=IM.esc,SITE_DEMO=window.RB_EDITION==='demo',CTA=SITE_DEMO?'Get full access':'Get early access';
function $(s,r){return (r||document).querySelector(s)}

/* ======== EDIT HERE ======== */
var RB={
  whatsapp:'918384014798',          /* country code + number, digits only (+91 8384014798) */
  launch:'December 2026',
  full:{questions:'6,000+',pyq:'2,500+',tests:'full-length Grand Tests (NEET PG and INI-CET patterns)'},
  /* Price poll. Edit the names, prices and what each plan includes before launch. */
  plans:[
    {id:'p50', price:50, name:'Starter', line:'Full Q Bank + all PYQs · 2 Grand Tests a month',
     has:['Full Q Bank: 3,400+ previous-year-topic (PYT) questions with explanations','All 2,500+ previous-year questions (NEET PG, INI-CET, AIIMS) with full solutions','Daily 20: a new 20-question set every day that brings back your mistakes','2 Grand Tests a month (NEET PG pattern or INI-CET pattern)','Mistakes and bookmarks lists, Continue where you left off'],
     soon:['Solution videos for selected questions','Daily reminders on WhatsApp']},
    {id:'p100',price:100,name:'Plus',    line:'Everything in Starter + all study cards & flashcards · 4 Grand Tests a month',
     has:['Everything in Starter','All study decks: every subject, cards, flashcards and quizzes','Recall modes (Reveal, Choose, Type) and weak-spot drills','4 Grand Tests a month (both patterns, build-your-own paper)'],
     soon:['Spaced-repetition schedule for your flashcards','Subject-wise test series','More image-based questions']},
    {id:'p150',price:150,name:'Pro',     line:'Everything in Plus + performance analytics · 8 Grand Tests a month',
     has:['Everything in Plus','8 Grand Tests a month','Performance analytics: accuracy by subject, previous-year paper coverage, Grand Test score trend, weak subjects'],
     soon:['AI-written Daily 20 built from your mistakes and weak topics','Rank among all students on each Grand Test','Study plan to your exam date (NEET PG and INI-CET together)','Doubt support from the team']}
  ]
};
IM.edition='beta';IM.rb=RB;

/* ---------- Grand Test: one short demo paper ---------- */
if(window.GT){GT.noPatterns=true;GT.config.sections=[{name:'Demo test',minutes:23,count:25}];GT.config.maxTotal=25;GT.config.title='Grand Test (demo)';GT.bank=[[]]}

/* ---------- banner ---------- */
document.body.classList.add('has-beta');
var bar=document.createElement('div');bar.className='rb-beta';
bar.innerHTML=SITE_DEMO?'<b>DEMO</b><span>You are using the free demo. Pay once on WhatsApp to unlock everything.</span><button type="button" data-rbform="banner">'+CTA+'</button>':'<b>BETA</b><span>Free preview: a sample of Recall Buddy. Full version launches '+esc(RB.launch)+'.</span><button type="button" data-rbform="banner">'+CTA+'</button>';
document.body.insertBefore(bar,document.body.firstChild);

/* ---------- interest form (opens WhatsApp with the details filled in) ---------- */
function profile(){return IM.store.get('profile',{})||{}}
function digits(s){return String(s||'').replace(/\D/g,'')}
function planOf(id){return RB.plans.filter(function(p){return p.id===id})[0]}
function openForm(src){
  var pr=profile(),lead=IM.store.get('lead',{})||{};
  var exams=['NEET PG','INI-CET','FMGE','Other'],ex=lead.exam||(pr.exams&&pr.exams[0])||'NEET PG';
  var h='<header class="sh-head"><h2 id="sh-t">Get early access</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body"><form class="rb-form" id="rb-form" novalidate>'+
   '<p class="lead">Interested in the full Recall Buddy ('+RB.full.questions+' questions, '+RB.full.pyq+' PYQs, all study material)? Fill this in. It opens WhatsApp with your details ready to send.</p>'+
   '<label class="fld">Your name<input type="text" id="rb-name" autocomplete="name" value="'+esc(lead.name||pr.name||'')+'" required></label>'+
   '<label class="fld">WhatsApp number<input type="tel" id="rb-phone" inputmode="tel" autocomplete="tel" placeholder="98XXXXXXXX" value="'+esc(lead.phone||pr.phone||'')+'" required></label>'+
   '<label class="fld">College and year<input type="text" id="rb-college" placeholder="e.g. GMC Nagpur, intern" value="'+esc(lead.college||'')+'"></label>'+
   '<label class="fld">Exam you are preparing for<select id="rb-exam">'+exams.map(function(e){return '<option'+(e===ex?' selected':'')+'>'+e+'</option>'}).join('')+'</select></label>'+
   '<fieldset class="rb-poll"><legend>Choose the plan you would take</legend><p class="rb-sub">Three plans. Tap one to select it. “Coming later” are ideas we are building next, and your choice helps us decide the order.</p>'+
   RB.plans.map(function(p){return '<label class="rb-tier"><input type="radio" name="rb-plan" value="'+p.id+'"'+(lead.plan===p.id?' checked':'')+'><span class="rb-tier-in"><span class="rb-tier-h"><b>'+esc(p.name)+'</b><span class="pr">₹'+p.price+'<small>/mo</small></span></span>'+
     '<span class="rb-lbl">What you get</span><ul class="rb-has">'+p.has.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>'+
     '<span class="rb-lbl soon">Coming later</span><ul class="rb-soon">'+p.soon.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></span></label>'}).join('')+
   '<label class="rb-plan"><input type="radio" name="rb-plan" value="unsure"'+(lead.plan==='unsure'?' checked':'')+'><span><b>Not sure yet</b><small>Tell me when it launches</small></span><span></span></label></fieldset>'+
   '<label class="fld">Anything you want added? (optional)<textarea id="rb-note" rows="2" placeholder="Subjects, features, test series...">'+esc(lead.note||'')+'</textarea></label>'+
   '<p class="err" id="rb-err" role="alert"></p>'+
   '<button type="submit" class="btn big">Send on WhatsApp</button>'+
   '<p class="note">Your details are not stored on any server. They only go in the WhatsApp message that you press Send on.</p></form></div>';
  IM.sheet(h,'rb-sheet');
}
function submit(){
  var name=($('#rb-name').value||'').trim(),ph=digits($('#rb-phone').value),college=($('#rb-college').value||'').trim(),exam=$('#rb-exam').value,note=($('#rb-note').value||'').trim();
  var pe=$('input[name=rb-plan]:checked'),plan=pe?pe.value:'',err=$('#rb-err');
  if(ph.length===12&&ph.indexOf('91')===0)ph=ph.slice(2);
  if(name.length<2){err.textContent='Please enter your name.';$('#rb-name').focus();return}
  if(ph.length!==10){err.textContent='Please enter a valid 10-digit WhatsApp number.';$('#rb-phone').focus();return}
  if(!plan){err.textContent='Please pick a price option (or "Not sure yet").';return}
  var p=planOf(plan),pt=p?'₹'+p.price+'/month ('+p.name+')':'Not sure yet';
  var msg='Hi Recall Buddy team, I am interested in early access to the full app.\n\n'+
   'Name: '+name+'\nWhatsApp: +91 '+ph+'\n'+(college?'College/Year: '+college+'\n':'')+'Exam: '+exam+'\nMonthly price I would pay: '+pt+'\n'+(note?'Wants: '+note+'\n':'')+'\n(Sent from Recall Buddy beta)';
  IM.store.set('lead',{name:name,phone:ph,college:college,exam:exam,plan:plan,note:note,at:new Date().toISOString()});
  var url='https://wa.me/'+RB.whatsapp+'?text='+encodeURIComponent(msg);
  var card=$('#sheet .sheet-card');
  if(card)card.innerHTML='<header class="sh-head"><h2 id="sh-t">Almost done</h2><button type="button" class="sh-x" data-sheetclose="1" aria-label="Close">×</button></header><div class="sh-body"><div class="rb-done"><div class="ic" style="font-size:2.2rem">💬</div><p><b>WhatsApp should open now.</b> Press <b>Send</b> there so we receive your details.</p><a class="btn" href="'+esc(url)+'" target="_blank" rel="noopener">Open WhatsApp again</a><button type="button" class="btn ghost" data-sheetclose="1">Back to the app</button></div></div>';
  var l=document.createElement('a');l.href=url;l.target='_blank';l.rel='noopener noreferrer';document.body.appendChild(l);l.click();l.remove();
}
document.addEventListener('submit',function(e){if(e.target.id==='rb-form'){e.preventDefault();submit()}});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-rbform]');if(b){e.preventDefault();if(SITE_DEMO&&IM.license&&IM.license.open)IM.license.open();else openForm(b.dataset.rbform)}});

/* ---------- locked subjects ---------- */
function lockPanel(host,s){
  host.innerHTML='<div class="rb-lock"><div class="ic">🔒</div><h3>'+esc(s.title)+' is part of the full version</h3><p>The full app has '+s.lockedCards+' cards, flashcards and quizzes for this subject. The beta includes a few subjects so you can try the app.</p><button type="button" class="btn" data-rbform="locked-'+esc(s.id)+'">Get early access</button></div>';
}
['Cards:cards','Flash:flash','Quiz:quiz','Numbers:numbers','Cheat:cheat'].forEach(function(x){
  var a=x.split(':'),fn='render'+a[0],orig=IM[fn];if(!orig)return;
  IM[fn]=function(){var s=IM.cur&&IM.cur();if(s&&s.locked){var h=$('#'+a[1]);if(h)lockPanel(h,s);return}return orig.apply(this,arguments)};
});
function markSubjects(){
  var host=$('#subjects');if(!host)return;
  Array.prototype.forEach.call(host.querySelectorAll('[data-subject]'),function(b){
    var s=IM.subjects[b.dataset.subject];if(s&&s.locked&&!b.classList.contains('is-locked')){b.classList.add('is-locked');var sp=b.querySelector('span');if(sp)sp.textContent='🔒'}
  });
}

/* ---------- "unlock" cards on the main screens ---------- */
var MSG={
  'qb-view':['Unlock the full Q Bank','This beta shows a sample of every subject. The full app has '+RB.full.questions+' exam-style questions and '+RB.full.pyq+' previous-year questions with full solutions.'],
  'home-view':['Want everything?','You are using the free beta. The full Recall Buddy has '+RB.full.questions+' questions, every study subject and '+RB.full.tests+'.'],
  'gt-view':['Full-length Grand Tests','The beta has one 25-question demo test. The full app has timed '+RB.full.tests+' with section-wise analysis.']
};
function addCTAs(){
  Object.keys(MSG).forEach(function(id){
    var el=document.getElementById(id);if(!el||el.querySelector('.rb-cta'))return;
    if(el.querySelector('.qb-bar,.gt-exam'))return;           /* not in the middle of a question or an exam */
    if(!el.children.length)return;
    var d=document.createElement('section');d.className='rb-cta';
    d.innerHTML='<h3>'+MSG[id][0]+'</h3><p>'+MSG[id][1]+'</p><button type="button" class="btn" data-rbform="'+id+'">'+CTA+'</button>';
    el.appendChild(d);
  });
}
var busy=false;
function tick(){busy=false;markSubjects();addCTAs()}
new MutationObserver(function(){if(!busy){busy=true;requestAnimationFrame(tick)}}).observe(document.body,{childList:true,subtree:true});
tick();
})();
;