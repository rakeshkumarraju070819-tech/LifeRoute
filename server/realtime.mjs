import { Server } from 'socket.io';
import { config } from './config.mjs';

let io = null;

/** Attach Socket.IO to the given HTTP server. Call once at startup. */
export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientOrigin },
  });

  io.on('connection', socket => {
    socket.on('disconnect', () => {});
  });

  return io;
}

/**
 * Broadcast a shared-state update to every connected client except the
 * originator (identified by socketId, if provided). This is what makes the
 * dashboard update live across the dispatcher / crew / hospital screens
 * without a page refresh — see "Real-Time Event Flow" in the tech-stack doc.
 */
export function broadcastStateUpdate(key, snapshot, originSocketId) {
  if (!io) return;
  const emitter = originSocketId ? io.except(originSocketId) : io;
  emitter.emit('shared-state-update', { key, ...snapshot });
}
