export type EmergencyStatus = 
  | 'ASSIGNED'
  | 'EN_ROUTE_TO_PATIENT'
  | 'ARRIVED_AT_SCENE'
  | 'PATIENT_PICKED_UP'
  | 'EN_ROUTE_TO_HOSPITAL'
  | 'ARRIVED_AT_HOSPITAL'
  | 'COMPLETED'
  | 'CANCELLED';

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
  reservedBeds?: number;
  icuTotal: number;
  icuAvailable: number;
  icuOccupied: number;
  icuReserved?: number;
  emergencyBeds: number;
  emergencyBedsAvailable: number;
  emergencyBedsOccupied?: number;
  emergencyBedsReserved?: number;
  traumaTotal?: number;
  traumaAvailable?: number;
  traumaOccupied?: number;
  traumaReserved?: number;
  cardiacTotal?: number;
  cardiacAvailable?: number;
  cardiacOccupied?: number;
  cardiacReserved?: number;
}

export interface StatusHistoryEntry {
  status: EmergencyStatus;
  timestamp: string;
  updatedBy: string;
}

export interface Emergency {
  emergencyId: string;
  id?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pickupLocation: string;
  latitude: number;
  longitude: number;
  assignedAmbulanceId: string | null;
  ambulanceId?: string | null;
  recommendedHospitalId: string | null;
  hospitalId?: string | null;
  status: EmergencyStatus;
  eta: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  bedReserved: boolean;
  hospitalResponse?: 'WAITING' | 'ACCEPTED' | 'DECLINED';
  hospitalAcceptedAt?: string;
  hospitalAcceptedBy?: string;
  statusHistory?: StatusHistoryEntry[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  emergencyId?: string;
  referenceId?: string;
  targetRole?: 'DISPATCHER' | 'CREW' | 'HOSPITAL';
  targetAmbulanceId?: string;
  targetHospitalId?: string;
  targetUserId?: string;
  read: boolean;
}
