'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Award,
  Users,
  Flame,
  Scale,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

export default function ParametrosKpiContratosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const [isCustomizado, setIsCustomizado] = useState(false);
  const [atualizadoPor, setAtualizadoPor] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Form states
  const [config, setConfig] = useState({
    diasAlertaNovaLicitacaoMin: 180,
    diasAlertaNovaLicitacaoMax: 240,
    diasAlertaProrrogacao: 120,
    limiteMaximoAcrescimoLegal: 25.0,
    pesoComUsuarioImr: 30.0,
    pesoComUsuarioNps: 20.0,
    pesoComUsuarioTrabalhista: 20.0,
    pesoComUsuarioPenalidades: 15.0,
    pesoComUsuarioFiscal: 15.0,
    pesoSemUsuarioImr: 40.0,
    pesoSemUsuarioTrabalhista: 25.0,
    pesoSemUsuarioPenalidades: 20.0,
    pesoSemUsuarioFiscal: 15.0,
    limiarDiamante: 90,
    limiarOuro: 75,
    limiarPrata: 50,
  });

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch('/api/kpis/contratos/parametros');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setConfig(data.config);
          }
          setIsCustomizado(Boolean(data.isCustomizado));
          setAtualizadoPor(data.atualizadoPor || null);
          setUpdatedAt(data.updatedAt || null);
        }
      } catch (e) {
        console.error('Erro ao carregar parâmetros:', e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const somaPesosComUsuario = Number(
    (
      config.pesoComUsuarioImr +
      config.pesoComUsuarioNps +
      config.pesoComUsuarioTrabalhista +
      config.pesoComUsuarioPenalidades +
      config.pesoComUsuarioFiscal
    ).toFixed(1)
  );

  const somaPesosSemUsuario = Number(
    (
      config.pesoSemUsuarioImr +
      config.pesoSemUsuarioTrabalhista +
      config.pesoSemUsuarioPenalidades +
      config.pesoSemUsuarioFiscal
    ).toFixed(1)
  );

  const pesosValidos =
    Math.abs(somaPesosComUsuario - 100.0) < 0.1 &&
    Math.abs(somaPesosSemUsuario - 100.0) < 0.1;

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSucessoMsg(null);
    setErroMsg(null);

    if (!pesosValidos) {
      setErroMsg('A soma dos pesos em cada bloco de IQContrato deve ser exatamente 100%.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/kpis/contratos/parametros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          atualizadoPor: 'Administrador PROAD',
        }),
      });

      if (!res.ok) throw new Error('Falha ao salvar no servidor');

      setSucessoMsg('Parâmetros e pesos do IQContrato salvos com sucesso!');
      setIsCustomizado(true);
      setUpdatedAt(new Date().toISOString());
      router.refresh();
    } catch (err: any) {
      setErroMsg(err.message || 'Erro ao salvar parâmetros.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRestaurarPadroes() {
    if (!confirm('Deseja realmente restaurar os parâmetros e pesos originais da Lei 14.133/2021?')) return;
    setRestaurando(true);
    setSucessoMsg(null);
    setErroMsg(null);

    try {
      const res = await fetch('/api/kpis/contratos/parametros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurarPadroes: true }),
      });

      if (!res.ok) throw new Error('Falha ao restaurar');

      setConfig({
        diasAlertaNovaLicitacaoMin: 180,
        diasAlertaNovaLicitacaoMax: 240,
        diasAlertaProrrogacao: 120,
        limiteMaximoAcrescimoLegal: 25.0,
        pesoComUsuarioImr: 30.0,
        pesoComUsuarioNps: 20.0,
        pesoComUsuarioTrabalhista: 20.0,
        pesoComUsuarioPenalidades: 15.0,
        pesoComUsuarioFiscal: 15.0,
        pesoSemUsuarioImr: 40.0,
        pesoSemUsuarioTrabalhista: 25.0,
        pesoSemUsuarioPenalidades: 20.0,
        pesoSemUsuarioFiscal: 15.0,
        limiarDiamante: 90,
        limiarOuro: 75,
        limiarPrata: 50,
      });

      setIsCustomizado(false);
      setSucessoMsg('Parâmetros originais de fábrica restaurados com sucesso.');
      router.refresh();
    } catch (err: any) {
      setErroMsg(err.message || 'Erro ao restaurar.');
    } finally {
      setRestaurando(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center text-slate-500">
        Carregando parâmetros de gestão contratual...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/kpis-contratos"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#003366] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel do IQContrato
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#003366]" />
            Parâmetros do Radar de Continuidade &amp; IQContrato
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Personalize os prazos de antecipação de nova licitação, prorrogações tempestivas, pesos do IQContrato e limiares de fornecedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCustomizado ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Parâmetros Customizados pelo Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#003366] border border-blue-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Padrões Originais (Lei 14.133/21)
            </span>
          )}
        </div>
      </div>

      {updatedAt && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 flex items-center justify-between">
          <span>
            Última alteração por: <strong>{atualizadoPor || 'Administrador PROAD'}</strong>
          </span>
          <span>
            Data: <strong>{new Date(updatedAt).toLocaleString('pt-BR')}</strong>
          </span>
        </div>
      )}

      {sucessoMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {sucessoMsg}
        </div>
      )}

      {erroMsg && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" /> {erroMsg}
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-8">
        {/* Bloco 1: Radar de Continuidade e Queima de Saldo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" />
              Radar de Continuidade Contratual &amp; Queima de Saldo
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Prazos de antecedência para deflagração de novas contratações no PCA e acionamento de prorrogações tempestivas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Alerta Nova Licitação (Disparo Inicial)
              </label>
              <p className="text-[11px] text-slate-500">
                Dias de antecedência máxima para início do alerta de novo processo no PCA.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="60"
                  max="365"
                  value={config.diasAlertaNovaLicitacaoMax}
                  onChange={(e) =>
                    setConfig({ ...config, diasAlertaNovaLicitacaoMax: Number(e.target.value) })
                  }
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Alerta Nova Licitação (Prazo Crítico)
              </label>
              <p className="text-[11px] text-slate-500">
                Dias de antecedência mínima obrigatória para deflagração imediata no PCA.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="30"
                  max="240"
                  value={config.diasAlertaNovaLicitacaoMin}
                  onChange={(e) =>
                    setConfig({ ...config, diasAlertaNovaLicitacaoMin: Number(e.target.value) })
                  }
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Prorrogação Tempestiva
              </label>
              <p className="text-[11px] text-slate-500">
                Dias de antecedência para pesquisa de vantajosidade e termo aditivo de renovação.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={config.diasAlertaProrrogacao}
                  onChange={(e) =>
                    setConfig({ ...config, diasAlertaProrrogacao: Number(e.target.value) })
                  }
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Limite Legal de Acréscimo
              </label>
              <p className="text-[11px] text-slate-500">
                Teto máximo de aditivo por burn rate (art. 125, Lei 14.133/21).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="50"
                  value={config.limiteMaximoAcrescimoLegal}
                  onChange={(e) =>
                    setConfig({ ...config, limiteMaximoAcrescimoLegal: Number(e.target.value) })
                  }
                  required
                  className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">% da base</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Pesos do IQContrato COM Público Usuário */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                IQContrato: Ponderações COM Público Usuário (Limpeza, Manutenção, Clima, etc.)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribuição dos pesos para contratos com prestação direta de serviços e interface com a comunidade acadêmica.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  Math.abs(somaPesosComUsuario - 100.0) < 0.1
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}
              >
                Soma: {somaPesosComUsuario}% {Math.abs(somaPesosComUsuario - 100.0) < 0.1 ? '✓' : '(Deve ser 100%)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">1. IMR / Glosas</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoComUsuarioImr}
                  onChange={(e) => setConfig({ ...config, pesoComUsuarioImr: Number(e.target.value) })}
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 p-3 bg-emerald-50/40 space-y-1">
              <label className="block text-[11px] font-bold text-emerald-950">2. Usuário / NPS</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoComUsuarioNps}
                  onChange={(e) => setConfig({ ...config, pesoComUsuarioNps: Number(e.target.value) })}
                  required
                  className="w-16 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-sm font-bold text-emerald-950 focus:outline-none"
                />
                <span className="text-xs font-bold text-emerald-800">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">3. Trabalhista &amp; Conta</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoComUsuarioTrabalhista}
                  onChange={(e) =>
                    setConfig({ ...config, pesoComUsuarioTrabalhista: Number(e.target.value) })
                  }
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">4. Penalidades</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoComUsuarioPenalidades}
                  onChange={(e) =>
                    setConfig({ ...config, pesoComUsuarioPenalidades: Number(e.target.value) })
                  }
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">5. SICAF / Fiscal</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoComUsuarioFiscal}
                  onChange={(e) =>
                    setConfig({ ...config, pesoComUsuarioFiscal: Number(e.target.value) })
                  }
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Pesos do IQContrato SEM Público Usuário */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                IQContrato: Ponderações SEM Público Usuário (Softwares, Locações, etc.)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribuição automática aplicada aos contratos puramente institucionais sem pesquisa de satisfação direta.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  Math.abs(somaPesosSemUsuario - 100.0) < 0.1
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}
              >
                Soma: {somaPesosSemUsuario}% {Math.abs(somaPesosSemUsuario - 100.0) < 0.1 ? '✓' : '(Deve ser 100%)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">1. IMR / Glosas</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoSemUsuarioImr}
                  onChange={(e) => setConfig({ ...config, pesoSemUsuarioImr: Number(e.target.value) })}
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">2. Trabalhista &amp; Conta</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoSemUsuarioTrabalhista}
                  onChange={(e) =>
                    setConfig({ ...config, pesoSemUsuarioTrabalhista: Number(e.target.value) })
                  }
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">3. Penalidades</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoSemUsuarioPenalidades}
                  onChange={(e) =>
                    setConfig({ ...config, pesoSemUsuarioPenalidades: Number(e.target.value) })
                  }
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1">
              <label className="block text-[11px] font-bold text-slate-800">4. SICAF / Fiscal</label>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.pesoSemUsuarioFiscal}
                  onChange={(e) => setConfig({ ...config, pesoSemUsuarioFiscal: Number(e.target.value) })}
                  required
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 4: Limiares da Escala de Fornecedores */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Limiares de Qualidade do Fornecedor (0 a 100)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pontuações mínimas para classificação em Diamante, Ouro e Prata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-cyan-900">
                Fornecedor Diamante (Excelente)
              </label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="80"
                  max="100"
                  value={config.limiarDiamante}
                  onChange={(e) => setConfig({ ...config, limiarDiamante: Number(e.target.value) })}
                  required
                  className="w-20 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-sm font-bold text-cyan-950 focus:outline-none"
                />
                <span className="text-xs font-semibold text-cyan-800">pontos</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-emerald-900">
                Fornecedor Ouro (Bom)
              </label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="60"
                  max="89"
                  value={config.limiarOuro}
                  onChange={(e) => setConfig({ ...config, limiarOuro: Number(e.target.value) })}
                  required
                  className="w-20 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-950 focus:outline-none"
                />
                <span className="text-xs font-semibold text-emerald-800">pontos</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Fornecedor Prata (Regular)
              </label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="40"
                  max="74"
                  value={config.limiarPrata}
                  onChange={(e) => setConfig({ ...config, limiarPrata: Number(e.target.value) })}
                  required
                  className="w-20 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-950 focus:outline-none"
                />
                <span className="text-xs font-semibold text-amber-800">pontos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={salvando || !pesosValidos}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#003366] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#002244] transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar Novos Parâmetros do SGC'}
          </button>
        </div>
      </form>

      {/* Botão de Restaurar Padrões */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Restaurar Padrões da Lei 14.133/2021</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deseja desfazer todas as alterações e restabelecer os prazos do radar e pesos do IQContrato originais?
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestaurarPadroes}
          disabled={restaurando}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          {restaurando ? 'Restaurando...' : 'Restaurar Valores Padrão'}
        </button>
      </div>
    </div>
  );
}
