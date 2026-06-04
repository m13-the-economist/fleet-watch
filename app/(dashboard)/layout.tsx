"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  AlertTriangle,
  FileText,
  Settings,
  MapPin,
  Menu,
  X,
  LogOut,
  Bell,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/vehicles", label: "Vehicles", icon: Car },
    { href: "/dashboard/map", label: "Map", icon: MapPin },
    { href: "/dashboard/alerts", label: "Alerts", icon: AlertTriangle },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-black">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
          <div className="flex justify-between items-center px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-white">
                Fleet<span className="text-[#D4AF37]">Watch</span>
              </h1>
              <p className="text-[10px] text-white/40">AI Fleet Intelligence</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full"></span>
              </Button>
              <button
                onClick={() => router.push("/dashboard/settings")}
                className="focus:outline-none"
              >
                <Avatar className="w-8 h-8 bg-[#D4AF37]/20 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30 transition-all cursor-pointer">
                  <AvatarFallback className="text-[#D4AF37] text-xs font-bold">JD</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-16 px-4 pb-20">
          {children}
        </main>

        {/* Floating Bottom Navigation */}
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-black">
      <div className="md:hidden fixed top-5 left-5 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-black border-white/10 text-white hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[260px] bg-black border-r border-white/10 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Fleet<span className="text-[#D4AF37]">Watch</span>
                </h1>
                <p className="text-xs text-[#6B7280] mt-1">AI Fleet Intelligence</p>
              </div>
              <button
                className="md:hidden text-white/60 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-12 rounded-xl ${
                      isActive
                        ? "bg-white/5 text-[#D4AF37]"
                        : "text-[#6B7280] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-[#D4AF37]" : ""}`} />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
              <Avatar className="w-10 h-10 bg-[#D4AF37]/20 border border-[#D4AF37]/30">
                <AvatarFallback className="text-[#D4AF37] font-bold">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">John Doe</p>
                <p className="text-xs text-[#6B7280]">Fleet Manager</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="md:ml-[260px] min-h-screen">
        <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex justify-between items-center px-6 py-4">
            <h2 className="text-xl font-semibold text-white tracking-tight hidden md:block">
              Dashboard
            </h2>
            <div className="flex items-center gap-3 ml-auto">
              <Button variant="ghost" size="icon" className="relative text-[#6B7280] hover:text-white hover:bg-white/10 rounded-xl">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full"></span>
              </Button>
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs text-[#6B7280]">Enterprise</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
