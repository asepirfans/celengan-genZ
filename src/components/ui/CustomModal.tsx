'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'danger' 
              ? 'bg-[#180A0A]/90 border-[#FF4E4E]/40 text-[#FF8E8E]' 
              : toast.type === 'info'
              ? 'bg-[#0A141E]/90 border-[#38BDF8]/40 text-[#38BDF8]'
              : 'bg-[#0A1810]/90 border-[#3EFF9A]/40 text-[#3EFF9A]'
          }`}>
            {toast.type === 'danger' ? (
              <AlertTriangle className="w-4 h-4 text-[#FF4E4E]" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-[#38BDF8]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#3EFF9A]" />
            )}
            <span className="text-xs font-semibold text-white">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Aesthetic Confirmation Modal */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#141414] border border-[#282828] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
            {/* Top Glow Accent */}
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-xl ${
              dialog.type === 'danger' 
                ? 'bg-[#FF4E4E]/10 border border-[#FF4E4E]/20 text-[#FF4E4E]' 
                : 'bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8]'
            }`}>
              {dialog.type === 'danger' ? (
                <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              ) : (
                <HelpCircle className="w-7 h-7 stroke-[2.2]" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold font-display text-white">
                {dialog.title}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {dialog.message}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-[#1F1F1F] hover:bg-[#282828] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-[#2C2C2C]"
              >
                {dialog.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 py-2.5 font-bold font-display rounded-xl text-xs transition-all ${
                  dialog.type === 'danger'
                    ? 'bg-[#FF4E4E] hover:bg-[#ff6868] text-white shadow-[0_0_15px_rgba(255,78,78,0.3)]'
                    : 'bg-[#38BDF8] hover:bg-[#60a5fa] text-black shadow-[0_0_15px_rgba(56,189,248,0.25)]'
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
