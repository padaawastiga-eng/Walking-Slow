'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatDistance, formatDuration } from '@/lib/geo-utils';
import { Waypoint } from '@/lib/constants';

interface FinishModalProps {
  isOpen: boolean;
  isAllCheckpointsCompleted: boolean;
  missingWaypoints: Waypoint[];
  totalDistance: number;
  totalSeconds: number;
  waypointsPassedCount: number;
  onContinueNavigation: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export default function FinishModal({
  isOpen,
  isAllCheckpointsCompleted,
  missingWaypoints,
  totalDistance,
  totalSeconds,
  waypointsPassedCount,
  onContinueNavigation,
  onRestart,
  onClose,
}: FinishModalProps) {
  useEffect(() => {
    if (isOpen && isAllCheckpointsCompleted) {
      // Trigger canvas confetti bursts if finish is valid/complete
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isOpen, isAllCheckpointsCompleted]);

  if (!isOpen) return null;

  const avgSpeedKmh =
    totalSeconds > 0 ? ((totalDistance / totalSeconds) * 3.6).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header Icon */}
        <div className="text-5xl animate-bounce">
          {isAllCheckpointsCompleted ? '🎉 🏆 🎉' : '⚠️ 🛑 ⚠️'}
        </div>

        {/* Modal Status Header */}
        <div>
          <h2
            className={`text-2xl font-black tracking-tight uppercase ${
              isAllCheckpointsCompleted ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {isAllCheckpointsCompleted
              ? 'SUDAH SAMPAI DI FINISH!'
              : 'PERINGATAN FINISH!'}
          </h2>
          <p className="text-xs font-bold text-slate-200 mt-1">
            {isAllCheckpointsCompleted
              ? 'PEMBERITAHUAN: ANDA TELAH SUDAH SAMPAI DI GARIS FINISH!'
              : 'Anda berada di koordinat Finish / Start, tetapi BELUM MELEWATI SELURUH POS CHECKPOINT!'}
          </p>
        </div>

        {/* Valid Finish Badge or Missing Checkpoints Warning Card */}
        {isAllCheckpointsCompleted ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-sm uppercase tracking-wide text-emerald-400 font-extrabold">
              <span>🏁 SUDAH SAMPAI & LENGKAP</span>
            </div>
            <p className="text-[11px] text-emerald-200/90 font-normal">
              Seluruh pos (POS 1, 2, 3, 4) telah berhasil Anda lewati. Pelacakan GPS & navigasi dihentikan secara otomatis.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-left space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs uppercase tracking-wide">
              <span>⚠️ POS CHECKPOINT YANG BELUM DILEWATI ({missingWaypoints.length}):</span>
            </div>

            <div className="space-y-1.5 pt-1">
              {missingWaypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-rose-500/30 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-bold text-rose-300">{wp.name}</span>
                    <span className="text-[11px] text-slate-400">({wp.label})</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Belum Selesai
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-rose-200/80 pt-1">
              Silakan lanjutkan rute jalan santai untuk menyelesaikan pos checkpoint tersebut.
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Total Jarak
            </div>
            <div className="text-lg font-black text-sky-400 font-mono">
              {formatDistance(totalDistance)}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Waktu Tempuh
            </div>
            <div className="text-lg font-black text-purple-400 font-mono">
              {formatDuration(totalSeconds)}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Waypoint Selesai
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono">
              {waypointsPassedCount} Waypoint
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Rata-rata Kecepatan
            </div>
            <div className="text-lg font-black text-amber-400 font-mono">
              {avgSpeedKmh} km/jam
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {!isAllCheckpointsCompleted && (
            <button
              onClick={onContinueNavigation}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg shadow-sky-500/20 active:scale-95 transition-all cursor-pointer"
            >
              ▶️ Lanjutkan Rute Menuju Pos Yang Belum
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase transition-all cursor-pointer border border-amber-500/30"
          >
            🚀 Mulai Ulang Dari Awal
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            🗺️ Tutup & Lihat Peta
          </button>
        </div>
      </div>
    </div>
  );
}
