import { Emergency, EmergencyStatus, Hospital } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';
import { notificationService } from './notificationService';

export const emergencyService = {
  getEmergencies: (): Emergency[] => {
    return storageService.getItem<Emergency[]>(STORAGE_KEYS.EMERGENCIES) || [];
  },

  getEmergencyById: (id: string): Emergency | undefined => {
    const emergencies = emergencyService.getEmergencies();
    return emergencies.find(e => e.emergencyId === id);
  },

  createEmergency: (data: Partial<Emergency>): Emergency => {
    const emergencies = emergencyService.getEmergencies();

    // Length-based IDs collide once any emergency is deleted (length shrinks,
    // so a later create can reuse an ID still present in the array). Derive
    // the next number from the highest existing EM-#### instead.
    const highest = emergencies.reduce((max, e) => {
      const n = Number(e.emergencyId.replace(/^EM-/, ''));
      return Number.isFinite(n) && n > max ? n : max;
    }, 999);
    const newId = `EM-${highest + 1}`;

    const newEmergency: Emergency = {
      ...data,
      // Spread first, then pin these fields — createEmergency owns them and
      // they should never be overridable by caller-supplied data.
      emergencyId: newId,
      type: data.type || 'Unknown',
      severity: data.severity || 'MEDIUM',
      pickupLocation: data.pickupLocation || 'Unknown Location',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      assignedAmbulanceId: data.assignedAmbulanceId || null,
      recommendedHospitalId: data.recommendedHospitalId ?? null,
      status: 'ASSIGNED',
      eta: data.eta || 'Calculating...',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bedReserved: false,
    };

    emergencies.unshift(newEmergency); // Add to beginning
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, emergencies);
    
    notificationService.addNotification({
      message: `New emergency ${newId} created and assigned.`,
      type: 'info',
      targetPortal: 'crew'
    });

    return newEmergency;
  },

  updateEmergency: (id: string, updates: Partial<Emergency>): Emergency | null => {
    const emergencies = emergencyService.getEmergencies();
    const index = emergencies.findIndex(e => e.emergencyId === id);
    if (index === -1) return null;

    emergencies[index] = { 
      ...emergencies[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, emergencies);
    return emergencies[index];
  },

  updateEmergencyStatus: (id: string, status: EmergencyStatus): Emergency | null => {
    const updates: Partial<Emergency> = { status };
    if (status === 'COMPLETED') {
      // A completed emergency shouldn't still show an ambulance tied up on it.
      updates.assignedAmbulanceId = null;
    }
    const emergency = emergencyService.updateEmergency(id, updates);
    if (emergency && status === 'COMPLETED') {
      notificationService.addNotification({
        message: `Emergency ${id} completed.`,
        type: 'success'
      });
    }
    return emergency;
  },

  getRecommendedHospital: (emergency: Emergency, hospitals: Hospital[]): string | null => {
    if (!hospitals || hospitals.length === 0) return null;
    
    // Simplistic recommendation logic for demo purposes
    // Prioritize hospitals with available emergency beds, then nearest (mocked by first in array that's AVAILABLE)
    const available = hospitals.filter(h => h.emergencyDepartmentStatus === 'AVAILABLE' && h.emergencyBedsAvailable > 0);
    
    if (available.length > 0) {
      return available[0].hospitalId;
    }
    
    // Fallback to first busy hospital with beds
    const busy = hospitals.filter(h => h.emergencyDepartmentStatus === 'BUSY' && h.emergencyBedsAvailable > 0);
    if (busy.length > 0) {
      return busy[0].hospitalId;
    }

    // Ultimate fallback
    return hospitals[0].hospitalId;
  },
  
  deleteEmergency: (id: string): void => {
    const emergencies = emergencyService.getEmergencies();
    const filtered = emergencies.filter(e => e.emergencyId !== id);
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, filtered);
  }
};
