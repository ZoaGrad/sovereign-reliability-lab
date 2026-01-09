
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WorkEvent } from '../types';

interface HistogramProps {
  events: WorkEvent[];
  isOrder: boolean;
}

const InterArrivalHistogram: React.FC<HistogramProps> = ({ events, isOrder }) => {
  const { chartData, burstinessIndex } = useMemo(() => {
    if (events.length < 2) return { chartData: [], burstinessIndex: 0 };

    // Use events from the last 5 seconds (Sovereign standard window)
    const now = Date.now();
    const windowMs = 5000;
    
    // CRITICAL: Sort by timestamp to handle out-of-order state updates or network jitter
    const recentEvents = [...events]
      .filter(e => now - e.timestamp < windowMs)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentEvents.length < 2) return { chartData: [], burstinessIndex: 0 };

    const gaps: number[] = [];
    for (let i = 1; i < recentEvents.length; i++) {
      const gap = recentEvents[i].timestamp - recentEvents[i-1].timestamp;
      // Filter out gaps between ticks to isolate per-tick density
      if (gap < 800) {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) return { chartData: [], burstinessIndex: 0 };

    // Burstiness = % of inter-arrivals < 2ms (Thundering Herd signature)
    const criticalGaps = gaps.filter(g => g < 2).length;
    const bIndex = (criticalGaps / gaps.length) * 100;

    // Binning (0-100ms range)
    const bins = Array(20).fill(0);
    const binSize = 5; 
    gaps.forEach(g => {
      const idx = Math.min(Math.floor(g / binSize), bins.length - 1);
      bins[idx]++;
    });

    const data = bins.map((count, i) => ({
      range: i === bins.length - 1 ? `${i * binSize}ms+` : `${i * binSize}ms`,
      count
    }));

    return { chartData: data, burstinessIndex: bIndex };
  }, [events]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-3 h-[250px] bg-[#050505] p-4 border border-[#333]">
        <div className="text-[9px] mb-4 uppercase tracking-[0.2em] text-[#666] flex justify-between">
          <span>Inter-Arrival Distribution (5s Rolling Window)</span>
          <span className={isOrder ? 'text-[#0f0]' : 'text-[#f00]'}>
            {isOrder ? 'SMEARED' : 'COLLIDING'}
          </span>
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="range" 
              stroke="#222" 
              fontSize={8} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '9px', color: '#0f0' }}
              cursor={{ fill: '#111' }}
            />
            <Bar dataKey="count" animationDuration={200}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={isOrder ? '#0f0' : '#f00'} fillOpacity={0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#050505] p-4 border border-[#333] flex flex-col justify-center items-center gap-2">
        <div className="text-[9px] uppercase tracking-widest text-[#666] text-center">Burstiness Index</div>
        <div className={`text-4xl font-bold font-mono tracking-tighter ${burstinessIndex > 30 ? 'text-[#f00] animate-pulse' : 'text-[#0f0]'}`}>
          {burstinessIndex.toFixed(1)}%
        </div>
        <div className="w-full bg-[#111] h-1 mt-2">
          <div 
            className={`h-full transition-all duration-500 ${burstinessIndex > 30 ? 'bg-[#f00]' : 'bg-[#0f0]'}`} 
            style={{ width: `${Math.min(burstinessIndex, 100)}%` }}
          ></div>
        </div>
        <div className="text-[8px] text-[#444] mt-2 uppercase text-center">
          {burstinessIndex > 30 ? 'CRITICAL CONGESTION' : 'STABLE DISTRIBUTION'}
        </div>
      </div>
    </div>
  );
};

export default InterArrivalHistogram;
