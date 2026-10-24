"use client";

import Image from "next/image";
import { useState } from "react";

const HERO_BOYS_SRC = "/images/hand-cricket-boys.png";

export function HeroBoysArtwork() {
  const [missing, setMissing] = useState(false);

  if (missing) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div className="hero-art-mask-y absolute -left-[8%] top-0 aspect-[764/871] w-[clamp(120px,34vw,190px)] overflow-hidden opacity-60 sm:-left-[8%] sm:w-[clamp(180px,26vw,260px)] sm:opacity-75 lg:-left-[6%] lg:w-[clamp(240px,28vw,420px)] lg:opacity-100">
        <div className="hero-art-mask-right h-full w-full">
          <Image
            src={HERO_BOYS_SRC}
            alt=""
            width={1774}
            height={887}
            priority
            draggable={false}
            onError={() => setMissing(true)}
            className="h-full w-full select-none object-cover object-left"
          />
        </div>
      </div>
      <div className="hero-art-mask-y absolute -right-[8%] top-0 aspect-[764/871] w-[clamp(120px,34vw,190px)] overflow-hidden opacity-60 sm:-right-[8%] sm:w-[clamp(180px,26vw,260px)] sm:opacity-75 lg:-right-[6%] lg:w-[clamp(240px,28vw,420px)] lg:opacity-100">
        <div className="hero-art-mask-left h-full w-full">
          <Image
            src={HERO_BOYS_SRC}
            alt=""
            width={1774}
            height={887}
            priority
            draggable={false}
            onError={() => setMissing(true)}
            className="h-full w-full select-none object-cover object-right"
          />
        </div>
      </div>
    </div>
  );
}
