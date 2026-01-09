
export interface WorkEvent {
  id: string;
  workerId: string;
  timestamp: number;
  tick: number;
  mode: 'chaos' | 'order';
  phaseMs: number;
  netMs: number;
  workMs: number;
}

export interface SimulationState {
  enabled: boolean;
  workerCount: number;
  baseOffset: number;
  maxSkew: number;
  entropy: number;
}

export interface MetricData {
  range: string;
  count: number;
}

export type MissionStatus = 
  | 'IDLE' 
  | 'CALIBRATING_BASELINE' 
  | 'INJECTING_ENVELOPE_STRESS' 
  | 'BOUNDARY_ANALYSIS' 
  | 'FINALIZING_AUDIT' 
  | 'BUNDLE_READY' 
  | 'FAILED';

export interface SovereignFingerprint {
  schema_version: string;
  metadata: {
    build: string;
    timestamp_utc: string;
    integrity_hash: string;
  };
  config: {
    workers: number;
    baseOffsetMs: number;
    maxSkewMs: number;
    spiStabilityThreshold: number;
    kStableTicks: number;
    corridorMs: number;
  };
  summary: {
    maxSustainableEntropy: number;
    finalEntropy: number;
    finalSPI: number;
    samplesCount: number;
    incompleteTickCount: number;
    excludedTickCount: number;
  };
  samples: Array<{
    tick: number;
    t: number;
    entropySnapshot: number;
    spi: number;
    regime: string;
    spreadMs: number;
    corridorMs: number;
    eventsInTick: number;
    incomplete: boolean;
  }>;
}
