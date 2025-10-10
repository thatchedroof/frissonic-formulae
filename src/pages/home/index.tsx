import { useCallback, useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPreview from 'src/components/SongPreview.js'
import Song from 'src/components/Song.js'
import { ChordData, chordDataToString, parseChordData } from 'src/lib/utils.js'
import useLocalStorageState from 'src/hooks/use-localstorage-state.js'
import { Button } from 'src/components/ui/button.js'

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
    let ignore = false
    ;(async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}/songs.txt`)
      const text = await res.text()
      if (!ignore) {
        setData(parseChordData(text))
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const saveData = useCallback((data: ChordData[]) => {
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
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        saveData(dataRef.current ?? [])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [saveData])

  const updateData = useCallback(
    (newData: ChordData) => {
      if (!dataRef.current) return
      const updated = [...dataRef.current]
      updated[activeIndex!] = newData

      console.log('Updating data at index', activeIndex, 'with', newData)

      setData(updated)
    },
    [activeIndex, setData],
  )

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>
      <div className="h-20"></div>
      <p>
        {(data ?? []).filter((item) => !item.todo).filter((item) => (item.chordTimes ?? []).flat().length > 0).length}
        {' / '}
        {(data ?? []).filter((item) => !item.todo).length}
        {' / '}
        {(data ?? []).length} songs with chords
      </p>
      {data && <Button onClick={() => saveData(data)}>Save songs.txt</Button>}
      {data
        ?.map((item, index) => [item, index] as const)
        .filter(([item]) => !item.todo)
        .map(([item, index]) => (
          <SongPreview
            key={index}
            data={item}
            highlighted={(item.chordTimes ?? []).flat().length > 0}
            setActive={() => setActiveIndex(index)}
          />
        ))}
      {activeIndex !== null && inputData !== null && (
        <Song inputData={inputData} close={() => setActiveIndex(null)} updateData={updateData} />
      )}
    </>
  )
}
