# Kitchen - TODO

Open work items for the kitchen slice. The kitchen is now part of the assembled apartment:
its collection in resources/cad-source/apartment-assembled.blend is exported to
public/models/kitchen.glb (cabinetry + appliances, kept at full fidelity) and loaded at
identity in its real world position. The old code-side docking + procedural envelope
(Room.setKitchen / buildKitchenEnvelope) is gone; the kitchen's walls are the shared Walls
shell from the blend.

## Walkability + envelope (Blender)

- [x] Door opening cut: the Leaf_Kitchen doorway is now a boolean hole in the wall
      (DoorHole_Kitchen) with a deepened frame; you can walk in from the hallway.
- [ ] No floor mesh: the kitchen collection ships cabinetry/appliances only, and the Walls
      shell has no floor slab under the kitchen. Add a kitchen floor in Blender (tile or wood
      to match the reference photos in resources/cad-source/kitchen/reference). The player
      eye height is forced to the global floorY regardless, so this is a visual gap only.
- [ ] Spatial layout: earlier the kitchen overlapped the bedroom corner. Now that placement
      lives in the blend, confirm the kitchen footprint and the bedroom wall don't intersect
      and adjust in Blender if needed.

## Lighting + interactivity

- [ ] No real lights in the blend yet; the kitchen reads only off Environment.js. Add real
      under-cabinet / ceiling lights as Blender light objects (the source has led-strip notes
      in resources/cad-source/kitchen/old led_*). (Blender + code tuning)
- [ ] Cabinet doors (moduleL_door_*, module-*_door_*, drawer faces) are static. The blend
      kept their names; hinge a few as openable like the living-room cabinets
      (Room.registerDoor) if wanted. (code)
- [ ] Appliance interactivity (cooktop glow, open the oven) if we want hotspots. (code)

## Performance / cleanup

- [ ] kitchen.glb is ~1MB (textured, not Draco). Re-export with Draco + resized textures if
      load size matters. (Blender export settings)
- [ ] The ~120 cabinetry meshes each become a collider once reachable. Merge into a few
      coarse AABBs (counter run, appliance run) if collider count becomes a concern. (code)
