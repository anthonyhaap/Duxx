# Kadenz 3D Deck Railing Visualizer (Replica)

An interactive **3D** deck-railing visualizer inspired by the
[Kadenz Aluminum Railings Deck Visualizer](https://kadenzrailing.com/visualizer/).
Design an aluminum railing and **orbit around it in real time** on a styled, elevated
deck — drag to rotate, scroll to zoom.

The railing is **built procedurally in Three.js** from your selections (no pre-baked
product photos), so every combination of line, infill, finish, top rail and post size
produces a fresh 3D model with real lighting and shadows.

## Features

- **Real 3D scene** — Three.js (WebGL) with orbit controls, soft shadows, hemisphere + sun lighting
- **Railing lines** — Kadenz Classic, Elegance, Commercial (each changes profile weight & default top rail)
- **Infill styles** — Picket balusters, tempered **Glass** panels (with standoff spigots), horizontal **Cable** runs
- **Finishes** — Matte Black, Bright White, Bronze, Sandstone (powder-coat aluminum materials)
- **Top rail profiles** — Flat (square box) and Crowned (rounded cylinder)
- **Posts & spacing** — 2", 2½", 3½" post sizes; post-to-post or continuous-span layouts
- **Scene presets** — Backyard, Lakeside, Patio, Twilight — each sets sky gradient, ground color and light mood
- **Upload a backdrop photo** — used as the scene background behind the railing
- **Save view** — exports the current camera angle to a PNG
- **Auto-rotate**, **reset camera**, and a live configuration summary + quote CTA

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
  - `initThree()` — renderer, camera, `OrbitControls`, lights, resize handling, render loop
  - `buildDeckAndGround()` — elevated deck slab (procedural plank texture) + ground plane
  - `applyScene()` — sky gradient (canvas texture), ground color and light mood per preset
  - `buildRailing(state)` — posts, top/bottom rails and the chosen top-rail profile
  - `buildInfill()` — picket / glass / cable geometry generated per bay between posts
  - `buildUI()` / `rebuildRailing()` — wires the configurator and rebuilds the model on change

`buildRailing()` is exported and has no DOM/WebGL dependencies, so the scene graph can be
unit-tested in Node (it builds the same meshes the browser renders).

## Vendored dependency

[`three@0.160.0`](https://threejs.org/) is committed under `vendor/` so the site needs no
network or install to run. `npm install` only pulls `three` for the optional Node-side
geometry tests.

## Notes

This is a demonstration replica. The original Kadenz visualizer is powered by a
third-party photo-compositing service; this build reproduces the *experience*
(configure → live 3D preview → save/quote) with original Three.js rendering rather
than proprietary product imagery. **Kadenz®** is a trademark of its respective owner.
