import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "600"],
});

export const metadata: Metadata = {
  title: "Tonight — pick something you'll both actually watch",
  description: "Two preference forms, one AI-refined pool of titles, a swipe-off, and exactly where to watch it in India tonight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f6f0e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} font-body bg-base-950 text-ink antialiased`}>
        <div className="min-h-dvh flex flex-col">{children}</div>
      </body>
    </html>
  );
}
