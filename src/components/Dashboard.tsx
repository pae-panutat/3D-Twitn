'use client';
import dynamic from 'next/dynamic';
import {Component, useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {STATIONS, LANDMARKS} from '../../dist/city.js';
import {useTelemetry} from '../lib/useTelemetry';
import type {ControlAction, DrawerTab, Weather} from '../lib/types';
import type {SceneHandle} from './SceneCanvas';
import {time} from '../lib/format';
import Inspector from './Inspector';
import Icon from './Icon';
const Scene = dynamic(() => import('./SceneCanvas'), {ssr: false});
class SceneBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  render() {
    return this.state.failed ? (
      <div id="scene-error" role="alert">
        <strong>เปิดฉาก 3D ไม่ได้</strong>
        <p>ลองรีเฟรชหน้าเว็บ ยังสำรวจข้อมูลผ่านแผงด้านขวาได้</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Dashboard() {
  const {snapshot, connected, error, control} = useTelemetry(),
    api = useRef<SceneHandle | null>(null);
  const [selected, setSelected] = useState('BTS-1101'),
    [drawerOpen, setDrawerOpen] = useState(false),
    [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
  const [autoRotate, setAutoRotate] = useState(true),
    [tour, setTour] = useState(false),
    [followId, setFollowId] = useState<string | null>(null),
    [showLabels, setShowLabels] = useState(true);
  const [night, setNight] = useState(false),
    [weather, setWeather] = useState<Weather>('clear'),
    [brightness, setBrightness] = useState(1),
    [lightAngle, setLightAngle] = useState(-0.5),
    [lightOpen, setLightOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(true),
    [area, setArea] = useState('all'),
    [query, setQuery] = useState(''),
    [searchOpen, setSearchOpen] = useState(false),
    [clock, setClock] = useState('—'),
    [toast, setToast] = useState(''),
    [sound, setSound] = useState(false);
  const search = useRef<HTMLInputElement | null>(null),
    mapDialog = useRef<HTMLDialogElement | null>(null),
    helpDialog = useRef<HTMLDialogElement | null>(null),
    audio = useRef<AudioContext | null>(null);
  const notify = useCallback((message: string) => setToast(message), []);
  const send = useCallback(
    async (action: ControlAction, id?: string, value?: number) => {
      try {
        await control(action, id, value);
        if (action === 'hold') notify('อัปเดตคำสั่งพักขบวนในการจำลองแล้ว');
      } catch (e) {
        notify(e instanceof Error ? e.message : 'ส่งคำสั่งไม่สำเร็จ');
      }
    },
    [control, notify],
  );
  const gesture = useCallback(() => {
    setAutoRotate(false);
    setTour(false);
    setFollowId(null);
  }, []);
  const resetCamera = useCallback(() => {
    gesture();
    setArea('all');
    api.current?.reset();
  }, [gesture]);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    if (document.getElementById('inspector')?.contains(document.activeElement))
      document.getElementById('inspector-toggle')?.focus();
  }, []);
  const select = useCallback(
    (id: string, focus = false) => {
      setSelected(id);
      setFollowId(null);
      setDrawerOpen(true);
      setDrawerTab('entity');
      setSearchOpen(false);
      if (focus) {
        gesture();
        api.current?.focus(id);
      }
    },
    [gesture],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawerOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('night', night);
    document.body.classList.toggle('inspector-open', drawerOpen);
    return () => {
      document.body.classList.remove('night', 'inspector-open');
    };
  }, [night, drawerOpen]);
  useEffect(() => {
    const tick = () => setClock(time(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        closeDrawer();
        setLightOpen(false);
        setSearchOpen(false);
      }
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      if (e.key === '/') {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === ' ' && (e.target as HTMLElement).id === 'world') {
        e.preventDefault();
        void send('pause');
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [send, closeDrawer]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const soundToggle = async () => {
    try {
      if (!audio.current) {
        const ctx = new AudioContext(),
          gain = ctx.createGain();
        gain.gain.value = 0.022;
        gain.connect(ctx.destination);
        for (const hz of [110, 165, 220]) {
          const osc = ctx.createOscillator();
          osc.frequency.value = hz;
          osc.connect(gain);
          osc.start();
        }
        audio.current = ctx;
      }
      if (sound) await audio.current.suspend();
      else await audio.current.resume();
      setSound(!sound);
    } catch {
      notify('เบราว์เซอร์นี้ไม่รองรับเสียงบรรยากาศ');
    }
  };
  const reset = async () => {
    await send('reset');
    resetCamera();
    setQuery('');
    setSelected('BTS-1101');
    setDrawerTab('overview');
    setDrawerOpen(true);
    notify('เริ่มการจำลองใหม่แล้ว');
  };
  const candidates = [
    ...(snapshot?.trains ?? []).map((t) => ({id: t.id, name: t.name, kind: 'ขบวนรถ'})),
    ...STATIONS.map((t) => ({...t, kind: 'สถานี'})),
    ...LANDMARKS.map((t) => ({...t, kind: 'พื้นที่'})),
  ].filter((t) => (t.id + ' ' + t.name).toLowerCase().includes(query.trim().toLowerCase()));
  const modalBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      e.currentTarget.close();
  };
  return (
    <>
      <SceneBoundary>
        <Scene
          api={api}
          snapshot={snapshot}
          selected={selected}
          drawerOpen={drawerOpen}
          night={night}
          weather={weather}
          brightness={brightness}
          lightAngle={lightAngle}
          autoRotate={autoRotate}
          tour={tour}
          followId={followId}
          showLabels={showLabels}
          onSelect={select}
          onGesture={gesture}
          onHome={resetCamera}
        />
      </SceneBoundary>
      <div id="weather-layer" className={weather === 'clear' ? '' : weather} aria-hidden="true" />
      <header className="topbar glass">
        <button
          id="brand-reset"
          className="brand"
          aria-label="Energy Building กลับภาพรวม"
          onClick={reset}
        >
          <span className="brand-icon">
            <Icon name="train" />
          </span>
          <span>
            <strong>Energy Building</strong>
            <small>ศูนย์ควบคุมย่านริมแม่น้ำ</small>
          </span>
        </button>
        <label className="search-box">
          <Icon name="search" />
          <input
            ref={search}
            id="search"
            type="search"
            placeholder="ค้นหาวัตถุ"
            aria-label="ค้นหาวัตถุ"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(Boolean(e.target.value));
            }}
            onFocus={() => setSearchOpen(Boolean(query))}
          />
          <kbd>/</kbd>
        </label>
        <select
          id="area"
          aria-label="เลือกพื้นที่"
          value={area}
          onChange={(e) => {
            const id = e.target.value;
            setArea(id);
            if (id === 'all') resetCamera();
            else select(id, true);
          }}
        >
          <option value="all">ภาพรวมย่าน</option>
          {[...STATIONS, ...LANDMARKS.filter((x) => x.id === 'depot')].map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          id="weather"
          aria-label="สภาพอากาศ"
          value={weather}
          onChange={(e) => setWeather(e.target.value as Weather)}
        >
          <option value="clear">☀ ฟ้าโปร่ง · 31°</option>
          <option value="rain">☂ ฝนตก · 27°</option>
          <option value="fog">≋ หมอก · 25°</option>
          <option value="festival">✦ ช่วงเทศกาล</option>
        </select>
        <div className="clock">
          <time id="clock">{clock}</time>
          <small>กรุงเทพฯ · UTC+7</small>
        </div>
        <button
          id="events-toggle"
          className="icon-button notification"
          aria-label="บันทึกการเดินรถ"
          onClick={() => {
            setDrawerOpen(!(drawerOpen && drawerTab === 'events'));
            setDrawerTab('events');
          }}
        >
          <Icon name="bell" />
          <span>{Math.min(99, snapshot?.events.length ?? 0)}</span>
        </button>
        <button
          id="light-toggle"
          className="header-button"
          aria-label="ปรับแสง"
          aria-expanded={lightOpen}
          onClick={() => setLightOpen(!lightOpen)}
        >
          <Icon name="sun" />
          <span>ปรับแสง</span>
        </button>
        <button
          id="sound-toggle"
          className="header-button"
          aria-label="เปิดหรือปิดเสียงบรรยากาศ"
          aria-pressed={sound}
          onClick={soundToggle}
        >
          <span className="music-icon">♫</span>
          <span>{sound ? 'ปิดเสียง' : 'เปิดเสียง'}</span>
        </button>
        <button
          id="night-toggle"
          className="header-button"
          aria-label={night ? 'เปลี่ยนเป็นกลางวัน' : 'เปลี่ยนเป็นกลางคืน'}
          aria-pressed={night}
          onClick={() => setNight(!night)}
        >
          <Icon name={night ? 'sun' : 'moon'} />
          <span>{night ? 'กลางวัน' : 'กลางคืน'}</span>
        </button>
        <button
          id="help-toggle"
          className="operator"
          aria-label="คู่มือการใช้งาน"
          onClick={() => helpDialog.current?.showModal()}
        >
          <b>OP</b>
          <span>
            ผู้ควบคุม<small>การจำลอง</small>
          </span>
        </button>
      </header>
      {searchOpen && query && (
        <div id="search-results" className="search-results glass">
          {candidates.length ? (
            candidates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  select(t.id, true);
                  setQuery('');
                }}
              >
                <span>{t.name}</span>
                <small>{t.kind}</small>
              </button>
            ))
          ) : (
            <p>ไม่พบวัตถุที่ตรงกับคำค้นหา</p>
          )}
        </div>
      )}
      {lightOpen && (
        <section id="light-panel" className="light-panel glass">
          <h3>แสงในฉากจำลอง</h3>
          <label>
            ความสว่าง
            <input
              id="brightness"
              type="range"
              min="70"
              max="125"
              value={Math.round(brightness * 100)}
              onChange={(e) => setBrightness(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            ทิศทางแสงแดด
            <input
              id="sun-direction"
              type="range"
              min="-180"
              max="180"
              value={Math.round((lightAngle * 180) / Math.PI)}
              onChange={(e) => setLightAngle((Number(e.target.value) * Math.PI) / 180)}
            />
          </label>
        </section>
      )}
      <Inspector
        open={drawerOpen}
        tab={drawerTab}
        snapshot={snapshot}
        selected={selected}
        connected={connected}
        connectionError={error}
        query={query}
        followId={followId}
        onClose={closeDrawer}
        onTab={(tab) => {
          setDrawerTab(tab);
          setDrawerOpen(true);
        }}
        onSelect={select}
        onFollow={() => {
          setAutoRotate(false);
          setTour(false);
          setFollowId(followId === selected ? null : selected);
        }}
        onControl={send}
        onToast={notify}
      />
      <div className="compass" aria-hidden="true">
        เหนือ<b id="compass-arrow">↑</b>
      </div>
      <div className="controls-area">
        <nav
          className={'toolbar glass ' + (toolbarOpen ? '' : 'collapsed')}
          aria-label="ตัวควบคุมการจำลอง"
        >
          <button
            id="collapse-toolbar"
            aria-label={toolbarOpen ? 'ยุบตัวควบคุมการจำลอง' : 'แสดงตัวควบคุมการจำลอง'}
            aria-expanded={toolbarOpen}
            onClick={() => setToolbarOpen(!toolbarOpen)}
          >
            {toolbarOpen ? '‹' : '≡'}
          </button>
          <div className="toolbar-content">
            <button
              id="pause"
              onClick={() => send('pause')}
              className={snapshot?.paused ? 'subtle-active' : ''}
            >
              {snapshot?.paused ? '▷ เล่นต่อ' : 'Ⅱ หยุด'}
            </button>
            <div className="speed-group" aria-label="ความเร็วการจำลอง">
              {[1, 3, 8].map((rate) => (
                <button
                  key={rate}
                  data-rate={rate}
                  className={snapshot?.rate === rate ? 'active' : ''}
                  aria-pressed={snapshot?.rate === rate}
                  onClick={() => send('rate', undefined, rate)}
                >
                  {rate}×
                </button>
              ))}
            </div>
            <span className="divider" />
            <button id="overview" onClick={resetCamera}>
              ⌂ ภาพรวม
            </button>
            <button
              id="turntable"
              aria-pressed={autoRotate}
              className={autoRotate ? 'subtle-active' : ''}
              onClick={() => {
                setAutoRotate(!autoRotate);
                setTour(false);
                setFollowId(null);
              }}
            >
              หมุน 360°
            </button>
            <button
              id="tour"
              aria-pressed={tour}
              className={tour ? 'subtle-active' : ''}
              onClick={() => {
                setTour(!tour);
                setAutoRotate(false);
                setFollowId(null);
              }}
            >
              ▷ ชมเมือง
            </button>
            <button id="map-toggle" onClick={() => mapDialog.current?.showModal()}>
              ⌖ แผนที่
            </button>
            <button
              id="labels-toggle"
              aria-pressed={showLabels}
              className={showLabels ? 'subtle-active' : ''}
              onClick={() => setShowLabels(!showLabels)}
            >
              ป้ายชื่อ
            </button>
          </div>
        </nav>
      </div>
      <dialog id="map-dialog" ref={mapDialog} onClick={modalBackdrop}>
        <header>
          <h2>เส้นทางจำลอง S5 — S8</h2>
          <button
            className="icon-button"
            aria-label="ปิดแผนที่"
            onClick={() => mapDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="route-map">
          <div className="river-strip">
            <span>เจ้าพระยา</span>
          </div>
          <div className="route-line" />
          {STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                mapDialog.current?.close();
                setArea(s.id);
                select(s.id, true);
              }}
            >
              <i />
              <b>{s.id}</b>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        <p>ภูมิศาสตร์ถูกย่อเพื่อการนำเสนอ เลือกสถานีเพื่อสำรวจ</p>
        <a className="primary" href="/models/bangkok-city.gltf" download>
          ดาวน์โหลดโมเดล 3D
        </a>
      </dialog>
      <dialog id="help-dialog" ref={helpDialog} onClick={modalBackdrop}>
        <header>
          <h2>สำรวจกรุงเทพฯ ในโลกจำลอง</h2>
          <button
            className="icon-button"
            aria-label="ปิดคู่มือ"
            onClick={() => helpDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <ol>
          <li>
            ลากบนฉากเพื่อหมุน คลิกขวาลากเพื่อเลื่อน และเลื่อนล้อเมาส์เพื่อซูม
            บนจอสัมผัสใช้สองนิ้วจีบเพื่อซูม
          </li>
          <li>เลือกสถานีหรือขบวนจากป้ายในเมือง ตาราง หรือช่องค้นหา</li>
          <li>กด “ติดตามขบวนนี้” ให้กล้องตามรถไฟ และกด “พักขบวน” เพื่อหยุดที่สถานีถัดไป</li>
          <li>เปลี่ยนความเร็ว 1× / 3× / 8× สภาพอากาศ กลางคืน และแสง</li>
        </ol>
        <p className="disclaimer">
          ชื่อสถานีอ้างอิงพื้นที่จริง แต่โมเดลอาคาร ระยะทาง และข้อมูลเดินรถทั้งหมดเป็นข้อมูลจำลอง
        </p>
        <a className="primary" href="/models/bangkok-city.gltf" download>
          ดาวน์โหลดโมเดล 3D
        </a>
      </dialog>
      {toast && (
        <div id="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
