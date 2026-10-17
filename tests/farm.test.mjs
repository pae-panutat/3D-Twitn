import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {FarmSimulation, PENS} from '../backend/farm-simulation.mjs';
import {createApi} from '../backend/api.mjs';
import {BACKGROUND_PIGS} from '../src/lib/farm-layout.ts';

test('10 unique tagged pigs move without crossing pen walls, other pigs, feeders or drinkers', () => {
  const farm = new FarmSimulation();
  const first = farm.snapshot();
  assert.equal(new Set(first.pigs.map(p=>p.id)).size,10);
  assert.equal(new Set(first.pigs.map(p=>p.tag)).size,10);
  const radius=1.2; // conservative full body envelope, including snout and rotating tail
  for(let i=0;i<3600;i++) {
    const {pigs}=farm.tick(.5);
    for(const p of pigs) {
      const pen=PENS.find(pen=>pen.id===p.pen);
      assert.ok(Math.abs(p.x-pen.x)+radius<4.9,`${p.id}: x wall`);
      assert.ok(Math.abs(p.z-pen.z)+radius<3.3,`${p.id}: z wall`);
      assert.ok(Math.hypot(p.x-(pen.x-4.2),p.z-(pen.z+2.7))>radius+.65,`${p.id}: feeder`);
      assert.ok(Math.hypot(p.x-(pen.x+4.3),p.z-(pen.z-2.8))>radius+.4,`${p.id}: water`);
      for(const q of pigs) if(q.id!==p.id) assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>2*radius,`${p.id}: pig collision`);
      for(const q of BACKGROUND_PIGS) {
        const dx=Math.max(0,Math.abs(p.x-q.x)-1.1), dz=Math.max(0,Math.abs(p.z-q.z)-.5);
        assert.ok(Math.hypot(dx,dz)>radius,`${p.id}: background pig collision`);
      }
    }
  }
  assert.notEqual(farm.snapshot().pigs[0].x,first.pigs[0].x);
  assert.equal(BACKGROUND_PIGS.length,24);
  assert.equal(BACKGROUND_PIGS.some(p=>'tag' in p),false);
});
test('pause freezes positions; fan commands are validated and affect simulated temperature',()=>{
  const farm=new FarmSimulation();
  farm.control('pause',undefined,true);
  const before=farm.snapshot();
  farm.tick(10);
  assert.deepEqual(farm.snapshot().pigs,before.pigs);
  farm.control('pause',undefined,false);
  const warm=new FarmSimulation();
  for(const f of farm.fans) farm.control('fan',f.id,true);
  for(const f of warm.fans) warm.control('fan',f.id,false);
  for(let i=0;i<300;i++){farm.tick(.5);warm.tick(.5);}
  assert.ok(farm.temperature<warm.temperature);
  assert.equal(farm.snapshot().fans.every(f=>f.rpm===840),true);
  assert.throws(()=>farm.control('fan','FAN-99',true));
  assert.throws(()=>farm.control('fan','FAN-01','false'));
  assert.throws(()=>farm.control('unknown'));
});
test('farm REST controls broadcast acknowledged fan states to two SSE subscribers',async t=>{
  const api=createApi({port:0,prefix:'/api/farm/',simulation:new FarmSimulation(),service:'smart-pig-farm'});
  const server=http.createServer(async(req,res)=>{if(!await api.handle(req,res)){res.writeHead(404);res.end();}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api/farm/`;
  const abort=new AbortController();
  t.after(()=>{abort.abort();api.close();server.closeAllConnections();server.close();});
  const first=await fetch(base+'snapshot').then(r=>r.json());assert.equal(first.pigs.length,10);
  const readers=await Promise.all([0,1].map(async()=>{
    const r=await fetch(base+'events',{signal:abort.signal});
    assert.match(r.headers.get('content-type'),/text\/event-stream/);
    const reader=r.body.getReader();await reader.read();return reader;
  }));
  const result=await fetch(base+'control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'fan',id:'FAN-03',value:true})});
  assert.equal(result.status,200);assert.equal((await result.json()).fans[2].on,true);
  for(const reader of readers){
    let buffered='';let seen=false;
    while(!seen){
      const chunk=await reader.read();buffered+=new TextDecoder().decode(chunk.value);
      let at;
      while((at=buffered.indexOf('\n\n'))!==-1){const event=buffered.slice(0,at);buffered=buffered.slice(at+2);if(JSON.parse(event.slice(6)).fans[2].on)seen=true;}
    }
    assert.ok(seen);
  }
  assert.equal((await fetch(base+'control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'fan',id:'bad',value:true})})).status,400);
  assert.equal((await fetch(base+'control',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'control')).status,405);
});
