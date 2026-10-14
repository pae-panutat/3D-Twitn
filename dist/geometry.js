// Procedural station model. Units: metres. Right-handed coordinates: +Y up.
// Shared by the WebGL viewer and the glTF exporter; asset IDs stay stable.
export const DEVICES = [
  {id:'ESC-01',name:'บันไดเลื่อน ฝั่งตะวันออก',short:'บันไดเลื่อน 01',type:'escalator',floor:'concourse',position:[-9,4.3,4.3],status:'warning',unit:'A',base:12.8},
  {id:'ESC-02',name:'บันไดเลื่อน ฝั่งตะวันตก',short:'บันไดเลื่อน 02',type:'escalator',floor:'concourse',position:[9,4.3,4.3],status:'ok',unit:'A',base:8.2},
  {id:'LFT-01',name:'ลิฟต์โดยสาร 01',short:'ลิฟต์ 01',type:'elevator',floor:'concourse',position:[-14,5.9,-4.4],status:'ok',unit:'เที่ยว/ชม.',base:24},
  {id:'LFT-02',name:'ลิฟต์โดยสาร 02',short:'ลิฟต์ 02',type:'elevator',floor:'concourse',position:[14,5.9,-4.4],status:'ok',unit:'เที่ยว/ชม.',base:18},
  {id:'CAM-01',name:'กล้อง CCTV ชานชาลา 1',short:'CCTV 01',type:'camera',floor:'platform',position:[-16,7.2,3.8],status:'ok',unit:'fps',base:30},
  {id:'CAM-02',name:'กล้อง CCTV ชานชาลา 2',short:'CCTV 02',type:'camera',floor:'platform',position:[16,7.2,3.8],status:'ok',unit:'fps',base:30},
  {id:'CAM-03',name:'กล้อง CCTV ทางเข้า',short:'CCTV 03',type:'camera',floor:'concourse',position:[-15,3.8,6.3],status:'ok',unit:'fps',base:30},
  {id:'CAM-04',name:'กล้อง CCTV โถงจำหน่ายบัตร',short:'CCTV 04',type:'camera',floor:'concourse',position:[0,3.8,3.5],status:'ok',unit:'fps',base:30},
  {id:'SEN-01',name:'เซนเซอร์อากาศ ชานชาลา',short:'อากาศ 01',type:'sensor',floor:'platform',position:[-5,6.5,4.2],status:'ok',unit:'°C',base:28.4},
  {id:'SEN-02',name:'เซนเซอร์อากาศ โถงชั้น 1',short:'อากาศ 02',type:'sensor',floor:'concourse',position:[5,3.9,4.3],status:'ok',unit:'°C',base:27.6},
  {id:'SEN-03',name:'มิเตอร์ไฟฟ้า ตู้หลัก',short:'ไฟฟ้า 01',type:'sensor',floor:'concourse',position:[-5,3.8,-4.6],status:'ok',unit:'kW',base:84.6},
  {id:'SEN-04',name:'เซนเซอร์ PM2.5',short:'PM2.5',type:'sensor',floor:'platform',position:[7,6.5,4.2],status:'ok',unit:'µg/m³',base:18}
];
export const FLOOR_NAMES = {concourse:'ชั้นจำหน่ายบัตร',platform:'ชั้นชานชาลา'};
export const STATUS_NAMES = {ok:'ปกติ',warning:'เตือน',fault:'ขัดข้อง'};
export const STATUS_COLORS = {ok:'#159b88',warning:'#e9a43b',fault:'#e56963'};
const C={slab:'#d4ddd6',edge:'#ebeee4',concrete:'#b6c8bb',rail:'#627d72',ballast:'#a4b6aa',mint:'#a4c9b2',glass:'#c1ddcb',dark:'#426b5b',white:'#e9eee5',yellow:'#dcc889',tree:'#6b9477'};

export function createStation(){
  const items=[];
  const box=(name,p,s,color,extra={})=>items.push({name,position:p,size:s,color,...extra});
  const cyl=(name,p,r,h,color,extra={})=>items.push({name,position:p,size:[r*2,h,r*2],color,shape:'cylinder',...extra});
  // Landscaped plinth and roads.
  box('site-base',[0,-.5,0],[50,.9,25],'#dce5d9',{floor:'ground'});
  box('road',[0,.01,8.7],[50,.13,4.2],'#c8d4c8',{floor:'ground'});
  for(let x=-23;x<24;x+=4)box('road-marking',[x,.09,8.7],[2,.02,.08],'#f5f7ed',{floor:'ground'});
  box('pedestrian-walk',[0,.14,6.1],[49,.3,1.4],'#eff0e6',{floor:'ground'});
  box('rear-walk',[0,.12,-9.4],[49,.26,2.2],'#e7ede1',{floor:'ground'});
  for(const x of [-21,-14,-7,0,7,14,21]){
    for(const z of [-10.2,11.2]){
      cyl('tree-trunk',[x,.85,z],.16,1.5,'#9aa48a',{floor:'ground'});
      cyl('tree-canopy',[x,2,z],.8,1.45,C.tree,{floor:'ground'});
      cyl('tree-top',[x,2.7,z],.58,.5,'#90ad8d',{floor:'ground'});
    }
  }
  // The viaduct continues outside the station.
  box('track-deck',[0,4.5,-1.7],[58,.55,5.6],C.slab,{floor:'platform'});
  for(const x of [-21,-13,-5,5,13,21]){
    box('pier-cap',[x,2.45,-1.7],[3.4,.5,4.2],C.concrete,{floor:'structure'});
    box('pier',[x,1.35,-1.7],[1.25,2.7,1.5],C.concrete,{floor:'structure'});
  }
  // Lower level: open-sided concourse, ticketing and access.
  box('concourse-slab',[0,2.8,0],[39,.42,12],C.edge,{floor:'concourse'});
  box('concourse-front-fascia',[0,2.6,6],[39,.6,.22],C.mint,{floor:'concourse'});
  for(const x of [-17,-11,-5,5,11,17]){
    box('concourse-pillar',[x,3.7,5.3],[.32,1.7,.32],C.concrete,{floor:'concourse'});
    box('concourse-rear-pillar',[x,3.7,-5.4],[.32,1.7,.32],C.concrete,{floor:'concourse'});
  }
  box('ticket-office',[0,3.65,-4.2],[6,1.6,2.2],C.mint,{floor:'concourse'});
  box('ticket-office-window',[0,3.75,-3.07],[4.7,.8,.04],C.glass,{floor:'concourse'});
  for(let x=-3.5;x<=3.5;x+=1)box('ticket-gate',[x,3.3,1.5],[.34,.8,.8],C.dark,{floor:'concourse'});
  for(const x of [-6,6])box('ticket-vending',[x,3.5,-3.8],[.8,1.25,.7],C.white,{floor:'concourse'});
  for(const x of [-19,19]){
    for(let i=0;i<13;i++)box('access-stair',[x,2.8-i*.19,5.4+i*.3],[2.1,.22,.34],C.edge,{floor:'concourse'});
    box('entrance-canopy',[x,4,6.7],[3,.18,3],C.mint,{floor:'concourse'});
  }
  // Upper level: two island-side platforms, safety lines and rail detail.
  box('front-platform',[0,4.97,3.45],[39,.42,4.2],C.white,{floor:'platform'});
  box('rear-platform',[0,4.97,-6.2],[39,.42,3.5],C.white,{floor:'platform'});
  box('front-safety-line',[0,5.2,1.47],[38,.02,.14],C.yellow,{floor:'platform'});
  box('rear-safety-line',[0,5.2,-4.59],[38,.02,.14],C.yellow,{floor:'platform'});
  for(const z of [-.3,-3.1]){
    box('track-ballast',[0,4.83,z],[58,.15,1.9],C.ballast,{floor:'platform'});
    for(let x=-28;x<29;x+=1.25)box('sleeper',[x,4.94,z],[.2,.1,1.7],C.concrete,{floor:'platform'});
    for(const offset of [-.52,.52])box('rail',[0,5.02,z+offset],[58,.11,.06],C.rail,{floor:'platform'});
  }
  // Platform screen barriers.
  for(let x=-18.5;x<19;x+=1.5){
    box('platform-screen-front',[x,5.65,1.35],[1.4,.9,.08],C.glass,{floor:'platform'});
    box('platform-screen-back',[x,5.65,-4.46],[1.4,.9,.08],C.glass,{floor:'platform'});
    box('platform-screen-frame',[x+.71,5.7,1.35],[.045,1,.11],C.dark,{floor:'platform'});
  }
  for(const x of [-16,-8,0,8,16]){
    box('roof-column-front',[x,6.3,4.85],[.15,2.4,.15],C.dark,{floor:'platform'});
    box('roof-column-back',[x,6.3,-7.3],[.15,2.4,.15],C.dark,{floor:'platform'});
    box('roof-beam',[x,7.42,-1.1],[.16,.18,12.7],C.concrete,{floor:'platform'});
  }
  for(const x of [-12,-3,6,15]){
    box('bench-front',[x,5.52,4.8],[1.7,.25,.6],C.mint,{floor:'platform'});
    box('bench-back',[x,5.72,5.05],[1.7,.5,.12],C.mint,{floor:'platform'});
  }
  box('station-sign',[0,7,5.25],[5,.65,.12],C.dark,{floor:'platform'});
  box('station-sign-inlay',[0,7.02,5.33],[3.9,.25,.035],C.white,{floor:'platform'});
  // Roof separated by toggle; roof panels are deliberately simple.
  for(const z of [-6.2,3.6])box('station-roof',[0,7.62,z],[41,.22,4.6],C.mint,{floor:'roof'});
  box('roof-link',[0,7.76,-1.1],[10,.18,5.1],C.edge,{floor:'roof'});
  // Train: three cars. Animation moves the group along the X axis.
  for(let car=0;car<3;car++){
    const x=(car-1)*7;
    const extra={floor:'platform',train:true};
    box('train-body',[x,6.05,-.3],[6.6,1.9,1.8],C.white,extra);
    box('train-stripe',[x,5.56,.61],[6.6,.22,.04],'#3d9980',extra);
    box('train-roof',[x,7.05,-.3],[6.65,.17,1.82],C.concrete,extra);
    box('train-undercarriage',[x,5.1,-.3],[5.5,.25,1.3],C.dark,extra);
    for(const wx of [-2.3,-.8,.8,2.3]){
      box('train-window',[x+wx,6.34,.61],[1.05,.64,.035],'#6b9d8c',extra);
      box('train-window-rear',[x+wx,6.34,-1.21],[1.05,.64,.035],'#6b9d8c',extra);
    }
    for(const dx of [-1.55,1.55])box('train-door',[x+dx,5.99,.635],[.45,1.45,.035],C.glass,extra);
  }
  box('train-cab',[10.07,6.25,-.3],[.09,1.05,1.4],C.dark,{floor:'platform',train:true});
  // Equipment meshes map directly to their data IDs.
  for(const d of DEVICES){
    const [x,y,z]=d.position;
    const extra={floor:d.floor,assetId:d.id};
    if(d.type==='escalator'){
      box(d.id+'-housing',[x,3.9,z],[2.7,.4,1.4],C.dark,{...extra,rotation:[0,0,x<0?.38:-.38]});
      for(let step=0;step<9;step++)box(d.id+'-step',[x-1.2+step*.3,3.2+step*.2,z],[.3,.16,1.1],C.mint,extra);
      for(const sz of [-.7,.7])box(d.id+'-handrail',[x,4.3,z+sz],[3,.12,.09],C.dark,{...extra,rotation:[0,0,.52]});
    }else if(d.type==='elevator'){
      box(d.id+'-shaft',[x,4.2,z],[1.7,2.9,1.7],C.glass,extra);
      box(d.id+'-door',[x,3.9,z+.87],[1.1,1.7,.05],C.mint,extra);
      box(d.id+'-frame',[x,5.76,z],[1.85,.15,1.85],C.dark,extra);
    }else if(d.type==='camera'){
      box(d.id+'-mount',[x,y-.25,z],[.05,.5,.05],C.dark,extra);
      box(d.id+'-camera',[x,y,z],[.45,.18,.2],C.white,extra);
      box(d.id+'-lens',[x+.24,y,z],[.04,.13,.15],C.dark,extra);
    }else box(d.id+'-sensor',[x,y-.17,z],[.4,.3,.24],C.white,extra);
    cyl(d.id+'-indicator',[x,y+.27,z],.09,.13,STATUS_COLORS[d.status],{...extra,indicator:true});
  }
  return items;
}

export function meshGeometry(shape='box'){
  const positions=[],normals=[];
  const tri=(a,b,c,n)=>{positions.push(...a,...b,...c);normals.push(...n,...n,...n)};
  if(shape==='cylinder'){
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,b=(i+1)*Math.PI/8,ax=Math.cos(a)*.5,az=Math.sin(a)*.5,bx=Math.cos(b)*.5,bz=Math.sin(b)*.5;
      const n=[Math.cos((a+b)/2),0,Math.sin((a+b)/2)];
      tri([ax,-.5,az],[bx,.5,bz],[bx,-.5,bz],n);tri([ax,-.5,az],[ax,.5,az],[bx,.5,bz],n);
      tri([0,.5,0],[bx,.5,bz],[ax,.5,az],[0,1,0]);tri([0,-.5,0],[ax,-.5,az],[bx,-.5,bz],[0,-1,0]);
    }
  }else{
    const faces=[[[1,0,0],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]],[[-1,0,0],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]],[[0,-1,0],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]],[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]];
    for(const [n,a,b,c,d] of faces){tri(a,b,c,n);tri(a,c,d,n)}
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals)};
}

export function toGLTF(items){
  const geometries=['box','cylinder'].map(meshGeometry);
  const chunks=[],bufferViews=[],accessors=[],materials=[],materialIds=new Map(),meshes=[];let offset=0;
  const add=(data)=>{const b=new Uint8Array(data.buffer);chunks.push(b);const index=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.byteLength,target:34962});offset+=b.byteLength;return index};
  for(const g of geometries){
    const count=g.positions.length/3;
    const positions=accessors.length;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<g.positions.length;i++){const k=i%3;min[k]=Math.min(min[k],g.positions[i]);max[k]=Math.max(max[k],g.positions[i])}
    accessors.push({bufferView:add(g.positions),componentType:5126,count,type:'VEC3',min,max});
    const normals=accessors.length;accessors.push({bufferView:add(g.normals),componentType:5126,count,type:'VEC3'});
    meshes.push({attributes:{POSITION:positions,NORMAL:normals}});
  }
  const uniqueMeshes=[],meshIds=new Map();
  const nodes=items.map(item=>{
    let material=materialIds.get(item.color);
    if(material===undefined){material=materials.length;materialIds.set(item.color,material);materials.push({name:item.color,pbrMetallicRoughness:{baseColorFactor:[...hex(item.color),1],metallicFactor:0,roughnessFactor:.85},doubleSided:true})}
    const kind=item.shape==='cylinder'?1:0,key=kind+':'+material;
    let mesh=meshIds.get(key);
    if(mesh===undefined){mesh=uniqueMeshes.length;meshIds.set(key,mesh);uniqueMeshes.push({primitives:[{...meshes[kind],material}]})}
    const n={name:item.name,mesh,translation:item.position,scale:item.size,extras:{floor:item.floor,assetId:item.assetId??null,simulated:true}};
    if(item.rotation){const [x,y,z]=item.rotation;const cx=Math.cos(x/2),cy=Math.cos(y/2),cz=Math.cos(z/2),sx=Math.sin(x/2),sy=Math.sin(y/2),sz=Math.sin(z/2);n.rotation=[sx*cy*cz+cx*sy*sz,cx*sy*cz-sx*cy*sz,cx*cy*sz+sx*sy*cz,cx*cy*cz-sx*sy*sz]}
    return n;
  });
  const all=new Uint8Array(offset);let at=0;for(const c of chunks){all.set(c,at);at+=c.length}
  let binary='';for(const b of all)binary+=String.fromCharCode(b);
  const base64=typeof btoa==='function'?btoa(binary):Buffer.from(all).toString('base64');
  return {asset:{version:'2.0',generator:'SIAM TWIN procedural modeller'},scene:0,scenes:[{name:'Siam station — fictional prototype',nodes:nodes.map((_,i)=>i)}],nodes,meshes:uniqueMeshes,materials,accessors,bufferViews,buffers:[{byteLength:offset,uri:'data:application/octet-stream;base64,'+base64}]};
}
export function hex(color){return [1,3,5].map(at=>parseInt(color.slice(at,at+2),16)/255)}
