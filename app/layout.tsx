import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fleet Watch - AI Fleet Intelligence",
    template: "%s | Fleet Watch",
  },
  description: "Premium fleet monitoring platform for logistics companies in Lagos. Track cars and bikes in real-time with AI-powered alerts.",
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
    <html lang="en" className="bg-black scroll-smooth">
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
