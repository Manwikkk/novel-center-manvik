'use strict';

const fs = require('fs');

/**
 * Read width/height from a multer file (disk path or memory buffer).
 * Supports PNG, JPEG, and WebP. Returns null if unknown.
 */
function readImageDimensions(file) {
  if (!file) return null;
  let buf;
  if (file.buffer && Buffer.isBuffer(file.buffer)) {
    buf = file.buffer;
  } else if (file.path) {
    const fd = fs.openSync(file.path, 'r');
    try {
      buf = Buffer.alloc(64);
      fs.readSync(fd, buf, 0, 64, 0);
    } finally {
      fs.closeSync(fd);
    }
  } else {
    return null;
  }
  return parseDimensions(buf, file);
}

function parseDimensions(buf, file) {
  if (!buf || buf.length < 24) return null;

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP (RIFF....WEBP)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    // VP8X
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x58) {
      const wider = file?.buffer || (file?.path ? fs.readFileSync(file.path) : buf);
      if (wider.length < 30) return null;
      const w = 1 + wider[24] + (wider[25] << 8) + (wider[26] << 16);
      const h = 1 + wider[27] + (wider[28] << 8) + (wider[29] << 16);
      return { width: w, height: h };
    }
    // VP8 lossy
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
      const wider = file?.buffer || (file?.path ? fs.readFileSync(file.path) : null);
      if (!wider || wider.length < 30) return null;
      return {
        width: wider.readUInt16LE(26) & 0x3fff,
        height: wider.readUInt16LE(28) & 0x3fff,
      };
    }
  }

  // JPEG — scan SOF markers (needs more bytes for disk files)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const full = file?.buffer || (file?.path ? fs.readFileSync(file.path) : buf);
    return jpegDimensions(full);
  }

  return null;
}

function jpegDimensions(buf) {
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (
      marker === 0xc0 || marker === 0xc1 || marker === 0xc2
      || marker === 0xc3 || marker === 0xc5 || marker === 0xc6
      || marker === 0xc7 || marker === 0xc9 || marker === 0xca
      || marker === 0xcb || marker === 0xcd || marker === 0xce
      || marker === 0xcf
    ) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return null;
}

module.exports = { readImageDimensions };
