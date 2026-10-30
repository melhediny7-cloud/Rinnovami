import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Fingerprint, Delete, ShieldAlert } from 'lucide-react';
import { Language } from '../types';
import { 
  loadLockSettings, 
  verifyPinCode, 
  setSessionUnlocked, 
  authenticateWithBiometrics 
} from '../utils/appLockService';

interface AppLockScreenProps {
  lang: Language;
  onUnlocked: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ lang, onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [isBiometricChecking, setIsBiometricChecking] = useState(false);
  const settings = loadLockSettings();

  // Auto-trigger native Face ID / Fingerprint on screen appear
  useEffect(() => {
    if (settings.useBiometrics) {
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [settings.useBiometrics]);


  const handleKeyPress = (digit: string) => {
    if (pin.length >= 8) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    // Auto-check if matches settings PIN length
    if (settings.pin && nextPin.length === settings.pin.length) {
      if (verifyPinCode(nextPin)) {
        setSessionUnlocked();
        onUnlocked();
      } else {
        triggerError();
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleBiometricAuth = async () => {
    setIsBiometricChecking(true);
    try {
      const ok = await authenticateWithBiometrics();
      if (ok) {
        setSessionUnlocked();
        onUnlocked();
      }
    } finally {
      setIsBiometricChecking(false);
    }
  };

  const triggerError = () => {
    setErrorShake(true);
    setTimeout(() => {
      setErrorShake(false);
      setPin('');
    }, 600);
  };

  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPinCode(pin)) {
      setSessionUnlocked();
      onUnlocked();
    } else {
      triggerError();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in select-none">
      <div 
        className={`w-full max-w-sm flex flex-col items-center text-center space-y-6 ${
          errorShake ? 'animate-shake' : ''
        }`}
      >
        {/* App Logo & Lock Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-brand-500/30 ring-8 ring-white/5">
            <Lock className="w-10 h-10" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Rinnovami
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar' ? 'التطبيق مقفل لحماية بياناتك الرسمية' : 'Applicazione bloccata per sicurezza'}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 py-2">
          {Array.from({ length: settings.pin?.length || 4 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? 'bg-brand-500 scale-125 shadow-lg shadow-brand-500/50'
                  : 'bg-slate-700 border border-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Numeric Keypad for fast touch or mouse entry */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xl transition-all flex items-center justify-center border border-white/5 shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics button (if enabled) */}
          {settings.useBiometrics ? (
            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={isBiometricChecking}
              className="h-14 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold transition-all flex items-center justify-center border border-indigo-500/20 active:scale-95"
              title="Biometria"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xl transition-all flex items-center justify-center border border-white/5 shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all flex items-center justify-center"
            title="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Biometrics quick prompt banner if enabled */}
        {settings.useBiometrics && (
          <button
            type="button"
            onClick={handleBiometricAuth}
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors pt-2"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{lang === 'ar' ? 'فتح عبر بصمة الإصبع أو Face ID' : 'Sblocca con Impronta / Face ID'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
