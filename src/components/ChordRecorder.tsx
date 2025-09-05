// @ts-ignore
import { TimeSpan, Fraction, Pattern, State, Hap } from '@strudel/core'
import { absolute_to_relative } from '../../frissonic-formulae/pkg/frissonic_formulae.js'
import { useEffect, useState } from 'react'
import { Marker } from './TimelineTrack.js'
import { Textarea } from './ui/textarea.js'
import { AutosizeTextarea } from './ui/textarea-autosize.js'
import { findNCycles } from 'src/lib/utils.js'

export default function ChordRecorder({
  chords,
  key,
  currentTime,
  setCycles,
  beats,
  setBeats,
  haps,
  setHaps,
}: {
  chords: Pattern
  key: string | undefined
  currentTime: () => number
  setCycles: (n: number[]) => void
  beats: number[]
  setBeats: React.Dispatch<React.SetStateAction<number[]>>
  haps: any[]
  setHaps: React.Dispatch<React.SetStateAction<any[]>>
}) {
  const [beatText, setBeatText] = useState('')

  function recordBeat() {
    const time = currentTime()
    setBeats((prevBeats) => {
      const newBeats = [...prevBeats, time]
      let [nCycles, newHaps] = findNCycles(newBeats.length, chords)
      setCycles([nCycles])
      setHaps(newHaps)
      setBeatText(newBeats.map((b) => b.toFixed(4)).join('\n'))
      return newBeats
    })
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        console.log('Spacebar pressed, recording beat at time:', currentTime())
        event.preventDefault()
        recordBeat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [beats, setBeats])

  return (
    <div className="flex flex-row items-start">
      <div className="mt-1.5">
        {haps?.map((hap) => (
          <div className="font-[Campania]">{key ? absolute_to_relative(hap.value.chord, key) : hap.value.chord}</div>
        ))}
      </div>
      <AutosizeTextarea
        className="ml-4 flex-1 font-mono text-base"
        value={beatText}
        onChange={(e) => {
          setBeatText(e.target.value)
          setBeats(
            e.target.value
              .split('\n')
              .map((line) => parseFloat(line))
              .filter((n) => !isNaN(n)),
          )
        }}
      />
    </div>
  )
}
