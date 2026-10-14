import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const shadowNames = new Set(['city-building', 'station-canopy', 'depot-building', 'viaduct']);
const trainOrigins = [
  [-57, 9.27, 1.5],
  [-30, 9.27, 1.5],
  [26, 9.27, 1.5],
  [48, 9.27, -1.5],
  [-38, 9.27, -1.5],
  [-82, 0.9, -12],
];
/** Bake existing glTF transforms, then batch without moving or simplifying any vertex. */
export function prepareModel(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const city: THREE.BufferGeometry[] = [],
    shadows: THREE.BufferGeometry[] = [],
    train: THREE.BufferGeometry[] = [];
  let cityNodes = 0,
    trainNodes = 0;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const assetId = String(object.userData.assetId ?? '');
    const isTrain = assetId.startsWith('BTS-');
    if (isTrain && assetId !== 'BTS-1101') return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const material = (
      Array.isArray(object.material) ? object.material[0] : object.material
    ) as THREE.Material;
    // Original RGB bytes are retained; the legacy shader also used these directly.
    const rgb = /^#[0-9a-f]{6}$/i.test(material.name)
      ? [1, 3, 5].map((i) => parseInt(material.name.slice(i, i + 2), 16) / 255)
      : [0.9, 0.9, 0.9];
    const count = geometry.getAttribute('position').count,
      color = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) color.set(rgb, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
    if (isTrain) {
      geometry.translate(-trainOrigins[0][0], -trainOrigins[0][1], -trainOrigins[0][2]);
      train.push(geometry);
      trainNodes++;
    } else {
      city.push(geometry);
      cityNodes++;
      if (shadowNames.has(object.name.split('_')[0])) shadows.push(geometry.clone());
    }
  });
  const merge = (parts: THREE.BufferGeometry[]) => {
    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error('Cannot load original model geometry');
    parts.forEach((g) => g.dispose());
    return merged;
  };
  return {city: merge(city), shadow: merge(shadows), train: merge(train), cityNodes, trainNodes};
}

// Same daylight/night shader as the original renderer, now managed by Three.js.
export function createCityMaterial(shadow = false, train = false) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
    uniforms: {
      uSun: {value: new THREE.Vector3()},
      uNight: {value: 0},
      uBrightness: {value: 1},
      uFog: {value: 0},
      uSelected: {value: 0},
      uShadow: {value: shadow ? 1 : 0},
      uTrain: {value: train ? 1 : 0},
    },
    vertexShader: `varying vec3 vNormal;varying vec3 vColor;varying vec3 vLocal;varying vec3 vWorld;uniform vec3 uSun;uniform float uShadow;
      void main(){vec3 p=position;if(uShadow>0.5){p.x-=(p.y-0.25)*uSun.x/uSun.y;p.z-=(p.y-0.25)*uSun.z/uSun.y;p.y=0.25;}
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vNormal=mat3(modelMatrix)*normal;vColor=color;vLocal=position;vWorld=(modelMatrix*vec4(position,1.0)).xyz;}`,
    fragmentShader: `varying vec3 vNormal;varying vec3 vColor;varying vec3 vLocal;varying vec3 vWorld;uniform vec3 uSun;uniform float uNight;uniform float uBrightness;uniform float uFog;uniform float uSelected;uniform float uShadow;uniform float uTrain;
      void main(){if(uShadow>0.5){gl_FragColor=vec4(mix(vec3(0.77,0.81,0.80),vec3(0.08,0.10,0.2),uNight),1.0);return;}
      vec3 n=normalize(vNormal);float sun=max(dot(n,normalize(uSun)),0.0);float sky=n.y*0.5+0.5;
      vec3 light=vec3(0.82,0.84,0.87)+vec3(0.06)*sky+vec3(0.18,0.16,0.13)*sun;vec3 c=min(vColor*light,vec3(0.985));
      c=mix(c,vec3(0.24,0.37,0.76),uSelected*0.18);
      // Night: deep navy surroundings, warm tungsten glass, string-light bulbs and soft spot pools.
      vec3 nightColor=c*vec3(0.2,0.25,0.46)+vec3(0.02,0.026,0.06);
      float top=step(0.85,n.y);float side=1.0-top;
      float rawWin=step(0.51,vColor.b)*step(vColor.r,0.77)*step(vColor.g,0.79)*step(abs(n.y),0.5);
      float hz=vLocal.x+vLocal.z;vec2 pane=fract(vec2(hz*0.55,vLocal.y*0.5));vec2 cell=floor(vec2(hz*0.55,vLocal.y*0.5));
      float h=fract(sin(dot(cell,vec2(12.9898,78.233))+floor(vLocal.x*0.2)*3.7)*43758.5453);
      float glass=step(0.1,pane.x)*step(pane.x,0.93)*step(0.12,pane.y)*step(pane.y,0.9);
      float lit=step(0.14,h);vec3 warm=mix(vec3(1.0,0.70,0.36),vec3(1.0,0.88,0.64),fract(h*5.0));
      float glow=lit*(0.8+0.55*(1.0-pane.y))+(1.0-lit)*0.1;
      nightColor=mix(nightColor,nightColor*0.55,rawWin*(1.0-glass));
      nightColor=mix(nightColor,warm*glow*1.75,rawWin*glass);
      nightColor+=vec3(1.0,0.62,0.32)*(0.05+0.06*lit)*side*(1.0-rawWin*glass);
      float gnd=top*step(vWorld.y,1.2);
      float w1=0.5+0.5*sin(vWorld.x*0.031+1.3)*sin(vWorld.z*0.037+0.4),w2=0.5+0.5*sin(vWorld.x*0.017-0.8+vWorld.z*0.023);
      nightColor+=vec3(1.0,0.64,0.32)*(0.07+0.2*w1*w2+0.08*w2)*gnd;
      vec2 lp=fract(vWorld.xz*0.045)-0.5;float lamp=exp(-dot(lp,lp)*95.0);float lampH=step(0.6,fract(sin(dot(floor(vWorld.xz*0.045),vec2(12.9898,78.233)))*43758.5453));
      nightColor+=vec3(0.5,0.62,0.9)*lamp*lampH*0.4*gnd;
      float deck=step(7.5,vWorld.y)*step(vWorld.y,10.2)*step(abs(vWorld.z),5.5)*(1.0-uTrain);
      float strip=exp(-pow((abs(vWorld.z)-2.4)/1.5,2.0))*(0.85+0.15*sin(vWorld.x*0.6));
      nightColor+=deck*(top*(vec3(0.22,0.12,0.055)+vec3(1.0,0.74,0.42)*strip*1.0)+side*vec3(1.0,0.62,0.30)*0.8);
      float tg=0.75+0.35*h;vec3 tcol=vec3(1.0,0.80,0.52)*tg;
      nightColor=mix(nightColor,mix(nightColor*0.5,tcol*1.7,glass),uTrain*side);
      nightColor=mix(nightColor,vec3(0.9,0.62,0.34),uTrain*top*0.5);
      c=mix(c,nightColor,uNight);c*=mix(uBrightness,max(uBrightness,1.3),uNight);c=mix(c,vec3(0.76,0.81,0.84),uFog);gl_FragColor=vec4(c,1.0);}`,
  });
}
