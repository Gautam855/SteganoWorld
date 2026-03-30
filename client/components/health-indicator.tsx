"use client"

import React, { useState, useEffect } from "react"
import { API_BASE_URL } from "../src/utils/constants"
import { Activity, Globe, WifiOff, Loader2 } from "lucide-react"

export function HealthIndicator() {
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking")

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      if (response.ok) {
        setStatus("online")
      } else {
        setStatus("offline")
      }
    } catch (error) {
      setStatus("offline")
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background dark:bg-white/5 shadow-sm text-xs font-medium transition-all hover:shadow-md cursor-help group" title="Backend Status">
      <div className="relative flex items-center justify-center">
        {status === "checking" ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"}`} />
            <span className={`absolute h-2 w-2 rounded-full animate-ping ${status === "online" ? "bg-emerald-500" : "bg-rose-500"} opacity-75`} />
          </>
        )}
      </div>
      
      <span className="flex items-center gap-1.5">
        {status === "online" ? (
          <span className="text-foreground group-hover:text-emerald-500 transition-colors">Server Live</span>
        ) : status === "checking" ? (
          <span className="text-muted-foreground italic">Pings...</span>
        ) : (
          <span className="text-rose-500">Backend Down</span>
        )}
      </span>
      
      <div className="flex items-center gap-1 pl-1.5 ml-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
         {status === "online" ? <Activity size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
      </div>
    </div>
  )
}
