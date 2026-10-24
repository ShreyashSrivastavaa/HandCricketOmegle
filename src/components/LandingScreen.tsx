import React, { useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Variants,
} from "framer-motion";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Camera,
  Check,
  ChevronDown,
  Dices,
  Edit2,
  Globe2,
  Hand as HandIcon,
  Lock,
  Play,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { generateGuestName } from "@/lib/server/session";
import { playClickSound } from "@/lib/client/audio";
import { Hand } from "@/components/Hand";
import { HeroBoysArtwork } from "@/components/landing/HeroBoysArtwork";

interface LandingScreenProps {
  onFindMatch: () => void;
  onPlayVsBot: () => void;
  onPlayWithFriend: () => void;
  onOpenRules: () => void;
  onTestCamera?: () => void;
}

const GESTURES = [
  { value: 1, fingers: "1 finger", label: "Single" },
  { value: 2, fingers: "2 fingers", label: "Double" },
  { value: 3, fingers: "3 fingers", label: "Triple" },
  { value: 4, fingers: "4 fingers", label: "Boundary" },
  { value: 5, fingers: "Open palm", label: "Five" },
  { value: 6, fingers: "Thumbs up", label: "Maximum" },
] as const;

const FORMATS = [
  { id: "sudden_death", title: "Sudden Death", detail: "1 WICKET", note: "One mistake ends it." },
  { id: "classic", title: "Classic Match", detail: "2 WKTS • 2 OVERS", note: "The full duel." },
  { id: "endless", title: "Endless", detail: "NO LIMIT", note: "Play until it is settled." },
] as const;

const FAQS = [
  {
    question: "Do I need an account?",
    answer: "No. You get a temporary identity and can play immediately.",
  },
  {
    question: "Is my video recorded?",
    answer: "No. Video is peer-to-peer and processed on your device.",
  },
  {
    question: "Can I play without a camera?",
    answer: "Yes. Tap mode and keyboard shortcuts are always available.",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onFindMatch,
  onPlayVsBot,
  onPlayWithFriend,
  onOpenRules,
  onTestCamera,
}) => {
  const { guestName, setGuestName, mode, setMode } = useLiveMatchStore();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: EASE },
    },
  };

  const stagger: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.08, delayChildren: 0.04 },
    },
  };

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(guestName);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleRandomizeName = () => {
    playClickSound();
    const newName = generateGuestName();
    const newId = `guest_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;
    setGuestName(newName);
    setNameInput(newName);
    useLiveMatchStore.setState({ guestId: newId });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hca_tab_guest_id", newId);
      sessionStorage.setItem("hca_tab_guest_name", newName);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const trimmed = nameInput.trim() || generateGuestName();
    setGuestName(trimmed.slice(0, 16));
    setIsEditing(false);
  };

  const initials = (guestName || "H C")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const startMatch = () => {
    playClickSound();
    onFindMatch();
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative w-full overflow-hidden">
        <section id="play" className="relative isolate overflow-hidden pb-10 pt-6 sm:pb-14 sm:pt-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(247,181,0,0.15),transparent_65%),radial-gradient(ellipse_40%_40%_at_90%_20%,rgba(56,189,248,0.1),transparent_62%),radial-gradient(ellipse_40%_40%_at_8%_32%,rgba(168,85,247,0.1),transparent_62%)]" />
          <div className="pitch-grid pointer-events-none absolute inset-0 -z-10 opacity-20" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#050b16] to-transparent" />
          <HeroBoysArtwork />

          <div className="container-max relative z-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div variants={fadeUp} className="mb-4 flex justify-center">
                <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/20 bg-[#0F172A] shadow-[0_12px_36px_-8px_rgba(255,95,178,0.6)] transition-all hover:scale-105 hover:shadow-[0_16px_44px_-8px_rgba(255,95,178,0.8)] sm:h-24 sm:w-24">
                  <Image
                    src="/logo.jpg"
                    alt="Hand Cricket Omegle Logo"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-turf/40 bg-turf/[0.08] px-3 py-1 font-heading text-[8px] font-bold uppercase tracking-[0.14em] text-turf shadow-[0_0_30px_-12px_rgba(247,181,0,0.55)] sm:gap-2 sm:px-4 sm:py-1.5 sm:text-[10px] sm:tracking-[0.18em] xl:text-[11px]">
                  <Zap className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
                  The Classic Game, Now Online
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="hero-title mt-4 font-heading font-black leading-[0.94] tracking-[-0.055em] text-white drop-shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
              >
                Hand <span className="text-turf">Cricket</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-3 max-w-2xl font-heading text-base font-bold tracking-[-0.02em] text-white sm:text-xl xl:text-2xl"
              >
                Same childhood fun. New way to play.
              </motion.p>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-2.5 max-w-2xl text-xs leading-6 text-slate-300 sm:text-sm sm:leading-7 xl:text-base"
              >
                Play Hand Cricket with strangers, challenge your friends, or take on our smart bot.{" "}
                <span className="font-semibold text-turf">Fast. Fun. Addictive.</span>
              </motion.p>

              <motion.div variants={fadeUp} className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                <button
                  type="button"
                  onClick={onOpenRules}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-turf"
                >
                  View rules
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" />
                {onTestCamera ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onTestCamera();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 whitespace-nowrap text-xs text-sky transition-all hover:border-turf/50 hover:bg-turf/10 hover:text-turf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
                    title="Test camera permission and hand gestures"
                  >
                    <Camera className="h-3.5 w-3.5 shrink-0 text-turf" />
                    <span>Camera-umpired. No signup.</span>
                    <span className="rounded bg-turf/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-turf">
                      Test Camera
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky" />
                    Camera-umpired. No signup.
                  </span>
                )}
              </motion.div>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="mx-auto mt-6 grid max-w-5xl gap-4 sm:mt-8 md:grid-cols-3"
            >
              <motion.button
                variants={fadeUp}
                type="button"
                onClick={startMatch}
                aria-label="FIND STRANGER MATCH"
                className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#2b6fa8]/60 bg-[linear-gradient(160deg,rgba(13,42,71,0.96),rgba(6,15,28,0.98))] p-4 text-left xl:p-5 shadow-[0_22px_70px_-40px_rgba(56,189,248,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-[#38bdf8]/80 hover:shadow-[0_28px_80px_-36px_rgba(56,189,248,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#38bdf8]/10 blur-2xl" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#38bdf8]/15 text-[#7dd3fc]">
                  <Users className="h-5 w-5" />
                </span>
                <span className="relative mt-4 block font-heading text-lg font-extrabold xl:text-xl tracking-[-0.02em] text-white">
                  Play with Stranger
                </span>
                <span className="relative mt-1.5 block text-sm leading-5 text-slate-300">
                  Get matched instantly with a random player.
                </span>
                <span className="relative mt-auto inline-flex items-center gap-2 rounded-full bg-[#38bdf8] px-4 py-2 font-heading text-sm font-bold text-[#04111f] transition-colors group-hover:bg-[#7dd3fc]">
                  Play Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>

              <motion.button
                variants={fadeUp}
                type="button"
                onClick={() => {
                  playClickSound();
                  onPlayWithFriend();
                }}
                aria-label="Play with Friend"
                className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#2f7d4f]/60 bg-[linear-gradient(160deg,rgba(9,44,29,0.96),rgba(5,20,14,0.98))] p-4 text-left xl:p-5 shadow-[0_22px_70px_-40px_rgba(74,222,128,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-[#4ade80]/80 hover:shadow-[0_28px_80px_-36px_rgba(74,222,128,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              >
                <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#4ade80]/10 blur-2xl" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4ade80]/15 text-[#86efac]">
                  <UserRound className="h-5 w-5" />
                </span>
                <span className="relative mt-4 block font-heading text-lg font-extrabold xl:text-xl tracking-[-0.02em] text-white">
                  Play with Friend
                </span>
                <span className="relative mt-1.5 block text-sm leading-5 text-slate-300">
                  Create a room and challenge your friends.
                </span>
                <span className="relative mt-auto inline-flex items-center gap-2 rounded-full bg-[#4ade80] px-4 py-2 font-heading text-sm font-bold text-[#052e16] transition-colors group-hover:bg-[#86efac]">
                  Create Room
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>

              <motion.button
                variants={fadeUp}
                type="button"
                onClick={() => {
                  playClickSound();
                  onPlayVsBot();
                }}
                aria-label="Practice vs Server Bot"
                className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#6d3fa8]/60 bg-[linear-gradient(160deg,rgba(36,16,63,0.96),rgba(16,9,30,0.98))] p-4 text-left xl:p-5 shadow-[0_22px_70px_-40px_rgba(192,132,252,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c084fc]/80 hover:shadow-[0_28px_80px_-36px_rgba(192,132,252,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc]"
              >
                <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#c084fc]/10 blur-2xl" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c084fc]/15 text-[#d8b4fe]">
                  <Bot className="h-5 w-5" />
                </span>
                <span className="relative mt-4 block font-heading text-lg font-extrabold xl:text-xl tracking-[-0.02em] text-white">
                  Play with Bot
                </span>
                <span className="relative mt-1.5 block text-sm leading-5 text-slate-300">
                  Practice your skills with our smart bot.
                </span>
                <span className="relative mt-auto inline-flex items-center gap-2 rounded-full bg-[#c084fc] px-4 py-2 font-heading text-sm font-bold text-[#2e1065] transition-colors group-hover:bg-[#d8b4fe]">
                  Play with Bot
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mx-auto mt-6 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035] px-2 py-3.5 backdrop-blur-sm"
            >
              {[
                { value: "100%", label: "Free to Play" },
                { value: "3", label: "Game Modes" },
                { value: "∞", label: "Unlimited Fun" },
              ].map((stat) => (
                <div key={stat.label} className="px-2 text-center">
                  <p className="font-heading text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="features" className="border-y border-white/10 bg-[#071021]/70">
          <div className="container-max grid grid-cols-2 gap-6 py-7 sm:grid-cols-4 sm:gap-4 sm:py-8">
            {[
              { icon: Zap, title: "Instant Matches", text: "Find players in seconds", color: "text-turf", bg: "bg-turf/10" },
              { icon: Globe2, title: "Play Anywhere", text: "On any device, anytime", color: "text-[#7dd3fc]", bg: "bg-[#38bdf8]/10" },
              { icon: Trophy, title: "Leaderboards", text: "Climb the ranks", color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
              { icon: BarChart3, title: "Fun & Simple", text: "Just pick a number and play", color: "text-[#86efac]", bg: "bg-[#4ade80]/10" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.bg} ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-heading text-xs font-bold text-white sm:text-sm">{item.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 sm:text-[11px]">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="formats" className="container-max py-14 sm:py-20">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-turf/10 blur-3xl" />
              <div className="relative flex items-center gap-2 text-turf">
                <UserRound className="h-4 w-4" />
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em]">
                  Your Anonymous Identity
                </span>
              </div>

              <div className="relative mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-turf to-[#e09c00] font-heading text-2xl font-black text-ink shadow-[0_12px_30px_-14px_rgba(247,181,0,0.7)]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <form onSubmit={handleSaveName} className="flex items-center gap-2">
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        maxLength={16}
                        autoFocus
                        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#050b16] px-3 py-2 font-heading text-lg font-bold text-white outline-none focus:border-turf"
                        aria-label="Edit player name"
                      />
                      <button
                        type="submit"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-turf text-ink transition-colors hover:bg-turf-hover"
                        aria-label="Save player name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="truncate font-heading text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
                        {guestName || "Anonymous Player"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(guestName);
                          setIsEditing(true);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Edit name"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRandomizeName}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Randomize name"
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky" />
                    Ready to play
                  </p>
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-[10px] text-slate-400">
                {onTestCamera ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onTestCamera();
                    }}
                    className="flex items-center gap-1.5 text-left transition-colors hover:text-turf focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-turf"
                    title="Test camera hardware & gestures"
                  >
                    <Camera className="h-3.5 w-3.5 text-turf" />
                    <span className="underline decoration-turf/30 underline-offset-2">Camera-umpired</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-turf" />
                    Camera-umpired
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sky" />
                  No signup
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#c084fc]" />
                  18+ only
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-turf">
                <Swords className="h-4 w-4" />
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em]">
                  Match format
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {FORMATS.map((item) => {
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setMode(item.id);
                      }}
                      aria-pressed={active}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-turf bg-turf/[0.12] text-turf shadow-[0_12px_30px_-20px_rgba(247,181,0,0.6)]"
                          : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-turf/40 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="block font-heading text-sm font-extrabold">{item.title}</span>
                      <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.1em] ${active ? "text-turf/80" : "text-slate-500"}`}>
                        {item.detail}
                      </span>
                      <span className="mt-2 block text-[10px] leading-4 text-slate-400">{item.note}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <p className="text-[10px] text-slate-400">Every mode uses the same hand-cricket rules.</p>
                <button
                  type="button"
                  onClick={onOpenRules}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-turf transition-colors hover:text-turf-hover"
                >
                  Rules
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-white/10 py-16 sm:py-20">
          <div className="container-max">
            <div className="mx-auto max-w-2xl text-center">
              <span className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-turf">
                How it works
              </span>
              <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                Three moves to the crease.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                No tutorials. No downloads. Just show your hand and play.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { number: "01", icon: Dices, title: "Call the toss", text: "Choose odd or even, then reveal your number.", isCamera: false },
                { number: "02", icon: Camera, title: "Show your hand", text: "The camera reads your gesture in real time.", isCamera: true },
                { number: "03", icon: Trophy, title: "Chase the score", text: "Match the number to take a wicket.", isCamera: false },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-heading text-4xl font-black tracking-[-0.06em] text-turf/80">
                          {step.number}
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-turf/10 text-turf">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <h3 className="mt-6 font-heading text-lg font-extrabold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                    </div>
                    {step.isCamera && onTestCamera && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          onTestCamera();
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-turf transition-colors hover:text-turf-hover"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Test Camera Umpire</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="throws" className="border-t border-white/10 py-16 sm:py-20">
          <div className="container-max">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-turf">
                  The throws
                </span>
                <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  One to six.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-400">
                Hold steady. The camera locks it in. Every finger changes the game.
              </p>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {GESTURES.map((gesture) => (
                <div
                  key={gesture.value}
                  className="group rounded-[20px] border border-white/10 bg-white/[0.03] px-3 py-5 text-center transition-all hover:-translate-y-1 hover:border-turf/40 hover:bg-turf/[0.06]"
                >
                  <Hand value={gesture.value} size={46} className="mx-auto text-turf" />
                  <p className="mt-3 font-heading text-sm font-bold text-white">{gesture.label}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-slate-500">{gesture.fingers}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-white/10 py-16 sm:py-20">
          <div className="container-max grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <span className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-turf">
                FAQ
              </span>
              <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                A few answers.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">
                Everything you need before you step under the lights.
              </p>
              <button
                type="button"
                onClick={onOpenRules}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-turf/30 bg-turf/[0.08] px-4 py-2.5 font-heading text-xs font-bold text-turf transition-colors hover:bg-turf/[0.14]"
              >
                <Sparkles className="h-4 w-4" />
                Full rules
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {FAQS.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.question} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setOpenFaq(open ? null : index);
                      }}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-heading text-sm font-bold text-white transition-colors hover:text-turf"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-turf transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                        >
                          <p className="border-t border-white/10 px-4 py-4 text-sm leading-6 text-slate-400">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container-max pb-16 pt-2 sm:pb-20">
          <div className="relative overflow-hidden rounded-[28px] border border-turf/30 bg-[linear-gradient(120deg,#1b1606,#0b1628_55%,#1a1030)] px-6 py-10 text-center shadow-[0_30px_90px_-50px_rgba(247,181,0,0.45)] sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-turf/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#a855f7]/15 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-turf/30 bg-turf/10 px-3 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-turf">
                <HandIcon className="h-3.5 w-3.5" />
                One more over
              </span>
              <h2 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">
                Own the crease.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-300">
                Your next opponent is already here. Step into the arena, pick your number, and let the camera umpire the rest.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={startMatch}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-turf px-6 py-3 font-heading text-sm font-bold text-ink shadow-[0_14px_34px_-16px_rgba(247,181,0,0.65)] transition-colors hover:bg-turf-hover"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Enter the arena
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={onPlayVsBot}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 font-heading text-sm font-bold text-white transition-colors hover:border-turf/40 hover:bg-white/[0.08]"
                >
                  <Bot className="h-4 w-4 text-[#c084fc]" />
                  Practice vs Bot
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
};
