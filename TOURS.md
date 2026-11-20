# Adding your own 360° walk-through

Right now 12 spots show a Google Maps 360° view (listed in `js/views.js`). A spot you add to `js/tours.js` uses your own photos instead. To get test images while you practise, run `python scripts/make-placeholders.py`.

A walk-through is a list of **stops**. Each stop is one 360° photo. Arrows connect the stops, so users click to "walk" from one to the next.

## 1. Take the photos
- One 360° photo per stop, every 5–10 steps along your path.
- The photo must be **2:1** (e.g. 6000 × 3000 px). Keep each file under ~6 MB (export as JPG, quality ~80).
- Same height every time (stick/tripod at eye level). Write down the stop number and where the next stop is.

## 2. Put the photos in `images/pano/`
Name them clearly, e.g. `chocolate-hills-1-parking.jpg`, `chocolate-hills-2-stairs.jpg`.

## 3. Add the tour in `js/tours.js`
The key is the spot's `id` from `js/spots.js` (e.g. `chocolate-hills`). Copy the Baclayon example:

```js
'chocolate-hills': {
  firstScene: 'parking',
  scenes: {
    parking: {
      title: 'Chocolate Hills — Parking',
      panorama: 'images/pano/chocolate-hills-1-parking.jpg',
      hotSpots: [
        { pitch: -12, yaw: 30, type: 'scene', text: 'Go to the stairs', sceneId: 'stairs' },
      ],
    },
    stairs: {
      title: 'Chocolate Hills — Stairs',
      panorama: 'images/pano/chocolate-hills-2-stairs.jpg',
      hotSpots: [
        { pitch: -12, yaw: 200, type: 'scene', text: 'Back to parking', sceneId: 'parking' },
        { pitch: 10, yaw: 0, type: 'info', text: 'About 214 steps to the top.' },
      ],
    },
  },
},
```

## 4. Find the right arrow direction (yaw)
The **center of the photo is yaw 0**. Turning right goes up to 180, turning left goes down to -180.
1. Run the site locally, open the spot, click **Walk around**.
2. Turn the view until the next stop is in the **middle of the screen**.
3. Read the numbers in the small box at the bottom left (`yaw` / `pitch`) — that's your arrow's yaw. Use `pitch: -12` for arrows on the ground.

## 5. Check it
Run `npm test`. It fails if an arrow points to a stop that doesn't exist, or a tour uses a spot id that doesn't exist.
