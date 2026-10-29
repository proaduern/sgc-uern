'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  Save,
  AlertCircle,
  Calculator,
  User,
  Calendar,
  FileText,
  DollarSign,
  Building,
} from 'lucide-react';

interface EditarRetencaoModalProps {
  lancamento: any;
  contratoId: string;
  onClose: () => void;
  onSucesso: () => void;
}

export default function EditarRetencaoModal({
  lancamento,
  contratoId,
  onClose,
  onSucesso,
}: EditarRetencaoModalProps) {
  const [salarioBase, setSalarioBase] = useState(lancamento?.salarioBase?.toString() || '2626.71');
  const [processoSei, setProcessoSei] = useState(lancamento?.numeroOficio || '');
  const [comentario, setComentario] = useState(lancamento?.comentario || lancamento?.motivoLiberacao || '');

  // Rubricas
  const [ferias, setFerias] = useState(lancamento?.ferias?.toString() || '0');
  const [tercoFerias, setTercoFerias] = useState(lancamento?.tercoFerias?.toString() || '0');
  const [decimoTerceiro, setDecimoTerceiro] = useState(lancamento?.decimoTerceiro?.toString() || '0');
  const [multaFgts, setMultaFgts] = useState(lancamento?.multaFgts?.toString() || '0');
  const [encargos, setEncargos] = useState(lancamento?.encargos?.toString() || '0');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Total dinâmico
  const totalCalculado = useMemo(() => {
    const f = parseFloat(ferias) || 0;
    const tf = parseFloat(tercoFerias) || 0;
    const d = parseFloat(decimoTerceiro) || 0;
    const m = parseFloat(multaFgts) || 0;
    const e = parseFloat(encargos) || 0;
    return f + tf + d + m + e;
  }, [ferias, tercoFerias, decimoTerceiro, multaFgts, encargos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_RETENCAO_MENSAL',
          contratoId,
          trabalhadorId: lancamento.trabalhadorId,
          competenciaMesAno: lancamento.competenciaMesAno,
          processoSei,
          salarioBase: parseFloat(salarioBase) || 0,
          ferias: parseFloat(ferias) || 0,
          tercoFerias: parseFloat(tercoFerias) || 0,
          decimoTerceiro: parseFloat(decimoTerceiro) || 0,
          multaFgts: parseFloat(multaFgts) || 0,
          encargos: parseFloat(encargos) || 0,
          comentario,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar retenção mensal');
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
              <Edit3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Editar Retenção Mensal do Trabalhador
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Competência {lancamento?.competenciaMesAno} • {lancamento?.trabalhadorNome}
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

          {/* Dados do Trabalhador (Leitura) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">{lancamento?.trabalhadorNome}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                CPF: {lancamento?.trabalhadorCpf} • {lancamento?.campus}
              </span>
            </div>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
              Fatura {lancamento?.competenciaMesAno}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Processo SEI da Medição
              </label>
              <input
                type="text"
                value={processoSei}
                onChange={(e) => setProcessoSei(e.target.value)}
                placeholder="Ex: 04410035.000435/2026-88"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Salário Base do Mês (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={salarioBase}
                onChange={(e) => setSalarioBase(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Decomposição das 5 Rubricas */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Valores Retidos por Rubrica (R$)
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Férias Base (8,33%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ferias}
                  onChange={(e) => setFerias(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">1/3 Férias (2,78%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tercoFerias}
                  onChange={(e) => setTercoFerias(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">13º Salário (8,33%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={decimoTerceiro}
                  onChange={(e) => setDecimoTerceiro(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Multa FGTS (5%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={multaFgts}
                  onChange={(e) => setMultaFgts(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Encargos Submódulo 4.1 / FGTS s/ Provisões</label>
              <input
                type="number"
                step="0.01"
                value={encargos}
                onChange={(e) => setEncargos(e.target.value)}
                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Total Linha */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-800">
              <span>Total Retido Calculado:</span>
              <span className="text-emerald-700 font-mono text-sm">
                {totalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Justificativa / Comentário da Fiscalização
            </label>
            <input
              type="text"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ex: Ajuste proporcional da admissão em 10/02/2026"
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
              <span>{salvando ? 'Salvando...' : 'Salvar Ajuste'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
