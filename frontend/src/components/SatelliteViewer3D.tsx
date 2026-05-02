import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { CAT_COLOR } from '../types'

interface Props {
  category: string
  name: string
  norad?: string
}

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  px = 0,
  py = 0,
  pz = 0,
  rx = 0,
  ry = 0,
  rz = 0
) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(px, py, pz)
  m.rotation.set(rx, ry, rz)
  group.add(m)
  return m
}

function buildModel(category: string, color: string): THREE.Group {
  const g = new THREE.Group()
  const c = new THREE.Color(color)

  const body = new THREE.MeshPhongMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: 0.12,
    shininess: 60,
  })

  const panel = new THREE.MeshPhongMaterial({
    color: 0x1133aa,
    emissive: 0x0022aa,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  })

  const panel2 = new THREE.MeshPhongMaterial({
    color: 0x112266,
    emissive: 0x001155,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  })

  const silver = new THREE.MeshPhongMaterial({
    color: 0xaabbcc,
    shininess: 120,
  })

  const gold = new THREE.MeshPhongMaterial({
    color: 0xddaa44,
    emissive: 0x332200,
    emissiveIntensity: 0.2,
    shininess: 80,
  })

  const white = new THREE.MeshPhongMaterial({
    color: 0xddeeff,
    shininess: 40,
  })

  if (category === 'station') {
    addMesh(g, new THREE.BoxGeometry(3.2, 0.1, 0.1), silver)
    addMesh(g, new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12), white, 0, 0, 0, Math.PI / 2)
    addMesh(g, new THREE.CylinderGeometry(0.17, 0.17, 0.55, 10), gold, 0.5, 0, 0, 0, 0, Math.PI / 2)
    addMesh(g, new THREE.CylinderGeometry(0.15, 0.15, 0.65, 10), silver, -0.5, 0, 0, 0, 0, Math.PI / 2)

  } else if (category === 'gps') {
    const core = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8)
    addMesh(g, core, body)

    addMesh(g, new THREE.BoxGeometry(1.0, 0.01, 0.5), panel, 0.7)
    addMesh(g, new THREE.BoxGeometry(1.0, 0.01, 0.5), panel2, -0.7)

    addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), silver, 0.2, 0.4)
    addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), silver, -0.2, 0.4)

  } else if (category === 'science') {
    // 🔬 satellite scientifique (fallback stylisé)
    const core = new THREE.SphereGeometry(0.25, 16, 16)
    addMesh(g, core, body)

    addMesh(g, new THREE.BoxGeometry(1.2, 0.01, 0.6), panel, 0.9)
    addMesh(g, new THREE.BoxGeometry(1.2, 0.01, 0.6), panel2, -0.9)

    // capteurs / instruments
    addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), silver, 0.3, 0.3)
    addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.4, 10), gold, -0.3, 0.35)

  } else if (category === 'weather') {
    addMesh(
      g,
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshPhongMaterial({
        color: 0x4dd2ff,
        emissive: 0x113355,
        emissiveIntensity: 0.2,
      })
    )
    addMesh(g, new THREE.BoxGeometry(1.0, 0.02, 0.3), panel)

  } else {
    addMesh(g, new THREE.BoxGeometry(0.4, 0.4, 0.4), body)
    addMesh(g, new THREE.BoxGeometry(1.2, 0.01, 0.4), panel)
  }

  return g
}

export default function SatelliteViewer3D({ category, name, norad }: Props) {
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

    // stars
    const sp: number[] = []
    for (let i = 0; i < 300; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(20)
      sp.push(v.x, v.y, v.z)
    }

    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    scene.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })
      )
    )

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    const sun = new THREE.DirectionalLight(0xfff5e0, 2.5)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    const color = (CAT_COLOR as Record<string, string>)[category] || '#00ccff'
    const catLight = new THREE.PointLight(new THREE.Color(color), 0.5, 10)
    catLight.position.set(0, 2, 2)
    scene.add(catLight)

    const loader = new GLTFLoader()

    const isISS = norad === '25544' || name.includes('ISS')
    const isStarlink =
      category === 'starlink' || name.toLowerCase().includes('starlink')
    const isWeather = category === 'weather'
    const isGPS = category === 'gps' || name.toLowerCase().includes('gps')
    const isScience =
      category === 'science' || name.toLowerCase().includes('science')

    let model: THREE.Group | THREE.Object3D = new THREE.Group()
    scene.add(model)

    if (isISS || isStarlink || isWeather || isGPS || isScience) {
      let path = ''
      if (isISS) path = '/iss/scene.gltf'
      else if (isStarlink) path = '/starlink/scene.gltf'
      else if (isWeather) path = '/weather/scene.gltf'
      else if (isGPS) path = '/gps/scene.gltf'
      else if (isScience) path = '/science/scene.gltf'

      loader.load(
        path,
        (gltf) => {
          scene.remove(model)
          model = gltf.scene

          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3()).length()
          const targetSize = isISS ? 1.8 : 2.0
          const scale = targetSize / size

          model.scale.set(scale, scale, scale)

          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center.multiplyScalar(scale))

          scene.add(model)
        },
        undefined,
        () => {
          scene.remove(model)
          model = buildModel(category, color)
          scene.add(model)
        }
      )
    } else {
      model = buildModel(category, color)
      scene.add(model)
    }

    let raf: number
    let t = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.008

      if (model) {
        model.rotation.y = t
        model.rotation.x = Math.sin(t * 0.3) * 0.1
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
    }
  }, [category, name, norad])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: 160,
        borderRadius: '8px 8px 0 0',
      }}
    />
  )
}