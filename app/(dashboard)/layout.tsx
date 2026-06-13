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
  Shield, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
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
        {/* Sign Out Confirmation Modal */}
        <Dialog open={signOutModalOpen} onOpenChange={setSignOutModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Sign Out</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to sign out? You will need to sign in again to access your fleet data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSignOutModalOpen(false)}
                className="border-[#2A2A2A] text-gray-400 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white flex-1"
              >
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
          <div className="flex justify-between items-center px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-white">
                Fleet<span className="text-[#D4AF37]">Watch</span>
              </h1> 
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.push("/dashboard/settings")}
                className="focus:outline-none"
              >
                <Avatar className="w-8 h-8 bg-[#D4AF37]/20 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30 transition-all cursor-pointer">
                  <AvatarFallback className="text-[#D4AF37] text-xs font-bold">II</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </header>

        <main className="pt-16 px-4 pb-24">
          {children}
        </main>

        <MobileBottomNav /> 
      </div>
    );
  }
 
  // Desktop Layout
  return (
    <div className="min-h-screen bg-black">
      {/* Sign Out Confirmation Modal */}
      <Dialog open={signOutModalOpen} onOpenChange={setSignOutModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Sign Out</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to sign out? You will need to sign in again to access your fleet data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSignOutModalOpen(false)}
              className="border-[#2A2A2A] text-gray-400 flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white flex-1"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-black border-r border-white/10 transform transition-transform duration-200 ease-in-out ${
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
                <AvatarFallback className="text-[#D4AF37] font-bold">II</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Fleet Manager</p>
                <p className="text-xs text-[#6B7280]">Enterprise</p>
              </div>
            </div>
            <Button
              onClick={() => setSignOutModalOpen(true)}
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="md:ml-64 min-h-screen">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex justify-end items-center px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs text-[#6B7280]">Enterprise</span>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-8 px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
