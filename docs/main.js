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
const ELLIPSE_RY = 0.38;

const nodeContainer = document.getElementById('feat-nodes');
const foOverlay = document.getElementById('feat-overlay');
const foShot = document.getElementById('fo-shot');
const foTitle = document.getElementById('fo-title');
const foDots = document.getElementById('fo-dots');

let overlayVisible = false;
let hideTimer = null;
let centerX = innerWidth * 0.68;
let centerY = innerHeight * 0.55;

function placeNodes() {
  const isMobile = innerWidth <= 768;
  centerX = innerWidth * (isMobile ? 0.5 : 0.6);
  centerY = isMobile ? innerHeight * 0.75 : innerHeight * 0.55;
  const cx = centerX;
  const cy = centerY;
  const rx = innerWidth * ELLIPSE_RX * (isMobile ? 0.55 : 1);
  const ry = innerHeight * ELLIPSE_RY * (isMobile ? 0.55 : 1);

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
  el.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    showOverlay(key);
  }, { passive: true });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleImg(key);
  });
  nodeContainer.appendChild(el);
});

// Overlay itself keeps visible while cursor is over it
foOverlay.addEventListener('mouseenter', () => clearTimeout(hideTimer));
foOverlay.addEventListener('mouseleave', hideOverlay);

document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.feat-node') && !e.target.closest('#feat-overlay')) {
    hideOverlay();
  }
}, { passive: true });

placeNodes();
window.addEventListener('resize', placeNodes);

/* ── Mobile feature strip (replaces node orbit on touch screens) ── */
(function buildMobileStrip() {
  if (window.innerWidth > 768) return;

  // Put "Cephalon Kronos" on one line
  const h1Span = document.querySelector('.h1-main');
  if (h1Span) h1Span.textContent = 'Cephalon Kronos';

  const strip = document.createElement('div');
  strip.id = 'feat-strip';

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbClose = document.getElementById('lb-close');

  let lightboxKey = null;
  let lightboxIdx = 0;

  function openLightbox(key, idx) {
    const d = FEATS[key];
    if (!d || !d.imgs || !d.imgs.length) return;
    lightboxKey = key;
    lightboxIdx = idx != null ? idx : 0;
    lbImg.src = d.imgs[lightboxIdx];
    lbImg.alt = d.title;
    lb.classList.add('active');
  }

  // Dot strip element
  const dotsEl = document.createElement('div');
  dotsEl.className = 'lb-dots';

  function renderDots() {
    const d = FEATS[lightboxKey];
    if (!d || d.imgs.length < 2) { dotsEl.innerHTML = ''; return; }
    dotsEl.innerHTML = '';
    d.imgs.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'lb-dot' + (i === lightboxIdx ? ' active' : '');
      dot.addEventListener('click', (e) => { e.stopPropagation(); lightboxIdx = i; lbImg.src = d.imgs[i]; renderDots(); });
      dotsEl.appendChild(dot);
    });
  }

  function cycleLb(dir) {
    const d = FEATS[lightboxKey];
    if (!d || !d.imgs || d.imgs.length < 2) return;
    lightboxIdx = (lightboxIdx + dir + d.imgs.length) % d.imgs.length;
    lbImg.src = d.imgs[lightboxIdx];
    renderDots();
  }

  // redefine openLightbox to render dots
  openLightbox = function(key, idx) {
    const d = FEATS[key];
    if (!d || !d.imgs || !d.imgs.length) return;
    lightboxKey = key;
    lightboxIdx = idx != null ? idx : 0;
    lbImg.src = d.imgs[lightboxIdx];
    lbImg.alt = d.title;
    lb.classList.add('active');
    renderDots();
  };

  if (lb) {
    lb.appendChild(dotsEl);

    // Touch swipe
    let tsX = null;
    lb.addEventListener('touchstart', (e) => { tsX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (tsX === null) return;
      const dx = e.changedTouches[0].clientX - tsX;
      tsX = null;
      if (Math.abs(dx) < 40) return;
      cycleLb(dx < 0 ? 1 : -1);
    }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') lb.classList.remove('active');
      if (e.key === 'ArrowLeft') cycleLb(-1);
      if (e.key === 'ArrowRight') cycleLb(1);
    });

    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target === lbClose) lb.classList.remove('active');
    });
  }

  FEAT_KEYS.forEach(key => {
    const d = FEATS[key];
    const card = document.createElement('div');
    card.className = 'feat-strip-card';

    const thumb = document.createElement('div');
    thumb.className = 'feat-strip-thumb';

    if (d.imgs && d.imgs.length) {
      const img = document.createElement('img');
      img.src = d.imgs[0];
      img.alt = d.title;
      img.loading = 'lazy';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<div class="feat-strip-thumb-empty">&mdash;</div>';
    }

    const label = document.createElement('div');
    label.className = 'feat-strip-label';
    label.textContent = d.title;

    card.appendChild(thumb);
    card.appendChild(label);

    card.addEventListener('click', () => {
      if (d.imgs && d.imgs.length && lb) {
        openLightbox(key, 0);
      }
    });

    strip.appendChild(card);
  });

  // Insert after .platform-badges inside .hero-text
  const platformBadges = document.querySelector('.platform-badges');
  if (platformBadges) {
    platformBadges.parentNode.insertBefore(strip, platformBadges.nextSibling);
  }
})();

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
  const [diffTex, normTex, roughTex] = await Promise.all([
    loadTex('cracked_concrete_wall_diff_1k.jpg'),
    loadTex('cracked_concrete_wall_nor_1k.png'),
    loadTex('cracked_concrete_wall_rough_1k.jpg'),
  ]);

  // -- Materials --
  // Shell: cracked concrete, textured
  const shellMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughnessMap: roughTex,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.92,
    metalness: 0.04,
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  // Pyramids: textured, faintly translucent
  const pyramidMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughnessMap: roughTex,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x4d1a7e,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0.25,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });

  // Orbit diamonds: textured flat panels, purple face toward center
  const diamondMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughnessMap: roughTex,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x4d1a7e,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  // Core: deep purple concrete shell that reacts to light
  const coreMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughnessMap: roughTex,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x1c053a,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  // -- Load GLB --
  const gltf = await new Promise((res, rej) =>
    new GLTFLoader().load('assets/Kronos.glb', res, undefined, rej)
  );

  const construct = new THREE.Group();
  const shellPieces = []; // { mesh, restPos, dir, phase, drift }
  let topPyramid = null;
  let botPyramid = null;
  const corePieces = []; // icosphere cells forming hollow core
  let diamondSrc = null; // source mesh for 4 instanced orbit diamonds
  const orbitDiamonds = []; // { grp, angle }
  const shellGrp = new THREE.Group();
  const coreGrp = new THREE.Group();

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
      child.userData.restPos = child.position.clone();
      topPyramid = child;
    } else if (n === 'BottomPyramid') {
      child.material = pyramidMat;
      child.userData.restPos = child.position.clone();
      botPyramid = child;
    } else if (n.includes('Icosphere_cell')) {
      child.material = coreMat;
      child.userData.baseScale = child.scale.clone();
      corePieces.push(child);
    } else if (n === 'OrbitDiamond') {
      diamondSrc = child;
      child.visible = false;
      const R = Math.sqrt(child.position.x ** 2 + child.position.z ** 2) || 0.72;
      child.userData = { R, y: child.position.y };
    }
  });

  // Preserve GLB hierarchy scale/rotation/position
  construct.add(gltf.scene);
  gltf.scene.add(shellGrp);
  shellPieces.forEach(p => shellGrp.add(p));

  // Rotate the shell group to face the camera (adjust from left-facing to front-facing)
  shellGrp.rotation.y = Math.PI / 2;

  // Reparent core pieces into core group
  corePieces.forEach(p => coreGrp.add(p));
  gltf.scene.add(coreGrp);

  // Amber emissive sphere inside the hollow core — glows through cracks
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0x996644,
    emissive: 0x885533,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.0,
  });
  const amberSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), amberMat);
  coreGrp.add(amberSphere);
  const darkCol = new THREE.Color(0x553322);
  const amberCol = new THREE.Color(0x996644);
  const darkEm = new THREE.Color(0x442211);
  const amberEm = new THREE.Color(0x885533);

  // Amber point light inside core — casts real light on surrounding geometry
  const amberLight = new THREE.PointLight(0xff8844, 1.5, 1.2);
  scene.add(amberLight);

  // Instance 4 orbit diamonds evenly around equator
  if (diamondSrc) {
    for (let i = 0; i < 4; i++) {
      const fill = new THREE.Mesh(diamondSrc.geometry, diamondMat);
      const grp = new THREE.Group();
      fill.position.set(0.441, 0.015, 0.009);
      grp.add(fill);
      grp.scale.copy(diamondSrc.scale);
      const angle = (i / 4) * Math.PI * 2;
      const R = 0.65;
      grp.position.set(Math.cos(angle) * R, 0, Math.sin(angle) * R);
      // Face toward center: rotate so front faces origin
      grp.rotation.y = Math.PI - angle;
      orbitDiamonds.push({ grp, angle });
      gltf.scene.add(grp);
    }
  }

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
  scene.add(new THREE.AmbientLight(0x2a2a40, 0.3));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  const fillLight = new THREE.PointLight(0xa855f7, 2.0, 10);
  fillLight.position.set(-6, -3, 2);
  scene.add(fillLight);

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
    const isMobile = innerWidth <= 768;
    const scale = isMobile ? 0.6 : 1;
    const yPos = isMobile ? 1.2 : -0.2;
    construct.position.set(isMobile ? 0 : 1.2, yPos, 0);
    construct.scale.setScalar(scale);
    pts.position.set(isMobile ? 0 : 1.2, yPos, 0);
    pts.scale.setScalar(scale);
  };
  posConstruct();
  window.addEventListener('resize', posConstruct);

  // -- Loop --
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  const animate = () => {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

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

    // Orbit diamonds — local to coreGrp, face the core
    orbitDiamonds.forEach((d) => {
      const orbitAngle = t * 0.25 + d.angle;
      d.grp.position.set(Math.cos(orbitAngle) * 0.65, diamondSrc.userData.y, Math.sin(orbitAngle) * 0.65);
      d.grp.rotation.y = Math.PI - orbitAngle;
    });

    // Core mouse tracking + amber sphere breathing color
    if (corePieces.length) {
      coreGrp.rotation.y = stx * 0.8;
      coreGrp.rotation.x = sty * 0.8;

      const breath = 0.5 + Math.sin(t * 1.2) * 0.5;
      amberMat.color.lerpColors(darkCol, amberCol, breath);
      amberMat.emissive.lerpColors(darkEm, amberEm, breath);

      coreGrp.getWorldPosition(tmpV);
      amberLight.position.copy(tmpV);
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