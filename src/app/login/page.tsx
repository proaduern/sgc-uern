'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      router.push(data.redirect || '/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setEmail('proad@uern.br');
    setSenha('123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#002244] to-[#003366] flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto py-2">
        <div className="flex items-center space-x-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-lg shadow-lg">
            U
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-wide">UERN</h1>
            <p className="text-xs text-blue-200">Pró-Reitoria de Administração - PROAD</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>IN nº 01/2026 - PROAD / Lei 14.133</span>
        </div>
      </header>

      {/* Center Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#003366] mb-3 shadow-inner">
              <BookOpen className="w-7 h-7 text-[#0055A5]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">SGC - UERN</h2>
            <p className="text-sm text-slate-500 mt-1">
              Gestão e Fiscalização de Contratos e Atas
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                E-mail Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@uern.br"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Senha
                </label>
                <a
                  href="https://autenticacao.uern.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#003366] hover:bg-[#002244] active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helper Pill */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleFillAdmin}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-blue-700 transition-colors bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200"
            >
              <span>Preencher Admin Inicial (proad@uern.br / 123)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-blue-200/70 py-4 max-w-6xl mx-auto w-full">
        <p>
          Fundação Universidade do Estado do Rio Grande do Norte - FUERN | Pró-Reitoria de Administração
        </p>
        <p className="mt-1 text-blue-300/50">
          Em conformidade com a Instrução Normativa nº 01/2026 - PROAD/UERN
        </p>
      </footer>
    </div>
  );
}
