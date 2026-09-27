'use client';

import React from 'react';
import { getRelativeDirectionAdvice } from '@/lib/geo-utils';
import { Waypoint } from '@/lib/constants';

interface DirectionCompassProps {
  targetWaypoint: Waypoint;
  distanceToWaypoint: number;
  bearingToWaypoint: number;
  deviceHeading: number | null;
  hasCompassSensor: boolean;
  isOffRoute: boolean;
  distanceToRoute: number;
  offRouteThreshold: number;
  nearRouteThreshold: number;
  waypointRadius: number;
  isFinished?: boolean;
}

export default function DirectionCompass({
  targetWaypoint,
  distanceToWaypoint,
  bearingToWaypoint,
  deviceHeading,
  hasCompassSensor,
  isOffRoute,
  distanceToRoute,
  offRouteThreshold,
  nearRouteThreshold,
  waypointRadius,
  isFinished = false,
}: DirectionCompassProps) {
  const { label: directionLabel, arrowRotation } = getRelativeDirectionAdvice(
    bearingToWaypoint,
    deviceHeading
  );

  const isNearWaypoint = distanceToWaypoint <= waypointRadius * 2;

  // Status route logic
  let routeStatusText = '✓ ANDA BERADA DI JALUR';
  let routeStatusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  if (isFinished) {
    routeStatusText = '🏁 SELAMAT! FINISH TERCAPAI - NAVIGASI SELESAI';
    routeStatusColor = 'bg-purple-500/30 text-purple-200 border-purple-400 font-bold';
  } else if (distanceToRoute > offRouteThreshold) {
    routeStatusText = '⚠️ ANDA MENJAUH DARI RUTE';
    routeStatusColor = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
  } else if (distanceToRoute > nearRouteThreshold) {
    routeStatusText = '⚠️ DEKAT BATAS JALUR';
    routeStatusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  }

  return (
    <div className="flex flex-col items-center justify-between p-5 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl text-slate-100 h-full min-h-[320px]">
      {/* Top Waypoint Kicker & Distance Header */}
      <div className="w-full text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          {!isFinished && <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            {isFinished ? 'STATUS FINISH' : 'MENUJU WAYPOINT'}
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {targetWaypoint.name} ({targetWaypoint.label})
        </h2>
        <div className="text-3xl font-extrabold text-sky-400 tabular-nums">
          {isFinished
            ? '0 meter'
            : distanceToWaypoint < 1000
            ? `${Math.round(distanceToWaypoint)} meter`
            : `${(distanceToWaypoint / 1000).toFixed(2)} km`}
        </div>
      </div>

      {/* Near Waypoint Alert */}
      {isNearWaypoint && !isFinished && (
        <div className="my-1 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold text-xs uppercase tracking-wide animate-bounce">
          🎯 {targetWaypoint.name} SUDAH DEKAT! ({Math.round(distanceToWaypoint)}m)
        </div>
      )}

      {/* Primary Direction Arrow Dial */}
      <div className="relative my-3 flex items-center justify-center">
        {/* Outer Compass Degree Ring */}
        <div className="relative w-44 h-44 rounded-full border-2 border-slate-700 bg-slate-950/80 flex items-center justify-center shadow-inner">
          {/* Compass Cardinal Points */}
          <span className="absolute top-2 text-[10px] font-bold text-slate-500">N</span>
          <span className="absolute right-3 text-[10px] font-bold text-slate-500">E</span>
          <span className="absolute bottom-2 text-[10px] font-bold text-slate-500">S</span>
          <span className="absolute left-3 text-[10px] font-bold text-slate-500">W</span>

          {/* Rotating Direction Arrow Container */}
          <div
            className="w-32 h-32 flex items-center justify-center compass-pointer-transition"
            style={{ transform: `rotate(${isFinished ? 0 : arrowRotation}deg)` }}
          >
            {/* Giant Arrow SVG */}
            <svg
              viewBox="0 0 100 100"
              className="w-28 h-28 drop-shadow-[0_0_16px_rgba(56,189,248,0.7)]"
            >
              <defs>
                <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isFinished ? "#a855f7" : "#38bdf8"} />
                  <stop offset="100%" stopColor={isFinished ? "#7e22ce" : "#0284c7"} />
                </linearGradient>
              </defs>
              {/* Arrow Head */}
              <polygon points="50,5 85,75 50,60 15,75" fill="url(#arrowGrad)" stroke="#e0f2fe" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Direction & Bearing Data Box */}
      <div className="w-full text-center space-y-2">
        <div className="text-lg font-bold text-white tracking-wide uppercase">
          {isFinished ? '🎉 TELAH TIBADI FINISH' : directionLabel}
        </div>

        <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400">
          <div>
            BEARING: <span className="text-sky-400 font-bold">{Math.round(bearingToWaypoint)}°</span>
          </div>
          {deviceHeading !== null && (
            <div>
              HEADING: <span className="text-slate-200 font-bold">{Math.round(deviceHeading)}°</span>
            </div>
          )}
        </div>

        {/* Route On/Off Status Badge */}
        <div className={`mt-2 py-1.5 px-4 rounded-xl text-xs font-bold border transition-all ${routeStatusColor}`}>
          {routeStatusText}
        </div>

        {!hasCompassSensor && !isFinished && (
          <div className="text-[10px] text-amber-400/80 italic mt-1">
            * Kompas sensor tidak terdeteksi. Menggunakan arah gerakan GPS.
          </div>
        )}
      </div>
    </div>
  );
}
