import { blocks } from '../blocks';

export const sixDirections = [
  { x: -1, y: 0, z: 0 }, // left
  { x: 1, y: 0, z: 0 }, // right
  { x: 0, y: 0, z: -1 }, // backward
  { x: 0, y: 0, z: 1 }, // forward
  { x: 0, y: 1, z: 0 }, // up
  { x: 0, y: -1, z: 0 }, // down
];

export const blockFaceTextures = {
  [blocks.bedrock.id]: { top: 'bedrock.png', bottom: 'bedrock.png', side: 'bedrock.png' },
  [blocks.stone.id]: { top: 'stone.png', bottom: 'stone.png', side: 'stone.png' },
  [blocks.dirt.id]: { top: 'dirt_block.png', bottom: 'dirt_block.png', side: 'dirt_block.png' },
  [blocks.grass.id]: {
    top: 'grass_block_top.png',
    bottom: 'dirt_block.png',
    side: 'grass_block_side.png',
  },
  [blocks.coal.id]: { top: 'coal_ore.png', bottom: 'coal_ore.png', side: 'coal_ore.png' },
  [blocks.iron.id]: { top: 'iron_ore.png', bottom: 'iron_ore.png', side: 'iron_ore.png' },
  [blocks.gold.id]: { top: 'gold_ore.png', bottom: 'gold_ore.png', side: 'gold_ore.png' },
  [blocks.diamond.id]: {
    top: 'diamond_ore.png',
    bottom: 'diamond_ore.png',
    side: 'diamond_ore.png',
  },
};

export const vertexShader = `
      attribute float blockType;
      varying float vBlockType;
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vBlockType = blockType;
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `;

export const fragmentShader = `
      uniform sampler2D atlas;
      uniform vec4 faceUVs[16]; // up to 16 block types
      varying float vBlockType;
      varying vec3 vPosition;
      varying vec3 vNormal;

      // Helper to select face index: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
      int getFaceIndex(vec3 normal) {
        if (normal.x > 0.5) return 0;
        if (normal.x < -0.5) return 1;
        if (normal.y > 0.5) return 2;
        if (normal.y < -0.5) return 3;
        if (normal.z > 0.5) return 4;
        return 5;
      }

      void main() {
        int blockIdx = int(vBlockType);
        int faceIdx = getFaceIndex(vNormal);
        vec4 uvRect;

        // For simplicity, use same UV for all faces except top/bottom
        if (faceIdx == 2) {
          uvRect = faceUVs[blockIdx * 3 + 0]; // top
        } else if (faceIdx == 3) {
          uvRect = faceUVs[blockIdx * 3 + 1]; // bottom
        } else {
          uvRect = faceUVs[blockIdx * 3 + 2]; // side
        }

        // Map local position to [0,1] on face
        vec2 uv = vec2(0.0);
        if (faceIdx == 2 || faceIdx == 3) {
          uv = vPosition.xz + 0.5;
        } else if (faceIdx == 0 || faceIdx == 1) {
          uv = vPosition.zy + 0.5;
        } else {
          uv = vPosition.xy + 0.5;
        }

        vec2 atlasUV = uvRect.xy + uv * (uvRect.zw - uvRect.xy);
        gl_FragColor = texture2D(atlas, atlasUV);
      }
    `;
