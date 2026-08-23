import { Notification } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';

export const notificationService = {
  getNotifications: (): Notification[] => {
    return storageService.getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
  },

  addNotification: (data: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification => {
    const notifications = notificationService.getNotifications();
    
    // Check if identical notification was recently added (within last 3 seconds) to prevent duplicates
    const now = Date.now();
    const isDuplicate = notifications.some(n => 
      n.title === data.title &&
      n.emergencyId === data.emergencyId &&
      n.targetRole === data.targetRole &&
      (now - new Date(n.timestamp).getTime()) < 3000
    );

    if (isDuplicate) {
      return notifications[0];
    }

    // Combine Date.now() with random suffix to ensure uniquely keyed entries
    const newNotification: Notification = {
      id: `NOTIF-${now}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...data
    };

    notifications.unshift(newNotification);
    
    // Keep only last 50 notifications to prevent storage bloat
    if (notifications.length > 50) {
      notifications.pop();
    }
    
    storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return newNotification;
  },

  markAsRead: (id: string): void => {
    const notifications = notificationService.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  },
  
  clearNotifications: (): void => {
    storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, []);
  }
};
