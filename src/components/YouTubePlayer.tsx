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
    <div className="bg-muted rounded-xl overflow-hidden video-container aspect-video">
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
          className="relative w-full h-full group/thumb cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onClick && onClick()
          }}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
          />

          <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/30 transition-colors flex items-center justify-center">
            <div className="bg-primary/90 rounded-full p-3.5 shadow-lg transition-transform duration-200 group-hover/thumb:scale-110">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
