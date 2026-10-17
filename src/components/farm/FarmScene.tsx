'use client';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {ContactShadows, Environment, Lightformer, Line, OrbitControls, RoundedBox, useGLTF} from '@react-three/drei';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import type {OrbitControls as OrbitImpl} from 'three-stdlib';
import type {FarmSnapshot, Pig, Fan} from '../../lib/farm';
import {BACKGROUND_PIGS} from '../../lib/farm-layout';

type V3 = [number, number, number];
const DEFAULT_CAMERA_POSITION: V3 = [-19.12,8.89,19.12];
const pens = Array.from({length: 6}, (_, i) => ({id: `${i < 3 ? 'A' : 'B'}${i % 3 + 1}`, x: (i % 3 - 1) * 10, z: i < 3 ? -5 : 5}));
function SpriteLabel({text, position, active=false, compact=false, onClick}: {text:string; position:V3; active?:boolean; compact?:boolean; onClick?:()=>void}) {
  const label=useMemo(()=>{
    const ratio=2, fontSize=compact?22:25;
    const canvas=document.createElement('canvas'), measure=canvas.getContext('2d')!;
    measure.font=`500 ${fontSize}px Kanit, sans-serif`;
    const width=Math.ceil(measure.measureText(text).width+52), height=compact?48:54;
    canvas.width=width*ratio;canvas.height=height*ratio;
    const ctx=canvas.getContext('2d')!;ctx.scale(ratio,ratio);
    const radius=8;
    ctx.beginPath();ctx.roundRect(.5,.5,width-1,height-1,radius);
    ctx.fillStyle=active?'#365e45':'rgba(252,253,245,.94)';ctx.fill();
    ctx.strokeStyle=active?'#365e45':'rgba(205,216,198,.95)';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.arc(17,height/2,3.2,0,Math.PI*2);ctx.fillStyle=active?'#b5d18e':'#88a476';ctx.fill();
    ctx.font=`500 ${fontSize}px Kanit, sans-serif`;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=active?'#ffffff':'#45584b';ctx.fillText(text,29,height/2+.5);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    return {texture,aspect:width/height};
  },[text,active,compact]);
  useEffect(()=>()=>label.texture.dispose(),[label]);
  const height=compact?.38:.5;
  return <sprite position={position} scale={[height*label.aspect,height,1]} renderOrder={100} onClick={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
    <spriteMaterial map={label.texture} transparent depthTest={false} depthWrite={false} toneMapped={false}/>
  </sprite>;
}
function Box({at, size, color, metal = false}: {at: V3; size: V3; color: string; metal?: boolean}) {
  return <RoundedBox position={at} args={size} radius={Math.min(.075,...size.map(v=>v*.22))} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={metal ? .38 : .65} metalness={metal ? .4 : 0}/></RoundedBox>;
}
function Rail({at, length, rotate = false}: {at: V3; length: number; rotate?: boolean}) {
  return <group position={at} rotation={[0, rotate ? Math.PI / 2 : 0, 0]}>
    <Box at={[0, .39, 0]} size={[length, .75, .16]} color="#e6e3dc"/>
    {[1.02,1.36].map(y => <Box key={y} at={[0,y,0]} size={[length,.055,.055]} color="#a6ada9" metal/>)}
    {Array.from({length: Math.ceil(length / 1.8) + 1}, (_,i) => <Box key={i} at={[-length/2 + i * length/Math.ceil(length/1.8),1,0]} size={[.045,.75,.045]} color="#a6ada9" metal/>)}
  </group>;
}
function Feeder({at}: {at: V3}) {
  return <group position={at}>
    <mesh position={[0,.14,0]} receiveShadow><cylinderGeometry args={[.65,.65,.22,24]}/><meshStandardMaterial color="#798c88" metalness={.65} roughness={.35}/></mesh>
    <mesh position={[0,.95,0]} castShadow><cylinderGeometry args={[.56,.22,.95,24]}/><meshStandardMaterial color="#adbbb6" metalness={.65} roughness={.3}/></mesh>
    <mesh position={[0,1.55,0]} castShadow><cylinderGeometry args={[.57,.57,.3,24]}/><meshStandardMaterial color="#a8b9b4" metalness={.65} roughness={.32}/></mesh>
    <mesh position={[0,1.71,0]}><cylinderGeometry args={[.48,.48,.015,24]}/><meshStandardMaterial color="#66533c"/></mesh>
    {[-.48,.48].map(x => <Box key={x} at={[x,.7,0]} size={[.045,1.3,.045]} color="#6c817b" metal/>)}
  </group>;
}
function Barn() {
  return <group>
    <Box at={[0,-.4,0]} size={[34,.7,19]} color="#d3cfc6"/>
    <Box at={[0,-.04,0]} size={[32,.18,17]} color="#eeebe4"/>
    <Box at={[0,.06,0]} size={[31.8,.04,2.6]} color="#d7d0c3"/>
    {[-1.25,1.25].map(z => <Box key={z} at={[0,.09,z]} size={[31.8,.02,.035]} color="#f7f5ef"/>)}
    {pens.map(p => <group key={p.id}>
      <Box at={[p.x,.07,p.z]} size={[9.75,.09,6.6]} color="#dfded5"/>
      {Array.from({length: 20},(_,i) => <mesh key={i} position={[p.x - 4.6 + i*.48,.123,p.z]}><boxGeometry args={[.018,.008,6.35]}/><meshStandardMaterial color="#c1c3b9" roughness={.9}/></mesh>)}
      <Rail at={[p.x,0,p.z < 0 ? -1.6 : 1.6]} length={9.85}/>
      <Feeder at={[p.x-4.2,.1,p.z+2.7]}/>
      <mesh position={[p.x+4.3,.25,p.z-2.8]}><cylinderGeometry args={[.4,.32,.22,20]}/><meshStandardMaterial color="#688e92" metalness={.4} roughness={.3}/></mesh>
      <SpriteLabel text={`คอก ${p.id}`} position={[p.x,.5,p.z < 0 ? -1.6 : 1.6]} compact/>
    </group>)}
    {[-15,-5,5,15].flatMap(x => [-5,5].map(z => <Rail key={`${x}-${z}`} at={[x,0,z]} length={6.8} rotate/>))}
    {[-8.5,8.5].map(z => <Box key={z} at={[0,.57,z]} size={[32,1.2,.25]} color="#e8e4dd"/>)}
    <Box at={[16,1.85,0]} size={[.3,3.8,17]} color="#e8e4dd"/>
    <Box at={[-16,.52,0]} size={[.22,1.1,17]} color="#e8e4dd"/>
    <SpriteLabel text="ทางเข้า →" position={[-16.5,.35,0]} compact/>
  </group>;
}
const PIG_MODEL_URL='/models/farm/pig.glb';
const LEG_CUTOFF=-.25;
const LEG_HIPS:V3[]=[[-.117,LEG_CUTOFF,.315],[.117,LEG_CUTOFF,.315],[-.151,LEG_CUTOFF,-.718],[.151,LEG_CUTOFF,-.718]];
const LEG_LEN=.521+LEG_CUTOFF;
useGLTF.preload(PIG_MODEL_URL);
function PigSculpture({walking, paused, tagged=false, variant=0}: {walking:boolean; paused:boolean; tagged?:boolean; variant?:number}) {
  const {scene}=useGLTF(PIG_MODEL_URL);
  const body=useRef<THREE.Group>(null);
  const legs=useRef<(THREE.Group|null)[]>([]);
  const phase=useRef(variant);
  const shadow=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(32,32,4,32,32,32);
    gradient.addColorStop(0,'rgba(76,57,42,.32)');gradient.addColorStop(.5,'rgba(76,57,42,.15)');gradient.addColorStop(1,'rgba(76,57,42,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
  },[]);
  useEffect(()=>()=>shadow.dispose(),[shadow]);
  const model=useMemo(()=>{
    const clone=scene.clone(true);
    clone.traverse(o=>{
      if((o as THREE.Mesh).isMesh){
        const mesh=o as THREE.Mesh;
        mesh.castShadow=true;mesh.receiveShadow=true;
        const mat=mesh.material as THREE.MeshStandardMaterial;
        if(mat&&mat.color){mat.color=new THREE.Color(1.45,1.32,1.28);mat.roughness=Math.min(1,mat.roughness+.1);}
        const geo=mesh.geometry;
        if(geo&&!geo.userData.legsStubbed){
          const pos=geo.attributes.position;
          for(let i=0;i<pos.count;i++){if(pos.getY(i)<LEG_CUTOFF)pos.setY(i,LEG_CUTOFF);}
          pos.needsUpdate=true;geo.computeVertexNormals();geo.userData.legsStubbed=true;
        }
      }
    });
    return clone;
  },[scene]);
  const FAT_SCALE:V3=[1.3,1.2,1.08];
  const groundY=.521*FAT_SCALE[1];
  useFrame((_,dt)=>{
    if(!paused)phase.current+=dt;
    const t=phase.current;
    const stepping=walking&&!paused;
    if(body.current){
      const bob=stepping?Math.abs(Math.sin(t*6))*.028:Math.sin(t*1.6)*.006;
      body.current.position.y=groundY+bob;
      body.current.rotation.z=stepping?Math.sin(t*3)*.018:0;
    }
    legs.current.forEach((leg,i)=>{if(leg)leg.rotation.x=stepping?Math.sin(t*6+(i===0||i===3?0:Math.PI))*.5:0;});
  });
  return <group>
    <group ref={body} position={[0,groundY,0]} scale={FAT_SCALE}>
      <primitive object={model}/>
      {LEG_HIPS.map((hip,i)=><group key={i} position={hip} ref={el=>{legs.current[i]=el;}}>
        <mesh position={[0,-LEG_LEN/2,0]} castShadow receiveShadow><capsuleGeometry args={[.055,Math.max(.01,LEG_LEN-.11),4,8]}/><meshStandardMaterial color="#e8ac9c" roughness={.92}/></mesh>
        <mesh position={[0,-LEG_LEN+.03,0]} castShadow receiveShadow><cylinderGeometry args={[.05,.045,.06,8]}/><meshStandardMaterial color="#c9a784" roughness={.8}/></mesh>
      </group>)}
    </group>
    {tagged&&<RoundedBox position={[.22,1.15,.68]} args={[.115,.13,.035]} radius={.025} smoothness={2}><meshStandardMaterial color="#d8bb75"/></RoundedBox>}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.004,0]}><planeGeometry args={[1.7,2.5]}/><meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false}/></mesh>
  </group>;
}
function PigModel({pig, selected, labels, paused, onSelect}: {pig: Pig; selected: boolean; labels: boolean; paused: boolean; onSelect: () => void}) {
  const group=useRef<THREE.Group>(null);
  const target=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,dt)=>{
    if(!group.current)return;
    target.set(pig.x,.15,pig.z);group.current.position.lerp(target,1-Math.exp(-dt*8));
    const d=Math.atan2(Math.sin(pig.heading-group.current.rotation.y),Math.cos(pig.heading-group.current.rotation.y));
    group.current.rotation.y+=d*(1-Math.exp(-dt*6));
  });
  return <group ref={group} position={[pig.x,.15,pig.z]} onClick={e=>{e.stopPropagation();onSelect();}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={e=>{e.stopPropagation();document.body.style.cursor='auto';}}>
    {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]}><ringGeometry args={[1.12,1.15,64]}/><meshBasicMaterial color="#548f79" side={THREE.DoubleSide}/></mesh>}
    <PigSculpture walking paused={paused} tagged variant={Number(pig.id.slice(-3))}/>
    {(labels||selected)&&<SpriteLabel text={pig.id} position={[0,1.7,0]} active={selected} onClick={onSelect}/>}
  </group>;
}
function Ventilator({fan, index, active}: {fan: Fan; index: number; active: boolean}) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_,dt)=>{if (blades.current && active && fan.on) blades.current.rotation.z -= dt*13;});
  return <group position={[15.76,2.25,-6+index*4]} rotation={[0,-Math.PI/2,0]}>
    <Box at={[0,0,0]} size={[2.45,2.45,.25]} color="#b7bdb6"/>
    <mesh position={[0,0,.16]}><circleGeometry args={[1.03,40]}/><meshStandardMaterial color="#626c66"/></mesh>
    <group ref={blades} position={[0,0,.22]}>
      {[0,1,2,3,4].map(i => <group key={i} rotation={[0,0,i*Math.PI*2/5]}><mesh position={[.46,0,0]} rotation={[0,.3,.3]} scale={[.5,.19,.06]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#b3c0b4" metalness={.65} roughness={.4}/></mesh></group>)}
    </group>
    <mesh position={[0,0,.28]}><sphereGeometry args={[.2,16,12]}/><meshStandardMaterial color="#c2c8bd" metalness={.6}/></mesh>
    {[.38,.66,1.06].map(r=><mesh key={r} position={[0,0,.32]}><torusGeometry args={[r,.018,6,48]}/><meshStandardMaterial color="#83988a"/></mesh>)}
    <SpriteLabel text={`${fan.id} · ${fan.on?'ON':'OFF'}`} position={[0,-1.6,.4]} active={fan.on} compact/>
  </group>;
}
function CameraRig({snapshot, selected, follow, rotate, view}: {snapshot: FarmSnapshot; selected: string; follow: boolean; rotate: boolean; view: number}) {
  const controls = useRef<OrbitImpl>(null);
  const {camera, size} = useThree();
  const point = useMemo(()=>new THREE.Vector3(),[]);
  const tracking = useRef('');
  useEffect(()=>{ const scale=Math.min(2,Math.max(1,1.7/(size.width/size.height))); camera.position.set(...DEFAULT_CAMERA_POSITION).multiplyScalar(scale); controls.current?.target.set(0,0,0); controls.current?.update(); },[view,camera,size.width,size.height]);
  useEffect(()=>{
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (follow) camera.clearViewOffset();
    else {
      const horizontalShift=size.width>=700?.05:.035;
      const verticalShift=size.width>=700?-.05:0;
      camera.setViewOffset(size.width,size.height,-size.width*horizontalShift,-size.height*verticalShift,size.width,size.height);
    }
    camera.updateProjectionMatrix();
    return ()=>{
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  },[camera,follow,size.width,size.height]);
  useFrame((_,dt)=>{
    const pig=snapshot.pigs.find(p=>p.id===selected);
    if (follow && pig && controls.current) {
      point.set(pig.x,.7,pig.z);
      if(tracking.current!==selected){
        camera.position.sub(controls.current.target).normalize().multiplyScalar(16).add(point);
        controls.current.target.copy(point);
        tracking.current=selected;
      }
      const previous=controls.current.target.clone();
      controls.current.target.lerp(point,1-Math.exp(-dt*2));
      camera.position.add(controls.current.target.clone().sub(previous));
    } else tracking.current='';
  });
  return <OrbitControls ref={controls} makeDefault enableDamping minDistance={7} maxDistance={75} maxPolarAngle={Math.PI*.485} autoRotate={rotate&&!follow} autoRotateSpeed={.4}/>;
}
export default function FarmScene({snapshot, selected, onSelect, labels, rotate, follow, view, connected}: {snapshot: FarmSnapshot; selected: string; onSelect: (id: string)=>void; labels: boolean; rotate: boolean; follow: boolean; view: number; connected: boolean}) {
  const trails=useRef<Record<string,V3[]>>({});
  useEffect(()=>{ snapshot.pigs.forEach(p=>{const list=trails.current[p.id]??=[];const last=list.at(-1); if(!last||Math.hypot(last[0]-p.x,last[2]-p.z)>.12)list.push([p.x,.22,p.z]);if(list.length>80)list.shift();trails.current[p.id]=list;}); },[snapshot]);
  const trail=trails.current[selected];
  return <Canvas shadows dpr={[1,1.6]} camera={{position:DEFAULT_CAMERA_POSITION,fov:42}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.05}}>
    <color attach="background" args={['#eeeae3']}/>
    <hemisphereLight args={['#fffcf6','#b2a99b',.65]}/>
    <Environment resolution={128} frames={1}>
      <Lightformer position={[-10,18,8]} rotation={[Math.PI/2,0,0]} scale={[22,18,1]} intensity={3.5}/>
      <Lightformer position={[12,8,-12]} rotation={[0,Math.PI,0]} scale={[15,12,1]} intensity={2} color="#e7edf3"/>
    </Environment>
    <directionalLight position={[-15,25,10]} intensity={2.5} color="#fff2df" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-normalBias={.025} shadow-bias={-.0001} shadow-radius={4}/>
    <directionalLight position={[12,8,-10]} intensity={.65} color="#e6edf7"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.78,0]} receiveShadow><planeGeometry args={[250,250]}/><meshStandardMaterial color="#eeeae3" roughness={.85}/></mesh>
    <ContactShadows position={[0,-.745,0]} scale={65} opacity={.35} blur={2.5} far={12} resolution={1024} frames={1} color="#6e6252"/>
    <Barn/>
    {BACKGROUND_PIGS.map((p,i)=><group key={p.key} position={[p.x,.15,p.z]} rotation={[0,p.heading,0]} scale={[p.scale*1.18,p.scale*1.1,p.scale*1.05]}><PigSculpture walking={false} paused={snapshot.paused||!connected} variant={i}/></group>)}
    {snapshot.pigs.map(p=><PigModel key={p.id} pig={p} selected={selected===p.id} labels={labels} paused={snapshot.paused||!connected} onSelect={()=>onSelect(p.id)}/>)}
    {snapshot.fans.map((f,i)=><Ventilator key={f.id} fan={f} index={i} active={!snapshot.paused&&connected}/>)}
    {trail&&trail.length>1&&<Line points={trail} color="#2c9671" lineWidth={2} dashed dashSize={.2} gapSize={.12}/>}
    <CameraRig snapshot={snapshot} selected={selected} follow={follow} rotate={rotate} view={view}/>
  </Canvas>;
}
