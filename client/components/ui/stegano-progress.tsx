"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Loader2 } from "lucide-react"

interface SteganoProgressProps {
  progress: number
  isVisible: boolean
  statusText?: string
}

export function SteganoProgress({ progress, isVisible, statusText }: SteganoProgressProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div className="bg-background border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl glass-morphism">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative h-20 w-20 flex items-center justify-center bg-sky-500/10 rounded-full">
                 <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-sky-500/20"
                 />
                 <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 />
                 <ShieldCheck className="text-sky-500 h-10 w-10" />
              </div>

              <div className="space-y-2 w-full">
                <h3 className="text-xl font-bold text-foreground">
                  {progress < 100 ? "Processing Data..." : "Finalizing..."}
                </h3>
                <p className="text-sm text-muted-foreground italic h-5">
                   {statusText || (progress < 100 ? `Sending large data packets...` : "Almost there!")}
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full space-y-3">
                <div className="h-4 w-full bg-muted/50 rounded-full overflow-hidden border border-border p-1">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>TRANSFERRING</span>
                  <span className="text-sky-500">{Math.round(progress)}%</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
                 <Loader2 size={14} className="animate-spin" />
                 Secure stego-channel established
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
