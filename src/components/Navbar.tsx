"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Users,
  Menu,
  X,
  Bot,
  Camera,
  ShieldCheck,
  Shield,
  FileText,
  Play,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { isSoundMuted, toggleSoundMute, playClickSound } from "@/lib/client/audio";
import { subscribeToLobbyPresence } from "@/lib/client/ablyClient";
import { Hand } from "@/components/Hand";

interface NavbarProps {
  guestName?: string;
  onOpenRules?: () => void;
  onTestCamera?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ guestName, onOpenRules, onTestCamera }) => {
  const pathname = usePathname();
  const [muted, setMuted] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMuted(isSoundMuted());
    const unsubscribe = subscribeToLobbyPresence((count) => {
      setOnlineCount(count);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleToggleMute = () => {
    playClickSound();
    const next = toggleSoundMute();
    setMuted(next);
  };

  const handleRulesClick = () => {
    playClickSound();
    setIsMobileMenuOpen(false);
    if (onOpenRules) onOpenRules();
  };

  const navLinks = [
    { label: "Find Match", href: "/#play", icon: Play },
    { label: "VS Bot", href: "/play/bot", icon: Bot },
    { label: "Guidelines", href: "/guidelines", icon: ShieldCheck },
    { label: "Privacy", href: "/privacy", icon: Shield },
    { label: "Terms", href: "/terms", icon: FileText },
  ];

  const desktopLink =
    "relative py-2 font-heading text-sm font-semibold text-slate-300 transition-colors hover:text-white";
  const activeLink = "text-turf after:absolute after:inset-x-0 after:-bottom-[26px] after:h-0.5 after:rounded-full after:bg-turf";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050b16]/90 backdrop-blur-xl">
      <div className="container-max">
        <nav className="flex h-[72px] items-center justify-between gap-3" role="navigation" aria-label="Main Navigation">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="group flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf sm:gap-3"
            aria-label="HandCricketOmegle Home"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-turf text-ink shadow-[0_10px_28px_-10px_rgba(247,181,0,0.7)] transition-transform group-hover:-rotate-6 group-hover:scale-105 sm:h-11 sm:w-11">
              <Hand value={6} size={24} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050b16] bg-sky" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-heading text-xl font-black leading-none tracking-[-0.04em] text-white sm:text-2xl">
                Hand <span className="text-turf">Cricket</span>
              </span>
              <span className="mt-1 hidden font-heading text-[8px] font-bold uppercase tracking-[0.24em] text-slate-400 sm:block">
                1v1 Stranger Arena
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 xl:flex">
            <Link href="/" className={`${desktopLink} ${pathname === "/" ? activeLink : ""}`}>
              Home
            </Link>
            {onOpenRules && (
              <button type="button" onClick={handleRulesClick} className={desktopLink}>
                How to Play
              </button>
            )}
            {onTestCamera && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onTestCamera();
                }}
                className={desktopLink}
              >
                Camera Umpire
              </button>
            )}
            <Link href="/#features" className={desktopLink}>
              Features
            </Link>
            <Link
              href="/play/bot"
              className={`${desktopLink} ${pathname === "/play/bot" ? activeLink : ""}`}
            >
              Practice
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-white/90 sm:flex"
              title="Live online players"
              aria-label={`${onlineCount} players online right now`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky" />
              </span>
              <span className="font-heading font-black tabular-nums text-sky">{onlineCount}</span>
              <span className="hidden text-[9px] uppercase tracking-[0.14em] text-slate-400 md:inline">online</span>
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={muted ? "Unmute game audio" : "Mute game audio"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                muted
                  ? "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                  : "border-turf/30 bg-turf/10 text-turf hover:bg-turf/20"
              }`}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {onOpenRules && (
              <button
                type="button"
                onClick={handleRulesClick}
                aria-label="View Hand Cricket rules"
                title="How to play rules"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-turf/40 hover:text-white sm:flex"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            )}

            {guestName && (
              <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-white/90 md:flex">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-turf/15 text-[9px] font-black text-turf">
                  {guestName.slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-[90px] truncate">{guestName}</span>
              </div>
            )}

            <Link
              href="/#play"
              className="hidden items-center gap-1.5 rounded-full bg-turf px-4 py-2.5 font-heading text-sm font-bold text-ink shadow-[0_10px_28px_-12px_rgba(247,181,0,0.65)] transition-colors hover:bg-turf-hover sm:flex"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors hover:border-turf/40 hover:text-turf"
            >
              {isMobileMenuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div
            id="mobile-nav-drawer"
            ref={menuRef}
            className="animate-fade-up border-t border-white/10 bg-[#071021]/98 px-3 pb-4 pt-3 backdrop-blur-xl sm:px-4"
          >
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                      isActive
                        ? "border-turf/30 bg-turf/10 text-turf"
                        : "border-white/10 bg-white/[0.03] text-white hover:border-turf/30 hover:bg-white/[0.06] hover:text-turf"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 font-heading">
                      <Icon className="h-4 w-4 shrink-0 text-turf" />
                      <span>{item.label}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {onOpenRules && (
                <button
                  type="button"
                  onClick={handleRulesClick}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left font-heading text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-turf/30 hover:bg-white/[0.06] hover:text-turf"
                >
                  <HelpCircle className="h-4 w-4 text-turf" />
                  <span>How To Play</span>
                </button>
              )}
              <Link
                href="/#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left font-heading text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-turf/30 hover:bg-white/[0.06] hover:text-turf"
              >
                <Play className="h-4 w-4 text-turf" />
                <span>Features</span>
              </Link>
              {onTestCamera && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsMobileMenuOpen(false);
                    onTestCamera();
                  }}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left font-heading text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-turf/30 hover:bg-white/[0.06] hover:text-turf sm:col-span-2"
                >
                  <Camera className="h-4 w-4 text-turf" />
                  <span>Test Camera Umpire</span>
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-sky" />
                <span className="font-heading font-bold uppercase tracking-wider">{onlineCount} online</span>
              </span>
              <span className="truncate">Playing as {guestName || "Anonymous guest"}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
