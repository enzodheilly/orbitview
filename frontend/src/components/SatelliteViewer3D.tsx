import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CAT_COLOR } from '../types'
import { useSatStore } from '../store/satelliteStore'

interface Props { category: string; name: string; norad?: string }

function getFlag(countryCode: string | undefined) {
  if (!countryCode) return '🛰️';
  const code = countryCode.toUpperCase().trim();
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'USA': '🇺🇸', 'CAN': '🇨🇦', 'BRA': '🇧🇷', 'BR': '🇧🇷', 'MEX': '🇲🇽',
    'FR': '🇫🇷', 'FRA': '🇫🇷', 'GER': '🇩🇪', 'DEU': '🇩🇪', 'UK': '🇬🇧', 'GBR': '🇬🇧',
    'IT': '🇮🇹', 'ITA': '🇮🇹', 'SPN': '🇪🇸', 'ESP': '🇪🇸', 'ESA': '🇪🇺', 'EU': '🇪🇺',
    'EUME': '🇪🇺', 'NETH': '🇳🇱', 'NLD': '🇳🇱', 'SWED': '🇸🇪', 'SWE': '🇸🇪',
    'PRC': '🇨🇳', 'CN': '🇨🇳', 'JPN': '🇯🇵', 'JP': '🇯🇵', 'IND': '🇮🇳', 'IN': '🇮🇳',
    'KR': '🇰🇷', 'KOR': '🇰🇷', 'KP': '🇰🇵', 'PRK': '🇰🇵', 'AUS': '🇦🇺',
    'ISRA': '🇮🇱', 'ISR': '🇮🇱', 'CIS': '🇷🇺', 'RU': '🇷🇺', 'RUS': '🇷🇺', 'SU': '🇷🇺', 'RSU': '🇷🇺',
    'IRAN': '🇮🇷', 'IRN': '🇮🇷', 'ARGN': '🇦🇷', 'TURK': '🇹🇷',
  };
  return flags[code] || '🏳️';
}

// Calcule l'âge du satellite depuis son lancement
function getLaunchAge(satellite: any) {
  const dateStr = satellite?.launch_date || satellite?.launchDate;
  
  if (!dateStr || dateStr.startsWith('0000') || dateStr === 'null') return 'UNKNOWN';

  const launch = new Date(dateStr);
  const now = new Date();

  if (isNaN(launch.getTime())) return 'UNKNOWN';

  const diffInMs = now.getTime() - launch.getTime();

  if (diffInMs < -86400000) return 'SCHEDULED';

  const days = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
  
  if (days <= 1) return 'NEWLY LAUNCHED';

  const years = Math.floor(days / 365.25);
  const months = Math.floor((days % 365.25) / 30.44);

  if (years > 0) return `${years}Y ${months}M`;
  if (months > 0) return `${months}M ${days % 30}D`;
  return `${days} DAYS`;
}

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, px=0,py=0,pz=0,rx=0,ry=0,rz=0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(px,py,pz); m.rotation.set(rx,ry,rz); group.add(m); return m
}

function buildModel(category: string, color: string): THREE.Group {
  const g = new THREE.Group(), c = new THREE.Color(color)
  const body  = new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, shininess: 60 })
  const panel = new THREE.MeshPhongMaterial({ color: 0x1133aa, emissive: 0x0022aa, emissiveIntensity: 0.4, side: THREE.DoubleSide })
  const panel2= new THREE.MeshPhongMaterial({ color: 0x112266, emissive: 0x001155, emissiveIntensity: 0.35, side: THREE.DoubleSide })
  const silver= new THREE.MeshPhongMaterial({ color: 0xaabbcc, shininess: 120 })
  const gold  = new THREE.MeshPhongMaterial({ color: 0xddaa44, emissive: 0x332200, emissiveIntensity: 0.2, shininess: 80 })
  const white = new THREE.MeshPhongMaterial({ color: 0xddeeff, shininess: 40 })
  if (category === 'station') {
    addMesh(g, new THREE.BoxGeometry(3.2,0.1,0.1), silver)
    addMesh(g, new THREE.CylinderGeometry(0.22,0.22,0.7,12), white, 0,0,0,Math.PI/2)
    addMesh(g, new THREE.CylinderGeometry(0.17,0.17,0.55,10), gold, 0.5,0,0,0,0,Math.PI/2)
    addMesh(g, new THREE.CylinderGeometry(0.15,0.15,0.65,10), silver, -0.5,0,0,0,0,Math.PI/2)
    addMesh(g, new THREE.BoxGeometry(0.85,0.005,0.38), panel,  1.1,  0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85,0.005,0.38), panel2, 1.1, -0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85,0.005,0.38), panel, -1.1,  0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85,0.005,0.38), panel2,-1.1, -0.14, 0)
  } else if (category === 'gps') {
    addMesh(g, new THREE.CylinderGeometry(0.18,0.22,0.5,8), body)
    addMesh(g, new THREE.BoxGeometry(1.0,0.01,0.5), panel, 0.7)
    addMesh(g, new THREE.BoxGeometry(1.0,0.01,0.5), panel2, -0.7)
  } else if (category === 'science') {
    addMesh(g, new THREE.SphereGeometry(0.25,16,16), body)
    addMesh(g, new THREE.BoxGeometry(1.2,0.01,0.6), panel, 0.9)
    addMesh(g, new THREE.BoxGeometry(1.2,0.01,0.6), panel2, -0.9)
  } else if (category === 'weather') {
    addMesh(g, new THREE.SphereGeometry(0.3,12,12), new THREE.MeshPhongMaterial({ color:0x4dd2ff, emissive:0x113355, emissiveIntensity:0.2 }))
    addMesh(g, new THREE.BoxGeometry(1.0,0.02,0.3), panel)
  } else {
    addMesh(g, new THREE.BoxGeometry(0.4,0.4,0.4), body)
    addMesh(g, new THREE.BoxGeometry(1.2,0.01,0.4), panel)
  }
  return g
}

function getGltfPath(category: string, name: string, norad?: string): string | null {
  if (norad === '25544' || name.includes('ISS')) return '/iss/scene.gltf'
  if (category === 'starlink' || name.toLowerCase().includes('starlink')) return '/starlink/scene.gltf'
  if (category === 'weather') return '/weather/scene.gltf'
  if (category === 'gps' || name.toLowerCase().includes('gps')) return '/gps/scene.gltf'
  if (category === 'science' || name.toLowerCase().includes('science')) return '/science/scene.gltf'
  return null
}

function geoToWorld(lat: number, lon: number, altKm: number): THREE.Vector3 {
  const r = 6371 + altKm
  const phi = (90 - lat) * Math.PI / 180
  const th  = lon * Math.PI / 180
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(th),
    r * Math.cos(phi),
    -r * Math.sin(phi) * Math.sin(th)
  )
}

function getOrbitalTangent(lat: number, lon: number, inclinationDeg: number): THREE.Vector3 {
  const inc = inclinationDeg * Math.PI / 180
  const phi = (90 - lat) * Math.PI / 180
  const th  = lon * Math.PI / 180
  const east = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th))
  const north = new THREE.Vector3(Math.cos(phi)*Math.cos(th), -Math.sin(phi), -Math.cos(phi)*Math.sin(th))
  return east.clone().multiplyScalar(Math.cos(inc)).add(north.clone().multiplyScalar(Math.sin(inc))).normalize()
}

function createEarthDay(): THREE.CanvasTexture {
  const W=2048, H=1024
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H
  const ctx=canvas.getContext('2d')!
  const ocean=ctx.createLinearGradient(0,0,0,H)
  ocean.addColorStop(0,'#0a1a3a'); ocean.addColorStop(0.5,'#0d2545'); ocean.addColorStop(1,'#0a1a3a')
  ctx.fillStyle=ocean; ctx.fillRect(0,0,W,H)
  const toX=(lon:number)=>((lon+180)/360)*W
  const toY=(lat:number)=>((90-lat)/180)*H
  const poly=(pts:number[][],color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(toX(pts[0][0]),toY(pts[0][1]));for(let i=1;i<pts.length;i++)ctx.lineTo(toX(pts[i][0]),toY(pts[i][1]));ctx.closePath();ctx.fill()}
  poly([[-168,72],[-140,72],[-120,60],[-95,50],[-80,45],[-65,47],[-62,44],[-70,42],[-75,35],[-80,25],[-87,15],[-90,16],[-95,20],[-104,19],[-109,23],[-117,30],[-120,35],[-124,45],[-130,55],[-140,58],[-155,60],[-168,65]],'#2d6e3e')
  poly([[-73,83],[-17,83],[-17,70],[-40,60],[-65,60],[-73,70]],'#e0eef2')
  poly([[-81,10],[-62,12],[-50,5],[-35,-5],[-35,-20],[-53,-34],[-65,-55],[-75,-52],[-80,-40],[-81,-2],[-78,5]],'#2a6630')
  poly([[-10,36],[0,36],[10,38],[18,40],[30,42],[35,47],[28,62],[20,68],[5,62],[-3,52],[-8,44],[-10,40]],'#3a7040')
  poly([[-5,50],[2,51],[2,58],[-6,58],[-8,52]],'#3a7040'); poly([[5,58],[10,58],[28,70],[28,58],[20,56],[8,56]],'#3a7040')
  poly([[-18,16],[-10,8],[0,5],[10,5],[25,2],[40,10],[42,15],[42,25],[32,32],[30,22],[20,15],[10,5],[0,5],[-5,5],[-12,8],[-18,14]],'#4a7825')
  poly([[32,32],[38,22],[42,12],[50,12],[42,0],[35,-5],[30,-15],[18,-25],[15,-35],[25,-34],[35,-27],[38,-20],[38,0],[42,12]],'#4a7825')
  poly([[30,42],[42,42],[55,52],[70,52],[85,52],[100,55],[120,55],[130,50],[140,45],[142,48],[135,35],[125,22],[110,20],[100,12],[90,22],[80,28],[68,25],[55,22],[42,38],[35,47]],'#3a6e30')
  poly([[37,30],[55,22],[58,15],[50,12],[42,15],[37,22]],'#c8a855')
  poly([[68,25],[80,28],[85,22],[78,8],[72,8],[65,22]],'#3a6e30')
  poly([[115,-22],[122,-18],[130,-12],[136,-12],[138,-18],[132,-30],[122,-34],[115,-34],[115,-28]],'#c8a855')
  poly([[142,-10],[148,-18],[150,-24],[148,-38],[144,-38],[142,-30],[140,-18],[138,-18]],'#3a6e30')
  poly([[-180,-70],[0,-70],[180,-70],[180,-90],[-180,-90]],'#ddeef5')
  for(let i=0;i<120;i++){
    const cx2=Math.random()*W, cy2=Math.random()*H*0.85+H*0.075, r=Math.random()*60+15
    const gr=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,r)
    gr.addColorStop(0,'rgba(255,255,255,0.18)'); gr.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=gr; ctx.fillRect(cx2-r,cy2-r,r*2,r*2)
  }
  return new THREE.CanvasTexture(canvas)
}

// ── Follow Cam ─────────────────────────────────────────────────────
function FollowCamCanvas({ onClose, category, name, norad }: { onClose:()=>void; category:string; name:string; norad?:string }) {
  const [texLoaded, setTexLoaded] = useState(false)
  const ref = useRef<HTMLCanvasElement>(null)
  const { positions, satellites } = useSatStore()
  
  const currentSat = (satellites || []).find((s: any) => s.norad === norad)
  const flag = getFlag(currentSat?.country)
  
  const posRef = useRef(norad ? positions[norad] : null)
  useEffect(() => { posRef.current = norad ? positions[norad] : null }, [positions, norad])

  useEffect(() => {
    if (!ref.current) return
    const canvas = ref.current
    const W = window.innerWidth, H = window.innerHeight
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H); renderer.setClearColor(0x000005, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W/H, 0.001, 200000)

    const sp: number[] = []
    for (let i=0; i<6000; i++) { const v=new THREE.Vector3().randomDirection().multiplyScalar(50000+Math.random()*50000); sp.push(v.x,v.y,v.z) }
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color:0xffffff, size:3, transparent:true, opacity:0.85 })))

    const earthGeo = new THREE.SphereGeometry(6371, 128, 128)
    const earthMat = new THREE.MeshPhongMaterial({ map: createEarthDay(), specular: new THREE.Color(0x224466), shininess: 12 })
    scene.add(new THREE.Mesh(earthGeo, earthMat))
    const tl = new THREE.TextureLoader(); tl.crossOrigin = 'anonymous'
    tl.load('/earth_day_8k.jpg', t => {
      earthMat.map = t
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      setTexLoaded(true)
      earthMat.needsUpdate = true
    }, undefined, () => {
      tl.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', t => { earthMat.map=t; earthMat.needsUpdate=true })
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(6440,64,64), new THREE.MeshBasicMaterial({ color:0x4488ff, transparent:true, opacity:0.12, side:THREE.BackSide })))
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(6550,32,32), new THREE.MeshBasicMaterial({ color:0x1144aa, transparent:true, opacity:0.06, side:THREE.BackSide })))

    scene.add(new THREE.AmbientLight(0x334455, 1.2))
    const sunLight = new THREE.DirectionalLight(0xfff8e0, 4.0)
    sunLight.position.set(40000, 10000, 20000); scene.add(sunLight)
    const fillLight = new THREE.DirectionalLight(0x334466, 0.5)
    fillLight.position.set(-20000, -5000, -15000); scene.add(fillLight)

    const satGroup = new THREE.Group()
    scene.add(satGroup)

    const colorStr = (CAT_COLOR as Record<string,string>)[category] || '#00ccff'
    const isISS = norad === '25544' || name.includes('ISS')
    const gltfPath = getGltfPath(category, name, norad)
    const modelGroup = new THREE.Group()
    satGroup.add(modelGroup)

    const loader = new GLTFLoader()
    if (gltfPath) {
      loader.load(gltfPath, (gltf: { scene: THREE.Group }) => {
        const m = gltf.scene
        const box = new THREE.Box3().setFromObject(m)
        const size = box.getSize(new THREE.Vector3()).length()
        const scale = (isISS ? 0.35 : 0.28) / size
        m.scale.set(scale, scale, scale)
        m.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(scale))
        if (isISS) m.rotation.set(Math.PI, 0, Math.PI / 2)
        modelGroup.add(m)
      }, undefined, () => {
        const m = buildModel(category, colorStr)
        m.scale.set(0.3,0.3,0.3); modelGroup.add(m)
      })
    } else {
      const m = buildModel(category, colorStr)
      m.scale.set(0.3,0.3,0.3); modelGroup.add(m)
    }

    const inclination = category === 'station' ? 51.6 :
                        category === 'gps' ? 55.0 :
                        category === 'weather' ? 98.7 : 51.6

    let isDrag = false, lastX = 0, lastY = 0
    let camTheta = Math.PI * 1.2, camPhi = 0.25, camDist = 0.8

    canvas.addEventListener('mousedown', e => { isDrag=true; lastX=e.clientX; lastY=e.clientY; canvas.style.cursor='grabbing' })
    window.addEventListener('mouseup', () => { isDrag=false; canvas.style.cursor='grab' })
    canvas.addEventListener('mousemove', e => {
      if (!isDrag) return
      camTheta += (e.clientX-lastX)*0.006
      camPhi = Math.max(-Math.PI/2+0.05, Math.min(Math.PI/2-0.05, camPhi+(e.clientY-lastY)*0.004))
      lastX=e.clientX; lastY=e.clientY
    })
    canvas.addEventListener('wheel', e => {
      camDist = Math.max(0.15, Math.min(6.0, camDist+e.deltaY*0.0003))
    }, { passive: true })
    canvas.style.cursor = 'grab'

    const targetQuat = new THREE.Quaternion()
    const currentQuat = new THREE.Quaternion()

    let raf: number
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const pos = posRef.current
      if (!pos || pos.alt <= 0) { renderer.render(scene, camera); return }

      const satPos = geoToWorld(pos.lat, pos.lon, pos.alt)
      const radial = satPos.clone().normalize()
      const tangent = getOrbitalTangent(pos.lat, pos.lon, inclination)
      const right = new THREE.Vector3().crossVectors(tangent, radial).normalize()

      satGroup.position.copy(satPos)
      const rotMat = new THREE.Matrix4().makeBasis(right, radial, tangent)
      targetQuat.setFromRotationMatrix(rotMat)
      currentQuat.slerp(targetQuat, 0.05)
      modelGroup.setRotationFromQuaternion(currentQuat)

      const cosP = Math.cos(camPhi)
      const camLocal = right.clone().multiplyScalar(Math.sin(camTheta) * cosP)
        .add(radial.clone().multiplyScalar(Math.sin(camPhi)))
        .add(tangent.clone().multiplyScalar(Math.cos(camTheta) * cosP))
        .multiplyScalar(camDist)

      camera.position.copy(satPos).add(camLocal)
      camera.up.copy(radial)
      camera.lookAt(satPos)
      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    })
    ro.observe(document.body)

    return () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose() }
  }, [category, name, norad])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999, background:'#000005' }}>
      {!texLoaded && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <div style={{ width:36, height:36, border:'2px solid rgba(255,255,255,0.15)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'fspin 0.8s linear infinite' }} />
          <style>{`@keyframes fspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      <canvas ref={ref} style={{ display:'block', width:'100vw', height:'100vh' }} />
      <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)', fontFamily:'Orbitron, sans-serif', fontSize:12, letterSpacing:4, color:'rgba(0,200,255,0.6)', pointerEvents:'none', textAlign:'center', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{flag}</span> {name.toUpperCase()} — FOLLOW CAM
        <div style={{ fontSize:9, letterSpacing:3, color:'rgba(0,200,255,0.35)', marginTop:4, position: 'absolute', top: '100%', width: '100%' }}>POSITION EN TEMPS RÉEL · TLE SGP4</div>
      </div>
      <div style={{ position:'absolute', top:16, left:20, fontSize:9, color:'rgba(0,180,255,0.4)', letterSpacing:1.5, fontFamily:'Share Tech Mono, monospace', lineHeight:1.8, pointerEvents:'none' }}>
        <span style={{ fontSize: 12 }}>{flag}</span> {name} · NORAD {norad||'—'}<br/>VITESSE ~7.66 KM/S<br/>CATÉGORIE : {category.toUpperCase()}
      </div>
      <div style={{ position:'absolute', bottom:50, right:20, fontSize:8, color:'rgba(0,180,255,0.3)', letterSpacing:1, fontFamily:'Share Tech Mono, monospace', textAlign:'right', pointerEvents:'none', lineHeight:1.8 }}>
        DRAG — Orbiter autour du satellite<br/>SCROLL — Zoom
      </div>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'rgba(0,0,0,0.7)', border:'1px solid rgba(0,180,255,0.4)', borderRadius:6, color:'#00ccff', cursor:'pointer', fontFamily:'Share Tech Mono, monospace', fontSize:11, padding:'8px 18px', letterSpacing:1, backdropFilter:'blur(8px)' }}>✕ FERMER</button>
      <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'rgba(0,180,255,0.25)', letterSpacing:2, fontFamily:'Share Tech Mono, monospace', pointerEvents:'none' }}>
        ORBITVIEW · REAL-TIME SATELLITE TRACKER
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────
export default function SatelliteViewer3D({ category, name, norad }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [followOpen, setFollowOpen] = useState(false)

  const { satellites } = useSatStore()
  const currentSat = (satellites || []).find((s: any) => s.norad === norad)
  const displayDate = currentSat?.launch_date || currentSat?.launchDate

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const W = canvas.clientWidth || 264, H = 160
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H); renderer.setClearColor(0x000814, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W/H, 0.01, 100)
    camera.position.set(0, 0.5, 2.8); camera.lookAt(0, 0, 0)
    
    const sp: number[] = []
    for (let i=0; i<300; i++) { const v=new THREE.Vector3().randomDirection().multiplyScalar(20); sp.push(v.x,v.y,v.z) }
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color:0xffffff, size:0.08 })))
    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const sun=new THREE.DirectionalLight(0xfff5e0, 2.5); sun.position.set(5,3,5); scene.add(sun)
    const color=(CAT_COLOR as Record<string,string>)[category]||'#00ccff'
    const catLight=new THREE.PointLight(new THREE.Color(color), 0.5, 10); catLight.position.set(0,2,2); scene.add(catLight)
    
    const gltfPath = getGltfPath(category, name, norad)
    let model: THREE.Object3D = new THREE.Group()
    scene.add(model)
    
    if (gltfPath) {
      new GLTFLoader().load(gltfPath, (gltf: { scene: THREE.Group }) => {
        scene.remove(model); model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3()).length()
        const isISS = norad==='25544'||name.includes('ISS')
        const scale = (isISS ? 1.8 : 2.0) / size
        model.scale.set(scale,scale,scale)
        model.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(scale))
        scene.add(model)
      }, undefined, () => {})
    } else {
        scene.remove(model); 
        model = buildModel(category, color);
        scene.add(model);
    }
    
    let raf: number, t = 0
    const animate = () => { 
        raf=requestAnimationFrame(animate); 
        t+=0.008; 
        if (model) {
            model.rotation.y=t; 
            model.rotation.x=Math.sin(t*0.3)*0.1; 
        }
        renderer.render(scene,camera) 
    }
    animate()
    return () => { cancelAnimationFrame(raf); renderer.dispose() }
  }, [category, name, norad])

  return (
    <>
      <div style={{ position:'relative', background: '#000814', borderRadius: '8px 8px 0 0' }}>
        <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:160 }} />
        
        <div style={{ position: 'absolute', top: 12, right: 12, textAlign: 'right', pointerEvents: 'none' }}>
            {/* L'émoji du drapeau ajouté juste au-dessus du statut */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{getFlag(currentSat?.country)}</span>
                <div style={{ fontSize: 7, color: 'rgba(0,255,200,0.4)', letterSpacing: 1.5, fontFamily: 'Share Tech Mono, monospace' }}>LAUNCH STATUS</div>
            </div>
            
            <div style={{ fontSize: 11, color: '#00ffcc', fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold' }}>
                {getLaunchAge(currentSat)}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace', marginTop: 2 }}>
                {displayDate || 'NOT FOUND'}
            </div>
        </div>

        <button onClick={() => setFollowOpen(true)} style={{ position:'absolute', bottom:8, left:8, padding:'3px 10px', fontSize:8, letterSpacing:1, cursor:'pointer', border:'1px solid #00ffcc', borderRadius:3, fontFamily:'inherit', background:'rgba(0,255,200,0.1)', color:'#00ffcc' }}>
          🛸 FOLLOW CAM
        </button>
        <div style={{ position:'absolute', bottom:8, right:8, fontSize:8, color:'rgba(0,180,255,0.3)', letterSpacing:1 }}>3D MODEL</div>
      </div>
      {followOpen && createPortal(
        <FollowCamCanvas onClose={()=>setFollowOpen(false)} category={category} name={name} norad={norad} />,
        document.body
      )}
    </>
  )
}