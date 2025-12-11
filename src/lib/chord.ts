// translated by chatgpt

class PitchClass12 {
  readonly value: number // 0-11

  constructor(v: number) {
    // normalize to [0, 11]
    this.value = ((v % 12) + 12) % 12
  }

  static fromString(noteInput: string): PitchClass12 {
    const note = noteInput.trim()
    if (!note || note.length === 0) {
      throw new Error('Empty note string')
    }

    const letter = note[0].toUpperCase()
    const rest = note.slice(1)

    const baseMap: Record<string, number> = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11,
    }

    const base = baseMap[letter]
    if (base === undefined) {
      // throw new Error(`Invalid pitch class letter: ${letter} in "${note}"`)
      return undefined as unknown as PitchClass12 // temporary workaround for invalid notes
    }

    let offset = 0
    for (const ch of rest) {
      offset += accidentalToOffset(ch)
    }

    return new PitchClass12(base + offset)
  }

  toString(): string {
    // Use a simple sharp spelling for pitch classes
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return names[this.value]
  }

  minus(other: PitchClass12): Interval12 {
    return new Interval12(this.value - other.value)
  }

  plus(interval: Interval12): PitchClass12 {
    return new PitchClass12(this.value + interval.semitones)
  }
}

class Interval12 {
  readonly semitones: number // 0-11 (normalized)

  constructor(semitones: number) {
    this.semitones = ((semitones % 12) + 12) % 12
  }

  /**
   * Parse something like: "I", "ii", "bIII", "#iv", "♭VI", "𝄪V", etc.
   * Follows the same regex shape as your Rust version:
   *   ([#♯b♭♮𝄫𝄪]?)([IVX]+)([#♯b♭♮𝄫𝄪]?)
   */
  static fromString(s: string): Interval12 {
    const re = /^([#♯b♭♮𝄫𝄪]?)([IVX]+)([#♯b♭♮𝄫𝄪]?)$/i
    const match = s.match(re)
    if (!match) {
      throw new Error(`Invalid interval string: "${s}"`)
    }

    const [, preAcc, numerals, postAcc] = match

    const leadingOffset = preAcc ? accidentalToOffset(preAcc) : 0
    const trailingOffset = postAcc ? accidentalToOffset(postAcc) : 0
    const accOffset = leadingOffset + trailingOffset

    const degree = romanToArabic(numerals.toUpperCase()) // 1-based
    if (degree < 1) {
      throw new Error(`Invalid roman numeral: "${numerals}"`)
    }

    const baseSemitones = majorScaleSemitonesForDegree(degree)

    return new Interval12(baseSemitones + accOffset)
  }

  /**
   * Render the interval as a roman numeral with accidentals, using a
   * straightforward major-scale based mapping:
   *
   * 0 -> I
   * 1 -> bII
   * 2 -> II
   * 3 -> bIII
   * 4 -> III
   * 5 -> IV
   * 6 -> bV
   * 7 -> V
   * 8 -> bVI
   * 9 -> VI
   * 10 -> bVII
   * 11 -> VII
   */
  toString(): string {
    const table = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII']

    return table[this.semitones]
  }
}

// --- Helpers ----------------------------------------------------------------

function accidentalToOffset(ch: string): number {
  switch (ch) {
    case '#':
    case '♯':
      return 1
    case 'b':
    case '♭':
      return -1
    case '♮':
      return 0
    case '𝄫':
      return -2
    case '𝄪':
      return 2
    default:
      return 0
  }
}

function romanToArabic(s: string): number {
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
  }

  let total = 0
  let prev = 0
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i].toUpperCase()
    const val = map[c]
    if (!val) continue
    if (val < prev) {
      total -= val
    } else {
      total += val
    }
    prev = val
  }
  return total
}

/**
 * Major-scale semitones for a 1-based degree, potentially > 7.
 *   Degrees 1-7 -> [0,2,4,5,7,9,11]
 *   Degree 8    -> 12, etc.
 */
function majorScaleSemitonesForDegree(degree: number): number {
  const pattern = [0, 2, 4, 5, 7, 9, 11]
  const index = (degree - 1) % 7
  const octaves = Math.floor((degree - 1) / 7)
  return pattern[index] + 12 * octaves
}

function accidentalToAscii(str: string): string {
  return str.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/𝄪/g, '##').replace(/𝄫/g, 'bb').replace(/♮/g, '')
}

// --- Public API: absolute <-> relative -------------------------------------

/**
 * Port of the Rust function:
 *
 * #[wasm_bindgen]
 * pub fn absolute_to_relative(input: &str, key: &str) -> String { ... }
 */
export function absoluteToRelative(input: string, key: string): string {
  const re = /([A-Ga-g][#♯b♭♮𝄫𝄪]?)(m?)/gu
  const keyPc = PitchClass12.fromString(key)

  const replaced = input.replace(re, (_match, note: string, minorFlag: string) => {
    const pitch = PitchClass12.fromString(note)
    const relative = pitch.minus(keyPc).toString()

    if (minorFlag === 'm') {
      return relative.toLowerCase()
    } else {
      return relative
    }
  })

  return accidentalToAscii(replaced)
}

/**
 * Port of the Rust function:
 *
 * #[wasm_bindgen]
 * pub fn relative_to_absolute(input: &str, key: &str) -> String { ... }
 */
export function relativeToAbsolute(input: string, key: string): string {
  const re = /([#♯b♭♮𝄫𝄪]?)([IVX]+)([#♯b♭♮𝄫𝄪]?)/giu
  const keyPc = PitchClass12.fromString(key)

  const replaced = input.replace(re, (_match: string, preAcc: string, numerals: string, postAcc: string): string => {
    let numeral = ''
    if (preAcc) numeral += preAcc
    numeral += numerals.toUpperCase()
    if (postAcc) numeral += postAcc

    // minor if the roman part is all lowercase letters, like "ii", "iv", "vi"
    const isMinor = numerals.split('').every(
      (c) => c === c.toLowerCase() && c !== c.toUpperCase(), // "is a lowercase letter"
    )

    const relative = Interval12.fromString(numeral)
    const absolute = keyPc.plus(relative).toString()

    return isMinor ? absolute + 'm' : absolute
  })

  return accidentalToAscii(replaced)
}
