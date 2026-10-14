import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CitySimulation, validCitySnapshot} from '../dist/city-simulation.js';
import {STATIONS, createCity, createTrain, toGLTF} from '../dist/city.js';
test('City telemetry stays valid and trains turn back continuously at endpoints', () => {
  const sim = new CitySimulation();
  let previous = sim.snapshot();
  for (let i = 0; i < 1200; i++) {
    const current = sim.tick(0.5);
    assert.ok(validCitySnapshot(current));
    assert.equal(new Set(current.trains.map((t) => t.id)).size, 6);
    for (let j = 0; j < 5; j++) {
      assert.ok(Math.abs(current.trains[j].x - previous.trains[j].x) < 1.1);
      assert.ok(current.trains[j].x >= -66 && current.trains[j].x <= 60);
    }
    previous = current;
  }
});
test('Pause freezes positions; 3x advances three times as far', () => {
  const sim = new CitySimulation();
  sim.control('pause');
  const before = sim.snapshot();
  sim.tick(2);
  assert.equal(sim.elapsed, before.elapsed);
  assert.deepEqual(
    sim.snapshot().trains.map((t) => t.x),
    before.trains.map((t) => t.x),
  );
  sim.control('pause');
  sim.control('rate', null, 3);
  sim.tick(2);
  assert.equal(sim.elapsed, 6);
  assert.throws(() => sim.control('rate', null, 4));
});
test('Hold stops at the next station and release continues without a jump', () => {
  const sim = new CitySimulation();
  sim.control('hold', 'BTS-1101');
  for (let i = 0; i < 75; i++) sim.tick(0.5);
  let t = sim.snapshot().trains[0];
  assert.equal(t.held, true);
  assert.equal(t.x, STATIONS[1].x);
  sim.tick(5);
  assert.equal(sim.snapshot().trains[0].x, t.x);
  sim.control('hold', 'BTS-1101');
  assert.equal(sim.snapshot().trains[0].x, t.x);
  for (let i = 0; i < 30; i++) sim.tick(0.5);
  assert.ok(sim.snapshot().trains[0].x > t.x);
  assert.throws(() => sim.control('hold', 'BTS-1106'));
});
test('City model links all four stations and includes reusable train geometry', () => {
  const items = createCity(),
    ids = new Set(items.map((x) => x.assetId));
  for (const s of STATIONS) assert.ok(ids.has(s.id));
  assert.ok(items.length > 1500);
  assert.ok(createTrain().length > 70);
  const model = toGLTF(items);
  assert.equal(model.asset.version, '2.0');
  assert.equal(model.nodes.length, items.length);
  assert.equal(
    Buffer.from(model.buffers[0].uri.split(',')[1], 'base64').length,
    model.buffers[0].byteLength,
  );
});
