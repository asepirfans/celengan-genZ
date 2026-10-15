'use client';

import React, { useState } from 'react';
import { ChickenLogo } from '@/components/ui/ChickenLogo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Mail, Lock, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { login, register } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(pathname === '/register');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    if (!email || !password) {
      setErrorMessage('Email dan password wajib diisi.');
      setLoading(false);
      return;
    }

    if (isRegisterMode) {
      const res = await register(email, password, name);
      if (res.success) {
        setSuccessMessage('Akun berhasil didaftarkan! Mengalihkan ke dashboard...');
        setTimeout(() => router.push('/dashboard'), 800);
      } else {
        setErrorMessage(res.error || 'Gagal mendaftar.');
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setErrorMessage(res.error || 'Akun tidak ditemukan atau kata sandi salah.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center p-4 relative overflow-hidden">


      <Link href="/" className="mb-5 min-h-11 inline-flex items-center text-sm text-[var(--text-secondary)] hover:underline">Kembali ke beranda</Link>
      <div className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] mx-auto flex items-center justify-center text-[var(--on-accent)] font-black text-2xl ">
            <ChickenLogo className="w-6 h-6" strokeWidth={1.6} />
          </div>
          <h1 className="text-2xl font-bold font-display text-[var(--text-primary)] tracking-tight">
            Celengan<span className="text-[var(--accent-primary)]">GenZ</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {isRegisterMode ? 'Mulai kelola uang dengan lebih teratur' : 'Catatan keuanganmu, dalam satu tempat'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              !isRegisterMode ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              isRegisterMode ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Daftar
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/40 rounded-xl text-xs text-[var(--accent-danger)] flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/40 rounded-xl text-xs text-[var(--accent-success)] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Lengkap</label>
              <div className="relative flex items-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 focus-within:border-[var(--accent-primary)]">
                <User className="w-4 h-4 text-[var(--text-muted)] mr-2.5" />
                <input
                  type="text"
                  placeholder="Contoh: Awan Pratama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegisterMode}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Alamat Email</label>
            <div className="relative flex items-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 focus-within:border-[var(--accent-primary)]">
              <Mail className="w-4 h-4 text-[var(--text-muted)] mr-2.5" />
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Kata Sandi</label>
            <div className="relative flex items-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 focus-within:border-[var(--accent-primary)]">
              <Lock className="w-4 h-4 text-[var(--text-muted)] mr-2.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2  text-sm disabled:opacity-50"
            >
              {loading ? 'Memproses...' : isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Dashboard'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
          {isRegisterMode ? 'Sudah punya akun?' : 'Belum memiliki akun?'}{' '}
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-[var(--accent-primary)] font-semibold hover:underline"
          >
            {isRegisterMode ? 'Login di sini' : 'Daftar sekarang'}
          </button>
        </p>
      </div>
    </div>
  );
}
