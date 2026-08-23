import { io, Socket } from 'socket.io-client';
import { apiRequest } from './api';

// Keys that are pushed to / pulled from the backend and broadcast live via
// Socket.IO. Must match server/sync.mjs's ALLOWED_KEYS and
// src/data/constants.ts's STORAGE_KEYS.
const SYNCABLE_KEYS = new Set([
  'emergency_intelligence_emergencies',
  'emergency_intelligence_ambulances',
  'emergency_intelligence_hospitals',
  'emergency_intelligence_notifications',
]);

let socket: Socket | null = null;
let onRemoteUpdate: ((key: string, value: unknown[]) => void) | null = null;

function getSocket(): Socket {
  if (!socket) {
    // Same-origin in production; Vite proxies /socket.io during local dev
    // the same way it proxies /api (see vite.config.ts).
    socket = io({ transports: ['websocket', 'polling'], autoConnect: true });
    socket.on('shared-state-update', (payload: { key: string; value: unknown[] }) => {
      if (onRemoteUpdate && SYNCABLE_KEYS.has(payload.key)) onRemoteUpdate(payload.key, payload.value);
    });
  }
  return socket;
}

export const realtimeSyncService = {
  isSyncable: (key: string): boolean => SYNCABLE_KEYS.has(key),

  /** Connect and register a callback fired whenever another client pushes a change. */
  subscribe: (callback: (key: string, value: unknown[]) => void): (() => void) => {
    onRemoteUpdate = callback;
    getSocket();
    return () => {
      onRemoteUpdate = null;
    };
  },

  /** Push a full snapshot of one collection to the backend; it will broadcast to other clients. */
  push: async (key: string, value: unknown[]): Promise<void> => {
    if (!SYNCABLE_KEYS.has(key)) return;
    try {
      await apiRequest(`/api/sync/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value, socketId: socket?.id }),
      });
    } catch (error) {
      // Non-fatal: localStorage remains the local source of truth even if
      // the push fails (offline, backend down, etc). Other tabs on this
      // device still sync via the existing 'local-storage-update' event.
      console.error(`Failed to sync ${key} to server:`, error);
    }
  },

  /** Pull the latest snapshot for one collection from the backend, if any. */
  pull: async (key: string): Promise<unknown[] | null> => {
    if (!SYNCABLE_KEYS.has(key)) return null;
    try {
      const result = await apiRequest<{ value: unknown[]; updatedAt: string | null }>(`/api/sync/${encodeURIComponent(key)}`);
      return result.value ?? null;
    } catch (error) {
      console.error(`Failed to pull ${key} from server:`, error);
      return null;
    }
  },
};
