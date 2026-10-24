import type { Socket } from "socket.io-client";

export type WebRTCConnectionState =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "failed"
  | "closed";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface SignalingChannel {
  emit: (event: string, data?: any) => void | Promise<void>;
  on: (event: string, callback: (data: any) => void) => void;
  off?: (event: string, callback?: (data: any) => void) => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private socket: (Socket | SignalingChannel) | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isInitiator: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private acquiringPromise: Promise<MediaStream> | null = null;

  // State callbacks
  public onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onOpponentCameraToggle?: (enabled: boolean) => void;
  public onOpponentMicToggle?: (enabled: boolean) => void;
  public onOpponentGestureToggle?: (enabled: boolean) => void;
  public onMediaError?: (err: Error) => void;

  public isCameraEnabled: boolean = true;
  public isMicEnabled: boolean = false; // Muted by default per rules
  public isSelfHidden: boolean = false;
  public isGestureModeEnabled: boolean = true;
  public isOpponentGestureModeEnabled: boolean = true;
  public facingMode: "user" | "environment" = "user";

  private connectionState: WebRTCConnectionState = "idle";

  constructor() {}

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getState(): WebRTCConnectionState {
    return this.connectionState;
  }

  /**
   * Diagnostic helper reporting camera support and permission state (Phase 5)
   */
  public async getCameraDiagnostics(): Promise<{
    isApiSupported: boolean;
    isSecureContext: boolean;
    permissionState: "prompt" | "granted" | "denied" | "unsupported";
    hasLocalStream: boolean;
    videoTrackCount: number;
    videoTrackLabel?: string;
  }> {
    const isApiSupported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    const isSecureContext =
      typeof window !== "undefined"
        ? !!window.isSecureContext ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        : false;

    let permissionState: "prompt" | "granted" | "denied" | "unsupported" = "unsupported";
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: "camera" as any });
        permissionState = status.state as any;
      } catch {
        permissionState = "unsupported";
      }
    }

    const hasLocalStream = !!this.localStream;
    const videoTracks = this.localStream ? this.localStream.getVideoTracks() : [];

    return {
      isApiSupported,
      isSecureContext,
      permissionState,
      hasLocalStream,
      videoTrackCount: videoTracks.length,
      videoTrackLabel: videoTracks[0]?.label,
    };
  }

  private setConnectionState(state: WebRTCConnectionState) {
    this.connectionState = state;
    this.onConnectionStateChange?.(state);
  }

  private cachedIceServers: RTCIceServer[] | null = null;
  private iceServersExpiresAt = 0;

  /**
   * Fetch ephemeral short-lived ICE / TURN credentials from serverless route POST /api/ice.
   * Eliminates client-side credential exposure (SEC-01).
   */
  public async getOrFetchIceServers(): Promise<RTCIceServer[]> {
    const now = Date.now();
    if (this.cachedIceServers && now < this.iceServersExpiresAt) {
      return this.cachedIceServers;
    }

    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/ice", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
            const servers = data.iceServers as RTCIceServer[];
            this.cachedIceServers = servers;
            this.iceServersExpiresAt = data.expiresAt
              ? data.expiresAt - 5 * 60 * 1000
              : now + 15 * 60 * 1000;
            return servers;
          }
        }
      } catch (err) {
        console.warn("[WebRTC] Failed to fetch ephemeral ICE servers from /api/ice, using fallback STUN:", err);
      }
    }

    const fallback: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];
    this.cachedIceServers = fallback;
    this.iceServersExpiresAt = now + 5 * 60 * 1000;
    return fallback;
  }

  /**
   * Request camera & mic permission and initialize local preview
   */
  /**
   * Request camera permission and initialize local preview.
   * Only requests camera (audio: false) per requirements.
   * Supports device fallback on OverconstrainedError.
   * Guards against duplicate concurrent prompts.
   */
  public async initLocalMedia(
    videoDeviceId?: string,
    facingMode: "user" | "environment" = this.facingMode,
    fallbackToDefault: boolean = true
  ): Promise<MediaStream> {
    // 1. Return active live stream if already running
    if (this.localStream) {
      const activeVideoTrack = this.localStream.getVideoTracks().find((t) => t.readyState === "live");
      if (activeVideoTrack) {
        return this.localStream;
      }
      this.stopLocalStream();
    }

    // 2. Prevent duplicate concurrent requests (Strict Mode / re-renders)
    if (this.acquiringPromise) {
      return this.acquiringPromise;
    }

    this.acquiringPromise = (async () => {
      // 3. Verify secure context
      if (typeof window !== "undefined") {
        const isLocalhost =
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (!window.isSecureContext && !isLocalhost) {
          const secErr = new Error("Camera access requires a secure context (HTTPS).");
          secErr.name = "SecurityError";
          this.onMediaError?.(secErr);
          throw secErr;
        }
      }

      // 4. Verify browser support
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        const notSuppErr = new Error(
          "Camera API (navigator.mediaDevices.getUserMedia) is not supported by your browser."
        );
        notSuppErr.name = "NotSupportedError";
        this.onMediaError?.(notSuppErr);
        throw notSuppErr;
      }

      this.facingMode = facingMode;

      // 5. Constraints: Initial constraint uses video only, audio: false
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || (typeof window !== "undefined" && window.innerWidth <= 768);

      const videoConstraints: MediaTrackConstraints = videoDeviceId
        ? { deviceId: { exact: videoDeviceId } }
        : isMobile
        ? {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 15, max: 15 },
            facingMode,
          }
        : {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode,
          };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        this.localStream = stream;
        this.isCameraEnabled = true;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
        }

        // Prefetch ephemeral ICE credentials asynchronously
        this.getOrFetchIceServers().catch(() => {});

        return stream;
      } catch (err: any) {
        // Fall back to simpler video: true on OverconstrainedError
        if (
          fallbackToDefault &&
          (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")
        ) {
          console.warn("[WebRTC] OverconstrainedError, falling back to video: true", err);
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            this.localStream = fallbackStream;
            this.isCameraEnabled = true;
            return fallbackStream;
          } catch (fallbackErr: any) {
            console.error("[WebRTC] Fallback getUserMedia also failed:", fallbackErr.name, fallbackErr.message);
            this.onMediaError?.(fallbackErr);
            throw fallbackErr;
          }
        }

        console.error("[WebRTC] Camera access failed:", err.name, err.message);
        this.onMediaError?.(err);
        throw err;
      } finally {
        this.acquiringPromise = null;
      }
    })();

    return this.acquiringPromise;
  }


  /**
   * Start 1-to-1 peer connection session
   */
  public async startPeerSession(socket: Socket | SignalingChannel | any, isInitiator: boolean): Promise<void> {
    this.socket = socket;
    this.isInitiator = isInitiator;
    this.pendingCandidates = [];

    this.setConnectionState("connecting");

    // Ensure local stream is initialized if camera is enabled in browser
    if (
      !this.localStream &&
      this.isCameraEnabled &&
      typeof window !== "undefined" &&
      typeof navigator?.mediaDevices?.getUserMedia === "function"
    ) {
      try {
        await this.initLocalMedia();
      } catch (err) {
        console.warn("[WebRTC] startPeerSession auto-init media failed:", err);
      }
    }

    const iceServers = await this.getOrFetchIceServers();

    const configuration: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 2,
    };

    this.pc = new RTCPeerConnection(configuration);
    this.remoteStream = new MediaStream();

    // Add local tracks to peer connection
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        for (const track of event.streams[0].getTracks()) {
          this.remoteStream?.addTrack(track);
        }
      } else {
        this.remoteStream?.addTrack(event.track);
      }
      this.onRemoteStream?.(this.remoteStream!);
      this.setConnectionState("live");
    };

    // ICE Candidate generation
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("rtc:ice", { candidate: event.candidate });
      }
    };

    // Connection state changes
    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        this.setConnectionState("live");
      } else if (state === "disconnected") {
        this.setConnectionState("reconnecting");
      } else if (state === "failed") {
        this.setConnectionState("failed");
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      if (state === "connected") {
        this.setConnectionState("live");
      } else if (state === "connecting") {
        this.setConnectionState("connecting");
      } else if (state === "disconnected") {
        this.setConnectionState("reconnecting");
      } else if (state === "failed") {
        this.setConnectionState("failed");
      }
    };

    // Setup socket signal listeners
    this.attachSocketListeners();

    // Signal ready and share gesture toggle setting
    this.socket?.emit("rtc:ready");
    this.socket?.emit("rtc:gesture_toggle", { enabled: this.isGestureModeEnabled });
  }

  private attachSocketListeners() {
    if (!this.socket) return;

    this.socket.on("rtc:ready", async () => {
      if (this.isInitiator && this.pc) {
        try {
          const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await this.pc.setLocalDescription(offer);
          this.socket?.emit("rtc:offer", { sdp: this.pc.localDescription });
        } catch (err) {
          console.error("[WebRTC] Error creating offer", err);
          this.setConnectionState("failed");
        }
      }
    });

    this.socket.on("rtc:offer", async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.pc || !payload.sdp) return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Process any queued candidates
        while (this.pendingCandidates.length > 0) {
          const cand = this.pendingCandidates.shift();
          if (cand) await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.socket?.emit("rtc:answer", { sdp: this.pc.localDescription });
      } catch (err) {
        console.error("[WebRTC] Error handling offer", err);
        this.setConnectionState("failed");
      }
    });

    this.socket.on("rtc:answer", async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.pc || !payload.sdp) return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        while (this.pendingCandidates.length > 0) {
          const cand = this.pendingCandidates.shift();
          if (cand) await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      } catch (err) {
        console.error("[WebRTC] Error handling answer", err);
      }
    });

    this.socket.on("rtc:ice", async (payload: { candidate: RTCIceCandidateInit }) => {
      if (!this.pc || !payload.candidate) return;
      try {
        if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          this.pendingCandidates.push(payload.candidate);
        }
      } catch (err) {
        console.error("[WebRTC] Error adding ICE candidate", err);
      }
    });

    this.socket.on("rtc:camera_toggle", (payload: { enabled: boolean }) => {
      this.onOpponentCameraToggle?.(payload.enabled);
    });

    this.socket.on("rtc:mic_toggle", (payload: { enabled: boolean }) => {
      this.onOpponentMicToggle?.(payload.enabled);
    });

    this.socket.on("rtc:gesture_toggle", (payload: { enabled: boolean }) => {
      this.isOpponentGestureModeEnabled = payload.enabled;
      this.onOpponentGestureToggle?.(payload.enabled);
    });
  }

  /**
   * Toggle gesture detection mode on/off
   */
  public toggleGestureMode(enabled?: boolean): boolean {
    const newState = enabled !== undefined ? enabled : !this.isGestureModeEnabled;
    this.isGestureModeEnabled = newState;
    this.socket?.emit("rtc:gesture_toggle", { enabled: newState });
    return newState;
  }

  /**
   * Toggle camera stream on/off
   */
  public async toggleCamera(enabled?: boolean): Promise<boolean> {
    const newState = enabled !== undefined ? enabled : !this.isCameraEnabled;
    this.isCameraEnabled = newState;

    if (
      newState &&
      !this.localStream &&
      typeof window !== "undefined" &&
      typeof navigator?.mediaDevices?.getUserMedia === "function"
    ) {
      try {
        await this.initLocalMedia();
      } catch (err) {
        console.warn("[WebRTC] toggleCamera auto-init media failed:", err);
        this.isCameraEnabled = false;
        return false;
      }
    } else if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = newState;
      }
    }

    this.socket?.emit("rtc:camera_toggle", { enabled: newState });
    return this.isCameraEnabled;
  }

  /**
   * Flip between front ('user') and back ('environment') camera on mobile devices
   */
  public async flipCamera(): Promise<"user" | "environment"> {
    this.facingMode = this.facingMode === "user" ? "environment" : "user";
    if (this.localStream && typeof navigator !== "undefined" && navigator.mediaDevices) {
      try {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode },
          audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          this.localStream.addTrack(newVideoTrack);

          // Replace track in active RTCPeerConnection sender
          if (this.pc) {
            const senders = this.pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === "video" || s.track === null);
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }
        }
      } catch (err) {
        console.warn("[WebRTC] flipCamera failed, falling back to previous facingMode", err);
      }
    }
    return this.facingMode;
  }

  /**
   * Toggle mic on/off (starts muted)
   */
  public toggleMic(enabled?: boolean): boolean {
    const newState = enabled !== undefined ? enabled : !this.isMicEnabled;
    this.isMicEnabled = newState;

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = newState;
      }
    }

    this.socket?.emit("rtc:mic_toggle", { enabled: newState });
    return newState;
  }

  /**
   * Toggle self-video hidden (local preview visibility)
   */
  public toggleHideSelf(hidden?: boolean): boolean {
    this.isSelfHidden = hidden !== undefined ? hidden : !this.isSelfHidden;
    return this.isSelfHidden;
  }

  /**
   * Adapts an Ably realtime match channel into a SignalingChannel and starts peer session
   */
  public async startAblyPeerSession(
    ablyChannel: any,
    myGuestId: string,
    isInitiator: boolean
  ): Promise<void> {
    const listeners: Map<string, Function[]> = new Map();

    const handleAblyMessage = (msg: any) => {
      const data = msg.data;
      if (!data || data.senderId === myGuestId) return; // ignore self-messages

      const event = msg.name;
      const callbacks = listeners.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => cb(data));
      }
    };

    ablyChannel.subscribe(handleAblyMessage);

    const channelAdapter: SignalingChannel = {
      emit: (event: string, data?: any) => {
        ablyChannel.publish(event, { ...data, senderId: myGuestId });
      },
      on: (event: string, callback: (data: any) => void) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(callback);
      },
      off: (event: string) => {
        listeners.delete(event);
      },
    };

    await this.startPeerSession(channelAdapter, isInitiator);
  }

  /**
   * Stop all local stream tracks
   */
  public stopLocalStream() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
  }

  /**
   * Tear down the entire WebRTC connection and release all media tracks (< 1s).
   * Mandatory on "Next Opponent", leaving match, or leaving lobby.
   */
  public cleanup() {
    // 1. Stop local tracks immediately
    this.stopLocalStream();

    // 2. Stop remote tracks
    if (this.remoteStream) {
      for (const track of this.remoteStream.getTracks()) {
        track.stop();
      }
      this.remoteStream = null;
    }

    // 3. Close RTCPeerConnection
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    // 4. Detach socket signal listeners
    if (this.socket) {
      this.socket.off?.("rtc:ready");
      this.socket.off?.("rtc:offer");
      this.socket.off?.("rtc:answer");
      this.socket.off?.("rtc:ice");
      this.socket.off?.("rtc:camera_toggle");
      this.socket.off?.("rtc:mic_toggle");
      this.socket = null;
    }

    this.pendingCandidates = [];
    this.setConnectionState("closed");
  }
}

export const webrtcManager = new WebRTCManager();
