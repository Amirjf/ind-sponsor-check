// Generates simple placeholder icons (green rounded square, white check mark)
// without any dependencies. Replace src/assets/icons/*.png with designed icons
// whenever you like; the manifest only cares about the file names.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const SIZES = [16, 32, 48, 128]
const BG = [0x0b, 0x7a, 0x3b]
const FG = [0xff, 0xff, 0xff]

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const r = size * 0.22
  const ss = 4 // supersampling
  const thick = size * 0.11
  // check mark: (0.25,0.53) -> (0.43,0.71) -> (0.77,0.33)
  const seg = [[0.25, 0.53, 0.43, 0.71], [0.43, 0.71, 0.77, 0.33]].map((s) => s.map((v) => v * size))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let bg = 0, fg = 0
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const px = x + (sx + 0.5) / ss, py = y + (sy + 0.5) / ss
      const cx = Math.max(r, Math.min(size - r, px)), cy = Math.max(r, Math.min(size - r, py))
      if (Math.hypot(px - cx, py - cy) <= r) {
        bg++
        if (seg.some(([ax, ay, bx, by]) => distToSegment(px, py, ax, ay, bx, by) <= thick / 2)) fg++
      }
    }
    const a = bg / (ss * ss), f = fg / (ss * ss)
    const i = (y * size + x) * 4
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BG[c] * (1 - f / Math.max(a, 1e-9)) + FG[c] * (f / Math.max(a, 1e-9)))
    rgba[i + 3] = Math.round(a * 255)
  }
  return png(size, rgba)
}

mkdirSync('src/assets/icons', { recursive: true })
for (const size of SIZES) {
  writeFileSync(`src/assets/icons/icon-${size}.png`, render(size))
  console.log(`wrote src/assets/icons/icon-${size}.png`)
}
