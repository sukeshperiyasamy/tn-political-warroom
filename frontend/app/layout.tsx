import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tamil Nadu Political Media Intelligence | War Room Platform",
  description: "Independent political media intelligence wire, sentiment analytics, and editorial news studio for Tamil Nadu politics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ta"
      className={`${plusJakarta.variable} ${newsreader.variable} ${notoSansTamil.variable} antialiased`}
    >
      <body className="bg-[#FBFBFA] text-zinc-900 min-h-screen selection:bg-zinc-200 selection:text-zinc-900 font-sans">
        {children}
      </body>
    </html>
  );
}
