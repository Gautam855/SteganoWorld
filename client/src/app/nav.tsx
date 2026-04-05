"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "../../utils/cn";
import { HealthIndicator } from "../../components/health-indicator";
import { Shield, Lock, Eye, BookOpen, Home, MessageCircle, FileText, Image as ImageIcon } from "lucide-react";
import { usePathname } from "next/navigation";

export function NavbarDemo({ className }: { className?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const navItems = [
    { href: "/", icon: Home, label: "Home", activeClass: "bg-white/10 text-white", dotClass: "bg-white" },
    { 
      href: "/EncryptText", 
      icon: Lock, 
      label: "Encrypt", 
      activeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 focus-bg", 
      dotClass: "bg-emerald-400",
      subItems: [
        { href: "/EncryptText", label: "Hide Text", icon: FileText, hoverClass: "hover:bg-emerald-500/10 hover:text-emerald-400" },
        { href: "/EncryptImage", label: "Hide Image", icon: ImageIcon, hoverClass: "hover:bg-emerald-500/10 hover:text-emerald-400" }
      ]
    },
    { 
      href: "/DecryptText", 
      icon: Eye, 
      label: "Decrypt", 
      activeClass: "bg-sky-500/10 text-sky-400 border border-sky-500/20 focus-bg", 
      dotClass: "bg-sky-400",
      subItems: [
        { href: "/DecryptText", label: "Extract Text", icon: FileText, hoverClass: "hover:bg-sky-500/10 hover:text-sky-400" },
        { href: "/DecryptImage", label: "Extract Image", icon: ImageIcon, hoverClass: "hover:bg-sky-500/10 hover:text-sky-400" }
      ]
    },
    { href: "/chat", icon: MessageCircle, label: "Chat", activeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", dotClass: "bg-indigo-400" },
    { href: "/guide", icon: BookOpen, label: "Guide", activeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dotClass: "bg-amber-400" },
  ];

  return (
    <div className={cn("fixed top-6 inset-x-0 max-w-4xl mx-auto z-50 px-4", className)}>
      <div
        className={cn(
          "flex items-center justify-between",
          "bg-[#08080c]/80 backdrop-blur-2xl",
          "border border-white/10",
          "rounded-[24px] px-3 py-2",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "transition-all duration-300",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
      >
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0 pl-2 pr-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-[17px] font-black tracking-tight leading-none">
            STEGANO<span className="text-emerald-500">WORLD</span>
          </span>
        </Link>

        {/* NAV LINKS */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label, activeClass, dotClass, subItems }: any, i: number) => {
            const isActive = href === "/"
              ? pathname === "/"
              : pathname === href || pathname?.startsWith(href + "/");

            return (
              <div key={href} className="relative group z-50">
                <Link
                  href={href}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold tracking-tight",
                    "transition-all duration-200",
                    isActive
                      ? activeClass
                      : "text-white/40 hover:text-white/90 hover:bg-white/5"
                  )}
                >
                  <Icon size={15} strokeWidth={2.2} />
                  <span className="hidden sm:inline">{label}</span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                        dotClass
                      )}
                    />
                  )}
                </Link>

                {/* DROPDOWN SUB-ITEMS */}
                {subItems && (
                  <div className="absolute top-[80%] pt-4 left-1/2 -translate-x-1/2 w-48 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <div className="bg-[#0f0f15]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 relative overflow-hidden shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                      {subItems.map((sub: any) => {
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-neutral-400 rounded-xl transition-all relative z-10",
                              sub.hoverClass || "hover:text-white hover:bg-white/10"
                            )}
                          >
                            <SubIcon size={14} className="opacity-80" />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* RIGHT: HEALTH */}
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <div className="w-px h-5 bg-white/10" />
          <div className="scale-90 opacity-90 hover:opacity-100 transition-opacity pr-1">
            <HealthIndicator />
          </div>
        </div>
      </div>
    </div>
  );
}