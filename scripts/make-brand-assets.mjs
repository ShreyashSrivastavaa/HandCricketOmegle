import fs from "fs";
import path from "path";
import zlib from "zlib";

// Pure JS uncompressed/deflated PNG generator
function createPng(width, height, drawPixel) {
  // RGBA buffer with 1 filter byte per scanline
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(raw);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // IDAT chunk
  const idat = makeChunk("IDAT", deflated);

  // IEND chunk
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcPayload = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcPayload), 0);

  return Buffer.concat([len, crcPayload, crc]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw brand icon
function iconDrawer(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded square or circle
  const maxR = w * 0.44;
  if (dist > maxR) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Turf border
  if (dist > maxR - (w * 0.05)) {
    return [61, 220, 132, 255]; // #3DDC84
  }

  // Dark background
  const bgGrad = Math.min(1, dist / maxR);
  const rBg = Math.round(11 + 9 * bgGrad);
  const gBg = Math.round(18 + 12 * bgGrad);
  const bBg = Math.round(16 + 11 * bgGrad);

  // Cricket ball (bottom right)
  const ballCx = cx + w * 0.16;
  const ballCy = cy + h * 0.14;
  const ballDist = Math.sqrt((x - ballCx) ** 2 + (y - ballCy) ** 2);
  const ballR = w * 0.14;

  if (ballDist < ballR) {
    // Red leather ball with seam
    if (Math.abs(x - ballCx + (y - ballCy) * 0.8) < 1.5) {
      return [255, 255, 255, 255]; // Seam
    }
    return [232, 72, 85, 255]; // #E84855
  }

  // Bat handle & blade (top-right to bottom-left)
  const u = (dx - dy) / Math.SQRT2;
  const v = (dx + dy) / Math.SQRT2;

  // Blade
  if (u >= -w * 0.28 && u <= w * 0.08 && Math.abs(v) <= w * 0.07) {
    return [217, 168, 108, 255]; // Bat wood
  }
  // Handle
  if (u > w * 0.08 && u <= w * 0.28 && Math.abs(v) <= w * 0.035) {
    return [240, 244, 242, 255]; // Rubber grip
  }

  return [rBg, gBg, bBg, 255];
}

// Generate files
const publicDir = path.resolve(process.cwd(), "public");

console.log("Generating icon-192.png...");
const png192 = createPng(192, 192, iconDrawer);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);

console.log("Generating icon-512.png...");
const png512 = createPng(512, 512, iconDrawer);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);

console.log("Generating apple-touch-icon.png...");
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), png192);

console.log("Generating favicon.ico...");
const png32 = createPng(32, 32, iconDrawer);
// Create ICO header pointing to png32 data
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 (icon)
icoHeader.writeUInt16LE(1, 4); // count 1
icoHeader[6] = 32; // width
icoHeader[7] = 32; // height
icoHeader[8] = 0; // color count
icoHeader[9] = 0; // reserved
icoHeader.writeUInt16LE(1, 10); // planes
icoHeader.writeUInt16LE(32, 12); // bpp
icoHeader.writeUInt32LE(png32.length, 14); // size
icoHeader.writeUInt32LE(22, 18); // offset
const ico = Buffer.concat([icoHeader, png32]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
fs.writeFileSync(path.resolve(process.cwd(), "src/app/favicon.ico"), ico);

// Also generate a static og-image.png (600x315 scaled preview)
console.log("Generating og-image.png...");
const ogPng = createPng(600, 315, (x, y, w, h) => {
  // Border
  if (x < 6 || x >= w - 6 || y < 6 || y >= h - 6) return [61, 220, 132, 255];
  // Dark turf background
  const cx = w * 0.2;
  const cy = h * 0.5;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (dist < 80) {
    return iconDrawer(x - (cx - 80), y - (cy - 80), 160, 160);
  }
  return [11, 18, 16, 255];
});
fs.writeFileSync(path.join(publicDir, "og-image.png"), ogPng);

console.log("✅ Brand assets generated successfully!");
