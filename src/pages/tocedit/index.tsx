import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import SongPlayer from 'src/components/SongPlayer.js'
import { Spinner } from '../../components/ui/shadcn-io/spinner'
import { ChordData, parseChordData } from 'src/lib/utils.js'
import { ReactSortable, Sortable } from 'react-sortablejs'
import useLocalStorageState from 'src/hooks/use-localstorage-state.js'
import { RepeatTreeView } from 'src/components/RepeatChords.js'
import { buildRepeatTree } from 'src/lib/repeatTree.js'
import { absoluteToRelative } from 'src/lib/chord.js'
import { Button } from 'src/components/ui/button.js'
import YouTube from 'react-youtube'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from 'src/components/ui/context-menu.js'
import { ResizablePanel, ResizablePanelGroup } from 'src/components/ui/resizable.js'
import { ScrollArea, ScrollBar } from 'src/components/ui/scroll-area.js'

const tocInitial = `# Introduction
# Major formulae
## $bVI - bVII - I$
## $bIII$
### Higher Ground progression: $I - bIII - IV$
### Other $bIII$
## $bVI - V - I$
## Resolving to the I in a minor key
## Dorian $IV$
# Minor formulae
## Miscellaneous $bVI$ and $bVII$
### Playful $bVI$
## $V - I$ chains
### Joanna Wang progression: $VI - II - V - I$
## Cardiacs cadences on $v - I$
### $bIII - v - I$
### $bVI - v - I$
## Neapolitan $bII$: $bII - V - I$
## Chromaticism
## $II$
## $bII$, $III$, $bV$, and $VI$"`

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

  const [unsortedData, setUnsortedData] = useLocalStorageState<
    {
      id: string
      chordSymbols?: string[][]
      relativeChordSymbols?: string[][]
      chord: ChordData
    }[]
  >('unsortedData', [])

  // useEffect(() => {
  //   setUnsortedData(
  //     data.map((data, index) => {
  //       const chordSymbols = data.chordSymbols ?? []
  //       const relativeChordSymbols =
  //         chordSymbols?.map((section, i) =>
  //           section.map((chord) =>
  //             data.key?.[i]
  //               ? absoluteToRelative(chord, data.key[i])
  //               : data.key?.[0]
  //                 ? absoluteToRelative(chord, data.key[0])
  //                 : chord,
  //           ),
  //         ) ?? []

  //       return {
  //         id: `item-${index}`,
  //         chord: data,
  //         chordSymbols,
  //         relativeChordSymbols,
  //       }
  //     }),
  //   )
  // }, [data, setUnsortedData])

  const [sortedData, setSortedData] = useLocalStorageState<
    {
      id: string
      chordSymbols?: string[][]
      relativeChordSymbols?: string[][]
      level?: number
      chord?: ChordData
      filtered?: true
    }[]
  >(
    'sortedData',
    tocInitial
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line, index) => {
        const level = line.match(/^#+/)![0].length
        const title = line.replace(/^#+\s*/, '')
        return {
          id: title,
          level,
          filtered: true,
        }
      }),
  )

  const [playing, setPlaying] = useState<string | null>(null)

  if (data.length === 0)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900">
        <Spinner size={48} className="text-neutral-200" variant="ring" />
      </div>
    )

  return (
    <>
      <Helmet>
        <title>Frissonic Formulae</title>
      </Helmet>
      <div className="h-20"></div>
      <Button
        onClick={() => {
          const tocText =
            sortedData
              .map((item) => {
                if (item.filtered) {
                  return `${'#'.repeat(item.level!)} ${item.id}`
                }
                return item.chord?.name ?? item.id
              })
              .join('\n') +
            '\nUNSORTED:\n' +
            unsortedData.map((item) => item.chord?.name ?? item.id).join('\n')
          console.log(tocText)
          const blob = new Blob([tocText], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'toc.txt'
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        Save TOC as file
      </Button>

      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <ScrollArea className="max-h-[calc(100vh-10rem)] border rounded-md overflow-auto">
            <ReactSortable list={sortedData} setList={setSortedData} className="m-2" group="shared">
              {sortedData.map((item, index) =>
                item.chord ? (
                  <div key={index} className="cursor-pointer">
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <div className="p-2 pl-10">{item.chord?.name}</div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            const newItem = { ...item, id: `item-${Date.now()}` }
                            // Insert the new item right after the current item
                            const index = sortedData.findIndex((i) => i.id === item.id)
                            const newSortedData = [...sortedData]
                            newSortedData.splice(index + 1, 0, newItem)
                            setSortedData(newSortedData)
                          }}
                        >
                          Duplicate
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            const newSortedData = sortedData.filter((i) => i.id !== item.id)
                            setSortedData(newSortedData)
                          }}
                        >
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                ) : (
                  <div key={index} className="filtered">
                    <h2 className="p-2 font-bold text-xl">{item.id}</h2>
                  </div>
                ),
              )}
            </ReactSortable>
          </ScrollArea>
        </ResizablePanel>
        <ResizablePanel>
          <ScrollArea className="max-h-[calc(100vh-10rem)] border rounded-md overflow-auto">
            <ReactSortable list={unsortedData} setList={setUnsortedData} className="m-2" group="shared">
              {unsortedData.map((item, index) => (
                <div
                  key={index}
                  className="cursor-pointer border p-4 rounded-md mb-4 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  <h2 className="font-semibold">{item.chord?.name}</h2>
                  <div className="font-[Campania] text-secondary-foreground">
                    {item.chordSymbols?.map((section, i) => (
                      <RepeatTreeView
                        nodes={buildRepeatTree(
                          section.map((chord, idx) => [chord, item.relativeChordSymbols?.[i]?.[idx]]),
                          (a, b) => {
                            return a[0] === b[0] && a[1] === b[1]
                          },
                        )}
                        renderLeaf={([chord, relativeChord], indices) => (
                          <div key={indices.join(',')} className="flex flex-col items-center">
                            {relativeChord && <div className={``}>{relativeChord}</div>}
                            {/* <div className={``}>{chord}</div> */}
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (playing === item.id) {
                        setPlaying(null)
                      } else {
                        setPlaying(item.id)
                      }
                    }}
                  >
                    {playing === item.id ? 'Hide Video' : 'Show Video'}
                  </Button>
                  {playing === item.id
                    ? item.chord.videoId && (
                        <YouTube
                          videoId={item.chord.videoId}
                          opts={{
                            height: '90',
                            width: '160',
                            playerVars: {
                              autoplay: 1,
                              start: item.chord.startTime?.[0],
                            },
                          }}
                        />
                      )
                    : null}
                </div>
              ))}
            </ReactSortable>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}
