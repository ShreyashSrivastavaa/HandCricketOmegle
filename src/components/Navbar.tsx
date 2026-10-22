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
      className="w-full max-w-4xl mx-auto border-b border-line bg-surface/85 backdrop-blur-md rounded-b-[16px] relative z-40 transition-colors"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="flex items-center justify-between py-3 px-3 sm:px-5">
        {/* Clickable Brand Logo (Pillar 2 Requirement) */}
        <Link
          href="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink group"
          aria-label="HandCricketOmegle Home"
        >
          <span className="w-8 h-8 rounded-lg bg-turf/15 border border-turf/35 flex items-center justify-center text-lg group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.18)]">
            🏏
          </span>
          <div className="flex flex-col">
            <span className="font-heading font-black text-lg sm:text-xl uppercase tracking-wider text-chalk leading-none group-hover:text-chalk/90">
              HAND CRICKET <span className="text-turf">OMEGLE</span>
            </span>
            <span className="text-[10px] text-muted tracking-widest uppercase font-semibold">
              1v1 Stranger Matchmaking
            </span>
          </div>
        </Link>

        {/* Desktop Quick Links */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-heading uppercase tracking-wider text-muted font-bold">
          <Link
            href="/play/bot"
            className={`hover:text-turf transition-colors ${pathname === "/play/bot" ? "text-turf" : ""}`}
          >
            Practice Bot
          </Link>
          <Link
            href="/guidelines"
            className={`hover:text-turf transition-colors ${pathname === "/guidelines" ? "text-turf" : ""}`}
          >
            Guidelines
          </Link>
          <Link
            href="/privacy"
            className={`hover:text-turf transition-colors ${pathname === "/privacy" ? "text-turf" : ""}`}
          >
            Privacy
          </Link>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Online Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-medium text-chalk/90"
            title="Live online players"
            aria-label={`${onlineCount} players online right now`}
          >
            <span className="w-2 h-2 rounded-full bg-turf animate-pulse" aria-hidden="true" />
            <Users className="w-3.5 h-3.5 text-muted hidden sm:inline" aria-hidden="true" />
            <span className="font-tabular font-bold text-turf">{onlineCount}</span>
            <span className="text-[10px] text-muted uppercase hidden sm:inline">Online</span>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-full border border-line bg-surface-2 text-muted hover:text-chalk hover:border-turf/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-sky" />}
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? "Unmute game audio" : "Mute game audio"}
            className={`p-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf ${
              muted
                ? "bg-surface-2 border-line text-muted hover:text-chalk"
                : "bg-turf/15 border-turf/30 text-turf hover:bg-turf/25"
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* How to Play Rules Button (Desktop/Tablet) */}
          {onOpenRules && (
            <button
              type="button"
              onClick={handleRulesClick}
              aria-label="View Hand Cricket rules"
              title="How to play rules"
              className="p-2 rounded-full bg-surface-2 border border-line text-muted hover:text-chalk hover:border-turf/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Guest Name pill */}
          {guestName && (
            <div className="hidden md:flex items-center gap-1 px-3 py-1 rounded-full bg-surface border border-line text-xs font-semibold text-chalk/90">
              <span className="text-muted">👤</span>
              <span className="truncate max-w-[100px]">{guestName}</span>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button (Pillar 1 Requirement) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            className="p-2 rounded-lg bg-surface border border-line text-chalk hover:text-turf hover:border-turf/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Responsive Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          ref={menuRef}
          className="border-t border-line/80 bg-surface/95 backdrop-blur-xl px-4 py-4 rounded-b-[16px] flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="text-[10px] font-heading uppercase tracking-widest text-muted font-bold px-2 pb-1">
            Navigation Menu
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-heading uppercase tracking-wider font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf ${
                    isActive
                      ? "bg-turf/15 text-turf border border-turf/30"
                      : "bg-surface-2/60 text-chalk hover:bg-surface-2 hover:text-turf border border-line/60"
                  }`}
                >
                  <Icon className="w-4 h-4 text-turf shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {onOpenRules && (
            <button
              type="button"
              onClick={handleRulesClick}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-heading uppercase tracking-wider font-bold text-chalk bg-surface-2/60 hover:bg-surface-2 hover:text-turf border border-line/60 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
            >
              <HelpCircle className="w-4 h-4 text-turf shrink-0" />
              <span>How To Play (Rules &amp; Gestures)</span>
            </button>
          )}

          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-heading uppercase tracking-wider font-bold text-chalk bg-surface-2/60 hover:bg-surface-2 hover:text-turf border border-line/60 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
          >
            <span className="flex items-center gap-2.5">
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-sky" />}
              <span>Theme</span>
            </span>
            <span className="text-xs font-normal text-muted capitalize">{theme} Mode</span>
          </button>

          {guestName && (
            <div className="mt-2 pt-2 border-t border-line/50 flex items-center justify-between text-xs text-muted px-2">
              <span>Playing as:</span>
              <span className="font-bold text-chalk truncate max-w-[160px]">👤 {guestName}</span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
