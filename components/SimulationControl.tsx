'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LatLng } from '@/lib/geo-utils';

interface SimulationControlProps {
  routePolyline: LatLng[];
  isSimulating: boolean;
  isFinished?: boolean;
  onUpdateSimulatedPosition: (pos: LatLng, heading: number | null, speedMps: number) => void;
  onResetTrack: () => void;
  onRestartNavigation: () => void;
  onClose: () => void;
}

export default function SimulationControl({
  routePolyline,
  isSimulating,
  isFinished = false,
  onUpdateSimulatedPosition,
  onResetTrack,
  onRestartNavigation,
  onClose,
}: SimulationControlProps) {
  const [polylineIndex, setPolylineIndex] = useState<number>(0);
  const [isAutoWalking, setIsAutoWalking] = useState<boolean>(false);
  const [speedFactor, setSpeedFactor] = useState<number>(1.5); // 1.5 m/s (~5.4 km/h)
  const [offRouteOffset, setOffRouteOffset] = useState<boolean>(false);

  const polylineIndexRef = useRef<number>(0);

  useEffect(() => {
    polylineIndexRef.current = polylineIndex;
  }, [polylineIndex]);

  const activeAutoWalking = isAutoWalking && !isFinished;

  // Auto walk interval runner
  useEffect(() => {
    if (!activeAutoWalking || !routePolyline || routePolyline.length === 0) return;

    const interval = setInterval(() => {
      const currentIdx = polylineIndexRef.current;
      const nextIdx = (currentIdx + 1) % routePolyline.length;

      // Update state for UI slider & ref
      polylineIndexRef.current = nextIdx;
      setPolylineIndex(nextIdx);

      let targetPoint = routePolyline[nextIdx];

      // If off route test is turned on, add latitude jitter (~40 meters)
      if (offRouteOffset) {
        targetPoint = {
          lat: targetPoint.lat + 0.00045, // ~50m north
          lng: targetPoint.lng + 0.00045,
        };
      }

      // Calculate heading to next point
      const currPoint = routePolyline[currentIdx] || targetPoint;
      const dLat = targetPoint.lat - currPoint.lat;
      const dLng = targetPoint.lng - currPoint.lng;
      let heading: number | null = null;

      if (dLat !== 0 || dLng !== 0) {
        heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        if (heading < 0) heading += 360;
      }

      // Execute callback outside of state updater!
      onUpdateSimulatedPosition(targetPoint, heading, speedFactor);
    }, 1000 / (speedFactor / 1.2));

    return () => clearInterval(interval);
  }, [activeAutoWalking, routePolyline, speedFactor, offRouteOffset, onUpdateSimulatedPosition]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    polylineIndexRef.current = idx;
    setPolylineIndex(idx);

    if (routePolyline[idx]) {
      let targetPoint = routePolyline[idx];
      if (offRouteOffset) {
        targetPoint = {
          lat: targetPoint.lat + 0.00045,
          lng: targetPoint.lng + 0.00045,
        };
      }
      onUpdateSimulatedPosition(targetPoint, 0, speedFactor);
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-base">🎮 SIMULATOR GPS WALK</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            Demo Mode
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>

      {isFinished && (
        <div className="p-2 rounded-xl bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-bold text-center">
          🏁 Finish Tercapai! Simulasi dihentikan otomatis.
        </div>
      )}

      {/* Auto Walk & Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          disabled={isFinished}
          onClick={() => setIsAutoWalking(!isAutoWalking)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isFinished
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : activeAutoWalking
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isFinished
            ? '🏁 Finished'
            : activeAutoWalking
            ? '⏸ Pause Jalan Otomatis'
            : '▶️ Mulai Jalan Otomatis'}
        </button>

        <button
          disabled={isFinished}
          onClick={() => setOffRouteOffset(!offRouteOffset)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            isFinished
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
              : offRouteOffset
              ? 'bg-rose-600 text-white border-rose-400'
              : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {offRouteOffset ? '⚠️ Tes Keluar Jalur: ON' : '⚠️ Tes Keluar Jalur'}
        </button>
      </div>

      {/* Progress Slider on Route */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Simulasi Posisi Rute:</span>
          <span className="font-mono text-amber-400 font-bold">
            {polylineIndex + 1} / {routePolyline.length}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, routePolyline.length - 1)}
          value={polylineIndex}
          onChange={handleSliderChange}
          disabled={isFinished}
          className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg disabled:opacity-50"
        />
      </div>

      {/* Speed Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Kecepatan Jalan:</span>
          <span className="font-mono text-sky-400 font-bold">
            {(speedFactor * 3.6).toFixed(1)} km/jam
          </span>
        </div>
        <input
          type="range"
          min={0.8}
          max={4.0}
          step={0.2}
          value={speedFactor}
          onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
          disabled={isFinished}
          className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={onResetTrack}
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
        >
          🔄 Reset Jejak Track
        </button>
        <button
          onClick={() => {
            polylineIndexRef.current = 0;
            setPolylineIndex(0);
            setIsAutoWalking(false);
            onRestartNavigation();
          }}
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold cursor-pointer"
        >
          ⏮️ Mulai Ulang
        </button>
      </div>
    </div>
  );
}
