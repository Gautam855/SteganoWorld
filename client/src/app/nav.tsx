"use client";
import React, { useState } from "react";
import Link from "next/link";
import { HoveredLink, Menu, MenuItem } from "../../components/ui/navbar-menu";
import { cn } from "../../utils/cn";
import { ModeToggle } from "../../components/mode-toggle";
import { HealthIndicator } from "../../components/health-indicator";
import { Shield, Lock, Eye, BookOpen, Home } from "lucide-react";

export function NavbarDemo({ className }: { className?: string }) {
  const [active, setActive] = useState<any>(null);

  const hideLabel = React.useMemo(() => (
    <div className="flex items-center gap-2">
      <Lock size={16} className="text-amber-500" /> Hide Data
    </div>
  ), []);

  const revealLabel = React.useMemo(() => (
    <div className="flex items-center gap-2">
      <Eye size={16} className="text-emerald-500" /> Reveal Data
    </div>
  ), []);
  
  return (
    <div className={cn("fixed top-10 inset-x-0 max-w-5xl mx-auto z-50 px-4", className)}>
      <div className="flex items-center justify-between bg-white/[0.05] dark:bg-black/40 backdrop-blur-xl border border-white/[0.1] dark:border-white/[0.05] rounded-full px-6 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        
        {/* LOGO SECTION */}
        <Link href="/" className="flex items-center gap-2 group shrink-0 pr-4">
          <div className="p-1.5 bg-sky-500 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-sky-500/40">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200 tracking-tighter">
            STEGANO<span className="text-sky-500">WORLD</span>
          </span>
        </Link>

        {/* UNIFIED MENU ITEMS */}
        <div className="flex-1 flex justify-center ml-2">
          <Menu setActive={setActive}>
            <div className="flex gap-8 items-center text-sm font-medium">
              <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                <Home size={16} /> Home
              </Link>

              <MenuItem setActive={setActive} active={active} item={hideLabel}>
                <div className="flex flex-col space-y-4 text-sm p-2 w-[240px]">
                  <HoveredLink href="/EncryptImage" className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg"><Lock size={16} className="text-amber-500" /></div>
                    Image in Image
                  </HoveredLink>
                  <HoveredLink href="/EncryptText" className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 rounded-lg"><Lock size={16} className="text-sky-500" /></div>
                    Text in Image
                  </HoveredLink>
                </div>
              </MenuItem>

              <MenuItem setActive={setActive} active={active} item={revealLabel}>
                <div className="flex flex-col space-y-4 text-sm p-2 w-[240px]">
                  <HoveredLink href="/DecryptImage" className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg"><Eye size={16} className="text-emerald-500" /></div>
                    Image from Image
                  </HoveredLink>
                  <HoveredLink href="/DecryptText" className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-lg"><Eye size={16} className="text-rose-500" /></div>
                    Text from Image
                  </HoveredLink>
                </div>
              </MenuItem>

              <Link href="/Instructions" className="hidden md:flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                <BookOpen size={16} /> Guide
              </Link>
            </div>
          </Menu>
        </div>

        {/* COMBINED ACTIONS */}
        <div className="flex items-center gap-3 pl-4 shrink-0">
          <div className="hidden lg:block scale-90">
            <HealthIndicator />
          </div>
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-sky-500/10 transition-colors">
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}