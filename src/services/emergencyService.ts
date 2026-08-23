import { Emergency, EmergencyStatus, Hospital } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';
import { notificationService } from './notificationService';
import { ambulanceService } from './ambulanceService';
import { hospitalService } from './hospitalService';

export const emergencyService = {
  getEmergencies: (): Emergency[] => {
    return storageService.getItem<Emergency[]>(STORAGE_KEYS.EMERGENCIES) || [];
  },

  getEmergencyById: (id: string): Emergency | undefined => {
    const emergencies = emergencyService.getEmergencies();
    return emergencies.find(e => e.emergencyId === id);
  },

  /** Generate next sequential unique ID by inspecting highest numeric suffix */
  getNextEmergencyId: (): string => {
    const emergencies = emergencyService.getEmergencies();
    let maxNum = 999;
    emergencies.forEach(e => {
      const match = e.emergencyId.match(/^EM-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `EM-${maxNum + 1}`;
  },

  /** Get the single active emergency for a specific ambulance (or undefined) */
  getActiveEmergencyForAmbulance: (ambulanceId: string): Emergency | undefined => {
    const emergencies = emergencyService.getEmergencies();
    return emergencies.find(
      e => e.assignedAmbulanceId === ambulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
    );
  },

  /** Get all active incoming emergencies for a hospital */
  getIncomingEmergenciesForHospital: (hospitalId: string): Emergency[] => {
    const emergencies = emergencyService.getEmergencies();
    return emergencies.filter(
      e => e.recommendedHospitalId === hospitalId && !['COMPLETED', 'CANCELLED'].includes(e.status)
    );
  },

  createEmergency: (data: Partial<Emergency>): Emergency => {
    const emergencies = emergencyService.getEmergencies();
    
    // Check if ambulance is already busy
    if (data.assignedAmbulanceId) {
      const existingActive = emergencies.find(
        e => e.assignedAmbulanceId === data.assignedAmbulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
      );
      if (existingActive) {
        throw new Error(`${data.assignedAmbulanceId} is currently busy with ${existingActive.emergencyId}.`);
      }
    }

    const newId = emergencyService.getNextEmergencyId();
    const now = new Date().toISOString();
    
    const newEmergency: Emergency = {
      type: 'Unknown',
      severity: 'MEDIUM',
      pickupLocation: 'Unknown Location',
      latitude: 0,
      longitude: 0,
      eta: 'Calculating...',
      notes: '',
      bedReserved: false,
      hospitalResponse: data.recommendedHospitalId ? 'WAITING' : undefined,
      ...data,
      emergencyId: newId,
      status: 'ASSIGNED',
      createdAt: now,
      updatedAt: now,
      assignedAmbulanceId: data.assignedAmbulanceId || null,
      recommendedHospitalId: data.recommendedHospitalId || null,
      statusHistory: [{
        status: 'ASSIGNED',
        timestamp: now,
        updatedBy: 'System'
      }],
    };

    emergencies.unshift(newEmergency);
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, emergencies);
    
    // If ambulance assigned, mark ambulance as ASSIGNED
    if (data.assignedAmbulanceId) {
      ambulanceService.assignAmbulance(data.assignedAmbulanceId, newId);
    }

    // Notify crew
    notificationService.addNotification({
      title: 'New Emergency Assigned',
      message: `Emergency ${newId} created and assigned to ${data.assignedAmbulanceId || 'unit'}.`,
      type: 'info',
      targetRole: 'CREW',
      emergencyId: newId
    });

    // Notify hospital if assigned
    if (data.recommendedHospitalId) {
      notificationService.addNotification({
        title: 'Incoming Emergency',
        message: `Emergency ${newId} assigned to your hospital. Ambulance ${data.assignedAmbulanceId || 'TBD'} incoming.`,
        type: 'warning',
        targetRole: 'HOSPITAL',
        emergencyId: newId
      });
    }

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

  updateEmergencyStatus: (id: string, status: EmergencyStatus, updatedBy: string = 'System'): Emergency | null => {
    const emergencies = emergencyService.getEmergencies();
    const index = emergencies.findIndex(e => e.emergencyId === id);
    if (index === -1) return null;

    const existing = emergencies[index];
    const historyEntry = {
      status,
      timestamp: new Date().toISOString(),
      updatedBy
    };

    const currentHistory = existing.statusHistory || [];
    
    const emergency = emergencyService.updateEmergency(id, { 
      status,
      statusHistory: [...currentHistory, historyEntry]
    });

    if (!emergency) return null;

    // Handle lifecycle side effects
    if (status === 'ARRIVED_AT_HOSPITAL') {
      // If hospital accepted earlier, admit patient now
      if (emergency.recommendedHospitalId && emergency.hospitalResponse === 'ACCEPTED') {
        hospitalService.admitPatient(emergency.recommendedHospitalId, emergency.type, emergency.severity);
      }
      if (emergency.assignedAmbulanceId) {
        ambulanceService.updateAmbulanceStatus(emergency.assignedAmbulanceId, 'AT HOSPITAL');
      }
    } else if (status === 'COMPLETED' || status === 'CANCELLED') {
      // Release ambulance
      if (emergency.assignedAmbulanceId) {
        ambulanceService.releaseAmbulance(emergency.assignedAmbulanceId);
      }
      // Release hospital capacity if was accepted
      if (emergency.recommendedHospitalId && emergency.hospitalResponse === 'ACCEPTED') {
        const wasAdmitted = currentHistory.some(h => h.status === 'ARRIVED_AT_HOSPITAL');
        hospitalService.releaseCapacity(emergency.recommendedHospitalId, emergency.type, emergency.severity, wasAdmitted);
      }

      if (status === 'COMPLETED') {
        notificationService.addNotification({
          title: 'Emergency Completed',
          message: `Emergency ${id} completed. Unit is now available.`,
          type: 'success',
          emergencyId: id,
          targetRole: 'DISPATCHER'
        });
      }
    } else if (['EN_ROUTE_TO_PATIENT', 'ARRIVED_AT_SCENE', 'PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL'].includes(status)) {
      if (emergency.assignedAmbulanceId) {
        ambulanceService.updateAmbulanceStatus(emergency.assignedAmbulanceId, 'EN ROUTE');
      }
    }

    return emergency;
  },

  getRecommendedHospital: (emergency: Emergency, hospitals: Hospital[]): string | null => {
    if (!hospitals || hospitals.length === 0) return null;
    
    const available = hospitals.filter(h => h.emergencyDepartmentStatus === 'AVAILABLE' && h.emergencyBedsAvailable > 0);
    if (available.length > 0) return available[0].hospitalId;
    
    const busy = hospitals.filter(h => h.emergencyDepartmentStatus === 'BUSY' && h.emergencyBedsAvailable > 0);
    if (busy.length > 0) return busy[0].hospitalId;

    return hospitals[0].hospitalId;
  },
  
  deleteEmergency: (id: string): void => {
    const emergencies = emergencyService.getEmergencies();
    const filtered = emergencies.filter(e => e.emergencyId !== id);
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, filtered);
  },

  getEmergencyHistory: (): Emergency[] => {
    return emergencyService.getEmergencies().filter(e => 
      e.status === 'COMPLETED' || e.status === 'CANCELLED'
    );
  }
};
