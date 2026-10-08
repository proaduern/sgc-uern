'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Building2,
  X,
  BadgeCheck,
  ArrowRight,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

interface UploadInteligenteDesignacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadInteligenteDesignacaoModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadInteligenteDesignacaoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any | null>(null);
  const [contratoSelecionadoManual, setContratoSelecionadoManual] = useState<string>('');
  const [vinculandoManual, setVinculandoManual] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Limite de corpo de requisição serverless na Vercel (4.5 MB)
    const MAX_SIZE_MB = 4.5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`O arquivo selecionado possui ${tamanhoMB} MB. O limite máximo para upload direto na nuvem é de 4.5 MB. Por favor, comprima o PDF (utilizando ferramentas como ilovepdf.com ou similar) antes de enviar.`);
      return;
    }

    setUploading(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/fiscais/upload-designacao', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type') || '';
      let json: any = null;

      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        if (res.status === 413) throw new Error('O arquivo PDF ultrapassa o limite de 4.5 MB. Comprima o PDF antes de enviar.');
        if (res.status === 504) throw new Error('Tempo limite excedido ao processar o arquivo.');
        throw new Error(`Erro do servidor (${res.status}). Não foi possível processar o arquivo.`);
      }

      if (!res.ok) throw new Error(json?.error || 'Falha ao processar ato de designação');

      setResultado(json);
      // Se encontrou o contrato e vinculou com sucesso, chama onSuccess para atualizar a tela
      if (json.contratoEncontrado && onSuccess) {
        onSuccess();
      }
      if (json.contratosDisponiveis && json.contratosDisponiveis.length > 0) {
        setContratoSelecionadoManual(json.contratosDisponiveis[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleVincularManual = async () => {
    if (!contratoSelecionadoManual || !resultado?.servidores) return;
    setVinculandoManual(true);
    setError(null);

    try {
      const res = await fetch('/api/fiscais/upload-designacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contratoSelecionadoManual,
          numeroAto: resultado.numeroAto,
          idSeiAto: resultado.idSeiAto,
          processoSei: resultado.processoSei,
          servidores: resultado.servidores,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao vincular fiscais ao contrato');

      setResultado(json);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVinculandoManual(false);
    }
  };

  const handleConcluir = () => {
    if (resultado?.contratoEncontrado && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-blue-700" />
            <span>Upload Inteligente de Ato de Designação (.PDF)</span>
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
          Envie o arquivo <strong>.pdf</strong> do Ato de Designação emitido pela PROAD. O sistema identifica o número do ato, o contrato e processo a que se refere, e cadastra/vincula automaticamente os fiscais (Gestor, Suplente, Administrativo, Técnicos e Setoriais).
        </p>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
            {error}
          </div>
        )}

        {resultado ? (
          <div className="space-y-4 animate-in fade-in">
            {resultado.contratoEncontrado ? (
              /* CASO 1: CONTRATO ENCONTRADO E FISCAIS VINCULADOS COM SUCESSO */
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ato e Equipe Vinculados com Sucesso!</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">{resultado.mensagem}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-medium text-emerald-950">
                  <div>
                    <span className="text-[10px] text-emerald-700 block">Número do Ato:</span>
                    <strong>Ato nº {resultado.numeroAto || 'Identificado'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block">ID SEI do Ato:</span>
                    <strong className="font-mono">{resultado.idSeiAto || 'Não informado'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-emerald-700 block">Contrato Vinculado:</span>
                    <span className="truncate block font-bold text-emerald-900">
                      Contrato nº {resultado.contratoVinculado?.numeroContrato} (Processo {resultado.contratoVinculado?.processoSeiMae})
                    </span>
                    <span className="text-[11px] text-emerald-800 block truncate">
                      {resultado.contratoVinculado?.objeto}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* CASO 2: CONTRATO NÃO ENCONTRADO NO SISTEMA (AVISO CLARO E ORIENTAÇÃO) */
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-amber-950 font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-sm">Contrato de Referência Não Encontrado no Sistema</span>
                </div>

                <p className="text-amber-900 leading-relaxed">
                  O arquivo foi lido com sucesso e identificou o <strong>Ato nº {resultado.numeroAto || 'S/N'}</strong> com <strong>{resultado.totalDesignados} servidores</strong> para o Processo SEI <strong className="font-mono text-amber-950">{resultado.processoSei || 'não informado'}</strong> (Contratada: <strong>{resultado.empresaContratada || 'Não identificada'}</strong>).
                </p>

                <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-950 font-semibold text-[11px]">
                  ⚠️ <strong>Atenção:</strong> Não é possível cadastrar os fiscais no sistema porque o contrato correspondente ainda <strong>não existe</strong> no banco de dados. Os fiscais só podem ser vinculados a um contrato já existente.
                </div>

                {/* Opção 1: Vincular a um contrato já existente se houver */}
                {resultado.contratosDisponiveis && resultado.contratosDisponiveis.length > 0 && (
                  <div className="pt-2 border-t border-amber-200 space-y-2">
                    <label className="block font-bold text-amber-950">
                      Deseja vincular esta equipe a um dos contratos já cadastrados abaixo?
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={contratoSelecionadoManual}
                        onChange={(e) => setContratoSelecionadoManual(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs outline-none text-slate-800 font-medium"
                      >
                        {resultado.contratosDisponiveis.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            Contrato {c.numeroContrato} - {c.processoSeiMae} ({c.fornecedorNome || 'Fornecedor'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={vinculandoManual || !contratoSelecionadoManual}
                        onClick={handleVincularManual}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {vinculandoManual ? 'Vinculando...' : 'Vincular a este Contrato'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Opção 2: Cadastrar o contrato primeiro */}
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                  <span className="text-[11px] text-amber-900">
                    O contrato correto ainda não foi cadastrado?
                  </span>
                  <Link
                    href={`/contratos/novo?processoSei=${encodeURIComponent(resultado.processoSei || '')}&fornecedor=${encodeURIComponent(resultado.empresaContratada || '')}`}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg font-bold text-xs shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Cadastrar Contrato Agora</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Listagem dos servidores identificados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800">
                  Equipe de Fiscalização Identificada ({resultado.servidores?.length || 0}):
                </h4>
                {!resultado.contratoEncontrado && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Aguardando Vínculo ao Contrato
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {resultado.servidores?.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                      resultado.contratoEncontrado
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                          {s.tipoAtuacao.replace(/_/g, ' ')}
                        </span>
                        <strong className="text-slate-800">{s.nome}</strong>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Matrícula: <span className="font-mono text-slate-700">{s.matricula}</span>
                        {s.cidade && <span className="ml-1 text-slate-600 font-semibold">• {s.cidade}</span>}
                      </p>
                    </div>
                    {resultado.contratoEncontrado ? (
                      <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Pendente de Contrato</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConcluir}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer ${
                  resultado.contratoEncontrado
                    ? 'bg-blue-700 hover:bg-blue-800'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {resultado.contratoEncontrado ? 'Concluir e Ver Equipe na Tela' : 'Fechar / Cadastrar Contrato Primeiro'}
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
                id="pdf-designacao-upload"
              />
              <label htmlFor="pdf-designacao-upload" className="cursor-pointer block space-y-2">
                <Users className="w-10 h-10 text-blue-600 mx-auto" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {file ? file.name : 'Clique aqui para selecionar o Ato de Designação em PDF'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Formatos aceitos: arquivos .pdf (ex: ATO DESIGNAÇÃO - EXEMPLO.pdf)
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
                    <span>Interpretando Ato e Fiscais...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fazer Upload e Ler Designação</span>
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
