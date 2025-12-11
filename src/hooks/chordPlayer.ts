// useStrudelPlayer.ts
import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { evalScope, repl, chord, n } from '@strudel/core'
import { mini } from '@strudel/mini'
import { initAudioOnFirstClick, samples, getAudioContext, webaudioOutput, registerSynthSounds } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
import { voicing } from '@strudel/tonal'
import { relativeToAbsolute } from 'src/lib/chord.js'

voicing

type ReplInstance = ReturnType<typeof repl>

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)
}

async function prebake() {
  // sets up the “resume on first click” gesture; don't await here
  initAudioOnFirstClick()
  const loadModules = evalScope(
    import('@strudel/core'),
    import('@strudel/draw'),
    import('@strudel/mini'),
    import('@strudel/tonal'),
    import('@strudel/webaudio'),
  )
  await Promise.all([loadModules, registerSynthSounds()])
}

async function loadSamples() {
  const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'
  await samples(`${ds}/piano.json`, `${ds}/piano/`)
  await samples(`${ds}/vcsl.json`, `${ds}/vcsl/`)
  await samples('github:tidalcycles/dirt-samples')
  await samples('https://sound.intercrap.com/strudel/mellotron/strudel.json')
}

export function useStrudelPlayer() {
  console.log('Strudel')

  const replRef = useRef<ReplInstance | null>(null)
  const initedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [key, setKey] = useState<string | null>(null)

  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true

    let cancelled = false

    const init = async () => {
      const id = s4()
      const instance = repl({
        defaultOutput: webaudioOutput,
        getTime: () => getAudioContext().currentTime,
        id,
        transpiler,
        beforeEval: async () => {
          // Ensure modules & synths are ready before first eval
          await prebake()
        },
      })
      console.log(instance)

      replRef.current = instance
      try {
        await loadSamples()
        if (!cancelled) setReady(true)
      } catch (e) {
        console.error('Failed to load samples', e)
      }
    }

    init()

    return () => {
      cancelled = true
      try {
        replRef.current?.setPattern(n())
        replRef.current?.stop?.()
      } catch {}
      replRef.current = null
    }
  }, [])

  const haltPlayback = useCallback(() => {
    if (!replRef.current) return
    replRef.current.setPattern(n())
    replRef.current.stop()
  }, [])

  const playChord = useCallback(
    (chordInput: string, timeout?: number) => {
      console.log('Playing chord:', chordInput)
      if (!replRef.current) return
      // n([1..4]) to create four notes, then apply chord, voicing, etc.
      const pattern = n(mini('[1,2,3,4]*16'))
        .set(chord(mini(`${chordInput}`)))
        .voicing()
        .clip(1)
        .release(0.5)
        .s('piano')
        .room(0.2)

      replRef.current.setPattern(pattern)

      if (timeout) {
        setTimeout(haltPlayback, timeout)
      }
    },
    [haltPlayback],
  )

  const playRelativeChord = useCallback(
    (chordInput: string, timeout?: number) => {
      console.log('Playing chord:', chordInput)
      if (!replRef.current) return
      // n([1..4]) to create four notes, then apply chord, voicing, etc.
      const chordStr = key ? relativeToAbsolute(chordInput, key) : chordInput
      const pattern = n(mini('[1,2,3,4]'))
        .set(chord(mini(`${chordStr}`)))
        .voicing()
        .clip(1)
        .release(0.5)
        .s('piano')
        .room(0.2)

      replRef.current.setPattern(pattern)
      if (timeout) {
        setTimeout(haltPlayback, timeout)
      }
    },
    [key, haltPlayback],
  )

  const changeKey = useCallback((newKey: string | null) => {
    setKey(newKey)
  }, [])

  useEffect(() => {
    const keyToChordMap = {
      // KeyA: 'C',
      // KeyW: 'C#',
      // KeyS: 'D',
      // KeyE: 'D#',
      // KeyD: 'E',
      // KeyF: 'F',
      // KeyT: 'F#',
      // KeyG: 'G',
      // KeyY: 'G#',
      // KeyH: 'A',
      // KeyU: 'A#',
      // KeyJ: 'B',
      KeyC: 'C',
      KeyD: 'D',
      KeyE: 'E',
      KeyF: 'F',
      KeyG: 'G',
      KeyA: 'A',
      KeyB: 'B',
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const c = keyToChordMap[event.code]
      if (c) playChord(c)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.repeat) return
      const c = keyToChordMap[event.code]
      if (c) haltPlayback()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [playChord, haltPlayback])

  return {
    ready,
    playChord,
    playRelativeChord,
    haltPlayback,
    changeKey,
  }
}

type Ctx = {
  ready: boolean
  playChord: (c: string, timeout?: number) => void
  playRelativeChord: (c: string, timeout?: number) => void
  haltPlayback: () => void
  changeKey: (key: string | null) => void
}

export const StrudelCtx = createContext<Ctx | null>(null)
