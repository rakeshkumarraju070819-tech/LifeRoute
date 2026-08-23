import { createServer } from 'node:http';
import app from './app.mjs';
import { config } from './config.mjs';
import { initRealtime } from './realtime.mjs';

// Socket.IO needs to attach to the underlying HTTP server (not just the
// Express app) to upgrade connections to WebSockets.
const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.listen(config.apiPort, '0.0.0.0', () => {
  console.log(`LifeRoute API + realtime listening on http://localhost:${config.apiPort}`);
});