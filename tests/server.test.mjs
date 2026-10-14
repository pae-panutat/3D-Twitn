import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {validCitySnapshot as validSnapshot} from '../dist/city-simulation.js';
test('Node backend broadcasts telemetry and records simulation controls', async (t) => {
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: {...process.env, TWIN_PORT: '4174', TWIN_API_ONLY: '1'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill('SIGTERM'));
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'error').then(([err]) => {
      throw err;
    }),
    once(server, 'exit').then(([code]) => {
      throw new Error('Server exited ' + code);
    }),
  ]);
  const base = 'http://127.0.0.1:4174';
  assert.equal((await fetch(base + '/')).status, 404); // Next.js serves pages in the full server.
  assert.equal((await fetch(base + '/does-not-exist')).status, 404);
  assert.equal((await fetch(base + '/api/health').then((r) => r.json())).transport, 'sse');
  assert.ok(validSnapshot(await fetch(base + '/api/snapshot').then((r) => r.json())));
  const controller = new AbortController();
  t.after(() => controller.abort());
  const stream = await fetch(base + '/api/events', {signal: controller.signal}),
    reader = stream.body.getReader();
  assert.match(stream.headers.get('content-type'), /text\/event-stream/);
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /^data: /);
  assert.ok(validSnapshot(JSON.parse(first.slice(6).trim())));
  assert.equal((await fetch(base + '/api/control')).status, 405);
  const changed = await fetch(base + '/api/control', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'hold', id: 'BTS-1101'}),
  }).then((r) => r.json());
  assert.equal(changed.trains[0].holdRequested, true);
  const pushed = new TextDecoder().decode((await reader.read()).value);
  assert.equal(JSON.parse(pushed.slice(6).trim()).trains[0].holdRequested, true);
  assert.equal(
    (
      await fetch(base + '/api/control', {
        method: 'POST',
        headers: {Origin: 'https://example.invalid'},
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + '/api/control', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'unknown'}),
      })
    ).status,
    400,
  );
  assert.equal((await fetch(base + '/api/events', {method: 'POST'})).status, 405);
  const next = await Promise.race([
    reader.read(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SSE tick not received')), 4500)),
  ]);
  assert.ok(validSnapshot(JSON.parse(new TextDecoder().decode(next.value).slice(6).trim())));
  controller.abort();
});
