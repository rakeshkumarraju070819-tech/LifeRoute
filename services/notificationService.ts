import { Notification } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';

export const notificationService = {
  getNotifications: (): Notification[] => {
    return storageService.getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
  },

  addNotification: (data: Omit<Notification, 'id' | 'timestamp'>): Notification => {
    const notifications = notificationService.getNotifications();
    
    // Date.now() alone collides when multiple notifications fire in the same
    // millisecond (common — several services call this synchronously back to
    // back), producing duplicate ids and breaking React list keys downstream.
    const newNotification: Notification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
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
  
  clearNotifications: (): void => {
    storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, []);
  }
};
