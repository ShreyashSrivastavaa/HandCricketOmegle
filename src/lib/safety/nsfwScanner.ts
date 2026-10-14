export interface NSFWClassification {
  className: "Drawing" | "Hentai" | "Neutral" | "Porn" | "Sexy";
  probability: number;
}

export class NSFWScanner {
  private model: any = null;
  private isModelLoading: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  public onInappropriateDetected?: (predictions: NSFWClassification[]) => void;

  /**
   * Helper to dynamically inject browser script
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === "undefined") return resolve();
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Lazy load the on-device NSFW model in browser
   */
  public async loadModel(): Promise<boolean> {
    if (this.model) return true;
    if (this.isModelLoading) return false;
    if (typeof window === "undefined") return false;

    try {
      this.isModelLoading = true;

      // 1. Check if window.nsfwjs is already present
      if ((window as any).nsfwjs) {
        this.model = await (window as any).nsfwjs.load();
        this.isModelLoading = false;
        return true;
      }

      // 2. Load TFJS and NSFWJS scripts dynamically to avoid bundling hundreds of MBs in webpack
      try {
        await this.loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
        await this.loadScript("https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/nsfwjs.min.js");

        if ((window as any).nsfwjs) {
          this.model = await (window as any).nsfwjs.load();
          this.isModelLoading = false;
          return true;
        }
      } catch (scriptErr) {
        console.warn("[NSFWScanner] CDN script load failed, falling back to local module", scriptErr);
      }

      // Fallback: dynamic import if available
      try {
        const nsfwjs = await import("nsfwjs");
        this.model = await nsfwjs.load();
        this.isModelLoading = false;
        return true;
      } catch (importErr) {
        console.warn("[NSFWScanner] Module load failed", importErr);
      }

      this.isModelLoading = false;
      return false;
    } catch (err) {
      console.warn("[NSFWScanner] Failed to initialize on-device NSFW model", err);
      this.isModelLoading = false;
      return false;
    }
  }

  /**
   * Start scanning a remote video element every 2 seconds
   */
  public startScanning(videoElement: HTMLVideoElement) {
    this.stopScanning();

    if (typeof window === "undefined") return;

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = 224;
      this.offscreenCanvas.height = 224;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });
    }

    this.loadModel().then((loaded) => {
      if (!loaded) return;

      this.scanInterval = setInterval(async () => {
        if (!this.model || !videoElement || videoElement.paused || videoElement.ended) {
          return;
        }

        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          return;
        }

        try {
          if (this.offscreenCtx && this.offscreenCanvas) {
            this.offscreenCtx.drawImage(
              videoElement,
              0,
              0,
              this.offscreenCanvas.width,
              this.offscreenCanvas.height
            );

            const predictions: NSFWClassification[] = await this.model.classify(this.offscreenCanvas);

            const pornScore = predictions.find((p) => p.className === "Porn")?.probability || 0;
            const hentaiScore = predictions.find((p) => p.className === "Hentai")?.probability || 0;
            const sexyScore = predictions.find((p) => p.className === "Sexy")?.probability || 0;

            const isInappropriate =
              pornScore > 0.4 || hentaiScore > 0.4 || (pornScore + hentaiScore) > 0.45 || sexyScore > 0.75;

            if (isInappropriate) {
              this.onInappropriateDetected?.(predictions);
            }
          }
        } catch (err) {
          console.debug("[NSFWScanner] Scan iteration error", err);
        }
      }, 2000);
    });
  }

  /**
   * Capture a single still frame as Base64 JPEG for user-initiated reports
   */
  public captureSnapshot(videoElement: HTMLVideoElement): string | undefined {
    if (!videoElement || videoElement.videoWidth === 0) return undefined;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(videoElement.videoWidth, 640);
      canvas.height = Math.min(videoElement.videoHeight, 480);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.warn("[NSFWScanner] Failed to capture report snapshot", err);
      return undefined;
    }
  }

  /**
   * Stop scanning
   */
  public stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

export const nsfwScanner = new NSFWScanner();
