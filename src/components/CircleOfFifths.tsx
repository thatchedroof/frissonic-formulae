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
      <svg viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`} className="w-56 h-56">
        <defs>
          <radialGradient id="noteFade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="60%" stopColor="black" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>

          <filter id="activeGlow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <mask id="chord-line-mask">
            <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} fill="white" />
            {circleCoords.map(({ x, y }, index) =>
              anyIsMinor || index < 12 ? (
                <circle
                  key={`mask-${index}`}
                  cx={x}
                  cy={y}
                  r={maskRadius}
                  fill="url(#noteFade)"
                />
              ) : null,
            )}
          </mask>
        </defs>

        <g mask="url(#chord-line-mask)">
          {chordPoints.map((pt, i) => {
            if (!pt || i === 0) return null
            const prev = chordPoints[i - 1]
            if (!prev) return null
            if (prev.x === pt.x && prev.y === pt.y) return null

            const pull = 0.54
            const controlX = (prev.x + pt.x) * (1 - pull)
            const controlY = (prev.y + pt.y) * (1 - pull)
            const d = `M ${prev.x} ${prev.y} Q ${controlX} ${controlY} ${pt.x} ${pt.y}`

            return (
              <g key={`curve-${i}`}>
                <path d={d} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
              </g>
            )
          })}
        </g>

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
                    ? 'fill-primary font-semibold'
                    : 'fill-muted-foreground/80'
                }`}
                style={{
                  ...textStyle,
                  filter:
                    activeIndex != null && index === chordIndexes[activeIndex]
                      ? undefined
                      : undefined,
                }}
                {...(activeIndex != null && index === chordIndexes[activeIndex] ? { filter: 'url(#activeGlow)' } : {})}
              >
                {note}
              </text>
            ),
        )}
      </svg>
    </div>
  )
}
