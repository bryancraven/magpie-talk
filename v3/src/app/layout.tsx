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
  metadataBase: new URL('https://bryancraven.github.io/magpie-talk'),
  title: "Magpie Talk - Free Prolonged Speech Practice Tool for Stuttering",
  description: "Free browser-based speech practice tool for people who stutter. Practice prolonged speech technique with paced Wikipedia articles. Evidence-based fluency shaping therapy you can do at home.",
  keywords: ["stuttering", "speech therapy", "prolonged speech", "fluency shaping", "speech practice", "stuttering exercises", "fluency exercises", "speech fluency", "stammering", "stuttering help"],
  authors: [{ name: "Magpie Talk" }],
  creator: "Magpie Talk",
  publisher: "Magpie Talk",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://bryancraven.github.io/magpie-talk/",
    title: "Magpie Talk - Free Prolonged Speech Practice Tool",
    description: "Free browser-based speech practice for people who stutter. Practice prolonged speech with paced Wikipedia articles at your own speed.",
    siteName: "Magpie Talk",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Magpie Talk - Prolonged Speech Practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Magpie Talk - Free Prolonged Speech Practice Tool",
    description: "Free browser-based speech practice for people who stutter. Practice prolonged speech with paced Wikipedia articles at your own speed.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "HHoTJlWRCnf-hJaArKChgMUcrYuSgKG-EaDQMUThRY8",
  },
  alternates: {
    canonical: "https://bryancraven.github.io/magpie-talk/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Magpie Talk",
  description: "Free browser-based prolonged speech practice tool for people who stutter. Practice fluency shaping techniques with paced Wikipedia articles.",
  url: "https://bryancraven.github.io/magpie-talk",
  applicationCategory: "HealthApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Prolonged speech practice",
    "Adjustable syllable pacing",
    "Wikipedia article integration",
    "Progress tracking",
    "Mobile friendly",
  ],
  audience: {
    "@type": "PeopleAudience",
    audienceType: "People who stutter, speech therapy patients, fluency practice",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://api.wikimedia.org" />
        <link rel="dns-prefetch" href="https://en.wikipedia.org" />
        <link rel="dns-prefetch" href="https://www.gstatic.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="preconnect" href="https://api.wikimedia.org" crossOrigin="anonymous" />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Prevent flash of unstyled content */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('magpie-settings');
                  if (theme) {
                    var parsed = JSON.parse(theme);
                    if (parsed.state && parsed.state.theme) {
                      document.documentElement.classList.remove('light', 'dark');
                      document.documentElement.classList.add(parsed.state.theme);
                    }
                    if (parsed.state && parsed.state.meshMode) {
                      document.documentElement.setAttribute('data-mesh-mode', 'on');
                    }
                    if (parsed.state && parsed.state.fontSize) {
                      document.documentElement.setAttribute('data-font-size', parsed.state.fontSize);
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
