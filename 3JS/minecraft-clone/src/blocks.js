// https://github.com/Mojang/bedrock-samples

export const blocks = {
  empty: {
    id: 0,
    name: 'empty',
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
    resource: { clusterSize: { cx: 30, cy: 30, cz: 30 }, abundance: 0.5 },
  },
  coal: {
    id: 4,
    name: 'coal',
    color: 0x000000,
    resource: { clusterSize: { cx: 30, cy: 30, cz: 30 }, abundance: 0.5 },
  },
  iron: {
    id: 5,
    name: 'iron',
    color: 0xd8af93,
    resource: { clusterSize: { cx: 30, cy: 30, cz: 30 }, abundance: 0.5 },
  },
  gold: {
    id: 6,
    name: 'gold',
    color: 0xffd700,
    resource: { clusterSize: { cx: 30, cy: 30, cz: 30 }, abundance: 0.5 },
  },
};

export const blocksList = Object.values(blocks);
export const resourcesList = Object.values(blocks).filter((b) => b.resource);
