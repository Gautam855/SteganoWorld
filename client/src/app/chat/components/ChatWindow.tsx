'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { encryptMessage, prewarmKeys } from '../crypto';
import { sendMessage as apiSendMessage, getConversation, markAsRead, uploadStegoImage, uploadChatImage } from '../api';
import { getCachedMessages, setCachedMessages, invalidateMessages } from '../cache';
import MessageBubble from './MessageBubble';
import SteganoModal from './SteganoModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Shield, Lock, Eye, Paperclip } from 'lucide-react';

interface ChatUser {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  is_online: boolean;
  last_seen: string | null;
  public_key: string;
  encryption_public_key?: string;
}

// Extended message with delivery status
export interface MessageData {
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
  // Client-side optimistic fields
  _status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  _optimisticText?: string; // plaintext for optimistic messages (before server response)
  _tempId?: string;
}

interface ChatWindowProps {
  selectedUser: ChatUser | null;
  currentUserId: string;
  privateKey: string;
  publicKey: string;
  onNewMessage?: () => void;
  incomingMessage?: MessageData | null;
  onMessageDelivered?: (messageData: MessageData) => void;
  deliveredMessageId?: string | null;
  readMessageIds?: string[];
}

let tempIdCounter = 0;

export default function ChatWindow({
  selectedUser,
  currentUserId,
  privateKey,
  publicKey,
  onNewMessage,
  incomingMessage,
  deliveredMessageId,
  readMessageIds,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null);
  const [showSteganoModal, setShowSteganoModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Load conversation when user is selected
  useEffect(() => {
    if (!selectedUser) return;
    loadMessages();
    markAsRead(selectedUser.id).catch(() => {});
    // 🚀 Pre-warm crypto keys so first message is instant
    const encKey = selectedUser.encryption_public_key || selectedUser.public_key;
    prewarmKeys(encKey, publicKey, privateKey).catch(() => {});
  }, [selectedUser?.id]);

  // Handle incoming real-time messages
  useEffect(() => {
    if (incomingMessage && selectedUser && incomingMessage.sender_id === selectedUser.id) {
      setMessages(prev => {
        if (prev.some(m => m.id === incomingMessage.id)) return prev;
        return [...prev, { ...incomingMessage, _status: 'delivered' }];
      });
      markAsRead(selectedUser.id).catch(() => {});
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [incomingMessage, selectedUser]);

  // Handle delivery confirmation — update sent messages to 'delivered'
  useEffect(() => {
    if (!deliveredMessageId) return;
    setMessages(prev => prev.map(m =>
      m.id === deliveredMessageId && m._status === 'sent'
        ? { ...m, _status: 'delivered' }
        : m
    ));
  }, [deliveredMessageId]);

  // Handle read receipts — update messages to 'read'
  useEffect(() => {
    if (!readMessageIds || readMessageIds.length === 0) return;
    setMessages(prev => prev.map(m =>
      readMessageIds.includes(m.id) && m.sender_id === currentUserId
        ? { ...m, _status: 'read', is_read: true }
        : m
    ));
  }, [readMessageIds, currentUserId]);

  // Auto-scroll to bottom and update cache
  useEffect(() => {
    if (isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoad.current = false;
    }
    // Automatically update cache whenever messages change
    if (selectedUser && messages.length > 0) {
      setCachedMessages(selectedUser.id, {
        messages,
        has_more: hasMore,
        oldest_timestamp: oldestTimestamp,
      });
    }
  }, [messages, selectedUser, hasMore, oldestTimestamp]);

  // Scroll to bottom when we send a new message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load latest messages (initial load) — stale-while-revalidate
  async function loadMessages() {
    if (!selectedUser) return;
    isInitialLoad.current = true;

    // 1. INSTANT: Show cached messages immediately
    const cached = getCachedMessages(selectedUser.id);
    if (cached && cached.messages?.length) {
      const cachedMsgs: MessageData[] = cached.messages.map((m: MessageData) => ({
        ...m,
        _status: m.sender_id === currentUserId
          ? (m.is_read ? 'read' : 'sent')
          : undefined,
      }));
      setMessages(cachedMsgs);
      setHasMore(cached.has_more || false);
      setOldestTimestamp(cached.oldest_timestamp || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. BACKGROUND: Fetch fresh data
    try {
      const data = await getConversation(selectedUser.id, 30);
      const msgs: MessageData[] = (data.messages || []).map((m: MessageData) => ({
        ...m,
        _status: m.sender_id === currentUserId
          ? (m.is_read ? 'read' : 'sent')
          : undefined,
      }));
      setMessages(msgs);
      setHasMore(data.has_more || false);
      setOldestTimestamp(data.oldest_timestamp || null);

      // 3. Cache the fresh data
      setCachedMessages(selectedUser.id, {
        messages: data.messages || [],
        has_more: data.has_more || false,
        oldest_timestamp: data.oldest_timestamp || null,
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  // Load older messages (infinite scroll)
  const loadOlderMessages = useCallback(async () => {
    if (!selectedUser || loadingMore || !hasMore || !oldestTimestamp) return;
    setLoadingMore(true);

    // Save scroll position before prepending
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const data = await getConversation(selectedUser.id, 30, oldestTimestamp);
      const olderMsgs: MessageData[] = (data.messages || []).map((m: MessageData) => ({
        ...m,
        _status: m.sender_id === currentUserId
          ? (m.is_read ? 'read' : 'sent')
          : undefined,
      }));

      if (olderMsgs.length > 0) {
        setMessages(prev => [...olderMsgs, ...prev]);
        setHasMore(data.has_more || false);
        setOldestTimestamp(data.oldest_timestamp || null);

        // Restore scroll position after prepending
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedUser, loadingMore, hasMore, oldestTimestamp, currentUserId]);

  // Scroll handler — detect scroll to top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Trigger when scrolled near the top (within 80px)
    if (container.scrollTop < 80 && hasMore && !loadingMore) {
      loadOlderMessages();
    }
  }, [hasMore, loadingMore, loadOlderMessages]);

  // 🚀 Optimistic send — message appears INSTANTLY
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !selectedUser) return;

    const text = inputText.trim();
    const tempId = `_temp_${Date.now()}_${++tempIdCounter}`;

    // 1. INSTANT — Add optimistic message to UI
    const optimisticMsg: MessageData = {
      id: tempId,
      _tempId: tempId,
      sender_id: currentUserId,
      recipient_id: selectedUser.id,
      encrypted_message: '',
      encrypted_aes_key_recipient: '',
      encrypted_aes_key_sender: '',
      iv: '',
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      _status: 'sending',
      _optimisticText: text,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setTimeout(scrollToBottom, 50);

    // 2. BACKGROUND — Encrypt + send
    try {
      const recipientEncKey = selectedUser.encryption_public_key || selectedUser.public_key;
      const encrypted = await encryptMessage(text, recipientEncKey, publicKey);

      const result = await apiSendMessage({
        recipient_id: selectedUser.id,
        encrypted_message: encrypted.encryptedMessage,
        encrypted_aes_key_recipient: encrypted.encryptedAesKeyRecipient,
        encrypted_aes_key_sender: encrypted.encryptedAesKeySender,
        iv: encrypted.iv,
        message_type: 'text',
      });

      if (result.data) {
        // 3. Replace optimistic message with real server message
        setMessages(prev => prev.map(m =>
          m._tempId === tempId
            ? { ...result.data, _status: 'sent' as const, _optimisticText: text }
            : m
        ));
        onNewMessage?.();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // 4. Mark as failed — user can retry
      setMessages(prev => prev.map(m =>
        m._tempId === tempId
          ? { ...m, _status: 'failed' as const }
          : m
      ));
    }
  }, [inputText, selectedUser, currentUserId, publicKey, onNewMessage]);

  // Retry a failed message
  const handleRetry = useCallback(async (failedMsg: MessageData) => {
    if (!selectedUser || !failedMsg._optimisticText) return;

    // Mark as sending again
    setMessages(prev => prev.map(m =>
      m.id === failedMsg.id ? { ...m, _status: 'sending' as const } : m
    ));

    try {
      const recipientEncKey = selectedUser.encryption_public_key || selectedUser.public_key;
      const encrypted = await encryptMessage(failedMsg._optimisticText, recipientEncKey, publicKey);

      const result = await apiSendMessage({
        recipient_id: selectedUser.id,
        encrypted_message: encrypted.encryptedMessage,
        encrypted_aes_key_recipient: encrypted.encryptedAesKeyRecipient,
        encrypted_aes_key_sender: encrypted.encryptedAesKeySender,
        iv: encrypted.iv,
        message_type: 'text',
      });

      if (result.data) {
        setMessages(prev => prev.map(m =>
          m.id === failedMsg.id
            ? { ...result.data, _status: 'sent' as const, _optimisticText: failedMsg._optimisticText }
            : m
        ));
        onNewMessage?.();
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === failedMsg.id ? { ...m, _status: 'failed' as const } : m
      ));
    }
  }, [selectedUser, publicKey, onNewMessage]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // No user selected
  if (!selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-neutral-950/40 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative text-center max-w-md px-6 leading-relaxed">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 shadow-2xl rounded-3xl flex items-center justify-center text-indigo-400"
          >
            <Shield size={48} />
          </motion.div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 mb-4 tracking-tight">Stegano E2E Chat</h2>
          <p className="text-neutral-400 mb-8 font-medium">Select a conversation from the sidebar or search for users to establish a secure, zero-knowledge encrypted connection.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">
            <Lock size={12} />
            <span>Military-Grade Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950/40 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-neutral-900/60 backdrop-blur-xl border-b border-white/5 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shrink-0"
            style={{ background: selectedUser.avatar_color }}
          >
            {selectedUser.display_name[0].toUpperCase()}
            {selectedUser.is_online && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-neutral-900 rounded-full shadow-sm" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-0.5">{selectedUser.display_name}</h3>
            <span className={`text-xs font-medium ${selectedUser.is_online ? 'text-green-400' : 'text-neutral-500'}`}>
              {selectedUser.is_online ? '● Active Now' : `Last seen ${selectedUser.last_seen ? new Date(selectedUser.last_seen).toLocaleDateString() : 'unknown'}`}
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-950/50 border border-white/5 text-neutral-400 rounded-xl text-[10px] font-bold uppercase tracking-widest shrink-0">
          <Lock size={12} className="text-indigo-400 shrink-0" />
          <span>E2EE Connection</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar relative z-0"
      >
        {loading ? (
          <div className="flex flex-col gap-6 p-2 w-full h-full justify-end opacity-60">
            {/* Skeleton bubble 1: Received */}
            <div className="flex justify-start w-full animate-pulse">
              <div className="bg-neutral-800/40 rounded-[20px] rounded-tl-sm p-4 max-w-[75%] border border-white/5 space-y-2.5">
                <div className="w-48 h-2.5 bg-neutral-700/50 rounded-full" />
                <div className="w-32 h-2.5 bg-neutral-700/50 rounded-full" />
              </div>
            </div>
            {/* Skeleton bubble 2: Sent */}
            <div className="flex justify-end w-full animate-pulse" style={{ animationDelay: '150ms' }}>
              <div className="bg-indigo-900/20 rounded-[20px] rounded-tr-sm p-4 max-w-[75%] border border-indigo-500/10 space-y-2.5">
                <div className="w-40 h-2.5 bg-indigo-500/20 rounded-full" />
              </div>
            </div>
            {/* Skeleton bubble 3: Received */}
            <div className="flex justify-start w-full animate-pulse" style={{ animationDelay: '300ms' }}>
              <div className="bg-neutral-800/40 rounded-[20px] rounded-tl-sm p-4 max-w-[75%] border border-white/5 space-y-2.5">
                <div className="w-56 h-2.5 bg-neutral-700/50 rounded-full" />
                <div className="w-48 h-2.5 bg-neutral-700/50 rounded-full" />
                <div className="w-24 h-2.5 bg-neutral-700/50 rounded-full" />
              </div>
            </div>
            {/* Syncing Info */}
            <div className="flex justify-center mt-2 pb-4">
               <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                 <Lock size={10} className="text-indigo-400/50" /> Syncing Secure Channel...
               </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto opacity-50">
            <Lock size={48} className="text-neutral-600 mb-4" />
            <p className="text-neutral-400 font-medium">No messages yet.</p>
            <p className="text-sm text-neutral-500 mt-2">Send a message to start an encrypted channel with {selectedUser.display_name}.</p>
          </div>
        ) : (
          <>
            {/* Load more indicator */}
            {hasMore && (
              <div className="flex justify-center py-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading older messages...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadOlderMessages}
                    className="px-4 py-1.5 bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-400 hover:text-white rounded-full text-xs font-semibold transition-colors border border-white/5"
                  >
                    ↑ Load older messages
                  </button>
                )}
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <div className="flex justify-center py-4">
                <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                  🔐 Start of encrypted conversation
                </span>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg._tempId || msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  privateKey={privateKey}
                  onRetry={msg._status === 'failed' ? () => handleRetry(msg) : undefined}
                />
              ))}
            </AnimatePresence>
          </>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 bg-neutral-900/60 backdrop-blur-xl border-t border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-2 bg-neutral-950/80 border border-neutral-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-2xl p-1.5 transition-all shadow-inner">
            {/* Hidden file input for normal images */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedUser) return;
                try {
                  // 1. Upload image
                  const { image_id } = await uploadChatImage(file, 'image');
                  // 2. Encrypt caption with image ID
                  const recipientEncKey = selectedUser.encryption_public_key || selectedUser.public_key;
                  const encrypted = await encryptMessage(`[IMG:${image_id}]`, recipientEncKey, publicKey);
                  // 3. Send as image message
                  const result = await apiSendMessage({
                    recipient_id: selectedUser.id,
                    encrypted_message: encrypted.encryptedMessage,
                    encrypted_aes_key_recipient: encrypted.encryptedAesKeyRecipient,
                    encrypted_aes_key_sender: encrypted.encryptedAesKeySender,
                    iv: encrypted.iv,
                    message_type: 'image',
                  });
                  if (result.data) {
                    setMessages(prev => [...prev, { ...result.data, _status: 'sent' as const, _optimisticText: `[IMG:${image_id}]` }]);
                    onNewMessage?.();
                  }
                } catch (err) {
                  console.error('Image send failed:', err);
                }
                e.target.value = '';
              }}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="shrink-0 self-end w-11 h-11 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-indigo-600/20 text-neutral-500 hover:text-indigo-400 transition-all"
              title="Send Image"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent resize-none outline-none py-3 px-4 text-neutral-200 text-[15px] placeholder:text-neutral-600 custom-scrollbar"
              placeholder="Type your secure message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ minHeight: '52px', maxHeight: '160px' }}
            />
            <button
              onClick={() => setShowSteganoModal(true)}
              className="shrink-0 self-end w-11 h-11 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-emerald-600/20 text-neutral-500 hover:text-emerald-400 transition-all"
              title="Send Stegano Image"
            >
              <Eye size={18} />
            </button>
            <button
              className={`shrink-0 self-end w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                inputText.trim() 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95' 
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
              onClick={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
            </button>
          </div>
          <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-neutral-600">
            <Lock size={10} className="text-neutral-500" /> 
            <span>End-to-End Encrypted. Neither SteganoWorld nor third parties can read these messages.</span>
          </div>
        </div>
      </div>

      {/* Stegano Modal */}
      {selectedUser && (
        <SteganoModal
          isOpen={showSteganoModal}
          onClose={() => setShowSteganoModal(false)}
          recipientName={selectedUser.display_name}
          recipientPublicKey={selectedUser.encryption_public_key || selectedUser.public_key}
          senderPublicKey={publicKey}
          onSend={async (stegoBlob: Blob, secretText: string) => {
            // 1. Upload stego image to server
            const { image_id } = await uploadStegoImage(stegoBlob);

            // 2. Encrypt the secret text for regular message storage
            const recipientEncKey = selectedUser.encryption_public_key || selectedUser.public_key;
            const encrypted = await encryptMessage(`[STEGO:${image_id}] ${secretText}`, recipientEncKey, publicKey);

            // 3. Send as stego message
            const result = await apiSendMessage({
              recipient_id: selectedUser.id,
              encrypted_message: encrypted.encryptedMessage,
              encrypted_aes_key_recipient: encrypted.encryptedAesKeyRecipient,
              encrypted_aes_key_sender: encrypted.encryptedAesKeySender,
              iv: encrypted.iv,
              message_type: 'stego',
            });

            if (result.data) {
              setMessages(prev => [...prev, { ...result.data, _status: 'sent' as const, _optimisticText: `🖼️ Stego image sent` }]);
              onNewMessage?.();
            }
          }}
        />
      )}
    </div>
  );
}
