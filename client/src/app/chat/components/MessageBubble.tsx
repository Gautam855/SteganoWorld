'use client';

import { useState, useEffect, useCallback } from 'react';
import { decryptMessage } from '../crypto';
import { downloadStegoImage } from '../api';
import { getKeys } from '../keyStore';
import { getCachedImageUrl, setCachedImageUrl } from '../cache';
import { motion } from 'framer-motion';
import { RotateCcw, Eye, ChevronRight, Download, X, Lock, Loader2 } from 'lucide-react';
import SteganoViewer from './SteganoViewer';

interface MessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    recipient_id: string;
    encrypted_message: string;
    encrypted_aes_key_recipient: string;
    encrypted_aes_key_sender: string;
    iv: string;
    message_type: string;
    is_read: boolean;
    created_at: string;
    _status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    _optimisticText?: string;
    _tempId?: string;
  };
  currentUserId: string;
  privateKey: string;
  onRetry?: () => void;
}

const STEGO_PREFIX = '[STEGO:';
const IMG_PREFIX = '[IMG:';

// Parse message prefixes
function parseStegoText(text: string): { imageId: string; secretText: string } | null {
  if (!text.startsWith(STEGO_PREFIX)) return null;
  const closeBracket = text.indexOf(']');
  if (closeBracket === -1) return null;
  const imageId = text.slice(STEGO_PREFIX.length, closeBracket);
  const secretText = text.slice(closeBracket + 2);
  return { imageId, secretText };
}

function parseImageText(text: string): { imageId: string; caption: string } | null {
  if (!text.startsWith(IMG_PREFIX)) return null;
  const closeBracket = text.indexOf(']');
  if (closeBracket === -1) return null;
  const imageId = text.slice(IMG_PREFIX.length, closeBracket);
  const caption = text.slice(closeBracket + 1).trim();
  return { imageId, caption };
}


export default function MessageBubble({ message, currentUserId, privateKey, onRetry }: MessageBubbleProps) {
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [showSteganoViewer, setShowSteganoViewer] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(false);

  const isSent = message.sender_id === currentUserId;
  const status = message._status;

  // Decrypt message
  useEffect(() => {
    if (message._optimisticText && (status === 'sending' || status === 'failed')) {
      setDecryptedText(message._optimisticText);
      setIsDecrypting(false);
      return;
    }
    if (message._optimisticText && isSent) {
      setDecryptedText(message._optimisticText);
      setIsDecrypting(false);
      return;
    }

    async function decrypt() {
      try {
        if (!message.encrypted_message || !message.iv) {
          setDecryptedText('🔒 Empty message');
          setIsDecrypting(false);
          return;
        }
        const aesKey = isSent
          ? message.encrypted_aes_key_sender
          : message.encrypted_aes_key_recipient;
        const text = await decryptMessage(message.encrypted_message, aesKey, message.iv, privateKey);
        setDecryptedText(text);
      } catch {
        setDecryptedText('🔒 Unable to decrypt');
      } finally {
        setIsDecrypting(false);
      }
    }
    decrypt();
  }, [message.id, message._status, privateKey, isSent]);

  // Load image thumbnail when message is an image type
  const isStego = message.message_type === 'stego' || decryptedText.startsWith(STEGO_PREFIX);
  const isImage = message.message_type === 'image' || decryptedText.startsWith(IMG_PREFIX);
  const isMediaMessage = isStego || isImage;

  const stegoData = isStego ? parseStegoText(decryptedText) : null;
  const imageData = isImage ? parseImageText(decryptedText) : null;
  const imageId = stegoData?.imageId || imageData?.imageId || '';

  // Load image thumbnail (with cache)
  useEffect(() => {
    if (!imageId || imageUrl) return;

    const loadUrl = async () => {
      const keys = await getKeys();
      const token = keys?.token || '';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      setImageUrl(`${baseUrl}/api/chat/stego/download/${imageId}?token=${token}`);
    };

    loadUrl();
  }, [imageId, imageUrl]);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Tick renderer
  function renderTicks() {
    if (!isSent) return null;
    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex ml-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" />
            </svg>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex ml-1.5 text-rose-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        );
      case 'sent':
        return <span className="inline-flex ml-1.5 text-[12px] leading-none">✓</span>;
      case 'delivered':
        return <span className="inline-flex ml-1 text-[12px] leading-none tracking-[-3px]">✓✓</span>;
      case 'read':
        return <span className="inline-flex ml-1 text-sky-400 text-[12px] leading-none tracking-[-3px] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]">✓✓</span>;
      default:
        return message.is_read ? (
          <span className="inline-flex ml-1 text-sky-400 text-[12px] leading-none tracking-[-3px] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]">✓✓</span>
        ) : (
          <span className="inline-flex ml-1.5 text-[12px] leading-none">✓</span>
        );
    }
  }

  // ─── Image/Stego Bubble (WhatsApp style) ─────────────────────────
  if (isMediaMessage && !isDecrypting) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`w-full flex mb-3 ${isSent ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`relative max-w-[280px] md:max-w-[320px] rounded-2xl overflow-hidden shadow-xl cursor-pointer group ${
              isSent
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
            onClick={() => isStego ? setShowSteganoViewer(true) : setShowFullImage(true)}
          >
            {/* Image Thumbnail */}
            <div className="relative bg-neutral-900 min-h-[140px]">
              {imageLoading ? (
                <div className="flex items-center justify-center h-[200px] bg-neutral-900">
                  <Loader2 size={28} className="animate-spin text-neutral-600" />
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Shared image"
                  className="w-full max-h-[340px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] bg-neutral-900 text-neutral-600">
                  <div className="text-center">
                    <Eye size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Image unavailable</p>
                  </div>
                </div>
              )}

              {/* Stego badge overlay */}
              {isStego && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                  <Eye size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Stego</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {isStego ? (
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-emerald-400">
                      <Eye size={16} />
                      <span className="text-xs font-bold">Tap to reveal secret</span>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-xs font-bold">
                      View Full Image
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Caption / Secret indicator bar */}
            <div className={`px-3 py-2 ${isSent ? 'bg-indigo-600' : 'bg-neutral-800/90'}`}>
              {isStego ? (
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-semibold truncate flex-1">
                    Hidden message inside
                  </p>
                  <ChevronRight size={14} className="text-emerald-400/50 shrink-0" />
                </div>
              ) : imageData?.caption ? (
                <p className="text-sm text-white/90 leading-snug">{imageData.caption}</p>
              ) : null}

              {/* Time + ticks footer */}
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-semibold tracking-wider ${
                isSent ? 'text-white/50' : 'text-neutral-500'
              }`}>
                <span>{time}</span>
                {renderTicks()}
                {status === 'failed' && onRetry && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetry(); }}
                    className="ml-2 p-1 hover:bg-white/10 rounded-full text-rose-300 hover:text-white"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Full Image Viewer (normal images) */}
        {showFullImage && imageUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <button className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors z-10">
              <X size={24} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = `image_${imageId.slice(0, 8)}.png`;
                a.click();
              }}
              className="absolute top-4 right-20 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors z-10"
            >
              <Download size={24} />
            </button>
            <img
              src={imageUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Stegano Viewer Modal */}
        {isStego && stegoData && (
          <SteganoViewer
            isOpen={showSteganoViewer}
            onClose={() => setShowSteganoViewer(false)}
            imageId={stegoData.imageId}
            secretTextFromMessage={stegoData.secretText}
            privateKey={privateKey}
            isSender={isSent}
          />
        )}
      </>
    );
  }

  // ─── Text Bubble ─────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: status === 'failed' ? 0.7 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`w-full flex mb-3 ${isSent ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-lg flex flex-col ${
          isSent 
            ? status === 'failed'
              ? 'bg-rose-950/60 border border-rose-500/20 text-white rounded-2xl rounded-tr-sm'
              : 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
            : 'bg-neutral-800/80 backdrop-blur-md border border-white/5 text-neutral-100 rounded-2xl rounded-tl-sm'
        }`}
      >
        {isDecrypting ? (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Decrypting...</span>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{decryptedText}</p>
        )}

        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-semibold tracking-wider ${
          isSent 
            ? status === 'failed' ? 'text-rose-300' : 'text-indigo-200/70' 
            : 'text-neutral-500'
        }`}>
          <span>{time}</span>
          {renderTicks()}
          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="ml-2 p-1 hover:bg-white/10 rounded-full text-rose-300 hover:text-white"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
