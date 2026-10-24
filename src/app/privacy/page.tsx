import React from "react";
import { ArrowUpRight, Database, Lock, Shield, VideoOff } from "lucide-react";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata = {
  title: "Privacy & Data Policy | HandCricketOmegle",
  description:
    "HandCricketOmegle is built strictly peer-to-peer with zero video storage, no live audio recording, and salt-hashed IP protection.",
};

const PRIVACY_SECTIONS = [
  {
    icon: VideoOff,
    title: "1. Zero Live Video or Audio Recording",
    body: (
      <>
        Live video and audio streams flow strictly <strong>peer-to-peer (P2P)</strong> directly
        between you and your opponent via encrypted WebRTC. Our servers facilitate initial signaling
        (handshake) only and <strong>NEVER</strong> record, intercept, or store any live video or
        audio streams.
      </>
    ),
  },
  {
    icon: Lock,
    title: "2. Salt-Hashed IP Addresses",
    body: (
      <>
        To defend against malicious actors and enforce temporary community safety bans, IP addresses
        are processed through a salted cryptographic SHA-256 hash. Plain-text IP addresses are{" "}
        <strong>never stored</strong> in our databases or application logs.
      </>
    ),
  },
  {
    icon: Database,
    title: "3. Safety Reports & Abuse Prevention (No Video Stored)",
    body: (
      <>
        When a user submits an in-game report for policy violations, only structured metadata is
        logged: the reporter guest ID, the reported guest ID, the match ID, the chosen violation
        category, and a timestamp.{" "}
        <strong>
          No video streams, audio recordings, or image snapshots are ever captured or stored.
        </strong>
      </>
    ),
  },
  {
    icon: Shield,
    title: "4. Camera & Microphone Permissions",
    body: (
      <>
        Camera and microphone permissions are requested solely when you enter the Match Setup screen,
        never upon loading the website. When you click &ldquo;Next Opponent&rdquo; or return to the
        lobby, all media tracks are immediately and completely terminated.
      </>
    ),
  },
  {
    icon: Lock,
    title: "5. On-Device Finger Tracking (MediaPipe Hands)",
    body: (
      <>
        Hand landmark detection and finger counting run 100% locally on your device inside your web
        browser via WebAssembly. Camera video frames, hand coordinates, and visual data are{" "}
        <strong>never transmitted to any server</strong>. Only your final locked choice (1 to 6) is
        sent over the network to resolve each ball.
      </>
    ),
  },
  {
    icon: Database,
    title: "6. 18+ Verification & Leaderboards",
    body: (
      <>
        This stranger-facing platform is strictly for adults (18+). If you participate in Endless
        Mode, your high score, balls faced, and strike streak may be listed on the community
        leaderboard using your anonymous guest nickname.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy by design"
      title="Privacy & Data Policy"
      description="HandCricketOmegle is built strictly peer-to-peer with zero video storage and salt-hashed IP protection."
      icon={<Shield className="h-5 w-5" />}
    >
      <div className="space-y-3">
        {PRIVACY_SECTIONS.map(({ icon: Icon, title, body }) => (
          <section
            key={title}
            className="rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-turf">
              <Icon className="h-4 w-4 shrink-0" />
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide sm:text-base">
                {title}
              </h2>
            </div>
            <p className="mt-2 leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5 text-xs text-muted">
        <a
          href="mailto:privacy@handcricketomegle.com"
          className="inline-flex items-center gap-1.5 text-turf hover:underline"
        >
          privacy@handcricketomegle.com
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <span className="text-line">•</span>
        <span>Data requests answered within 30 days.</span>
      </div>
    </LegalShell>
  );
}
