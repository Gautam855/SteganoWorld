"use client"

import React from "react"
import { NavbarDemo } from "../nav"
import { BackgroundBeams } from "../../../components/ui/background-beams"
import { motion } from "framer-motion"
import { HelpCircle, ShieldCheck, Lock, ImageIcon, Type, Search, Eye, Download } from "lucide-react"

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-40 px-4">
      <NavbarDemo />
      
      <div className="relative z-10 container mx-auto pt-48 max-w-4xl">
        <header className="text-center mb-16 space-y-4">
           <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-500 font-bold text-xs uppercase tracking-widest inline-block"
           >
              Simple Help Guide
           </motion.div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tighter">
              How to <span className="text-sky-500">Use</span>? 📖
           </h1>
           <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
             A quick guide to hiding and finding your secret data.
           </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* TEXT HIDING */}
           <SimpleSection 
              icon={<Type className="text-sky-500" />}
              title="Hide Text in Photo"
              steps={[
                "Open 'Encrypt > Text-in-Image'.",
                "Pick an image where you want to hide text.",
                "Type your secret message.",
                "Set a password (don't forget it!).",
                "Download your new 'Secret Image'."
              ]}
           />

           {/* TEXT FINDING */}
           <SimpleSection 
              icon={<Search className="text-emerald-500" />}
              title="Find Text from Photo"
              steps={[
                "Open 'Decrypt > Text-from-Image'.",
                "Upload the image that has the hidden text.",
                "Enter your secret password.",
                "The message will appear on your screen.",
                "Copy or save your message."
              ]}
           />

           {/* IMAGE HIDING */}
           <SimpleSection 
              icon={<ImageIcon className="text-amber-500" />}
              title="Hide Photo in Photo"
              steps={[
                "Go to 'Encrypt > Image-in-Image'.",
                "Select a main photo (Carrier).",
                "Select the photo you want to hide (Secret).",
                "Set a secure password.",
                "Download the merged image."
              ]}
           />

           {/* IMAGE FINDING */}
           <SimpleSection 
              icon={<Eye className="text-rose-500" />}
              title="Find Photo from Photo"
              steps={[
                "Go to 'Decrypt > Image-from-Image'.",
                "Upload the secret image file.",
                "Type the password to unlock it.",
                "The hidden photo will pop up in a modal.",
                "Download the recovered photo."
              ]}
           />
        </div>

        {/* BASIC TIPS */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-8 rounded-[30px] border border-border">
           <div className="flex gap-4">
              <Lock className="text-amber-500 shrink-0" size={24} />
              <div className="space-y-1">
                 <h4 className="font-bold">Forget Password?</h4>
                 <p className="text-sm text-muted-foreground">If you forget the password, you can never see the hidden message again. We don't save passwords.</p>
              </div>
           </div>
           <div className="flex gap-4">
              <ShieldCheck className="text-sky-500 shrink-0" size={24} />
              <div className="space-y-1">
                 <h4 className="font-bold">Use PNG Files</h4>
                 <p className="text-sm text-muted-foreground">Always use PNG images for best results. JPG can break your hidden data!</p>
              </div>
           </div>
        </div>
      </div>
      <BackgroundBeams />
    </div>
  )
}

function SimpleSection({ icon, title, steps }: any) {
  return (
    <div className="p-8 rounded-[28px] border border-border bg-card/40 backdrop-blur-md space-y-6">
       <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted">{icon}</div>
          <h2 className="text-xl font-black">{title}</h2>
       </div>
       <div className="space-y-3">
          {steps.map((s: string, i: number) => (
             <div key={i} className="flex gap-3 text-sm font-bold text-muted-foreground">
                <span className="text-sky-500">{i+1}.</span> {s}
             </div>
          ))}
       </div>
    </div>
  )
}
