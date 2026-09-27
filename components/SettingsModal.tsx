'use client';

import React from 'react';
import { AppConfig, BatteryMode, BATTERY_MODES, WAYPOINTS } from '@/lib/constants';

interface SettingsModalProps {
  isOpen: boolean;
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onClose: () => void;
}

export default function SettingsModal({
  isOpen,
  config,
  onUpdateConfig,
  onClose,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
            ⚙️ PENGATURAN & KONFIGURASI FINISH
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pemberitahuan SUDAH SAMPAI Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
          <div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🎉 Pemberitahuan &quot;SUDAH SAMPAI&quot;</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Tampilkan pop-up & pengumuman suara besar saat pengguna tiba di koordinat Finish.
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ announceSudahSampai: !config.announceSudahSampai })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              config.announceSudahSampai
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {config.announceSudahSampai ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>

        {/* Hentikan Otomatis Aplikasi Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30">
          <div>
            <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>⏹️ Hentikan Otomatis Aplikasi</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Matikan pelacakan GPS & pengukur waktu secara otomatis begitu sampai di garis Finish.
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ autoStopOnFinish: !config.autoStopOnFinish })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              config.autoStopOnFinish
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {config.autoStopOnFinish ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>

        {/* Waypoint Radius Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Radius Deteksi Waypoint & Finish:</span>
            <span className="text-sky-400 font-mono font-bold">
              {config.waypointRadiusMeters} meter
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={config.waypointRadiusMeters}
            onChange={(e) =>
              onUpdateConfig({ waypointRadiusMeters: parseInt(e.target.value, 10) })
            }
            className="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">
            Radius toleransi jarak pengguna dari titik koordinat untuk dianggap &quot;SUDAH SAMPAI&quot;.
          </p>
        </div>

        {/* Off Route Warning Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Batas Toleransi Keluar Jalur:</span>
            <span className="text-amber-400 font-mono font-bold">
              {config.offRouteWarningMeters} meter
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={100}
            step={5}
            value={config.offRouteWarningMeters}
            onChange={(e) =>
              onUpdateConfig({ offRouteWarningMeters: parseInt(e.target.value, 10) })
            }
            className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">
            Aplikasi memberikan peringatan jika jarak dari garis rute melebihi batas ini.
          </p>
        </div>

        {/* Battery Mode Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Mode Konsumsi Baterai:</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(BATTERY_MODES) as BatteryMode[]).map((key) => {
              const mode = BATTERY_MODES[key];
              const isSelected = config.batteryMode === key;
              return (
                <button
                  key={key}
                  onClick={() => onUpdateConfig({ batteryMode: key })}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/90 text-white border-sky-400 shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {mode.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Panduan Suara Navigasi</div>
            <div className="text-[11px] text-slate-400">
              Pengumuman suara otomatis saat mendekati/mencapai pos dan finish.
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ audioEnabled: !config.audioEnabled })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              config.audioEnabled
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {config.audioEnabled ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>

        {/* Coordinates Data Inspection Box */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-sky-400">📍 KOORDINAT UTAMA RUTE</div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1 max-h-36 overflow-y-auto">
            {WAYPOINTS.map((wp) => (
              <div key={wp.id} className="flex justify-between border-b border-slate-900 pb-0.5">
                <span className="font-bold text-slate-200">{wp.name}:</span>
                <span className="text-slate-400">
                  [{wp.lat.toFixed(6)}, {wp.lng.toFixed(6)}]
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
        >
          Simpan & Tutup
        </button>
      </div>
    </div>
  );
}
