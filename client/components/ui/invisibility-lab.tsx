"use client";
import React, { useState } from "react";
import { ArrowRightLeft, Download, RefreshCcw } from "lucide-react";

interface InvisibilityLabProps {
  originalImage: string;
  resultImage: string;
  onReset: () => void;
  onDownload: () => void;
  title?: string;
  subtitle?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export function InvisibilityLab({ 
  originalImage, 
  resultImage, 
  onReset, 
  onDownload,
  title = "Invisibility Lab",
  subtitle = "Verify image integrity. All hidden data is stored in the noise layer.",
  leftLabel = "Stegano Pulse",
  rightLabel = "Raw Carrier"
}: InvisibilityLabProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000 relative w-full">
      <div className="text-center mb-16 space-y-4">
        <div className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black tracking-[1em] uppercase mx-auto w-fit shadow-2xl">
            Lab Session Active
        </div>
        <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase text-white shadow-2xl">{title}</h2>
        <p className="text-neutral-500 font-bold uppercase tracking-[0.3em] text-[10px]">{subtitle}</p>
      </div>
      
      <div className="relative max-w-5xl mx-auto group">
        <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl opacity-30 pointer-events-none" />
        
        <div className="relative rounded-[50px] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] aspect-video bg-neutral-950 ring-1 ring-white/5">
            {/* ORIGINAL IMAGE (RIGHT SIDE) */}
            <img src={originalImage} className="absolute inset-0 w-full h-full object-cover grayscale-[0.2]" alt="Original" />
            
            {/* RESULT IMAGE (LEFT SIDE - CLIPPED) */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img src={resultImage} className="absolute inset-0 w-full h-full object-cover" style={{ width: `${100 * (100/(sliderPosition || 0.1))}%` }} alt="Result" />
              
              <div className="absolute top-12 left-12 px-8 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-3xl backdrop-blur-md border border-white/20 whitespace-nowrap z-30">
                {leftLabel}
              </div>
            </div>

            <div className="absolute top-12 right-12 px-8 py-4 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-3xl backdrop-blur-md border border-white/10 whitespace-nowrap z-30 opacity-40 group-hover:opacity-100 transition-opacity">
                {rightLabel}
            </div>

            {/* METADATA BADGES */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-40 scale-75 md:scale-100">
                 <div className="px-6 py-3 bg-black/80 backdrop-blur-2xl border border-white/5 rounded-2xl flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Pixel Diff</span>
                    <span className="text-emerald-500 font-black tabular-nums">0.00%</span>
                 </div>
                 <div className="px-6 py-3 bg-black/80 backdrop-blur-2xl border border-white/5 rounded-2xl flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Noise Amp</span>
                    <span className="text-sky-500 font-black tabular-nums">0.001</span>
                 </div>
            </div>

            {/* CONTROL INPUT */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sliderPosition} 
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50"
            />

            {/* DIVIDER & HANDLE */}
            <div className="absolute top-0 bottom-0 z-40 pointer-events-none w-px bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.5)]" style={{ left: `${sliderPosition}%` }}>
                <div className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'scale-125' : 'scale-100'}`}>
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl" />
                    <div className="relative w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                        <ArrowRightLeft className="text-black w-5 h-5 md:w-6 md:h-6" />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-12 mt-20 pb-20">
         <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl">
            <button 
                onClick={onReset}
                className="group flex-1 flex items-center justify-center gap-4 px-10 py-6 bg-white/[0.03] border border-white/10 rounded-[28px] font-black text-[10px] uppercase tracking-[0.5em] hover:bg-white/[0.08] transition-all active:scale-95 text-neutral-400 hover:text-white"
            >
                <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" /> New Session
            </button>
            <button 
                onClick={onDownload}
                className="group flex-[2] flex items-center justify-center gap-6 px-16 py-6 bg-emerald-500 text-white rounded-[28px] font-black text-[10px] uppercase tracking-[0.5em] shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:scale-[1.03] active:scale-95 transition-all relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                <Download size={20} className="" /> Emit Transmission
            </button>
         </div>
      </div>
    </div>
  );
}
