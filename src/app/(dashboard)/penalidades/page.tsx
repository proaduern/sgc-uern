'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Clock,
  ShieldAlert,
  Building,
  CheckCircle2,
  FileText,
  Scale,
  Award
} from 'lucide-react';

export default function PenalidadesPage() {
  const [penalidades, setPenalidades] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form Penalidade
  const [form, setForm] = useState({
    contratoId: '',
    tipoPenalidade: 'ADVERTENCIA',
    fatosDescricao: '',
    baseLegal: 'Art. 44 da Instrução Normativa nº 01/2026 - PROAD/UERN e Art. 156 da Lei nº 14.133/2021',
    protocoloNotificacaoSei: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resP, resC] = await Promise.all([
        fetch('/api/penalidades'),
        fetch('/api/contratos'),
      ]);
      const dataP = await resP.json();
      const dataC = await resC.json();

      if (dataP.penalidades) setPenalidades(dataP.penalidades);
      if (dataC.contratos) setContratos(dataC.contratos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarPenalidade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/penalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          contratoId: '',
          tipoPenalidade: 'ADVERTENCIA',
          fatosDescricao: '',
          baseLegal: 'Art. 44 da Instrução Normativa nº 01/2026 - PROAD/UERN e Art. 156 da Lei nº 14.133/2021',
          protocoloNotificacaoSei: '',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Scale className="w-6 h-6 text-rose-600" />
            <h2>Apuração de Responsabilidade, Penalidades & Score</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capítulo VII da IN nº 01/2026 - Rito de ampla defesa (15 dias úteis), recursos com efeito suspensivo e cadastro no SICAF.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Notificar Infração Contratual</span>
        </button>
      </div>

      {/* Legal Guidelines Alert */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
        <span className="font-bold text-slate-900 block">Rito Legal e Competências Sancionatórias (IN 01/2026):</span>
        <p>• <strong>Advertência e Multa:</strong> Competência do Gestor do Contrato, após parecer jurídico (Art. 46).</p>
        <p>• <strong>Impedimento de Licitar (até 3 anos) e Inidoneidade:</strong> Competência da Presidência da Fuern, após comissão com mínimo 2 servidores efetivos estáveis (Art. 47 e 48).</p>
        <p>• <strong>Prazos Obrigatórios:</strong> 15 dias úteis para defesa prévia e 15 dias úteis para recurso com efeito suspensivo (Arts. 45 e 49).</p>
      </div>

      {/* Lista de Penalidades */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Carregando penalidades...</div>
        ) : penalidades.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Nenhum processo de apuração ou penalidade em andamento.
          </div>
        ) : (
          penalidades.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                    {p.tipoPenalidade.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono text-blue-700 font-semibold">
                    Notificação: {p.protocoloNotificacaoSei}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">
                  {p.fornecedor.razaoSocial} (CNPJ: {p.fornecedor.cnpj})
                </h3>
                <div className="text-xs text-slate-500">
                  Contrato: {p.contrato.numeroContrato || p.contrato.numeroEmpenho} - {p.contrato.objeto.slice(0, 60)}...
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-2xl">
                  {p.fatosDescricao}
                </p>
                <div className="text-[11px] text-slate-400">Base Legal: {p.baseLegal}</div>
              </div>

              <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Prazo Final para Defesa</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block mt-0.5">
                    {new Date(p.prazoDefesaFim).toLocaleDateString('pt-BR')} (15 dias úteis)
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Score Atual da Contratada:</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {p.fornecedor.scoreConfiabilidade.toFixed(1)} / 100
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nova Notificação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Notificar Infração e Abrir Processo Sancionatório</h3>
            <p className="text-xs text-slate-500 mb-4">
              Instauração do rito de contraditório e ampla defesa com prazo automático de 15 dias úteis.
            </p>

            <form onSubmit={handleCriarPenalidade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Objeto da Infração *</label>
                <select
                  required
                  value={form.contratoId}
                  onChange={(e) => setForm({ ...form, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.fornecedor.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penalidade Proposta *</label>
                  <select
                    value={form.tipoPenalidade}
                    onChange={(e) => setForm({ ...form, tipoPenalidade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="ADVERTENCIA">Advertência Escrita</option>
                    <option value="MULTA">Multa Contratual</option>
                    <option value="IMPEDIMENTO_LICITAR_ATE_3_ANOS">Impedimento de Licitar (até 3 anos)</option>
                    <option value="DECLARACAO_INIDONEIDADE">Declaração de Inidoneidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI / Protocolo *</label>
                  <input
                    type="text"
                    required
                    value={form.protocoloNotificacaoSei}
                    onChange={(e) => setForm({ ...form, protocoloNotificacaoSei: e.target.value })}
                    placeholder="04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada dos Fatos *</label>
                <textarea
                  rows={3}
                  required
                  value={form.fatosDescricao}
                  onChange={(e) => setForm({ ...form, fatosDescricao: e.target.value })}
                  placeholder="Relato circunstanciado do descumprimento verificado pelo fiscal..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fundamento Legal / Cláusula Contratual *</label>
                <input
                  type="text"
                  required
                  value={form.baseLegal}
                  onChange={(e) => setForm({ ...form, baseLegal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
                >
                  Expedir Notificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
