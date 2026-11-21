// Minimal QR Code encoder (byte mode, error-correction level M,
// versions 1-10) — just enough to render the ZRA Smart Invoice
// verification QR on receipts without adding a dependency.
//
// Implemented from the QR specification (ISO/IEC 18004): GF(256)
// Reed-Solomon ECC, block interleaving, mask evaluation by the four
// penalty rules. The output matrix is cross-verified cell-for-cell
// against the reference Python `qrcode` implementation in
// src/test/qr-code.test.ts (verification vectors recorded there).

// GF(256) tables, primitive polynomial x^8+x^4+x^3+x^2+1 (0x11D).
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsGenerator(degree: number): number[] {
  // Built in ascending coefficient order, then reversed: rsRemainder
  // expects descending order with the leading coefficient (1) first.
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly.reverse();
}

function rsRemainder(data: number[], gen: number[]): number[] {
  const res = new Array(gen.length - 1).fill(0);
  for (const b of data) {
    const factor = b ^ res.shift()!;
    res.push(0);
    for (let i = 0; i < gen.length - 1; i++) {
      res[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return res;
}

// ECC level M block table for versions 1..10:
// [ecc codewords per block, [[blocks, data codewords per block], ...]]
const ECC_M: [number, [number, number][]][] = [
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
];

const ALIGNMENT_CENTERS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const REMAINDER_BITS = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

function totalDataCodewords(version: number): number {
  return ECC_M[version - 1][1].reduce((s, [n, len]) => s + n * len, 0);
}

class BitBuffer {
  bits: number[] = [];
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  putBytes(bytes: number[]) {
    for (const b of bytes) this.put(b, 8);
  }
  get length() {
    return this.bits.length;
  }
  toBytes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ?? 0);
      out.push(b);
    }
    return out;
  }
}

function encodeData(bytes: number[], version: number): number[] {
  const capacityBits = totalDataCodewords(version) * 8;
  const buf = new BitBuffer();
  buf.put(0b0100, 4); // byte mode
  buf.put(bytes.length, version >= 10 ? 16 : 8);
  buf.putBytes(bytes);
  // Terminator + byte alignment + pad bytes.
  buf.put(0, Math.min(4, capacityBits - buf.length));
  while (buf.length % 8 !== 0) buf.put(0, 1);
  const pads = [0xec, 0x11];
  let pi = 0;
  while (buf.length < capacityBits) buf.put(pads[pi++ % 2], 8);
  return buf.toBytes();
}

function interleaveWithEcc(data: number[], version: number): number[] {
  const [eccLen, groups] = ECC_M[version - 1];
  const gen = rsGenerator(eccLen);
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let offset = 0;
  for (const [count, len] of groups) {
    for (let i = 0; i < count; i++) {
      const chunk = data.slice(offset, offset + len);
      offset += len;
      blocks.push({ data: chunk, ecc: rsRemainder(chunk, gen) });
    }
  }
  const out: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  }
  for (let i = 0; i < eccLen; i++) {
    for (const b of blocks) out.push(b.ecc[i]);
  }
  return out;
}

// --- Matrix construction -------------------------------------------------
type Matrix = (boolean | null)[][];

function blankMatrix(version: number): Matrix {
  const size = version * 4 + 17;
  return Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
}

function placeFinder(m: Matrix, x: number, y: number) {
  const size = m.length;
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= size || py < 0 || py >= size) continue;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const ring = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6);
      const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      m[py][px] = inside ? ring || core : false;
    }
  }
}

function placeFunctionPatterns(m: Matrix, version: number) {
  const size = m.length;
  placeFinder(m, 0, 0);
  placeFinder(m, size - 7, 0);
  placeFinder(m, 0, size - 7);
  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }
  // Alignment patterns. Skip only the combinations that overlap a
  // finder pattern; patterns centred on the timing lines (centre 6 or
  // size-7 on one axis) MUST still be placed over the timing cells.
  const centers = ALIGNMENT_CENTERS[version - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      const inFinder =
        (cx <= 8 && cy <= 8) ||
        (cx >= size - 9 && cy <= 8) ||
        (cx <= 8 && cy >= size - 9);
      if (inFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          m[cy + dy][cx + dx] = ring === 2 || (dx === 0 && dy === 0);
        }
      }
    }
  }
  // Dark module.
  m[size - 8][8] = true;
  // Reserve format information areas.
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = false;
    if (m[i][8] === null) m[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false;
    if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false;
  }
  // Version information (versions >= 7): BCH(18,6), generator 0x1F25.
  if (version >= 7) {
    const v = version << 12;
    let d = v;
    for (let i = 17; i >= 12; i--) {
      if ((d >> i) & 1) d ^= 0x1f25 << (i - 12);
    }
    const info = v | (d & 0xfff);
    for (let i = 0; i < 18; i++) {
      const bit = ((info >> i) & 1) === 1;
      m[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
      m[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function placeData(m: Matrix, codewords: number[], version: number, mask: number) {
  const size = m.length;
  const bits: number[] = [];
  for (const b of codewords) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  for (let i = 0; i < REMAINDER_BITS[version - 1]; i++) bits.push(0);

  let bitIdx = 0;
  let upward = true;
  let x = size - 1;
  while (x > 0) {
    if (x === 6) x--;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (const dx of [0, -1]) {
        const px = x + dx;
        if (m[y][px] === null) {
          let bit = bitIdx < bits.length ? bits[bitIdx] === 1 : false;
          bitIdx++;
          if (MASKS[mask](px, y)) bit = !bit;
          m[y][px] = bit;
        }
      }
    }
    upward = !upward;
    x -= 2;
  }
}

function placeFormatInfo(m: Matrix, mask: number) {
  const size = m.length;
  // ECC level M bits = 00; 5 data bits = (00 << 3) | mask.
  const data = mask;
  let d = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((d >> i) & 1) d ^= 0x537 << (i - 10);
  }
  const info = ((data << 10) | (d & 0x3ff)) ^ 0x5412;
  const bit = (i: number) => ((info >> i) & 1) === 1;
  // First copy (around the top-left finder): the 15 format bits run
  // LSB-first along this path (verified against the reference encoder).
  const pos1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  pos1.forEach(([px, py], i) => { m[py][px] = bit(i); });
  // Second copy (split along the other finders).
  for (let i = 0; i < 7; i++) m[size - 1 - i][8] = bit(14 - i);
  for (let i = 0; i < 8; i++) m[8][size - 8 + i] = bit(7 - i);
  m[size - 8][8] = true; // dark module
}

// --- Penalty scoring (spec rules 1-4) ------------------------------------
function penaltyScore(m: boolean[][]): number {
  const size = m.length;
  let score = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(m[i]);
    lines.push(m.map((row) => row[i]));
  }
  // Rule 1: runs of >= 5 same-colour modules.
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }
  // Rule 2: 2x2 blocks.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) {
        score += 3;
      }
    }
  }
  // Rule 3: finder-like patterns with a 4-module light guard.
  for (const line of lines) {
    for (let i = 0; i + 7 <= size; i++) {
      const pat = [true, false, true, true, true, false, true];
      let match = true;
      for (let j = 0; j < 7; j++) if (line[i + j] !== pat[j]) { match = false; break; }
      if (!match) continue;
      const guardBefore = i >= 4 && line.slice(i - 4, i).every((c) => !c);
      const guardAfter = i + 11 <= size && line.slice(i + 7, i + 11).every((c) => !c);
      if (guardBefore || guardAfter) score += 40;
    }
  }
  // Rule 4: dark module proportion.
  const dark = m.flat().filter(Boolean).length;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  if (k > 0) score += k * 10;
  return score;
}

/** Encode text into a QR module matrix (true = dark). Throws for input
 *  too long for version 10-M. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const countBits = v >= 10 ? 16 : 8;
    if (4 + countBits + bytes.length * 8 <= totalDataCodewords(v) * 8) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error("QR payload too long");
  const codewords = interleaveWithEcc(encodeData(bytes, version), version);

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = blankMatrix(version);
    placeFunctionPatterns(m, version);
    placeData(m, codewords, version, mask);
    placeFormatInfo(m, mask);
    const filled = m.map((row) => row.map((c) => c === true)) as boolean[][];
    const score = penaltyScore(filled);
    if (score < bestScore) {
      bestScore = score;
      best = filled;
    }
  }
  return best!;
}
