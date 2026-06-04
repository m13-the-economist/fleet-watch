"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Car, MapPin, AlertTriangle, FileText } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/vehicles", label: "Vehicles", icon: Car },
  { href: "/dashboard/map", label: "Map", icon: MapPin },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <div className="h-24" />

      <div
        className={`
          fixed bottom-4 left-4 right-4 z-50
          transition-all duration-300 ease-out
          ${isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}
        `}
      >
        <div className="flex justify-center">
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl">
            <div className="flex items-center gap-1 px-3 py-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`
                      relative flex flex-col items-center justify-center
                      w-14 h-12 rounded-2xl
                      transition-all duration-200 ease-out
                      active:scale-90
                      ${isActive 
                        ? "text-[#D4AF37] bg-[#D4AF37]/15" 
                        : "text-white/50 hover:text-white/80"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
