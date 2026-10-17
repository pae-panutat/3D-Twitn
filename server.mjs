// Node.js backend owns the simulation and SSE; Next.js owns frontend routing.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createApi} from './backend/api.mjs';
import {FarmSimulation} from './backend/farm-simulation.mjs';
const port = Number(process.env.PORT ?? process.env.TWIN_PORT ?? 4173),
  hostname = process.env.HOST ?? '0.0.0.0';
const api = createApi({port});
const farmApi = createApi({port, simulation: new FarmSimulation(), prefix: '/api/farm/', service: 'smart-pig-farm'});
let nextApp, handle;
if (process.env.TWIN_API_ONLY !== '1') {
  const {default: next} = await import('next');
  nextApp = next({
    dev: process.argv.includes('--dev'),
    dir: fileURLToPath(new URL('./', import.meta.url)),
    hostname,
    port,
    webpack: true,
  });
  await nextApp.prepare();
  handle = nextApp.getRequestHandler();
}
const server = http.createServer(async (req, res) => {
  try {
    if (await farmApi.handle(req, res)) return;
    if (await api.handle(req, res)) return;
    if (handle) return await handle(req, res);
    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal server error');
    } else res.end();
  }
});
server.listen(port, hostname, () =>
  console.log(
    `Smart Farm: http://${hostname}:${port}\nNode.js simulation backend: SSE /api/farm/events · every 0.5 seconds`,
  ),
);
server.on('error', (error) => {
  console.error(error.message);
  api.close();
  farmApi.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    api.close();
    farmApi.close();
    server.close(async () => {
      await nextApp?.close();
      process.exit(0);
    });
    server.closeIdleConnections();
  });
