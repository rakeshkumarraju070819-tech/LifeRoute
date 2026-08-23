import { Hospital, Emergency } from '../types';
import { STORAGE_KEYS } from '../data/constants';
import { storageService } from './storageService';
import { notificationService } from './notificationService';
import { emergencyService } from './emergencyService';

// Resource requirements per emergency type
const RESOURCE_REQUIREMENTS: Record<string, { requiresICU: boolean; requiresEmergencyBed: boolean; requiresTrauma: boolean; requiresCardiac: boolean }> = {
  'Cardiac Arrest': { requiresICU: true, requiresEmergencyBed: true, requiresTrauma: false, requiresCardiac: true },
  'Respiratory Distress': { requiresICU: true, requiresEmergencyBed: true, requiresTrauma: false, requiresCardiac: false },
  'Trauma': { requiresICU: false, requiresEmergencyBed: true, requiresTrauma: true, requiresCardiac: false },
  'Vehicle Accident': { requiresICU: false, requiresEmergencyBed: true, requiresTrauma: true, requiresCardiac: false },
  'Traffic Accident': { requiresICU: false, requiresEmergencyBed: true, requiresTrauma: true, requiresCardiac: false },
  'default': { requiresICU: false, requiresEmergencyBed: true, requiresTrauma: false, requiresCardiac: false },
};

export function getResourceRequirements(emergencyType: string, severity: string) {
  const base = RESOURCE_REQUIREMENTS[emergencyType] || RESOURCE_REQUIREMENTS['default'];
  if (severity === 'CRITICAL') return { ...base, requiresICU: true };
  return base;
}

export interface ResourceCapacityDetail {
  total: number;
  occupied: number;
  reserved: number;
  available: number;
  text: string;
  status: 'AVAILABLE' | 'BUSY' | 'LIMITED' | 'FULL';
  pct: number;
}

export interface HospitalCapacityDetails {
  generalBeds: ResourceCapacityDetail;
  icu: ResourceCapacityDetail;
  emergencyDept: ResourceCapacityDetail;
  trauma: ResourceCapacityDetail;
  cardiac: ResourceCapacityDetail;
  overallStatus: 'AVAILABLE' | 'BUSY' | 'FULL';
}

export const hospitalService = {
  getHospitals: (): Hospital[] => {
    return storageService.getItem<Hospital[]>(STORAGE_KEYS.HOSPITALS) || [];
  },

  getHospitalById: (id: string): Hospital | undefined => {
    const hospitals = hospitalService.getHospitals();
    return hospitals.find(h => h.hospitalId === id);
  },

  /** Central calculation of capacity details for a hospital */
  getHospitalCapacityDetails: (hospital: Hospital): HospitalCapacityDetails => {
    // 1. General Beds
    const gTotal = hospital.totalBeds || 500;
    const gOcc = hospital.occupiedBeds || 0;
    const gRes = hospital.reservedBeds || 0;
    const gAvail = Math.max(0, gTotal - gOcc - gRes);
    const gPct = gTotal > 0 ? gAvail / gTotal : 0;
    const gStatus = gAvail === 0 ? 'FULL' : gPct < 0.2 ? 'BUSY' : 'AVAILABLE';

    // 2. ICU Beds
    const icuTot = hospital.icuTotal || 50;
    const icuOcc = hospital.icuOccupied || 0;
    const icuRes = hospital.icuReserved || 0;
    const icuAvail = Math.max(0, icuTot - icuOcc - icuRes);
    const icuPct = icuTot > 0 ? icuAvail / icuTot : 0;
    const icuStatus = icuAvail === 0 ? 'FULL' : icuPct < 0.25 ? 'BUSY' : 'AVAILABLE';

    // 3. Emergency Dept
    const eTot = hospital.emergencyBeds || 30;
    const eOcc = hospital.emergencyBedsOccupied || 0;
    const eRes = hospital.emergencyBedsReserved || 0;
    const eAvail = Math.max(0, eTot - eOcc - eRes);
    const ePct = eTot > 0 ? eAvail / eTot : 0;
    const eStatus = eAvail === 0 ? 'FULL' : eAvail <= 5 ? 'BUSY' : 'AVAILABLE';

    // 4. Trauma Unit
    const tTot = hospital.traumaTotal || 4;
    const tOcc = hospital.traumaOccupied || 0;
    const tRes = hospital.traumaReserved || 0;
    const tAvail = Math.max(0, tTot - tOcc - tRes);
    const tPct = tTot > 0 ? tAvail / tTot : 0;
    const tStatus = tAvail === 0 ? 'FULL' : tAvail <= 1 ? 'BUSY' : 'AVAILABLE';

    // 5. Cardiac Unit
    const cTot = hospital.cardiacTotal || 6;
    const cOcc = hospital.cardiacOccupied || 0;
    const cRes = hospital.cardiacReserved || 0;
    const cAvail = Math.max(0, cTot - cOcc - cRes);
    const cPct = cTot > 0 ? cAvail / cTot : 0;
    const cStatus = cAvail === 0 ? 'FULL' : cAvail <= 1 ? 'BUSY' : 'AVAILABLE';

    // 6. Overall Status
    let overallStatus: 'AVAILABLE' | 'BUSY' | 'FULL' = 'AVAILABLE';
    if (eStatus === 'FULL' && icuStatus === 'FULL' && gStatus === 'FULL') {
      overallStatus = 'FULL';
    } else if (hospital.emergencyDepartmentStatus === 'FULL') {
      overallStatus = 'FULL';
    } else if (eStatus === 'FULL' || icuAvail === 0 || eStatus === 'BUSY' || icuStatus === 'BUSY' || hospital.emergencyDepartmentStatus === 'BUSY') {
      overallStatus = 'BUSY';
    }

    return {
      generalBeds: { total: gTotal, occupied: gOcc, reserved: gRes, available: gAvail, text: `${gAvail}/${gTotal}`, status: gStatus, pct: gPct },
      icu: { total: icuTot, occupied: icuOcc, reserved: icuRes, available: icuAvail, text: `${icuAvail}/${icuTot}`, status: icuStatus, pct: icuPct },
      emergencyDept: { total: eTot, occupied: eOcc, reserved: eRes, available: eAvail, text: `${eAvail}/${eTot}`, status: eStatus, pct: ePct },
      trauma: { total: tTot, occupied: tOcc, reserved: tRes, available: tAvail, text: `${tAvail}/${tTot}`, status: tStatus, pct: tPct },
      cardiac: { total: cTot, occupied: cOcc, reserved: cRes, available: cAvail, text: `${cAvail}/${cTot}`, status: cStatus, pct: cPct },
      overallStatus,
    };
  },

  /** Calculate active incoming emergencies for a hospital */
  getHospitalIncomingCount: (hospitalId: string, emergencies: Emergency[]): number => {
    return emergencies.filter(e =>
      e.recommendedHospitalId === hospitalId &&
      ['EN_ROUTE_TO_HOSPITAL', 'WAITING_FOR_HOSPITAL', 'HOSPITAL_ACCEPTED'].includes(e.status)
    ).length;
  },

  /** Format incoming count display: "None", "1", "2", etc. */
  getHospitalIncomingText: (hospitalId: string, emergencies: Emergency[]): string => {
    const count = hospitalService.getHospitalIncomingCount(hospitalId, emergencies);
    return count > 0 ? count.toString() : 'None';
  },

  updateHospitalCapacity: (id: string, updates: Partial<Hospital>): Hospital | null => {
    const hospitals = hospitalService.getHospitals();
    const index = hospitals.findIndex(h => h.hospitalId === id);
    if (index === -1) return null;

    const updatedHospital = { ...hospitals[index], ...updates };
    
    // Automatically recalculate available counts and emergencyDepartmentStatus
    const details = hospitalService.getHospitalCapacityDetails(updatedHospital);
    updatedHospital.availableBeds = details.generalBeds.available;
    updatedHospital.icuAvailable = details.icu.available;
    updatedHospital.emergencyBedsAvailable = details.emergencyDept.available;
    if (updatedHospital.traumaTotal) updatedHospital.traumaAvailable = details.trauma.available;
    if (updatedHospital.cardiacTotal) updatedHospital.cardiacAvailable = details.cardiac.available;
    
    // If not explicitly set in updates, update emergencyDepartmentStatus from calculated status
    if (!updates.emergencyDepartmentStatus) {
      updatedHospital.emergencyDepartmentStatus = details.emergencyDept.status === 'LIMITED' ? 'BUSY' : details.emergencyDept.status;
    }

    hospitals[index] = updatedHospital;
    storageService.setItem(STORAGE_KEYS.HOSPITALS, hospitals);
    return hospitals[index];
  },

  /** Check if hospital can accept an emergency of this type/severity */
  canAcceptEmergency: (hospitalId: string, emergencyType: string, severity: string): { can: boolean; reason?: string } => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return { can: false, reason: 'Hospital not found.' };

    const details = hospitalService.getHospitalCapacityDetails(hospital);
    const reqs = getResourceRequirements(emergencyType, severity);

    if (reqs.requiresICU && details.icu.available <= 0) {
      return { can: false, reason: 'Insufficient ICU capacity for this emergency.' };
    }
    if (reqs.requiresEmergencyBed && details.emergencyDept.available <= 0) {
      return { can: false, reason: 'Emergency Department capacity unavailable.' };
    }
    if (reqs.requiresTrauma && details.trauma.available <= 0) {
      return { can: false, reason: 'Trauma Unit capacity unavailable.' };
    }
    if (details.overallStatus === 'FULL') {
      return { can: false, reason: 'Hospital is currently at full capacity.' };
    }

    return { can: true };
  },

  /** Reserve capacity when hospital accepts incoming emergency (reservation, not admission) */
  reserveCapacity: (hospitalId: string, emergencyType: string, severity: string): boolean => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return false;

    const reqs = getResourceRequirements(emergencyType, severity);
    const updates: Partial<Hospital> = {};

    if (reqs.requiresICU) {
      updates.icuReserved = (hospital.icuReserved || 0) + 1;
    }
    if (reqs.requiresEmergencyBed) {
      updates.emergencyBedsReserved = (hospital.emergencyBedsReserved || 0) + 1;
    }
    if (reqs.requiresTrauma) {
      updates.traumaReserved = (hospital.traumaReserved || 0) + 1;
    }
    if (reqs.requiresCardiac) {
      updates.cardiacReserved = (hospital.cardiacReserved || 0) + 1;
    }
    updates.reservedBeds = (hospital.reservedBeds || 0) + 1;

    hospitalService.updateHospitalCapacity(hospitalId, updates);
    return true;
  },

  /** Convert reservation to occupied when patient arrives at hospital */
  admitPatient: (hospitalId: string, emergencyType: string, severity: string): void => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return;

    const reqs = getResourceRequirements(emergencyType, severity);
    const updates: Partial<Hospital> = {};

    if (reqs.requiresICU) {
      updates.icuReserved = Math.max(0, (hospital.icuReserved || 0) - 1);
      updates.icuOccupied = (hospital.icuOccupied || 0) + 1;
    }
    if (reqs.requiresEmergencyBed) {
      updates.emergencyBedsReserved = Math.max(0, (hospital.emergencyBedsReserved || 0) - 1);
      updates.emergencyBedsOccupied = (hospital.emergencyBedsOccupied || 0) + 1;
    }
    if (reqs.requiresTrauma) {
      updates.traumaReserved = Math.max(0, (hospital.traumaReserved || 0) - 1);
      updates.traumaOccupied = (hospital.traumaOccupied || 0) + 1;
    }
    if (reqs.requiresCardiac) {
      updates.cardiacReserved = Math.max(0, (hospital.cardiacReserved || 0) - 1);
      updates.cardiacOccupied = (hospital.cardiacOccupied || 0) + 1;
    }
    updates.reservedBeds = Math.max(0, (hospital.reservedBeds || 0) - 1);
    updates.occupiedBeds = (hospital.occupiedBeds || 0) + 1;

    hospitalService.updateHospitalCapacity(hospitalId, updates);
  },

  /** Release capacity on completion or cancellation */
  releaseCapacity: (hospitalId: string, emergencyType: string, severity: string, wasAdmitted: boolean): void => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return;

    const reqs = getResourceRequirements(emergencyType, severity);
    const updates: Partial<Hospital> = {};

    if (wasAdmitted) {
      if (reqs.requiresICU) {
        updates.icuOccupied = Math.max(0, (hospital.icuOccupied || 0) - 1);
      }
      if (reqs.requiresEmergencyBed) {
        updates.emergencyBedsOccupied = Math.max(0, (hospital.emergencyBedsOccupied || 0) - 1);
      }
      if (reqs.requiresTrauma) {
        updates.traumaOccupied = Math.max(0, (hospital.traumaOccupied || 0) - 1);
      }
      if (reqs.requiresCardiac) {
        updates.cardiacOccupied = Math.max(0, (hospital.cardiacOccupied || 0) - 1);
      }
      updates.occupiedBeds = Math.max(0, (hospital.occupiedBeds || 0) - 1);
    } else {
      // Patient never arrived — release reserved slots
      if (reqs.requiresICU) {
        updates.icuReserved = Math.max(0, (hospital.icuReserved || 0) - 1);
      }
      if (reqs.requiresEmergencyBed) {
        updates.emergencyBedsReserved = Math.max(0, (hospital.emergencyBedsReserved || 0) - 1);
      }
      if (reqs.requiresTrauma) {
        updates.traumaReserved = Math.max(0, (hospital.traumaReserved || 0) - 1);
      }
      if (reqs.requiresCardiac) {
        updates.cardiacReserved = Math.max(0, (hospital.cardiacReserved || 0) - 1);
      }
      updates.reservedBeds = Math.max(0, (hospital.reservedBeds || 0) - 1);
    }

    hospitalService.updateHospitalCapacity(hospitalId, updates);
  },

  /** Accept incoming emergency — updates shared emergency record + reserves capacity */
  acceptIncomingEmergency: (hospitalId: string, emergencyId: string): { success: boolean; reason?: string } => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    if (!hospital) return { success: false, reason: 'Hospital not found.' };

    const emergency = emergencyService.getEmergencyById(emergencyId);
    if (!emergency) return { success: false, reason: 'Emergency not found.' };

    if (emergency.hospitalResponse === 'ACCEPTED') {
      return { success: false, reason: 'Already accepted.' };
    }

    const check = hospitalService.canAcceptEmergency(hospitalId, emergency.type, emergency.severity);
    if (!check.can) {
      notificationService.addNotification({
        title: 'Hospital Cannot Accept',
        message: `${hospital.name} cannot accept ${emergencyId}: ${check.reason}`,
        type: 'error',
        targetRole: 'DISPATCHER',
        emergencyId
      });
      return { success: false, reason: check.reason };
    }

    emergencyService.updateEmergency(emergencyId, {
      hospitalResponse: 'ACCEPTED',
      hospitalAcceptedAt: new Date().toISOString(),
      hospitalAcceptedBy: hospitalId,
    });

    hospitalService.reserveCapacity(hospitalId, emergency.type, emergency.severity);

    notificationService.addNotification({
      title: 'Hospital Ready',
      message: `${hospital.name} is ready to receive ${emergencyId}. Proceed to hospital.`,
      type: 'success',
      targetRole: 'CREW',
      emergencyId
    });

    notificationService.addNotification({
      title: 'Hospital Confirmed Readiness',
      message: `${hospital.name} accepted emergency ${emergencyId} and is ready to receive.`,
      type: 'info',
      targetRole: 'DISPATCHER',
      emergencyId
    });

    return { success: true };
  },

  /** Decline incoming emergency */
  rejectIncomingEmergency: (hospitalId: string, emergencyId: string): void => {
    const hospital = hospitalService.getHospitalById(hospitalId);
    const emergency = emergencyService.getEmergencyById(emergencyId);

    if (emergency) {
      emergencyService.updateEmergency(emergencyId, {
        hospitalResponse: 'DECLINED',
      });
    }

    notificationService.addNotification({
      title: 'Hospital Unavailable',
      message: `${hospital?.name || 'Hospital'} cannot accept ${emergencyId}. Please assign another hospital.`,
      type: 'error',
      targetRole: 'DISPATCHER',
      emergencyId
    });

    notificationService.addNotification({
      title: 'Hospital Unavailable',
      message: `${hospital?.name || 'Hospital'} cannot accept ${emergencyId}. Dispatcher is assigning an alternate hospital.`,
      type: 'warning',
      targetRole: 'CREW',
      emergencyId
    });
  }
};
