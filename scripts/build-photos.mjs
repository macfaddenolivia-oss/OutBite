#!/usr/bin/env node
// npm run build-photos
// Makes the web versions of the Aedes aegypti photo (design/Aedes_Mosquito.png, 440 × 440,
// public domain; the original stays in design/, which isn't published):
// public/photos/aedes-aegypti-192.webp and -384.webp, with JPEG fallbacks of the same
// sizes. The site shows it 128px wide (src/components/AedesPhoto.astro); 192 covers
// ordinary screens and 384 sharp phone screens. Uses sharp, which comes with Astro;
// nothing is fetched or sent. Run it again only if the photo changes.

import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'design/Aedes_Mosquito.png');
const out = join(root, 'public/photos');
mkdirSync(out, { recursive: true });

for (const size of [192, 384]) {
  const resized = sharp(source).resize(size, size, { fit: 'cover' });
  for (const [ext, encode] of [
    ['webp', (img) => img.webp({ quality: 80 })],
    ['jpg', (img) => img.jpeg({ quality: 80, mozjpeg: true })],
  ]) {
    const file = join(out, `aedes-aegypti-${size}.${ext}`);
    await encode(resized.clone()).toFile(file);
    console.log(`public/photos/aedes-aegypti-${size}.${ext}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
}
