import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ScanLine,
  AlertTriangle
} from 'lucide-react';
import { DocumentCategory, DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { runItalianOCR } from '../utils/ocrService';
import { ParsedDocumentData } from '../utils/italianDocParser';
import { compressImageFile } from '../utils/imageCompressor';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: DocumentItem) => void;
  documentToEdit?: DocumentItem | null;
  lang: Language;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentToEdit,
  lang,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('permesso_soggiorno');
  const [documentNumber, setDocumentNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(60);
  const [notes, setNotes] = useState('');

  // File state
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);

  // OCR state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [parsedResult, setParsedResult] = useState<ParsedDocumentData | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [isDateEstimated, setIsDateEstimated] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (documentToEdit) {
      setTitle(documentToEdit.title);
      setCategory(documentToEdit.category);
      setDocumentNumber(documentToEdit.documentNumber || '');
      setHolderName(documentToEdit.holderName || '');
      setIssueDate(documentToEdit.issueDate || '');
      setExpiryDate(documentToEdit.expiryDate);
      setIssuingAuthority(documentToEdit.issuingAuthority || '');
      setReminderDaysBefore(documentToEdit.reminderDaysBefore || 60);
      setNotes(documentToEdit.notes || '');
      setFileData(documentToEdit.fileData);
      setFileName(documentToEdit.fileName);
      setFileType(documentToEdit.fileType);
      setFileSize(documentToEdit.fileSize);
      setParsedResult(null);
      setIsDateEstimated(false);
    } else {
      setTitle('');
      setCategory('permesso_soggiorno');
      setDocumentNumber('');
      setHolderName('');
      setIssueDate('');
      setExpiryDate('');
      setIssuingAuthority('');
      setReminderDaysBefore(60);
      setNotes('');
      setFileData(undefined);
      setFileName(undefined);
      setFileType(undefined);
      setFileSize(undefined);
      setParsedResult(null);
      setIsDateEstimated(false);
    }
    setErrors({});
    setIsScanning(false);
    setScanProgress(0);
  }, [documentToEdit, isOpen]);

  if (!isOpen) return null;
  const t = translations[lang];

  const applyParsedData = (data: ParsedDocumentData) => {
    if (!isMountedRef.current) return;
    setParsedResult(data);

    // Apply parsed data directly from the document OCR
    if (data.title && !title) setTitle(data.title);
    if (data.category && data.category !== 'altro') setCategory(data.category);
    if (data.documentNumber) setDocumentNumber(data.documentNumber);
    if (data.holderName) setHolderName(data.holderName);
    if (data.issueDate) setIssueDate(data.issueDate);
    if (data.expiryDate) {
      setExpiryDate(data.expiryDate);
      setIsDateEstimated(!!data.isExpiryEstimated);
    }
    if (data.issuingAuthority) setIssuingAuthority(data.issuingAuthority);
  };

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setFileType(file.type);

    try {
      // 1. Compress image to max 1600px and 0.8 JPEG quality before storing!
      const compression = await compressImageFile(file, 1600, 0.8);
      if (!isMountedRef.current) return;

      setFileData(compression.dataUrl);
      setFileSize(compression.size);

      // 2. Start Italian OCR / PDF analysis
      setIsScanning(true);
      setScanProgress(15);

      const parsed = await runItalianOCR(file, file.name, (p) => {
        if (isMountedRef.current) {
          setScanProgress(Math.round(p.progress * 100));
        }
      });

      if (isMountedRef.current) {
        applyParsedData(parsed);
      }
    } catch (err) {
      console.error('File processing error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFileData(undefined);
    setFileName(undefined);
    setFileType(undefined);
    setFileSize(undefined);
    setParsedResult(null);
    setIsDateEstimated(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t.modal.requiredField;
    }
    if (!expiryDate) {
      newErrors.expiryDate = t.modal.requiredField;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const doc: DocumentItem = {
      id: documentToEdit ? documentToEdit.id : `doc-${Date.now()}`,
      title: title.trim(),
      category,
      documentNumber: documentNumber.trim(),
      holderName: holderName.trim(),
      issueDate: issueDate || undefined,
      expiryDate,
      issuingAuthority: issuingAuthority.trim() || undefined,
      reminderDaysBefore: Number(reminderDaysBefore),
      notes: notes.trim() || undefined,
      fileData,
      fileName,
      fileType,
      fileSize,
      isDemo: false, // User created document is never demo
      createdAt: documentToEdit ? documentToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(doc);
    onClose();
  };

  const categories = Object.keys(t.categories) as DocumentCategory[];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {documentToEdit ? t.modal.editTitle : t.modal.addNewTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'التحقق التلقائي الذكي من الوثائق باللغة الإيطالية واستخراج التواريخ'
                  : 'Riconoscimento intelligente dei documenti italiani e delle scadenze'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'رفع صورة الوثيقة أو ملف PDF للتحليل' : 'Carica documento o PDF per l\'analisi'}
            </label>

            {!fileData ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t.modal.uploadDropzone}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.modal.uploadHint}
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-1 text-xs text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-950/50 px-3 py-1 rounded-full border border-brand-200/60 dark:border-brand-800/60">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.modal.autoDetectHint}</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 overflow-hidden">
                  {fileType?.startsWith('image/') ? (
                    <img
                      src={fileData}
                      alt="Thumbnail"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fileSize ? `${(fileSize / 1024).toFixed(0)} KB (مضغوط)` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title={t.modal.removeFile}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* OCR Scanning Progress Indicator */}
            {isScanning && (
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-brand-800 dark:text-brand-200">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                    <span>{t.modal.ocrScanning}</span>
                  </div>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-brand-200 dark:bg-brand-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Extraction Results: Warning if 0 fields found, Success if fields found */}
            {parsedResult && !isScanning && (
              parsedResult.confidenceScore > 0 && parsedResult.extractedFields.length > 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.modal.ocrSuccess}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 font-black text-[10px]">
                      {t.modal.ocrConfidence} {parsedResult.confidenceScore}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsedResult.extractedFields.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                      >
                        {field}
                      </span>
                    ))}
                  </div>

                  {parsedResult.rawText && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        <span>{showRawText ? t.modal.hideExtractedText : t.modal.viewExtractedText}</span>
                        {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showRawText && (
                        <pre className="mt-2 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                          {parsedResult.rawText}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? 'لم يتم التعرف بوضوح على نصوص داخل المستند. يرجى إدخال البيانات وتاريخ الانتهاء يدوياً.'
                        : 'Impossibile estrarre chiaramente i dati dal documento. Inserisci i campi manualmente.'}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Title & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.documentTitle} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.modal.titlePlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.title ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.category} <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t.categories[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Number & Holder Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.documentNumber}
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder={t.modal.numberPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.holderName}
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder={t.modal.holderPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Dates: Issue Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.issueDate}
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.modal.expiryDate} <span className="text-rose-500">*</span>
                </label>
                {isDateEstimated && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                    ⚠️ {lang === 'ar' ? 'تاريخ مقدّر (يرجى التأكيد)' : 'Data stimata (verificare)'}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setIsDateEstimated(false); // User manually modified or confirmed date
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.expiryDate ? 'border-rose-500' : isDateEstimated ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold`}
              />
              {errors.expiryDate && <p className="text-xs text-rose-500 mt-1">{errors.expiryDate}</p>}
            </div>
          </div>

          {/* Issuing Authority & Reminder Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.issuingAuthority}
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder={t.modal.authorityPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modal.reminderThreshold}
              </label>
              <select
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value={15}>15 {t.modal.days} (تنبيه متأخر / Allerta tardiva)</option>
                <option value={30}>30 {t.modal.days} (شهر قبل / 1 mese prima)</option>
                <option value={60}>60 {t.modal.days} (شهران قبل / 2 mesi prima - مثالي للإقامة)</option>
                <option value={90}>90 {t.modal.days} (3 أشهر قبل / 3 mesi prima - مثالي للهوية)</option>
                <option value={180}>180 {t.modal.days} (6 أشهر قبل / 6 mesi prima)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.modal.notes}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.modal.notesPlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t.modal.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t.modal.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
