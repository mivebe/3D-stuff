# Living room - TODO

Open work items for the living-room slice. Mix of Blender (asset) and three.js (code) tasks.

## Doors (top_module)

- [ ] Upper doors should open VERTICALLY, not horizontally like now. Current wiring
      hinges them about local-Y (sideways swing); switch the hinge to the horizontal
      top/bottom edge so they flap up/down. (code: Room.js setDoors axis, plus confirm
      the modeled hinge edge)
- [ ] Each upper door should also cover half of the side panel on each side, so the
      closed doors form one continuous flat surface (currently they only span the open
      gap). Widen / reposition each door panel to overlap half of the adjacent side
      panels. (Blender: door geometry + origin/hinge update, re-export)

## top_module structure

- [ ] Reconfigure the end section of the top_module on BOTH sides to account for a beam
      that exists in the real room but is not on the drawing. (Blender: remodel the two
      end sections around the beam, re-export)

## Lighting

- [ ] Add a light strip along the BOTTOM of the walls (LED strip / under-wall glow).
      (code: emissive strip geometry + a soft light along the wall base in Shell.js)
- [ ] Add a light switch (interactive object) that toggles room lighting. (Blender: model
      a switch, or place a simple one; code: register as interactive toggle)

## Room

- [ ] Add a door (the room entrance door). (Blender: model/place a door; code: optional
      open/close interaction, and it becomes the doorway to the next room later)
