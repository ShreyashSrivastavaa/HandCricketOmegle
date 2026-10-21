import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, VideoOff, Database } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy & Data Policy | HandCricketOmegle",
  description:
    "HandCricketOmegle is built strictly peer-to-peer with zero video storage, no live audio recording, and salt-hashed IP protection.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink text-chalk font-sans flex flex-col justify-between selection:bg-turf selection:text-ink">
      <main className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-turf transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf rounded-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena</span>
        </Link>

        <header className="border-b border-line pb-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-turf/10 border border-turf/30 flex items-center justify-center text-turf">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading uppercase tracking-wide text-chalk">
              Privacy &amp; Data Policy
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            HandCricketOmegle is built strictly peer-to-peer with zero video storage and salt-hashed IP protection.
          </p>
        </header>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-chalk/90">
          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <VideoOff className="w-4 h-4" />
              <span>1. Zero Live Video or Audio Recording</span>
            </div>
            <p className="text-muted leading-relaxed">
              Live video and audio streams flow strictly <strong>peer-to-peer (P2P)</strong> directly between you and your opponent via encrypted WebRTC. Our servers facilitate initial signaling (handshake) only and <strong>NEVER</strong> record, intercept, or store any live video or audio streams.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <Lock className="w-4 h-4" />
              <span>2. Salt-Hashed IP Addresses</span>
            </div>
            <p className="text-muted leading-relaxed">
              To defend against malicious actors and enforce temporary community safety bans, IP addresses are processed through a salted cryptographic SHA-256 hash. Plain-text IP addresses are <strong>never stored</strong> in our databases or application logs.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <Database className="w-4 h-4" />
              <span>3. Safety Reports &amp; Abuse Prevention (No Video Stored)</span>
            </div>
            <p className="text-muted leading-relaxed">
              When a user submits an in-game report for policy violations, only structured metadata is logged: the reporter guest ID, the reported guest ID, the match ID, the chosen violation category, and a timestamp. <strong>No video streams, audio recordings, or image snapshots are ever captured or stored.</strong>
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <Shield className="w-4 h-4" />
              <span>4. Camera &amp; Microphone Permissions</span>
            </div>
            <p className="text-muted leading-relaxed">
              Camera and microphone permissions are requested solely when you enter the Match Setup screen, never upon loading the website. When you click &ldquo;Next Opponent&rdquo; or return to the lobby, all media tracks are immediately and completely terminated.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <Lock className="w-4 h-4" />
              <span>5. On-Device Finger Tracking (MediaPipe Hands)</span>
            </div>
            <p className="text-muted leading-relaxed">
              Hand landmark detection and finger counting run 100% locally on your device inside your web browser via WebAssembly. Camera video frames, hand coordinates, and visual data are <strong>never transmitted to any server</strong>. Only your final locked choice (1 to 6) is sent over the network to resolve each ball.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm sm:text-base uppercase tracking-wide">
              <Database className="w-4 h-4" />
              <span>6. 18+ Verification &amp; Leaderboards</span>
            </div>
            <p className="text-muted leading-relaxed">
              This stranger-facing platform is strictly for adults (18+). If you participate in Endless Mode, your high score, balls faced, and strike streak may be listed on the community leaderboard using your anonymous guest nickname.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
