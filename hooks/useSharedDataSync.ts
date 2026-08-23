import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../data/constants';
import { emergencyService } from '../services/emergencyService';
import { ambulanceService } from '../services/ambulanceService';
import { hospitalService } from '../services/hospitalService';
import { notificationService } from '../services/notificationService';
import { Emergency, Ambulance, Hospital, Notification } from '../types';

export interface SharedData {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  notifications: Notification[];
}

export function useSharedDataSync() {
  const [data, setData] = useState<SharedData>({
    emergencies: emergencyService.getEmergencies(),
    ambulances: ambulanceService.getAmbulances(),
    hospitals: hospitalService.getHospitals(),
    notifications: notificationService.getNotifications()
  });

  const refreshData = useCallback(() => {
    setData({
      emergencies: emergencyService.getEmergencies(),
      ambulances: ambulanceService.getAmbulances(),
      hospitals: hospitalService.getHospitals(),
      notifications: notificationService.getNotifications()
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (event?: Event) => {
      if (event && event.type === 'storage') {
        const storageEvent = event as StorageEvent;
        // Only refresh if the key is one of our managed keys, or if key is null (e.g. localStorage.clear())
        if (storageEvent.key && !Object.values(STORAGE_KEYS).includes(storageEvent.key)) {
          return;
        }
      }

      refreshData();
    };

    // Initial fetch in case it changed between render and mount
    refreshData();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [refreshData]);

  return {
    ...data,
    refreshData
  };
}
