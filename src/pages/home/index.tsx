import { useCallback, useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPreview from 'src/components/SongPreview.js'
import Song from 'src/components/Song.js'
import { ChordData, chordDataToString, parseChordData } from 'src/lib/utils.js'
import useLocalStorageState from 'src/hooks/use-localstorage-state.js'

export default function Home() {
  const [data, setData] = useLocalStorageState<ChordData[] | null>('chordData', null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [inputData, setInputData] = useState<ChordData | null>(null)

  useEffect(() => {
    if (activeIndex !== null && dataRef.current) {
      setInputData(dataRef.current[activeIndex])
    }
  }, [activeIndex])

  useEffect(() => {
    if (data !== null) return
    fetch('/songs.txt')
      .then(async (res) => res.text())
      .then((text) => {
        setData(parseChordData(text))
      })
  }, [data, setData])

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
  }, [data])

  const updateData = useCallback(
    (newData: ChordData) => {
      if (!dataRef.current) return
      const updated = [...dataRef.current]
      updated[activeIndex!] = newData

      console.log('Updating data at index', activeIndex, 'with', newData)

      setData(updated)
    },
    [activeIndex],
  )

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>
      <div className="h-20"></div>
      {data
        ?.map((item, index) => [item, index] as const)
        .filter(([item]) => !item.todo)
        .map(([item, index]) => (
          <SongPreview key={index} data={item} setActive={() => setActiveIndex(index)} />
        ))}
      {activeIndex !== null && inputData !== null && (
        <Song inputData={inputData} close={() => setActiveIndex(null)} updateData={updateData} />
      )}
    </>
  )
}
