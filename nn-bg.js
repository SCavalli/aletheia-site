/* Живая нейросеть — фон всего сайта и ДНК бренда.
   13.08: вынесено из index.html в общий файл, чтобы тот же фон жил на всех
   страницах, а не только на главной (просьба Сергея).
   Ничего не прячет и ни на что не влияет: если скрипт не выполнится,
   страница остаётся полностью читаемой. Единой точки отказа здесь нет.

   Плотность и яркость: Сергей 13.08 — «точки ярче и в большем количестве».
   Делитель площади уменьшен вдвое (24000 → 12000), потолок 120 → 170,
   альфы узлов, ореолов и связей подняты. Прозрачность самого холста
   задаётся в CSS (#nn-canvas), там же поднято с .5 до .85. */
(function(){
  var cv=document.getElementById('nn-canvas');
  if(!cv){                                  // на внутренних страницах холста в разметке может не быть
    cv=document.createElement('canvas');
    cv.id='nn-canvas'; cv.setAttribute('aria-hidden','true');
    document.body.insertBefore(cv,document.body.firstChild);
  }
  const ctx=cv.getContext('2d'); if(!ctx) return;
  let W,H,DPR,nodes=[],pulses=[],mouse={x:-9999,y:-9999,active:false},raf;
  let ACC=[34,211,238]; const DIM=[109,94,252];
  let densityK=1, glowK=1;   // ручки панели Tweaks
  const hex2rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
  window.__nnAccent=h=>{ACC=hex2rgb(h);build();};
  window.__nnDensity=k=>{densityK=k;build();};
  window.__nnGlow=k=>{glowK=k;};
  const mix=(a,b,t)=>[Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)];
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function build(){
    /* Плотность считается от площади экрана. У телефона площадь в 4 раза меньше
       десктопной, и на общем делителе выходило ~27 точек на весь экран — пусто.
       Сергей смотрит с телефона, поэтому для узких экранов делитель мельче. */
    const div = W<700 ? 7000 : 12000;
    const count=Math.round(Math.min(170,Math.max(10,((W*H)/div)*densityK)));
    nodes=[];
    for(let i=0;i<count;i++){
      const hub=Math.random()<0.14;
      nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*0.16,vy:(Math.random()-.5)*0.16,
        r:hub?(2.2+Math.random()*1.3):(0.9+Math.random()*1),hub,
        col:Math.random()<.62?ACC:DIM,ph:Math.random()*Math.PI*2});
    }
  }
  function resize(){
    DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
    cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);build();
  }
  const LINK=155;
  function step(t){
    ctx.clearRect(0,0,W,H);
    for(const n of nodes){
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1;
      if(mouse.active){const dx=mouse.x-n.x,dy=mouse.y-n.y,d=Math.hypot(dx,dy);if(d<170){n.x+=dx/d*0.5;n.y+=dy/d*0.5;}}
    }
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
        if(d<LINK){const al=1-d/LINK,c=mix(a.col,b.col,.5);
          /* Сергей просил ярче ТОЧКИ. Связи при выросшей плотности сами по себе
             дают сетку гуще, поэтому их альфу держим тише исходной — иначе
             паутина ложится поверх текста карточек и мешает читать. */
          ctx.strokeStyle=rgba(c,al*0.26*glowK);ctx.lineWidth=al*1.05+0.25;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
    }
    for(const n of nodes){
      const glow=(0.6+0.4*Math.sin(t*0.0015+n.ph))*glowK;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r+(n.hub?5:2.6),0,7);ctx.fillStyle=rgba(n.col,(n.hub?0.22:0.15)*glow);ctx.fill();
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,7);ctx.fillStyle=rgba(n.hub?[255,255,255]:n.col,(n.hub?1:.88)*glow);ctx.fill();
    }
    if(Math.random()<0.05&&nodes.length>2){
      const a=nodes[(Math.random()*nodes.length)|0];let best=null,bd=1e9;
      for(const b of nodes){if(b===a)continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<LINK&&d<bd){bd=d;best=b;}}
      if(best)pulses.push({a,b:best,t:0,sp:0.011+Math.random()*0.016});
    }
    for(let k=pulses.length-1;k>=0;k--){
      const p=pulses[k];p.t+=p.sp;if(p.t>=1){pulses.splice(k,1);continue;}
      const x=p.a.x+(p.b.x-p.a.x)*p.t,y=p.a.y+(p.b.y-p.a.y)*p.t;
      ctx.beginPath();ctx.arc(x,y,4.5,0,7);ctx.fillStyle=rgba(ACC,.12);ctx.fill();
      ctx.beginPath();ctx.arc(x,y,1.8,0,7);ctx.fillStyle=rgba(ACC,.95);ctx.fill();
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
