// Makes a macOS .icns icon from a PNG, with no extra dependencies.
// (Windows uses icon.ico; macOS needs .icns. The PNG is scaled to each size.)
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// icns entry type -> pixel size (PNG data inside)
const ICON_SIZES = [['icp4', 16], ['icp5', 32], ['ic12', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512]];

export function makeIcns(pngPath, icnsPath) {
  const source = decodePng(readFileSync(pngPath));
  const entries = ICON_SIZES.map(([type, size]) => {
    const png = encodePng(resize(source, size, size));
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([header, png]);
  });
  const body = Buffer.concat(entries);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(body.length + 8, 4);
  writeFileSync(icnsPath, Buffer.concat([header, body]));
}

// ---- Minimal PNG reader/writer (8-bit RGBA, non-interlaced) ----

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Ikonet er ikke en PNG-fil.');
  let width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const data = [];
  for (let pos = 8; pos < buffer.length;) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const chunk = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12];
    } else if (type === 'IDAT') data.push(chunk);
    else if (type === 'IEND') break;
    pos += 12 + length;
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error('Ikonet skal være en 8-bit RGBA PNG uden interlacing (gem det som standard PNG med gennemsigtighed).');
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      pixels[y * stride + x] = value & 255;
    }
  }
  return { width, height, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const chunk = (type, content) => {
    const out = Buffer.alloc(12 + content.length);
    out.writeUInt32BE(content.length, 0);
    out.write(type, 4, 'ascii');
    content.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + content.length)), 8 + content.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Bilinear scaling, with premultiplied alpha so transparent edges don't get dark fringes.
function resize(image, width, height) {
  const out = Buffer.alloc(width * height * 4);
  const scaleX = image.width / width, scaleY = image.height / height;
  const sample = (x, y, channel, alpha) => {
    const px = Math.min(image.width - 1, Math.max(0, x)), py = Math.min(image.height - 1, Math.max(0, y));
    const i = (py * image.width + px) * 4;
    return channel === 3 ? image.pixels[i + 3] : image.pixels[i + channel] * alpha(i);
  };
  const alphaAt = (i) => image.pixels[i + 3] / 255;
  for (let y = 0; y < height; y++) {
    const sy = (y + 0.5) * scaleY - 0.5, y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = (x + 0.5) * scaleX - 0.5, x0 = Math.floor(sx), fx = sx - x0;
      const mix = (channel) =>
        sample(x0, y0, channel, alphaAt) * (1 - fx) * (1 - fy) + sample(x0 + 1, y0, channel, alphaAt) * fx * (1 - fy) +
        sample(x0, y0 + 1, channel, alphaAt) * (1 - fx) * fy + sample(x0 + 1, y0 + 1, channel, alphaAt) * fx * fy;
      const alpha = mix(3);
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = alpha > 0 ? Math.min(255, Math.round(mix(c) / (alpha / 255))) : 0;
      out[o + 3] = Math.round(alpha);
    }
  }
  return { width, height, pixels: out };
}
