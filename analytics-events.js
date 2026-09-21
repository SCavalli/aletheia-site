/* ALETHEIA — события сайта. Редакция 20.09 по замечаниям аудита.

   Счётчика на сайте пока НЕТ: ни Метрики, ни GA. Скрипт ничего не грузит сам —
   он раскладывает события по приёмникам, когда те появятся.

   Что изменено после аудита:
   1. ID Метрики берём ТОЛЬКО из window.ALETHEIA_YM_ID. Раньше был запасной путь
      через внутренние структуры Ya._metrika — это недокументированное свойство,
      полагаться на него нельзя.
   2. События, случившиеся до инициализации счётчика (например, product_view на
      первой миллисекунде), больше не теряются: они копятся в очереди и уходят,
      как только приёмник появляется.
   3. Отправляем в ОДИН приёмник: ym, иначе gtag, иначе dataLayer. Раньше при
      совместной настройке GA и GTM одно действие могло посчитаться дважды.
   4. Карта событий покрывает все четыре направления, а не только пентест:
      product_view, cta_click, telegram_click, form_start, lead_accepted,
      demo_open, faq_open, ai_block_view, security_from_home.

   ГРАНИЦА ПО ДАННЫМ (требование Сергея 20.09): события передают только факт
   действия. Содержимое заявок, контакты, описания инфраструктуры, пароли и ключи
   в аналитику НЕ уходят — ни в параметрах, ни в имени события. Единственный
   текстовый параметр — заголовок вопроса FAQ: это наш собственный текст со
   страницы. Добавляя событие, проверяй, что в params нет полей формы.

   lead_accepted ≠ «лид в CRM». Здесь это подтверждение обработчиком приёма
   заявки; связка с реальной записью в CRM — задача на стороне бота и почты. */
(function(){
  'use strict';

  /* Продукт страницы: сначала явная разметка <body data-product>, иначе имя файла. */
  var PRODUCT_BY_FILE = {
    '': 'home', 'index.html': 'home', 'agents.html': 'agent',
    'security.html': 'security', 'rezident.html': 'resident',
    'uchti.html': 'uchti'
  };
  var file = location.pathname.split('/').pop();
  var PRODUCT = (document.body && document.body.getAttribute('data-product')) ||
                PRODUCT_BY_FILE[file] || 'other';

  var queue = [];

  function receiver(){
    if (typeof window.ym === 'function' && window.ALETHEIA_YM_ID) return 'ym';
    if (typeof window.gtag === 'function') return 'gtag';
    if (Array.isArray(window.dataLayer)) return 'dataLayer';
    return null;
  }

  function deliver(name, params){
    var to = receiver();
    if (!to) return false;
    try{
      if (to === 'ym') window.ym(window.ALETHEIA_YM_ID, 'reachGoal', name, params);
      else if (to === 'gtag') window.gtag('event', name, params);
      else window.dataLayer.push(Object.assign({event:name}, params));
      return true;
    }catch(e){ return false; }   /* аналитика не имеет права ломать страницу */
  }

  function flush(){
    if (!receiver()) return;
    while (queue.length){
      var ev = queue.shift();
      if (!deliver(ev.name, ev.params)){ queue.unshift(ev); return; }
    }
  }

  function send(name, params){
    var p = Object.assign({product: PRODUCT}, params || {});
    if (!deliver(name, p)) queue.push({name:name, params:p});
  }
  window.aletheiaEvent = send;

  /* Счётчик могут подключить позже — пробуем разобрать очередь несколько раз,
     затем перестаём дёргать таймер. Без приёмника события просто не отправляются. */
  var tries = 0;
  var timer = setInterval(function(){
    flush();
    if (++tries > 20 || (!queue.length && receiver())) clearInterval(timer);
  }, 500);
  addEventListener('load', flush);

  /* 1. Просмотр продукта. */
  send('product_view', {page: location.pathname});

  /* 2. Клики по кнопкам с data-ev: сама кнопка + отдельно уход в Telegram. */
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-ev]');
    if (!el) return;
    var action = el.getAttribute('data-ev');
    send('cta_click', {action: action, placement: el.getAttribute('data-ev-place') || 'page'});
    var href = el.getAttribute('href') || '';
    if (href.indexOf('t.me/') > -1) send('telegram_click', {action: action});
  }, {passive:true});

  /* 3. Переход с главной на страницу пентеста — считаем по referrer. */
  if (/security\.html$/.test(location.pathname)){
    try{
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host === location.host && /^\/(index\.html)?$/.test(ref.pathname)){
        send('security_from_home', {});
      }
    }catch(e){}
  }

  /* 4. Формы: первое касание поля и подтверждённый приём заявки.
        Успех определяем по появлению .lead-ok — его показывает lead-form.js
        только после подтверждения обработчиком. */
  document.querySelectorAll('form.lead-form').forEach(function(form, i){
    var id = form.getAttribute('data-form-id') || (PRODUCT + '-' + (i+1));
    var started = false;
    form.addEventListener('input', function(){
      if (started) return;
      started = true;
      send('form_start', {form_id: id});
    });
    var ok = form.parentElement && form.parentElement.querySelector('.lead-ok');
    if (!ok || !window.MutationObserver) return;
    new MutationObserver(function(muts, obs){
      if (!ok.hidden){ send('lead_accepted', {form_id: id}); obs.disconnect(); }
    }).observe(ok, {attributes:true, attributeFilter:['hidden']});
  });

  /* 5. Раскрытие демонстрации или формы внутри details. */
  document.querySelectorAll('details[data-demo]').forEach(function(d){
    d.addEventListener('toggle', function(){
      if (d.open) send('demo_open', {demo_id: d.getAttribute('data-demo')});
    });
  });

  /* 6. Просмотр блока AI-безопасности — один раз за визит. */
  var ai = document.getElementById('ai');
  if (ai && window.IntersectionObserver){
    var aio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){ send('ai_block_view', {}); aio.disconnect(); }
      });
    }, {threshold:.3});
    aio.observe(ai);
  }

  /* 7. Раскрытие вопроса в FAQ — с текстом вопроса со страницы. */
  document.querySelectorAll('.faq details').forEach(function(d){
    d.addEventListener('toggle', function(){
      if (!d.open) return;
      var q = d.querySelector('summary');
      send('faq_open', {question: q ? q.textContent.trim().slice(0,100) : ''});
    });
  });
})();
