// Modern Mud changelog: reads changelog.json (written by mud-server's
// `scripts/patch-notes.ts presskit`), paints it in the chosen language and
// keeps a single patch open at a time.
(() => {
  const LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt'];
  const UI = {
    en: { name: 'English', skip: 'Skip to content', back: 'Press kit', roadmap: 'Roadmap', play: 'Play free', kicker: 'Patch notes', title: 'Changelog', lead: 'Every patch, as it reached the game.', latest: 'Latest', empty: 'No patch notes yet.', error: 'The patch notes could not be loaded.' },
    es: { name: 'Español', skip: 'Ir al contenido', back: 'Press kit', roadmap: 'Hoja de ruta', play: 'Juega gratis', kicker: 'Notas del parche', title: 'Registro de cambios', lead: 'Cada parche, tal como llegó al juego.', latest: 'Último', empty: 'Aún no hay notas del parche.', error: 'No se pudieron cargar las notas del parche.' },
    fr: { name: 'Français', skip: 'Aller au contenu', back: 'Dossier de presse', roadmap: 'Feuille de route', play: 'Jouer gratuitement', kicker: 'Notes de mise à jour', title: 'Journal des modifications', lead: 'Chaque mise à jour, telle qu’elle est arrivée dans le jeu.', latest: 'Dernière', empty: 'Pas encore de notes de mise à jour.', error: 'Impossible de charger les notes de mise à jour.' },
    de: { name: 'Deutsch', skip: 'Zum Inhalt', back: 'Pressemappe', roadmap: 'Roadmap', play: 'Kostenlos spielen', kicker: 'Patchnotes', title: 'Änderungsprotokoll', lead: 'Jeder Patch, so wie er ins Spiel kam.', latest: 'Neueste', empty: 'Noch keine Patchnotes.', error: 'Die Patchnotes konnten nicht geladen werden.' },
    it: { name: 'Italiano', skip: 'Vai al contenuto', back: 'Press kit', roadmap: 'Roadmap', play: 'Gioca gratis', kicker: 'Note della patch', title: 'Registro delle modifiche', lead: 'Ogni patch, così come è arrivata nel gioco.', latest: 'Ultima', empty: 'Ancora nessuna nota della patch.', error: 'Impossibile caricare le note della patch.' },
    pt: { name: 'Português', skip: 'Ir para o conteúdo', back: 'Press kit', roadmap: 'Roteiro', play: 'Joga grátis', kicker: 'Notas da atualização', title: 'Registo de alterações', lead: 'Cada atualização, tal como chegou ao jogo.', latest: 'Mais recente', empty: 'Ainda não há notas da atualização.', error: 'Não foi possível carregar as notas da atualização.' },
  };
  const TOKEN = /\{(up|down|junk|common|uncommon|rare|epic|legendary):([^{}\n]+)\}/g;
  const CHEVRON = '<svg class="cl-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const log = document.getElementById('log');
  const empty = document.getElementById('empty');
  const langBox = document.getElementById('langs');
  let entries = [];
  let lang = pickLang();
  let openVersion = null;

  function pickLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    try {
      const saved = localStorage.getItem('mm-changelog-lang');
      if (LANGS.includes(saved)) return saved;
    } catch (_) { /* storage blocked */ }
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.includes(nav) ? nav : 'en';
  }

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paint = (s) => escapeHtml(s).replace(TOKEN, (_, kind, value) => `<span class="t-${kind}${/^[\d\s.,:%+\-]+$/.test(value) ? ' t-num' : ''}">${value}</span>`);
  const slug = (v) => `v${v}`;

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function renderLangs() {
    langBox.innerHTML = '';
    for (const code of LANGS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.lang = code;
      b.textContent = UI[code].name;
      b.setAttribute('aria-pressed', String(code === lang));
      b.addEventListener('click', () => setLang(code));
      langBox.appendChild(b);
    }
  }

  function renderChrome() {
    const t = UI[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (t[key]) el.textContent = t[key];
    });
    document.title = `Modern Mud — ${t.title}`;
  }

  function renderLog() {
    log.innerHTML = '';
    entries.forEach((entry, i) => {
      const block = entry.notes[lang] || entry.notes.en || Object.values(entry.notes)[0];
      if (!block) return;
      const id = slug(entry.version);
      const li = document.createElement('li');
      li.className = 'cl-entry';
      li.id = id;
      li.dataset.version = entry.version;

      const sections = block.sections.map((s) => `
        <h3 class="cl-sec">${escapeHtml(s.title)}</h3>
        <ul class="cl-items">${s.items.map((it) => `<li>${paint(it)}</li>`).join('')}</ul>`).join('');

      li.innerHTML = `
        <span class="cl-mark" aria-hidden="true"></span>
        <h2 class="cl-h">
          <button class="cl-toggle" type="button" aria-expanded="false" aria-controls="${id}-panel">
            <span class="cl-ver">${escapeHtml(entry.version)}${i === 0 ? `<span class="cl-latest">${UI[lang].latest}</span>` : ''}</span>
            <time class="cl-date" datetime="${escapeHtml(entry.date || '')}">${formatDate(entry.date)}</time>
            ${CHEVRON}
            ${block.highlight ? `<span class="cl-hl">${paint(block.highlight)}</span>` : ''}
          </button>
        </h2>
        <div class="cl-panel" id="${id}-panel" role="region">
          <div class="cl-panel-inner"><div class="cl-panel-body">${sections}</div></div>
        </div>`;
      li.querySelector('.cl-toggle').addEventListener('click', () => toggle(entry.version));
      log.appendChild(li);
    });
    applyOpen(false);
  }

  // One open at a time; clicking the open one closes it.
  function toggle(version) {
    openVersion = openVersion === version ? null : version;
    applyOpen(true);
    history.replaceState(null, '', location.pathname + location.search + (openVersion ? `#${slug(openVersion)}` : ''));
  }

  function applyOpen(fromClick) {
    let opened = null;
    log.querySelectorAll('.cl-entry').forEach((li) => {
      const isOpen = li.dataset.version === openVersion;
      li.classList.toggle('is-open', isOpen);
      li.querySelector('.cl-toggle').setAttribute('aria-expanded', String(isOpen));
      const panel = li.querySelector('.cl-panel');
      if (isOpen) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
      if (isOpen) opened = li;
    });
    // A long patch closing above pulls the page up; keep the new one in view.
    if (fromClick && opened) {
      requestAnimationFrame(() => setTimeout(() => {
        const top = opened.getBoundingClientRect().top;
        const bar = document.querySelector('.topbar').offsetHeight;
        if (top < bar || top > window.innerHeight * 0.6) {
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: window.scrollY + top - bar - 12, behavior: reduce ? 'auto' : 'smooth' });
        }
      }, 400));
    }
  }

  function setLang(code) {
    if (code === lang) return;
    lang = code;
    try { localStorage.setItem('mm-changelog-lang', code); } catch (_) { /* storage blocked */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', code);
    history.replaceState(null, '', url);
    renderLangs();
    renderChrome();
    renderLog();
  }

  renderLangs();
  renderChrome();

  fetch('changelog.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      entries = Array.isArray(data) ? data : [];
      if (!entries.length) {
        empty.textContent = UI[lang].empty;
        empty.hidden = false;
        return;
      }
      const fromHash = location.hash.replace(/^#v/, '');
      openVersion = entries.some((e) => e.version === fromHash) ? fromHash : entries[0].version;
      renderLog();
      if (fromHash === openVersion && fromHash !== entries[0].version) {
        document.getElementById(slug(openVersion))?.scrollIntoView();
      }
    })
    .catch(() => {
      empty.textContent = UI[lang].error;
      empty.hidden = false;
    });
})();
