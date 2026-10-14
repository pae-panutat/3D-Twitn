import {STATIONS} from '../../dist/city.js';
export const number = new Intl.NumberFormat('th-TH');
export const time = (value: string | Date) =>
  new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
export const stationName = (id: string) =>
  STATIONS.find((s) => s.id === id)?.name ?? (id === 'depot' ? 'ลานซ่อมบำรุง' : '—');
