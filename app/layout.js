import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RankUp from "./RankUp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://foodish.pk"),
  title: "Foodish — Rate every Plate",
  description: "Find the best dish before you order. Discover and rate dishes — not just restaurants — at your favourite spots.",
  openGraph: {
    title: "Foodish — Rate every Plate",
    description: "Find the best dish before you order. Dish-level ratings from real food lovers.",
    siteName: "Foodish",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Foodish — Rate every Plate" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foodish — Rate every Plate",
    description: "Find the best dish before you order. Dish-level ratings from real food lovers.",
    images: ["/og.png"],
  },
};

export const viewport = {
  themeColor: "#FF921C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<RankUp /></body>
    </html>
  );
}
