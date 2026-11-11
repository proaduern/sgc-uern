'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Save,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatarNumeroOficioDas } from '@/lib/config/brasao-uern';

interface RegistroLiberacaoModalProps {
  contrato: any;
  trabalhadores: any[];
  saldosPorTrabalhador: Record<string, any>;
  onClose: () => void;
  onSucesso: () => void;
}

export default function RegistroLiberacaoModal({
  contrato,
  trabalhadores,
  saldosPorTrabalhador,
  onClose,
  onSucesso,
}: RegistroLiberacaoModalProps) {
  const [trabalhadorId, setTrabalhadorId] = useState(trabalhadores[0]?.id || '');
  const [rubrica, setRubrica] = useState('DECIMO_TERCEIRO_8_33');
  const [valor, setValor] = useState('');
  const [numeroOficio, setNumeroOficio] = useState('');
  const [processoSei, setProcessoSei] = useState(contrato?.processoSeiMae || '');
  const [competencia, setCompetencia] = useState(
    `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`
  );
  const [motivoLiberacao, setMotivoLiberacao] = useState('Comprovação de pagamento de provisão trabalhista');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const trabalhadorSelecionado = useMemo(() => {
    return trabalhadores.find((t) => t.id === trabalhadorId);
  }, [trabalhadores, trabalhadorId]);

  const saldoTrabalhador = useMemo(() => {
    return saldosPorTrabalhador[trabalhadorId] || { retido: 0, liberado: 0, saldo: 0, porRubrica: {} };
  }, [saldosPorTrabalhador, trabalhadorId]);

  const saldoRubricaDisponivel = useMemo(() => {
    return Number((saldoTrabalhador.porRubrica?.[rubrica] || 0).toFixed(2));
  }, [saldoTrabalhador, rubrica]);

  // Adequa automaticamente o valor ao saldo ou provisão da rubrica escolhida quando o trabalhador ou a rubrica mudam
  useEffect(() => {
    if (saldoRubricaDisponivel > 0) {
      setValor(saldoRubricaDisponivel.toFixed(2));
      return;
    }
    const salario = trabalhadorSelecionado?.salarioBaseCct || 0;
    if (salario > 0) {
      const pFerias = Number(contrato?.percentualFerias ?? 8.33);
      const pTerco = Number(contrato?.percentualTercoConstitucional ?? 2.78);
      const pDecimo = Number(contrato?.percentualDecimoTerceiro ?? 8.33);
      const pMulta = Number(contrato?.percentualMultaFgts ?? 4.0);
      const pEncargos = Number(contrato?.percentualEncargosSubmodulo ?? 8.1);

      let aliq = pDecimo;
      if (rubrica === 'FERIAS_8_33') aliq = pFerias;
      else if (rubrica === 'TERCO_FERIAS_2_78') aliq = pTerco;
      else if (rubrica === 'MULTA_RESCISORIA_FGTS') aliq = pMulta;
      else if (rubrica === 'FGTS_SOBRE_PROVISOES') aliq = pEncargos;

      const estimado12Meses = Number((salario * (aliq / 100) * 12).toFixed(2));
      setValor(estimado12Meses.toFixed(2));
    }
  }, [trabalhadorId, rubrica, saldoRubricaDisponivel, trabalhadorSelecionado, contrato]);

  const valorFloat = parseFloat(valor) || 0;
  const isValorMaiorQueSaldo = valorFloat > saldoTrabalhador.saldo && saldoTrabalhador.saldo > 0;
  const oficioFormatado = numeroOficio.trim() ? formatarNumeroOficioDas(numeroOficio) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorFloat || valorFloat <= 0) {
      setErro('Informe um valor válido para a liberação.');
      return;
    }

    if (!trabalhadorId) {
      setErro('Selecione um trabalhador.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contrato.id,
          tipoOperacao: 'LIBERACAO_INDIVIDUAL',
          trabalhadorId,
          rubrica,
          valor: valorFloat,
          numeroOficio: oficioFormatado || numeroOficio,
          motivoLiberacao: processoSei ? `${motivoLiberacao} (${processoSei})` : motivoLiberacao,
          competenciaMesAno: competencia,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar liberação');
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
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <PlusCircle className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Registrar Liberação / Saída de Conta Vinculada
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Débito nominal por rubrica • Contrato nº {contrato?.numeroContrato || 'SGC'}
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

          {/* Seleção do Trabalhador */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Trabalhador Beneficiário da Liberação
            </label>
            <select
              value={trabalhadorId}
              onChange={(e) => setTrabalhadorId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all cursor-pointer"
              required
            >
              {trabalhadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nomeCompleto} • CPF: {t.cpf} ({t.campus || 'Campus'}) - {t.status === 'DEMITIDO' ? '⚠️ DEMITIDO' : 'ATIVO'}
                </option>
              ))}
            </select>
          </div>

          {/* Card de Saldo Disponível do Trabalhador */}
          {trabalhadorSelecionado && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>Saldo Disponível na Rubrica Selecionada:</span>
                <span className="font-mono text-sm text-emerald-800">
                  {saldoRubricaDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-emerald-900 border-t border-emerald-200/60 pt-2">
                <div>
                  <span className="text-emerald-700 block">Total Retido (+):</span>
                  <strong className="font-mono">{saldoTrabalhador.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 block">Total Já Liberado (-):</span>
                  <strong className="font-mono text-rose-700">{saldoTrabalhador.liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 block">Saldo Global:</span>
                  <strong className="font-mono text-emerald-900">
                    {saldoTrabalhador.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Rubrica a Liberar
              </label>
              <select
                value={rubrica}
                onChange={(e) => setRubrica(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all cursor-pointer"
                required
              >
                <option value="DECIMO_TERCEIRO_8_33">13º Salário (8,33%)</option>
                <option value="FERIAS_8_33">Férias Gozadas (8,33%)</option>
                <option value="TERCO_FERIAS_2_78">1/3 Constitucional de Férias (2,78%)</option>
                <option value="MULTA_RESCISORIA_FGTS">Multa Rescisória do FGTS (4,00%)</option>
                <option value="FGTS_SOBRE_PROVISOES">Encargos Submódulo 4.1 (8,10%)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Valor da Rubrica (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {isValorMaiorQueSaldo && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Atenção: O valor a liberar é superior ao saldo total acumulado deste trabalhador ({saldoTrabalhador.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Nº / Ano do Ofício Bancário
              </label>
              <input
                type="text"
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
                placeholder="Ex: 147/2026"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                required
              />
              {oficioFormatado && (
                <span className="block text-[10px] text-emerald-800 font-semibold mt-1">
                  {oficioFormatado}
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Processo SEI (Opcional)
              </label>
              <input
                type="text"
                value={processoSei}
                onChange={(e) => setProcessoSei(e.target.value)}
                placeholder="Ex: 04410035.002150/2026-11"
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Motivo da Liberação / Comprovante Apresentado
            </label>
            <input
              type="text"
              value={motivoLiberacao}
              onChange={(e) => setMotivoLiberacao(e.target.value)}
              placeholder="Ex: Pagamento de 13º salário / férias com folha comprovada"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              required
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
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Registrando...' : 'Efetivar Liberação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
