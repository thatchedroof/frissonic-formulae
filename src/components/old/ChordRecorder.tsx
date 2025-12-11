// @ts-ignore
import { Pattern } from '@strudel/core'
import { useEffect, useState } from 'react'
import { AutosizeTextarea } from '../ui/textarea-autosize.js'
import { findNCycles } from 'src/lib/utils.js'
import { absoluteToRelative } from 'src/lib/chord.js'

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
      const [nCycles, newHaps] = findNCycles(newBeats.length, chords)
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
        {haps?.map((hap, idx) => (
          <div key={hap.value?.chord ?? idx} className="font-[Campania]">
            {key ? absoluteToRelative(hap.value.chord, key) : hap.value.chord}
          </div>
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
