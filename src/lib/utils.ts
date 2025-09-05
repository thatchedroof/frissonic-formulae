import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
// @ts-ignore
import { chord, Pattern, Fraction } from '@strudel/core'
import { mini } from '@strudel/mini'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatChords(chordInput: string, multiplier?: number): Pattern {
  return chord(mini(`<${chordInput}>${multiplier ? `*${multiplier}` : ''}`))
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
  chords?: string
  key?: string
  bpmStart?: number
  bpmEnd?: number
  bpmSteps?: number
  videoId?: string
  chordWebsiteId?: string
  name?: string
  time?: number
  startTime?: number
  endTime?: number
  cycles?: number[]
  multiplier?: number
  todo?: boolean
}

export const numberKeys: (keyof ChordData)[] = ['bpmStart', 'bpmEnd', 'bpmSteps', 'startTime', 'endTime']

function singleToString(data: ChordData): string {
  let result = ''

  if (data.name) {
    result += `${data.name}\n`
  }

  if (data.videoId) {
    result += `https://www.youtube.com/watch?v=${data.videoId}\n`
  }

  if (data.chordWebsiteId) {
    result += `${data.chordWebsiteId}\n`
  }

  if (data.time) {
    let minutes = Math.floor(data.time / 60)
    let seconds = (data.time % 60).toString().padStart(2, '0')

    result += `${minutes}:${seconds}\n`
  }

  for (const key of numberKeys as (keyof ChordData)[]) {
    if (data[key] !== undefined) {
      result += `${key}:${data[key]}\n`
    }
  }

  if (data.cycles) {
    result += `cycles:${data.cycles.join(',')}\n`
  }

  if (data.multiplier) {
    result += `x${data.multiplier}\n`
  }

  if (data.chords) {
    result += `${data.chords}\n`
  }

  if (data.key) {
    result += `${data.key}\n`
  }

  return result
}

export function chordDataToString(data: ChordData[]): string {
  return data.map((item: ChordData) => singleToString(item)).join('\n\n')
}

const notes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

export function parseSingleChordData(input: string): ChordData {
  let lines = input.trim().split(/\r?\n/)
  let chordData: ChordData = {}

  chordData.name = lines.shift()?.trim()

  for (const lineUT of lines) {
    const line = lineUT.trim()

    if (/^TODO$/i.test(line)) {
      chordData.todo = true
      continue
    }

    if (line.startsWith('// ')) {
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

    for (const key of numberKeys as (keyof ChordData)[]) {
      if (line.includes(`${key}:`)) {
        // @ts-ignore
        chordData[key] = parseFloat(line.split(':')[1].trim())
        continue
      }
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
      chordData.key = line
      continue
    }

    if (line.includes('cycles:')) {
      chordData.cycles = line.split(':')[1].trim().split(',').map(Number)
      continue
    }

    if (/^x\d+$/.test(line)) {
      chordData.multiplier = parseInt(line.split('x')[1].trim())
      continue
    }

    chordData.chords = line
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
