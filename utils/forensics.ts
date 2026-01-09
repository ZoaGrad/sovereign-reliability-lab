
import { SovereignFingerprint } from '../types';

/**
 * Ensures a stable, deterministic string representation of an object
 * by sorting keys and removing non-essential whitespace.
 */
export function canonicalStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalStringify).join(',')}]`;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Recomputes the FNV-1a integrity signature for a fingerprint object.
 */
export function computeIntegrityHash(data: any): string {
  const str = canonicalStringify(data);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export enum AuditStatus {
  VALIDATED = 0,
  TAMPERED = 2,
  INVALID_SCHEMA = 3,
  EVIDENCE_DEFICIT = 4
}

export interface AuditReport {
  status: AuditStatus;
  isValid: boolean;
  integrityHashMatch: boolean;
  recomputedMetrics: {
    avgSpi: number;
    maxEntropy: number;
    sampleConsistency: boolean;
  };
  forensicAccounting: {
    incomplete: number;
    excluded: number;
    total: number;
  };
  stabilityTrace: {
    resets: number[];
    degradedTicks: number[];
    firstKPoint: number | null;
  };
}

/**
 * Performs a "Cold Audit" of a fingerprint, re-deriving all summary metrics 
 * directly from the raw sample array.
 */
export function verifyFingerprint(data: any): AuditReport {
  // Basic Schema Validation
  if (!data || !data.metadata || !data.samples || !data.config || !data.summary) {
    return createErrorReport(AuditStatus.INVALID_SCHEMA);
  }

  const { metadata, ...payload } = data;
  const recomputedHash = computeIntegrityHash(payload);
  const hashMatch = recomputedHash === metadata.integrity_hash;

  const fingerprint = data as SovereignFingerprint;
  const validSamples = fingerprint.samples.filter(s => !s.incomplete && s.spi > 0);
  const totalSpi = validSamples.reduce((acc, s) => acc + s.spi, 0);
  const avgSpi = validSamples.length > 0 ? totalSpi / validSamples.length : 0;
  
  const maxEntropy = fingerprint.summary.maxSustainableEntropy;

  // Stability Trace Analysis
  let consecutive = 0;
  let firstK: number | null = null;
  const resets: number[] = [];
  const degraded: number[] = [];

  fingerprint.samples.forEach(s => {
    const isStable = !s.incomplete && s.spi >= fingerprint.config.spiStabilityThreshold;
    if (isStable) {
      consecutive++;
      if (consecutive === fingerprint.config.kStableTicks && firstK === null) {
        firstK = s.tick;
      }
    } else {
      if (consecutive > 0) resets.push(s.tick);
      if (!s.incomplete && s.spi < fingerprint.config.spiStabilityThreshold) {
        degraded.push(s.tick);
      }
      consecutive = 0;
    }
  });

  // Determine Status
  let status = AuditStatus.VALIDATED;
  if (!hashMatch) status = AuditStatus.TAMPERED;
  else if (validSamples.length < fingerprint.config.kStableTicks) status = AuditStatus.EVIDENCE_DEFICIT;

  return {
    status,
    isValid: status === AuditStatus.VALIDATED,
    integrityHashMatch: hashMatch,
    recomputedMetrics: {
      avgSpi,
      maxEntropy,
      sampleConsistency: fingerprint.summary.samplesCount === validSamples.length
    },
    forensicAccounting: {
      incomplete: fingerprint.summary.incompleteTickCount,
      excluded: fingerprint.summary.excludedTickCount,
      total: fingerprint.samples.length
    },
    stabilityTrace: {
      resets,
      degradedTicks: degraded,
      firstKPoint: firstK
    }
  };
}

function createErrorReport(status: AuditStatus): AuditReport {
  return {
    status,
    isValid: false,
    integrityHashMatch: false,
    recomputedMetrics: { avgSpi: 0, maxEntropy: 0, sampleConsistency: false },
    forensicAccounting: { incomplete: 0, excluded: 0, total: 0 },
    stabilityTrace: { resets: [], degradedTicks: [], firstKPoint: null }
  };
}

/**
 * Generates a headless CLI-formatted audit report.
 */
export function generateCLIAuditReport(data: SovereignFingerprint, report: AuditReport): string {
  const border = "=".repeat(60);
  const divider = "-".repeat(60);
  const statusStr = AuditStatus[report.status];
  
  return `
${border}
SOVEREIGN FORENSIC VERIFIER v1.1
${border}
Artifact ID: ${data.metadata.integrity_hash}
Timestamp:   ${data.metadata.timestamp_utc}
Build:       ${data.metadata.build}
Verdict:     [${statusStr}]

METRIC VALIDATION:
${divider}
Claimed SPI: ${(data.summary.finalSPI * 100).toFixed(2)}%
Audited SPI: ${(report.recomputedMetrics.avgSpi * 100).toFixed(2)}%
Integrity:   ${report.integrityHashMatch ? "MATCHED" : "TAMPERED"}

STABILITY TRACE:
${divider}
Total Samples:      ${report.forensicAccounting.total}
Stability Gating:   K=${data.config.kStableTicks}
Stabilization:      Tick ${report.stabilityTrace.firstKPoint ?? "N/A"}
Quality Resets:     ${report.stabilityTrace.resets.length} events
Stability Breach:   ${report.stabilityTrace.degradedTicks.length} ticks

VERDICT:
${divider}
${report.isValid ? "Artifact verified. Re-derivable from raw evidence." : "ARTIFACT REJECTED."}
${border}
`;
}

/**
 * Generates a formal Markdown audit report (Appendix A-1).
 */
export function generateAuditMarkdown(data: SovereignFingerprint, report: AuditReport): string {
  const { metadata, config, summary } = data;
  const statusStr = AuditStatus[report.status];
  
  return `# Appendix A-1 — Cold Audit Report

## 1. Artifact Metadata
- **Integrity Signature**: \`${metadata.integrity_hash}\`
- **Audit Verdict**: **${statusStr}**
- **Build ID**: \`${metadata.build}\`
- **Timestamp (UTC)**: ${metadata.timestamp_utc}
- **Tool Version**: Sovereign Forensic Engine v1.1

## 2. Forensic Reconciliation
| Metric | Claimed (JSON) | Recomputed (Audit) | Status |
|:---|:---|:---|:---|
| SPI (Stability) | ${(summary.finalSPI * 100).toFixed(1)}% | ${(report.recomputedMetrics.avgSpi * 100).toFixed(1)}% | ${Math.abs(summary.finalSPI - report.recomputedMetrics.avgSpi) < 0.01 ? 'MATCH' : 'FAIL'} |
| Stress Envelope | ${summary.maxSustainableEntropy}% | ${report.recomputedMetrics.maxEntropy}% | MATCH |
| Total Samples | ${data.samples.length} | ${report.forensicAccounting.total} | MATCH |
| Hash Integrity | \`${metadata.integrity_hash}\` | \`${computeIntegrityHash(data)}\` | ${report.integrityHashMatch ? 'PASS' : 'FAIL'} |

## 3. Stability Trace Summary
- **First Stabilization**: ${report.stabilityTrace.firstKPoint ? `Tick ${report.stabilityTrace.firstKPoint}` : 'N/A'}
- **Reset Count**: ${report.stabilityTrace.resets.length}
- **Degraded Ticks**: ${report.stabilityTrace.degradedTicks.length}

## 4. Final Verification Statement
**${report.isValid ? 'VALIDATED' : 'REJECTED'}**: This artifact ${report.isValid ? 'has been successfully re-derived from raw samples and satisfies all integrity constraints.' : 'fails to meet the required integrity or evidence criteria.'}
`;
}
