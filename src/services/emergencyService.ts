import { Emergency, EmergencyStatus, Hospital } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';
import { notificationService } from './notificationService';
import { ambulanceService } from './ambulanceService';
import { hospitalService } from './hospitalService';
import { apiRequest } from './api';

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
      ...data,
      // Spread first, then pin these fields — createEmergency owns them and
      // they should never be overridable by caller-supplied data.
      emergencyId: newId,
      id: newId,
      type: data.type || 'Unknown',
      severity: data.severity || 'MEDIUM',
      pickupLocation: data.pickupLocation || 'Unknown Location',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      assignedAmbulanceId: data.assignedAmbulanceId || null,
      ambulanceId: data.assignedAmbulanceId || null,
      recommendedHospitalId: data.recommendedHospitalId ?? null,
      hospitalId: data.recommendedHospitalId ?? null,
      status: 'ASSIGNED',
      eta: data.eta || 'Calculating...',
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
      bedReserved: false,
      hospitalResponse: data.recommendedHospitalId ? 'WAITING' : undefined,
      statusHistory: [{
        status: 'ASSIGNED',
        timestamp: now,
        updatedBy: 'System'
      }],
    };

    emergencies.unshift(newEmergency);
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, emergencies);

    // Persist to the real `emergencies` table (with lat/lng -> the geo
    // column) via the relational API, in addition to the localStorage +
    // shared_state blob sync above.
    void apiRequest('/api/emergencies', {
      method: 'POST',
      body: JSON.stringify({
        type: newEmergency.type,
        severity: newEmergency.severity,
        location: newEmergency.pickupLocation,
        ambulanceId: newEmergency.assignedAmbulanceId || undefined,
        notes: newEmergency.notes || undefined,
        latitude: newEmergency.latitude || undefined,
        longitude: newEmergency.longitude || undefined,
      }),
    }).catch(error => {
      console.error(`Failed to persist ${newId} to the database:`, error);
    });

    // If ambulance assigned, mark ambulance as ASSIGNED
    if (data.assignedAmbulanceId) {
      ambulanceService.assignAmbulance(data.assignedAmbulanceId, newId);
    }

    const hospitals = hospitalService.getHospitals();
    const hosp = hospitals.find(h => h.hospitalId === newEmergency.recommendedHospitalId);
    const destName = hosp ? hosp.name : (newEmergency.recommendedHospitalId || 'TBD');

    // Notify crew with rich emergency details
    if (data.assignedAmbulanceId) {
      notificationService.addNotification({
        title: 'New Emergency Assigned',
        message: `Emergency ${newId} (${newEmergency.type}) assigned to ${data.assignedAmbulanceId}. Location: ${newEmergency.pickupLocation}. Destination: ${destName}. Severity: ${newEmergency.severity}.${newEmergency.notes ? ` Notes: ${newEmergency.notes}` : ''}`,
        type: 'info',
        targetRole: 'CREW',
        targetAmbulanceId: data.assignedAmbulanceId,
        emergencyId: newId,
        referenceId: newId
      });
    }

    // Notify hospital if assigned
    if (data.recommendedHospitalId) {
      notificationService.addNotification({
        title: 'Incoming Emergency Assigned',
        message: `Emergency ${newId} (${newEmergency.type} · ${newEmergency.severity}) assigned to your hospital. Unit ${data.assignedAmbulanceId || 'TBD'} from ${newEmergency.pickupLocation}.`,
        type: 'warning',
        targetRole: 'HOSPITAL',
        targetHospitalId: newEmergency.recommendedHospitalId || undefined,
        emergencyId: newId,
        referenceId: newId
      });
    }

    return newEmergency;
  },

  updateEmergency: (id: string, updates: Partial<Emergency>): Emergency | null => {
    const emergencies = emergencyService.getEmergencies();
    const index = emergencies.findIndex(e => e.emergencyId === id || e.id === id);
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
    const index = emergencies.findIndex(e => e.emergencyId === id || e.id === id);
    if (index === -1) return null;

    const existing = emergencies[index];
    const historyEntry = {
      status,
      timestamp: new Date().toISOString(),
      updatedBy
    };

    const currentHistory = existing.statusHistory || [];

    const updates: Partial<Emergency> = {
      status,
      statusHistory: [...currentHistory, historyEntry],
    };
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      updates.assignedAmbulanceId = null;
      updates.ambulanceId = null;
    }

    const emergency = emergencyService.updateEmergency(id, updates);

    if (!emergency) return null;

    // Handle lifecycle side effects
    if (status === 'ARRIVED_AT_HOSPITAL') {
      if (emergency.recommendedHospitalId && emergency.hospitalResponse === 'ACCEPTED') {
        hospitalService.admitPatient(emergency.recommendedHospitalId, emergency.type, emergency.severity);
      }
      if (emergency.assignedAmbulanceId) {
        ambulanceService.updateAmbulanceStatus(emergency.assignedAmbulanceId, 'AT HOSPITAL');
      }
      notificationService.addNotification({
        title: 'Ambulance Arrived at Hospital',
        message: `${emergency.assignedAmbulanceId || 'Ambulance'} arrived at hospital for Emergency ${id}.`,
        type: 'info',
        emergencyId: id,
        referenceId: id,
        targetRole: 'HOSPITAL'
      });
      notificationService.addNotification({
        title: 'Patient Arrived at Hospital',
        message: `Unit ${emergency.assignedAmbulanceId || 'unit'} has arrived at hospital for ${id}.`,
        type: 'info',
        emergencyId: id,
        referenceId: id,
        targetRole: 'DISPATCHER'
      });
    } else if (status === 'COMPLETED' || status === 'CANCELLED') {
      if (existing.assignedAmbulanceId) {
        ambulanceService.releaseAmbulance(existing.assignedAmbulanceId);
      }
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
          referenceId: id,
          targetRole: 'DISPATCHER'
        });
      }
    } else if (['EN_ROUTE_TO_PATIENT', 'ARRIVED_AT_SCENE', 'PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL'].includes(status)) {
      if (emergency.assignedAmbulanceId) {
        ambulanceService.updateAmbulanceStatus(emergency.assignedAmbulanceId, 'EN ROUTE');
      }
      if (status === 'EN_ROUTE_TO_HOSPITAL' && emergency.recommendedHospitalId) {
        notificationService.addNotification({
          title: 'Inbound Ambulance En Route',
          message: `${emergency.assignedAmbulanceId || 'Ambulance'} is en route to your facility with patient (${emergency.type} · ${emergency.severity}).`,
          type: 'warning',
          emergencyId: id,
          referenceId: id,
          targetRole: 'HOSPITAL',
          targetHospitalId: emergency.recommendedHospitalId
        });
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
