'use client';

import React from 'react';
import { BatteryMode, BATTERY_MODES } from '@/lib/constants';
import { Waypoint } from '@/lib/constants';

interface NavigationHeaderProps {
  currentWaypoint: Waypoint;
  distanceMeters: number;
  gpsAccuracy: number | null;
  speedMps: number | null;
  batteryMode: BatteryMode;
  audioEnabled: boolean;
  isSimulating: boolean;
  isFullscreen: boolean;
  isFinished: boolean;
  isTrackingActive: boolean;
  onSelectBatteryMode: (mode: BatteryMode) => void;
  onToggleAudio: () => void;
  onToggleSimulation: () => void;
  onToggleFullscreen: () => void;
}

export default function NavigationHeader({
  currentWaypoint,
  distanceMeters,
  gpsAccuracy,
  speedMps,
  batteryMode,
  audioEnabled,
  isSimulating,
  isFullscreen,
  isFinished,
  isTrackingActive,
  onSelectBatteryMode,
  onToggleAudio,
  onToggleSimulation,
  onToggleFullscreen,
}: NavigationHeaderProps) {
  // GPS Quality Rating & Status
  let gpsStatusLabel = '📡 GPS REALTIME';
  let gpsStatusBadge = 'bg-sky-500/20 text-sky-300 border-sky-500/40';

  if (isFinished) {
    gpsStatusLabel = '🏁 FINISH - GPS BERHENTI';
    gpsStatusBadge = 'bg-purple-500/30 text-purple-200 border-purple-400 font-extrabold';
  } else if (!isTrackingActive) {
    gpsStatusLabel = '⏹️ GPS PAUSED';
    gpsStatusBadge = 'bg-slate-800 text-slate-400 border-slate-700';
  } else if (gpsAccuracy !== null) {
    if (gpsAccuracy <= 10) {
      gpsStatusLabel = '📡 REALTIME AKURAT';
      gpsStatusBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (gpsAccuracy <= 25) {
      gpsStatusLabel = '📡 REALTIME SEDANG';
      gpsStatusBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else {
      gpsStatusLabel = '⚠️ GPS LEMAH';
      gpsStatusBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    }
  }

  const speedKmh = speedMps ? (speedMps * 3.6).toFixed(1).replace('.', ',') : '0,0';

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Title & Event Name */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-sky-500/20">
              🚶
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight flex items-center gap-2">
                JALAN SANTAI
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  REALTIME
                </span>
              </h1>
              <div className="text-[11px] text-sky-400 font-medium">
                {isFinished ? (
                  <span className="text-emerald-400 font-bold">🎉 Garis Finish Tercapai</span>
                ) : (
                  <>Menuju {currentWaypoint.name} · {distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(2)} km`}</>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onToggleSimulation}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                isSimulating
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {isSimulating ? '🎮 Simulasi ON' : '🎮 Simulasi'}
            </button>
            <button
              onClick={onToggleAudio}
              className="p-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-sm"
              title={audioEnabled ? 'Matikan Suara Navigasi' : 'Aktifkan Suara Navigasi'}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Indicators */}
        <div className="flex items-center justify-center gap-3 text-xs w-full md:w-auto overflow-x-auto py-1 scrollbar-none">
          {/* GPS Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${gpsStatusBadge}`}>
            {!isFinished && <span className="w-2 h-2 rounded-full bg-current animate-ping" />}
            <span>{gpsStatusLabel}</span>
            {gpsAccuracy !== null && !isFinished && (
              <span className="opacity-80 font-mono">±{Math.round(gpsAccuracy)}m</span>
            )}
          </div>

          {/* Speed Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 font-medium text-slate-300">
            <span>⚡ Kecepatan:</span>
            <span className="font-bold text-sky-400 tabular-nums">{speedKmh} km/jam</span>
          </div>

          {/* Battery Mode Dropdown */}
          <select
            value={batteryMode}
            onChange={(e) => onSelectBatteryMode(e.target.value as BatteryMode)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {Object.values(BATTERY_MODES).map((mode) => (
              <option key={mode.id} value={mode.id}>
                🔋 {mode.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Desktop Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSimulating ? '🎮 Simulasi GPS: AKTIF' : '🎮 Mode Simulasi GPS'}
          </button>

          <button
            onClick={onToggleAudio}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              audioEnabled
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span>{audioEnabled ? '🔊 Suara AKTIF' : '🔇 Suara NONAKTIF'}</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
            title="Fullscreen"
          >
            {isFullscreen ? '↙ Minimalis' : '⛶ FULL SCREEN'}
          </button>
        </div>
      </div>
    </header>
  );
}
