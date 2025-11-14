import React, { createContext, useContext, useMemo, useEffect } from 'react'
import { SplineWorkerPool } from 'src/lib/SplineWorkerPool'

const Ctx = createContext<SplineWorkerPool | null>(null)

export const SplineWorkerProvider: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size }) => {
  const pool = useMemo(() => new SplineWorkerPool(size), [size])
  useEffect(() => () => pool.terminate(), [pool])
  return <Ctx.Provider value={pool}>{children}</Ctx.Provider>
}

export function useSplineWorker() {
  const pool = useContext(Ctx)
  if (!pool) throw new Error('useSplineWorker must be used within <SplineWorkerProvider>')
  return {
    run: (args: { times: number[]; widths: number[]; step?: number; normalizeWidth?: number }) => pool.submit(args),
  }
}
