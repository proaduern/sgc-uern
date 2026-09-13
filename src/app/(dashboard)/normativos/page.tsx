'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Plus, FileText, Calendar, Building, ExternalLink, Search } from 'lucide-react';

interface Normativo {
  id: string;
  titulo: string;
  tipo: string;
  numero: string | null;
  ano: number | null;
  orgaoEmissor: string;
  descricao: string | null;
  arquivoUrl: string;
  createdAt: string;
}

export default function NormativosPage() {
  const [normativos, setNormativos] = useState<Normativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'INSTRUCAO_NORMATIVA',
    numero: '',
    ano: new Date().getFullYear().toString(),
    orgaoEmissor: 'PROAD/UERN',
    descricao: '',
    arquivoUrl: '',
  });

  const loadNormativos = async () => {
    try {
      const res = await fetch('/api/normativos');
      const data = await res.json();
      if (data.normativos) {
        setNormativos(data.normativos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNormativos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/normativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          titulo: '',
          tipo: 'INSTRUCAO_NORMATIVA',
          numero: '',
          ano: new Date().getFullYear().toString(),
          orgaoEmissor: 'PROAD/UERN',
          descricao: '',
          arquivoUrl: '',
        });
        loadNormativos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = normativos.filter(
    (n) =>
      n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.orgaoEmissor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-blue-800 font-bold text-lg md:text-xl">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2>Base Normativa & Legislações</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Instruções normativas, cadernos de logística, legislações e portarias aplicáveis à gestão e fiscalização de contratos da UERN.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Normativo</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por título, órgão emissor ou palavra-chave..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none shadow-sm"
        />
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando normativos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          Nenhum normativo encontrado para a busca.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                    {item.tipo.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-1 text-slate-400 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.ano || new Date(item.createdAt).getFullYear()}</span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 text-sm md:text-base leading-snug">
                  {item.titulo}
                </h3>

                <div className="flex items-center space-x-1 text-xs text-slate-500 mt-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Órgão Emissor: {item.orgaoEmissor}</span>
                </div>

                {item.descricao && (
                  <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {item.descricao}
                  </p>
                )}
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Documento Oficial</span>
                <a
                  href={item.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003366] text-xs font-semibold rounded-lg transition-colors border border-blue-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Acessar PDF</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-4">Cadastrar Novo Documento Normativo</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Documento</label>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Instrução Normativa nº 02/2026 - PROAD"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 bg-white"
                  >
                    <option value="INSTRUCAO_NORMATIVA">Instrução Normativa</option>
                    <option value="PORTARIA">Portaria</option>
                    <option value="LEGISLACAO">Legislação / Decreto</option>
                    <option value="CADERNO_LOGISTICA">Caderno de Logística</option>
                    <option value="ORIENTACAO_NORMATIVA">Orientação Normativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano</label>
                  <input
                    type="number"
                    value={form.ano}
                    onChange={(e) => setForm({ ...form, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Emissor</label>
                <input
                  type="text"
                  value={form.orgaoEmissor}
                  onChange={(e) => setForm({ ...form, orgaoEmissor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caminho ou URL do Arquivo</label>
                <input
                  type="text"
                  required
                  value={form.arquivoUrl}
                  onChange={(e) => setForm({ ...form, arquivoUrl: e.target.value })}
                  placeholder="/docs/normativos/arquivo.pdf"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Ementa</label>
                <textarea
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Resumo do que trata a norma..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] cursor-pointer"
                >
                  Salvar Normativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
