import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Fingerprint, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { AppLockSettings, Language } from '../types';
import { 
  loadLockSettings, 
  saveLockSettings, 
  isBiometricsAvailable, 
  registerBiometricCredential,
  authenticateWithBiometrics
} from '../utils/appLockService';
import { translations } from '../translations';

interface AppLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSettingsSaved: (settings: AppLockSettings) => void;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AppLockSettings>(loadLockSettings);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [hasBiometricsHardware, setHasBiometricsHardware] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = loadLockSettings();
      setSettings(current);
      setPinInput(current.pin || '');
      setConfirmPinInput(current.pin || '');
      setErrorMsg('');
      setSuccessMsg('');

      isBiometricsAvailable().then((avail) => {
        setHasBiometricsHardware(avail);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const t = translations[lang];

  const handleSave = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (settings.isEnabled) {
      if (!pinInput || pinInput.length < 4) {
        setErrorMsg(
          lang === 'ar'
            ? 'يجب إدخال رمز PIN أو كلمة مرور مكونة من 4 خانات على الأقل'
            : 'Il codice PIN deve contenere almeno 4 cifre'
        );
        return;
      }

      if (pinInput !== confirmPinInput) {
        setErrorMsg(
          lang === 'ar'
            ? 'رمز PIN غير متطابق مع التأكيد'
            : 'I codici PIN inseriti non corrispondono'
        );
        return;
      }
    }

    const updated: AppLockSettings = {
      ...settings,
      pin: settings.isEnabled ? pinInput.trim() : undefined,
    };

    saveLockSettings(updated);
    onSettingsSaved(updated);
    setSuccessMsg(
      lang === 'ar' ? 'تم حفظ إعدادات حماية وقفل التطبيق بنجاح!' : 'Impostazioni di blocco salvate con successo!'
    );

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleToggleBiometrics = async (checked: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!checked) {
      setSettings((prev) => ({ ...prev, useBiometrics: false }));
      return;
    }

    try {
      const ok = await registerBiometricCredential();
      if (ok) {
        setSettings((prev) => ({ ...prev, useBiometrics: true }));
        setSuccessMsg(lang === 'ar' ? 'تم تسجيل وتفعيل بصمة الوجه / الإصبع بنجاح!' : 'Biometria registrata con successo!');
      } else {
        const testOk = await authenticateWithBiometrics();
        if (testOk) {
          setSettings((prev) => ({ ...prev, useBiometrics: true }));
          setSuccessMsg(lang === 'ar' ? 'تم تفعيل التحقق البيومتري!' : 'Autenticazione biometrica attivata!');
        } else {
          setErrorMsg(lang === 'ar' ? 'تعذر تفعيل البصمة. تأكد من تفعيل البصمة أو Face ID في جهازك.' : 'Impossibile attivare la biometria. Verifica le impostazioni del dispositivo.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ في تفعيل البصمة');
    }
  };

  const handleTestBiometrics = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      setSettings((prev) => ({ ...prev, useBiometrics: true }));
      alert(lang === 'ar' ? 'تم التحقق من البصمة / Face ID بنجاح!' : 'Autenticazione biometrica riuscita!');
    } else {
      alert(lang === 'ar' ? 'تعذر التحقق من البصمة' : 'Verifica biometrica non riuscita');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <Lock className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'ar' ? 'أمان وقفل التطبيق' : 'Sicurezza & Blocco App'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'ar' 
                  ? 'حماية الوثائق برمز PIN وبصمة الهاتف (Face ID / Fingerprint)' 
                  : 'Proteggi i documenti con PIN, password e biometria'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 text-sm">
          
          {/* Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Toggle Enable Lock */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {lang === 'ar' ? 'تفعيل قفل التطبيق' : 'Attiva Blocco Applicazione'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'طلب رمز PIN أو البصمة عند فتح التطبيق'
                  : 'Richiedi PIN o biometria all\'avvio'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {settings.isEnabled && (
            <div className="space-y-4 animate-in fade-in">
              {/* PIN Code Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رمز PIN الجديد' : 'Nuovo Codice PIN'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute inset-y-0 start-3 my-auto" />
                    <input
                      type="password"
                      maxLength={8}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="••••"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'تأكيد رمز PIN' : 'Conferma Codice PIN'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute inset-y-0 start-3 my-auto" />
                    <input
                      type="password"
                      maxLength={8}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="••••"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Biometrics Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500 text-white shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {lang === 'ar' ? 'دعم بصمة الإصبع / Face ID' : 'Autenticazione Biometrica'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hasBiometricsHardware
                        ? (lang === 'ar' ? 'الجهاز يدعم مستشعر البصمة أو Face ID' : 'Sensore biometrico disponibile sul dispositivo')
                        : (lang === 'ar' ? 'متاح عند دعم المتصفح أو الهاتف لـ WebAuthn' : 'Disponibile su dispositivi compatibili')}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useBiometrics}
                    onChange={(e) => handleToggleBiometrics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Auto-lock Timeout */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-500" />
                  <span>{lang === 'ar' ? 'القفل التلقائي عند عدم الاستخدام بعد:' : 'Blocco automatico dopo:'}</span>
                </label>
                <select
                  value={settings.autoLockMinutes}
                  onChange={(e) => setSettings({ ...settings, autoLockMinutes: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm"
                >
                  <option value={1}>{lang === 'ar' ? 'دقيقة واحدة (1 دقيقة)' : '1 minuto'}</option>
                  <option value={5}>{lang === 'ar' ? '5 دقائق (موصى به)' : '5 minuti (Consigliato)'}</option>
                  <option value={15}>{lang === 'ar' ? '15 دقيقة' : '15 minuti'}</option>
                  <option value={30}>{lang === 'ar' ? '30 دقيقة' : '30 minuti'}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {t.modal.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/25 transition-all"
          >
            {t.modal.save}
          </button>
        </div>
      </div>
    </div>
  );
};
