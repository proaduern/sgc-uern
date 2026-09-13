'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  PlusCircle,
  Calendar,
  Building,
  DollarSign,
  Package,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Plus
} from 'lucide-react';

export default function AtasPage() {
  const [atas, setAtas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form Nova Ata
  const [form, setForm] = useState({
    numeroAta: '',
    ano: new Date().getFullYear().toString(),
    processoSei: '',
    objeto: '',
    fornecedorId: '',
    vigenciaInicio: '',
    vigenciaFim: '',
    valorGlobal: '',
  });

  const [itens, setItens] = useState<Array<{
    numeroItem: number;
    descricao: string;
    marcaModelo: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
  }>>([
    { numeroItem: 1, descricao: '', marcaModelo: '', unidade: 'UN', quantidade: '10', valorUnitario: '0' }
  ]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resA, resF] = await Promise.all([
        fetch('/api/atas'),
        fetch('/api/fornecedores'),
      ]);
      const dataA = await resA.json();
      const dataF = await resF.json();

      if (dataA.atas) setAtas(dataA.atas);
      if (dataF.fornecedores) setFornecedores(dataF.fornecedores);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAddItem = () => {
    setItens([
      ...itens,
      { numeroItem: itens.length + 1, descricao: '', marcaModelo: '', unidade: 'UN', quantidade: '10', valorUnitario: '0' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    setItens(updated);
  };

  const handleCreateAta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/atas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, itens }),
      });
      if (res.ok) {
        setShowModal(false);
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
            <Layers className="w-6 h-6 text-blue-700" />
            <h2>Gestão de Atas de Registro de Preço (ARP)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de itens registrados, saldos remanescentes, cotas de participantes e adesões autorizadas ("caronas").
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Cadastrar Nova Ata (ARP)</span>
        </button>
      </div>

      {/* Grid de Atas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Carregando Atas de Registro de Preço...</div>
      ) : atas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          Nenhuma Ata de Registro de Preço cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {atas.map((ata) => (
            <div
              key={ata.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                      ARP Vigente
                    </span>
                    <span className="text-xs text-blue-700 font-mono font-semibold">
                      Processo SEI: {ata.processoSei}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-1">
                    Ata de Registro de Preço nº {ata.numeroAta}/{ata.ano}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Global Registrado</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {ata.valorGlobalOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800 block">Fornecedor Beneficiário:</span>
                  <span>{ata.fornecedor.razaoSocial}</span>
                  <span className="text-[11px] text-slate-400 block font-mono">CNPJ: {ata.fornecedor.cnpj}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-800 block">Vigência:</span>
                  <span>
                    {new Date(ata.vigenciaInicio).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(ata.vigenciaFim).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-800 block">Gestor da Ata (PROAD):</span>
                  <span>{ata.gestor?.nome || 'PROAD UERN'}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800 text-xs block mb-1">Objeto Registrado:</span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {ata.objeto}
                </p>
              </div>

              {/* Tabela de Itens da Ata */}
              {ata.itens && ata.itens.length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block mb-2">
                    Itens Registrados & Saldo:
                  </span>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Descrição</th>
                          <th className="py-2 px-3">Marca / Modelo</th>
                          <th className="py-2 px-3 text-right">Qtd. Registrada</th>
                          <th className="py-2 px-3 text-right">Qtd. Saldo</th>
                          <th className="py-2 px-3 text-right">Valor Unit.</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {ata.itens.map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-bold text-slate-800">{it.numeroItem}</td>
                            <td className="py-2 px-3">{it.descricao}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{it.marcaModelo || '-'}</td>
                            <td className="py-2 px-3 text-right">{it.quantidadeRegistrada} {it.unidade}</td>
                            <td className="py-2 px-3 text-right font-bold text-blue-700">{it.quantidadeSaldo} {it.unidade}</td>
                            <td className="py-2 px-3 text-right">{it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">{it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Ata */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Nova Ata de Registro de Preços</h3>
            <p className="text-xs text-slate-500 mb-4">
              Registro completo de ata licitatória e relação de itens com saldo.
            </p>

            <form onSubmit={handleCreateAta} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da Ata *</label>
                  <input
                    type="text"
                    required
                    value={form.numeroAta}
                    onChange={(e) => setForm({ ...form, numeroAta: e.target.value })}
                    placeholder="Ex: 01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={form.ano}
                    onChange={(e) => setForm({ ...form, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Licitação *</label>
                  <input
                    type="text"
                    required
                    value={form.processoSei}
                    onChange={(e) => setForm({ ...form, processoSei: e.target.value })}
                    placeholder="04410022.000911/2026-29"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor Beneficiário *</label>
                  <select
                    required
                    value={form.fornecedorId}
                    onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.razaoSocial} (CNPJ: {f.cnpj})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Início da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={form.vigenciaInicio}
                    onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fim da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={form.vigenciaFim}
                    onChange={(e) => setForm({ ...form, vigenciaFim: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Global Registrado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.valorGlobal}
                    onChange={(e) => setForm({ ...form, valorGlobal: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objeto da Ata *</label>
                <textarea
                  rows={2}
                  required
                  value={form.objeto}
                  onChange={(e) => setForm({ ...form, objeto: e.target.value })}
                  placeholder="Descrição do objeto da ata de registro de preços..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              {/* Itens */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700 text-xs uppercase">Itens da Ata:</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-700 hover:underline font-semibold"
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Descrição do item"
                          value={it.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Marca/Mod."
                          value={it.marcaModelo}
                          onChange={(e) => handleItemChange(idx, 'marcaModelo', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Qtd."
                          value={it.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor Unit."
                          value={it.valorUnitario}
                          onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={itens.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Salvar Ata e Itens
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
