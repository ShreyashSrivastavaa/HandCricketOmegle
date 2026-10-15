import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, HeartHandshake, EyeOff, Flag, Ban } from "lucide-react";

export const metadata = {
  title: "Community Guidelines | HandCricketOmegle",
  description: "Community Standards and Fair Play Rules for HandCricketOmegle.",
};

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-ink text-chalk py-12 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk px-3 py-1.5 rounded-full border border-line bg-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena</span>
        </Link>
        <span className="text-xs text-turf font-heading font-bold uppercase tracking-wider">
          Safety Standards
        </span>
      </div>

      <div className="bg-surface border border-line rounded-[16px] p-6 sm:p-10 flex flex-col gap-8">
        <div className="border-b border-line pb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-turf" />
            <h1 className="font-heading font-black text-2xl sm:text-4xl uppercase tracking-tight">
              Community Guidelines
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Our mission is a fun, respectful, and safe real-time cricket arena for players worldwide.
          </p>
        </div>

        {/* Rule 1: Respect */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
            <HeartHandshake className="w-5 h-5" />
            1. Respect Every Player
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            Treat opponents with courtesy. Hand Cricket is a friendly duel of wits. Use the allowed 6-emoji reactions (`🏏`, `🔥`, `😮`, `😂`, `👏`, `💔`) in a sporting spirit.
          </p>
        </section>

        {/* Rule 2: Camera Standards */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            2. Camera &amp; Gesture Integrity
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            When camera gesture mode is active, keep your camera pointed at your hand or upper torso. Ensure sufficient lighting. Obscene gestures, explicit clothing, or provocative displays will trigger an immediate ban.
          </p>
        </section>

        {/* Rule 3: Reporting & Blocking */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-amber uppercase flex items-center gap-2">
            <Flag className="w-5 h-5" />
            3. Reporting &amp; Safety Controls
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            If you encounter inappropriate behavior or a bad actor:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-2 pl-2">
            <li><strong>Tap &ldquo;Blur Opponent&rdquo;</strong>: Instantly conceals their video feed.</li>
            <li><strong>Tap &ldquo;Report&rdquo;</strong>: Logs an authoritative abuse report to the moderation queue.</li>
            <li><strong>Tap &ldquo;Block&rdquo;</strong>: Prevents you from ever matching with this guest again.</li>
            <li><strong>Tap &ldquo;Skip / Next&rdquo;</strong>: Immediately forfeits the match and pairs you with a new stranger.</li>
          </ul>
        </section>

        {/* Rule 4: Automated Moderation & Bans */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-ball uppercase flex items-center gap-2">
            <Ban className="w-5 h-5" />
            4. Auto-Ban Escalation
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            Multiple reports received across a short rolling window automatically trigger matchmaking cooldowns (24 hours to permanent IP-hash lockout). Rapid skip spamming and connection flood attacks will result in rate-limit throttling.
          </p>
        </section>

        {/* Footer Nav */}
        <div className="border-t border-line pt-6 flex flex-wrap gap-4 text-xs text-muted">
          <Link href="/terms" className="text-turf hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="text-turf hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
