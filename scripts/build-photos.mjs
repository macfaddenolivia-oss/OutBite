#!/usr/bin/env node
// npm run build-photos
// Makes the web versions of the site's photos (the originals stay in design/, which isn't
// published). Uses sharp, which comes with Astro; nothing is fetched or sent. Run it again
// only if a photo changes or one is added.
// 1. The Aedes aegypti photo (design/Aedes_Mosquito.png, 440 × 440, CDC PHIL image 9258 by
//    James Gathany, public domain): public/photos/aedes-aegypti-192.webp and -384.webp,
//    with JPEG fallbacks of the same sizes. The site shows it 128px wide
//    (src/components/AedesPhoto.astro); 192 covers ordinary screens and 384 sharp phone
//    screens.
// 2. The Mosquito detective photos (design/FindtheAedes/, CDC, public domain), listed in
//    src/content/detective.json "photos": each cropped square around the mosquito (crop
//    x, y = the square's center, size = its side, in the original's pixels) and saved as
//    public/photos/detective/<id>-320 and -640, WebP and JPEG. The ids are neutral
//    (mosquito-1, …) so the file names don't give the answer away. The game shows them
//    up to about 260px wide; 640 covers sharp screens. Photos in the folder that are in
//    neither "photos" nor "held" are listed at the end, to add to detective.json.
// 3. The two example photos on the Mosquito detective start screen (see below).

import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;
const FORMATS = [
  ['webp', (img, q) => img.webp({ quality: q })],
  ['jpg', (img, q) => img.jpeg({ quality: q, mozjpeg: true })],
];

// 1. The Aedes aegypti photo
const out = join(root, 'public/photos');
mkdirSync(out, { recursive: true });
for (const size of [192, 384]) {
  const resized = sharp(join(root, 'design/Aedes_Mosquito.png')).resize(size, size, { fit: 'cover' });
  for (const [ext, encode] of FORMATS) {
    const file = join(out, `aedes-aegypti-${size}.${ext}`);
    await encode(resized.clone(), 80).toFile(file);
    console.log(`public/photos/aedes-aegypti-${size}.${ext}: ${kb(file)}`);
  }
}

// 2. The Mosquito detective photos
const detective = JSON.parse(readFileSync(join(root, 'src/content/detective.json'), 'utf8'));
const detOut = join(out, 'detective');
mkdirSync(detOut, { recursive: true });
for (const photo of detective.photos) {
  const { width, height } = await sharp(join(root, photo.source)).metadata();
  const { x, y, size } = photo.crop;
  const left = Math.round(x - size / 2);
  const top = Math.round(y - size / 2);
  if (left < 0 || top < 0 || left + size > width || top + size > height) throw new Error(`${photo.id}: crop ${size}px around (${x}, ${y}) doesn't fit in ${width} × ${height}`);
  const square = sharp(join(root, photo.source)).extract({ left, top, width: size, height: size });
  for (const px of [320, 640]) {
    const resized = square.clone().resize(px, px);
    for (const [ext, encode] of FORMATS) {
      const file = join(detOut, `${photo.id}-${px}.${ext}`);
      await encode(resized.clone(), 72).toFile(file);
      console.log(`public/photos/detective/${photo.id}-${px}.${ext}: ${kb(file)} (${basename(photo.source)})`);
    }
  }
}
// 3. The two example photos in "How to tell them apart" (detective.json "clues"), 3:2,
//    neither one in the game: crop x, y = the center, width × height in the original's
//    pixels; saved as public/photos/detective/clue-<aedes|culex>-<width>, WebP and JPEG, at
//    the widths in "sizes" (the Aedes original is only 440px wide).
for (const [kind, clue] of Object.entries(detective.clues)) {
  if (!clue) {
    console.log(`clues.${kind}: no photo yet (add design/clue-${kind}.* and its crop to detective.json "clues")`);
    continue;
  }
  const { width, height } = await sharp(join(root, clue.source)).metadata();
  const { x, y, width: w, height: h } = clue.crop;
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h / 2);
  if (left < 0 || top < 0 || left + w > width || top + h > height) throw new Error(`clues.${kind}: crop ${w} × ${h} around (${x}, ${y}) doesn't fit in ${width} × ${height}`);
  const cropped = sharp(join(root, clue.source)).extract({ left, top, width: w, height: h });
  for (const px of clue.sizes) {
    const resized = cropped.clone().resize(px, Math.round((px * h) / w));
    for (const [ext, encode] of FORMATS) {
      const file = join(detOut, `clue-${kind}-${px}.${ext}`);
      await encode(resized.clone(), 78).toFile(file);
      console.log(`public/photos/detective/clue-${kind}-${px}.${ext}: ${kb(file)} (${basename(clue.source)})`);
    }
  }
}

const listed = new Set([...detective.photos, ...detective.held].map((p) => basename(p.source)));
const unlisted = readdirSync(join(root, 'design/FindtheAedes')).filter((f) => !f.startsWith('.') && !listed.has(f));
if (unlisted.length) console.log(`\nNot in src/content/detective.json yet (add each to "photos" with its species, crop and alt text, or to "held"): ${unlisted.join(', ')}`);
