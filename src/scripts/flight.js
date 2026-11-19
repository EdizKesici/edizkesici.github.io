// 3D flight through the projects: the screenshots float as screens in a corridor and the camera flies through them while
// the page scrolls. Loaded as its own chunk, only on desktop with a fine pointer and WebGL (see app.js). Without it the
// section stays a plain grid of cards.
import {
  WebGLRenderer, Scene, Fog, PerspectiveCamera, Group, Mesh, PlaneGeometry, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, Color, Vector3, CatmullRomCurve3,
} from 'three';

const GAP = 12;           // distance between two projects along the flight path
const SHADOW_ALPHA = 0.55;

const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Screenshot drawn into a canvas with rounded corners. Premultiplied so the transparent corners never bleed black. */
function roundedTexture(img, radiusFrac, renderer) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, Math.min(c.width, c.height) * radiusFrac); ctx.clip();
  ctx.drawImage(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.premultiplyAlpha = true;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Starts the flight on `root` (the #projets section). Returns { destroy } to switch back to the plain grid. */
export function mountFlight(root) {
  const handle = { destroy() { dead = true; undo.forEach((f) => f()); undo.length = 0; } };
  let dead = false;
  const undo = [];
  if (!hasWebGL()) return handle;
  start(root, () => dead, undo).catch((e) => { console.error(e); handle.destroy(); });
  return handle;
}

async function start(root, isDead, undo) {
  const fr = document.documentElement.lang.startsWith('fr');
  const cards = [...root.querySelectorAll('.grid .card')];
  const items = cards.map((card) => ({
    name: card.querySelector('h3').textContent.trim(),
    text: card.querySelector('.meta p').textContent.trim(),
    link: card.querySelector('.meta a.link'),
    img: card.querySelector('.shot img').getAttribute('src'),
    phone: card.dataset.phone || '',
  }));
  const N = items.length;

  // textures first: nothing is mounted until every screenshot is ready, so a slow network never shows a half-built scene
  const bundles = await Promise.all(items.map(async (it) => ({
    desk: await loadImg(it.img),
    phone: it.phone ? await loadImg(it.phone) : null,
  })));
  if (isDead()) return;

  // ---- DOM: a pinned stage with the canvas, one caption per project and navigation dots (all real, focusable HTML)
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('h2');
  heading.className = 'st-h';
  heading.textContent = root.querySelector('.proj-h').textContent;
  const capBox = document.createElement('div'); capBox.className = 'caps';
  const dotBox = document.createElement('div'); dotBox.className = 'dots';
  dotBox.setAttribute('role', 'group'); dotBox.setAttribute('aria-label', fr ? 'Aller au projet' : 'Go to project');
  const caps = items.map((it) => {
    const a = document.createElement('article'); a.className = 'cap'; a.setAttribute('aria-hidden', 'true');
    const h = document.createElement('h3'); h.textContent = it.name;
    const p = document.createElement('p'); p.textContent = it.text;
    a.append(h, p);
    if (it.link) { const l = it.link.cloneNode(true); a.append(l); }
    capBox.append(a);
    return a;
  });
  stage.append(canvas, heading, capBox, dotBox);
  root.append(stage);
  root.style.setProperty('--n', N);
  root.classList.add('is3d');
  undo.push(() => { stage.remove(); root.classList.remove('is3d', 'ready'); root.style.removeProperty('--n'); });

  // ---- three.js scene
  const ground = new Color(getComputedStyle(document.documentElement).getPropertyValue('--ground').trim());
  // transparent canvas: the page's own backdrop shows through, so there is no seam where the scene starts or ends
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(ground, 0);
  const scene = new Scene();
  scene.fog = new Fog(ground, 9, 34);                         // upcoming screens recede into the ground colour
  const camera = new PerspectiveCamera(38, 1, 1, 90);        // near=1: depth precision (near 0.1 caused z-fighting)
  const shadowTex = shadowTexture();
  const textures = [shadowTex];
  const places = [];
  const fades = [];
  const stops = [], looks = [];

  bundles.forEach((b, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const g = new Group();
    const W = 6.2;
    const H = W * (b.desk.naturalHeight / b.desk.naturalWidth);
    // screens alternate left/right of a corridor the camera flies through, each turned towards the path
    const P = new Vector3(side * (W / 2 + 2.0), ((i % 3) - 1) * 0.3, -i * GAP);
    g.position.copy(P);
    g.rotation.set(0.02, -side * 0.4, 0);

    const deskTex = roundedTexture(b.desk, 0.022, renderer); textures.push(deskTex);
    g.add(new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ map: deskTex, transparent: true, premultipliedAlpha: true, toneMapped: false })));
    const sh = new Mesh(new PlaneGeometry(W * 1.5, H * 1.6), new MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: SHADOW_ALPHA, depthWrite: false, toneMapped: false }));
    sh.position.set(0.25, -0.5, -0.4);
    g.add(sh);

    if (b.phone) {
      const pH = 3.5, pW = pH * (b.phone.naturalWidth / b.phone.naturalHeight);
      const phTex = roundedTexture(b.phone, 0.07, renderer); textures.push(phTex);
      const ph = new Mesh(new PlaneGeometry(pW, pH), new MeshBasicMaterial({ map: phTex, transparent: true, premultipliedAlpha: true, toneMapped: false }));
      // on the OUTER edge of the screen (away from the corridor), slightly in front
      ph.position.set(side * (W / 2 - pW / 2 + 0.3), -H / 2 + pH / 2 - 0.5, 1.2);
      // the shadow must sit clearly BEHIND the phone: same depth = z-fighting (flicker)
      const phs = new Mesh(new PlaneGeometry(pW * 2.2, pH * 1.5), new MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: SHADOW_ALPHA, depthWrite: false, toneMapped: false }));
      phs.position.set(ph.position.x + 0.2, ph.position.y - 0.3, 0.55);
      g.add(phs, ph);
    }
    scene.add(g);
    g.updateMatrixWorld(true);
    // every mesh fades by ITS OWN depth: the phone sits ~2 units in front of its screen, a per-group fade left it blown up
    g.traverse((o) => { if (o.isMesh) fades.push({ i, o, m: o.material, base: o.material.opacity, z: o.getWorldPosition(new Vector3()).z }); });
    places.push(g);
    stops.push(new Vector3(-side * 0.7, P.y + 0.2, P.z + 10.4));
    looks.push(new Vector3(P.x, P.y, P.z));
  });
  const camCurve = new CatmullRomCurve3(stops, false, 'catmullrom', 0.5);
  const lookCurve = new CatmullRomCurve3(looks, false, 'catmullrom', 0.5);

  // navigation dots: real buttons, keyboard accessible
  const dots = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', it.name);
    b.append(document.createElement('i'));
    b.addEventListener('click', () => {
      const top = scrollY + root.getBoundingClientRect().top + ((i + 0.2) / N) * (root.offsetHeight - innerHeight);
      scrollTo({ top, behavior: 'smooth' });
    });
    dotBox.append(b);
    return b;
  });

  // ---- sizing
  let w = 0, h = 0, len = 1;
  const resize = () => {
    w = stage.clientWidth; h = stage.clientHeight;
    len = Math.max(1, root.offsetHeight - innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, -w * 0.17, 0, w, h);          // scene sits right of centre, captions on the left
    camera.updateProjectionMatrix();
    need = true;
  };

  // ---- frame loop: runs only while the section is on screen
  let target = 0, cur = 0, need = true, active = false, lastIdx = -1, raf = 0;
  const ptr = { x: 0, y: 0, cx: 0, cy: 0 };
  const onPointer = (e) => { ptr.x = e.clientX / innerWidth - 0.5; ptr.y = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onPointer, { passive: true });
  const pos = new Vector3(), look = new Vector3();

  const place = () => {
    const s = cur * N;
    const i = Math.min(N - 1, Math.floor(s));
    const f = s - i;
    const u = i + (i < N - 1 ? smooth((f - 0.5) / 0.5) : 0);   // dwell on each project, then travel to the next
    const t = u / (N - 1);
    camCurve.getPoint(t, pos); lookCurve.getPoint(t, look);
    camera.position.set(pos.x + ptr.cx * 0.9, pos.y - ptr.cy * 0.5, pos.z);
    camera.lookAt(look);
    // a screen dissolves as the camera passes it, so a fly-by never shows a blown-up, blurry close-up
    fades.forEach((f) => {
      // a screen is gone shortly after the camera leaves it (it would otherwise swing across the frame, huge and stretched),
      // and never shown when the camera is about to pass through its depth
      const left = Math.min(1, Math.max(0, u - f.i));
      const kLeft = 1 - smooth(left / 0.38);
      const kPass = smooth((camera.position.z - f.z - 1.5) / 6);
      const k = Math.min(kLeft, kPass);
      f.o.visible = k > 0.002;
      f.m.opacity = f.base * k;
    });
    // the caption is only shown while the camera rests on a project; during the travel it steps aside
    const idx = Math.abs(u - Math.round(u)) < 0.1 ? Math.round(u) : -1;
    if (idx !== lastIdx) {
      lastIdx = idx;
      caps.forEach((c, k) => { c.classList.toggle('on', k === idx); c.setAttribute('aria-hidden', String(k !== idx)); });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === idx)));
    }
  };

  const tick = () => {
    raf = 0;
    if (!active || isDead()) return;
    target = clamp01(-root.getBoundingClientRect().top / len);
    const d = target - cur;
    if (Math.abs(d) > 1e-5) { cur += d * 0.12; need = true; }
    if (Math.abs(ptr.x - ptr.cx) > 1e-3 || Math.abs(ptr.y - ptr.cy) > 1e-3) {
      ptr.cx += (ptr.x - ptr.cx) * 0.06; ptr.cy += (ptr.y - ptr.cy) * 0.06; need = true;
    }
    if (need) { need = false; place(); renderer.render(scene, camera); }
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active && !raf) { need = true; raf = requestAnimationFrame(tick); }
  }, { rootMargin: '200px 0px' });
  io.observe(root);
  addEventListener('resize', resize);

  undo.push(() => {
    io.disconnect(); cancelAnimationFrame(raf); raf = 0;
    removeEventListener('pointermove', onPointer); removeEventListener('resize', resize);
    scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    textures.forEach((t) => t.dispose());
    renderer.dispose(); renderer.forceContextLoss();
  });

  resize();
  target = clamp01(-root.getBoundingClientRect().top / len);
  cur = target; place(); renderer.render(scene, camera);
  root.classList.add('ready');
}
