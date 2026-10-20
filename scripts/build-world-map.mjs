#!/usr/bin/env node
// npm run build-world-map
// Builds src/data/world-map.json for the world risk maps from world-atlas (Natural Earth,
// public domain; world-atlas is ISC): country outlines from the 1:110m map (French Guiana
// split from France), and a dot
// (the centroid from the 1:50m map) for every small country or territory the 1:110m map
// leaves out, so places like Caribbean and Pacific islands still show. Antarctica is
// left off. Codes are ISO 3166-1 alpha-2. Run again only if the map source changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoCentroid, geoEqualEarth, geoPath } from 'd3-geo';
import countries from 'i18n-iso-countries';
import { splitNotes } from './data-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const atlas = (f) => JSON.parse(readFileSync(join(root, 'node_modules/world-atlas', f), 'utf8'));
const W = 960;
const H = 470;

// Natural Earth features without an ISO numeric id.
const BY_NAME = { Kosovo: 'XK', 'N. Cyprus': null, Somaliland: null, 'Indian Ocean Ter.': null, 'Ashmore and Cartier Is.': null, 'Siachen Glacier': null };
const alpha2 = (f) => {
  if (f.id && f.id !== '-99') return countries.numericToAlpha2(f.id) ?? null;
  return BY_NAME[f.properties.name] ?? null;
};

const small = feature(atlas('countries-110m.json'), atlas('countries-110m.json').objects.countries).features.filter((f) => f.id !== '010');
const detailed = feature(atlas('countries-50m.json'), atlas('countries-50m.json').objects.countries).features.filter((f) => f.id !== '010');

const projection = geoEqualEarth().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: 'FeatureCollection', features: small },
);
const path = geoPath(projection);
const round = (d) => d.replace(/\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

// Natural Earth draws France's overseas regions as part of France: French Guiana is
// split off as its own outline (polygons west of 20°W).
const splitFrance = (f) => {
  if (alpha2(f) !== 'FR' || f.geometry.type !== 'MultiPolygon') return [f];
  const west = f.geometry.coordinates.filter((poly) => geoCentroid({ type: 'Polygon', coordinates: poly })[0] < -20);
  const rest = f.geometry.coordinates.filter((poly) => !west.includes(poly));
  return [
    { ...f, geometry: { type: 'MultiPolygon', coordinates: rest } },
    { type: 'Feature', id: '254', properties: { name: 'French Guiana' }, geometry: { type: 'MultiPolygon', coordinates: west } },
  ];
};

// Small places Natural Earth doesn't draw separately at 1:50m (overseas parts of France,
// the Caribbean Netherlands, some Pacific and Indian Ocean islands): a dot at their
// location [longitude, latitude].
const EXTRA_DOTS = {
  GP: [-61.58, 16.25], MQ: [-61.02, 14.64], RE: [55.53, -21.12], YT: [45.17, -12.83], BQ: [-68.24, 12.17],
  TV: [179.2, -8.52], TK: [-171.85, -9.2], CX: [105.62, -10.49], CC: [96.87, -12.16], GI: [-5.35, 36.14],
  SJ: [15.6, 78.2], UM: [166.6, 19.28], BV: [3.36, -54.42],
};

const shapes = {};
const skipped = [];
for (const f of small.flatMap(splitFrance)) {
  const code = alpha2(f);
  if (!code) {
    skipped.push(f.properties.name);
    continue;
  }
  const d = path(f);
  if (d) shapes[code] = (shapes[code] ? shapes[code] : '') + round(d);
}
const dots = {};
for (const f of detailed) {
  const code = alpha2(f);
  if (!code || shapes[code] || dots[code]) continue;
  const p = projection(geoCentroid(f));
  if (p) dots[code] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
}

for (const [code, lonlat] of Object.entries(EXTRA_DOTS)) {
  if (shapes[code] || dots[code]) continue;
  const p = projection(lonlat);
  dots[code] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
}

const out = {
  _note:
    'World outlines for the risk maps (scripts/build-world-map.mjs): Natural Earth (public domain) via world-atlas 2.0.2 (ISC). shapes = 1:110m outlines; dots = centroids of smaller places from the 1:50m map. Equal Earth projection, Antarctica omitted.',
  width: W,
  height: H,
  shapes,
  dots,
};
const file = join(root, 'src/data/world-map.json');
writeFileSync(file, JSON.stringify(splitNotes(root, file, out)) + '\n');
console.log(`World map: ${Object.keys(shapes).length} outlines, ${Object.keys(dots).length} small places as dots; skipped (no ISO code): ${skipped.join(', ') || 'none'}.`);
