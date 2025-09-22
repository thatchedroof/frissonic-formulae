import { ChordData, InMsg } from 'src/lib/utils.js'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from './ui/dialog.js'
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube'
import { Marker, TimelineTrack } from './TimelineTrack.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Slider } from './ui/slider.js'
import { absolute_to_relative, relative_to_absolute } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { Input } from './ui/input.js'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable.js'
import { Label } from './ui/label.js'
import { AutosizeTextarea } from './ui/textarea-autosize.js'
import CyclesWorkerUrl from 'src/lib/cycles.worker.ts?worker'
import { Button } from './ui/button.js'

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
}: {
  inputData: ChordData
  close: () => void
  updateData: (data: ChordData) => void
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

  const [subKey, setSubKey] = useState<number>(0)

  const [duration, setDuration] = useState<number | undefined>(undefined)

  const [relativeString, setRelativeString] = useState<string>('')

  // const [beats, setBeats] = useState<number[]>([])
  // const beatsRef = useRef(beats)
  // useEffect(() => {
  //   beatsRef.current = beats
  // }, [beats, data])

  const [haps, setHaps] = useState<any[]>([])
  const [beatText, setBeatText] = useState('')

  const chords = data.chords?.[subKey]
  const key = data.key?.[subKey]
  const multiplier = data.multiplier?.[subKey]
  const startTime = data.startTime?.[subKey]
  const endTime = data.endTime?.[subKey]
  const beats = data.chordTimes?.[subKey]

  const workerRef = useRef<Worker | null>(null)

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
        updateDataSubKey(dataRef.current, 'cycles', subKey, e.data.nCycles, updateDataFunc)
        setHaps(e.data.haps)
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

  // Update markers when startTime, endTime, or beats change
  useEffect(() => {
    const newMarkers: Marker[] = []
    if (startTime !== undefined) newMarkers.push({ value: startTime, color: 'blue', showLabel: false })
    if (endTime !== undefined) newMarkers.push({ value: endTime, color: 'blue', showLabel: false })

    for (const beat of beats ?? []) {
      newMarkers.push({ value: beat, color: 'green', showLabel: false })
    }
    setMarkers(newMarkers)

    console.log('Effect ran: updated markers', { startTime, endTime, beats, newMarkers })
  }, [startTime, endTime, beats])

  const recordBeat = useCallback(() => {
    updateDataSubKey(
      data,
      'chordTimes',
      subKey,
      (prevBeats) => {
        const time = player.current?.getCurrentTime() ?? 0
        console.log('Recording beat at time:', time)
        playSound()
        const newBeats = [...(prevBeats ?? []), time]
        setBeatText(newBeats.map((b) => b.toFixed(4)).join('\n'))
        return newBeats
      },
      updateDataFunc,
    )
  }, [data, updateDataFunc, subKey])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const data = dataRef.current

      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault()
        console.log('Start time:', data.startTime)

        if (data.startTime === undefined) {
          updateDataSubKey(data, 'startTime', subKey, player.current?.getCurrentTime(), updateDataFunc)
        } else {
          updateDataSubKey(data, 'startTime', subKey, undefined, updateDataFunc)
        }

        console.log('Start time set to:', data.startTime)
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        console.log('End time:', data.endTime)

        if (data.endTime === undefined) {
          updateDataSubKey(data, 'endTime', subKey, player.current?.getCurrentTime(), updateDataFunc)
        } else {
          updateDataSubKey(data, 'endTime', subKey, undefined, updateDataFunc)
        }

        console.log('End time set to:', data.endTime)
      }

      if (event.key === 'c') {
        event.preventDefault()
        recordBeat()
      }

      if (event.key === ' ') {
        event.preventDefault()
        toggleVideo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    console.log('Effect ran: added keydown event listener')
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      console.log('Effect cleanup: removed keydown event listener')
    }
  }, [updateDataFunc, recordBeat, subKey])

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
      updateDataSubKey(dataRef.current, 'chords', subKey, relative_to_absolute(string, key), updateDataFunc)
    },
    [updateDataFunc, key, subKey],
  )

  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined)
  const player = useRef<YouTubePlayer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const currentTimeRef = useRef(currentTime)
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  // Update current time every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const lastTime = currentTimeRef.current
      const time = player.current?.getCurrentTime()
      setCurrentTime(time)

      if (beats && lastTime !== undefined) {
        const idx = beats.findIndex((beat) => beat > lastTime && beat <= (time ?? 0))

        if (idx !== -1) {
          playSound()
          console.log('Playing sound at beat:', beats[idx], 'currentTime:', time)
        }
      }

      if (time !== undefined && endTime !== undefined && time >= endTime) {
        console.log('Looping back to start time:', startTime)
        player.current?.seekTo(startTime ?? 0, true)
      }
    }, 100)

    console.log('Effect ran: created interval for updating current time')
    return () => {
      console.log('Effect cleanup: clearing interval for updating current time')
      clearInterval(interval)
    }
  }, [startTime, endTime, beats])

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    player.current = event.target
    const time = event.target.getDuration()

    if (endTime === 0) {
      updateDataSubKey(dataRef.current, 'endTime', subKey, time, updateDataFunc)
    }

    setDuration(time)
  }

  const onPause = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = undefined
  }

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

  const playSound = () => {
    const metronome = audioRef.current
    metronome.currentTime = 0
    metronome.play()
  }

  const toggleVideo = () => {
    if (player.current?.getPlayerState() === 1) {
      player.current.pauseVideo()
    } else {
      player.current.playVideo()
    }
  }

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
              onChange={(e) => updateDataSubKey(data, 'key', subKey, e.target.value, updateDataFunc)}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Chords (e.g. C, Dm, F#)"
              value={chords}
              onFocus={() => {
                convertRelative(chords ?? '')
              }}
              onChange={(e) => {
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
            <Label className="text-center">Current Time {player.current?.getCurrentTime()}</Label>
            <Label className="text-center">Start Time {startTime}</Label>
            <Label className="text-center">End Time {endTime}</Label>
            <div className="flex flex-row gap-2">
              <Button
                onClick={() => {
                  player.current?.playVideo()
                }}
              >
                Play
              </Button>
              <Button
                onClick={() => {
                  player.current?.pauseVideo()
                }}
              >
                Pause
              </Button>
              <Button onClick={recordBeat}>Record Beat</Button>
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
              <YouTube videoId={data.videoId!} opts={opts} onReady={onPlayerReady} onPause={onPause} />
            </div>
            {duration && (
              <TimelineTrack
                value={currentTime}
                onChange={(value) => {
                  player.current?.seekTo(value, true)
                }}
                start={startTime ?? 0}
                end={endTime ?? duration}
                markers={markers ?? []}
                pixPerValue={0.1}
              />
            )}
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
            <div className="flex flex-row items-start">
              <div className="mt-1.5">
                {haps?.map((hap, idx) => (
                  <div key={idx} className="font-[Campania]">
                    {key ? absolute_to_relative(hap.value.chord, key) : hap.value.chord}
                  </div>
                ))}
              </div>
              <AutosizeTextarea
                className="ml-4 flex-1 font-mono text-base"
                value={beatText}
                onChange={(e) => {
                  setBeatText(e.target.value)
                  updateDataSubKey(
                    data,
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  )
}
