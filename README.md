# Kadenz 3D Deck Railing Visualizer (Replica)

An interactive **3D deck designer** modeled on the
[Kadenz Aluminum Railings Deck Visualizer](https://kadenzrailing.com/visualizer/).
Like the real tool, it's a two-step flow in a studio grid environment:

1. **Shape** — pick a deck footprint (Square, Notched, L-Shaped, T-Shaped), set the
   **height** with the slider, choose a decking color, and **add a second level**.
2. **Railing** — wrap the deck perimeter with a Kadenz aluminum railing and configure
   the line, infill, finish, top rail and posts.

Everything is **built procedurally in Three.js** from your selections — drag to orbit,
scroll to zoom — with real lighting, soft shadows, and **Undo/Redo**.

## Features

- **Studio environment** — gridded floor fading to a soft horizon (fog), like the original tool
- **Deck shapes** — Square, Notched, two L-Shapes and a T-Shape, built as extruded footprint polygons with composite-board decking + fascia + support posts
- **Resizable footprint** — **drag the gold handles** on the deck edges in the 3D view to resize it (or use the Width/Depth sliders); 8–36' × 8–28'
- **Height slider** — 1'–8' elevation with a live feet/inches readout, plus **Undo/Redo**
- **Stairs** — add a staircase (treads, risers, stringers) descending from any deck edge; move it around the perimeter
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

This is a demonstration replica. The original Kadenz visualizer is powered by a
third-party photo-compositing service; this build reproduces the *experience*
(configure → live 3D preview → save/quote) with original Three.js rendering rather
than proprietary product imagery. **Kadenz®** is a trademark of its respective owner.
