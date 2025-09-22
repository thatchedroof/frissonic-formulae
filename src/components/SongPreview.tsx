import { ChordData } from 'src/lib/utils.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js'

export default function SongPreview({ data, setActive }: { data: ChordData; setActive: () => void }) {
  return (
    <Card onClick={setActive} className="m-4 cursor-pointer hover:bg-accent gap-3">
      <CardHeader>
        <CardTitle className="text-lg font-bold">{data.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap">{data.chords?.join('; ')}</pre>
      </CardContent>
    </Card>
  )
}
