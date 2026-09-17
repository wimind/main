/* ============================================================
   WIMIND · news.js
   Загрузка списка новостей из news/posts.json
   и отдельного markdown-файла при открытии.
   ============================================================ */

(function () {
  'use strict';

  const listEl   = document.getElementById('news-list');
  const detailEl = document.getElementById('news-detail');
  if (!listEl || !detailEl) return;

  const LANG_KEY = 'wimind-lang';
  let currentLang = localStorage.getItem(LANG_KEY) || 'ru';
  let posts = [];

  /* ---------- Утилиты ---------- */

  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${y} · ${m} · ${d}`;
  }

  function pick(obj, base) {
    return obj[`${base}_${currentLang}`] || obj[`${base}_ru`] || '';
  }

  /* ---------- Список ---------- */

  function renderList() {
    listEl.innerHTML = '';

    if (!posts.length) {
      listEl.innerHTML = '<p style="color:#8a94a3">Новостей пока нет.</p>';
      return;
    }

    posts.forEach(item => {
      const a = document.createElement('a');
      a.className = 'news-item';
      a.href = `news.html#${item.slug}`;
      a.setAttribute('data-no-transition', '');
      a.innerHTML = `
        <div class="news-date">${formatDate(item.date)}</div>
        <div>
          <div class="news-title">${pick(item, 'title')}</div>
          <div class="news-excerpt">${pick(item, 'excerpt')}</div>
        </div>
      `;
      listEl.appendChild(a);
    });
  }

  /* ---------- Детальная ---------- */

  async function fetchBody(slug) {
    const tryUrls = [
      `news/${slug}.${currentLang}.md`,
      `news/${slug}.ru.md`
    ];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.text();
      } catch (e) { /* пробуем следующий */ }
    }
    return null;
  }

  async function renderDetail(slug) {
    const item = posts.find(p => p.slug === slug);
    if (!item) { showList(); return; }

    const md = await fetchBody(slug);
    const html = md
      ? marked.parse(md)
      : '<p style="color:#8a94a3">Не удалось загрузить новость.</p>';

    detailEl.innerHTML = `
      <a href="news.html" class="back-link" data-no-transition>&larr; Все новости</a>
      <div class="eyebrow">${formatDate(item.date)}</div>
      <h1 class="page-title">${pick(item, 'title')}</h1>
      <div class="page-divider"></div>
      <div class="news-body">${html}</div>
    `;

    const back = detailEl.querySelector('.back-link');
    if (back) {
      back.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', 'news.html');
        route();
      });
    }

    listEl.style.display = 'none';
    detailEl.style.display = 'block';
  }

  function showList() {
    listEl.style.display = 'block';
    detailEl.style.display = 'none';
    detailEl.innerHTML = '';
  }

  /* ---------- Роутинг по хэшу ---------- */

  function route() {
    const slug = location.hash.replace(/^#/, '');
    if (slug) {
      renderDetail(slug);
    } else {
      showList();
    }
  }

  window.addEventListener('hashchange', route);

  /* ---------- Реакция на смену языка ---------- */

  document.addEventListener('wimind:langchange', (e) => {
    currentLang = e.detail.lang;
    renderList();
    route();
  });

  /* ---------- Инициализация ---------- */

  (async function init() {
    try {
      const res = await fetch('news/posts.json');
      posts = await res.json();
      posts.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      console.warn('Не удалось загрузить posts.json', e);
      posts = [];
    }
    renderList();
    route();
  })();
})();