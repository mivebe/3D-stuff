// per-room glbs exported from resources/cad-source/apartment-assembled.blend, one per
// collection with world transforms baked in. each loads at identity and reassembles into
// the same world space (Walls is the shell, the rest are the rooms in place).
// paths are prefixed with BASE_URL so they resolve relative to index.html (works both
// standalone and embedded under a subpath in the dashboard iframe).
const base = import.meta.env.BASE_URL;

export default [
  {
    name: "walls",
    type: "glbModel",
    path: `${base}models/walls.glb`,
  },
  {
    name: "livingRoom",
    type: "glbModel",
    path: `${base}models/living-room.glb`,
  },
  {
    name: "hallway",
    type: "glbModel",
    path: `${base}models/hallway.glb`,
  },
  {
    name: "kitchen",
    type: "glbModel",
    path: `${base}models/kitchen.glb`,
  },
  {
    name: "bedroom",
    type: "glbModel",
    path: `${base}models/bedroom.glb`,
  },
  {
    name: "bathroom",
    type: "glbModel",
    path: `${base}models/bathroom.glb`,
  },
  {
    name: "balcony",
    type: "glbModel",
    path: `${base}models/balcony.glb`,
  },
  {
    name: "tvScreen",
    type: "videoTexture",
    path: `${base}videos/journey_goty_360p.webm`,
  },
];
