'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Copy,
  Download,
  Eye,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Calculator,
} from 'lucide-react';

interface AlteracoesSectionProps {
  contratoId: string;
  onAlteracaoRealizada?: () => void;
}

export default function AlteracoesContratuaisSection({
  contratoId,
  onAlteracaoRealizada,
}: AlteracoesSectionProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [showNovoRegistroModal, setShowNovoRegistroModal] = useState(false);
  const [showGeradorDocModal, setShowGeradorDocModal] = useState(false);
  const [detalhesAlteracao, setDetalhesAlteracao] = useState<any | null>(null);

  // Estado para Nova Alteração
  const [tipoAlteracao, setTipoAlteracao] = useState('REPACTUACAO_APOSTILAMENTO');
  const [instrumento, setInstrumento] = useState('APOSTILAMENTO');
  const [numeroTermo, setNumeroTermo] = useState('');
  const [processoSei, setProcessoSei] = useState('');
  const [documentoSeiId, setDocumentoSeiId] = useState('');
  const [dataAssinatura, setDataAssinatura] = useState('');
  const [possuiEfeitoRetroativo, setPossuiEfeitoRetroativo] = useState(false);
  const [dataRetroatividade, setDataRetroatividade] = useState('');
  const [novaVigenciaFim, setNovaVigenciaFim] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [percentualReajuste, setPercentualReajuste] = useState('');
  const [escopoReajuste, setEscopoReajuste] = useState('TODOS_ITENS');
  const [cctAlvo, setCctAlvo] = useState('TODAS');
  const [percentualMaoDeObra, setPercentualMaoDeObra] = useState('');
  const [percentualInsumos, setPercentualInsumos] = useState('');
  const [avisoInterregno, setAvisoInterregno] = useState<any | null>(null);
  const [ignorarAvisoInterregno, setIgnorarAvisoInterregno] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Lista de convenções coletivas vinculadas ao contrato e aos itens
  const convencoesDisponiveis = React.useMemo(() => {
    const lista: { id: string; nome: string; sindicato?: string; dataBase?: string; registro?: string }[] = [];
    if (data?.convencoesColetivas && Array.isArray(data.convencoesColetivas)) {
      data.convencoesColetivas.forEach((c: any) => {
        const id = c.nomeConvencao || c.id;
        const nome = c.nomeConvencao || c.sindicatoLaboral || `CCT ${c.numeroRegistroMte || ''}`;
        lista.push({
          id,
          nome,
          sindicato: c.sindicatoLaboral,
          dataBase: c.dataBase,
          registro: c.numeroRegistroMte,
        });
      });
    }
    if (data?.itens && Array.isArray(data.itens)) {
      data.itens.forEach((it: any) => {
        if (it.cctVinculada && it.cctVinculada.trim()) {
          const val = it.cctVinculada.trim();
          if (!lista.some((l) => l.id.toLowerCase() === val.toLowerCase() || l.nome.toLowerCase() === val.toLowerCase())) {
            lista.push({
              id: val,
              nome: val,
            });
          }
        }
      });
    }
    return lista;
  }, [data]);

  // Simulação em tempo real dos itens recalculados no modal de alteração
  const simulacaoItens = React.useMemo(() => {
    if (!data?.itens || !Array.isArray(data.itens)) return [];
    const percGlobal = percentualReajuste ? parseFloat(percentualReajuste) : 0;
    const percMO = percentualMaoDeObra ? parseFloat(percentualMaoDeObra) : percGlobal;
    const percIns = percentualInsumos ? parseFloat(percentualInsumos) : percGlobal;
    const fatorMO = 1 + (percMO / 100);
    const fatorIns = 1 + (percIns / 100);

    return data.itens.map((it: any) => {
      let afetado = false;
      let novoUnit = it.valorUnitarioAtual;
      let motivo = '';

      if (it.tipoReajuste === 'NAO_REAJUSTAVEL') {
        afetado = false;
        motivo = 'Preço Fixo';
      } else if (it.tipoReajuste === 'REPACTUACAO_CCT') {
        if (escopoReajuste === 'APENAS_INSUMOS') {
          afetado = false;
          motivo = 'Escopo Insumos';
        } else if (cctAlvo && cctAlvo !== 'TODAS') {
          const convObj = data.convencoesColetivas?.find((c: any) => c.id === cctAlvo || c.nomeConvencao === cctAlvo);
          const alvoNome = convObj?.nomeConvencao || cctAlvo;
          const alvoStr = alvoNome.trim().toLowerCase();
          const itemCct = (it.cctVinculada || it.indiceReferencia || '').trim().toLowerCase();
          if (itemCct && (itemCct.includes(alvoStr) || alvoStr.includes(itemCct))) {
            afetado = true;
            novoUnit = it.valorUnitarioAtual * fatorMO;
            motivo = `Repactuado (${percMO > 0 ? '+' : ''}${percMO}%)`;
          } else {
            afetado = false;
            motivo = 'Outra CCT (Inalterado)';
          }
        } else {
          afetado = true;
          novoUnit = it.valorUnitarioAtual * fatorMO;
          motivo = `Repactuado (${percMO > 0 ? '+' : ''}${percMO}%)`;
        }
      } else {
        if (escopoReajuste === 'APENAS_MAO_DE_OBRA' || tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO') {
          afetado = false;
          motivo = 'Escopo Mão de Obra';
        } else {
          afetado = true;
          novoUnit = it.valorUnitarioAtual * fatorIns;
          motivo = `Reajustado (${percIns > 0 ? '+' : ''}${percIns}%)`;
        }
      }

      const isMensal = ['MÊS', 'MES', 'POSTO', 'POSTO/MÊS', 'MENSAL'].includes((it.unidade || '').trim().toUpperCase());
      const totalAnualNovo = isMensal ? novoUnit * it.quantidadeAtual * 12 : novoUnit * it.quantidadeAtual;
      const anos = data.contrato?.anosVigencia || 1;
      const totalPluriNovo = anos > 1 ? totalAnualNovo * anos : 0;
      const totalEfetivoNovo = anos > 1 ? totalPluriNovo : totalAnualNovo;

      return {
        ...it,
        afetado,
        motivo,
        novoUnitario: novoUnit,
        novoTotal: totalEfetivoNovo,
      };
    });
  }, [data, percentualReajuste, percentualMaoDeObra, percentualInsumos, escopoReajuste, cctAlvo, tipoAlteracao]);

  const novoValorGlobalSimulado = React.useMemo(() => {
    if (simulacaoItens.length === 0) return data?.contrato?.valorGlobalAtualizado || 0;
    return simulacaoItens.reduce((acc: number, it: any) => acc + (it.novoTotal || 0), 0);
  }, [simulacaoItens, data]);

  // Estado para Gerador de Minutas
  const [tipoDocSelecionado, setTipoDocSelecionado] = useState('SOLICITACAO_REPACTUACAO');
  const [mesesProrrogacao, setMesesProrrogacao] = useState('12');
  const [numeroOficio, setNumeroOficio] = useState('77');
  const [numeroSolicitacao, setNumeroSolicitacao] = useState('177');
  const [cctRegistro, setCctRegistro] = useState('RN000013/2026');
  const [percentualSimulacao, setPercentualSimulacao] = useState('7.79');
  const [docGeradoHtml, setDocGeradoHtml] = useState<string | null>(null);
  const [gerandoDoc, setGerandoDoc] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregarDados = async () => {
    if (!contratoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/alteracoes`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar alterações');
      setData(json);
      if (json.contrato) {
        setProcessoSei(json.contrato.processoSeiMae || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [contratoId]);

  const handleSalvarAlteracao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setSucessoMsg(null);
    setAvisoInterregno(null);
    try {
      const payload = {
        tipoAlteracao,
        instrumento: tipoAlteracao.includes('APOSTILAMENTO') ? 'APOSTILAMENTO' : 'TERMO_ADITIVO',
        numeroTermo,
        processoSei,
        documentoSeiId,
        dataAssinatura,
        possuiEfeitoRetroativo,
        dataRetroatividade: possuiEfeitoRetroativo ? dataRetroatividade : null,
        novaVigenciaFim: tipoAlteracao === 'PRORROGACAO_ADITIVO' ? novaVigenciaFim : null,
        justificativa,
        escopoReajuste,
        cctAlvo,
        percentualReajuste: percentualReajuste ? parseFloat(percentualReajuste) : undefined,
        percentualMaoDeObra: percentualMaoDeObra ? parseFloat(percentualMaoDeObra) : undefined,
        percentualInsumos: percentualInsumos ? parseFloat(percentualInsumos) : undefined,
        ignorarAvisoInterregno,
      };

      const res = await fetch(`/api/contratos/${contratoId}/alteracoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.bloqueioInterregno) {
          setAvisoInterregno(json);
          return;
        }
        throw new Error(json.error || 'Erro ao registrar alteração');
      }

      setSucessoMsg(json.mensagem);
      setShowNovoRegistroModal(false);
      setAvisoInterregno(null);
      setIgnorarAvisoInterregno(false);
      carregarDados();
      if (onAlteracaoRealizada) onAlteracaoRealizada();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarDocumento = async () => {
    setGerandoDoc(true);
    setDocGeradoHtml(null);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/gerar-documento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDocumento: tipoDocSelecionado,
          parametros: {
            mesesProrrogacao: parseInt(mesesProrrogacao, 10) || 12,
            numeroOficio,
            numeroSolicitacao,
            cctRegistro,
            percentualReajuste: percentualSimulacao,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar minuta');
      setDocGeradoHtml(json.html);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGerandoDoc(false);
    }
  };

  const handleCopiarHtml = () => {
    if (!docGeradoHtml) return;
    const blob = new Blob([docGeradoHtml], { type: 'text/html' });
    const textBlob = new Blob([docGeradoHtml.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
    const item = new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    });
    navigator.clipboard.write([item]).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Carregando histórico e regras de alterações contratuais...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
        {error || 'Não foi possível carregar as alterações.'}
      </div>
    );
  }

  const { contrato, limitesLegais, alteracoes } = data;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <History className="w-5 h-5 text-blue-700" />
            <span>Alterações Contratuais, Timeline & Resíduos Retroativos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {alteracoes.length} {alteracoes.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Versionamento imutável com preservação de histórico, recálculo da base de 25% para acréscimos/supressões e cálculo proporcional de retroatividade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDocGeradoHtml(null);
              setShowGeradorDocModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Elaborar Minuta SEI (Cálculo & Modelos)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTipoAlteracao('REPACTUACAO_APOSTILAMENTO');
              setNumeroTermo('Termo de Apostilamento nº 01/2026');
              setDataAssinatura(new Date().toISOString().split('T')[0]);
              setCctAlvo('TODAS');
              setShowNovoRegistroModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Alteração Contratual</span>
          </button>
        </div>
      </div>

      {sucessoMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Cartões de Status da Base Atualizada e Limites de 25% */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Base Atualizada */}
        <div className="p-4 bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span>Base de Cálculo dos Limites</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
              Lei 14.133
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono">
            {limitesLegais.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Valor contratual atualizado por Reajuste, Repactuação ou Reequilíbrio que serve como base exclusiva para o teto de acréscimos e supressões.
          </p>
        </div>

        {/* Teto de Acréscimo (+25%) */}
        <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Limite de Acréscimo (+{limitesLegais.percentualMaximo}%)</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700">
              Saldo: {limitesLegais.saldoDisponivelAcrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            {limitesLegais.limiteMaximoAcrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Já utilizado: R$ {limitesLegais.acrescimosRealizados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aditivos.
          </p>
        </div>

        {/* Teto de Supressão (-25%) */}
        <div className="p-4 bg-gradient-to-br from-amber-50/60 to-slate-50 border border-amber-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span className="flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              <span>Limite de Supressão (-{limitesLegais.percentualMaximo}%)</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-700">
              Saldo: {limitesLegais.saldoDisponivelSupressao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="text-lg font-bold text-amber-700 font-mono">
            {limitesLegais.limiteMaximoSupressao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Já utilizado: R$ {limitesLegais.supressoesRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aditivos.
          </p>
        </div>
      </div>

      {contrato.ultimoProcedimentoAtualizacao && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-700 flex-shrink-0" />
          <span>
            <strong>Último Procedimento Homologado:</strong> {contrato.ultimoProcedimentoAtualizacao}
          </span>
        </div>
      )}

      {/* TIMELINE VISUAL DE ALTERAÇÕES */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Linha do Tempo e Histórico de Procedimentos
        </h4>

        {alteracoes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Nenhuma alteração contratual registrada até o momento</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Quando houver repactuação, reajuste por índice, reequilíbrio, prorrogação ou acréscimo/supressão, cadastre o termo para manter o histórico íntegro e atualizar a base legal.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {alteracoes.map((alt: any) => {
              const isApostilamento = alt.tipoAlteracao.includes('APOSTILAMENTO');
              const isAcrescimo = alt.valorAjuste > 0;

              return (
                <div key={alt.id} className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all space-y-3">
                  <div className="absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm" />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isApostilamento ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alt.instrumento || (isApostilamento ? 'APOSTILAMENTO' : 'TERMO ADITIVO')}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900">{alt.numeroTermo}</h5>
                        <span className="text-[10px] font-mono text-slate-500">
                          (SEI nº {alt.documentoSeiId || alt.processoSei})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Assinado em <strong>{new Date(alt.dataAssinatura).toLocaleDateString('pt-BR')}</strong>
                        {alt.possuiEfeitoRetroativo && alt.dataRetroatividade && (
                          <span className="text-amber-700 font-semibold ml-1.5">
                            • Efeito retroativo a {new Date(alt.dataRetroatividade).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetalhesAlteracao(alt)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver Snapshot de Dados</span>
                    </button>
                  </div>

                  {/* Detalhes Financeiros da Alteração */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Valor Anterior:</span>
                      <span className="font-semibold text-slate-700 font-mono">
                        {alt.valorAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Variação do Ajuste:</span>
                      <span className={`font-bold font-mono ${isAcrescimo ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isAcrescimo ? '+' : ''}{alt.valorAjuste.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Novo Valor Global:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {alt.novoValorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Nova Base Limites 25%:</span>
                      <span className="font-bold text-blue-800 font-mono">
                        {alt.novaBaseCalculoAditivos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Resíduo Retroativo Apurado */}
                  {alt.valorResidualTotal > 0 && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          <strong>Resíduo Retroativo Calculado:</strong> Foi apurado o valor proporcional de{' '}
                          <strong className="text-amber-950 font-mono">
                            {alt.valorResidualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </strong>{' '}
                          a ser atestado nas faturas correspondentes.
                        </span>
                      </div>
                    </div>
                  )}

                  {alt.justificativa && (
                    <p className="text-[11px] text-slate-600 italic">
                      &quot;{alt.justificativa}&quot;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE NOVO REGISTRO DE ALTERAÇÃO */}
      {showNovoRegistroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                <Plus className="w-4 h-4 text-blue-700" />
                <span>Registrar Alteração Contratual com Histórico</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoRegistroModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAlteracao} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Alteração</label>
                  <select
                    value={tipoAlteracao}
                    onChange={(e) => setTipoAlteracao(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-800"
                  >
                    <option value="REPACTUACAO_APOSTILAMENTO">Repactuação por CCT (Apostilamento - Álea Ordinária)</option>
                    <option value="REAJUSTE_APOSTILAMENTO">Reajuste por Índice IPCA/Setorial (Apostilamento)</option>
                    <option value="REEQUILIBRIO_ADITIVO">Reequilíbrio Econômico-Financeiro (Termo Aditivo - Álea Extraordinária)</option>
                    <option value="ACRESCIMO_ADITIVO">Acréscimo Quantitativo (Termo Aditivo - Limite 25%)</option>
                    <option value="SUPRESSAO_ADITIVO">Supressão Quantitativa (Termo Aditivo - Limite 25%)</option>
                    <option value="PRORROGACAO_ADITIVO">Prorrogação de Vigência (Termo Aditivo)</option>
                    <option value="OUTRAS_ADITIVO">Outras Alterações Contratuais (Termo Aditivo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identificação do Instrumento Formal</label>
                  <input
                    type="text"
                    required
                    value={numeroTermo}
                    onChange={(e) => setNumeroTermo(e.target.value)}
                    placeholder="Ex: Apostilamento nº 01/2026 ou 1º Termo Aditivo"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Processo SEI</label>
                  <input
                    type="text"
                    required
                    value={processoSei}
                    onChange={(e) => setProcessoSei(e.target.value)}
                    placeholder="04410035.000304/2025-10"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ID SEI do Documento</label>
                  <input
                    type="text"
                    required
                    value={documentoSeiId}
                    onChange={(e) => setDocumentoSeiId(e.target.value)}
                    placeholder="Ex: 41265025"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Assinatura</label>
                  <input
                    type="date"
                    required
                    value={dataAssinatura}
                    onChange={(e) => setDataAssinatura(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Se for prorrogação, campo para nova data de vigência final */}
              {tipoAlteracao === 'PRORROGACAO_ADITIVO' && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                  <label className="block font-bold text-blue-950">Nova Data Final da Vigência Prorrogada</label>
                  <input
                    type="date"
                    required
                    value={novaVigenciaFim}
                    onChange={(e) => setNovaVigenciaFim(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              )}

              {/* Alerta de Interregno Não Atingido retornado pelo backend */}
              {avisoInterregno && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2 text-rose-800 font-bold">
                    <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>Atenção: Interregno Mínimo de 01 Ano Não Atingido</span>
                  </div>
                  <p className="text-rose-900 leading-relaxed">
                    {avisoInterregno.error}
                  </p>
                  {avisoInterregno.sugestao && (
                    <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      💡 <strong>Orientação Jurídica:</strong> {avisoInterregno.sugestao}
                    </p>
                  )}
                  <div className="pt-2 border-t border-rose-200 flex flex-wrap gap-2 items-center justify-between">
                    {data?.itens?.some((i: any) => i.tipoReajuste === 'REPACTUACAO_CCT') && (
                      <button
                        type="button"
                        onClick={() => {
                          setEscopoReajuste('APENAS_MAO_DE_OBRA');
                          setTipoAlteracao('REPACTUACAO_APOSTILAMENTO');
                          setAvisoInterregno(null);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                      >
                        ⚡ Reajustar Apenas Mão de Obra (CCT - Sem trava de 1 ano)
                      </button>
                    )}
                    <label className="flex items-center space-x-2 text-rose-950 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignorarAvisoInterregno}
                        onChange={(e) => setIgnorarAvisoInterregno(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px]">Confirmar aplicação com justificativa administrativa</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Escopo do Reajuste / Repactuação e Percentuais */}
              {(tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' || tipoAlteracao === 'REAJUSTE_APOSTILAMENTO' || tipoAlteracao === 'REEQUILIBRIO_ADITIVO') && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-blue-700" />
                      <span>Definição de Escopo e Percentuais de Reajuste</span>
                    </label>
                    {(() => {
                      const itensCCT = data?.itens?.filter((i: any) => i.tipoReajuste === 'REPACTUACAO_CCT') || [];
                      const itensIndice = data?.itens?.filter((i: any) => i.tipoReajuste === 'REAJUSTE_INDICE' || !i.tipoReajuste) || [];
                      return itensCCT.length > 0 && itensIndice.length > 0 ? (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full border border-indigo-200">
                          Contrato Híbrido Detectado
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {(() => {
                    const itensCCT = data?.itens?.filter((i: any) => i.tipoReajuste === 'REPACTUACAO_CCT') || [];
                    const itensIndice = data?.itens?.filter((i: any) => i.tipoReajuste === 'REAJUSTE_INDICE' || !i.tipoReajuste) || [];
                    const isHibrido = itensCCT.length > 0 && itensIndice.length > 0;

                    if (isHibrido) {
                      return (
                        <div className="space-y-3">
                          <div>
                            <span className="block font-bold text-slate-700 mb-1.5">
                              Selecione o Escopo de Aplicação deste Reajuste / Repactuação:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEscopoReajuste('APENAS_MAO_DE_OBRA')}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  escopoReajuste === 'APENAS_MAO_DE_OBRA'
                                    ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-bold text-xs flex items-center gap-1 text-amber-900">
                                  <span>⚡ Apenas Mão de Obra (CCT)</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                                  Repactuação imediata por CCT. <strong>Sem interregno de 1 ano</strong>. Preserva insumos inalterados.
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEscopoReajuste('APENAS_INSUMOS')}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  escopoReajuste === 'APENAS_INSUMOS'
                                    ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-sm ring-1 ring-blue-400'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-bold text-xs flex items-center gap-1 text-blue-900">
                                  <span>⏱️ Apenas Insumos/Peças (Índice)</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                                  Reajuste por SINAPI/Índice. <strong>Exige interregno de 1 ano</strong>. Preserva mão de obra inalterada.
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEscopoReajuste('HIBRIDO_DISTINTO')}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  escopoReajuste === 'HIBRIDO_DISTINTO'
                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-sm ring-1 ring-indigo-400'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-bold text-xs flex items-center gap-1 text-indigo-900">
                                  <span>⚖️ Híbrido Simultâneo</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                                  Dois percentuais distintos: CCT para mão de obra e SINAPI para insumos em único termo.
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEscopoReajuste('TODOS_ITENS')}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  escopoReajuste === 'TODOS_ITENS'
                                    ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm ring-1 ring-slate-400'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-bold text-xs flex items-center gap-1 text-slate-800">
                                  <span>🌐 Todos os Itens</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                                  Aplica percentual único horizontalmente a todos os itens reajustáveis.
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Campos conforme o escopo selecionado */}
                          {escopoReajuste === 'HIBRIDO_DISTINTO' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                                <label className="block font-bold text-amber-950 text-xs">
                                  % Mão de Obra Terceirizada (CCT)
                                </label>
                                <div className="flex items-center space-x-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={percentualMaoDeObra}
                                    onChange={(e) => setPercentualMaoDeObra(e.target.value)}
                                    placeholder="Ex: 7.00"
                                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg outline-none font-mono text-xs font-bold"
                                  />
                                  <span className="text-amber-800 font-bold">%</span>
                                </div>
                                <span className="text-[10px] text-amber-700 block">⚡ Sem interregno de 1 ano</span>
                              </div>

                              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                                <label className="block font-bold text-blue-950 text-xs">
                                  % Insumos e Peças (SINAPI / Índice)
                                </label>
                                <div className="flex items-center space-x-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={percentualInsumos}
                                    onChange={(e) => setPercentualInsumos(e.target.value)}
                                    placeholder="Ex: 4.50"
                                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg outline-none font-mono text-xs font-bold"
                                  />
                                  <span className="text-blue-800 font-bold">%</span>
                                </div>
                                <span className="text-[10px] text-blue-700 block">⏱️ Sujeito a 1 ano (365 dias)</span>
                              </div>
                            </div>
                          ) : escopoReajuste === 'APENAS_MAO_DE_OBRA' ? (
                            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-amber-950 text-xs">
                                  Percentual da Convenção Coletiva de Trabalho (CCT) (%)
                                </label>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  ⚡ Sem interregno de 1 ano
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={percentualMaoDeObra || percentualReajuste}
                                  onChange={(e) => {
                                    setPercentualMaoDeObra(e.target.value);
                                    setPercentualReajuste(e.target.value);
                                  }}
                                  placeholder="Ex: 7.79"
                                  className="w-40 px-3 py-1.5 bg-white border border-amber-300 rounded-lg outline-none font-mono text-xs font-bold"
                                />
                                <span className="text-amber-800 font-bold">%</span>
                              </div>
                              <p className="text-[10px] text-amber-800 leading-tight">
                                Apenas os itens de Mão de Obra serão recalculados. Os insumos e peças permanecerão com os valores atuais.
                              </p>
                            </div>
                          ) : escopoReajuste === 'APENAS_INSUMOS' ? (
                            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-blue-950 text-xs">
                                  Percentual de Reajuste por Índice de Preços (SINAPI/IPCA) (%)
                                </label>
                                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                  ⏱️ Interregno obrigatório de 1 ano
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={percentualInsumos || percentualReajuste}
                                  onChange={(e) => {
                                    setPercentualInsumos(e.target.value);
                                    setPercentualReajuste(e.target.value);
                                  }}
                                  placeholder="Ex: 4.85"
                                  className="w-40 px-3 py-1.5 bg-white border border-blue-300 rounded-lg outline-none font-mono text-xs font-bold"
                                />
                                <span className="text-blue-800 font-bold">%</span>
                              </div>
                              <p className="text-[10px] text-blue-800 leading-tight">
                                Apenas os insumos e materiais serão recalculados. A mão de obra CCT permanecerá com os valores atuais.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-800 text-xs">
                                Percentual Geral a aplicar a todos os itens (%)
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={percentualReajuste}
                                  onChange={(e) => setPercentualReajuste(e.target.value)}
                                  placeholder="Ex: 5.00"
                                  className="w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono text-xs"
                                />
                                <span className="text-slate-500 font-semibold">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {itensCCT.length > 0 ? (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                            ⚡ <strong>Repactuação por Convenção Coletiva (CCT):</strong> Não há interregno de 01 ano para repactuação. Os efeitos vigoram a partir do registro/vigência do instrumento coletivo.
                          </div>
                        ) : (
                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                            ⏱️ <strong>Reajuste por Índice Contratual:</strong> Sujeito ao interregno obrigatório de 01 ano (365 dias) a contar do orçamento estimado ou do último reajuste.
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            value={percentualReajuste}
                            onChange={(e) => setPercentualReajuste(e.target.value)}
                            placeholder="Ex: 7.79"
                            className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-mono text-xs"
                          />
                          <span className="text-slate-500 font-semibold">%</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Seleção de Convenção Específica (Multi-CCT) quando repactua mão de obra */}
                  {(tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' || escopoReajuste === 'APENAS_MAO_DE_OBRA' || escopoReajuste === 'HIBRIDO_DISTINTO') && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-700" />
                          <span>Convenção Coletiva (CCT) Vinculada a Repactuar</span>
                        </label>
                        {convencoesDisponiveis.length > 1 && (
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                            Multi-CCT ({convencoesDisponiveis.length} convenções cadastradas)
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-tight">
                        Selecione se deseja repactuar <strong>todas as categorias profissionais</strong> ou apenas uma <strong>convenção específica</strong> (ex: repactuar motoristas com data-base em maio mantendo supervisores inalterados até janeiro):
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setCctAlvo('TODAS')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            cctAlvo === 'TODAS'
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>🌐 Todas as Convenções</span>
                          </div>
                          <span className={`text-[10px] block mt-0.5 ${cctAlvo === 'TODAS' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Repactua horizontalmente todos os postos de mão de obra terceirizada.
                          </span>
                        </button>

                        {convencoesDisponiveis.map((cct) => {
                          const isSelected = cctAlvo === cct.id || cctAlvo === cct.nome;
                          return (
                            <button
                              key={cct.id}
                              type="button"
                              onClick={() => setCctAlvo(cct.nome)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="font-bold text-xs flex items-center gap-1.5">
                                <span>📋 Apenas: {cct.nome}</span>
                              </div>
                              <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                {cct.sindicato ? `Sindicato: ${cct.sindicato} • ` : ''}
                                {cct.dataBase ? `Data-base: ${cct.dataBase}` : 'Repactua apenas postos desta convenção'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {cctAlvo !== 'TODAS' && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>
                            <strong>Escopo Restrito por CCT:</strong> Apenas os itens vinculados a <strong>&quot;{cctAlvo}&quot;</strong> sofrerão atualização. As demais funções permanecerão com valores inalterados.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prévia e Simulação dos Itens e Novo Valor Global */}
                  {simulacaoItens.length > 0 && (percentualReajuste || percentualMaoDeObra || percentualInsumos) && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-slate-100/90 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Impacto Financeiro Previsto</span>
                          <span className="text-xs text-slate-700">
                            Valor Atual: <strong>{(data.contrato?.valorGlobalAtualizado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Novo Valor Global Homologado</span>
                          <span className="text-sm font-bold text-emerald-700 font-mono">
                            {novoValorGlobalSimulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-[10px] text-slate-600 font-semibold sticky top-0">
                            <tr>
                              <th className="p-2 w-10 text-center">Item</th>
                              <th className="p-2">Função / Descrição</th>
                              <th className="p-2 w-32">CCT Vinculada</th>
                              <th className="p-2 w-20 text-right">Unit. Atual</th>
                              <th className="p-2 w-24 text-right">Novo Unit.</th>
                              <th className="p-2 w-28 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {simulacaoItens.map((it: any) => (
                              <tr key={it.id || it.numeroItem} className={it.afetado ? 'bg-emerald-50/40' : 'bg-white'}>
                                <td className="p-2 text-center font-bold text-slate-700">{it.numeroItem}</td>
                                <td className="p-2 text-slate-800 text-[11px] font-medium">{it.descricao}</td>
                                <td className="p-2 text-[10px] text-slate-600">
                                  {it.cctVinculada ? (
                                    <span className="px-1.5 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {it.cctVinculada}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Não vinculado</span>
                                  )}
                                </td>
                                <td className="p-2 text-right font-mono text-[11px] text-slate-500">
                                  {it.valorUnitarioAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-2 text-right font-mono text-[11px] font-bold text-slate-900">
                                  {it.novoUnitario?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    it.afetado
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {it.motivo}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Opção de Efeito Retroativo */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="chkRetroativo"
                    checked={possuiEfeitoRetroativo}
                    onChange={(e) => setPossuiEfeitoRetroativo(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chkRetroativo" className="font-bold text-amber-950 cursor-pointer">
                    Possui Efeito Retroativo (Ex: CCT ou termo com vigência pretérita)
                  </label>
                </div>

                {possuiEfeitoRetroativo && (
                  <div className="pl-6 space-y-2 animate-in fade-in">
                    <label className="block font-semibold text-amber-900">
                      Data de Início dos Efeitos Retroativos
                    </label>
                    <input
                      type="date"
                      required={possuiEfeitoRetroativo}
                      value={dataRetroatividade}
                      onChange={(e) => setDataRetroatividade(e.target.value)}
                      className="w-full sm:w-60 px-3 py-1.5 bg-white border border-amber-300 rounded-lg outline-none font-medium text-xs"
                    />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      O sistema consultará automaticamente as faturas atestadas entre a data retroativa e a assinatura para calcular a diferença residual e notificar a equipe de fiscalização.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justificativa / Parecer Técnico</label>
                <textarea
                  rows={2}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Informe a fundamentação da alteração (ex: CCT 2026, parecer DICONT nº ..., etc.)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovoRegistroModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Gravando e Recalculando...' : 'Confirmar e Homologar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELABORAÇÃO E GERAÇÃO DE MINUTAS SEI */}
      {showGeradorDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Gerador Oficial de Minutas SEI e Cálculos (Padrão UERN)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGeradorDocModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Seleção do Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoDocSelecionado('SOLICITACAO_REPACTUACAO');
                  setDocGeradoHtml(null);
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tipoDocSelecionado === 'SOLICITACAO_REPACTUACAO'
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block text-xs">Solicitação de Providências</span>
                <span className="text-[10px] text-slate-500 font-normal">Repactuação CCT (Tabelas 01 e 02)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoDocSelecionado('SOLICITACAO_PRORROGACAO');
                  setDocGeradoHtml(null);
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tipoDocSelecionado === 'SOLICITACAO_PRORROGACAO'
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block text-xs">Solicitação de Providências</span>
                <span className="text-[10px] text-slate-500 font-normal">Prorrogação de Vigência à PROAD</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoDocSelecionado('OFICIO_PRORROGACAO');
                  setDocGeradoHtml(null);
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tipoDocSelecionado === 'OFICIO_PRORROGACAO'
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block text-xs">Ofício ao Fornecedor</span>
                <span className="text-[10px] text-slate-500 font-normal">Anuência de Prorrogação (5 dias úteis)</span>
              </button>
            </div>

            {/* Parâmetros do Documento */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {tipoDocSelecionado === 'OFICIO_PRORROGACAO' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nº do Ofício</label>
                    <input
                      type="text"
                      value={numeroOficio}
                      onChange={(e) => setNumeroOficio(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Meses Prorrogados</label>
                    <input
                      type="number"
                      value={mesesProrrogacao}
                      onChange={(e) => setMesesProrrogacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </>
              )}

              {tipoDocSelecionado === 'SOLICITACAO_PRORROGACAO' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nº da Solicitação</label>
                    <input
                      type="text"
                      value={numeroSolicitacao}
                      onChange={(e) => setNumeroSolicitacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Meses Prorrogados</label>
                    <input
                      type="number"
                      value={mesesProrrogacao}
                      onChange={(e) => setMesesProrrogacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </>
              )}

              {tipoDocSelecionado === 'SOLICITACAO_REPACTUACAO' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nº Solicitação</label>
                    <input
                      type="text"
                      value={numeroSolicitacao}
                      onChange={(e) => setNumeroSolicitacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CCT Registro</label>
                    <input
                      type="text"
                      value={cctRegistro}
                      onChange={(e) => setCctRegistro(e.target.value)}
                      placeholder="RN000013/2026"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">% Reajuste CCT</label>
                    <input
                      type="number"
                      step="0.01"
                      value={percentualSimulacao}
                      onChange={(e) => setPercentualSimulacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={gerandoDoc}
                  onClick={handleGerarDocumento}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {gerandoDoc ? 'Gerando...' : 'Calcular e Gerar'}
                </button>
              </div>
            </div>

            {/* Preview do Documento com Opção de Copiar para o SEI */}
            {docGeradoHtml && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>Visualização Pronta para o SEI (Preserva tabelas, bordas e formatação)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopiarHtml}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiado ? 'Copiado com Sucesso!' : 'Copiar para o SEI'}</span>
                    </button>
                  </div>
                </div>

                <div
                  className="border border-slate-200 rounded-xl p-6 bg-white max-h-[500px] overflow-y-auto shadow-inner"
                  dangerouslySetInnerHTML={{ __html: docGeradoHtml }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SNAPSHOT DETALHADO DA ALTERAÇÃO */}
      {detalhesAlteracao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Snapshot Histórico: {detalhesAlteracao.numeroTermo}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Assinado em {new Date(detalhesAlteracao.dataAssinatura).toLocaleDateString('pt-BR')} por {detalhesAlteracao.criadoPor?.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalhesAlteracao(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block">Instrumento:</span>
                  <strong className="text-slate-800">{detalhesAlteracao.instrumento}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">SEI ID:</span>
                  <strong className="text-slate-800 font-mono">{detalhesAlteracao.documentoSeiId}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Novo Valor Global:</span>
                  <strong className="text-emerald-700 font-mono">
                    {detalhesAlteracao.novoValorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Nova Base 25%:</span>
                  <strong className="text-blue-800 font-mono">
                    {detalhesAlteracao.novaBaseCalculoAditivos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>

              {detalhesAlteracao.calculoResidualJson && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-950">Demonstrativo de Resíduo Retroativo Apurado</h4>
                  <p className="text-[11px] text-amber-900">
                    Total Residual: <strong>{detalhesAlteracao.valorResidualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </p>
                </div>
              )}

              {detalhesAlteracao.itensSnapshotAtualizado && Array.isArray(detalhesAlteracao.itensSnapshotAtualizado) && detalhesAlteracao.itensSnapshotAtualizado.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800">Itens e Valores neste Procedimento:</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2 w-10 text-center">Item</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 w-28 text-center">Regra</th>
                          <th className="p-2 w-16 text-right">Qtd</th>
                          <th className="p-2 w-24 text-right">Unitário</th>
                          <th className="p-2 w-28 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalhesAlteracao.itensSnapshotAtualizado.map((it: any) => (
                          <tr key={it.id || it.numeroItem}>
                            <td className="p-2 text-center font-bold text-slate-700">{it.numeroItem}</td>
                            <td className="p-2 text-slate-800 text-[11px]">
                              <div>{it.descricao}</div>
                              {it.cctVinculada && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  CCT: {it.cctVinculada}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {it.tipoReajuste === 'REPACTUACAO_CCT' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200">M.O. (CCT)</span>
                              ) : it.tipoReajuste === 'NAO_REAJUSTAVEL' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Fixo</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-900 border border-blue-200">Insumos/Índice</span>
                              )}
                            </td>
                            <td className="p-2 text-right">{it.quantidadeAtual || it.quantidade}</td>
                            <td className="p-2 text-right font-mono text-[11px]">{(it.valorUnitarioAtual || it.valorUnitario)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="p-2 text-right font-bold text-slate-800 font-mono text-[11px]">{(it.valorTotalAtual || it.valorTotal)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
