import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, VideoOff, Database } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink text-chalk font-sans flex flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-turf transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Arena
        </Link>

        <header className="border-b border-line pb-4 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-turf/10 border border-turf/30 flex items-center justify-center text-turf">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-chalk">
              Privacy & Data Policy
            </h1>
          </div>
          <p className="text-xs text-muted">
            Hand Cricket Arena is built strictly peer-to-peer with zero video storage and salt-hashed IP protection.
          </p>
        </header>

        <div className="space-y-4 text-xs leading-relaxed text-chalk/90">
          <section className="bg-surface border border-line rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm uppercase tracking-wide">
              <VideoOff className="w-4 h-4" />
              1. Zero Live Video or Audio Recording
            </div>
            <p className="text-muted">
              Live video and audio streams flow strictly <strong>peer-to-peer (P2P)</strong> directly between you and your opponent via encrypted WebRTC. Our servers facilitate initial signaling (handshake) only and <strong>NEVER</strong> record, intercept, or store any live video or audio streams.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm uppercase tracking-wide">
              <Lock className="w-4 h-4" />
              2. Salt-Hashed IP Addresses
            </div>
            <p className="text-muted">
              To defend against malicious actors and enforce temporary community safety bans, IP addresses are processed through a salted cryptographic SHA-256 hash. Plain-text IP addresses are <strong>never stored</strong> in our databases or application logs.
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm uppercase tracking-wide">
              <Database className="w-4 h-4" />
              3. Safety Reports &amp; Abuse Prevention (No Video Stored)
            </div>
            <p className="text-muted">
              When a user submits an in-game report for policy violations, only structured metadata is logged: the reporter guest ID, the reported guest ID, the match ID, the chosen violation category, and a timestamp. <strong>No video streams, audio recordings, or image snapshots are ever captured or stored.</strong>
            </p>
          </section>

          <section className="bg-surface border border-line rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-turf font-bold text-sm uppercase tracking-wide">
              <Shield className="w-4 h-4" />
              4. Camera &amp; Microphone Permissions
            </div>
            <p className="text-muted">
              Camera and microphone permissions are requested solely when you enter the Match Setup screen, never upon loading the website. When you click &ldquo;Next Opponent&rdquo; or return to the lobby, all media tracks are immediately and completely terminated.
            </p>
          </section>
        </div>

        <div className="border-t border-line pt-6 flex flex-wrap gap-4 text-xs text-muted">
          <Link href="/terms" className="text-turf hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/guidelines" className="text-turf hover:underline">
            Community Guidelines
          </Link>
        </div>

        <footer className="text-center pt-2 text-[11px] text-muted">
          HandCricketOmegle • Built with privacy, security, and competitive integrity.
        </footer>
      </div>
    </div>
  );
}
