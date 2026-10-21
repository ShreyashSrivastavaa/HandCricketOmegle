import {
  classifyHandLandmarks,
  GestureStabilizer,
  HandGesture,
  Landmark,
} from "./handClassifier";

export interface DetectionResult {
  gesture: HandGesture | null;
  progress: number;
  locked: boolean;
  lockedNumber?: HandGesture;
  hint?: string;
  isLowLight?: boolean;
  landmarks?: Landmark[];
  suggestTapMode?: boolean;
  isLoadingModel?: boolean;
}

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm knuckle base
  [5, 9], [9, 13], [13, 17],
];

/**
 * Draws real-time AR hand skeleton onto an overlay canvas
 */
export function drawHandSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  isLocked: boolean = false
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx || !landmarks || landmarks.length < 21) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = isLocked ? "#10b981" : "#06b6d4"; // emerald when locked, cyan when tracking
  ctx.shadowColor = isLocked ? "rgba(16, 185, 129, 0.8)" : "rgba(6, 182, 212, 0.8)";
  ctx.shadowBlur = 8;

  // Draw connections/bones
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    ctx.beginPath();
    ctx.moveTo(start.x * w, start.y * h);
    ctx.lineTo(end.x * w, end.y * h);
    ctx.stroke();
  }

  // Draw landmark points
  ctx.shadowBlur = 0;
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const isTip = [4, 8, 12, 16, 20].includes(i);
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, isTip ? 5 : 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = isLocked ? "#34d399" : isTip ? "#38bdf8" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = isLocked ? "#065f46" : "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export class HandDetector {
  private handLandmarker: any = null;
  private isInitializing: boolean = false;
  private stabilizer: GestureStabilizer = new GestureStabilizer(300, 8);
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastProcessTime: number = 0;
  private minIntervalMs: number = 40; // ~25 fps (1000ms / 25 = 40ms)
  private currentVideoElement: HTMLVideoElement | null = null;

  // 3-second undetected timeout tracking for tap fallback suggestion
  private runStartTime: number = 0;
  private lastHandDetectedTime: number = 0;
  private hasSuggestedTap: boolean = false;

  // Offscreen canvas for frame resizing (640x480 max) and lighting check
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  public onDetectionChange?: (result: DetectionResult) => void;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    } else if (this.isRunning && this.currentVideoElement && !this.stabilizer.isAlreadyLocked()) {
      this.lastProcessTime = performance.now();
      this.animFrameId = requestAnimationFrame(() => this.loop(this.currentVideoElement!));
    }
  };

  /**
   * Initializes MediaPipe HandLandmarker on-device using @mediapipe/tasks-vision
   */
  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;
    if (typeof window === "undefined") return false;

    try {
      this.isInitializing = true;
      this.onDetectionChange?.({
        gesture: null,
        progress: 0,
        locked: false,
        isLoadingModel: true,
        hint: "Loading hand tracker...",
      });

      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitializing = false;
      this.onDetectionChange?.({
        gesture: null,
        progress: 0,
        locked: false,
        isLoadingModel: false,
      });
      return true;
    } catch (err) {
      console.warn("[HandDetector] GPU delegate failed, trying CPU fallback", err);
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.isInitializing = false;
        this.onDetectionChange?.({
          gesture: null,
          progress: 0,
          locked: false,
          isLoadingModel: false,
        });
        return true;
      } catch (cpuErr) {
        console.error("[HandDetector] Failed to initialize MediaPipe Hands", cpuErr);
        this.isInitializing = false;
        this.onDetectionChange?.({
          gesture: null,
          progress: 0,
          locked: false,
          isLoadingModel: false,
          hint: "Hand tracker failed to load. Use tap buttons.",
        });
        return false;
      }
    }
  }

  /**
   * Checks lighting condition of the camera frame
   */
  private checkLighting(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    try {
      const step = 20; // Sample grid
      const imgData = ctx.getImageData(0, 0, width, height).data;
      let totalLuma = 0;
      let sampleCount = 0;

      for (let i = 0; i < imgData.length; i += step * 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        sampleCount++;
      }

      const avgLuma = sampleCount > 0 ? totalLuma / sampleCount : 100;
      return avgLuma < 35; // True if too dark
    } catch (e) {
      return false;
    }
  }

  /**
   * Start processing video feed for hand gestures
   */
  public start(videoElement: HTMLVideoElement): void {
    this.stop();
    this.stabilizer.reset();
    this.isRunning = true;
    this.currentVideoElement = videoElement;
    this.runStartTime = Date.now();
    this.lastHandDetectedTime = Date.now();
    this.hasSuggestedTap = false;

    if (!this.offscreenCanvas && typeof document !== "undefined") {
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = 640;
      this.offscreenCanvas.height = 480;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });
    }

    this.initialize().then((ready) => {
      if (!ready || !this.isRunning) return;
      this.loop(videoElement);
    });
  }

  /**
   * Continuous detection loop, throttled to 25 fps max
   */
  private loop = (videoElement: HTMLVideoElement): void => {
    if (!this.isRunning || (typeof document !== "undefined" && document.hidden)) return;

    const now = performance.now();
    if (now - this.lastProcessTime >= this.minIntervalMs) {
      this.lastProcessTime = now;
      this.processFrame(videoElement, now);
    }

    if (this.isRunning && !this.stabilizer.isAlreadyLocked()) {
      this.animFrameId = requestAnimationFrame(() => this.loop(videoElement));
    }
  };

  /**
   * Processes a single video frame
   */
  private processFrame(videoElement: HTMLVideoElement, timestamp: number): void {
    if (!this.handLandmarker || !videoElement || videoElement.paused || videoElement.ended) {
      return;
    }

    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return;
    }

    try {
      let isLowLight = false;
      if (this.offscreenCtx && this.offscreenCanvas) {
        this.offscreenCtx.drawImage(videoElement, 0, 0, 640, 480);
        isLowLight = this.checkLighting(this.offscreenCtx, 640, 480);
      }

      const results = this.handLandmarker.detectForVideo(videoElement, timestamp);
      let detectedGesture: HandGesture | null = null;
      let rawLandmarks: Landmark[] | undefined = undefined;

      if (results?.landmarks && results.landmarks.length > 0 && results.landmarks[0]) {
        const firstHand = results.landmarks[0];
        rawLandmarks = firstHand;
        const handedness = results?.handedness?.[0]?.[0]?.categoryName;
        detectedGesture = classifyHandLandmarks(firstHand, handedness);
        this.lastHandDetectedTime = Date.now();
      }

      const updateResult = this.stabilizer.update(detectedGesture);

      // 3-second hand undetected auto-suggestion
      const now = Date.now();
      let suggestTapMode = false;
      if (now - this.lastHandDetectedTime >= 3000 && !updateResult.locked) {
        suggestTapMode = true;
        this.hasSuggestedTap = true;
      }

      let hint: string | undefined;
      if (isLowLight) {
        hint = "Low light detected. Tap buttons below if needed.";
      } else if (suggestTapMode) {
        hint = "Hand not detected. Show hand to camera or tap 1-6!";
      } else if (detectedGesture === null) {
        hint = "Show hand clearly in camera view";
      }

      this.onDetectionChange?.({
        gesture: detectedGesture,
        progress: updateResult.progress,
        locked: updateResult.locked,
        lockedNumber: updateResult.lockedNumber,
        hint,
        isLowLight,
        landmarks: rawLandmarks,
        suggestTapMode,
      });

      // STOP the detector immediately once locked!
      if (updateResult.locked) {
        this.stop();
      }
    } catch (err) {
      // Ignore frame errors silently
    }
  }

  /**
   * Stop detector and cancel animation frame
   */
  public stop(): void {
    this.isRunning = false;
    this.currentVideoElement = null;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Reset stabilizer for next ball
   */
  public resetForNextBall(): void {
    this.stabilizer.reset();
    this.hasSuggestedTap = false;
    this.lastHandDetectedTime = Date.now();
  }

  /**
   * Full cleanup (releasing all resources on exit/leave)
   */
  public destroy(): void {
    this.stop();
    this.stabilizer.reset();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close?.();
      } catch (e) {}
      this.handLandmarker = null;
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}

export const handDetector = new HandDetector();

