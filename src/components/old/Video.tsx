import { forwardRef, useImperativeHandle, useRef } from 'react'
import YouTube, { YouTubePlayer, YouTubeProps } from 'react-youtube'

const Video = forwardRef(function Video(
  {
    videoId,
    duration,
  }: {
    videoId: string
    duration: (time: number) => void
  },
  ref,
) {
  const player = useRef<YouTubePlayer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    player.current = event.target
    duration(event.target.getDuration())
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

  useImperativeHandle(ref, () => ({
    play: () => player.current?.playVideo(),
    pause: () => player.current?.pauseVideo(),
    seek: (t: number) => player.current?.seekTo(t, true),
    getTime: () => {
      const t = player.current?.getCurrentTime()
      return typeof t === 'number' && !Number.isNaN(t) ? t : undefined
    },
    getPlayer: () => player.current,
  }))

  return <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} onPause={onPause} />
})

export default Video
