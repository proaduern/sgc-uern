'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building,
  Users,
  DollarSign,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { ResultadoParsePlanilhaCustos } from '@/lib/planilha-custos-parser';

interface UploadLotePlanilhaCustosModalProps {
  contratoId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadLotePlanilhaCustosModal({
  contratoId,
  isOpen,
  onClose,
  onSuccess,
}: UploadLotePlanilhaCustosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ResultadoParsePlanilhaCustos | null>(null);
  const [vincularItens, setVincularItens] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroCampus, setFiltroCampus] = useState<string>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setErro(null);
    setLoadingPreview(true);
    setPreviewData(null);

    try {
      const fd = new FormData();
      fd.append('contratoId', contratoId);
      fd.append('arquivo', selectedFile);
      fd.append('preview', 'true');

      const res = await fetch('/api/contratos/planilhas-custos/importar-lote', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar planilha.');
      }

      setPreviewData(data.resultado);
    } catch (err: any) {
      setErro(err.message || 'Falha ao analisar a planilha.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!file) return;
    setSalvando(true);
    setErro(null);

    try {
      const fd = new FormData();
      fd.append('contratoId', contratoId);
      fd.append('arquivo', file);
      fd.append('preview', 'false');
      fd.append('vincularItens', String(vincularItens));

      const res = await fetch('/api/contratos/planilhas-custos/importar-lote', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao gravar planilhas de custos.');
      }

      alert(data.mensagem || 'Planilhas de custos importadas com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao concluir importação.');
    } finally {
      setSalvando(false);
    }
  };

  const itensFiltrados = previewData?.itens.filter((it) => {
    const matchCampus = filtroCampus === 'TODOS' || it.cidade.toUpperCase().includes(filtroCampus.toUpperCase());
    const matchBusca =
      !buscaTexto ||
      it.funcao.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      it.cidade.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      it.cbo.includes(buscaTexto);
    return matchCampus && matchBusca;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Importar Planilha Completa do Contrato</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Anexo I Multi-Abas
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Leitura automática de todas as abas analíticas de postos (IN 05/2017) e Quadro Resumo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seletor de Arquivo */}
          {!previewData && (
            <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-2xl p-8 text-center transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                id="anexo-custos-file"
                className="hidden"
                disabled={loadingPreview}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
              <label htmlFor="anexo-custos-file" className="cursor-pointer block space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center shadow-inner">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    {loadingPreview ? 'Lendo e processando abas da planilha...' : 'Clique para selecionar a Planilha de Custos (.xlsx)'}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Suporta a planilha oficial com aba RESUMO e as 50 abas individuais por posto
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Prévia dos Dados Extraídos */}
          {previewData && (
            <div className="space-y-4">
              {/* Card de Resumo Global */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <div className="text-[11px] font-bold text-blue-900 uppercase">Funções Mapeadas</div>
                  <div className="text-xl font-bold text-blue-950 mt-1 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-5 h-5 text-blue-700" />
                    <span>{previewData.totalItens} funções</span>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase">Total de Postos</div>
                  <div className="text-xl font-bold text-indigo-950 mt-1 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-700" />
                    <span>{previewData.totalPostos} postos</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">Custo Mensal Global</div>
                  <div className="text-xl font-bold text-emerald-950 mt-1 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5 text-emerald-700" />
                    <span>
                      {previewData.totalMensalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">Custo Anual (12m)</div>
                  <div className="text-xl font-bold text-amber-950 mt-1 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5 text-amber-700" />
                    <span>
                      {previewData.totalAnualGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Campus */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-600" />
                  <span>Distribuição por Campus / Cidade da UERN:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltroCampus('TODOS')}
                    className={`p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                      filtroCampus === 'TODOS'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold">Todos</div>
                    <div className="text-[10px] opacity-80">{previewData.totalItens} funções</div>
                  </button>

                  {previewData.resumoPorCampus.map((rc) => (
                    <button
                      key={rc.campus}
                      type="button"
                      onClick={() => setFiltroCampus(rc.campus)}
                      className={`p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        filtroCampus.toUpperCase().includes(rc.campus.toUpperCase())
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold truncate">{rc.campus}</div>
                      <div className="text-[10px] opacity-80">
                        {rc.quantidadePostos} postos • {rc.quantidadeItens} funções
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Barra de Filtro e Busca */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome da função, cidade ou CBO..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 shadow-sm"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Exibindo {itensFiltrados.length} de {previewData.totalItens} postos
                </div>
              </div>

              {/* Tabela dos Postos Mapeados */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Campus</th>
                      <th className="py-2 px-3">Função / Posto</th>
                      <th className="py-2 px-3 text-center">Jornada</th>
                      <th className="py-2 px-3 text-right">Salário Base</th>
                      <th className="py-2 px-3 text-center">Postos</th>
                      <th className="py-2 px-3 text-right">Custo Mensal Unit.</th>
                      <th className="py-2 px-3 text-right">Custo Anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {itensFiltrados.map((it) => (
                      <tr key={it.numeroItem} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{it.numeroItem}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{it.cidade}</span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{it.funcao}</div>
                          <div className="text-[10px] text-slate-400">CBO: {it.cbo}</div>
                        </td>
                        <td className="py-2 px-3 text-center">{it.jornada}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          {it.salarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{it.quantidadePostos}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {it.precoTotalEmpregado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {it.valorGlobalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Opções de Vinculação */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="vincularItensContrato"
                    checked={vincularItens}
                    onChange={(e) => setVincularItens(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="vincularItensContrato" className="cursor-pointer font-medium">
                    Vincular automaticamente cada planilha aos itens correspondentes do contrato
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                >
                  Trocar Planilha
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          {previewData && (
            <button
              type="button"
              disabled={salvando}
              onClick={handleConfirmarImportacao}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{salvando ? 'Gravando Planilhas no Contrato...' : `Gravar Todas as ${previewData.totalItens} Funções no Contrato`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
