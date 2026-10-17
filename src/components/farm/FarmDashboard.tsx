'use client';
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {useFarm} from '../../lib/farm';
import {BACKGROUND_PIGS} from '../../lib/farm-layout';
const FarmScene = dynamic(()=>import('./FarmScene'),{ssr:false,loading:()=> <div className="farm-loading">กำลังเตรียมโรงเรือน 3D…</div>});
function FanIcon({spinning=false}: {spinning?:boolean}) {
  return <svg className={spinning?'fan-spin':''} viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="2.5" fill="currentColor"/>{[0,120,240].map(r=><path key={r} transform={`rotate(${r} 16 16)`} d="M15 13C8 11 8 4 13 3C20 1 24 9 18 13Z" fill="currentColor"/>)}</svg>;
}
export default function FarmDashboard() {
  const {snapshot:s,connected,control}=useFarm();
  const [selected,setSelected]=useState('PIG-001');
  const [panel,setPanel]=useState(true);
  const [tab,setTab]=useState<'overview'|'pigs'>('overview');
  const [labels,setLabels]=useState(true);
  const [rotate,setRotate]=useState(true);
  const [follow,setFollow]=useState(false);
  const [view,setView]=useState(0);
  const [pending,setPending]=useState('');
  const [message,setMessage]=useState('');
  const pig=s?.pigs.find(p=>p.id===selected);
  const active=s?.fans.filter(f=>f.on).length??0;
  async function command(action:'fan'|'pause',value:boolean,id?:string) {
    setPending(id??'pause'); setMessage('');
    try { await control(action,value,id); setMessage(action==='fan'?`${id} · ${value?'เปิด':'ปิด'}พัดลมแล้ว`:(value?'หยุดการจำลองแล้ว':'เล่นการจำลองต่อแล้ว')); }
    catch(e){setMessage(e instanceof Error?e.message:'ส่งคำสั่งไม่สำเร็จ');}
    finally{setPending('');}
  }
  function select(id:string){setSelected(id);setTab('pigs');setPanel(true);}
  return <main className={`farm-app ${panel?'panel-open':''}`}>
    <header className="farm-header">
      <a className="farm-brand" href="/" aria-label="Farm Twin หน้าหลัก"><span className="farm-logo"><svg viewBox="0 0 32 32" fill="none"><path d="M4 14 16 5l12 9v13H4V14Z" stroke="currentColor" strokeWidth="2"/><path d="M12 27V16h8v11M8 11V5h4" stroke="currentColor" strokeWidth="2"/></svg></span><span><strong>farm<span>twin</span><sup>®</sup></strong><small>SMART LIVESTOCK PLATFORM</small></span></a>
      <div className="farm-breadcrumb">ฟาร์มตัวอย่าง <span>/</span> <b>โรงเรือน 01</b></div>
      <div className={`connection ${connected?'online':''}`} role="status"><i/>{connected?'เชื่อมต่อแล้ว':'กำลังเชื่อมต่อใหม่'}</div>
      <span className="demo-badge">ข้อมูลจำลอง</span><span className="farm-avatar">OP</span>
    </header>
    <section className="farm-viewport" aria-label="โมเดลโรงเรือนฟาร์มหมูสามมิติ">
      {s?<FarmScene snapshot={s} selected={selected} onSelect={select} labels={labels} rotate={rotate} follow={follow} view={view} connected={connected}/>:<div className="farm-loading">กำลังเชื่อมต่อโรงเรือน…</div>}
      <div className="scene-heading"><div className="scene-top-row"><span className="eyebrow">DIGITAL TWIN / BARN 01</span><div className="scene-caption"><span className="live-dot"/> LIVE SIMULATION <span>•</span> {s?new Date(s.timestamp).toLocaleTimeString('th-TH',{hour12:false}):'—'}</div></div><h1>โรงเรือนอัจฉริยะ</h1><div className="scene-chips"><span><i/>หมู {s?s.pigs.length+BACKGROUND_PIGS.length:'—'} ตัว</span><span>6 คอก</span><span>ติดตาม 10 ตัว</span></div></div>
      {!panel&&<button className="panel-reopen" onClick={()=>setPanel(true)}>‹ แผงข้อมูล</button>}
      <div className="scene-bottom"><nav className="farm-tools" aria-label="ควบคุมมุมมอง">
        <button onClick={()=>{setFollow(false);setRotate(false);setView(v=>v+1);}}>⌂ <span>ภาพรวม</span></button>
        <button aria-pressed={rotate} onClick={()=>{setRotate(!rotate);setFollow(false);}}>↻ <span>หมุน 360°</span></button>
        <button aria-pressed={labels} onClick={()=>setLabels(!labels)}>⌗ <span>ป้ายชื่อ</span></button>
        <span className="tool-divider"/>
        <button disabled={!s||!connected||!!pending} aria-pressed={s?.paused} onClick={()=>s&&command('pause',!s.paused)}>{s?.paused?'▷':'Ⅱ'} <span>{s?.paused?'เล่นต่อ':'หยุดจำลอง'}</span></button>
      </nav></div>
      <div className="compass-farm"><span>N</span><b>↑</b></div>
    </section>
    {panel&&<aside className="farm-panel" aria-label="แผงข้อมูลฟาร์ม">
      <div className="panel-title"><div><span className="eyebrow">BARN MONITOR</span><h2>โรงเรือน 01 <span className="small-dot"/></h2></div><button className="close-panel" onClick={()=>setPanel(false)} aria-label="ยุบแผงข้อมูล">›</button></div>
      <div className="panel-tabs"><button aria-selected={tab==='overview'} onClick={()=>setTab('overview')}>ภาพรวมโรงเรือน</button><button aria-selected={tab==='pigs'} onClick={()=>setTab('pigs')}>ติดตามรายตัว <b>10</b></button></div>
      <div className="panel-body">
        {!connected&&<p className="connection-note" role="alert">ข้อมูลอาจไม่เป็นปัจจุบัน · กำลังเชื่อมต่อใหม่</p>}
        {tab==='overview'?<>
          <div className="section-label">สภาพแวดล้อม <span>อัปเดตทุก 0.5 วินาที</span></div>
          <div className="metric-grid"><article><span>อุณหภูมิ</span><strong>{s?.temperature.toFixed(1)??'—'}<small> °C</small></strong><div className="mini-bars">{[32,48,42,60,52,65,59,75,62,55,49,46,43].map((h,i)=><i key={i} style={{height:h+'%'}}/>)}</div><small>เซนเซอร์จำลอง ENV-01</small></article><article><span>ความชื้นสัมพัทธ์</span><strong>{s?.humidity.toFixed(0)??'—'}<small> %</small></strong><div className="humidity-track"><i style={{width:`${s?.humidity??0}%`}}/></div><small>เซนเซอร์จำลอง ENV-02</small></article></div>
          <div className="herd-summary"><span className="herd-symbol">⌖</span><div><strong>{s?s.pigs.length+BACKGROUND_PIGS.length:'—'} <small>ตัวในโรงเรือน</small></strong><p>ติดแท็ก 10 ตัว · ไม่ติดแท็ก {BACKGROUND_PIGS.length} ตัว</p></div><span className="tag-count">RFID 10</span></div>
          <div className="section-label ventilation-title">ระบบระบายอากาศ <span>{active} / 4 ทำงาน</span></div>
          <div className="fans-list">{s?.fans.map(f=><article className={f.on?'fan-card running':'fan-card'} key={f.id}><div className="fan-icon"><FanIcon spinning={f.on&&!s.paused&&connected}/></div><div className="fan-info"><strong>{f.id}<span>{f.on?'ทำงาน':'ปิดอยู่'}</span></strong><small>{f.rpm} RPM <em>·</em> {f.watts} W</small></div><button role="switch" aria-checked={f.on} aria-label={`${f.on?'ปิด':'เปิด'}พัดลม ${f.id}`} disabled={!connected||!!pending} onClick={()=>command('fan',!f.on,f.id)} className="fan-switch"><i/></button></article>)}</div>
          <p className="fan-note">เปิดพัดลมแล้วอุณหภูมิและความชื้นจำลองจะค่อย ๆ ลดลง</p>
          <div className="energy-row"><span>กำลังไฟพัดลมรวม</span><b>{active*180} <small>W</small></b></div>
          <div className="section-label activity-title">กิจกรรมล่าสุด <span>คำสั่งจากระบบ</span></div>
          <div className="farm-events">{s?.events.length?s.events.slice(0,4).map(e=><div key={e.id}><i/><span>{e.text}</span><time>{new Date(e.at).toLocaleTimeString('th-TH',{hour12:false})}</time></div>):<p>ยังไม่มีคำสั่ง · ลองเปิดหรือปิดพัดลม</p>}</div>
        </>:<>
          {pig&&<div className="pig-detail"><div className="pig-detail-top"><span className="pig-avatar">⌖</span><div><small>RFID LIVE TRACKING</small><h3>{pig.id}</h3></div><span className="pen-badge">คอก {pig.pen}</span></div><p className="tag-number">{pig.tag} <span>แบตเตอรี่ {pig.battery}%</span></p><div className="pig-stats"><div><span>น้ำหนัก</span><b>{pig.weight.toFixed(1)} <small>กก.</small></b></div><div><span>อายุ</span><b>{pig.age} <small>วัน</small></b></div><div><span>อุณหภูมิร่างกาย</span><b>{pig.bodyTemperature.toFixed(1)} <small>°C</small></b></div><div><span>สถานะ</span><b>{!connected?'ข้อมูลค้าง':s?.paused?'หยุดจำลอง':'กำลังเดิน'}</b></div></div><div className="position-row">ตำแหน่ง X {pig.x.toFixed(2)} / Z {pig.z.toFixed(2)} m</div><button className="follow-button" aria-pressed={follow} onClick={()=>{setFollow(!follow);setRotate(false);}}>{follow?'⊙ กำลังติดตาม · กดเพื่อหยุด':'⌖ ติดตามด้วยกล้อง'}</button><p className="track-note">เส้นประสีเขียวแสดงเส้นทางล่าสุดในหน้าจอนี้</p></div>}
          <div className="section-label">ทะเบียนหมู <span>เลือกเพื่อดูรายละเอียด</span></div><div className="pig-list">{s?.pigs.map(p=><button key={p.id} className={selected===p.id?'active':''} onClick={()=>setSelected(p.id)}><i/><strong>{p.id}</strong><span>คอก {p.pen}</span><small>{p.weight.toFixed(1)} กก.</small><b>›</b></button>)}</div>
        </>}
      </div>
      <footer className="panel-footer"><i/> DEMO MODE <span>ข้อมูลและอุปกรณ์ IoT จำลอง</span></footer>
    </aside>}
    {message&&<div className="farm-toast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="ปิดข้อความ">×</button></div>}
  </main>;
}
