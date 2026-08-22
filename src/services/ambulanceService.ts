import { Ambulance, AmbulanceStatus } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';

export const ambulanceService = {
  getAmbulances: (): Ambulance[] => {
    return storageService.getItem<Ambulance[]>(STORAGE_KEYS.AMBULANCES) || [];
  },

  getAmbulanceById: (id: string): Ambulance | undefined => {
    const ambulances = ambulanceService.getAmbulances();
    return ambulances.find(a => a.ambulanceId === id);
  },

  assignAmbulance: (id: string, emergencyId: string): Ambulance | null => {
    return ambulanceService.updateAmbulance(id, {
      assignedEmergencyId: emergencyId,
      status: 'ASSIGNED'
    });
  },

  updateAmbulanceStatus: (id: string, status: AmbulanceStatus): Ambulance | null => {
    return ambulanceService.updateAmbulance(id, { status });
  },

  updateAmbulance: (id: string, updates: Partial<Ambulance>): Ambulance | null => {
    const ambulances = ambulanceService.getAmbulances();
    const index = ambulances.findIndex(a => a.ambulanceId === id);
    if (index === -1) return null;

    ambulances[index] = { 
      ...ambulances[index], 
      ...updates, 
      lastUpdatedTime: new Date().toISOString() 
    };
    
    storageService.setItem(STORAGE_KEYS.AMBULANCES, ambulances);
    return ambulances[index];
  },
  
  updateAmbulanceLocation: (id: string, location: { lat: number; lng: number }): Ambulance | null => {
    return ambulanceService.updateAmbulance(id, { currentLocation: location });
  }
};
