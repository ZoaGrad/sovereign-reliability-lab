
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WorkEvent, SovereignFingerprint, MissionStatus } from './types';
import { PhaseController } from './services/phaseController';
import FleetPulse from './components/FleetPulse';
import InterArrivalHistogram from './components/InterArrivalHistogram';
import SystemExplainer from './components/SystemExplainer';
import { 
  computeIntegrityHash, 
  verifyFingerprint, 
  AuditReport, 
  AuditStatus 
} from './utils/forensics';
import { downloadProofBundle } from './utils/bundle';

const WORKER_COUNT = 50;
const TICK_RATE = 1000;
const TARGET_SMEAR = 257; 
const SPI_STABILITY_THRESHOLD = 0.85;
const SPI_DEGRADED_THRESHOLD = 0.60;
const REQUIRED_STABLE_TICKS = 3; 

const App: React.FC = () => {
  const [isOrder, setIsOrder] = useState(true);
  const [entropy, setEntropy] = useState(0); 
  const [tickCount, setTickCount] = useState(0);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [metrics, setMetrics] = useState({ avgPhase: 0, avgNet: 0, spi: 0, cse: 0 });
  const [replayedFingerprint, setReplayedFingerprint] = useState<SovereignFingerprint | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [missionStatus, setMissionStatus] = useState<MissionStatus>('IDLE');
  const [missionError, setMissionError] = useState<string | null>(null);
  const [vault, setVault] = useState<Array<{ id: string; timestamp: string; spi: number; cse: number }>>([]);
  
  const spiSamples = useRef<SovereignFingerprint['samples']>([]);
  const consecutiveStableTicks = useRef<number>(0);
  const lastEntropyRef = useRef<number>(0);
  const globalTickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const tickCompletionRef = useRef<Record<number, number>>({});
  const finalizedTicks = useRef<Set<number>>(new Set());

  // Forensic Accounting
  const incompleteTickCount = useRef<number>(0);
  const excludedTickCount = useRef<number>(0);

  const controller = useMemo(() => new PhaseController(isOrder, 57, 200), [isOrder]);

  const regime = useMemo(() => {
    if (metrics.spi >= SPI_STABILITY_THRESHOLD) return 'WITHIN_ENVELOPE';
    if (metrics.spi >= SPI_DEGRADED_THRESHOLD) return 'DEGRADED';
    return 'COLLAPSE';
  }, [metrics.spi]);

  const injectEntropyDelay = useCallback(() => {
    if (entropy <= 0) return 0;
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random() || 0.0001;
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const sigma = (entropy / 100) * 50;
    const jitter = Math.abs(z0 * sigma);
    let spike = 0;
    if (Math.random() < (entropy / 100) * 0.05) {
      spike = 200 + Math.random() * 300;
    }
    return jitter + spike;
  }, [entropy]);

  const runTickAnalytics = useCallback((currentTick: number, tickEvents: WorkEvent[], forceIncomplete = false) => {
    if (finalizedTicks.current.has(currentTick)) return;
    finalizedTicks.current.add(currentTick);

    const isIncomplete = forceIncomplete || tickEvents.length < WORKER_COUNT;
    if (isIncomplete) incompleteTickCount.current++;
    
    const timestamps = tickEvents.map(e => e.timestamp);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const spread = tickEvents.length >= 2 ? maxTs - minTs : 0;
    
    const newSpi = isIncomplete ? 0 : Math.min(spread / TARGET_SMEAR, 1.2);

    if (!isIncomplete && newSpi < SPI_STABILITY_THRESHOLD) {
      excludedTickCount.current++;
    }

    if (Math.abs(entropy - lastEntropyRef.current) > 0.1) {
      consecutiveStableTicks.current = 0;
    }
    lastEntropyRef.current = entropy;

    const currentRegime = newSpi >= SPI_STABILITY_THRESHOLD ? 'WITHIN_ENVELOPE' : (newSpi >= SPI_DEGRADED_THRESHOLD ? 'DEGRADED' : 'COLLAPSE');

    const sample = {
      tick: currentTick,
      t: Date.now(),
      entropySnapshot: entropy,
      spi: newSpi,
      regime: currentRegime,
      spreadMs: spread,
      corridorMs: TARGET_SMEAR,
      eventsInTick: tickEvents.length,
      incomplete: isIncomplete
    };
    
    spiSamples.current = [...spiSamples.current.slice(-299), sample];

    if (newSpi >= SPI_STABILITY_THRESHOLD && !isIncomplete) {
      consecutiveStableTicks.current += 1;
    } else {
      consecutiveStableTicks.current = 0;
    }

    setMetrics(m => {
      let updatedCse = m.cse;
      if (consecutiveStableTicks.current >= REQUIRED_STABLE_TICKS && entropy > m.cse) {
        updatedCse = entropy;
      }
      return { ...m, spi: newSpi, cse: updatedCse };
    });
  }, [entropy]);

  const assembleFingerprint = useCallback(() => {
    const validSamples = spiSamples.current.filter(s => s.spi > 0 && !s.incomplete);
    const baseData = {
      schema_version: "1.1",
      config: {
        workers: WORKER_COUNT,
        baseOffsetMs: 57,
        maxSkewMs: 200,
        spiStabilityThreshold: SPI_STABILITY_THRESHOLD,
        kStableTicks: REQUIRED_STABLE_TICKS,
        corridorMs: TARGET_SMEAR
      },
      summary: {
        maxSustainableEntropy: metrics.cse,
        finalEntropy: entropy,
        finalSPI: metrics.spi,
        samplesCount: validSamples.length,
        incompleteTickCount: incompleteTickCount.current,
        excludedTickCount: excludedTickCount.current
      },
      samples: spiSamples.current 
    };
    return {
      ...baseData,
      metadata: {
        build: "8834-A-PATCH-5",
        timestamp_utc: new Date().toISOString(),
        integrity_hash: computeIntegrityHash(baseData)
      }
    } as SovereignFingerprint;
  }, [metrics.cse, metrics.spi, entropy]);

  const finalizeResearchMission = useCallback(() => {
    setMissionStatus('FINALIZING_AUDIT');
    const fingerprint = assembleFingerprint();
    
    // Immediate Forensic Audit
    const report = verifyFingerprint(fingerprint);
    
    setVault(prev => [
      { 
        id: fingerprint.metadata.integrity_hash, 
        timestamp: fingerprint.metadata.timestamp_utc,
        spi: fingerprint.summary.finalSPI,
        cse: fingerprint.summary.maxSustainableEntropy
      },
      ...prev
    ]);
    
    setAuditReport(report);
    setReplayedFingerprint(fingerprint);

    if (report.status === AuditStatus.VALIDATED) {
      setMissionStatus('BUNDLE_READY');
    } else {
      setMissionStatus('FAILED');
      setMissionError(`Audit failed: ${AuditStatus[report.status]}`);
    }
  }, [assembleFingerprint]);

  const loadFingerprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as SovereignFingerprint;
        const report = verifyFingerprint(data);
        setAuditReport(report);
        setReplayedFingerprint(data);
        setIsOrder(true);
        setEntropy(data.summary.finalEntropy);
        setMetrics({
           avgPhase: data.config.baseOffsetMs,
           avgNet: 0,
           spi: data.summary.finalSPI,
           cse: data.summary.maxSustainableEntropy
        });
        spiSamples.current = data.samples;
      } catch (err) {
        alert("CRITICAL: Fingerprint Corrupted.");
      }
    };
    reader.readAsText(file);
  };

  const processWorker = useCallback(async (workerId: string, tick: number, mode: 'chaos' | 'order') => {
    const phaseMs = mode === 'order' ? controller.computeDelay(workerId) : 0;
    if (phaseMs > 0) await controller.waitDelay(phaseMs);
    await controller.waitDelay(10); 
    const netMs = injectEntropyDelay();
    if (netMs > 0) await controller.waitDelay(netMs);

    const newEvent: WorkEvent = {
      id: `${tick}-${workerId}-${Math.random().toString(36).substr(2, 5)}`,
      workerId, timestamp: Date.now(), tick, mode, phaseMs, netMs, workMs: 10
    };
    
    setEvents(prev => {
      const next = [...prev.slice(-1000), newEvent];
      tickCompletionRef.current[tick] = (tickCompletionRef.current[tick] || 0) + 1;
      if (tickCompletionRef.current[tick] === WORKER_COUNT) {
        const tickEvents = next.filter(e => e.tick === tick);
        runTickAnalytics(tick, tickEvents);
      }
      return next;
    });
    
    setMetrics(prev => ({
      ...prev,
      avgPhase: (prev.avgPhase * 99 + phaseMs) / 100,
      avgNet: (prev.avgNet * 99 + netMs) / 100
    }));
  }, [isOrder, entropy, injectEntropyDelay, controller, runTickAnalytics]);

  const startSimulation = useCallback(() => {
    if (globalTickInterval.current) clearInterval(globalTickInterval.current);
    setEvents([]);
    setTickCount(0);
    spiSamples.current = [];
    consecutiveStableTicks.current = 0;
    tickCompletionRef.current = {};
    finalizedTicks.current = new Set();
    incompleteTickCount.current = 0;
    excludedTickCount.current = 0;
    setMetrics({ avgPhase: 0, avgNet: 0, spi: 0, cse: 0 });
    setReplayedFingerprint(null);
    setAuditReport(null);

    globalTickInterval.current = setInterval(() => {
      setTickCount(t => {
        if (t > 0 && !finalizedTicks.current.has(t)) {
          setEvents(currentEvents => {
            const tickEvents = currentEvents.filter(e => e.tick === t);
            runTickAnalytics(t, tickEvents, true);
            return currentEvents;
          });
        }
        const nextTick = t + 1;
        for (let i = 0; i < WORKER_COUNT; i++) {
          processWorker(`worker-${i.toString().padStart(2, '0')}`, nextTick, isOrder ? 'order' : 'chaos');
        }
        return nextTick;
      });
    }, TICK_RATE);
  }, [processWorker, isOrder, runTickAnalytics]);

  const runResearchMission = useCallback(async () => {
    setMissionStatus('CALIBRATING_BASELINE');
    setMissionError(null);
    setIsOrder(true);
    setEntropy(0);
    startSimulation();
    
    await new Promise(r => setTimeout(r, 6000));
    setEntropy(40);
    setMissionStatus('INJECTING_ENVELOPE_STRESS');
    
    await new Promise(r => setTimeout(r, 6000));
    setEntropy(75);
    setMissionStatus('BOUNDARY_ANALYSIS');
    
    await new Promise(r => setTimeout(r, 6000));
    finalizeResearchMission();
  }, [startSimulation, finalizeResearchMission]);

  const handleDownloadBundle = useCallback(() => {
    if (!replayedFingerprint || !auditReport) return;
    downloadProofBundle(replayedFingerprint, auditReport);
  }, [replayedFingerprint, auditReport]);

  useEffect(() => {
    const isAutomation = missionStatus !== 'IDLE' && missionStatus !== 'BUNDLE_READY' && missionStatus !== 'FAILED';
    if (!isAutomation && !replayedFingerprint) startSimulation();
    return () => { if (globalTickInterval.current) clearInterval(globalTickInterval.current); };
  }, [isOrder, missionStatus, replayedFingerprint]);

  const isMissionActive = missionStatus !== 'IDLE' && missionStatus !== 'BUNDLE_READY' && missionStatus !== 'FAILED';
  const isForensicMode = !!replayedFingerprint;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#333] pb-6 gap-6">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#0f0]/30"></div>
          <h1 className="text-3xl font-black tracking-tighter text-[#0f0] flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isOrder ? 'bg-[#0f0] animate-pulse' : 'bg-[#f00] shadow-[0_0_10px_#f00]'}`}></span>
            SOVEREIGN RELIABILITY DEMONSTRATOR
          </h1>
          <p className="text-[10px] text-[#555] tracking-[0.4em] mt-2 font-bold uppercase">
            SpiralOS Phase Controller // Strategic Proof Engine // Build 8834-A
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center bg-[#111] border border-[#222] p-4 px-6 rounded-sm shadow-2xl">
          <div className="flex flex-col">
            <button 
              onClick={runResearchMission}
              disabled={isMissionActive || isForensicMode}
              className={`px-6 py-2 border text-[9px] uppercase tracking-widest font-black transition-all
                ${isMissionActive ? 'bg-blue-600 text-white border-blue-600 animate-pulse' : 'bg-black text-[#0f0] border-[#333] hover:border-[#0f0]'}`}
            >
              {isMissionActive ? 'Mission in Progress...' : 'Start Research Mission'}
            </button>
            {isMissionActive && (
               <span className="text-[7px] text-blue-400 font-mono mt-1 animate-pulse uppercase tracking-widest">Status: {missionStatus}</span>
            )}
            {missionStatus === 'FAILED' && (
              <span className="text-[7px] text-red-500 font-mono mt-1 uppercase tracking-widest">Error: {missionError}</span>
            )}
          </div>
          <div className="h-10 w-[1px] bg-[#333] hidden lg:block"></div>
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex justify-between text-[9px] text-[#555] uppercase tracking-widest font-bold">
              <span>Entropy Fog</span>
              <span className="text-[#0f0] font-mono">{entropy}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={entropy} 
              onChange={(e) => setEntropy(parseInt(e.target.value))}
              disabled={isForensicMode || isMissionActive}
              className="accent-[#0f0] bg-[#222] h-1 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="h-10 w-[1px] bg-[#333] hidden lg:block"></div>
          <button 
            onClick={() => setIsOrder(!isOrder)}
            disabled={isForensicMode || isMissionActive}
            className={`px-8 py-2 border transition-all duration-200 font-black tracking-[0.2em] text-[10px] uppercase
              ${isOrder ? 'bg-[#0f0] text-black border-[#0f0]' : 'bg-[#f00] text-white border-[#f00]'}`}
          >
            {isOrder ? 'Sovereign' : 'Chaos'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-6">
          <FleetPulse events={events} workerCount={WORKER_COUNT} isOrder={isOrder} />
          <InterArrivalHistogram events={events} isOrder={isOrder} />
          
          <section className="bg-black/40 border border-[#222] p-4 shadow-inner">
            <h3 className="text-[9px] text-[#0f0] font-bold tracking-widest uppercase mb-2">Research Manifest</h3>
            <p className="text-[9px] text-[#444] leading-relaxed uppercase font-mono">
              Mitigating Thundering Herd via deterministic hashing. Start slots are partitioned across a {TARGET_SMEAR}ms window. 
              {isForensicMode ? ` [FORENSIC PLAYBACK: ${replayedFingerprint?.metadata.integrity_hash}]` : ` [LIVE_EMISSION: Tick ${tickCount}]`}
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {auditReport && (
            <section className="bg-[#050505] border border-[#0f0]/40 p-5 flex flex-col gap-3 shadow-[0_0_25px_rgba(0,255,0,0.15)] animate-in slide-in-from-right duration-500">
              <h2 className="text-[10px] font-bold text-[#0f0] border-b border-[#0f0]/20 pb-3 tracking-[0.3em] uppercase flex justify-between">
                <span>Verification Certificate</span>
                <span className={`text-[7px] px-1 font-black ${auditReport.status === AuditStatus.VALIDATED ? 'bg-[#0f0] text-black' : 'bg-red-500 text-white'}`}>
                  {auditReport.status === AuditStatus.VALIDATED ? 'VALIDATED' : 'INVALID'}
                </span>
              </h2>
              
              <div className="space-y-3 font-mono">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#555]">Verdict:</span>
                  <span className={auditReport.status === AuditStatus.VALIDATED ? "text-[#0f0]" : "text-[#f00]"}>
                    {AuditStatus[auditReport.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#111]">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-[#444]">AUDITED SPI</span>
                    <span className="text-[10px] text-[#0f0]">{(auditReport.recomputedMetrics.avgSpi * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[7px] text-[#444]">MAX STRESS</span>
                    <span className="text-[10px] text-[#0f0]">{auditReport.recomputedMetrics.maxEntropy}%</span>
                  </div>
                </div>
                <div className="text-[8px] text-[#333] mt-2 pt-2 border-t border-[#111] leading-tight">
                  SIGNATURE: {replayedFingerprint?.metadata.integrity_hash.substring(0, 16)}...<br/>
                  INTEGRITY: {auditReport.integrityHashMatch ? 'MATCH' : 'TAMPER_ALERT'}
                </div>
                
                <button 
                  onClick={handleDownloadBundle} 
                  className="w-full mt-4 py-2.5 bg-[#0f0] text-black border border-[#0f0] hover:bg-black hover:text-[#0f0] text-[9px] text-center uppercase tracking-widest font-black transition-all"
                >
                  Download Proof Bundle
                </button>
                <button onClick={() => { setReplayedFingerprint(null); setAuditReport(null); setMissionStatus('IDLE'); startSimulation(); }} className="w-full py-1.5 border border-[#333] hover:border-[#f00] text-[8px] text-[#444] hover:text-[#f00] uppercase transition-all">Exit Forensic Mode</button>
              </div>
            </section>
          )}

          <section className="bg-[#080808] border border-[#222] p-5 flex flex-col gap-4 shadow-xl">
            <h2 className="text-[10px] font-bold text-[#0f0] border-b border-[#222] pb-3 tracking-[0.3em] uppercase flex justify-between">
              <span>Diagnostic Matrix</span>
              <span className="opacity-50 font-mono text-[9px]">{isForensicMode ? 'FORENSIC' : 'LIVE'}</span>
            </h2>
            <div className="flex flex-col items-center py-2 gap-2 text-center">
              <div className="text-[9px] text-[#555] uppercase tracking-widest font-bold">Reliability SPI</div>
              <div className={`text-5xl font-black font-mono tracking-tighter transition-all 
                ${regime === 'WITHIN_ENVELOPE' ? 'text-[#0f0]' : regime === 'DEGRADED' ? 'text-yellow-500' : 'text-[#f00]'}`}>
                {(metrics.spi * 100).toFixed(1)}%
              </div>
              <div className="text-[8px] text-[#444] uppercase tracking-widest mt-1">Status: <span className="text-white">{regime}</span></div>
            </div>
          </section>

          <section className="bg-black border border-[#222] p-4 flex flex-col gap-3 shadow-2xl">
            <h2 className="text-[9px] font-bold text-[#666] tracking-[0.2em] uppercase mb-1">Audit Vault</h2>
            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {vault.length === 0 ? (
                <div className="text-[8px] text-[#333] italic py-2">No research artifacts found.</div>
              ) : (
                vault.map(item => (
                  <div key={item.id} className="p-2 border border-[#222] bg-[#050505] flex flex-col gap-1 cursor-pointer hover:border-[#0f0]/50" onClick={() => {
                    const found = vault.find(v => v.id === item.id);
                    if (found) loadFingerprint({ target: { files: [new File([JSON.stringify(assembleFingerprint())], "test.json")] } } as any);
                  }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-[#0f0] font-mono truncate mr-2">{item.id}</span>
                      <span className="text-[7px] text-gray-600 font-mono">SPI:{(item.spi*100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[7px] text-gray-500 uppercase">{new Date(item.timestamp).toLocaleTimeString()} // CSE:{item.cse}%</div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <label className="flex-1 py-1.5 border border-[#333] hover:border-purple-500 text-[8px] text-center uppercase tracking-widest font-black text-purple-500 cursor-pointer transition-all">
                Import External
                <input type="file" className="hidden" accept=".json" onChange={loadFingerprint} />
              </label>
            </div>
          </section>

          <SystemExplainer spi={metrics.spi} cse={metrics.cse} entropy={entropy} regime={regime} isOrder={isOrder} />
        </div>
      </div>
    </div>
  );
};

export default App;
