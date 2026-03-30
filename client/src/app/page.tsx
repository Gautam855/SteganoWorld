"use client";
import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BackgroundBeams } from "../../components/ui/background-beams";
import { 
  ArrowRight, Shield, Image as ImageIcon, Lock, Zap, Eye, Send, 
  LockKeyhole, Cpu, Fingerprint, Database, Globe, Layers, Key, 
  Binary, MessageCircle, FileText 
} from "lucide-react";
import { IconBrandGithub, IconBrandLinkedin, IconBrandInstagram } from "@tabler/icons-react";
import Link from "next/link";
import { NavbarDemo } from "../app/nav";
import { cn } from "../../utils/cn";

function FeatureCard({ icon, title, description, color }: any) {
  const isEmerald = color === "emerald";
  const isSky = color === "sky";
  const isAmber = color === "amber";
  const isRose = color === "rose";

  return (
    <motion.div 
        whileHover={{ y: -15, scale: 1.02 }}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="p-12 rounded-[50px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group relative overflow-hidden shadow-2xl"
    >
      <div className={cn(
        "mb-12 p-7 rounded-[32px] w-fit shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform",
        isEmerald && "bg-emerald-500/10 text-emerald-500",
        isSky && "bg-sky-500/10 text-sky-500",
        isAmber && "bg-amber-500/10 text-amber-500",
        isRose && "bg-rose-500/10 text-rose-500"
      )}>
        {icon}
      </div>
      <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter group-hover:tracking-normal transition-all">{title}</h3>
      <p className="text-neutral-500 text-base font-medium leading-[1.8]">{description}</p>
      
      <div className={cn(
        "absolute bottom-0 left-0 h-2 transition-all duration-1000 group-hover:w-full",
        isEmerald && "bg-emerald-500",
        isSky && "bg-sky-500",
        isAmber && "bg-amber-500",
        isRose && "bg-rose-500"
      )} />
    </motion.div>
  );
}

function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden select-none pb-20">
      <NavbarDemo />
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden px-4">
        <div className="absolute top-1/4 -left-20 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[700px] h-[700px] bg-sky-500/10 rounded-full blur-[160px] animate-pulse animate-delay-1000" />
        
        <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center max-w-7xl mx-auto"
        >
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-black uppercase tracking-[0.5em] text-emerald-400 mb-12 backdrop-blur-md shadow-2xl hover:border-emerald-500/30 transition-colors"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Transmission Encrypted
            </motion.div>

            <h1 className="text-7xl md:text-9xl lg:text-[13rem] font-black tracking-tighter leading-[0.75] mb-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-100 to-neutral-500 drop-shadow-2xl">
                STEGANO<span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-400 to-blue-500">WORLD</span>
            </h1>
            
            <p className="text-neutral-500 text-lg md:text-3xl max-w-3xl mx-auto mb-16 font-medium leading-relaxed px-4 tracking-tight">
                Digital invisibility, redefined. <br/> Hide secure payloads in high-res media with zero detection.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 px-4">
                <Link href="/EncryptText" className="group relative w-full sm:w-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-500 rounded-[28px] blur opacity-40 group-hover:opacity-100 transition duration-500" />
                    <div className="relative px-14 py-7 bg-emerald-500 text-white rounded-[24px] font-black text-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.04] shadow-2xl overflow-hidden active:scale-95">
                        <Lock size={28} className="group-hover:rotate-12 transition-transform" />
                        SECURE DATA
                    </div>
                </Link>
                <Link href="/DecryptText" className="group w-full sm:w-auto px-14 py-7 bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 rounded-[24px] font-black text-2xl backdrop-blur-xl transition-all flex items-center justify-center gap-4 active:scale-95 shadow-2xl">
                    <Eye size={28} className="group-hover:scale-110 transition-transform" /> REVEAL
                </Link>
            </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 2 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 group"
        >
            <span className="text-[10px] uppercase font-black tracking-[0.8em] mb-4 h-32 origin-left flex items-center rotate-180 [writing-mode:vertical-lr] text-neutral-500 group-hover:text-emerald-500 transition-colors">INITIALIZING SYSTEM</span>
            <div className="w-[2px] h-20 bg-gradient-to-b from-emerald-500 to-transparent group-hover:h-32 transition-all duration-1000 ease-in-out" />
        </motion.div>
      </section>

      {/* 2. CORE CAPABILITIES (BENTO STYLE) */}
      <section className="relative py-48 px-4">
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
             <FeatureCard 
                icon={<Shield size={32} />}
                title="AES-256 ARMOR"
                description="Double-layer encryption ensures that even if discovered, data remains locked with military grade bit-rotation."
                color="emerald"
             />
             <FeatureCard 
                icon={<Cpu size={32} />}
                title="LSB NEURAL"
                description="High-precision manipulation logic that hides data in the sub-pixel noise, invisible to AI & manual analysis."
                color="sky"
             />
             <FeatureCard 
                icon={<Zap size={32} />}
                title="RUST ENGINE"
                description="Ultra-optimized processing core capable of handling 8K raw images in mere milliseconds."
                color="amber"
             />
             <FeatureCard 
                icon={<Globe size={32} />}
                title="ZERO TRACE"
                description="No logs, no cookies, no tracking. All operations happen in ephemeral memory states for total privacy."
                color="rose"
             />
          </div>
      </section>

      {/* 3. THE SCIENCE OF INVISIBILITY (NEW) */}
      <section className="py-40 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="order-2 lg:order-1 relative">
                    <div className="grid grid-cols-2 gap-6 relative z-10">
                        {[
                            { label: "BIT DATA", val: "1011001" },
                            { label: "NOISE LAYER", val: "0.002%" },
                            { label: "PIXEL ACC.", val: "99.9%" },
                            { label: "SECURE LOG", val: "AES-v2" }
                        ].map((stat, idx) => (
                            <div key={idx} className="p-8 rounded-[36px] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center hover:bg-white/[0.05] transition-all group">
                                <span className="text-[10px] font-black text-neutral-600 mb-2 uppercase tracking-[0.3em]">{stat.label}</span>
                                <span className="text-3xl font-black text-emerald-500 group-hover:scale-110 transition-transform tabular-nums">{stat.val}</span>
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] -z-10" />
                </div>
                <div className="order-1 lg:order-2 space-y-8">
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.8]">THE SCIENCE OF <br/><span className="text-sky-500">INVISIBILITY</span></h2>
                    <p className="text-neutral-500 text-xl font-medium leading-relaxed">
                        Conventional security hides the content. Steganography hides the **existence**. We use the "Least Significant Bit" algorithm to weave your data into the DNA of the pixels themselves.
                    </p>
                    <div className="flex flex-col gap-4">
                        {[
                            { icon: <Binary className="text-emerald-500" />, title: "Bit-Manipulation", desc: "Slightest change that humans can't perceive." },
                            { icon: <Layers className="text-sky-500" />, title: "Pattern Shield", desc: "Randomized pixel scattering to defeat AI filters." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5 items-start">
                                <div className="p-3 bg-white/5 rounded-2xl">{item.icon}</div>
                                <div>
                                    <h4 className="font-black uppercase tracking-widest text-sm mb-1">{item.title}</h4>
                                    <p className="text-neutral-500 text-sm font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 4. PROFESSIONAL USE-CASES (NEW) */}
      <section className="py-40 px-4 relative overflow-hidden mt-20">
        <div className="max-w-7xl mx-auto text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 italic">Built for <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-sky-500">Extremity</span></h2>
            <p className="text-neutral-500 font-bold uppercase tracking-[0.4em] text-xs">Who trusts SteganoWorld?</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
                { icon: <Send size={32} />, title: "Journalists", desc: "Secure anonymous sources by hiding tips in normal travel photos." },
                { icon: <LockKeyhole size={32} />, title: "Activists", desc: "Protect sensitive data while crossing borders with zero digital footprint." },
                { icon: <MessageCircle size={32} />, title: "Privacy Pro", desc: "Hide recovery phrases and hardware wallet keys in plain sight." }
            ].map((use, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-12 rounded-[50px] bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 transition-all group">
                    <div className="p-6 bg-white/5 rounded-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all text-emerald-500">{use.icon}</div>
                    <h4 className="text-2xl font-black mb-4 uppercase tracking-tighter">{use.title}</h4>
                    <p className="text-neutral-500 text-sm leading-relaxed font-medium">{use.desc}</p>
                </div>
            ))}
        </div>
      </section>

      {/* 5. WORKFLOW EVOLUTION */}
      <section className="py-48 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-32">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6">Execution Protocol</h2>
                <div className="w-24 h-2 bg-emerald-500 mx-auto rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-20 relative">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 hidden md:block" />
                {[
                    { title: "INGEST", desc: "Select a high-quality carrier file to host your secret payload.", icon: <ImageIcon /> },
                    { title: "WEAVE", desc: "Our engine manipulates sub-pixels using AES-256 encoded bits.", icon: <Cpu /> },
                    { title: "EMIT", desc: "Download & share your perfectly disguised digital transmission.", icon: <Send /> }
                ].map((step, idx) => (
                    <div key={idx} className="relative flex flex-col items-center text-center group">
                        <div className="w-24 h-24 rounded-[36px] bg-neutral-900 border border-white/10 flex items-center justify-center text-4xl font-black mb-10 group-hover:bg-sky-500 group-hover:text-white transition-all duration-700 z-10 shadow-2xl group-hover:scale-110">
                            {idx + 1}
                        </div>
                        <h4 className="text-2xl font-black mb-6 tracking-tighter uppercase group-hover:text-sky-500 transition-colors">{step.title}</h4>
                        <p className="text-neutral-500 text-sm font-medium px-8 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* 6. TECHNICAL ACTION BENTO */}
      <section className="py-40 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="md:col-span-2 relative p-16 rounded-[60px] bg-gradient-to-br from-emerald-600/15 via-sky-600/5 to-transparent border border-white/[0.05] overflow-hidden group hover:border-emerald-500/50 transition-all cursor-pointer">
                <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ImageIcon size={350} />
                </div>
                <div className="relative z-10 pr-20">
                    <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85]">IMAGE <br/> <span className="text-sky-500">INSIDE</span> IMAGE</h2>
                    <p className="text-neutral-400 mb-12 font-medium max-w-lg leading-relaxed text-xl">Hide full-resolution evidence, documents, or IDs—inside ordinary photos with total pixel transparency.</p>
                    <Link href="/EncryptImage" className="inline-flex items-center gap-5 px-14 py-8 bg-emerald-500 text-white rounded-[28px] font-black text-2xl hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-emerald-500/20">
                        TRY IMAGE PRO <ArrowRight size={28} className="group-hover:translate-x-3 transition-transform" />
                    </Link>
                </div>
            </div>
            <div className="relative p-16 rounded-[60px] bg-white/[0.03] border border-white/[0.05] overflow-hidden group hover:border-sky-500/50 transition-all flex flex-col justify-between">
                <div className="relative z-10 flex flex-col h-full">
                    <div className="p-6 bg-white/[0.05] rounded-[32px] w-fit mb-10 group-hover:rotate-12 transition-transform shadow-inner"><Eye size={48} className="text-sky-500" /></div>
                    <h2 className="text-5xl font-black mb-8 tracking-tighter uppercase underline underline-offset-[12px] decoration-emerald-500/50 decoration-[6px]">RECOVERY</h2>
                    <p className="text-neutral-500 mb-12 font-medium text-lg leading-relaxed">Already have an encrypted transmission? Our engine is ready to reveal.</p>
                    <Link href="/DecryptImage" className="mt-auto inline-flex items-center justify-center gap-3 px-10 py-7 border border-white/10 rounded-[28px] font-black hover:bg-white/5 transition-all uppercase tracking-[0.3em] text-xs shadow-2xl">
                        DECRYPT PULSE
                    </Link>
                </div>
                <BackgroundBeams className="opacity-[0.03]" />
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-32 border-t border-white/5 mt-40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20 group hover:rotate-12 transition-transform cursor-pointer">
                  <Shield size={24} className="text-white" />
                </div>
                <span className="font-black text-4xl tracking-tighter uppercase">STEGANO<span className="text-emerald-500">WORLD</span></span>
              </div>
              <p className="text-neutral-700 text-sm font-black uppercase tracking-[0.4em]">Secure. Anonymous. Lossless.</p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-8">
              <div className="flex gap-6">
                <Link href="https://github.com/Gautam855" target="_blank" className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all outline-none" title="GitHub">
                    <IconBrandGithub size={24} />
                </Link>
                <Link href="https://www.linkedin.com/in/gautanverma" target="_blank" className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all outline-none" title="LinkedIn">
                    <IconBrandLinkedin size={24} />
                </Link>
                <Link href="https://instagram.com/gautam_verma_855" target="_blank" className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all outline-none" title="Instagram">
                    <IconBrandInstagram size={24} />
                </Link>
              </div>
              <div className="flex gap-10">
                <Link href="https://github.com/Gautam855" target="_blank" className="text-[11px] font-black uppercase tracking-[0.6em] text-neutral-600 hover:text-emerald-500 transition-colors">GITHUB</Link>
                <Link href="/Instructions" className="text-[11px] font-black uppercase tracking-[0.6em] text-neutral-600 hover:text-emerald-500 transition-colors">DOCS</Link>
                <Link href="#" className="text-[11px] font-black uppercase tracking-[0.6em] text-neutral-600 hover:text-emerald-500 transition-colors">SECURITY</Link>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-neutral-800 text-[11px] font-black uppercase tracking-[0.4em]">© {new Date().getFullYear()} ENCRYPTED TRANSMISSION v3.0</p>
             <p className="text-neutral-800 text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-2">Built with <Zap size={10} className="text-emerald-500" /> by Gautam</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;