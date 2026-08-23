import { Ambulance, Hospital, Emergency, Notification } from '../types';
import { STORAGE_KEYS } from './constants';

export const SEED_AMBULANCES: Ambulance[] = [
  {
    ambulanceId: 'AMB-001',
    crew: 'Team Alpha',
    status: 'AVAILABLE',
    currentLocation: { lat: 40.7128, lng: -74.0060 },
    station: 'Central Station',
    assignedEmergencyId: null,
    lastUpdatedTime: new Date().toISOString()
  },
  {
    ambulanceId: 'AMB-002',
    crew: 'Team Bravo',
    status: 'AVAILABLE',
    currentLocation: { lat: 40.7200, lng: -74.0100 },
    station: 'North Station',
    assignedEmergencyId: null,
    lastUpdatedTime: new Date().toISOString()
  },
  {
    ambulanceId: 'AMB-003',
    crew: 'Team Charlie',
    status: 'EN ROUTE',
    currentLocation: { lat: 40.7150, lng: -74.0150 },
    station: 'West Station',
    assignedEmergencyId: 'EM-1000', // Pre-assigned in demo
    lastUpdatedTime: new Date().toISOString()
  },
  {
    ambulanceId: 'AMB-004',
    crew: 'Team Delta',
    status: 'AT HOSPITAL',
    currentLocation: { lat: 40.7300, lng: -73.9950 },
    station: 'East Station',
    assignedEmergencyId: 'EM-0999',
    lastUpdatedTime: new Date().toISOString()
  }
];

export const SEED_HOSPITALS: Hospital[] = [
  {
    hospitalId: 'HOSP-001',
    name: 'City General Hospital',
    location: { lat: 40.7300, lng: -73.9950 },
    emergencyDepartmentStatus: 'AVAILABLE',
    totalBeds: 500,
    occupiedBeds: 380,
    reservedBeds: 0,
    availableBeds: 120,
    icuTotal: 50,
    icuOccupied: 35,
    icuReserved: 0,
    icuAvailable: 15,
    emergencyBeds: 30,
    emergencyBedsOccupied: 22,
    emergencyBedsReserved: 0,
    emergencyBedsAvailable: 8,
    traumaTotal: 4,
    traumaOccupied: 2,
    traumaReserved: 0,
    traumaAvailable: 2,
    cardiacTotal: 6,
    cardiacOccupied: 3,
    cardiacReserved: 0,
    cardiacAvailable: 3,
  },
  {
    hospitalId: 'HOSP-002',
    name: 'St. Mary Medical Center',
    location: { lat: 40.7400, lng: -73.9800 },
    emergencyDepartmentStatus: 'BUSY',
    totalBeds: 300,
    occupiedBeds: 255,
    reservedBeds: 0,
    availableBeds: 45,
    icuTotal: 30,
    icuOccupied: 25,
    icuReserved: 0,
    icuAvailable: 5,
    emergencyBeds: 20,
    emergencyBedsOccupied: 18,
    emergencyBedsReserved: 0,
    emergencyBedsAvailable: 2,
    traumaTotal: 4,
    traumaOccupied: 2,
    traumaReserved: 0,
    traumaAvailable: 2,
    cardiacTotal: 6,
    cardiacOccupied: 3,
    cardiacReserved: 0,
    cardiacAvailable: 3,
  },
  {
    hospitalId: 'HOSP-003',
    name: 'Northside Trauma Center',
    location: { lat: 40.7500, lng: -73.9700 },
    emergencyDepartmentStatus: 'FULL',
    totalBeds: 400,
    occupiedBeds: 390,
    reservedBeds: 0,
    availableBeds: 10,
    icuTotal: 40,
    icuOccupied: 40,
    icuReserved: 0,
    icuAvailable: 0,
    emergencyBeds: 25,
    emergencyBedsOccupied: 25,
    emergencyBedsReserved: 0,
    emergencyBedsAvailable: 0,
    traumaTotal: 4,
    traumaOccupied: 4,
    traumaReserved: 0,
    traumaAvailable: 0,
    cardiacTotal: 6,
    cardiacOccupied: 6,
    cardiacReserved: 0,
    cardiacAvailable: 0,
  }
];

export const SEED_EMERGENCIES: Emergency[] = [
  {
    emergencyId: 'EM-1000',
    type: 'Vehicle Accident',
    severity: 'HIGH',
    pickupLocation: 'Highway 61, Mile 12',
    latitude: 40.7160,
    longitude: -74.0160,
    assignedAmbulanceId: 'AMB-003',
    recommendedHospitalId: 'HOSP-001',
    status: 'EN_ROUTE_TO_PATIENT',
    eta: '5 mins',
    notes: 'Multiple vehicle collision. Proceed with caution.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    bedReserved: true,
    hospitalResponse: 'WAITING',
    statusHistory: [
      { status: 'ASSIGNED', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), updatedBy: 'System' },
      { status: 'EN_ROUTE_TO_PATIENT', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), updatedBy: 'System' }
    ]
  },
  {
    emergencyId: 'EM-0999',
    type: 'Cardiac Arrest',
    severity: 'CRITICAL',
    pickupLocation: '123 Main St, Apt 4B',
    latitude: 40.7300,
    longitude: -73.9960,
    assignedAmbulanceId: 'AMB-004',
    recommendedHospitalId: 'HOSP-001',
    status: 'ARRIVED_AT_HOSPITAL',
    eta: '0 mins',
    notes: 'Patient unresponsive.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    bedReserved: true,
    hospitalResponse: 'ACCEPTED',
    hospitalAcceptedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    hospitalAcceptedBy: 'HOSP-001',
    statusHistory: [
      { status: 'ASSIGNED', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), updatedBy: 'System' },
      { status: 'ARRIVED_AT_HOSPITAL', timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(), updatedBy: 'System' }
    ]
  }
];

export const SEED_NOTIFICATIONS: Notification[] = [];

export const initializeSeedData = (force = false) => {
  const hasEmergencies = localStorage.getItem(STORAGE_KEYS.EMERGENCIES);
  
  if (force || !hasEmergencies) {
    localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(SEED_EMERGENCIES));
    localStorage.setItem(STORAGE_KEYS.AMBULANCES, JSON.stringify(SEED_AMBULANCES));
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(SEED_HOSPITALS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
    // Trigger custom event for same-tab sync
    window.dispatchEvent(new Event('local-storage-update'));
  }
};
