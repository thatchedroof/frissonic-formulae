import { useEffect, useRef, useState } from 'react'
// import { MonotoneCubicSpline } from '../../frissonic-formulae/pkg/frissonic_formulae'
import Spline from 'typescript-cubic-spline'

function cumWidths(widths: number[], spaceBetween: number): number[] {
  const result: number[] = []
  let total = 0
  for (let i = 0; i < widths.length; i++) {
    total += widths[i] / 2
    result.push(total)
    total += widths[i] / 2
    total += spaceBetween
  }
  return result
}

export default function ChordVis({
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
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const spline = useRef<Spline | null>(null)
  const [widths, setWidths] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [splineData, setSplineData] = useState<{ time: number; value: number }[]>([])
  const [memoizedOffsets, setMemoizedOffsets] = useState<{ time: number; value: number }[]>([])

  const [maxMinTimes, setMaxMinTimes] = useState<{ max: number; min: number } | null>(null)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const newWidths = refs.current.map((el) => el?.getBoundingClientRect().width || 0)
    setWidths(newWidths)
  }, [chords])

  useEffect(() => {
    if (widths.length > 0 && times.length > 0) {
      try {
        console.log('Creating Spline with times:', times, 'and widths:', widths)
        spline.current = new Spline(times, cumWidths(widths, 8))

        const maxTime = times.toSorted((a, b) => b - a)[0]
        const minTime = times.toSorted((a, b) => a - b)[0]
        setMaxMinTimes({ max: maxTime, min: minTime })

        const step = 0.001
        const newTimes = []
        for (let t = minTime; t <= maxTime; t += step) {
          newTimes.push({ time: t, value: spline.current.at(t) })
        }
        // console.log('New times for spline:', newTimes)
        setMemoizedOffsets(newTimes)

        const newSplineData: { time: number; value: number }[] = []
        for (let t = times[0]; t <= times[times.length - 1]; t += 1 / 100) {
          if (spline.current) {
            newSplineData.push({ time: t, value: spline.current.at(t) })
          }
        }
        setSplineData(newSplineData)
        setError(null)
      } catch (e) {
        setError((e as Error).message)
        console.error('Error creating Spline:', e)
      }
    }
  }, [widths, times])

  useEffect(() => {
    if (spline.current) {
      const offset = spline.current.at(value)
      // const closest = memoizedOffsets.reduce((prev, curr) =>
      //   Math.abs(curr.time - value) < Math.abs(prev.time - value) ? curr : prev,
      // )
      // const offset = closest.value
      setCurrentOffset(offset)
      // setSplineData((prev) => [...prev, { time: value, value: offset }].sort((a, b) => a.time - b.time))

      if (maxMinTimes) {
        const buffer = 0.5
        if (value < maxMinTimes.min - buffer || value > maxMinTimes.max + buffer) {
          setOpacity(0)
        } else {
          setOpacity(1)
        }
      }
    } else {
      setCurrentOffset(0)
    }
  }, [value, memoizedOffsets, maxMinTimes])

  return (
    <div
      style={{
        opacity: opacity,
        transition: 'opacity 1s ease-in-out',
      }}
    >
      <div
        className="relative overflow-hidden w-[200px]"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <div className="flex space-x-2" style={{ transform: `translateX(${100 - currentOffset}px)` }}>
          {chords?.map((chord, idx) => (
            <div
              key={idx}
              className="font-[Campania] text-2xl font-bold mb-1.5 text-muted-foreground"
              ref={(el) => {
                refs.current[idx] = el
              }}
              style={{ opacity: activeIndex === null || activeIndex !== idx ? 0.3 : 1 }}
            >
              {chord}
            </div>
          ))}
        </div>
      </div>

      {/* <ul>
        {widths.map((w, i) => (
          <li key={i}>
            {chords[i]} → {w.toFixed(2)}px ({times[i]}s){' '}
          </li>
        ))}
      </ul> */}
      {error && <div className="text-red-500">Error: {error}</div>}
      {spline.current && (
        <>
          {/* <div className="mt-4">
            <div className="relative h-6 w-full max-w-lg bg-zinc-800/90 border border-black/40">
              <div
                className="absolute top-0 left-0 h-6 bg-blue-500/70"
                style={{
                  width: `${currentOffset}px`,
                  transition: 'width 0.1s linear',
                }}
              ></div>
            </div>
          </div> */}

          {/* <ChartContainer config={{}}>
            <LineChart data={splineData}>
              <Line dataKey="value" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </LineChart>
          </ChartContainer> */}
        </>
      )}
    </div>
  )
}
