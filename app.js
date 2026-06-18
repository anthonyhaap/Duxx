/* ============================================================
   Kadenz Deck Railing Visualizer — replica
   Live SVG railing renderer + scene compositor
   ============================================================ */

const W = 1200, H = 675;

/* ---------- Catalog data ---------- */
const PRODUCTS = {
  classic: {
    name: "Kadenz Classic",
    desc: "Budget-friendly, sturdy and straightforward to install.",
    hint: "The Classic line pairs a clean flat top rail with economical components — a great all-rounder for residential decks.",
    railWeight: 1,        // visual heft multiplier
    defaultTopRail: "flat",
  },
  elegance: {
    name: "Kadenz Elegance",
    desc: "A refined balance of strength, function and aesthetics.",
    hint: "Elegance uses a slimmer profile and an internally-mounted top rail for a sleek, modern silhouette.",
    railWeight: 0.92,
    defaultTopRail: "round",
  },
  commercial: {
    name: "Kadenz Commercial",
    desc: "Independently lab-tested for multi-family & commercial use.",
    hint: "Commercial is the heaviest-duty line, with pre-mounted brackets and reinforced posts for code-driven projects.",
    railWeight: 1.18,
    defaultTopRail: "flat",
  },
};

const INFILLS = {
  picket: { name: "Picket", icon: pickIcon("picket") },
  glass:  { name: "Glass",  icon: pickIcon("glass") },
  cable:  { name: "Cable",  icon: pickIcon("cable") },
};

const FINISHES = {
  black:     { name: "Matte Black", base: "#2a2a2e" },
  white:     { name: "Bright White", base: "#e9ebec" },
  bronze:    { name: "Bronze",      base: "#3b3026" },
  sandstone: { name: "Sandstone",   base: "#b1a07f" },
};

const TOPRAILS = {
  flat:  { name: "Flat",    desc: "Square architectural profile" },
  round: { name: "Crowned", desc: "Premium rounded profile" },
};

const POST_SIZES = {
  "2":   { name: '2"',   w: 16 },
  "2.5": { name: '2½"',  w: 21 },
  "3.5": { name: '3½"',  w: 30 },
};

const SCENES = ["backyard", "lakeside", "patio", "twilight"];
const SCENE_LABEL = { backyard: "Backyard", lakeside: "Lakeside", patio: "Patio", twilight: "Twilight" };

/* ---------- State ---------- */
const state = {
  scene: "backyard",
  custom: null,        // dataURL when user uploads
  product: "classic",
  infill: "picket",
  color: "black",
  topRail: "flat",
  postSize: "2.5",
  spacing: "post",     // 'post' (post-to-post) | 'continuous'
};

/* ---------- Color helpers ---------- */
function hexToRgb(h) {
  h = h.replace("#", "");
  return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function shade(hex, amt) { // amt -1..1
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

/* ============================================================
   Scene backgrounds (stylized SVG)
   ============================================================ */
function sceneSVG(scene) {
  switch (scene) {
    case "lakeside": return `
      <defs>
        <linearGradient id="skyL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd9a0"/><stop offset="0.45" stop-color="#f7b27a"/>
          <stop offset="1" stop-color="#9fc6d8"/>
        </linearGradient>
        <linearGradient id="waterL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#bcd7e0"/><stop offset="1" stop-color="#6f9bb0"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#skyL)"/>
      <circle cx="880" cy="180" r="60" fill="#fff3da" opacity="0.9"/>
      <path d="M0 360 Q300 320 600 350 T1200 345 V470 H0 Z" fill="#5e7d68"/>
      <rect y="430" width="${W}" height="160" fill="url(#waterL)"/>
      ${reflect(870, 460)}
      <rect y="560" width="${W}" height="115" fill="#3a2c20"/>
      ${deckBoards("#5a4633")}`;
    case "patio": return `
      <defs>
        <linearGradient id="skyP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#243245"/><stop offset="1" stop-color="#4a5f73"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#skyP)"/>
      ${cityscape()}
      <rect y="560" width="${W}" height="115" fill="#2b2b2f"/>
      ${deckBoards("#3c3c42")}
      ${stringLights()}`;
    case "twilight": return `
      <defs>
        <linearGradient id="skyT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a2a55"/><stop offset="0.5" stop-color="#a85a7a"/>
          <stop offset="1" stop-color="#f0a868"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#skyT)"/>
      <circle cx="600" cy="300" r="48" fill="#ffe9c4" opacity="0.85"/>
      <path d="M0 420 L240 360 L470 410 L700 350 L960 405 L1200 360 V470 H0 Z" fill="#2f2740" opacity="0.85"/>
      <rect y="560" width="${W}" height="115" fill="#2a2230"/>
      ${deckBoards("#4a3a48")}`;
    case "backyard":
    default: return `
      <defs>
        <linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7db8e8"/><stop offset="1" stop-color="#cfe7f5"/>
        </linearGradient>
        <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7bab55"/><stop offset="1" stop-color="#4f8438"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#skyB)"/>
      ${clouds()}
      ${trees()}
      <rect y="430" width="${W}" height="150" fill="url(#lawn)"/>
      <rect y="560" width="${W}" height="115" fill="#6b4f34"/>
      ${deckBoards("#8a6a45")}`;
  }
}

function deckBoards(color) {
  let b = "";
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * W;
    b += `<line x1="${x}" y1="560" x2="${x}" y2="${H}" stroke="${shade(color, -0.18)}" stroke-width="2" opacity="0.5"/>`;
  }
  return `<rect y="560" width="${W}" height="115" fill="${color}"/>${b}
          <rect y="560" width="${W}" height="6" fill="rgba(255,255,255,0.12)"/>`;
}
function clouds() {
  return `<g fill="#ffffff" opacity="0.85">
    <ellipse cx="220" cy="120" rx="70" ry="26"/><ellipse cx="280" cy="110" rx="55" ry="24"/>
    <ellipse cx="900" cy="90" rx="80" ry="28"/><ellipse cx="970" cy="100" rx="50" ry="22"/></g>`;
}
function trees() {
  let t = "";
  const xs = [60, 150, 1050, 1140, 600];
  for (const x of xs) {
    t += `<ellipse cx="${x}" cy="395" rx="70" ry="80" fill="#3f6e33"/>
          <ellipse cx="${x - 30}" cy="420" rx="55" ry="60" fill="#4d7d3c"/>`;
  }
  return t;
}
function reflect(cx, cy) {
  let r = "";
  for (let i = 0; i < 6; i++) {
    r += `<line x1="${cx - 50}" y1="${cy + i * 18}" x2="${cx + 50}" y2="${cy + i * 18}" stroke="#fff" stroke-width="3" opacity="${0.35 - i * 0.05}"/>`;
  }
  return r;
}
function cityscape() {
  let c = "";
  const blds = [[40, 260], [140, 200], [230, 300], [340, 230], [430, 290], [950, 250], [1040, 310], [1130, 220]];
  for (const [x, h] of blds) {
    c += `<rect x="${x}" y="${560 - h}" width="80" height="${h}" fill="#1d2733"/>`;
    for (let r = 0; r < h - 30; r += 28)
      for (let cc = 0; cc < 3; cc++)
        if (Math.random() > 0.4) c += `<rect x="${x + 10 + cc * 22}" y="${560 - h + 14 + r}" width="11" height="13" fill="#ffd98a" opacity="0.8"/>`;
  }
  return c;
}
function stringLights() {
  let s = `<path d="M0 120 Q300 200 600 130 T1200 150" stroke="#444" stroke-width="2" fill="none"/>`;
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * W, y = 130 + Math.sin(i) * 18 + 30;
    s += `<circle cx="${x}" cy="${y}" r="6" fill="#ffe18a"/><circle cx="${x}" cy="${y}" r="12" fill="#ffe18a" opacity="0.25"/>`;
  }
  return s;
}

/* ============================================================
   Railing renderer
   ============================================================ */
function railingSVG() {
  const finish = FINISHES[state.color];
  const base = finish.base;
  const light = shade(base, 0.28);
  const dark = shade(base, -0.32);
  const isWhite = state.color === "white";
  const stroke = isWhite ? "#c9ced2" : shade(base, -0.5);

  const prod = PRODUCTS[state.product];
  const weight = prod.railWeight;

  // geometry
  const topY = 296;
  const topH = (state.topRail === "round" ? 26 : 22) * weight;
  const bottomY = 470;
  const bottomH = 14 * weight;
  const postW = POST_SIZES[state.postSize].w * (state.product === "commercial" ? 1.12 : 1);
  const postTop = topY - 6;
  const postBottom = 560;

  // gradient defs for the metal
  const defs = `
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.5" stop-color="${base}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="metalH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.5" stop-color="${base}"/>
      <stop offset="1" stop-color="${light}"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#dbeaf0" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#9fc0cf" stop-opacity="0.22"/>
    </linearGradient>`;

  // post positions
  const margin = 60;
  const span = W - margin * 2;
  const sections = state.spacing === "continuous" ? 2 : 3;
  const postXs = [];
  for (let i = 0; i <= sections; i++) postXs.push(margin + (span / sections) * i);

  // ---- infill (drawn behind posts/rails) ----
  let infill = "";
  const inTop = topY + topH, inBot = bottomY;
  for (let s = 0; s < postXs.length - 1; s++) {
    const x0 = postXs[s] + postW / 2, x1 = postXs[s + 1] - postW / 2;
    infill += renderInfill(state.infill, x0, x1, inTop, inBot, { base, light, dark, stroke });
  }

  // ---- bottom rail ----
  let rails = `<rect x="${margin}" y="${bottomY}" width="${span}" height="${bottomH}" rx="2"
                 fill="url(#metalH)" stroke="${stroke}" stroke-width="1"/>`;

  // ---- posts (in front of infill) ----
  let posts = "";
  for (const px of postXs) {
    const x = px - postW / 2;
    posts += `<rect x="${x}" y="${postTop}" width="${postW}" height="${postBottom - postTop}" rx="2"
                fill="url(#metal)" stroke="${stroke}" stroke-width="1"/>
              <rect x="${x}" y="${postTop}" width="${postW * 0.34}" height="${postBottom - postTop}"
                fill="${light}" opacity="0.25"/>`;
    // post cap
    posts += `<rect x="${x - 2}" y="${postTop - 8}" width="${postW + 4}" height="9" rx="2"
                fill="url(#metal)" stroke="${stroke}" stroke-width="1"/>`;
    // base shadow on deck
    posts += `<ellipse cx="${px}" cy="${postBottom + 3}" rx="${postW * 0.9}" ry="5" fill="rgba(0,0,0,0.28)"/>`;
  }

  // ---- top rail ----
  let topRail;
  if (state.topRail === "round") {
    topRail = `<rect x="${margin}" y="${topY}" width="${span}" height="${topH}" rx="${topH / 2}"
                 fill="url(#metal)" stroke="${stroke}" stroke-width="1"/>
               <rect x="${margin + 4}" y="${topY + 2}" width="${span - 8}" height="${topH * 0.32}" rx="${topH * 0.16}"
                 fill="${light}" opacity="0.4"/>`;
  } else {
    topRail = `<rect x="${margin}" y="${topY}" width="${span}" height="${topH}" rx="2"
                 fill="url(#metal)" stroke="${stroke}" stroke-width="1"/>
               <rect x="${margin}" y="${topY}" width="${span}" height="3" fill="${light}" opacity="0.5"/>`;
  }

  // soft contact shadow under the whole railing
  const groundShadow = `<ellipse cx="${W / 2}" cy="566" rx="${span / 2 + 20}" ry="10" fill="rgba(0,0,0,0.22)"/>`;

  return `<defs>${defs}</defs>${groundShadow}${infill}${rails}${topRail}${posts}`;
}

function renderInfill(type, x0, x1, top, bot, c) {
  const wpx = x1 - x0;
  if (type === "glass") {
    let g = `<rect x="${x0}" y="${top}" width="${wpx}" height="${bot - top}" fill="url(#glass)"
               stroke="${shade(c.base, 0.1)}" stroke-width="1.5" rx="2"/>`;
    // diagonal reflections
    g += `<path d="M${x0 + wpx * 0.15} ${bot} L${x0 + wpx * 0.4} ${top}" stroke="#ffffff" stroke-width="6" opacity="0.12"/>`;
    g += `<path d="M${x0 + wpx * 0.45} ${bot} L${x0 + wpx * 0.62} ${top}" stroke="#ffffff" stroke-width="3" opacity="0.1"/>`;
    // standoff spigots
    for (const t of [0.22, 0.78]) {
      g += `<rect x="${x0 + wpx * t - 6}" y="${bot - 6}" width="12" height="14" rx="2" fill="url(#metal)" stroke="${c.stroke}"/>`;
    }
    return g;
  }
  if (type === "cable") {
    let g = "";
    const n = Math.floor((bot - top) / 26);
    for (let i = 1; i <= n; i++) {
      const y = top + (i / (n + 1)) * (bot - top);
      g += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${shade(c.base, 0.15)}" stroke-width="3.2"/>
            <line x1="${x0}" y1="${y - 1}" x2="${x1}" y2="${y - 1}" stroke="${c.light}" stroke-width="1" opacity="0.6"/>`;
    }
    return g;
  }
  // picket (default)
  let g = "";
  const gap = 30, pw = 8;
  const count = Math.max(2, Math.floor(wpx / gap));
  const realGap = wpx / count;
  for (let i = 1; i < count; i++) {
    const x = x0 + i * realGap - pw / 2;
    g += `<rect x="${x}" y="${top}" width="${pw}" height="${bot - top}" rx="1.5"
            fill="url(#metal)" stroke="${c.stroke}" stroke-width="0.6"/>
          <rect x="${x}" y="${top}" width="${pw * 0.4}" height="${bot - top}" fill="${c.light}" opacity="0.3"/>`;
  }
  return g;
}

/* small icons for infill buttons */
function pickIcon(type) {
  if (type === "glass") return `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="1" fill="#bcd6e0" stroke="#7a96a3"/></svg>`;
  if (type === "cable") return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.6"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></g></svg>`;
  return `<svg viewBox="0 0 20 20"><g stroke="#9aa7b6" stroke-width="1.8"><line x1="5" y1="3" x2="5" y2="17"/><line x1="10" y1="3" x2="10" y2="17"/><line x1="15" y1="3" x2="15" y2="17"/></g></svg>`;
}

/* ============================================================
   Render orchestration
   ============================================================ */
const viz = document.getElementById("viz");
const customPhoto = document.getElementById("customPhoto");
const stageBadge = document.getElementById("stageBadge");

function render() {
  const isCustom = !!state.custom;
  customPhoto.hidden = !isCustom;
  if (isCustom) customPhoto.src = state.custom;
  viz.innerHTML = (isCustom ? "" : sceneSVG(state.scene)) + railingSVG();

  stageBadge.textContent =
    `${PRODUCTS[state.product].name} · ${INFILLS[state.infill].name} · ${FINISHES[state.color].name}`;

  renderSummary();
  syncActive();
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

/* ============================================================
   Build configurator UI
   ============================================================ */
function buildUI() {
  // Scenes
  const strip = document.getElementById("sceneStrip");
  strip.innerHTML = SCENES.map(s =>
    `<div class="scene-thumb" data-scene="${s}">
       <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice">${sceneSVG(s)}</svg>
       <span>${SCENE_LABEL[s]}</span>
     </div>`).join("");

  // Products
  document.getElementById("productOptions").innerHTML = Object.entries(PRODUCTS).map(([k, p]) =>
    `<button class="opt" data-key="product" data-val="${k}">
       <span class="opt-name">${p.name}</span>
       <span class="opt-desc">${p.desc}</span>
     </button>`).join("");

  // Infill
  document.getElementById("infillOptions").innerHTML = Object.entries(INFILLS).map(([k, v]) =>
    `<button class="opt" data-key="infill" data-val="${k}">
       <span class="opt-icon">${v.icon}</span>${v.name}
     </button>`).join("");

  // Colors
  document.getElementById("colorOptions").innerHTML = Object.entries(FINISHES).map(([k, v]) =>
    `<button class="swatch" data-key="color" data-val="${k}" data-label="${v.name}"
       style="background:linear-gradient(145deg, ${shade(v.base, 0.25)}, ${shade(v.base, -0.25)})"></button>`).join("");

  // Top rail
  document.getElementById("topRailOptions").innerHTML = Object.entries(TOPRAILS).map(([k, v]) =>
    `<button class="opt" data-key="topRail" data-val="${k}">${v.name} — <span style="color:var(--muted);font-size:11px">${v.desc}</span></button>`).join("");

  // Posts (size + spacing)
  document.getElementById("postOptions").innerHTML =
    `<div style="width:100%;font-size:11px;color:var(--muted);margin-bottom:6px">Post size</div>` +
    Object.entries(POST_SIZES).map(([k, v]) =>
      `<button class="opt" data-key="postSize" data-val="${k}">${v.name}</button>`).join("") +
    `<div style="width:100%;font-size:11px;color:var(--muted);margin:12px 0 6px">Rail style</div>
     <button class="opt" data-key="spacing" data-val="post">Post-to-post</button>
     <button class="opt" data-key="spacing" data-val="continuous">Continuous</button>`;
}

function syncActive() {
  document.querySelectorAll("[data-key]").forEach(el => {
    el.classList.toggle("active", state[el.dataset.key] === el.dataset.val);
  });
  document.querySelectorAll(".scene-thumb").forEach(el => {
    el.classList.toggle("active", !state.custom && state.scene === el.dataset.scene);
  });
  document.getElementById("productHint").textContent = PRODUCTS[state.product].hint;
  document.getElementById("colorHint").textContent =
    `${FINISHES[state.color].name} — architectural-grade powder coat finish.`;
}

/* ============================================================
   Events
   ============================================================ */
document.addEventListener("click", e => {
  const opt = e.target.closest("[data-key]");
  if (opt) {
    const key = opt.dataset.key, val = opt.dataset.val;
    state[key] = val;
    // selecting a product nudges its default top rail (once)
    if (key === "product") state.topRail = PRODUCTS[val].defaultTopRail;
    render();
    return;
  }
  const sc = e.target.closest(".scene-thumb");
  if (sc) {
    state.custom = null;
    state.scene = sc.dataset.scene;
    render();
  }
});

document.getElementById("uploadInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { state.custom = ev.target.result; render(); };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  Object.assign(state, {
    scene: "backyard", custom: null, product: "classic", infill: "picket",
    color: "black", topRail: "flat", postSize: "2.5", spacing: "post",
  });
  document.getElementById("uploadInput").value = "";
  render();
});

document.getElementById("downloadBtn").addEventListener("click", downloadImage);

function downloadImage() {
  // Rasterize the live SVG to PNG (composites the uploaded photo underneath when present)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${viz.innerHTML}</svg>`;
  const img = new Image();
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (state.custom) {
      const bg = new Image();
      bg.onload = () => { ctx.drawImage(bg, 0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); finish(); };
      bg.src = state.custom;
    } else { ctx.drawImage(img, 0, 0, W, H); finish(); }
    function finish() {
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "kadenz-railing-design.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    }
  };
  img.src = url;
}

/* ---------- init ---------- */
buildUI();
render();
