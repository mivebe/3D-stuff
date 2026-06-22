# Bedroom - TODO

Open work items for the bedroom slice. The bedroom is now part of the assembled apartment:
its collection in resources/cad-source/apartment-assembled.blend is exported to
public/models/bedroom.glb (built-in carpentry + bed + table) and loaded at identity in its
real world position. The old code-side docking + procedural envelope (Room.setBedroom /
buildBedroomEnvelope) is gone; the bedroom's walls are the shared Walls shell from the blend.

## Walkability (Blender)

- [x] Door opening cut: the Leaf_Bedroom doorway is now a boolean hole in the wall
      (DoorHole_Bedroom) with a deepened frame; you can walk in from the hallway.

## Furniture

- [ ] The bed and table are simple blocks. Replace them with the detailed models if wanted:
      bed.blend and board_game_table.blend (separate CAD files in resources/cad-source/bedroom).
      Import into the Bedroom collection, place over the existing footprints, re-export. (Blender)
- [ ] Tone down the bed mattress: BR_bedding is a bright off-white and reads hot under fill
      light. Darken it or add a duvet/pillow material. (Blender palette)

## Interactivity

- [ ] Wardrobe / cabinet doors are not modelled as openable (only handles, no separate door
      panels). Add door leaves + hinge them like the living-room cabinets (Room.registerDoor)
      if we want them to open. (Blender + code)
- [ ] About-me / project hotspot inside the bedroom (diegetic DOM panel via experience.panel,
      same pattern as Room.setInfo on pc_plate_1/2). (code)

## Shell + lighting

- [ ] No window: the real bedroom has one; add a window opening + a real Blender light on a
      free wall. (Blender)
- [ ] No real lights in the blend yet; the bedroom reads only off Environment.js. Add proper
      fixtures (ceiling lamp mesh + light) and tune. (Blender + code)
