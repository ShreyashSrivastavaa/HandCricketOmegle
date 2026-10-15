import {
  classifyHandLandmarks,
  GestureStabilizer,
  getDistance,
  type HandGesture,
  type Landmark,
} from "./gesture/handClassifier";

export {
  classifyHandLandmarks,
  GestureStabilizer,
  getDistance,
  type HandGesture,
  type Landmark,
};

/**
 * Convenience helper to count fingers from landmark array.
 * Maps:
 * 0 => closed fist
 * 1 => 1 finger
 * 2 => 2 fingers
 * 3 => 3 fingers
 * 4 => 4 fingers
 * 5 => 5 fingers (open palm)
 * 6 => 6 (thumb only / sixer gesture)
 */
export function countFingers(landmarks: Landmark[]): HandGesture | null {
  return classifyHandLandmarks(landmarks);
}

/**
 * Creates a helper landmark generator for testing hand rotations, tilts, and poses.
 */
export function createRotatedTiltedFixture(
  baseLandmarks: Landmark[],
  angleDegrees: number = 0,
  tiltZ: number = 0
): Landmark[] {
  const rad = (angleDegrees * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const origin = baseLandmarks[0] || { x: 0.5, y: 0.9, z: 0 };

  return baseLandmarks.map((lm, idx) => {
    // 2D rotation about wrist origin in X-Y plane
    const dx = lm.x - origin.x;
    const dy = lm.y - origin.y;
    const rx = dx * cosA - dy * sinA + origin.x;
    const ry = dx * sinA + dy * cosA + origin.y;

    // Apply Z tilt proportional to distance from wrist
    const zOffset = (idx / 20) * tiltZ;

    return {
      x: rx,
      y: ry,
      z: (lm.z || 0) + zOffset,
    };
  });
}
