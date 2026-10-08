'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calculator,
  Download,
  Building,
  MapPin,
  Check,
  Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ImrResultadoCalculado } from '@/lib/imr-parser';

interface ImrLeituraModalProps {
  contratos: any[];
  onClose: () => void;
  onSalvo: () => void;
  onAbrirNotificacao?: (dadosSugeridos: any) => void;
}

export default function ImrLeituraModal({
  contratos,
  onClose,
  onSalvo,
  onAbrirNotificacao,
}: ImrLeituraModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dadosImr, setDadosImr] = useState<ImrResultadoCalculado | null>(null);
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processarArquivo = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|ods)$/i)) {
      alert('Por favor, selecione uma planilha no formato .xlsx ou .ods');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (contratoSelecionadoId) {
        formData.append('contratoId', contratoSelecionadoId);
      }

      const res = await fetch('/api/imr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.dadosExtraidos) {
        setDadosImr(data.dadosExtraidos);
        if (data.contratoSugerido) {
          setContratoSelecionadoId(data.contratoSugerido.id);
        }
      } else {
        alert(data.error || 'Erro ao processar planilha de IMR.');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão ao ler planilha');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivo(e.dataTransfer.files[0]);
    }
  };

  const handleSalvarNoSistema = async () => {
    if (!contratoSelecionadoId) {
      alert('Selecione o contrato administrativo vinculado a esta medição de IMR.');
      return;
    }
    if (!dadosImr) return;

    setSalvando(true);
    try {
      const contrato = contratos.find((c) => c.id === contratoSelecionadoId);
      const valorFaturaEstimada = (contrato?.valorGlobal || 0) / (contrato?.vigenciaMeses || 12);
      const valorGlosa = (valorFaturaEstimada * dadosImr.percentualGlosa) / 100;

      const res = await fetch('/api/imr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contratoSelecionadoId,
          mesCompetencia: dadosImr.mesCompetencia || new Date().toISOString().slice(0, 7),
          localCampus: dadosImr.localCampus || 'Campus Central Mossoró',
          totalPontos: dadosImr.totalPontos,
          percentualGlosa: dadosImr.percentualGlosa,
          valorGlosa,
          observacoes: dadosImr.observacoes || dadosImr.grauAceitacao,
          fiscalNome: dadosImr.fiscalNome,
          status: dadosImr.requerProcessoSancionatorio ? 'REQUER_NOTIFICACAO' : 'CONCLUIDO',
          itens: dadosImr.itens,
        }),
      });

      if (res.ok) {
        alert('Avaliação de IMR cadastrada com sucesso!');
        onSalvo();
      } else {
        const d = await res.json();
        alert(d.error || 'Falha ao salvar IMR');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarNotificacaoDireta = () => {
    if (!dadosImr) return;
    const contrato = contratos.find((c) => c.id === contratoSelecionadoId);
    const ocorrenciasGraves = dadosImr.itens.filter((i) => i.ocorreu);

    const descricaoFatos = ocorrenciasGraves
      .map((i) => `• ${i.indicador}: ${i.descricao} (Pontuação aplicada: ${i.pontuacaoAplicada} pts ${i.documentoSei ? ` - Doc SEI: ${i.documentoSei}` : ''})`)
      .join('\n');

    const dadosSugeridos = {
      contratoId: contratoSelecionadoId,
      contratoNumero: contrato?.numeroContrato || dadosImr.contratoNumero,
      razaoSocial: contrato?.fornecedor?.razaoSocial || dadosImr.contratada,
      cnpj: contrato?.fornecedor?.cnpj || '',
      processoSei: contrato?.processoSeiMae || '',
      objeto: contrato?.objeto || dadosImr.objetoContratual,
      assunto: `Aplicação de Sanção / Glosa do IMR - Competência ${dadosImr.mesCompetencia}`,
      clausulaDescumprida: `Anexo de IMR do Contrato Administrativo e Art. 44 da IN 01/2026 UERN`,
      descricaoFatos: `Conforme apuração no Instrumento de Medição de Resultado (IMR) referente ao mês ${dadosImr.mesCompetencia}, a Contratada atingiu a pontuação total de ${dadosImr.totalPontos} pontos (${dadosImr.grauAceitacao}), ensejando glosa de ${dadosImr.percentualGlosa}% da fatura mensal e instauração de processo sancionatório pelas seguintes ocorrências:\n${descricaoFatos}`,
      penalidadeProposta: dadosImr.percentualGlosa > 0 ? `Glosa contratual de ${dadosImr.percentualGlosa}% na fatura de referência e Advertência/Multa compensatória` : 'Advertência por descumprimento de indicadores do IMR',
      fiscalNome: dadosImr.fiscalNome || 'Fiscal Administrativo',
    };

    if (onAbrirNotificacao) {
      onAbrirNotificacao(dadosSugeridos);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Leitura Inteligente de IMR (.xlsx / .ods)
              </h3>
              <p className="text-xs text-slate-500">
                Instrumento de Medição de Resultado - Modelo Oficial UERN (Cálculo automático de notas e glosas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          {/* Zona de Upload */}
          {!dadosImr && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-600 bg-blue-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.ods"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processarArquivo(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                {loading ? 'Analisando planilha com Inteligência Artificial...' : 'Clique ou arraste a planilha de IMR aqui'}
              </h4>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Suporta planilhas padrão UERN em <strong>.xlsx</strong> e <strong>.ods</strong> (Ex: IMR.ods, ANEXO_E_IMR.ods). O sistema detecta automaticamente os indicadores, ocorrências marcadas com SIM, notas e IDs SEI.
              </p>
            </div>
          )}

          {/* Resultado do Parsing */}
          {dadosImr && (
            <div className="space-y-5">
              {/* Painel de Metadados e Contrato */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Vincular ao Contrato SGC *
                  </label>
                  <select
                    value={contratoSelecionadoId}
                    onChange={(e) => setContratoSelecionadoId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="">Selecione um contrato...</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho ${c.numeroEmpenho}`} - {c.fornecedor.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Competência Detectada</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
                    {dadosImr.mesCompetencia || 'Não informada na planilha'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Campus / Local</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dadosImr.localCampus || 'UERN Central Mossoró'}</span>
                  </span>
                </div>
              </div>

              {/* Cards de Resumo de Pontos e Glosa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pontuação Total Aplicada
                  </span>
                  <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
                    {dadosImr.totalPontos.toFixed(1)} <span className="text-xs font-normal text-slate-500">pontos</span>
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {dadosImr.itens.filter((i) => i.ocorreu).length} ocorrência(s) registrada(s)
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Glosa em Fatura (Tabela UERN)
                  </span>
                  <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
                    {dadosImr.percentualGlosa > 0 ? `${dadosImr.percentualGlosa}%` : 'Sem Glosa'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Calculado s/ fatura mensal
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Grau de Aceitação do Serviço
                  </span>
                  <span className={`text-xs font-bold mt-1 inline-block px-2.5 py-1 rounded-lg ${
                    dadosImr.totalPontos <= 5
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : dadosImr.totalPontos <= 20
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {dadosImr.grauAceitacao}
                  </span>
                  {dadosImr.requerProcessoSancionatorio && (
                    <span className="text-[10px] font-bold text-rose-600 block mt-1">
                      ⚠️ Requer Abertura de Processo Sancionatório
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Ocorrências */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs uppercase">
                    Discriminação dos Indicadores e Ocorrências da Planilha:
                  </span>
                  <button
                    onClick={() => setDadosImr(null)}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Carregar outra planilha
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Indicador / Serviço</th>
                        <th className="py-2.5 px-3">Descrição da Falta</th>
                        <th className="py-2.5 px-2 text-center">Previsto</th>
                        <th className="py-2.5 px-2 text-center">Ocorreu?</th>
                        <th className="py-2.5 px-2 text-center">Aplicado</th>
                        <th className="py-2.5 px-3">Doc. SEI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dadosImr.itens.map((it, idx) => (
                        <tr
                          key={idx}
                          className={it.ocorreu ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/60'}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            <span className="block text-[10px] text-slate-400">{it.indicador}</span>
                            <span>{it.servico}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs">{it.descricao}</td>
                          <td className="py-2 px-2 text-center font-mono">{it.pontuacaoPrevista} pts</td>
                          <td className="py-2 px-2 text-center">
                            {it.ocorreu ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                SIM
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                NÃO
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-rose-700 font-mono">
                            {it.pontuacaoAplicada > 0 ? `${it.pontuacaoAplicada} pts` : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {it.documentoSei || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        {dadosImr && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {dadosImr.requerProcessoSancionatorio && (
                <button
                  type="button"
                  onClick={handleGerarNotificacaoDireta}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Instaurar Notificação da Contratada (15 dias)</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando || !contratoSelecionadoId}
                onClick={handleSalvarNoSistema}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50"
              >
                {salvando ? 'Salvando Avaliação...' : 'Salvar Avaliação de IMR'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
