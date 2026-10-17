# Energy Building v2 — Next.js / TypeScript / React Three Fiber

> เอกสารนี้อธิบายการย้ายเวอร์ชันเมืองเดิม หน้าแรกปัจจุบันเปลี่ยนเป็น Smart Pig Farm ดู [SMART-FARM.md](SMART-FARM.md)

## Stack ที่ใช้งานจริง

- Next.js App Router + React + TypeScript สำหรับ UI
- React Three Fiber `Canvas`, Three.js และ Drei `OrbitControls` / `useGLTF` สำหรับ 3D
- โมเดลเดิม `dist/city.gltf` คัดลอกโดยไม่แก้ไขไปที่ `public/models/bangkok-city.gltf`
- Node.js HTTP Backend สำหรับ REST และ SSE ร่วมกับ Next.js ใน `server.mjs`
- SSE `/api/events` อัปเดตทุก 0.5 วินาที คำสั่งควบคุมใช้ REST POST `/api/control`
- ใช้ SSE เป็น transport ของรุ่นนี้ คำสั่งส่งผ่าน REST จึงไม่ได้เพิ่ม WebSocket ซ้ำ

## รัน

ต้องมี Node.js 20.9 ขึ้นไป และ npm

```bash
npm install
npm run build
npm start
```

เปิด http://127.0.0.1:4173 หรือดับเบิลคลิก `start.command` (ติดตั้งแพ็กเกจหากยังไม่มี แล้ว build ก่อนเริ่ม server)

สำหรับการพัฒนา:

```bash
npm run dev
```

ถ้าพอร์ตเดิมถูกใช้:

```bash
TWIN_PORT=4175 npm start
```

`npm start` ใช้ production build จึงต้อง `npm run build` หลังเปลี่ยน source ทุกครั้ง ใน development `npm run dev` โหลดการเปลี่ยนแปลงโดยอัตโนมัติ

## โครงสร้าง

```text
src/app/
  layout.tsx             CSS และ Kanit เดิม
  page.tsx               หน้า Next.js
  migration.css          ปรับเลย์เอาต์สำหรับ React Canvas
src/components/
  Dashboard.tsx          React state, Topbar, Toolbar, ค้นหา, กลางคืน, แสง, dialogs
  SceneCanvas.tsx        R3F Canvas, กล้อง, picking, labels, รถไฟและสัญญาณ
  Inspector.tsx          Drawer, KPI, รายละเอียด, ตาราง, events, CSV
src/lib/
  model-adapter.ts       โหลดและ batch geometry เดิมโดยรักษาทุก vertex/สี
  useTelemetry.ts        Hook รับ SSE และส่ง REST controls พร้อม cleanup
  types.ts               TypeScript types สำหรับ telemetry/UI
backend/api.mjs          REST API, SSE, simulation lifecycle
server.mjs               เริ่ม Node backend และ Next.js
public/models/           glTF เดิมพร้อม provenance SHA-256
dist/                    เก็บต้นฉบับโมเดล ตัวจำลอง และ CSS ที่ระบบใหม่ใช้งาน
```

## สิ่งที่รักษาไว้

ไฟล์ `dist/city.js`, `dist/geometry.js`, `dist/city.gltf` และ `dist/city-simulation.js` มี SHA-256 ตรงกับก่อนย้ายทุกไฟล์ การทดสอบโหลดไฟล์ glTF ด้วย Three.js จริง และเทียบทุก vertex กับโมเดล procedural เดิม รวมทั้งสีและจำนวนชิ้นส่วน ไม่มีการปั้นใหม่ ย้ายสิ่งปลูกสร้าง ลดจำนวน polygon หรือแก้ตัวจำลองการเคลื่อนที่

Three.js โหลด glTF เดิม จากนั้น batch เมืองและ template รถไฟเพื่อลด draw calls รถไฟ 6 ขบวนใช้ template เดิมและวางตาม snapshot ของ backend การ batch เปลี่ยนวิธีส่งข้อมูลไปวาด โดยตำแหน่ง vertex ยังคงเดิมภายในความละเอียด Float32

Shader กลางวัน/กลางคืนของรุ่นเดิมถูกย้ายเป็น Three.js `ShaderMaterial` เพื่อรักษาโทนภาพและเงา หน้า Next.js ไม่ได้โหลด WebGL renderer เก่า

คงมุมเริ่มต้นเดิม หมุน 360° อัตโนมัติ เปิด Drawer ทางขวาที่แท็บภาพรวม และเปิด Toolbar ล่างซ้าย การเลือกสถานี/รถไฟ, follow, hold/release, pause, 1×/3×/8×, day/night, light, weather, search, table, CSV, แผนที่ และเสียงยังใช้งานได้

## ตรวจสอบ

```bash
npm run typecheck
npm test
npm run verify:model
npm run build
```

ชุดทดสอบครอบคลุมตัวจำลองเดิม, glTF, hash preservation, Three.js adapter และ Node API/SSE/controls

## การนำไปโฮสต์

รุ่นนี้ใช้ Node.js server ที่รันต่อเนื่องเพื่อเก็บสถานะจำลองและเปิด SSE จึงใช้เครื่อง/บริการที่รัน Node.js ได้ เริ่มด้วย `npm run build` แล้ว `npm start` ตัวอย่างปัจจุบัน bind ที่ `127.0.0.1` เหมาะกับ local หรือวาง reverse proxy ข้างหน้า

หากโฮสต์หลาย process ต้องแยก simulation service กลาง มิฉะนั้นแต่ละ process จะมีตัวจำลองคนละชุด

ข้อมูลยังเป็น simulation เช่นเดิม ไม่มีฐานข้อมูลหรือข้อมูลเดินรถจริง
