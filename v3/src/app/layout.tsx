import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Magpie Talk - Prolonged Speech Practice",
  description: "A flow state engine for prolonged speech practice. Evidence-based fluency technique training with kinetic typography.",
  keywords: ["speech therapy", "fluency", "prolonged speech", "stuttering", "speech practice"],
  authors: [{ name: "Magpie Talk" }],
  openGraph: {
    title: "Magpie Talk",
    description: "Prolonged speech practice for fluency",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b", // zinc-950
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
