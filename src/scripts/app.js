// Behaviour: reveal on scroll, split h1, obfuscated mailto, hero slides, bar auto-hide, 3D projects flight.
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

// Projects: 3D flight on desktop (fine pointer, motion allowed, WebGL). Everything else keeps the plain grid.
// The 3D code is a separate chunk, only fetched when it will actually run.
const flightRoot = document.querySelector('[data-flight]');
if (flightRoot && !reduce) {
  const mq = matchMedia('(min-width: 901px) and (hover: hover)');
  let flight = null;
  const sync = async () => {
    if (mq.matches && !flight) {
      flight = {};                                              // reserve the slot while the chunk loads
      try {
        const { mountFlight } = await import('./flight.js');
        flight = mq.matches ? mountFlight(flightRoot) : null;
        if (!mq.matches) flight = null;
      } catch (e) { console.error(e); flight = null; }
    } else if (!mq.matches && flight) {
      flight.destroy?.(); flight = null;
    }
  };
  mq.addEventListener('change', sync);
  sync();
}
