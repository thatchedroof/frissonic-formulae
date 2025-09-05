import { ChordData, chordDataToString, formatChords } from 'src/lib/utils.js'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from './ui/dialog.js'
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube'
import { Marker, TimelineTrack } from './TimelineTrack.js'
import { useEffect, useRef, useState } from 'react'
import Video from './Video'
import { Slider } from './ui/slider.js'
import { absolute_to_relative, relative_to_absolute } from '../../frissonic-formulae/pkg/frissonic_formulae'
import { Input } from './ui/input.js'
import { data } from 'react-router-dom'
// import { absolute_to_relative } from '../fri'
import ChordRecorder from './ChordRecorder'
import { Pattern } from '@strudel/core'
import { TabsList, TabsTrigger, TabsContent, Tabs } from './ui/tabs'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable.js'
import { Label } from './ui/label.js'

function updateDataKey<K extends keyof ChordData>(
  data: ChordData,
  key: K,
  value: ChordData[K],
  f: (data: ChordData) => void,
) {
  const newData = { ...data, [key]: value }
  f(newData)
}

export default function Song({
  data,
  close,
  updateData,
}: {
  data: ChordData
  close: () => void
  updateData: (data: ChordData) => void
}) {
  console.log('Rendering Song component with data:', data)

  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined)
  const [updatedTime, setUpdatedTime] = useState<{ value: number | undefined }>({ value: undefined })
  const [duration, setDuration] = useState<number | undefined>(undefined)

  const [relativeString, setRelativeString] = useState<string>(
    data.key && data.chords ? absolute_to_relative(data.chords, data.key) : '',
  )

  const [beats, setBeats] = useState<number[]>([])
  const [haps, setHaps] = useState<any[]>([])

  const [chordPattern, setChordPattern] = useState<Pattern>(formatChords(data.chords ?? '', data.multiplier))
  useEffect(() => {
    console.log('Updating chord pattern with data:', data)
    if (data.chords) {
      setChordPattern(formatChords(data.chords, data.multiplier))
    }
  }, [data])

  const currentTimeRef = useRef<number>(0)

  useEffect(() => {
    currentTimeRef.current = currentTime ?? 0
  }, [currentTime])

  const [markers, setMarkers] = useState<Marker[]>([])

  useEffect(() => {
    let newMarkers: Marker[] = []
    if (data.startTime !== undefined) newMarkers.push({ value: data.startTime, color: 'blue', showLabel: false })
    if (data.endTime !== undefined) newMarkers.push({ value: data.endTime, color: 'blue', showLabel: false })

    for (let beat of beats) {
      newMarkers.push({ value: beat, color: 'green', showLabel: false })
    }
    setMarkers(newMarkers)
  }, [data])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault()
        console.log('Start time:', data.startTime)

        if (data.startTime === undefined) {
          updateDataKey(data, 'startTime', currentTimeRef.current, updateData)
        } else {
          updateDataKey(data, 'startTime', undefined, updateData)
        }

        console.log('Start time set to:', data.startTime)
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        console.log('End time:', data.endTime)

        if (data.endTime === undefined) {
          updateDataKey(data, 'endTime', currentTimeRef.current, updateData)
        } else {
          updateDataKey(data, 'endTime', undefined, updateData)
        }

        console.log('End time set to:', data.endTime)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [data, updateData])

  function convertRelative(string: string = data.chords ?? '') {
    if (!data.key) return
    setRelativeString(absolute_to_relative(string, data.key))
  }

  function convertAbsolute(string: string = relativeString) {
    if (!data.key) return
    updateDataKey(data, 'chords', relative_to_absolute(string, data.key), updateData)
  }

  useEffect(() => {
    if (currentTime !== undefined && data.endTime !== undefined && currentTime >= data.endTime) {
      console.log('Looping back to start time:', data.startTime)
      setUpdatedTime({ value: data.startTime ?? 0 })
    }
  }, [currentTime, setCurrentTime, setUpdatedTime, data])

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
              value={data.key}
              onChange={(e) => updateDataKey(data, 'key', e.target.value, updateData)}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Chords (e.g. C, Dm, F#)"
              value={data.chords}
              onFocus={() => {
                convertRelative()
              }}
              onChange={(e) => {
                ;(updateDataKey(data, 'chords', e.target.value, updateData), convertRelative(e.target.value))
              }}
            />
            <Input
              className="mb-2 font-mono"
              placeholder="Relative Chords (e.g. I, ii, V)"
              value={relativeString}
              onFocus={() => {
                convertAbsolute()
              }}
              onChange={(e) => {
                setRelativeString(e.target.value)
                convertAbsolute(e.target.value)
              }}
            />
            <Label className="text-center">Current Time {currentTime}</Label>
            <div
              className="w-full overflow-scroll"
              ref={(el) => {
                if (!el) return
                const x = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
                const y = Math.max(0, (el.scrollHeight - el.clientHeight) / 2)
                el.scrollTo({ left: x, top: y, behavior: 'auto' })
              }}
            >
              <Video
                videoId={data.videoId!}
                currentTime={currentTime}
                updatedTime={updatedTime}
                setCurrentTime={setCurrentTime}
                duration={(time) => {
                  if (data.endTime === 0) {
                    updateDataKey(data, 'endTime', time, updateData)
                  }
                  setDuration(time)
                }}
              />
            </div>
            {duration && (
              <TimelineTrack
                value={currentTime}
                onChange={(value) => {
                  setUpdatedTime({ value })
                }}
                start={data.startTime ?? 0}
                end={data.endTime ?? duration}
                markers={markers ?? []}
                pixPerValue={0.1}
              />
            )}
            {duration && currentTime && (
              <Slider
                className="w-full touch-none select-none mx-0.5"
                value={[currentTime]}
                onValueChange={(value) => {
                  ;(setCurrentTime(value[0]), setUpdatedTime({ value: value[0] }))
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
            <ChordRecorder
              chords={chordPattern}
              key={data.key}
              currentTime={() => currentTime ?? 0}
              setCycles={(cycles) => updateDataKey(data, 'cycles', cycles, updateData)}
              beats={beats}
              setBeats={setBeats}
              haps={haps}
              setHaps={setHaps}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  )
}
