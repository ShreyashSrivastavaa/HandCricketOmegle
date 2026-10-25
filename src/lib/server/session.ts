import { NextRequest, NextResponse } from "next/server";

export const GUEST_COOKIE_NAME = "hc_guest_id";
export const GUEST_NAME_COOKIE_NAME = "hc_guest_name";
export const AGE_COOKIE_NAME = "hc_age_verified";

const ADJECTIVES = [
  "Swift", "Blaze", "Silent", "Thunder", "Shadow", "Cosmic", "Brave", "Hyper",
  "Wild", "Epic", "Solar", "Frost", "Iron", "Storm", "Viper", "Echo",
  "Rapid", "Golden", "Sonic", "Phantom", "Aero", "Neon", "Cyber", "Mega"
];

const ANIMALS = [
  "Tiger", "Hawk", "Panther", "Fox", "Falcon", "Wolf", "Cobra", "Eagle",
  "Lion", "Shark", "Dragon", "Cheetah", "Rhino", "Bear", "Viper", "Jaguar",
  "Striker", "Bowler", "Spinner", "Batter", "Titan", "Raptor", "Puma", "Stallion"
];

export function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${animal}${num}`;
}

export function generateGuestId(): string {
  return `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export interface GuestSession {
  guestId: string;
  guestName: string;
  ageVerified?: boolean;
}

export function getOrCreateGuestSession(req: NextRequest): {
  session: GuestSession;
  isNew: boolean;
} {
  const guestId =
    req.cookies.get(GUEST_COOKIE_NAME)?.value ||
    req.headers.get("x-guest-id") ||
    undefined;
  const guestName =
    req.cookies.get(GUEST_NAME_COOKIE_NAME)?.value ||
    req.headers.get("x-guest-name") ||
    undefined;
  const ageVerified =
    req.cookies.get(AGE_COOKIE_NAME)?.value === "true" ||
    req.headers.get("x-age-verified") === "true";

  if (guestId && guestName) {
    return {
      session: { guestId, guestName, ageVerified },
      isNew: false,
    };
  }

  const newId = guestId || generateGuestId();
  const newName = guestName || generateGuestName();

  return {
    session: { guestId: newId, guestName: newName, ageVerified },
    isNew: true,
  };
}

export function attachSessionCookies(
  res: NextResponse,
  session: GuestSession
): void {
  // httpOnly cookie for guestId (valid for 30 days)
  res.cookies.set(GUEST_COOKIE_NAME, session.guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  // Client-readable cookie for display name preview
  res.cookies.set(GUEST_NAME_COOKIE_NAME, session.guestName, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  // httpOnly cookie for 18+ age verification
  if (session.ageVerified) {
    res.cookies.set(AGE_COOKIE_NAME, "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
  }
}
