import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/models/', root), {recursive: true});
await copyFile(new URL('dist/city.gltf', root), new URL('public/models/bangkok-city.gltf', root));
const expected = {
  'city.js': 'a58f1585f8ca6a04ad7396bd26b05e8e43f69e4273289d8a75b22f19143794ed',
  'geometry.js': 'ce8492d85c6a65b7d5a8c62aad4873948ad27ea9548f341e722ddaaea9effde3',
  'city.gltf': '53c961311f53db6f57a8bc949129784f964fc0117dde23dcdf29a29a75ab6803',
  'city-simulation.js': 'a928fa0cf2c8a9383463e2badca7eb784121c995fecdb197b0f6504b890727f9',
};
for (const [file, hash] of Object.entries(expected)) {
  const actual = createHash('sha256')
    .update(await readFile(new URL('dist/' + file, root)))
    .digest('hex');
  if (actual !== hash) throw new Error('Original model/simulation changed: ' + file);
}
await writeFile(
  new URL('public/models/provenance.json', root),
  JSON.stringify(
    {source: 'dist/city.gltf', sha256: expected['city.gltf'], preservedFiles: expected},
    null,
    2,
  ),
);
console.log('Original model and simulation verified. Copied identical glTF to public/models.');
