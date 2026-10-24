import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lock, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const LEGAL_LINKS = [
  { href: "/guidelines", label: "Community Guidelines" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function LegalShell({ eyebrow, title, description, icon, children }: LegalShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-ink text-chalk selection:bg-turf selection:text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_65%_60%_at_50%_-10%,rgba(247,181,0,0.08),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="pitch-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-20" aria-hidden="true" />

      <header className="relative z-20 mx-auto w-full max-w-[1440px] px-2 pt-2">
        <Navbar />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-7">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-turf/40 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Arena</span>
          </Link>
          <span className="flex items-center gap-1.5 font-heading text-[10px] font-black uppercase tracking-[0.18em] text-turf">
            <span className="h-1.5 w-1.5 rounded-full bg-turf" />
            {eyebrow}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
          <article className="panel relative overflow-hidden rounded-[26px] p-5 sm:p-8 lg:p-10">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_70%_100%_at_30%_0%,rgba(247,181,0,0.1),transparent_72%)]"
              aria-hidden="true"
            />
            <header className="relative z-10 flex items-start gap-3 border-b border-line pb-5 sm:items-center sm:gap-4 sm:pb-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-turf/30 bg-turf/10 text-turf">
                {icon}
              </span>
              <div>
                <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-chalk sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">
                  {description}
                </p>
              </div>
            </header>

            <div className="relative z-10 mt-6 flex flex-col gap-7 text-xs leading-relaxed text-chalk/90 sm:text-sm">
              {children}
            </div>
          </article>

          <aside className="space-y-4 self-start lg:sticky lg:top-24">
            <nav className="rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur-sm" aria-label="Legal pages">
              <p className="font-heading text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                Legal center
              </p>
              <div className="mt-2 flex flex-col">
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between gap-2 border-b border-line/60 py-2.5 text-xs text-muted transition-colors last:border-0 hover:text-chalk"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted/60 transition-colors group-hover:text-turf" />
                  </Link>
                ))}
              </div>
            </nav>

            <div className="relative overflow-hidden rounded-2xl border border-turf/25 bg-gradient-to-br from-turf/10 via-surface to-surface p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-turf/30 bg-turf/10 text-turf">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="mt-3 font-heading text-xs font-black uppercase tracking-wide text-chalk">
                Fair play promise
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Zero video storage. Encrypted peer-to-peer feeds. AI umpire runs 100% on your device.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-turf">
                <Lock className="h-3 w-3" />
                Strictly 18+
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface/50 p-4">
              <p className="font-heading text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                Need help?
              </p>
              <a
                href="mailto:support@handcricketomegle.com"
                className="mt-1.5 block break-all text-[11px] text-turf hover:underline"
              >
                support@handcricketomegle.com
              </a>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
