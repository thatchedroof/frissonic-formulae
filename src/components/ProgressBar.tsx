import { Pause, Play } from 'lucide-react'
import React, { useCallback, useMemo, useRef } from 'react'
import ChordVis from './ChordVis.js'

/**
 * MinimalMediaBar
 *
 * A compact media/progress bar inspired by the provided mock.
 * - Lucide icons on the left (Play/Pause)
 * - Rounded container with subtle border
 * - Click/drag to seek
 * - Keyboard accessible (Left/Right/Home/End)
 */
export default function ProgressBar({
  value,
  onValueChange,
  isPlaying,
  setIsPlaying,
  step,
  min,
  max,
  started,
  chords,
  times,
  activeIndex,
}: {
  value: number
  onValueChange: (value: number | ((prev: number) => number)) => void
  isPlaying: boolean
  setIsPlaying: (play: boolean) => void
  step: number
  min: number
  max: number
  started: boolean
  chords: string[] | undefined
  times: number[] | undefined
  activeIndex: number | null
}) {
  const barRef = useRef<HTMLDivElement | null>(null)

  const progressLabel = useMemo(() => `${Math.round(value)}%`, [value])

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const el = barRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      console.log('Seeking to x:', x, 'of', rect.width)
      console.log('Which is pct:', (x / rect.width) * 100)
      const pct = min + (x / rect.width) * (max - min)
      onValueChange(pct)
    },
    [max, min, onValueChange],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = 2
      if (e.key === 'ArrowRight') onValueChange((p) => Math.min(p + step, max))
      if (e.key === 'ArrowLeft') onValueChange((p) => Math.max(p - step, min))
      if (e.key.toLowerCase() === 'home') onValueChange(min)
      if (e.key.toLowerCase() === 'end') onValueChange(max)
    },
    [max, min, onValueChange],
  )

  return (
    <div className="w-full max-w-md">
      <div className="flex h-10 items-center rounded-[.5rem] border-[1.5px] border-ring bg-muted ring-1 ring-black/30 shadow-inner overflow-hidden">
        {/* Play/Pause button */}
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex h-full w-10 shrink-0 items-center justify-center border-r bg-muted hover:bg-accent active:scale-[0.97] transition"
        >
          {isPlaying ? (
            <Pause color="transparent" className="h-6 w-6 fill-muted-foreground" />
          ) : (
            <Play color="transparent" className="h-6 w-6 fill-muted-foreground" />
          )}
        </button>

        {/* Progress track */}
        <div
          className="relative h-full flex-1 select-none bg-muted border-l-[1.5px] border-ring"
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Progress"
          aria-valuetext={progressLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseDown={(e) => {
            if (!started) {
              setIsPlaying(true)
            }
            seekFromPointer(e.clientX)
            const move = (me: MouseEvent) => seekFromPointer(me.clientX)
            const up = () => {
              window.removeEventListener('mousemove', move)
              window.removeEventListener('mouseup', up)
            }
            window.addEventListener('mousemove', move)
            window.addEventListener('mouseup', up)
          }}
          ref={barRef}
        >
          {/* Fill (dark segment like the mock) */}
          <div
            className="absolute left-0 top-0 h-full bg-accent-foreground/20"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
          <div className="absolute h-full w-full pointer-none flex justify-center items-center">
            {chords && times && <ChordVis value={value} chords={chords} times={times} activeIndex={activeIndex} />}
          </div>
        </div>
      </div>
    </div>
  )
}
