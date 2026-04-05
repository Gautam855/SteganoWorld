'use client';

import { useState, useEffect } from 'react';
import { getConversations, searchUsers } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Users, Lock, ChevronRight } from 'lucide-react';

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

interface Conversation {
  user: ChatUser;
  last_message: any;
  unread_count: number;
}

interface ChatSidebarProps {
  currentUserId: string;
  selectedUserId: string | null;
  onSelectUser: (user: ChatUser) => void;
  refreshTrigger?: number;
}

export default function ChatSidebar({
  currentUserId,
  selectedUserId,
  onSelectUser,
  refreshTrigger,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadConversations() {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query: string) {
    setIsSearching(true);
    try {
      const data = await searchUsers(query);
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectSearchResult(user: ChatUser) {
    onSelectUser(user);
    setSearchQuery('');
    setSearchResults([]);
  }

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 border-r border-white/5 border-dashed overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Messages</h2>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
            <Lock size={10} />
            E2EE
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-neutral-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 space-y-1">
        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                <Users size={12} />
                Search Results
              </div>
              <div className="space-y-1 mt-1">
                {searchResults.map((user) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-neutral-800/60 transition-all text-left group"
                    onClick={() => handleSelectSearchResult(user)}
                  >
                    <div className="relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-bold text-white shadow-lg" style={{ background: user.avatar_color }}>
                      {user.display_name[0].toUpperCase()}
                      {user.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-neutral-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{user.display_name}</div>
                      <div className="text-sm text-neutral-500 truncate">@{user.username}</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600">
                      <ChevronRight size={18} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations List */}
        <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-widest hidden">Conversations</div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-neutral-500 gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mb-4 text-neutral-600">
              <MessageSquare size={24} />
            </div>
            <p className="text-sm font-semibold text-neutral-300 mb-1">No conversations yet</p>
            <span className="text-xs text-neutral-600">Search for users above to start chatting securely</span>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = selectedUserId === conv.user.id;
            return (
              <motion.button
                key={conv.user.id}
                whileHover={{ scale: 0.99 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-indigo-500 before:rounded-r-full shadow-[inset_0_1px_rgba(255,255,255,0.05)]' 
                    : 'hover:bg-neutral-800/40'
                }`}
                onClick={() => onSelectUser(conv.user)}
              >
                <div className={`relative w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold text-white shadow-lg transition-transform ${isActive ? 'scale-105' : ''}`} style={{ background: conv.user.avatar_color }}>
                  {conv.user.display_name[0].toUpperCase()}
                  {conv.user.is_online && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-neutral-900 rounded-full shadow-sm" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold truncate ${isActive ? 'text-indigo-100' : 'text-white'}`}>
                      {conv.user.display_name}
                    </span>
                    {conv.last_message && (
                      <span className={`text-[10px] font-medium shrink-0 ml-2 ${conv.unread_count > 0 ? 'text-indigo-400' : 'text-neutral-500'}`}>
                        {new Date(conv.last_message.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs truncate flex items-center gap-1.5 ${conv.unread_count > 0 ? 'text-neutral-300 font-medium' : 'text-neutral-500'}`}>
                      <Lock size={10} className="shrink-0" />
                      Encrypted message
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-indigo-500/40">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
