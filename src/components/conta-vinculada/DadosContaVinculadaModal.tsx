'use client';

import React, { useState } from 'react';
import {
  X,
  Landmark,
  Building,
  Save,
  CheckCircle2,
  Calendar,
  FileText,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface DadosContaVinculadaModalProps {
  contrato: any;
  onClose: () => void;
  onSucesso: () => void;
}

export default function DadosContaVinculadaModal({
  contrato,
  onClose,
  onSucesso,
}: DadosContaVinculadaModalProps) {
  const [banco, setBanco] = useState(contrato?.contaVinculadaBanco || 'Banco do Brasil S.A.');
  const [agencia, setAgencia] = useState(contrato?.contaVinculadaAgencia || '3795-8');
  const [numeroConta, setNumeroConta] = useState(contrato?.contaVinculadaNumeroConta || '');
  const [dataAbertura, setDataAbertura] = useState(() => {
    if (contrato?.contaVinculadaDataAbertura) {
      return new Date(contrato.contaVinculadaDataAbertura).toISOString().slice(0, 10);
    }
    return '';
  });
  const [oficioAbertura, setOficioAbertura] = useState(
    contrato?.contaVinculadaOficioAbertura || 'Ofício nº 151/2026/UERN - PROAD'
  );
  const [processoSei, setProcessoSei] = useState(
    contrato?.contaVinculadaProcessoSei || contrato?.processoSeiMae || ''
  );
  const [statusConta, setStatusConta] = useState(
    contrato?.contaVinculadaStatusConta || (contrato?.contaVinculadaNumeroConta ? 'ATIVA' : 'AGUARDANDO_ABERTURA')
  );
  const [observacoes, setObservacoes] = useState(contrato?.contaVinculadaObservacoes || '');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroConta.trim()) {
      setErro('Informe o número da conta vinculada fornecido pelo banco.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DADOS_BANCARIOS',
          contratoId: contrato.id,
          contaVinculadaBanco: banco,
          contaVinculadaAgencia: agencia,
          contaVinculadaNumeroConta: numeroConta,
          contaVinculadaDataAbertura: dataAbertura || null,
          contaVinculadaOficioAbertura: oficioAbertura,
          contaVinculadaProcessoSei: processoSei,
          contaVinculadaStatusConta: statusConta,
          contaVinculadaObservacoes: observacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar dados bancários');
      }

      onSucesso();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro de conexão ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Landmark className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Dados da Conta Vinculada Aberta no Banco
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Contrato nº {contrato?.numeroContrato || contrato?.numeroEmpenho || 'SGC'} • {contrato?.fornecedor?.razaoSocial || 'Contratada'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <span className="font-bold flex items-center space-x-1.5 mb-1 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Confirmação Bancária Oficial</span>
            </span>
            Cadastre aqui os dados da conta garantia bloqueada fornecidos pela agência bancária após a abertura do convênio. Estes dados serão <strong>puxados automaticamente em todos os ofícios de liberação</strong>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Instituição Bancária
              </label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ex: Banco do Brasil S.A."
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Agência com Dígito
              </label>
              <input
                type="text"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                placeholder="Ex: 3795-8"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Conta Corrente Vinculada
              </label>
              <input
                type="text"
                value={numeroConta}
                onChange={(e) => setNumeroConta(e.target.value)}
                placeholder="Ex: 4900101224108"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Status da Conta
              </label>
              <select
                value={statusConta}
                onChange={(e) => setStatusConta(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="AGUARDANDO_ABERTURA">Aguardando Abertura pelo Banco</option>
                <option value="ATIVA">Ativa e Bloqueada para Movimentação</option>
                <option value="BLOQUEADA">Bloqueada Judicialmente / Administrativo</option>
                <option value="ENCERRADA">Encerrada (Contrato Finalizado)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Data de Abertura / Confirmação
              </label>
              <input
                type="date"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Processo SEI da Conta
              </label>
              <input
                type="text"
                value={processoSei}
                onChange={(e) => setProcessoSei(e.target.value)}
                placeholder="Ex: 04410017.001048/2025-04"
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Ofício de Abertura Emitido pela UERN
            </label>
            <input
              type="text"
              value={oficioAbertura}
              onChange={(e) => setOficioAbertura(e.target.value)}
              placeholder="Ex: Ofício nº 151/2026/UERN - PROAD"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Observações Adicionais do Banco
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Gerente de relacionamento: João Silva (Ramal 2122). Convênio firmado com tarifa isenta."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando Dados...' : 'Salvar Dados Bancários'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
