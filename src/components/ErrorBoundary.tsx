import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const errorDetails = `Rinnovami Error Report:\nError: ${this.state.error?.message || 'Unknown'}\nStack: ${this.state.error?.stack || ''}\nComponentStack: ${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(errorDetails);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleClearAndReset = () => {
    if (window.confirm('هل تريد مسح الجلسة المؤقتة وإعادة فتح التطبيق؟ (لن تُحذف مستنداتك المحفوظة)')) {
      sessionStorage.clear();
      window.location.href = './';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 animate-in fade-in">
            
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertOctagon className="w-8 h-8" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                حدث خطأ غير متوقع / Errore Imprevisto
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                قام درع الحماية (ErrorBoundary) بعزل الخطأ لمنع تعطل بياناتك. يمكنك إعادة تشغيل التطبيق أو نسخ تفاصيل الخطأ.
              </p>
            </div>

            {/* Error Technical Details */}
            {this.state.error && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 text-start text-[11px] font-mono text-rose-300 overflow-x-auto max-h-36">
                <p className="font-bold text-rose-400">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-slate-500 text-[10px] mt-1 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تشغيل التطبيق / Ricarica</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {this.state.copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{this.state.copied ? 'تم النسخ' : 'نسخ الخطأ'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleClearAndReset}
              className="text-[11px] text-slate-500 hover:text-slate-400 underline underline-offset-4"
            >
              إعادة تعيين الجلسة والبدء في وضع الأمان (Reset Session)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
