# Twans Railz — 3D Deck Visualizer

An interactive **3D deck designer** for **Twans Railz** aluminum railings and
**DUXXBAK® Composite Decking** (AmeriLux International). It's a multi-step flow in a
studio grid environment:

1. **Shape** — pick a deck footprint, drag-resize it, set height, add levels
2. **Decking** — DUXXBAK® board profile, color, finish, length, direction & fascia
3. **Railing** — wrap the perimeter; line, infill, finish, top rail, post style & caps; click edges to open sides; gate
4. **Stairs** — add a staircase (move it around the perimeter), optional landing **platform**, step-board & riser colors
5. **Walls** — add an attached/detached house wall with cladding (incl. brick), **doors** and **windows**
6. **Furniture** — drop a table & chairs, lounge, planter, grill or umbrella onto the deck

Each step **adds to** the previous, so by the end you see the whole build at once.

Everything is **built procedurally in Three.js** from your selections — drag to orbit,
scroll to zoom — with real lighting, soft shadows, and **Undo/Redo**.

## Features

- **Studio environment** — gridded floor fading to a soft horizon (fog), like the original tool
- **Deck shapes** — Square, Notched, two L-Shapes and a T-Shape, built as extruded footprint polygons with composite-board decking + fascia + support posts
- **Resizable footprint** — **drag the gold handles** on the deck edges in the 3D view to resize it (or use the Width/Depth sliders); 8–36' × 8–28'
- **On-canvas dimension labels** — every deck edge shows its live length (ft/in) projected onto the 3D view, updating as you resize
- **DUXXBAK® Composite Decking** (AmeriLux International) — real product line: 5 board **profiles** (DuxxBak Dekk, OPTIMA Dekk/LT, I.Dekk/HD), 7 **colors** (Island Mist, Rainier, Carmel, Biscayne, Jasper, Salt Flat, Hatteras), **ArmorCap/Traction** finishes, board length and direction, plus fascia color
- **Quote flow** — "Get a Quote" opens a form where a customer enters their details and receives a prepared quote: the full design + DUXXBAK selections + estimated deck area, board count, railing length and post count; emailable (mailto) and downloadable
- **Post style** — Post-to-Post vs Over-the-Post (continuous top rail over the posts)
- **Post caps** — Standard, Ornamental (pyramid), Ball, Halo (LV) and Solar — the lighted caps glow (emissive)
- **Height slider** — 1'–8' elevation with a live feet/inches readout, plus **Undo/Redo**
- **Stairs** — staircase (treads, risers, stringers) descending from any deck edge; move it around the perimeter; optional landing **platform**; step-board & riser color pickers
- **Walls** — attached/detached house wall with cladding (Red/Blue/Green/White/Brown/Yellow/Gray/Belmont brick) and adjustable **door**/**window** counts
- **Furniture** — table & chairs, lounge, planter, grill, umbrella; **drag any item in the 3D view to reposition it**
- **Wall edge** — click a deck edge (or Move wall) to choose which side the house wall sits on
- **Night mode** — 🌙 toggle dims the scene and the Solar/Halo caps cast real warm point-light pools, with a bloom glow you tune live via the **Glow** slider (WebGL2)
- **Auto-fit camera** — frames the whole deck on load and when shape/levels change; Fit view re-frames any time
- **Per-edge railing toggle** — **click an edge in the 3D view** to add/remove railing on just that side (e.g. leave the house side open)
- **Gate** — drop an openable gate section (frame + handle) into the railing, at the stairs/front edge
- **Levels** — add a stacked second tier that rests on the base deck
- **Decking colors** — Driftwood, Cedar, Walnut, Mahogany, Slate
- **Railing lines** — Classic, Elegance, Commercial (profile weight + default top rail)
- **Infill styles** — Picket, tempered **Glass** (with spigots), horizontal **Cable** — generated per bay around the whole perimeter
- **Finishes** — Matte Black, White, Bronze, Sandstone powder-coat materials
- **Top rail profiles** (flat / crowned) and **post sizes/spacing**
- **Upload a backdrop photo**, **Save view** (PNG), **auto-rotate**, reset camera, and a live summary

## Run it

No build step — it's a static site, and Three.js is vendored locally in `vendor/`
(loaded via an `<script type="importmap">`), so it works fully offline.

```bash
npm start          # serves on http://localhost:5173
# or
python3 -m http.server 5173
```

Then open <http://localhost:5173>. (Requires a WebGL-capable browser.)

## How it works

- `index.html` — layout + importmap mapping `three` / `three/addons/` to `./vendor/`
- `styles.css` — dark, brand-styled UI; the stage hosts the WebGL canvas
- `app.js` (ES module)
  - `initThree()` — renderer, camera, `OrbitControls`, lights, fog, grid floor, render loop
  - `SHAPES` — deck footprints as polygons; `buildDeckLevel()` extrudes the slab, textures the
    boards and drops support posts at corners/edges
  - `levelInfo()` / `rebuildScene()` — resolves levels + heights and rebuilds deck and railing
  - `buildPerimeterRailing()` — walks each polygon edge and calls `buildRailingEdge()` /
    `buildInfill()` to generate posts, rails and picket/glass/cable infill around the deck
  - state + history: `commit()`, `undo()`, `redo()` snapshot the full design
  - `buildStaticUI()` / `renderUI()` — wires the stepper, shape grid, swatches and HUD

`buildPerimeterRailing()` is exported and has no DOM/WebGL dependencies, so the scene graph
can be unit-tested in Node (it builds the same meshes the browser renders).

## Vendored dependency

[`three@0.160.0`](https://threejs.org/) is committed under `vendor/` so the site needs no
network or install to run. `npm install` only pulls `three` for the optional Node-side
geometry tests.

## Notes

This is a demonstration build. The deck and railings are rendered procedurally with
original Three.js geometry (no proprietary product imagery). **DUXXBAK®** is a
trademark of AmeriLux International; on-screen colors are approximations — request a
quote for physical samples and exact pricing.
