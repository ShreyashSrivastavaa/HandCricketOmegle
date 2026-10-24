import React from "react";
import Link from "next/link";
import { ArrowLeft, Play, Bot, Home, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "404 - Clean Bowled! Page Not Found | HandCricketOmegle",
  description: "The cricket pitch or room you requested does not exist or has already wrapped up.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink text-chalk flex flex-col justify-between selection:bg-turf selection:text-ink">
      {/* Navigation Header */}
      <header className="w-full px-2 pt-2">
        <Navbar />
      </header>

      {/* 404 Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-lg mx-auto w-full my-6">
        <div className="w-full bg-surface border border-line rounded-[20px] p-6 sm:p-8 flex flex-col items-center gap-5 shadow-2xl relative overflow-hidden">
          {/* Decorative Glowing Accent */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-turf/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Stumps / Wicket Graphic */}
          <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-turf/30 flex items-center justify-center text-4xl shadow-inner relative">
            <span className="relative z-10">🏏</span>
            <span className="absolute -bottom-1 -right-1 text-xl">💥</span>
          </div>

          {/* 404 Header & Tagline */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-ball/15 border border-ball/30 text-ball text-xs font-heading font-black tracking-wider uppercase mx-auto">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>404 • CLEAN BOWLED!</span>
            </div>

            <h1 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tight text-chalk">
              PITCH NOT FOUND
            </h1>

            <p className="text-xs sm:text-sm text-muted max-w-xs leading-relaxed mx-auto">
              You stepped outside the crease! The page, match room, or URL you are looking for has been dismissed or doesn&apos;t exist.
            </p>
          </div>

          {/* Interactive Navigation Actions */}
          <div className="w-full flex flex-col gap-2.5 pt-2">
            <Link
              href="/"
              className="w-full py-3.5 px-5 rounded-full bg-turf text-ink font-heading font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_12px_30px_-18px_rgba(247,181,0,0.5)] hover:bg-turf-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Enter 1v1 Arena</span>
            </Link>

            <Link
              href="/play/bot"
              className="w-full py-3 px-5 rounded-full bg-surface-2 border border-line text-chalk font-heading font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-2/80 hover:border-turf/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
            >
              <Bot className="w-4 h-4 text-sky" />
              <span>Practice vs Server Bot</span>
            </Link>

            <Link
              href="/"
              className="w-full py-2 text-xs text-muted hover:text-chalk uppercase font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Homepage</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Branded Footer */}
      <Footer />
    </div>
  );
}
