
import React, { useEffect, useRef } from 'react';
import { WorkEvent } from '../types';

interface FleetPulseProps {
  events: WorkEvent[];
  workerCount: number;
  isOrder: boolean;
}

const FleetPulse: React.FC<FleetPulseProps> = ({ events, workerCount, isOrder }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = '#151515';
      ctx.lineWidth = 1;
      const gridStep = 50;
      for (let i = 0; i < width; i += gridStep) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      const now = Date.now();
      const timeWindow = 4000;
      const rowHeight = height / workerCount;

      events.forEach(event => {
        const timeDiff = now - event.timestamp;
        if (timeDiff > timeWindow || timeDiff < 0) return;

        const x = width - (timeDiff / timeWindow) * width;
        const workerIndex = parseInt(event.workerId.split('-')[1]);
        const y = workerIndex * rowHeight + rowHeight / 2;

        const color = event.mode === 'order' ? '#0f0' : '#f00';
        
        // Show jitter smear: a faint line behind the dot representing the entropy impact
        if (event.netMs > 1) {
          const smearWidth = (event.netMs / timeWindow) * width;
          ctx.strokeStyle = color + '22';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + smearWidth, y);
          ctx.stroke();
        }

        ctx.fillStyle = color;
        if (timeDiff < 200) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        if (timeDiff < 100) {
           ctx.globalAlpha = 0.5;
           ctx.beginPath();
           ctx.arc(x, y, 6, 0, Math.PI * 2);
           ctx.stroke();
           ctx.globalAlpha = 1.0;
        }

        ctx.shadowBlur = 0;
      });

      // Scanner Line
      ctx.strokeStyle = isOrder ? '#0f03' : '#f003';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 2, 0);
      ctx.lineTo(width - 2, height);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [events, workerCount, isOrder]);

  return (
    <div className="relative w-full h-[450px] border border-[#333] bg-black overflow-hidden">
      <div className="absolute top-2 left-2 z-10 bg-black/90 px-3 py-1 border border-[#333] flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full animate-pulse ${isOrder ? 'bg-[#0f0]' : 'bg-[#f00]'}`}></span>
        <span className="text-[10px] uppercase tracking-widest font-bold">
          Stochastic Timeline // {isOrder ? 'PHASE_LOCKED_CORRIDOR' : 'CHAOS_THRESHOLD'}
        </span>
      </div>
      <canvas ref={canvasRef} width={1200} height={450} className="w-full h-full block" />
    </div>
  );
};

export default FleetPulse;
