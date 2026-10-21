import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Newsreader, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { WarRoomProvider } from "../components/providers/WarRoomProvider";
import { AppShell } from "../components/shell/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TN War Room | Political Media Intelligence",
  description:
    "Political media intelligence, sentiment analytics and a Tamil news card studio for Tamil Nadu politics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${newsreader.variable} ${notoSansTamil.variable} antialiased`}
    >
      <body className="bg-canvas text-ink min-h-screen selection:bg-accent-soft selection:text-ink font-sans">
        <WarRoomProvider>
          <AppShell>{children}</AppShell>
        </WarRoomProvider>
      </body>
    </html>
  );
}
