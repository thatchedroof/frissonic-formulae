import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPreview from 'src/components/SongPreview.js'
import Song from 'src/components/Song.js'
import { ChordData, chordDataToString, parseChordData } from 'src/lib/utils.js'

export default function Home() {
  const [data, setData] = useState<ChordData[] | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/songs.txt')
      .then(async (res) => res.text())
      .then((text) => {
        setData(parseChordData(text))
      })
  }, [])

  const updateData = (newData: ChordData) => {
    if (!data) return
    const updated = [...data]
    updated[activeIndex!] = newData
    setData(updated)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        if (data) {
          const text = chordDataToString(data)
          const blob = new Blob([text], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'songs.txt'
          a.click()
          URL.revokeObjectURL(url)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>
      <div className="h-20"></div>
      {data
        ?.filter((item) => !item.todo)
        .map((item, index) => (
          <SongPreview key={index} data={item} setActive={() => setActiveIndex(index)} />
        ))}
      {activeIndex !== null && (
        <Song data={data![activeIndex]} close={() => setActiveIndex(null)} updateData={updateData} />
      )}
    </>
  )
}
