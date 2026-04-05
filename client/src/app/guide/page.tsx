"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Lock, Cpu, Eye, Send, Code, BookOpen, Layers, 
  Terminal, Globe, MessageCircle, FileDown, CheckCircle2,
  Flame, Image as ImageIcon
} from "lucide-react";
import { NavbarDemo } from "../nav";

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState<'user' | 'technical'>('user');

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <NavbarDemo />
      
      {/* HEADER */}
      <div className="pt-32 pb-16 px-4 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex justify-center p-4 bg-white/5 rounded-3xl mb-8 shadow-2xl backdrop-blur-sm border border-white/10">
            <BookOpen size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500">
            Official Guide
          </h1>
          <p className="text-neutral-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about operating SteganoWorld securely. Choose your protocol level below.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-5xl mx-auto px-4 mt-12 mb-16">
        <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm w-full md:w-fit mx-auto">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex items-center justify-center gap-2 px-8 py-4 rounded-[12px] font-bold text-sm uppercase tracking-widest transition-all sm:w-64 ${
              activeTab === 'user' 
                ? 'bg-emerald-500 text-white shadow-lg' 
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe size={18} /> Normal User
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`flex items-center justify-center gap-2 px-8 py-4 rounded-[12px] font-bold text-sm uppercase tracking-widest transition-all sm:w-64 ${
              activeTab === 'technical' 
                ? 'bg-sky-500 text-white shadow-lg' 
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal size={18} /> Engineers
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 pb-48 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'user' ? (
            <motion.div
              key="user-guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-16"
            >
              <section>
                <SectionTitle icon={<MessageCircle />} title="1. Sending a Secure Chat" color="emerald" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <StepCard step={1} title="Select a Contact" desc="Open the Chat page and look up a user by their username (e.g., 'Alice123'). Click to start a secure channel." />
                  <StepCard step={2} title="Type & Send" desc="Just type your message in the chat bar and hit send. Everything is automatically End-to-End Encrypted (E2EE) using AES-256." />
                </div>
              </section>

              <section>
                <SectionTitle icon={<ImageIcon />} title="2. Sending Stegano Images" color="indigo" />
                <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 mt-8 space-y-6">
                  <p className="text-neutral-300 leading-relaxed font-medium">To hide a secret message inside an image directly in the chat:</p>
                  <ul className="space-y-4">
                    <ListItem>Click the <strong>Eye Icon</strong> next to the chat text bar.</ListItem>
                    <ListItem>Upload a generic <strong>Cover Image</strong> (the image people will see).</ListItem>
                    <ListItem>Type your <strong>Secret Message</strong>. (You can also optionally attach a <strong>Secret Image</strong> to hide inside!)</ListItem>
                    <ListItem>If your payload is too large, use the built-in <strong>Compress Button</strong>.</ListItem>
                    <ListItem>Click <strong>Encrypt & Embed</strong>. The server NEVER sees your secret text or secret image.</ListItem>
                  </ul>
                </div>
              </section>

              <section>
                <SectionTitle icon={<Flame />} title="3. Creating Burn-after-Reading Links" color="rose" />
                <div className="bg-neutral-900 border border-rose-500/10 rounded-3xl p-8 mt-8 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Flame size={200} /></div>
                  <p className="text-neutral-300 leading-relaxed font-medium relative z-10">You can create temporary <strong>Zero-Knowledge Shared Links</strong> that self-destruct.</p>
                  <ul className="space-y-4 relative z-10">
                    <ListItem>Go to the Chat section and click the <strong>Generate Shared Link</strong> button on the sidebar.</ListItem>
                    <ListItem>Fill out your cover image, secret message, and secret image details.</ListItem>
                    <ListItem>Select the <strong>Self-Destruct (Burn) limit</strong> (e.g., Burn after 1 view).</ListItem>
                    <ListItem>Select which existing users are allowed to decode the link.</ListItem>
                    <ListItem>After the link hits its view limit, it is <strong>permanently deleted from our servers forever</strong>.</ListItem>
                  </ul>
                </div>
              </section>
              
              <section>
                <SectionTitle icon={<Lock />} title="4. Reading Hidden Data" color="emerald" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <StepCard step={1} title="Inside Chat" desc="If someone sends you a Stegano Image in chat, just click the 'Extract Hidden Message' button below the image." />
                  <StepCard step={2} title="Via Shared Link" desc="If you receive a Shared Link, go to 'Decode Image' from the top nav, open the Shared Link tab, and paste the URL. It uses your browser's private key to decrypt safely." />
                </div>
              </section>

            </motion.div>
          ) : (
            <motion.div
              key="tech-guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-16"
            >
              <section>
                <SectionTitle icon={<Shield />} title="1. Encryption Architecture" color="sky" />
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-8 mt-8 space-y-6">
                  <h3 className="text-xl font-bold text-sky-400">Hybrid RSA-OAEP + AES-GCM</h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Every user has an automatically generated <strong>RSA-OAEP 2048-bit</strong> keypair stored locally in their browser (`IndexedDB` & localStorage). 
                    When Alice sends a message to Bob:
                  </p>
                  <ol className="list-decimal list-inside space-y-3 text-neutral-300 font-medium">
                    <li>Alice's browser generates a random massive symmetric key (AES-256).</li>
                    <li>The message (or Stegano structure) is encrypted using this AES key + a random IV.</li>
                    <li>The AES key is then encrypted <strong>twice</strong>: once with Alice's Public Key, once with Bob's Public Key.</li>
                    <li>The server only receives the encrypted payload and the encrypted AES keys.</li>
                  </ol>
                  <p className="text-neutral-500 mt-4 text-sm bg-black/50 p-4 rounded-xl border border-white/5">
                    <strong>Fact:</strong> The server cannot read the AES key, therefore it can never decrypt the payload.
                  </p>
                </div>
              </section>

              <section>
                <SectionTitle icon={<Layers />} title="2. Advanced LSB Steganography" color="emerald" />
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-8 mt-8 space-y-6">
                  <p className="text-neutral-400 leading-relaxed mb-6">
                    We utilize a <strong>custom modified Least Significant Bit (LSB) Engine</strong> to inject encrypted payloads directly into WebP/PNG image channels. 
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                      <h4 className="text-emerald-500 font-bold mb-3 uppercase text-xs tracking-widest">Image Limits</h4>
                      <p className="text-sm text-neutral-400">
                        Max payload supported corresponds to `(width * height * 3) / 8` bytes. App allows uploads up to <strong>20 MB</strong> per payload via Flask `MAX_CONTENT_LENGTH`.
                      </p>
                    </div>
                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                      <h4 className="text-emerald-500 font-bold mb-3 uppercase text-xs tracking-widest">JSON Payload V1</h4>
                      <p className="text-sm text-neutral-400">
                        We support inserting raw text OR base64-encoded inner images! <br/><br/>
                        <code className="text-[10px] text-emerald-300 bg-emerald-900/30 p-1.5 rounded">{`{ "__stegano_v1": true, "t": "Text", "i": "data:image..." }`}</code> 
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle icon={<Flame />} title="3. Burn-After-Reading Mechanics" color="rose" />
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-8 mt-8 space-y-6">
                  <p className="text-neutral-400 leading-relaxed mb-6">
                    Our platform supports genuine ephemerality through strict server-side state enforcement.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                      <Code className="text-rose-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <strong className="text-rose-400 block mb-1">State Tracking</strong>
                        <span className="text-neutral-400 text-sm">The <code>SharedLink</code> model stores <code>burn_after_views</code> and <code>views_count</code>. The zero-knowledge payload remains intact while <code>view_count {'<'} burn_after_views</code>.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                      <Terminal className="text-rose-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <strong className="text-rose-400 block mb-1">Hard DB Flush</strong>
                        <span className="text-neutral-400 text-sm">Upon hitting the cap, the Python backend executes an immediate SQL <code>DELETE</code> cascading destruction of the encrypted blob mapping. There are no secondary archives.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Subcomponents
function SectionTitle({ icon, title, color }: { icon: React.ReactNode, title: string, color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    indigo: 'text-indigo-400',
    rose: 'text-rose-400',
  };
  return (
    <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-4 ${colors[color] || 'text-white'}`}>
      {icon} {title}
    </h2>
  );
}

function StepCard({ step, title, desc }: { step: number, title: string, desc: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[32px] hover:bg-white/[0.05] transition-colors relative">
      <div className="absolute top-4 right-6 text-6xl font-black text-white/[0.03] pointer-events-none opacity-50 select-none">{step}</div>
      <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tighter">{title}</h3>
      <p className="text-neutral-400 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
      <span className="text-neutral-400">{children}</span>
    </li>
  );
}
