// per-room glbs exported from resources/cad-source/apartment-assembled.blend, one per
// collection with world transforms baked in. each loads at identity and reassembles into
// the same world space (Walls is the shell, the rest are the rooms in place).
export default [
  {
    name: "walls",
    type: "glbModel",
    path: "/models/walls.glb",
  },
  {
    name: "livingRoom",
    type: "glbModel",
    path: "/models/living-room.glb",
  },
  {
    name: "hallway",
    type: "glbModel",
    path: "/models/hallway.glb",
  },
  {
    name: "kitchen",
    type: "glbModel",
    path: "/models/kitchen.glb",
  },
  {
    name: "bedroom",
    type: "glbModel",
    path: "/models/bedroom.glb",
  },
  {
    name: "bathroom",
    type: "glbModel",
    path: "/models/bathroom.glb",
  },
  {
    name: "balcony",
    type: "glbModel",
    path: "/models/balcony.glb",
  },
  {
    name: "tvScreen",
    type: "videoTexture",
    path: "/videos/journey_goty_360p.webm",
  },
];
