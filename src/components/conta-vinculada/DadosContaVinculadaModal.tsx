'use client';

import React, { useState } from 'react';
import {
  X,
  Landmark,
  Save,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { formatarNumeroOficioDas } from '@/lib/config/brasao-uern';

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
  // 1. Dados da Conta Vinculada (Origem das Retenções — sem agência, apenas número da conta)
  const [banco, setBanco] = useState(contrato?.contaVinculadaBanco || 'Banco do Brasil S.A.');
  const [numeroConta, setNumeroConta] = useState(contrato?.contaVinculadaNumeroConta || '');
  const [dataAbertura, setDataAbertura] = useState(() => {
    if (contrato?.contaVinculadaDataAbertura) {
      return new Date(contrato.contaVinculadaDataAbertura).toISOString().slice(0, 10);
    }
    return '';
  });
  const [oficioAbertura, setOficioAbertura] = useState(
    contrato?.contaVinculadaOficioAbertura || ''
  );
  const [processoSei, setProcessoSei] = useState(
    contrato?.contaVinculadaProcessoSei || contrato?.processoSeiMae || ''
  );
  const [statusConta, setStatusConta] = useState(
    contrato?.contaVinculadaStatusConta || (contrato?.contaVinculadaNumeroConta ? 'ATIVA' : 'AGUARDANDO_ABERTURA')
  );
  const [observacoes, setObservacoes] = useState(contrato?.contaVinculadaObservacoes || '');

  // 2. Dados da Conta Corrente da Empresa Contratada (Destino dos Créditos nas Liberações)
  const [empresaBanco, setEmpresaBanco] = useState(contrato?.empresaContaBanco || '');
  const [empresaAgencia, setEmpresaAgencia] = useState(contrato?.empresaContaAgencia || '');
  const [empresaConta, setEmpresaConta] = useState(contrato?.empresaContaNumero || '');
  const [empresaTipoConta, setEmpresaTipoConta] = useState(contrato?.empresaContaTipo || 'CORRENTE');
  const [empresaPix, setEmpresaPix] = useState(contrato?.empresaChavePix || '');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const oficioFormatado = oficioAbertura.trim() ? formatarNumeroOficioDas(oficioAbertura) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DADOS_BANCARIOS',
          contratoId: contrato.id,
          contaVinculadaBanco: banco.trim() || 'Banco do Brasil S.A.',
          contaVinculadaAgencia: null,
          contaVinculadaNumeroConta: numeroConta.trim() || null,
          contaVinculadaDataAbertura: dataAbertura || null,
          contaVinculadaOficioAbertura: oficioFormatado || null,
          contaVinculadaProcessoSei: processoSei.trim() || null,
          contaVinculadaStatusConta: numeroConta.trim() ? statusConta : 'AGUARDANDO_ABERTURA',
          contaVinculadaObservacoes: observacoes.trim() || null,
          empresaContaBanco: empresaBanco.trim() || null,
          empresaContaAgencia: empresaAgencia.trim() || null,
          empresaContaNumero: empresaConta.trim() || null,
          empresaContaTipo: empresaTipoConta,
          empresaChavePix: empresaPix.trim() || null,
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
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

        {/* Form Body - scrollable */}
        <form id="form-dados-bancarios" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seção 1: Conta Vinculada */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <span className="font-bold flex items-center space-x-1.5 mb-1 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>1. Conta Vinculada Bloqueada (Origem das Retenções)</span>
            </span>
            Cadastre apenas o <strong>número da Conta Vinculada</strong> fornecido pelo Banco do Brasil após a abertura do convênio (a Conta Vinculada não possui agência).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Número da Conta Vinculada
              </label>
              <input
                type="text"
                value={numeroConta}
                onChange={(e) => setNumeroConta(e.target.value)}
                placeholder="Ex: 1300103317226"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
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
                Data de Abertura da Conta
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
                placeholder="Número do processo SEI"
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Nº / Ano do Ofício de Abertura
            </label>
            <input
              type="text"
              value={oficioAbertura}
              onChange={(e) => setOficioAbertura(e.target.value)}
              placeholder="Digite apenas nº/ano (Ex: 147/2026)"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
            />
            {oficioFormatado && (
              <span className="text-[10px] text-blue-700 font-semibold mt-1 block">
                Padrão gerado: {oficioFormatado}
              </span>
            )}
          </div>

          {/* Seção 2: Conta da Empresa Contratada para Crédito */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed mt-4">
            <span className="font-bold flex items-center space-x-1.5 mb-1 text-emerald-900">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span>2. Conta Bancária da Contratada (Destino das Liberações)</span>
            </span>
            Informe a conta corrente operacional da empresa <strong>{contrato?.fornecedor?.razaoSocial || 'Contratada'}</strong>. Ao emitir o <strong>Ofício de Liberação</strong>, estes dados serão preenchidos automaticamente no quadro <strong>CREDITAR</strong>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Banco da Empresa
              </label>
              <input
                type="text"
                value={empresaBanco}
                onChange={(e) => setEmpresaBanco(e.target.value)}
                placeholder="Ex: Banco do Brasil, CEF..."
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Agência da Empresa
              </label>
              <input
                type="text"
                value={empresaAgencia}
                onChange={(e) => setEmpresaAgencia(e.target.value)}
                placeholder="Ex: 4687-6"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Conta Corrente da Empresa
              </label>
              <input
                type="text"
                value={empresaConta}
                onChange={(e) => setEmpresaConta(e.target.value)}
                placeholder="Ex: 8980-X"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Tipo de Conta
              </label>
              <select
                value={empresaTipoConta}
                onChange={(e) => setEmpresaTipoConta(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="CORRENTE">Conta Corrente (Pessoa Jurídica)</option>
                <option value="POUPANCA">Conta Poupança</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Chave PIX da Empresa (Opcional)
              </label>
              <input
                type="text"
                value={empresaPix}
                onChange={(e) => setEmpresaPix(e.target.value)}
                placeholder="CNPJ ou chave PIX cadastrada"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais de relacionamento bancário..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
            />
          </div>
        </form>

        {/* Footer com botões sempre visíveis */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-dados-bancarios"
            disabled={salvando}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'Salvando Dados...' : 'Salvar Dados Bancários'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
