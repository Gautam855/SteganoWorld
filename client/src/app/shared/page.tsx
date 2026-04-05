'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSharedLink, downloadStegoImage } from '../chat/api';
import { extractDataFromImage, decryptSharedHiddenData } from '../chat/stegano';
import { getKeys } from '../chat/keyStore';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Loader2, Flame, AlertOctagon } from 'lucide-react';

function SharedLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkId = searchParams.get('id');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [keys, setKeys] = useState<{ userId: string; privateKey: string } | null>(null);

  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedImage, setDecryptedImage] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);

  // 1. Check Auth (Requires being logged in to SteganoChat)
  useEffect(() => {
    async function checkAuth() {
      try {
        const k = await getKeys();
        if (k && k.token) {
          setIsAuthenticated(true);
          setKeys({ userId: k.userId, privateKey: k.encryptionPrivateKey });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch Link Data once authenticated
  useEffect(() => {
    if (!isAuthenticated || !keys) return;
    const currentLinkId = searchParams.get('id');
    if (!currentLinkId) {
      setError("No link ID provided in URL.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getSharedLink(currentLinkId!);
        setLinkData(data);
        
        // Fetch the image
        const blob = await downloadStegoImage(data.image_id);
        setImageUrl(URL.createObjectURL(blob));

      } catch (err: any) {
        setError(err.message || "Failed to load link or you do not have access.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [linkId, isAuthenticated, keys]);

  // 3. Decode the stego image logic
  const handleDecode = async () => {
    if (!imageUrl || !linkData || !keys) return;
    setDecoding(true);
    try {
      // Fetch blob from DOM
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      // Extract raw steganography string payload
      const payloadString = await extractDataFromImage(blob);
      const payload = JSON.parse(payloadString);

      if (!payload.cipher || !payload.iv) throw new Error("Invalid steganography format.");

      // Decrypt using Zero Knowledge
      const rawText = await decryptSharedHiddenData(
        payload, 
        linkData.encrypted_aes_key, 
        keys.privateKey
      );
      
      let finalDecryptedText = rawText;
      let finalDecryptedImage = null;
      
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.__stegano_v1) {
            finalDecryptedText = parsed.t || '';
            finalDecryptedImage = parsed.i || null;
        }
      } catch {}
      
      setDecryptedText(finalDecryptedText);
      setDecryptedImage(finalDecryptedImage);

    } catch (err: any) {
      console.error(err);
      alert("Decryption failed. " + err.message);
    } finally {
      setDecoding(false);
    }
  };

  if (authLoading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center relative p-4">
        <div className="w-full max-w-md bg-neutral-900 border border-white/5 p-8 rounded-2xl shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Shield className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Authentication Required</h2>
          <p className="text-neutral-400 mb-8 text-sm">
            You must be logged in to SteganoChat to view secure shared links.
          </p>
          <button 
            onClick={() => router.push('/chat')}
            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white font-sans flex flex-col p-4 md:p-8 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-emerald-500/20 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <Shield size={24} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
            Secure Shared Content
          </h1>
          <p className="text-xs text-emerald-500/70 uppercase tracking-widest font-bold">Zero-Knowledge Encrypted</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="py-20 text-center text-neutral-400 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <p>Verifying access and securely downloading content...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center mt-10">
            <Lock size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-neutral-400 max-w-md mx-auto">{error}</p>
            <button 
              onClick={() => router.push('/chat')}
              className="mt-6 px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
            >
              Return Home
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr,400px] gap-8 items-start">
            
            {/* Visual Image Side */}
            <div className="bg-neutral-900 border border-white/5 rounded-3xl p-4 shadow-xl">
              <div className="aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative group">
                {imageUrl && <img src={imageUrl} className="w-full h-full object-contain" alt="Secured Content" />}
                
                {/* Decode Overlay overlay */}
                {(!decryptedText && !decryptedImage) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={handleDecode}
                      disabled={decoding}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                    >
                      {decoding ? <Loader2 className="animate-spin" /> : <Eye />}
                      {decoding ? 'Decrypting...' : 'Decrypt Hidden Data'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Information Side */}
            <div className="space-y-6">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-emerald-400 font-bold mb-4">
                  <Shield size={20} />
                  Access Granted
                </div>
                <div className="space-y-3 text-sm text-neutral-300">
                  <p className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-neutral-500">Shared By</span>
                    <span className="font-semibold text-white">{linkData.owner_name}</span>
                  </p>
                  <p className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-neutral-500">Your Role</span>
                    <span className="font-semibold text-emerald-400">
                      {linkData.is_owner ? 'Owner' : 'Authorized Viewer'}
                    </span>
                  </p>
                  
                  {linkData.burn_after_views > 0 && (
                    <p className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-neutral-500 flex items-center gap-1"><Flame size={12} className="text-rose-500"/> Burn Limits</span>
                      <span className="font-semibold text-rose-400">
                        {linkData.destroyed_now ? 'Destroyed Now' : `${linkData.views_left} views left`}
                      </span>
                    </p>
                  )}
                  
                  <p className="flex justify-between pb-1">
                    <span className="text-neutral-500">Encryption</span>
                    <span className="font-mono text-xs mt-0.5 bg-black/30 px-2 py-0.5 rounded">AES-256-GCM</span>
                  </p>
                </div>
              </div>

              {linkData.destroyed_now && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertOctagon className="text-rose-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-rose-500 font-bold text-sm mb-1">Link Self-Destructed</h4>
                    <p className="text-xs text-rose-200/80 leading-relaxed">
                      The view limit has been reached. The server has permanently destroyed the encrypted image and all access records from the vault.
                    </p>
                  </div>
                </div>
              )}

              {(decryptedText || decryptedImage) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-widest block">Decrypted Message</h3>
                  
                  {decryptedImage && (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black">
                      <img src={decryptedImage} alt="Extracted Image" className="w-full object-contain" />
                    </div>
                  )}
                  
                  {decryptedText && (
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {decryptedText}
                    </p>
                  )}
                </motion.div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedLinkPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-[#0a0a0a] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
      <SharedLinkContent />
    </Suspense>
  );
}
