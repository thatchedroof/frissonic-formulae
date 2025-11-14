import { ChordData, InMsg, YoutubeData } from 'src/lib/utils.js'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from './ui/dialog.js'
import { Marker } from './TimelineTrack.js'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Slider } from './ui/slider.js'
import { absolute_to_relative, relative_to_absolute } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { Input } from './ui/input.js'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable.js'
import { Label } from './ui/label.js'
import { AutosizeTextarea } from './ui/textarea-autosize.js'
import CyclesWorkerUrl from 'src/lib/cycles.worker.ts?worker'
import { Button } from './ui/button.js'
import ChordVis from './ChordVis.js'
import { StrudelCtx } from 'src/hooks/chordPlayer.js'
import { useYouTubeController } from 'src/hooks/useYoutubeController.js'
import YouTubePlayer from './YouTubePlayer.js'
import { YouTubeProps } from 'react-youtube'

function updateDataKey<K extends keyof ChordData>(
  data: ChordData,
  key: K,
  value: ChordData[K] | ((prevState: ChordData[K]) => ChordData[K]),
  f: (data: ChordData) => void,
) {
  const newData = { ...data, [key]: typeof value === 'function' ? value(data[key]) : value }
  f(newData)
}

type Elem<T> = T extends readonly (infer U)[] ? U : never
type ArrayKeys<T> = {
  [P in keyof T]-?: T[P] extends readonly any[] ? P : never
}[keyof T]

function updateDataSubKey<K extends ArrayKeys<ChordData>>(
  data: ChordData,
  key: K,
  subKey: number,
  value: Elem<ChordData[K]> | ((prev: Elem<ChordData[K]>) => Elem<ChordData[K]>),
  f: (data: ChordData) => void,
) {
  const prevArray = (data[key] ?? []) as readonly Elem<ChordData[K]>[]
  const nextArray = [...prevArray]

  while (nextArray.length <= subKey) {
    nextArray.push(undefined as unknown as Elem<ChordData[K]>)
  }

  const prevValue = nextArray[subKey]

  nextArray[subKey] =
    typeof value === 'function' ? (value as (p: Elem<ChordData[K]>) => Elem<ChordData[K]>)(prevValue) : value

  const newData = { ...data, [key]: nextArray } as ChordData
  f(newData)
}

export default function Song({
  inputData,
  close,
  updateData,
  youtubeData,
}: {
  inputData: ChordData
  close: () => void
  updateData: (data: ChordData) => void
  youtubeData?: Promise<YoutubeData>
}) {
  // console.log('Rendering Song component with data:', data)
  const [data, setData] = useState<ChordData>(inputData)
  const updateDataRef = useRef(updateData)
  useEffect(() => {
    updateDataRef.current = updateData
    console.log('Effect ran: updateData prop changed, updated ref')
  }, [updateData])

  useEffect(() => {
    setData(inputData)
    console.log('Effect ran: inputData changed, updated data state', { inputData })
  }, [inputData])

  const updateDataFunc = useCallback(
    (newData: ChordData) => {
      setData(newData)
      updateData(newData)
    },
    [updateData],
  )

  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const {
    player,
    playerStarted,
    setPlaying,
    toggleVideo,
    duration,
    playbackRates,
    currentPlaybackRate,
    handlers: { onPlayerReady, onPlay, onPause, onPlaybackRateChange },
  } = useYouTubeController()

  const playSound = useCallback((level: number = 1) => {
    const metronome = audioRef.current
    metronome.currentTime = 0
    metronome.volume = 1 - (level - 1) * 0.1
    metronome.play()
  }, [])

  const [subKey, setSubKey] = useState<number>(0)

  const [relativeString, setRelativeString] = useState<string>('')

  // const [beats, setBeats] = useState<number[]>([])
  // const beatsRef = useRef(beats)
  // useEffect(() => {
  //   beatsRef.current = beats
  // }, [beats, data])
  const [beatText, setBeatText] = useState<string | null>(null)

  const chords = data.chords?.[subKey]
  const key = data.key?.[subKey]
  const multiplier = data.multiplier?.[subKey]
  const startTime = data.startTime?.[subKey]
  const endTime = data.endTime?.[subKey]
  const beats = data.chordTimes?.[subKey]
  const comment = data.comment

  const workerRef = useRef<Worker | null>(null)

  const [haps, setHaps] = useState<any[]>([])
  const relativeChordSymbols = useMemo(
    () => data.chordSymbols?.[subKey].map((chord) => (key ? absolute_to_relative(chord, key) : chord) as string),
    [data.chordSymbols, subKey, key],
  )

  useEffect(() => {
    if (beatText === null && beats) {
      setBeatText((beats ?? []).map((b) => b.toFixed(4)).join('\n'))
    }
  }, [beats, beatText])

  useEffect(() => {
    if (key && chords) {
      setRelativeString(absolute_to_relative(chords, key))
    }
  }, [key, chords, subKey])

  // Function to initialize and handle the web worker
  useEffect(() => {
    const w = new CyclesWorkerUrl() as unknown as Worker
    workerRef.current = w

    w.onmessage = (e: MessageEvent<any>) => {
      if (e.data.type === 'result') {
        // @ts-ignore
        updateDataSubKey(dataRef.current, 'cycles', subKey, e.data.nCycles, updateDataFunc)
        setHaps(e.data.haps)
        updateDataSubKey(
          dataRef.current,
          // @ts-ignore
          'chordSymbols',
          subKey,
          e.data.haps.map((hap: any) => hap.value.chord),
          updateDataFunc,
        )
      }
    }

    w.postMessage({ type: 'init', chords, multiplier })

    console.log('Effect ran: initialized worker with chords and multiplier', { chords, multiplier })
    return () => {
      workerRef.current = null
      console.log('Effect cleanup: terminating worker')
      w.terminate()
    }
  }, [chords, multiplier, updateDataFunc, subKey])

  const [markers, setMarkers] = useState<Marker[]>([])

  const [ytData, setYtData] = useState<YoutubeData | null>(null)

  useEffect(() => {
    if (!youtubeData) return
    let ignore = false
    ;(async () => {
      const data = await youtubeData
      if (!ignore) {
        setYtData(data)
      }
    })()
    return () => {
      ignore = true
    }
  }, [youtubeData])

  // Update markers when startTime, endTime, or beats change
  useEffect(() => {
    const newMarkers: Marker[] = []
    if (startTime !== undefined) newMarkers.push({ value: startTime, color: 'blue', showLabel: false })
    if (endTime !== undefined) newMarkers.push({ value: endTime, color: 'blue', showLabel: false })

    for (const beat of beats ?? []) {
      newMarkers.push({ value: beat, color: 'green', showLabel: false })
    }

    for (const [beat, level] of ytData?.beats ?? []) {
      const o = 0.5 - (level - 1) * 0.1
      newMarkers.push({ value: beat, color: `rgba(0, 0, 0, ${o})`, showLabel: false })
    }

    for (const [chordStart, chordEnd, chord] of ytData?.chords ?? []) {
      newMarkers.push({ value: chordStart, color: 'purple', showLabel: true, label: chord })
    }

    setMarkers(newMarkers)

    console.log('Effect ran: updated markers', { startTime, endTime, beats, newMarkers })
  }, [startTime, endTime, beats, ytData])

  const recordBeat = useCallback(() => {
    updateDataSubKey(
      data,
      // @ts-ignore
      'chordTimes',
      subKey,
      (prevBeats) => {
        const time = player.current?.getCurrentTime() ?? 0
        console.log('Recording beat at time:', time)
        playSound()
        const newBeats = [...(prevBeats ?? []), time]
        newBeats.sort((a, b) => a - b)
        setBeatText(newBeats.map((b) => b.toFixed(4)).join('\n'))
        return newBeats
      },
      updateDataFunc,
    )
  }, [data, updateDataFunc, subKey, playSound, player])

  const hoveredChordIndex = useRef<number | null>(null)
  const [seekTo, setSeekTo] = useState<number | null>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName.toLowerCase()

      if (tag === 'input' || tag === 'textarea' || (event.target as HTMLElement).isContentEditable) {
        return
      }

      const data = dataRef.current

      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault()
        console.log('Start time:', data.startTime?.[subKey])

        if (data.startTime?.[subKey] === undefined) {
          // @ts-ignore
          updateDataSubKey(data, 'startTime', subKey, player.current?.getCurrentTime(), updateDataFunc)
        } else {
          // @ts-ignore
          updateDataSubKey(data, 'startTime', subKey, undefined, updateDataFunc)
        }

        console.log('Start time set to:', data.startTime?.[subKey])
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        console.log('End time:', data.endTime?.[subKey])

        if (data.endTime?.[subKey] === undefined) {
          // @ts-ignore
          updateDataSubKey(data, 'endTime', subKey, player.current?.getCurrentTime(), updateDataFunc)
        } else {
          // @ts-ignore
          updateDataSubKey(data, 'endTime', subKey, undefined, updateDataFunc)
        }

        console.log('End time set to:', data.endTime?.[subKey])
      }

      if (event.key === 'c') {
        event.preventDefault()
        recordBeat()
      }

      if (event.key === ' ') {
        event.preventDefault()
        toggleVideo()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const newTime = (currentTimeRef.current ?? 0) - 0.1
        setSeekTo(currentTimeRef.current ?? null)
        setPlaying(true)
        console.log('Seeking to:', currentTimeRef.current)

        player.current?.seekTo(Math.max(0, newTime), true)
        setCurrentTime(newTime)
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setSeekTo(currentTimeRef.current ? currentTimeRef.current + 0.1 : null)
        setPlaying(true)
        console.log('Seeking to:', currentTimeRef.current)
      }

      if (hoveredChordIndex.current !== null) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          let delta = event.key === 'ArrowUp' ? 0.001 : -0.001
          if (event.shiftKey) {
            delta *= 10
          }

          event.preventDefault()
          setBeatText(null)
          updateDataSubKey(
            dataRef.current,
            // @ts-ignore
            'chordTimes',
            subKey,
            (prevBeats: number[] | undefined) => {
              if (!prevBeats || hoveredChordIndex.current === null) return prevBeats
              const newBeats = [...prevBeats]
              newBeats[hoveredChordIndex.current] = Math.max(0, newBeats[hoveredChordIndex.current] + delta)
              return newBeats
            },
            updateDataFunc,
          )
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    console.log('Effect ran: added keydown event listener')
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      console.log('Effect cleanup: removed keydown event listener')
    }
  }, [updateDataFunc, recordBeat, subKey, toggleVideo, player, setPlaying])

  const convertRelative = useCallback(
    (string: string) => {
      if (!key) return
      setRelativeString(absolute_to_relative(string, key))
    },
    [key],
  )

  const convertAbsolute = useCallback(
    (string: string) => {
      if (!dataRef.current.key) return
      // @ts-ignore
      updateDataSubKey(dataRef.current, 'chords', subKey, relative_to_absolute(string, key), updateDataFunc)
    },
    [updateDataFunc, key, subKey],
  )

  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null)

  const currentTimeRef = useRef(currentTime)
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    if (seekTo !== null && currentTime !== undefined && currentTime >= seekTo) {
      console.log('Successfully seeked to:', currentTime)
      setSeekTo(null)
      setPlaying(false)
    }
  }, [seekTo, currentTime, setPlaying])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const lastTime = currentTimeRef.current
      const time = player.current?.getCurrentTime()
      setCurrentTime(time)

      if (beats && lastTime !== undefined) {
        const idx = beats.findIndex((beat) => beat > lastTime && beat <= (time ?? 0))

        if (idx !== -1) {
          setCurrentBeatIndex(idx)
          // playSound()
          console.log('Playing sound at beat:', beats[idx], 'currentTime:', time)
        }
      }

      if (ytData?.beats && lastTime !== undefined) {
        const idx = ytData.beats.findIndex(([beat, level]) => beat > lastTime && beat <= (time ?? 0))

        if (idx !== -1) {
          // playSound(ytData.beats[idx][1])
          console.log('Playing sound at beat:', ytData.beats[idx], 'currentTime:', time)
        }
      }

      if (time !== undefined && endTime !== undefined && time >= endTime) {
        console.log('Looping back to start time:', startTime)
        player.current?.seekTo(startTime ?? 0, true)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    console.log('Effect ran: created interval for updating current time')
    return () => {
      console.log('Effect cleanup: clearing interval for updating current time')
      cancelAnimationFrame(raf)
    }
  }, [startTime, endTime, beats, playSound, ytData, player])

  const opts: YouTubeProps['opts'] = {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      showinfo: 0,
      playsinline: 1,
      rel: 0,
    },
  }

  const audioRef = useRef(new Audio('/metronome_1.mp3'))

  const [ytChords, ytTimes] = useMemo(() => {
    console.log('ytData', ytData)
    if (!ytData) return [[], []]
    const result = ytData?.chords.map(([s, e, chord]) => {
      const newChord = chord.replace(':maj', '').replace(':min', 'm')
      if (!key) return newChord
      return absolute_to_relative(newChord, key)
    })
    const times = ytData?.chords.map(([start]) => start)
    return [result, times]
  }, [ytData, key])

  const strudel = useContext(StrudelCtx)

  useEffect(() => {
    if (!strudel) return
    strudel.changeKey(key ?? null)
  }, [key, strudel])

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="w-[100vw] sm:max-w-[100vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{data.name}</DialogTitle>
          </div>
        </DialogHeader>

        <ResizablePanelGroup direction="horizontal" className="rounded-lg border w-fill">
          <ResizablePanel defaultSize={50} className="flex flex-col gap-2 m-5 overflow-scroll">
            <Input
              className="mb-2 font-mono"
              placeholder="Key (e.g. C, Dm, F#)"
              value={key}
              onChange={(
                e, // @ts-ignore
              ) => updateDataSubKey(data, 'key', subKey, e.target.value, updateDataFunc)}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Chords (e.g. C, Dm, F#)"
              value={chords}
              onFocus={() => {
                convertRelative(chords ?? '')
              }}
              onChange={(e) => {
                // @ts-ignore
                updateDataSubKey(data, 'chords', subKey, e.target.value, updateDataFunc)
                convertRelative(e.target.value)
              }}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Relative Chords (e.g. I, ii, V)"
              value={relativeString}
              onFocus={() => {
                convertAbsolute(relativeString)
              }}
              onChange={(e) => {
                setRelativeString(e.target.value)
                convertAbsolute(e.target.value)
              }}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Comment"
              value={comment}
              onChange={(
                e, // @ts-ignore
              ) => updateDataKey(data, 'comment', e.target.value, updateDataFunc)}
            />
            <Label className="text-center">Current Time {player.current?.getCurrentTime()}</Label>
            <Label className="text-center">Start Time {startTime}</Label>
            <Label className="text-center">End Time {endTime}</Label>
            <div className="flex flex-row gap-2">
              <Button
                onClick={() => {
                  setPlaying(true)
                }}
              >
                Play
              </Button>
              <Button
                onClick={() => {
                  setPlaying(false)
                }}
              >
                Pause
              </Button>
              <Button onClick={recordBeat}>Record Beat</Button>
              {playbackRates?.map((rate, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    player.current?.setPlaybackRate(rate)
                  }}
                  disabled={currentPlaybackRate === rate}
                >
                  {rate}x
                </Button>
              ))}
            </div>
            <div
              className="w-full overflow-scroll"
              ref={(el) => {
                if (!el) return
                const x = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
                const y = Math.max(0, (el.scrollHeight - el.clientHeight) / 2)
                el.scrollTo({ left: x, top: y, behavior: 'auto' })
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
            {/* {duration && (
              <TimelineTrack
                value={currentTime}
                onChange={(value) => {
                  player.current?.seekTo(value, true)
                }}
                start={startTime ?? 0}
                end={endTime ?? duration}
                markers={markers ?? []}
                pixPerValue={0.01}
              />
            )} */}
            {duration && player.current?.getCurrentTime() && (
              <Slider
                className="w-full touch-none select-none mx-0.5"
                value={[currentTime ?? 0]}
                onValueChange={(value) => {
                  player.current?.seekTo(value[0], true)
                }}
                step={0.1}
                min={0}
                max={duration}
                aria-label="Video progress"
              ></Slider>
            )}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} className="flex flex-col gap-2 m-5">
            <div className="overflow-x-scroll overflow-auto h-[70vh]">
              <Button
                onClick={() => {
                  setTimeout(() => {
                    workerRef.current?.postMessage({
                      type: 'compute',
                      length: beats?.length ?? 0,
                    } as InMsg)
                  }, 100)
                }}
              >
                Compute Cycles
              </Button>
              <div className="mt-2.5 flex flex-row items-stretch">
                <div className="mt-1.5 mb-5.5 flex flex-col justify-between items-end">
                  {beatText?.split('\n').map((_, index) =>
                    relativeChordSymbols?.[index] ? (
                      <div
                        key={index}
                        className="h-6 overflow-hidden flex justify-end items-end hover:opacity-70"
                        onMouseEnter={() => (hoveredChordIndex.current = index)}
                        onMouseLeave={() => {
                          if (hoveredChordIndex.current === index) {
                            hoveredChordIndex.current = null
                          }
                        }}
                      >
                        <div className="font-[Campania]">{relativeChordSymbols[index]}</div>
                      </div>
                    ) : (
                      <div
                        key={index}
                        className="mt-2.5 h-2 w-2 mb-1.5 rounded-full bg-primary hover:opacity-70"
                        onMouseEnter={() => (hoveredChordIndex.current = index)}
                        onMouseLeave={() => {
                          if (hoveredChordIndex.current === index) {
                            hoveredChordIndex.current = null
                          }
                        }}
                      ></div>
                    ),
                  )}
                </div>
                <AutosizeTextarea
                  className="ml-4 flex-1 font-mono text-base"
                  value={beatText ?? ''}
                  onChange={(e) => {
                    setBeatText(e.target.value)
                    updateDataSubKey(
                      data,
                      // @ts-ignore
                      'chordTimes',
                      subKey,
                      e.target.value
                        .split('\n')
                        .map((line) => parseFloat(line))
                        .filter((n) => !isNaN(n)),
                      updateDataFunc,
                    )
                  }}
                />
              </div>
              {/* <div className="text-2xl font-bold ml-4 mt-1.5 font-[Campania]">
              {currentBeatIndex !== null && relativeChordSymbols[currentBeatIndex]}
            </div> */}
              {relativeChordSymbols && data?.chordTimes?.[subKey] && (
                <ChordVis value={currentTime ?? 0} chords={relativeChordSymbols} times={data?.chordTimes?.[subKey]} />
              )}
              <ChordVis value={currentTime ?? 0} chords={ytChords} times={ytTimes} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        {/* <ChordPlayer /> */}
      </DialogContent>
    </Dialog>
  )
}
