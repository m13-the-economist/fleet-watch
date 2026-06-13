"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Bike, Bell, Shield, CheckCircle2, Zap, MapPin, Activity } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#D4AF37] via-transparent to-transparent" style={{ opacity: 0.05 }} />
        <div className="container mx-auto px-4 py-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 rounded-full px-4 py-1.5 mb-6 border border-[#D4AF37]/20">
            <Zap className="w-3 h-3 text-[#D4AF37]" />
            <span className="text-xs font-medium text-[#D4AF37]">AI-Powered Fleet Intelligence</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Monitor Your Fleet
            <span className="text-[#D4AF37] block mt-2">Like Never Before</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Real-time tracking for cars and bikes. Get instant alerts on Telegram.
            ₦7,000/car/month • ₦5,000/bike/month
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup">
              <Button size="lg" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 px-8">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> No setup fee</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Cancel anytime</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> 24/7 support</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">One Dashboard. Both Vehicle Types.</h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">Complete fleet management solution for cars and bikes</p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <Car className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <CardTitle className="text-white">Cars (2008+)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4 text-sm">Plug ELM327 OBD2 scanner into the diagnostic port. Works instantly.</p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Engine temperature</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> RPM & Speed</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Fault codes (Check Engine)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Battery voltage</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <Bike className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <CardTitle className="text-white">Bikes (No OBD2)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4 text-sm">Custom sensors attached to engine, frame, and battery.</p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Engine temperature (DS18B20)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Battery voltage monitor</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Tip-over detection (MPU6050)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Vibration sensor</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <CardTitle className="text-white">Real-Time Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4 text-sm">Get notified within 5 seconds of any issue.</p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Telegram notifications (free)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Web Push (browser)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Overheat & low battery</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37]" /> Tip-over & high vibration</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-[#0A0A0A] border-t border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-400 mb-12">No hidden fees. Pay per vehicle monthly.</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-black border-2 border-[#D4AF37]/30 rounded-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Cars & Trucks</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-[#D4AF37]">₦7,000</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">per vehicle</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> OBD2 plug & play</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Real-time dashboard</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Telegram alerts</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> 30-day history</li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full mt-8 bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-black border border-white/10 rounded-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Bikes</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-[#D4AF37]">₦5,000</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">per vehicle</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Custom sensors included</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Tip-over detection</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Vibration monitoring</li>
                  <li className="flex items-center gap-2 text-gray-300"><CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Battery voltage tracking</li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white border border-white/20">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to protect your fleet?</h2>
            <p className="text-gray-400 mb-8">Join logistics companies in Lagos using Fleet Watch.</p>
            <Link href="/signup">
              <Button size="lg" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold px-8">
                Start 14-Day Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Fleet<span className="text-[#D4AF37]">Watch</span></h3>
              <p className="text-sm text-gray-500 mt-1">by Lee Henry AI</p>
            </div>
            <div className="flex gap-8">
              <Link href="/pricing" className="text-gray-400 hover:text-[#D4AF37] text-sm">Pricing</Link>
              <Link href="/about" className="text-gray-400 hover:text-[#D4AF37] text-sm">About</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-[#D4AF37] text-sm">Privacy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-[#D4AF37] text-sm">Terms</Link>
            </div>
            <p className="text-sm text-gray-500">© 2026 Lee Henry AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
