const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

fs.mkdirSync('assets', { recursive: true });

// 1. Generate SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e222a"/>
      <stop offset="100%" stop-color="#111214"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#99baff"/>
      <stop offset="100%" stop-color="#5588ee"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#3974df" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
  <g filter="url(#glow)">
    <rect x="96" y="112" width="320" height="296" rx="54" fill="#1e222b" stroke="url(#accentGrad)" stroke-width="14"/>
    <path d="M176 76 v64 M336 76 v64" stroke="url(#accentGrad)" stroke-width="18" stroke-linecap="round"/>
    <line x1="96" y1="200" x2="416" y2="200" stroke="url(#accentGrad)" stroke-width="12"/>
    <!-- Calendar dots / map pin -->
    <circle cx="180" cy="270" r="18" fill="url(#accentGrad)"/>
    <circle cx="256" cy="270" r="18" fill="url(#accentGrad)"/>
    <circle cx="332" cy="270" r="18" fill="url(#accentGrad)"/>
    <circle cx="180" cy="340" r="18" fill="url(#accentGrad)"/>
    <circle cx="256" cy="340" r="18" fill="url(#accentGrad)"/>
    <!-- Pin accent on last dot -->
    <path d="M332 322 c-14 0 -24 10 -24 22 c0 16 24 38 24 38 s24 -22 24 -38 c0 -12 -10 -22 -24 -22 z" fill="#3974df"/>
    <circle cx="332" cy="342" r="7" fill="#ffffff"/>
  </g>
</svg>`;

fs.writeFileSync('assets/favicon.svg', svgIcon, 'utf8');
fs.writeFileSync('assets/icon-512.svg', svgIcon, 'utf8');
fs.writeFileSync('assets/icon-192.svg', svgIcon, 'utf8');

// Minimalistic valid PNG encoder in pure JS
function createPng(width, height, r, g, b) {
  // Simple uncompressed or deflate PNG
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8; // 8-bit depth
  IHDR[9] = 2; // RGB
  IHDR[10] = 0; // deflate
  IHDR[11] = 0; // filter
  IHDR[12] = 0; // no interlace

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      
      // Draw rounded rectangle background with calendar badge
      const cx = x - width / 2;
      const cy = y - height / 2;
      const dist = Math.max(Math.abs(cx), Math.abs(cy));
      const cornerDist = Math.hypot(Math.abs(cx) - (width/2 - width*0.25), Math.abs(cy) - (height/2 - height*0.25));

      let pr = 17, pg = 18, pb = 20; // #111214 bg
      
      // Inside calendar card
      if (Math.abs(cx) < width * 0.32 && Math.abs(cy) < height * 0.3) {
        pr = 25; pg = 27; pb = 31; // #191b1f
        // Accent bar or dots
        if (Math.abs(cy + height * 0.12) < height * 0.03 || Math.hypot(cx, cy - height * 0.05) < width * 0.08) {
          pr = 131; pg = 170; pb = 255; // #83aaff accent
        }
      }

      rawData[pxOffset] = pr;
      rawData[pxOffset + 1] = pg;
      rawData[pxOffset + 2] = pb;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // Simple CRC32 table
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', IHDR);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const png192 = createPng(192, 192);
const png512 = createPng(512, 512);

fs.writeFileSync('assets/icon-192.png', png192);
fs.writeFileSync('assets/icon-512.png', png512);
fs.writeFileSync('assets/apple-touch-icon.png', png192);

console.log('Generated assets/ icon files successfully.');
