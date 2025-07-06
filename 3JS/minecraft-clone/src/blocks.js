// https://github.com/Mojang/bedrock-samples

import { DEF_HEIGHT } from './config';

const RESOURCE_TYPES = {
  CLUSTER: 'cluster',
  VEIN: 'vein',
};

export const blocks = {
  resourceFlag: {
    id: -1,
    name: 'resourceFlag',
    color: 0x800080,
  },
  bedrock: {
    id: 9999,
    name: 'bedrock',
    color: 0xd3d3d3,
  },
  air: {
    id: 0,
    name: 'air',
  },
  grass: {
    id: 1,
    name: 'grass',
    color: 0x559020,
  },
  dirt: {
    id: 2,
    name: 'dirt',
    color: 0x807020,
  },
  stone: {
    id: 3,
    name: 'stone',
    color: 0x808080,
  },
  coal: {
    id: 4,
    name: 'coal',
    color: 0x000000,
    resource: {
      type: RESOURCE_TYPES.CLUSTER,
      clusterSize: { cx: 30, cy: 30, cz: 30 },
      clusterDensity: 0.6,
      abundance: 0.5,
      constraints: { minHeight: 3 },
    },
  },
  iron: {
    id: 5,
    name: 'iron',
    color: 0xd8af93,
    resource: {
      type: RESOURCE_TYPES.VEIN,
      min: 3,
      max: 6,
      abundance: 0.5,
      constraints: { minHeight: 3 },
    },
  },
  gold: {
    id: 6,
    name: 'gold',
    color: 0xffd700,
    resource: {
      type: RESOURCE_TYPES.CLUSTER,
      clusterSize: { cx: 5, cy: 4, cz: 4 },
      clusterDensity: 0.2,
      abundance: 0.5,
      constraints: { minHeight: 2, minDepth: 3 },
    },
  },
  diamond: {
    id: 7,
    name: 'diamond',
    color: 0x00ccc0,
    resource: {
      type: RESOURCE_TYPES.CLUSTER,
      clusterSize: { cx: 20, cy: 20, cz: 20 },
      clusterDensity: 0.05,
      abundance: 0.1,
      constraints: { minDepth: 5 },
    },
  },
};

export const blocksById = Object.fromEntries(
  Object.entries(blocks).map(([key, value]) => [value.id, value])
);
export const blocksByName = Object.fromEntries(
  Object.entries(blocks).map(([key, value]) => [value.name, value])
);
export const blocksList = Object.values(blocks);
export const resourcesList = Object.values(blocks).filter((b) => b.resource);
