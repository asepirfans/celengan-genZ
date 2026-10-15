'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastOptions {
  message: string;
  type?: 'success' | 'danger' | 'info';
  duration?: number;
}

interface ModalContextType {
  confirmModal: (options: DialogOptions) => void;
  showToast: (options: ToastOptions) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const expire = () => { setDialog(null); setToast(null); };
    window.addEventListener('celengan-session-expired',expire);
    return () => window.removeEventListener('celengan-session-expired',expire);
  }, []);

  const confirmModal = (options: DialogOptions) => {
    setDialog(options);
  };

  const showToast = (options: ToastOptions) => {
    setToast(options);
    setTimeout(() => {
      setToast(null);
    }, options.duration || 3000);
  };

  const handleConfirm = async () => {
    if (dialog?.onConfirm) {
      setIsLoading(true);
      try {
        await dialog.onConfirm();
      } catch (error) {
        showToast({message:error instanceof Error?error.message:'Permintaan belum berhasil. Coba lagi.',type:'danger'});
        return;
      } finally {
        setIsLoading(false);
      }
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (dialog?.onCancel) {
      dialog.onCancel();
    }
    setDialog(null);
  };

  return (
    <ModalContext.Provider value={{ confirmModal, showToast }}>
      {children}

      {/* Aesthetic Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-4 left-4 sm:left-auto sm:right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'danger'
              ? 'bg-[var(--surface-elevated)]/90 border-[var(--accent-danger)]/40 text-[var(--accent-danger)]'
              : toast.type === 'info'
              ? 'bg-[var(--surface-card)] border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
              : 'bg-[var(--surface-card)] border-[var(--accent-success)]/40 text-[var(--accent-success)]'
          }`}>
            {toast.type === 'danger' ? (
              <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-[var(--accent-primary)]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
            )}
            <span className="text-xs font-semibold text-[var(--text-primary)]">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Aesthetic Confirmation Modal */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
            {/* Top Glow Accent */}
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-xl ${
              dialog.type === 'danger'
                ? 'bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)]'
                : 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
            }`}>
              {dialog.type === 'danger' ? (
                <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              ) : (
                <HelpCircle className="w-7 h-7 stroke-[2.2]" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
                {dialog.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {dialog.message}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-semibold transition-all border border-[var(--border-subtle)]"
              >
                {dialog.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 py-2.5 font-bold font-display rounded-xl text-xs transition-all ${
                  dialog.type === 'danger'
                    ? 'bg-[var(--accent-danger)] hover:opacity-90 text-[var(--on-accent)] '
                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] '
                }`}
              >
                {isLoading ? 'Memproses...' : (dialog.confirmText || 'Konfirmasi')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}
