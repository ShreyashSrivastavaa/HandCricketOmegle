export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type HandGesture = 1 | 2 | 3 | 4 | 5 | 6;

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
 * Checks if a non-thumb finger is extended based on tip and pip distance from wrist,
 * as well as tip-to-mcp vs pip-to-mcp.
 */
function isFingerExtended(
  wrist: Landmark,
  mcp: Landmark,
  pip: Landmark,
  dip: Landmark,
  tip: Landmark
): boolean {
  const tipDistWrist = getDistance(tip, wrist);
  const pipDistWrist = getDistance(pip, wrist);
  const dipDistWrist = getDistance(dip, wrist);

  // Tip must be significantly further from wrist than PIP and DIP
  return tipDistWrist > pipDistWrist * 1.1 && tipDistWrist > dipDistWrist;
}

/**
 * Checks if thumb is extended away from palm.
 * Uses distance from thumb tip to pinky MCP and distance from thumb tip to thumb MCP.
 */
function isThumbExtended(
  wrist: Landmark,
  thumbMcp: Landmark,
  thumbIp: Landmark,
  thumbTip: Landmark,
  indexMcp: Landmark,
  pinkyMcp: Landmark
): boolean {
  const tipDistToPinky = getDistance(thumbTip, pinkyMcp);
  const ipDistToPinky = getDistance(thumbIp, pinkyMcp);
  const tipDistToWrist = getDistance(thumbTip, wrist);
  const mcpDistToWrist = getDistance(thumbMcp, wrist);

  // When thumb is extended (thumbs-up or open palm), thumb tip is far from pinky base and wrist
  return tipDistToPinky > ipDistToPinky && tipDistToWrist > mcpDistToWrist * 1.05;
}

/**
 * Classifies MediaPipe 21 hand landmarks into cricket picks 1-6.
 *
 * Rules:
 * 1: Index finger only (1 finger)
 * 2: Index + Middle fingers (2 fingers)
 * 3: Index + Middle + Ring fingers (3 fingers)
 * 4: Index + Middle + Ring + Pinky (4 fingers, thumb tucked)
 * 5: Open palm (all 5 fingers extended)
 * 6: Thumb only (Thumbs-Up, 4 fingers curled)
 *
 * Returns 1-6 if valid gesture, or null if unclear/ambiguous.
 */
export function classifyHandLandmarks(landmarks: Landmark[]): HandGesture | null {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const wrist = landmarks[0];

  // Thumb: 1, 2, 3, 4
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  // Index: 5, 6, 7, 8
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  // Middle: 9, 10, 11, 12
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleDip = landmarks[11];
  const middleTip = landmarks[12];

  // Ring: 13, 14, 15, 16
  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringDip = landmarks[15];
  const ringTip = landmarks[16];

  // Pinky: 17, 18, 19, 20
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyDip = landmarks[19];
  const pinkyTip = landmarks[20];

  const indexUp = isFingerExtended(wrist, indexMcp, indexPip, indexDip, indexTip);
  const middleUp = isFingerExtended(wrist, middleMcp, middlePip, middleDip, middleTip);
  const ringUp = isFingerExtended(wrist, ringMcp, ringPip, ringDip, ringTip);
  const pinkyUp = isFingerExtended(wrist, pinkyMcp, pinkyPip, pinkyDip, pinkyTip);
  const thumbUp = isThumbExtended(wrist, thumbMcp, thumbIp, thumbTip, indexMcp, pinkyMcp);

  // 6: Thumb only (Thumbs-up) -> thumb extended, all other 4 fingers curled
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 6;
  }

  // 5: Open palm -> all 5 fingers extended
  if (thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
    return 5;
  }

  // 4: 4 fingers raised, thumb tucked/curled
  if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
    return 4;
  }

  // 3: 3 fingers (Index, Middle, Ring), pinky and thumb curled
  if (!thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
    return 3;
  }

  // 2: 2 fingers (Index, Middle), ring, pinky, and thumb curled
  if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
    return 2;
  }

  // 1: 1 finger (Index only), middle, ring, pinky, and thumb curled
  if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 1;
  }

  // Unclear / unsupported gesture (e.g., horns, pinky only, etc.)
  return null;
}

/**
 * GestureStabilizer enforces holding a gesture steadily for 1.0s before locking.
 * Once locked, subsequent detections are permanently ignored.
 */
export class GestureStabilizer {
  private currentCandidate: HandGesture | null = null;
  private candidateStartTime: number | null = null;
  private isLocked: boolean = false;
  private lockedValue: HandGesture | null = null;
  private requiredHoldMs: number = 1000;

  constructor(requiredHoldMs: number = 1000) {
    this.requiredHoldMs = requiredHoldMs;
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
  } {
    // If already locked, freeze state and ignore further changes
    if (this.isLocked && this.lockedValue !== null) {
      return {
        locked: true,
        progress: 1,
        lockedNumber: this.lockedValue,
        currentCandidate: this.lockedValue,
      };
    }

    if (detected === null) {
      this.currentCandidate = null;
      this.candidateStartTime = null;
      return {
        locked: false,
        progress: 0,
        currentCandidate: null,
      };
    }

    if (detected !== this.currentCandidate) {
      // New candidate started
      this.currentCandidate = detected;
      this.candidateStartTime = now;
      return {
        locked: false,
        progress: 0,
        currentCandidate: detected,
      };
    }

    // Same candidate held
    if (this.candidateStartTime === null) {
      this.candidateStartTime = now;
    }

    const elapsed = now - this.candidateStartTime;
    const progress = Math.min(1, Math.max(0, elapsed / this.requiredHoldMs));

    if (elapsed >= this.requiredHoldMs) {
      this.isLocked = true;
      this.lockedValue = detected;
      return {
        locked: true,
        progress: 1,
        lockedNumber: detected,
        currentCandidate: detected,
      };
    }

    return {
      locked: false,
      progress,
      currentCandidate: detected,
    };
  }

  public reset(): void {
    this.currentCandidate = null;
    this.candidateStartTime = null;
    this.isLocked = false;
    this.lockedValue = null;
  }

  public getLockedValue(): HandGesture | null {
    return this.lockedValue;
  }

  public isAlreadyLocked(): boolean {
    return this.isLocked;
  }
}
