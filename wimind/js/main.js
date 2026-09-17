/* ============================================================
   WIMIND · main.js
   Язык · Слоган · Переходы между страницами
   ============================================================ */

(function () {
  'use strict';

  const LANG_KEY = 'wimind-lang';
  const TRANSITION_KEY = 'wimind-transition';

  /* ============ Язык ============ */

  let currentLang = 'ru';

  function applyTranslations(lang) {
    if (!window.I18N || !window.I18N[lang]) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = window.I18N[lang][key];
      if (val !== undefined) el.textContent = val;
    });
    document.documentElement.lang = lang;
  }

  function applyLang(lang, animated) {
    if (!window.I18N || !window.I18N[lang]) return;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);

    if (animated) {
      document.body.classList.add('i18n-fading');
      setTimeout(() => {
        applyTranslations(lang);
        document.body.classList.remove('i18n-fading');
        document.dispatchEvent(new CustomEvent('wimind:langchange', { detail: { lang } }));
      }, 220);
    } else {
      applyTranslations(lang);
      document.dispatchEvent(new CustomEvent('wimind:langchange', { detail: { lang } }));
    }

    document.querySelectorAll('.lang-switch button').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLang(btn.getAttribute('data-lang'), true);
    });
  });

  // Применяем сохранённый язык сразу при загрузке
  const savedLang = localStorage.getItem(LANG_KEY);
  if (savedLang && savedLang !== 'ru') {
    applyLang(savedLang, false);
  }

  /* ============ Слоган ============ */

  const sloganEl = document.getElementById('slogan');
  if (sloganEl) {
    const text = 'COGITAMVS·ANTE·ICTVM';
    let i = 0;
    for (const ch of text) {
      const span = document.createElement('span');
      if (ch === '·') {
        span.className = 'dot';
        span.textContent = '·';
      } else {
        span.className = 'letter';
        span.textContent = ch;
        span.style.animationDelay = (0.5 + i * 0.055) + 's';
      }
      sloganEl.appendChild(span);
      i++;
    }
  }

  /* ============ Переходы между страницами ============ */

  const overlay = document.querySelector('.transition-overlay');
  const line = overlay ? overlay.querySelector('.transition-line') : null;

  if (overlay && line) {

    /* --- Входящий переход (страница только что загрузилась) --- */
    if (sessionStorage.getItem(TRANSITION_KEY) === '1') {
      sessionStorage.removeItem(TRANSITION_KEY);

      overlay.style.transition = 'none';
      line.style.transition = 'none';
      overlay.classList.add('active');
      void overlay.offsetWidth;

      overlay.style.transition = '';
      line.style.transition = '';
      line.style.transformOrigin = 'right center';

      requestAnimationFrame(() => {
        overlay.classList.remove('active');
      });

      setTimeout(() => {
        line.style.transition = 'none';
        line.style.transformOrigin = 'left center';
        void line.offsetWidth;
        line.style.transition = '';
      }, 700);
    }

    /* --- Исходящий переход (клик по внутренней ссылке) --- */
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;

      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) return;
      if (href.startsWith('http')) return;
      if (href.startsWith('mailto:')) return;
      if (a.target === '_blank') return;
      if (a.hasAttribute('data-no-transition')) return;

      // Если та же страница — не переходим (только хэш меняем)
      const currentPage = (location.pathname.split('/').pop() || 'index.html');
      const targetPage  = (href.split('#')[0].split('/').pop() || 'index.html');
      if (targetPage === currentPage) return;

      e.preventDefault();

      sessionStorage.setItem(TRANSITION_KEY, '1');
      line.style.transformOrigin = 'left center';
      overlay.classList.add('active');

      setTimeout(() => {
        window.location.href = href;
      }, 500);
    });
  }
})();