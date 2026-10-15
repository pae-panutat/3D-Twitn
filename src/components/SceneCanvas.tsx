'use client';
import {Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {OrbitControls, useGLTF} from '@react-three/drei';
import type {OrbitControls as Controls} from 'three-stdlib';
import * as THREE from 'three';
import {STATIONS, LANDMARKS, meshGeometry} from '../../dist/city.js';
import {createCityMaterial, prepareModel} from '../lib/model-adapter';
import type {Snapshot, Weather} from '../lib/types';

export interface SceneHandle {
  reset: () => void;
  focus: (id: string) => void;
}
interface Props {
  api: RefObject<SceneHandle | null>;
  snapshot: Snapshot | null;
  selected: string;
  drawerOpen: boolean;
  night: boolean;
  weather: Weather;
  brightness: number;
  lightAngle: number;
  autoRotate: boolean;
  followId: string | null;
  showLabels: boolean;
  onSelect: (id: string) => void;
  onGesture: () => void;
  onHome: () => void;
}
const landmarks = [...STATIONS, ...LANDMARKS].map((s) => ({
  id: s.id,
  name: s.name,
  position: s.position,
}));
const trainIds = Array.from({length: 6}, (_, i) => 'BTS-' + (1101 + i));
const homeRadius = (width: number, height: number) =>
  Math.min(780, 220 * Math.max(1, (1.65 * height) / Math.max(1, width)));
function positionFor(radius: number, target: THREE.Vector3, theta = 0.18, phi = 0.97) {
  return new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, phi, theta)).add(target);
}

function CityScene(
  props: Props & {
    labelElements: RefObject<Map<string, HTMLButtonElement>>;
    onReady: (count: number) => void;
  },
) {
  const {scene} = useGLTF('/models/bangkok-city.gltf');
  const model = useMemo(() => prepareModel(scene), [scene]);
  const material = useMemo(() => createCityMaterial(), []);
  const shadowMaterial = useMemo(() => createCityMaterial(true), []);
  const trainMaterials = useMemo(() => trainIds.map(() => createCityMaterial(false, true)), []);
  const signalMaterials = useMemo(
    () =>
      ['#4fa291', '#e66b64'].map((color) => {
        const m = createCityMaterial();
        // Attribute colour is supplied by the original cylinder geometry below.
        return {material: m, color};
      }),
    [],
  );
  const signalGeometry = useMemo(
    () =>
      signalMaterials.map(({color}) => {
        const source = meshGeometry('cylinder'),
          g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(source.positions, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(source.normals, 3));
        const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255),
          colors = new Float32Array(source.positions.length);
        for (let i = 0; i < colors.length; i += 3) colors.set(rgb, i);
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return g;
      }),
    [signalMaterials],
  );
  const controls = useRef<Controls | null>(null),
    trains = useRef(new Map<string, THREE.Mesh>());
  const target = useRef(new THREE.Vector3(-3, 1, 10)),
    desired = useRef<{target: THREE.Vector3; radius: number} | null>(null),
    screenShift = useRef(0);
  const {camera, size, gl} = useThree();
  const scratch = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    target.current.set(-3, 1, 10);
    camera.position.copy(positionFor(homeRadius(size.width, size.height), target.current));
    controls.current?.target.copy(target.current);
    controls.current?.update();
  }, [camera, size.width, size.height]);
  useEffect(() => {
    props.onReady(model.cityNodes + model.trainNodes * 6);
  }, [model, props.onReady]);
  useEffect(
    () => () => {
      model.city.dispose();
      model.shadow.dispose();
      model.train.dispose();
      material.dispose();
      shadowMaterial.dispose();
      trainMaterials.forEach((m) => m.dispose());
      signalMaterials.forEach((m) => m.material.dispose());
      signalGeometry.forEach((g) => g.dispose());
    },
    [model, material, shadowMaterial, trainMaterials, signalMaterials, signalGeometry],
  );
  useImperativeHandle(
    props.api,
    () => ({
      reset() {
        const point = new THREE.Vector3(-3, 1, 10);
        desired.current = null;
        target.current.copy(point);
        controls.current?.target.copy(point);
        camera.position.copy(positionFor(homeRadius(size.width, size.height), point));
        controls.current?.update();
      },
      focus(id) {
        const location = landmarks.find((s) => s.id === id),
          train = props.snapshot?.trains.find((t) => t.id === id);
        if (location)
          desired.current = {
            target: new THREE.Vector3(location.position[0], 4, location.position[2]),
            radius: size.width < 700 ? 145 : 95,
          };
        else if (train)
          desired.current = {target: new THREE.Vector3(train.x, 6, train.z), radius: 105};
      },
    }),
    [camera, props.snapshot, size],
  );
  useEffect(() => {
    const canvas = gl.domElement;
    const keys = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home'].includes(e.key))
        return;
      e.preventDefault();
      props.onGesture();
      if (e.key === 'Home') {
        props.onHome();
        return;
      }
      const c = controls.current;
      if (!c) return;
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target));
      if (e.key === 'ArrowLeft') s.theta -= 0.12;
      if (e.key === 'ArrowRight') s.theta += 0.12;
      if (e.key === 'ArrowUp') s.phi = Math.max(0.01, s.phi - 0.1);
      if (e.key === 'ArrowDown') s.phi = Math.min(Math.PI - 0.01, s.phi + 0.1);
      if (e.key === '+') s.radius = Math.max(4, s.radius * 0.85);
      if (e.key === '-') s.radius = s.radius * 1.15;
      camera.position.setFromSpherical(s).add(c.target);
      c.update();
    };
    canvas.addEventListener('keydown', keys);
    return () => canvas.removeEventListener('keydown', keys);
  }, [camera, gl, props.onGesture, props.onHome]);
  useFrame(({clock}, frameDelta) => {
    const dt = Math.min(0.05, frameDelta),
      c = controls.current;
    if (!c) return;
    const updateMaterial = (m: THREE.ShaderMaterial, selected = false) => {
      m.uniforms.uSun.value.set(
        Math.sin(props.lightAngle) * 0.65,
        1.3,
        Math.cos(props.lightAngle) * 0.65,
      );
      m.uniforms.uNight.value = props.night ? 1 : 0;
      m.uniforms.uBrightness.value = props.brightness * (props.weather === 'rain' ? 0.9 : 1);
      m.uniforms.uFog.value = props.weather === 'fog' ? 0.26 : 0;
      m.uniforms.uSelected.value = selected ? 1 : 0;
    };
    updateMaterial(material);
    updateMaterial(shadowMaterial);
    trainMaterials.forEach((m, i) => updateMaterial(m, trainIds[i] === props.selected));
    signalMaterials.forEach((m) => updateMaterial(m.material));
    for (const t of props.snapshot?.trains ?? []) {
      const mesh = trains.current.get(t.id);
      if (!mesh) continue;
      if (!mesh.userData.initialized || Math.abs(mesh.position.x - t.x) > 25) {
        mesh.position.set(t.x, t.y, t.z);
        mesh.userData.initialized = true;
      } else {
        mesh.position.x += (t.x - mesh.position.x) * Math.min(1, dt * 8);
        mesh.position.z += (t.z - mesh.position.z) * Math.min(1, dt * 8);
        mesh.position.y = t.y;
      }
      mesh.rotation.y = t.direction < 0 ? Math.PI : 0;
    }
    if (props.followId) {
      const train = trains.current.get(props.followId);
      if (train)
        desired.current = {
          target: new THREE.Vector3(train.position.x, 5, train.position.z),
          radius: 95,
        };
    }
    if (desired.current) {
      const offset = camera.position.clone().sub(c.target),
        s = new THREE.Spherical().setFromVector3(offset);
      c.target.lerp(desired.current.target, Math.min(1, dt * 4));
      s.radius += (desired.current.radius - s.radius) * Math.min(1, dt * 4);
      camera.position.setFromSpherical(s).add(c.target);
      c.update();
    }
    const cam = camera as THREE.PerspectiveCamera,
      dist = camera.position.distanceTo(c.target),
      near = Math.max(0.5, dist * 0.02),
      far = Math.max(1100, dist * 8);
    if (Math.abs(cam.near - near) > near * 0.05 || Math.abs(cam.far - far) > far * 0.05) {
      cam.near = near;
      cam.far = far;
    }
    const inset = props.drawerOpen
      ? (document.getElementById('inspector')?.getBoundingClientRect().width ?? 0) + 16
      : 0;
    screenShift.current +=
      (Math.min(inset, size.width * 0.65) - screenShift.current) * Math.min(1, dt * 4);
    (camera as THREE.PerspectiveCamera).setViewOffset(
      size.width,
      size.height,
      screenShift.current / 2,
      0,
      size.width,
      size.height,
    );
    camera.updateMatrixWorld();
    const occupied: {x: number; y: number}[] = [];
    for (const [id, element] of props.labelElements.current) {
      const point = landmarks.find((s) => s.id === id),
        mesh = trains.current.get(id);
      if (point) scratch.set(...(point.position as [number, number, number]));
      else if (mesh?.userData.initialized)
        scratch.copy(mesh.position).add(new THREE.Vector3(0, 4, 0));
      else {
        element.hidden = true;
        continue;
      }
      const inFront =
        scratch.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
      scratch.project(camera);
      const x = (scratch.x * 0.5 + 0.5) * size.width,
        y = (-scratch.y * 0.5 + 0.5) * size.height;
      const near = occupied.some((v) => Math.abs(v.x - x) < 70 && Math.abs(v.y - y) < 28);
      element.hidden =
        !props.showLabels ||
        !inFront ||
        x < 0 ||
        x > size.width ||
        y < 85 ||
        y > size.height - 40 ||
        (id.startsWith('BTS-') && id !== props.selected && near);
      if (!element.hidden) {
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        occupied.push({x, y});
      }
    }
    const theta = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)).theta;
    document
      .getElementById('compass-arrow')
      ?.style.setProperty('transform', `rotate(${(-theta * 180) / Math.PI}deg)`);
  });
  const hitMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    [],
  );
  useEffect(() => () => hitMaterial.dispose(), [hitMaterial]);
  return (
    <>
      <color attach="background" args={[props.night ? '#3a3463' : '#ebeeed']} />
      <mesh geometry={model.city} material={material} />
      <mesh geometry={model.shadow} material={shadowMaterial} renderOrder={1} />
      {trainIds.map((id, i) => (
        <mesh
          key={id}
          ref={(m) => {
            if (m) trains.current.set(id, m);
            else trains.current.delete(id);
          }}
          geometry={model.train}
          material={trainMaterials[i]}
          onClick={(e) => {
            e.stopPropagation();
            props.onSelect(id);
          }}
        />
      ))}
      {props.snapshot?.signals.map((s) => (
        <mesh
          key={s.id}
          position={s.position as [number, number, number]}
          scale={[0.44, 0.25, 0.44]}
          geometry={signalGeometry[s.status === 'red' ? 1 : 0]}
          material={signalMaterials[s.status === 'red' ? 1 : 0].material}
          onClick={(e) => {
            e.stopPropagation();
            props.onSelect(s.id);
          }}
        />
      ))}
      {STATIONS.map((s) => (
        <mesh
          key={s.id}
          position={[s.x, 9.2, 0]}
          material={hitMaterial}
          onClick={(e) => {
            e.stopPropagation();
            props.onSelect(s.id);
          }}
        >
          <boxGeometry args={[24, 6.4, 14]} />
        </mesh>
      ))}
      <mesh
        position={[-82.5, 3.35, -17]}
        material={hitMaterial}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect('depot');
        }}
      >
        <boxGeometry args={[39, 6.7, 16]} />
      </mesh>
      <mesh
        position={[16.5, 2.1, 19]}
        material={hitMaterial}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect('pier');
        }}
      >
        <boxGeometry args={[11, 4.2, 10]} />
      </mesh>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[-3, 1, 10]}
        autoRotate={props.autoRotate}
        autoRotateSpeed={-0.5}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.45}
        zoomSpeed={0.9}
        minDistance={4}
        maxDistance={Infinity}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minAzimuthAngle={-Infinity}
        maxAzimuthAngle={Infinity}
        screenSpacePanning
        panSpeed={1.4}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        touches={{ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE}}
        onStart={() => {
          desired.current = null;
          props.onGesture();
        }}
      />
    </>
  );
}
export default function SceneCanvas(props: Props) {
  const labelElements = useRef(new Map<string, HTMLButtonElement>()),
    [nodeCount, setNodeCount] = useState(0),
    [error, setError] = useState('');
  return (
    <>
      <div
        className="scene-canvas"
        data-engine="react-three-fiber"
        data-model-source="/models/bangkok-city.gltf"
        data-model-nodes={nodeCount}
      >
        <Canvas
          camera={{
            fov: (0.7 * 180) / Math.PI,
            near: 0.5,
            far: 1100,
            position: positionFor(220, new THREE.Vector3(-3, 1, 10)).toArray(),
          }}
          dpr={[1, 1.75]}
          gl={{antialias: true, alpha: false, toneMapping: THREE.NoToneMapping}}
          onCreated={({gl}) => {
            gl.domElement.id = 'world';
            gl.domElement.tabIndex = 0;
            gl.domElement.setAttribute(
              'aria-label',
              'เมือง 3D จำลอง ลากซ้ายเพื่อเลื่อน ลากขวาหรือกดล้อเมาส์ค้างแล้วลากเพื่อหมุน เลื่อนล้อเมาส์เพื่อซูม',
            );
            gl.domElement.addEventListener('webglcontextlost', () =>
              setError('ระบบแสดงผล 3D หยุดชั่วคราว กรุณาโหลดหน้าใหม่'),
            );
          }}
        >
          <Suspense fallback={null}>
            <CityScene {...props} labelElements={labelElements} onReady={setNodeCount} />
          </Suspense>
        </Canvas>
      </div>
      <div id="world-labels" aria-label="จุดสำรวจในเมือง">
        {[
          ...landmarks,
          ...trainIds.map((id) => ({id, name: id.replace('-', ' '), position: []})),
        ].map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              if (el) labelElements.current.set(item.id, el);
              else labelElements.current.delete(item.id);
            }}
            className={
              'world-label ' +
              (item.id.startsWith('BTS-')
                ? 'train-label'
                : item.id.startsWith('S')
                  ? 'station-label'
                  : 'landmark-label') +
              (props.selected === item.id ? ' selected' : '')
            }
            hidden={!nodeCount || !props.showLabels}
            aria-label={'เลือก ' + item.name}
            onClick={() => props.onSelect(item.id)}
          >
            {item.id.startsWith('S') && <b>{item.id}</b>}
            <span>{item.name}</span>
            {!item.id.startsWith('BTS-') && <i />}
          </button>
        ))}
      </div>
      {!nodeCount && !error && (
        <div className="scene-loading glass" role="status">
          กำลังเปิดเมือง 3D…
        </div>
      )}
      {error && (
        <div id="scene-error" role="alert">
          <strong>เปิดฉาก 3D ไม่ได้</strong>
          <p>{error}</p>
        </div>
      )}
    </>
  );
}
