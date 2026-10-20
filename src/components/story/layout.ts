// Shared positions for the story drawings in scenes 1, 2, 4 and 5 (all use the
// same 480×360 viewBox), so nothing jumps between scenes.
export const VIEW_W = 480;
export const VIEW_H = 360;

/** Top edge of the light-blue ground: everyone stands exactly on it. (262 since Oct 16:
 *  raised 28 units so "The next bite" strip fits on the ground below the names.) */
export const GROUND = 262;
/** Baseline of the name labels: their capitals start about 8px below the ground's top
 *  edge at 1313×900 (19-unit bold names, drawn at 1.125×). */
export const NAME_Y = GROUND + 21;
/** Bottom of the lowest label on the ground (the note under a name), for the strip below. */
export const LABELS_BOTTOM = NAME_Y + 12 + 3.5;

/** Ana in steps 1, 2, 3 and 5, and the neighbor in step 6 (same spot, same size). */
export const PERSON_X = 110;
/** The bucket in scene 2 (full size). */
export const BUCKET_X = 370;

/** Step 5 "The next bite": Ana left, the neighbor to her right. The mosquito is the
 *  same size in step 6 ("More mosquitoes"). */
export const NEXT = { neighborX: 270, mosquitoScale: 1.088 };

/** Step 6 "More mosquitoes": the bucket with eggs, larger and centered on the ground. */
export const MORE = {
  bucketX: 240,
  bucketScale: 1.7,
  /** The mosquito perched on the right rim: rim point (drawing units), where its centre
   *  sits relative to that point (scene units), and its tilt (negative = head dips
   *  toward the water). */
  perch: { rimX: 83, dx: 21, dy: -13, tilt: -18 },
};

/** Step 1 "Meet the Aedes mosquito": Aedes (left) and Culex (right), same size,
 *  standing on the ground (body points; the drawings span about ±27 units × scale). */
export const MEET = { aedesX: 130, culexX: 350, scale: 2.5 };

/** Flying mosquito size in "The bite" (20% smaller since Oct 16; was 1.7). */
export const MOSQUITO_SCALE = 1.36;
/** The mosquito's proboscis tip is 27 drawing units left of its centre. */
export const PROBOSCIS = 27;
/** Where the mosquito bites Ana in "The bite" (just right of her head). */
export const BITE = { x: PERSON_X + 26.1, y: GROUND - 112 };

/** Bucket drawing (Bucket.astro, from bucket-eggs.svg, 100×108 units): scale so its
 *  rim (34 units half-width) is as wide as the previous bucket's (38). Off the ground
 *  (printables, the cycle icon) the outer edge of the base outline's lowest point
 *  (y = 102) is the anchor. */
export const BUCKET_K = 38 / 34;
export const BUCKET_BASE = 102;
/** Standing on the ground: the outer edge of the base's bottom corners (y = 98; the
 *  base curves 4 units lower in the middle) is the anchor, pushed `sink` units below the
 *  ground's top edge, so the whole base overlaps the ground and no white shows under it. */
export const BUCKET_CORNER = 98;
/** How far the base corners go below the ground: about 3px at 1313×900, where the story
 *  drawings render at 1.125px per unit (540px for 480 units). */
export const STORY_BUCKET_SINK = 3 / 1.125;
/** Middle of the water surface inside the handle, relative to the base corners, at
 *  scale 1 (add the ground and the sink). */
export const BUCKET_WATER_Y = (43.5 - BUCKET_CORNER) * BUCKET_K;
