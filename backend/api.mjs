import {CitySimulation} from '../dist/city-simulation.js';
export function createApi({port, simulation = new CitySimulation()}) {
  const clients = new Set();
  const json = (res, status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(data));
  };
  const broadcast = (snapshot) => {
    for (const client of clients) {
      if (client.destroyed) {
        clients.delete(client);
        continue;
      }
      if (!client.writableNeedDrain) client.write('data: ' + JSON.stringify(snapshot) + '\n\n');
    }
  };
  const ticker = setInterval(() => broadcast(simulation.tick(0.5)), 500);
  return {
    async handle(req, res) {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) return false;
      if (url.pathname === '/api/health') {
        if (req.method !== 'GET') json(res, 405, {error: 'GET required'});
        else json(res, 200, {service: 'siam-city', source: 'simulation', transport: 'sse'});
        return true;
      }
      if (url.pathname === '/api/snapshot') {
        if (req.method !== 'GET') json(res, 405, {error: 'GET required'});
        else json(res, 200, simulation.snapshot());
        return true;
      }
      if (url.pathname === '/api/events') {
        if (req.method !== 'GET') {
          json(res, 405, {error: 'GET required'});
          return true;
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write('data: ' + JSON.stringify(simulation.snapshot()) + '\n\n');
        clients.add(res);
        res.on('close', () => clients.delete(res));
        return true;
      }
      if (url.pathname === '/api/control') {
        if (req.method !== 'POST') {
          json(res, 405, {error: 'POST required'});
          return true;
        }
        const origin = req.headers.origin;
        if (
          origin &&
          origin !== `http://127.0.0.1:${port}` &&
          origin !== `http://localhost:${port}`
        ) {
          json(res, 403, {error: 'Origin not permitted'});
          return true;
        }
        if (!req.headers['content-type']?.startsWith('application/json')) {
          json(res, 415, {error: 'JSON required'});
          return true;
        }
        let body = '',
          bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 4096) {
            json(res, 413, {error: 'Payload too large'});
            return true;
          }
          body += chunk;
        }
        try {
          const {action, id, value} = JSON.parse(body);
          const snapshot = simulation.control(action, id, value);
          broadcast(snapshot);
          json(res, 200, snapshot);
        } catch {
          json(res, 400, {error: 'Invalid simulation control'});
        }
        return true;
      }
      json(res, 404, {error: 'Not found'});
      return true;
    },
    close() {
      clearInterval(ticker);
      for (const client of clients) client.end();
      clients.clear();
    },
  };
}
