'use client';

import React, { useState } from 'react';
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
  X,
} from 'lucide-react';

interface UploadInteligenteContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Limite de corpo de requisição serverless na Vercel (4.5 MB)
    const MAX_SIZE_MB = 4.5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`O arquivo selecionado possui ${tamanhoMB} MB. O limite máximo para upload direto na nuvem é de 4.5 MB. Por favor, comprima o PDF (utilizando ferramentas como ilovepdf.com ou similar) ou cadastre o contrato diretamente pelo formulário.`);
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
          throw new Error('Tempo limite de processamento excedido. O arquivo pode ser muito extenso.');
        }
        if (res.status === 401) {
          throw new Error('Sua sessão expirou. Por favor, recarregue a página e faça login novamente.');
        }
        throw new Error(`Erro do servidor (${res.status}). Não foi possível processar o arquivo.`);
      }

      if (!res.ok) throw new Error(json?.error || 'Falha ao processar PDF do contrato.');

      setResultado(json);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-blue-700" />
            <span>Upload Inteligente de Contratos (.PDF)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Envie o arquivo <strong>.pdf</strong> do contrato assinado. O motor inteligente interpretará o número do contrato, processo SEI, contratada, representante legal, vigência, valores e extrairá automaticamente a tabela de itens/postos por campus para evitar digitação manual.
        </p>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
            {error}
          </div>
        )}

        {resultado ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Leitura e Extração Concluída com Sucesso!</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">{resultado.mensagem}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-medium text-emerald-950">
                <div>
                  <span className="text-[10px] text-emerald-700 block">Nº do Contrato:</span>
                  <strong>{resultado.numeroContrato || 'Pendente'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">Itens Extraídos:</span>
                  <strong>{resultado.totalItensExtraidos} itens</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">Contratada:</span>
                  <span className="truncate block">{resultado.fornecedor || 'Pendente'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">CNPJ:</span>
                  <span className="font-mono">{resultado.cnpj || 'Pendente'}</span>
                </div>
              </div>
            </div>

            {resultado.camposPendentes && resultado.camposPendentes.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 text-amber-900">
                <div className="flex items-center space-x-1.5 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Campos Pendentes para Homologação Final ({resultado.camposPendentes.length}):</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  {resultado.camposPendentes.map((cp: string, idx: number) => (
                    <li key={idx}>{cp}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-700 pt-1">
                  O contrato foi registrado como <strong>Rascunho</strong>. Acesse o formulário para completar essas informações e efetivar o cadastro.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/contratos/novo?rascunhoId=${resultado.rascunhoId}`);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <span>Abrir Rascunho e Finalizar Cadastro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  Formatos aceitos: arquivos .pdf (ex: Contrato_EXEMPLO.pdf)
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
                    <span>Processando e Extraindo Itens...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fazer Upload e Ler Contrato</span>
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
