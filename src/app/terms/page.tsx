import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | HandCricketOmegle",
  description: "Terms of Service and User Agreement for HandCricketOmegle.",
};

export default function TermsPage() {
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
          Legal &amp; User Agreement
        </span>
      </div>

      <div className="bg-surface border border-line rounded-[16px] p-6 sm:p-10 flex flex-col gap-8">
        <div className="border-b border-line pb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-6 h-6 text-turf" />
            <h1 className="font-heading font-black text-2xl sm:text-4xl uppercase tracking-tight">
              Terms of Service
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Last Updated: October 2026 • Effective Immediately
          </p>
        </div>

        {/* Section 1: Age Gate */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
            <Shield className="w-5 h-5" />
            1. Age Requirements (Strict 18+ for Stranger Mode)
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            HandCricketOmegle provides peer-to-peer interactive multiplayer gameplay, including video-enabled matchmaking with strangers. By entering Stranger Mode, you represent, warrant, and certify that you are at least <strong>18 years of age</strong> (or the age of legal majority in your jurisdiction). If you are under 18, you are strictly prohibited from entering random stranger video matchmaking.
          </p>
        </section>

        {/* Section 2: Zero Tolerance */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-ball uppercase flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            2. Prohibited Conduct &amp; Zero Tolerance Policy
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            HandCricketOmegle enforces a strict <strong>Zero Tolerance</strong> policy for any of the following behavior:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-2 pl-2">
            <li>Any form of nudity, sexual activity, or sexually suggestive conduct on camera.</li>
            <li>Harassment, bullying, hate speech, threats, intimidation, or discriminatory language.</li>
            <li>Display of illicit substances, self-harm, weapons, violence, or illegal acts.</li>
            <li>Attempting to bypass security controls, automated spamming, queue flooding, or packet injection.</li>
            <li>Recording, screenshotting, broadcasting, or publishing video of another user without explicit prior consent.</li>
          </ul>
          <p className="text-xs text-muted italic">
            Violations result in immediate match termination, permanent account and IP-hash bans, and reporting to relevant legal authorities when applicable.
          </p>
        </section>

        {/* Section 3: Privacy & Camera */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            3. Camera &amp; Peer-to-Peer Streaming
          </h2>
          <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
            Video streams in HandCricketOmegle travel directly peer-to-peer (P2P) between browsers via WebRTC (encrypted via DTLS/SRTP). <strong>We never record, intercept, or store your camera or microphone video streams on any server.</strong> You retain complete control to blur your video or mute your microphone at any time during a match.
          </p>
        </section>

        {/* Section 4: Limitation of Liability */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-chalk uppercase">
            4. Disclaimer &amp; Limitation of Liability
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            The service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. HandCricketOmegle disclaims all warranties of any kind. You interact with strangers at your own risk. We provide instant reporting, blocking, and blurring tools to safeguard your experience.
          </p>
        </section>

        {/* Footer Nav */}
        <div className="border-t border-line pt-6 flex flex-wrap gap-4 text-xs text-muted">
          <Link href="/guidelines" className="text-turf hover:underline">
            Community Guidelines
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
