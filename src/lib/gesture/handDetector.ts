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
}

export class HandDetector {
  private handLandmarker: any = null;
  private isInitializing: boolean = false;
  private stabilizer: GestureStabilizer = new GestureStabilizer(1000);
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastProcessTime: number = 0;
  private minIntervalMs: number = 66; // Capped at ~15 fps (1000ms / 15 = 66.6ms)

  // Offscreen canvas for frame resizing (640x480 max) and lighting check
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  public onDetectionChange?: (result: DetectionResult) => void;

  /**
   * Initializes MediaPipe HandLandmarker on-device using @mediapipe/tasks-vision
   */
  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;
    if (typeof window === "undefined") return false;

    try {
      this.isInitializing = true;
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
        return true;
      } catch (cpuErr) {
        console.error("[HandDetector] Failed to initialize MediaPipe Hands", cpuErr);
        this.isInitializing = false;
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

    if (!this.offscreenCanvas) {
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
   * Continuous detection loop, throttled to 15 fps max
   */
  private loop = (videoElement: HTMLVideoElement): void => {
    if (!this.isRunning) return;

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

      if (results?.landmarks && results.landmarks.length > 0) {
        const rawLandmarks: Landmark[] = results.landmarks[0];
        detectedGesture = classifyHandLandmarks(rawLandmarks);
      }

      const updateResult = this.stabilizer.update(detectedGesture);

      let hint: string | undefined;
      if (isLowLight) {
        hint = "Need more light";
      } else if (detectedGesture === null) {
        hint = "Not sure, show clearly or tap a number";
      }

      this.onDetectionChange?.({
        gesture: detectedGesture,
        progress: updateResult.progress,
        locked: updateResult.locked,
        lockedNumber: updateResult.lockedNumber,
        hint,
        isLowLight,
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
  }

  /**
   * Full cleanup (releasing all resources on exit/leave)
   */
  public destroy(): void {
    this.stop();
    this.stabilizer.reset();
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
