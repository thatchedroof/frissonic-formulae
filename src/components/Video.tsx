import { useEffect, useRef, useState } from 'react'
import { data } from 'react-router-dom'
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube'

export default function Video({
  videoId,
  currentTime,
  setCurrentTime,
  updatedTime,
  duration,
}: {
  videoId: string
  currentTime: number | undefined
  setCurrentTime: (time: number | undefined) => void
  updatedTime: { value: number | undefined }
  duration: (time: number) => void
}) {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const player = useRef<YouTubePlayer | null>(null)

  useEffect(() => {
    setCurrentTime(updatedTime.value)
    if (player.current && typeof updatedTime.value === 'number' && !isNaN(updatedTime.value)) {
      player.current.seekTo(updatedTime.value, true)
    }
  }, [updatedTime, setCurrentTime])

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    player.current = event.target
    duration(event.target.getDuration())
  }

  const onPlay = () => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (player.current) {
          setCurrentTime(player.current.getCurrentTime())
        }
      }, 15)
    }
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
  return <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} onPlay={onPlay} onPause={onPause} />
}
