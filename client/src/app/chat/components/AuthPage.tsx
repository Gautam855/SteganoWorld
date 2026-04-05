'use client';

import { useState } from 'react';
import { generateKeyPair, generateSigningKeyPair, signChallenge } from '../crypto';
import { saveKeys, importKeysFromBackup } from '../keyStore';
import { registerUser, requestChallenge, verifyChallenge } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, UserPlus, LogIn, Download, Upload, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'register' | 'login' | 'import'>('register');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyGenStatus, setKeyGenStatus] = useState('');
  const [importData, setImportData] = useState('');
  const [showImportData, setShowImportData] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;
    setLoading(true);
    setError('');

    try {
      setKeyGenStatus('Generating RSA-4096 encryption keys...');
      const encKeys = await generateKeyPair();

      setKeyGenStatus('Generating RSA-4096 signing keys...');
      const sigKeys = await generateSigningKeyPair();

      setKeyGenStatus('Registering with server (sending public keys only)...');
      const result = await registerUser({
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        public_key: sigKeys.publicKeyPem,           // For auth (challenge-response signing)
        encryption_public_key: encKeys.publicKeyPem, // For message encryption (RSA-OAEP)
      });

      setKeyGenStatus('Saving keys securely to device...');
      await saveKeys({
        userId: result.user.id,
        username: result.user.username,
        displayName: result.user.display_name,
        encryptionPublicKey: encKeys.publicKeyPem,
        encryptionPrivateKey: encKeys.privateKeyPem,
        signingPublicKey: sigKeys.publicKeyPem,
        signingPrivateKey: sigKeys.privateKeyPem,
        token: result.token,
      });

      setKeyGenStatus('Done! Redirecting...');
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
      setKeyGenStatus('');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('This device does not have keys for this account. Please import your key backup first.');
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importData.trim()) return;
    setLoading(true);
    setError('');

    try {
      const keys = await importKeysFromBackup(importData.trim());
      if (!keys) {
        setError('Invalid backup data');
        return;
      }

      setKeyGenStatus('Authenticating with server...');
      const challengeRes = await requestChallenge(keys.username);

      setKeyGenStatus('Signing challenge with your private key...');
      const signature = await signChallenge(challengeRes.challenge, keys.signingPrivateKey);

      setKeyGenStatus('Verifying signature...');
      const verifyRes = await verifyChallenge(keys.username, signature);

      setKeyGenStatus('Saving keys to device...');
      await saveKeys({
        userId: verifyRes.user.id,
        username: verifyRes.user.username,
        displayName: verifyRes.user.display_name || keys.displayName,
        encryptionPublicKey: keys.encryptionPublicKey,
        encryptionPrivateKey: keys.encryptionPrivateKey,
        signingPublicKey: keys.signingPublicKey,
        signingPrivateKey: keys.signingPrivateKey,
        token: verifyRes.token,
      });

      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
      setKeyGenStatus('');
    }
  }

  const activeTabClass = "bg-neutral-700 text-white shadow shadow-black/50";
  const inactiveTabClass = "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80";

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden text-neutral-200 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md bg-neutral-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-purple-500/30"
          >
            <Shield size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400 tracking-tight mb-1">
            SteganoChat
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-medium">
            End-to-End Encrypted • Zero Knowledge
          </p>
        </div>

        <div className="flex bg-neutral-950/50 p-1.5 rounded-xl mb-8 border border-white/5">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? activeTabClass : inactiveTabClass}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            <UserPlus size={16} /> Register
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? activeTabClass : inactiveTabClass}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            <LogIn size={16} /> Login
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'import' ? activeTabClass : inactiveTabClass}`}
            onClick={() => { setMode('import'); setError(''); }}
          >
            <Upload size={16} /> Import
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-xl mb-6 flex items-start gap-3"
            >
              <div className="mt-0.5"><Lock size={16} /></div>
              <div className="flex-1">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {keyGenStatus && (
          <div className="flex items-center justify-center gap-3 text-indigo-400 text-sm mb-6 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl font-medium animate-pulse">
            <Loader2 size={18} className="animate-spin" />
            <span>{keyGenStatus}</span>
          </div>
        )}

        {mode === 'register' && (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleRegister}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Username</label>
              <input
                type="text"
                placeholder="e.g. gautam"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                disabled={loading}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3.5 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-neutral-700 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Gautam Verma"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3.5 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-neutral-700 font-medium"
              />
            </div>
            <div className="flex gap-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs p-4 rounded-xl leading-relaxed">
              <div className="mt-0.5 shrink-0"><Key size={14} /></div>
              <span>A unique RSA-4096 key pair will be generated on your device. Your private key never leaves this device.</span>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
              {loading ? 'Generating Keys...' : 'Generate Keys & Register'}
            </button>
          </motion.form>
        )}

        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-4 rounded-xl leading-relaxed">
              <div className="mt-0.5 shrink-0"><Lock size={14} /></div>
              <span>
                Zero-Knowledge Auth means there is no password. Your identity is verified through your cryptographic private key.
                If this is a new device, import your key backup using the Import tab.
              </span>
            </div>
          </motion.div>
        )}

        {mode === 'import' && (
          <motion.form
            key="import"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleImport}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Key Backup Data</label>
              <div className="relative">
                <textarea
                  placeholder="Paste your exported key backup here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  required
                  disabled={loading}
                  rows={6}
                  className={`w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3.5 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-xs resize-none ${showImportData ? '' : 'text-transparent bg-stripe-pattern font-security'}`}
                  style={!showImportData && importData ? { textShadow: '0 0 16px rgba(255,255,255,0.7)', color: 'transparent' } : {}}
                />
                <button
                  type="button"
                  className="absolute bottom-3 right-3 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-colors"
                  onClick={() => setShowImportData(!showImportData)}
                >
                  {showImportData ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !importData.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {loading ? 'Importing...' : 'Import & Login'}
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
