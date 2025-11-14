import { mod } from 'src/lib/utils.js'
import { absolute_chord_to_root_maj } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { useMemo, useState } from 'react'

const major = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']
const minor = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'a#', 'f', 'c', 'g', 'd']
const outerRadius = 200
const innerRadius = outerRadius * 0.65
const radius = outerRadius * 1.5

export default function CircleOfFifths({
  value,
  chords,
  times,
  activeIndex,
  songKey,
}: {
  value: number
  chords: string[]
  times: number[]
  activeIndex: number | null
  songKey: string | undefined
}) {
  const keyIndex = Math.max(0, major.indexOf(songKey ?? 'C'))

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

  const circleCoords = useMemo(
    () =>
      major.concat(minor).map((note, index) => {
        let radius
        if (index >= 12) {
          radius = innerRadius
        } else {
          radius = outerRadius
        }

        const chordIndex = mod(index - keyIndex, 12)

        const angle = (chordIndex / 12) * 2 * Math.PI - Math.PI / 2
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        return { note, x, y }
      }),
    [keyIndex],
  )

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
                className={`font-[Campania] text-4xl transition-all duration-300 ${
                  index === chordIndexes[activeIndex ?? 0]
                    ? 'fill-secondary-foreground font-semibold scale-110'
                    : 'fill-muted-foreground'
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
