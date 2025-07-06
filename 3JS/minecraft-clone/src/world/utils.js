import { blocks } from '../blocks';
import { sixDirections } from './constants';

export const getRandomResource = (possibleResources) => {
  if (possibleResources.length > 0) {
    const abundances = possibleResources.map((res) => res.resource.abundance ?? 0);
    const totalAbundance = abundances.reduce((sum, val) => sum + val, 0);

    if (totalAbundance > 0) {
      let randomValue = Math.random() * totalAbundance;
      let selectedResource = possibleResources[0];

      for (let j = 0; j < possibleResources.length; j++) {
        randomValue -= abundances[j];
        if (randomValue <= 0) {
          selectedResource = possibleResources[j];
          break;
        }
      }

      return blocks[selectedResource.name].id;
    }
  }
};

export const getVeinDirections = () => {
  const randomGeneralDir = sixDirections[Math.floor(Math.random() * sixDirections.length)];
  const randomDir = Object.entries(randomGeneralDir).filter(([_, val]) => val !== 0)[0];

  const directions = [];
  const freeCoords = ['x', 'y', 'z'].filter((key) => key !== randomDir[0]);

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      directions.push({
        [freeCoords[0]]: i - 1,
        [freeCoords[1]]: j - 1,
        [randomDir[0]]: randomDir[1],
      });
    }
  }

  return directions;
};

export const getNextResourceDirection = (directions, newElement) => {
  const randomDir = directions[Math.floor(Math.random() * directions.length)];

  return {
    nx: newElement.x + randomDir.x,
    ny: newElement.y + randomDir.y,
    nz: newElement.z + randomDir.z,
  };
};

export const getClusterDirections = () => {
  const allDirections = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx !== 0 || dy !== 0 || dz !== 0) {
          allDirections.push({ x: dx, y: dy, z: dz });
        }
      }
    }
  }
  return allDirections;
};
