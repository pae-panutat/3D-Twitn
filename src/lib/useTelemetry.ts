'use client';
import {useCallback, useEffect, useState} from 'react';
import {validCitySnapshot} from '../../dist/city-simulation.js';
import type {ControlAction, Snapshot} from './types';

export function useTelemetry() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    const accept = (data: unknown) => {
      if (validCitySnapshot(data)) {
        setSnapshot(data as Snapshot);
        setConnected(true);
        setError('');
      } else {
        setConnected(false);
        setError('รูปแบบข้อมูลไม่ถูกต้อง');
      }
    };
    fetch('/api/snapshot', {signal: abort.signal})
      .then((r) => {
        if (!r.ok) throw new Error('Snapshot unavailable');
        return r.json();
      })
      .then(accept)
      .catch((e) => {
        if (e.name !== 'AbortError') setError('กำลังเชื่อมต่อข้อมูล');
      });
    const stream = new EventSource('/api/events');
    stream.onmessage = (e) => {
      try {
        accept(JSON.parse(e.data));
      } catch {
        setConnected(false);
        setError('อ่านข้อมูลไม่ได้');
      }
    };
    stream.onerror = () => {
      setConnected(false);
      setError('ขาดการเชื่อมต่อ · กำลังลองใหม่');
    };
    return () => {
      abort.abort();
      stream.close();
    };
  }, []);
  const control = useCallback(async (action: ControlAction, id?: string, value?: number) => {
    const response = await fetch('/api/control', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action, id, value}),
    });
    const data = await response.json();
    if (!response.ok || !validCitySnapshot(data))
      throw new Error(data.error ?? 'ส่งคำสั่งไม่สำเร็จ');
    setSnapshot(data as Snapshot);
    return data as Snapshot;
  }, []);
  return {snapshot, connected, error, control};
}
