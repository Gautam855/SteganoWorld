'use client';

import { useState, useCallback } from 'react';
import { extractFromImage } from '../stegano';
import { downloadStegoImage } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Lock, Download, Loader2, ShieldCheck, ImageIcon } from 'lucide-react';

interface SteganoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  secretTextFromMessage: string; // Already decrypted text from the E2EE message
  privateKey: string;
  isSender: boolean;
}

export default function SteganoViewer({
  isOpen,
  onClose,
  imageId,
  secretTextFromMessage,
  privateKey,
  isSender,
}: SteganoViewerProps) {
  const [stegoImageUrl, setStegoImageUrl] = useState<string>('');
  const [stegoBlob, setStegoBlob] = useState<Blob | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [decodedText, setDecodedText] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState('');
  const [activeTab, setActiveTab] = useState<'message' | 'image'>('message');

  // Load the stego image from server
  const loadImage = useCallback(async () => {
    if (stegoImageUrl || loadingImage) return;
    setLoadingImage(true);
    try {
      const blob = await downloadStegoImage(imageId);
      const url = URL.createObjectURL(blob);
      setStegoImageUrl(url);
      setStegoBlob(blob);
    } catch (err) {
      console.error('Failed to load stego image:', err);
    } finally {
      setLoadingImage(false);
    }
  }, [imageId, stegoImageUrl, loadingImage]);

  const [decodedImage, setDecodedImage] = useState('');

  // Full LSB decode from the image (demo/verification)
  const handleDecode = useCallback(async () => {
    if (!stegoBlob || decoding) return;
    setDecoding(true);
    setDecodeError('');
    setDecodedImage('');
    try {
      const text = await extractFromImage(stegoBlob, privateKey, isSender);
      try {
        const parsed = JSON.parse(text);
        if (parsed.__stegano_v1) {
          setDecodedText(parsed.t || '');
          if (parsed.i) setDecodedImage(parsed.i);
        } else {
          setDecodedText(text);
        }
      } catch (e) {
        setDecodedText(text);
      }
    } catch (err: any) {
      setDecodeError(err.message || 'Failed to decode. The image may not contain stegano data.');
    } finally {
      setDecoding(false);
    }
  }, [stegoBlob, privateKey, isSender, decoding]);

  // Download the stego image
  const handleDownload = useCallback(() => {
    if (!stegoImageUrl) return;
    const a = document.createElement('a');
    a.href = stegoImageUrl;
    a.download = `stego_${imageId.slice(0, 8)}.png`;
    a.click();
  }, [stegoImageUrl, imageId]);

  const handleClose = () => {
    if (stegoImageUrl) URL.revokeObjectURL(stegoImageUrl);
    setStegoImageUrl('');
    setStegoBlob(null);
    setDecodedText('');
    setDecodeError('');
    setActiveTab('message');
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
                <p className="text-xs text-neutral-500">Encrypted message hidden inside an image</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-neutral-400">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 pt-4 gap-2">
            <button
              onClick={() => setActiveTab('message')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'message'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2"><Lock size={14} /> Secret Message</span>
            </button>
            <button
              onClick={() => { setActiveTab('image'); loadImage(); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'image'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2"><ImageIcon size={14} /> Stego Image</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'message' ? (
              // ─── Secret Message Tab ──────────────────────
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  <ShieldCheck size={14} />
                  <span>Decrypted with your private key — zero-knowledge verified</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
                    Hidden Data Evaluated
                  </label>
                  {(() => {
                    let parsedText = secretTextFromMessage;
                    let parsedImage = '';
                    try {
                      const p = JSON.parse(secretTextFromMessage);
                      if (p.__stegano_v1) {
                        parsedText = p.t || '';
                        parsedImage = p.i || '';
                      }
                    } catch {}
                    return (
                      <>
                        {parsedImage && (
                          <div className="rounded-xl overflow-hidden border border-white/5 bg-black">
                            <img src={parsedImage} alt="Secret Extracted" className="w-full object-contain" />
                          </div>
                        )}
                        {parsedText && (
                          <p className="text-neutral-100 text-base leading-relaxed whitespace-pre-wrap">
                            {parsedText}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              // ─── Stego Image Tab ─────────────────────────
              <div className="space-y-4">
                {loadingImage ? (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-3">
                    <Loader2 size={24} className="animate-spin text-emerald-400" />
                    <span className="text-sm">Downloading stego image...</span>
                  </div>
                ) : stegoImageUrl ? (
                  <>
                    <div className="rounded-2xl overflow-hidden border border-white/10 relative group">
                      <img src={stegoImageUrl} alt="Stego Image" className="w-full max-h-64 object-contain bg-neutral-950" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={handleDownload}
                          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-colors"
                          title="Download stego image"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          ✨ This image contains a hidden encrypted message
                        </p>
                      </div>
                    </div>

                    {/* LSB Decode button */}
                    <button
                      onClick={handleDecode}
                      disabled={decoding}
                      className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                    >
                      {decoding ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Extracting from pixels...
                        </>
                      ) : (
                        <>
                          <Eye size={18} />
                          Decode from Image (LSB + RSA Decrypt)
                        </>
                      )}
                    </button>

                    {/* Decoded result */}
                    {(decodedText || decodedImage) && (
                      <div className="bg-neutral-950 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">
                          🔓 Decoded from Image Pixels
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
                    )}

                    {decodeError && (
                      <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                        {decodeError}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-3">
                    <ImageIcon size={32} />
                    <span className="text-sm">Failed to load image</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/5 text-center">
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
              <Lock size={10} />
              Zero-Knowledge Steganography — Server never sees your secrets
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
