import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
// @ts-ignore
import { Pattern, Fraction, Patternable, Patternable, chord } from '@strudel/core'
import { mini } from '@strudel/mini'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatChords(chordInput: string, multiplier?: number): Pattern {
  console.log(`Formatting chords: <${chordInput}> with multiplier: ${multiplier}`)
  const miniOutput: Patternable = mini(`<${chordInput.replaceAll('/', ':')}>${multiplier ? `*${multiplier}` : ''}`)
  // const result = miniOutput.as('chord:null')
  const result = chord(miniOutput)
  return result
}

export type Marker = {
  value: number
  color?: string
  type?: string
  zIndex?: number
  showValue?: boolean
  label?: string
  font?: string
}

export class ChordData {
  chords?: string[]
  key?: string[]
  bpmStart?: number[]
  bpmEnd?: number[]
  bpmSteps?: number[]
  videoId?: string
  chordWebsiteId?: string
  name?: string
  time?: number
  startTime?: number[]
  endTime?: number[]
  cycles?: number[]
  chordTimes?: number[][]
  chordSymbols?: string[][]
  multiplier?: number[]
  todo?: boolean
  comment?: string
  artists?: string[]
  album?: string
}

export class YoutubeData {
  info: {
    id: string
    title: string
    thumbnail: string
    description: string
    channel_url: string
    duration: number
    view_count: number
    categories: string[]
    tags: string[]
    playable_in_embed: boolean
    album: null | string
    artists: null | string[]
    track: null | string
    release_date: null | string
    release_year: number | null
    channel: string
    timestamp: number
    artist: null | string
    creators: null | string[]
    creator: null | string
    filesize: number | null
    aspect_ratio: null | number
  }
  beats: [number, number][]
  chords: [number, number, string][]

  constructor(info: YoutubeData['info'], beats: YoutubeData['beats'], chords: YoutubeData['chords']) {
    this.info = info
    this.beats = beats
    this.chords = chords
  }

  static fromJSON(json: string): YoutubeData {
    const data = JSON.parse(json)
    return new YoutubeData(data.info, data.beats, data.chords)
  }
}

export const numberKeys = ['bpmStart', 'bpmEnd', 'bpmSteps', 'startTime', 'endTime'] as const

function singleToString(data: ChordData): string {
  let result = ''

  if (data.name) {
    result += `${data.name}\n`
  }

  if (data.artists && data.artists.length > 0) {
    result += `By: ${data.artists.join(', ')}\n`
  }

  if (data.album) {
    result += `On: ${data.album}\n`
  }

  if (data.videoId) {
    result += `https://www.youtube.com/watch?v=${data.videoId}\n`
  }

  if (data.chordWebsiteId) {
    result += `${data.chordWebsiteId}\n`
  }

  if (data.time) {
    const minutes = Math.floor(data.time / 60)
    const seconds = (data.time % 60).toString().padStart(2, '0')

    result += `${minutes}:${seconds}\n`
  }

  for (const key of numberKeys) {
    if (data[key]) {
      result += `${key}:${data[key].join(';')}\n`
    }
  }

  if (data.cycles) {
    result += `cycles:${data.cycles.join(',')}\n`
  }

  if (data.chordTimes) {
    result += `chordTimes:${data.chordTimes.map((times) => times.map((t) => t.toFixed(4)).join(',')).join(';')}\n`
  }

  if (data.chordSymbols) {
    result += `chordSymbols:${data.chordSymbols.map((symbols) => symbols.join(',')).join(';')}\n`
  }

  if (data.multiplier) {
    result += `x${data.multiplier}\n`
  }

  if (data.chords) {
    result += `${data.chords.join(';')}\n`
  }

  if (data.key) {
    result += `${data.key.join(';')}\n`
  }

  if (data.comment) {
    result += `// ${data.comment}\n`
  }

  if (data.todo) {
    result += `TODO\n`
  }

  return result
}

export function chordDataToString(data: ChordData[]): string {
  return data.map((item: ChordData) => singleToString(item)).join('\n')
}

function splitOnce(str: string, delimiter: string): [string, string] {
  const index = str.indexOf(delimiter)
  if (index === -1) {
    return [str, '']
  }
  const firstPart = str.slice(0, index)
  const secondPart = str.slice(index + delimiter.length)
  return [firstPart, secondPart]
}

const notes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

export function parseSingleChordData(input: string): ChordData {
  const lines = input.trim().split(/\r?\n/)
  const chordData: ChordData = {}

  chordData.name = lines.shift()?.trim()

  for (const lineUT of lines) {
    const line = lineUT.trim()

    if (/^TODO$/i.test(line)) {
      chordData.todo = true
      continue
    }

    if (line.startsWith('// ')) {
      console.log('Comment:', line)
      chordData.comment = line.slice(3).trim()
      continue
    }

    if (line.includes('youtube.com')) {
      chordData.videoId = line.match(/\?v=([0-9A-Za-z_-]{11})/)?.[1]
      continue
    }

    if (line.includes('youtu.be')) {
      chordData.videoId = line.match(/(?:youtu\.be\/|\/)([0-9A-Za-z_-]{11})/)?.[1]
      continue
    }

    if (line.includes('hooktheory.com') || line.includes('ultimate-guitar.com')) {
      chordData.chordWebsiteId = line
      continue
    }

    for (const key of numberKeys) {
      let anyMatch = false
      if (line.includes(`${key}:`)) {
        chordData[key] = line
          .split(':')[1]
          .trim()
          .split(';')
          .map((part) => Number(part.trim()))
        anyMatch = true
      }
      if (anyMatch) continue
    }

    if (line.match(/^\d+:\d+$/)) {
      chordData.time = line.split(':').reduce((acc, curr) => acc * 60 + parseFloat(curr), 0)
      continue
    }

    if (line.includes('sec:')) {
      chordData.time = parseFloat(line.split(':')[1].trim())
      continue
    }

    if (line.split(';').every((note) => notes.includes(note.trim()))) {
      chordData.key = line.split(';').map((note) => note.trim())
      continue
    }

    if (line.includes('cycles:')) {
      chordData.cycles = line.split(':')[1].trim().split(',').map(Number)
      continue
    }

    if (line.includes('chordTimes:')) {
      chordData.chordTimes = line
        .split(':')[1]
        .trim()
        .split(';')
        .map((part) => part.split(',').map(Number))
      continue
    }

    if (line.includes('chordSymbols:')) {
      chordData.chordSymbols = line
        .split(':')[1]
        .trim()
        .split(';')
        .map((part) => part.split(',').map((s) => s.trim()))
      continue
    }

    if (/^x\d+$/.test(line)) {
      chordData.multiplier = line.split(';').map((part) => parseInt(part.split('x')[1].trim()))
      continue
    }

    if (line.startsWith('By:')) {
      chordData.artists = splitOnce(line, ':')[1]
        .trim()
        .split(',')
        .map((part) => part.trim())
      continue
    }

    if (line.startsWith('On:')) {
      chordData.album = splitOnce(line, ':')[1].trim()
      continue
    }

    chordData.chords = line.split(';').map((part) => part.trim())
  }

  return chordData
}

export function parseChordData(input: string): ChordData[] {
  return input
    .trim()
    .split(/\r?\n\r?\n/)
    .map(parseSingleChordData) as ChordData[]
}

export function findNCycles(n: number, chords: Pattern): [number, any[]] {
  let nCycles = 1
  let result: any[] = []

  while (result.length < n) {
    console.log(`Finding cycles: ${nCycles}`)
    nCycles++
    result = chords
      ?.sortHapsByPart()
      // @ts-ignore
      ?.queryArc(Fraction(0), Fraction(nCycles))
  }

  return [nCycles, result]
}

export function hitsInterval(offset: number, diff: number, start: number, end: number): boolean {
  const n = Math.ceil((start - offset) / diff)
  const x = offset + n * diff

  return x < end
}

export type InMsg = { type: 'init'; chords: string; multiplier: number } | { type: 'compute'; length: number }

export type OutMsg =
  | { type: 'ready' }
  | { type: 'result'; nCycles: number; haps: any }
  | { type: 'error'; message: string }

export function mod(n: number, m: number) {
  return ((n % m) + m) % m
}
