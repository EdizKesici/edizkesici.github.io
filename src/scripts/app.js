// Behaviour: reveal on scroll, split h1, obfuscated mailto, hero slides, tilt, bubbles, bar auto-hide.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = document.documentElement.lang.startsWith('fr') ? 'fr' : 'en';

// The address is never stored as text, in the HTML or in this file. It is rebuilt from numbers only when a real
// person clicks (synthetic events are ignored), so crawlers, scrapers and headless bots that merely load or run the
// page never see it. Note: a bot that simulates genuine user clicks could still obtain it; nothing client-side can stop that.
const ENC = [70, 113, 104, 75, 74, 89, 114, 90, 44, 54, 19, 61, 12, 9, 6, 26, 83, 231, 228, 255];
const getMail = () => ENC.map((c, i) => String.fromCharCode(c ^ ((i * 7 + 13) & 255))).join('');
const subject = lang === 'fr' ? 'Projet web / automatisation' : 'Web / automation project';
const fallback = document.querySelector('[data-mail-fallback]');
const showFallback = () => {
  if (!fallback) return;
  const out = fallback.querySelector('[data-mail-out]');
  out.textContent = getMail();
  fallback.hidden = false;
};
document.querySelectorAll('[data-mail]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.isTrusted) return;
    location.href = 'mailto:' + getMail() + '?subject=' + encodeURIComponent(subject);
    if (a.hasAttribute('data-mail-main')) showFallback();
  });
});

// Copy-address button (many visitors use webmail, so a mailto: link may open nothing).
document.querySelectorAll('[data-copy]').forEach((btn) => {
  const label = btn.querySelector('span');
  const status = document.querySelector('[data-copy-status]');
  let timer = 0;
  btn.addEventListener('click', async (e) => {
    if (!e.isTrusted) return;
    const mail = getMail();
    let ok = false;
    try { await navigator.clipboard.writeText(mail); ok = true; } catch { ok = false; }
    if (!ok) {
      // Fallback for browsers that refuse the Clipboard API: hidden textarea + execCommand.
      const ta = document.createElement('textarea');
      ta.value = mail; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    label.textContent = ok ? btn.dataset.copied : btn.dataset.label;
    if (status) status.textContent = ok ? btn.dataset.copied : btn.dataset.fail;
    if (!ok) showFallback();
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = btn.dataset.label; }, 2200);
  });
});

// Split the h1 into words for the entrance.
document.querySelectorAll('h1[data-split]').forEach((h) => {
  const text = h.textContent.trim();
  h.setAttribute('aria-label', text);
  h.textContent = '';
  text.split(/\s+/).forEach((word, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--i', i);
    s.textContent = word;
    if (i) h.append(' ');
    h.append(s);
  });
});

// Reveal on scroll, once.
const els = [...document.querySelectorAll('[data-reveal], h1[data-split]')];
if (reduce || !('IntersectionObserver' in window)) {
  els.forEach((e) => e.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  els.forEach((e) => io.observe(e));
}

// Hero: the browser frame and the phone crossfade together between the same three sites.
const slides = document.querySelector('[data-slides]');
const pslides = document.querySelector('[data-pslides]');
if (slides && !reduce) {
  const imgs = [...slides.querySelectorAll('img')];
  const pimgs = pslides ? [...pslides.querySelectorAll('img')] : [];
  const label = document.querySelector('[data-slide-label]');
  let k = 0;
  setInterval(() => {
    imgs[k].classList.remove('on');
    pimgs[k]?.classList.remove('on');
    k = (k + 1) % imgs.length;
    imgs[k].classList.add('on');
    pimgs[k]?.classList.add('on');
    if (label) label.textContent = imgs[k].dataset.url;
  }, 6500);
}

// Sticky bar steps away when reading downward, returns when scrolling up.
const bar = document.querySelector('.bar');
let lastY = scrollY;
addEventListener(
  'scroll',
  () => {
    const y = scrollY;
    if (y > lastY + 4 && y > 240) bar.classList.add('is-away');
    else if (y < lastY - 4 || y <= 240) bar.classList.remove('is-away');
    lastY = y;
  },
  { passive: true },
);

if (!reduce) {
  // Light that follows the cursor over glass surfaces (fine pointers only).
  if (matchMedia('(pointer:fine)').matches) {
    let lit = null, rafL = 0, lx = 0, ly = 0;
    document.addEventListener('pointermove', (e) => {
      lx = e.clientX; ly = e.clientY;
      if (rafL) return;
      rafL = requestAnimationFrame(() => {
        rafL = 0;
        const g = document.elementFromPoint(lx, ly)?.closest('.glass');
        if (lit && lit !== g) lit.classList.remove('is-lit');
        lit = g || null;
        if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', `${lx - r.left}px`); g.style.setProperty('--my', `${ly - r.top}px`); g.classList.add('is-lit'); }
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { lit?.classList.remove('is-lit'); lit = null; });
  }

  // Pointer tilt on frames and cards (transform only), fine pointers only.
  if (matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.tilt').forEach((el) => {
      const isFrame = el.classList.contains('frame') || el.classList.contains('phone');
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.classList.add('is-tilting');
          el.style.transform = isFrame
            ? `perspective(1200px) rotateY(${-9 + x * 6}deg) rotateX(${3 + -y * 5}deg) translateZ(0)`
            : `perspective(1000px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.classList.remove('is-tilting');
        el.style.transform = '';
      });
    });
  }

  // Bubbles: rise with the scroll (and wrap around), drift away from the cursor, pop on click.
  const lite = matchMedia('(hover:none), (max-width:900px)').matches;
  const bubbles = (lite ? [] : [...document.querySelectorAll('.bubble')]).map((el) => {
    const cs = getComputedStyle(el);
    return { el, p: parseFloat(cs.getPropertyValue('--p')) || 0.3, ox: 0, oy: 0, tx: 0, ty: 0, popped: false, baseX: 0, baseY: 0, size: 0 };
  });
  const measure = () => {
    bubbles.forEach((b) => {
      b.el.style.translate = '0 0';
      const r = b.el.getBoundingClientRect();
      b.baseX = r.left; b.baseY = r.top; b.size = r.width;
    });
  };
  measure();
  addEventListener('resize', () => { measure(); render(); });

  let px = -9999, py = -9999, raf = 0;
  const render = () => {
    raf = 0;
    const vh = innerHeight, vw = innerWidth;
    let moving = false;
    bubbles.forEach((b) => {
      // scroll: rise at the bubble's own speed, wrap around when fully off screen
      const span = vh + 2 * b.size;
      const rise = (((b.baseY + b.size - scrollY * b.p) % span) + span) % span - b.size;
      // cursor: gentle push away within reach
      const cx = b.baseX + b.size / 2 + b.ox, cy = rise + b.size / 2 + b.oy;
      const dx = cx - px, dy = cy - py, dist = Math.hypot(dx, dy) || 1, reach = b.size / 2 + 170;
      if (dist < reach) { const f = (1 - dist / reach) ** 2 * 90; b.tx = (dx / dist) * f; b.ty = (dy / dist) * f; }
      else { b.tx = 0; b.ty = 0; }
      b.ox += (b.tx - b.ox) * 0.08; b.oy += (b.ty - b.oy) * 0.08;
      if (Math.abs(b.tx - b.ox) > 0.3 || Math.abs(b.ty - b.oy) > 0.3) moving = true;
      b.el.style.translate = `${b.ox.toFixed(1)}px ${(rise - b.baseY + b.oy).toFixed(1)}px`;
    });
    if (moving) raf = requestAnimationFrame(render);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
  addEventListener('scroll', kick, { passive: true });
  render();

  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
    document.addEventListener('pointerleave', () => { px = -9999; py = -9999; kick(); });

    // Click on the empty background pops the bubble under the cursor; it grows back a moment later.
    addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button, input, textarea, select, summary, .glass')) return;
      const hit = bubbles.find((b) => {
        if (b.popped) return false;
        const r = b.el.getBoundingClientRect();
        return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= r.width / 2;
      });
      if (!hit) return;
      hit.popped = true;
      const out = hit.el.animate([{ scale: 1, opacity: 1 }, { scale: 1.45, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      setTimeout(() => {
        out.cancel();
        hit.el.animate([{ scale: 0.25, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' });
        hit.popped = false;
      }, 2600);
    });
  }

}
