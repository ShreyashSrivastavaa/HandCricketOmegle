import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, HeartHandshake, EyeOff, Flag, Ban } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Community Guidelines & Fair Play | HandCricketOmegle",
  description: "Community Standards, Camera Etiquette, and Fair Play Rules for HandCricketOmegle.",
};

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-ink text-chalk flex flex-col justify-between selection:bg-turf selection:text-ink">
      <main className="py-8 sm:py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk px-3 py-1.5 rounded-full border border-line bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Arena</span>
          </Link>
          <span className="text-xs text-turf font-heading font-bold uppercase tracking-wider">
            Safety Standards
          </span>
        </div>

        <div className="bg-surface border border-line rounded-[16px] p-5 sm:p-10 flex flex-col gap-8 shadow-xl">
          <div className="border-b border-line pb-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-6 h-6 text-turf shrink-0" />
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

          {/* Rule 2: Camera Standards & Video Etiquette */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              2. Camera &amp; Video Etiquette (Strict 18+)
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              When video calling is enabled in stranger matches, you must be at least 18 years old. Keep your camera pointed at your hand and face. Obscene gestures, explicit attire, nudity, or offensive behavior will trigger an immediate permanent ban.
            </p>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              <strong>Zero Video Storage:</strong> Your video stream is strictly peer-to-peer (P2P encrypted via WebRTC). Video feeds are processed entirely on your local device for gesture recognition and are <em>never recorded or stored</em> on any server.
            </p>
          </section>

          {/* Rule 3: Gesture Fair Play */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              3. Hand Gesture Integrity &amp; Fallbacks
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              When using camera gesture recognition:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-1.5 pl-2 leading-relaxed">
              <li><strong>1 to 5 Fingers:</strong> Hold up 1, 2, 3, 4, or 5 extended fingers.</li>
              <li><strong>6 Runs:</strong> Show a thumbs-up (closed fist with only the thumb extended).</li>
              <li><strong>Stability:</strong> Hold your gesture steady for ~300ms during the countdown to lock in.</li>
              <li><strong>Tap Fallback:</strong> If lighting is poor or hand detection fails for 3s, tap the 1–6 number buttons at any time.</li>
            </ul>
          </section>

          {/* Rule 4: Endless Mode & Anti-Stalling */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
              <HeartHandshake className="w-5 h-5" />
              4. Endless Mode &amp; Anti-Stalling Policy
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              Endless matches have no over limits and can last dozens of balls. To keep gameplay fair:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-1.5 pl-2 leading-relaxed">
              <li><strong>Tactical Pause:</strong> Players may use tactical pauses during long sessions, but mutual consent or resumption keeps the duel flowing.</li>
              <li><strong>10-Second Turn Clock:</strong> If a player stalls or fails to submit within the 10-second window, the authoritative server executes an auto-pick or issues a forfeit on extended disconnection.</li>
              <li><strong>One-Ball Super Over:</strong> In 1v1 Endless mode, equal totals trigger a sudden-death one-ball super-over decider.</li>
            </ul>
          </section>

          {/* Rule 5: Reporting & Blocking */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-amber uppercase flex items-center gap-2">
              <Flag className="w-5 h-5" />
              5. Reporting &amp; Safety Controls
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              If you encounter inappropriate behavior or a bad actor:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-2 pl-2 leading-relaxed">
              <li><strong>Tap &ldquo;Blur Opponent&rdquo;</strong>: Instantly conceals their video feed.</li>
              <li><strong>Tap &ldquo;Report&rdquo;</strong>: Logs an authoritative abuse report to the moderation queue.</li>
              <li><strong>Tap &ldquo;Block&rdquo;</strong>: Prevents you from ever matching with this guest again.</li>
              <li><strong>Tap &ldquo;Skip / Next&rdquo;</strong>: Immediately forfeits the match and pairs you with a new stranger.</li>
            </ul>
          </section>

          {/* Rule 6: Automated Moderation & Bans */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-ball uppercase flex items-center gap-2">
              <Ban className="w-5 h-5" />
              6. Auto-Ban Escalation
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

      <Footer />
    </div>
  );
}
