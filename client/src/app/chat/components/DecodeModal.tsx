'use client';

import { useState, useRef, useCallback } from 'react';
import { extractFromImage, extractDataFromImage, decryptSharedHiddenData } from '../stegano';
import { getSharedLink, downloadStegoImage } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Eye, ShieldAlert, ShieldCheck, Loader2, Lock, ImageIcon, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface DecodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  privateKey: string;
}

export default function DecodeModal({ isOpen, onClose, privateKey }: DecodeModalProps) {
  const [mode, setMode] = useState<'image' | 'link'>('image');
  
  // Image mode state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  
  // Link mode state
  const [linkInput, setLinkInput] = useState('');
  
  // Common state
  const [status, setStatus] = useState<'idle' | 'decoding' | 'success' | 'no_data' | 'no_access'>('idle');
  const [decodedText, setDecodedText] = useState('');
  const [decodedImage, setDecodedImage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    setStatus('idle');
    setDecodedText('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const resetState = () => {
    setStatus('idle');
    setDecodedText('');
    setDecodedImage('');
    setErrorMsg('');
  };

  const handleModeChange = (newMode: 'image' | 'link') => {
    setMode(newMode);
    resetState();
  };

  const handleDecodeImage = async () => {
    if (!selectedImage) return;

    setStatus('decoding');
    setDecodedText('');
    setErrorMsg('');

    try {
      const blob = new Blob([await selectedImage.arrayBuffer()], { type: 'image/png' });

      let text = '';
      let decoded = false;

      for (const isSender of [false, true]) {
        try {
          let rawText = '';
          rawText = await extractFromImage(blob, privateKey, isSender);
          if (rawText) {
            decoded = true;
            try {
              const parsed = JSON.parse(rawText);
              if (parsed.__stegano_v1) {
                text = parsed.t || '';
                setDecodedImage(parsed.i || '');
              } else {
                text = rawText;
              }
            } catch {
              text = rawText;
            }
            break;
          }
        } catch {
          // Try next
        }
      }

      if (decoded && text) {
        setDecodedText(text);
        setStatus('success');
      } else {
        setStatus('no_data');
        setErrorMsg('No hidden data found in this image, or it was not encrypted for you.');
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('no hidden data') || msg.includes('corrupted')) {
        setStatus('no_data');
        setErrorMsg('No hidden steganographic data found in this image.');
      } else {
        setStatus('no_access');
        setErrorMsg('This image contains hidden data, but your key cannot decrypt it. You don\'t have access.');
      }
    }
  };

  const handleDecodeLink = async () => {
    if (!linkInput.trim()) {
      setErrorMsg('Please enter a link or ID');
      return;
    }

    setStatus('decoding');
    setDecodedText('');
    setErrorMsg('');

    try {
      // Extract ID from URL if they pasted the full link, or assume they pasted the ID directly
      let idToFetch = linkInput.trim();
      if (idToFetch.includes('?id=')) {
        idToFetch = idToFetch.split('?id=')[1].split('&')[0];
      } else if (idToFetch.includes('/shared/')) {
        // legacy format support just in case
        const parts = idToFetch.split('/shared/');
        idToFetch = parts[parts.length - 1];
      }

      // Fetch metadata from backend
      const linkData = await getSharedLink(idToFetch);
      
      // Download the image
      const stegoBlob = await downloadStegoImage(linkData.image_id);
      
      // Extract raw steganography string payload
      const payloadString = await extractDataFromImage(stegoBlob);
      const payload = JSON.parse(payloadString);

      if (!payload.cipher || !payload.iv) throw new Error("Invalid steganography format.");

      // Decrypt using Zero Knowledge
      const rawText = await decryptSharedHiddenData(
        payload, 
        linkData.encrypted_aes_key, 
        privateKey
      );
      
      let finalDecodedText = rawText;
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.__stegano_v1) {
            finalDecodedText = parsed.t || '';
            setDecodedImage(parsed.i || '');
        }
      } catch {}
      
      setDecodedText(finalDecodedText);
      setStatus('success');

    } catch (err: any) {
      const msg = (err?.message || err?.error || '').toLowerCase();
      setStatus('no_access');
      setErrorMsg(err?.message || err?.error || 'Failed to decode. Ensure the link is correct and you have access.');
    }
  };

  const handleDecode = () => {
    if (mode === 'image') {
      handleDecodeImage();
    } else {
      handleDecodeLink();
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setImagePreview('');
    setLinkInput('');
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Extract Hidden Data</h3>
                <p className="text-xs text-neutral-500">Reveal data inside images or shared links</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-neutral-400">
              <X size={20} />
            </button>
          </div>

           {/* Mode Selector */}
           <div className="px-6 pt-5 shrink-0">
            <div className="flex p-1 bg-black/50 border border-white/5 rounded-xl text-sm font-semibold">
              <button
                onClick={() => handleModeChange('image')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  mode === 'image' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <ImageIcon size={16} /> Image File
              </button>
              <button
                onClick={() => handleModeChange('link')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  mode === 'link' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <LinkIcon size={16} /> Shared Link
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            {/* Info */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold">
              <Lock size={14} className="shrink-0" />
              <span>Your private key will be used locally to decrypt the data.</span>
            </div>

            {/* Input Types */}
            {mode === 'image' ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                  Stego Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-white/10">
                    <img src={imagePreview} alt="Selected" className="w-full max-h-56 object-contain bg-neutral-950" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 border-2 border-dashed border-neutral-700 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-3 text-neutral-500 hover:text-amber-400 transition-all group"
                  >
                    <Upload size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Upload a stego image</span>
                    <span className="text-[10px] text-neutral-600">PNG preferred — lossless format preserves hidden data</span>
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                  Secure Link URL or ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={16} className="text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(e) => {
                      setLinkInput(e.target.value);
                      if (status !== 'idle') resetState();
                    }}
                    placeholder="http://localhost:3000/shared?id=..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pt-3 pb-3 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm font-medium"
                    autoComplete="off"
                  />
                </div>
              </motion.div>
            )}

            {/* Result Area */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>Decrypted successfully with your private key!</span>
                </div>
                <div className="bg-neutral-950 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">
                    🔓 Hidden Data Evaluated
                  </label>
                  
                  {decodedImage && (
                    <div className="rounded-xl overflow-hidden border border-white/5 bg-black">
                      <img src={decodedImage} alt="Secret Extracted" className="w-full object-contain" />
                    </div>
                  )}

                  {decodedText && (
                    <p className="text-neutral-100 text-base leading-relaxed whitespace-pre-wrap">
                      {decodedText}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {(status === 'no_data' || status === 'no_access') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${
                  status === 'no_data'
                    ? 'bg-neutral-800/50 border-neutral-700 text-neutral-400'
                    : 'bg-rose-950/30 border-rose-500/20 text-rose-400'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === 'no_data' ? 'bg-neutral-700/50 text-neutral-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {status === 'no_data' ? <AlertCircle size={20} /> : <ShieldAlert size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      {status === 'no_data' ? 'No Hidden Data Found' : 'Access Denied / Error'}
                    </p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      {errorMsg}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Action */}
          <div className="px-6 py-4 border-t border-white/5 shrink-0 bg-neutral-900">
            <button
              onClick={handleDecode}
              disabled={(mode === 'image' ? !selectedImage : !linkInput) || status === 'decoding'}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] active:scale-[0.98]"
            >
              {status === 'decoding' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Extracting & Decrypting...
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Decode '{mode === 'image' ? 'Image' : 'Link'}'
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
