import { realtimeSyncService } from './realtimeSyncService';

export const storageService = {
  getItem: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage`, error);
      return null;
    }
  },

  setItem: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Dispatch custom event for same-window/same-tab syncing (existing behavior).
      window.dispatchEvent(new Event('local-storage-update'));
      // Push to the backend + broadcast to other connected clients (other
      // devices, other roles) via Socket.IO. Fire-and-forget: local writes
      // must never block on the network.
      if (realtimeSyncService.isSyncable(key) && Array.isArray(value)) {
        void realtimeSyncService.push(key, value as unknown[]);
      }
    } catch (error) {
      console.error(`Error setting ${key} in localStorage`, error);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new Event('local-storage-update'));
    } catch (error) {
      console.error(`Error removing ${key} from localStorage`, error);
    }
  },

  clearAll: (): void => {
    try {
      localStorage.clear();
      window.dispatchEvent(new Event('local-storage-update'));
    } catch (error) {
      console.error(`Error clearing localStorage`, error);
    }
  }
};
