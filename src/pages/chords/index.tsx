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

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>
      <div className="h-20"></div>
      {data
        .filter(
          (item) =>
            item &&
            !item.todo &&
            (item.chordTimes ?? []).flat().length > 0 &&
            (item.chordSymbols ?? []).flat().length > 0,
        )
        .map((item, index) => (
          <SongPlayer key={index} data={item} />
        ))}
      <div className="m-20">
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">TODO:</h2>
        <p className="leading-7 [&:not(:first-child)]:mt-6 text-muted-foreground">
          {data
            .filter(
              (item) =>
                item &&
                !(
                  !item.todo &&
                  (item.chordTimes ?? []).flat().length > 0 &&
                  (item.chordSymbols ?? []).flat().length > 0
                ),
            )
            .map((item, index) => (
              <>
                {item.videoId ? (
                  <a
                    key={`link-${index}`}
                    href={`https://www.youtube.com/watch?v=${item.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline italic"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span key={`link-${index}`} className="italic">
                    {item.name}
                  </span>
                )}
                <span className="text-muted-foreground mx-2" key={`dot-${index}`}>
                  •
                </span>
              </>
            ))}
          and more...
        </p>
      </div>
    </>
  )
}
