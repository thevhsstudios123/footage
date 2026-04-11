import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkySnap — Turn a photo into a cinematic drone shot",
  description:
    "Upload a photo, pick a drone style, and get a cinematic drone-style video back. Face preservation first.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-brand">
        {children}
      </body>
    </html>
  );
}
