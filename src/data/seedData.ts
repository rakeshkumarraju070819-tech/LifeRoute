import { Ambulance, Hospital, Emergency, Notification } from '../types';
import { STORAGE_KEYS } from './constants';
import { storageService } from '../services/storageService';

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
    availableBeds: 120,
    occupiedBeds: 380,
    icuTotal: 50,
    icuAvailable: 15,
    emergencyBeds: 30,
    emergencyBedsAvailable: 8
  },
  {
    hospitalId: 'HOSP-002',
    name: 'St. Mary Medical Center',
    location: { lat: 40.7400, lng: -73.9800 },
    emergencyDepartmentStatus: 'BUSY',
    totalBeds: 300,
    availableBeds: 45,
    occupiedBeds: 255,
    icuTotal: 30,
    icuAvailable: 5,
    emergencyBeds: 20,
    emergencyBedsAvailable: 2
  },
  {
    hospitalId: 'HOSP-003',
    name: 'Northside Trauma Center',
    location: { lat: 40.7500, lng: -73.9700 },
    emergencyDepartmentStatus: 'FULL',
    totalBeds: 400,
    availableBeds: 10,
    occupiedBeds: 390,
    icuTotal: 40,
    icuAvailable: 0,
    emergencyBeds: 25,
    emergencyBedsAvailable: 0
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
    status: 'EN ROUTE TO PATIENT',
    eta: '5 mins',
    notes: 'Multiple vehicle collision. Proceed with caution.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    bedReserved: true
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
    status: 'ARRIVED AT HOSPITAL',
    eta: '0 mins',
    notes: 'Patient unresponsive.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    bedReserved: true
  }
];

export const SEED_NOTIFICATIONS: Notification[] = [];

export const initializeSeedData = (force = false) => {
  const hasEmergencies = localStorage.getItem(STORAGE_KEYS.EMERGENCIES);
  
  if (force || !hasEmergencies) {
    // Use storageService so the 'local-storage-update' event fires after each
    // write and the useSharedDataSync hook re-fetches automatically.
    storageService.setItem(STORAGE_KEYS.EMERGENCIES, SEED_EMERGENCIES);
    storageService.setItem(STORAGE_KEYS.AMBULANCES, SEED_AMBULANCES);
    storageService.setItem(STORAGE_KEYS.HOSPITALS, SEED_HOSPITALS);
    storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  }
};
