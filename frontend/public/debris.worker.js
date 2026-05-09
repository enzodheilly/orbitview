importScripts('https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js')

let debrisItems = []
let running = false

function computePositions(timestamp) {
  const now = new Date(timestamp)
  const positions = new Float32Array(debrisItems.length * 3)
  
  for (let i = 0; i < debrisItems.length; i++) {
    const d = debrisItems[i]
    try {
      const rec = satellite.twoline2satrec(d.tle.line1, d.tle.line2)
      const pv = satellite.propagate(rec, now)
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue
      const gmst = satellite.gstime(now)
      const gd = satellite.eciToGeodetic(pv.position, gmst)
      const lat = satellite.degreesLat(gd.latitude)
      const lon = satellite.degreesLong(gd.longitude)
      const alt = gd.height
      const r = 1 + alt / 6371
      const phi = (90 - lat) * Math.PI / 180
      const th = lon * Math.PI / 180
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(th)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = -r * Math.sin(phi) * Math.sin(th)
    } catch(e) {}
  }
  
  return positions
}

self.onmessage = function(e) {
  const { type, data } = e.data
  
  if (type === 'init') {
    debrisItems = data
    // Compute initial positions immediately
    const positions = computePositions(Date.now())
    self.postMessage({ type: 'positions', positions, count: debrisItems.length }, [positions.buffer])
    
    // Start auto-update every 20s
    if (!running) {
      running = true
      setInterval(() => {
        const pos = computePositions(Date.now())
        self.postMessage({ type: 'positions', positions: pos, count: debrisItems.length }, [pos.buffer])
      }, 20000)
    }
  }
}
