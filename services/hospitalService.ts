import { Hospital } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';
import { notificationService } from './notificationService';

export const hospitalService = {
  getHospitals: (): Hospital[] => {
    return storageService.getItem<Hospital[]>(STORAGE_KEYS.HOSPITALS) || [];
  },

  getHospitalById: (id: string): Hospital | undefined => {
    const hospitals = hospitalService.getHospitals();
    return hospitals.find(h => h.hospitalId === id);
  },

  updateHospitalCapacity: (id: string, updates: Partial<Hospital>): Hospital | null => {
    const hospitals = hospitalService.getHospitals();
    const index = hospitals.findIndex(h => h.hospitalId === id);
    if (index === -1) return null;

    hospitals[index] = { 
      ...hospitals[index], 
      ...updates 
    };
    
    storageService.setItem(STORAGE_KEYS.HOSPITALS, hospitals);
    return hospitals[index];
  },

  reserveBed: (hospitalId: string, emergencyId: string): boolean => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return false;

    // Determine type of bed needed (mocked logic - assuming ICU for CRITICAL/HIGH, General for others)
    // Here we'll just decrease emergencyBedsAvailable for simplicity of simulation.
    if (hospital.emergencyBedsAvailable > 0) {
      hospitalService.updateHospitalCapacity(hospitalId, {
        emergencyBedsAvailable: hospital.emergencyBedsAvailable - 1,
        occupiedBeds: hospital.occupiedBeds + 1,
        availableBeds: hospital.availableBeds - 1
      });
      return true;
    }
    return false;
  },

  acceptIncomingEmergency: (hospitalId: string, emergencyId: string): void => {
    notificationService.addNotification({
      message: `Hospital accepted incoming patient for emergency ${emergencyId}`,
      type: 'success',
      targetPortal: 'crew'
    });
  },

  rejectIncomingEmergency: (hospitalId: string, emergencyId: string): void => {
    notificationService.addNotification({
      message: `Hospital cannot accept incoming patient for emergency ${emergencyId}`,
      type: 'error',
      targetPortal: 'dispatcher'
    });
  }
};
