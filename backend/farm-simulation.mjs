// Demonstration data only. Hardware adapters can later feed the same snapshot contract.
export const PENS = Array.from({length: 6}, (_, i) => ({
  id: `${i < 3 ? 'A' : 'B'}${i % 3 + 1}`, x: (i % 3 - 1) * 10,
  z: i < 3 ? -5 : 5, count: i % 3 === 2 ? 1 : 2,
}));

export class FarmSimulation {
  constructor() {
    this.time = 0;
    this.paused = false;
    this.revision = 0;
    this.temperature = 28.4;
    this.humidity = 67;
    this.events = [];
    this.fans = Array.from({length: 4}, (_, i) => ({id: `FAN-0${i + 1}`, on: i < 2}));
    let index = 0;
    this.animals = PENS.flatMap(pen => Array.from({length: pen.count}, (_, lane) => {
      const i = index++;
      return {id: `PIG-${String(i + 1).padStart(3, '0')}`, tag: `RFID-${840001 + i}`,
        pen: pen.id, penX: pen.x, penZ: pen.z, lane,
        weight: 42.6 + i * 1.7, age: 84 + i, battery: 98 - i * 2};
    }));
  }
  tick(dt) {
    if (!this.paused) {
      this.time += dt;
      const active = this.fans.filter(f => f.on).length;
      this.temperature += (31.2 - active * 1.05 - this.temperature) * Math.min(dt / 35, 1);
      this.humidity += (73 - active * 2.3 - this.humidity) * Math.min(dt / 45, 1);
    }
    return this.snapshot();
  }
  snapshot() {
    return {source: 'simulation', revision: ++this.revision, timestamp: Date.now(),
      time: this.time, paused: this.paused, temperature: this.temperature, humidity: this.humidity,
      fans: this.fans.map(f => ({...f, rpm: f.on ? 840 : 0, watts: f.on ? 180 : 0})),
      pigs: this.animals.map((p, i) => {
        const phase = this.time * .17 + i * 1.9;
        // Two non-overlapping walking lanes per pen; envelope includes the whole pig.
        const x = p.penX + Math.cos(phase) * 2.45;
        const z = p.penZ + (p.lane === 0 ? -1.9 : 1.9) + Math.sin(phase) * .15;
        return {...p, x, z, heading: Math.atan2(-2.45 * Math.sin(phase), .15 * Math.cos(phase)),
          activity: this.paused ? 'paused' : 'walking', bodyTemperature: 38.5 + Math.sin(phase * .3) * .25};
      }), events: this.events.slice(0, 12)};
  }
  control(action, id, value) {
    if (action === 'fan' && typeof value === 'boolean') {
      const fan = this.fans.find(f => f.id === id);
      if (!fan) throw new Error('Unknown fan');
      fan.on = value;
      this.events.unshift({id: ++this.revision, at: Date.now(), text: `${fan.id} ${value ? 'เปิด' : 'ปิด'}พัดลม`});
    } else if (action === 'pause' && typeof value === 'boolean') {
      this.paused = value;
    } else throw new Error('Invalid farm command');
    this.events = this.events.slice(0, 12);
    return this.snapshot();
  }
}
