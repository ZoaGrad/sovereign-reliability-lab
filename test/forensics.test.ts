
// Import Jest test globals to resolve "Cannot find name" errors in TypeScript environments
import { describe, expect, test } from '@jest/globals';
import { canonicalStringify, computeIntegrityHash, verifyFingerprint, AuditStatus } from '../utils/forensics';

describe('Sovereign Forensics Toolchain', () => {
  const mockPayload = {
    config: { kStableTicks: 3, spiStabilityThreshold: 0.85 },
    summary: { finalSPI: 0.9, maxSustainableEntropy: 0 },
    samples: [
      { tick: 1, spi: 0.9, incomplete: false },
      { tick: 2, spi: 0.9, incomplete: false },
      { tick: 3, spi: 0.9, incomplete: false }
    ]
  };

  test('canonicalStringify ensures deterministic key ordering', () => {
    const objA = { z: 1, a: 2 };
    const objB = { a: 2, z: 1 };
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  test('computeIntegrityHash produces stable signatures', () => {
    const hash = computeIntegrityHash(mockPayload);
    expect(hash).toMatch(/^[0-9A-F]{8}$/);
    expect(computeIntegrityHash(mockPayload)).toBe(hash);
  });

  test('verifyFingerprint detects tampered data', () => {
    const tampered = {
      ...mockPayload,
      metadata: { integrity_hash: 'FFFFFFFF' }
    };
    const report = verifyFingerprint(tampered);
    expect(report.status).toBe(AuditStatus.TAMPERED);
  });

  test('verifyFingerprint validates clean evidence', () => {
    const clean = {
      ...mockPayload,
      metadata: { 
        integrity_hash: computeIntegrityHash(mockPayload),
        timestamp_utc: new Date().toISOString(),
        build: 'test'
      }
    };
    const report = verifyFingerprint(clean);
    expect(report.status).toBe(AuditStatus.VALIDATED);
  });
});
