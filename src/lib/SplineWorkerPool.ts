import WorkerURL from './spline.worker?worker'

type JobInput = Omit<Parameters<Worker['postMessage']>[0], 'id'> & {
  times: number[]
  widths: number[]
  step?: number
  normalizeWidth?: number
}

export type SplineData = {
  xs: number[]
  ys: number[]
  ks: number[]
}

type JobResult =
  | {
      ok: true
      maxMinTimes: { max: number; min: number }
      memoizedOffsets: { time: number; value: number }[]
      splineData: SplineData
    }
  | { ok: false; error: string }

export class SplineWorkerPool {
  private workers: Worker[] = []
  private next = 0
  private inflight = new Map<string, { resolve: (v: JobResult) => void; reject: (e: any) => void }>()

  constructor(size = Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 4))) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(WorkerURL, { type: 'module' })
      w.onmessage = (evt: MessageEvent<any>) => {
        const { id, ...rest } = evt.data || {}
        const pending = this.inflight.get(id)
        if (!pending) return
        this.inflight.delete(id)
        if (rest.ok) pending.resolve(rest as JobResult)
        else pending.resolve(rest as JobResult)
      }
      w.onerror = (e) => {
        for (const [id, p] of this.inflight) {
          this.inflight.delete(id)
          p.reject(e)
        }
      }
      this.workers.push(w)
    }
  }

  submit(payload: JobInput): Promise<JobResult> {
    console.log('Submitted:', payload)
    const id = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      this.inflight.set(id, { resolve, reject })
      const w = this.workers[this.next]
      this.next = (this.next + 1) % this.workers.length
      w.postMessage({ id, ...payload })
    })
  }

  terminate() {
    this.workers.forEach((w) => w.terminate())
    this.inflight.clear()
  }
}
