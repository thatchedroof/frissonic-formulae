import { useContext, useEffect, useRef, useState } from 'react'
import { StrudelCtx } from 'src/hooks/chordPlayer.js'
import { useSplineWorker } from 'src/hooks/useSplineWorker.js'
import Spline from 'src/lib/Spline'

export default function ChordVis({ value, chords, times }: { value: number; chords: string[]; times: number[] }) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [widths, setWidths] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const [maxMinTimes, setMaxMinTimes] = useState<{ max: number; min: number } | null>(null)
  const [opacity, setOpacity] = useState(0)

  const strudel = useContext(StrudelCtx)

  useEffect(() => {
    const newWidths = refs.current.map((el) => el?.getBoundingClientRect().width || 0)
    setWidths(newWidths)
  }, [chords])

  const { run } = useSplineWorker()
  const [memoizedOffsets, setMemoizedOffsets] = useState<{ time: number; value: number }[]>([])
  const [spline, setSpline] = useState<Spline | null>(null)

  useEffect(() => {
    let mounted = true
    if (times.length === 0 || widths.length === 0) {
      console.log('Not enough data to run spline worker')
      return
    }
    console.log('Running spline worker with times and widths')

    run({ times, widths }).then((res) => {
      if (!mounted) return
      if (res.ok) {
        setMemoizedOffsets(res.memoizedOffsets)
        const splineInstance = Spline.fromJSON(res.splineData)
        setSpline(splineInstance)
      } else console.error(res.error)
    })
    return () => {
      mounted = false
    }
  }, [times, widths, run])

  useEffect(() => {
    if (spline) {
      const offset = spline.at(value)
      // const closest = data.memoizedOffsets.reduce((prev, curr) =>
      //   Math.abs(curr.time - value) < Math.abs(prev.time - value) ? curr : prev,
      // )
      // const offset = closest.value
      setCurrentOffset(offset)
      // setSplineData((prev) => [...prev, { time: value, value: offset }].sort((a, b) => a.time - b.time))

      // Find the current time index
      const currentIndex = times.findIndex((time) => time >= value) - 1
      setActiveIndex(currentIndex)

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
  }, [value, maxMinTimes, times, spline])

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
              className="font-[Campania] text-2xl font-bold mb-1.5 text-secondary-foreground"
              ref={(el) => {
                refs.current[idx] = el
              }}
              style={{ opacity: activeIndex === null || activeIndex !== idx ? 0.3 : 1 }}
              onClick={() => {
                console.log('Clicked chord:', chord)
                if (!strudel?.ready) {
                  console.log('Strudel player not ready')
                  return
                }
                strudel?.playRelativeChord(chord, 500)
              }}
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
      {spline && (
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
