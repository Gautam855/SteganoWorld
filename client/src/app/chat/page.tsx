'use client';

import { useState, useEffect, useCallback } from 'react';
import { getKeys, deleteKeys, exportKeysForBackup } from './keyStore';
import AuthPage from './components/AuthPage';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import DecodeModal from './components/DecodeModal';
import SharedLinkModal from './components/SharedLinkModal';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Download, Shield, Menu, X, Info, Key, Eye, Link as LinkIcon, BookOpen } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

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

interface MessageData {
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
}

export default function ChatPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [incomingMessage, setIncomingMessage] = useState<MessageData | null>(null);
  const [deliveredMessageId, setDeliveredMessageId] = useState<string | null>(null);
  const [readMessageIds, setReadMessageIds] = useState<string[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showDecodeModal, setShowDecodeModal] = useState(false);
  const [showSharedLinkModal, setShowSharedLinkModal] = useState(false);
  const [backupData, setBackupData] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: Socket;
    getKeys().then((keys) => {
      if (keys?.token) {
        const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';
        socket = io(SOCKET_URL, {
          query: { token: keys.token }
        });

        socket.on('new_message', (data: MessageData) => {
          setIncomingMessage(data);
          setRefreshTrigger(prev => prev + 1);
          // Emit delivery confirmation back to sender
          socket.emit('message_delivered', {
            message_id: data.id,
            sender_id: data.sender_id,
          });
        });

        // Listen for delivery confirmations (sender side)
        socket.on('message_delivered', (data: { message_id: string }) => {
          setDeliveredMessageId(data.message_id);
        });

        // Listen for read receipts (sender side)
        socket.on('messages_read', (data: { message_ids: string[] }) => {
          setReadMessageIds(data.message_ids || []);
        });
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated]);

  async function checkAuth() {
    try {
      const keys = await getKeys();
      if (keys?.token) {
        setIsAuthenticated(true);
        setCurrentUserId(keys.userId);
        setCurrentUsername(keys.username);
        setPrivateKey(keys.encryptionPrivateKey);
        setPublicKey(keys.encryptionPublicKey);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAuthSuccess() {
    checkAuth();
  }

  async function handleLogout() {
    if (confirm('Are you sure? Make sure you have exported your key backup first!')) {
      await deleteKeys();
      // Clear cache on logout
      if (typeof window !== 'undefined') {
        const { clearAllCache } = await import('./cache');
        clearAllCache();
      }
      setIsAuthenticated(false);
      setCurrentUserId('');
      setPrivateKey('');
      setPublicKey('');
      setSelectedUser(null);
    }
  }

  async function handleExportKeys() {
    const data = await exportKeysForBackup();
    if (data) {
      setBackupData(data);
      setShowBackupModal(true);
    }
  }

  function copyBackup() {
    navigator.clipboard.writeText(backupData);
    alert('Backup copied to clipboard! Store it securely.');
  }

  function handleSelectUser(user: ChatUser) {
    setSelectedUser(user);
    setShowMobileSidebar(false);
  }

  const handleNewMessage = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-neutral-950 text-white">
        <div className="relative">
          <Shield size={64} className="text-indigo-500 animate-pulse" />
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-widest uppercase text-neutral-400">Initializing secure environment...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white font-sans overflow-hidden bg-[radial-gradient(ellipse_80%_100%_at_50%_-10%,rgba(79,70,229,0.1),rgba(0,0,0,0))]">
      
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 h-16 bg-black/40 backdrop-blur-2xl border-b border-white/[0.05] z-30">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 transition-colors"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 group cursor-default">
            <div className="p-1.5 bg-indigo-500 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-500/40">
              <Shield size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-300 tracking-tight hidden sm:block">
              SteganoChat
            </h1>
          </div>
          <span className="hidden md:flex px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest mt-0.5">
            E2EE
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 border border-white/10 rounded-xl mr-2">
             <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
             <span className="text-xs font-semibold text-neutral-300">@{currentUsername}</span>
          </div>
          <Link 
            href="/guide"
            target="_blank"
            className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-xl transition-colors tooltip-trigger relative group"
            title="Docs & Protocol Guide"
          >
            <BookOpen size={16} />
            <span className="absolute -bottom-10 right-0 w-max bg-sky-950 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-sky-200 z-50">Docs & Guide</span>
          </Link>
          <button 
            onClick={handleExportKeys} 
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-neutral-300 transition-colors tooltip-trigger relative group"
            title="Export Key Backup"
          >
            <Download size={16} />
            <span className="absolute -bottom-10 right-0 w-max bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Backup Keys</span>
          </button>
          <button 
            onClick={() => setShowSharedLinkModal(true)} 
            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl transition-colors relative group"
            title="Create Shareable Link"
          >
            <LinkIcon size={16} />
            <span className="absolute -bottom-10 right-0 w-max bg-emerald-950 text-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Create Link</span>
          </button>
          <button 
            onClick={() => setShowDecodeModal(true)} 
            className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl transition-colors relative group"
            title="Decode Stego Image"
          >
            <Eye size={16} />
            <span className="absolute -bottom-10 right-0 w-max bg-amber-950 text-amber-200 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Decode</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl transition-colors relative group"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="absolute -bottom-10 right-0 w-max bg-rose-950 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-rose-200">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Container */}
        <div 
          className={`absolute inset-y-0 left-0 z-20 w-80 max-w-[85vw] bg-neutral-900 transform transition-transform duration-300 ease-spring md:relative md:translate-x-0 border-r border-white/5 ${
            showMobileSidebar ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full'
          }`}
        >
          <ChatSidebar
            currentUserId={currentUserId}
            selectedUserId={selectedUser?.id || null}
            onSelectUser={handleSelectUser}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        <AnimatePresence>
          {showMobileSidebar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden absolute inset-0 bg-black/60 backdrop-blur-sm z-10"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* Window Container */}
        <div className="flex-1 min-w-0 h-full relative bg-neutral-950/20">
          <ChatWindow
            selectedUser={selectedUser}
            currentUserId={currentUserId}
            privateKey={privateKey}
            publicKey={publicKey}
            onNewMessage={handleNewMessage}
            incomingMessage={incomingMessage}
            deliveredMessageId={deliveredMessageId}
            readMessageIds={readMessageIds}
          />
        </div>
      </div>

      {/* Shared Link Modal */}
      <AnimatePresence>
        {showSharedLinkModal && (
          <SharedLinkModal
            onClose={() => setShowSharedLinkModal(false)}
            currentUserId={currentUserId}
            publicKey={publicKey}
          />
        )}
      </AnimatePresence>

      {/* Backup Modal */}
      <AnimatePresence>
        {showBackupModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center px-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowBackupModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
              
              <div className="flex items-center gap-4 mb-6 relative">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                  <Key size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Key Backup</h2>
                  <p className="text-sm font-medium text-neutral-400">Essential for device recovery</p>
                </div>
              </div>

              <div className="flex gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] p-4 rounded-2xl mb-6 leading-relaxed relative">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Critical:</strong> Anyone with this data can access your account. Store it in a secure password manager. Never share it publicly!
                </p>
              </div>

              <textarea
                readOnly
                value={backupData}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-300 font-mono text-xs focus:outline-none mb-6 custom-scrollbar relative z-10"
                rows={6}
              />

              <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                <button 
                  onClick={copyBackup} 
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20"
                >
                  Copy to Clipboard
                </button>
                <button 
                  onClick={() => setShowBackupModal(false)} 
                  className="sm:w-1/3 bg-transparent hover:bg-white/5 text-neutral-300 font-semibold py-3 px-4 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decode Stego Image Modal */}
      <DecodeModal
        isOpen={showDecodeModal}
        onClose={() => setShowDecodeModal(false)}
        privateKey={privateKey}
      />
    </div>
  );
}
