import { useEffect, useRef, useState } from 'react'
import { useSatStore } from '../store/satelliteStore'

const preloadTextures = (urls: string[]) => {
  return Promise.all(
    urls.map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = reject;
    }))
  );
};

interface Step { label: string; done: boolean; progress?: number }

export default function LoadingScreen({ onReady }: { onReady: (data: any) => void }) {
  const [steps, setSteps] = useState<Step[]>([
    { label: 'INITIALIZING SYSTEMS', done: false },
    { label: 'DOWNLOADING SATELLITE DATABASE', done: false, progress: 0 },
    { label: 'COMPUTING ORBITAL POSITIONS', done: false, progress: 0 },
    { label: 'LOADING EARTH TEXTURES', done: false },
    { label: 'CALIBRATING SENSORS', done: false },
  ])
  const [totalSats, setTotalSats] = useState(0)
  const [currentCat, setCurrentCat] = useState('')
  const dataRef = useRef<any[]>([])

  const setStep = (idx: number, update: Partial<Step>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...update } : s))
  }

  useEffect(() => {
    const run = async () => {
      await new Promise(r => setTimeout(r, 600))
      setStep(0, { done: true })

      const cats = [
        { name: 'starlink', label: 'STARLINK' },
        { name: 'science', label: 'SCIENCE' },
        { name: 'weather', label: 'MÉTÉO' },
        { name: 'telephonie', label: 'TÉLÉPHONIE' },
        { name: 'gps', label: 'GPS/GNSS' },
        { name: 'station', label: 'STATIONS' },
      ]
      
      let allSats: any[] = []
      
      for (let ci = 0; ci < cats.length; ci++) {
        const cat = cats[ci]
        setCurrentCat(cat.label)
        setStep(1, { progress: Math.round((ci / cats.length) * 100) })
        
        try {
          let offset = 0
          while (true) {
            const res = await fetch(`http://localhost:8080/api/satellites/category/${cat.name}?limit=500&offset=${offset}`)
            const json = await res.json()
            const batch = json.data || []
            if (batch.length === 0) break
            allSats = [...allSats, ...batch]
            setTotalSats(allSats.length)
            setStep(1, { progress: Math.min(99, Math.round((ci / cats.length) * 100 + (offset / 10000) * (100 / cats.length))) })
            if (batch.length < 500) break
            offset += 500
            await new Promise(r => setTimeout(r, 50))
          }
        } catch { /* skip failed category */ }
      }
      setStep(1, { done: true, progress: 100 })
      dataRef.current = allSats

      setStep(2, { progress: 0 })
      await new Promise<void>(resolve => {
        const worker = new Worker('/propagate.worker.js')
        worker.postMessage({ sats: allSats, timestamp: Date.now() })
        worker.onmessage = (e) => {
          setStep(2, { done: true, progress: 100 })
          worker.terminate()
          const results = e.data
          allSats.forEach(s => { if (results[s.norad]) s._pos = results[s.norad] })
          resolve()
        }
        let p = 0
        const iv = setInterval(() => { p = Math.min(p + 5, 90); setStep(2, { progress: p }) }, 200)
        setTimeout(() => clearInterval(iv), 2000)
      })

     setStep(3, { progress: 0 });
      const textureUrls = [
        '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        '//unpkg.com/three-globe/example/img/earth-topology.png',
        '//unpkg.com/three-globe/example/img/earth-night.jpg'
      ];
      
      try {
        await preloadTextures(textureUrls);
        setStep(3, { done: true, progress: 100 });
      } catch (e) {
        console.error("Texture preload failed", e);
        setStep(3, { done: true }); // On continue quand même en cas d'erreur
      }
      setStep(4, { done: true })
      await new Promise(r => setTimeout(r, 600))
      
      // CRITIQUE : On met à jour le store AVANT d'appeler onReady
      useSatStore.setState({ satellites: dataRef.current })
      onReady(dataRef.current)
    }
    run()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#01030a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontFamily: "'Share Tech Mono', monospace" }}>
      {/* HUD Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 8, color: '#00e5ff', fontFamily: 'Orbitron, sans-serif' }}>
          SPACE<span style={{ color: '#fff' }}>MONITOR</span>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(0,229,255,0.4)', letterSpacing: 6, marginTop: 4 }}>REAL-TIME ORBITAL TELEMETRY</div>
      </div>

      {/* Animation Globe Wireframe */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 48 }}>
        <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', opacity: 0.6 }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
          <ellipse cx="60" cy="60" rx="50" ry="18" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
          <ellipse id="orbit1" cx="60" cy="60" rx="50" ry="18" fill="none" />
          <circle r="3" fill="#00ff88">
            <animateMotion dur="2s" repeatCount="indefinite"><mpath href="#orbit1" /></animateMotion>
          </circle>
        </svg>
      </div>

      {/* Steps */}
      <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid ${step.done ? '#00ff88' : 'rgba(0,229,255,0.3)'}`, background: step.done ? '#00ff88' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {step.done && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#01030a' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: step.done ? '#00ff88' : '#00e5ff' }}>
                {step.label} {step.label.includes('DATABASE') && !step.done && `[${currentCat}]`}
              </div>
              {step.progress !== undefined && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                  <div style={{ height: '100%', background: '#00e5ff', width: `${step.progress}%`, transition: 'width 0.3s', boxShadow: '0 0 5px #00e5ff' }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {totalSats > 0 && (
        <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(0,229,255,0.5)', letterSpacing: 2 }}>
          {totalSats.toLocaleString()} OBJECTS IN LOCAL BUFFER
        </div>
      )}
    </div>
  )
}