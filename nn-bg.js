/* Живой фон — сеть AI-сотрудников. Общий для всех страниц сайта.
   Ничего не прячет и ни на что не влияет: если скрипт не выполнится,
   страница остаётся полностью читаемой.

   13.08, Сергей: «выглядит как созвездия, а не как агенты». Так и было —
   точки соединялись по принципу «кто рядом», а это ровно алгоритм звёздного
   неба. Смысла в картинке ноль. Здесь структура другая и повторяет то, что
   мы продаём: ОРКЕСТРАТОР, вокруг него на орбите свои АГЕНТЫ, между
   оркестраторами — магистраль, по связям бегут ПАКЕТЫ данных.
   Связи рисуются только по этой топологии, случайных линий «по близости» нет.

   13.08, он же: «движений мало» — скорость орбит, дрейфа и частота пакетов
   подняты, мерцание узлов ускорено. */
(function(){
  var cv=document.getElementById('nn-canvas');
  if(!cv){                                  // на внутренних страницах холста в разметке может не быть
    cv=document.createElement('canvas');
    cv.id='nn-canvas'; cv.setAttribute('aria-hidden','true');
    document.body.insertBefore(cv,document.body.firstChild);
  }
  const ctx=cv.getContext('2d'); if(!ctx) return;
  let W,H,DPR,hubs=[],packets=[],mouse={x:-9999,y:-9999,active:false},raf,last=0;
  let ACC=[34,211,238]; const DIM=[109,94,252];
  let densityK=1, glowK=1;                  // ручки панели Tweaks
  const hex2rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
  window.__nnAccent=h=>{ACC=hex2rgb(h);build();};
  window.__nnDensity=k=>{densityK=k;build();};
  window.__nnGlow=k=>{glowK=k;};
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

  function build(){
    /* Оркестраторов немного — иначе каша. У телефона площадь вчетверо меньше,
       поэтому делитель для узких экранов мельче, иначе на экране один узел. */
    const div = W<700 ? 105000 : 190000;
    const n = Math.round(Math.min(9, Math.max(3, (W*H/div)*densityK)));
    hubs=[];
    for(let i=0;i<n;i++){
      const hub={
        x:rnd(W*.1,W*.9), y:rnd(H*.1,H*.9),
        vx:rnd(-.22,.22), vy:rnd(-.18,.18),      // дрейф самого оркестратора
        r:rnd(3.2,4.4), ph:Math.random()*Math.PI*2,
        col:i%3===2?DIM:ACC, agents:[],
        tx:null, ty:null,                        // цель притяжения (режимы секций)
        k:1, kT:1                                // яркость: текущая и целевая
      };
      const count=Math.round(rnd(5,9)*densityK);
      const orbit=rnd(64,130);
      for(let k=0;k<count;k++){
        hub.agents.push({
          a:Math.random()*Math.PI*2,                    // угол на орбите
          sp:rnd(0.00022,0.00055)*(Math.random()<.5?-1:1), // рад/мс, знак = направление
          rad:orbit*rnd(.62,1.25), rad0:0, ringA:null, ringR:0,
          size:rnd(2.2,3.4), ph:Math.random()*Math.PI*2,
          col:Math.random()<.72?hub.col:(hub.col===ACC?DIM:ACC)
        });
      }
      for(const ag of hub.agents) ag.rad0=ag.rad;
      hubs.push(hub);
    }
    packets=[];
  }

  /* ---------- РЕЖИМЫ СЕКЦИЙ ----------
     Фон перестаёт быть обоями и показывает то, о чём секция говорит.
     Секций нет (внутренние страницы) — режим остаётся свободным, как был. */
  let mode='free', focusEl=null, seqI=0, seqAt=0;
  const howEl=document.querySelector('.how');
  const cards=[].slice.call(document.querySelectorAll('.l2-item'));
  if(howEl&&'IntersectionObserver' in window){
    new IntersectionObserver(es=>{
      es.forEach(e=>{ if(e.target===howEl) mode = e.isIntersecting ? 'steps' : 'free'; });
    },{threshold:.32}).observe(howEl);
  }
  cards.forEach((el,i)=>{
    const on=()=>{focusEl={el,i};}, off=()=>{ if(focusEl&&focusEl.el===el) focusEl=null; };
    el.addEventListener('mouseenter',on); el.addEventListener('mouseleave',off);
    el.addEventListener('focus',on); el.addEventListener('blur',off);
  });
  const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};

  function applyMode(t){
    if(!hubs.length) return;
    if(mode==='steps'&&howEl){
      /* «Как это устроено»: сеть собирается в ОДНОГО оркестратора, агенты
         встают ровным кольцом, задачи уходят к ним по очереди — в такт шагам. */
      const c=center(howEl), lead=hubs[0];
      /* На телефоне секция — одна колонка текста во всю ширину, и узел в центре
         ложится белым ядром прямо на заголовок. Уводим его к правому полю. */
      lead.tx = W<700 ? W*0.84 : Math.min(Math.max(c.x, W*0.3), W*0.8);
      lead.ty = Math.min(Math.max(c.y, H*0.28), H*0.72);
      lead.kT=1.35;
      /* Кольцо шире полосы шагов: агенты окружают процесс, а не толкутся
         в его середине. Радиус от меньшей стороны — на телефоне не вылезает. */
      const n=lead.agents.length, R=Math.min(W,H)*(W<700?0.34:0.36);
      lead.agents.forEach((ag,i)=>{ ag.ringA=i*Math.PI*2/n; ag.ringR=R; });
      for(let i=1;i<hubs.length;i++){ hubs[i].kT=0.12; hubs[i].tx=null; hubs[i].agents.forEach(a=>a.ringA=null); }
      if(t-seqAt>620){                                  // пакет к следующему агенту — «шаг за шагом»
        seqAt=t; seqI=(seqI+1)%Math.max(n,1);
        const ag=lead.agents[seqI];
        if(ag) packets.push({type:'spoke',hub:lead,ag,t:0,sp:.02,back:false,col:ACC});
      }
      return;
    }
    // свободный режим + подсветка кластера под карточкой услуги
    if(focusEl&&hubs.length){
      const idx=focusEl.i%hubs.length, c=center(focusEl.el);
      const r=focusEl.el.getBoundingClientRect();
      /* Кольцо по габаритам карточки: команда агентов ОКРУЖАЕТ услугу,
         а не толчётся поверх её текста. */
      const R=Math.max(r.width,r.height)*0.62;
      hubs.forEach((h,i)=>{
        if(i===idx){
          h.tx=c.x; h.ty=c.y; h.kT=1.5;
          const n=h.agents.length;
          h.agents.forEach((a,j)=>{ a.ringA=j*Math.PI*2/n; a.ringR=R; });
        }else{
          h.tx=null; h.kT=0.3; h.agents.forEach(a=>a.ringA=null);
        }
      });
    }else{
      hubs.forEach(h=>{ h.tx=null; h.kT=1; h.agents.forEach(a=>a.ringA=null); });
    }
  }
  function resize(){
    DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
    cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);build();
  }
  /* Позиция агента считается каждый кадр — храним только угол, так орбита
     остаётся ровной и не накапливает ошибку. */
  function agentXY(hub,ag){
    return {x:hub.x+Math.cos(ag.a)*ag.rad, y:hub.y+Math.sin(ag.a)*ag.rad*0.58}; // сплюснуто — читается как орбита, а не как круг
  }
  function diamond(x,y,s,fill){
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
    ctx.fillStyle=fill;ctx.fillRect(-s/2,-s/2,s,s);ctx.restore();
  }
  function spawnPacket(){
    if(!hubs.length) return;
    const hub=hubs[(Math.random()*hubs.length)|0];
    if(Math.random()<.28 && hubs.length>1){           // магистраль между оркестраторами
      let other=hubs[(Math.random()*hubs.length)|0];
      if(other===hub) return;
      packets.push({type:'trunk',a:hub,b:other,t:0,sp:rnd(.006,.013),col:ACC});
    }else{                                            // задача оркестратор → агент и обратно
      if(!hub.agents.length) return;
      const ag=hub.agents[(Math.random()*hub.agents.length)|0];
      packets.push({type:'spoke',hub,ag,t:0,sp:rnd(.012,.026),
        back:Math.random()<.5,col:ag.col});
    }
  }
  function step(t){
    const dt=last?Math.min(t-last,50):16; last=t;
    ctx.clearRect(0,0,W,H);
    applyMode(t);

    for(const hub of hubs){
      if(hub.tx!=null){                               // режим секции: узел притянут к цели
        hub.x+=(hub.tx-hub.x)*0.055*dt/16;
        hub.y+=(hub.ty-hub.y)*0.055*dt/16;
      }else{
        hub.x+=hub.vx*dt/16; hub.y+=hub.vy*dt/16;
        const m=140;
        if(hub.x<-m||hub.x>W+m)hub.vx*=-1;
        if(hub.y<-m||hub.y>H+m)hub.vy*=-1;
      }
      hub.k+=(hub.kT-hub.k)*0.07*dt/16;               // яркость меняется плавно, без щелчка
      if(mouse.active&&hub.tx==null){                 // курсор чуть притягивает узел — интерактив был и остаётся
        const dx=mouse.x-hub.x,dy=mouse.y-hub.y,d=Math.hypot(dx,dy);
        if(d<220&&d>1){hub.x+=dx/d*0.6;hub.y+=dy/d*0.6;}
      }
      for(const ag of hub.agents){
        ag.a+=ag.sp*dt;
        if(ag.ringA!=null){                           // выстраивание в ровное кольцо
          let d=((ag.ringA-ag.a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
          ag.a+=d*0.06*dt/16;
          ag.rad+=(ag.ringR-ag.rad)*0.06*dt/16;
        }else if(ag.rad0){
          ag.rad+=(ag.rad0-ag.rad)*0.05*dt/16;        // возврат к своей орбите
        }
      }
    }

    // магистраль между оркестраторами — рисуется первой, лежит глубже
    for(let i=0;i<hubs.length;i++){
      for(let j=i+1;j<hubs.length;j++){
        const a=hubs[i],b=hubs[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<Math.max(W,H)*0.62){
          ctx.strokeStyle=rgba(ACC,0.10*glowK*Math.min(a.k,b.k));ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
    }
    // спицы оркестратор → агент
    for(const hub of hubs){
      for(const ag of hub.agents){
        const p=agentXY(hub,ag);
        ctx.strokeStyle=rgba(ag.col,0.20*glowK*hub.k);ctx.lineWidth=.9;
        ctx.beginPath();ctx.moveTo(hub.x,hub.y);ctx.lineTo(p.x,p.y);ctx.stroke();
      }
    }
    // агенты
    for(const hub of hubs){
      for(const ag of hub.agents){
        const p=agentXY(hub,ag);
        const tw=(0.62+0.38*Math.sin(t*0.0032+ag.ph))*glowK*hub.k;
        ctx.beginPath();ctx.arc(p.x,p.y,ag.size+3.2,0,7);
        ctx.fillStyle=rgba(ag.col,0.14*tw);ctx.fill();
        diamond(p.x,p.y,ag.size*1.7,rgba(ag.col,0.92*tw));
      }
    }
    // оркестраторы — кольцо + белое ядро, читаются как центры, а не как звёзды
    for(const hub of hubs){
      const tw=(0.7+0.3*Math.sin(t*0.0022+hub.ph))*glowK*hub.k;
      ctx.beginPath();ctx.arc(hub.x,hub.y,hub.r+9,0,7);
      ctx.fillStyle=rgba(hub.col,0.10*tw);ctx.fill();
      ctx.strokeStyle=rgba(hub.col,0.5*tw);ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(hub.x,hub.y,hub.r+5,0,7);ctx.stroke();
      ctx.beginPath();ctx.arc(hub.x,hub.y,hub.r,0,7);
      ctx.fillStyle=rgba([255,255,255],0.95*tw);ctx.fill();
    }

    // пакеты данных
    if(Math.random()<0.22) spawnPacket();
    for(let k=packets.length-1;k>=0;k--){
      const p=packets[k];p.t+=p.sp*dt/16;
      if(p.t>=1){packets.splice(k,1);continue;}
      let x,y;
      if(p.type==='trunk'){
        x=p.a.x+(p.b.x-p.a.x)*p.t; y=p.a.y+(p.b.y-p.a.y)*p.t;
      }else{
        const e=agentXY(p.hub,p.ag), tt=p.back?1-p.t:p.t;
        x=p.hub.x+(e.x-p.hub.x)*tt; y=p.hub.y+(e.y-p.hub.y)*tt;
      }
      ctx.beginPath();ctx.arc(x,y,4.6,0,7);ctx.fillStyle=rgba(p.col,.12);ctx.fill();
      diamond(x,y,3.4,rgba(p.col,.98));
    }
    raf=requestAnimationFrame(step);
  }
  addEventListener('resize',resize);
  addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;});
  addEventListener('mouseleave',()=>{mouse.active=false;mouse.x=mouse.y=-9999;});
  addEventListener('touchmove',e=>{const t=e.touches[0];if(t){mouse.x=t.clientX;mouse.y=t.clientY;mouse.active=true;}},{passive:true});
  addEventListener('touchend',()=>{mouse.active=false;});
  resize();
  if(reduce){ step(0); } else { raf=requestAnimationFrame(step); }
})();
