
import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SecureVaultProps {
  onUnlock: () => void;
  isUnlocked: boolean;
}

const SecureVault: React.FC<SecureVaultProps> = ({ onUnlock, isUnlocked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') { // Mock PIN
      onUnlock();
      setError(false);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isUnlocked) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900/50 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl text-center"
      >
        <div className="mb-8 relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center mx-auto ring-1 ring-indigo-500/50">
            <Lock size={32} className="text-indigo-400" />
          </div>
          <div className="absolute -top-1 -right-1">
            <ShieldCheck size={24} className="text-emerald-500 fill-emerald-500/20" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Secure Vault</h2>
        <p className="text-zinc-400 text-sm mb-8">
          Your protected media is encrypted. Enter your 4-digit PIN to access this folder.
        </p>

        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  pin.length > i 
                    ? 'bg-indigo-500 border-indigo-500 scale-125' 
                    : 'border-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="relative">
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN"
              className={`w-full bg-zinc-800/50 border ${error ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-white/5'} text-white text-center text-2xl tracking-[1em] py-4 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-zinc-600`}
              autoFocus
            />
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 text-red-500 text-xs font-medium"
                >
                  <AlertCircle size={12} />
                  Incorrect PIN. Try again.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Unlock size={18} />
            Unlock Vault
          </button>
        </form>

        <p className="mt-8 text-xs text-zinc-500">
          Hint: The mock PIN is <span className="text-indigo-400">1234</span>
        </p>
      </motion.div>
    </div>
  );
};

export default SecureVault;
