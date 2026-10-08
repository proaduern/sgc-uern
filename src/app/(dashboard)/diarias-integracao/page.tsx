'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Building2, 
  FileText, 
  DollarSign, 
  ExternalLink, 
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Compass
} from 'lucide-react';

interface ContratoViagem {
  id: string;
  numeroContrato: string;
  objeto: string;
  processoSei: string;
  valorGlobal: number;
  valorAtualizado: number;
  saldoDisponivel: number;
  vigenciaInicio: string;
  vigenciaFim: string;
  tipoBeneficio: string;
  fornecedor: {
    razaoSocial: string;
    cnpj: string;
    email: string;
    telefone?: string;
  };
}

export default function DiariasIntegracaoPage() {
  const [contratos, setContratos] = useState<ContratoViagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');

  const carregarDados = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/integracao/diarias/contratos');
      if (res.ok) {
        const data = await res.json();
        setContratos(data.contratos || []);
      }
    } catch (err) {
      console.error('Erro ao carregar contratos de viagens:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const totalValor = contratos.reduce((acc, c) => acc + c.valorAtualizado, 0);
  const totalSaldo = contratos.reduce((acc, c) => acc + c.saldoDisponivel, 0);

  const contratosFiltrados = contratos.filter(
    (c) =>
      c.numeroContrato.toLowerCase().includes(busca.toLowerCase()) ||
      c.objeto.toLowerCase().includes(busca.toLowerCase()) ||
      c.fornecedor.razaoSocial.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
            <Plane className="w-3.5 h-3.5" />
            Interoperabilidade PROAD: Diárias & Deslocamentos ➔ SGC
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Contratos de Viagens, Passagens e Hospedagem</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Acompanhamento centralizado dos contratos corporativos de passagens aéreas e hospedagem que atendem aos pedidos de diárias e viagens dos servidores e colaboradores da FUERN.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={carregarDados}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <a
            href="http://localhost:3004"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Acessar Sistema de Diárias
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Teto Contratual Total</span>
            <Building2 className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{contratos.length} contrato(s) ativo(s) de viagens</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Saldo Disponível no SGC</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            R$ {totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Provisionamento ativo
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Decreto Estadual Vinculado</span>
            <Compass className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            Dec. 29.444 / 32.688
          </div>
          <p className="text-xs text-slate-500 mt-1">Portaria nº 293/2020-GP/FUERN</p>
        </div>
      </div>

      {/* Contratos de Viagens e Passagens */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Contratos Ativos de Agenciamento e Deslocamentos</h2>
            <p className="text-xs text-slate-500">Contratos compartilhados via API segura com o Sistema de Diárias da UERN</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, empresa ou objeto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
            Carregando contratos de viagens...
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {contratosFiltrados.map((c) => (
              <div key={c.id} className="p-5 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                      {c.numeroContrato}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {c.fornecedor.razaoSocial}
                    </span>
                    <span className="text-[11px] text-slate-400">CNPJ: {c.fornecedor.cnpj}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {c.tipoBeneficio}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{c.objeto}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Processo SEI: {c.processoSei}</span>
                    <span>•</span>
                    <span>Vigência: {new Date(c.vigenciaInicio).toLocaleDateString('pt-BR')} até {new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <div className="text-xs text-slate-400">Valor Atualizado</div>
                  <div className="text-lg font-bold text-slate-900">
                    R$ {c.valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    Saldo Livre: R$ {c.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
