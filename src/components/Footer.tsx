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
} from "lucide-react";

interface FooterProps {
  onOpenRules?: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenRules, className = "" }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`w-full border-t border-line/70 bg-surface/50 backdrop-blur-sm text-chalk select-none mt-auto ${className}`}
      role="contentinfo"
      aria-label="Site Footer"
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-8">
        {/* Top Section: Brand + Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Brand Column */}
          <div className="flex flex-col gap-2.5 sm:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 group w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf rounded-lg"
              aria-label="HandCricketOmegle Home"
            >
              <span className="w-7 h-7 rounded-lg bg-turf/20 border border-turf/40 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                🏏
              </span>
              <span className="font-heading font-black text-lg uppercase tracking-wider text-chalk">
                HAND CRICKET <span className="text-turf">OMEGLE</span>
              </span>
            </Link>

            <p className="text-xs text-muted leading-relaxed max-w-xs">
              Live peer-to-peer 1v1 Hand Cricket duel arena. Instant reveals, coin tosses, and serverless matchmaking without accounts or downloads.
            </p>

            <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-turf">
              <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
              <span>Peer-to-Peer Encrypted • Zero Video Storage</span>
            </div>
          </div>

          {/* Quick Arena Links */}
          <div className="flex flex-col gap-2.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-chalk">
              Play &amp; Practice
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-muted">
              <li>
                <Link
                  href="/"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <Play className="w-3.5 h-3.5 text-turf" />
                  <span>Find Stranger Duel</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/play/bot"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <Bot className="w-3.5 h-3.5 text-sky" />
                  <span>Practice vs Server Bot</span>
                </Link>
              </li>
              {onOpenRules ? (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRules}
                    className="hover:text-turf transition-colors flex items-center gap-1.5 text-left focus-visible:outline-none focus-visible:underline"
                  >
                    <span className="text-amber">📖</span>
                    <span>Game Rules &amp; Gestures</span>
                  </button>
                </li>
              ) : (
                <li>
                  <Link
                    href="/#rules"
                    className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                  >
                    <span className="text-amber">📖</span>
                    <span>Rules &amp; Hand Gestures</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Safety & Legal Column */}
          <div className="flex flex-col gap-2.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-chalk">
              Safety &amp; Policies
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-muted">
              <li>
                <Link
                  href="/guidelines"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-turf" />
                  <span>Community Guidelines</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <Shield className="w-3.5 h-3.5 text-sky" />
                  <span>Privacy &amp; Data Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <FileText className="w-3.5 h-3.5 text-amber" />
                  <span>Terms of Service (18+)</span>
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@handcricketomegle.com"
                  className="hover:text-turf transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
                >
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  <span>support@handcricketomegle.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="border-t border-line/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p className="text-center sm:text-left">
            © {currentYear} <strong>HandCricketOmegle</strong>. Built for real-time WebRTC play.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/privacy" className="hover:text-chalk transition-colors">
              No Video Stored
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-chalk transition-colors">
              Strict 18+
            </Link>
            <span>•</span>
            <Link href="/guidelines" className="hover:text-chalk transition-colors">
              Fair Play
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
