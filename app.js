/* ============================================================
   Kadenz 3D Deck Visualizer — replica
   Step 1: deck shape / size / height / levels / stairs (studio grid)
   Step 2: Kadenz railing around the perimeter (+ per-edge toggle, gate)
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
    levels: [{ shape: "square" }],
    size: { w: 14, d: 12 },          // overall footprint (ft)
    heightIn: 39,                    // base deck height (in)
    decking: "driftwood",
    disabledEdges: [],               // base-level edges with railing removed
    stairsEdge: null,                // base-level edge index with stairs
    gate: false,
    product: "classic", infill: "picket", color: "black",
    topRail: "flat", postSize: "2.5", spacing: "post",
  };
}
let state = defaultState();
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
const raycaster = typeof THREE !== "undefined" ? new THREE.Raycaster() : null;
const pointer = { x: 0, y: 0 };
let edgeSelectors = [], hoveredSel = null;
let resizeHandles = [], dragging = null, hoverHandle = null;

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

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa6b2, 1.15));
  sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(9, 15, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left=-16; sc.right=16; sc.top=16; sc.bottom=-16; sc.near=0.5; sc.far=70;
  sun.shadow.bias = -0.0004; scene.add(sun, sun.target);

  buildGrid();
  rebuildScene();
  bindCanvasPointer();

  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  const l = document.getElementById("loading"); if (l) l.remove();
  animate();
}

function onResize() { const w=stage.clientWidth,h=stage.clientHeight; if(!w||!h)return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); }
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }

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

  const plankTex = makePlankTexture(DECKING[state.decking].base);
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness:0.8, metalness:0, side: THREE.DoubleSide });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: shade(DECKING[state.decking].base,-0.25), roughness:0.85, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness:0.9 });

  let topY=0.5;
  const lv0Top = levelInfo()[0].topY;
  levelInfo().forEach((lv) => {
    const supportBaseY = lv.base ? 0 : lv0Top;
    buildDeckLevel(worldGroup, lv.poly, lv.topY, plankMat, fasciaMat, woodMat, supportBaseY);

    if (lv.base && state.stairsEdge != null)
      buildStairs(worldGroup, lv.poly, state.stairsEdge, lv.topY, plankMat, woodMat);

    if (state.step === "railing") {
      const opts = lv.base
        ? { disabled: new Set(state.disabledEdges), openingFor: openingForEdge }
        : { disabled: new Set(), openingFor: () => null };
      buildPerimeterRailing(worldGroup, lv.poly, lv.topY, state, opts);
    }
    topY = lv.topY;
  });

  if (state.step === "railing") buildEdgeSelectors(levelInfo()[0].poly, levelInfo()[0].topY);
  if (state.step === "shape")   buildResizeHandles(levelInfo()[0].poly, levelInfo()[0].topY);

  scene.add(worldGroup);
  if (controls) controls.target.set(0, topY*0.6+0.2, 0);
  updateBadge();
}

function buildDeckLevel(parent, poly, topY, plankMat, fasciaMat, woodMat, supportBaseY) {
  const shape = new THREE.Shape();
  poly.forEach(([x,z],i)=>{ const X=x*FT,Z=z*FT; i?shape.lineTo(X,Z):shape.moveTo(X,Z); });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape,{ depth:SLAB, bevelEnabled:false });
  geo.rotateX(-Math.PI/2); geo.computeBoundingBox(); geo.translate(0, topY-geo.boundingBox.max.y, 0);
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
function buildStairs(parent, poly, edgeIdx, topY, plankMat, woodMat) {
  const a=poly[edgeIdx], b=poly[(edgeIdx+1)%poly.length];
  const ax=a[0]*FT, az=a[1]*FT, bx=b[0]*FT, bz=b[1]*FT;
  const mx=(ax+bx)/2, mz=(az+bz)/2, A=Math.atan2(bz-az,bx-ax);
  const C=centroid(poly), cx=C[0]*FT, cz=C[1]*FT;

  const nSteps=Math.max(1,Math.ceil(topY/RISER));
  const g=new THREE.Group(); g.position.set(mx,0,mz); g.rotation.y=-A;   // local +x along edge, local +z perpendicular
  for (let k=1;k<=nSteps;k++){
    const ty=topY-k*RISER, dz=k*TREAD;
    const tread=new THREE.Mesh(new THREE.BoxGeometry(STAIR_W,0.06,TREAD+0.02), plankMat);
    tread.position.set(0, ty-0.03, dz); tread.castShadow=true; tread.receiveShadow=true; g.add(tread);
    const riser=new THREE.Mesh(new THREE.BoxGeometry(STAIR_W,RISER,0.03), woodMat);
    riser.position.set(0, ty-RISER/2, dz-TREAD/2); g.add(riser);
  }
  for (const sx of [-STAIR_W/2-0.03, STAIR_W/2+0.03]) {
    const len=Math.hypot(nSteps*TREAD, topY);
    const str=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.12,len), woodMat);
    str.position.set(sx, topY/2-0.06, nSteps*TREAD/2); str.rotation.x=Math.atan2(topY,nSteps*TREAD); g.add(str);
  }
  // ensure local +z points outward (away from deck centroid); flip 180° if not
  const test=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), g.rotation.y);
  if ((mx+test.x-cx)**2+(mz+test.z-cz)**2 < (mx-cx)**2+(mz-cz)**2) g.rotation.y=-A+Math.PI;
  parent.add(g);
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
  const postW=POST_SIZES[s.postSize].w*(s.product==="commercial"?1.12:1);
  const mats={ metal, glassMat, cableMat };

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

  // posts at each boundary except the far corner (L) which the neighbor edge draws
  for (const x of bnds) {
    if (Math.abs(x-L)<1e-4) continue;
    addBox(postW,RAILH,postW,x,RAILH/2,0,mats.metal);
    addBox(postW*1.25,0.03,postW*1.25,x,RAILH+0.015,0,mats.metal);
  }

  const topProfileH=0.06*weight;
  const isGap=(b0,b1)=> gap && Math.abs(b0-gap[0])<1e-3 && Math.abs(b1-gap[1])<1e-3;
  const yBot=0.115, yTop=RAILH-0.06;
  for (let i=0;i<bnds.length-1;i++){
    const b0=bnds[i], b1=bnds[i+1]; if (isGap(b0,b1)) continue;
    const segLen=b1-b0, mid=(b0+b1)/2;
    if (s.topRail==="round"){ const r=0.04*weight; const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,segLen,16),mats.metal); m.rotation.z=Math.PI/2; m.position.set(mid,RAILH,0); m.castShadow=true; seg.add(m); }
    else addBox(segLen,topProfileH,0.07*weight,mid,RAILH-topProfileH/2+0.04,0,mats.metal);
    addBox(segLen,0.05*weight,0.06*weight,mid,0.09,0,mats.metal);
    buildInfill(seg, s.infill, b0+postW/2, b1-postW/2, yBot, yTop, mats, addBox);
  }

  if (gap && opening.gate) buildGate(seg, gap[0], gap[1], s, mats, addBox);
  parent.add(seg);
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
  for (let i=0;i<poly.length;i++){
    const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length];
    const AX=ax*FT,AZ=az*FT,BX=bx*FT,BZ=bz*FT, L=Math.hypot(BX-AX,BZ-AZ), A=Math.atan2(BZ-AZ,BX-AX);
    const on=!state.disabledEdges.includes(i);
    const mat=new THREE.MeshBasicMaterial({ color: on?0x2f7fd6:0xe0a020, transparent:true, opacity:0.16, depthWrite:false });
    const m=new THREE.Mesh(new THREE.BoxGeometry(L-0.04,0.05,0.22), mat);
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
    down={x:e.clientX,y:e.clientY};
  });

  el.addEventListener("pointermove", e=>{
    if (dragging){ doResize(e); return; }
    if (state.step==="shape"){
      const h=pickHandle(e);
      if (hoverHandle && hoverHandle!==h) hoverHandle.scale.setScalar(1);
      if (h){ h.scale.setScalar(1.3); hoverHandle=h; el.style.cursor="grab"; } else { hoverHandle=null; el.style.cursor=""; }
      return;
    }
    if (state.step!=="railing"){ if(hoveredSel){hoveredSel.material.opacity=0.16;hoveredSel=null;} el.style.cursor=""; return; }
    const idx=pickEdgeMesh(e);
    if (hoveredSel && hoveredSel!==idx){ hoveredSel.material.opacity=0.16; hoveredSel=null; }
    if (idx){ idx.material.opacity=0.42; hoveredSel=idx; el.style.cursor="pointer"; } else el.style.cursor="";
  });

  el.addEventListener("pointerup", e=>{
    if (dragging){ undoStack.push(dragging.start); redoStack.length=0; dragging=null; controls.enabled=true; el.style.cursor=""; renderUI(); return; }
    if (!down) return; const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y); down=null;
    if (moved>6 || state.step!=="railing") return;
    const hit=pickEdge(e); if (hit==null) return;
    commit(()=>{ const s=new Set(state.disabledEdges); s.has(hit)?s.delete(hit):s.add(hit); state.disabledEdges=[...s]; });
  });
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
  el.textContent = state.step==="railing"
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
  document.getElementById("deckingOptions").innerHTML = Object.entries(DECKING).map(([k,v])=>
    `<button class="swatch" data-key="decking" data-val="${k}" data-label="${v.name}" style="background:linear-gradient(145deg, ${shade(v.base,0.18)}, ${shade(v.base,-0.18)})"></button>`).join("");
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
}

function renderUI() {
  document.getElementById("stepShape").hidden = state.step!=="shape";
  document.getElementById("stepRailing").hidden = state.step!=="railing";
  document.querySelectorAll(".step").forEach(b=>b.classList.toggle("active", b.dataset.step===state.step));
  document.querySelectorAll("[data-key]").forEach(el=>el.classList.toggle("active", state[el.dataset.key]===el.dataset.val));
  document.querySelectorAll('[data-key="shape"]').forEach(el=>el.classList.toggle("active", state.levels[0].shape===el.dataset.val));

  const ph=document.getElementById("productHint"); if(ph) ph.textContent=PRODUCTS[state.product].hint;
  const ch=document.getElementById("colorHint"); if(ch) ch.textContent=`${FINISHES[state.color].name} — architectural-grade powder coat.`;

  setSlider("heightSlider","heightVal",state.heightIn,ftIn(state.heightIn));
  setSlider("widthSlider","widthVal",state.size.w,`${state.size.w}'`);
  setSlider("depthSlider","depthVal",state.size.d,`${state.size.d}'`);

  document.getElementById("addLevelBtn").hidden=!!state.levels[1];
  document.getElementById("removeLevelBtn").hidden=!state.levels[1];

  const sb=document.getElementById("stairsBtn"), srb=document.getElementById("stairsRotBtn");
  if (state.stairsEdge!=null){ sb.textContent="✓ Stairs added"; sb.classList.add("active"); srb.hidden=false; }
  else { sb.textContent="▦ Add stairs"; sb.classList.remove("active"); srb.hidden=true; }
  const gb=document.getElementById("gateBtn");
  gb.textContent = state.gate ? "✓ Gate added" : "⊏ Add a gate"; gb.classList.toggle("active", state.gate);

  const next=document.getElementById("nextBtn"), back=document.getElementById("backBtn");
  if (state.step==="shape"){ next.textContent="Next step: Railing ▶"; back.hidden=true; }
  else { next.textContent="Request a Quote ▶"; back.hidden=false; }

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
    ["Decking", DECKING[state.decking].name],
    ["Stairs", state.stairsEdge!=null?"Yes":"No"],
  ];
  if (state.step==="railing") rows.push(
    ["Railing", PRODUCTS[state.product].name],
    ["Infill", INFILLS[state.infill].name],
    ["Finish", FINISHES[state.color].name],
    ["Gate", state.gate?"Yes":"No"],
    ["Open sides", state.disabledEdges.length||"0"],
  );
  document.getElementById("summary").innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Your deck</div>`+
    rows.map(([k,v])=>`<div class="row"><span>${k}</span><span>${v}</span></div>`).join("");
}

/* ============================================================
   Events
   ============================================================ */
function registerEvents() {
  document.addEventListener("click", e=>{
    const opt=e.target.closest("[data-key]");
    if (opt){ const key=opt.dataset.key,val=opt.dataset.val;
      commit(()=>{
        if (key==="shape"){ state.levels[0].shape=val; state.disabledEdges=[]; state.stairsEdge=null; state.gate=false; }
        else if (key==="product"){ state.product=val; state.topRail=PRODUCTS[val].defaultTopRail; }
        else state[key]=val;
      }); return;
    }
    const stp=e.target.closest(".step"); if (stp){ commit(()=>state.step=stp.dataset.step); return; }
  });

  document.getElementById("nextBtn").addEventListener("click", e=>{ e.preventDefault();
    if (state.step==="shape") commit(()=>state.step="railing"); else window.alert("Quote request — your configuration is saved in the summary."); });
  document.getElementById("backBtn").addEventListener("click", ()=>commit(()=>state.step="shape"));

  document.getElementById("addLevelBtn").addEventListener("click", ()=>commit(()=>state.levels.push({ shape: state.levels[0].shape })));
  document.getElementById("removeLevelBtn").addEventListener("click", ()=>commit(()=>state.levels.length=1));

  document.getElementById("stairsBtn").addEventListener("click", ()=>commit(()=>{ state.stairsEdge = state.stairsEdge==null ? frontEdge() : null; }));
  document.getElementById("stairsRotBtn").addEventListener("click", ()=>commit(()=>{ const n=basePoly().length; state.stairsEdge=(state.stairsEdge+1)%n; }));
  document.getElementById("gateBtn").addEventListener("click", ()=>commit(()=>state.gate=!state.gate));

  bindRangeHistory("heightSlider", v=>state.heightIn=v);
  bindRangeHistory("widthSlider",  v=>state.size.w=v);
  bindRangeHistory("depthSlider",  v=>state.size.d=v);

  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("redoBtn").addEventListener("click", redo);
  document.getElementById("resetBtn").addEventListener("click", ()=>{ camera.position.set(6.5,5.2,11); controls.target.set(0,0.5,0); });
  document.getElementById("autorotBtn").addEventListener("click", e=>{ controls.autoRotate=!controls.autoRotate; e.currentTarget.classList.toggle("active",controls.autoRotate); });
  document.getElementById("downloadBtn").addEventListener("click", ()=>{ renderer.render(scene,camera); const a=document.createElement("a"); a.download="kadenz-deck.png"; a.href=renderer.domElement.toDataURL("image/png"); a.click(); });
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
