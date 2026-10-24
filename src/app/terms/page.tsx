import React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Shield } from "lucide-react";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata = {
  title: "Terms of Service (Strict 18+) | HandCricketOmegle",
  description: "Terms of Service, Zero Tolerance Policy, and User Agreement for HandCricketOmegle.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal & User Agreement"
      title="Terms of Service"
      description="Last updated October 2026 · Effective immediately. Please read before entering the arena."
      icon={<FileText className="h-5 w-5" />}
    >
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <Shield className="h-5 w-5" />
          1. Age Requirements (Strict 18+ for Stranger Mode)
        </h2>
        <p className="leading-relaxed text-chalk/90">
          HandCricketOmegle provides peer-to-peer interactive multiplayer gameplay, including
          video-enabled matchmaking with strangers. By entering Stranger Mode, you represent, warrant,
          and certify that you are at least <strong>18 years of age</strong> (or the age of legal
          majority in your jurisdiction). If you are under 18, you are strictly prohibited from
          entering random stranger video matchmaking.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-ball sm:text-xl">
          <AlertTriangle className="h-5 w-5" />
          2. Prohibited Conduct &amp; Zero Tolerance Policy
        </h2>
        <p className="leading-relaxed text-chalk/90">
          HandCricketOmegle enforces a strict <strong>Zero Tolerance</strong> policy for any of the
          following behavior:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted">
          <li>Any form of nudity, sexual activity, or sexually suggestive conduct on camera.</li>
          <li>Harassment, threats, hate speech, slurs, or intimidation of any participant.</li>
          <li>Display of illegal weapons, drugs, or hazardous substances.</li>
          <li>Broadcasting copyrighted broadcasts, unauthorized commercial advertising, or scam links.</li>
          <li>Attempting to capture, record, or rebroadcast peer video feeds without explicit consent.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <CheckCircle2 className="h-5 w-5" />
          3. Camera, WebRTC &amp; On-Device Gesture Recognition
        </h2>
        <p className="leading-relaxed text-chalk/90">
          Video streams in HandCricketOmegle travel directly peer-to-peer (P2P) between browsers via
          WebRTC (encrypted via DTLS/SRTP).{" "}
          <strong>
            We never record, intercept, or store your camera or microphone video streams on any
            server.
          </strong>
        </p>
        <p className="leading-relaxed text-chalk/90">
          Hand gesture detection is executed 100% on-device using WebAssembly/WebGL (MediaPipe
          Hands). No camera frames or biometric images are ever transmitted to our servers or third
          parties. Only the locked pick value (an integer between 1 and 6) is transmitted via
          encrypted serverless signaling to resolve match deliveries authoritatively.
        </p>
        <p className="leading-relaxed text-chalk/90">
          Players must provide camera consent prior to entering video-enabled matchmaking. You retain
          complete control to mute audio, toggle camera off, blur video, or switch to manual tap mode
          at any time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-turf sm:text-xl">
          <CheckCircle2 className="h-5 w-5" />
          4. Game Modes &amp; Server-Authoritative Integrity
        </h2>
        <p className="leading-relaxed text-chalk/90">
          All deliveries across Sudden Death, Classic, and Endless modes are resolved by our
          authoritative game engine. Secret picks are locked before reveal. Stalling or leaving during
          active play will forfeit the match. In Endless mode, tactical pauses are permitted, but
          persistent inactivity beyond the turn clock will trigger automatic moves or forfeit
          resolution.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold uppercase text-chalk sm:text-xl">
          5. Disclaimer &amp; Limitation of Liability
        </h2>
        <p className="leading-relaxed text-muted">
          The service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis.
          HandCricketOmegle disclaims all warranties of any kind. You interact with strangers at your
          own risk. We provide instant reporting, blocking, and blurring tools to safeguard your
          experience.
        </p>
      </section>

      <div className="flex flex-wrap gap-4 border-t border-line pt-5 text-xs text-muted">
        <Link href="/guidelines" className="text-turf hover:underline">
          Community Guidelines
        </Link>
        <span>•</span>
        <Link href="/privacy" className="text-turf hover:underline">
          Privacy Policy
        </Link>
      </div>
    </LegalShell>
  );
}
