export interface Waypoint {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  description: string;
  icon: 'start' | 'pos' | 'finish';
  order: number;
}

export const WAYPOINTS: Waypoint[] = [
  {
    id: 'START',
    name: 'START',
    label: 'Start Point',
    lat: -7.218476780200547,
    lng: 107.80343094992534,
    description: 'Titik Awal Perjalanan Jalan Santai',
    icon: 'start',
    order: 0,
  },
  {
    id: 'POS_1',
    name: 'POS 1',
    label: 'Pos Checkpoint 1',
    lat: -7.216832589219066,
    lng: 107.80729663631784,
    description: 'Pos Pemeriksaan Pertama',
    icon: 'pos',
    order: 1,
  },
  {
    id: 'POS_2',
    name: 'POS 2',
    label: 'Pos Checkpoint 2',
    lat: -7.212242184387931,
    lng: 107.80174109486975,
    description: 'Pos Pemeriksaan Kedua',
    icon: 'pos',
    order: 2,
  },
  {
    id: 'POS_3',
    name: 'POS 3',
    label: 'Pos Checkpoint 3',
    lat: -7.213266746045165,
    lng: 107.79519091453727,
    description: 'Pos Pemeriksaan Ketiga',
    icon: 'pos',
    order: 3,
  },
  {
    id: 'POS_4',
    name: 'POS 4',
    label: 'Pos Checkpoint 4',
    lat: -7.217248647645731,
    lng: 107.79873396219227,
    description: 'Pos Pemeriksaan Keempat',
    icon: 'pos',
    order: 4,
  },
  {
    id: 'FINISH',
    name: 'FINISH',
    label: 'Garis Finish',
    lat: -7.218476780200547,
    lng: 107.80343094992534,
    description: 'Garis Finish Jalan Santai',
    icon: 'finish',
    order: 5,
  },
];

export type BatteryMode = 'HIGH_ACCURACY' | 'NORMAL' | 'BATTERY_SAVER';

export interface BatteryModeConfig {
  id: BatteryMode;
  name: string;
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
  updateIntervalMs: number;
}

export const BATTERY_MODES: Record<BatteryMode, BatteryModeConfig> = {
  HIGH_ACCURACY: {
    id: 'HIGH_ACCURACY',
    name: 'Akurasi Tinggi',
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000,
    updateIntervalMs: 1000,
  },
  NORMAL: {
    id: 'NORMAL',
    name: 'Normal',
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
    updateIntervalMs: 3000,
  },
  BATTERY_SAVER: {
    id: 'BATTERY_SAVER',
    name: 'Hemat Baterai',
    enableHighAccuracy: false,
    maximumAge: 10000,
    timeout: 20000,
    updateIntervalMs: 8000,
  },
};

export interface AppConfig {
  waypointRadiusMeters: number; // default 15m
  offRouteWarningMeters: number; // default 30m
  nearRouteWarningMeters: number; // default 10m
  audioEnabled: boolean;
  batteryMode: BatteryMode;
  followUserMap: boolean;
  compassHeadUp: boolean;
  autoStopOnFinish: boolean;
  announceSudahSampai: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  waypointRadiusMeters: 15,
  offRouteWarningMeters: 30,
  nearRouteWarningMeters: 10,
  audioEnabled: true,
  batteryMode: 'HIGH_ACCURACY',
  followUserMap: true,
  compassHeadUp: false,
  autoStopOnFinish: true,
  announceSudahSampai: true,
};
