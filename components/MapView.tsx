'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { LatLng } from '@/lib/geo-utils';
import { Waypoint } from '@/lib/constants';

export type MapTileStyle = 'STREETS' | 'VOYAGER' | 'SATELLITE';

interface MapViewProps {
  waypoints: Waypoint[];
  routePolyline: LatLng[];
  userLocation: LatLng | null;
  userHeading: number | null;
  userTrack: LatLng[];
  currentWaypointIndex: number;
  completedWaypoints: string[];
  followUser: boolean;
  offRoutePoint: LatLng | null;
  isOffRoute: boolean;
  onRecenter: () => void;
  onToggleFollowUser: () => void;
}

const TILE_SERVERS: Record<MapTileStyle, { url: string; subdomains?: string; maxZoom: number }> = {
  STREETS: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
  },
  VOYAGER: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
};

export default function MapView({
  waypoints,
  routePolyline,
  userLocation,
  userHeading,
  userTrack,
  currentWaypointIndex,
  completedWaypoints,
  followUser,
  offRoutePoint,
  isOffRoute,
  onRecenter,
  onToggleFollowUser,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineLayerRef = useRef<L.Polyline | null>(null);
  const userTrackLayerRef = useRef<L.Polyline | null>(null);
  const offRouteLayerRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);

  const [mapTileStyle, setMapTileStyle] = useState<MapTileStyle>('STREETS');

  // Render or Update Waypoint Markers
  const renderWaypointMarkers = useCallback(
    (L: typeof import('leaflet'), map: L.Map) => {
      // Clear old markers
      waypointMarkersRef.current.forEach((m) => m.remove());
      waypointMarkersRef.current = [];

      waypoints.forEach((wp, idx) => {
        const isCompleted = completedWaypoints.includes(wp.id);
        const isCurrent = idx === currentWaypointIndex;

        let bgColor = 'bg-slate-700 border-slate-500';
        let iconSymbol = wp.name;

        if (wp.id === 'START') {
          bgColor = isCompleted
            ? 'bg-emerald-600 border-emerald-300'
            : 'bg-emerald-500 border-emerald-200';
          iconSymbol = '🚀 START';
        } else if (wp.id === 'FINISH') {
          bgColor = isCompleted
            ? 'bg-amber-500 border-amber-200'
            : 'bg-purple-600 border-purple-300';
          iconSymbol = '🏁 FINISH';
        } else {
          if (isCompleted) {
            bgColor = 'bg-emerald-600 border-emerald-300';
            iconSymbol = `✓ ${wp.name}`;
          } else if (isCurrent) {
            bgColor = 'bg-sky-500 border-sky-200 ring-4 ring-sky-500/30 animate-pulse';
            iconSymbol = `🎯 ${wp.name}`;
          } else {
            bgColor = 'bg-slate-800 border-slate-600';
            iconSymbol = wp.name;
          }
        }

        const customIcon = L.divIcon({
          className: 'custom-waypoint-icon',
          html: `
            <div class="waypoint-marker-container">
              <div class="waypoint-badge ${bgColor} transition-all duration-300">
                ${iconSymbol}
              </div>
              <div class="waypoint-pin"></div>
            </div>
          `,
          iconSize: [80, 40],
          iconAnchor: [40, 36],
        });

        const marker = L.marker([wp.lat, wp.lng], { icon: customIcon }).addTo(map);

        // Popup detail with street name info
        marker.bindPopup(`
          <div class="p-2 text-slate-100">
            <div class="font-bold text-sm text-sky-400">${wp.label}</div>
            <div class="text-xs text-slate-300 mt-1">${wp.description}</div>
            <div class="text-[10px] text-slate-400 font-mono mt-2">
              Lat: ${wp.lat.toFixed(6)}<br/>
              Lng: ${wp.lng.toFixed(6)}
            </div>
          </div>
        `);

        waypointMarkersRef.current.push(marker);
      });
    },
    [waypoints, completedWaypoints, currentWaypointIndex]
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Dynamically load Leaflet library on client side
    import('leaflet').then((L) => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const startPoint = waypoints[0];
      const initialMap = L.map(mapContainerRef.current, {
        center: [startPoint.lat, startPoint.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Default to OpenStreetMap Standard (Shows explicit street names & real map identity)
      const tileConfig = TILE_SERVERS[mapTileStyle];
      const initialTile = L.tileLayer(tileConfig.url, {
        maxZoom: tileConfig.maxZoom,
        subdomains: tileConfig.subdomains || 'abc',
      }).addTo(initialMap);

      tileLayerRef.current = initialTile;
      mapInstanceRef.current = initialMap;

      // Draw official route polyline
      const routeCoords: [number, number][] = routePolyline.map((p) => [p.lat, p.lng]);
      const polyline = L.polyline(routeCoords, {
        color: '#0284c7',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(initialMap);
      routePolylineLayerRef.current = polyline;

      // Draw user track line
      const userTrackPolyline = L.polyline([], {
        color: '#f97316',
        weight: 4,
        opacity: 0.9,
        dashArray: '6, 8',
      }).addTo(initialMap);
      userTrackLayerRef.current = userTrackPolyline;

      // Off route connector polyline
      const offRouteLine = L.polyline([], {
        color: '#ef4444',
        weight: 3,
        opacity: 0.8,
        dashArray: '4, 6',
      }).addTo(initialMap);
      offRouteLayerRef.current = offRouteLine;

      // Add Waypoint Markers
      renderWaypointMarkers(L, initialMap);

      // Fit map bounds to show full route initially
      if (routeCoords.length > 0) {
        const bounds = L.latLngBounds(routeCoords);
        initialMap.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        userMarkerRef.current = null;
        routePolylineLayerRef.current = null;
        userTrackLayerRef.current = null;
        offRouteLayerRef.current = null;
        waypointMarkersRef.current = [];
      }
    };
  }, [waypoints, routePolyline, renderWaypointMarkers, mapTileStyle]);

  // Update Tile Layer when tile style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
      }

      const cfg = TILE_SERVERS[mapTileStyle];
      const newTile = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(map);

      tileLayerRef.current = newTile;
    });
  }, [mapTileStyle]);

  // Re-render markers when active/completed state changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        renderWaypointMarkers(L, mapInstanceRef.current);
      }
    });
  }, [renderWaypointMarkers]);

  // Update Route Polyline if updated from OSRM
  useEffect(() => {
    if (!routePolylineLayerRef.current) return;
    const coords: [number, number][] = routePolyline.map((p) => [p.lat, p.lng]);
    routePolylineLayerRef.current.setLatLngs(coords);
  }, [routePolyline]);

  // Update User Track Breadcrumbs
  useEffect(() => {
    if (!userTrackLayerRef.current) return;
    const coords: [number, number][] = userTrack.map((p) => [p.lat, p.lng]);
    userTrackLayerRef.current.setLatLngs(coords);
  }, [userTrack]);

  // Update Off Route Line
  useEffect(() => {
    if (!offRouteLayerRef.current) return;
    if (isOffRoute && userLocation && offRoutePoint) {
      offRouteLayerRef.current.setLatLngs([
        [userLocation.lat, userLocation.lng],
        [offRoutePoint.lat, offRoutePoint.lng],
      ]);
    } else {
      offRouteLayerRef.current.setLatLngs([]);
    }
  }, [isOffRoute, userLocation, offRoutePoint]);

  // Update User Location Marker & Camera Auto-Follow
  useEffect(() => {
    if (!userLocation) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const headingTransform =
        userHeading !== null ? `transform: rotate(${userHeading}deg);` : 'display: none;';

      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="user-gps-marker">
            <div class="user-gps-pulse"></div>
            <div class="user-gps-cone" style="${headingTransform}"></div>
            <div class="user-gps-dot"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(userIcon);
      }

      if (followUser) {
        map.panTo([userLocation.lat, userLocation.lng], {
          animate: true,
          duration: 0.8,
        });
      }
    });
  }, [userLocation, userHeading, followUser]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      {/* Leaflet Map DOM Target */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Tile Style Switcher Bar (Real Map Street Names & Satellite) */}
      <div className="absolute top-4 left-4 z-20 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg text-[11px] font-bold">
        <button
          onClick={() => setMapTileStyle('STREETS')}
          className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            mapTileStyle === 'STREETS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
          title="Tampilkan Nama Jalan & Identitas Maps LENGKAP"
        >
          🗺️ Nama Jalan
        </button>
        <button
          onClick={() => setMapTileStyle('VOYAGER')}
          className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            mapTileStyle === 'VOYAGER'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          🧭 Voyager
        </button>
        <button
          onClick={() => setMapTileStyle('SATELLITE')}
          className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            mapTileStyle === 'SATELLITE'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          🛰️ Satelit
        </button>
      </div>

      {/* Floating Map Action Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Recenter Button */}
        <button
          onClick={onRecenter}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-sky-400 font-medium text-xs rounded-xl border border-sky-500/30 shadow-lg transition-all active:scale-95 cursor-pointer"
          title="Ke Posisi Saya"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
          Lokasi Saya
        </button>

        {/* Follow User Toggle */}
        <button
          onClick={onToggleFollowUser}
          className={`flex items-center justify-center p-2.5 rounded-xl border shadow-lg transition-all active:scale-95 text-xs font-medium cursor-pointer ${
            followUser
              ? 'bg-sky-600/90 text-white border-sky-400'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={followUser ? 'Kamera Mengikuti Pengguna: AKTIF' : 'Kamera Bebas'}
        >
          {followUser ? '🔒 Lock Kamera' : '🔓 Free Kamera'}
        </button>
      </div>

      {/* Off Route Warning Overlay Banner on Map */}
      {isOffRoute && (
        <div className="absolute top-16 left-4 right-16 z-20 bg-rose-900/95 backdrop-blur-md border border-rose-500/50 text-rose-100 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-pulse">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold text-xs uppercase tracking-wide">Peringatan Keluar Jalur!</div>
            <div className="text-[11px] text-rose-200">Ikuti garis merah putus-putus untuk kembali ke rute.</div>
          </div>
        </div>
      )}
    </div>
  );
}
