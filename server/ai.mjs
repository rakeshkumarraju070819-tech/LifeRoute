const SPECIALTY_BY_TYPE = {
  'CARDIAC ARREST': 'cardiac',
  'TRAFFIC ACCIDENT': 'trauma',
  TRAUMA: 'trauma',
  RESPIRATORY: 'emergency',
};

const SEVERITY_WEIGHT = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function distanceKm(origin, destination) {
  const toRadians = value => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const latitude = toRadians((origin.lat + destination.lat) / 2);
  const x = longitudeDelta * Math.cos(latitude);
  const y = latitudeDelta;
  return Math.sqrt(x * x + y * y) * 6371;
}

function readinessFor(hospital, specialty) {
  const departmentReady = hospital.emergencyDepartment?.status === 'AVAILABLE' || hospital.emergencyDepartment?.status === 'LIMITED';
  const specialtyReady = specialty === 'emergency' || hospital[specialty]?.status === 'AVAILABLE';
  const icuReady = hospital.icu?.available > 0;
  return { departmentReady, specialtyReady, icuReady };
}

export function recommendHospital({ emergencyType, severity, origin, hospitals }) {
  if (!origin || !Array.isArray(hospitals) || hospitals.length === 0) {
    const error = new Error('origin and at least one hospital are required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedSeverity = String(severity || 'MEDIUM').toUpperCase();
  const specialty = SPECIALTY_BY_TYPE[String(emergencyType || '').toUpperCase()] || 'emergency';
  const severityWeight = SEVERITY_WEIGHT[normalizedSeverity] || SEVERITY_WEIGHT.MEDIUM;

  const ranked = hospitals
    .map(hospital => {
      const distance = distanceKm(origin, hospital.location);
      const readiness = readinessFor(hospital, specialty);
      const capacityRatio = hospital.icu?.total ? hospital.icu.available / hospital.icu.total : 0;
      const unavailable = hospital.status === 'CLOSED' || hospital.status === 'FULL';
      const score = unavailable
        ? -Infinity
        : (readiness.departmentReady ? 30 : 0) +
          (readiness.specialtyReady ? 35 : 0) +
          (readiness.icuReady ? 15 + capacityRatio * 10 : severityWeight < 3 ? 5 : 0) -
          distance * 2;

      return {
        hospital,
        distanceKm: Number(distance.toFixed(1)),
        etaMinutes: Math.max(2, Math.round(distance * 3.5)),
        readiness,
        score,
      };
    })
    .filter(candidate => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    const error = new Error('No available hospital matches this emergency');
    error.statusCode = 409;
    throw error;
  }

  const best = ranked[0];
  return {
    hospitalId: best.hospital.id,
    hospitalName: best.hospital.name,
    distanceKm: best.distanceKm,
    etaMinutes: best.etaMinutes,
    specialty,
    readiness: best.readiness,
    confidence: Math.min(99, Math.max(60, Math.round(70 + best.score / 3))),
    reasons: [
      best.readiness.departmentReady ? 'Emergency department accepting patients' : 'Emergency department has limited readiness',
      best.readiness.specialtyReady ? `${specialty} capability available` : `${specialty} capability needs confirmation`,
      best.readiness.icuReady ? 'ICU capacity available' : 'No ICU capacity reported',
      `${best.distanceKm} km estimated travel distance`,
    ],
    alternatives: ranked.slice(1, 3).map(candidate => ({
      hospitalId: candidate.hospital.id,
      hospitalName: candidate.hospital.name,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
    })),
  };
}