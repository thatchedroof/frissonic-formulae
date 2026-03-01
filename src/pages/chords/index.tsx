import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPlayer from 'src/components/SongPlayer.js'
import { ChordData, parseChordData } from 'src/lib/utils.js'

export default function Chords() {
  const [data, setData] = useState<ChordData[]>([])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      console.log(`${import.meta.env.BASE_URL}songs.txt`)
      const res = await fetch(`${import.meta.env.BASE_URL}songs.txt`)
      const text = await res.text()
      console.log('Songs:\n', text)
      if (!ignore) {
        const parsed = parseChordData(text)
        console.log('Parsed:', parsed)
        setData(parsed)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const completeSongs = data.filter(
    (item) =>
      item &&
      !item.todo &&
      (item.chordTimes ?? []).flat().length > 0 &&
      (item.chordSymbols ?? []).flat().length > 0,
  )

  const todoSongs = data.filter(
    (item) =>
      item &&
      !(
        !item.todo &&
        (item.chordTimes ?? []).flat().length > 0 &&
        (item.chordSymbols ?? []).flat().length > 0
      ),
  )

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>

      <div className="h-16" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pt-10 pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Chord Progressions
          </h1>
          <p className="mt-2 text-muted-foreground text-base sm:text-lg max-w-2xl">
            Explore harmonic structures across {completeSongs.length > 0 ? completeSongs.length : ''} songs — visualised on the Circle of Fifths, synced to playback.
          </p>
        </div>

        <div className="space-y-3 pb-8">
          {completeSongs.map((item, index) => (
            <SongPlayer key={index} data={item} />
          ))}
        </div>

        {todoSongs.length > 0 && (
          <div className="border-t border-border/50 pt-8 pb-16">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">Coming Soon</h2>
            <div className="flex flex-wrap gap-2">
              {todoSongs.map((item, index) =>
                item.videoId ? (
                  <a
                    key={`link-${index}`}
                    href={`https://www.youtube.com/watch?v=${item.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full bg-muted/80 px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span
                    key={`link-${index}`}
                    className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-sm text-muted-foreground/70"
                  >
                    {item.name}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
