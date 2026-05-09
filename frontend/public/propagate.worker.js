importScripts('https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js')

self.onmessage = function(e) {
  const { sats, timestamp } = e.data
  const now = new Date(timestamp)
  const results = {}
  const len = sats.length
  
  for (let i = 0; i < len; i++) {
    const sat = sats[i]
    try {
      const rec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2)
      const pv = satellite.propagate(rec, now)
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue
      const gmst = satellite.gstime(now)
      const gd = satellite.eciToGeodetic(pv.position, gmst)
      const vel = pv.velocity
      results[sat.norad] = {
        lat: satellite.degreesLat(gd.latitude),
        lon: satellite.degreesLong(gd.longitude),
        alt: gd.height,
        vel: Math.sqrt(vel.x**2 + vel.y**2 + vel.z**2),
        vx: vel.x, vy: vel.y, vz: vel.z
      }
    } catch(err) {}
  }
  
  self.postMessage(results)
}
