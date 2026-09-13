'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  UserPlus,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  Download,
  AlertTriangle,
  CheckCircle2,
  Building,
  CreditCard,
  FileText,
  UploadCloud
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TerceirizacaoPage() {
  const [activeTab, setActiveTab] = useState<'TRABALHADORES' | 'CCT' | 'FOLHA_SIMULADA'>('TRABALHADORES');
  const [contratos, setContratos] = useState<any[]>([]);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [convencoes, setConvencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo Trabalhador
  const [showTrabalhadorModal, setShowTrabalhadorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importContratoId, setImportContratoId] = useState('');

  // Form Trabalhador
  const [formT, setFormT] = useState({
    contratoId: '',
    nomeCompleto: '',
    cpf: '',
    funcao: '',
    dataAdmissao: new Date().toISOString().slice(0, 10),
    banco: '',
    agencia: '',
    contaCorrente: '',
    salarioBaseCct: '1650',
    beneficiosInfo: 'Vale Alimentação (R$ 650) + Vale Transporte',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resC, resT, resCCT] = await Promise.all([
        fetch('/api/contratos'),
        fetch('/api/terceirizacao/trabalhadores'),
        fetch('/api/terceirizacao/cct'),
      ]);
      const dataC = await resC.json();
      const dataT = await resT.json();
      const dataCCT = await resCCT.json();

      if (dataC.contratos) setContratos(dataC.contratos);
      if (dataT.trabalhadores) setTrabalhadores(dataT.trabalhadores);
      if (dataCCT.convencoes) setConvencoes(dataCCT.convencoes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarTrabalhador = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formT),
      });
      if (res.ok) {
        setShowTrabalhadorModal(false);
        setFormT({
          contratoId: '',
          nomeCompleto: '',
          cpf: '',
          funcao: '',
          dataAdmissao: new Date().toISOString().slice(0, 10),
          banco: '',
          agencia: '',
          contaCorrente: '',
          salarioBaseCct: '1650',
          beneficiosInfo: 'Vale Alimentação (R$ 650) + Vale Transporte',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportPlanilha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importContratoId) return;

    const fd = new FormData();
    fd.append('planilha', importFile);
    fd.append('contratoId', importContratoId);

    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        setShowImportModal(false);
        setImportFile(null);
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalFolhaSimulada = trabalhadores.reduce((acc, t) => acc + (t.salarioBaseCct || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Briefcase className="w-6 h-6 text-blue-700" />
            <h2>Módulo de Terceirização & Mão de Obra Exclusiva</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 4 - Gestão nominal de funcionários, convenções coletivas (CCT), folha simulada e fiscalização trabalhista.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            <span>Importar Planilha de Funcionários</span>
          </button>

          <button
            onClick={() => setShowTrabalhadorModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Trabalhador</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('TRABALHADORES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'TRABALHADORES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quadro Nominal de Trabalhadores ({trabalhadores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CCT')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'CCT'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Convenções Coletivas Vigentes ({convencoes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FOLHA_SIMULADA')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'FOLHA_SIMULADA'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Espelho de Folha & Pagamento Direto</span>
        </button>
      </div>

      {/* TAB 1: TRABALHADORES */}
      {activeTab === 'TRABALHADORES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nome do Trabalhador</th>
                  <th className="py-3.5 px-4">CPF</th>
                  <th className="py-3.5 px-4">Função / Cargo</th>
                  <th className="py-3.5 px-4">Contrato Vinculado</th>
                  <th className="py-3.5 px-4">Salário CCT</th>
                  <th className="py-3.5 px-4">Dados Bancários</th>
                  <th className="py-3.5 px-4">Data Admissão</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Carregando funcionários terceirizados...
                    </td>
                  </tr>
                ) : trabalhadores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Nenhum trabalhador cadastrado. Clique em "Cadastrar Trabalhador" ou importe via planilha.
                    </td>
                  </tr>
                ) : (
                  trabalhadores.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{t.nomeCompleto}</td>
                      <td className="py-3 px-4 font-mono">{t.cpf}</td>
                      <td className="py-3 px-4 font-semibold text-blue-900">{t.funcao}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {t.contrato.numeroContrato || t.contrato.numeroEmpenho}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {t.contrato.fornecedor.razaoSocial}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {t.salarioBaseCct.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4">
                        {t.banco ? (
                          <div className="text-[11px] text-slate-700">
                            {t.banco} | Ag: {t.agencia} CC: {t.contaCorrente}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(t.dataAdmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CCT */}
      {activeTab === 'CCT' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atenção ao Prazo Preclusivo de 90 dias (Art. 64, §2º da IN 01/2026):</span> A contratada tem até 90 dias após o registro da nova Convenção Coletiva para requerer a repactuação de preços com efeitos retroativos à data-base da categoria.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {convencoes.map((cct) => (
              <div
                key={cct.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      Registro MTE: {cct.numeroRegistroMte || 'Cadastrado'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Vigência: {new Date(cct.vigenciaInicio).getFullYear()} / {new Date(cct.vigenciaFim).getFullYear()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    {cct.sindicatoLaboral || 'Convenção Coletiva da Categoria'}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Patronal: {cct.sindicatoPatronal || 'Sindicato Patronal do Estado'}
                  </div>

                  {cct.funcoes && cct.funcoes.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700 block mb-2">
                        Pisos Salariais Homologados:
                      </span>
                      <div className="space-y-1.5">
                        {cct.funcoes.map((f: any) => (
                          <div key={f.id} className="flex justify-between text-xs p-1.5 bg-slate-50 rounded-lg">
                            <span className="font-semibold text-slate-700">{f.nomeFuncao}</span>
                            <span className="font-bold text-slate-900">
                              {f.salarioPiso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {cct.arquivoPdfUrl && (
                  <div className="pt-3 border-t border-slate-100">
                    <a
                      href={cct.arquivoPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs text-blue-700 font-bold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF Integral da CCT</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FOLHA SIMULADA & PAGAMENTO DIRETO */}
      {activeTab === 'FOLHA_SIMULADA' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Espelho de Folha de Pagamento Salarial Simulado</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Base calculada para conferência de relatórios e para subsidiar pagamento direto extraordinário em caso de inadimplência da contratada.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase block">Custo Salarial Base Total</span>
              <span className="text-xl font-extrabold text-[#003366]">
                {totalFolhaSimulada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / mês
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Demonstrativo por Trabalhador Alocado:
            </h4>

            <div className="space-y-2">
              {trabalhadores.map((t) => {
                const salario = t.salarioBaseCct || 0;
                const provisaoFerias = salario * 0.0833;
                const provisao13 = salario * 0.0833;
                const provisaoTerco = salario * 0.0278;
                const totalProvisoes = provisaoFerias + provisao13 + provisaoTerco;

                return (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{t.nomeCompleto}</span>
                      <span className="text-slate-500 font-mono">CPF: {t.cpf} | Função: {t.funcao}</span>
                      <div className="text-[11px] text-blue-700 mt-1">
                        Conta para Crédito Direto: {t.banco || 'Banco'} Ag: {t.agencia || '-'} CC: {t.contaCorrente || '-'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Salário Base</span>
                        <span className="font-bold text-slate-900">
                          {salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Retenções Vinculadas</span>
                        <span className="font-bold text-emerald-700">
                          {totalProvisoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro Trabalhador */}
      {showTrabalhadorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Trabalhador Terceirizado</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cadastro nominal para controle salarial e de conta vinculada.
            </p>

            <form onSubmit={handleSalvarTrabalhador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato de Mão de Obra *</label>
                <select
                  required
                  value={formT.contratoId}
                  onChange={(e) => setFormT({ ...formT, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.objeto.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Trabalhador *</label>
                <input
                  type="text"
                  required
                  value={formT.nomeCompleto}
                  onChange={(e) => setFormT({ ...formT, nomeCompleto: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formT.cpf}
                    onChange={(e) => setFormT({ ...formT, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Função / Cargo *</label>
                  <input
                    type="text"
                    required
                    value={formT.funcao}
                    onChange={(e) => setFormT({ ...formT, funcao: e.target.value })}
                    placeholder="Ex: Vigilante, Porteiro, Servente"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={formT.dataAdmissao}
                    onChange={(e) => setFormT({ ...formT, dataAdmissao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salário Base CCT (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formT.salarioBaseCct}
                    onChange={(e) => setFormT({ ...formT, salarioBaseCct: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={formT.banco}
                    onChange={(e) => setFormT({ ...formT, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formT.agencia}
                    onChange={(e) => setFormT({ ...formT, agencia: e.target.value })}
                    placeholder="0000-0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    value={formT.contaCorrente}
                    onChange={(e) => setFormT({ ...formT, contaCorrente: e.target.value })}
                    placeholder="00000-0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTrabalhadorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Salvar Trabalhador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Planilha de Funcionários */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Importar Planilha de Trabalhadores</h3>
            <p className="text-xs text-slate-500 mb-4">
              Faça upload de arquivo Excel (.xlsx / .csv) com Nome, CPF, Função e Salário.
            </p>

            <form onSubmit={handleImportPlanilha} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato de Vínculo *</label>
                <select
                  required
                  value={importContratoId}
                  onChange={(e) => setImportContratoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.objeto.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-workers-file"
                />
                <label htmlFor="import-workers-file" className="cursor-pointer block">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {importFile ? importFile.name : 'Clique para selecionar a planilha'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!importFile || !importContratoId}
                  className="px-4 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] disabled:opacity-50"
                >
                  Processar Importação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
