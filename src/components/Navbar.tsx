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
  ShieldCheck,
  Shield,
  FileText,
  Play,
  Sun,
  Moon,
} from "lucide-react";
import { isSoundMuted, toggleSoundMute, playClickSound } from "@/lib/client/audio";
import { subscribeToLobbyPresence } from "@/lib/client/ablyClient";

interface NavbarProps {
  guestName?: string;
  onOpenRules?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ guestName, onOpenRules }) => {
  const pathname = usePathname();
  const [muted, setMuted] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hca_theme") as "dark" | "light" | null;
      const initial = saved || "dark";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const handleToggleTheme = () => {
    playClickSound();
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("hca_theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
  };

  useEffect(() => {
    setMuted(isSoundMuted());
    const unsubscribe = subscribeToLobbyPresence((count) => {
      setOnlineCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Keyboard accessibility: Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
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
    if (onOpenRules) {
      onOpenRules();
    }
  };

  const navLinks = [
    { label: "Find Match", href: "/", icon: Play },
    { label: "VS Bot", href: "/play/bot", icon: Bot },
    { label: "Guidelines", href: "/guidelines", icon: ShieldCheck },
    { label: "Privacy", href: "/privacy", icon: Shield },
    { label: "Terms", href: "/terms", icon: FileText },
  ];

  return (
    <nav
      className="w-full max-w-4xl mx-auto border-b-2 border-pure-black bg-dusk-violet relative z-40 select-none"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="flex items-center justify-between py-3.5 px-3 sm:px-5">
        {/* Brand Wordmark */}
        <Link
          href="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2.5 rounded-[100px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow group"
          aria-label="HandCricketOmegle Home"
        >
          <span className="w-9 h-9 rounded-[100px] bg-hi-vis-yellow border-2 border-pure-black flex items-center justify-center text-lg group-hover:scale-105 transition-transform text-pure-black">
            🏏
          </span>
          <div className="flex flex-col">
            <span className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-hi-vis-yellow leading-none">
              HAND CRICKET <span className="text-bone-white">CONFESSIONAL</span>
            </span>
            <span className="text-[10px] font-mono text-buttery-yellow uppercase tracking-wider font-semibold">
              1v1 Stranger Matchmaking
            </span>
          </div>
        </Link>

        {/* Desktop Quick Links */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono uppercase tracking-wider text-bone-white font-bold">
          <Link
            href="/play/bot"
            className={`hover:text-hi-vis-yellow transition-colors ${pathname === "/play/bot" ? "text-hi-vis-yellow underline decoration-2 underline-offset-4" : ""}`}
          >
            Practice Bot
          </Link>
          <Link
            href="/guidelines"
            className={`hover:text-hi-vis-yellow transition-colors ${pathname === "/guidelines" ? "text-hi-vis-yellow underline decoration-2 underline-offset-4" : ""}`}
          >
            Guidelines
          </Link>
          <Link
            href="/privacy"
            className={`hover:text-hi-vis-yellow transition-colors ${pathname === "/privacy" ? "text-hi-vis-yellow underline decoration-2 underline-offset-4" : ""}`}
          >
            Privacy
          </Link>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Online Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-[100px] bg-bone-white border-2 border-pure-black text-xs font-mono font-bold text-pure-black"
            title="Live online players"
            aria-label={`${onlineCount} players online right now`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-firecracker-red border border-pure-black animate-pulse" aria-hidden="true" />
            <Users className="w-3.5 h-3.5 text-pure-black hidden sm:inline" aria-hidden="true" />
            <span className="font-tabular font-black">{onlineCount}</span>
            <span className="text-[10px] uppercase hidden sm:inline">LIVE</span>
          </div>

          {/* Light / Cartoon Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-[100px] border-2 border-pure-black bg-bone-white text-pure-black hover:bg-hi-vis-yellow transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow active:scale-95"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-pure-black" /> : <Moon className="w-4 h-4 text-pure-black" />}
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? "Unmute game audio" : "Mute game audio"}
            className={`p-2 rounded-[100px] border-2 border-pure-black transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow active:scale-95 ${
              muted
                ? "bg-bone-white text-pure-black/50 hover:bg-bone-white/80"
                : "bg-hi-vis-yellow text-pure-black hover:bg-buttery-yellow"
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4 stroke-[2.5]" /> : <Volume2 className="w-4 h-4 stroke-[2.5]" />}
          </button>

          {/* How to Play Rules Button (Desktop/Tablet) */}
          {onOpenRules && (
            <button
              type="button"
              onClick={handleRulesClick}
              aria-label="View Hand Cricket rules"
              title="How to play rules"
              className="p-2 rounded-[100px] bg-bone-white border-2 border-pure-black text-pure-black hover:bg-hi-vis-yellow transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow active:scale-95"
            >
              <HelpCircle className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Guest Name pill */}
          {guestName && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-[100px] bg-bone-white border-2 border-pure-black text-xs font-mono font-bold text-pure-black">
              <span>👤</span>
              <span className="truncate max-w-[100px]">{guestName}</span>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            className="p-2 rounded-[6px] bg-bone-white border-2 border-pure-black text-pure-black hover:bg-hi-vis-yellow transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow flex items-center justify-center lg:hidden"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          ref={menuRef}
          className="border-t-2 border-pure-black bg-bone-white text-ink-black px-4 py-4 rounded-b-[6px] flex flex-col gap-2.5 animate-in fade-in duration-150"
        >
          <div className="text-[11px] font-mono uppercase tracking-widest text-pure-black font-bold px-1">
            Menu Navigation
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-sm font-heading uppercase tracking-wider font-bold transition-all border-2 border-pure-black ${
                    isActive
                      ? "bg-hi-vis-yellow text-pure-black"
                      : "bg-bone-white text-ink-black hover:bg-buttery-yellow"
                  }`}
                >
                  <Icon className="w-4 h-4 text-pure-black shrink-0 stroke-[2.5]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {onOpenRules && (
            <button
              type="button"
              onClick={handleRulesClick}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-sm font-heading uppercase tracking-wider font-bold text-ink-black bg-bone-white hover:bg-matcha-cream border-2 border-pure-black transition-all text-left"
            >
              <HelpCircle className="w-4 h-4 text-pure-black shrink-0 stroke-[2.5]" />
              <span>How To Play (Rules &amp; Gestures)</span>
            </button>
          )}

          {guestName && (
            <div className="mt-2 pt-2 border-t-2 border-pure-black flex items-center justify-between text-xs font-mono text-pure-black px-1">
              <span>Playing as:</span>
              <span className="font-bold truncate max-w-[160px]">👤 {guestName}</span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
