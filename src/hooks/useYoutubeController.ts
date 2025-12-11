import { useCallback, useRef, useState } from 'react'
import { YouTubeEvent, YouTubePlayer, YouTubeProps } from 'react-youtube'

export function useYouTubeController(startAt?: number) {
  const player: React.RefObject<YouTubePlayer | null> = useRef<YouTubePlayer | null>(null)
  const [playerStarted, setPlayerStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | undefined>()
  const [playbackRates, setPlaybackRates] = useState<number[] | undefined>()
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState<number | null>(null)
  const [currentState, setCurrentState] = useState<number | null>(null)

  const onPlayerReady: YouTubeProps['onReady'] = useCallback(
    (e: YouTubeEvent) => {
      player.current = e.target
      setDuration(e.target.getDuration())
      player.current.seekTo(Math.max((startAt ?? 0) - 1, 0), true)
      setPlaybackRates(e.target.getAvailablePlaybackRates())
    },
    [startAt],
  )

  const onPlay = useCallback(() => setIsPlaying(true), [])
  const onPause = useCallback(() => setIsPlaying(false), [])
  const onPlaybackRateChange = useCallback((e: YouTubeEvent<number>) => {
    setCurrentPlaybackRate(e.data)
  }, [])
  const onStateChange = useCallback((e: YouTubeEvent<number>) => {
    setCurrentState(e.data)
  }, [])

  const setPlaying = useCallback(
    (play: boolean) => {
      if (!playerStarted) {
        setPlayerStarted(true)
        player.current?.playVideo()
      } else if (play) {
        player.current?.playVideo()
      } else {
        player.current?.pauseVideo()
      }
    },
    [playerStarted],
  )

  const setPlaybackRate = useCallback((rate: number) => {
    player.current?.setPlaybackRate(rate)
  }, [])

  const toggleVideo = useCallback(() => {
    if (player.current?.getPlayerState() === 1) {
      player.current.pauseVideo()
    } else {
      player.current.playVideo()
    }
  }, [])

  return {
    player,
    playerStarted,
    setPlaying,
    setPlaybackRate,
    toggleVideo,
    isPlaying,
    duration,
    playbackRates,
    currentPlaybackRate,
    setCurrentPlaybackRate,
    currentState,
    handlers: { onPlayerReady, onPlay, onPause, onPlaybackRateChange, onStateChange },
  }
}
