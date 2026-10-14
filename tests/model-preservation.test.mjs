import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCity, createTrain, meshGeometry} from '../dist/city.js';
import {prepareModel} from '../src/lib/model-adapter.ts';

test('Original model, geometry and simulator retain their pre-migration SHA-256', async () => {
  const provenance = JSON.parse(
    await readFile(new URL('../public/models/provenance.json', import.meta.url), 'utf8'),
  );
  for (const [file, expected] of Object.entries(provenance.preservedFiles)) {
    assert.equal(
      createHash('sha256')
        .update(await readFile(new URL('../dist/' + file, import.meta.url)))
        .digest('hex'),
      expected,
      file,
    );
  }
  assert.deepEqual(
    await readFile(new URL('../dist/city.gltf', import.meta.url)),
    await readFile(new URL('../public/models/bangkok-city.gltf', import.meta.url)),
  );
});
test('Three.js glTF adapter preserves every city/train vertex and colour', async () => {
  // Node has no browser ProgressEvent; GLTFLoader uses it for fetch progress only.
  if (!globalThis.ProgressEvent)
    globalThis.ProgressEvent = class extends Event {
      constructor(type, init) {
        super(type);
        Object.assign(this, init);
      }
    };
  const file = await readFile(new URL('../dist/city.gltf', import.meta.url), 'utf8');
  const gltf = await new GLTFLoader().parseAsync(file, '');
  const model = prepareModel(gltf.scene);
  const compare = (items, geometry) => {
    const actual = geometry.getAttribute('position').array,
      colors = geometry.getAttribute('color').array;
    let offset = 0;
    for (const item of items) {
      const g = meshGeometry(item.shape),
        [sx, sy, sz] = item.size,
        [rx, ry, rz] = item.rotation ?? [0, 0, 0],
        cx = Math.cos(rx),
        snx = Math.sin(rx),
        cy = Math.cos(ry),
        sny = Math.sin(ry),
        cz = Math.cos(rz),
        snz = Math.sin(rz);
      for (let i = 0; i < g.positions.length; i += 3) {
        const x = g.positions[i] * sx,
          y = g.positions[i + 1] * sy,
          z = g.positions[i + 2] * sz;
        const expected = [
          cy * cz * x - cy * snz * y + sny * z + item.position[0],
          (snx * sny * cz + cx * snz) * x +
            (-snx * sny * snz + cx * cz) * y -
            snx * cy * z +
            item.position[1],
          (-cx * sny * cz + snx * snz) * x +
            (cx * sny * snz + snx * cz) * y +
            cx * cy * z +
            item.position[2],
        ];
        for (let k = 0; k < 3; k++) {
          assert.ok(
            Math.abs(actual[offset + k] - expected[k]) < 0.00002,
            `Vertex changed: ${item.name}, ${offset + k}`,
          );
          assert.ok(
            Math.abs(
              colors[offset + k] - parseInt(item.color.slice(1 + k * 2, 3 + k * 2), 16) / 255,
            ) < 0.000001,
          );
        }
        offset += 3;
      }
    }
    assert.equal(actual.length, offset, 'No vertex added, removed or simplified');
  };
  const city = createCity(),
    train = createTrain();
  compare(city, model.city);
  compare(train, model.train);
  assert.equal(model.cityNodes, city.length);
  assert.equal(model.trainNodes, train.length);
  assert.ok(model.shadow.getAttribute('position').count > 0);
  [model.city, model.train, model.shadow].forEach((g) => g.dispose());
});
