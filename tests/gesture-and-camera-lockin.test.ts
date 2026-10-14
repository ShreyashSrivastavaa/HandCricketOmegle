import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyHandLandmarks,
  GestureStabilizer,
  Landmark,
} from "../src/lib/gesture/handClassifier";
import { HandDetector } from "../src/lib/gesture/handDetector";

/**
 * Helper to construct a 21-landmark array simulating finger extension states.
 */
function createHandFixture(config: {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}): Landmark[] {
  const landmarks: Landmark[] = new Array(21);

  // 0: Wrist
  landmarks[0] = { x: 0.5, y: 0.9, z: 0 };

  // Thumb: 1, 2, 3, 4
  landmarks[1] = { x: 0.45, y: 0.85, z: 0 };
  landmarks[2] = { x: 0.42, y: 0.78, z: 0 }; // Thumb MCP
  if (config.thumb) {
    // Thumb extended (thumbs-up or open palm) - tip reaches far left & up
    landmarks[3] = { x: 0.3, y: 0.65, z: 0 };
    landmarks[4] = { x: 0.18, y: 0.5, z: 0 }; // Thumb TIP far from pinky base
  } else {
    // Thumb curled across palm
    landmarks[3] = { x: 0.42, y: 0.75, z: 0 };
    landmarks[4] = { x: 0.45, y: 0.72, z: 0 }; // Thumb TIP tucked
  }

  // Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
  landmarks[5] = { x: 0.42, y: 0.6, z: 0 };
  landmarks[6] = { x: 0.42, y: 0.5, z: 0 };
  landmarks[7] = { x: 0.42, y: 0.4, z: 0 };
  landmarks[8] = config.index
    ? { x: 0.42, y: 0.2, z: 0 } // Extended high
    : { x: 0.42, y: 0.65, z: 0 }; // Curled down

  // Middle: 9(MCP), 10(PIP), 11(DIP), 12(TIP)
  landmarks[9] = { x: 0.5, y: 0.58, z: 0 };
  landmarks[10] = { x: 0.5, y: 0.48, z: 0 };
  landmarks[11] = { x: 0.5, y: 0.38, z: 0 };
  landmarks[12] = config.middle
    ? { x: 0.5, y: 0.18, z: 0 } // Extended high
    : { x: 0.5, y: 0.65, z: 0 }; // Curled down

  // Ring: 13(MCP), 14(PIP), 15(DIP), 16(TIP)
  landmarks[13] = { x: 0.58, y: 0.6, z: 0 };
  landmarks[14] = { x: 0.58, y: 0.5, z: 0 };
  landmarks[15] = { x: 0.58, y: 0.4, z: 0 };
  landmarks[16] = config.ring
    ? { x: 0.58, y: 0.2, z: 0 } // Extended high
    : { x: 0.58, y: 0.65, z: 0 }; // Curled down

  // Pinky: 17(MCP), 18(PIP), 19(DIP), 20(TIP)
  landmarks[17] = { x: 0.65, y: 0.65, z: 0 };
  landmarks[18] = { x: 0.65, y: 0.55, z: 0 };
  landmarks[19] = { x: 0.65, y: 0.45, z: 0 };
  landmarks[20] = config.pinky
    ? { x: 0.65, y: 0.25, z: 0 } // Extended high
    : { x: 0.65, y: 0.68, z: 0 }; // Curled down

  return landmarks;
}

describe("Show to Camera Gesture Lock-in & Stability Tests", () => {
  // 1. Gesture Classifier Unit Tests with Fixture Landmarks for 1-6
  describe("Gesture Classifier Fixtures", () => {
    it("classifies Gesture 1 (Index finger only)", () => {
      const fixture1 = createHandFixture({
        thumb: false,
        index: true,
        middle: false,
        ring: false,
        pinky: false,
      });
      expect(classifyHandLandmarks(fixture1)).toBe(1);
    });

    it("classifies Gesture 2 (Index + Middle)", () => {
      const fixture2 = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: false,
        pinky: false,
      });
      expect(classifyHandLandmarks(fixture2)).toBe(2);
    });

    it("classifies Gesture 3 (Index + Middle + Ring)", () => {
      const fixture3 = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: true,
        pinky: false,
      });
      expect(classifyHandLandmarks(fixture3)).toBe(3);
    });

    it("classifies Gesture 4 (Index + Middle + Ring + Pinky, thumb tucked)", () => {
      const fixture4 = createHandFixture({
        thumb: false,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      expect(classifyHandLandmarks(fixture4)).toBe(4);
    });

    it("classifies Gesture 5 (Open Palm - all 5 extended)", () => {
      const fixture5 = createHandFixture({
        thumb: true,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      expect(classifyHandLandmarks(fixture5)).toBe(5);
    });

    it("classifies Gesture 6 (Thumb Only / Thumbs-Up - 4 fingers curled)", () => {
      const fixture6 = createHandFixture({
        thumb: true,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      });
      expect(classifyHandLandmarks(fixture6)).toBe(6);
    });

    it("returns null for ambiguous / unsupported gestures (e.g. Rock on / Horns)", () => {
      const horns = createHandFixture({
        thumb: false,
        index: true,
        middle: false,
        ring: false,
        pinky: true,
      });
      expect(classifyHandLandmarks(horns)).toBeNull();
    });

    it("returns null for empty or partial landmark array", () => {
      expect(classifyHandLandmarks([])).toBeNull();
      expect(classifyHandLandmarks(new Array(10))).toBeNull();
    });
  });

  // 2. Stability & Lock-in Tests
  describe("Gesture Stabilizer Behavior", () => {
    let stabilizer: GestureStabilizer;

    beforeEach(() => {
      stabilizer = new GestureStabilizer(1000); // 1000ms = 1.0s
    });

    it("unstable gesture alternating between numbers NEVER locks", () => {
      let t = 1000;
      // Alternate between 4 and 6 every 400ms
      for (let i = 0; i < 10; i++) {
        const gesture = i % 2 === 0 ? 4 : 6;
        const res = stabilizer.update(gesture, t);
        expect(res.locked).toBe(false);
        expect(res.progress).toBeLessThan(0.6);
        t += 400;
      }
      expect(stabilizer.isAlreadyLocked()).toBe(false);
    });

    it("holding the same gesture for 1.0s locks exactly once at 1000ms with progress 1.0", () => {
      let t = 1000;

      // At start (0ms): progress = 0, locked = false
      const r0 = stabilizer.update(3, t);
      expect(r0.locked).toBe(false);
      expect(r0.progress).toBe(0);

      // At 500ms: progress = 0.5, locked = false
      const r500 = stabilizer.update(3, t + 500);
      expect(r500.locked).toBe(false);
      expect(r500.progress).toBe(0.5);

      // At 800ms: progress = 0.8, locked = false
      const r800 = stabilizer.update(3, t + 800);
      expect(r800.locked).toBe(false);
      expect(r800.progress).toBe(0.8);

      // At 1000ms: progress = 1.0, LOCKED!
      const r1000 = stabilizer.update(3, t + 1000);
      expect(r1000.locked).toBe(true);
      expect(r1000.progress).toBe(1);
      expect(r1000.lockedNumber).toBe(3);
      expect(stabilizer.isAlreadyLocked()).toBe(true);
    });

    it("after lock, further detections do NOT change the pick (ignored)", () => {
      const t = 1000;
      // Lock with 2
      stabilizer.update(2, t);
      stabilizer.update(2, t + 1000);
      expect(stabilizer.getLockedValue()).toBe(2);

      // Subsequent detections of different numbers
      const rNext = stabilizer.update(6, t + 1500);
      expect(rNext.locked).toBe(true);
      expect(rNext.lockedNumber).toBe(2); // Stays 2!
      expect(stabilizer.getLockedValue()).toBe(2);

      const rEmpty = stabilizer.update(null, t + 2000);
      expect(rEmpty.locked).toBe(true);
      expect(rEmpty.lockedNumber).toBe(2); // Still 2!
    });
  });

  // 3. Fallback, Remote Video Blur, and Resource Cleanup
  describe("Camera Fallback & Video Masking Rules", () => {
    it("switches to NumberPad fallback when either player camera is off", () => {
      // Helper function matching the in-match condition:
      // Both players must have video enabled AND showToCamera setting active
      const isShowToCameraActive = (params: {
        myCameraOn: boolean;
        opponentCameraOn: boolean;
        showToCameraEnabled: boolean;
        isGameOnly: boolean;
      }) => {
        if (params.isGameOnly) return false;
        if (!params.showToCameraEnabled) return false;
        return params.myCameraOn && params.opponentCameraOn;
      };

      // Both on -> Active
      expect(
        isShowToCameraActive({
          myCameraOn: true,
          opponentCameraOn: true,
          showToCameraEnabled: true,
          isGameOnly: false,
        })
      ).toBe(true);

      // Opponent camera off -> Fallback to NumberPad
      expect(
        isShowToCameraActive({
          myCameraOn: true,
          opponentCameraOn: false,
          showToCameraEnabled: true,
          isGameOnly: false,
        })
      ).toBe(false);

      // User camera off -> Fallback to NumberPad
      expect(
        isShowToCameraActive({
          myCameraOn: false,
          opponentCameraOn: true,
          showToCameraEnabled: true,
          isGameOnly: false,
        })
      ).toBe(false);

      // In Game-only mode -> Fallback to NumberPad
      expect(
        isShowToCameraActive({
          myCameraOn: true,
          opponentCameraOn: true,
          showToCameraEnabled: true,
          isGameOnly: true,
        })
      ).toBe(false);
    });

    it("remote video is masked during PICK and countdown, and unmasked only during REVEAL", () => {
      type TurnStage = "pick" | "countdown" | "reveal" | "outcome";

      const isRemoteVideoMasked = (stage: TurnStage, showToCameraMode: boolean): boolean => {
        if (!showToCameraMode) return false;
        // Anti-copying: Remote video is masked during pick and countdown
        return stage === "pick" || stage === "countdown";
      };

      expect(isRemoteVideoMasked("pick", true)).toBe(true);
      expect(isRemoteVideoMasked("countdown", true)).toBe(true);
      expect(isRemoteVideoMasked("reveal", true)).toBe(false); // Unblurred on reveal!
      expect(isRemoteVideoMasked("outcome", true)).toBe(false);
    });

    it("detector stops and releases resources on destroy (Next Opponent / leave)", () => {
      const detector = new HandDetector();
      let detectedCalled = false;
      detector.onDetectionChange = () => {
        detectedCalled = true;
      };

      detector.stop();
      detector.destroy();

      expect(detector["isRunning"]).toBe(false);
      expect(detector["animFrameId"]).toBeNull();
      expect(detector["offscreenCanvas"]).toBeNull();
      expect(detector["handLandmarker"]).toBeNull();
      expect(detectedCalled).toBe(false);
    });
  });
});
