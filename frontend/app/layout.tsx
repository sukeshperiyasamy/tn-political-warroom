import type { Metadata } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TN Political War Room | Media Intelligence & News Studio",
  description: "Real-time political media intelligence, party sentiment analytics, AI summaries, and 1080x1080 Tamil news card studio for Tamil Nadu politics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" className={`${inter.variable} ${notoSansTamil.variable} antialiased`}>
      <body className="bg-[#F8FAFC] text-slate-900 min-h-screen selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
