import Spline from 'src/lib/Spline'

function cumWidths(widths: number[], spaceBetween: number): number[] {
  const result: number[] = []
  let total = 0
  for (let i = 0; i < widths.length; i++) {
    total += widths[i] / 2
    result.push(total)
    total += widths[i] / 2
    total += spaceBetween
  }
  return result
}

type InMsg = {
  id: string
  times: number[]
  widths: number[]
  step?: number
  normalizeWidth?: number
}

type OutMsg =
  | {
      ok: true
      id: string
      maxMinTimes: { max: number; min: number }
      memoizedOffsets: { time: number; value: number }[]
      splineData: {
        xs: number[]
        ys: number[]
        ks: number[]
      }
    }
  | {
      ok: false
      id: string
      error: string
    }

self.onmessage = (e: MessageEvent<InMsg>) => {
  const { id, times, widths, step = 0.001, normalizeWidth = 8 } = e.data || {}

  try {
    if (!times?.length || !widths?.length) {
      ;(self as any).postMessage({ ok: false, id, error: 'Not enough data' } satisfies OutMsg)
      return
    }

    const spline = new Spline(times, cumWidths(widths, normalizeWidth))

    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)

    const memoizedOffsets: { time: number; value: number }[] = []
    for (let t = minTime; t <= maxTime; t += step) memoizedOffsets.push({ time: t, value: spline.at(t) })

    const splineData = spline.toJSON()
    ;(self as any).postMessage({
      ok: true,
      id,
      maxMinTimes: { max: maxTime, min: minTime },
      memoizedOffsets,
      splineData,
    } as OutMsg)
  } catch (err: any) {
    ;(self as any).postMessage({ ok: false, id, error: err?.message || String(err) } as OutMsg)
  }
}
