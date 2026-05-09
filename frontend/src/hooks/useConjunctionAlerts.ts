import { useEffect, useState, useRef } from 'react'
import { useSatStore } from '../store/satelliteStore'

export interface ConjunctionAlert {
  satA: string; noradA: string; categoryA: string
  satB: string; noradB: string; categoryB: string
  distance: number
}

export function useConjunctionAlerts(thresholdKm = 60) {
  const { satellites } = useSatStore()
  const [alerts, setAlerts] = useState<ConjunctionAlert[]>([])
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (satellites.length === 0) return

    workerRef.current = new Worker(
      new URL('../workers/conjunction.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current.onmessage = (e) => setAlerts(e.data)

    const run = () => {
      workerRef.current?.postMessage({ satellites, thresholdKm })
    }

    run()
    const id = setInterval(run, 30000)

    return () => {
      clearInterval(id)
      workerRef.current?.terminate()
    }
  }, [satellites, thresholdKm])

  return alerts
}
