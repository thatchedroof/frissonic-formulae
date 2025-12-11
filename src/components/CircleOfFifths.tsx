import { mod } from 'src/lib/utils.js'
import { absolute_chord_to_root_maj } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { useMemo, useState } from 'react'

const major = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']
const minor = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'a#', 'f', 'c', 'g', 'd']

export default function CircleOfFifths({
  value,
  chords,
  times,
  activeIndex,
  songKey,
  outerRadius = 200,
  textStyle,
}: {
  value: number
  chords: string[]
  times: number[]
  activeIndex: number | null
  songKey: string | undefined
  outerRadius?: number
  textClassName?: string
  textStyle?: React.CSSProperties
}) {
  const innerRadius = outerRadius * 0.65
  const radius = outerRadius * 1.5

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
    [keyIndex, innerRadius, outerRadius],
  )

  const [prevLines, setPrevLines] = useState([])

  // Show intervals of jumps
  // Add minor circle
  // Trails that fade up to a point then stop fading
  // Ball bouncing
  // Use spline?
  // Compromise: normal chord names but the I is always at the top
  // Use CoF to show chords in and out of scale, surprising movements

  const chordPoints = useMemo(
    () => chordIndexes.map((idx) => (idx == null ? null : (circleCoords[idx] ?? null))),
    [chordIndexes, circleCoords],
  )

  const polylinePoints = chordPoints
    .filter((p): p is { x: number; y: number; note: string } => !!p)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  const maskRadius = outerRadius / 5

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`} className="w-60 h-60">
        {/* --- MASK: hide lines where notes are --- */}
        <defs>
          <radialGradient id="noteFade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="60%" stopColor="black" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>

          <mask id="chord-line-mask">
            <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} fill="white" />

            {/* Apply gradient masks for each note */}
            {circleCoords.map(({ x, y }, index) =>
              anyIsMinor || index < 12 ? (
                <circle
                  key={`mask-${index}`}
                  cx={x}
                  cy={y}
                  r={maskRadius} // outer radius of the fade
                  fill="url(#noteFade)"
                />
              ) : null,
            )}
          </mask>
        </defs>

        {/* <g opacity={0.5}>
          <rect
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            fill="white"
            stroke="black"
            strokeWidth={1}
          />
          {circleCoords.map(({ x, y }, index) =>
            anyIsMinor || index < 12 ? (
              <circle
                key={`debug-${index}`}
                cx={x}
                cy={y}
                r={maskRadius}
                fill="url(#noteFade)"
                stroke="red"
                strokeWidth={1}
              />
            ) : null,
          )}
        </g> */}

        {/* --- LINES between chords, with mask applied --- */}
        <g mask="url(#chord-line-mask)" /* className="text-muted-foreground" */>
          {chordPoints.map((pt, i) => {
            if (!pt || i === 0) return null
            const prev = chordPoints[i - 1]
            if (!prev) return null
            if (prev.x === pt.x && prev.y === pt.y) return null

            const pull = 0.54

            const controlX = (prev.x + pt.x) * (1 - pull)
            const controlY = (prev.y + pt.y) * (1 - pull)

            const d = `M ${prev.x} ${prev.y} Q ${controlX} ${controlY} ${pt.x} ${pt.y}`

            // --- label midpoint ---
            // const midX = 0.25 * prev.x + 0.5 * controlX + 0.25 * pt.x
            // const midY = 0.25 * prev.y + 0.5 * controlY + 0.25 * pt.y

            return (
              <g key={`curve-${i}`}>
                <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
              </g>
            )
          })}
        </g>

        {/* --- NOTES --- */}
        {circleCoords.map(
          ({ note, x, y }, index) =>
            (anyIsMinor || index < 12) && (
              <text
                key={note}
                x={x}
                y={y - 14}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-[Campania] transition-all duration-300 ${
                  activeIndex != null && index === chordIndexes[activeIndex]
                    ? 'fill-secondary-foreground font-semibold scale-110'
                    : 'fill-muted-foreground'
                }`}
                style={{
                  ...textStyle,
                  filter:
                    activeIndex != null && index === chordIndexes[activeIndex]
                      ? 'drop-shadow(2px 17px 4px rgba(0,0,0,.2))'
                      : 'drop-shadow(1px 4px 3px rgba(0,0,0,.4))',
                }}
              >
                {note}
              </text>
            ),
        )}
      </svg>
    </div>
  )
}
