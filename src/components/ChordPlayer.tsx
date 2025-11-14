import { evalScope, repl, chord, n } from '@strudel/core'
import { mini } from '@strudel/mini'
import { initAudioOnFirstClick, samples, getAudioContext, webaudioOutput, registerSynthSounds } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
import { useCallback, useEffect, useRef } from 'react'
// @ts-ignore
import { voicing } from '@strudel/tonal'

export default function ChordPlayer() {
  voicing
  const replRef = useRef<ReturnType<typeof repl> | null>(null)

  // Load strudel
  useEffect(() => {
    const loadStrudel = async () => {
      async function prebake() {
        initAudioOnFirstClick() // needed to make the browser happy (don't await this here..)
        const loadModules = evalScope(
          import('@strudel/core'),
          import('@strudel/draw'),
          import('@strudel/mini'),
          import('@strudel/tonal'),
          import('@strudel/webaudio'),
        )
        await Promise.all([
          loadModules,
          registerSynthSounds(),
          // registerSoundfonts(),
        ])
      }

      function getTime() {
        return getAudioContext().currentTime
      }

      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1)
      }

      const id = s4()

      replRef.current = repl({
        defaultOutput: webaudioOutput,
        getTime,
        id,
        transpiler,
        beforeEval: async () => {
          await prebake()
        },
      })

      const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'

      await samples(`${ds}/piano.json`, `${ds}/piano/`)
      await samples(`${ds}/vcsl.json`, `${ds}/vcsl/`)
      await samples('github:tidalcycles/dirt-samples')
      await samples('https://sound.intercrap.com/strudel/mellotron/strudel.json')
    }

    loadStrudel()
  }, [])

  const playChord = useCallback((chordInput: string) => {
    console.log('Playing chord:', chordInput, chord(mini(chordInput)))
    const result1 = n(mini('[1,2,3,4]'))
    console.log(result1)
    const result2 = result1.set(chord(mini(`${chordInput}`)))
    console.log(result2)
    const result3 = result2.voicing().clip(1).release(0.5).s('piano').room(0.2)
    console.log(result3)
    replRef.current?.setPattern(result3)
  }, [])

  const haltPlayback = useCallback(() => {
    replRef.current?.setPattern(n())
    replRef.current?.stop()
  }, [])

  // Set up event listeners for playing and stopping chords
  useEffect(() => {
    const keyToChordMap: { [key: string]: string } = {
      KeyA: 'C',
      KeyW: 'C#',
      KeyS: 'D',
      KeyE: 'D#',
      KeyD: 'E',
      KeyF: 'F',
      KeyT: 'F#',
      KeyG: 'G',
      KeyY: 'G#',
      KeyH: 'A',
      KeyU: 'A#',
      KeyJ: 'B',
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const chord = keyToChordMap[event.code]
      if (chord) {
        playChord(chord)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.repeat) return
      const chord = keyToChordMap[event.code]
      if (chord) {
        haltPlayback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [playChord, haltPlayback])

  return null
}
