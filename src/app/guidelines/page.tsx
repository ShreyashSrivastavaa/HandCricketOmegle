import React from "react";
import Link from "next/link";
import { HeartHandshake, EyeOff, ShieldCheck, Flag, Ban } from "lucide-react";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata = {
  title: "Community Guidelines & Fair Play | HandCricketOmegle",
  description: "Community Standards, Camera Etiquette, and Fair Play Rules for HandCricketOmegle.",
};

export default function GuidelinesPage() {
  return (
    <LegalShell
      eyebrow="Safety Standards"
      title="Community Guidelines"
      description="Our mission is a fun, respectful, and safe real-time cricket arena for players worldwide."
      icon={<ShieldCheck className="h-5 w-5" />}
    >
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <HeartHandshake className="h-5 w-5" />
          1. Respect Every Player
        </h2>
        <p className="leading-relaxed text-chalk/90">
          Treat opponents with courtesy. Hand Cricket is a friendly duel of wits. Use the allowed
          6-emoji reactions (`🏏`, `🔥`, `😮`, `😂`, `👏`, `💔`) in a sporting spirit.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <EyeOff className="h-5 w-5" />
          2. Camera &amp; Video Etiquette (Strict 18+)
        </h2>
        <p className="leading-relaxed text-chalk/90">
          When video calling is enabled in stranger matches, you must be at least 18 years old. Keep
          your camera pointed at your hand and face. Obscene gestures, explicit attire, nudity, or
          offensive behavior will trigger an immediate permanent ban.
        </p>
        <p className="leading-relaxed text-muted">
          <strong>Zero Video Storage:</strong> Your video stream is strictly peer-to-peer (P2P
          encrypted via WebRTC). Video feeds are processed entirely on your local device for gesture
          recognition and are <em>never recorded or stored</em> on any server.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <ShieldCheck className="h-5 w-5" />
          3. Hand Gesture Integrity &amp; Fallbacks
        </h2>
        <p className="leading-relaxed text-chalk/90">When using camera gesture recognition:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-muted">
          <li><strong>1 to 5 Fingers:</strong> Hold up 1, 2, 3, 4, or 5 extended fingers.</li>
          <li><strong>6 Runs:</strong> Show a thumbs-up (closed fist with only the thumb extended).</li>
          <li><strong>Stability:</strong> Hold your gesture steady for ~300ms during the countdown to lock in.</li>
          <li><strong>Tap Fallback:</strong> If lighting is poor or hand detection fails for 3s, tap the 1–6 number buttons at any time.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <HeartHandshake className="h-5 w-5" />
          4. Endless Mode &amp; Anti-Stalling Policy
        </h2>
        <p className="leading-relaxed text-chalk/90">
          Endless matches have no over limits and can last dozens of balls. To keep gameplay fair:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-muted">
          <li><strong>Tactical Pause:</strong> Players may use tactical pauses during long sessions, but mutual consent or resumption keeps the duel flowing.</li>
          <li><strong>10-Second Turn Clock:</strong> If a player stalls or fails to submit within the 10-second window, the authoritative server executes an auto-pick or issues a forfeit on extended disconnection.</li>
          <li><strong>One-Ball Super Over:</strong> In 1v1 Endless mode, equal totals trigger a sudden-death one-ball super-over decider.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-amber sm:text-xl">
          <Flag className="h-5 w-5" />
          5. Reporting &amp; Safety Controls
        </h2>
        <p className="leading-relaxed text-chalk/90">
          If you encounter inappropriate behavior or a bad actor:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted">
          <li><strong>Tap &ldquo;Blur Opponent&rdquo;</strong>: Instantly conceals their video feed.</li>
          <li><strong>Tap &ldquo;Report&rdquo;</strong>: Logs an authoritative abuse report to the moderation queue.</li>
          <li><strong>Tap &ldquo;Block&rdquo;</strong>: Prevents you from ever matching with this guest again.</li>
          <li><strong>Tap &ldquo;Skip / Next&rdquo;</strong>: Immediately forfeits the match and pairs you with a new stranger.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-ball sm:text-xl">
          <Ban className="h-5 w-5" />
          6. Auto-Ban Escalation
        </h2>
        <p className="leading-relaxed text-chalk/90">
          Multiple reports received across a short rolling window automatically trigger matchmaking
          cooldowns (24 hours to permanent IP-hash lockout). Rapid skip spamming and connection flood
          attacks will result in rate-limit throttling.
        </p>
      </section>

      <div className="flex flex-wrap gap-4 border-t border-line pt-5 text-xs text-muted">
        <Link href="/terms" className="text-turf hover:underline">
          Terms of Service
        </Link>
        <span>•</span>
        <Link href="/privacy" className="text-turf hover:underline">
          Privacy Policy
        </Link>
      </div>
    </LegalShell>
  );
}
