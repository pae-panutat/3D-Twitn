'use client';
import {useRef, useState} from 'react';
import type {ControlAction, DrawerTab, Snapshot, TableTab} from '../lib/types';
import {STATIONS, LANDMARKS} from '../../dist/city.js';
import {number, time, stationName} from '../lib/format';
import Icon from './Icon';
interface Props {
  open: boolean;
  tab: DrawerTab;
  snapshot: Snapshot | null;
  selected: string;
  connected: boolean;
  connectionError: string;
  query: string;
  followId: string | null;
  onClose: () => void;
  onTab: (tab: DrawerTab) => void;
  onSelect: (id: string) => void;
  onFollow: () => void;
  onControl: (action: ControlAction, id?: string, value?: number) => void;
  onToast: (message: string) => void;
}
const tabs: DrawerTab[] = ['overview', 'entity', 'table', 'events'];
const tabNames = ['ภาพรวม', 'วัตถุ', 'ตาราง', 'เหตุการณ์'];
function Journey({snapshot, selected}: {snapshot: Snapshot; selected: string}) {
  const t = snapshot.trains.find((t) => t.id === selected) ?? snapshot.trains[0];
  return (
    <details className="journey-fold">
      <summary>สถานะการเดินทางของขบวนที่เลือก</summary>
      <section className="journey">
        <h3>
          {t.name} → {stationName(t.nextStationId)}
        </h3>
        <p>
          {t.held
            ? 'พักขบวนที่สถานี'
            : t.doors
              ? 'กำลังรับส่งผู้โดยสาร'
              : 'ถึงสถานีใน ' + t.eta + ' วินาที'}
        </p>
        <div className="steps">
          {['ออก', 'เดินรถ', 'เข้าสถานี', 'เปิดประตู', 'รับส่งคน', 'ออกต่อ'].map((name, i) => (
            <span key={name} className={i === t.step ? 'active' : i < t.step ? 'done' : ''}>
              <i>{i + 1}</i>
              <small>{name}</small>
            </span>
          ))}
        </div>
      </section>
    </details>
  );
}
function Entity(props: Props & {snapshot: Snapshot}) {
  const {snapshot: s, selected} = props,
    train = s.trains.find((t) => t.id === selected),
    station = s.stations.find((t) => t.id === selected),
    signal = s.signals.find((t) => t.id === selected),
    landmark = LANDMARKS.find((t) => t.id === selected);
  let title = '',
    subtitle = '',
    status = '',
    note = '',
    kind = 'ข้อมูลสถานที่',
    density = 0,
    fields: string[][] = [];
  if (train) {
    kind = 'ข้อมูลขบวนรถ';
    title = train.name;
    subtitle =
      'รถไฟฟ้า 4 ตู้ · ' +
      (train.direction === 0
        ? 'ลานซ่อมบำรุง'
        : train.direction > 0
          ? 'มุ่งตะวันออก · สุรศักดิ์'
          : 'มุ่งตะวันตก · วงเวียนใหญ่');
    status = train.status;
    density = train.density;
    fields = [
      ['ความเร็ว', train.speed + ' กม./ชม.'],
      ['สถานีถัดไป', stationName(train.nextStationId)],
      ['ถึงสถานีใน', train.held ? 'พักขบวน' : train.eta + ' วินาที'],
      ['ช่วงห่างเป้าหมาย', '90 วินาที'],
      ['การจัดตู้รถ', 'ตู้ขับ · มอเตอร์ · มอเตอร์ · ตู้ขับ'],
      ['ไฟเลี้ยงระบบ', '750 โวลต์ DC'],
    ];
    note = train.held
      ? 'พักขบวนตามคำสั่งจำลอง'
      : train.holdRequested
        ? 'รอพักขบวนที่สถานีถัดไป'
        : train.doors
          ? 'จอดรับส่งผู้โดยสาร · ประตูเปิด'
          : 'เดินรถอัตโนมัติ · ประตูล็อก';
  } else if (station) {
    kind = 'ข้อมูลสถานี';
    title = station.name;
    subtitle = station.id + ' · ' + station.subtitle;
    status = station.status;
    density = station.density;
    fields = [
      ['ความหนาแน่นชานชาลา', station.density + '%'],
      ['ขบวนถัดไปถึงใน', station.eta === null ? '—' : station.eta + ' วินาที'],
      ['ขบวนที่กำลังเข้า', station.nextTrain?.replace('-', ' ') ?? '—'],
      ['รหัสสถานี', station.id],
      ['ขึ้นรถในรอบนี้', station.boarding + ' คน'],
      ['ชานชาลา', '2 ชานชาลาจำลอง'],
    ];
    note = 'เชื่อมต่อข้อมูลขบวนรถและสัญญาณในโลกจำลอง';
  } else if (signal) {
    kind = 'ข้อมูลสัญญาณ';
    title = signal.id;
    subtitle = signal.name;
    status = signal.status === 'red' ? 'มีขบวนอยู่ในช่วงทาง' : 'ช่วงทางว่าง';
    fields = [
      ['สถานี', stationName(signal.stationId)],
      ['สถานะ', signal.status === 'red' ? 'แดง · ระวังขบวน' : 'เขียว · ทางว่าง'],
      ['ทิศทาง', signal.direction > 0 ? 'ตะวันออก' : 'ตะวันตก'],
      ['ระบบ', 'สัญญาณจำลอง'],
    ];
    note = 'สีสัญญาณแสดงการมีขบวนอยู่ใกล้จุดตรวจในฉากจำลอง';
  } else if (landmark) {
    title = landmark.name;
    subtitle =
      landmark.id === 'depot' ? 'พื้นที่ซ่อมและตรวจสภาพขบวนรถ' : 'จุดเชื่อมต่อการเดินทางทางน้ำ';
    status = 'เปิดให้สำรวจ';
    fields =
      landmark.id === 'depot'
        ? [
            ['ขบวนในลาน', 'BTS 1106'],
            ['รอบตรวจสภาพ', '65 วินาที (จำลอง)'],
            ['ทางบริการ', '2 ราง'],
            ['สถานะ', 'ตรวจและล้างรถ'],
          ]
        : [
            ['เชื่อมสถานี', 'สะพานตากสิน'],
            ['พื้นที่', 'ริมเจ้าพระยา'],
            ['บริการ', 'เรือโดยสารจำลอง'],
            ['สถานะ', 'เปิดให้สำรวจ'],
          ];
    note = 'พื้นที่และสิ่งปลูกสร้างจำลองเพื่อแสดงรูปแบบการใช้งาน';
  }
  const realMap = () => {
    const st =
      STATIONS.find((st) => st.id === (train?.nextStationId ?? signal?.stationId ?? selected)) ??
      STATIONS[2];
    window.open(
      `https://www.openstreetmap.org/?mlat=${st.lat}&mlon=${st.lng}#map=17/${st.lat}/${st.lng}`,
      '_blank',
      'noopener,noreferrer',
    );
  };
  return (
    <aside className="detail" id="detail" aria-label="รายละเอียดวัตถุ">
      <header>
        <span>{kind}</span>
        <span className="sim-label">
          <i />
          ข้อมูลจำลอง
        </span>
        <button
          className="icon-button"
          aria-label="อัปเดตรายละเอียด"
          onClick={() => props.onToast('รายละเอียดตรงกับข้อมูลจำลองล่าสุดแล้ว')}
        >
          <Icon name="reset" />
        </button>
      </header>
      <div className="detail-scroll">
        <h2 id="entity-title" className={train ? '' : 'station-heading'}>
          {title}
        </h2>
        <p>{subtitle}</p>
        <span
          className={
            'status-badge ' + (train?.holdRequested || signal?.status === 'red' ? 'warning' : '')
          }
        >
          {status}
        </span>
        {train ? (
          <div className="train-visual" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <span />
          </div>
        ) : (
          <div className="station-visual" aria-hidden="true">
            {signal ? (
              <span style={{fontSize: 35, color: signal.status === 'red' ? '#d87d77' : '#6ba996'}}>
                ●
              </span>
            ) : (
              <Icon name={station ? 'train' : 'map'} />
            )}
          </div>
        )}
        <dl className="stats">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {(train || station) && (
          <div className="density">
            <div>
              <span>{train ? 'ความหนาแน่นผู้โดยสาร' : 'ความหนาแน่นชานชาลา'}</span>
              <b>{density}%</b>
            </div>
            <div className="density-track">
              <i style={{width: density + '%'}} />
            </div>
          </div>
        )}
        <p className="operation-note">{note}</p>
        <p className="updated">อัปเดต {time(s.timestamp)} · ทุก 0.5 วินาที</p>
        <p className="disclaimer">
          ข้อมูลจำลองสำหรับสำรวจ ไม่ใช่ข้อมูลเดินรถจริง
          <br />
          ระยะทาง อาคาร และลานซ่อมถูกย่อเพื่อการแสดงผล
        </p>
      </div>
      <footer>
        {train && (
          <button
            id="follow"
            className="primary"
            aria-pressed={props.followId === train.id}
            onClick={props.onFollow}
          >
            {props.followId === train.id ? '◎ กำลังติดตาม · กดเพื่อยกเลิก' : '◎ ติดตามขบวนนี้'}
          </button>
        )}
        <div>
          {train && train.direction !== 0 && (
            <button
              id="hold"
              className="secondary"
              onClick={() => props.onControl('hold', selected)}
            >
              {train.holdRequested ? 'ปล่อยขบวนเดินรถต่อ' : 'พักขบวนที่สถานีถัดไป'}
            </button>
          )}
          <button className="secondary" onClick={realMap}>
            ดูแผนที่จริง ↗
          </button>
        </div>
      </footer>
    </aside>
  );
}
function DataTable(props: Props & {snapshot: Snapshot}) {
  const [tab, setTab] = useState<TableTab>('trains'),
    s = props.snapshot;
  const columns =
    tab === 'trains'
      ? ['ขบวนรถ', 'ทิศทาง', 'สถานะ', 'ความเร็ว', 'สถานีถัดไป', 'ผู้โดยสาร']
      : tab === 'stations'
        ? ['รหัส', 'สถานี', 'ความหนาแน่น', 'ขบวนถัดไป', 'ผู้ขึ้นรถ']
        : ['สัญญาณ', 'สถานี', 'ทิศทาง', 'สถานะ'];
  const rows =
    tab === 'trains'
      ? s.trains.map((t) => ({
          id: t.id,
          values: [
            t.name,
            t.direction > 0 ? 'ตะวันออก' : t.direction < 0 ? 'ตะวันตก' : 'ลานซ่อม',
            t.status,
            t.speed + ' กม./ชม.',
            stationName(t.nextStationId),
            t.density + '%',
          ],
          signal: '',
        }))
      : tab === 'stations'
        ? s.stations.map((t) => ({
            id: t.id,
            values: [
              t.id,
              t.name,
              t.density + '%',
              (t.nextTrain?.replace('-', ' ') ?? '—') +
                (t.eta === null ? '' : ' · ' + t.eta + ' วิ'),
              t.boarding + ' คน',
            ],
            signal: '',
          }))
        : s.signals.map((t) => ({
            id: t.id,
            values: [
              t.id,
              stationName(t.stationId),
              t.direction > 0 ? 'ตะวันออก' : 'ตะวันตก',
              t.status === 'red' ? 'มีขบวนในช่วงทาง' : 'ทางว่าง',
            ],
            signal: t.status,
          }));
  const filtered = rows.filter((r) =>
    (r.id + ' ' + r.values.join(' ')).toLowerCase().includes(props.query.trim().toLowerCase()),
  );
  const exportData = () => {
    const safe = (v: string) => '"' + v.replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv =
      '\uFEFF' +
      [columns, ...filtered.map((r) => r.values)]
        .map((row) => row.map(safe).join(','))
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'energy-building-' + tab + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    props.onToast('ดาวน์โหลดข้อมูลจำลอง CSV แล้ว');
  };
  return (
    <>
      <p className="table-hint">
        เลื่อนซ้าย–ขวาเพื่อดูคอลัมน์เพิ่มเติม · เลือกแถวเพื่อดูรายละเอียด
      </p>
      <section className="table-card">
        <div className="table-tabs">
          {(['trains', 'stations', 'signals'] as TableTab[]).map((type, i) => (
            <button
              key={type}
              data-table={type}
              className={tab === type ? 'active' : ''}
              aria-pressed={tab === type}
              onClick={() => setTab(type)}
            >
              {['ขบวนรถ', 'สถานี', 'สัญญาณ'][i]} <b>{[6, 4, 8][i]}</b>
            </button>
          ))}
          <button
            id="export"
            className="export-button"
            aria-label="ส่งออก CSV"
            onClick={exportData}
          >
            ↓
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  data-entity={row.id}
                  className={props.selected === row.id ? 'selected' : ''}
                  tabIndex={0}
                  aria-label={'เลือก ' + row.values[0]}
                  onClick={() => props.onSelect(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      props.onSelect(row.id);
                    }
                  }}
                >
                  {row.values.map((value, i) => (
                    <td key={i} className={tab === 'trains' && i === 2 ? 'status-text' : ''}>
                      {row.signal && i === 3 && <i className={'signal-dot ' + row.signal} />}{' '}
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p id="table-empty">ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>}
        </div>
      </section>
    </>
  );
}
export default function Inspector(props: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]),
    s = props.snapshot;
  return (
    <>
      <button
        id="inspector-toggle"
        className="inspector-toggle glass"
        aria-expanded={props.open}
        aria-controls="inspector"
        aria-label={props.open ? 'ยุบแผงข้อมูล' : 'เปิดแผงข้อมูล'}
        onClick={() => (props.open ? props.onClose() : props.onTab(props.tab))}
      >
        <span className="drawer-chevron">{props.open ? '›' : '‹'}</span>
        <span className="drawer-toggle-label">แผงข้อมูล</span>
      </button>
      <aside
        id="inspector"
        className={'inspector glass ' + (props.open ? 'is-open' : '')}
        aria-label="แผงข้อมูลด้านขวา"
        aria-hidden={!props.open}
        inert={!props.open}
      >
        <header className="inspector-header">
          <div>
            <small>ENERGY BUILDING / LIVE SIMULATION</small>
            <h2>ศูนย์ข้อมูล</h2>
          </div>
          <button
            id="inspector-close"
            className="icon-button"
            aria-label="ยุบแผงข้อมูล"
            onClick={props.onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <nav
          className="inspector-tabs"
          role="tablist"
          aria-label="เลือกข้อมูลในแผง"
          onKeyDown={(e) => {
            const i = tabs.indexOf(props.tab);
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const next =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? 3
                  : (i + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4;
            props.onTab(tabs[next]);
            tabRefs.current[next]?.focus();
          }}
        >
          {tabs.map((tab, i) => (
            <button
              id={'tab-' + tab}
              key={tab}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              data-panel={tab}
              aria-controls={'panel-' + tab}
              aria-selected={props.tab === tab}
              tabIndex={props.tab === tab ? 0 : -1}
              onClick={() => props.onTab(tab)}
            >
              {tabNames[i]}
            </button>
          ))}
        </nav>
        <div className="inspector-body">
          <section
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            hidden={props.tab !== 'overview'}
          >
            <div className="heading">
              <span>สายสีลม / S5 — S8</span>
              <h1>เมืองที่ไม่หยุดเคลื่อนไหว</h1>
              <p className={props.connected ? '' : 'disconnected'}>
                <i />
                {props.connected
                  ? 'การจำลองแบบเรียลไทม์'
                  : props.connectionError || 'กำลังเชื่อมต่อข้อมูล'}
                <small>กรุงเทพฯ ในโลกจำลอง</small>
              </p>
            </div>
            {s && (
              <>
                <section className="kpis" aria-label="ตัวชี้วัดการจำลอง">
                  <article>
                    <span>ขบวนที่ให้บริการ</span>
                    <strong>
                      {String(s.metrics.trains).padStart(2, '0')}
                      <small>/ 06</small>
                    </strong>
                    <p>1 ขบวนอยู่ระหว่างบำรุงรักษา</p>
                  </article>
                  <article>
                    <span>การเดินรถตรงเวลา</span>
                    <strong>
                      {s.metrics.onTime.toFixed(1)}
                      <small>%</small>
                    </strong>
                    <p>ช่วงห่างเป้าหมาย · {s.metrics.headway} วินาที</p>
                  </article>
                  <article>
                    <span>ผู้โดยสารวันนี้</span>
                    <strong>{number.format(s.metrics.passengers)}</strong>
                    <p>+{s.metrics.boarded} คนขึ้นรถในรอบนี้</p>
                  </article>
                </section>
                <Journey snapshot={s} selected={props.selected} />
              </>
            )}
          </section>
          <section
            id="panel-entity"
            role="tabpanel"
            aria-labelledby="tab-entity"
            hidden={props.tab !== 'entity'}
          >
            {s && <Entity {...props} snapshot={s} />}
          </section>
          <section
            id="panel-table"
            role="tabpanel"
            aria-labelledby="tab-table"
            hidden={props.tab !== 'table'}
          >
            {s && <DataTable {...props} snapshot={s} />}
          </section>
          <section
            id="panel-events"
            role="tabpanel"
            aria-labelledby="tab-events"
            hidden={props.tab !== 'events'}
          >
            <section className="events-panel">
              <p>เหตุการณ์ล่าสุดจากการจำลอง</p>
              {s?.events.map((e) => (
                <div key={e.id} className={'event-row ' + e.status}>
                  <i />
                  <div>
                    <button onClick={() => e.entityId !== 'system' && props.onSelect(e.entityId)}>
                      {e.message}
                    </button>
                    <time>{time(e.timestamp)}</time>
                  </div>
                </div>
              ))}
            </section>
          </section>
        </div>
      </aside>
    </>
  );
}
