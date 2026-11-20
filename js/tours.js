// 360° walk-throughs. Key = spot id from spots.js. See TOURS.md for how to add your own photos.
// yaw: left/right angle of the arrow (0 = center of the photo, 90 = right, -90 = left, 180 = behind).
// pitch: up/down angle (negative = toward the ground, like Google's arrows).
export const tours = {
  'baclayon-church': {
    firstScene: 'gate',
    scenes: {
      gate: {
        title: 'Baclayon Church — Gate (placeholder photo)',
        panorama: 'images/pano/baclayon-1-gate.jpg',
        hotSpots: [
          { pitch: -12, yaw: 0, type: 'scene', text: 'Walk to the plaza', sceneId: 'plaza' },
        ],
      },
      plaza: {
        title: 'Baclayon Church — Plaza (placeholder photo)',
        panorama: 'images/pano/baclayon-2-plaza.jpg',
        hotSpots: [
          { pitch: -12, yaw: 0, type: 'scene', text: 'Walk to the church door', sceneId: 'door' },
          { pitch: -12, yaw: 180, type: 'scene', text: 'Back to the gate', sceneId: 'gate' },
          { pitch: 5, yaw: 60, type: 'info', text: 'Built by Jesuits in 1727 from coral stone.' },
        ],
      },
      door: {
        title: 'Baclayon Church — Main door (placeholder photo)',
        panorama: 'images/pano/baclayon-3-door.jpg',
        hotSpots: [
          { pitch: -12, yaw: 180, type: 'scene', text: 'Back to the plaza', sceneId: 'plaza' },
        ],
      },
    },
  },
};
