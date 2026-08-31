import * as THREE from 'three';

/**
 * Claymorphic 3D hero backdrop, v2.
 *
 * Composition:
 *  - A clay "spine" of stacked vertebrae in the bottom-left air that
 *    endlessly morphs between a slouched C-curve and a proud tall S —
 *    the whole product story, told in 3D.
 *  - XP orbs orbiting the spine's head (sit tall → rewards).
 *  - Pastel clay shapes that breathe (squash & stretch) and spring
 *    away from the cursor with soft physics.
 *  - Gentle mouse parallax + whole-scene scroll drift.
 *
 * Renders a single static frame (tall pose) under reduced motion,
 * and removes the canvas entirely when WebGL is unavailable.
 */
export function initHeroScene(canvas, prefersReducedMotion) {
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    canvas.remove(); // no WebGL — the CSS gradient background carries the hero
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* ---------- clay-sweet lighting ---------- */
  scene.add(new THREE.AmbientLight(0xfff4e6, 0.85));
  scene.add(new THREE.HemisphereLight(0xfff7ed, 0xe9d5ff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 0.85);
  rim.position.set(-6, -3, 4);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffd8a8, 0.7, 30);
  warm.position.set(6, 2, 6);
  scene.add(warm);

  const clay = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.04, ...extra });

  /* ---------- floating clay shapes (breathe + spring from cursor) ---------- */
  const shapes = [
    { geo: new THREE.TorusKnotGeometry(1.05, 0.4, 140, 20), color: 0xf97316, pos: [-7.6, 2.6, -3], spin: 0.28 },
    { geo: new THREE.IcosahedronGeometry(1.15, 5), color: 0x60a5fa, pos: [7.4, 3.1, -4], spin: 0.2 },
    { geo: new THREE.CapsuleGeometry(0.62, 1.15, 8, 18), color: 0x6ee7b7, pos: [7.0, -2.6, -3.5], spin: 0.3 },
    { geo: new THREE.IcosahedronGeometry(0.52, 4), color: 0xfacc15, pos: [-3.4, 4.2, -5], spin: 0.4 },
    { geo: new THREE.IcosahedronGeometry(0.42, 4), color: 0xec4899, pos: [3.1, -4.4, -4.5], spin: 0.44 },
    { geo: new THREE.TorusGeometry(0.5, 0.22, 16, 30), color: 0xfb923c, pos: [1.8, 4.6, -6], spin: 0.36 },
    { geo: new THREE.IcosahedronGeometry(0.34, 3), color: 0x2563eb, pos: [5.4, 0.6, -6.5], spin: 0.5 },
    { geo: new THREE.CapsuleGeometry(0.3, 0.6, 6, 12), color: 0xfda4af, pos: [-2.4, -4.6, -5.5], spin: 0.42 },
  ];

  const meshes = shapes.map((s, i) => {
    const m = new THREE.Mesh(s.geo, clay(s.color));
    m.position.set(...s.pos);
    m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    m.userData = {
      phase: i * 1.17,
      spin: s.spin,
      base: new THREE.Vector3(...s.pos),
      offset: new THREE.Vector2(0, 0),
      vel: new THREE.Vector2(0, 0),
      squish: 0,
    };
    scene.add(m);
    return m;
  });

  /* ---------- the clay spine: slouch ⟷ sit tall ---------- */
  const spine = new THREE.Group();
  /* in the empty corridor between the copy column and the hero image card;
     the slouch pose leans it toward the phone, the tall pose stands proud */
  spine.position.set(0.85, -6.3, -3.5);
  spine.rotation.z = -0.03;
  spine.scale.setScalar(0.85);
  scene.add(spine);

  const SEGS = 8;
  // x-offsets per vertebra for each pose (bottom → top)
  const POSE_SLOUCH = { x: [0, 0.1, 0.3, 0.56, 0.84, 1.04, 1.1, 0.96], rise: 0.5, head: { x: 1.35, lift: 0.34 } };
  const POSE_TALL = { x: [0, 0.05, 0.07, 0.05, 0, -0.05, -0.03, 0.03], rise: 0.66, head: { x: 0.02, lift: 0.62 } };

  const vertGeo = new THREE.SphereGeometry(1, 22, 22);
  const bottomCol = new THREE.Color(0xc4b5fd); // lilac
  const topCol = new THREE.Color(0x60a5fa); // blue
  const vertebrae = [];
  for (let i = 0; i < SEGS; i++) {
    const c = bottomCol.clone().lerp(topCol, i / (SEGS - 1));
    const v = new THREE.Mesh(vertGeo, clay(c));
    const r = 0.46 - i * 0.02; // gentle taper upward
    v.scale.set(r, r * 0.82, r); // slightly squashed discs — vertebra vibes
    spine.add(v);
    vertebrae.push(v);
  }
  const headMesh = new THREE.Mesh(
    vertGeo,
    clay(0xfacc15, { emissive: 0xf97316, emissiveIntensity: 0 })
  );
  headMesh.scale.setScalar(0.52);
  spine.add(headMesh);

  function poseSpine(f) {
    // f: 0 = slouched, 1 = tall
    let y = 0;
    for (let i = 0; i < SEGS; i++) {
      const x = THREE.MathUtils.lerp(POSE_SLOUCH.x[i], POSE_TALL.x[i], f);
      const rise = THREE.MathUtils.lerp(POSE_SLOUCH.rise, POSE_TALL.rise, f);
      y += i === 0 ? 0 : rise;
      vertebrae[i].position.set(x, y, 0);
    }
    const hx = THREE.MathUtils.lerp(POSE_SLOUCH.head.x, POSE_TALL.head.x, f);
    const hl = THREE.MathUtils.lerp(POSE_SLOUCH.head.lift, POSE_TALL.head.lift, f);
    headMesh.position.set(hx, y + hl + 0.55, 0);
    headMesh.material.emissiveIntensity = f * 0.55; // glows as posture wins
  }

  /* ---------- XP orbs orbiting the spine's head ---------- */
  const orbGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const orbColors = [0xfacc15, 0xf97316, 0x6ee7b7];
  const orbs = orbColors.map((c, i) => {
    const o = new THREE.Mesh(orbGeo, clay(c, { emissive: c, emissiveIntensity: 0.6, roughness: 0.25 }));
    o.userData = { angle: (i / orbColors.length) * Math.PI * 2, speed: 0.0011 + i * 0.00025, radius: 1.25 + i * 0.22 };
    scene.add(o);
    return o;
  });
  const headWorld = new THREE.Vector3();

  /* ---------- pointer + parallax state ---------- */
  const target = new THREE.Vector2(0, 0);
  const eased = new THREE.Vector2(0, 0);
  const HALF_V = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // resizing clears the drawing buffer — repaint the static frame in reduced-motion mode
    if (prefersReducedMotion) renderFrame(0, 0); // step 0 → idempotent static repaint
  }

  /* step = elapsed time in 60fps-frame units (0 renders a static, mutation-free frame) */
  function renderFrame(t, step) {
    /* spine morph: dwell at each pose, ease through the middle */
    const wave = Math.sin(t * 0.00042);
    const f = prefersReducedMotion ? 1 : 0.5 + 0.5 * Math.tanh(wave * 2.4);
    poseSpine(f);

    /* orbs circle the head — tight and lively when tall, drowsy when slouched */
    headMesh.getWorldPosition(headWorld);
    orbs.forEach((o) => {
      const u = o.userData;
      u.angle += u.speed * (0.35 + f) * 16 * step;
      const wobble = Math.sin(t * 0.0009 + u.angle) * 0.18;
      o.position.set(
        headWorld.x + Math.cos(u.angle) * u.radius,
        headWorld.y + wobble + 0.15,
        headWorld.z + Math.sin(u.angle) * u.radius * 0.55
      );
      o.material.emissiveIntensity = 0.25 + f * 0.6;
    });

    /* floating shapes: breathe, bob, and spring away from the cursor */
    meshes.forEach((m) => {
      const u = m.userData;
      m.rotation.x += 0.0034 * u.spin * step;
      m.rotation.y += 0.0043 * u.spin * step;

      /* cursor position projected onto this shape's depth plane */
      const dist = camera.position.z - u.base.z;
      const halfH = HALF_V * dist;
      const px = target.x * halfH * camera.aspect;
      const py = target.y * halfH;

      const bobY = u.base.y + Math.sin(t * 0.00052 + u.phase) * 0.55;
      let dx = u.base.x + u.offset.x - px;
      let dy = bobY + u.offset.y - py;
      let d = Math.hypot(dx, dy);
      if (d < 1e-4) { dx = 0.707; dy = 0.707; d = 1; } // direct hit: push up-right
      const R = 3.1;
      const force = Math.max(0, (R - d) / R);
      const desiredX = (dx / d) * force * 1.7;
      const desiredY = (dy / d) * force * 1.7;

      /* semi-implicit spring, normalized to a 60fps reference step */
      u.vel.x += (desiredX - u.offset.x) * 0.085 * step;
      u.vel.y += (desiredY - u.offset.y) * 0.085 * step;
      u.vel.multiplyScalar(Math.pow(0.86, step));
      u.offset.x += u.vel.x * step;
      u.offset.y += u.vel.y * step;
      u.squish += ((force > 0.02 ? force : 0) - u.squish) * (1 - Math.pow(0.9, step));

      m.position.set(u.base.x + u.offset.x, bobY + u.offset.y, u.base.z);

      /* clay breathing + interactive squish */
      const breath = 1 + Math.sin(t * 0.0011 + u.phase) * 0.055 + u.squish * 0.22;
      m.scale.set(1 / Math.sqrt(breath), breath, 1 / Math.sqrt(breath));
    });

    eased.lerp(target, Math.min(1, 0.045 * step));
    camera.position.x = eased.x * 1.1;
    camera.position.y = eased.y * 0.7;
    /* gentle whole-scene drift tied to scroll, so the 3D world reacts to the page */
    const drift = (typeof window !== 'undefined' ? window.scrollY : 0) * 0.00028;
    scene.rotation.z = drift;
    scene.position.y = drift * 3.2;
    camera.lookAt(0, 0, -3);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);

  if (prefersReducedMotion) {
    renderFrame(0, 0); // static, fully composed frame — spine proudly tall
    return;
  }

  window.addEventListener('pointermove', (e) => {
    target.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  });

  /* only animate while the hero is on screen and the tab is visible */
  let heroVisible = true;
  let rafId = null;
  let lastT = null;

  function loop(t) {
    const step = lastT === null ? 1 : Math.min((t - lastT) / (1000 / 60), 3);
    lastT = t;
    renderFrame(t, step);
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (rafId === null) { lastT = null; rafId = requestAnimationFrame(loop); }
  }
  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      heroVisible && !document.hidden ? start() : stop();
    },
    { threshold: 0 }
  ).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    document.hidden || !heroVisible ? stop() : start();
  });

  start();
}
