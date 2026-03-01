import React, { useCallback, useMemo, useRef } from 'react'
import ChordVis from './ChordVis.js'
import { Spinner } from './ui/spinner.js'
import { Pause, Play } from 'lucide-react'

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
  buffering,
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
  buffering?: boolean
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

  const playStyle = 'h-5 w-5'

  return (
    <div className="w-full max-w-md">
      <div className="flex h-10 items-center rounded-lg bg-muted/60 border border-border/60 overflow-hidden transition-colors hover:border-border">
        <button
          aria-label={buffering ? 'Buffering' : isPlaying ? 'Pause' : 'Play'}
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex h-full w-10 shrink-0 items-center justify-center border-r border-border/40 hover:bg-accent/60 active:scale-[0.97] transition-all"
        >
          {isPlaying ? (
            <Pause color="transparent" className={playStyle + ' fill-foreground/70'} />
          ) : buffering ? (
            <Spinner className={playStyle + ' text-muted-foreground'} />
          ) : (
            <Play color="transparent" className={playStyle + ' fill-foreground/70'} />
          )}
        </button>

        <div
          className="relative h-full flex-1 select-none cursor-pointer"
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Progress"
          aria-valuetext={progressLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseDown={(e) => {
            setIsPlaying(true)
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
          <div
            className="absolute left-0 top-0 h-full bg-primary/15 transition-[width] duration-75"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-primary/60 transition-[left] duration-75"
            style={{ left: `${((value - min) / (max - min)) * 100}%` }}
          />
          <div className="absolute h-full w-full pointer-events-none flex justify-center items-center">
            {chords && times && started && <ChordVis value={value} chords={chords} times={times} />}
          </div>
        </div>
      </div>
    </div>
  )
}
