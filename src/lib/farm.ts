'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
export type Pig = {id: string; tag: string; pen: string; x: number; z: number; heading: number; weight: number; age: number; battery: number; bodyTemperature: number; activity: string};
export type Fan = {id: string; on: boolean; rpm: number; watts: number};
export type FarmSnapshot = {source: 'simulation'; revision: number; timestamp: number; time: number; paused: boolean; temperature: number; humidity: number; pigs: Pig[]; fans: Fan[]; events: {id: number; at: number; text: string}[]};
function valid(value: unknown): value is FarmSnapshot {
  const s = value as FarmSnapshot;
  return !!s && s.source === 'simulation' && Number.isFinite(s.revision) && Number.isFinite(s.temperature) && Array.isArray(s.pigs) && s.pigs.length === 10 && s.pigs.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)) && Array.isArray(s.fans);
}
export function useFarm() {
  const [snapshot, setSnapshot] = useState<FarmSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const latest = useRef(0);
  const accept = useCallback((data: unknown) => {
    if (!valid(data)) throw new Error('รูปแบบข้อมูลฟาร์มไม่ถูกต้อง');
    if (data.revision >= latest.current) { latest.current = data.revision; setSnapshot(data); }
  }, []);
  useEffect(() => {
    latest.current = 0;
    const stream = new EventSource('/api/farm/events');
    let lastMessage = Date.now();
    stream.onmessage = e => {
      try { accept(JSON.parse(e.data)); lastMessage = Date.now(); setConnected(true); }
      catch { setConnected(false); }
    };
    stream.onerror = () => { setConnected(false); latest.current = 0; };
    const timer = setInterval(() => { if (Date.now() - lastMessage > 4000) setConnected(false); }, 1000);
    return () => { stream.close(); clearInterval(timer); };
  }, [accept]);
  const control = useCallback(async (action: 'fan' | 'pause', value: boolean, id?: string) => {
    const response = await fetch('/api/farm/control', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action, value, id}), signal: AbortSignal.timeout(6000)});
    if (!response.ok) throw new Error('ส่งคำสั่งไม่สำเร็จ กรุณาลองอีกครั้ง');
    accept(await response.json());
  }, [accept]);
  return {snapshot, connected, control};
}
