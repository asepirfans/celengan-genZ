'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Lock, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
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
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8] mx-auto flex items-center justify-center text-black font-black text-2xl shadow-[0_0_20px_rgba(56,189,248,0.35)]">
            💸
          </div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            CELENGAN<span className="text-[#38BDF8]">.</span>GENZ
          </h1>
          <p className="text-xs text-neutral-400">
            {isRegisterMode ? 'Buat akun & kelola finansial aesthetic kamu' : 'Masuk ke akun pencatat keuangan cerdasmu'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-[#0D0D0D] border border-[#222] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              !isRegisterMode ? 'bg-[#222] text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              isRegisterMode ? 'bg-[#222] text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Daftar (Register)
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FF4E4E]/10 border border-[#FF4E4E]/40 rounded-xl text-xs text-[#FF8E8E] flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#3EFF9A]/10 border border-[#3EFF9A]/40 rounded-xl text-xs text-[#3EFF9A] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-medium text-neutral-400">Nama Lengkap</label>
              <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 focus-within:border-[#38BDF8]">
                <User className="w-4 h-4 text-neutral-500 mr-2.5" />
                <input
                  type="text"
                  placeholder="Contoh: Awan Pratama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegisterMode}
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400">Alamat Email</label>
            <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 focus-within:border-[#38BDF8]">
              <Mail className="w-4 h-4 text-neutral-500 mr-2.5" />
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400">Kata Sandi</label>
            <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 focus-within:border-[#38BDF8]">
              <Lock className="w-4 h-4 text-neutral-500 mr-2.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] text-sm disabled:opacity-50"
            >
              {loading ? 'Memproses...' : isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Dashboard'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-neutral-500 pt-2 border-t border-[#222]">
          {isRegisterMode ? 'Sudah punya akun?' : 'Belum memiliki akun?'}{' '}
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-[#38BDF8] font-semibold hover:underline"
          >
            {isRegisterMode ? 'Login di sini' : 'Daftar sekarang'}
          </button>
        </p>
      </div>
    </div>
  );
}
