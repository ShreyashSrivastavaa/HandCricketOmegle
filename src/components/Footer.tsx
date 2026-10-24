import React from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  FileText,
  Mail,
  Bot,
  Play,
  Heart,
  Lock,
  Users,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Hand } from "@/components/Hand";

interface FooterProps {
  onOpenRules?: () => void;
  className?: string;
  variant?: "full" | "minimal";
}

export const Footer: React.FC<FooterProps> = ({
  onOpenRules,
  className = "",
  variant = "full",
}) => {
  const currentYear = new Date().getFullYear();

  const linkClass =
    "group flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-turf focus-visible:outline-none focus-visible:underline";

  if (variant === "minimal") {
    return (
      <footer
        className={`relative mt-auto w-full border-t border-line/70 select-none ${className}`}
        role="contentinfo"
        aria-label="Site Footer"
      >
        <div className="container-max flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="group flex w-fit items-center gap-2.5 focus-visible:outline-none focus-visible:underline"
            aria-label="HandCricketOmegle Home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-turf text-ink">
              <Hand value={6} size={18} />
            </span>
            <span className="font-heading text-base font-black leading-none tracking-[-0.03em] text-chalk">
              Hand Cricket <span className="text-turf">Omegle</span>
            </span>
          </Link>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 font-heading text-[9px] font-bold uppercase tracking-[0.14em] text-muted"
          >
            <Link href="/#play" className="transition-colors hover:text-turf">
              Play
            </Link>
            {onOpenRules && (
              <button
                type="button"
                onClick={onOpenRules}
                className="transition-colors hover:text-turf"
              >
                Rules
              </button>
            )}
            <Link href="/guidelines" className="transition-colors hover:text-turf">
              Guidelines
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-turf">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-turf">
              Terms
            </Link>
          </nav>

          <p className="text-[10px] text-muted/80">© {currentYear} HandCricketOmegle</p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`relative mt-auto w-full overflow-hidden border-t border-line/70 bg-surface/30 select-none ${className}`}
      role="contentinfo"
      aria-label="Site Footer"
    >
      <div className="pitch-grid absolute inset-0 opacity-25" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-0 h-40 w-[600px] max-w-full -translate-x-1/2 rounded-full bg-turf/[0.06] blur-[80px]"
        aria-hidden="true"
      />

      <div className="container-max relative z-10 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="group flex w-fit items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
              aria-label="HandCricketOmegle Home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-turf/30 bg-gradient-to-br from-turf/20 to-sky/10 text-turf shadow-glow transition-transform group-hover:scale-105">
                <Hand value={6} size={22} />
              </span>
              <span className="font-heading text-lg font-black uppercase tracking-[0.04em] text-chalk">
                HAND CRICKET <span className="text-turf">OMEGLE</span>
              </span>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-muted">
              Live peer-to-peer 1v1 hand cricket. Throw your hand at the camera, outsmart a
              stranger, and let the arena umpire every ball. No accounts. No downloads.
            </p>

            <div className="mt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-turf/25 bg-turf/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-turf">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-turf opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-turf" />
                </span>
                Servers live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                <Lock className="h-2.5 w-2.5 text-turf" />
                Zero video storage
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-chalk">
              Play &amp; practice
            </h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/#play" className={linkClass}>
                  <Play className="h-3.5 w-3.5 text-turf" />
                  <span>Find Stranger Duel</span>
                </Link>
              </li>
              <li>
                <Link href="/play/bot" className={linkClass}>
                  <Bot className="h-3.5 w-3.5 text-sky" />
                  <span>Practice vs Server Bot</span>
                </Link>
              </li>
              {onOpenRules ? (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRules}
                    className={`${linkClass} text-left`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber" />
                    <span>Game Rules &amp; Gestures</span>
                  </button>
                </li>
              ) : (
                <li>
                  <Link href="/#how-it-works" className={linkClass}>
                    <Sparkles className="h-3.5 w-3.5 text-amber" />
                    <span>Game Rules &amp; Gestures</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-chalk">
              Safety &amp; policies
            </h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/guidelines" className={linkClass}>
                  <ShieldCheck className="h-3.5 w-3.5 text-turf" />
                  <span>Community Guidelines</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  <Shield className="h-3.5 w-3.5 text-sky" />
                  <span>Privacy &amp; Data Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  <FileText className="h-3.5 w-3.5 text-amber" />
                  <span>Terms of Service (18+)</span>
                </Link>
              </li>
              <li>
                <a href="mailto:support@handcricketomegle.com" className={linkClass}>
                  <Mail className="h-3.5 w-3.5 text-muted" />
                  <span>support@handcricketomegle.com</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-chalk">
              The fine print
            </h3>
            <div className="flex flex-col gap-2 rounded-2xl border border-line/70 bg-surface-2/30 p-3">
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-turf" />
                <span>WebRTC peer-to-peer video</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <Lock className="h-3.5 w-3.5 shrink-0 text-sky" />
                <span>On-device hand tracking</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <Users className="h-3.5 w-3.5 shrink-0 text-amber" />
                <span>Strict 18+ stranger mode</span>
              </div>
            </div>
            <Link
              href="/guidelines"
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-turf transition-colors hover:text-turf-hover"
            >
              Read fair play rules
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line/60 pt-5 text-[10px] text-muted sm:flex-row">
          <p className="text-center sm:text-left">
            © {currentYear} <strong className="text-chalk">HandCricketOmegle</strong>. Built for the
            love of the game.
          </p>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-chalk">
              No Video Stored
            </Link>
            <span className="h-1 w-1 rotate-45 bg-line" />
            <Link href="/terms" className="transition-colors hover:text-chalk">
              Strict 18+
            </Link>
            <span className="h-1 w-1 rotate-45 bg-line" />
            <Link href="/guidelines" className="transition-colors hover:text-chalk">
              Fair Play
            </Link>
            <Heart className="h-3 w-3 fill-ball text-ball" />
          </div>
        </div>
      </div>
    </footer>
  );
};
