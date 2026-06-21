/* ── Feature data ── */
const FEATS = {
  dashboard: { title: 'Dashboard', imgs: ['screenshots/Dashboard.png', 'screenshots/Dashboard2.png'] },
  inventory: { title: 'Inventory', imgs: ['screenshots/inventory.png', 'screenshots/inventory2.png', 'screenshots/inventory3.png', 'screenshots/inventory4.png'] },
  rivens: { title: 'Rivens', imgs: ['screenshots/rivens.png'] },
  relics: { title: 'Relics', imgs: ['screenshots/relics.png', 'screenshots/relics2.png'] },
  mastery: { title: 'Mastery', imgs: ['screenshots/mastery.png', 'screenshots/mastery2.png'] },
  overlays: { title: 'Overlays', imgs: ['screenshots/overlay.png'] },
  mods: { title: 'Mods', imgs: ['screenshots/mods.png', 'screenshots/mods2.png'] },
  maps: { title: 'Maps', imgs: ['screenshots/maps.png'] },
  collectibles: { title: 'Collectibles', imgs: ['screenshots/collectibles.png'] },
  checklist: { title: 'Checklist', imgs: ['screenshots/checklist.png'] },
};

const featImgIdx = {}; // key -> current screenshot index

/* ── Feature nodes ── */
const FEAT_KEYS = ['dashboard', 'inventory', 'rivens', 'relics', 'mastery', 'overlays', 'mods', 'maps', 'collectibles', 'checklist'];

// 10 nodes evenly spaced, starting from top (-90deg = -PI/2)
const NODE_ANGLES = Array.from({ length: 10 }, (_, i) =>
  -Math.PI / 2 + (i / 10) * Math.PI * 2
);
const ELLIPSE_RX = 0.32;
const ELLIPSE_RY = 0.32;

const nodeContainer = document.getElementById('feat-nodes');
const foOverlay = document.getElementById('feat-overlay');
const foShot = document.getElementById('fo-shot');
const foTitle = document.getElementById('fo-title');
const foDots = document.getElementById('fo-dots');

let overlayVisible = false;
let hideTimer = null;
let centerX = innerWidth * 0.68;
let centerY = innerHeight * 0.48;

function placeNodes() {
  centerX = innerWidth * 0.6;
  centerY = innerHeight * 0.48;
  const cx = centerX;
  const cy = centerY;
  const rx = innerWidth * ELLIPSE_RX;
  const ry = innerHeight * ELLIPSE_RY;

  // Position overlay centered on Kronos
  foOverlay.style.left = cx + 'px';
  foOverlay.style.top = cy + 'px';
  document.querySelectorAll('.feat-node').forEach((el, i) => {
    const a = NODE_ANGLES[i];
    el.style.left = (cx + Math.cos(a) * rx) + 'px';
    el.style.top = (cy + Math.sin(a) * ry) + 'px';
  });
}

function renderDots(key, activeIdx) {
  const d = FEATS[key];
  if (d.imgs.length < 2) { foDots.innerHTML = ''; return; }
  foDots.innerHTML = d.imgs.map((_, i) =>
    `<span class="fo-dot${i === activeIdx ? ' active' : ''}"></span>`
  ).join('');
}

function showOverlay(key) {
  clearTimeout(hideTimer);
  const d = FEATS[key];
  foTitle.textContent = d.title;
  if (d.imgs.length) {
    const idx = featImgIdx[key] || 0;
    foShot.innerHTML = `<img src="${d.imgs[idx]}" alt="${d.title}">`;
    renderDots(key, idx);
  } else {
    foShot.innerHTML = '<span class="feat-overlay-shot-empty">No screenshot yet</span>';
    foDots.innerHTML = '';
  }
  foOverlay.classList.add('visible');
  overlayVisible = true;
}

function cycleImg(key) {
  const d = FEATS[key];
  if (!d.imgs.length) return;
  const idx = (featImgIdx[key] || 0) + 1;
  if (idx >= d.imgs.length) {
    featImgIdx[key] = 0;
  } else {
    featImgIdx[key] = idx;
  }
  if (overlayVisible) {
    const newIdx = featImgIdx[key];
    foShot.innerHTML = `<img src="${d.imgs[newIdx]}" alt="${d.title}">`;
    renderDots(key, newIdx);
  }
}

function hideOverlay() {
  hideTimer = setTimeout(() => {
    foOverlay.classList.remove('visible');
    overlayVisible = false;
  }, 120); // small delay so moving between node and overlay does not flicker
}

// Build nodes
FEAT_KEYS.forEach((key, i) => {
  const el = document.createElement('div');
  el.className = 'feat-node';
  el.innerHTML = `<div class="feat-node-dot"></div><div class="feat-node-label">${FEATS[key].title}</div>`;
  el.addEventListener('mouseenter', () => showOverlay(key));
  el.addEventListener('mouseleave', hideOverlay);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleImg(key);
  });
  nodeContainer.appendChild(el);
});

// Overlay itself keeps visible while cursor is over it
foOverlay.addEventListener('mouseenter', () => clearTimeout(hideTimer));
foOverlay.addEventListener('mouseleave', hideOverlay);

placeNodes();
window.addEventListener('resize', placeNodes);

/* ── FAQ accordion ── */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const ans = btn.nextElementSibling;
    const isOpen = ans.classList.contains('open');
    document.querySelectorAll('.faq-a.open').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-q.open').forEach(b => b.classList.remove('open'));
    if (!isOpen) { ans.classList.add('open'); btn.classList.add('open'); }
  });
});

/* ── Three.js Cephalon construct ── */
// Loaded as ESM separately to avoid blocking main thread
(async () => {
  const THREE = await import('https://esm.sh/three@0.128.0').catch(() => null);
  if (!THREE) return; // CDN failed, CSS fallback stays visible

  const canvas = document.getElementById('kronos-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  // -- GLTFLoader --
  const { GLTFLoader } = await import('https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js');

  // -- Textures for shell --
  const texLoader = new THREE.TextureLoader();
  const loadTex = (path) => new Promise(res => {
    texLoader.load('assets/' + path, tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      res(tex);
    }, undefined, () => res(null));
  });
  const [diffTex, normTex, roughTex, dispTex] = await Promise.all([
    loadTex('cracked_concrete_wall_diff_1k.jpg'),
    loadTex('cracked_concrete_wall_nor_1k.png'),
    loadTex('cracked_concrete_wall_rough_1k.jpg'),
    loadTex('cracked_concrete_wall_disp_1k.png'),
  ]);

  // -- Materials --
  // Shell: cracked concrete, textured
  const shellMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughnessMap: roughTex,
    displacementMap: dispTex,
    displacementScale: 0.04,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.92,
    metalness: 0.04,
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  // Pyramids: dark purple emissive, semi-translucent
  const pyramidMat = new THREE.MeshStandardMaterial({
    color: 0x1a0533,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.6,
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  const pyramidWireMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.55,
  });

  // Orbit diamonds: flat panels, purple face toward center
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0x2d0a5e,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const diamondWireMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc, wireframe: true, transparent: true, opacity: 0.7,
  });

  // Core: warm gold sphere
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffcc44,
    emissive: 0xcc8800,
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.6,
  });

  // -- Load GLB --
  const gltf = await new Promise((res, rej) =>
    new GLTFLoader().load('assets/Kronos.glb', res, undefined, rej)
  );

  const construct = new THREE.Group();
  const shellPieces = []; // { mesh, restPos, dir, phase, drift }
  let topPyramid = null;
  let botPyramid = null;
  let coreMesh = null;
  let diamondSrc = null; // source mesh for 4 instanced orbit diamonds
  const orbitDiamonds = []; // { grp, angle }
  const shellGrp = new THREE.Group();

  gltf.scene.traverse(child => {
    if (!child.isMesh) return;
    const n = child.name;

    if (n.startsWith('ShellPiece') || n.toLowerCase().includes('shell')) {
      child.material = shellMat;
      const restPos = child.position.clone();
      const dir = restPos.clone().normalize();
      child.userData = { restPos, dir, phase: Math.random() * Math.PI * 2, drift: 0.01 + Math.random() * 0.02 };
      shellPieces.push(child);
    } else if (n === 'UpperPyramid') {
      child.material = pyramidMat;
      const wire = new THREE.Mesh(child.geometry, pyramidWireMat);
      child.add(wire);
      child.userData.restPos = child.position.clone();
      topPyramid = child;
    } else if (n === 'BottomPyramid') {
      child.material = pyramidMat;
      const wire = new THREE.Mesh(child.geometry, pyramidWireMat);
      child.add(wire);
      child.userData.restPos = child.position.clone();
      botPyramid = child;
    } else if (n === 'Core') {
      child.material = coreMat;
      child.userData.baseScale = child.scale.clone();
      coreMesh = child;
    } else if (n === 'OrbitDiamond') {
      diamondSrc = child;
      child.visible = false;
      const R = Math.sqrt(child.position.x**2 + child.position.z**2) || 0.72;
      child.userData = { R, y: child.position.y };
    }
  });

  // Preserve GLB hierarchy scale/rotation/position
  construct.add(gltf.scene);
  gltf.scene.add(shellGrp);
  shellPieces.forEach(p => shellGrp.add(p));

  // Rotate the shell group to face the camera (adjust from left-facing to front-facing)
  shellGrp.rotation.y = Math.PI / 2;

  // Instance 4 orbit diamonds evenly around equator
  if (diamondSrc) {
    for (let i = 0; i < 4; i++) {
      const fill = new THREE.Mesh(diamondSrc.geometry, diamondMat);
      const wire = new THREE.Mesh(diamondSrc.geometry, diamondWireMat);
      const grp = new THREE.Group();
      grp.add(fill, wire);
      grp.scale.copy(diamondSrc.scale);
      const angle = (i / 4) * Math.PI * 2;
      const R = 0.72;
      grp.position.set(Math.cos(angle) * R, 0, Math.sin(angle) * R * 0.4);
      // Face toward center: rotate so front faces origin
      grp.rotation.y = -angle + Math.PI / 2;
      orbitDiamonds.push({ grp, angle });
      construct.add(grp);
    }
  }

  // -- Orbital ring lines --
  const makeEllipseLine = (rx, ry, tiltX, tiltZ, color, opacity) => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(Math.cos(a) * rx, Math.sin(a) * ry, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    line.rotation.x = tiltX;
    line.rotation.z = tiltZ;
    construct.add(line);
    return line;
  };
  const halo = makeEllipseLine(1.8, 1.8, Math.PI / 2, 0, 0x7c3aed, 0.30);
  const halo2 = makeEllipseLine(2.0, 1.4, Math.PI / 3, Math.PI / 6, 0xc4b5fd, 0.14);
  const halo3 = makeEllipseLine(1.9, 1.9, Math.PI / 6, Math.PI / 4, 0x9f57f7, 0.10);

  // -- Debris crystal shards in outer field --
  const ORBIT_MIN_R = 2.2;
  const shardGeos = [
    new THREE.OctahedronGeometry(0.10, 0),
    new THREE.OctahedronGeometry(0.07, 0),
    new THREE.BoxGeometry(0.14, 0.06, 0.05),
  ];
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x6b21a8, emissive: 0x9333ea, emissiveIntensity: 0.55,
    roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.85,
  });
  const chipMat = new THREE.MeshStandardMaterial({
    color: 0x5a5060, emissive: 0x2d1060, emissiveIntensity: 0.08,
    roughness: 0.95, metalness: 0.02, transparent: true, opacity: 0.88,
  });
  const orbitData = Array.from({ length: 24 }, (_, i) => {
    const isCrystal = i % 3 !== 2;
    const mesh = new THREE.Mesh(shardGeos[i % 3], isCrystal ? crystalMat : chipMat);
    mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    if (isCrystal) mesh.scale.set(1, 1.3 + Math.random() * 0.8, 0.6 + Math.random() * 0.5);
    scene.add(mesh);
    return {
      mesh,
      a: ORBIT_MIN_R + 0.4 + Math.random() * 1.0,
      b: ORBIT_MIN_R + 0.2 + Math.random() * 0.6,
      phase: (i / 24) * Math.PI * 2,
      speed: 0.05 + Math.random() * 0.07,
      tilt: Math.random() * Math.PI,
    };
  });

  scene.add(construct);

  // -- Lights --
  scene.add(new THREE.AmbientLight(0x2a1f3d, 1.2)); // Reduced ambient from 5 to 1.2
  const ptL = new THREE.PointLight(0x7c3aed, 2.5, 14); // Boosted violet rim light for contrast
  scene.add(ptL);
  const ptL2 = new THREE.PointLight(0xffffff, 0.4, 12); // Drastically reduced white fill so it doesn't blow out
  ptL2.position.set(0, 0, 5);
  scene.add(ptL2);
  const ambL = new THREE.PointLight(0xfbbf24, 2.0, 4);  // amber core glow
  scene.add(ambL);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // -- Particles --
  const N = 300;
  const pos = new Float32Array(N * 3);
  const vel = [];
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = 2.3 + Math.random() * 1.6;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
    vel.push({ th, ph, r, dr: (Math.random() - 0.5) * 0.003, br: r });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x8b5cf6, size: 0.024, transparent: true, opacity: 0.6 }));
  scene.add(pts);

  // -- Mouse tracking --
  let tx = 0, ty = 0, stx = 0, sty = 0;
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    tx = dx / centerX;
    ty = dy / (innerHeight - centerY);
  });
  window.addEventListener('mouseleave', () => {
    tx = 0; ty = 0;
  });

  // -- Double-click spin --
  let spinAnim = null; // { start, duration, type }
  const SPIN_TURNS = 2;
  const SPIN_DURATION = 2000;
  function spinEase(t) {
    const c1 = 2.5;
    const c2 = c1 * 1.525;
    if (t < 0.5) return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }
  document.addEventListener('dblclick', (e) => {
    if (document.getElementById('hero').contains(e.target) && !e.target.closest('.feat-node')) {
      const type = Math.random() < 0.5 ? 'yaw' : 'spinner';
      spinAnim = { start: performance.now(), duration: SPIN_DURATION, type };
    }
  });

  // -- Construct: always centered --
  const hero = document.getElementById('hero');
  const posConstruct = () => {
    // Match the ellipse center offset (0.58 of viewport = slightly right of center)
    // At FOV=50, z=6.5: 1 world unit ≈ viewport_width/tan(25deg)/6.5 ≈ not trivial,
    // so we approximate: shift by ~1.2 units right to visually align with cx=58%
    construct.position.set(1.2, 0.1, 0);
    pts.position.set(1.2, 0.1, 0);
  };
  posConstruct();
  window.addEventListener('resize', posConstruct);

  // -- Loop --
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  const animate = () => {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // No scroll fade - Kronos stays fixed on screen always

    // Smooth tracking - responsive without snap
    const lerpSpeed = overlayVisible ? 0.04 : 0.15;
    stx += (tx - stx) * lerpSpeed;
    sty += (ty - sty) * lerpSpeed;

    let spinOffset = 0;
    if (spinAnim) {
      const elapsed = performance.now() - spinAnim.start;
      let progress;
      if (elapsed >= spinAnim.duration) {
        progress = 1;
        spinAnim = null;
      } else {
        progress = spinEase(elapsed / spinAnim.duration);
      }
      spinOffset = progress * Math.PI * 2 * SPIN_TURNS;
    }

    // Whole construct gyrates together
    construct.rotation.y = Math.sin(t * 0.35) * 0.18 + Math.sin(t * 0.19) * 0.08 + spinOffset;
    construct.rotation.x = Math.sin(t * 0.27) * 0.10 + Math.sin(t * 0.13) * 0.05;
    construct.rotation.z = Math.sin(t * 0.22) * 0.04;

    // Shell pieces subtle breathing/drift
    shellPieces.forEach((piece) => {
      const u = piece.userData;
      // Breathe outwards along their dir, plus some wobble
      const offset = Math.sin(t * 0.3 + u.phase) * u.drift;
      piece.position.copy(u.restPos).addScaledVector(u.dir, offset);
      // subtle rotation wobble
      piece.rotation.x = Math.sin(t * 0.2 + u.phase) * 0.005;
      piece.rotation.y = Math.cos(t * 0.25 + u.phase) * 0.005;
    });

    // Pyramids levitate and rotate slowly
    if (topPyramid) {
      topPyramid.position.y = topPyramid.userData.restPos.y + Math.sin(t * 0.8) * 0.05;
      topPyramid.rotation.y += 0.006;
    }
    if (botPyramid) {
      botPyramid.position.y = botPyramid.userData.restPos.y - Math.sin(t * 0.8 + 1) * 0.05;
      botPyramid.rotation.y -= 0.004;
    }

    // Orbit diamonds
    orbitDiamonds.forEach((d, i) => {
      const orbitAngle = t * 0.15 + d.angle;
      const R = diamondSrc.userData.R * 1.35; // increased distance
      d.grp.position.x = Math.cos(orbitAngle) * R;
      d.grp.position.y = diamondSrc.userData.y;
      d.grp.position.z = Math.sin(orbitAngle) * R * 0.4;

      // Face the core, no spinning on their own axes
      d.grp.rotation.y = -orbitAngle + Math.PI / 2;
    });

    // Orbital ring lines counter-rotate independently
    halo.rotation.z = t * 0.14;
    halo2.rotation.z = -t * 0.09;
    halo3.rotation.z = t * 0.06;

    // Core pulse and cursor tracking
    if (coreMesh) {
      coreMesh.position.x = stx * 0.18;
      coreMesh.position.y = -sty * 0.14;
      coreMesh.rotation.y = stx * 0.8;
      coreMesh.rotation.x = sty * 0.8;

      const pulse = 0.96 + Math.sin(t * 1.9) * 0.04;
      coreMesh.scale.copy(coreMesh.userData.baseScale).multiplyScalar(pulse);
      coreMat.emissiveIntensity = 0.7 + Math.sin(t * 1.9) * 0.2;

      coreMesh.getWorldPosition(tmpV);
      ambL.position.copy(tmpV);
      ambL.intensity = (1.2 + Math.sin(t * 1.9) * 0.4) * pulse;
    }

    // Orbital debris: enforce min radius so nothing phases through construct
    const cx = construct.position.x, cy = construct.position.y;
    orbitData.forEach(o => {
      const angle = t * o.speed + o.phase;
      let x = cx + Math.cos(angle) * o.a;
      let y = cy + Math.sin(angle * 0.7 + o.tilt) * o.b;
      const z = Math.sin(angle * 1.3 + o.phase) * 0.5;
      // Enforce min radius from construct center in XY plane
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ORBIT_MIN_R) {
        const scale = ORBIT_MIN_R / dist;
        x = cx + dx * scale;
        y = cy + dy * scale;
      }
      o.mesh.position.set(x, y, z);
      o.mesh.rotation.z += 0.006;
      o.mesh.rotation.x += 0.003;
    });

    // Rim light slow orbit - violet catch light sweeps panel faces
    ptL.position.x = construct.position.x + Math.cos(t * 0.3) * 3.5;
    ptL.position.y = Math.sin(t * 0.2) * 2.5;
    ptL.position.z = 2.5 + Math.sin(t * 0.4) * 1.0;

    // Particles
    const pa = pGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const v = vel[i];
      v.r += v.dr;
      if (v.r > v.br + 0.7 || v.r < v.br - 0.7) v.dr *= -1;
      v.th += 0.0008;
      pa[i * 3] = v.r * Math.sin(v.ph) * Math.cos(v.th);
      pa[i * 3 + 1] = v.r * Math.sin(v.ph) * Math.sin(v.th);
      pa[i * 3 + 2] = v.r * Math.cos(v.ph);
    }
    pGeo.attributes.position.needsUpdate = true;
    pts.rotation.y = t * 0.012;

    renderer.render(scene, camera);
  };
  animate();
})();