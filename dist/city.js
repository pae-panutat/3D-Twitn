import {meshGeometry,hex,toGLTF} from './geometry.js';
export {meshGeometry,hex,toGLTF};
export const STATIONS=[
  {id:'S8',name:'วงเวียนใหญ่',x:-66,position:[-66,13,0],lat:13.721,lng:100.495,subtitle:'ฝั่งธนบุรี · จุดเริ่มต้นพื้นที่จำลอง',density:24},
  {id:'S7',name:'กรุงธนบุรี',x:-30,position:[-30,13,0],lat:13.7207,lng:100.5028,subtitle:'เชื่อมต่อสายสีทอง · ฝั่งธนบุรี',density:34},
  {id:'S6',name:'สะพานตากสิน',x:22,position:[22,13,0],lat:13.7188,lng:100.5141,subtitle:'เชื่อมต่อท่าเรือสาทร · ฝั่งพระนคร',density:46},
  {id:'S5',name:'สุรศักดิ์',x:60,position:[60,13,0],lat:13.7193,lng:100.5215,subtitle:'ย่านสาทร · ฝั่งพระนคร',density:28}
];
export const SIGNALS=STATIONS.flatMap(s=>[-1,1].map((direction,i)=>({id:'SIG-'+s.id+'-'+i,name:'สัญญาณ '+s.id+' '+(direction>0?'ตะวันออก':'ตะวันตก'),stationId:s.id,x:s.x-direction*10,z:direction>0?1.5:-1.5,direction,position:[s.x-direction*10,11,direction>0?1.5:-1.5]})));
export const LANDMARKS=[{id:'depot',name:'ลานซ่อมบำรุง',position:[-83,8,-18]},{id:'pier',name:'ท่าเรือสาทร',position:[15,4,18]}];
const C={white:'#f2f3f0',concrete:'#d1d8d9',window:'#b9c5cc',dark:'#536979',blue:'#354f9c',water:'#9bbdcf',road:'#d0d6d5',green:'#b7c9bd'};
export function createCity(){
  const items=[];
  const box=(name,position,size,color,extra={})=>items.push({name,position,size,color,floor:'city',...extra});
  const cyl=(name,position,r,h,color,extra={})=>items.push({name,position,size:[r*2,h,r*2],color,shape:'cylinder',floor:'city',...extra});
  box('district-plinth',[-8,-1,5],[214,2,127],'#e6e9e6');
  // Chao Phraya: compressed geography, flowing north to south.
  box('chao-phraya-river',[5,.04,5],[24,.16,127],C.water);
  for(let z=-54;z<65;z+=9){box('water-ripple',[4+Math.sin(z)*4,.14,z],[2.5,.014,.09],'#c6dce1');box('water-ripple',[8,.14,z+2],[1,.01,.08],'#b1ced8')}
  for(const x of [-8,18])box('riverbank',[x,.24,5],[1.6,.45,127],'#d7dddc');
  for(const z of [-45,-19,19,44]){
    box('west-road',[-60,.08,z],[105,.15,5.5],C.road);
    box('east-road',[62,.08,z],[86,.15,5.5],C.road);
    for(const x of [-92,-64,-38,30,59,87])for(let k=-1;k<2;k++)box('street-dash',[x+k*5,.17,z],[2.3,.01,.11],'#f2f3eb');
  }
  for(const x of [-91,-56,-20,31,69,97]){
    box('local-street',[x,.09,10],[4.5,.18,108],C.road);
    box('sidewalk',[x+3.1,.17,10],[1.4,.3,108],'#eef0eb');
  }
  box('river-road-bridge',[5,2.6,44],[27,.7,6.2],C.concrete);
  for(const x of [-5,16])box('road-bridge-pier',[x,1.25,44],[1.4,2.5,2.5],C.concrete);
  // Architectural masses, inset windows, roof plant and baked contact shadows.
  let seed=21;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const blocks=[[-104,-30],[-78,-30],[-43,-30],[-103,31],[-78,31],[-42,31],[-104,56],[-73,56],[-38,56],[27,-32],[48,-31],[82,-31],[28,29],[51,30],[82,30],[29,57],[52,58],[82,58],[-78,-53],[-46,-53],[44,-53],[80,-53]];
  for(let index=0;index<blocks.length;index++){
    const [bx,bz]=blocks[index];const count=index%4===0?2:3;
    for(let j=0;j<count;j++){
      const x=bx+(j%2)*10.5+random()*1.5,z=bz+Math.floor(j/2)*10.5;const w=6+random()*3,d=5+random()*3,h=4+random()*13+(index===12?21:0)+(index===6?8:0);
      box('building-shadow',[x+1,.20,z+1],[w+2,.012,d+2],'#daddd9');
      box('city-building',[x,h/2+.22,z],[w,h,d],C.white);
      box('roof-parapet',[x,h+.35,z],[w+.4,.3,d+.4],'#d7dfe1');
      box('rooftop-plant',[x+.9,h+.85,z-.7],[2.1,.7,1.9],'#c5ced0');
      if(h>12)box('tower-base',[x,1.5,z],[w+1.5,2.6,d+1.5],'#eef0ef');
      for(let y=2;y<h-1;y+=2.1){
        for(let xx=-w/2+.9;xx<w/2-.6;xx+=1.7){box('window-front',[x+xx,y,z+d/2+.015],[1.15,.85,.025],C.window);box('window-back',[x+xx,y,z-d/2-.015],[1.15,.85,.025],C.window)}
        for(let zz=-d/2+.8;zz<d/2-.6;zz+=1.6)box('window-side',[x+w/2+.016,y,z+zz],[.025,.85,1.05],C.window);
      }
    }
  }
  // Small townhouse rows near the rails.
  for(const side of [-1,1])for(let x=-94;x<=86;x+=8){if(x>-12&&x<23)continue;const z=side*12;box('shophouse',[x,2.05,z],[5.4,4,4.3],'#e9ece9');box('shophouse-roof',[x,4.2,z],[5.9,.3,4.8],'#c9d3d6');box('shop-canopy',[x,2.1,z-side*2.5],[5.6,.13,1.3],x%3===0?C.blue:'#bbc7cc');for(const xx of [-1.5,0,1.5])box('shop-window',[x+xx,3,z-side*2.17],[.85,.85,.02],C.window)}
  // Palm silhouettes, street lamps and small city traffic.
  for(const x of [-101,-86,-72,-45,-32,-16,25,42,56,77,91])for(const z of [-9,9,24,48]){
    cyl('palm-trunk',[x,1.75,z],.14,3.5,'#a7b2ae');
    for(let a=0;a<5;a++)box('palm-leaf',[x,3.4,z],[.38,.12,3.2],C.green,{rotation:[.1,a*Math.PI*2/5,.17]});
    cyl('palm-crown',[x,3.65,z],.33,.3,C.green);
  }
  for(const x of [-90,-55,-20,30,65,90]){
    box('streetlight',[x,2.3,18],[.1,4.5,.1],C.dark);box('streetlight-arm',[x+.65,4.55,18],[1.4,.08,.1],C.dark);
    box('streetlight-lamp',[x+1.15,4.5,18],[.6,.15,.28],'#fff4d7',{lamp:true});
  }
  for(let i=0;i<25;i++){const x=-103+i*8.1;if(x>-8&&x<18)continue;const z=i%2?18:45;box('city-car',[x,.6,z],[1.7,.75,.78],i%4===0?C.blue:C.white);box('car-window',[x,.95,z],[.7,.25,.68],C.window)}
  // Continuous viaduct with two rail lanes crossing the river.
  box('viaduct',[0,8.5,0],[202,.8,7.6],C.concrete);
  box('viaduct-front-fascia',[0,8.55,4],[202,.7,.18],C.white);
  for(let x=-99;x<100;x+=10){box('viaduct-pier',[x,4.1,0],[.95,8.1,1.7],C.concrete);box('viaduct-pier-cap',[x,7.8,0],[2.1,.7,6.8],C.concrete)}
  for(const z of [-1.5,1.5]){
    box('track-ballast',[0,8.97,z],[202,.15,2.4],'#b5c1c5');
    for(let x=-100;x<101;x+=1.2)box('rail-sleeper',[x,9.08,z],[.12,.08,1.85],'#e0e4e4');
    for(const side of [-.62,.62])box('running-rail',[0,9.2,z+side],[202,.10,.08],C.dark);
    box('third-rail',[0,9.15,z+1.05],[202,.07,.04],C.blue);
  }
  for(const station of STATIONS){
    const x=station.x,assetId=station.id;
    box('station-deck',[x,9.35,0],[23,.5,13],C.white,{assetId});
    for(const z of [-4.5,4.5]){
      box('station-platform',[x,9.7,z],[22,.45,3.4],C.white,{assetId});
      box('platform-blue-edge',[x,9.98,z-Math.sign(z)*1.6],[22,.03,.14],C.blue,{assetId});
      box('station-canopy',[x,12.1,z],[24,.24,4.1],C.white,{assetId});
      box('canopy-blue-edge',[x,12.02,z+Math.sign(z)*2],[24,.18,.14],C.blue,{assetId});
      for(const xx of [-9,-3,3,9])box('canopy-column',[x+xx,11,z+Math.sign(z)*.7],[.16,2.2,.16],C.concrete,{assetId});
      for(let xx=-10;xx<11;xx+=1.8)box('screen-doors',[x+xx,10.43,z-Math.sign(z)*1.63],[1.6,.9,.065],'#c1cbd1',{assetId});
      box('platform-bench',[x+5,10.28,z],[2.7,.4,.55],C.window,{assetId});
    }
    box('station-concourse',[x,7.5,0],[15,1.4,13],C.white,{assetId});
    box('station-concourse-window',[x,7.7,6.52],[13,.55,.04],C.window,{assetId});
    for(const side of [-1,1]){
      box('station-stair-wall',[x+side*8,4.6,8.3],[2.1,.45,9],C.white,{assetId,rotation:[-.77,0,0]});
      for(let step=0;step<17;step++)box('station-step',[x+side*8,1.1+step*.39,11.7-step*.31],[1.8,.13,.4],C.concrete,{assetId});
      box('station-entrance',[x+side*8,2.2,12.6],[2.7,.24,2.1],C.blue,{assetId});
    }
  }
  // Depot and wash lane.
  box('depot-yard',[-82,.3,-18],[42,.45,13],'#d8dfdf',{assetId:'depot'});
  box('depot-building',[-87,3.25,-21],[23,6,8],C.white,{assetId:'depot'});
  box('depot-roof',[-87,6.35,-21],[25,.3,9.5],C.blue,{assetId:'depot'});
  for(const x of [-96,-90,-84,-78])box('depot-door',[x,2.7,-16.98],[3.8,4.8,.08],C.window,{assetId:'depot'});
  for(const z of [-13,-10])for(const dz of [-.6,.6])box('depot-rail',[-82,.67,z+dz],[41,.08,.07],C.dark,{assetId:'depot'});
  box('wash-frame-top',[-68,3.7,-12],[4,.24,5],C.blue,{assetId:'depot'});
  for(const z of [-14.2,-9.8])box('wash-frame',[-68,1.9,z],[.24,3.6,.24],C.blue,{assetId:'depot'});
  // Sathorn pier and a stylised boat on the river.
  box('sathorn-pier',[16,.8,19],[10,1.2,9],C.white,{assetId:'pier'});
  box('pier-canopy',[17,3.8,19],[8,.22,6],C.blue,{assetId:'pier'});
  for(const z of [16.4,21.6])box('pier-column',[18,2.4,z],[.2,2.7,.2],C.concrete,{assetId:'pier'});
  box('river-boat',[7,.7,30],[2.3,.9,7],C.white);box('boat-canopy',[7,1.7,30],[2.4,.2,4.8],C.blue);
  return items;
}
export function createTrain(){
  const items=[];const box=(name,position,size,color)=>items.push({name,position,size,color,floor:'train'});
  for(let car=0;car<4;car++){
    const x=(car-1.5)*3.5;
    box('car-body',[x,1.15,0],[3.28,1.6,1.45],C.white);
    box('car-blue-line',[x,.7,.738],[3.28,.18,.025],C.blue);box('car-blue-line-back',[x,.7,-.738],[3.28,.18,.025],C.blue);
    box('car-roof',[x,2.02,0],[3.34,.17,1.5],'#d5dee0');box('car-undercarriage',[x,.23,0],[2.6,.35,1.1],C.dark);
    for(const wx of [-1.1,-.38,.38,1.1])for(const side of [-1,1])box('car-window',[x+wx,1.35,side*.744],[.48,.52,.027],C.window);
    for(const dx of [-.75,.75])for(const side of [-1,1])box('car-door',[x+dx,1.07,side*.757],[.25,1.14,.027],'#cbd5d9');
    for(const wx of [-1,1])box('car-bogie',[x+wx,.1,0],[.6,.25,1.25],C.dark);
  }
  for(const side of [-1,1])box('cab-window',[side*6.96,1.45,0],[.045,.66,1.12],C.blue);
  return items;
}
