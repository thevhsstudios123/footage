import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkySnap — Cinematic drone footage from any photo",
  description:
    "Turn any photo into cinematic drone footage in 60 seconds. Your face stays untouched.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "SkySnap — Cinematic drone footage from any photo",
    description:
      "Turn any photo into cinematic drone footage in 60 seconds. Your face stays untouched.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0b12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="skysnap-gradient min-h-dvh">{children}</body>
      </html>
    </ClerkProvider>
  );
}
