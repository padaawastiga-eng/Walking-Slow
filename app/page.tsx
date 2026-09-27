'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  WAYPOINTS,
  DEFAULT_CONFIG,
  AppConfig,
  BatteryMode,
  BATTERY_MODES,
  Waypoint,
} from '@/lib/constants';
import {
  LatLng,
  getHaversineDistance,
  getGeodesicBearing,
  getDistanceToPolyline,
  getPolylineLength,
  formatDistance,
} from '@/lib/geo-utils';
import { speechService } from '@/lib/speech-utils';
import { fetchWalkingRoute } from '@/lib/routing-service';

import NavigationHeader from '@/components/NavigationHeader';
import DirectionCompass from '@/components/DirectionCompass';
import ProgressTracker from '@/components/ProgressTracker';
import SimulationControl from '@/components/SimulationControl';
import FinishModal from '@/components/FinishModal';
import SettingsModal from '@/components/SettingsModal';

// Dynamic import MapView without SSR (Leaflet requires DOM window)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
      <div className="flex flex-col items-center gap-3 text-sky-400">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold tracking-wide">Memuat Peta GPS Realtime & Nama Jalan...</span>
      </div>
    </div>
  ),
});

export default function JalanSantaiApp() {
  // Navigation State
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Checkpoint Validation State
  const [isAllCheckpointsCompleted, setIsAllCheckpointsCompleted] = useState<boolean>(true);
  const [missingWaypoints, setMissingWaypoints] = useState<Waypoint[]>([]);

  // Route & Waypoint State
  const [routePolyline, setRoutePolyline] = useState<LatLng[]>(
    WAYPOINTS.map((wp) => ({ lat: wp.lat, lng: wp.lng }))
  );
  const [totalRouteDistance, setTotalRouteDistance] = useState<number>(0);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(1); // Default target POS 1
  const [completedWaypoints, setCompletedWaypoints] = useState<string[]>(['START']);

  // User GPS Telemetry
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [userSpeedMps, setUserSpeedMps] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hasCompassSensor, setHasCompassSensor] = useState<boolean>(true);
  const [userTrack, setUserTrack] = useState<LatLng[]>([]);

  // System & Permission State
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState<boolean>(false);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Map Controls State
  const [followUser, setFollowUser] = useState<boolean>(true);

  // Computed Navigation Geometry
  const targetWaypoint = WAYPOINTS[currentWaypointIndex] || WAYPOINTS[WAYPOINTS.length - 1];

  const distanceToWaypoint = userLocation
    ? getHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        targetWaypoint.lat,
        targetWaypoint.lng
      )
    : 0;

  const bearingToWaypoint = userLocation
    ? getGeodesicBearing(
        userLocation.lat,
        userLocation.lng,
        targetWaypoint.lat,
        targetWaypoint.lng
      )
    : 0;

  const polylineResult = userLocation
    ? getDistanceToPolyline(userLocation, routePolyline)
    : { minDistance: 0, closestPoint: null };

  const distanceToRoute = polylineResult.minDistance;
  const offRoutePoint = polylineResult.closestPoint;
  const isOffRoute = userLocation ? distanceToRoute > config.offRouteWarningMeters : false;

  // Ref tracking to avoid stale closures in geolocation/deviceorientation
  const currentWaypointIndexRef = useRef(currentWaypointIndex);
  const completedWaypointsRef = useRef(completedWaypoints);
  const configRef = useRef(config);

  useEffect(() => {
    currentWaypointIndexRef.current = currentWaypointIndex;
    completedWaypointsRef.current = completedWaypoints;
    configRef.current = config;
  }, [currentWaypointIndex, completedWaypoints, config]);

  // Check Waypoint Auto-Progression Function with Checkpoint Validation
  const checkWaypointProgression = useCallback((pos: LatLng) => {
    const idx = currentWaypointIndexRef.current;
    const targetWp = WAYPOINTS[idx];
    if (!targetWp) return;

    const radius = configRef.current.waypointRadiusMeters;

    // Check distance to current target waypoint
    const distToTarget = getHaversineDistance(pos.lat, pos.lng, targetWp.lat, targetWp.lng);

    // Also check distance to FINISH / START coordinate (-7.218476780200547, 107.80343094992534)
    const finishWp = WAYPOINTS[WAYPOINTS.length - 1];
    const distToFinish = getHaversineDistance(pos.lat, pos.lng, finishWp.lat, finishWp.lng);

    // Check missing POS checkpoints
    const missingWps = WAYPOINTS.filter(
      (wp) => wp.icon === 'pos' && !completedWaypointsRef.current.includes(wp.id)
    );

    // 1. Current Target Waypoint Reached
    if (distToTarget <= radius) {
      const completedId = targetWp.id;
      if (!completedWaypointsRef.current.includes(completedId)) {
        const nextCompleted = [...completedWaypointsRef.current, completedId];
        setCompletedWaypoints(nextCompleted);

        // If FINISH reached
        if (completedId === 'FINISH' || idx === WAYPOINTS.length - 1) {
          if (missingWps.length === 0) {
            // SAH & LENGKAP - SUDAH SAMPAI DI FINISH!
            setIsAllCheckpointsCompleted(true);
            setMissingWaypoints([]);

            if (configRef.current.autoStopOnFinish) {
              setIsFinished(true);
              setIsTrackingActive(false); // Stop GPS tracking automatically
            }

            if (configRef.current.announceSudahSampai) {
              speechService.announceSudahSampaiFinish();
            } else {
              speechService.announceFinish();
            }

            setIsFinishModalOpen(true);
          } else {
            // INCOMPLETE FINISH!
            setIsAllCheckpointsCompleted(false);
            setMissingWaypoints(missingWps);
            speechService.announceIncompleteFinish(missingWps.map((w) => w.name));
            setIsFinishModalOpen(true);
          }
        } else {
          const nextIdx = idx + 1;
          const nextWp = WAYPOINTS[nextIdx];
          setCurrentWaypointIndex(nextIdx);
          speechService.announceWaypointCompleted(targetWp.name, nextWp.name);
        }
      }
    } else if (
      distToFinish <= radius &&
      completedWaypointsRef.current.length > 1 && // Participant has started moving
      idx !== 1 // Not at initial step before POS 1
    ) {
      // Participant returned to FINISH / START coordinate prematurely
      if (missingWps.length > 0) {
        setIsAllCheckpointsCompleted(false);
        setMissingWaypoints(missingWps);
        speechService.announceIncompleteFinish(missingWps.map((w) => w.name));
        setIsFinishModalOpen(true);
      }
    } else if (distToTarget <= radius * 2) {
      // Proximity warning
      speechService.announceWaypointNear(targetWp.name);
    }
  }, []);

  // Timer for navigation duration (stops automatically when finish is reached)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNavigating && isTrackingActive && !isFinished && !isFinishModalOpen) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isNavigating, isTrackingActive, isFinished, isFinishModalOpen]);

  // Fetch actual walking route geometry from OSRM on load
  useEffect(() => {
    fetchWalkingRoute(WAYPOINTS).then((res) => {
      setRoutePolyline(res.fullPolyline);
      setTotalRouteDistance(res.totalDistanceMeters);
    });
  }, []);

  // Sync speech service mute state
  useEffect(() => {
    speechService.setEnabled(config.audioEnabled);
  }, [config.audioEnabled]);

  // Device Orientation Handler (Compass heading)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS WebKit Compass
      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard Android / Web orientation
        heading = 360 - e.alpha;
      }

      if (heading !== null && !isNaN(heading)) {
        setUserHeading(heading);
        setHasCompassSensor(true);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  // Geolocation Position Watcher (Stops automatically when isTrackingActive is false)
  useEffect(() => {
    if (!isNavigating || isSimulating || !isTrackingActive || isFinished) return;

    if (!('geolocation' in navigator)) {
      setTimeout(() => setGpsErrorMessage('Perangkat Anda tidak mendukung Geolocation API.'), 0);
      return;
    }

    const modeConfig = BATTERY_MODES[config.batteryMode];

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermissionDenied(false);
        setGpsErrorMessage(null);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speed = pos.coords.speed;
        const heading = pos.coords.heading;

        const newPos = { lat, lng };
        setUserLocation(newPos);
        setGpsAccuracy(accuracy);
        if (speed !== null) setUserSpeedMps(speed);

        if (heading !== null && !isNaN(heading)) {
          setUserHeading(heading);
        }

        // Add point to user track
        setUserTrack((prev) => {
          if (prev.length === 0) return [newPos];
          const last = prev[prev.length - 1];
          // Add if moved at least 3 meters
          if (getHaversineDistance(last.lat, last.lng, lat, lng) >= 3) {
            return [...prev, newPos];
          }
          return prev;
        });

        // Check Waypoint Completion logic
        checkWaypointProgression(newPos);
      },
      (err) => {
        console.warn('GPS Error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionDenied(true);
          setGpsErrorMessage('Izin akses lokasi ditolak oleh pengguna/perangkat.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsErrorMessage('Sinyal lokasi GPS tidak tersedia.');
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorMessage('Waktu permintaan sinyal GPS habis (Timeout).');
        }
      },
      {
        enableHighAccuracy: modeConfig.enableHighAccuracy,
        maximumAge: modeConfig.maximumAge,
        timeout: modeConfig.timeout,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isNavigating, isSimulating, isTrackingActive, isFinished, config.batteryMode, checkWaypointProgression]);

  // Simulated Position Handler
  const handleUpdateSimulatedPosition = useCallback(
    (pos: LatLng, heading: number | null, speedMps: number) => {
      setUserLocation(pos);
      setGpsAccuracy(3); // Simulated 3m accuracy
      setUserSpeedMps(speedMps);
      if (heading !== null) setUserHeading(heading);

      setUserTrack((prev) => {
        if (prev.length === 0) return [pos];
        const last = prev[prev.length - 1];
        if (getHaversineDistance(last.lat, last.lng, pos.lat, pos.lng) >= 2) {
          return [...prev, pos];
        }
        return prev;
      });

      checkWaypointProgression(pos);
    },
    [checkWaypointProgression]
  );

  // Start Navigation Button Click
  const handleStartNavigation = () => {
    setIsNavigating(true);
    setIsFinished(false);
    setIsTrackingActive(true);
    setIsAllCheckpointsCompleted(true);
    setMissingWaypoints([]);
    setCurrentWaypointIndex(1); // Target POS 1
    setCompletedWaypoints(['START']);
    speechService.announceNavigationStart();

    // Set initial user location to START if no location yet
    if (!userLocation) {
      setUserLocation({ lat: WAYPOINTS[0].lat, lng: WAYPOINTS[0].lng });
    }
  };

  // Reset & Restart
  const handleResetTrack = () => {
    setUserTrack([]);
  };

  const handleRestartNavigation = () => {
    setIsNavigating(true);
    setIsFinished(false);
    setIsTrackingActive(true);
    setIsAllCheckpointsCompleted(true);
    setMissingWaypoints([]);
    setCurrentWaypointIndex(1);
    setCompletedWaypoints(['START']);
    setElapsedSeconds(0);
    setUserTrack([]);
    setIsFinishModalOpen(false);
    speechService.announceNavigationStart();
  };

  // Fullscreen API toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  // Calculate distance covered & remaining
  const distanceCovered = userTrack.length > 1 ? getPolylineLength(userTrack) : 0;
  const distanceRemaining = Math.max(0, totalRouteDistance - distanceCovered);

  // -------------------------------------------------------------
  // LANDING PAGE / WELCOME VIEW (Before Start Navigation)
  // -------------------------------------------------------------
  if (!isNavigating) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-8 py-6">
          {/* Hero Branding Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <span>📍 GPS REALTIME MAPS & NOTIFIKASI SUDAH SAMPAI</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
              JALAN SANTAI
            </h1>
            <p className="text-base text-slate-300 max-w-lg mx-auto font-medium">
              Panduan Navigasi Realtime dengan Pemberitahuan &quot;Sudah Sampai&quot; dan Auto-Stop saat Tiba di Finish.
            </p>
          </div>

          {/* Route Preview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <span>URUTAN RUTE WAYPOINT</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  PEMBERITAHUAN SUDAH SAMPAI
                </span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Total Jarak: ~{formatDistance(totalRouteDistance)}
              </span>
            </div>

            {/* Waypoint Stepper List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WAYPOINTS.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      wp.id === 'START'
                        ? 'bg-emerald-500 text-slate-950'
                        : wp.id === 'FINISH'
                        ? 'bg-purple-600 text-white'
                        : 'bg-sky-600 text-white'
                    }`}
                  >
                    {wp.id === 'START' ? '🏁' : wp.id === 'FINISH' ? '🏆' : wp.name}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-100">{wp.label}</div>
                    <div className="text-xs text-slate-400">{wp.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      [{wp.lat.toFixed(6)}, {wp.lng.toFixed(6)}]
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Geolocation Permission Disclaimer */}
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-3">
              <span className="text-xl">📡</span>
              <div>
                <span className="font-bold">Izin GPS Lokasi & Deteksi Pos:</span>
                <p className="text-sky-300/80 mt-0.5">
                  Aplikasi memantau lokasi GPS Anda. Begitu memasuki koordinat Finish, aplikasi memberi pemberitahuan &quot;Sudah Sampai&quot; dan menghentikan pelacakan otomatis.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleStartNavigation}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl shadow-sky-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 MULAI PETA REALTIME & NAVIGASI</span>
              </button>

              <button
                onClick={() => {
                  setIsSimulating(true);
                  handleStartNavigation();
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wide border border-amber-500/30 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <span>🎮 Buka Mode Simulasi GPS (Demo Walk)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-500 font-mono">
          Jalan Santai GPS Navigation System · Garut, Indonesia
        </footer>
      </main>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE NAVIGATION VIEW (Responsive Mobile & Desktop)
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Telemetry Header Bar */}
      <NavigationHeader
        currentWaypoint={targetWaypoint}
        distanceMeters={distanceToWaypoint}
        gpsAccuracy={gpsAccuracy}
        speedMps={userSpeedMps}
        batteryMode={config.batteryMode}
        audioEnabled={config.audioEnabled}
        isSimulating={isSimulating}
        isFullscreen={isFullscreen}
        isFinished={isFinished}
        isTrackingActive={isTrackingActive}
        onSelectBatteryMode={(mode) => setConfig((prev) => ({ ...prev, batteryMode: mode }))}
        onToggleAudio={() => setConfig((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }))}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* GPS Permission Warning Modal Banner */}
      {gpsPermissionDenied && !isSimulating && (
        <div className="bg-rose-950 border-b border-rose-500/50 p-3 text-rose-200 text-xs flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>
              <strong>GPS Tidak Dapat Digunakan:</strong> {gpsErrorMessage || 'Aktifkan izin lokasi pada browser/HP Anda.'}
            </span>
          </div>
          <button
            onClick={() => setIsSimulating(true)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
          >
            Gunakan Simulasi Demo
          </button>
        </div>
      )}

      {/* Main Dual View Area */}
      <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden p-2 md:p-4 gap-3">
        {/* Map View Container */}
        <div className="relative flex-1 h-full min-h-[280px]">
          <MapView
            waypoints={WAYPOINTS}
            routePolyline={routePolyline}
            userLocation={userLocation}
            userHeading={userHeading}
            userTrack={userTrack}
            currentWaypointIndex={currentWaypointIndex}
            completedWaypoints={completedWaypoints}
            followUser={followUser}
            offRoutePoint={offRoutePoint}
            isOffRoute={isOffRoute}
            onRecenter={() => {
              setFollowUser(true);
            }}
            onToggleFollowUser={() => setFollowUser(!followUser)}
          />

          {/* Floating Simulator Controls Drawer */}
          {isSimulating && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-30">
              <SimulationControl
                routePolyline={routePolyline}
                isSimulating={isSimulating}
                isFinished={isFinished}
                onUpdateSimulatedPosition={handleUpdateSimulatedPosition}
                onResetTrack={handleResetTrack}
                onRestartNavigation={handleRestartNavigation}
                onClose={() => setIsSimulating(false)}
              />
            </div>
          )}
        </div>

        {/* Right Navigation Dashboard (Desktop Sidebar / Mobile Sheet) */}
        <div className="w-full lg:w-[420px] flex flex-col gap-3 h-auto lg:h-full overflow-y-auto max-h-[45vh] lg:max-h-full scrollbar-thin">
          {/* Primary Compass & Direction Arrow */}
          <DirectionCompass
            targetWaypoint={targetWaypoint}
            distanceToWaypoint={distanceToWaypoint}
            bearingToWaypoint={bearingToWaypoint}
            deviceHeading={userHeading}
            hasCompassSensor={hasCompassSensor}
            isOffRoute={isOffRoute}
            distanceToRoute={distanceToRoute}
            offRouteThreshold={config.offRouteWarningMeters}
            nearRouteThreshold={config.nearRouteWarningMeters}
            waypointRadius={config.waypointRadiusMeters}
            isFinished={isFinished}
          />

          {/* Progress Tracker Stepper */}
          <ProgressTracker
            waypoints={WAYPOINTS}
            currentWaypointIndex={currentWaypointIndex}
            completedWaypoints={completedWaypoints}
            totalRouteDistance={totalRouteDistance}
            distanceCovered={distanceCovered}
            distanceRemaining={distanceRemaining}
            elapsedSeconds={elapsedSeconds}
            speedMps={userSpeedMps}
            onSelectWaypoint={(idx) => setCurrentWaypointIndex(idx)}
          />

          {/* Bottom Action Toolbar */}
          <div className="grid grid-cols-3 gap-2 pt-1 pb-2">
            <button
              onClick={() => setFollowUser(true)}
              className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              🎯 Lokasi Saya
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              ⚙️ Pengaturan
            </button>

            <button
              onClick={() => {
                setIsNavigating(false);
                setIsTrackingActive(false);
              }}
              className="py-2.5 px-3 rounded-xl bg-rose-950/80 border border-rose-800 hover:bg-rose-900 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              ⏹️ Stop Navigasi
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <FinishModal
        isOpen={isFinishModalOpen}
        isAllCheckpointsCompleted={isAllCheckpointsCompleted}
        missingWaypoints={missingWaypoints}
        totalDistance={totalRouteDistance}
        totalSeconds={elapsedSeconds}
        waypointsPassedCount={completedWaypoints.length}
        onContinueNavigation={() => setIsFinishModalOpen(false)}
        onRestart={handleRestartNavigation}
        onClose={() => setIsFinishModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onUpdateConfig={(newCfg) => setConfig((prev) => ({ ...prev, ...newCfg }))}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
