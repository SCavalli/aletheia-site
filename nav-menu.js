/* ALETHEIA — поведение мобильного меню (20.09).
   Само меню работает на CSS-чекбоксе и открывается без скрипта. Этот файл
   добавляет только то, чего CSS не умеет: закрыть меню после выбора пункта.

   Зачем: пункты вроде «Цены» — якоря на той же странице. Без закрытия человек
   нажимает пункт, страница прокручивается, а раскрытое меню остаётся висеть
   поверх контента. Ссылки на другие страницы закрываются сами — там новая загрузка.

   Скрипт не выполнился — навигация всё равно рабочая: меню открывается,
   ссылки ведут куда нужно, закрыть можно повторным нажатием на бургер. */
(function(){
  'use strict';
  var toggle = document.getElementById('nav-t');
  if (!toggle) return;
  var menu = document.querySelector('.nav-links');
  if (!menu) return;

  function close(){ toggle.checked = false; }

  /* 1. Выбрали пункт — меню закрывается. */
  menu.addEventListener('click', function(e){
    if (e.target.closest('a')) close();
  });

  /* 2. Нажали мимо меню и мимо бургера — тоже закрываем.
        Важно: нажатие на label порождает ВТОРОЙ click, у которого target —
        сам скрытый чекбокс. Без проверки на него меню закрывалось в тот же миг,
        как открывалось, и бургер выглядел неработающим. */
  document.addEventListener('click', function(e){
    if (!toggle.checked) return;
    if (e.target === toggle) return;
    if (e.target.closest && (e.target.closest('.nav-links') ||
        e.target.closest('.nav-burger') || e.target.closest('.nav-toggle'))) return;
    close();
  });

  /* 3. Esc — привычный выход с клавиатуры. */
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') close();
  });

  /* 4. Вернулись на десктопную ширину с открытым меню — снимаем состояние,
        иначе при следующем сужении окна меню окажется уже раскрытым. */
  if (window.matchMedia){
    var wide = window.matchMedia('(min-width:1081px)');
    var onChange = function(m){ if (m.matches) close(); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }
})();
