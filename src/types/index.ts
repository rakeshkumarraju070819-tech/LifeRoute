export type EmergencyStatus = 
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN ROUTE TO PATIENT'
  | 'ARRIVED AT PATIENT'
  | 'PATIENT PICKED UP'
  | 'EN ROUTE TO HOSPITAL'
  | 'ARRIVED AT HOSPITAL'
  | 'COMPLETED';

export type AmbulanceStatus = 
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN ROUTE' // Can map EN ROUTE TO PATIENT and EN ROUTE TO HOSPITAL
  | 'AT HOSPITAL'
  | 'OFF DUTY';

export interface Location {
  lat: number;
  lng: number;
}

export interface Ambulance {
  ambulanceId: string;
  crew: string;
  status: AmbulanceStatus;
  currentLocation: Location;
  station: string;
  assignedEmergencyId: string | null;
  lastUpdatedTime: string;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  location: Location;
  emergencyDepartmentStatus: 'AVAILABLE' | 'BUSY' | 'FULL';
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  icuTotal: number;
  icuAvailable: number;
  emergencyBeds: number;
  emergencyBedsAvailable: number;
}

export interface Emergency {
  emergencyId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pickupLocation: string;
  latitude: number;
  longitude: number;
  assignedAmbulanceId: string | null;
  recommendedHospitalId: string | null;
  status: EmergencyStatus;
  eta: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  bedReserved: boolean;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetPortal?: 'dispatcher' | 'crew' | 'hospital';
}
