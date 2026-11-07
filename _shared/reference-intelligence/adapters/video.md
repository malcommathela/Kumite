# Video and recording adapter

A video, screen recording or prototype capture is the strongest common evidence
for motion. It can show sequence, timing, easing feel, pointer feedback and state
changes. It still cannot show the exact code or an unrecorded breakpoint.

## Capture

1. Record the source, date, duration, frame rate and viewport.
2. Capture the interaction from a known starting state.
3. Repeat the interaction at least three times for a timing estimate.
4. Keep the original file and extract representative frames into the project's
   `reference/` folder.
5. Record the licence and permission to use the recording.

## Extraction

For each motion:

- Identify the trigger: load, scroll, hover, focus, press, drag, route change or
  data change.
- Measure start and end frames. Convert frames to milliseconds using the frame
  rate.
- Observe easing by sampling position over time; do not guess a named curve.
- Note distance, transform origin, opacity, blur, colour and stagger.
- Note interruption: what happens when the user acts mid-animation.
- Note the reduced-motion behaviour if the recording shows it; otherwise mark it
  `unknown`.

A duration measured from a recording is `measured`, not `exact`. A value read by
feel is at most `estimated`. A value never observed is `unknown`.

## Limits

- Compression can hide stutter and change perceived easing.
- A recording shows one viewport and one input method.
- A prototype may declare a duration the production build does not use.
- A video of a site is not permission to copy its assets or identity.

## Output

Feed the observations into `motion-spec.md` and the motion selection record. Do
not create a motion direction from a video the user has not approved. See
[`../../motion/motion-selection.md`](../../motion/motion-selection.md).
