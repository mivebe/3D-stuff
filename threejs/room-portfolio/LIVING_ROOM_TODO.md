# Living room - TODO

Open work items for the living-room slice. Mix of Blender (asset) and three.js (code) tasks.

## Pipeline (updated 2026-06-22)

The whole apartment is now assembled in resources/cad-source/apartment-assembled.blend
(collections: Walls, LivingRoom, Hallway, Kitchen, Bathroom, Balcony, Bedroom). Each
collection is exported to its own glb in public/models with world transforms baked in, so
every room loads at identity and reassembles into one world space. That retired the old
code-side joining, the procedural room envelopes, and the procedural Shell (Shell.js is
deleted). Room.js now just adds the rooms, wires interaction onto the named objects, and
builds colliders from the real geometry. Re-export with dashboard/scripts (or by hand from
Blender) whenever the blend changes; verify with dashboard/scripts/verify-apartment.mjs.

## Doorway openings (done 2026-06-22)

- [x] All five doorways (LivingRoom, Bathroom, Exit, Bedroom, Kitchen) are cut as editable
      boolean holes in the wall slabs: each wall has a DoorHole_<room> BOOLEAN modifier with a
      DoorCut_<room> cutter object (DoorCutters collection, not exported). The Frame_<room>
      rings were deepened to span the wall thickness so they line the cut. Walls must be
      exported with export_apply=True so the booleans bake. Collision opens through the holes
      via Room.pushWallColliders (carves the wall AABB around each Leaf_ opening).
- [ ] Resize a doorway by moving/scaling its DoorCut_<room> cutter in Blender, then re-export
      walls. (Blender)

## Walls / ceiling (Blender)

- [x] Walls were rendering black (no material -> glTF default is metalness=1 = black with no
      env map). Assigned a WallPaint material (light grey, non-metallic, double-sided) to all
      12 wall cubes.
- [ ] No ceiling: the shell is open at the top (you see black void looking straight up). Add a
      ceiling slab to the Walls collection if wanted, and re-export. (Blender)

## Lighting (re-add in Blender)

- [ ] The procedural LED strip, the interactive glass light switch, and the window +
      daylight panel were dropped (they were bolted onto the old code Shell). Re-add as real
      Blender objects: led strip geometry, a switch mesh, a window opening in the LivingRoom
      wall + a real light. Scene lighting is currently just Environment.js (ambient + hemi +
      sun). (Blender; switch interactivity then re-wired in code)

## Doors (top_module)

- [ ] Upper doors should open VERTICALLY, not horizontally like now. Current wiring hinges
      them about local-Y (sideways swing); switch the hinge to the horizontal top/bottom edge
      so they flap up/down. (code: Room.setLivingRoomDoors axis, plus confirm the modeled
      hinge edge)
- [ ] Each upper door should also cover half of the side panel on each side, so the closed
      doors form one continuous flat surface. Widen / reposition each door panel to overlap
      half of the adjacent side panels. (Blender: door geometry + origin/hinge update,
      re-export)

## top_module structure

- [ ] Reconfigure the end section of the top_module on BOTH sides to account for a beam that
      exists in the real room but is not on the drawing. (Blender: remodel the two end
      sections around the beam, re-export)

## Room

- [x] Entrance door + corridor: handled by the assembled blend. The hallway (with all five
      Leaf_* doors and the porte-manteau) sits in place next to the living room; once the
      doorway holes are cut (see above) you walk straight through.
