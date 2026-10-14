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

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isInitiator: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  // State callbacks
  public onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onOpponentCameraToggle?: (enabled: boolean) => void;
  public onOpponentMicToggle?: (enabled: boolean) => void;

  public isCameraEnabled: boolean = true;
  public isMicEnabled: boolean = false; // Muted by default per rules
  public isSelfHidden: boolean = false;

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

  private setConnectionState(state: WebRTCConnectionState) {
    this.connectionState = state;
    this.onConnectionStateChange?.(state);
  }

  /**
   * Parse ICE Servers from environment or default to Google STUN
   */
  private getIceServers(): RTCIceServer[] {
    if (typeof window !== "undefined") {
      const customIce = (window as any).__ICE_SERVERS__ || process.env.NEXT_PUBLIC_ICE_SERVERS;
      if (customIce) {
        try {
          return typeof customIce === "string" ? JSON.parse(customIce) : customIce;
        } catch (e) {
          console.warn("[WebRTC] Failed to parse custom ICE_SERVERS", e);
        }
      }
    }
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }

  /**
   * Request camera & mic permission and initialize local preview
   */
  public async initLocalMedia(
    videoDeviceId?: string,
    audioDeviceId?: string
  ): Promise<MediaStream> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("MediaDevices API not supported in this environment");
    }

    // Determine if mobile device to cap resolution & framerate (cap 480p / 15fps)
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || (typeof window !== "undefined" && window.innerWidth <= 768);

    const videoConstraints: MediaTrackConstraints = isMobile
      ? {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 15 },
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          facingMode: "user",
        }
      : {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
        };

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
    };

    // Stop existing stream if any
    this.stopLocalStream();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints,
    });

    this.localStream = stream;

    // Enforce default state: Camera on, Mic MUTED
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = this.isMicEnabled; // false by default
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = this.isCameraEnabled; // true
    }

    return stream;
  }

  /**
   * Start 1-to-1 peer connection session
   */
  public startPeerSession(socket: Socket, isInitiator: boolean) {
    this.socket = socket;
    this.isInitiator = isInitiator;
    this.pendingCandidates = [];

    this.setConnectionState("connecting");

    const configuration: RTCConfiguration = {
      iceServers: this.getIceServers(),
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

    // Signal ready
    this.socket.emit("rtc:ready");
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
  }

  /**
   * Toggle camera stream on/off
   */
  public toggleCamera(enabled?: boolean): boolean {
    const newState = enabled !== undefined ? enabled : !this.isCameraEnabled;
    this.isCameraEnabled = newState;

    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = newState;
      }
    }

    this.socket?.emit("rtc:camera_toggle", { enabled: newState });
    return newState;
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
      this.socket.off("rtc:ready");
      this.socket.off("rtc:offer");
      this.socket.off("rtc:answer");
      this.socket.off("rtc:ice");
      this.socket.off("rtc:camera_toggle");
      this.socket.off("rtc:mic_toggle");
      this.socket = null;
    }

    this.pendingCandidates = [];
    this.setConnectionState("closed");
  }
}

export const webrtcManager = new WebRTCManager();
