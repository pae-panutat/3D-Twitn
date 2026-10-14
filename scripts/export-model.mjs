import {writeFile} from 'node:fs/promises';
import {createCity, createTrain, STATIONS, toGLTF} from '../dist/city.js';
const items = createCity();
for (let i = 0; i < 6; i++) {
  const x = [-57, -30, 26, 48, -38, -82][i],
    z = i === 5 ? -12 : i < 3 ? 1.5 : -1.5,
    y = i === 5 ? 0.9 : 9.27;
  for (const part of createTrain())
    items.push({
      ...part,
      name: 'BTS-' + (1101 + i) + '-' + part.name,
      position: [part.position[0] + x, part.position[1] + y, part.position[2] + z],
      assetId: 'BTS-' + (1101 + i),
    });
}
await writeFile(new URL('../dist/city.gltf', import.meta.url), JSON.stringify(toGLTF(items)));
console.log(
  `Exported city.gltf: ${items.length} meshes, ${STATIONS.length} stations, 6 trains, metres / Y-up`,
);
