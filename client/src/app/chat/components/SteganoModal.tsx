'use client';

import { useState, useRef, useCallback } from 'react';
import { embedInImage } from '../stegano';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Lock, Send, Eye, AlertTriangle, Loader2 } from 'lucide-react';

interface SteganoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (stegoBlob: Blob, secretText: string) => Promise<void>;
  recipientName: string;
  recipientPublicKey: string;
  senderPublicKey: string;
}

export default function SteganoModal({
  isOpen,
  onClose,
  onSend,
  recipientName,
  recipientPublicKey,
  senderPublicKey,
}: SteganoModalProps) {
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [secretText, setSecretText] = useState('');
  const [secretImagePreview, setSecretImagePreview] = useState<string>('');
  const [secretPayloadString, setSecretPayloadString] = useState('');
  const [needsCompression, setNeedsCompression] = useState(false);
  const [compressing, setCompressing] = useState(false);
  
  const [stegoPreview, setStegoPreview] = useState<string>('');
  const [stegoBlob, setStegoBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'idle' | 'encoding' | 'encoded' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [capacity, setCapacity] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secretImageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setCoverImage(file);
    setError('');
    setStegoPreview('');
    setStegoBlob(null);
    setStatus('idle');
    setNeedsCompression(false);

    // Preview + calculate capacity
    const reader = new FileReader();
    reader.onload = () => {
      setCoverPreview(reader.result as string);

      // Calculate capacity
      const img = new Image();
      img.onload = () => {
        const maxBytes = Math.floor((img.width * img.height * 3) / 8) - 4;
        setCapacity(maxBytes);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSecretImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setStegoPreview('');
    setStegoBlob(null);
    setStatus('idle');
    setNeedsCompression(false);
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      setSecretImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Helper to compress via Canvas
  const compressDataUrl = (dataUrl: string, quality: number, scale: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  const handleCompress = async () => {
    if (!secretImagePreview) return;
    setCompressing(true);
    let currentPreview = secretImagePreview;
    let targetPayload = '';
    let scale = 0.8;
    let quality = 0.7;
    
    // Iteratively compress until it fits, up to 5 times
    for (let i = 0; i < 5; i++) {
        currentPreview = await compressDataUrl(currentPreview, quality, scale);
        targetPayload = JSON.stringify({ __stegano_v1: true, t: secretText.trim(), i: currentPreview });
        // Calculate max encrypted string length roughly
        const charLen = new TextEncoder().encode(targetPayload).length + 1024; // safety margin for AES padding
        
        if (charLen <= capacity) {
            setSecretImagePreview(currentPreview);
            setNeedsCompression(false);
            setCompressing(false);
            setError('');
            return;
        }
        scale *= 0.7;
        quality *= 0.8;
    }
    
    setCompressing(false);
    setError('Message too big even after compression! Try a higher-resolution cover image or smaller text.');
  };

  const handleEncode = useCallback(async () => {
    if (!coverImage) return;

    let targetPayload = secretText.trim();
    if (secretImagePreview) {
       targetPayload = JSON.stringify({ __stegano_v1: true, t: secretText.trim(), i: secretImagePreview });
    }

    // Check size
    const expectedLength = new TextEncoder().encode(targetPayload).length + 1024; // buffer mapping
    if (expectedLength > capacity) {
       if (secretImagePreview) {
           setNeedsCompression(true);
           setError(`Attached secret image + text is too large (${(expectedLength/1024).toFixed(1)}KB) for this Cover Image (${(capacity/1024).toFixed(1)}KB). Please compress the image or use a bigger Cover Image.`);
       } else {
           setError('Text message is too large for this image.');
       }
       return;
    }

    setStatus('encoding');
    setError('');

    try {
      const result = await embedInImage(
        coverImage,
        targetPayload,
        recipientPublicKey,
        senderPublicKey
      );

      setSecretPayloadString(targetPayload);
      setStegoBlob(result.blob);
      const previewUrl = URL.createObjectURL(result.blob);
      setStegoPreview(previewUrl);
      setStatus('encoded');
    } catch (err: any) {
      setError(err.message || 'Failed to embed message in image');
      setStatus('error');
    }
  }, [coverImage, secretText, secretImagePreview, recipientPublicKey, senderPublicKey, capacity]);

  const handleSend = useCallback(async () => {
    if (!stegoBlob) return;

    setStatus('sending');
    try {
      await onSend(stegoBlob, secretPayloadString);
      // Reset state
      setCoverImage(null);
      setCoverPreview('');
      setSecretText('');
      setSecretImagePreview('');
      setSecretPayloadString('');
      setStegoPreview('');
      setStegoBlob(null);
      setStatus('idle');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send stego image');
      setStatus('error');
    }
  }, [stegoBlob, secretPayloadString, onSend, onClose]);

  const handleClose = () => {
    if (stegoPreview) URL.revokeObjectURL(stegoPreview);
    setCoverImage(null);
    setCoverPreview('');
    setSecretText('');
    setSecretImagePreview('');
    setStegoPreview('');
    setStegoBlob(null);
    setStatus('idle');
    setError('');
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
          className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Stegano Message</h3>
                <p className="text-xs text-neutral-500">Hide a secret message inside an image</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-neutral-400">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Recipient info */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
              <Lock size={14} />
              <span>Encrypted with {recipientName}'s public key — only they can read it</span>
            </div>

            {/* Cover image selection */}
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                Cover Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {coverPreview ? (
                <div className="relative group rounded-2xl overflow-hidden border border-white/10">
                  <img src={coverPreview} alt="Cover" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold"
                  >
                    Change Image
                  </button>
                  {capacity > 0 && (
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[10px] font-bold text-emerald-400">
                      Capacity: {capacity > 1024 ? `${(capacity / 1024).toFixed(0)} KB` : `${capacity} bytes`}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center gap-3 text-neutral-500 hover:text-emerald-400 transition-all group"
                >
                  <ImagePlus size={32} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Click to select cover image</span>
                  <span className="text-[10px] text-neutral-600">PNG, JPG, WebP — larger images hold more data</span>
                </button>
              )}
            </div>

            {/* Secret message */}
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                Secret Message (Text)
              </label>
              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Type the message to hide..."
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-neutral-600 resize-none mb-3"
              />
              
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                Secret Attachement (Image) [Optional]
              </label>
              <input
                ref={secretImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleSecretImageSelect}
                className="hidden"
              />
              {secretImagePreview ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 h-24 w-full flex items-center justify-center bg-neutral-950">
                  <img src={secretImagePreview} alt="Secret preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setSecretImagePreview('')}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-lg hover:bg-rose-500/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/80 rounded text-[10px] font-bold text-white">
                    {Math.round(JSON.stringify({__stegano_v1:true, t:secretText, i:secretImagePreview}).length / 1024)} KB payload
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => secretImageInputRef.current?.click()}
                  className="w-full h-12 border border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-emerald-400 transition-all"
                >
                  <ImagePlus size={16} />
                  <span className="text-xs font-medium">Attach secret image</span>
                </button>
              )}
            </div>

            {/* Error & Compression message */}
            {error && (
              <div className="flex flex-col gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
                {needsCompression && (
                  <button
                    onClick={handleCompress}
                    disabled={compressing}
                    className="mt-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 w-full transition-colors"
                  >
                    {compressing ? <Loader2 size={14} className="animate-spin" /> : null}
                    {compressing ? 'Compressing...' : 'Compress Secret Image Format'}
                  </button>
                )}
              </div>
            )}

            {/* Stego preview (after encoding) */}
            {stegoPreview && (
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                  Stego Image Preview (message hidden inside!)
                </label>
                <div className="rounded-2xl overflow-hidden border border-emerald-500/20 ring-2 ring-emerald-500/10">
                  <img src={stegoPreview} alt="Stego" className="w-full max-h-48 object-cover" />
                </div>
                <p className="text-[10px] text-emerald-400/60 text-center mt-2">
                  ✨ This image looks normal but contains your encrypted message
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-white/5 flex gap-3">
            {status === 'encoded' || status === 'sending' ? (
              <button
                onClick={handleSend}
                disabled={status === 'sending'}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                {status === 'sending' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {status === 'sending' ? 'Sending...' : 'Send Stego Image'}
              </button>
            ) : (
              <button
                onClick={handleEncode}
                disabled={!coverImage || !secretText.trim() || status === 'encoding'}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                {status === 'encoding' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Encrypting & Embedding...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Encrypt & Embed
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
