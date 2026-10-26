/* ==========================================================================
   MEVEL Construcciones y Laminados Especializados
   Lógica de la landing: preloader, scroll suave, hero 3D, animaciones de
   scroll, laboratorio KR-18, pre-dimensionador, visualizador de color y
   formulario hacia WhatsApp.

   Dependencias locales (carpeta vendor/): GSAP + ScrollTrigger, Lenis, Three.js.
   Si alguna falta, la página sigue funcionando con contenido estático.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const WA_NUMBER = '525543225284';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motionOK = hasGSAP && !reduceMotion;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const fmt = (n, d = 0) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });

  const waUrl = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  let lenis = null;

  /* Envuelve cada palabra en <span class="w"><span class="wi"> para revelados con máscara.
     Respeta elementos internos (por ejemplo .grad) y conserva el texto accesible. */
  function splitText(el, outer = 'w', inner = 'wi') {
    if (el.dataset.splitDone) return $$('.' + inner, el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span');
            o.className = outer;
            o.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span');
            i.className = inner;
            i.textContent = part;
            o.appendChild(i);
            frag.appendChild(o);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.' + inner, el);
  }

  /* ------------------------------------------------------------------ *
   * Enlaces de WhatsApp (el mensaje viaja en data-wa)
   * ------------------------------------------------------------------ */
  function wireWhatsApp() {
    $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa); });
  }

  /* ------------------------------------------------------------------ *
   * Scroll suave (Lenis) integrado con ScrollTrigger
   * ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (!motionOK || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.3,
    });
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add((time) => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function scrollToTarget(target) {
    const offset = target.id === 'inicio' ? 0 : -16;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.8 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors(closeMenu) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      const wasOpen = $('#menu').classList.contains('is-open');
      closeMenu();
      setTimeout(() => scrollToTarget(target), wasOpen ? 350 : 0);
      history.replaceState(null, '', id);
    });
  }

  /* ------------------------------------------------------------------ *
   * Header, menú móvil y navegación activa
   * ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#header');
    const burger = $('#burger');
    const menu = $('#menu');

    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);

    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      header.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 1180px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

    // Sección actual en la navegación
    const links = $$('.header__nav a[data-nav]');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-current'));
        const link = map.get(en.target.id);
        if (link) link.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

    return () => setMenu(false);
  }

  /* ------------------------------------------------------------------ *
   * Preloader: anillos, contador y cortina que se abre
   * ------------------------------------------------------------------ */
  function createPreloader() {
    const pl = $('#preloader');
    const api = { markReady() {}, finished: Promise.resolve(), leave: () => Promise.resolve() };
    if (!pl) return api;

    const countEl = $('#pl-count');
    const fill = $('#pl-fill');
    const statusEl = $('#pl-status');
    const msgs = ['Calculando estructura', 'Rolando lámina', 'Montando arcos', 'Sellando cubierta', 'Listo para construir'];
    const CIRC = 942.5;
    const MIN = reduceMotion ? 250 : 2400;
    let ready = false;
    let shown = 0;
    const start = performance.now();

    api.finished = new Promise((resolve) => {
      const tick = (now) => {
        const elapsed = now - start;
        const sim = easeOutCubic(Math.min(1, elapsed / MIN)) * 92;
        const target = ready && elapsed >= MIN ? 100 : Math.min(sim, 92);
        shown += (target - shown) * 0.14;
        if (target === 100 && shown > 99.4) shown = 100;
        countEl.textContent = String(Math.round(shown)).padStart(3, '0');
        fill.style.strokeDashoffset = String(CIRC * (1 - shown / 100));
        statusEl.textContent = msgs[Math.min(msgs.length - 1, Math.floor(shown / 21))];
        if (shown >= 100) { resolve(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    api.markReady = () => { ready = true; };
    api.leave = () => new Promise((resolve) => {
      const done = () => { pl.remove(); resolve(); };
      pl.classList.add('is-leaving');
      if (!hasGSAP || reduceMotion) { pl.style.transition = 'opacity .4s'; pl.style.opacity = '0'; setTimeout(done, 420); return; }
      const g = window.gsap;
      const tl = g.timeline({ onComplete: done });
      tl.to('.preloader__core', { opacity: 0, scale: 0.94, duration: 0.55, ease: 'power2.in' })
        .to('.preloader__panel--top', { yPercent: -101, duration: 1.05, ease: 'power4.inOut' }, 0.35)
        .to('.preloader__panel--bottom', { yPercent: 101, duration: 1.05, ease: 'power4.inOut' }, 0.35);
    });
    return api;
  }

  /* ------------------------------------------------------------------ *
   * HERO 3D: arcotecho que se fabrica en pantalla (Three.js)
   * Metáfora: la máquina "rola" la cubierta a lo largo de la nave y el
   * scroll lleva la cámara hacia el interior sin columnas.
   * ------------------------------------------------------------------ */
  function initHero() {
    const canvas = $('#hero-canvas');
    const stage = $('#hero-stage');
    const state = { p: 0, intro: 0, reveal: 0, visible: true };
    const noGL = () => { root.classList.add('no-webgl'); return { state, ok: false }; };
    if (!canvas || !window.THREE) return noGL();
    const THREE = window.THREE;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      if (!renderer.getContext()) return noGL();
    } catch (err) {
      return noGL();
    }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.add('no-webgl'); });

    const mobile = window.matchMedia('(max-width: 767px)').matches;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 600);

    // Geometría: claro de 40 m, flecha de 30%, nave de 96 m
    const W = 40;
    const RISE = W * 0.3;
    const L = 96;
    const R = (W * W) / (8 * RISE) + RISE / 2;
    const HALF = Math.asin(W / (2 * R));
    const C1 = new THREE.Vector3(0.082, 0.863, 0.749);  // #15DCBF
    const C2 = new THREE.Vector3(0.173, 0.608, 0.835);  // #2C9BD5
    const BASE = new THREE.Vector3(0.05, 0.062, 0.072);

    // Bóveda
    const segU = mobile ? 72 : 128;
    const pos = []; const nor = []; const uv = []; const idx = [];
    for (let j = 0; j <= 1; j++) {
      const z = -L / 2 + L * j;
      for (let i = 0; i <= segU; i++) {
        const t = i / segU;
        const a = -HALF + 2 * HALF * t;
        pos.push(R * Math.sin(a), R * Math.cos(a) - (R - RISE), z);
        nor.push(Math.sin(a), Math.cos(a), 0);
        uv.push(t, j);
      }
    }
    for (let i = 0; i < segU; i++) {
      const a = i; const b = i + 1; const c = i + segU + 1; const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const vaultGeo = new THREE.BufferGeometry();
    vaultGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    vaultGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    vaultGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    vaultGeo.setIndex(idx);

    const vaultMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uFront: { value: -L / 2 }, uScan: { value: 0 }, uLen: { value: L },
        uC1: { value: C1 }, uC2: { value: C2 }, uBase: { value: BASE },
      },
      vertexShader: `
        varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main() {
          vPos = position; vUv = uv;
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uFront; uniform float uScan; uniform float uLen;
        uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uBase;
        varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        float gridLine(float x, float widthPx) {
          float fw = fwidth(x);
          float d = abs(fract(x + 0.5) - 0.5);
          return 1.0 - smoothstep(widthPx * fw * 0.5, widthPx * fw * 0.5 + fw, d);
        }
        void main() {
          vec3 n = normalize(vN); vec3 v = normalize(vV);
          bool front = gl_FrontFacing;
          if (!front) n = -n;
          float fres = pow(1.0 - abs(dot(n, v)), 2.2);
          float zc = vPos.z;
          bool built = zc <= uFront;

          float cs = zc / 0.61;
          float seam = gridLine(cs, 1.0) * (1.0 - smoothstep(0.35, 0.7, fwidth(cs)));
          float cr = zc / 6.1;
          float rib = gridLine(cr, 1.6) * (1.0 - smoothstep(0.4, 0.9, fwidth(cr)));
          float ca = vUv.x * 28.0;
          float longi = gridLine(ca, 0.8) * (1.0 - smoothstep(0.4, 0.8, fwidth(ca)));

          vec3 grad = mix(uC1, uC2, clamp(vUv.x * 0.65 + (zc / uLen + 0.5) * 0.45, 0.0, 1.0));
          float sheen = pow(max(0.0, 1.0 - abs(vUv.x - 0.64) * 2.2), 3.0);
          float edge = 1.0 - smoothstep(0.0, 0.45, min(zc + uLen * 0.5, uLen * 0.5 - zc));

          vec3 col = uBase + vec3(0.11, 0.13, 0.15) * sheen
                   + grad * (fres * 0.6 + seam * 0.17 + rib * 0.95 + longi * 0.06 + edge * 0.5);
          float sb = exp(-pow((zc - uScan) / 2.6, 2.0));
          col += grad * sb * 0.7;
          float fg = exp(-pow((uFront - zc) / 1.1, 2.0)) * step(zc, uFront + 0.5);
          col += grad * fg * 1.5;

          float alpha;
          if (built) {
            alpha = 0.6 + fres * 0.35 + rib * 0.25 + edge * 0.25 + sb * 0.2;
            if (!front) { col = col * 1.12 + grad * (seam * 0.2 + rib * 0.4); alpha = max(alpha, 0.5); }
          } else {
            col = grad;
            alpha = (rib * 0.55 + longi * 0.1 + edge * 0.4) * 0.5;
          }
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
        }`,
    });
    const vault = new THREE.Mesh(vaultGeo, vaultMat);
    vault.frustumCulled = false;
    vault.renderOrder = 2;
    scene.add(vault);

    // Suelo con retícula y pulsos radiales
    const groundMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uC1: { value: C1 }, uC2: { value: C2 } },
      vertexShader: `
        varying vec2 vXZ; varying float vDist;
        void main() {
          vXZ = position.xy;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDist = length(mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uC1; uniform vec3 uC2;
        varying vec2 vXZ; varying float vDist;
        float gLine(float x, float w) {
          float f = abs(fract(x + 0.5) - 0.5) / max(fwidth(x), 1e-5);
          return 1.0 - min(f / w, 1.0);
        }
        void main() {
          vec2 p = vXZ;
          float minor = max(gLine(p.x / 5.0, 1.0), gLine(p.y / 5.0, 1.0)) * 0.16;
          float major = max(gLine(p.x / 25.0, 1.5), gLine(p.y / 25.0, 1.5)) * 0.5;
          float r = length(p);
          float fade = smoothstep(210.0, 25.0, r);
          float d = abs(mod(r - uTime * 15.0 + 40.0, 80.0) - 40.0);
          float pulse = exp(-pow(d / 1.7, 2.0)) * smoothstep(150.0, 20.0, r);
          vec3 c = mix(uC1, uC2, clamp(r / 140.0, 0.0, 1.0));
          float a = (minor + major + pulse * 0.85) * fade;
          if (a < 0.004) discard;
          gl_FragColor = vec4(c, a);
        }`,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.frustumCulled = false;
    ground.renderOrder = 0;
    scene.add(ground);

    // Vigas de cimentación a ambos lados
    const beamGeo = new THREE.BoxGeometry(2.2, 1.4, L);
    const beamEdges = new THREE.EdgesGeometry(beamGeo);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x0d1114 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x24b7ca, transparent: true, opacity: 0.55 });
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(beamGeo, beamMat);
      m.position.set(s * (W / 2), -0.65, 0);
      m.renderOrder = 1;
      scene.add(m);
      const e = new THREE.LineSegments(beamEdges, edgeMat);
      e.position.copy(m.position);
      e.renderOrder = 1;
      scene.add(e);
    });

    // Anillo de la máquina de rolado: marca el frente de fabricación y luego escanea
    const ringArc = 2 * HALF;
    const ringGeo = new THREE.TorusGeometry(R + 0.2, 0.16, 8, mobile ? 80 : 160, ringArc);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x15dcbf, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.z = Math.PI / 2 - HALF;
    ring.position.y = -(R - RISE);
    ring.renderOrder = 3;
    ring.frustumCulled = false;
    const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(R + 0.2, 0.7, 8, mobile ? 80 : 160, ringArc),
      new THREE.MeshBasicMaterial({ color: 0x2c9bd5, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
    ringGlow.rotation.copy(ring.rotation);
    ringGlow.position.copy(ring.position);
    ringGlow.frustumCulled = false;
    ringGlow.renderOrder = 3;
    const ringGroup = new THREE.Group();
    ringGroup.add(ring, ringGlow);
    scene.add(ringGroup);

    // Partículas: polvo y chispas de soldadura que suben despacio
    const N = mobile ? 260 : 720;
    const pp = new Float32Array(N * 3);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 120;
      pp[i * 3 + 1] = Math.random() * 30;
      pp[i * 3 + 2] = (Math.random() - 0.5) * 140;
      seeds[i] = Math.random();
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    partGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const partMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: mobile ? 20 : 26 }, uAccent: { value: C1 } },
      vertexShader: `
        attribute float aSeed; uniform float uTime; uniform float uSize;
        varying float vA; varying float vHot;
        void main() {
          vec3 p = position;
          float sp = 0.5 + aSeed * 1.5;
          p.y = mod(p.y + uTime * sp, 30.0);
          p.x += sin(uTime * 0.3 + aSeed * 40.0) * 1.4;
          p.z += cos(uTime * 0.25 + aSeed * 31.0) * 1.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uSize * (0.5 + aSeed) * (60.0 / -mv.z), 1.0, 14.0);
          gl_Position = projectionMatrix * mv;
          vA = smoothstep(0.0, 3.0, p.y) * smoothstep(30.0, 20.0, p.y) * (0.22 + aSeed * 0.55);
          vHot = step(0.72, aSeed);
        }`,
      fragmentShader: `
        uniform vec3 uAccent; varying float vA; varying float vHot;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          vec3 c = mix(vec3(0.78, 0.86, 0.9), uAccent, vHot);
          gl_FragColor = vec4(c, a);
        }`,
    });
    const particles = new THREE.Points(partGeo, partMat);
    particles.frustumCulled = false;
    particles.renderOrder = 4;
    scene.add(particles);

    // Trayectoria de cámara: vista exterior, aproximación y vuelo por el interior
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const curveP = new THREE.CatmullRomCurve3([[-62, 24, 112], [-42, 14, 86], [-12, 6.5, 66], [0, 4.6, 46], [0, 4.4, 12], [0, 5.2, -44]].map(V), false, 'centripetal');
    const curveT = new THREE.CatmullRomCurve3([[0, 5, 6], [2, 6, 0], [0, 6, 8], [0, 6, 0], [0, 6.5, -24], [0, 7, -70]].map(V), false, 'centripetal');
    const cp = new THREE.Vector3(); const ct = new THREE.Vector3(); const tmp = new THREE.Vector3();

    // HUD de cotas proyectadas
    const hud = $('#hud');
    const hudSpan = $('#hud-span'); const hudRise = $('#hud-rise'); const hudArc = $('#hud-arc');
    const tagSpan = $('#hud-t-span'); const tagRise = $('#hud-t-rise'); const tagArc = $('#hud-t-arc');
    const hudPts = {
      a: V([-W / 2, -2.4, L / 2 + 3]), b: V([W / 2, -2.4, L / 2 + 3]), mid: V([0, -2.4, L / 2 + 3]),
      r0: V([W / 2 + 4.5, 0, L / 2]), r1: V([W / 2 + 4.5, RISE, L / 2]),
      arc: V([R * Math.sin(-HALF * 0.55), R * Math.cos(-HALF * 0.55) - (R - RISE), L / 2 - 6]),
    };
    const sp = {};
    const toScreen = (v, key, w, h) => {
      tmp.copy(v).project(camera);
      sp[key] = sp[key] || {};
      sp[key].x = (tmp.x * 0.5 + 0.5) * w; sp[key].y = (-tmp.y * 0.5 + 0.5) * h; sp[key].z = tmp.z;
      return sp[key];
    };
    let hudOpacity = 1;

    // Entrada del puntero (solo punteros finos)
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (finePointer) window.addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / window.innerWidth) * 2 - 1; mouse.ty = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });

    let w = 1; let h = 1; let lastShift = -1;
    const applyView = (p) => {
      const portrait = w < 760 || w < h * 0.85;
      const k = 1 - smooth(0.04, 0.4, p);
      const ox = portrait ? 0 : -w * 0.25 * k;
      const oy = portrait ? h * 0.2 * k : 0;
      const key = ox + oy * 1000;
      if (key === lastShift) return;
      lastShift = key;
      camera.setViewOffset(w, h, ox, oy, w, h);
    };
    const resize = () => {
      const r = stage.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < h ? 52 : 42;
      lastShift = -1;
      applyView(state.p);
      camera.updateProjectionMatrix();
      renderFrame(performance.now());
    };

    const t0 = performance.now();
    function renderFrame(now) {
      const t = (now - t0) * 0.001;
      const p = state.p;
      const u = easeInOutSine(clamp(p, 0, 1));
      curveP.getPointAt(u, cp);
      curveT.getPointAt(u, ct);

      const idle = 1 - smooth(0, 0.12, p);
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      if (!reduceMotion) {
        const s = t * 0.17;
        cp.x += Math.sin(s) * 3.4 * idle; cp.y += Math.sin(s * 0.8) * 0.9 * idle; cp.z += Math.cos(s * 0.6) * 2.2 * idle;
      }
      const ie = easeOutCubic(state.intro);
      cp.x -= 24 * (1 - ie); cp.y += 11 * (1 - ie); cp.z += 30 * (1 - ie);
      cp.x += mouse.x * 3.2 * idle; cp.y += -mouse.y * 1.6 * idle;
      camera.position.copy(cp);
      camera.lookAt(ct);
      camera.updateMatrixWorld();
      applyView(p);

      const front = -L / 2 + (L + 8) * state.reveal;
      const building = state.reveal < 0.999;
      const scanZ = lerp(-L / 2 - 4, L / 2 + 4, (Math.sin(t * 0.5 - 1.2) * 0.5 + 0.5));
      vaultMat.uniforms.uTime.value = t;
      vaultMat.uniforms.uFront.value = front;
      vaultMat.uniforms.uScan.value = building ? -999 : scanZ;
      groundMat.uniforms.uTime.value = t;
      partMat.uniforms.uTime.value = t;

      ringGroup.position.z = building ? Math.min(front, L / 2) : scanZ;
      ringGroup.visible = building ? state.reveal > 0.002 : true;
      ringMat.opacity = building ? 0.95 : 0.5;

      if (hud && w >= 680 && hudOpacity > 0.01) {
        const a = toScreen(hudPts.a, 'a', w, h); const b = toScreen(hudPts.b, 'b', w, h);
        const m = toScreen(hudPts.mid, 'm', w, h);
        const r0 = toScreen(hudPts.r0, 'r0', w, h); const r1 = toScreen(hudPts.r1, 'r1', w, h);
        const ar = toScreen(hudPts.arc, 'ar', w, h);
        hudSpan.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}M${a.x.toFixed(1)} ${(a.y - 9).toFixed(1)}L${a.x.toFixed(1)} ${(a.y + 9).toFixed(1)}M${b.x.toFixed(1)} ${(b.y - 9).toFixed(1)}L${b.x.toFixed(1)} ${(b.y + 9).toFixed(1)}`);
        hudRise.setAttribute('d', `M${r0.x.toFixed(1)} ${r0.y.toFixed(1)}L${r1.x.toFixed(1)} ${r1.y.toFixed(1)}M${(r0.x - 9).toFixed(1)} ${r0.y.toFixed(1)}L${(r0.x + 9).toFixed(1)} ${r0.y.toFixed(1)}M${(r1.x - 9).toFixed(1)} ${r1.y.toFixed(1)}L${(r1.x + 9).toFixed(1)} ${r1.y.toFixed(1)}`);
        hudArc.setAttribute('d', `M${ar.x.toFixed(1)} ${ar.y.toFixed(1)}L${(ar.x - 70).toFixed(1)} ${(ar.y - 54).toFixed(1)}`);
        tagSpan.style.transform = `translate(${m.x.toFixed(1)}px,${(m.y + 24).toFixed(1)}px) translate(-50%,-50%)`;
        tagRise.style.transform = `translate(${(r0.x + 14).toFixed(1)}px,${((r0.y + r1.y) / 2).toFixed(1)}px) translate(0,-50%)`;
        tagArc.style.transform = `translate(${(ar.x - 70).toFixed(1)}px,${(ar.y - 54).toFixed(1)}px) translate(-100%,-100%)`;
      }
      if (hud) {
        const o = 1 - smooth(0.03, 0.16, p);
        if (Math.abs(o - hudOpacity) > 0.004) { hudOpacity = o; hud.style.opacity = String(o); }
      }
      renderer.render(scene, camera);
    }

    // Bucle: solo renderiza cuando el hero está en pantalla
    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!state.visible || document.hidden) return;
      renderFrame(now);
    };
    if (!reduceMotion) {
      raf = requestAnimationFrame(loop);
      new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; }, { rootMargin: '10% 0px' }).observe(stage);
    } else {
      state.reveal = 1; state.intro = 1;
    }
    new ResizeObserver(resize).observe(stage);
    resize();
    return { state, ok: true, render: () => renderFrame(performance.now()), stop: () => cancelAnimationFrame(raf) };
  }

  /* ------------------------------------------------------------------ *
   * Escenas de scroll (GSAP + ScrollTrigger)
   * ------------------------------------------------------------------ */
  function buildHeroScroll(hero) {
    if (!motionOK) return;
    const g = window.gsap;
    const tl = g.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#inicio', start: 'top top', end: '+=180%', pin: true, scrub: 0.9, anticipatePin: 1 },
    });
    tl.to(hero.state, { p: 1, duration: 1 }, 0)
      .to('.hero__copy', { yPercent: -16, opacity: 0, duration: 0.16 }, 0.02)
      .fromTo('[data-beat="1"]', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.1 }, 0.3)
      .to('[data-beat="1"]', { opacity: 0, y: -50, duration: 0.08 }, 0.55)
      .fromTo('[data-beat="2"]', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.1 }, 0.66)
      .to('[data-beat="2"]', { opacity: 0, y: -50, duration: 0.06 }, 0.9)
      .to('.hero__fade', { opacity: 1, duration: 0.07 }, 0.93);
  }

  function buildScrollbar() {
    if (!motionOK) return;
    window.gsap.to('#scrollbar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
  }

  function buildTextReveals() {
    const g = window.gsap;
    // Títulos: máscara por palabra
    $$('[data-split]').forEach((el) => {
      const words = splitText(el);
      g.set(words, { yPercent: 112 });
      window.ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => g.to(words, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.045 }),
      });
    });
    // Manifiesto: las palabras se encienden con el scroll
    const man = $('[data-words]');
    if (man) {
      const words = splitText(man, 'mww', 'mw');
      g.to(words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: man, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 } });
    }
    // Aparición genérica en lote
    window.ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (batch) => g.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
    });
  }

  function buildCounters() {
    $$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const miles = el.dataset.format === 'miles';
      const set = (v) => { el.textContent = miles ? Math.round(v).toLocaleString('en-US') : String(Math.round(v)); };
      if (!motionOK) { set(target); return; }
      const o = { v: 0 };
      window.ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => window.gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => set(o.v) }),
      });
    });
  }

  function buildHorizontal() {
    if (!motionOK) return;
    const g = window.gsap;
    const mm = g.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const sec = $('#soluciones');
      const pin = $('.hs__pin', sec);
      const track = $('.hs__track', sec);
      if (!sec || !pin || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);
      const tween = g.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      $$('.hs__panel', sec).forEach((panel) => {
        const img = $('img', panel);
        g.fromTo(img, { xPercent: -7 }, {
          xPercent: 7, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      });
      g.to($('.hs__progress i', sec), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), scrub: true } });
    });
  }

  function buildZoom() {
    if (!motionOK) return;
    const g = window.gsap;
    const sec = $('.zoom');
    if (!sec) return;
    const frame = $('.zoom__frame', sec);
    const img = $('img', frame);
    const scrim = $('.zoom__scrim', sec);
    const title = $('[data-zoom-title]', sec);
    const lead = $('.lead', sec);
    const words = splitText(title);
    const mobile = window.matchMedia('(max-width: 899px)').matches;
    const from = mobile ? 'inset(24% 8% 24% 8% round 4px)' : 'inset(22% 30% 22% 30% round 4px)';
    const to = 'inset(0% 0% 0% 0% round 0px)';
    g.set(img, { scale: 1.18 });
    g.set(scrim, { opacity: 0 });
    g.set(words, { yPercent: 112 });
    g.set(lead, { opacity: 0, y: 26 });
    g.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: '+=170%', pin: true, scrub: 0.8, anticipatePin: 1 },
    })
      // fromTo con la misma forma de cadena en ambos extremos: el navegador normaliza inset() y GSAP
      // desalinearía los valores si leyera el estado inicial desde el CSS
      .fromTo(frame, { clipPath: from }, { clipPath: to, ease: 'power2.inOut', duration: 0.62 }, 0)
      .to(img, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .to(scrim, { opacity: 1, duration: 0.3 }, 0.5)
      .to(words, { yPercent: 0, stagger: 0.05, duration: 0.2, ease: 'power3.out' }, 0.62)
      .to(lead, { opacity: 1, y: 0, duration: 0.2 }, 0.8);
  }

  function buildParallaxAndStack() {
    if (!motionOK) return;
    const g = window.gsap;
    $$('[data-parallax]').forEach((img) => {
      g.fromTo(img, { yPercent: -4.5 }, { yPercent: 4.5, ease: 'none', scrollTrigger: { trigger: img.closest('.bento__cell'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    const mm = g.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const cards = $$('.stack__card');
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        g.to($('.stack__inner', card), {
          scale: 0.94, '--dim': 0.62, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top 85%', end: 'top 28%', scrub: true },
        });
      });
    });
  }

  function buildProcess() {
    const list = $('#steps');
    if (!list) return;
    const steps = $$('.step', list);
    if (!motionOK) { steps.forEach((s) => s.classList.add('is-active')); list.style.setProperty('--p', '1'); return; }
    window.gsap.to(list, { '--p': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 62%', end: 'bottom 62%', scrub: true } });
    steps.forEach((step) => {
      window.ScrollTrigger.create({
        trigger: step, start: 'top 64%', end: 'max',
        onEnter: () => step.classList.add('is-active'),
        onLeaveBack: () => step.classList.remove('is-active'),
      });
    });
  }

  function buildMagnetic() {
    if (!motionOK || !finePointer) return;
    const g = window.gsap;
    $$('[data-magnetic]').forEach((btn) => {
      const xTo = g.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = g.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ------------------------------------------------------------------ *
   * Laboratorio KR-18: lluvia sobre cubierta clásica vs. sistema KR-18
   * ------------------------------------------------------------------ */
  function initLab() {
    const canvas = $('#lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const screen = canvas.parentElement;
    const btns = $$('.seg__btn');
    const slider = $('#lab-age');
    const perfEl = $('#lab-perf');
    const leakEl = $('#lab-leak');

    const S = { mode: 'classic', age: 0, w: 0, h: 0, drops: [], fx: [], inner: [], visible: false, raf: 0, last: 0, acc: 0, touched: false, autoplayed: false };
    let screws = [];
    let geo = {};
    const ALERT = '#ff7a59';

    const setFill = (el) => { const pct = ((el.value - el.min) / (el.max - el.min)) * 100; el.style.setProperty('--fill', pct + '%'); };
    const damage = (s) => clamp(S.age * 1.3 * s.k - 0.14, 0, 1);

    function build() {
      const P = clamp(S.w / 8.2, 46, 86);
      geo = { P, rb: S.h * 0.34, ph: S.h * 0.075, floor: S.h * 0.9 };
      geo.purlin = geo.rb + geo.ph + S.h * 0.07;
      screws = [];
      for (let k = 0; k * P < S.w; k++) {
        const x = k * P + P * 0.4;
        if (x < 14 || x > S.w - 14) continue;
        screws.push({ x, k: 0.6 + ((k * 37) % 10) / 10 * 0.4, timer: Math.random() * 1.6, pool: 0 });
      }
      S.drops.length = 0; S.fx.length = 0; S.inner.length = 0;
    }
    function roofY(x) {
      const { P, rb, ph } = geo;
      const u = (((x % P) + P) % P) / P;
      let hh = 0;
      if (u < 0.2) hh = 0; else if (u < 0.3) hh = (u - 0.2) / 0.1; else if (u < 0.5) hh = 1; else if (u < 0.6) hh = 1 - (u - 0.5) / 0.1;
      return rb + ph - hh * ph;
    }
    function resize() {
      const r = screen.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      S.w = r.width; S.h = r.height;
      canvas.width = Math.round(S.w * dpr); canvas.height = Math.round(S.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      draw();
    }

    function readouts() {
      const leaks = S.mode === 'classic' ? screws.filter((s) => damage(s) > 0.3).length : 0;
      const perf = S.mode === 'classic' ? screws.length : 0;
      if (perfEl.textContent !== String(perf)) perfEl.textContent = String(perf);
      if (leakEl.textContent !== String(leaks)) leakEl.textContent = String(leaks);
      leakEl.classList.toggle('is-bad', leaks > 0);
    }

    function step(dt) {
      // lluvia
      S.acc += dt * 150;
      while (S.acc >= 1) {
        S.acc -= 1;
        S.drops.push({ x: Math.random() * (S.w + 60) - 30, y: -12, vy: 520 + Math.random() * 160, len: 10 + Math.random() * 10 });
      }
      for (let i = S.drops.length - 1; i >= 0; i--) {
        const d = S.drops[i];
        d.y += d.vy * dt; d.x -= d.vy * dt * 0.1;
        const ry = roofY(d.x);
        if (d.y >= ry && d.x >= 0 && d.x <= S.w) {
          for (let k = 0; k < 3; k++) S.fx.push({ x: d.x, y: ry, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 60, life: 0.35 });
          S.drops.splice(i, 1);
        } else if (d.y > S.h) S.drops.splice(i, 1);
      }
      // goteras internas (solo sistema clásico)
      if (S.mode === 'classic') {
        screws.forEach((s) => {
          const dm = damage(s);
          if (dm <= 0.3) return;
          s.timer -= dt;
          if (s.timer <= 0) {
            s.timer = 0.9 - (dm - 0.3) * 0.7 + Math.random() * 0.4;
            S.inner.push({ x: s.x + (Math.random() - 0.5) * 3, y: roofY(s.x) + 7, vy: 30, s });
          }
        });
      }
      for (let i = S.inner.length - 1; i >= 0; i--) {
        const d = S.inner[i];
        d.vy += 900 * dt; d.y += d.vy * dt;
        if (d.y >= geo.floor) {
          d.s.pool = Math.min(d.s.pool + 1.4, 34);
          S.fx.push({ x: d.x, y: geo.floor, ring: true, life: 0.7, t: 0 });
          S.inner.splice(i, 1);
        }
      }
      for (let i = S.fx.length - 1; i >= 0; i--) {
        const f = S.fx[i];
        f.life -= dt;
        if (f.ring) f.t += dt; else { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 420 * dt; }
        if (f.life <= 0) S.fx.splice(i, 1);
      }
    }

    function draw() {
      const { w, h } = S;
      const { rb, ph, floor, purlin } = geo;
      ctx.clearRect(0, 0, w, h);
      // cielo
      const sky = ctx.createLinearGradient(0, 0, 0, rb + ph);
      sky.addColorStop(0, '#0d141b'); sky.addColorStop(1, '#101a23');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, rb + ph);
      // interior
      const inn = ctx.createLinearGradient(0, rb + ph, 0, h);
      inn.addColorStop(0, '#0a0d10'); inn.addColorStop(1, '#07090b');
      ctx.fillStyle = inn; ctx.fillRect(0, rb + ph, w, h - (rb + ph));
      // piso y charcos
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, floor + 0.5); ctx.lineTo(w, floor + 0.5); ctx.stroke();
      screws.forEach((s) => {
        if (s.pool > 0) {
          ctx.fillStyle = 'rgba(44,155,213,.4)';
          ctx.beginPath(); ctx.ellipse(s.x, floor + 2, s.pool, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
      // larguero (polín)
      ctx.fillStyle = '#2b343a'; ctx.fillRect(0, purlin, w, 7);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, purlin, w, 1);

      // lámina
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = roofY(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = '#8f9aa1'; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = '#d3dade'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = roofY(x) - 1.2; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();

      // sujeción
      screws.forEach((s) => {
        const y = roofY(s.x);
        if (S.mode === 'classic') {
          const dm = damage(s);
          // cuerpo del tornillo hasta el larguero
          ctx.strokeStyle = dm > 0.3 ? 'rgba(255,122,89,.55)' : 'rgba(170,180,186,.7)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x, purlin + 3); ctx.stroke();
          // arandela de neopreno (se degrada)
          ctx.fillStyle = dm > 0.3 ? ALERT : '#191d20';
          ctx.beginPath(); ctx.ellipse(s.x, y - 3.4, 7.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
          if (dm > 0.3) {
            ctx.strokeStyle = 'rgba(255,122,89,.7)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(s.x - 6, y - 4); ctx.lineTo(s.x - 2, y - 2.4); ctx.moveTo(s.x + 5, y - 4.4); ctx.lineTo(s.x + 2, y - 2.6); ctx.stroke();
          }
          // cabeza
          ctx.fillStyle = '#c6cdd2'; ctx.fillRect(s.x - 3.2, y - 8.2, 6.4, 4.6);
        } else {
          // engargolado oculto y clip debajo de la lámina
          ctx.fillStyle = '#d3dade';
          ctx.beginPath(); ctx.arc(s.x, y - 2.2, 3.2, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = '#15dcbf'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(s.x, y + 2); ctx.lineTo(s.x, purlin - 4); ctx.lineTo(s.x + 7, purlin - 4); ctx.stroke();
          ctx.fillStyle = '#15dcbf'; ctx.fillRect(s.x + 5, purlin - 6, 3, 6);
        }
      });

      // lluvia
      ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      S.drops.forEach((d) => {
        ctx.strokeStyle = 'rgba(110,190,235,.62)';
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.len * 0.1, d.y - d.len); ctx.stroke();
      });
      // gotas internas
      ctx.fillStyle = '#6ec4f2';
      S.inner.forEach((d) => { ctx.beginPath(); ctx.ellipse(d.x, d.y, 1.8, 3.2, 0, 0, Math.PI * 2); ctx.fill(); });
      // salpicaduras
      S.fx.forEach((f) => {
        if (f.ring) {
          ctx.strokeStyle = `rgba(110,190,235,${Math.max(0, f.life) * 0.9})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(f.x, f.y + 1, 3 + f.t * 26, 1.2 + f.t * 6, 0, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(150,210,245,${Math.max(0, f.life) * 2})`;
          ctx.fillRect(f.x, f.y, 1.6, 1.6);
        }
      });

      // rótulo técnico
      ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      const first = screws[1] || screws[0];
      if (first) {
        const y = roofY(first.x);
        const label = S.mode === 'classic' ? 'Tornillo y arandela de neopreno' : 'Clip oculto, lámina sin perforar';
        const lx = Math.min(first.x + 26, w - ctx.measureText(label).width - 12);
        const ly = Math.max(16, y - 46);
        ctx.strokeStyle = 'rgba(237,241,243,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(first.x + 3, y - 6); ctx.lineTo(lx - 4, ly + 6); ctx.lineTo(lx - 4, ly); ctx.stroke();
        ctx.fillStyle = '#edf1f3';
        ctx.fillText(label, lx, ly);
      }
      readouts();
    }

    let last = 0;
    function loop(now) {
      S.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt); draw();
    }
    function start() { if (!S.raf && !reduceMotion) { last = performance.now(); S.raf = requestAnimationFrame(loop); } }
    function stop() { cancelAnimationFrame(S.raf); S.raf = 0; }

    btns.forEach((b) => b.addEventListener('click', () => {
      S.mode = b.dataset.mode;
      btns.forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-checked', String(on)); });
      S.drops.length = 0; S.fx.length = 0; S.inner.length = 0;
      screws.forEach((s) => { s.pool = 0; });
      if (reduceMotion) draw();
    }));
    slider.addEventListener('input', () => {
      S.touched = true;
      if (hasGSAP) window.gsap.killTweensOf(S);
      S.age = slider.value / 100; setFill(slider);
      if (reduceMotion) draw();
    });
    setFill(slider);

    new ResizeObserver(resize).observe(screen);
    new IntersectionObserver(([en]) => {
      S.visible = en.isIntersecting;
      if (S.visible) {
        start();
        if (!S.autoplayed && !S.touched) {
          S.autoplayed = true;
          if (motionOK) {
            window.gsap.to(S, { age: 0.9, duration: 8, ease: 'power1.inOut', delay: 0.6, onUpdate: () => { slider.value = String(Math.round(S.age * 100)); setFill(slider); } });
          } else { S.age = 0.9; slider.value = '90'; setFill(slider); draw(); }
        }
      } else stop();
    }, { threshold: 0.25 }).observe(screen);
    resize();
  }

  function initCompare() {
    const data = [
      { g: 'Traslapes longitudinales engargolados y fijación con clips ocultos: la lámina no se perfora. La cubierta es 100% impermeable.', b: 'Hay que perforar la lámina para fijarla. Aunque el tornillo lleva sello de neopreno, ese sello se degrada con el tiempo.' },
      { g: 'No existen. No hay límite en la longitud de la charola y se fabrica de una sola pieza, de canalón a cumbrera.', b: 'Piezas con longitudes preestablecidas. Al instalarlas se generan traslapes transversales.' },
      { g: 'Mínimo. El material llega en rollo y las charolas se fabrican a pie de obra, en las longitudes requeridas.', b: 'Con longitudes preestablecidas, durante el montaje se cortan piezas para ajustarlas y eso genera desperdicio.' },
      { g: 'Al ser una sola pieza, se alinea en una sola maniobra y después se engargola, dejando la cubierta hermética.', b: 'Se instala en varias etapas según el largo de la lámina. Alineación y traslapes deben ser exactos o habrá filtraciones y haces de luz.' },
      { g: '45.7 cm de ancho efectivo.', b: '1.01 m de ancho efectivo.' },
    ];
    const tabs = $$('.cmp__tab');
    const panel = $('#cmp-p0');
    const good = $('#cmp-good'); const bad = $('#cmp-bad');
    if (!tabs.length) return;
    let busy = false;
    const show = (i, focus) => {
      if (busy) return;
      tabs.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', 'cmp-t' + i);
      busy = true;
      panel.classList.add('is-swapping');
      setTimeout(() => { good.textContent = data[i].g; bad.textContent = data[i].b; panel.classList.remove('is-swapping'); busy = false; }, reduceMotion ? 0 : 280);
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    good.textContent = data[0].g; bad.textContent = data[0].b;
    tabs.forEach((t, k) => { t.tabIndex = k === 0 ? 0 : -1; });
  }

  /* ------------------------------------------------------------------ *
   * Pre-dimensionador de arcotecho
   * Calibres: tablas MEVEL "cálculo de lámina grado C" por zona eólica.
   * Pesos: tabla de pesos teóricos por m2. Longitud de arco: geometría exacta.
   * ------------------------------------------------------------------ */
  // Filas por claro de 14 a 36 m: [flecha 20%, flecha 35%, flecha 50%]
  const TABLE = {
    '1': [['24','24N','22'],['24','24N','22'],['24N','22','22'],['24N','22','20'],['24N','22','20'],['24N','22','20'],['24N','22','20'],['24N','22','20'],['24N','22','18'],['22','20','18'],['22','20','18'],['22','20','18'],['22','20','16'],['22','20','16'],['22','18','16'],['22','18','16'],['22','18','16'],['22','18','16'],['20','18','-'],['20','18','-'],['20','16','-'],['20','16','-'],['18','16','-']],
    '2': [['22','22','18'],['22','20','18'],['22','20','18'],['22','20','18'],['22','20','16'],['22','18','16'],['20','18','16'],['20','18','16'],['20','18','-'],['20','18','-'],['20','16','-'],['18','16','-'],['18','16','-'],['18','16','-'],['18','-','-'],['18','-','-'],['16','-','-'],['16','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-']],
    '3': [['24N','22','20'],['22','22','20'],['22','22','18'],['22','20','18'],['22','20','18'],['22','20','18'],['22','20','18'],['22','18','16'],['22','18','16'],['20','18','-'],['20','18','-'],['20','18','-'],['20','16','-'],['20','16','-'],['18','16','-'],['18','16','-'],['18','16','-'],['18','-','-'],['18','-','-'],['16','-','-'],['16','-','-'],['16','-','-'],['16','-','-']],
    '4': [['22','18','16'],['20','18','16'],['20','18','-'],['20','18','-'],['20','18','-'],['18','16','-'],['18','16','-'],['18','16','-'],['18','-','-'],['18','-','-'],['16','-','-'],['16','-','-'],['16','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-']],
    '5y7': [['24','24N','22'],['24','24N','22'],['24','24N','22'],['24','24N','22'],['24','24N','22'],['24N','22','22'],['24N','22','20'],['24N','22','20'],['24N','22','20'],['24N','22','20'],['24N','22','18'],['24N','22','18'],['24N','22','18'],['22','20','18'],['22','20','18'],['22','20','18'],['22','20','16'],['22','20','16'],['22','20','16'],['22','18','16'],['22','18','16'],['22','18','16'],['20','18','16']],
    '6': [['22','20','18'],['22','18','16'],['20','18','16'],['20','18','16'],['20','18','16'],['20','16','-'],['20','16','-'],['18','16','-'],['18','16','-'],['18','-','-'],['18','-','-'],['18','-','-'],['16','-','-'],['16','-','-'],['16','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-'],['-','-','-']]
  };
  const KG_M2 = { 16: 11.91, 18: 9.52, 20: 7.15, 22: 5.96, 24: 4.76, 25: 4.16, 26: 3.57 };
  const ZONE_INFO = {
    1: 'Península de Baja California: Baja California Norte y Sur. Velocidad regional de 90 km/h.',
    2: 'Pacífico Norte: oeste de Sonora, gran parte de Sinaloa y la costa de Nayarit. Velocidad regional de 125 km/h.',
    3: 'Altiplano Norte: este de Sonora y Sinaloa, Chihuahua, Coahuila, Durango y Zacatecas, entre otros. Velocidad regional de 115 km/h.',
    4: 'Costa del Golfo y Península de Yucatán: Tamaulipas, Veracruz, Tabasco, Campeche, Yucatán y Quintana Roo. Velocidad regional de 160 km/h.',
    5: 'Altiplano Sur: Guanajuato, Querétaro, Tlaxcala, Morelos, Estado de México, Hidalgo, Puebla y Ciudad de México, entre otros. Velocidad regional de 80 km/h.',
    6: 'Pacífico Sur: costa de Jalisco, Colima, Michoacán, Guerrero, Oaxaca y Chiapas. Velocidad regional de 150 km/h.',
    7: 'Chiapas: gran parte del estado, excepto su costa. Velocidad regional de 80 km/h.',
  };

  function initCalc() {
    const form = $('#calc-form');
    if (!form) return;
    const claro = $('#claro'); const claroOut = $('#claro-out'); const largo = $('#largo');
    const zoneDesc = $('#zone-desc');
    const cta = $('#calc-cta'); const warn = $('#calc-warn');
    const el = {
      cal: $('#r-cal'), arc: $('#r-arc'), area: $('#r-area'), kg: $('#r-kg'), arcs: $('#r-arcs'), days: $('#r-days'), daysU: $('#r-days-u'),
    };
    const svg = {
      line: $('#arch-line'), fill: $('#arch-fill'), flow: $('#arch-flow'),
      dimSpan: $('#arch-dim-span'), dimRise: $('#arch-dim-rise'), txtSpan: $('#arch-txt-span'), txtRise: $('#arch-txt-rise'),
    };
    const X0 = 80; const X1 = 480; const Y0 = 262; const PX = X1 - X0;
    const view = { pct: 0.2, span: 28, arc: 0, area: 0, kg: 0, arcs: 0 };
    let painted = false;

    const setFill = (inp) => inp.style.setProperty('--fill', ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + '%');
    const state = () => {
      const zone = form.zona.value;
      return {
        zone, key: zone === '5' || zone === '7' ? '5y7' : zone,
        span: Number(claro.value), pct: Number(form.flecha.value),
        length: clamp(Number(largo.value) || 0, 6, 400),
      };
    };
    const arcLength = (c, pct) => { const s = c * pct / 100; const Rr = (c * c) / (8 * s) + s / 2; return Rr * 2 * Math.asin(c / (2 * Rr)); };

    function drawArch() {
      const s = PX * view.pct;
      const Rr = (PX * PX) / (8 * s) + s / 2;
      const d = `M${X0} ${Y0}A${Rr.toFixed(2)} ${Rr.toFixed(2)} 0 0 1 ${X1} ${Y0}`;
      svg.line.setAttribute('d', d); svg.flow.setAttribute('d', d); svg.fill.setAttribute('d', d + 'Z');
      const apex = Y0 - s;
      const cx = (X0 + X1) / 2;
      svg.dimRise.setAttribute('d', `M${cx} ${Y0}L${cx} ${apex.toFixed(1)}M${cx - 7} ${Y0}L${cx + 7} ${Y0}M${cx - 7} ${apex.toFixed(1)}L${cx + 7} ${apex.toFixed(1)}`);
      svg.txtRise.setAttribute('x', String(cx + 14)); svg.txtRise.setAttribute('y', String(((Y0 + apex) / 2 + 4).toFixed(1)));
      svg.txtRise.setAttribute('text-anchor', 'start');
      svg.txtRise.textContent = `flecha ${(view.span * view.pct).toFixed(1)} m`;
      svg.dimSpan.setAttribute('d', `M${X0} 292L${X1} 292M${X0} 284L${X0} 300M${X1} 284L${X1} 300`);
      svg.txtSpan.textContent = `claro ${Math.round(view.span)} m`;
    }
    function paintNumbers() {
      el.arc.textContent = fmt(view.arc, 1);
      el.area.textContent = fmt(view.area, 0);
      el.kg.textContent = view.kg ? fmt(view.kg, 0) : 'A cotizar';
      el.arcs.textContent = fmt(view.arcs, 0);
    }

    function update() {
      const st = state();
      const row = TABLE[st.key] && TABLE[st.key][st.span - 14];
      const idx = st.pct === 20 ? 0 : st.pct === 35 ? 1 : 2;
      const cal = row ? row[idx] : '-';
      const arc = arcLength(st.span, st.pct);
      const area = arc * st.length;
      const base = cal !== '-' ? parseInt(cal, 10) : null;
      const kg = base ? area * KG_M2[base] : 0;
      const arcs = Math.ceil(st.length / 0.61);
      const days = Math.max(1, Math.ceil(area / 1000));

      claroOut.textContent = st.span + ' m';
      setFill(claro);
      zoneDesc.textContent = ZONE_INFO[st.zone];
      $$('.zone').forEach((z) => z.classList.toggle('is-checked', $('input', z).checked));
      $$('.flecha').forEach((z) => z.classList.toggle('is-checked', $('input', z).checked));

      if (cal === '-') {
        el.cal.textContent = 'Cálculo especial';
        el.cal.classList.remove('is-gradient'); el.cal.classList.add('is-special');
        warn.hidden = false;
        warn.textContent = 'Para esta combinación de zona, claro y flecha las tablas estándar no indican un calibre. Pide a ingeniería un cálculo especial.';
      } else {
        el.cal.textContent = 'Cal. ' + cal;
        el.cal.classList.add('is-gradient'); el.cal.classList.remove('is-special');
        warn.hidden = true;
      }
      el.days.textContent = String(days);
      el.daysU.textContent = days === 1 ? 'jornada' : 'jornadas';

      const msg = `Hola MEVEL, quiero mi cálculo estructural para un arcotecho. Zona eólica ${st.zone}, claro de ${st.span} m, flecha de ${st.pct}% y nave de ${st.length} m de largo. ` +
        (base ? `El pre-dimensionador sugiere calibre ${cal} y unos ${fmt(area, 0)} m² de lámina.` : 'El pre-dimensionador indica que requiere cálculo especial.');
      cta.href = waUrl(msg);

      const to = { pct: st.pct / 100, span: st.span, arc, area, kg, arcs };
      if (motionOK && !painted) {
        painted = true; Object.assign(view, to); drawArch(); paintNumbers();
      } else if (motionOK) {
        window.gsap.to(view, { ...to, duration: 0.9, ease: 'power3.out', overwrite: true, onUpdate: () => { drawArch(); paintNumbers(); } });
      } else { Object.assign(view, to); drawArch(); paintNumbers(); }
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    update();
  }

  /* ------------------------------------------------------------------ *
   * Visualizador de color de fachada (muestras RAL del catálogo)
   * ------------------------------------------------------------------ */
  function initSwatches() {
    const wrap = $('#swatches');
    const stage = $('#viz-stage');
    const name = $('#viz-name');
    if (!wrap) return;
    const COLORS = [
      ['Blanco Pirineo', '9010', '#fefdfb'], ['Blanco Ostra', '9002', '#e6e9e0'], ['Gris Perla', '7038', '#c8cbc2'],
      ['Verde Claro', '6011', '#7d8971'], ['Verde Navarra', '6005', '#2d502f'], ['Azul Cielo', '5024', '#91a1b0'],
      ['Azul Lago', '5019', '#314e92'], ['Azul Marino', '5003', '#22284a'], ['Negro Dextar', '9011', '#070707'],
      ['Marrón Tabaco', '8017', '#1f160d'], ['Rojo Coral', '3013', '#b01f0a'], ['Rojo Baztan', '3004', '#bd1522'],
      ['Arena', '1002', '#e1cd9b'], ['Azul Grisáceo', '5008', '#192028'], ['Gris Sombra', '7022', '#4c4d48'],
      ['Gris Polvo', '7037', '#858384'], ['Gris Pizarra', '7015', '#555861'], ['Beige Agrisado', '1019', '#a89c86'],
      ['Marfil Claro', '1015', '#fbeacc'],
    ];
    let current = 2;
    const btns = COLORS.map(([n, ral, hex], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.style.setProperty('--c', hex);
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `${n}, RAL ${ral}`);
      b.setAttribute('aria-checked', String(i === current)); b.tabIndex = i === current ? 0 : -1;
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', (e) => {
        const k = e.key;
        if (['ArrowRight', 'ArrowDown'].includes(k)) { e.preventDefault(); select((i + 1) % COLORS.length, true); }
        if (['ArrowLeft', 'ArrowUp'].includes(k)) { e.preventDefault(); select((i - 1 + COLORS.length) % COLORS.length, true); }
      });
      wrap.appendChild(b);
      return b;
    });
    function select(i, focus) {
      current = i;
      btns.forEach((b, k) => { b.setAttribute('aria-checked', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      stage.style.setProperty('--panel', COLORS[i][2]);
      name.innerHTML = `${COLORS[i][0]} <small>RAL ${COLORS[i][1]}</small>`;
      if (focus) btns[i].focus();
    }
    select(current);
  }

  /* ------------------------------------------------------------------ *
   * Aplicaciones: la vista previa sigue a la opción activa
   * ------------------------------------------------------------------ */
  function initApps() {
    const items = $$('.apps__item');
    const imgs = $$('#apps-preview img');
    if (!items.length) return;
    const activate = (i) => {
      items.forEach((b, k) => b.classList.toggle('is-active', k === i));
      imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
    };
    items.forEach((b) => {
      const i = Number(b.dataset.i);
      b.addEventListener('mouseenter', () => activate(i));
      b.addEventListener('focus', () => activate(i));
      b.addEventListener('click', () => activate(i));
    });
  }

  /* ------------------------------------------------------------------ *
   * FAQ en acordeón
   * ------------------------------------------------------------------ */
  function initFaq() {
    const items = $$('.faq__item');
    let t;
    items.forEach((item) => {
      const q = $('.faq__q', item);
      q.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((o) => { if (o !== item) { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); } });
        item.classList.toggle('is-open', open);
        q.setAttribute('aria-expanded', String(open));
        clearTimeout(t);
        t = setTimeout(() => { if (hasGSAP) window.ScrollTrigger.refresh(); }, 700);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Formulario de contacto hacia WhatsApp
   * ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#wa-form');
    if (!form) return;
    const status = $('#f-status');
    const rules = {
      nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
      tel: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Escribe un teléfono de al menos 10 dígitos.'),
      ubicacion: (v) => (v.trim().length >= 3 ? '' : 'Indica la ciudad y el estado de la obra.'),
      tipo: (v) => (v ? '' : 'Selecciona qué necesitas.'),
    };
    const field = (name) => form.elements[name];
    const err = (name) => $('#e-' + name);
    const check = (name) => {
      const msg = rules[name](field(name).value || '');
      const input = field(name);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err(name).textContent = msg;
      return !msg;
    };
    Object.keys(rules).forEach((n) => {
      field(n).addEventListener('blur', () => check(n));
      field(n).addEventListener('input', () => { if (field(n).getAttribute('aria-invalid') === 'true') check(n); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = Object.keys(rules).map((n) => [n, check(n)]);
      const firstBad = results.find(([, ok]) => !ok);
      if (firstBad) { field(firstBad[0]).focus(); return; }
      const v = (n) => (field(n).value || '').trim();
      const lines = [
        `Hola MEVEL, soy ${v('nombre')}${v('empresa') ? ` de ${v('empresa')}` : ''}.`,
        `Necesito: ${v('tipo')}.`,
        `Ubicación de la obra: ${v('ubicacion')}.`,
      ];
      if (v('medidas')) lines.push(`Claro o superficie: ${v('medidas')}.`);
      if (v('msg')) lines.push(`Detalles: ${v('msg')}`);
      lines.push(`Mi teléfono: ${v('tel')}.`);
      const url = waUrl(lines.join('\n'));
      status.hidden = false;
      status.innerHTML = 'Listo. Abrimos WhatsApp con tu mensaje. Si no se abrió, <a href="' + url + '" target="_blank" rel="noopener">toca aquí para enviarlo</a>.';
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ------------------------------------------------------------------ *
   * Botón flotante de WhatsApp
   * ------------------------------------------------------------------ */
  function initFab() {
    const fab = $('#fab');
    const trigger = $('.clients');
    if (!fab || !trigger) return;
    let tipShown = false;
    new IntersectionObserver(([en]) => {
      const visible = en.isIntersecting || en.boundingClientRect.top < 0;
      fab.classList.toggle('is-visible', visible);
      if (visible && !tipShown) {
        tipShown = true;
        setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5200); }, 6000);
      }
    }, { threshold: 0 }).observe(trigger);
  }

  /* ------------------------------------------------------------------ *
   * Intro del hero (después del preloader)
   * ------------------------------------------------------------------ */
  function heroIntro(hero) {
    root.classList.add('is-ready');
    if (!motionOK) { hero.state.reveal = 1; hero.state.intro = 1; return; }
    const g = window.gsap;
    const words = splitText($('[data-hero-title]'));
    g.set(words, { yPercent: 112 });
    g.timeline({ defaults: { ease: 'power4.out' } })
      .to('[data-hero="eyebrow"]', { opacity: 1, y: 0, duration: 1 }, 0.15)
      .to(words, { yPercent: 0, duration: 1.3, stagger: 0.075 }, 0.25)
      .to('[data-hero="lead"]', { opacity: 1, y: 0, duration: 1.1 }, 0.95)
      .to('[data-hero="cta"]', { opacity: 1, y: 0, duration: 1.1 }, 1.1);
    g.to(hero.state, { intro: 1, duration: 3.6, ease: 'power3.out' });
    g.to(hero.state, { reveal: 1, duration: 4.8, ease: 'power2.inOut', delay: 0.3 });
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */
  async function boot() {
    if (motionOK) { window.gsap.registerPlugin(window.ScrollTrigger); window.ScrollTrigger.config({ ignoreMobileResize: true }); root.classList.add('gsap-ready'); }
    document.body.classList.add('is-locked');

    wireWhatsApp();
    const closeMenu = initHeader();
    initAnchors(closeMenu);
    initSmoothScroll();

    const pre = createPreloader();
    const hero = initHero();

    const loaded = new Promise((res) => { if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true }); });
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    await Promise.race([Promise.all([loaded, fonts]), new Promise((r) => setTimeout(r, 7000))]);

    // Construcción de escenas con el preloader aún cubriendo la página
    initCompare(); initCalc(); initSwatches(); initApps(); initFaq(); initForm(); initFab(); initLab();
    if (motionOK) {
      buildScrollbar();
      buildHeroScroll(hero);
      buildTextReveals();
      buildCounters();
      buildHorizontal();
      buildZoom();
      buildParallaxAndStack();
      buildProcess();
      buildMagnetic();
      window.ScrollTrigger.refresh();
    } else {
      buildCounters(); buildProcess();
    }
    pre.markReady();
    await pre.finished;
    await pre.leave();
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    heroIntro(hero);
    if (hasGSAP) setTimeout(() => window.ScrollTrigger.refresh(), 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
