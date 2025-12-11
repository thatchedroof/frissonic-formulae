import YouTube, { YouTubeProps } from 'react-youtube'

export default function YouTubePlayer({
  videoId,
  playerStarted,
  onPlayerReady,
  onPlay,
  onPause,
  onPlaybackRateChange,
  onClick,
  onStateChange,
}: {
  videoId: string | undefined
  playerStarted: boolean
  onPlayerReady: YouTubeProps['onReady']
  onPlay: YouTubeProps['onPlay']
  onPause: YouTubeProps['onPause']
  onPlaybackRateChange: YouTubeProps['onPlaybackRateChange']
  onStateChange: YouTubeProps['onStateChange']
  onClick?: () => void
}) {
  const opts: YouTubeProps['opts'] = {
    playerVars: {
      // controls: 0,
      // disablekb: 1,
      // showinfo: 0,
      // playsinline: 1,
      // rel: 0,
      // autoplay: 1,
    },
  }

  return (
    <div className="bg-muted rounded-lg overflow-hidden video-container aspect-video">
      {videoId && playerStarted ? (
        <YouTube
          style={{ height: '100%', width: '100%' }}
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          onPlay={onPlay}
          onPause={onPause}
          onPlaybackRateChange={onPlaybackRateChange}
          onStateChange={onStateChange}
        />
      ) : (
        <div
          className="relative w-full h-full"
          onClick={(e) => {
            e.stopPropagation()
            onClick && onClick()
          }}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
