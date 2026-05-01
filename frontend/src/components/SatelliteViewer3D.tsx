import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CAT_COLOR } from '../types'

interface Props { category: string; name: string }

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, px=0, py=0, pz=0, rx=0, ry=0, rz=0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(px, py, pz)
  m.rotation.set(rx, ry, rz)
  group.add(m)
  return m
}

function buildModel(category: string, color: string): THREE.Group {
  const g = new THREE.Group()
  const c = new THREE.Color(color)
  const body  = new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, shininess: 60 })
  const panel = new THREE.MeshPhongMaterial({ color: 0x1133aa, emissive: 0x0022aa, emissiveIntensity: 0.4, side: THREE.DoubleSide })
  const panel2= new THREE.MeshPhongMaterial({ color: 0x112266, emissive: 0x001155, emissiveIntensity: 0.35, side: THREE.DoubleSide })
  const silver= new THREE.MeshPhongMaterial({ color: 0xaabbcc, shininess: 120 })
  const gold  = new THREE.MeshPhongMaterial({ color: 0xddaa44, emissive: 0x332200, emissiveIntensity: 0.2, shininess: 80 })
  const white = new THREE.MeshPhongMaterial({ color: 0xddeeff, shininess: 40 })

  if (category === 'station') {
    // Truss horizontal
    addMesh(g, new THREE.BoxGeometry(3.2, 0.1, 0.1), silver)
    // Module central
    addMesh(g, new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12), white, 0, 0, 0, Math.PI/2, 0, 0)
    // Module Zarya
    addMesh(g, new THREE.CylinderGeometry(0.17, 0.17, 0.55, 10), gold, 0.5, 0, 0, 0, 0, Math.PI/2)
    // Module Zvezda
    addMesh(g, new THREE.CylinderGeometry(0.15, 0.15, 0.65, 10), silver, -0.5, 0, 0, 0, 0, Math.PI/2)
    // 4 panneaux solaires
    addMesh(g, new THREE.BoxGeometry(0.85, 0.005, 0.38), panel,  1.1,  0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85, 0.005, 0.38), panel2, 1.1, -0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85, 0.005, 0.38), panel, -1.1,  0.14, 0)
    addMesh(g, new THREE.BoxGeometry(0.85, 0.005, 0.38), panel2,-1.1, -0.14, 0)
    // Radiateur
    addMesh(g, new THREE.BoxGeometry(0.5, 0.003, 0.2), new THREE.MeshPhongMaterial({ color: 0xbbccdd }), 0, 0.25, 0)

  } else if (category === 'gps') {
    addMesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.55, 6), body, 0, 0, 0, 0, Math.PI/6, 0)
    addMesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6), gold, 0, 0.29, 0, 0, Math.PI/6, 0)
    addMesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6), gold, 0,-0.29, 0, 0, Math.PI/6, 0)
    addMesh(g, new THREE.BoxGeometry(0.7, 0.005, 0.35), panel,  0.65, 0, 0)
    addMesh(g, new THREE.BoxGeometry(0.7, 0.005, 0.35), panel2,-0.65, 0, 0)
    addMesh(g, new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), new THREE.MeshPhongMaterial({ color: 0xdddddd }), 0, 0.31, 0)

  } else if (category === 'weather') {
    addMesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16), body)
    addMesh(g, new THREE.BoxGeometry(0.75, 0.005, 0.32), panel,  0.6, 0, 0)
    addMesh(g, new THREE.BoxGeometry(0.75, 0.005, 0.32), panel2,-0.6, 0, 0)
    // Antenne parabolique
    addMesh(g, new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI*2, 0, Math.PI/2),
      new THREE.MeshPhongMaterial({ color: 0xccccdd, side: THREE.DoubleSide }), 0, 0.42, 0)
    addMesh(g, new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6), silver, 0, 0.33, 0)
    addMesh(g, new THREE.BoxGeometry(0.12, 0.12, 0.12), gold, 0.15, 0.36, 0)

  } else if (category === 'starlink') {
    // Corps plat
    addMesh(g, new THREE.BoxGeometry(0.55, 0.06, 0.25), body)
    // Grand panneau unique
    addMesh(g, new THREE.BoxGeometry(1.4, 0.004, 0.28), panel, 0, 0.04, 0)
    // Séparateurs
    for (let i = -2; i <= 2; i++) {
      addMesh(g, new THREE.BoxGeometry(0.003, 0.006, 0.29),
        new THREE.MeshBasicMaterial({ color: 0x3355cc }), i * 0.25, 0.044, 0)
    }
    // Antennes phased array
    addMesh(g, new THREE.BoxGeometry(0.14, 0.008, 0.14), new THREE.MeshPhongMaterial({ color: 0x334455 }), -0.18, -0.034, 0)
    addMesh(g, new THREE.BoxGeometry(0.14, 0.008, 0.14), new THREE.MeshPhongMaterial({ color: 0x334455 }),  0,    -0.034, 0)
    addMesh(g, new THREE.BoxGeometry(0.14, 0.008, 0.14), new THREE.MeshPhongMaterial({ color: 0x334455 }),  0.18, -0.034, 0)

  } else if (category === 'debris') {
    const geo = new THREE.DodecahedronGeometry(0.25, 0)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) * (0.7 + Math.random() * 0.6),
                    pos.getY(i) * (0.7 + Math.random() * 0.6),
                    pos.getZ(i) * (0.7 + Math.random() * 0.6))
    }
    geo.computeVertexNormals()
    addMesh(g, geo, new THREE.MeshPhongMaterial({ color: 0x888899, flatShading: true }))
    addMesh(g, new THREE.TetrahedronGeometry(0.1),
      new THREE.MeshPhongMaterial({ color: 0x556677, flatShading: true }), 0.3, 0.1, 0.1)

  } else {
    // Science
    addMesh(g, new THREE.BoxGeometry(0.38, 0.38, 0.5), body)
    addMesh(g, new THREE.BoxGeometry(0.65, 0.005, 0.3), panel,  0.55, 0, 0)
    addMesh(g, new THREE.BoxGeometry(0.65, 0.005, 0.3), panel2,-0.55, 0, 0)
    // Télescope
    addMesh(g, new THREE.CylinderGeometry(0.1, 0.12, 0.35, 12), silver, 0, 0, 0.42, 0, 0, Math.PI/2)
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12),
      new THREE.MeshPhongMaterial({ color: 0x000011 }), 0, 0, 0.6, 0, 0, Math.PI/2)
    // Antenne
    addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), silver, 0, 0.32, 0)
    addMesh(g, new THREE.SphereGeometry(0.12, 12, 6, 0, Math.PI*2, 0, Math.PI/2),
      new THREE.MeshPhongMaterial({ color: 0xeeeeff, side: THREE.DoubleSide }), 0, 0.44, 0)
  }

  return g
}

export default function SatelliteViewer3D({ category, name }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const W = canvas.clientWidth || 264
    const H = 160

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000814, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 100)
    camera.position.set(0, 0.5, 2.8)
    camera.lookAt(0, 0, 0)

    // Étoiles
    const sp: number[] = []
    for (let i = 0; i < 300; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(15 + Math.random() * 10)
      sp.push(v.x, v.y, v.z)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.9 })))

    // Lumières
    scene.add(new THREE.AmbientLight(0x223344, 1.2))
    const sun = new THREE.DirectionalLight(0xfff5e0, 3)
    sun.position.set(5, 3, 5)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x001133, 0.5)
    fill.position.set(-5, -3, -5)
    scene.add(fill)
    const color = (CAT_COLOR as Record<string, string>)[category] || '#00ccff'
    const catLight = new THREE.PointLight(new THREE.Color(color), 0.8, 10)
    catLight.position.set(0, 2, 2)
    scene.add(catLight)

    // Modèle
    const model = buildModel(category, color)
    scene.add(model)

    let raf: number
    let t = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.008
      model.rotation.y = t
      model.rotation.x = Math.sin(t * 0.3) * 0.12
      renderer.render(scene, camera)
    }
    animate()

    return () => { cancelAnimationFrame(raf); renderer.dispose() }
  }, [category])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 160, borderRadius: '8px 8px 0 0' }}
    />
  )
}
