# 3D-stuff

A collection of 3D web experiments spanning vanilla three.js scenes, react-three-fiber
apps, and Blender-authored models, gathered under a unified dashboard. The 2D counterpart
lives in [2D-stuff](https://github.com/mivebe/2D-stuff).

## Dashboard

The [dashboard](dashboard/) is the entry point: it lists every project and embeds each one
as an isolated iframe. It is live at
**[mivebe.github.io/3D-stuff](https://mivebe.github.io/3D-stuff/)**.

Build and run it locally:

```
cd dashboard
npm install
npm run build:projects   # build every embedded project into public/projects/<id>/
npm run build            # build the dashboard shell
npm run dev              # work on the dashboard shell
```

## Projects

### three.js

| Project | Description | Tech |
|---|---|---|
| [Minecraft Clone](threejs/minecraft-clone/) | Voxel world with terrain chunked and streamed around the player, one padded texture atlas built from the block PNGs, block place/break persisted as a sparse per-seed diff in localStorage, and walk/fly physics under pointer lock | three.js, Vite, Vitest |
| [Apartment Walkthrough](threejs/room-portfolio/) | My own apartment modeled in Blender and made walkable: pointer-lock WASD with capsule-vs-box collision, doors that swing on their hinges, a TV that plays a video texture and lights the room with it, and info hotspots that open a panel from inside the room | three.js, Blender, GSAP, Vite |
| [Window Universe](threejs/window-universe/) | One field of nodes and beams spread across several browser windows, each drawing the slice it covers based on where its window sits on the desktop. Live movement rides BroadcastChannel; a localStorage roster lets a window opened later join the scene immediately | three.js, BroadcastChannel, Vite |

### react-three-fiber

| Project | Description | Tech |
|---|---|---|
| [Luxury Phone Showcase](react-three-fiber/phone-rotation/) | Storefront for a fictional titanium flagship: GSAP intro timeline, marketing copy that loads onto the phone's own glass, finishes that drive the body material live, constrained orbit, and beauty stills captured headlessly from fixed poses | R3F, drei, GSAP, Vite |
| [Chair Shop](react-three-fiber/chair-shop/) | Scroll-driven store for one tub armchair in three colorways: chair and background transition together as you scroll, with a colorway picker, spec sheet, cart drawer and totals | R3F, drei, Vite |
| [Minecraft Chest](react-three-fiber/minecraft-chest/) | Click the chest to swing its lid open and reveal a Minecraft-style inventory grid whose items drag between slots, lid and inventory driven off one piece of state | R3F, react-spring, Vite |
| [Kinetic Typography](react-three-fiber/kinetic-type/) | Live text drawn to a canvas texture, tiled around swappable geometry, and scrolled and rippled by a custom shader | R3F, GLSL, Vite |
| [Character Controller](react-three-fiber/character-controller/) | Third-person locomotion with a crossfaded idle / walk / run state machine, sprint on shift and a dance on F | R3F, drei, Vite |
| [Animation Blending](react-three-fiber/animation-blending/) | Crossfade locomotion clips and layer additive poses on top of them, with live per-clip weights | R3F, drei, Vite |
| [FPS Controls](react-three-fiber/fps-controls/) | Pointer-lock first-person movement: gravity, jump, sprint and collision against scattered obstacles | R3F, drei, Vite |

## Architecture

Each project is a self-contained npm package that builds to a static `dist/`:

```
npm install
npm run dev     # dev server
npm run build   # static build into dist/
```

Everything bundles with Vite on `base: './'`, so the same build works standalone and
embedded under a subpath. The three.js projects are plain modules with no framework; the
react-three-fiber ones share React 19 with `@react-three/fiber` v9 and `@react-three/drei`
v10, all on the same three.js version.

The dashboard is a Vite + React shell with client-side routing. Project metadata lives in
[`dashboard/src/projects.js`](dashboard/src/projects.js) as the single source of truth:
title, blurb and category drive the card grid and its filters, while `source` and `tool`
tell [`scripts/build-projects.mjs`](dashboard/scripts/build-projects.mjs) what to build.
Each project builds independently into `dashboard/public/projects/<id>/` and is embedded by
id.

Card thumbnails are screenshots of the built projects, generated locally by
[`scripts/thumbnails.mjs`](dashboard/scripts/thumbnails.mjs) (`node scripts/thumbnails.mjs
[id...]`, driving the installed Chrome through puppeteer-core) and committed to the repo.
Projects that need time to settle before the shot declare a `thumbWait`, and one that
cannot be captured meaningfully in a single frame declares a `thumbQuery` to load a
stand-in mode instead.

## Models

Model content is authored in Blender rather than generated at runtime, so every object
stays selectable and editable in the outliner. The apartment is the largest case: it lives
in `threejs/room-portfolio/resources/apartment-assembled.blend` with one collection per
room, and exports to one GLB per collection into `public/models/` with world transforms
baked in. Each GLB loads at identity and the rooms reassemble into the same world space.

## Deployment

Pushing to `master` triggers
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds every project
into `dashboard/public/projects/<id>/`, builds the dashboard shell with
`BASE_PATH=/3D-stuff/`, and publishes `dashboard/dist/` to GitHub Pages. The whole site is
one static bundle with the dashboard at its root, so every project is reachable from it.

## Author

[@mivebe](https://github.com/mivebe)
