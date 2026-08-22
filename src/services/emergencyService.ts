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
    const newId = `EM-${1000 + emergencies.length}`;
    
    const newEmergency: Emergency = {
      emergencyId: newId,
      type: data.type || 'Unknown',
      severity: data.severity || 'MEDIUM',
      pickupLocation: data.pickupLocation || 'Unknown Location',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      assignedAmbulanceId: data.assignedAmbulanceId || null,
      recommendedHospitalId: null, // Will be calculated if needed
      status: 'ASSIGNED',
      eta: data.eta || 'Calculating...',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bedReserved: false,
      ...data
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
    const emergency = emergencyService.updateEmergency(id, { status });
    if (emergency) {
      if (status === 'COMPLETED') {
        notificationService.addNotification({
          message: `Emergency ${id} completed.`,
          type: 'success'
        });
      }
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
