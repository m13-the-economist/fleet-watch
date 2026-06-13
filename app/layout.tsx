import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: {
    default: "Fleet Watch - AI Fleet Intelligence",
    template: "%s | Fleet Watch",
  },
  description: "Premium fleet monitoring platform for logistics companies in Lagos. Track cars and bikes in real-time with AI-powered alerts.",
  keywords: ["fleet management", "vehicle tracking", "logistics", "Lagos", "AI monitoring", "telematics"],
  authors: [{ name: "Lee Henry AI" }],
  creator: "Lee Henry AI",
  publisher: "Lee Henry AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Fleet Watch - AI Fleet Intelligence",
    description: "Premium fleet monitoring platform for logistics companies in Lagos.",
    url: "https://fleetwatch.leehenry.ai",
    siteName: "Fleet Watch",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fleet Watch Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fleet Watch - AI Fleet Intelligence",
    description: "Premium fleet monitoring platform for logistics companies in Lagos.",
    images: ["/og-image.png"],
    creator: "@leehenryai",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "your-google-site-verification",
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FleetWatch" />
        <meta name="theme-color" content="#D4AF37" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-black text-white min-h-screen`}
      >
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              background: "#1A1A1A",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#FFFFFF",
            },
          }}
        />
      </body>
    </html>
  );
} 