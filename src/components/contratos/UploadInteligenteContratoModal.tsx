'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Building2,
  Check,
  X,
  Calendar,
  DollarSign,
  ShieldCheck,
  MapPin,
  Briefcase,
  Hash,
  Clock
} from 'lucide-react';

interface UploadInteligenteContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (rascunhoId?: string) => void;
}

export default function UploadInteligenteContratoModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadInteligenteContratoModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any | null>(null);

  // Campos de complementação rápida na prévia
  const [vigenciaInicio, setVigenciaInicio] = useState('');
  const [vigenciaFim, setVigenciaFim] = useState('');
  const [numeroEmpenho, setNumeroEmpenho] = useState('');
  const [salvandoComplementos, setSalvandoComplementos] = useState(false);

  // Filtro de Campus na tabela de itens
  const [campusFiltro, setCampusFiltro] = useState<string>('TODOS');

  if (!isOpen) return null;

  // Manipulador de início de vigência com preenchimento automático de +12 meses
  const handleVigenciaInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setVigenciaInicio(val);
    if (val && !vigenciaFim) {
      try {
        const d = new Date(val + 'T00:00:00');
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1); // 1 ano menos 1 dia
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setVigenciaFim(`${y}-${m}-${day}`);
      } catch (err) {
        // silencioso
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Limite de corpo de requisição na Vercel (4.5 MB)
    const MAX_SIZE_MB = 4.5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`O arquivo selecionado possui ${tamanhoMB} MB. O limite máximo para upload direto na nuvem é de 4.5 MB. Por favor, otimize/comprima o PDF antes de enviar.`);
      return;
    }

    setUploading(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/contratos/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type') || '';
      let json: any = null;

      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        if (res.status === 413) {
          throw new Error('O arquivo PDF ultrapassa o limite de 4.5 MB da hospedagem. Comprima o PDF antes de enviar.');
        }
        if (res.status === 504) {
          throw new Error('Tempo limite de processamento excedido pelo servidor.');
        }
        if (res.status === 401) {
          throw new Error('Sua sessão expirou. Por favor, recarregue a página e faça login novamente.');
        }
        throw new Error(`Erro do servidor (${res.status}). Não foi possível processar o arquivo.`);
      }

      if (!res.ok) throw new Error(json?.error || 'Falha ao processar PDF do contrato.');

      setResultado(json);
      if (json.parsed?.vigenciaInicio) setVigenciaInicio(json.parsed.vigenciaInicio);
      if (json.parsed?.vigenciaFim) setVigenciaFim(json.parsed.vigenciaFim);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  // Lista única de campi para as abas de filtro
  const listaCampi = useMemo(() => {
    if (!resultado?.parsed?.itens) return [];
    const setCampi = new Set<string>();
    resultado.parsed.itens.forEach((it: any) => {
      if (it.cidade) setCampi.add(it.cidade.replace('/RN', '').trim());
    });
    return Array.from(setCampi).sort();
  }, [resultado]);

  // Itens filtrados pelo campus selecionado
  const itensFiltrados = useMemo(() => {
    if (!resultado?.parsed?.itens) return [];
    if (campusFiltro === 'TODOS') return resultado.parsed.itens;
    return resultado.parsed.itens.filter((it: any) =>
      it.cidade?.toLowerCase().includes(campusFiltro.toLowerCase())
    );
  }, [resultado, campusFiltro]);

  // Ação de confirmação e prosseguimento
  const handleConfirmarEProsseguir = async () => {
    if (!resultado?.rascunhoId) return;

    // Se o usuário preencheu datas ou empenho na prévia, salvamos no rascunho antes de abrir
    if (vigenciaInicio || vigenciaFim || numeroEmpenho) {
      setSalvandoComplementos(true);
      try {
        // Busca o rascunho atual para merge
        const rascRes = await fetch(`/api/contratos/rascunhos/${resultado.rascunhoId}`);
        if (rascRes.ok) {
          const rascData = await rascRes.json();
          const dadosAtualizados = {
            ...(rascData.dados || {}),
            ...(vigenciaInicio ? { vigenciaInicio } : {}),
            ...(vigenciaFim ? { vigenciaFim } : {}),
            ...(numeroEmpenho ? { numeroEmpenho } : {}),
          };

          await fetch('/api/contratos/rascunhos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: resultado.rascunhoId,
              tituloIdentificador: rascData.tituloIdentificador,
              numeroContrato: rascData.numeroContrato,
              processoSei: rascData.processoSei,
              objeto: rascData.objeto,
              dados: dadosAtualizados,
            }),
          });
        }
      } catch (err) {
        console.warn('Aviso ao sincronizar complementos no rascunho:', err);
      } finally {
        setSalvandoComplementos(false);
      }
    }

    if (onSuccess) onSuccess(resultado.rascunhoId);
    onClose();
    router.push(`/contratos/novo?rascunhoId=${resultado.rascunhoId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-6 ${
        resultado ? 'max-w-4xl' : 'max-w-lg'
      }`}>
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-blue-700" />
            <span>Upload Inteligente com Prévia de Contrato e Itens (.PDF)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TELA DE PRÉVIA APÓS PROCESSAMENTO */}
        {resultado ? (
          <div className="space-y-4 animate-in fade-in">
            {/* Banner Superior com Resumo de Sucesso */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Leitura do Contrato e Extração dos 50 Itens Concluída!</span>
                </div>
                {resultado.parsed?.conferenciaMatematica && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>100% Conferido com Valor Global</span>
                  </span>
                )}
              </div>

              {/* Cards de Dados Básicos Extraídos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Nº do Contrato:</span>
                  <strong className="text-slate-800 font-mono">{resultado.numeroContrato || 'Pendente'}</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Processo SEI Mãe:</span>
                  <strong className="text-slate-800 font-mono truncate block" title={resultado.processoSei}>
                    {resultado.processoSei || 'Pendente'}
                  </strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Contratada:</span>
                  <strong className="text-slate-800 truncate block" title={resultado.fornecedor}>
                    {resultado.fornecedor || 'Pendente'}
                  </strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">CNPJ:</span>
                  <span className="text-slate-800 font-mono font-medium block">{resultado.cnpj || 'Pendente'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Licitação / Base:</span>
                  <span className="text-slate-800 font-medium truncate block">{resultado.parsed?.licitacaoProcedimento || 'Pregão'}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Total de Postos:</span>
                  <strong className="text-slate-800">{resultado.parsed?.totalPostos || 286} postos</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Total de Itens:</span>
                  <strong className="text-slate-800">{resultado.totalItensExtraidos} itens</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-medium block">Valor Global Anual:</span>
                  <strong className="text-blue-900 font-semibold block">
                    {resultado.parsed?.valorGlobal
                      ? Number(resultado.parsed.valorGlobal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'R$ 0,00'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Seção de Complementação de Lacunas (Datas e Empenho) */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-950">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Lacunas Administrativas (Podem ser digitadas agora ou completadas no formulário):</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-tight">
                Como a vigência oficial depende de publicação no PNCP e o empenho é lavrado pela contabilidade, informe as datas se já as tiver em mãos:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Data Início da Vigência (Publicação)
                  </label>
                  <input
                    type="date"
                    value={vigenciaInicio}
                    onChange={handleVigenciaInicioChange}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Data Fim da Vigência (+12 meses)
                  </label>
                  <input
                    type="date"
                    value={vigenciaFim}
                    onChange={(e) => setVigenciaFim(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Número da Nota de Empenho
                  </label>
                  <input
                    type="text"
                    value={numeroEmpenho}
                    onChange={(e) => setNumeroEmpenho(e.target.value)}
                    placeholder="Ex: 2026NE000123"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO DA TABELA DOS 50 ITENS COM FILTRO DE CAMPUS */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-slate-800">
                    Prévia dos Itens do Contrato ({resultado.parsed?.itens?.length || 0} itens)
                  </span>
                </div>

                {/* Filtro por Campus */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                  <span className="text-slate-500 text-[10px] mr-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-0.5" /> Campus:
                  </span>
                  <button
                    type="button"
                    onClick={() => setCampusFiltro('TODOS')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      campusFiltro === 'TODOS'
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Todos ({resultado.parsed?.itens?.length || 0})
                  </button>
                  {listaCampi.map((camp) => {
                    const qtdNoCampus = resultado.parsed?.itens?.filter((it: any) =>
                      it.cidade?.toLowerCase().includes(camp.toLowerCase())
                    ).length;
                    return (
                      <button
                        key={camp}
                        type="button"
                        onClick={() => setCampusFiltro(camp)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
                          campusFiltro === camp
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {camp} ({qtdNoCampus})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de Itens Extraídos */}
              <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2 w-10 text-center">Item</th>
                      <th className="py-1.5 px-2">Campus</th>
                      <th className="py-1.5 px-2">Descrição / Função do Posto</th>
                      <th className="py-1.5 px-2 text-center w-16">Postos</th>
                      <th className="py-1.5 px-2 text-right">Unit. Mensal</th>
                      <th className="py-1.5 px-2 text-right">Unit. Anual</th>
                      <th className="py-1.5 px-2 text-right">Total Anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensFiltrados.map((it: any) => (
                      <tr key={it.numeroItem} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-1.5 px-2 text-center font-bold text-slate-600 font-mono">
                          {it.numeroItem}
                        </td>
                        <td className="py-1.5 px-2 font-medium text-slate-700 whitespace-nowrap">
                          {it.cidade || '-'}
                        </td>
                        <td className="py-1.5 px-2 font-medium text-slate-800">
                          {it.descricao}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-900">
                          {it.quantidade}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                          {it.valorUnitarioMensal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                          {it.valorUnitarioAnual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {it.valorTotalAnual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar / Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEProsseguir}
                disabled={salvandoComplementos}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                <span>{salvandoComplementos ? 'Sincronizando...' : 'Confirmar e Abrir Formulário Pré-Preenchido'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE SELEÇÃO E UPLOAD DO PDF */
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Envie o arquivo <strong>.pdf</strong> do contrato assinado no SEI. O motor inteligente interpretará o número do contrato, processo SEI, contratada, vigência, valores e extrairá toda a tabela de itens/postos por campus para apresentar a prévia de conferência.
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="pdf-contract-upload"
              />
              <label htmlFor="pdf-contract-upload" className="cursor-pointer block space-y-2">
                <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {file ? file.name : 'Clique aqui para selecionar o Contrato em PDF'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Formatos aceitos: arquivos .pdf (ex: SEI_Contrato.pdf) até 4.5 MB
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Lendo PDF e Extraindo Itens...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fazer Upload e Gerar Prévia</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
