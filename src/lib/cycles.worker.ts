import { Pattern } from '@strudel/core'
import { findNCycles, formatChords, InMsg, OutMsg } from './utils.js'

let chordPattern: Pattern | null = null

self.onmessage = (e: MessageEvent<InMsg>) => {
  try {
    const msg = e.data

    if (msg.type === 'init') {
      chordPattern = formatChords(msg.chords ?? '', msg.multiplier ?? 1)
      self.postMessage({ type: 'ready' } as OutMsg)
      return
    }

    if (msg.type === 'compute') {
      if (!chordPattern) throw new Error('Worker not initialized')
      const [nCycles, haps] = findNCycles(msg.length, chordPattern)
      self.postMessage({ type: 'result', nCycles, haps } as OutMsg)
      return
    }
  } catch (err: any) {
    console.error('Error in cycles.worker:', err)
    self.postMessage({ type: 'error', message: err?.message || String(err) } as OutMsg)
  }
}

export default null as any
