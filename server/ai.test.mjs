import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendHospital } from './ai.mjs';

test('recommends a ready specialty hospital over a nearer unavailable hospital', () => {
  const result = recommendHospital({
    emergencyType: 'Cardiac Arrest',
    severity: 'CRITICAL',
    origin: { lat: 40.7128, lng: -74.006 },
    hospitals: [
      {
        id: 'near', name: 'Near Hospital', status: 'FULL', location: { lat: 40.713, lng: -74.006 },
        emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 10, total: 20 }, cardiac: { status: 'AVAILABLE' },
      },
      {
        id: 'ready', name: 'Ready Cardiac Center', status: 'OPEN', location: { lat: 40.72, lng: -74.01 },
        emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 5, total: 20 }, cardiac: { status: 'AVAILABLE' },
      },
    ],
  });

  assert.equal(result.hospitalId, 'ready');
  assert.equal(result.specialty, 'cardiac');
  assert.equal(result.readiness.specialtyReady, true);
});