"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Navbar - Pure Black */}
      <nav className="border-b border-white/10 bg-black sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">Fleet<span className="text-[#D4AF37]">Watch</span></span>
              <span className="text-xs text-gray-500 hidden md:inline">by Lee Henry AI</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/pricing" className="text-gray-400 hover:text-[#D4AF37] transition">
                Pricing
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-[#D4AF37] transition">
                About
              </Link>
              <Link href="/signin">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link href="/pricing" className="text-gray-400 hover:text-[#D4AF37] py-2">
                Pricing
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-[#D4AF37] py-2">
                About
              </Link>
              <Link href="/signin" className="py-2">
                <Button variant="ghost" className="w-full">Sign In</Button>
              </Link>
              <Link href="/signup" className="py-2">
                <Button className="w-full bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Start Free Trial</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Fleet<span className="text-[#D4AF37]">Watch</span></h3>
              <p className="text-gray-500 text-sm">AI-powered fleet monitoring for Lagos logistics companies.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/pricing" className="hover:text-[#D4AF37]">Pricing</Link></li>
                <li><Link href="/about" className="hover:text-[#D4AF37]">About Us</Link></li>
                <li><Link href="/demo" className="hover:text-[#D4AF37]">Live Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/contact" className="hover:text-[#D4AF37]">Contact</Link></li>
                <li><Link href="/docs" className="hover:text-[#D4AF37]">Documentation</Link></li>
                <li><Link href="/hardware" className="hover:text-[#D4AF37]">Hardware Guide</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/privacy" className="hover:text-[#D4AF37]">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#D4AF37]">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>© 2026 Lee Henry AI. All rights reserved. Fleet Watch.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
