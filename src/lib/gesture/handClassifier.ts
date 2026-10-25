export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type HandGesture = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Calculates Euclidean distance between two landmarks in 2D or 3D.
 */
export function getDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Checks if a non-thumb finger is extended based on joint distances and vertical direction.
 */
function isFingerExtended(
  wrist: Landmark,
  mcp: Landmark,
  pip: Landmark,
  dip: Landmark,
  tip: Landmark
): boolean {
  const tipMcp = getDistance(tip, mcp);
  const pipMcp = getDistance(pip, mcp);
  const tipWrist = getDistance(tip, wrist);
  const pipWrist = getDistance(pip, wrist);

  // In an upright hand (wrist below MCP knuckle), tip being higher than PIP is a very direct signal
  const isUpright = wrist.y > mcp.y;
  const isTipHigher = tip.y < pip.y;

  // Scale-invariant ratio of tip-to-MCP vs PIP-to-MCP
  const ratio = tipMcp / Math.max(pipMcp, 0.001);

  if (isUpright) {
    return (ratio > 1.15 && tipWrist > pipWrist) || (isTipHigher && ratio > 1.0 && tipWrist > pipWrist * 0.9);
  }

  // Tilted or sideways hand
  return ratio > 1.15 && tipWrist > pipWrist;
}

/**
 * Classifies MediaPipe 21 hand landmarks into cricket picks 0-6.
 *
 * Rules:
 * 0: Closed fist (all fingers and thumb tucked/curled)
 * 1: Index finger only (1 finger)
 * 2: Index + Middle fingers (2 fingers)
 * 3: Index + Middle + Ring fingers (3 fingers) OR Thumb + Index + Middle (scout/German 3)
 * 4: Index + Middle + Ring + Pinky (4 fingers, thumb tucked)
 * 5: Open palm (all 5 fingers extended)
 * 6: Thumb only (Thumbs-Up, 4 fingers curled)
 *
 * Returns 0-6 if valid gesture, or null if unclear/ambiguous.
 */
export function classifyHandLandmarks(
  landmarks: Landmark[],
  handedness?: "Left" | "Right" | string,
  isMirrored?: boolean
): HandGesture | null {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const wrist = landmarks[0];

  // Thumb: 1(CMC), 2(MCP), 3(IP), 4(TIP)
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  // Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  // Middle: 9(MCP), 10(PIP), 11(DIP), 12(TIP)
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleDip = landmarks[11];
  const middleTip = landmarks[12];

  // Ring: 13(MCP), 14(PIP), 15(DIP), 16(TIP)
  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringDip = landmarks[15];
  const ringTip = landmarks[16];

  // Pinky: 17(MCP), 18(PIP), 19(DIP), 20(TIP)
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyDip = landmarks[19];
  const pinkyTip = landmarks[20];

  // Scale of the hand (distance from wrist to middle knuckle or palm width)
  const palmHeight = getDistance(wrist, middleMcp);
  const palmWidth = getDistance(indexMcp, pinkyMcp);
  const palmScale = Math.max(palmHeight, palmWidth, 0.05);

  const indexUp = isFingerExtended(wrist, indexMcp, indexPip, indexDip, indexTip);
  const middleUp = isFingerExtended(wrist, middleMcp, middlePip, middleDip, middleTip);
  const ringUp = isFingerExtended(wrist, ringMcp, ringPip, ringDip, ringTip);
  const pinkyUp = isFingerExtended(wrist, pinkyMcp, pinkyPip, pinkyDip, pinkyTip);

  const mainFingersCount = (indexUp ? 1 : 0) + (middleUp ? 1 : 0) + (ringUp ? 1 : 0) + (pinkyUp ? 1 : 0);

  // Vertical Thumbs-Up (Gesture 6):
  // Thumb is pointing straight upward, tip is higher than joints and higher than index knuckle
  const isThumbPointingUp =
    thumbTip.y < thumbIp.y &&
    thumbIp.y < thumbMcp.y &&
    thumbTip.y < indexMcp.y;
  const isThumbExtendedUp =
    isThumbPointingUp &&
    getDistance(thumbTip, wrist) > getDistance(thumbMcp, wrist) * 1.15;

  // Spread Thumb Outward (Gesture 5 / Open Palm):
  // When thumb is extended sideways away from the index finger
  const thumbDistIndexMcp = getDistance(thumbTip, indexMcp);
  const thumbDistMiddleMcp = getDistance(thumbTip, middleMcp);
  const thumbDistPinkyMcp = getDistance(thumbTip, pinkyMcp);
  const thumbSpread =
    thumbDistIndexMcp > palmScale * 0.48 &&
    thumbDistMiddleMcp > palmScale * 0.52 &&
    thumbDistPinkyMcp > getDistance(thumbIp, pinkyMcp);

  const thumbActive = isThumbExtendedUp || thumbSpread;

  // 6: Thumb only (Thumbs-up) -> thumb extended, all other 4 fingers curled
  if (mainFingersCount === 0 && isThumbExtendedUp) {
    return 6;
  }

  // 0: Closed fist -> all fingers curled and thumb not extended up
  if (mainFingersCount === 0 && !isThumbExtendedUp) {
    return 0;
  }

  // 5: Open palm -> all 4 main fingers extended AND thumb spread outward
  if (mainFingersCount === 4 && thumbActive) {
    return 5;
  }

  // 4: 4 fingers raised, thumb tucked/curled across palm
  if (mainFingersCount === 4 && !thumbActive) {
    return 4;
  }

  // 3: 3 fingers (Index, Middle, Ring), pinky curled
  if (indexUp && middleUp && ringUp && !pinkyUp) {
    return 3;
  }

  // 2: 2 fingers (Index, Middle), ring and pinky curled
  if (indexUp && middleUp && !ringUp && !pinkyUp) {
    return 2;
  }

  // 1: 1 finger (Index only), middle, ring, pinky curled
  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 1;
  }

  // Unclear / unsupported gesture (e.g., horns, pinky only, etc.)
  return null;
}

/**
 * GestureStabilizer enforces holding a gesture steadily for ~300ms / ~8 consecutive frames before locking.
 * Once locked, subsequent detections are permanently ignored until reset.
 */
export class GestureStabilizer {
  private currentCandidate: HandGesture | null = null;
  private candidateStartTime: number | null = null;
  private consecutiveFrames: number = 0;
  private isLocked: boolean = false;
  private lockedValue: HandGesture | null = null;
  private requiredHoldMs: number = 300;
  private requiredConsecutiveFrames: number = 5;

  constructor(requiredHoldMs: number = 300, requiredConsecutiveFrames?: number) {
    this.requiredHoldMs = requiredHoldMs;
    this.requiredConsecutiveFrames =
      requiredConsecutiveFrames !== undefined
        ? requiredConsecutiveFrames
        : requiredHoldMs === 300
        ? 5
        : 1;
  }

  /**
   * Process a new detection sample.
   */
  public update(
    detected: HandGesture | null,
    now: number = Date.now()
  ): {
    locked: boolean;
    progress: number;
    lockedNumber?: HandGesture;
    currentCandidate: HandGesture | null;
    consecutiveFrames?: number;
  } {
    // If already locked, freeze state and ignore further changes
    if (this.isLocked && this.lockedValue !== null) {
      return {
        locked: true,
        progress: 1,
        lockedNumber: this.lockedValue,
        currentCandidate: this.lockedValue,
        consecutiveFrames: this.consecutiveFrames,
      };
    }

    if (detected === null) {
      this.currentCandidate = null;
      this.candidateStartTime = null;
      this.consecutiveFrames = 0;
      return {
        locked: false,
        progress: 0,
        currentCandidate: null,
        consecutiveFrames: 0,
      };
    }

    if (detected !== this.currentCandidate) {
      // New candidate started
      this.currentCandidate = detected;
      this.candidateStartTime = now;
      this.consecutiveFrames = 1;
      return {
        locked: false,
        progress: 0,
        currentCandidate: detected,
        consecutiveFrames: 1,
      };
    }

    // Same candidate held
    if (this.candidateStartTime === null) {
      this.candidateStartTime = now;
    }
    this.consecutiveFrames += 1;

    const elapsed = now - this.candidateStartTime;
    const timeProgress = this.requiredHoldMs > 0 ? elapsed / this.requiredHoldMs : 1;
    const frameProgress =
      this.requiredConsecutiveFrames > 0
        ? this.consecutiveFrames / this.requiredConsecutiveFrames
        : 1;
    const progress = Math.min(1, Math.max(0, Math.min(timeProgress, frameProgress)));

    if (
      elapsed >= this.requiredHoldMs &&
      this.consecutiveFrames >= this.requiredConsecutiveFrames
    ) {
      this.isLocked = true;
      this.lockedValue = detected;
      return {
        locked: true,
        progress: 1,
        lockedNumber: detected,
        currentCandidate: detected,
        consecutiveFrames: this.consecutiveFrames,
      };
    }

    return {
      locked: false,
      progress,
      currentCandidate: detected,
      consecutiveFrames: this.consecutiveFrames,
    };
  }

  public reset(): void {
    this.currentCandidate = null;
    this.candidateStartTime = null;
    this.consecutiveFrames = 0;
    this.isLocked = false;
    this.lockedValue = null;
  }

  public getLockedValue(): HandGesture | null {
    return this.lockedValue;
  }

  public isAlreadyLocked(): boolean {
    return this.isLocked;
  }

  public getConsecutiveFrames(): number {
    return this.consecutiveFrames;
  }
}
