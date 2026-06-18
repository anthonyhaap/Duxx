/* ============================================================
   Kadenz 3D Deck Visualizer — replica
   Step 1: deck shape + height + levels (studio grid)
   Step 2: Kadenz railing around the perimeter
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const FT = 0.30;                 // world units per foot
const SLAB = 0.9 * FT;           // deck slab thickness
const RAILH = 3.5 * FT;          // 42" railing height
const UPPER_RISE = 7;            // ft between stacked levels

/* ---------- Catalog ---------- */
export const SHAPES = {
  square:  { label: "Square",   poly: [[-7,-6],[7,-6],[7,6],[-7,6]] },
  notched: { label: "Notched",  poly: [[-7,-6],[7,-6],[7,6],[1,6],[1,1],[-7,1]] },
  l:       { label: "L-Shaped", poly: [[-7,-6],[7,-6],[7,1],[0,1],[0,6],[-7,6]] },
  l2:      { label: "L-Shaped", poly: [[-7,-6],[7,-6],[7,6],[0,6],[0,1],[-7,1]] },
  t:       { label: "T-Shaped", poly: [[-3,-6],[3,-6],[3,0],[8,0],[8,5],[-8,5],[-8,0],[-3,0]] },
};

export const DECKING = {
  driftwood: { name: "Driftwood", base: "#8d857a" },
  cedar:     { name: "Cedar",     base: "#9c6b3f" },
  walnut:    { name: "Walnut",    base: "#5a4332" },
  mahogany:  { name: "Mahogany",  base: "#6e3b2c" },
  slate:     { name: "Slate",     base: "#5b6066" },
};

export const PRODUCTS = {
  classic:    { name: "Kadenz Classic",    desc: "Budget-friendly, sturdy, easy install.",
                hint: "Clean flat top rail with economical components — a great all-rounder.", railWeight: 1,    defaultTopRail: "flat" },
  elegance:   { name: "Kadenz Elegance",   desc: "Refined balance of strength & style.",
                hint: "Slimmer profile with an internally-mounted top rail for a sleek silhouette.", railWeight: 0.9, defaultTopRail: "round" },
  commercial: { name: "Kadenz Commercial", desc: "Lab-tested for multi-family use.",
                hint: "Heaviest-duty line with reinforced posts for code-driven projects.", railWeight: 1.2,  defaultTopRail: "flat" },
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
  flat:  { name: "Flat",    desc: "Square profile" },
  round: { name: "Crowned", desc: "Rounded profile" },
};

export const POST_SIZES = {
  "2":   { name: '2"',  w: 0.050 },
  "2.5": { name: '2½"', w: 0.064 },
  "3.5": { name: '3½"', w: 0.089 },
};

/* ---------- State + history ---------- */
function defaultState() {
  return {
    step: "shape",
    levels: [{ shape: "square" }],   // levels[0] = base
    heightIn: 39,                    // base deck height in inches (3'3")
    decking: "driftwood",
    product: "classic", infill: "picket", color: "black",
    topRail: "flat", postSize: "2.5", spacing: "post",
  };
}
let state = defaultState();
const undoStack = [], redoStack = [];

function snapshot() { return JSON.stringify(state); }
function commit(mutator) {
  undoStack.push(snapshot()); redoStack.length = 0;
  mutator();
  rebuildScene(); renderUI();
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); state = JSON.parse(undoStack.pop()); rebuildScene(); renderUI(); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); state = JSON.parse(redoStack.pop()); rebuildScene(); renderUI(); }

/* ---------- color helpers ---------- */
function hexToRgb(h){ h=h.replace("#",""); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)); }
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
function shade(hex,amt){ const [r,g,b]=hexToRgb(hex); const t=amt<0?0:255,p=Math.abs(amt); return rgbToHex(r+(t-r)*p,g+(t-g)*p,b+(t-b)*p); }
function ftIn(inches){ const f=Math.floor(inches/12), i=Math.round(inches%12); return `${f}'${i}"`; }

/* ============================================================
   Three.js scene
   ============================================================ */
const stage = typeof document !== "undefined" ? document.getElementById("stage") : null;
let renderer, scene, camera, controls, sun, worldGroup, photoTexture = null, skyTexture = null;

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  skyTexture = makeSkyTexture("#d9e7f3", "#aebecd");
  scene.background = skyTexture;
  scene.fog = new THREE.Fog(0xb1c1d0, 14, 52);

  camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 800);
  camera.position.set(6.5, 5.2, 11);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 5; controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 1.0;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa6b2, 1.15));
  sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(9, 15, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left=-14; sc.right=14; sc.top=14; sc.bottom=-14; sc.near=0.5; sc.far=60;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  buildGrid();
  rebuildScene();

  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  const l = document.getElementById("loading"); if (l) l.remove();
  animate();
}

function onResize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
}
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }

/* ---------- textures ---------- */
function makeSkyTexture(top, bot) {
  const c = document.createElement("canvas"); c.width = 8; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeGridTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#33414f"; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#536579"; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 120); return t;
}
function makePlankTexture(baseHex) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = baseHex; ctx.fillRect(0, 0, 256, 256);
  const planks = 6, pw = 256 / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = shade(baseHex, (Math.random() * 0.12 - 0.06));
    ctx.fillRect(i * pw, 0, pw, 256);
    ctx.strokeStyle = shade(baseHex, -0.35); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(i * pw, 0); ctx.lineTo(i * pw, 256); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    for (let g = 0; g < 8; g++) { ctx.beginPath(); const x = i*pw+Math.random()*pw; ctx.moveTo(x,0); ctx.lineTo(x,256); ctx.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9); return t;
}

function buildGrid() {
  const tex = makeGridTexture();
  const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  g.rotation.x = -Math.PI / 2; g.position.y = 0; g.receiveShadow = true;
  scene.add(g);
}

/* ============================================================
   Build deck + railing from state
   ============================================================ */
function disposeGroup(grp) {
  grp.traverse(o => { if (o.isMesh) { o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
}

function levelInfo() {
  // returns array of { poly(world ft), topY, scale }
  const arr = [];
  const baseTop = (state.heightIn / 12) * FT;
  arr.push({ shape: state.levels[0].shape, scale: 1, topY: baseTop });
  if (state.levels[1]) arr.push({ shape: state.levels[1].shape, scale: 0.55, topY: baseTop + UPPER_RISE * FT });
  return arr;
}

function rebuildScene() {
  if (worldGroup) { scene.remove(worldGroup); disposeGroup(worldGroup); }
  worldGroup = new THREE.Group();

  const plankTex = makePlankTexture(DECKING[state.decking].base);
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: shade(DECKING[state.decking].base, -0.25), roughness: 0.85, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 0.9 });

  let topY = 0.5;
  levelInfo().forEach((lv, idx) => {
    const poly = SHAPES[lv.shape].poly.map(([x, z]) => [x * lv.scale, z * lv.scale]);
    const supportBaseY = idx === 0 ? 0 : levelInfo()[0].topY; // upper level rests on base
    buildDeckLevel(worldGroup, poly, lv.topY, plankMat, fasciaMat, woodMat, supportBaseY);
    if (state.step === "railing") buildPerimeterRailing(worldGroup, poly, lv.topY, state);
    topY = lv.topY;
  });

  scene.add(worldGroup);

  // frame camera target on the deck
  if (controls) controls.target.set(0, topY * 0.6 + 0.2, 0);
  updateBadge();
}

function buildDeckLevel(parent, poly, topY, plankMat, fasciaMat, woodMat, supportBaseY) {
  // slab via extruded polygon
  const shape = new THREE.Shape();
  poly.forEach(([x, z], i) => { const X = x * FT, Z = z * FT; i ? shape.lineTo(X, Z) : shape.moveTo(X, Z); });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, topY - geo.boundingBox.max.y, 0);   // align slab top to topY
  const slab = new THREE.Mesh(geo, [plankMat, fasciaMat]);
  slab.castShadow = true; slab.receiveShadow = true;
  parent.add(slab);

  // support posts at vertices + long-edge midpoints
  const postT = 0.33 * FT, deckBottom = topY - SLAB;
  const addSupport = (x, z) => {
    const h = deckBottom - supportBaseY; if (h <= 0.01) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(postT, h, postT), woodMat);
    m.position.set(x * FT, supportBaseY + h / 2, z * FT); m.castShadow = true; parent.add(m);
  };
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    addSupport(ax, az);
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.floor(len / 7);
    for (let k = 1; k <= n; k++) addSupport(ax + (bx - ax) * k / (n + 1), az + (bz - az) * k / (n + 1));
  }
}

/* ============================================================
   Perimeter railing
   ============================================================ */
export function buildPerimeterRailing(parent, poly, topY, s) {
  const finish = FINISHES[s.color], weight = PRODUCTS[s.product].railWeight;
  const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(finish.base), metalness: 0.35, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbcd6e0, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  const cableMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(finish.base, 0.12)), metalness: 0.7, roughness: 0.35 });
  const postW = POST_SIZES[s.postSize].w * (s.product === "commercial" ? 1.12 : 1);
  const mats = { metal, glassMat, cableMat };

  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    buildRailingEdge(parent, ax * FT, az * FT, bx * FT, bz * FT, topY, s, mats, postW, weight);
  }
}

function buildRailingEdge(parent, ax, az, bx, bz, topY, s, mats, postW, weight) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), A = Math.atan2(dz, dx);
  const seg = new THREE.Group();
  seg.position.set(ax, topY, az);
  seg.rotation.y = -A;                       // local +x runs along the edge

  const addBox = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; seg.add(m); return m;
  };

  // posts: corner post at x=0 + intermediate posts (next edge draws the far corner)
  const bays = Math.max(1, Math.round(L / (6 * FT)));
  const postXs = [];
  for (let i = 0; i <= bays; i++) postXs.push((L / bays) * i);
  for (let i = 0; i < postXs.length; i++) {
    if (i === postXs.length - 1) break;      // skip far corner (shared with next edge)
    addBox(postW, RAILH, postW, postXs[i], RAILH / 2, 0, mats.metal);
    addBox(postW * 1.25, 0.03, postW * 1.25, postXs[i], RAILH + 0.015, 0, mats.metal);
  }

  // top + bottom rail span full length
  const topProfileH = 0.06 * weight;
  if (s.topRail === "round") {
    const r = 0.04 * weight;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 18), mats.metal);
    m.rotation.z = Math.PI / 2; m.position.set(L / 2, RAILH, 0); m.castShadow = true; seg.add(m);
  } else {
    addBox(L, topProfileH, 0.07 * weight, L / 2, RAILH - topProfileH / 2 + 0.04, 0, mats.metal);
  }
  addBox(L, 0.05 * weight, 0.06 * weight, L / 2, 0.09, 0, mats.metal);

  // infill per bay
  const yBot = 0.115, yTop = RAILH - 0.06;
  for (let b = 0; b < postXs.length - 1; b++) {
    buildInfill(seg, s.infill, postXs[b] + postW / 2, postXs[b + 1] - postW / 2, yBot, yTop, mats, addBox);
  }
  parent.add(seg);
}

function buildInfill(seg, type, x0, x1, yBot, yTop, mats, addBox) {
  const bayW = x1 - x0, midX = (x0 + x1) / 2, h = yTop - yBot, midY = (yTop + yBot) / 2;
  if (bayW <= 0.02) return;
  if (type === "glass") {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.02, h, 0.012), mats.glassMat);
    m.position.set(midX, midY, 0); seg.add(m);
    for (const t of [0.2, 0.8]) addBox(0.05, 0.06, 0.05, x0 + bayW * t, yBot + 0.03, 0, mats.metal);
    return;
  }
  if (type === "cable") {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y = yBot + h * (i / (n - 1));
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, bayW, 8), mats.cableMat);
      m.rotation.z = Math.PI / 2; m.position.set(midX, y, 0); m.castShadow = true; seg.add(m);
    }
    return;
  }
  const gap = 0.11, pw = 0.02, count = Math.max(2, Math.round(bayW / gap));
  for (let i = 1; i < count; i++) addBox(pw, h, pw, x0 + (bayW * i) / count, midY, 0, mats.metal);
}

/* ============================================================
   UI
   ============================================================ */
function updateBadge() {
  const el = document.getElementById("stageBadge"); if (!el) return;
  const shapeLbl = SHAPES[state.levels[0].shape].label;
  el.textContent = state.step === "railing"
    ? `${PRODUCTS[state.product].name} · ${INFILLS[state.infill].name} · ${FINISHES[state.color].name}`
    : `${shapeLbl} deck · ${ftIn(state.heightIn)}${state.levels[1] ? " · 2 levels" : ""}`;
}

function shapeThumb(poly, id) {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
  const w = maxx - minx, h = maxz - minz, vw = 86, vh = 64, pad = 7;
  const s = Math.min((vw - 2 * pad) / w, (vh - 2 * pad) / h);
  const ox = (vw - w * s) / 2, oy = (vh - h * s) / 2;
  const pts = poly.map(([x, z]) => `${((x - minx) * s + ox).toFixed(1)},${((z - minz) * s + oy).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${vw} ${vh}"><defs>
      <pattern id="g${id}" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="#2f7fd6"/><path d="M7 0H0V7" stroke="#62a3e8" stroke-width="1" fill="none"/></pattern>
      </defs>
      <polygon points="${pts}" fill="url(#g${id})" stroke="#1d5da3" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

function buildStaticUI() {
  document.getElementById("shapeGrid").innerHTML = Object.entries(SHAPES).map(([k, s]) =>
    `<button class="shape-thumb" data-key="shape" data-val="${k}">${shapeThumb(s.poly, k)}<span>${s.label}</span></button>`).join("");

  document.getElementById("deckingOptions").innerHTML = Object.entries(DECKING).map(([k, v]) =>
    `<button class="swatch" data-key="decking" data-val="${k}" data-label="${v.name}"
       style="background:linear-gradient(145deg, ${shade(v.base, 0.18)}, ${shade(v.base, -0.18)})"></button>`).join("");

  document.getElementById("productOptions").innerHTML = Object.entries(PRODUCTS).map(([k, p]) =>
    `<button class="opt" data-key="product" data-val="${k}"><span class="opt-name">${p.name}</span><span class="opt-desc">${p.desc}</span></button>`).join("");
  document.getElementById("infillOptions").innerHTML = Object.entries(INFILLS).map(([k, v]) =>
    `<button class="opt" data-key="infill" data-val="${k}"><span class="opt-icon">${v.icon}</span>${v.name}</button>`).join("");
  document.getElementById("colorOptions").innerHTML = Object.entries(FINISHES).map(([k, v]) =>
    `<button class="swatch" data-key="color" data-val="${k}" data-label="${v.name}"
       style="background:linear-gradient(145deg, ${shade(v.base, 0.25)}, ${shade(v.base, -0.25)})"></button>`).join("");
  document.getElementById("topRailOptions").innerHTML = Object.entries(TOPRAILS).map(([k, v]) =>
    `<button class="opt" data-key="topRail" data-val="${k}">${v.name} — <span style="color:var(--muted);font-size:11px">${v.desc}</span></button>`).join("");
  document.getElementById("postOptions").innerHTML =
    `<div class="opt-row-label">Post size</div>` +
    Object.entries(POST_SIZES).map(([k, v]) => `<button class="opt" data-key="postSize" data-val="${k}">${v.name}</button>`).join("") +
    `<div class="opt-row-label">Rail style</div>
     <button class="opt" data-key="spacing" data-val="post">Post-to-post</button>
     <button class="opt" data-key="spacing" data-val="continuous">Continuous</button>`;
}

function renderUI() {
  // step panes
  document.getElementById("stepShape").hidden = state.step !== "shape";
  document.getElementById("stepRailing").hidden = state.step !== "railing";
  document.querySelectorAll(".step").forEach(b => b.classList.toggle("active", b.dataset.step === state.step));

  // active option highlighting
  document.querySelectorAll("[data-key]").forEach(el => el.classList.toggle("active", state[el.dataset.key] === el.dataset.val));
  document.querySelectorAll('[data-key="shape"]').forEach(el => el.classList.toggle("active", state.levels[0].shape === el.dataset.val));

  // hints
  const ph = document.getElementById("productHint"); if (ph) ph.textContent = PRODUCTS[state.product].hint;
  const ch = document.getElementById("colorHint"); if (ch) ch.textContent = `${FINISHES[state.color].name} — architectural-grade powder coat.`;

  // height slider
  const hv = document.getElementById("heightVal"); if (hv) hv.textContent = ftIn(state.heightIn);
  const hs = document.getElementById("heightSlider"); if (hs && +hs.value !== state.heightIn) hs.value = state.heightIn;

  // levels buttons
  document.getElementById("addLevelBtn").hidden = !!state.levels[1];
  document.getElementById("removeLevelBtn").hidden = !state.levels[1];

  // CTA + back
  const next = document.getElementById("nextBtn"), back = document.getElementById("backBtn");
  if (state.step === "shape") { next.textContent = "Next step: Railing ▶"; back.hidden = true; }
  else { next.textContent = "Request a Quote ▶"; back.hidden = false; }

  // undo/redo enabled state
  document.getElementById("undoBtn").disabled = !undoStack.length;
  document.getElementById("redoBtn").disabled = !redoStack.length;

  renderSummary();
  updateBadge();
}

function renderSummary() {
  const rows = [
    ["Shape", SHAPES[state.levels[0].shape].label],
    ["Height", ftIn(state.heightIn)],
    ["Levels", state.levels.length],
    ["Decking", DECKING[state.decking].name],
  ];
  if (state.step === "railing") rows.push(
    ["Railing", PRODUCTS[state.product].name],
    ["Infill", INFILLS[state.infill].name],
    ["Finish", FINISHES[state.color].name],
    ["Top rail", TOPRAILS[state.topRail].name],
  );
  document.getElementById("summary").innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Your deck</div>` +
    rows.map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join("");
}

/* ============================================================
   Events
   ============================================================ */
function registerEvents() {
  document.addEventListener("click", e => {
    const opt = e.target.closest("[data-key]");
    if (opt) {
      const key = opt.dataset.key, val = opt.dataset.val;
      commit(() => {
        if (key === "shape") state.levels[0].shape = val;
        else if (key === "product") { state.product = val; state.topRail = PRODUCTS[val].defaultTopRail; }
        else state[key] = val;
      });
      return;
    }
    const stp = e.target.closest(".step");
    if (stp) { commit(() => state.step = stp.dataset.step); return; }
  });

  document.getElementById("nextBtn").addEventListener("click", e => {
    e.preventDefault();
    if (state.step === "shape") commit(() => state.step = "railing");
    else window.alert("Quote request — your configuration is saved in the summary.");
  });
  document.getElementById("backBtn").addEventListener("click", () => commit(() => state.step = "shape"));

  document.getElementById("addLevelBtn").addEventListener("click", () =>
    commit(() => state.levels.push({ shape: state.levels[0].shape })));
  document.getElementById("removeLevelBtn").addEventListener("click", () =>
    commit(() => state.levels.length = 1));

  const hs = document.getElementById("heightSlider");
  let dragStart = null;
  hs.addEventListener("input", () => {            // live preview while dragging
    if (dragStart === null) dragStart = snapshot();   // capture pre-drag state for undo
    state.heightIn = +hs.value; rebuildScene();
    document.getElementById("heightVal").textContent = ftIn(state.heightIn); updateBadge();
  });
  hs.addEventListener("change", () => {           // commit one history entry per drag
    if (dragStart !== null) { undoStack.push(dragStart); redoStack.length = 0; dragStart = null; }
    renderUI();
  });

  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("redoBtn").addEventListener("click", redo);

  document.getElementById("resetBtn").addEventListener("click", () => {
    camera.position.set(6.5, 5.2, 11); controls.target.set(0, 0.5, 0);
  });
  document.getElementById("autorotBtn").addEventListener("click", e => {
    controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle("active", controls.autoRotate);
  });
  document.getElementById("downloadBtn").addEventListener("click", () => {
    renderer.render(scene, camera);
    const a = document.createElement("a"); a.download = "kadenz-deck.png";
    a.href = renderer.domElement.toDataURL("image/png"); a.click();
  });
  document.getElementById("uploadInput").addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => new THREE.TextureLoader().load(ev.target.result, tex => {
      tex.colorSpace = THREE.SRGBColorSpace; if (photoTexture) photoTexture.dispose();
      photoTexture = tex; scene.background = tex; scene.fog = null;
    });
    reader.readAsDataURL(file);
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
  buildStaticUI();
  registerEvents();
  initThree();
  renderUI();
}
