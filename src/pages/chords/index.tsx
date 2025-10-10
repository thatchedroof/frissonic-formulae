import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPlayer from 'src/components/SongPlayer.js'
import { ChordData, parseChordData } from 'src/lib/utils.js'

export default function Chords() {
  const [data, setData] = useState<ChordData[]>([])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}/songs.txt`)
      const text = await res.text()
      console.log('Songs:\n', text)
      if (!ignore) {
        setData(parseChordData(text))
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
          (item) => item && !item.todo && item.chordTimes!.flat().length! > 0 && item.chordSymbols!.flat().length > 0,
        )
        .map((item, index) => (
          <SongPlayer key={index} data={item} />
        ))}
    </>
  )
}
