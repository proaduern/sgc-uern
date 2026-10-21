'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Users,
  DollarSign,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Check,
  Building2,
} from 'lucide-react';

interface EsteiraPosHomologacaoProps {
  contrato: any;
  servidoresDisponiveis?: any[];
  onUpdated?: (contratoAtualizado: any) => void;
  showContractHeader?: boolean;
}

const ETAPAS_ORDEM = [
  'AGUARDANDO_EMPENHO',
  'AGUARDANDO_DESIGNACAO_PROAD',
  'AGUARDANDO_UCI',
  'AGUARDANDO_ELABORACAO_CONTRATO',
  'EXECUCAO_DIRETA_EMPENHO',
  'VIGENTE',
];

export default function EsteiraPosHomologacaoSection({
  contrato,
  servidoresDisponiveis: propServidores,
  onUpdated,
  showContractHeader = false,
}: EsteiraPosHomologacaoProps) {
  const etapaAtual = contrato?.etapaFluxoPosHomologacao || 'VIGENTE';

  const getStepIndexFromEtapa = (etapa: string) => {
    switch (etapa) {
      case 'AGUARDANDO_EMPENHO':
        return 1;
      case 'AGUARDANDO_DESIGNACAO_PROAD':
        return 2;
      case 'AGUARDANDO_UCI':
        return 3;
      case 'AGUARDANDO_ELABORACAO_CONTRATO':
        return 4;
      case 'EXECUCAO_DIRETA_EMPENHO':
      case 'VIGENTE':
        return 5; // Concluído / Em execução
      default:
        return 1;
    }
  };

  const activeStageNumber = getStepIndexFromEtapa(etapaAtual);
  const [abaSelecionada, setAbaSelecionada] = useState<number>(
    activeStageNumber > 4 ? 4 : activeStageNumber
  );

  useEffect(() => {
    const step = getStepIndexFromEtapa(contrato?.etapaFluxoPosHomologacao || 'VIGENTE');
    setAbaSelecionada(step > 4 ? 4 : step);
  }, [contrato?.etapaFluxoPosHomologacao]);

  const [servidores, setServidores] = useState<any[]>(propServidores || []);

  // Form Etapa 1: Empenho
  const [numeroEmpenho, setNumeroEmpenho] = useState<string>(contrato?.numeroEmpenho || '');
  const [valorEmpenhado, setValorEmpenhado] = useState<string>(
    String(contrato?.valorEmpenhado ?? contrato?.valorGlobal ?? '')
  );
  const [exigeContratoFormal, setExigeContratoFormal] = useState<boolean>(
    contrato?.exigeContratoFormal !== undefined
      ? Boolean(contrato.exigeContratoFormal)
      : !Boolean(contrato?.empenhoSubstituiContrato)
  );

  // Form Etapa 2: Gabinete PROAD (Gestor e Fiscais)
  const gestorAtual = contrato?.responsaveis?.find((r: any) => r.tipoAtuacao === 'GESTOR')?.userId || '';
  const fiscalTecAtual =
    contrato?.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_TECNICO')?.userId || '';
  const fiscalAdmAtual =
    contrato?.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_ADMINISTRATIVO')?.userId || '';

  const [portariaDesignacaoGestor, setPortariaDesignacaoGestor] = useState<string>(
    contrato?.portariaDesignacaoGestor || ''
  );
  const [gestorId, setGestorId] = useState<string>(gestorAtual);
  const [fiscalTecnicoId, setFiscalTecnicoId] = useState<string>(fiscalTecAtual);
  const [fiscalAdmId, setFiscalAdmId] = useState<string>(fiscalAdmAtual);

  // Form Etapa 3: Controle Interno (UCI)
  const [statusUci, setStatusUci] = useState<string>(
    contrato?.statusUci === 'DILIGENCIA_UCI' ? 'DILIGENCIA_UCI' : 'APROVADO_UCI'
  );
  const [parecerUciResumo, setParecerUciResumo] = useState<string>(contrato?.parecerUciResumo || '');
  const [dataRetornoUci, setDataRetornoUci] = useState<string>(
    contrato?.dataRetornoUci
      ? new Date(contrato.dataRetornoUci).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  // Form Etapa 4: Formalização do Contrato Definitivo
  const [numeroContrato, setNumeroContrato] = useState<string>(contrato?.numeroContrato || '');
  const [vigenciaInicio, setVigenciaInicio] = useState<string>(
    contrato?.vigenciaInicio
      ? new Date(contrato.vigenciaInicio).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [vigenciaFim, setVigenciaFim] = useState<string>(
    contrato?.vigenciaFim
      ? new Date(contrato.vigenciaFim).toISOString().split('T')[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    if (propServidores && propServidores.length > 0) {
      setServidores(propServidores);
      return;
    }
    if (contrato?.id) {
      fetch(`/api/contratos/${contrato.id}/fluxo-pos-homologacao`)
        .then((r) => r.json())
        .then((d) => {
          if (d.servidoresDisponiveis) setServidores(d.servidoresDisponiveis);
        })
        .catch(() => {});
    }
  }, [contrato?.id, propServidores]);

  const executarAcao = async (payload: Record<string, any>) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/contratos/${contrato.id}/fluxo-pos-homologacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar etapa pós-homologação.');
      }
      setFeedback({ tipo: 'ok', texto: data.mensagem || 'Etapa concluída com sucesso!' });
      if (onUpdated && data.contrato) {
        onUpdated(data.contrato);
      }
    } catch (err: any) {
      setFeedback({ tipo: 'erro', texto: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const etapasConfig = [
    {
      num: 1,
      titulo: '1ª Etapa: Empenho',
      subtitulo: 'Setor de Empenho / Financeiro',
      concluida: activeStageNumber > 1,
      atual: activeStageNumber === 1,
    },
    {
      num: 2,
      titulo: '2ª Etapa: Gabinete PROAD',
      subtitulo: 'Designação Gestor e Fiscais',
      concluida: activeStageNumber > 2,
      atual: activeStageNumber === 2,
    },
    {
      num: 3,
      titulo: '3ª Etapa: Controle Interno (UCI)',
      subtitulo: 'Conformidade no SEI',
      concluida: activeStageNumber > 3,
      atual: activeStageNumber === 3,
    },
    {
      num: 4,
      titulo: exigeContratoFormal
        ? '4ª Etapa: Elaboração do Contrato'
        : '4ª Etapa: Execução Direta (Empenho)',
      subtitulo: exigeContratoFormal ? 'Setor de Contratos' : 'Gestor e Fiscais Designados',
      concluida: activeStageNumber > 4,
      atual: activeStageNumber === 4,
    },
  ];

  const badgeEtapaLabel: Record<string, { label: string; color: string }> = {
    AGUARDANDO_EMPENHO: {
      label: '1ª Etapa: Aguardando Nota de Empenho',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    AGUARDANDO_DESIGNACAO_PROAD: {
      label: '2ª Etapa: Aguardando Designação (Gabinete PROAD)',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    AGUARDANDO_UCI: {
      label:
        contrato?.statusUci === 'DILIGENCIA_UCI'
          ? '3ª Etapa: Em Diligência na UCI'
          : '3ª Etapa: Em Análise no Controle Interno (UCI)',
      color:
        contrato?.statusUci === 'DILIGENCIA_UCI'
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-purple-100 text-purple-800 border-purple-300',
    },
    AGUARDANDO_ELABORACAO_CONTRATO: {
      label: '4ª Etapa: Aguardando Elaboração do Contrato Formal',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    EXECUCAO_DIRETA_EMPENHO: {
      label: 'Concluído: Execução Direta por Nota de Empenho',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    VIGENTE: {
      label: 'Concluído: Contrato Formalizado e Vigente',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  };

  const statusInfo = badgeEtapaLabel[etapaAtual] || badgeEtapaLabel.VIGENTE;

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
      {/* Cabeçalho da Esteira */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Esteira Pós-Homologação no SGC
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            {showContractHeader ? (
              <div className="mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base font-bold text-white">
                    Processo SEI {contrato.processoSeiMae} — {contrato.fornecedor?.razaoSocial}
                  </h3>
                  <span className="text-xs text-amber-300 font-bold">
                    {Number(contrato.valorAtualizado || contrato.valorGlobal || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{contrato.objeto}</p>
              </div>
            ) : (
              <h3 className="text-sm md:text-base font-bold text-white mt-1.5">
                Fluxo Pós-Homologação: Empenho ➔ Gabinete PROAD ➔ UCI ➔{' '}
                {exigeContratoFormal ? 'Elaboração do Contrato' : 'Execução Direta'}
              </h3>
            )}
          </div>

          {showContractHeader && (
            <Link
              href={`/contratos/${contrato.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition self-start md:self-center shrink-0"
            >
              <span>Abrir Ficha Completa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Stepper de 4 Etapas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-4">
          {etapasConfig.map((step) => {
            const isSelected = abaSelecionada === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setAbaSelecionada(step.num);
                }}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-white text-slate-900 border-amber-400 shadow-md'
                    : step.concluida
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100 hover:bg-emerald-900/60'
                    : step.atual
                    ? 'bg-indigo-900/80 border-amber-400/60 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                    step.concluida
                      ? 'bg-emerald-500 text-white'
                      : step.atual
                      ? 'bg-amber-400 text-slate-950'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {step.concluida ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{step.titulo}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-slate-600' : 'text-slate-300/80'
                    }`}
                  >
                    {step.subtitulo}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corpo Interativo da Etapa Selecionada */}
      <div className="p-5 space-y-4 bg-slate-50/60">
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] underline ml-3"
            >
              Fechar
            </button>
          </div>
        )}

        {/* PAINEL 1ª ETAPA: REGISTRO DO EMPENHO */}
        {abaSelecionada === 1 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  1ª Etapa: Registro da Nota de Empenho (Setor de Empenho)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Todo processo homologado (exceto Atas SRP) inicia pelo registro do empenho e definição sobre exigência de contrato formal.
                </p>
              </div>
              {contrato.numeroEmpenho && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  NE Registrada: {contrato.numeroEmpenho}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Nota de Empenho (NE) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2026NE000412"
                  value={numeroEmpenho}
                  onChange={(e) => setNumeroEmpenho(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Empenhado Homologado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorEmpenhado}
                  onChange={(e) => setValorEmpenhado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exigeContratoFormal}
                  onChange={(e) => setExigeContratoFormal(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    Exige elaboração de Contrato formal?
                  </span>
                  <span className="text-[11px] text-indigo-800/90 block mt-0.5">
                    Se marcado, após aprovação da UCI o processo irá ao <strong>Setor de Contratos</strong> para formalização do instrumento. Se desmarcado (Art. 95 da Lei 14.133/2021), seguirá apenas com a <strong>Nota de Empenho para execução direta</strong> pelo Gestor e Fiscais após a UCI.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  executarAcao({
                    action: 'REGISTRAR_EMPENHO',
                    numeroEmpenho,
                    valorEmpenhado: Number(valorEmpenhado),
                    exigeContratoFormal,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? 'Registrando...'
                    : 'Salvar Empenho e Enviar ao Gabinete da PROAD (2ª Etapa)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PAINEL 2ª ETAPA: GABINETE DA PROAD — DESIGNAÇÃO DE GESTOR E FISCAIS */}
        {abaSelecionada === 2 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  2ª Etapa: Gabinete da PROAD — Designação de Gestor e Fiscais
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Designe formalmente o Gestor e Fiscais (IN 01/2026) antes da remessa à Unidade de Controle Interno (UCI).
                </p>
              </div>
              {contrato.portariaDesignacaoGestor && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                  Portaria: {contrato.portariaDesignacaoGestor}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Portaria / Ato de Designação PROAD *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Portaria nº 142/2026-PROAD/UERN"
                  value={portariaDesignacaoGestor}
                  onChange={(e) => setPortariaDesignacaoGestor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gestor do Contrato / Execução
                </label>
                <select
                  value={gestorId}
                  onChange={(e) => setGestorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Selecionar Servidor Gestor --</option>
                  {servidores.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.role}) {u.matricula ? `- Mat. ${u.matricula}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fiscal Técnico
                </label>
                <select
                  value={fiscalTecnicoId}
                  onChange={(e) => setFiscalTecnicoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Selecionar Fiscal Técnico --</option>
                  {servidores.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.role}) {u.matricula ? `- Mat. ${u.matricula}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fiscal Administrativo (Opcional)
                </label>
                <select
                  value={fiscalAdmId}
                  onChange={(e) => setFiscalAdmId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Selecionar Fiscal Administrativo --</option>
                  {servidores.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.role}) {u.matricula ? `- Mat. ${u.matricula}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  executarAcao({
                    action: 'DESIGNAR_GESTOR_PROAD',
                    portariaDesignacaoGestor,
                    gestorId: gestorId || undefined,
                    fiscalTecnicoId: fiscalTecnicoId || undefined,
                    fiscalAdmId: fiscalAdmId || undefined,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? 'Salvando Designação...'
                    : 'Confirmar Designação e Enviar à UCI (3ª Etapa)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PAINEL 3ª ETAPA: UNIDADE DE CONTROLE INTERNO (UCI) */}
        {abaSelecionada === 3 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  3ª Etapa: Unidade de Controle Interno (UCI) — Registro de Análise Externa (SEI)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  A análise da UCI ocorre no SEI. Registre abaixo o resultado do parecer de conformidade para liberar a etapa final.
                </p>
              </div>
              {contrato.statusUci && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                  Status UCI: {contrato.statusUci}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resultado do Parecer da UCI *
                </label>
                <select
                  value={statusUci}
                  onChange={(e) => setStatusUci(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="APROVADO_UCI">
                    APROVADO PELA UCI (Conformidade Atestada)
                  </option>
                  <option value="DILIGENCIA_UCI">
                    EM DILIGÊNCIA / AJUSTES SOLICITADOS PELA UCI
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data do Retorno da UCI
                </label>
                <input
                  type="date"
                  value={dataRetornoUci}
                  onChange={(e) => setDataRetornoUci(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resumo do Parecer / Nº Documento SEI da UCI
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Parecer UCI nº 089/2026 (Doc SEI 1982341) - Aprovado sem ressalvas quanto à regularidade do empenho e designação."
                value={parecerUciResumo}
                onChange={(e) => setParecerUciResumo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  executarAcao({
                    action: 'REGISTRAR_RETORNO_UCI',
                    statusUci,
                    parecerUciResumo,
                    dataRetornoUci,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? 'Registrando Parecer UCI...'
                    : statusUci === 'APROVADO_UCI'
                    ? exigeContratoFormal
                      ? 'Aprovar na UCI e Encaminhar ao Setor de Contratos (4ª Etapa)'
                      : 'Aprovar na UCI e Liberar Execução Direta por Empenho (4ª Etapa)'
                    : 'Registrar Diligência da UCI'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PAINEL 4ª ETAPA: ELABORAÇÃO DO CONTRATO OU EXECUÇÃO DIRETA POR EMPENHO */}
        {abaSelecionada === 4 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            {exigeContratoFormal ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      4ª Etapa: Elaboração e Formalização do Contrato (Setor de Contratos)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Insira a numeração oficial do Contrato Administrativo e sua vigência após assinatura para concluir a esteira pós-homologação.
                    </p>
                  </div>
                  {contrato.numeroContrato && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      Contrato nº {contrato.numeroContrato}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número Oficial do Contrato *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 045/2026-PROAD/UERN"
                      value={numeroContrato}
                      onChange={(e) => setNumeroContrato(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Início da Vigência
                    </label>
                    <input
                      type="date"
                      value={vigenciaInicio}
                      onChange={(e) => setVigenciaInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fim da Vigência
                    </label>
                    <input
                      type="date"
                      value={vigenciaFim}
                      onChange={(e) => setVigenciaFim(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      executarAcao({
                        action: 'FORMALIZAR_CONTRATO_DEFINITIVO',
                        numeroContrato,
                        vigenciaInicio,
                        vigenciaFim,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Formalizando...'
                        : 'Formalizar Contrato Definitivo e Liberar Execução'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    4ª Etapa: Execução Direta por Nota de Empenho (Sem Instrumento Contratual Formal)
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Conforme definido na 1ª Etapa (Art. 95 da Lei nº 14.133/2021), a{' '}
                  <strong>Nota de Empenho ({contrato.numeroEmpenho || 'Pendente'})</strong> substitui o termo de contrato. Após a aprovação da UCI, a contratação encontra-se liberada diretamente para emissão de Ordens de Fornecimento/Serviço e Atesto de Notas Fiscais pelo Gestor e Fiscais designados na Portaria{' '}
                  <strong>{contrato.portariaDesignacaoGestor || 'PROAD'}</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
