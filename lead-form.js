/* Запасной канал заявки для тех, кто не пойдёт в Telegram.
   13.08: аудитория РЕЗИДЕНТа (банки, госорганы, юристы, КИИ) часто сидит с
   корпоративных устройств, где мессенджер закрыт политикой. Единственная кнопка
   в Telegram для них — закрытая дверь, поэтому под ней живёт короткая форма.

   Хостинг статический, своего сервера нет: форма уходит письмом через formsubmit.
   Это временно — когда появится маленький релей с токеном бота, заявки отсюда
   пойдут в ту же группу менеджеров, что и из бота, и каналы сойдутся в один.

   Скрипт ничего не ломает без JS: без него форма отправится обычным submit'ом
   на ту же ручку, просто со страницей-подтверждением formsubmit. */
(function(){
  document.querySelectorAll('form.lead-form').forEach(function(form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const btn=form.querySelector('button[type=submit]');
      const ok=form.parentElement.querySelector('.lead-ok');
      let valid=true;
      form.querySelectorAll('input[required]').forEach(function(i){
        if(!i.value.trim()){ i.classList.add('err'); valid=false; } else i.classList.remove('err');
      });
      if(!valid) return;
      const label=btn.textContent;
      btn.disabled=true; btn.textContent='Отправляем…';
      try{
        const r=await fetch(form.action,{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))
        });
        if(!r.ok) throw new Error('bad status '+r.status);
        form.hidden=true; if(ok) ok.hidden=false;
      }catch(err){
        /* Молча терять заявку нельзя: показываем запасной контакт, а не «ошибка». */
        btn.disabled=false; btn.textContent=label;
        const fail=form.parentElement.querySelector('.lead-fail');
        if(fail) fail.hidden=false;
      }
    });
  });
})();
