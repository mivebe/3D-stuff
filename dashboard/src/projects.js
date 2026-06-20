// single source of truth for the dashboard.
// the app uses id/title/blurb/category to list + iframe each project;
// scripts/build-projects.mjs uses source/tool to build each one into
// public/projects/<id>/ so the dashboard can embed it.
export const projects = [
  {
    id: 'fps-controls',
    title: 'FPS Controls',
    blurb: 'Pointer-lock first-person movement with jump, sprint and obstacle collision.',
    category: 'R3F',
    source: '../react-three-fiber/fps-controls',
    tool: 'vite',
  },
  {
    id: 'character-controller',
    title: 'Character Controller',
    blurb: 'Third-person locomotion with a crossfaded idle / walk / run state machine.',
    category: 'R3F',
    source: '../react-three-fiber/character-controller',
    tool: 'vite',
  },
  {
    id: 'animation-blending',
    title: 'Animation Blending',
    blurb: 'Crossfade locomotion and layer additive pose animations with live weights.',
    category: 'R3F',
    source: '../react-three-fiber/animation-blending',
    tool: 'vite',
  },
  {
    id: 'kinetic-type',
    title: 'Kinetic Typography',
    blurb: 'Live text mapped onto 3D geometry with a scrolling, rippling GLSL shader.',
    category: 'R3F',
    source: '../react-three-fiber/kinetic-type',
    tool: 'vite',
  },
  {
    id: 'minecraft-chest',
    title: 'Minecraft Chest',
    blurb: 'Click the chest to open it; rearrange a draggable Minecraft-style inventory.',
    category: 'R3F',
    source: '../react-three-fiber/minecraft-chest',
    tool: 'vite',
  },
  {
    id: 'chair-shop',
    title: 'Chair Shop',
    blurb: 'Scroll-driven product showcase: rotating chairs with synced color transitions.',
    category: 'R3F',
    source: '../react-three-fiber/chair-shop',
    tool: 'vite',
  },
  {
    id: 'minecraft-clone',
    title: 'Minecraft Clone',
    blurb: 'Voxel world with chunked terrain, an atlas shader, block editing and persistence.',
    category: 'three.js',
    source: '../threejs/minecraft-clone',
    tool: 'vite',
  },
  {
    id: 'phone-rotation',
    title: 'Luxury Phone Showcase',
    blurb: 'A 3D luxury-phone storefront: GSAP intro, on-glass UI load, live finishes and constrained orbit.',
    category: 'R3F',
    source: '../react-three-fiber/phone-rotation',
    tool: 'vite',
  },
]

export function getProject(id) {
  return projects.find((p) => p.id === id)
}
