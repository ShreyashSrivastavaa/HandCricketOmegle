import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms of Service (Strict 18+) | HandCricketOmegle",
  description: "Terms of Service, Zero Tolerance Policy, and User Agreement for HandCricketOmegle.",
};

export default function TermsPage() {
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
            Legal &amp; User Agreement
          </span>
        </div>

        <div className="bg-surface border border-line rounded-[16px] p-5 sm:p-10 flex flex-col gap-8 shadow-xl">
          <div className="border-b border-line pb-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6 text-turf shrink-0" />
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
            <ul className="list-disc list-inside text-xs sm:text-sm text-muted flex flex-col gap-2 pl-2 leading-relaxed">
              <li>Any form of nudity, sexual activity, or sexually suggestive conduct on camera.</li>
              <li>Harassment, threats, hate speech, slurs, or intimidation of any participant.</li>
              <li>Display of illegal weapons, drugs, or hazardous substances.</li>
              <li>Broadcasting copyrighted broadcasts, unauthorized commercial advertising, or scam links.</li>
              <li>Attempting to capture, record, or rebroadcast peer video feeds without explicit consent.</li>
            </ul>
          </section>

          {/* Section 3: Privacy, Camera & On-Device Gesture Vision */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              3. Camera, WebRTC &amp; On-Device Gesture Recognition
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              Video streams in HandCricketOmegle travel directly peer-to-peer (P2P) between browsers via WebRTC (encrypted via DTLS/SRTP). <strong>We never record, intercept, or store your camera or microphone video streams on any server.</strong>
            </p>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              Hand gesture detection is executed 100% on-device using WebAssembly/WebGL (MediaPipe Hands). No camera frames or biometric images are ever transmitted to our servers or third parties. Only the locked pick value (an integer between 1 and 6) is transmitted via encrypted serverless signaling to resolve match deliveries authoritatively.
            </p>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              Players must provide camera consent prior to entering video-enabled matchmaking. You retain complete control to mute audio, toggle camera off, blur video, or switch to manual tap mode at any time.
            </p>
          </section>

          {/* Section 4: Game Modes & Match Integrity */}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-turf uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              4. Game Modes &amp; Server-Authoritative Integrity
            </h2>
            <p className="text-xs sm:text-sm text-chalk/90 leading-relaxed">
              All deliveries across Sudden Death, Classic, and Endless modes are resolved by our authoritative game engine. Secret picks are locked before reveal. Stalling or leaving during active play will forfeit the match. In Endless mode, tactical pauses are permitted, but persistent inactivity beyond the turn clock will trigger automatic moves or forfeit resolution.
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

      <Footer />
    </div>
  );
}
