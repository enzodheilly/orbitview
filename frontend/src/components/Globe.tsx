import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as satellite from 'satellite.js'
import { useSatStore } from '../store/satelliteStore'
import type { SatelliteDTO, SatPosition } from '../types'
import { CAT_COLOR } from '../types'

// ── Helpers ──────────────────────────────────────────────────────

// Calcule la direction exacte du soleil par rapport à la Terre selon l'heure UTC
function getSunPosition(date: Date): THREE.Vector3 {
  const hoursUTC = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lonAngle = (12 - hoursUTC) * 15;
  const lonRad = lonAngle * (Math.PI / 180);
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = declination * (Math.PI / 180);
  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lonRad),
    Math.sin(latRad),
    -Math.cos(latRad) * Math.sin(lonRad)
  ).normalize();
}

function geoToVec3(lat: number, lon: number, altKm: number): THREE.Vector3 {
  const r = 1 + altKm / 6371
  const phi = (90 - lat) * (Math.PI / 180)
  const th = lon * (Math.PI / 180)
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(th),
    r * Math.cos(phi),
    -r * Math.sin(phi) * Math.sin(th)
  )
}

function geoToSurface(lat: number, lon: number): THREE.Vector3 {
  return geoToVec3(lat, lon, 0)
}

function propagate(tle: { line1: string; line2: string }, date: Date): SatPosition | null {
  try {
    const rec = satellite.twoline2satrec(tle.line1, tle.line2)
    const pv = satellite.propagate(rec, date)
    if (!pv.position || typeof pv.position === 'boolean') return null
    const pos = pv.position as satellite.EciVec3<number>
    const vel = pv.velocity as satellite.EciVec3<number>
    const gmst = satellite.gstime(date)
    const gd = satellite.eciToGeodetic(pos, gmst)
    return {
      lat: satellite.degreesLat(gd.latitude),
      lon: satellite.degreesLong(gd.longitude),
      alt: gd.height,
      vel: Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2)
    }
  } catch { return null }
}

// ── Coverage spotlight ────────────────────────────────────────────

function buildCoverageGroup(
  satPos: THREE.Vector3,
  lat: number,
  lon: number,
  altKm: number,
  color: THREE.Color
): THREE.Group {
  const group = new THREE.Group()
  const R = 6371
  const angleRad = Math.acos(R / (R + altKm))
  const N = 128
  const surfaceCenter = geoToSurface(lat, lon)
  const satDir = surfaceCenter.clone().normalize()
  const perp = Math.abs(satDir.dot(new THREE.Vector3(0, 1, 0))) > 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const tangent = new THREE.Vector3().crossVectors(satDir, perp).normalize()

  // Cercle de couverture sur la surface
  const circlePoints: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * Math.PI * 2
    const rotated = satDir.clone()
      .multiplyScalar(Math.cos(angleRad))
      .add(tangent.clone().applyAxisAngle(satDir, theta).multiplyScalar(Math.sin(angleRad)))
    circlePoints.push(rotated.normalize().multiplyScalar(1.001))
  }
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(circlePoints),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  ))

  // Disque transparent
  const diskVerts: number[] = []
  const diskCenter = surfaceCenter.clone().normalize().multiplyScalar(1.0005)
  for (let i = 0; i < N; i++) {
    const t1 = (i / N) * Math.PI * 2
    const t2 = ((i + 1) / N) * Math.PI * 2
    const p1 = satDir.clone().multiplyScalar(Math.cos(angleRad))
      .add(tangent.clone().applyAxisAngle(satDir, t1).multiplyScalar(Math.sin(angleRad)))
      .normalize().multiplyScalar(1.001)
    const p2 = satDir.clone().multiplyScalar(Math.cos(angleRad))
      .add(tangent.clone().applyAxisAngle(satDir, t2).multiplyScalar(Math.sin(angleRad)))
      .normalize().multiplyScalar(1.001)
    diskVerts.push(diskCenter.x, diskCenter.y, diskCenter.z)
    diskVerts.push(p1.x, p1.y, p1.z)
    diskVerts.push(p2.x, p2.y, p2.z)
  }
  const diskGeo = new THREE.BufferGeometry()
  diskGeo.setAttribute('position', new THREE.Float32BufferAttribute(diskVerts, 3))
  group.add(new THREE.Mesh(diskGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false
  })))

  // Lignes du cône (satellite → bords de la zone)
  for (let i = 0; i < 8; i++) {
    const theta = (i / 8) * Math.PI * 2
    const edgePoint = satDir.clone().multiplyScalar(Math.cos(angleRad))
      .add(tangent.clone().applyAxisAngle(satDir, theta).multiplyScalar(Math.sin(angleRad)))
      .normalize().multiplyScalar(1.001)
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([satPos, edgePoint]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 })
    ))
  }

  // Ligne nadir (satellite → sol)
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([satPos, surfaceCenter.clone().multiplyScalar(1.001)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
  ))

  // Croix au sol (point nadir)
  const up = surfaceCenter.clone().normalize()
  const right = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize()
  const fwd = new THREE.Vector3().crossVectors(up, right).normalize()
  const cp = surfaceCenter.clone().normalize().multiplyScalar(1.002)
  const s = 0.012
  const crossGeo = new THREE.BufferGeometry().setFromPoints([
    cp.clone().add(right.clone().multiplyScalar(s)),
    cp.clone().sub(right.clone().multiplyScalar(s)),
    cp.clone().add(fwd.clone().multiplyScalar(s)),
    cp.clone().sub(fwd.clone().multiplyScalar(s))
  ])
  crossGeo.setIndex([0, 1, 2, 3])
  group.add(new THREE.LineSegments(crossGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })))

  return group
}

// ── Sprite satellites ─────────────────────────────────────────────

const spriteCache = new Map<string, THREE.SpriteMaterial>()
function getSatMaterial(color: string, category: string): THREE.SpriteMaterial {
  const key = color + category
  if (spriteCache.has(key)) return spriteCache.get(key)!
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 28)
  glow.addColorStop(0, color + '44'); glow.addColorStop(1, color + '00')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.shadowColor = color; ctx.shadowBlur = 6
  if (category === 'station') {
    ctx.lineWidth = 2.5
    ctx.fillRect(24, 28, 16, 8); ctx.fillRect(6, 29, 16, 4); ctx.fillRect(42, 29, 16, 4)
    ctx.fillRect(28, 18, 8, 10); ctx.fillRect(28, 36, 8, 10)
  } else if (category === 'gps') {
    ctx.lineWidth = 1.8
    ctx.beginPath()
    for (let i = 0; i < 6; i++) { const a = (i*Math.PI)/3-Math.PI/6; ctx.lineTo ? ctx.lineTo(32+7*Math.cos(a), 32+7*Math.sin(a)) : ctx.moveTo(32+7*Math.cos(a), 32+7*Math.sin(a)) }
    ctx.closePath(); ctx.fill()
    ctx.fillRect(10, 30, 20, 4); ctx.fillRect(34, 30, 20, 4)
  } else if (category === 'weather') {
    ctx.beginPath(); ctx.arc(32, 32, 7, 0, Math.PI*2); ctx.fill()
    ctx.fillRect(12, 30, 18, 4); ctx.fillRect(34, 30, 18, 4)
    ctx.beginPath(); ctx.arc(32, 20, 5, Math.PI, Math.PI*2); ctx.stroke()
  } else if (category === 'debris') {
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(32,26); ctx.lineTo(38,30); ctx.lineTo(36,38); ctx.lineTo(28,38); ctx.lineTo(26,30); ctx.closePath(); ctx.fill()
  } else if (category === 'starlink') {
    ctx.fillRect(22, 30, 20, 4); ctx.fillRect(12, 27, 40, 3); ctx.fillRect(12, 34, 40, 3)
  } else {
    ctx.fillRect(26, 27, 12, 10); ctx.fillRect(10, 29, 14, 4); ctx.fillRect(40, 29, 14, 4)
    ctx.beginPath(); ctx.moveTo(32,27); ctx.lineTo(32,20); ctx.stroke()
    ctx.beginPath(); ctx.arc(32,19,3,0,Math.PI*2); ctx.stroke()
  }
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  spriteCache.set(key, mat)
  return mat
}

// ── Shader Terre jour/nuit (CORRIGÉ POUR ÉCLAIRAGE TEMPS RÉEL) ────

const earthVertexShader = `
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vec4 dayColor   = texture2D(dayTexture,   vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    float sunDot  = dot(normalize(vWorldNormal), normalize(sunDirection));
    float blend   = smoothstep(-0.15, 0.3, sunDot);
    vec4 night = vec4(nightColor.rgb * 2.0, 1.0);
    vec4 day   = vec4(dayColor.rgb, 1.0);
    float terminator = smoothstep(-0.05, 0.05, sunDot);
    vec3 termColor   = mix(vec3(0.9, 0.4, 0.15), day.rgb, terminator);
    vec4 blended     = mix(night, vec4(termColor, 1.0), blend);
    gl_FragColor = blended;
  }
`

const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(0.1, 0.4, 1.0, 1.0) * intensity * 0.8;
  }
`

// ── Textures ──────────────────────────────────────────────────────

function createProceduralDay(): THREE.CanvasTexture {
  const W = 2048, H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const ocean = ctx.createLinearGradient(0, 0, 0, H)
  ocean.addColorStop(0, '#0a1a3a'); ocean.addColorStop(0.5, '#0d2545'); ocean.addColorStop(1, '#0a1a3a')
  ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H)
  const toX = (lon: number) => ((lon + 180) / 360) * W
  const toY = (lat: number) => ((90 - lat) / 180) * H
  const poly = (pts: number[][], color: string) => {
    ctx.fillStyle = color; ctx.beginPath()
    ctx.moveTo(toX(pts[0][0]), toY(pts[0][1]))
    for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(pts[i][0]), toY(pts[i][1]))
    ctx.closePath(); ctx.fill()
  }
  poly([[-168,72],[-140,72],[-120,60],[-95,50],[-80,45],[-65,47],[-62,44],[-70,42],[-75,35],[-80,25],[-87,15],[-90,16],[-95,20],[-104,19],[-109,23],[-117,30],[-120,35],[-124,45],[-130,55],[-140,58],[-155,60],[-168,65]], '#2d6e3e')
  poly([[-73,83],[-17,83],[-17,70],[-40,60],[-65,60],[-73,70]], '#e8f5f8')
  poly([[-81,10],[-62,12],[-50,5],[-35,-5],[-35,-20],[-53,-34],[-65,-55],[-75,-52],[-80,-40],[-81,-2],[-78,5]], '#2a6630')
  poly([[-10,36],[0,36],[10,38],[18,40],[30,42],[35,47],[28,62],[20,68],[5,62],[-3,52],[-8,44],[-10,40]], '#3a7040')
  poly([[-5,50],[2,51],[2,58],[-6,58],[-8,52]], '#3a7040')
  poly([[5,58],[10,58],[28,70],[28,58],[20,56],[8,56]], '#3a7040')
  poly([[-18,16],[-10,8],[0,5],[10,5],[25,2],[40,10],[42,15],[42,25],[32,32],[30,22],[20,15],[10,5],[0,5],[-5,5],[-12,8],[-18,14]], '#4a7825')
  poly([[32,32],[38,22],[42,12],[50,12],[42,0],[35,-5],[30,-15],[18,-25],[15,-35],[25,-34],[35,-27],[38,-20],[38,0],[42,12]], '#4a7825')
  poly([[30,42],[42,42],[55,52],[70,52],[85,52],[100,55],[120,55],[130,50],[140,45],[142,48],[135,35],[125,22],[110,20],[100,12],[90,22],[80,28],[68,25],[55,22],[42,38],[35,47]], '#3a6e30')
  poly([[37,30],[55,22],[58,15],[50,12],[42,15],[37,22]], '#c8a855')
  poly([[68,25],[80,28],[85,22],[78,8],[72,8],[65,22]], '#3a6e30')
  poly([[130,32],[136,36],[142,38],[142,34],[136,32],[132,30]], '#3a6e30')
  poly([[115,-22],[122,-18],[130,-12],[136,-12],[138,-18],[132,-30],[122,-34],[115,-34],[115,-28]], '#c8a855')
  poly([[142,-10],[148,-18],[150,-24],[148,-38],[144,-38],[142,-30],[140,-18],[138,-18]], '#3a6e30')
  poly([[-180,-70],[0,-70],[180,-70],[180,-90],[-180,-90]], '#e8f5f8')
  return new THREE.CanvasTexture(canvas)
}

function createProceduralNight(): THREE.CanvasTexture {
  const W = 1024, H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, W, H)
  const cities = [
    ...Array.from({length:120}, () => [((Math.random()*40-10+180)/360)*W, ((90-(Math.random()*25+35))/180)*H]),
    ...Array.from({length:100}, () => [((Math.random()*30-90+180)/360)*W, ((90-(Math.random()*15+35))/180)*H]),
    ...Array.from({length:40}, () => [((Math.random()*10-125+180)/360)*W, ((90-(Math.random()*15+33))/180)*H]),
    ...Array.from({length:80}, () => [((Math.random()*15+130+180)/360)*W, ((90-(Math.random()*10+33))/180)*H]),
    ...Array.from({length:100}, () => [((Math.random()*20+110+180)/360)*W, ((90-(Math.random()*15+25))/180)*H]),
    ...Array.from({length:80}, () => [((Math.random()*20+70+180)/360)*W, ((90-(Math.random()*20+10))/180)*H]),
    ...Array.from({length:40}, () => [((Math.random()*10-50+180)/360)*W, ((90-(Math.random()*8-25))/180)*H]),
    ...Array.from({length:50}, () => [((Math.random()*20+40+180)/360)*W, ((90-(Math.random()*10+20))/180)*H]),
    ...Array.from({length:20}, () => [((Math.random()*5+3+180)/360)*W, ((90-(Math.random()*5+5))/180)*H]),
  ]
  cities.forEach(([x, y]) => {
    const r = Math.random()
    const size = r > 0.95 ? 3 : r > 0.8 ? 2 : 1
    const brightness = Math.random() * 0.6 + 0.4
    const hue = Math.random() > 0.3 ? `rgba(255,${180+Math.floor(Math.random()*75)},50,${brightness})` : `rgba(200,220,255,${brightness})`
    ctx.fillStyle = hue
    if (size > 1) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
      g.addColorStop(0, hue); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(x - size*3, y - size*3, size*6, size*6)
    } else {
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return new THREE.CanvasTexture(canvas)
}

// ── Grille ───────────────────────────────────────────────────────

function buildGrid(scene: THREE.Scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0x1a4060, transparent: true, opacity: 0.15 })
  const R = 1.002
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: THREE.Vector3[] = []
    const phi = (90 - lat) * (Math.PI / 180)
    for (let i = 0; i <= 64; i++) { const th = (i/64)*2*Math.PI; pts.push(new THREE.Vector3(R*Math.sin(phi)*Math.cos(th), R*Math.cos(phi), -R*Math.sin(phi)*Math.sin(th))) }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const pts: THREE.Vector3[] = []
    const th = lon * (Math.PI / 180)
    for (let i = 0; i <= 64; i++) { const phi = (i/64)*Math.PI; pts.push(new THREE.Vector3(R*Math.sin(phi)*Math.cos(th), R*Math.cos(phi), -R*Math.sin(phi)*Math.sin(th))) }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
}

// ── Composant ────────────────────────────────────────────────────

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meshMapRef = useRef<Map<string, THREE.Sprite>>(new Map())
  const orbitLineRef = useRef<THREE.Line | null>(null)
  const coverageRef = useRef<THREE.Group | null>(null)  // ← NOUVEAU
  const sceneRef = useRef<THREE.Scene | null>(null)
  const { satellites, activeFilters, selectedNorad, selectSat, updatePosition, positions } = useSatStore()  // ← positions ajouté

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 1000)
    let sph = { theta: 0.4, phi: 1.2, r: 3.0 }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setClearColor(0x000005, 1)

    const sp: number[] = []
    for (let i = 0; i < 8000; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 120)
      sp.push(v.x, v.y, v.z)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    const sizes = new Float32Array(8000).map(() => Math.random() * 1.5 + 0.3)
    sg.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.9, sizeAttenuation: true
    })))

    const initialSunDir = getSunPosition(new Date())
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'

    const dayTex   = createProceduralDay()
    const nightTex = createProceduralNight()

    const earthUniforms: { [key: string]: { value: unknown } } = {
      dayTexture:   { value: dayTex },
      nightTexture: { value: nightTex },
      sunDirection: { value: initialSunDir }
    }

    const earthMat = new THREE.ShaderMaterial({
      uniforms: earthUniforms,
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
    })

    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat)
    scene.add(earthMesh)

    const tryLoad = (url: string, onSuccess: (t: THREE.Texture) => void) => {
      loader.load(url, onSuccess, undefined, () => {})
    }
    tryLoad('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', (t) => { earthUniforms.dayTexture.value = t })
    tryLoad('https://unpkg.com/three-globe/example/img/earth-night.jpg', (t) => { earthUniforms.nightTexture.value = t })

    buildGrid(scene)

    const atmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 32),
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      })
    )
    scene.add(atmoMesh)

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x0033aa, transparent: true, opacity: 0.06, side: THREE.BackSide })
    ))

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.0)
    sunLight.position.copy(initialSunDir.clone().multiplyScalar(10))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x050510, 1.0))

    const updateCamera = () => {
      camera.position.set(
        sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
        sph.r * Math.cos(sph.phi),
        sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
      )
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    let isDrag = false, px = 0, py = 0
    canvas.addEventListener('mousedown', e => { isDrag = true; px = e.clientX; py = e.clientY })
    window.addEventListener('mouseup', () => { isDrag = false })
    canvas.addEventListener('mousemove', e => {
      if (!isDrag) return
      sph.theta -= (e.clientX - px) * 0.004
      sph.phi = Math.max(0.15, Math.min(Math.PI - 0.15, sph.phi - (e.clientY - py) * 0.004))
      px = e.clientX; py = e.clientY
      updateCamera()
    })
    canvas.addEventListener('wheel', e => {
      sph.r = Math.max(1.3, Math.min(9, sph.r + e.deltaY * 0.002))
      updateCamera()
    }, { passive: true })

    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const ray = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(mx, my), camera)
      const hits = ray.intersectObjects(Array.from(meshMapRef.current.values()))
      if (hits.length > 0) {
        const norad = [...meshMapRef.current.entries()].find(([, s]) => s === hits[0].object)?.[0]
        if (norad) selectSat(norad)
      }
    })

    const ro = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight)
      camera.aspect = canvas.clientWidth / canvas.clientHeight
      camera.updateProjectionMatrix()
    })
    ro.observe(canvas)

    let raf: number
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const currentSunDir = getSunPosition(new Date())
      earthUniforms.sunDirection.value.copy(currentSunDir)
      sunLight.position.copy(currentSunDir.clone().multiplyScalar(10))
      if (!isDrag) { sph.theta += 0.00006; updateCamera() }
      renderer.render(scene, camera)
    }
    animate()

    return () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose() }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || satellites.length === 0) return
    meshMapRef.current.forEach(s => scene.remove(s)); meshMapRef.current.clear()
    satellites.forEach((sat: SatelliteDTO) => {
      const color = CAT_COLOR[sat.category] ?? '#ffffff'
      const isStation = sat.category === 'station'
      const size = isStation ? 0.07 : sat.category === 'debris' ? 0.018 : sat.category === 'gps' ? 0.035 : 0.03
      const mat = getSatMaterial(color, sat.category)
      const sprite = new THREE.Sprite(mat.clone())
      sprite.scale.set(size, size, 1)
      sprite.visible = activeFilters.has(sat.category)
      scene.add(sprite)
      meshMapRef.current.set(sat.norad, sprite)
    })
  }, [satellites])

  useEffect(() => {
    if (satellites.length === 0) return
    const interval = setInterval(() => {
      const now = new Date()
      satellites.forEach(sat => {
        if (!activeFilters.has(sat.category)) return
        const sprite = meshMapRef.current.get(sat.norad); if (!sprite) return
        const pos = propagate(sat.tle, now)
        if (pos) { sprite.position.copy(geoToVec3(pos.lat, pos.lon, pos.alt)); sprite.visible = true; updatePosition(sat.norad, pos) }
      })
    }, 100)
    return () => clearInterval(interval)
  }, [satellites, activeFilters])

  useEffect(() => {
    satellites.forEach(sat => { const s = meshMapRef.current.get(sat.norad); if (s) s.visible = activeFilters.has(sat.category) })
  }, [activeFilters])

  // ── Orbite + couverture du satellite sélectionné ──────────────
  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return

    // Supprimer orbite précédente
    if (orbitLineRef.current) { scene.remove(orbitLineRef.current); orbitLineRef.current = null }
    // Supprimer couverture précédente
    if (coverageRef.current) { scene.remove(coverageRef.current); coverageRef.current = null }

    if (!selectedNorad) return
    const sat = satellites.find(s => s.norad === selectedNorad); if (!sat) return

    // Orbite
    const rec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2)
    const periodMs = (2 * Math.PI / rec.no) * 60 * 1000
    const pts: THREE.Vector3[] = []
    const now = Date.now()
    for (let i = 0; i <= 200; i++) {
      const pos = propagate(sat.tle, new Date(now + (i/200)*periodMs))
      if (pos) pts.push(geoToVec3(pos.lat, pos.lon, pos.alt))
    }
    if (pts.length > 1) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: new THREE.Color(CAT_COLOR[sat.category]), transparent: true, opacity: 0.5 })
      )
      scene.add(line); orbitLineRef.current = line
    }

    // Couverture satellite (utilise la position actuelle depuis le store)
    const pos = positions[selectedNorad]
    if (pos) {
      const color = new THREE.Color(CAT_COLOR[sat.category] || '#00ccff')
      const satVec = geoToVec3(pos.lat, pos.lon, pos.alt)
      const cg = buildCoverageGroup(satVec, pos.lat, pos.lon, pos.alt, color)
      scene.add(cg)
      coverageRef.current = cg
    }
  }, [selectedNorad, satellites, positions])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />
}
