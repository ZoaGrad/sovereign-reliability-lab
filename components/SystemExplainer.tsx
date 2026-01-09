
import React, { useState } from 'react';

interface SystemExplainerProps {
  spi: number;
  cse: number;
  entropy: number;
  regime: string;
  isOrder: boolean;
}

const SystemExplainer: React.FC<SystemExplainerProps> = ({ spi, cse, entropy, regime, isOrder }) => {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const topics: Record<string, { label: string; content: () => React.ReactNode }> = {
    spi: {
      label: "What is SPI?",
      content: () => (
        <div className="space-y-2">
          <p>
            The <span className="text-[#0f0]">Spread-of-Arrivals Index (SPI)</span> measures temporal partitioning. It normalizes the spread of worker arrivals against the designed 257ms corridor.
          </p>
          <div className="p-2 bg-black border border-[#222] text-[8px]">
            STATUS: <span className="text-white">{regime}</span><br/>
            EVIDENCE: <span className="text-[#0f0]">{(spi * 100).toFixed(1)}% Structural Integrity</span>
          </div>
          <p>
            High SPI indicates that workers are successfully partitioned, preventing "Thundering Herd" collisions.
          </p>
        </div>
      )
    },
    cse: {
      label: "What is CSE Gating?",
      content: () => (
        <div className="space-y-2">
          <p>
            The <span className="text-[#0f0]">Corridor Stress Envelope (CSE)</span> defines the system's resilience boundary. 
          </p>
          <p>
            It is <span className="italic underline">Persistence Gated (K=3)</span>, meaning stability must be maintained for 3 consecutive seconds before the envelope expands.
          </p>
          <div className="p-2 bg-black border border-[#222] text-[8px]">
            BOUNDARY: <span className="text-[#0f0]">{cse}% Entropy</span><br/>
            CURRENT LOAD: <span className="text-white">{entropy}%</span>
          </div>
        </div>
      )
    },
    breach: {
      label: "What is a Breach?",
      content: () => (
        <div className="space-y-2">
          <p>
            A <span className="text-[#f00]">Breach</span> occurs when entropy exceeds the CSE. This indicates the system is operating outside its validated safety zone.
          </p>
          {entropy > cse ? (
            <div className="p-2 bg-[#f00]/10 border border-[#f00]/30 text-[#f00] text-[8px] animate-pulse">
              WARNING: SYSTEM IS CURRENTLY IN BREACH.<br/>
              DETERMINISM CANNOT BE GUARANTEED.
            </div>
          ) : (
            <div className="p-2 bg-[#0f0]/10 border border-[#0f0]/30 text-[#0f0] text-[8px]">
              NOMINAL: SYSTEM OPERATING WITHIN ENVELOPE.
            </div>
          )}
        </div>
      )
    },
    hashing: {
      label: "Deterministic Hashing",
      content: () => (
        <div className="space-y-2">
          <p>
            Instead of random jitter, we use <span className="text-[#0f0]">FNV-1a Hashing</span> on Worker IDs. This ensures that every worker always wakes up at the same relative offset within every tick.
          </p>
          <p>
            This turns chaos into a <span className="text-white">predictable schedule</span> that survives network noise.
          </p>
        </div>
      )
    }
  };

  return (
    <section className="bg-black border border-[#222] flex flex-col overflow-hidden">
      <div className="bg-[#111] border-b border-[#222] px-4 py-2 flex justify-between items-center">
        <h2 className="text-[10px] font-bold text-[#666] tracking-[0.2em] uppercase">Evidence Interpreter</h2>
        <span className="text-[8px] text-[#333] font-mono">ID: EXPL-8834</span>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {!activeTopic ? (
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(topics).map(([key, topic]) => (
              <button
                key={key}
                onClick={() => setActiveTopic(key)}
                className="text-left px-3 py-2 bg-[#080808] border border-[#222] hover:border-[#0f0]/50 transition-colors text-[9px] uppercase tracking-widest text-[#888] hover:text-[#0f0]"
              >
                {topic.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <button 
              onClick={() => setActiveTopic(null)}
              className="text-[8px] uppercase tracking-widest text-[#444] hover:text-white flex items-center gap-1"
            >
              ← Back to Topics
            </button>
            <div className="text-[10px] text-[#aaa] leading-relaxed font-sans border-l-2 border-[#0f0]/30 pl-3">
              <h3 className="text-[#0f0] font-bold uppercase mb-2 text-[9px] tracking-widest">
                {topics[activeTopic].label}
              </h3>
              {topics[activeTopic].content()}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-[#111] p-3">
        <div className="flex justify-between items-center opacity-40">
           <span className="text-[7px] text-[#444] uppercase tracking-widest">Forensic Guidance Engine</span>
           <div className="flex gap-1">
             <div className="w-1 h-1 bg-[#0f0] rounded-full animate-ping"></div>
             <div className="w-1 h-1 bg-[#0f0] rounded-full"></div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default SystemExplainer;
