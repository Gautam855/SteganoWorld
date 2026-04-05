'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Upload, Link as LinkIcon, Check, Users, Search, Loader2, Flame, ImagePlus, AlertTriangle } from 'lucide-react';
import { searchUsers, createSharedLink, uploadChatImage } from '../api';
import { encryptMessage } from '../crypto';
import { hideDataInImage } from '../stegano';

interface ChatUser {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  encryption_public_key?: string;
}

interface SharedLinkModalProps {
  onClose: () => void;
  currentUserId: string;
  publicKey: string;
}

export default function SharedLinkModal({ onClose, currentUserId, publicKey }: SharedLinkModalProps) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [secretText, setSecretText] = useState('');
  const [secretImagePreview, setSecretImagePreview] = useState<string>('');
  const [capacity, setCapacity] = useState(0);
  const [needsCompression, setNeedsCompression] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');
  
  // Access control state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [burnAfterViews, setBurnAfterViews] = useState<number>(0);
  
  // Status state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secretImageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setError('');
      setNeedsCompression(false);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        const img = new Image();
        img.onload = () => {
          const maxBytes = Math.floor((img.width * img.height * 3) / 8) - 4;
          setCapacity(maxBytes);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecretImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNeedsCompression(false);
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setSecretImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
    
    for (let i = 0; i < 5; i++) {
        currentPreview = await compressDataUrl(currentPreview, quality, scale);
        targetPayload = JSON.stringify({ __stegano_v1: true, t: secretText.trim(), i: currentPreview });
        // The AES crypto overhead + JSON structure + base64 overhead ~ 1500 bytes buffer
        const charLen = new TextEncoder().encode(targetPayload).length + 1500;
        
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
    setError('Message too big even after compression! Try a higher-resolution Cover Carrier Image.');
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const data = await searchUsers(searchQuery.trim());
          const filtered = (data.users || []).filter((u: ChatUser) => 
            u.id !== currentUserId && !selectedUsers.some(su => su.id === u.id)
          );
          setSearchResults(filtered);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, selectedUsers]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const addAccess = (user: ChatUser) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeAccess = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleGenerate = async () => {
    if (!image) return;
    let targetPayload = secretText.trim();
    if (secretImagePreview) {
       targetPayload = JSON.stringify({ __stegano_v1: true, t: secretText.trim(), i: secretImagePreview });
    }
    
    const expectedLength = new TextEncoder().encode(targetPayload).length + 1500; // Account for AES + internal stego wrap
    if (expectedLength > capacity) {
       if (secretImagePreview) {
           setNeedsCompression(true);
           setError(`Attached secret image + text is too large (${(expectedLength/1024).toFixed(1)}KB) for this Carrier Image (${(capacity/1024).toFixed(1)}KB). Please compress or use a bigger Carrier.`);
       } else {
           setError('Text message is too large for this image capacity.');
       }
       return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // 1. We must generate a single message package.
      // We will encrypt the message using the encryptMessage utility. 
      // Wait, encryptMessage generates a new AES key AND encrypts the message.
      // But encryptMessage is hardcoded to take ONE recipient key and ONE sender key.
      // We need to write a custom flow here to encrypt for MULTIPLE users.

      // Actually, since encryptMessage yields the raw AES key inside its logic, we can't easily extract it without modifying crypto.ts.
      // However, we can use a workaround:
      // We can generate a completely random AES Key manually here, use window.crypto to encrypt the text,
      // and then use window.crypto.subtle.encrypt(RSA-OAEP) to encrypt this AES key for every user.
      const rawAesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Encrypt the payload text
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(targetPayload);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        rawAesKey,
        encodedData
      );

      // Convert to base64
      const encryptedBase64 = Buffer.from(encryptedBuffer).toString('base64');
      const ivBase64 = Buffer.from(iv).toString('base64');
      const payloadString = JSON.stringify({ cipher: encryptedBase64, iv: ivBase64, type: 'text' });

      // Embed payload in image using steganography
      const stegoBlob = await hideDataInImage(image, payloadString);

      // Upload image to Supabase
      const uploadData = await uploadChatImage(stegoBlob, 'stego');
      const imageId = uploadData.image_id;

      // Extract the raw rawAesKey buffer to encrypt it for each user
      const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', rawAesKey);

      // Helper to encrypt AES key with an RSA public key
      const encryptKeyForUser = async (userPubKeyStr: string) => {
        // Convert PEM to CryptoKey
        const pemHeader = "-----BEGIN PUBLIC KEY-----";
        const pemFooter = "-----END PUBLIC KEY-----";
        const pemContents = userPubKeyStr.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
        const binaryDerString = window.atob(pemContents);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) {
          binaryDer[i] = binaryDerString.charCodeAt(i);
        }
        
        const rsaKey = await window.crypto.subtle.importKey(
          "spki",
          binaryDer.buffer,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["encrypt"]
        );

        const encBuf = await window.crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          rsaKey,
          rawKeyBuffer
        );
        return Buffer.from(encBuf).toString('base64');
      };

      // Create access list
      const access_list = [];
      
      // 1. Add owner (so owner can view their own generated link)
      const ownerEncKey = await encryptKeyForUser(publicKey);
      access_list.push({ user_id: currentUserId, encrypted_aes_key: ownerEncKey });

      // 2. Add all selected users
      for (const user of selectedUsers) {
        const encKey = await encryptKeyForUser(user.encryption_public_key || user.public_key);
        access_list.push({ user_id: user.id, encrypted_aes_key: encKey });
      }

      // Call API
      const result = await createSharedLink({
        image_id: imageId,
        access_list,
        burn_after_views: burnAfterViews
      });

      // Generate the viewable URL
      const url = `${window.location.origin}/shared?id=${result.link_id}`;
      setGeneratedLink(url);

    } catch (err) {
      console.error(err);
      alert('Failed to generate secure link. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <LinkIcon className="text-emerald-400" size={24} />
          Create Secure Shared Link
        </h2>

        {generatedLink ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <Check size={18} />
                Link Generated Successfully
              </h3>
              <p className="text-sm text-neutral-300 mb-4">
                This link can only be viewed by the {selectedUsers.length} users you authorized. Even if someone else intercepts this link, they won't be able to decrypt the hidden message inside the image.
              </p>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={generatedLink}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">Carrier Image</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center bg-black/20 hover:bg-white/5 transition-colors cursor-pointer overflow-hidden relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-xl">Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <Upload size={24} />
                    <span className="text-sm font-semibold">Choose image to hide data in</span>
                  </div>
                )}
              </div>
            </div>

            {/* Secret Text Area */}
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">Secret Message (Text)</label>
              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Type the message to encrypt and hide..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-scrollbar resize-none h-20 text-sm mb-3"
              />

              <label className="block text-sm font-bold text-neutral-300 mb-2">Secret Attachment (Image) [Optional]</label>
              <input
                ref={secretImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleSecretImageSelect}
                className="hidden"
              />
              {secretImagePreview ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 h-24 w-full flex items-center justify-center bg-black/40">
                  <img src={secretImagePreview} alt="Secret preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setSecretImagePreview('')}
                    className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-lg hover:bg-rose-500/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/80 rounded text-[10px] font-bold text-white">
                    {Math.round(JSON.stringify({__stegano_v1:true, t:secretText, i:secretImagePreview}).length / 1024)} KB encoded
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => secretImageInputRef.current?.click()}
                  className="w-full h-12 border border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-emerald-400 transition-all"
                >
                  <ImagePlus size={16} />
                  <span className="text-sm font-medium">Attach secret image</span>
                </button>
              )}
            </div>

            {/* Error / Compress Alert */}
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
                    className="mt-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 w-full transition-colors"
                  >
                    {compressing ? <Loader2 size={14} className="animate-spin" /> : null}
                    {compressing ? 'Compressing via Canvas API...' : 'Compress Secret Image Format'}
                  </button>
                )}
              </div>
            )}

            {/* Ephemerality / Burn Control */}
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2 flex items-center justify-between">
                <span>Self-Destruct (Burn)</span>
                <Flame size={14} className={burnAfterViews > 0 ? "text-rose-500" : "text-neutral-500"} />
              </label>
              <select
                value={burnAfterViews}
                onChange={(e) => setBurnAfterViews(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              >
                <option value={0}>Never (Keep Link Active)</option>
                <option value={1}>Burn after 1 View</option>
                <option value={2}>Burn after 2 Views</option>
                <option value={5}>Burn after 5 Views</option>
              </select>
            </div>

            {/* Access Control */}
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2 flex items-center justify-between">
                <span>Who can view this?</span>
                <span className="text-emerald-400 text-xs font-mono">{selectedUsers.length} Selected</span>
              </label>
              
              <div className="space-y-2">
                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-300">{u.display_name}</span>
                        <button onClick={() => removeAccess(u.id)} className="text-indigo-400 hover:text-white p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* User Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search users to grant access..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 transition-colors"
                  />
                  
                  {/* Search Dropdown */}
                  {searchQuery.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-10 custom-scrollbar">
                      {isSearching ? (
                        <div className="p-4 text-center text-xs text-neutral-400">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-1">
                          {searchResults.map(u => (
                            <button
                              key={u.id}
                              onClick={() => addAccess(u)}
                              className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center justify-between group transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-200 text-sm">{u.display_name}</span>
                                <span className="text-xs text-neutral-500">@{u.username}</span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Add</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-neutral-400">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10">
              <button
                disabled={!image || !secretText.trim() || isGenerating}
                onClick={handleGenerate}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Encrypting & Generating Link...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={18} />
                    <span>Generate Secure Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
