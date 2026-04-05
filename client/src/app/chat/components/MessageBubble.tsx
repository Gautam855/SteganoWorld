'use client';

import { useState, useEffect } from 'react';
import { decryptMessage } from '../crypto';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

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

export default function MessageBubble({ message, currentUserId, privateKey, onRetry }: MessageBubbleProps) {
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [error, setError] = useState(false);

  const isSent = message.sender_id === currentUserId;
  const status = message._status;

  useEffect(() => {
    // If it's an optimistic message (not yet encrypted/sent), show plaintext directly
    if (message._optimisticText && (status === 'sending' || status === 'failed')) {
      setDecryptedText(message._optimisticText);
      setIsDecrypting(false);
      return;
    }

    // If we have optimistic text and the message was sent, show it instantly (skip decryption for speed)
    if (message._optimisticText && isSent) {
      setDecryptedText(message._optimisticText);
      setIsDecrypting(false);
      return;
    }

    // Normal decryption flow for received messages or loaded messages
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

        const text = await decryptMessage(
          message.encrypted_message,
          aesKey,
          message.iv,
          privateKey
        );
        setDecryptedText(text);
      } catch {
        setError(true);
        setDecryptedText('🔒 Unable to decrypt');
      } finally {
        setIsDecrypting(false);
      }
    }
    decrypt();
  }, [message.id, message._status, privateKey, isSent]);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Tick renderer — WhatsApp style
  function renderTicks() {
    if (!isSent) return null;

    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex ml-1.5 text-neutral-400">
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
        return (
          <span className="inline-flex ml-1.5 text-neutral-400 text-[12px] leading-none">
            ✓
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex ml-1 text-neutral-400 text-[12px] leading-none tracking-[-3px]">
            ✓✓
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex ml-1 text-sky-400 text-[12px] leading-none tracking-[-3px] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]">
            ✓✓
          </span>
        );
      default:
        // Fallback for loaded messages from DB
        return message.is_read ? (
          <span className="inline-flex ml-1 text-sky-400 text-[12px] leading-none tracking-[-3px] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]">
            ✓✓
          </span>
        ) : (
          <span className="inline-flex ml-1.5 text-neutral-400 text-[12px] leading-none">
            ✓
          </span>
        );
    }
  }

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
              className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-rose-300 hover:text-white"
              title="Retry sending"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
