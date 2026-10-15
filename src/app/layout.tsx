import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "@/styles/tokens.css";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B1210",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://handcricketomegle.vercel.app"),
  title: "HandCricketOmegle | 1v1 Stranger Matchmaking Game",
  description:
    "Real-time online Hand Cricket. Play against strangers in 1v1 live duels with secret number picks, coin toss, sudden death wickets, and authoritative serverless game resolution.",
  applicationName: "HandCricketOmegle",
  keywords: [
    "handcricketomegle",
    "hand cricket",
    "cricket game",
    "omegle cricket",
    "1v1 stranger game",
    "hand cricket online",
    "multiplayer hand cricket",
  ],
  authors: [{ name: "HandCricketOmegle Team" }],
  openGraph: {
    title: "HandCricketOmegle | Real-Time 1v1 Matchmaking",
    description:
      "Play Hand Cricket live against random strangers with pure skill, secret picks, and instant reveals.",
    url: "https://handcricketomegle.vercel.app",
    siteName: "HandCricketOmegle",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HandCricketOmegle Arena Duel",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HandCricketOmegle | 1v1 Stranger Matchmaking",
    description:
      "Real-time online Hand Cricket. Secret picks, sudden death wickets, and instant reveals.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "https://handcricketomegle.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script src="/ably.min.js" async></script>
      </head>
      <body className="min-h-screen bg-ink text-chalk antialiased selection:bg-turf selection:text-ink">
        {children}
      </body>
    </html>
  );
}
