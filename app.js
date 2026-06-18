/* ============================================================
   Kadenz 3D Deck Railing Visualizer — replica
   Three.js scene: orbitable deck + procedurally built railing
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------- Catalog data ---------- */
export const PRODUCTS = {
  classic: {
    name: "Kadenz Classic",
    desc: "Budget-friendly, sturdy and straightforward to install.",
    hint: "The Classic line pairs a clean flat top rail with economical components — a great all-rounder for residential decks.",
    railWeight: 1, defaultTopRail: "flat",
  },
  elegance: {
    name: "Kadenz Elegance",
    desc: "A refined balance of strength, function and aesthetics.",
    hint: "Elegance uses a slimmer profile and an internally-mounted top rail for a sleek, modern silhouette.",
    railWeight: 0.9, defaultTopRail: "round",
  },
  commercial: {
    name: "Kadenz Commercial",
    desc: "Independently lab-tested for multi-family & commercial use.",
    hint: "Commercial is the heaviest-duty line, with pre-mounted brackets and reinforced posts for code-driven projects.",
    railWeight: 1.2, defaultTopRail: "flat",
  },
};

export const INFILLS = {
  picket: { name: "Picket", icon: infillIcon("picket") },
  glass:  { name: "Glass",  icon: infillIcon("glass") },
  cable:  { name: "Cable",  icon: infillIcon("cable") },
};

export const FINISHES = {
  black:     { name: "Matte Black",  base: "#26262a" },
  white:     { name: "Bright White", base: "#e9ebec" },
  bronze:    { name: "Bronze",       base: "#3b3026" },
  sandstone: { name: "Sandstone",    base: "#b1a07f" },
};

export const TOPRAILS = {
  flat:  { name: "Flat",    desc: "Square architectural profile" },
  round: { name: "Crowned", desc: "Premium rounded profile" },
};

export const POST_SIZES = {
  "2":   { name: '2"',   w: 0.050 },
  "2.5": { name: '2½"',  w: 0.064 },
  "3.5": { name: '3½"',  w: 0.089 },
};

/* Scene presets — colors drive the sky gradient, ground and lighting */
export const SCENES = {
  backyard: { label: "Backyard", skyTop: "#5fa8e0", skyBot: "#cfe7f5", ground: "#5d913f",
              hemiSky: "#bfe0ff", hemiGround: "#5d913f", sun: "#fff4e0", sunInt: 2.0, sunPos: [6, 9, 5] },
  lakeside: { label: "Lakeside", skyTop: "#ffd29a", skyBot: "#a9cbd6", ground: "#6f97ab",
              hemiSky: "#ffe0b8", hemiGround: "#6f97ab", sun: "#ffdca8", sunInt: 2.2, sunPos: [8, 5, 6] },
  patio:    { label: "Patio",    skyTop: "#1e2b3d", skyBot: "#3f5468", ground: "#3a3a40",
              hemiSky: "#33425a", hemiGround: "#2a2a2e", sun: "#ffd9a0", sunInt: 1.1, sunPos: [4, 7, 4] },
  twilight: { label: "Twilight", skyTop: "#3a2a55", skyBot: "#f0a868", ground: "#4a3a48",
              hemiSky: "#8a6a9a", hemiGround: "#4a3a48", sun: "#ffb56b", sunInt: 1.4, sunPos: [-5, 4, 5] },
};

/* ---------- State ---------- */
const state = {
  scene: "backyard", custom: null,
  product: "classic", infill: "picket", color: "black",
  topRail: "flat", postSize: "2.5", spacing: "post",
};

/* ---------- color helpers ---------- */
function hexToRgb(h){ h=h.replace("#",""); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)); }
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
function shade(hex,amt){ const [r,g,b]=hexToRgb(hex); const t=amt<0?0:255,p=Math.abs(amt); return rgbToHex(r+(t-r)*p,g+(t-g)*p,b+(t-b)*p); }

/* ============================================================
   Three.js setup
   ============================================================ */
const stage = typeof document !== "undefined" ? document.getElementById("stage") : null;
let renderer, scene, camera, controls;
let railingGroup, deckGroup, ground, hemi, sun;
let skyTexture = null, photoTexture = null;
const disposables = [];

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 500);
  camera.position.set(4.2, 1.9, 7.2);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, -1.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.5; // don't go under the deck
  controls.autoRotateSpeed = 1.1;

  // lights
  hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  scene.add(sun.target);

  buildDeckAndGround();
  applyScene();
  rebuildRailing();

  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);

  document.getElementById("loading").remove();
  animate();
}

function onResize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

/* ---------- sky gradient texture ---------- */
function makeSkyTexture(top, bot) {
  const c = document.createElement("canvas"); c.width = 8; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- procedural wood plank texture for the deck ---------- */
function makePlankTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#8a6a45"; ctx.fillRect(0, 0, 512, 512);
  const planks = 8, pw = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const shadeAmt = (Math.random() * 0.2 - 0.1);
    ctx.fillStyle = shade("#8a6a45", shadeAmt);
    ctx.fillRect(i * pw, 0, pw - 2, 512);
    // grain
    ctx.strokeStyle = "rgba(60,40,20,0.18)";
    for (let g = 0; g < 14; g++) {
      ctx.beginPath();
      const x = i * pw + Math.random() * pw;
      ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() * 8 - 4), 512);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/* ============================================================
   Deck + ground (built once)
   ============================================================ */
function buildDeckAndGround() {
  deckGroup = new THREE.Group();

  const plankTex = makePlankTexture(); disposables.push(plankTex);
  const deckMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.85, metalness: 0 });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: 0x6f5436, roughness: 0.9 });

  // deck slab: top at y=0, runs behind the railing (negative z)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 6.2, 1, 1, 1),
    [fasciaMat, fasciaMat, deckMat, fasciaMat, fasciaMat, fasciaMat]);
  deck.position.set(0, -0.125, -2.7);
  deck.receiveShadow = true;
  deckGroup.add(deck);

  // ground far below (elevated deck look)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5d913f, roughness: 1 });
  ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  ground.receiveShadow = true;
  deckGroup.add(ground);

  scene.add(deckGroup);
}

/* ============================================================
   Apply scene preset (sky, ground color, lighting, backdrop)
   ============================================================ */
function applyScene() {
  const p = SCENES[state.scene];
  if (state.custom && photoTexture) {
    scene.background = photoTexture;
  } else {
    if (skyTexture) skyTexture.dispose();
    skyTexture = makeSkyTexture(p.skyTop, p.skyBot);
    scene.background = skyTexture;
  }
  ground.material.color.set(p.ground);
  hemi.color.set(p.hemiSky);
  hemi.groundColor.set(p.hemiGround);
  sun.color.set(p.sun);
  sun.intensity = p.sunInt;
  sun.position.set(...p.sunPos);
  sun.target.position.set(0, 0, -1);
}

/* ============================================================
   Railing builder
   ============================================================ */
function rebuildRailing() {
  if (railingGroup) {
    scene.remove(railingGroup);
    railingGroup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  }
  railingGroup = buildRailing(state);
  scene.add(railingGroup);
  updateBadge();
  renderSummary();
  syncActive();
}

export function buildRailing(s) {
  const g = new THREE.Group();
  const finish = FINISHES[s.color];
  const weight = PRODUCTS[s.product].railWeight;

  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finish.base), metalness: 0.35, roughness: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xbcd6e0), metalness: 0, roughness: 0.06,
    transparent: true, opacity: 0.22, side: THREE.DoubleSide,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(shade(finish.base, 0.12)), metalness: 0.7, roughness: 0.35,
  });

  const len = 9;                 // total railing length along x
  const railH = 1.0;             // top of top rail
  const postW = POST_SIZES[s.postSize].w * (s.product === "commercial" ? 1.12 : 1);
  const z = 0;                   // railing sits at front edge of deck

  const addBox = (w, h, d, x, y, zz, mat, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, zz); m.castShadow = cast; m.receiveShadow = true;
    g.add(m); return m;
  };

  // posts
  const sections = s.spacing === "continuous" ? 2 : 3;
  const postXs = [];
  for (let i = 0; i <= sections; i++) postXs.push(-len / 2 + (len / sections) * i);
  for (const px of postXs) {
    addBox(postW, railH, postW, px, railH / 2, z, metal);
    // post cap
    addBox(postW * 1.25, 0.03, postW * 1.25, px, railH + 0.015, z, metal);
  }

  // top rail
  const topProfileH = 0.06 * weight;
  if (s.topRail === "round") {
    const r = 0.04 * weight;
    const geo = new THREE.CylinderGeometry(r, r, len, 20);
    const m = new THREE.Mesh(geo, metal);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, railH + r * 0.2, z);
    m.castShadow = true; g.add(m);
  } else {
    addBox(len, topProfileH, 0.07 * weight, 0, railH - topProfileH / 2 + 0.04, z, metal);
  }

  // bottom rail
  const botH = 0.05 * weight;
  addBox(len, botH, 0.06 * weight, 0, 0.09, z, metal);

  // infill per bay
  const inTop = railH - 0.06, inBot = 0.115;
  for (let s2 = 0; s2 < postXs.length - 1; s2++) {
    const x0 = postXs[s2] + postW / 2, x1 = postXs[s2 + 1] - postW / 2;
    buildInfill(g, s.infill, x0, x1, inBot, inTop, z, { metal, glassMat, cableMat, addBox });
  }

  return g;
}

function buildInfill(g, type, x0, x1, yBot, yTop, z, mats) {
  const bayW = x1 - x0, midX = (x0 + x1) / 2, h = yTop - yBot, midY = (yTop + yBot) / 2;

  if (type === "glass") {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.02, h, 0.012), mats.glassMat);
    m.position.set(midX, midY, z); g.add(m);
    // standoff spigots
    for (const t of [0.2, 0.8]) {
      mats.addBox(0.05, 0.06, 0.05, x0 + bayW * t, yBot + 0.03, z, mats.metal);
    }
    return;
  }
  if (type === "cable") {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y = yBot + (h) * (i / (n - 1));
      const geo = new THREE.CylinderGeometry(0.006, 0.006, bayW, 8);
      const m = new THREE.Mesh(geo, mats.cableMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(midX, y, z); m.castShadow = true; g.add(m);
    }
    return;
  }
  // picket
  const gap = 0.11, pw = 0.02;
  const count = Math.max(2, Math.round(bayW / gap));
  for (let i = 1; i < count; i++) {
    const x = x0 + (bayW * i) / count;
    mats.addBox(pw, h, pw, x, midY, z, mats.metal);
  }
}

/* ============================================================
   UI: badge / summary / configurator
   ============================================================ */
function updateBadge() {
  document.getElementById("stageBadge").textContent =
    `${PRODUCTS[state.product].name} · ${INFILLS[state.infill].name} · ${FINISHES[state.color].name}`;
}

function renderSummary() {
  const rows = [
    ["Railing line", PRODUCTS[state.product].name],
    ["Infill", INFILLS[state.infill].name],
    ["Finish", FINISHES[state.color].name],
    ["Top rail", TOPRAILS[state.topRail].name],
    ["Post size", POST_SIZES[state.postSize].name],
    ["Rail style", state.spacing === "continuous" ? "Continuous span" : "Post-to-post (6 ft)"],
  ];
  document.getElementById("summary").innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Your configuration</div>` +
    rows.map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join("");
}

function buildUI() {
  const strip = document.getElementById("sceneStrip");
  strip.innerHTML = Object.entries(SCENES).map(([k, s]) =>
    `<div class="scene-thumb" data-scene="${k}"
       style="background:linear-gradient(${s.skyTop} 0%, ${s.skyBot} 55%, ${s.ground} 55%, ${shade(s.ground, -0.15)} 100%)">
       <span>${s.label}</span></div>`).join("");

  document.getElementById("productOptions").innerHTML = Object.entries(PRODUCTS).map(([k, p]) =>
    `<button class="opt" data-key="product" data-val="${k}">
       <span class="opt-name">${p.name}</span><span class="opt-desc">${p.desc}</span></button>`).join("");

  document.getElementById("infillOptions").innerHTML = Object.entries(INFILLS).map(([k, v]) =>
    `<button class="opt" data-key="infill" data-val="${k}"><span class="opt-icon">${v.icon}</span>${v.name}</button>`).join("");

  document.getElementById("colorOptions").innerHTML = Object.entries(FINISHES).map(([k, v]) =>
    `<button class="swatch" data-key="color" data-val="${k}" data-label="${v.name}"
       style="background:linear-gradient(145deg, ${shade(v.base, 0.25)}, ${shade(v.base, -0.25)})"></button>`).join("");

  document.getElementById("topRailOptions").innerHTML = Object.entries(TOPRAILS).map(([k, v]) =>
    `<button class="opt" data-key="topRail" data-val="${k}">${v.name} — <span style="color:var(--muted);font-size:11px">${v.desc}</span></button>`).join("");

  document.getElementById("postOptions").innerHTML =
    `<div style="width:100%;font-size:11px;color:var(--muted);margin-bottom:6px">Post size</div>` +
    Object.entries(POST_SIZES).map(([k, v]) => `<button class="opt" data-key="postSize" data-val="${k}">${v.name}</button>`).join("") +
    `<div style="width:100%;font-size:11px;color:var(--muted);margin:12px 0 6px">Rail style</div>
     <button class="opt" data-key="spacing" data-val="post">Post-to-post</button>
     <button class="opt" data-key="spacing" data-val="continuous">Continuous</button>`;
}

function syncActive() {
  document.querySelectorAll("[data-key]").forEach(el =>
    el.classList.toggle("active", state[el.dataset.key] === el.dataset.val));
  document.querySelectorAll(".scene-thumb").forEach(el =>
    el.classList.toggle("active", !state.custom && state.scene === el.dataset.scene));
  document.getElementById("productHint").textContent = PRODUCTS[state.product].hint;
  document.getElementById("colorHint").textContent =
    `${FINISHES[state.color].name} — architectural-grade powder coat finish.`;
}

/* ============================================================
   Events
   ============================================================ */
function registerEvents() {
document.addEventListener("click", e => {
  const opt = e.target.closest("[data-key]");
  if (opt) {
    state[opt.dataset.key] = opt.dataset.val;
    if (opt.dataset.key === "product") state.topRail = PRODUCTS[opt.dataset.val].defaultTopRail;
    rebuildRailing();
    return;
  }
  const sc = e.target.closest(".scene-thumb");
  if (sc) { state.custom = null; state.scene = sc.dataset.scene; applyScene(); syncActive(); }
});

document.getElementById("uploadInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    new THREE.TextureLoader().load(ev.target.result, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (photoTexture) photoTexture.dispose();
      photoTexture = tex; state.custom = ev.target.result;
      applyScene(); syncActive();
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  Object.assign(state, { scene: "backyard", custom: null, product: "classic", infill: "picket",
    color: "black", topRail: "flat", postSize: "2.5", spacing: "post" });
  document.getElementById("uploadInput").value = "";
  camera.position.set(4.2, 1.9, 7.2); controls.target.set(0, 0.5, -1.2);
  applyScene(); rebuildRailing();
});

document.getElementById("autorotBtn").addEventListener("click", e => {
  controls.autoRotate = !controls.autoRotate;
  e.target.classList.toggle("active", controls.autoRotate);
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  renderer.render(scene, camera);
  const a = document.createElement("a");
  a.download = "kadenz-railing-3d.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
});
}

/* ---------- icons ---------- */
function infillIcon(type) {
  if (type === "glass") return `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="1" fill="#bcd6e0" stroke="#7a96a3"/></svg>`;
  if (type === "cable") return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.6"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></g></svg>`;
  return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.8"><line x1="5" y1="3" x2="5" y2="17"/><line x1="10" y1="3" x2="10" y2="17"/><line x1="15" y1="3" x2="15" y2="17"/></g></svg>`;
}

/* ---------- init ---------- */
if (typeof document !== "undefined" && stage) {
  buildUI();
  registerEvents();
  initThree();
}
