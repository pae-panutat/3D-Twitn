import {STATIONS,SIGNALS} from './city.js';
const TRAVEL=30,DWELL=12,LEG=TRAVEL+DWELL;
export const STEP_NAMES=['ออก','เดินรถ','เข้าสถานี','เปิดประตู','รับส่งคน','ออกต่อ'];
export class CitySimulation {
  constructor(){this.reset()}
  reset(){this.elapsed=0;this.rate=1;this.paused=false;this.passengers=28416;this.boarded=0;this.events=[];this.held=new Map();this.adjustments=new Map();this.sequence=0;this.lastBoarding=new Map();this.event('system','เริ่มการจำลองการเดินรถ','info');return this.snapshot()}
  event(entityId,message,status='info'){this.events.unshift({id:'EV-'+(++this.sequence),entityId,message,status,timestamp:new Date().toISOString()});this.events=this.events.slice(0,100)}
  tick(delta=.5){if(!this.paused)this.elapsed+=Math.min(Math.max(delta,0),5)*this.rate;return this.snapshot()}
  train(index){
    if(index===5){const phase=(this.elapsed%65)/65;return {id:'BTS-1106',name:'BTS 1106',direction:0,x:-97+phase*29,z:-12,y:.9,speed:phase>.6||this.paused?0:12,nextStationId:'depot',eta:Math.ceil((1-phase)*65),density:0,status:phase>.6?'ล้างและตรวจสภาพ':'เข้าลานซ่อม',step:4,doors:phase>.6,held:false,holdRequested:false}}
    const id='BTS-'+(1101+index),hold=this.held.get(id),offset=[0,38,77,19,62][index],cycle=LEG*3+DWELL;
    const local=hold?.active?hold.frozenLocal:this.elapsed+offset-(this.adjustments.get(id)??0);const period=Math.floor(local/cycle),phase=local%cycle;
    const direction=(index<3?1:-1)*(period%2?-1:1);
    const ordered=direction>0?STATIONS:[...STATIONS].reverse();const leg=Math.min(2,Math.floor(phase/LEG));
    const legPhase=phase>=LEG*3?TRAVEL+Math.min(DWELL,phase-LEG*3):phase%LEG;
    let from=ordered[leg],to=ordered[leg+1],fraction=Math.min(1,legPhase/TRAVEL);
    let step=legPhase<3?0:legPhase<TRAVEL-5?1:legPhase<TRAVEL?2:legPhase<TRAVEL+2?3:legPhase<TRAVEL+DWELL-2?4:5;
    if(hold?.active){to=STATIONS.find(s=>s.id===hold.stationId);from=to;fraction=1;step=4}
    if(hold&&!hold.active&&legPhase>=TRAVEL&&to.id===hold.stationId){hold.active=true;hold.frozenLocal=local;hold.startedAt=this.elapsed;this.event(id,id.replace('-',' ')+' พักที่ '+to.name,'warning');step=4;fraction=1}
    if(legPhase>=TRAVEL&&step===4){const key=period+':'+leg;if(this.lastBoarding.get(id)!==key){this.lastBoarding.set(id,key);const amount=30+index*7;this.passengers+=amount;this.boarded=amount;this.event(id,id.replace('-',' ')+' รับส่งผู้โดยสารที่ '+to.name)}}
    const stopped=legPhase>=TRAVEL||!!hold?.active;
    return {id,name:id.replace('-',' '),direction,x:from.x+(to.x-from.x)*fraction,z:direction>0?1.5:-1.5,y:9.27,speed:stopped||this.paused?0:step===2?25:step===0?18:55,nextStationId:to.id,eta:hold?.active?0:Math.ceil(Math.max(0,TRAVEL-legPhase)/this.rate),density:Math.round(48+index*6+Math.sin(this.elapsed*.013+index)*5),status:hold?.active?'พักขบวนที่สถานี':legPhase>=TRAVEL?'รับส่งผู้โดยสาร':step===2?'เข้าสถานี':'อยู่ระหว่างสถานี',step,doors:step===3||step===4,held:!!hold?.active,holdRequested:!!hold};
  }
  control(action,id,value){
    if(action==='pause'){this.paused=!this.paused;this.event('system',this.paused?'หยุดการจำลองชั่วคราว':'เปิดการจำลองต่อ')}
    else if(action==='rate'){if(![1,3,8].includes(value))throw new Error('Invalid rate');this.rate=value}
    else if(action==='reset')return this.reset();
    else if(action==='hold'){const train=Array.from({length:6},(_,i)=>this.train(i)).find(t=>t.id===id);if(!train||train.direction===0)throw new Error('Train cannot be held');if(this.held.has(id)){const h=this.held.get(id);if(h.active)this.adjustments.set(id,(this.adjustments.get(id)??0)+this.elapsed-h.startedAt);this.held.delete(id);this.event(id,'ปล่อย '+train.name+' เดินรถต่อ')}else{this.held.set(id,{stationId:train.nextStationId,active:false});this.event(id,'สั่งพัก '+train.name+' ที่สถานีถัดไป','warning')}}
    else throw new Error('Unknown action');
    return this.snapshot();
  }
  snapshot(){
    const trains=Array.from({length:6},(_,i)=>this.train(i));
    const stations=STATIONS.map((s,i)=>{const approaching=trains.filter(t=>t.nextStationId===s.id&&t.direction!==0&&!t.held).sort((a,b)=>a.eta-b.eta);return {...s,density:Math.round(s.density+Math.sin(this.elapsed*.02+i)*4),nextTrain:approaching[0]?.id??null,eta:approaching[0]?.eta??null,boarding:Math.round(this.boarded*(.55+i*.12)),status:'เปิดให้บริการ'}});
    const signals=SIGNALS.map(s=>({...s,status:trains.some(t=>t.direction===s.direction&&Math.abs(t.x-s.x)<13)?'red':'green'}));
    return {schemaVersion:2,source:'simulation',timestamp:new Date().toISOString(),elapsed:this.elapsed,rate:this.rate,paused:this.paused,trains,stations,signals,events:this.events.map(e=>({...e})),metrics:{trains:5,totalTrains:6,onTime:Math.max(80,100-trains.filter(t=>t.holdRequested).length*2.5),passengers:this.passengers,boarded:this.boarded,headway:90}};
  }
}
export function validCitySnapshot(s){const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));return s?.schemaVersion===2&&s.source==='simulation'&&date(s.timestamp)&&Number.isFinite(s.elapsed)&&[1,3,8].includes(s.rate)&&typeof s.paused==='boolean'&&Number.isFinite(s.metrics?.passengers)&&s.trains?.length===6&&s.trains.every(t=>/^BTS-110[1-6]$/.test(t.id)&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&Number.isFinite(t.z)&&Number.isFinite(t.eta)&&Number.isFinite(t.density)&&typeof t.status==='string')&&s.stations?.length===4&&STATIONS.every(st=>s.stations.some(a=>a.id===st.id&&Number.isFinite(a.density)))&&s.signals?.length===8&&s.events?.every(e=>date(e.timestamp)&&typeof e.message==='string')}

export class CityTelemetry {
  constructor(onSnapshot,onConnection){this.onSnapshot=onSnapshot;this.onConnection=onConnection;this.sim=new CitySimulation();this.mode='browser';this.base=globalThis.TWIN_CONFIG?.apiBase??'';this.configured=!!this.base;this.timer=null;this.stream=null;this.retry=null}
  async start(){try{const r=await fetch(this.base+'/api/health',{signal:AbortSignal.timeout(2000)});if(r.ok&&(await r.json()).service==='siam-city'){this.mode='sse';this.connect();return}}catch{}if(this.configured){this.mode='remote';this.onConnection('disconnected');this.retry=setTimeout(()=>this.start(),5000);return}this.onSnapshot(this.sim.snapshot());this.onConnection('live');this.timer=setInterval(()=>this.onSnapshot(this.sim.tick(.5)),500)}
  async connect(){try{const r=await fetch(this.base+'/api/snapshot',{signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error('Snapshot unavailable');this.onSnapshot(await r.json());this.stream?.close();this.stream=new EventSource(this.base+'/api/events');this.stream.onopen=()=>this.onConnection('live');this.stream.onmessage=e=>{try{this.onSnapshot(JSON.parse(e.data))}catch{this.onConnection('disconnected')}};this.stream.onerror=()=>this.onConnection('disconnected')}catch{this.onConnection('disconnected');this.retry=setTimeout(()=>this.connect(),5000)}}
  async control(action,id,value){if(this.mode==='remote')throw new Error('ยังเชื่อมต่อข้อมูลไม่ได้');if(this.mode==='browser'){const s=this.sim.control(action,id,value);this.onSnapshot(s);return s}const r=await fetch(this.base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id,value})});if(!r.ok)throw new Error('ไม่สามารถเปลี่ยนการจำลอง');const s=await r.json();this.onSnapshot(s);return s}
  stop(){clearInterval(this.timer);clearTimeout(this.retry);this.stream?.close()}
}
