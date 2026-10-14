export interface Train {
  id: string;
  name: string;
  direction: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  nextStationId: string;
  eta: number;
  density: number;
  status: string;
  step: number;
  doors: boolean;
  held: boolean;
  holdRequested: boolean;
}
export interface Station {
  id: string;
  name: string;
  x: number;
  position: number[];
  lat: number;
  lng: number;
  subtitle: string;
  density: number;
  nextTrain: string | null;
  eta: number | null;
  boarding: number;
  status: string;
}
export interface Signal {
  id: string;
  name: string;
  stationId: string;
  position: number[];
  status: string;
  direction: number;
  x: number;
  z: number;
}
export interface CityEvent {
  id: string;
  entityId: string;
  message: string;
  status: string;
  timestamp: string;
}
export interface Snapshot {
  schemaVersion: number;
  source: string;
  timestamp: string;
  elapsed: number;
  rate: number;
  paused: boolean;
  trains: Train[];
  stations: Station[];
  signals: Signal[];
  events: CityEvent[];
  metrics: {
    trains: number;
    totalTrains: number;
    onTime: number;
    passengers: number;
    boarded: number;
    headway: number;
  };
}
export type DrawerTab = 'overview' | 'entity' | 'table' | 'events';
export type TableTab = 'trains' | 'stations' | 'signals';
export type Weather = 'clear' | 'rain' | 'fog' | 'festival';
export type ControlAction = 'pause' | 'rate' | 'hold' | 'reset';
