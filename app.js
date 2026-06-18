/* ============================================================
   Twan & Dak's Railz 3D Deck Visualizer — replica
   Step 1: deck shape / size / height / levels / stairs (studio grid)
   Step 2: Twan & Dak's Railz railing around the perimeter (+ per-edge toggle, gate)
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const FT = 0.30;                 // world units per foot
const SLAB = 0.9 * FT;           // deck slab thickness
const RAILH = 3.5 * FT;          // 42" railing height
const UPPER_RISE = 7;            // ft between stacked levels
const STAIR_W = 4 * FT;          // stair / opening width
const GATE_W = 3.6 * FT;
const RISER = (7 / 12) * FT;
const TREAD = (11 / 12) * FT;

/* ---------- Catalog ---------- */
export const SHAPES = {
  square:  { label: "Square",   poly: [[-7,-6],[7,-6],[7,6],[-7,6]] },
  notched: { label: "Notched",  poly: [[-7,-6],[7,-6],[7,6],[1,6],[1,1],[-7,1]] },
  l:       { label: "L-Shaped", poly: [[-7,-6],[7,-6],[7,1],[0,1],[0,6],[-7,6]] },
  l2:      { label: "L-Shaped", poly: [[-7,-6],[7,-6],[7,6],[0,6],[0,1],[-7,1]] },
  t:       { label: "T-Shaped", poly: [[-3,-6],[3,-6],[3,0],[8,0],[8,5],[-8,5],[-8,0],[-3,0]] },
};

/* DUXXBAK® Composite Decking by AmeriLux International — real colors grouped by finish */
export const DECKING = {
  // Armor Cap
  boardwalkGrey: { name: "Boardwalk Grey", base: "#8f8d86", finish: "armorcap" },
  warmCedar:     { name: "Warm Cedar",     base: "#9c6b3f", finish: "armorcap" },
  sedonaRed:     { name: "Sedona Red",     base: "#7d3a2b", finish: "armorcap" },
  darkMahogany:  { name: "Dark Mahogany",  base: "#4a2c22", finish: "armorcap" },
  blackWalnut:   { name: "Black Walnut",   base: "#37291f", finish: "armorcap" },
  // Traction
  coolSand:      { name: "Cool Sand",      base: "#c9b896", finish: "traction" },
  driftwood:     { name: "Driftwood",      base: "#9a9286", finish: "traction" },
  cedar:         { name: "Cedar",          base: "#9c6b3f", finish: "traction" },
  mahogany:      { name: "Mahogany",       base: "#6e3b2c", finish: "traction" },
  walnut:        { name: "Walnut",         base: "#5a4332", finish: "traction" },
  copperCanyon:  { name: "Copper Canyon",  base: "#9a5a33", finish: "traction" },
  rusticRed:     { name: "Rustic Red",     base: "#7e3a2c", finish: "traction" },
  // Traction Wood Grain
  riverStone:    { name: "River Stone",    base: "#8a8580", finish: "tractionWG" },
  treeBark:      { name: "Tree Bark",      base: "#5b4a3a", finish: "tractionWG" },
  tannedLeather: { name: "Tanned Leather", base: "#8a5a38", finish: "tractionWG" },
};

/* DUXXBAK® board profiles — names, descriptions and real face widths/thicknesses (inches) */
export const DECK_PROFILES = {
  duxxbak:   { name: "DuxxBak® Dekk",          desc: 'Water-shedding interlock · 5.75" × 1.25"', w: 5.75, t: 1.25 },
  optima:    { name: "Optima® Dekk",           desc: 'Premium solid-core, square edge · 5.4" × 1"', w: 5.4,  t: 1.0 },
  optimaG:   { name: "Optima® Dekk Grooved",   desc: 'Solid-core grooved · 5.4" × 1.065"', w: 5.4,  t: 1.065 },
  optimaLT:  { name: "Optima® Dekk LT",        desc: 'Lightweight square edge · 5.28" × 0.955"', w: 5.28, t: 0.955 },
  optimaLTG: { name: "Optima® Dekk LT Grooved",desc: 'Lightweight grooved · 5.28" × 0.955"', w: 5.28, t: 0.955 },
  iDekkS4S:  { name: "I.Dekk® S4S",            desc: 'I-beam square edge · 5.75" × 1.25"', w: 5.75, t: 1.25 },
  iDekkTG:   { name: "I.Dekk® T&G",            desc: 'Tongue & groove · 5.75" × 1.25"', w: 5.75, t: 1.25 },
  iDekkHD:   { name: "I.Dekk® HD S4S",         desc: 'Heavy-duty square edge · 5.5" × 1.25"', w: 5.5,  t: 1.25 },
  iDekkHDTG: { name: "I.Dekk® HD T&G",         desc: 'Heavy-duty tongue & groove · 5.75" × 1.25"', w: 5.75, t: 1.25 },
  commercial:{ name: "Commercial Dekk™",       desc: 'Commercial square edge · 8" × 1.5"', w: 8.0,  t: 1.5 },
};

export const DECK_FINISHES = {
  armorcap:   { name: "Armor Cap",           desc: "Wood-grain embossed cap", rough: 0.8 },
  traction:   { name: "Traction",            desc: "Natural brush, extra grip", rough: 0.95 },
  tractionWG: { name: "Traction Wood Grain", desc: "Brushed wood-grain", rough: 0.88 },
};

/* DUXXBAK® 2026 dealer list — $/linear ft (estimate use only), job-lot tier */
export const PRICE_LF = {
  duxxbak:   { armorcap: 6.68, traction: 6.26, tractionWG: 7.66 },
  optima:    { armorcap: 5.62, traction: 5.42, tractionWG: 5.62 },
  optimaG:   { armorcap: 5.62, traction: 5.42, tractionWG: 5.62 },
  optimaLT:  { armorcap: 4.51, traction: 4.13, tractionWG: 4.51 },
  optimaLTG: { armorcap: 4.51, traction: 4.13, tractionWG: 4.51 },
  iDekkS4S:  { armorcap: 6.87, traction: 6.26, tractionWG: 6.87 },
  iDekkTG:   { armorcap: 6.87, traction: 6.26, tractionWG: 6.87 },
  iDekkHD:   { armorcap: 6.93, traction: 6.93, tractionWG: 8.91 },
  iDekkHDTG: { armorcap: 6.93, traction: 6.93, tractionWG: 8.91 },
  commercial:{ armorcap: 6.87, traction: 6.26, tractionWG: 6.87 },
};
export const FASCIA_LF = { traction: 8.44, tractionWG: 9.56 };   // 1'×12' board ÷ 12
const CLIP_BAG = 42.31, SCREW_BAG = 27.52;

export const BOARD_LENGTHS = { "12": { name: "12 ft" }, "16": { name: "16 ft" }, "20": { name: "20 ft" } };

export const PRODUCTS = {
  classic:    { name: "Twan & Dak's Railz Classic",    desc: "Budget-friendly, sturdy, easy install.",
                hint: "Clean flat top rail with economical components — a great all-rounder.", railWeight: 1,    defaultTopRail: "flat" },
  elegance:   { name: "Twan & Dak's Railz Elegance",   desc: "Refined balance of strength & style.",
                hint: "Slimmer profile with an internally-mounted top rail for a sleek silhouette.", railWeight: 0.9, defaultTopRail: "round" },
  commercial: { name: "Twan & Dak's Railz Commercial", desc: "Lab-tested for multi-family use.",
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

export const POST_STYLES = {
  postToPost: { name: "Post-to-Post" },
  overPost:   { name: "Over-the-Post" },
};

export const CAPS = {
  standard: { name: "Standard" },
  pyramid:  { name: "Ornamental" },
  ball:     { name: "Ball" },
  halo:     { name: "Halo (LV)" },
  solar:    { name: "Solar" },
};

export const DECK_DIRS = {
  horizontal: { name: "Horizontal", rot: 0 },
  vertical:   { name: "Vertical",   rot: Math.PI / 2 },
  diagonal:   { name: "Diagonal",   rot: Math.PI / 4 },
};

export const STAIR_COLORS = {
  gray:      { name: "Gray",       base: "#9a958d" },
  beige:     { name: "Beige",      base: "#c9b89a" },
  darkbrown: { name: "Dark Brown", base: "#5a4332" },
  tan:       { name: "Tan",        base: "#b9854f" },
  darkgray:  { name: "Dark Gray",  base: "#565a5f" },
  darkbeige: { name: "Dark Beige", base: "#9a8b6f" },
  brown:     { name: "Brown",      base: "#8a5a2f" },
  espresso:  { name: "Espresso",   base: "#3e2c20" },
};

export const CLADDING = {
  red:     { name: "Red",     base: "#9e3b2e" },
  blue:    { name: "Blue",    base: "#5b7a93" },
  green:   { name: "Green",   base: "#5d6e4a" },
  white:   { name: "White",   base: "#e6e7e2" },
  brown:   { name: "Brown",   base: "#6e5a44" },
  yellow:  { name: "Yellow",  base: "#e9dca6" },
  gray:    { name: "Gray",    base: "#8c9296" },
  belmont: { name: "Belmont", base: "#9a5a48", brick: true },
};

export const FURNITURE = {
  table:    { name: "Table & Chairs" },
  lounge:   { name: "Lounge Chair" },
  planter:  { name: "Planter" },
  grill:    { name: "Grill" },
  umbrella: { name: "Umbrella" },
};

export const STEPS = [["shape","Shape"],["decking","Decking"],["railing","Railing"],["stairs","Stairs"],["walls","Walls"],["furniture","Furniture"]];
const STEP_INDEX = Object.fromEntries(STEPS.map(([k],i)=>[k,i]));

/* ---------- State + history ---------- */
function defaultState() {
  return {
    step: "shape",
    levels: [{ shape: "square" }],
    size: { w: 14, d: 12 },          // overall footprint (ft)
    heightIn: 39,                    // base deck height (in)
    decking: "warmCedar", fascia: "blackWalnut", deckDir: "horizontal",
    deckProfile: "duxxbak", deckFinish: "armorcap", boardLength: "16",
    disabledEdges: [],               // base-level edges with railing removed
    stairsEdge: null,                // base-level edge index with stairs
    stairBoard: "gray", stairRiser: "darkbrown", stairPlatform: false,
    gate: false,
    product: "classic", infill: "picket", color: "black",
    topRail: "flat", postSize: "2.5", spacing: "post",
    postStyle: "postToPost", cap: "standard",
    wallOn: false, wallMode: "attached", wallEdge: null, cladding: "white", doors: 1, windows: 2,
    furniture: { table: false, lounge: false, planter: false, grill: false, umbrella: false },
    furnPos: {},        // key -> [xFt, zFt]
    furnRot: {},        // key -> radians
    night: false, bloom: 0.6, bloomRadius: 0.6, bloomThreshold: 0.72,
  };
}
export let state = defaultState();
const undoStack = [], redoStack = [];

function snapshot() { return JSON.stringify(state); }
function commit(mutator) { undoStack.push(snapshot()); redoStack.length = 0; mutator(); rebuildScene(); renderUI(); }
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); state = JSON.parse(undoStack.pop()); rebuildScene(); renderUI(); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); state = JSON.parse(redoStack.pop()); rebuildScene(); renderUI(); }

/* ---------- helpers ---------- */
function hexToRgb(h){ h=h.replace("#",""); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)); }
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
function shade(hex,amt){ const [r,g,b]=hexToRgb(hex); const t=amt<0?0:255,p=Math.abs(amt); return rgbToHex(r+(t-r)*p,g+(t-g)*p,b+(t-b)*p); }
function ftIn(inches){ const f=Math.floor(inches/12), i=Math.round(inches%12); return `${f}'${i}"`; }

/* footprint polygon (ft) scaled to overall size */
function footprintFeet(shapeKey, size) {
  const poly = SHAPES[shapeKey].poly;
  const xs = poly.map(p=>p[0]), zs = poly.map(p=>p[1]);
  const minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);
  const cx=(minx+maxx)/2, cz=(minz+maxz)/2, sx=size.w/(maxx-minx), sz=size.d/(maxz-minz);
  return poly.map(([x,z])=>[cx+(x-cx)*sx, cz+(z-cz)*sz]);
}
function basePoly(){ return footprintFeet(state.levels[0].shape, state.size); }
function centroid(poly){ let x=0,z=0; poly.forEach(p=>{x+=p[0];z+=p[1];}); return [x/poly.length, z/poly.length]; }

function frontEdge() {
  const poly = basePoly(); let best=0, bz=-Infinity;
  for (let i=0;i<poly.length;i++){ const mz=(poly[i][1]+poly[(i+1)%poly.length][1])/2; if (mz>bz){bz=mz;best=i;} }
  return best;
}
function gateEdge(){ return state.stairsEdge!=null ? state.stairsEdge : frontEdge(); }
function backEdge(poly){ let bi=0,bz=Infinity; for(let i=0;i<poly.length;i++){const mz=(poly[i][1]+poly[(i+1)%poly.length][1])/2; if(mz<bz){bz=mz;bi=i;}} return bi; }
function openingForEdge(i) {
  const hasStairs = state.stairsEdge===i;
  const hasGate = state.gate && gateEdge()===i;
  if (!hasStairs && !hasGate) return null;
  return { width: hasStairs ? STAIR_W : GATE_W, gate: hasGate };
}

/* ============================================================
   Three.js scene
   ============================================================ */
const stage = typeof document !== "undefined" ? document.getElementById("stage") : null;
let renderer, scene, camera, controls, sun, worldGroup, photoTexture = null, skyTexture = null;
let composer = null, bloomPass = null;
const raycaster = typeof THREE !== "undefined" ? new THREE.Raycaster() : null;
const pointer = { x: 0, y: 0 };
let edgeSelectors = [], hoveredSel = null;
let resizeHandles = [], dragging = null, hoverHandle = null;
let dimEdges = [], dimLabels = [];
let hemi, furnitureGroups = [], draggingFurn = null, capLightPos = [], pendingRefit = true;

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  skyTexture = makeSkyTexture("#d9e7f3", "#aebecd"); scene.background = skyTexture;
  scene.fog = new THREE.Fog(0xb1c1d0, 14, 52);

  camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 800);
  camera.position.set(6.5, 5.2, 11);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 5; controls.maxDistance = 32; controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 1.0;

  hemi = new THREE.HemisphereLight(0xffffff, 0x9aa6b2, 1.15); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(9, 15, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left=-16; sc.right=16; sc.top=16; sc.bottom=-16; sc.near=0.5; sc.far=70;
  sun.shadow.bias = -0.0004; scene.add(sun, sun.target);

  buildGrid();
  createDimPool();
  rebuildScene();
  bindCanvasPointer();

  // bloom composer (night only, so daytime colours are untouched).
  // Needs WebGL2 half-float targets; falls back to plain render otherwise.
  try {
    if (renderer.capabilities.isWebGL2) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      // params from state (live Night controls)
      bloomPass = new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), state.bloom, state.bloomRadius, state.bloomThreshold);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }
  } catch (e) { composer = null; }

  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  const l = document.getElementById("loading"); if (l) l.remove();
  animate();
}

function onResize() { const w=stage.clientWidth,h=stage.clientHeight; if(!w||!h)return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); if(composer) composer.setSize(w,h); }
function renderFrame() { if (state.night && composer) composer.render(); else renderer.render(scene, camera); }

/* fit the camera so the whole deck sits comfortably in the frame */
function fitCameraToDeck(poly, topY) {
  const xs=poly.map(p=>p[0]*FT), zs=poly.map(p=>p[1]*FT);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cz=(Math.min(...zs)+Math.max(...zs))/2;
  const w=Math.max(...xs)-Math.min(...xs), d=Math.max(...zs)-Math.min(...zs);
  const center=new THREE.Vector3(cx, topY*0.5+0.3, cz);
  const radius=0.5*Math.hypot(w,d)+RAILH+0.4;
  const dir=new THREE.Vector3().subVectors(camera.position, controls.target);
  if (dir.lengthSq()<1e-4) dir.set(0.6,0.5,1);
  dir.normalize();
  const dist=(radius*1.35)/Math.sin((camera.fov*Math.PI/180)/2);
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near=Math.max(0.1, dist/200); camera.far=dist*12; camera.updateProjectionMatrix();
  controls.update();
}

/* day / night lighting + background */
function applyEnvironment() {
  if (!hemi) return;
  if (state.night) {
    hemi.intensity=0.18; hemi.color.set(0x2a3550); hemi.groundColor.set(0x10131c);
    sun.intensity=0.25; sun.color.set(0x8aa0c8);
    if (!photoTexture){ scene.background=new THREE.Color(0x0e131d); scene.fog=new THREE.Fog(0x0e131d,16,52); }
  } else {
    hemi.intensity=1.15; hemi.color.set(0xffffff); hemi.groundColor.set(0x9aa6b2);
    sun.intensity=1.7; sun.color.set(0xffffff);
    if (!photoTexture){ scene.background=skyTexture; scene.fog=new THREE.Fog(0xb1c1d0,14,52); }
  }
}
function animate() { requestAnimationFrame(animate); controls.update(); updateDimLabels(); renderFrame(); }

/* ---------- on-canvas dimension labels ---------- */
function createDimPool() {
  const layer=document.getElementById("dimLayer"); if(!layer)return;
  for (let i=0;i<10;i++){ const d=document.createElement("div"); d.className="dim-label"; d.style.display="none"; layer.appendChild(d); dimLabels.push(d); }
}
function computeDimEdges() {
  dimEdges=[];
  if (state.step!=="shape") return;
  const poly=levelInfo()[0].poly, topY=levelInfo()[0].topY;
  for (let i=0;i<poly.length;i++){
    const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length];
    const lenFt=Math.hypot(bx-ax,bz-az);
    dimEdges.push({ pos:new THREE.Vector3((ax+bx)/2*FT, topY+0.07, (az+bz)/2*FT), text:ftIn(Math.round(lenFt*12)) });
  }
}
function updateDimLabels() {
  if (!dimLabels.length) return;
  const w=stage.clientWidth, h=stage.clientHeight, v=new THREE.Vector3();
  for (let i=0;i<dimLabels.length;i++){
    const lbl=dimLabels[i], e=dimEdges[i];
    if (!e){ lbl.style.display="none"; continue; }
    v.copy(e.pos).project(camera);
    if (v.z>1){ lbl.style.display="none"; continue; }
    lbl.textContent=e.text;
    lbl.style.left=((v.x*0.5+0.5)*w)+"px";
    lbl.style.top=((-v.y*0.5+0.5)*h)+"px";
    lbl.style.display="block";
  }
}

/* ---------- textures ---------- */
function makeSkyTexture(top, bot) {
  const c=document.createElement("canvas"); c.width=8; c.height=256; const ctx=c.getContext("2d");
  const g=ctx.createLinearGradient(0,0,0,256); g.addColorStop(0,top); g.addColorStop(1,bot);
  ctx.fillStyle=g; ctx.fillRect(0,0,8,256);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
function makeGridTexture() {
  const c=document.createElement("canvas"); c.width=c.height=128; const ctx=c.getContext("2d");
  ctx.fillStyle="#33414f"; ctx.fillRect(0,0,128,128); ctx.strokeStyle="#536579"; ctx.lineWidth=2; ctx.strokeRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(120,120); return t;
}
function makePlankTexture(baseHex) {
  const c=document.createElement("canvas"); c.width=c.height=256; const ctx=c.getContext("2d");
  ctx.fillStyle=baseHex; ctx.fillRect(0,0,256,256);
  const planks=6, pw=256/planks;
  for (let i=0;i<planks;i++){
    ctx.fillStyle=shade(baseHex,(Math.random()*0.12-0.06)); ctx.fillRect(i*pw,0,pw,256);
    ctx.strokeStyle=shade(baseHex,-0.35); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(i*pw,0); ctx.lineTo(i*pw,256); ctx.stroke();
    ctx.strokeStyle="rgba(0,0,0,0.06)";
    for (let g=0;g<8;g++){ ctx.beginPath(); const x=i*pw+Math.random()*pw; ctx.moveTo(x,0); ctx.lineTo(x,256); ctx.stroke(); }
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(0.9,0.9); return t;
}

function buildGrid() {
  const g=new THREE.Mesh(new THREE.PlaneGeometry(600,600),
    new THREE.MeshStandardMaterial({ map: makeGridTexture(), roughness:1, metalness:0 }));
  g.rotation.x=-Math.PI/2; g.receiveShadow=true; scene.add(g);
}

/* ============================================================
   Build deck + railing + stairs from state
   ============================================================ */
function disposeGroup(grp) {
  grp.traverse(o => { if (o.isMesh) { o.geometry.dispose();
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map)m.map.dispose(); m.dispose(); }); } });
}

function levelInfo() {
  const arr=[]; const baseTop=(state.heightIn/12)*FT;
  arr.push({ poly: basePoly(), scale: 1, topY: baseTop, base: true });
  if (state.levels[1]) arr.push({ poly: footprintFeet(state.levels[1].shape, { w: state.size.w*0.55, d: state.size.d*0.55 }), topY: baseTop+UPPER_RISE*FT, base: false });
  return arr;
}

function rebuildScene() {
  if (worldGroup) { scene.remove(worldGroup); disposeGroup(worldGroup); }
  worldGroup = new THREE.Group();
  edgeSelectors = []; hoveredSel = null; resizeHandles = []; hoverHandle = null;
  furnitureGroups = []; capLightPos = [];

  const plankTex = makePlankTexture(DECKING[state.decking].base);
  plankTex.center.set(0.5, 0.5); plankTex.rotation = DECK_DIRS[state.deckDir].rot;
  // scale the board texture so each plank matches the selected profile's real face width
  const boardW = (DECK_PROFILES[state.deckProfile].w / 12) * FT;   // world units per board
  plankTex.repeat.set(1 / (6 * boardW), 1 / (6 * boardW));         // makePlankTexture draws 6 boards per tile
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: DECK_FINISHES[state.deckFinish].rough, metalness:0, side: THREE.DoubleSide });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: DECKING[state.fascia].base, roughness:0.85, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness:0.9 });
  const stairBoardMat = new THREE.MeshStandardMaterial({ color: STAIR_COLORS[state.stairBoard].base, roughness:0.8 });
  const stairRiserMat = new THREE.MeshStandardMaterial({ color: STAIR_COLORS[state.stairRiser].base, roughness:0.85 });

  computeDimEdges();
  const si = STEP_INDEX[state.step];

  let topY=0.5;
  const levels = levelInfo(), lv0 = levels[0];
  levels.forEach((lv) => {
    buildDeckLevel(worldGroup, lv.poly, lv.topY, plankMat, fasciaMat, woodMat, lv.base ? 0 : lv0.topY);
    if (si >= STEP_INDEX.railing) {
      const opts = lv.base
        ? { disabled: new Set(state.disabledEdges), openingFor: openingForEdge }
        : { disabled: new Set(), openingFor: () => null };
      buildPerimeterRailing(worldGroup, lv.poly, lv.topY, state, opts);
    }
    topY = lv.topY;
  });

  if (state.stairsEdge != null && si >= STEP_INDEX.stairs)
    buildStairs(worldGroup, lv0.poly, state.stairsEdge, lv0.topY, plankMat, stairBoardMat, stairRiserMat, woodMat, state.stairPlatform);
  if (state.wallOn && si >= STEP_INDEX.walls)
    buildWall(worldGroup, lv0.poly, lv0.topY);
  if (si >= STEP_INDEX.furniture)
    buildFurniture(worldGroup, lv0.poly, lv0.topY);

  if (state.step === "railing" || state.step === "walls") buildEdgeSelectors(lv0.poly, lv0.topY);
  if (state.step === "shape")   buildResizeHandles(lv0.poly, lv0.topY);

  // night-time cap lights (subsampled to keep within sensible light counts)
  if (state.night && capLightPos.length) {
    const max=10, step=Math.max(1, Math.ceil(capLightPos.length/max));
    for (let i=0;i<capLightPos.length;i+=step){
      const p=capLightPos[i], pl=new THREE.PointLight(0xffd9a0, 6, 2.6, 2);
      pl.position.set(p[0],p[1],p[2]); worldGroup.add(pl);
    }
  }

  scene.add(worldGroup);
  applyEnvironment();
  if (controls && pendingRefit) { fitCameraToDeck(lv0.poly, topY); pendingRefit=false; }
  updateBadge();
}

function buildDeckLevel(parent, poly, topY, plankMat, fasciaMat, woodMat, supportBaseY) {
  const shape = new THREE.Shape();
  poly.forEach(([x,z],i)=>{ const X=x*FT,Z=z*FT; i?shape.lineTo(X,Z):shape.moveTo(X,Z); });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape,{ depth:SLAB, bevelEnabled:false });
  geo.rotateX(Math.PI/2);   // +90° so deck world-z matches polygon z (railing/stairs/wall/labels all use poly z directly)
  geo.computeBoundingBox(); geo.translate(0, topY-geo.boundingBox.max.y, 0);
  const slab = new THREE.Mesh(geo,[plankMat,fasciaMat]); slab.castShadow=true; slab.receiveShadow=true; parent.add(slab);

  const postT=0.33*FT, deckBottom=topY-SLAB;
  const addSupport=(x,z)=>{ const h=deckBottom-supportBaseY; if(h<=0.01)return;
    const m=new THREE.Mesh(new THREE.BoxGeometry(postT,h,postT),woodMat);
    m.position.set(x*FT,supportBaseY+h/2,z*FT); m.castShadow=true; parent.add(m); };
  for (let i=0;i<poly.length;i++){
    const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length]; addSupport(ax,az);
    const len=Math.hypot(bx-ax,bz-az), n=Math.floor(len/7);
    for (let k=1;k<=n;k++) addSupport(ax+(bx-ax)*k/(n+1), az+(bz-az)*k/(n+1));
  }
}

/* ---------- stairs ---------- */
export function buildStairs(parent, poly, edgeIdx, topY, plankMat, boardMat, riserMat, woodMat, withPlatform) {
  const a=poly[edgeIdx], b=poly[(edgeIdx+1)%poly.length];
  const ax=a[0]*FT, az=a[1]*FT, bx=b[0]*FT, bz=b[1]*FT;
  const mx=(ax+bx)/2, mz=(az+bz)/2, A=Math.atan2(bz-az,bx-ax);
  const C=centroid(poly), cx=C[0]*FT, cz=C[1]*FT;

  const g=new THREE.Group(); g.position.set(mx,0,mz); g.rotation.y=-A;   // local +x along edge, local +z perpendicular
  const plat = withPlatform ? 2.5*FT : 0;
  if (withPlatform) {                               // landing platform at deck level
    const pf=new THREE.Mesh(new THREE.BoxGeometry(STAIR_W+0.4, 0.12, plat), plankMat);
    pf.position.set(0, topY-0.06, plat/2); pf.castShadow=true; pf.receiveShadow=true; g.add(pf);
    for (const px of [-STAIR_W/2-0.15, STAIR_W/2+0.15]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1, topY, 0.1), woodMat);
      leg.position.set(px, topY/2, plat-0.1); g.add(leg);
    }
  }
  const nSteps=Math.max(1,Math.ceil(topY/RISER));
  for (let k=1;k<=nSteps;k++){
    const ty=topY-k*RISER, dz=plat+k*TREAD;
    const tread=new THREE.Mesh(new THREE.BoxGeometry(STAIR_W,0.06,TREAD+0.02), boardMat);
    tread.position.set(0, ty-0.03, dz); tread.castShadow=true; tread.receiveShadow=true; g.add(tread);
    const riser=new THREE.Mesh(new THREE.BoxGeometry(STAIR_W,RISER,0.03), riserMat);
    riser.position.set(0, ty-RISER/2, dz-TREAD/2); g.add(riser);
  }
  for (const sx of [-STAIR_W/2-0.03, STAIR_W/2+0.03]) {
    const len=Math.hypot(nSteps*TREAD, topY);
    const str=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.12,len), woodMat);
    str.position.set(sx, topY/2-0.06, plat+nSteps*TREAD/2); str.rotation.x=Math.atan2(topY,nSteps*TREAD); g.add(str);
  }
  // ensure local +z points outward (away from deck centroid); flip 180° if not
  const test=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), g.rotation.y);
  if ((mx+test.x-cx)**2+(mz+test.z-cz)**2 < (mx-cx)**2+(mz-cz)**2) g.rotation.y=-A+Math.PI;
  parent.add(g);
}

/* ---------- house wall (cladding / doors / windows) ---------- */
function makeSidingTexture(hex) {
  const c=document.createElement("canvas"); c.width=c.height=128; const ctx=c.getContext("2d");
  ctx.fillStyle=hex; ctx.fillRect(0,0,128,128);
  ctx.strokeStyle=shade(hex,-0.18); ctx.lineWidth=2;
  for (let y=10;y<128;y+=16){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(128,y); ctx.stroke(); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
function makeBrickTexture(hex) {
  const c=document.createElement("canvas"); c.width=c.height=128; const ctx=c.getContext("2d");
  ctx.fillStyle=shade(hex,-0.3); ctx.fillRect(0,0,128,128);
  ctx.fillStyle=hex;
  for (let r=0,row=0;r<128;r+=18,row++){ for (let x=(row%2?-18:0);x<128;x+=38){ ctx.fillRect(x+2,r+2,34,14); } }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
export function buildWall(parent, poly, deckTopY) {
  const bi = (state.wallEdge!=null && state.wallEdge<poly.length) ? state.wallEdge : backEdge(poly);
  const a=poly[bi], b=poly[(bi+1)%poly.length];
  const ax=a[0]*FT,az=a[1]*FT,bx=b[0]*FT,bz=b[1]*FT;
  const mx=(ax+bx)/2,mz=(az+bz)/2,L=Math.hypot(bx-ax,bz-az),A=Math.atan2(bz-az,bx-ax);
  const C=centroid(poly), cx=C[0]*FT, cz=C[1]*FT, thick=0.3*FT, H=deckTopY+9*FT;
  const off = state.wallMode==="detached" ? 1.5*FT : 0;

  const g=new THREE.Group(); g.position.set(mx,0,mz); g.rotation.y=-A;
  // which local-z is outward (away from deck) — wall sits there, faces the deck
  const w=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), g.rotation.y);
  const outward = ((mx+w.x-cx)**2+(mz+w.z-cz)**2) > ((mx-cx)**2+(mz-cz)**2) ? 1 : -1;
  const slabZ = outward*(thick/2+off), faceZ = slabZ - outward*(thick/2+0.02);

  const cl=CLADDING[state.cladding];
  const tex=cl.brick?makeBrickTexture(cl.base):makeSidingTexture(cl.base);
  tex.repeat.set(Math.max(3,Math.round(L)), Math.max(4,Math.round(H*1.4)));
  const cladMat=new THREE.MeshStandardMaterial({ map:tex, roughness:0.92, side:THREE.DoubleSide });
  const slab=new THREE.Mesh(new THREE.BoxGeometry(L+0.2,H,thick), cladMat);
  slab.position.set(0,H/2,slabZ); slab.castShadow=true; slab.receiveShadow=true; g.add(slab);

  const doorMat=new THREE.MeshStandardMaterial({ color:0x5a4633, roughness:0.7 });
  const glassMat=new THREE.MeshStandardMaterial({ color:0xbcd6e0, transparent:true, opacity:0.55, roughness:0.05, metalness:0.1 });
  const frameMat=new THREE.MeshStandardMaterial({ color:0xf0f0ec, roughness:0.6 });
  const place=(n, w0,h0, yBase, mat, frame)=>{
    for (let i=0;i<n;i++){
      const x=L*((i+1)/(n+1)) - L/2;
      if (frame) { const f=new THREE.Mesh(new THREE.BoxGeometry(w0+0.12,h0+0.12,0.04),frameMat); f.position.set(x,yBase,faceZ); g.add(f); }
      const m=new THREE.Mesh(new THREE.BoxGeometry(w0,h0,0.05),mat); m.position.set(x,yBase,faceZ+outward*0.005); g.add(m);
    }
  };
  if (state.doors>0)   place(state.doors, 3*FT, 6.7*FT, deckTopY+6.7*FT/2, doorMat, true);
  if (state.windows>0) place(state.windows, 3*FT, 3*FT, deckTopY+5.2*FT, glassMat, true);
  parent.add(g);
}

/* ---------- furniture (draggable) ---------- */
const FURN_DEFAULTS = { table:[0,0], umbrella:[0,0], lounge:[-3.2,1.4], planter:[3.4,-3], grill:[3.2,2.6] };
export function buildFurniture(parent, poly, deckTopY) {
  const C=centroid(poly), f=state.furniture;
  for (const key of Object.keys(FURNITURE)) {
    if (!f[key]) continue;
    const pos = state.furnPos[key] || [C[0]+FURN_DEFAULTS[key][0], C[1]+FURN_DEFAULTS[key][1]];
    const g=new THREE.Group(); g.userData={ furn:key }; g.position.set(pos[0]*FT, deckTopY, pos[1]*FT);
    g.rotation.y = state.furnRot[key] || 0;
    const cyl=(r,h,col,x,y,z,ry)=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18), new THREE.MeshStandardMaterial({color:col,roughness:0.7})); m.position.set(x,y,z); if(ry)m.rotation.z=ry; m.castShadow=true; g.add(m); return m; };
    const box=(w,h,d,col,x,y,z,rz)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color:col,roughness:0.7})); m.position.set(x,y,z); if(rz)m.rotation.z=rz; m.castShadow=true; g.add(m); return m; };

    if (key==="table") {
      cyl(0.07,0.44,0x6b6b6b, 0,0.22,0);
      cyl(0.62*FT,0.05,0x8a8a8a, 0,0.44,0);
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        box(0.42*FT,0.42*FT,0.42*FT,0x39506a, dx*1.4*FT,0.2,dz*1.4*FT);
        box(0.42*FT,0.5*FT,0.06,0x2f435a, dx*1.62*FT,0.42,dz*1.4*FT);
      }
    } else if (key==="umbrella") {
      cyl(0.025,2.4*FT,0x8a8a8a, 0,1.2*FT,0);
      const can=new THREE.Mesh(new THREE.ConeGeometry(1.5*FT,0.5*FT,16), new THREE.MeshStandardMaterial({color:0x4f8a5b,roughness:0.8}));
      can.position.set(0,2.55*FT,0); can.castShadow=true; g.add(can);
    } else if (key==="lounge") {
      box(1.9*FT,0.18*FT,0.8*FT,0xcfc9bd, 0,0.5*FT,0);
      const back=new THREE.Mesh(new THREE.BoxGeometry(0.8*FT,0.1*FT,0.9*FT), new THREE.MeshStandardMaterial({color:0xcfc9bd,roughness:0.8}));
      back.position.set(0.9*FT,0.8*FT,0); back.rotation.z=-0.7; back.castShadow=true; g.add(back);
      for (const dx of [-0.8,0.8]) for (const dz of [-0.35,0.35]) box(0.08,0.5*FT,0.08,0x777777, dx*FT,0.25*FT,dz*FT*2);
    } else if (key==="planter") {
      box(0.9*FT,0.7*FT,0.9*FT,0x6e5a44, 0,0.35*FT,0);
      const bush=new THREE.Mesh(new THREE.SphereGeometry(0.6*FT,14,12), new THREE.MeshStandardMaterial({color:0x4a7a3c,roughness:1}));
      bush.position.set(0,0.95*FT,0); bush.castShadow=true; g.add(bush);
    } else if (key==="grill") {
      box(1.2*FT,0.5*FT,0.7*FT,0x2c2c30, 0,0.85*FT,0);
      const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.6*FT,0.6*FT,1.2*FT,16,1,false,0,Math.PI), new THREE.MeshStandardMaterial({color:0x1d1d20,roughness:0.5,metalness:0.3}));
      lid.rotation.z=Math.PI/2; lid.position.set(0,1.1*FT,0); lid.castShadow=true; g.add(lid);
      for (const dx of [-0.45,0.45]) for (const dz of [-0.25,0.25]) box(0.05,0.85*FT,0.05,0x444444, dx*FT,0.42*FT,dz*FT);
    }
    parent.add(g); furnitureGroups.push(g);
  }
}

/* ============================================================
   Perimeter railing (with per-edge disable + openings)
   ============================================================ */
export function buildPerimeterRailing(parent, poly, topY, s, opts = {}) {
  const disabled = opts.disabled || new Set();
  const openingFor = opts.openingFor || (() => null);
  const finish=FINISHES[s.color], weight=PRODUCTS[s.product].railWeight;
  const metal=new THREE.MeshStandardMaterial({ color:new THREE.Color(finish.base), metalness:0.35, roughness:0.5 });
  const glassMat=new THREE.MeshStandardMaterial({ color:0xbcd6e0, metalness:0, roughness:0.06, transparent:true, opacity:0.22, side:THREE.DoubleSide });
  const cableMat=new THREE.MeshStandardMaterial({ color:new THREE.Color(shade(finish.base,0.12)), metalness:0.7, roughness:0.35 });
  const glow=new THREE.MeshStandardMaterial({ color:0xfff3cf, emissive:0xffcf78, emissiveIntensity:1.4, roughness:0.4 });
  const postW=POST_SIZES[s.postSize].w*(s.product==="commercial"?1.12:1);
  const mats={ metal, glassMat, cableMat, glow };

  for (let i=0;i<poly.length;i++){
    if (disabled.has(i)) continue;
    const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length];
    buildRailingEdge(parent, ax*FT,az*FT,bx*FT,bz*FT, topY, s, mats, postW, weight, openingFor(i));
  }
}

function buildRailingEdge(parent, ax, az, bx, bz, topY, s, mats, postW, weight, opening) {
  const dx=bx-ax, dz=bz-az, L=Math.hypot(dx,dz), A=Math.atan2(dz,dx);
  const seg=new THREE.Group(); seg.position.set(ax,topY,az); seg.rotation.y=-A;
  const addBox=(w,h,d,x,y,z,mat)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; seg.add(m); return m; };

  // boundaries along the edge
  const bays=Math.max(1,Math.round(L/(6*FT)));
  let bnds=[]; for (let i=0;i<=bays;i++) bnds.push((L/bays)*i);
  let gap=null;
  if (opening) {
    const w=Math.min(opening.width, L-2*postW), gc=L/2, g0=gc-w/2, g1=gc+w/2;
    bnds=bnds.filter(x=>x<=g0+1e-4||x>=g1-1e-4); bnds.push(g0,g1);
    bnds=[...new Set(bnds.map(v=>+v.toFixed(4)))].sort((p,q)=>p-q);
    gap=[+g0.toFixed(4),+g1.toFixed(4)];
  }

  const topProfileH=0.06*weight;
  const overPost = s.postStyle==="overPost";
  const postTopY = overPost ? RAILH - topProfileH : RAILH;
  const railTopY = overPost ? RAILH : RAILH - 0.02;
  const railCenterY = railTopY - topProfileH/2;

  // posts at each boundary except the far corner (L) which the neighbor edge draws
  const cosA=dx/L, sinA=dz/L, lit=(s.cap==="halo"||s.cap==="solar");
  for (const x of bnds) {
    if (Math.abs(x-L)<1e-4) continue;
    addBox(postW,postTopY,postW,x,postTopY/2,0,mats.metal);
    if (!overPost) buildCap(seg, x, postTopY, postW, s.cap, mats);
    if (!overPost && lit) capLightPos.push([ax+x*cosA, topY+postTopY+0.04, az+x*sinA]);
  }

  const isGap=(b0,b1)=> gap && Math.abs(b0-gap[0])<1e-3 && Math.abs(b1-gap[1])<1e-3;
  const yBot=0.115, yTop=railCenterY-topProfileH/2-0.02;
  for (let i=0;i<bnds.length-1;i++){
    const b0=bnds[i], b1=bnds[i+1]; if (isGap(b0,b1)) continue;
    const segLen=b1-b0, mid=(b0+b1)/2;
    if (s.topRail==="round"){ const r=0.04*weight; const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,segLen,16),mats.metal); m.rotation.z=Math.PI/2; m.position.set(mid,railTopY-r,0); m.castShadow=true; seg.add(m); }
    else addBox(segLen,topProfileH,0.07*weight,mid,railCenterY,0,mats.metal);
    addBox(segLen,0.05*weight,0.06*weight,mid,0.09,0,mats.metal);
    buildInfill(seg, s.infill, b0+postW/2, b1-postW/2, yBot, yTop, mats, addBox);
  }

  if (gap && opening.gate) buildGate(seg, gap[0], gap[1], s, mats, addBox);
  parent.add(seg);
}

function buildCap(seg, x, postTopY, W, type, mats) {
  const add=(geo,mat,y,ry=0)=>{ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,0); if(ry)m.rotation.y=ry; m.castShadow=true; seg.add(m); return m; };
  if (type==="pyramid" || type==="solar"){
    add(new THREE.ConeGeometry(W*0.78, W*1.0, 4), mats.metal, postTopY+W*0.5, Math.PI/4);
    if (type==="solar") add(new THREE.BoxGeometry(W*0.42,0.02,W*0.42), mats.glow, postTopY+W*1.0);
    return;
  }
  if (type==="ball"){
    add(new THREE.BoxGeometry(W*1.2,0.03,W*1.2), mats.metal, postTopY+0.015);
    add(new THREE.SphereGeometry(W*0.55,16,12), mats.metal, postTopY+0.03+W*0.5);
    return;
  }
  // standard / halo: flat cap (halo adds a glowing ring)
  add(new THREE.BoxGeometry(W*1.25,0.03,W*1.25), mats.metal, postTopY+0.015);
  if (type==="halo"){
    const t=new THREE.Mesh(new THREE.TorusGeometry(W*0.72,0.02,8,20), mats.glow);
    t.rotation.x=Math.PI/2; t.position.set(x,postTopY+0.04,0); seg.add(t);
  }
}

function buildGate(seg, g0, g1, s, mats, addBox) {
  const yB=0.07, yT=RAILH-0.02, h=yT-yB, midY=(yB+yT)/2, inset=0.04, zo=0.02;
  const l=g0+inset, r=g1-inset;
  addBox(0.035,h,0.035,l,midY,zo,mats.metal);          // left stile
  addBox(0.035,h,0.035,r,midY,zo,mats.metal);          // right stile
  addBox(r-l,0.04,0.035,(l+r)/2,yT,zo,mats.metal);     // top rail
  addBox(r-l,0.04,0.035,(l+r)/2,yB,zo,mats.metal);     // bottom rail
  buildInfill(seg, s.infill, l+0.05, r-0.05, yB+0.04, yT-0.04, mats, addBox, zo);
  addBox(0.12,0.03,0.04,r-0.16,midY,zo+0.03,mats.metal); // handle
}

function buildInfill(seg, type, x0, x1, yBot, yTop, mats, addBox, z=0) {
  const bayW=x1-x0, midX=(x0+x1)/2, h=yTop-yBot, midY=(yTop+yBot)/2;
  if (bayW<=0.02) return;
  if (type==="glass"){
    const m=new THREE.Mesh(new THREE.BoxGeometry(bayW-0.02,h,0.012),mats.glassMat); m.position.set(midX,midY,z); seg.add(m);
    for (const t of [0.2,0.8]) addBox(0.05,0.06,0.05,x0+bayW*t,yBot+0.03,z,mats.metal);
    return;
  }
  if (type==="cable"){
    for (let i=0;i<7;i++){ const y=yBot+h*(i/6); const m=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,bayW,8),mats.cableMat); m.rotation.z=Math.PI/2; m.position.set(midX,y,z); m.castShadow=true; seg.add(m); }
    return;
  }
  const gap=0.11, pw=0.02, count=Math.max(2,Math.round(bayW/gap));
  for (let i=1;i<count;i++) addBox(pw,h,pw,x0+(bayW*i)/count,midY,z,mats.metal);
}

/* ---------- clickable edge selectors ---------- */
function buildEdgeSelectors(poly, topY) {
  const wallE = (state.wallEdge!=null && state.wallEdge<poly.length) ? state.wallEdge : backEdge(poly);
  for (let i=0;i<poly.length;i++){
    const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length];
    const AX=ax*FT,AZ=az*FT,BX=bx*FT,BZ=bz*FT, L=Math.hypot(BX-AX,BZ-AZ), A=Math.atan2(BZ-AZ,BX-AX);
    let color, opacity;
    if (state.step==="walls") { const cur=(i===wallE && state.wallOn); color=cur?0x2f7fd6:0x8aa0b4; opacity=cur?0.4:0.14; }
    else { const on=!state.disabledEdges.includes(i); color=on?0x2f7fd6:0xe0a020; opacity=0.16; }
    const m=new THREE.Mesh(new THREE.BoxGeometry(L-0.04,0.05,0.22),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity, depthWrite:false }));
    m.position.set((AX+BX)/2, topY+0.04, (AZ+BZ)/2); m.rotation.y=-A; m.userData={ edge:i };
    m.renderOrder=2; worldGroup.add(m); edgeSelectors.push(m);
  }
}

/* ---------- drag-to-resize handles ---------- */
function buildResizeHandles(poly, topY) {
  const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const cx=(minX+maxX)/2, cz=(minZ+maxZ)/2;
  const mk=(xFt,zFt,axis,dir)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.14,18,14),
      new THREE.MeshBasicMaterial({ color:0xc8a24a, depthTest:false }));
    m.position.set(xFt*FT, topY+0.14, zFt*FT); m.renderOrder=4;
    m.userData={ resize:true, axis, dir, cx, cz }; worldGroup.add(m); resizeHandles.push(m);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.025,8,20),
      new THREE.MeshBasicMaterial({ color:0xc8a24a, transparent:true, opacity:0.5, depthTest:false }));
    ring.position.copy(m.position); ring.rotation.x=Math.PI/2; ring.renderOrder=4; worldGroup.add(ring);
  };
  mk(maxX,cz,"w",1); mk(minX,cz,"w",-1); mk(cx,maxZ,"d",1); mk(cx,minZ,"d",-1);
}

function bindCanvasPointer() {
  const el=renderer.domElement; let down=null;

  el.addEventListener("pointerdown", e=>{
    if (state.step==="shape"){
      const h=pickHandle(e);
      if (h){ dragging={ ...h.userData, start: snapshot() }; controls.enabled=false;
        el.setPointerCapture && el.setPointerCapture(e.pointerId); el.style.cursor="grabbing"; return; }
    }
    if (state.step==="furniture"){
      const fg=pickFurniture(e);
      if (fg){ draggingFurn={ key:fg.userData.furn, start: snapshot() }; controls.enabled=false;
        el.setPointerCapture && el.setPointerCapture(e.pointerId); el.style.cursor="grabbing"; return; }
    }
    down={x:e.clientX,y:e.clientY};
  });

  el.addEventListener("pointermove", e=>{
    if (dragging){ doResize(e); return; }
    if (draggingFurn){ doFurnDrag(e); return; }
    if (state.step==="shape"){
      const h=pickHandle(e);
      if (hoverHandle && hoverHandle!==h) hoverHandle.scale.setScalar(1);
      if (h){ h.scale.setScalar(1.3); hoverHandle=h; el.style.cursor="grab"; } else { hoverHandle=null; el.style.cursor=""; }
      return;
    }
    if (state.step==="furniture"){ el.style.cursor = pickFurniture(e) ? "grab" : ""; return; }
    if (state.step==="railing" || state.step==="walls"){
      const idx=pickEdgeMesh(e);
      if (hoveredSel && hoveredSel!==idx){ hoveredSel.material.opacity = hoveredSel.userData._base??0.16; hoveredSel=null; }
      if (idx){ idx.userData._base=idx.material.opacity; idx.material.opacity=0.5; hoveredSel=idx; el.style.cursor="pointer"; } else el.style.cursor="";
      return;
    }
    if(hoveredSel){hoveredSel.material.opacity=0.16;hoveredSel=null;} el.style.cursor="";
  });

  el.addEventListener("pointerup", e=>{
    if (dragging){ undoStack.push(dragging.start); redoStack.length=0; dragging=null; controls.enabled=true; el.style.cursor=""; renderUI(); return; }
    if (draggingFurn){ undoStack.push(draggingFurn.start); redoStack.length=0; draggingFurn=null; controls.enabled=true; el.style.cursor=""; renderUI(); return; }
    if (!down) return; const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y); down=null;
    if (moved>6) return;
    const hit=pickEdge(e); if (hit==null) return;
    if (state.step==="railing")
      commit(()=>{ const s=new Set(state.disabledEdges); s.has(hit)?s.delete(hit):s.add(hit); state.disabledEdges=[...s]; });
    else if (state.step==="walls")
      commit(()=>{ state.wallEdge=hit; state.wallOn=true; });
  });

  el.addEventListener("dblclick", e=>{       // double-click a furniture item to rotate it 45°
    if (state.step!=="furniture") return;
    const fg=pickFurniture(e); if(!fg) return;
    const k=fg.userData.furn;
    commit(()=>{ state.furnRot={ ...state.furnRot, [k]: ((state.furnRot[k]||0)+Math.PI/4)%(Math.PI*2) }; });
  });
}

function pickFurniture(e){ setPointer(e); raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(furnitureGroups,true);
  if(!hits.length) return null; let o=hits[0].object; while(o && !(o.userData&&o.userData.furn)) o=o.parent; return o; }
function doFurnDrag(e){
  setPointer(e); raycaster.setFromCamera(pointer,camera);
  const topY=levelInfo()[0].topY, plane=new THREE.Plane(new THREE.Vector3(0,1,0), -topY), pt=new THREE.Vector3();
  if(!raycaster.ray.intersectPlane(plane,pt)) return;
  const poly=levelInfo()[0].poly, xs=poly.map(p=>p[0]), zs=poly.map(p=>p[1]);
  const x=Math.max(Math.min(...xs)+1, Math.min(Math.max(...xs)-1, pt.x/FT));
  const z=Math.max(Math.min(...zs)+1, Math.min(Math.max(...zs)-1, pt.z/FT));
  state.furnPos={ ...state.furnPos, [draggingFurn.key]:[x,z] }; rebuildScene();
}

function doResize(e) {
  setPointer(e); raycaster.setFromCamera(pointer,camera);
  const topY=levelInfo()[0].topY;
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0), -topY), pt=new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane,pt)) return;
  const { axis, dir, cx, cz }=dragging;
  if (axis==="w"){ let w=Math.round((pt.x/FT - cx)*dir*2); state.size.w=Math.max(8,Math.min(36,w)); }
  else          { let d=Math.round((pt.z/FT - cz)*dir*2); state.size.d=Math.max(8,Math.min(28,d)); }
  rebuildScene();
  setSlider("widthSlider","widthVal",state.size.w,`${state.size.w}'`);
  setSlider("depthSlider","depthVal",state.size.d,`${state.size.d}'`);
  updateBadge();
}

function setPointer(e){ const r=renderer.domElement.getBoundingClientRect(); pointer.x=((e.clientX-r.left)/r.width)*2-1; pointer.y=-((e.clientY-r.top)/r.height)*2+1; }
function pickHandle(e){ setPointer(e); raycaster.setFromCamera(pointer,camera); const h=raycaster.intersectObjects(resizeHandles,false); return h.length?h[0].object:null; }
function pickEdgeMesh(e){ setPointer(e); raycaster.setFromCamera(pointer,camera); const hits=raycaster.intersectObjects(edgeSelectors,false); return hits.length?hits[0].object:null; }
function pickEdge(e){ const m=pickEdgeMesh(e); return m?m.userData.edge:null; }

/* ============================================================
   UI
   ============================================================ */
function updateBadge() {
  const el=document.getElementById("stageBadge"); if(!el)return;
  el.textContent = STEP_INDEX[state.step] >= STEP_INDEX.railing
    ? `${PRODUCTS[state.product].name} · ${INFILLS[state.infill].name} · ${FINISHES[state.color].name}`
    : `${SHAPES[state.levels[0].shape].label} · ${state.size.w}'×${state.size.d}' · ${ftIn(state.heightIn)}`;
}

function shapeThumb(poly,id){
  const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);
  const minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);
  const w=maxx-minx,h=maxz-minz,vw=86,vh=64,pad=7,s=Math.min((vw-2*pad)/w,(vh-2*pad)/h);
  const ox=(vw-w*s)/2,oy=(vh-h*s)/2;
  const pts=poly.map(([x,z])=>`${((x-minx)*s+ox).toFixed(1)},${((z-minz)*s+oy).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${vw} ${vh}"><defs>
      <pattern id="g${id}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#2f7fd6"/><path d="M7 0H0V7" stroke="#62a3e8" stroke-width="1" fill="none"/></pattern></defs>
      <polygon points="${pts}" fill="url(#g${id})" stroke="#1d5da3" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

function buildStaticUI() {
  document.getElementById("shapeGrid").innerHTML = Object.entries(SHAPES).map(([k,s])=>
    `<button class="shape-thumb" data-key="shape" data-val="${k}">${shapeThumb(s.poly,k)}<span>${s.label}</span></button>`).join("");
  renderColorOptions();
  document.getElementById("dirOptions").innerHTML = Object.entries(DECK_DIRS).map(([k,v])=>
    `<button class="opt dir-opt" data-key="deckDir" data-val="${k}"><span class="dir-ic">${dirIcon(k)}</span>${v.name}</button>`).join("");
  document.getElementById("profileOptions").innerHTML = Object.entries(DECK_PROFILES).map(([k,v])=>
    `<button class="opt" data-key="deckProfile" data-val="${k}"><span class="opt-name">${v.name}</span><span class="opt-desc">${v.desc}</span></button>`).join("");
  document.getElementById("deckFinishOptions").innerHTML = Object.entries(DECK_FINISHES).map(([k,v])=>
    `<button class="opt" data-key="deckFinish" data-val="${k}">${v.name} — <span style="color:var(--muted);font-size:11px">${v.desc}</span></button>`).join("");
  document.getElementById("boardLenOptions").innerHTML = Object.entries(BOARD_LENGTHS).map(([k,v])=>
    `<button class="opt" data-key="boardLength" data-val="${k}">${v.name}</button>`).join("");
  document.getElementById("fasciaOptions").innerHTML = Object.entries(DECKING).map(([k,v])=>
    `<button class="swatch" data-key="fascia" data-val="${k}" data-label="${v.name}" style="background:linear-gradient(145deg, ${shade(v.base,0.18)}, ${shade(v.base,-0.18)})"></button>`).join("");
  document.getElementById("postStyleOptions").innerHTML = Object.entries(POST_STYLES).map(([k,v])=>
    `<button class="opt" data-key="postStyle" data-val="${k}">${v.name}</button>`).join("");
  document.getElementById("capOptions").innerHTML = Object.entries(CAPS).map(([k,v])=>
    `<button class="opt" data-key="cap" data-val="${k}">${v.name}</button>`).join("");
  document.getElementById("productOptions").innerHTML = Object.entries(PRODUCTS).map(([k,p])=>
    `<button class="opt" data-key="product" data-val="${k}"><span class="opt-name">${p.name}</span><span class="opt-desc">${p.desc}</span></button>`).join("");
  document.getElementById("infillOptions").innerHTML = Object.entries(INFILLS).map(([k,v])=>
    `<button class="opt" data-key="infill" data-val="${k}"><span class="opt-icon">${v.icon}</span>${v.name}</button>`).join("");
  document.getElementById("colorOptions").innerHTML = Object.entries(FINISHES).map(([k,v])=>
    `<button class="swatch" data-key="color" data-val="${k}" data-label="${v.name}" style="background:linear-gradient(145deg, ${shade(v.base,0.25)}, ${shade(v.base,-0.25)})"></button>`).join("");
  document.getElementById("topRailOptions").innerHTML = Object.entries(TOPRAILS).map(([k,v])=>
    `<button class="opt" data-key="topRail" data-val="${k}">${v.name} — <span style="color:var(--muted);font-size:11px">${v.desc}</span></button>`).join("");
  document.getElementById("postOptions").innerHTML =
    `<div class="opt-row-label">Post size</div>`+Object.entries(POST_SIZES).map(([k,v])=>`<button class="opt" data-key="postSize" data-val="${k}">${v.name}</button>`).join("")+
    `<div class="opt-row-label">Rail style</div><button class="opt" data-key="spacing" data-val="post">Post-to-post</button><button class="opt" data-key="spacing" data-val="continuous">Continuous</button>`;

  // dynamic stepper
  document.getElementById("stepper").innerHTML = STEPS.map(([k,l],i)=>
    `<button class="step" data-step="${k}"><b>${i+1}</b> ${l}</button>`).join("");

  const swatchRow=(obj,key)=>Object.entries(obj).map(([k,v])=>
    `<button class="swatch" data-key="${key}" data-val="${k}" data-label="${v.name}" style="background:linear-gradient(145deg, ${shade(v.base,0.18)}, ${shade(v.base,-0.18)})"></button>`).join("");
  document.getElementById("stairBoardOptions").innerHTML = swatchRow(STAIR_COLORS,"stairBoard");
  document.getElementById("stairRiserOptions").innerHTML = swatchRow(STAIR_COLORS,"stairRiser");
  document.getElementById("claddingOptions").innerHTML = swatchRow(CLADDING,"cladding");
  document.getElementById("wallModeOptions").innerHTML =
    `<button class="opt" data-key="wallMode" data-val="attached">Attached to wall</button>`+
    `<button class="opt" data-key="wallMode" data-val="detached">Detached from wall</button>`;
  document.getElementById("furnitureOptions").innerHTML = Object.entries(FURNITURE).map(([k,v])=>
    `<button class="opt" data-furn="${k}">${v.name}</button>`).join("");
}

function firstColorOf(finish){ return Object.keys(DECKING).find(k=>DECKING[k].finish===finish); }
function renderColorOptions() {
  const el=document.getElementById("deckingOptions"); if(!el) return;
  el.innerHTML = Object.entries(DECKING).filter(([,v])=>v.finish===state.deckFinish).map(([k,v])=>
    `<button class="swatch" data-key="decking" data-val="${k}" data-label="${v.name}" style="background:linear-gradient(145deg, ${shade(v.base,0.18)}, ${shade(v.base,-0.18)})"></button>`).join("");
}

function renderUI() {
  renderColorOptions();
  document.querySelectorAll(".step-pane").forEach(p=>p.hidden = p.dataset.step!==state.step);
  document.querySelectorAll(".step").forEach(b=>b.classList.toggle("active", b.dataset.step===state.step));
  document.querySelectorAll("[data-key]").forEach(el=>el.classList.toggle("active", state[el.dataset.key]===el.dataset.val));
  document.querySelectorAll('[data-key="shape"]').forEach(el=>el.classList.toggle("active", state.levels[0].shape===el.dataset.val));
  document.querySelectorAll("[data-furn]").forEach(el=>el.classList.toggle("active", state.furniture[el.dataset.furn]));

  const ph=document.getElementById("productHint"); if(ph) ph.textContent=PRODUCTS[state.product].hint;
  const ch=document.getElementById("colorHint"); if(ch) ch.textContent=`${FINISHES[state.color].name} — architectural-grade powder coat.`;

  setSlider("heightSlider","heightVal",state.heightIn,ftIn(state.heightIn));
  setSlider("widthSlider","widthVal",state.size.w,`${state.size.w}'`);
  setSlider("depthSlider","depthVal",state.size.d,`${state.size.d}'`);

  document.getElementById("addLevelBtn").hidden=!!state.levels[1];
  document.getElementById("removeLevelBtn").hidden=!state.levels[1];

  const sb=document.getElementById("stairsBtn"), srb=document.getElementById("stairsRotBtn"), pf=document.getElementById("platformBtn");
  if (state.stairsEdge!=null){ sb.textContent="✓ Stairs added"; sb.classList.add("active"); srb.hidden=false; pf.hidden=false; }
  else { sb.textContent="▦ Add stairs"; sb.classList.remove("active"); srb.hidden=true; pf.hidden=true; }
  pf.textContent = state.stairPlatform ? "✓ With platform" : "＋ With platform"; pf.classList.toggle("active", state.stairPlatform);

  const gb=document.getElementById("gateBtn");
  gb.textContent = state.gate ? "✓ Gate added" : "⊏ Add a gate"; gb.classList.toggle("active", state.gate);

  const wt=document.getElementById("wallToggleBtn"), wm=document.getElementById("wallMoveBtn");
  wt.textContent = state.wallOn ? "✓ Wall added" : "＋ Add a wall"; wt.classList.toggle("active", state.wallOn);
  wm.hidden = !state.wallOn;
  document.getElementById("doorCount").textContent = state.doors;
  document.getElementById("winCount").textContent = state.windows;
  document.getElementById("nightBtn").classList.toggle("active", state.night);
  document.getElementById("nightCtl").hidden=!state.night;
  const syncB=(id,valId,v)=>{ const el=document.getElementById(id); if(+el.value!==v) el.value=v; document.getElementById(valId).textContent=(+v).toFixed(2); };
  syncB("glowSlider","glowVal",state.bloom); syncB("radiusSlider","radiusVal",state.bloomRadius); syncB("threshSlider","threshVal",state.bloomThreshold);
  if (bloomPass){ bloomPass.strength=state.bloom; bloomPass.radius=state.bloomRadius; bloomPass.threshold=state.bloomThreshold; }

  const i=STEP_INDEX[state.step];
  const next=document.getElementById("nextBtn"), back=document.getElementById("backBtn");
  next.textContent = i===STEPS.length-1 ? "💲 Get an unofficial quote" : `Next: ${STEPS[i+1][1]} ▶`;
  back.hidden = i===0;

  document.getElementById("undoBtn").disabled=!undoStack.length;
  document.getElementById("redoBtn").disabled=!redoStack.length;
  renderSummary(); updateBadge();
}
function setSlider(id,labelId,val,text){ const s=document.getElementById(id); if(s&&+s.value!==val)s.value=val; const l=document.getElementById(labelId); if(l)l.textContent=text; }

function renderSummary() {
  const rows=[
    ["Shape", SHAPES[state.levels[0].shape].label],
    ["Size", `${state.size.w}' × ${state.size.d}'`],
    ["Height", ftIn(state.heightIn)],
    ["Levels", state.levels.length],
    ["Decking", `${DECK_PROFILES[state.deckProfile].name.replace(/®/g,"")} · ${DECKING[state.decking].name}`],
    ["Stairs", state.stairsEdge!=null?"Yes":"No"],
  ];
  const si=STEP_INDEX[state.step];
  if (si>=STEP_INDEX.railing) rows.push(
    ["Railing", PRODUCTS[state.product].name],
    ["Infill", INFILLS[state.infill].name],
    ["Finish", FINISHES[state.color].name],
    ["Post style", POST_STYLES[state.postStyle].name],
    ["Caps", CAPS[state.cap].name],
    ["Gate", state.gate?"Yes":"No"],
  );
  if (si>=STEP_INDEX.walls && state.wallOn) rows.push(
    ["Wall", CLADDING[state.cladding].name],
    ["Doors / Windows", `${state.doors} / ${state.windows}`],
  );
  if (si>=STEP_INDEX.furniture) {
    const fl=Object.keys(state.furniture).filter(k=>state.furniture[k]).length;
    rows.push(["Furniture", fl?`${fl} item${fl>1?"s":""}`:"None"]);
  }
  document.getElementById("summary").innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Your deck</div>`+
    rows.map(([k,v])=>`<div class="row"><span>${k}</span><span>${v}</span></div>`).join("");
}

/* ============================================================
   Unofficial estimate (DUXXBAK 2026 dealer pricing)
   ============================================================ */
let lastQuoteText = "";
const money = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function polyArea(poly){ let a=0; for(let i=0;i<poly.length;i++){const[x1,z1]=poly[i],[x2,z2]=poly[(i+1)%poly.length]; a+=x1*z2-x2*z1;} return Math.abs(a)/2; }

function estimate() {
  const lv=levelInfo(); let area=0, perim=0, railLF=0;
  lv.forEach((l,idx)=>{
    area += polyArea(l.poly);
    for (let i=0;i<l.poly.length;i++){
      const [ax,az]=l.poly[i],[bx,bz]=l.poly[(i+1)%l.poly.length];
      const len=Math.hypot(bx-ax,bz-az); perim+=len;
      if (!(idx===0 && state.disabledEdges.includes(i))){ let rl=len; if(idx===0){const op=openingForEdge(i); if(op) rl=Math.max(0,rl-op.width/FT);} railLF+=rl; }
    }
  });
  const boardWft=DECK_PROFILES[state.deckProfile].w/12;
  return { area:Math.round(area), perim:Math.round(perim), railLF:Math.round(railLF),
    posts:Math.round(railLF/6)+lv.reduce((s,l)=>s+l.poly.length,0), deckLF:Math.round(area/boardWft*1.10) };
}

function pricing(est) {
  const lf=PRICE_LF[state.deckProfile][state.deckFinish], items=[];
  const deck=est.deckLF*lf;
  items.push([`Decking — ${DECK_PROFILES[state.deckProfile].name} (${DECK_FINISHES[state.deckFinish].name})`, `${est.deckLF} lf × ${money(lf)}`, deck]);
  const ffin=state.deckFinish==="tractionWG"?"tractionWG":"traction", fasc=FASCIA_LF[ffin], fascia=est.perim*fasc;
  items.push([`Fascia board (${DECK_FINISHES[ffin].name})`, `${est.perim} lf × ${money(fasc)}`, fascia]);
  let total=deck+fascia;
  if (state.deckProfile==="duxxbak" && state.deckFinish==="armorcap"){ const bags=Math.ceil(est.area*2.3/50), c=bags*CLIP_BAG; items.push([`Mounting clips (required)`, `${bags} × 50-ct bag`, c]); total+=c; }
  const sbags=Math.ceil(est.area*2.4/185), s=sbags*SCREW_BAG; items.push([`Fasteners (#7 × 2.5")`, `${sbags} × 185-ct bag`, s]); total+=s;
  return { items, total };
}

function openQuote() {
  const est=estimate(), pr=pricing(est);
  const cfg=[
    ["Deck shape", SHAPES[state.levels[0].shape].label],
    ["Footprint", `${state.size.w}' × ${state.size.d}' · ~${est.area} sq ft`],
    ["Levels", state.levels.length],
    ["Profile", DECK_PROFILES[state.deckProfile].name],
    ["Color / Finish", `${DECKING[state.decking].name} · ${DECK_FINISHES[state.deckFinish].name}`],
    ["Railing", `${PRODUCTS[state.product].name} · ${INFILLS[state.infill].name} · ~${est.railLF} ft, ~${est.posts} posts`],
  ];
  const body=document.getElementById("quoteBody");
  body.innerHTML =
    `<div class="quote-summary">`+cfg.map(([k,v])=>`<div class="row"><span>${k}</span><span>${v}</span></div>`).join("")+`</div>`+
    `<table class="price-table"><thead><tr><th>Item</th><th>Qty</th><th>Est.</th></tr></thead><tbody>`+
      pr.items.map(([n,q,v])=>`<tr><td>${n}</td><td>${q}</td><td>${money(v)}</td></tr>`).join("")+
      `<tr class="price-total"><td>DUXXBAK® materials subtotal</td><td></td><td>${money(pr.total)}</td></tr>`+
    `</tbody></table>`+
    `<p class="quote-note">Unofficial estimate — linear-foot pricing is for estimate use only (DUXXBAK® 2026 dealer list).
       Excludes railing/stairs/walls, labor, freight, skid/min-order fees, and tax. Contact your Account Manager for a firm quote.</p>`;
  lastQuoteText =
    `TWAN & DAK'S RAILZ — UNOFFICIAL ESTIMATE\n${new Date().toLocaleString()}\n\n`+
    cfg.map(([k,v])=>`${k.padEnd(16)} ${v}`).join("\n")+`\n\nDUXXBAK® MATERIALS (estimate use only)\n`+
    pr.items.map(([n,q,v])=>`  ${n}\n    ${q} = ${money(v)}`).join("\n")+
    `\n  ---\n  Subtotal: ${money(pr.total)}\n\nExcludes railing/stairs/walls, labor, freight, fees and tax.`;
  document.getElementById("quoteModal").hidden=false;
}
function closeQuote(){ document.getElementById("quoteModal").hidden=true; }
function downloadQuote(){ const b=new Blob([lastQuoteText],{type:"text/plain"}), u=URL.createObjectURL(b);
  const a=document.createElement("a"); a.href=u; a.download="twan-and-daks-railz-estimate.txt"; a.click(); URL.revokeObjectURL(u); }

/* ============================================================
   Events
   ============================================================ */
function registerEvents() {
  document.addEventListener("click", e=>{
    const opt=e.target.closest("[data-key]");
    if (opt){ const key=opt.dataset.key,val=opt.dataset.val;
      commit(()=>{
        if (key==="shape"){ state.levels[0].shape=val; state.disabledEdges=[]; state.stairsEdge=null; state.gate=false; state.wallEdge=null; state.furnPos={}; state.furnRot={}; pendingRefit=true; }
        else if (key==="product"){ state.product=val; state.topRail=PRODUCTS[val].defaultTopRail; }
        else if (key==="deckFinish"){ state.deckFinish=val; if(DECKING[state.decking].finish!==val) state.decking=firstColorOf(val); }
        else state[key]=val;
      }); return;
    }
    const furn=e.target.closest("[data-furn]");
    if (furn){ commit(()=>{ const k=furn.dataset.furn; state.furniture={ ...state.furniture, [k]: !state.furniture[k] }; }); return; }
    const stp=e.target.closest(".step"); if (stp){ commit(()=>state.step=stp.dataset.step); return; }
  });

  const go=delta=>{ const i=STEP_INDEX[state.step]+delta; if(i<0||i>=STEPS.length)return; commit(()=>state.step=STEPS[i][0]); };
  document.getElementById("nextBtn").addEventListener("click", e=>{ e.preventDefault();
    if (STEP_INDEX[state.step]===STEPS.length-1) openQuote(); else go(1); });
  document.getElementById("backBtn").addEventListener("click", ()=>go(-1));
  document.getElementById("quoteClose").addEventListener("click", closeQuote);
  document.getElementById("quoteModal").addEventListener("click", e=>{ if(e.target.id==="quoteModal") closeQuote(); });
  document.getElementById("quoteDownload").addEventListener("click", downloadQuote);
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeQuote(); });

  document.getElementById("platformBtn").addEventListener("click", ()=>commit(()=>state.stairPlatform=!state.stairPlatform));
  document.getElementById("wallToggleBtn").addEventListener("click", ()=>commit(()=>state.wallOn=!state.wallOn));
  const clampDW=(k,d,max)=>commit(()=>state[k]=Math.max(0,Math.min(max,state[k]+d)));
  document.getElementById("doorPlus").addEventListener("click", ()=>clampDW("doors",1,4));
  document.getElementById("doorMinus").addEventListener("click", ()=>clampDW("doors",-1,4));
  document.getElementById("winPlus").addEventListener("click", ()=>clampDW("windows",1,6));
  document.getElementById("winMinus").addEventListener("click", ()=>clampDW("windows",-1,6));

  document.getElementById("addLevelBtn").addEventListener("click", ()=>commit(()=>{ state.levels.push({ shape: state.levels[0].shape }); pendingRefit=true; }));
  document.getElementById("removeLevelBtn").addEventListener("click", ()=>commit(()=>{ state.levels.length=1; pendingRefit=true; }));
  document.getElementById("wallMoveBtn").addEventListener("click", ()=>commit(()=>{ const n=basePoly().length, cur=(state.wallEdge==null?backEdge(basePoly()):state.wallEdge); state.wallEdge=(cur+1)%n; state.wallOn=true; }));
  document.getElementById("nightBtn").addEventListener("click", e=>{ commit(()=>state.night=!state.night); });
  const bindBloom=(id,valId,key,prop)=>{ const el=document.getElementById(id); el.addEventListener("input", ()=>{
    state[key]=+el.value; if(bloomPass) bloomPass[prop]=state[key]; document.getElementById(valId).textContent=(+el.value).toFixed(2); }); };
  bindBloom("glowSlider","glowVal","bloom","strength");
  bindBloom("radiusSlider","radiusVal","bloomRadius","radius");
  bindBloom("threshSlider","threshVal","bloomThreshold","threshold");

  document.getElementById("stairsBtn").addEventListener("click", ()=>commit(()=>{ state.stairsEdge = state.stairsEdge==null ? frontEdge() : null; }));
  document.getElementById("stairsRotBtn").addEventListener("click", ()=>commit(()=>{ const n=basePoly().length; state.stairsEdge=(state.stairsEdge+1)%n; }));
  document.getElementById("gateBtn").addEventListener("click", ()=>commit(()=>state.gate=!state.gate));

  bindRangeHistory("heightSlider", v=>state.heightIn=v);
  bindRangeHistory("widthSlider",  v=>state.size.w=v);
  bindRangeHistory("depthSlider",  v=>state.size.d=v);

  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("redoBtn").addEventListener("click", redo);
  document.getElementById("resetBtn").addEventListener("click", ()=>{ camera.position.set(6.5,5.2,11); controls.target.set(0,0.5,0); pendingRefit=true; rebuildScene(); });
  document.getElementById("autorotBtn").addEventListener("click", e=>{ controls.autoRotate=!controls.autoRotate; e.currentTarget.classList.toggle("active",controls.autoRotate); });
  document.getElementById("downloadBtn").addEventListener("click", ()=>{ renderFrame(); const a=document.createElement("a"); a.download="twan-and-daks-railz-deck.png"; a.href=renderer.domElement.toDataURL("image/png"); a.click(); });
  document.getElementById("uploadInput").addEventListener("change", e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader();
    rd.onload=ev=>new THREE.TextureLoader().load(ev.target.result, tex=>{ tex.colorSpace=THREE.SRGBColorSpace; if(photoTexture)photoTexture.dispose(); photoTexture=tex; scene.background=tex; scene.fog=null; }); rd.readAsDataURL(f); });
}

function bindRangeHistory(id, onInput) {
  const el=document.getElementById(id); if(!el)return; let start=null;
  el.addEventListener("input", ()=>{ if(start===null)start=snapshot(); onInput(+el.value); rebuildScene();
    setSlider("heightSlider","heightVal",state.heightIn,ftIn(state.heightIn));
    setSlider("widthSlider","widthVal",state.size.w,`${state.size.w}'`);
    setSlider("depthSlider","depthVal",state.size.d,`${state.size.d}'`); updateBadge(); });
  el.addEventListener("change", ()=>{ if(start!==null){ undoStack.push(start); redoStack.length=0; start=null; } renderUI(); });
}

function dirIcon(k) {
  const lines = k==="horizontal" ? '<line x1="2" y1="6" x2="26" y2="6"/><line x1="2" y1="11" x2="26" y2="11"/><line x1="2" y1="16" x2="26" y2="16"/>'
    : k==="vertical" ? '<line x1="7" y1="2" x2="7" y2="20"/><line x1="14" y1="2" x2="14" y2="20"/><line x1="21" y1="2" x2="21" y2="20"/>'
    : '<line x1="2" y1="17" x2="13" y2="3"/><line x1="9" y1="20" x2="21" y2="4"/><line x1="16" y1="20" x2="26" y2="7"/>';
  return `<svg viewBox="0 0 28 22"><rect width="28" height="22" rx="3" fill="#bda47e"/><g stroke="#6e5436" stroke-width="1.5">${lines}</g></svg>`;
}

/* ---------- icons ---------- */
function infillIcon(type) {
  if (type==="glass") return `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="1" fill="#bcd6e0" stroke="#7a96a3"/></svg>`;
  if (type==="cable") return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.6"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></g></svg>`;
  return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.8"><line x1="5" y1="3" x2="5" y2="17"/><line x1="10" y1="3" x2="10" y2="17"/><line x1="15" y1="3" x2="15" y2="17"/></g></svg>`;
}

/* ---------- init ---------- */
if (typeof document !== "undefined" && stage) {
  buildStaticUI(); registerEvents(); initThree(); renderUI();
}
