import { useEffect, useMemo, useRef, useState } from 'react'
import { ChordData } from 'src/lib/utils.js'
import ProgressBar from './ProgressBar.js'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible'
import { ChevronRight } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import CircleOfFifths from './CircleOfFifths.js'
import { useYouTubeController } from 'src/hooks/useYoutubeController.js'
import YouTubePlayer from './YouTubePlayer.js'
import { absoluteToRelative } from 'src/lib/chord.js'
import { motion, AnimatePresence } from 'motion/react'
import { buildRepeatTree } from '../lib/repeatTree'
import { RepeatTreeView } from './RepeatChords.js'

export default function SongPlayer({ data }: { data: ChordData }) {
  const [subKey, setSubKey] = useState<number>(0)

  const startTime = data.startTime?.[subKey]
  const endTime = data.endTime?.[subKey]
  const chordTimes = data.chordTimes?.[subKey]
  const chordSymbols = data.chordSymbols?.[subKey]
  const key = data.key?.[subKey]

  const chordTimeBounds = useMemo(() => {
    if (!chordTimes || chordTimes.length === 0) return null
    const max = chordTimes.toSorted((a, b) => b - a)[0]
    const min = chordTimes.toSorted((a, b) => a - b)[0]
    return { max, min }
  }, [chordTimes])

  const [relativeChordSymbols, setRelativeChordSymbols] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    setRelativeChordSymbols(chordSymbols?.map((chord) => (key ? absoluteToRelative(chord, key) : chord)))
  }, [chordSymbols, key])

  const {
    player,
    playerStarted,
    setPlaying,
    isPlaying,
    duration,
    playbackRates,
    currentPlaybackRate,
    currentState,
    handlers: { onPlayerReady, onPlay, onPause, onPlaybackRateChange, onStateChange },
  } = useYouTubeController(chordTimeBounds?.min)

  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined)

  // const currentTimeRef = useRef(currentTime)
  // useEffect(() => {
  //   currentTimeRef.current = currentTime
  // }, [currentTime])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null)
  const currentChordIndexRef = useRef(currentChordIndex)
  useEffect(() => {
    currentChordIndexRef.current = currentChordIndex
  }, [currentChordIndex])

  const [preCurrentChordIndex, setPreCurrentChordIndex] = useState<number | null>(null)
  const preCurrentChordIndexRef = useRef(preCurrentChordIndex)
  useEffect(() => {
    preCurrentChordIndexRef.current = preCurrentChordIndex
  }, [preCurrentChordIndex])

  useEffect(() => {
    if (!playerStarted) return

    let raf = 0
    const tick = () => {
      if (!isPlayingRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }

      // const lastTime = currentTimeRef.current
      const time = player.current?.getCurrentTime()
      setCurrentTime(time)

      const currentChordIndex = currentChordIndexRef.current
      const chordTimes = data.chordTimes?.[subKey]

      if (chordTimes && time !== undefined) {
        let newIndex: number | null = null
        for (let i = 0; i < chordTimes.length; i++) {
          if (time < chordTimes[i]) {
            newIndex = i === 0 ? null : i - 1
            break
          }
        }
        if (newIndex === null && time >= chordTimes[chordTimes.length - 1]) {
          newIndex = chordTimes.length - 1
        }
        if (newIndex !== currentChordIndex) {
          console.log(`Chord changed from ${currentChordIndex} to ${newIndex} at time ${time.toFixed(2)}`)
          setCurrentChordIndex(newIndex)
        }
      }

      const preCurrentChordIndex = preCurrentChordIndexRef.current

      if (chordTimes && time !== undefined) {
        let newPreIndex: number | null = null
        for (let i = 0; i < chordTimes.length; i++) {
          if (time < chordTimes[i] - 0.25) {
            newPreIndex = i === 0 ? null : i - 1
            break
          }
        }
        if (newPreIndex === null && time >= chordTimes[chordTimes.length - 1] - 0.25) {
          newPreIndex = chordTimes.length - 1
        }
        if (time >= chordTimes[chordTimes.length - 1] + 1) {
          newPreIndex = null
        }
        if (newPreIndex !== preCurrentChordIndex) {
          setPreCurrentChordIndex(newPreIndex)
        }
      }

      const startVol = 0.0
      const endVol = 1.0

      const startTime = Math.max(chordTimeBounds?.min ?? 0 - 1, 0)
      const endTime = chordTimeBounds?.min ?? 0
      const totalTime = (endTime ?? 0) - (startTime ?? 0)

      if (
        !isPlayingRef.current ||
        totalTime <= 0 ||
        time === undefined ||
        time < (startTime ?? 0) ||
        time > (endTime ?? 0)
      ) {
        raf = requestAnimationFrame(tick)
        return
      }

      const t = Math.min(Math.max((time - (startTime ?? 0)) / totalTime, 0), 1)
      const v = startVol + (endVol - startVol) * ease(t)
      console.log(`Setting volume to ${v.toFixed(2)}`)
      player.current?.setVolume(Math.floor(v * 100))

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)

    console.log('Effect ran: created interval for updating current time')
    return () => {
      if (intervalRef.current !== null) {
        console.log('Effect cleanup: clearing interval for updating current time')
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [playerStarted, data, subKey, chordTimeBounds, player])

  const [collapsibleState, setCollapsibleState] = useState<boolean | undefined>(undefined)
  const playerMin = Math.max(chordTimeBounds?.min ?? 0 - 1, 0)
  const playerMax = Math.min(chordTimeBounds?.max ?? 0 + 1, duration ?? Infinity)

  return (
    <div
      className={`p-4 rounded-lg m-3 hover:bg-card-foreground/10`}
      style={{ transition: 'background-color 0.2s ease, border 1s ease' }}
      onClick={() => {
        setCollapsibleState(!collapsibleState)
      }}
    >
      <Collapsible open={collapsibleState} onOpenChange={setCollapsibleState}>
        <CollapsibleTrigger className="text-lg font-medium mb-2 ml-1 flex flex-row items-center gap-2">
          <ChevronRight className={`h-6 w-6 transition-transform ${collapsibleState ? 'rotate-90' : ''}`} />
          <div onClick={(e) => e.stopPropagation()} className="w-md">
            <ProgressBar
              value={currentTime ?? 0}
              onValueChange={(value) => {
                console.log('Seeking to', value)
                player.current?.seekTo(typeof value === 'number' ? value : value(currentTime ?? 0), true)
              }}
              isPlaying={isPlaying}
              setIsPlaying={(play) => {
                console.log('Setting playing to', play)
                if (play && playerMax !== undefined && (currentTime ?? 0) >= playerMax) {
                  player.current?.seekTo(playerMin, true)
                }
                setPlaying(play)
              }}
              step={0.1}
              min={playerMin}
              max={playerMax}
              started={playerStarted}
              chords={relativeChordSymbols}
              times={chordTimes}
              activeIndex={currentChordIndex}
              buffering={/* currentState === 3 ||  */ currentState === -1}
            />
          </div>
          <h1 className="text-[1.6rem] font-bold ml-4 italic">
            {data.name}

            <AnimatePresence initial={false}>
              {collapsibleState && data.artists && data.artists.length > 0 && (
                <>
                  {' '}
                  <motion.span
                    key="artists"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="inline-flex overflow-hidden align-baseline"
                  >
                    <span className="whitespace-nowrap text-[1.6rem] font-bold text-muted-foreground">
                      {' by '}
                      {data.artists.length < 3
                        ? data.artists.join(' and ')
                        : `${data.artists.slice(0, -1).join(', ')} and ${data.artists.at(-1)}`}
                    </span>
                  </motion.span>
                </>
              )}
            </AnimatePresence>
          </h1>
        </CollapsibleTrigger>
        <CollapsibleContent
          forceMount
          className="
              data-[state=open]:animate-collapsible-down
              data-[state=closed]:animate-collapsible-up
              overflow-hidden
              data-[state=closed]:h-0
              grid
              place-items-center
            "
          style={{ gridTemplateColumns: 'auto 1fr' }}
        >
          <div className="flex flex-col items-center">
            <div
              className="m-4 h-fit w-fit"
              style={{
                transition: 'opacity 1s ease-in-out',
              }}
            >
              <YouTubePlayer
                videoId={data.videoId}
                playerStarted={playerStarted}
                onPlayerReady={onPlayerReady}
                onPlay={onPlay}
                onPause={onPause}
                onPlaybackRateChange={onPlaybackRateChange}
                onStateChange={onStateChange}
                onClick={() => {
                  setPlaying(true)
                }}
              />
            </div>

            {playbackRates && playbackRates.length > 1 && (
              <ToggleGroup
                onClick={(e) => e.stopPropagation()}
                type="single"
                className="inline-flex ml-1 mb-2 border-ring text-muted-foreground"
                value={currentPlaybackRate?.toString()}
                onValueChange={(value) => {
                  const rate = parseFloat(value)
                  if (player.current && !isNaN(rate)) {
                    player.current.setPlaybackRate(rate)
                  }
                }}
              >
                {playbackRates?.map((rate, i) => (
                  <ToggleGroupItem
                    key={i}
                    value={rate.toString()}
                    aria-label={`Toggle ${rate}x speed`}
                    className={`border-ring data-[state=on]:text-primary hover:bg-accent/50`}
                  >
                    {rate}x
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </div>
          {/* <ChordVis value={currentTime ?? 0} chords={chordSymbols ?? []} times={chordTimes ?? []} /> */}
          <div>
            <div className="border-ring p-2 rounded-lg border-2">
              <CircleOfFifths
                value={currentTime ?? 0}
                chords={chordSymbols ?? []}
                times={chordTimes ?? []}
                activeIndex={preCurrentChordIndex}
                songKey={key}
                outerRadius={300}
                textStyle={{ fontSize: '5rem' }}
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4 col-span-2 text-[1.4rem] font-[Campania] text-secondary-foreground">
              {false && relativeChordSymbols && chordSymbols && (
                <RepeatTreeView
                  nodes={buildRepeatTree(
                    chordSymbols.map((chord, idx) => [chord, relativeChordSymbols[idx]]),
                    (a, b) => {
                      return a[0] === b[0] && a[1] === b[1]
                    },
                  )}
                  renderLeaf={([chord, relativeChord], indices) => (
                    <div key={indices.join(',')} className="flex flex-col items-center">
                      {relativeChordSymbols && (
                        <div
                          className={`mb-2 ${currentChordIndex !== null && indices.includes(currentChordIndex) ? '' : 'opacity-30'}`}
                        >
                          {relativeChord}
                        </div>
                      )}
                      <div
                        className={`mb-2${currentChordIndex !== null && indices.includes(currentChordIndex) ? '' : 'opacity-30'}`}
                      >
                        {chord}
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
