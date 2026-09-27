'use client';

import React from 'react';
import { Waypoint } from '@/lib/constants';
import { formatDistance, formatDuration, calculateETA } from '@/lib/geo-utils';

interface ProgressTrackerProps {
  waypoints: Waypoint[];
  currentWaypointIndex: number;
  completedWaypoints: string[];
  totalRouteDistance: number;
  distanceCovered: number;
  distanceRemaining: number;
  elapsedSeconds: number;
  speedMps: number | null;
  onSelectWaypoint?: (index: number) => void;
}

export default function ProgressTracker({
  waypoints,
  currentWaypointIndex,
  completedWaypoints,
  totalRouteDistance,
  distanceCovered,
  distanceRemaining,
  elapsedSeconds,
  speedMps,
  onSelectWaypoint,
}: ProgressTrackerProps) {
  const percentComplete = Math.min(
    100,
    Math.max(0, Math.round((completedWaypoints.length / (waypoints.length - 1)) * 100))
  );

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-xl space-y-4">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Rute
          </div>
          <div className="text-base font-extrabold text-sky-400 font-mono mt-0.5">
            {formatDistance(totalRouteDistance)}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Ditempuh
          </div>
          <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
            {formatDistance(distanceCovered)}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Sisa Jarak
          </div>
          <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
            {formatDistance(distanceRemaining)}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Waktu Tempuh / ETA
          </div>
          <div className="text-base font-extrabold text-purple-400 font-mono mt-0.5">
            {formatDuration(elapsedSeconds)} <span className="text-xs font-normal text-slate-400">({calculateETA(distanceRemaining, speedMps)})</span>
          </div>
        </div>
      </div>

      {/* Stepper Timeline Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
          <span>PROGRESS PERJALANAN</span>
          <span className="text-sky-400 font-mono">{percentComplete}%</span>
        </div>

        {/* Visual Line Stepper */}
        <div className="relative flex items-center justify-between w-full my-2">
          {/* Background Connecting Bar */}
          <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-800 -translate-y-1/2 z-0 rounded-full" />
          {/* Active Completed Bar */}
          <div
            className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-sky-500 to-emerald-400 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
            style={{
              width: `${(completedWaypoints.length / (waypoints.length - 1)) * 100}%`,
            }}
          />

          {/* Waypoint Nodes */}
          {waypoints.map((wp, idx) => {
            const isCompleted = completedWaypoints.includes(wp.id);
            const isCurrent = idx === currentWaypointIndex;

            let nodeClass = 'bg-slate-900 border-2 border-slate-700 text-slate-500';
            let labelClass = 'text-slate-500';

            if (isCompleted) {
              nodeClass = 'bg-emerald-500 border-2 border-emerald-300 text-slate-950 font-bold shadow-md shadow-emerald-500/30';
              labelClass = 'text-emerald-400 font-bold';
            } else if (isCurrent) {
              nodeClass = 'bg-sky-500 border-2 border-sky-200 text-slate-950 font-bold ring-4 ring-sky-500/30 animate-pulse';
              labelClass = 'text-sky-300 font-extrabold';
            }

            return (
              <button
                key={wp.id}
                onClick={() => onSelectWaypoint && onSelectWaypoint(idx)}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${nodeClass}`}
                >
                  {isCompleted ? '✓' : idx === 0 ? 'S' : idx === waypoints.length - 1 ? 'F' : idx}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight transition-colors ${labelClass}`}>
                  {wp.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
