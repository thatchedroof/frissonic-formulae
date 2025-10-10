import { absolute_chord_to_root_maj } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { useMemo, useState } from 'react'

export default function CircleOfFifths({
  value,
  chords,
  times,
  activeIndex,
}: {
  value: number
  chords: string[]
  times: number[]
  activeIndex: number | null
}) {
  const notes = [
    'C',
    'G',
    'D',
    'A',
    'E',
    'B',
    'F#',
    'C#',
    'G#',
    'D#',
    'A#',
    'F',
    'a',
    'e',
    'b',
    'f#',
    'c#',
    'g#',
    'd#',
    'a#',
    'f',
    'c',
    'g',
    'd',
  ]
  const outerRadius = 200
  const innerRadius = outerRadius * 0.65
  const radius = outerRadius * 1.5

  const { chordIndexes, anyIsMinor } = useMemo(() => {
    let anyIsMinor = false
    const chordIndexes = chords.map((chord) => {
      try {
        const rootMaj = absolute_chord_to_root_maj(chord)
        if (!rootMaj[1]) {
          anyIsMinor = true
          return ((rootMaj[0] * 7 + 9) % 12) + 12
        }
        return (rootMaj[0] * 7) % 12
      } catch (e) {
        console.error(e)
        return null
      }
    })
    return { chordIndexes, anyIsMinor }
  }, [chords])

  const circleCoords = notes.map((note, index) => {
    if (index >= 12) {
      const angle = ((index - 12) / 12) * 2 * Math.PI - Math.PI / 2
      const x = Math.cos(angle) * innerRadius
      const y = Math.sin(angle) * innerRadius
      return { note, x, y }
    } else {
      const angle = (index / 12) * 2 * Math.PI - Math.PI / 2
      const x = Math.cos(angle) * outerRadius
      const y = Math.sin(angle) * outerRadius
      return { note, x, y }
    }
  })

  const [prevLines, setPrevLines] = useState([])

  // Show intervals of jumps
  // Add minor circle
  // Trails that fade up to a point then stop fading
  // Ball bouncing
  // Use spline?
  // Compromise: normal chord names but the I is always at the top
  // Use CoF to show chords in and out of scale, surprising movements

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`} className="w-60 h-60">
        {circleCoords.map(
          ({ note, x, y }, index) =>
            (anyIsMinor || index < 12) && (
              <text
                key={note}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-[Campania] text-3xl transition-all duration-300 ${
                  index === chordIndexes[activeIndex ?? 0] ? 'fill-red-500 font-semibold scale-110' : 'fill-white'
                }`}
              >
                {note}
              </text>
            ),
        )}
      </svg>
    </div>
  )
}
