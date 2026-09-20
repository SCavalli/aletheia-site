/* ALETHEIA — события сайта (20.09).
   Счётчика на сайте пока НЕТ: ни Метрики, ни GA. Скрипт ничего не грузит и никуда
   не стучится сам — он только раскладывает события по трём приёмникам, если они
   появятся: ym (Яндекс.Метрика), gtag (GA4), dataLayer (GTM). Пока приёмников нет,
   вызовы просто молча не срабатывают, и страница ведёт себя как раньше.

   Когда счётчик подключат, править этот файл не нужно: достаточно вставить код
   Метрики в <head>, и события пойдут с теми же именами.

   Имена событий (из ТЗ 20.09):
   pentest_discuss, pentest_estimate, pentest_form_start, pentest_form_sent,
   telegram_open, security_from_home, ai_block_view, faq_open. */
(function(){
  'use strict';

  function send(name, params){
    try{
      var p = params || {};
      /* Метрика: номер счётчика читаем из window.ALETHEIA_YM_ID, чтобы не зашивать
         его в двух местах. Не задан — пробуем первый инициализированный счётчик. */
      if (typeof window.ym === 'function'){
        var id = window.ALETHEIA_YM_ID ||
                 (window.Ya && window.Ya._metrika && window.Ya._metrika.counters &&
                  Object.keys(window.Ya._metrika.counters)[0]);
        if (id) window.ym(id, 'reachGoal', name, p);
      }
      if (typeof window.gtag === 'function') window.gtag('event', name, p);
      if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({event:name}, p));
    }catch(e){ /* аналитика не имеет права ломать страницу */ }
  }
  window.aletheiaEvent = send;

  /* 1. Клики по кнопкам с data-ev. Telegram-ссылки дают ещё и telegram_open. */
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-ev]');
    if (!el) return;
    send(el.getAttribute('data-ev'), {page: location.pathname});
    var href = el.getAttribute('href') || '';
    if (href.indexOf('t.me/') > -1) send('telegram_open', {from: el.getAttribute('data-ev')});
  }, {passive:true});

  /* 2. Переход с главной на страницу пентеста — считаем на самой странице по
        referrer: так не нужно вешать обработчик на каждую ссылку главной. */
  if (/security\.html$/.test(location.pathname)){
    try{
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host === location.host && /^\/(index\.html)?$/.test(ref.pathname)){
        send('security_from_home', {});
      }
    }catch(e){}
  }

  /* 3. Форма: первое касание любого поля и успешная отправка.
        Успех определяем по появлению .lead-ok — его показывает lead-form.js. */
  document.querySelectorAll('form[data-ev-start]').forEach(function(form){
    var started = false;
    form.addEventListener('input', function(){
      if (started) return;
      started = true;
      send(form.getAttribute('data-ev-start'), {});
    });
    var ok = form.parentElement && form.parentElement.querySelector('.lead-ok');
    if (!ok || !window.MutationObserver) return;
    new MutationObserver(function(muts, obs){
      if (!ok.hidden){ send(form.getAttribute('data-ev-sent'), {}); obs.disconnect(); }
    }).observe(ok, {attributes:true, attributeFilter:['hidden']});
  });

  /* 4. Просмотр блока AI-безопасности — один раз за визит. */
  var ai = document.getElementById('ai');
  if (ai && window.IntersectionObserver){
    var aio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){ send('ai_block_view', {}); aio.disconnect(); }
      });
    }, {threshold:.3});
    aio.observe(ai);
  }

  /* 5. Раскрытие вопроса в FAQ — с текстом вопроса, чтобы видеть, что волнует. */
  document.querySelectorAll('.faq details').forEach(function(d){
    d.addEventListener('toggle', function(){
      if (!d.open) return;
      var q = d.querySelector('summary');
      send('faq_open', {question: q ? q.textContent.trim().slice(0,100) : ''});
    });
  });
})();
