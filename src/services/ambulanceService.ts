import { Ambulance, AmbulanceStatus, Emergency } from '../types';
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

  releaseAmbulance: (id: string): Ambulance | null => {
    return ambulanceService.updateAmbulance(id, {
      assignedEmergencyId: null,
      status: 'AVAILABLE'
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
  },

  /** Check if ambulance has any active emergency (status != COMPLETED & != CANCELLED) */
  getActiveEmergencyForAmbulance: (ambulanceId: string, emergencies: Emergency[]): Emergency | undefined => {
    return emergencies.find(
      e => e.assignedAmbulanceId === ambulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
    );
  },

  /** Check if ambulance is available based on ambulance record + active emergency assignments */
  isAmbulanceAvailable: (ambulanceId: string, emergencies: Emergency[]): boolean => {
    const amb = ambulanceService.getAmbulanceById(ambulanceId);
    if (!amb || amb.status === 'OFF DUTY') return false;
    const active = ambulanceService.getActiveEmergencyForAmbulance(ambulanceId, emergencies);
    return !active;
  }
};
