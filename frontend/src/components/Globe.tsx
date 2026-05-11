import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useSatStore } from '../store/satelliteStore'
import { CAT_COLOR } from '../types'
import type { SatelliteDTO } from '../types'
import * as satellite from 'satellite.js'

const DAY_TEX_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'
const NIGHT_TEX_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg'
const DAY_TEX_FALLBACK = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const NIGHT_TEX_FALLBACK = 'https://unpkg.com/three-globe/example/img/earth-night.jpg'

const earthVert=`varying vec3 vWorldNormal;varying vec2 vUv;void main(){vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const earthFrag=`uniform sampler2D dayTexture;uniform sampler2D nightTexture;uniform vec3 sunDirection;varying vec3 vWorldNormal;varying vec2 vUv;void main(){vec4 day=texture2D(dayTexture,vUv);vec4 night=texture2D(nightTexture,vUv);float d=dot(normalize(vWorldNormal),normalize(sunDirection));float b=smoothstep(-0.15,0.3,d);float t=smoothstep(-0.05,0.05,d);vec3 tc=mix(vec3(0.9,0.4,0.15),day.rgb,t);gl_FragColor=mix(vec4(night.rgb*2.0,1.0),vec4(tc,1.0),b);}`

function geoToVec3(lat:number,lon:number,altKm:number):THREE.Vector3{
  const r=1+altKm/6371,phi=(90-lat)*Math.PI/180,th=lon*Math.PI/180
  return new THREE.Vector3(r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),-r*Math.sin(phi)*Math.sin(th))
}
function propagate(tle:{line1:string;line2:string},now:Date){
  try{
    const rec=satellite.twoline2satrec(tle.line1,tle.line2)
    const pv=satellite.propagate(rec,now)
    if(!pv.position||typeof pv.position==='boolean')return null
    const gmst=satellite.gstime(now),gd=satellite.eciToGeodetic(pv.position as any,gmst)
    const vel=pv.velocity as any
    return{lat:satellite.degreesLat(gd.latitude),lon:satellite.degreesLong(gd.longitude),alt:gd.height,vel:Math.sqrt(vel.x**2+vel.y**2+vel.z**2),vx:vel.x,vy:vel.y,vz:vel.z}
  }catch{return null}
}
function getSunLatLon(d:Date){
  const JD=d.getTime()/86400000+2440587.5,n=JD-2451545
  const L=(280.46+0.9856474*n)%360,g=((357.528+0.9856003*n)%360)*Math.PI/180
  const lam=(L+1.915*Math.sin(g)+0.02*Math.sin(2*g))*Math.PI/180,eps=23.439*Math.PI/180
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam)),dec=Math.asin(Math.sin(eps)*Math.sin(lam))
  const GMST=((280.46061837+360.98564736629*n)%360)*Math.PI/180
  let lon=(ra-GMST)*180/Math.PI;lon=((lon%360)+540)%360-180
  return{lat:dec*180/Math.PI,lon}
}
// CORRECTION : On base la direction du soleil sur les coordonnées ECEF (Terrestres) pour que le shader tourne avec l'heure !
function getSunDir(d:Date):THREE.Vector3{
  const sl = getSunLatLon(d);
  return geoToVec3(sl.lat, sl.lon, 0).normalize();
}
function getMoonLatLon(d:Date){
  const JD=d.getTime()/86400000+2440587.5,n=JD-2451545
  const L=(218.316+13.176396*n)%360,M=((134.963+13.064993*n)%360)*Math.PI/180,F=((93.272+13.229350*n)%360)*Math.PI/180
  const lam=(L+6.289*Math.sin(M))*Math.PI/180,beta=5.128*Math.sin(F)*Math.PI/180,eps=23.439*Math.PI/180
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lam)-Math.tan(beta)*Math.sin(eps),Math.cos(lam))
  const dec=Math.asin(Math.sin(beta)*Math.cos(eps)+Math.cos(beta)*Math.sin(eps)*Math.sin(lam))
  const GMST=((280.46061837+360.98564736629*n)%360)*Math.PI/180
  let lon=(ra-GMST)*180/Math.PI;lon=((lon%360)+540)%360-180
  return{lat:dec*180/Math.PI,lon}
}
function buildCoverageGroup(satPos:THREE.Vector3,lat:number,lon:number,altKm:number,color:THREE.Color):THREE.Group{
  const g=new THREE.Group(),R=6371,angle=Math.acos(R/(R+altKm)),N=128
  const sc=geoToVec3(lat,lon,0).normalize(),t=new THREE.Vector3(0,1,0).cross(sc).normalize()
  const pts:THREE.Vector3[]=[],dv:number[]=[],dc=sc.clone().normalize().multiplyScalar(1.0005)
  for(let i=0;i<=N;i++){const th=(i/N)*Math.PI*2;pts.push(sc.clone().multiplyScalar(Math.cos(angle)).add(t.clone().applyAxisAngle(sc,th).multiplyScalar(Math.sin(angle))).normalize().multiplyScalar(1.001))}
  for(let i=0;i<N;i++){const t1=(i/N)*Math.PI*2,t2=((i+1)/N)*Math.PI*2;const p1=sc.clone().multiplyScalar(Math.cos(angle)).add(t.clone().applyAxisAngle(sc,t1).multiplyScalar(Math.sin(angle))).normalize().multiplyScalar(1.001);const p2=sc.clone().multiplyScalar(Math.cos(angle)).add(t.clone().applyAxisAngle(sc,t2).multiplyScalar(Math.sin(angle))).normalize().multiplyScalar(1.001);dv.push(dc.x,dc.y,dc.z,p1.x,p1.y,p1.z,p2.x,p2.y,p2.z)}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dv,3))
  g.add(new THREE.Mesh(dg,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.08,side:THREE.DoubleSide,depthWrite:false})))
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:0.35})))
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([satPos,sc.clone().normalize().multiplyScalar(1.001)]),new THREE.LineBasicMaterial({color,transparent:true,opacity:0.5})))
  return g
}

const CAT_RGB:Record<string,[number,number,number]>={
  station:   [0.00,1.00,0.80],
  gps:       [0.00,1.00,0.53],
  weather:   [1.00,0.33,1.00],
  science:   [1.00,0.93,0.27],
  starlink:  [0.33,0.67,1.00],
  telephonie:[1.00,0.53,1.00],
  debris:    [1.00,0.20,0.00], // Ajout d'une couleur pour les débris traqués
  unknown:   [1.00,1.00,1.00],
}

type CatPoints={points:THREE.Points;sats:SatelliteDTO[];posArr:Float32Array;geo:THREE.BufferGeometry}

export interface GlobeHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

const Globe = forwardRef<GlobeHandle, {
  preloadedSats?:SatelliteDTO[];
  showDebrisCloud?:boolean;
  reentryMode?:boolean;
  reentryList?:any[];
  autoRotate?:boolean;
  liteMode?:boolean;
  satSize?:'small'|'medium'|'large';
  showAtmosphere?:boolean;
  showGrid?:boolean;
}>(function Globe({
  preloadedSats,showDebrisCloud=false,reentryMode=false,reentryList=[],
  autoRotate=true,liteMode=false,satSize='small',showAtmosphere=true,showGrid=true
}, ref){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const sceneRef=useRef<THREE.Scene|null>(null)
  const rendererRef=useRef<THREE.WebGLRenderer|null>(null)
  const cameraRef=useRef<THREE.PerspectiveCamera|null>(null)
  const sphRef=useRef({theta:0.4,phi:1.2,r:6.0})
  const animTargetRef=useRef<{theta:number;phi:number;r:number}|null>(null)

  useImperativeHandle(ref, () => ({
    zoomIn:  () => { animTargetRef.current = { ...sphRef.current, r: Math.max(1.8, sphRef.current.r - 1.2) } },
    zoomOut: () => { animTargetRef.current = { ...sphRef.current, r: Math.min(12,  sphRef.current.r + 1.2) } },
    reset:   () => { animTargetRef.current = { theta: 0.4, phi: 1.2, r: 6.0 } },
  }))
  const earthUniformsRef=useRef<any>(null)
  const sunLightRef=useRef<THREE.DirectionalLight|null>(null)
  const sunMoonRef=useRef<THREE.Group|null>(null)
  const debrisCloudRef=useRef<THREE.Points|null>(null)
  const reentryVizRef=useRef<THREE.Group|null>(null) // Réf pour l'effet visuel des rentrées
  const orbitLineRef=useRef<THREE.Line|null>(null)
  const coverageRef=useRef<THREE.Group|null>(null)
  const conjVizRef=useRef<THREE.Group|null>(null)
  const groundTrackRef=useRef<THREE.Group|null>(null)
  const userMarkerRef=useRef<THREE.Group|null>(null)
  const visibleRingsRef=useRef<THREE.Group|null>(null)
  const padMarkerRef=useRef<THREE.Sprite|null>(null)
  const alertPointsRef=useRef<THREE.Points|null>(null)
  const atmosphereRef=useRef<THREE.Mesh|null>(null)
  const gridGroupRef=useRef<THREE.Group|null>(null)
  const starsRef=useRef<THREE.Points|null>(null)
  const autoRotateRef=useRef(autoRotate)
  const satSizeRef=useRef(satSize)

  const catPointsRef=useRef<Map<string,CatPoints>>(new Map())
  const localPosRef=useRef<Record<string,{lat:number;lon:number;alt:number;vx:number;vy:number;vz:number}>>({})

  const{satellites,activeFilters,selectedNorad,selectSat,updatePosition,target,conjunctionPair,userPosition,visibleNorads,alertMode,alertNoradColors}=useSatStore()

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return
    const W=canvas.clientWidth,H=canvas.clientHeight
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(W,H)
    rendererRef.current=renderer
    const scene=new THREE.Scene();sceneRef.current=scene
    const camera=new THREE.PerspectiveCamera(45,W/H,0.01,1000);cameraRef.current=camera

    const sp:number[]=[]
    for(let i=0;i<8000;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(80+Math.random()*120);sp.push(v.x,v.y,v.z)}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3))
    const starPts=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.08,transparent:true,opacity:0.8}))
    starsRef.current=starPts;scene.add(starPts)

    const gridGroup=new THREE.Group();gridGroupRef.current=gridGroup;scene.add(gridGroup)
    const gmat=new THREE.LineBasicMaterial({color:0x1a4060,transparent:true,opacity:0.15}),GR=1.002
    for(let lat=-60;lat<=60;lat+=30){const pts:THREE.Vector3[]=[],phi=(90-lat)*Math.PI/180;for(let i=0;i<=64;i++){const th=(i/64)*2*Math.PI;pts.push(new THREE.Vector3(GR*Math.sin(phi)*Math.cos(th),GR*Math.cos(phi),-GR*Math.sin(phi)*Math.sin(th)))}gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gmat))}
    for(let lon=0;lon<360;lon+=30){const pts:THREE.Vector3[]=[],th=lon*Math.PI/180;for(let i=0;i<=64;i++){const phi=(i/64)*Math.PI;pts.push(new THREE.Vector3(GR*Math.sin(phi)*Math.cos(th),GR*Math.cos(phi),-GR*Math.sin(phi)*Math.sin(th)))}gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gmat))}

    const sd=getSunDir(new Date())
    const uniforms={dayTexture:{value:new THREE.Texture()},nightTexture:{value:new THREE.Texture()},sunDirection:{value:sd}}
    earthUniformsRef.current=uniforms
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,64),new THREE.ShaderMaterial({uniforms,vertexShader:earthVert,fragmentShader:earthFrag})))
    const atmoMesh=new THREE.Mesh(new THREE.SphereGeometry(1.015,64,64),new THREE.ShaderMaterial({vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 vN;void main(){float i=pow(0.6-dot(vN,vec3(0,0,1)),2.0);gl_FragColor=vec4(0.1,0.4,1.0,1.0)*i*0.8;}`,transparent:true,side:THREE.FrontSide,depthWrite:false}))
    atmosphereRef.current=atmoMesh;scene.add(atmoMesh)
    const sunLight=new THREE.DirectionalLight(0xfff5e0,2.0);sunLight.position.copy(sd.clone().multiplyScalar(10));sunLightRef.current=sunLight;scene.add(sunLight);scene.add(new THREE.AmbientLight(0x112233,0.4))
    const tl=new THREE.TextureLoader()
    tl.crossOrigin='anonymous'
    const applyTex=(tex:THREE.Texture,uniform:{value:THREE.Texture})=>{
      tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.colorSpace=THREE.SRGBColorSpace;uniform.value=tex
    }
    const loadTex=(url:string,fallback:string,uniform:{value:THREE.Texture})=>{
      tl.load(url,(tex)=>applyTex(tex,uniform),undefined,()=>{
        tl.load(fallback,(tex)=>applyTex(tex,uniform),undefined,()=>{})
      })
    }
    loadTex(DAY_TEX_URL,DAY_TEX_FALLBACK,uniforms.dayTexture)
    loadTex(NIGHT_TEX_URL,NIGHT_TEX_FALLBACK,uniforms.nightTexture)

    const sunGroup=new THREE.Group();sunMoonRef.current=sunGroup;scene.add(sunGroup)
    const now=new Date(),sun=getSunLatLon(now),moon=getMoonLatLon(now)
    const sv=geoToVec3(sun.lat,sun.lon,0).normalize().multiplyScalar(18),mv=geoToVec3(moon.lat,moon.lon,0).normalize().multiplyScalar(5)
    const sunTex=tl.load('/sun/textures/material_baseColor.jpeg')
    const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(0.35,32,32),new THREE.MeshStandardMaterial({map:sunTex,emissiveMap:sunTex,emissive:new THREE.Color(0xff4400),emissiveIntensity:2.5,roughness:1,metalness:0}))
    sunMesh.position.copy(sv);sunGroup.add(sunMesh)
    const gc=document.createElement('canvas');gc.width=128;gc.height=128
    const gctx=gc.getContext('2d')!;const gg=gctx.createRadialGradient(64,64,10,64,64,60)
    gg.addColorStop(0,'rgba(255,200,50,0.6)');gg.addColorStop(0.4,'rgba(255,100,0,0.3)');gg.addColorStop(1,'rgba(0,0,0,0)')
    gctx.fillStyle=gg;gctx.fillRect(0,0,128,128)
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gc),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}))
    glow.position.copy(sv);glow.scale.set(1.2,1.2,1);sunGroup.add(glow)
    new GLTFLoader().load('/moon/scene.gltf',(gltf:any)=>{const m=gltf.scene;m.position.copy(mv);m.scale.set(0.08,0.08,0.08);sunGroup.add(m)},undefined,()=>{
      const ms=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gc),transparent:true,depthWrite:false}))
      ms.position.copy(mv);ms.scale.set(0.6,0.6,1);sunGroup.add(ms)
    })

    let isDrag=false,lastX=0,lastY=0
    const updateCamera=()=>{const{theta,phi,r}=sphRef.current;camera.position.set(r*Math.sin(phi)*Math.sin(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.cos(theta));camera.lookAt(0,0,0)}
    updateCamera()
    const onMove=(e:MouseEvent)=>{isDrag=true;const dx=(e.clientX-lastX)*0.005,dy=(e.clientY-lastY)*0.005;sphRef.current.theta-=dx;sphRef.current.phi=Math.max(0.1,Math.min(Math.PI-0.1,sphRef.current.phi-dy));lastX=e.clientX;lastY=e.clientY;updateCamera()}
    const onUp=(e:MouseEvent)=>{
      canvas.removeEventListener('mousemove',onMove);canvas.removeEventListener('mouseup',onUp)
      if(!isDrag){
        const rect=canvas.getBoundingClientRect(),mx=((e.clientX-rect.left)/rect.width)*2-1,my=-((e.clientY-rect.top)/rect.height)*2+1
        const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(mx,my),camera)
        if(debrisCloudRef.current?.visible){ray.params.Points={threshold:0.02};const hits=ray.intersectObject(debrisCloudRef.current);if(hits.length>0){const idx=hits[0].index??-1;const items=debrisCloudRef.current.userData.items;if(idx>=0&&items?.[idx]){;(window as any).__onDebrisClick?.(items[idx]);return}}}
        if(alertPointsRef.current?.visible){ray.params.Points={threshold:0.03};const hits=ray.intersectObject(alertPointsRef.current);if(hits.length>0){const idx=hits[0].index??-1;const sats=alertPointsRef.current.userData.alertSats;if(idx>=0&&sats?.[idx]){;(window as any).__onAlertSatClick?.(sats[idx].norad);return}}}
        ray.params.Points={threshold:0.015}
        for(const[,cp] of catPointsRef.current){
          if(!cp.points.visible)continue
          const hits=ray.intersectObject(cp.points)
          if(hits.length>0){const idx=hits[0].index??-1;if(idx>=0&&cp.sats[idx]){selectSat(cp.sats[idx].norad);return}}
        }
      }
    }
    canvas.addEventListener('mousedown',e=>{isDrag=false;lastX=e.clientX;lastY=e.clientY;canvas.addEventListener('mousemove',onMove);canvas.addEventListener('mouseup',onUp)})
    canvas.addEventListener('wheel',e=>{sphRef.current.r=Math.max(1.3,Math.min(30,sphRef.current.r+e.deltaY*0.005));updateCamera()})
    const ro=new ResizeObserver(()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix()})
    ro.observe(canvas)

    let raf=0,frame=0
    const animate=()=>{
      raf=requestAnimationFrame(animate);frame++
      if(!isDrag&&!animTargetRef.current&&autoRotateRef.current)sphRef.current.theta+=0.00003
      if(animTargetRef.current){const t=animTargetRef.current,spd=0.08;sphRef.current.theta+=(t.theta-sphRef.current.theta)*spd;sphRef.current.phi+=(t.phi-sphRef.current.phi)*spd;sphRef.current.r+=(t.r-sphRef.current.r)*spd;if(Math.abs(t.theta-sphRef.current.theta)<0.001&&Math.abs(t.phi-sphRef.current.phi)<0.001)animTargetRef.current=null}
      if(frame%60===0){
        const newSd=getSunDir(new Date()) // Utilise le ECEF corrigé !
        if(earthUniformsRef.current)earthUniformsRef.current.sunDirection.value.copy(newSd)
        if(sunLightRef.current)sunLightRef.current.position.copy(newSd.clone().multiplyScalar(10))
      }
      if(debrisCloudRef.current?.visible)debrisCloudRef.current.rotation.y+=0.000005
      if(reentryVizRef.current)reentryVizRef.current.rotation.y+=0.0005 // Petite animation
      updateCamera();renderer.render(scene,camera)
    }
    animate()
    return()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.dispose()}
  },[])

  useEffect(()=>{ autoRotateRef.current=autoRotate },[autoRotate])
  useEffect(()=>{ satSizeRef.current=satSize },[satSize])
  useEffect(()=>{ if(atmosphereRef.current)atmosphereRef.current.visible=showAtmosphere },[showAtmosphere])
  useEffect(()=>{ if(gridGroupRef.current)gridGroupRef.current.visible=showGrid },[showGrid])
  useEffect(()=>{
    const mul=satSize==='large'?2.5:satSize==='medium'?1.6:1
    catPointsRef.current.forEach(cp=>{
      const mat=cp.points.material as THREE.PointsMaterial
      const base=cp.points.userData.isDebris?0.025:0.012
      mat.size=base*mul;mat.needsUpdate=true
    })
  },[satSize])
  useEffect(()=>{
    if(liteMode){
      if(atmosphereRef.current)atmosphereRef.current.visible=false
      if(starsRef.current)starsRef.current.visible=false
      if(sunMoonRef.current)sunMoonRef.current.visible=false
    }else{
      if(atmosphereRef.current)atmosphereRef.current.visible=showAtmosphere
      if(starsRef.current)starsRef.current.visible=true
      if(sunMoonRef.current)sunMoonRef.current.visible=true
    }
  },[liteMode,showAtmosphere])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    const sats=preloadedSats&&preloadedSats.length>0?preloadedSats:satellites
    if(sats.length===0)return

    catPointsRef.current.forEach(cp=>{scene.remove(cp.points);cp.geo.dispose()})
    catPointsRef.current.clear()

    const byCat:Record<string,SatelliteDTO[]>={}
    sats.forEach(s=>{const c=s.category||'unknown';if(!byCat[c])byCat[c]=[];byCat[c].push(s)})

    Object.entries(byCat).forEach(([cat,catSats])=>{
      const n=catSats.length
      const posArr=new Float32Array(n*3)
      const colArr=new Float32Array(n*3)
      const rgb=CAT_RGB[cat]??[1,1,1]

      catSats.forEach((sat:any,i)=>{
        if(sat._pos){
          const v=geoToVec3(sat._pos.lat,sat._pos.lon,sat._pos.alt)
          posArr[i*3]=v.x;posArr[i*3+1]=v.y;posArr[i*3+2]=v.z
          localPosRef.current[sat.norad]=sat._pos
        }
        colArr[i*3]=rgb[0];colArr[i*3+1]=rgb[1];colArr[i*3+2]=rgb[2]
      })

      const geo=new THREE.BufferGeometry()
      geo.setAttribute('position',new THREE.BufferAttribute(posArr,3).setUsage(THREE.DynamicDrawUsage))
      geo.setAttribute('color',new THREE.BufferAttribute(colArr,3))

      // Highlight les débris que tu tracks spécifiquement
      const isDebris = cat === 'debris';
      const mat=new THREE.PointsMaterial({size:isDebris ? 0.025 : 0.012,vertexColors:true,transparent:true,opacity:0.9,sizeAttenuation:true,depthWrite:false})
      const points=new THREE.Points(geo,mat)
      
      // LOGIQUE REENTRY: masque tout sauf la catégorie debris (tes debris selectionnés) quand actif
      points.visible = reentryMode ? isDebris : activeFilters.has(cat as any)
      scene.add(points)
      catPointsRef.current.set(cat,{points,sats:catSats,posArr,geo})
    })
  },[preloadedSats,satellites, reentryMode])

  useEffect(()=>{
    const sats=preloadedSats&&preloadedSats.length>0?preloadedSats:satellites
    if(sats.length===0)return
    const worker=new Worker('/propagate.worker.js')

    const doUpdate=()=>{
      // Send only norad+tle — avoids serializing 10MB of full objects every tick
      const slim=[...catPointsRef.current.values()].flatMap(cp=>
        cp.sats.map((s:any)=>({norad:s.norad,tle:s.tle}))
      )
      worker.postMessage({sats:slim,timestamp:Date.now()})
    }

    worker.onmessage=(e:MessageEvent)=>{
      const results=e.data
      if(!results||!Object.keys(results).length)return

      catPointsRef.current.forEach(cp=>{
        let changed=false
        cp.sats.forEach((sat,i)=>{
          const pos=results[sat.norad];if(!pos)return
          const v=geoToVec3(pos.lat,pos.lon,pos.alt)
          cp.posArr[i*3]=v.x;cp.posArr[i*3+1]=v.y;cp.posArr[i*3+2]=v.z
          localPosRef.current[sat.norad]=pos
          changed=true
        })
        if(changed)cp.geo.attributes.position.needsUpdate=true
      })
      const sel=(window as any).__selectedNorad as string|undefined
      if(sel&&results[sel])updatePosition(sel,results[sel])
    }

    setTimeout(doUpdate,2000)
    const interval=setInterval(doUpdate,60000) // 60s — visually indistinguishable from 30s at globe scale
    return()=>{clearInterval(interval);worker.terminate()}
  },[preloadedSats,satellites])

  useEffect(()=>{
    catPointsRef.current.forEach(({points},cat)=>{
      points.visible = reentryMode ? (cat === 'debris') : alertMode ? false : activeFilters.has(cat as any)
    })
  },[activeFilters, reentryMode, alertMode])

  useEffect(()=>{
    ;(window as any).__selectedNorad=selectedNorad
    const scene=sceneRef.current;if(!scene)return
    if(orbitLineRef.current){scene.remove(orbitLineRef.current);orbitLineRef.current=null}
    if(coverageRef.current){scene.remove(coverageRef.current);coverageRef.current=null}
    if(!selectedNorad)return
    const sat=[...catPointsRef.current.values()].flatMap(cp=>cp.sats).find((s:any)=>s.norad===selectedNorad)
    if(!sat)return
    const now=new Date()
    try{
      const rec=satellite.twoline2satrec(sat.tle.line1,sat.tle.line2),period=(2*Math.PI/rec.no)*60000
      const pts:THREE.Vector3[]=[],N=180
      for(let i=0;i<=N;i++){const d=new Date(now.getTime()+(i/N)*period);const pv=satellite.propagate(rec,d);if(!pv.position||typeof pv.position==='boolean')continue;const gmst=satellite.gstime(d),gd=satellite.eciToGeodetic(pv.position as any,gmst);pts.push(geoToVec3(satellite.degreesLat(gd.latitude),satellite.degreesLong(gd.longitude),gd.height))}
      if(pts.length>1){orbitLineRef.current=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:new THREE.Color(CAT_COLOR[sat.category]??(sat.category==='debris'?'#ff4400':'#fff')),transparent:true,opacity:0.6}));scene.add(orbitLineRef.current)}
    }catch{ /* skip invalid TLE */ }
    const pos=propagate(sat.tle,now)
    if(pos){const col=new THREE.Color(CAT_COLOR[sat.category]??(sat.category==='debris'?'#ff4400':'#fff'));coverageRef.current=buildCoverageGroup(geoToVec3(pos.lat,pos.lon,pos.alt),pos.lat,pos.lon,pos.alt,col);scene.add(coverageRef.current);animTargetRef.current={phi:(90-pos.lat)*Math.PI/180,theta:(pos.lon)*Math.PI/180+Math.PI/2,r:2.2}}
  },[selectedNorad])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(conjVizRef.current){scene.remove(conjVizRef.current);conjVizRef.current=null}
    if(!conjunctionPair){animTargetRef.current=null;return}
    const allSats=[...catPointsRef.current.values()].flatMap(cp=>cp.sats)
    const satA=allSats.find((s:any)=>s.norad===conjunctionPair.noradA),satB=allSats.find((s:any)=>s.norad===conjunctionPair.noradB)
    if(!satA||!satB)return
    const now=new Date(),posA=propagate(satA.tle,now),posB=propagate(satB.tle,now)
    if(!posA||!posB)return
    const vA=geoToVec3(posA.lat,posA.lon,posA.alt),vB=geoToVec3(posB.lat,posB.lon,posB.alt),mid=vA.clone().add(vB).multiplyScalar(0.5)
    const g=new THREE.Group()
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([vA,vB]),new THREE.LineBasicMaterial({color:0xff3355,transparent:true,opacity:0.9})))
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(vA.distanceTo(vB)/2,16,16),new THREE.MeshBasicMaterial({color:0xff3355,transparent:true,opacity:0.08,wireframe:true}))
    sphere.position.copy(mid);g.add(sphere)
    const midLat=Math.asin(mid.y/mid.length())*180/Math.PI,midLon=Math.atan2(-mid.z,mid.x)*180/Math.PI
    animTargetRef.current={phi:(90-midLat)*Math.PI/180,theta:midLon*Math.PI/180,r:Math.max(1.5,vA.distanceTo(vB)*8)}
    scene.add(g);conjVizRef.current=g
  },[conjunctionPair])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(padMarkerRef.current){scene.remove(padMarkerRef.current);padMarkerRef.current=null}
    if(!target)return
    const v=geoToVec3(target.lat,target.lon,0).normalize().multiplyScalar(1.012)
    const c2=document.createElement('canvas');c2.width=64;c2.height=64
    const ctx=c2.getContext('2d')!;ctx.strokeStyle='#ff4444';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,16);ctx.lineTo(32,48);ctx.stroke();ctx.beginPath();ctx.moveTo(16,32);ctx.lineTo(48,32);ctx.stroke()
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c2),transparent:true,depthWrite:false}))
    sprite.position.copy(v);sprite.scale.set(0.06,0.06,1);scene.add(sprite);padMarkerRef.current=sprite
    animTargetRef.current={phi:(90-target.lat)*Math.PI/180,theta:target.lon*Math.PI/180,r:1.8}
  },[target])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(userMarkerRef.current){scene.remove(userMarkerRef.current);userMarkerRef.current=null}
    if(visibleRingsRef.current){scene.remove(visibleRingsRef.current);visibleRingsRef.current=null}
    if(!userPosition)return
    const g=new THREE.Group()
    const mp=geoToVec3(userPosition.lat,userPosition.lon,0).normalize().multiplyScalar(1.012)
    ;[[0.018,0.026,0.9],[0.034,0.040,0.4],[0.052,0.057,0.2]].forEach(([r1,r2,op])=>{const m=new THREE.Mesh(new THREE.RingGeometry(r1,r2,32),new THREE.MeshBasicMaterial({color:0x00ff88,transparent:true,opacity:op,side:THREE.DoubleSide}));m.position.copy(mp);m.lookAt(0,0,0);g.add(m)})
    const dot=new THREE.Mesh(new THREE.CircleGeometry(0.010,16),new THREE.MeshBasicMaterial({color:0x00ff88,side:THREE.DoubleSide}));dot.position.copy(mp);dot.lookAt(0,0,0);g.add(dot)
    const tip=mp.clone().add(mp.clone().normalize().multiplyScalar(0.12));g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([mp.clone(),tip]),new THREE.LineBasicMaterial({color:0x00ff88,transparent:true,opacity:0.7})))
    scene.add(g);userMarkerRef.current=g
    if(!visibleNorads.length)return
    const rg=new THREE.Group()
    visibleNorads.forEach((norad:string,idx:number)=>{
      const pos=localPosRef.current[norad];if(!pos)return
      const sv=geoToVec3(pos.lat,pos.lon,pos.alt)
      const ring=new THREE.Mesh(new THREE.RingGeometry(0.028,0.040,32),new THREE.MeshBasicMaterial({color:0x00ff88,transparent:true,opacity:0.85,side:THREE.DoubleSide}))
      ring.position.copy(sv);ring.lookAt(0,0,0);rg.add(ring)
      rg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([mp.clone(),sv]),new THREE.LineBasicMaterial({color:0x00ff88,transparent:true,opacity:idx===0?0.5:0.15})))
    })
    scene.add(rg);visibleRingsRef.current=rg
  },[userPosition,visibleNorads])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(groundTrackRef.current){scene.remove(groundTrackRef.current);groundTrackRef.current=null}
    if(!selectedNorad)return
    const tleStore=(window as any).__tleStore as Record<string,[string,string]>|undefined
    if(!tleStore?.[selectedNorad])return
    const[t1,t2]=tleStore[selectedNorad]
    try{
      const rec=satellite.twoline2satrec(t1,t2),now=Date.now(),period=(2*Math.PI/rec.no)*60000
      const duration=Math.min(period*1.5,5400000),step=60000
      const g=new THREE.Group();let pts:THREE.Vector3[]=[],prevLon:number|null=null
      for(let t=0;t<=duration;t+=step){const d=new Date(now+t),pv=satellite.propagate(rec,d);if(!pv.position||typeof pv.position==='boolean')continue;const gmst=satellite.gstime(d),gd=satellite.eciToGeodetic(pv.position as any,gmst);const lat=satellite.degreesLat(gd.latitude),lon=satellite.degreesLong(gd.longitude);if(prevLon!==null&&Math.abs(lon-prevLon)>180){if(pts.length>1)g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...pts]),new THREE.LineBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.5})));pts=[]}pts.push(geoToVec3(lat,lon,gd.height).normalize().multiplyScalar(1.003));prevLon=lon}
      if(pts.length>1)g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...pts]),new THREE.LineBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.5})))
      scene.add(g);groundTrackRef.current=g
    }catch{ /* skip invalid TLE */ }
  },[selectedNorad])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(!showDebrisCloud){if(debrisCloudRef.current)debrisCloudRef.current.visible=false;return}
    if(debrisCloudRef.current){debrisCloudRef.current.visible=true;return}
    fetch('http://localhost:8080/api/debris/with-tle?limit=4881').then(r=>r.json()).then(data=>{
      const items=data.items||[],now=new Date(),pos:number[]=[],col:number[]=[],valid:any[]=[]
      items.forEach((d:any)=>{try{const rec=satellite.twoline2satrec(d.tle.line1,d.tle.line2),pv=satellite.propagate(rec,now);if(!pv.position||typeof pv.position==='boolean')return;const gmst=satellite.gstime(now),gd=satellite.eciToGeodetic(pv.position as any,gmst);const lat=satellite.degreesLat(gd.latitude),lon=satellite.degreesLong(gd.longitude),alt=gd.height,r=1+alt/6371,phi=(90-lat)*Math.PI/180,th=lon*Math.PI/180;pos.push(r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),-r*Math.sin(phi)*Math.sin(th));if(d.reentry){col.push(1,0.15,0)}else{col.push(1,0.55,0.15)};valid.push(d)}catch{/* skip */}})
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3))
      const cloud=new THREE.Points(geo,new THREE.PointsMaterial({size:0.010,vertexColors:true,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false}))
      cloud.userData.items=valid;scene.add(cloud);debrisCloudRef.current=cloud
    }).catch(console.error)
  },[showDebrisCloud])

  // ── EFFET VISUEL REENTRY (Affiche la liste en gros points rouges) ─────────────
  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(reentryVizRef.current){scene.remove(reentryVizRef.current);reentryVizRef.current=null}
    if(!reentryMode || !reentryList.length) return
    const g=new THREE.Group(),now=new Date()
    reentryList.forEach((d:any)=>{
      if(!d.tle) return
      try{
        const rec=satellite.twoline2satrec(d.tle.line1,d.tle.line2),pv=satellite.propagate(rec,now)
        if(!pv.position||typeof pv.position==='boolean')return
        const gmst=satellite.gstime(now),gd=satellite.eciToGeodetic(pv.position as any,gmst)
        const v=geoToVec3(satellite.degreesLat(gd.latitude),satellite.degreesLong(gd.longitude),gd.height)
        
        // Cible rouge pour les débris
        const ring=new THREE.Mesh(new THREE.RingGeometry(0.04,0.05,32),new THREE.MeshBasicMaterial({color:0xff2200,side:THREE.DoubleSide,transparent:true,opacity:0.8}))
        ring.position.copy(v);ring.lookAt(0,0,0);g.add(ring)
        const dot=new THREE.Mesh(new THREE.CircleGeometry(0.015,16),new THREE.MeshBasicMaterial({color:0xffffff}));dot.position.copy(v);dot.lookAt(0,0,0);g.add(dot)
      }catch{ /* skip invalid TLE */ }
    })
    scene.add(g);reentryVizRef.current=g
  },[reentryMode, reentryList])

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return
    if(alertPointsRef.current){scene.remove(alertPointsRef.current);alertPointsRef.current=null}
    if(!alertMode||!Object.keys(alertNoradColors).length)return
    const allSats=[...catPointsRef.current.values()].flatMap(cp=>cp.sats)
    const pos:number[]=[],col:number[]=[],valid:SatelliteDTO[]=[]
    allSats.forEach(sat=>{
      if(!alertNoradColors[sat.norad])return
      const p=localPosRef.current[sat.norad];if(!p)return
      const v=geoToVec3(p.lat,p.lon,p.alt)
      pos.push(v.x,v.y,v.z)
      const c=new THREE.Color(alertNoradColors[sat.norad])
      col.push(c.r,c.g,c.b)
      valid.push(sat)
    })
    if(!pos.length)return
    const geo=new THREE.BufferGeometry()
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3))
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3))
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:0.04,vertexColors:true,transparent:true,opacity:1,sizeAttenuation:true,depthWrite:false}))
    pts.userData.alertSats=valid
    scene.add(pts);alertPointsRef.current=pts
  },[alertMode,alertNoradColors])

  return <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%',cursor:'grab'}} />
})

export default Globe