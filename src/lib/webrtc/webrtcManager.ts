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
  private detachAbly: (() => void) | null = null;

  // State callbacks
  public onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onOpponentCameraToggle?: (enabled: boolean) => void;
  public onOpponentMicToggle?: (enabled: boolean) => void;
  public onOpponentGestureToggle?: (enabled: boolean) => void;
  public onMediaError?: (err: Error) => void;

  public isCameraEnabled: boolean = true;
  public isMicEnabled: boolean = true; // Players hear each other by default; the mic button mutes
  public isSelfHidden: boolean = false;
  public isGestureModeEnabled: boolean = true;
  public isOpponentGestureModeEnabled: boolean = true;
  // Last camera state the partner announced; kept here so screens that remount don't lose it
  public isOpponentCameraEnabled: boolean = false;
  public isOpponentMicEnabled: boolean = false;
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
  public async initLocalMedia(
    videoDeviceId?: string,
    audioDeviceId?: string,
    facingMode: "user" | "environment" = this.facingMode
  ): Promise<MediaStream> {
    this.facingMode = facingMode;
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
          facingMode: videoDeviceId ? undefined : facingMode,
        }
      : {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          facingMode: videoDeviceId ? undefined : facingMode,
        };

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
    };

    // Stop existing stream if any
    this.stopLocalStream();

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });
      } catch (err: any) {
        // A missing/blocked mic shouldn't cost the camera, and a missing/blocked camera
        // shouldn't cost the voice: fall back to whichever device still works
        const cameraOnly = await navigator.mediaDevices
          .getUserMedia({ video: videoConstraints, audio: false })
          .catch(() => null);
        const fallback =
          cameraOnly ||
          (await navigator.mediaDevices
            .getUserMedia({ video: false, audio: audioConstraints })
            .catch(() => null));
        if (!fallback) throw err;
        stream = fallback;
      }

      this.localStream = stream;

      // Apply the current camera / mic toggles to the fresh tracks
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = this.isMicEnabled;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = this.isCameraEnabled; // true
      }

      // Prefetch ephemeral ICE credentials asynchronously
      this.getOrFetchIceServers().catch(() => {});

      // Camera turned on after the peer link was set up: swap the fresh tracks in
      await this.attachLocalTracksToPeer();

      return stream;
    } catch (err: any) {
      this.onMediaError?.(err);
      throw err;
    }
  }


  /**
   * Start 1-to-1 peer connection session
   */
  public async startPeerSession(socket: Socket | SignalingChannel | any, isInitiator: boolean): Promise<void> {
    if (this.pc) this.closePeer();
    this.socket = socket;
    this.isInitiator = isInitiator;
    this.pendingCandidates = [];
    this.isOpponentCameraEnabled = false;
    this.isOpponentMicEnabled = false;

    this.setConnectionState("connecting");

    const iceServers = await this.getOrFetchIceServers();

    const configuration: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 2,
    };

    this.pc = new RTCPeerConnection(configuration);
    this.remoteStream = new MediaStream();

    // Add local tracks to peer connection. Without a camera yet, only the initiator opens
    // empty send slots: an answerer's addTransceiver() slots are never matched to the offer's
    // m-lines, so the answerer instead upgrades the offered slots to sendrecv in rtc:offer.
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    } else if (isInitiator) {
      this.pc.addTransceiver("video", { direction: "sendrecv" });
      this.pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      // Hand out a fresh MediaStream each time: Safari won't render tracks added to a
      // stream that's already attached to a <video>
      const tracks = new Map<string, MediaStreamTrack>();
      for (const t of this.remoteStream?.getTracks() || []) tracks.set(t.id, t);
      const incoming = event.streams?.[0]?.getTracks() || [event.track];
      for (const t of incoming) tracks.set(t.id, t);
      this.remoteStream = new MediaStream(Array.from(tracks.values()));
      this.onRemoteStream?.(this.remoteStream);
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
        this.requestIceRestart();
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

    // Signal ready and share camera / gesture state
    this.socket?.emit("rtc:ready");
    this.emitMediaState();
  }

  /** True when we are actually sending a live, unmuted mic track. */
  private hasLiveAudio(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    return !!track && track.readyState === "live" && this.isMicEnabled;
  }

  /** True when we are actually sending a live, enabled video track. */
  private hasLiveVideo(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    return !!track && track.readyState === "live" && this.isCameraEnabled;
  }

  private emitMediaState() {
    this.socket?.emit("rtc:camera_toggle", { enabled: this.hasLiveVideo() });
    this.socket?.emit("rtc:mic_toggle", { enabled: this.hasLiveAudio() });
    this.socket?.emit("rtc:gesture_toggle", { enabled: this.isGestureModeEnabled });
  }

  private async sendOffer(iceRestart = false) {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart,
      });
      await this.pc.setLocalDescription(offer);
      this.socket?.emit("rtc:offer", { sdp: this.pc.localDescription });
    } catch (err) {
      console.error("[WebRTC] Error creating offer", err);
      this.setConnectionState("failed");
    }
  }

  /** Recover a dropped link: the initiator re-offers with fresh ICE, the other side asks it to. */
  private requestIceRestart() {
    if (this.isInitiator) {
      this.sendOffer(true);
    } else {
      this.socket?.emit("rtc:restart");
    }
  }

  private attachSocketListeners() {
    if (!this.socket) return;

    this.socket.on("rtc:restart", () => {
      if (this.isInitiator) this.sendOffer(true);
    });

    this.socket.on("rtc:renegotiate", () => {
      if (this.isInitiator) this.sendOffer();
    });

    this.socket.on("rtc:ready", async () => {
      // The partner may have joined after our own rtc:ready went out, so always re-share media state
      this.emitMediaState();

      if (!this.isInitiator) {
        // Answer the partner's ready so a late-joining initiator still learns we're here
        if (this.pc && !this.pc.remoteDescription) {
          this.socket?.emit("rtc:ready");
        }
        return;
      }

      if (this.pc && !this.pc.localDescription) {
        await this.sendOffer();
      }
    });

    this.socket.on("rtc:offer", async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.pc || !payload.sdp) return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Make sure our answer sends media back on every offered slot, with the camera if we have it
        for (const transceiver of this.pc.getTransceivers()) {
          if (transceiver.direction === "recvonly" || transceiver.direction === "inactive") {
            transceiver.direction = "sendrecv";
          }
        }
        await this.attachLocalTracksToPeer(false);

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
      this.isOpponentCameraEnabled = !!payload.enabled;
      this.onOpponentCameraToggle?.(!!payload.enabled);
    });

    this.socket.on("rtc:mic_toggle", (payload: { enabled: boolean }) => {
      this.isOpponentMicEnabled = !!payload.enabled;
      this.onOpponentMicToggle?.(!!payload.enabled);
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
  public toggleCamera(enabled?: boolean): boolean {
    const newState = enabled !== undefined ? enabled : !this.isCameraEnabled;
    this.isCameraEnabled = newState;

    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = newState;
      }
    }

    this.socket?.emit("rtc:camera_toggle", { enabled: this.hasLiveVideo() });
    return newState;
  }

  /**
   * Re-acquire camera/mic after the local stream was stopped (e.g. a rematch) and
   * swap the fresh tracks into the existing peer connection without renegotiating.
   */
  /**
   * Make sure the mic is flowing to the opponent even when the camera isn't used (tap mode).
   * Keeps an existing stream; otherwise opens a mic-only stream.
   */
  public async ensureAudio(): Promise<void> {
    if (this.localStream?.getAudioTracks().some((t) => t.readyState === "live")) return;
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    const audioTrack = audioStream.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = this.isMicEnabled;
    if (this.localStream) {
      this.localStream.addTrack(audioTrack);
    } else {
      this.localStream = audioStream;
    }
    await this.attachLocalTracksToPeer();
  }

  /** Turn the camera hardware off but keep the mic talking (e.g. switching to tap mode). */
  public async stopCamera(): Promise<void> {
    if (!this.localStream) return;
    for (const track of this.localStream.getVideoTracks()) {
      track.stop();
      this.localStream.removeTrack(track);
    }
    const videoTransceiver = this.pc?.getTransceivers().find((t) => t.receiver.track?.kind === "video");
    await videoTransceiver?.sender.replaceTrack(null).catch(() => {});
    if (this.localStream.getTracks().length === 0) this.localStream = null;
    this.socket?.emit("rtc:camera_toggle", { enabled: false });
  }

  public async restoreLocalMedia(): Promise<MediaStream> {
    return this.initLocalMedia();
  }

  private async attachLocalTracksToPeer(allowRenegotiate = true) {
    if (!this.pc || !this.localStream) return;
    let needsRenegotiation = false;
    for (const transceiver of this.pc.getTransceivers()) {
      const kind = transceiver.receiver.track?.kind;
      const replacement = kind ? this.localStream.getTracks().find((t) => t.kind === kind) : undefined;
      if (!replacement) continue;
      if (transceiver.sender.track !== replacement) {
        await transceiver.sender.replaceTrack(replacement).catch(() => {});
      }
      if (transceiver.direction === "recvonly" || transceiver.direction === "inactive") {
        transceiver.direction = "sendrecv";
        needsRenegotiation = true;
      }
    }
    if (needsRenegotiation && allowRenegotiate) {
      // Direction changes only take effect after a new offer/answer round
      if (this.isInitiator) this.sendOffer();
      else this.socket?.emit("rtc:renegotiate");
    }
    this.emitMediaState();
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

          // Replace track in the active peer connection's video slot
          if (this.pc) {
            const videoTransceiver = this.pc
              .getTransceivers()
              .find((t) => t.receiver.track?.kind === "video");
            if (videoTransceiver) {
              await videoTransceiver.sender.replaceTrack(newVideoTrack);
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

    this.socket?.emit("rtc:mic_toggle", { enabled: this.hasLiveAudio() });
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
    if (this.pc) this.closePeer();
    // Make sure we're attached before the handshake so the partner's first replies aren't missed
    try {
      await ablyChannel.attach?.();
    } catch {}
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
    this.detachAbly = () => {
      try {
        ablyChannel.unsubscribe(handleAblyMessage);
      } catch {}
    };

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
      // Let the partner show "camera off" instead of a frozen frame
      this.socket?.emit("rtc:camera_toggle", { enabled: false });
    }
  }

  /**
   * Tear down the entire WebRTC connection and release all media tracks (< 1s).
   * Mandatory on "Next Opponent", leaving match, or leaving lobby.
   */
  public cleanup() {
    // Stop local tracks immediately, then tear down the peer link
    this.stopLocalStream();
    this.closePeer();
    this.setConnectionState("closed");
  }

  /** Close the peer connection and signaling while keeping the local camera stream. */
  private closePeer() {
    if (this.remoteStream) {
      for (const track of this.remoteStream.getTracks()) {
        track.stop();
      }
      this.remoteStream = null;
    }

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    if (this.socket) {
      this.socket.off?.("rtc:ready");
      this.socket.off?.("rtc:offer");
      this.socket.off?.("rtc:answer");
      this.socket.off?.("rtc:ice");
      this.socket.off?.("rtc:camera_toggle");
      this.socket.off?.("rtc:mic_toggle");
      this.socket.off?.("rtc:gesture_toggle");
      this.socket.off?.("rtc:restart");
      this.socket.off?.("rtc:renegotiate");
      this.socket = null;
    }
    this.detachAbly?.();
    this.detachAbly = null;

    this.pendingCandidates = [];
  }

}

export const webrtcManager = new WebRTCManager();

/**
 * Attach and play a remote stream. Some browsers (Safari, iOS, Chrome without a recent tap)
 * block autoplay with sound, so fall back to muted playback and unmute on the next tap.
 */
export function playRemoteVideo(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!video || !stream) return;
  if (video.srcObject !== stream) video.srcObject = stream;
  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
    const unmute = () => {
      video.muted = false;
      video.play().catch(() => {});
    };
    document.addEventListener("pointerdown", unmute, { once: true });
  });
}
