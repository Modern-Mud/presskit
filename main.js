// Modern Mud press kit: reveals, top bar, hero embers, lazy reels, trailer
// facade, feature spotlight and the image lightbox. No dependencies.
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.add('js');

  // Reveal on scroll, with a short stagger among siblings that enter together.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      let batch = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', Math.min(batch, 6) * 70 + 'ms');
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
        batch++;
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // The top bar slides in once the hero has scrolled away.
  const topbar = document.querySelector('.topbar');
  const hero = document.querySelector('.hero');
  if (topbar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      topbar.classList.toggle('is-shown', !entry.isIntersecting);
    }, { threshold: 0.05 }).observe(hero);
  }

  // Hero: keep the still cover for reduced motion.
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo && reduceMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // Embers rising over the hero, the same look as the trailer. Paused when
  // the hero is off screen or the tab is hidden.
  const canvas = document.querySelector('.embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, running = false, raf = 0;
    const embers = [];
    const COUNT = 46;
    const colours = ['#c9a45c', '#e2c890', '#b3201c'];

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(e, anywhere) {
      e.x = Math.random() * w;
      e.y = anywhere ? Math.random() * h : h + 10;
      e.s = 2 + Math.floor(Math.random() * 3) * 2;
      e.v = 0.35 + Math.random() * 0.9;
      e.sway = 10 + Math.random() * 30;
      e.p = Math.random() * Math.PI * 2;
      e.c = colours[Math.random() < 0.8 ? (Math.random() < 0.6 ? 0 : 1) : 2];
      return e;
    }
    function tick(t) {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) {
        e.y -= e.v;
        if (e.y < -10) spawn(e, false);
        const life = 1 - e.y / h;
        const alpha = Math.max(0, Math.sin(Math.min(1, life * 1.4) * Math.PI)) * 0.85;
        const x = e.x + Math.sin(t / 900 + e.p) * e.sway;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = e.c;
        ctx.fillRect(Math.round(x), Math.round(e.y), e.s, e.s);
      }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(tick); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    for (let i = 0; i < COUNT; i++) embers.push(spawn({}, true));
    window.addEventListener('resize', resize, { passive: true });
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  // Reels load and play only while they are on screen.
  document.querySelectorAll('.lazy-video').forEach((video) => {
    let loaded = false;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!loaded) {
          video.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; });
          video.load();
          loaded = true;
        }
        if (!reduceMotion) video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: 0.35 }).observe(video);
    if (reduceMotion) video.setAttribute('controls', '');
  });

  // Trailer: a poster until clicked, then the real YouTube player.
  document.querySelectorAll('.trailer[data-yt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
      iframe.title = 'Modern Mud trailer';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      btn.appendChild(iframe);
      btn.disabled = true;
    }, { once: true });
  });

  // God tooltips: the first one waits a beat; while the pointer moves along
  // the row the next ones open at once. The row cools down 400 ms after.
  const sigils = document.querySelector('.sigils');
  if (sigils && finePointer) {
    let cool = 0;
    sigils.addEventListener('pointerover', (e) => {
      if (!e.target.closest('li')) return;
      clearTimeout(cool);
      cool = setTimeout(() => sigils.classList.add('is-warm'), 260);
    });
    sigils.addEventListener('pointerleave', () => {
      clearTimeout(cool);
      cool = setTimeout(() => sigils.classList.remove('is-warm'), 400);
    });
  }

  // Gallery carousel: mouse drag with momentum, then it settles on the
  // nearest image. Touch keeps native swiping. A drag never opens an image.
  const strip = document.querySelector('.filmstrip');
  if (strip) {
    const cards = [...strip.children];
    const btns = document.querySelectorAll('.strip-btn');
    const bar = document.querySelector('.strip-progress span');
    let down = false, moved = 0, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0;

    function update() {
      const max = strip.scrollWidth - strip.clientWidth;
      const p = max > 0 ? strip.scrollLeft / max : 1;
      if (bar) bar.style.setProperty('--p', Math.max(0.12, Math.min(1, strip.clientWidth / strip.scrollWidth + p * (1 - strip.clientWidth / strip.scrollWidth))).toFixed(3));
      if (btns.length) { btns[0].disabled = strip.scrollLeft <= 2; btns[1].disabled = strip.scrollLeft >= max - 2; }
    }
    // The card whose left edge is closest to `x` (plus `step` cards).
    function cardAt(x, step) {
      const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
      let i = 0;
      cards.forEach((c, k) => { if (Math.abs(c.offsetLeft - pad - x) < Math.abs(cards[i].offsetLeft - pad - x)) i = k; });
      i = Math.max(0, Math.min(cards.length - 1, i + (step || 0)));
      return cards[i].offsetLeft - pad;
    }
    function nearest(step) { return cardAt(strip.scrollLeft, step); }
    // Glide to a card with the browser's own smooth scroll (interruptible),
    // then hand the strip back to CSS snapping.
    function glideTo(left) {
      strip.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
      let done = false;
      const finish = () => { if (!done) { done = true; strip.classList.remove('is-dragging'); } };
      strip.addEventListener('scrollend', finish, { once: true });
      setTimeout(finish, 700);
    }
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0;
      startX = lastX = e.clientX; startLeft = strip.scrollLeft; lastT = performance.now(); vel = 0;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = 1; strip.classList.add('is-dragging'); strip.setPointerCapture?.(e.pointerId); }
      if (!moved) return;
      strip.scrollLeft = startLeft - dx;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT); // px per ms
      lastX = e.clientX; lastT = now;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      // Momentum: project where a flick would carry the strip, then land on
      // the card nearest to that point. A slow drag lands where you let go.
      // A hard flick carries at most two cards further.
      const card = cards[0].offsetWidth + (parseFloat(getComputedStyle(strip).columnGap) || 0);
      const throwPx = Math.max(-2 * card, Math.min(2 * card, -vel * 260));
      glideTo(cardAt(strip.scrollLeft + throwPx, 0));
    });
    // A drag ends with a click on the card underneath: swallow it.
    strip.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = 0; } }, true);

    btns.forEach((b) => b.addEventListener('click', () => {
      glideTo(nearest(Number(b.dataset.dir)));
    }));
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        strip.scrollTo({ left: nearest(e.key === 'ArrowRight' ? 1 : -1) });
      }
    });
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // A soft light follows the pointer over each feature (mouse only).
  if (finePointer) {
    document.querySelectorAll('.feature-list li').forEach((li) => {
      li.addEventListener('pointermove', (e) => {
        const r = li.getBoundingClientRect();
        li.style.setProperty('--mx', e.clientX - r.left + 'px');
        li.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
  }

  // Lightbox. Clicks crossfade through a light blur; keyboard steps swap at
  // once, because a repeated key must never wait for an animation.
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    const lbCounter = document.getElementById('lightbox-counter');
    const items = document.querySelectorAll('[data-lightbox]');
    let current = 0;
    let lastFocus = null;

    function show(item) {
      const img = item.querySelector('img');
      lbImg.src = item.href;
      lbImg.alt = img.alt;
      lbCaption.textContent = img.alt;
      lbCounter.textContent = (current + 1) + ' / ' + items.length;
    }
    function open(index) {
      current = index;
      lastFocus = document.activeElement;
      show(items[index]);
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
      lightbox.querySelector('.lightbox-close').focus();
    }
    function close() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    function navigate(dir, instant) {
      current = (current + dir + items.length) % items.length;
      const item = items[current];
      if (instant) {
        lbImg.classList.add('lightbox-img--instant');
        show(item);
        requestAnimationFrame(() => lbImg.classList.remove('lightbox-img--instant'));
        return;
      }
      lbImg.classList.add('lightbox-img--switching');
      setTimeout(() => {
        show(item);
        lbImg.classList.remove('lightbox-img--switching');
      }, 150);
    }

    items.forEach((item, i) => item.addEventListener('click', (e) => { e.preventDefault(); open(i); }));
    lightbox.querySelector('.lightbox-close').addEventListener('click', close);
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', close);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => navigate(-1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => navigate(1));
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') navigate(-1, true);
      if (e.key === 'ArrowRight') navigate(1, true);
    });
  }
})();
