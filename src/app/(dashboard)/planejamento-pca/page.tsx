'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Calendar,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function PlanejamentoPcaPage() {
  const [ano, setAno] = useState<number>(2027);
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarContratos() {
      setLoading(true);
      try {
        const res = await fetch(`/api/integracao/contratos-continuos?anoPca=${ano}`);
        if (res.ok) {
          const json = await res.json();
          setDados(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    carregarContratos();
  }, [ano]);

  const pcaUrl = process.env.NEXT_PUBLIC_PCA_URL || 'http://localhost:3002';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> SGC ➔ PCA Integrado
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Planejamento de Continuidade Contratual (PCA)
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Monitoramento de contratos de serviços continuados e terceirização que alimentam automaticamente o Plano de Contratações Anual (PCA) da UERN, evitando retrabalho e inconsistências de dados.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`${pcaUrl}/admin/contratos-sgc`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              <span>Abrir Módulo no PCA (Porta 3002)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Seletor de Exercício e KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Exercício do PCA para Análise:</span>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value, 10))}
            className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={2026}>Exercício 2026</option>
            <option value={2027}>Exercício 2027</option>
            <option value={2028}>Exercício 2028</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Total de Contratos Contínuos Ativos:</span>
          <strong className="text-slate-800 font-bold text-sm">
            {dados?.totalContratosContinuadosAtivos ?? 0}
          </strong>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Contratos com Impacto no Exercício de {ano}</span>
          </h2>
          <span className="text-xs text-slate-500">
            Lei nº 14.133/2021 (Artigos 106 e 107)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando projeções contratuais...</div>
        ) : !dados || dados.contratos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum contrato contínuo ativo registrado com vencimento ou prorrogação prevista para {ano}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Contrato & Processo SEI</th>
                  <th className="p-3.5">Objeto & Contratada</th>
                  <th className="p-3.5">Vigência Fim</th>
                  <th className="p-3.5">Valor Anualizado Estimado</th>
                  <th className="p-3.5">Sugestão ao PCA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados.contratos.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{c.numeroContrato}</div>
                      <div className="text-[11px] text-slate-500">SEI: {c.processoSeiMae}</div>
                    </td>

                    <td className="p-3.5 max-w-sm">
                      <div className="font-medium text-slate-700 truncate" title={c.objeto}>
                        {c.objeto}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.fornecedor.razaoSocial} ({c.fornecedor.cnpj})
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">
                        {new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {c.anosVigenciaAcumulados} ano(s) acumulado(s)
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-emerald-700">
                      {c.valorAnualizadoEstimado.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>

                    <td className="p-3.5">
                      {c.tipoDemandaSugerida === 'RENOVACAO' ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                          Renovação / Prorrogação
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-semibold">
                          Nova Contratação (Limite Decenal)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
