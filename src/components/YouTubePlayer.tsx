import { AspectRatio } from './ui/aspect-ratio.js'
import YouTube, { YouTubeProps } from 'react-youtube'

export default function YouTubePlayer({
  videoId,
  playerStarted,
  onPlayerReady,
  onPlay,
  onPause,
  onPlaybackRateChange,
}: {
  videoId: string | undefined
  playerStarted: boolean
  onPlayerReady: YouTubeProps['onReady']
  onPlay: YouTubeProps['onPlay']
  onPause: YouTubeProps['onPause']
  onPlaybackRateChange: YouTubeProps['onPlaybackRateChange']
}) {
  const opts: YouTubeProps['opts'] = {
    playerVars: {
      controls: 0,
      disablekb: 1,
      showinfo: 0,
      playsinline: 1,
      rel: 0,
      autoplay: 1,
    },
  }

  return (
    <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
      {videoId && playerStarted ? (
        <YouTube
          style={{ height: '100%', width: '100%' }}
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          onPlay={onPlay}
          onPause={onPause}
          onPlaybackRateChange={onPlaybackRateChange}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600">
          <p className="text-white text-sm font-medium">16:9</p>
        </div>
      )}
    </AspectRatio>
  )
}
