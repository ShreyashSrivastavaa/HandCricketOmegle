import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Hand Cricket Arena | Real-time Hand Cricket",
  description: "Fast-paced competitive hand cricket arena. Bat, bowl, and outsmart your opponent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ink text-chalk antialiased selection:bg-turf selection:text-ink">
        {children}
      </body>
    </html>
  );
}
