import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyHandLandmarks,
  countFingers,
  GestureStabilizer,
  createRotatedTiltedFixture,
  type Landmark,
} from "../src/lib/fingerCounting";

/**
 * Creates a standard 21-landmark fixture with configurable finger extension states.
 */
function createHandFixture(config: {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}): Landmark[] {
  const landmarks: Landmark[] = new Array(21);

  // 0: Wrist origin
  landmarks[0] = { x: 0.5, y: 0.9, z: 0 };

  // Thumb: 1, 2(MCP), 3(IP), 4(TIP)
  landmarks[1] = { x: 0.45, y: 0.85, z: 0 };
  landmarks[2] = { x: 0.42, y: 0.78, z: 0 };
  if (config.thumb) {
    // Thumb extended (thumbs-up or open palm)
    landmarks[3] = { x: 0.3, y: 0.65, z: 0 };
    landmarks[4] = { x: 0.18, y: 0.5, z: 0 };
  } else {
    // Thumb tucked
    landmarks[3] = { x: 0.42, y: 0.75, z: 0 };
    landmarks[4] = { x: 0.45, y: 0.72, z: 0 };
  }

  // Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
  landmarks[5] = { x: 0.42, y: 0.6, z: 0 };
  landmarks[6] = { x: 0.42, y: 0.5, z: 0 };
  landmarks[7] = { x: 0.42, y: 0.4, z: 0 };
  landmarks[8] = config.index
    ? { x: 0.42, y: 0.2, z: 0 }
    : { x: 0.42, y: 0.65, z: 0 };

  // Middle: 9(MCP), 10(PIP), 11(DIP), 12(TIP)
  landmarks[9] = { x: 0.5, y: 0.58, z: 0 };
  landmarks[10] = { x: 0.5, y: 0.48, z: 0 };
  landmarks[11] = { x: 0.5, y: 0.38, z: 0 };
  landmarks[12] = config.middle
    ? { x: 0.5, y: 0.18, z: 0 }
    : { x: 0.5, y: 0.65, z: 0 };

  // Ring: 13(MCP), 14(PIP), 15(DIP), 16(TIP)
  landmarks[13] = { x: 0.58, y: 0.6, z: 0 };
  landmarks[14] = { x: 0.58, y: 0.5, z: 0 };
  landmarks[15] = { x: 0.58, y: 0.4, z: 0 };
  landmarks[16] = config.ring
    ? { x: 0.58, y: 0.2, z: 0 }
    : { x: 0.58, y: 0.65, z: 0 };

  // Pinky: 17(MCP), 18(PIP), 19(DIP), 20(TIP)
  landmarks[17] = { x: 0.65, y: 0.65, z: 0 };
  landmarks[18] = { x: 0.65, y: 0.55, z: 0 };
  landmarks[19] = { x: 0.65, y: 0.45, z: 0 };
  landmarks[20] = config.pinky
    ? { x: 0.65, y: 0.25, z: 0 }
    : { x: 0.65, y: 0.68, z: 0 };

  return landmarks;
}

describe("Finger Counting & Landmark Classification", () => {
  describe("Fixture Landmark Sets for 0 to 6", () => {
    it("recognizes 0 (Closed Fist - all fingers and thumb curled)", () => {
      const fist = createHandFixture({
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      });
      expect(countFingers(fist)).toBe(0);
      expect(classifyHandLandmarks(fist)).toBe(0);
    });

    it("recognizes 1 (Index finger only)", () => {
      const one = createHandFixture({
        thumb: false,
        index: true,
        middle: false,
        ring: false,
        pinky: false,
      });
      expect(countFingers(one)).toBe(1);
    });

    it("recognizes 2 (Index + Middle fingers)", () => {
      const two = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: false,
        pinky: false,
      });
      expect(countFingers(two)).toBe(2);
    });

    it("recognizes 3 (Index + Middle + Ring fingers)", () => {
      const three = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: true,
        pinky: false,
      });
      expect(countFingers(three)).toBe(3);
    });

    it("recognizes 4 (Index + Middle + Ring + Pinky, thumb tucked)", () => {
      const four = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      expect(countFingers(four)).toBe(4);
    });

    it("recognizes 5 (Open Palm - all 5 fingers extended)", () => {
      const five = createHandFixture({
        thumb: true,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      expect(countFingers(five)).toBe(5);
    });

    it("recognizes 6 (Thumb Only / Thumbs-Up, 4 fingers curled)", () => {
      const six = createHandFixture({
        thumb: true,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      });
      expect(countFingers(six)).toBe(6);
    });
  });

  describe("Left Hand & Mirrored Selfie View Fixtures", () => {
    function mirrorFixture(landmarks: Landmark[]): Landmark[] {
      return landmarks.map((lm) => ({
        x: 1 - lm.x,
        y: lm.y,
        z: lm.z,
      }));
    }

    it("classifies Gesture 6 (Thumbs-Up) on a mirrored selfie camera view", () => {
      const rightSix = createHandFixture({
        thumb: true,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      });
      const mirroredSix = mirrorFixture(rightSix);
      expect(classifyHandLandmarks(mirroredSix)).toBe(6);
      expect(classifyHandLandmarks(mirroredSix, "Left", true)).toBe(6);
    });

    it("classifies Gesture 1-5 accurately on mirrored selfie camera view", () => {
      for (let n = 1; n <= 5; n++) {
        const fixture = createHandFixture({
          thumb: n === 5,
          index: n >= 1,
          middle: n >= 2,
          ring: n >= 3,
          pinky: n >= 4,
        });
        const mirrored = mirrorFixture(fixture);
        expect(classifyHandLandmarks(mirrored)).toBe(n);
        expect(classifyHandLandmarks(mirrored, "Left", true)).toBe(n);
      }
    });

    it("classifies Left hand correctly with explicit Left handedness", () => {
      const leftFive = mirrorFixture(
        createHandFixture({
          thumb: true,
          index: true,
          middle: true,
          ring: true,
          pinky: true,
        })
      );
      expect(classifyHandLandmarks(leftFive, "Left", false)).toBe(5);

      const leftSix = mirrorFixture(
        createHandFixture({
          thumb: true,
          index: false,
          middle: false,
          ring: false,
          pinky: false,
        })
      );
      expect(classifyHandLandmarks(leftSix, "Left", false)).toBe(6);
    });
  });

  describe("Rotated and Tilted Hand Fixtures", () => {
    it("classifies Gesture 2 correctly when hand is rotated 15 degrees", () => {
      const baseTwo = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: false,
        pinky: false,
      });
      const rotated = createRotatedTiltedFixture(baseTwo, 15, 0);
      expect(classifyHandLandmarks(rotated)).toBe(2);
    });

    it("classifies Gesture 6 correctly when hand is tilted in Z-axis towards camera", () => {
      const baseSix = createHandFixture({
        thumb: true,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      });
      const tilted = createRotatedTiltedFixture(baseSix, 0, 0.15);
      expect(classifyHandLandmarks(tilted)).toBe(6);
    });

    it("classifies Gesture 4 correctly with mild 10-degree rotation and Z tilt", () => {
      const baseFour = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      const rotatedAndTilted = createRotatedTiltedFixture(baseFour, 10, -0.1);
      expect(classifyHandLandmarks(rotatedAndTilted)).toBe(4);
    });
  });

  describe("Edge Cases and Ambiguous Poses", () => {
    it("returns null for partial or corrupted landmark arrays", () => {
      expect(classifyHandLandmarks([])).toBeNull();
      expect(classifyHandLandmarks(new Array(15) as any)).toBeNull();
    });

    it("returns null for unsupported hand signs (e.g. Rock On / Horns)", () => {
      const horns = createHandFixture({
        thumb: false,
        index: true,
        middle: false,
        ring: false,
        pinky: true,
      });
      expect(classifyHandLandmarks(horns)).toBeNull();
    });

    it("returns null for pinky-only sign", () => {
      const pinkyOnly = createHandFixture({
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: true,
      });
      expect(classifyHandLandmarks(pinkyOnly)).toBeNull();
    });
  });

  describe("Gesture Stability Debounce (~5 consecutive frames / ~300ms)", () => {
    let stabilizer: GestureStabilizer;

    beforeEach(() => {
      // 300ms hold time and 5 consecutive frames
      stabilizer = new GestureStabilizer(300, 5);
    });

    it("does not lock when held for less than 5 frames even if 300ms elapsed", () => {
      const t = 1000;
      // Only 3 frames over 350ms
      stabilizer.update(4, t);
      stabilizer.update(4, t + 150);
      const res = stabilizer.update(4, t + 350);

      expect(res.locked).toBe(false);
      expect(stabilizer.getConsecutiveFrames()).toBe(3);
      expect(stabilizer.isAlreadyLocked()).toBe(false);
    });

    it("does not lock when 5 frames happen in less than 300ms (too fast)", () => {
      const t = 1000;
      // 5 frames in 100ms
      for (let i = 0; i < 5; i++) {
        stabilizer.update(6, t + i * 20);
      }
      expect(stabilizer.getConsecutiveFrames()).toBe(5);
      expect(stabilizer.isAlreadyLocked()).toBe(false);
    });

    it("locks successfully when held for 5 consecutive frames AND >= 300ms", () => {
      const t = 1000;
      // 5 frames at 0, 75, 150, 225, 300ms
      let res;
      for (let i = 0; i < 5; i++) {
        res = stabilizer.update(2, t + i * 75);
      }

      expect(res?.locked).toBe(true);
      expect(res?.lockedNumber).toBe(2);
      expect(stabilizer.isAlreadyLocked()).toBe(true);
      expect(stabilizer.getLockedValue()).toBe(2);
    });

    it("resets frame count and timer immediately if gesture flickers to another number", () => {
      const t = 1000;
      // 4 frames of gesture 3
      stabilizer.update(3, t);
      stabilizer.update(3, t + 80);
      stabilizer.update(3, t + 160);
      stabilizer.update(3, t + 240);
      expect(stabilizer.getConsecutiveFrames()).toBe(4);

      // 5th frame flickers to gesture 5
      const flickerRes = stabilizer.update(5, t + 320);
      expect(flickerRes.locked).toBe(false);
      expect(stabilizer.getConsecutiveFrames()).toBe(1);
      expect(flickerRes.currentCandidate).toBe(5);
    });

    it("resets frame count if hand disappears (null detection)", () => {
      const t = 1000;
      stabilizer.update(1, t);
      stabilizer.update(1, t + 80);
      expect(stabilizer.getConsecutiveFrames()).toBe(2);

      const lostRes = stabilizer.update(null, t + 160);
      expect(lostRes.locked).toBe(false);
      expect(stabilizer.getConsecutiveFrames()).toBe(0);
      expect(lostRes.currentCandidate).toBeNull();
    });
  });
});
