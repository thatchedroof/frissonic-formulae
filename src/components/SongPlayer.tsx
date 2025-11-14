import { useEffect, useMemo, useRef, useState } from 'react'
import { ChordData } from 'src/lib/utils.js'
import ProgressBar from './ProgressBar.js'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible'
import { ChevronRight } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import ChordVis from './ChordVis.js'
import CircleOfFifths from './CircleOfFifths.js'
import { useYouTubeController } from 'src/hooks/useYoutubeController.js'
import YouTubePlayer from './YouTubePlayer.js'
import { absolute_to_relative } from '../../frissonic-formulae/pkg/frissonic_formulae'

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
    setRelativeChordSymbols(chordSymbols?.map((chord) => (key ? absolute_to_relative(chord, key) : chord)))
  }, [chordSymbols, key])

  const {
    player,
    playerStarted,
    setPlaying,
    isPlaying,
    duration,
    playbackRates,
    currentPlaybackRate,
    handlers: { onPlayerReady, onPlay, onPause, onPlaybackRateChange },
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

  return (
    <div
      className={`p-4 rounded-lg m-3 hover:bg-accent ${collapsibleState ? 'bg-zinc-800' : ''}`}
      style={{ transition: 'background-color 0.3s ease, border 1s ease' }}
      onClick={() => {
        setCollapsibleState(!collapsibleState)
      }}
    >
      <Collapsible open={collapsibleState} onOpenChange={setCollapsibleState}>
        <CollapsibleTrigger className="text-lg font-medium italic mb-2 ml-1 flex flex-row items-center gap-2">
          <ChevronRight className={`h-3 w-3 transition-transform ${collapsibleState ? 'rotate-90' : ''}`} /> {data.name}
        </CollapsibleTrigger>
        <CollapsibleContent
          forceMount
          className="
              data-[state=open]:animate-collapsible-down
              data-[state=closed]:animate-collapsible-up
              overflow-hidden
              data-[state=closed]:h-0
            "
        >
          {playbackRates && playbackRates.length > 1 && (
            <ToggleGroup
              onClick={(e) => e.stopPropagation()}
              type="single"
              className="inline-flex ml-1 mb-2 border-ring"
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
                  className="border-ring"
                >
                  {rate}x
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <div
            className="m-4 max-w-3xl"
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
            />
          </div>
          <ChordVis value={currentTime ?? 0} chords={chordSymbols ?? []} times={chordTimes ?? []} />
          <CircleOfFifths
            value={currentTime ?? 0}
            chords={chordSymbols ?? []}
            times={chordTimes ?? []}
            activeIndex={currentChordIndex}
            songKey={key}
          />
        </CollapsibleContent>
      </Collapsible>
      <div onClick={(e) => e.stopPropagation()}>
        <ProgressBar
          value={currentTime ?? 0}
          onValueChange={(value) => {
            console.log('Seeking to', value)
            player.current?.seekTo(typeof value === 'number' ? value : value(currentTime ?? 0), true)
          }}
          isPlaying={isPlaying}
          setIsPlaying={(play) => {
            console.log('Setting playing to', play)
            setPlaying(play)
          }}
          step={0.1}
          min={Math.max(chordTimeBounds?.min ?? 0 - 1, 0)}
          max={Math.min(chordTimeBounds?.max ?? 0 + 1, duration ?? Infinity)}
          started={playerStarted}
          chords={relativeChordSymbols}
          times={chordTimes}
          activeIndex={currentChordIndex}
        />
      </div>
    </div>
  )
}
