'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Building,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  UserCheck,
  Archive,
  Info,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { formatarNumeroOficioDas } from '@/lib/config/brasao-uern';
import { DADOS_DIRETORIA_DAS_PADRAO } from '@/lib/config/diretoria';
import {
  FichaCadastralData,
  criarFichaCadastralDefault,
  gerarOficioAberturaDocx,
  gerarOficioAberturaPdf,
  gerarFichaCadastralPdf,
  gerarFichaCadastralDocx,
  obterTextoSeiOficio,
  OficioAberturaParams,
} from '@/lib/conta-vinculada-oficio-generator';

interface OficioCadastroModalProps {
  contrato: any;
  onClose: () => void;
}

export default function OficioCadastroModal({ contrato, onClose }: OficioCadastroModalProps) {
  const [tabAtiva, setTabAtiva] = useState<'OFICIO' | 'FICHA_CADASTRAL'>('OFICIO');

  // Campos do Ofício
  const [numeroOficio, setNumeroOficio] = useState(
    contrato?.contaVinculadaOficioAbertura || ''
  );
  const [contaRelacionamento, setContaRelacionamento] = useState(
    contrato?.contaVinculadaNumeroConta || ''
  );
  const [responsavelNome, setResponsavelNome] = useState(DADOS_DIRETORIA_DAS_PADRAO.nome);
  const [responsavelMatricula, setResponsavelMatricula] = useState(DADOS_DIRETORIA_DAS_PADRAO.matricula);
  const [portariaDiretor, setPortariaDiretor] = useState(DADOS_DIRETORIA_DAS_PADRAO.portariaNomeacao);
  const [cargoDiretor, setCargoDiretor] = useState(DADOS_DIRETORIA_DAS_PADRAO.cargo);

  // Campos da Ficha Cadastral (Anexo BB)
  const [fichaData, setFichaData] = useState<FichaCadastralData>(() =>
    criarFichaCadastralDefault(contrato)
  );

  const [copied, setCopied] = useState(false);
  const [gerandoDocx, setGerandoDocx] = useState(false);
  const [gerandoFichaDocx, setGerandoFichaDocx] = useState(false);
  const [gerandoPacote, setGerandoPacote] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const numContrato = contrato?.numeroContrato || contrato?.numeroEmpenho || '024/2026';
  const empresaRazao = contrato?.fornecedor?.razaoSocial || 'CONTRATADA';
  const empresaCnpj = contrato?.fornecedor?.cnpj || '00.000.000/0001-00';
  const oficioFormatado = numeroOficio.trim() ? formatarNumeroOficioDas(numeroOficio) : '';

  const obterParamsOficio = (): OficioAberturaParams => ({
    numeroOficio: numeroOficio.trim(),
    numeroContrato: numContrato,
    empresaRazaoSocial: empresaRazao,
    empresaCnpj: empresaCnpj,
    processoSei: contrato?.processoSeiMae || contrato?.contaVinculadaProcessoSei,
    contaRelacionamento: contaRelacionamento.trim() || undefined,
    responsavelNome,
    responsavelMatricula,
    cargoDiretor,
    portariaDiretor,
    fichaData,
  });

  const validarOficio = () => {
    if (!numeroOficio.trim()) {
      setErro('Informe o número/ano do Ofício (Ex: 147/2026) antes de gerar o documento.');
      return false;
    }
    setErro(null);
    return true;
  };

  // 1. Download do Ofício em .docx (Word / SEI)
  const handleBaixarOficioDocx = async () => {
    if (!validarOficio()) return;
    setGerandoDocx(true);
    try {
      const blob = await gerarOficioAberturaDocx(obterParamsOficio());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const numSanitizado = numeroOficio.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Oficio_Abertura_CV_${numSanitizado || 'DAS'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erro ao gerar documento Word: ' + (err.message || err));
    } finally {
      setGerandoDocx(false);
    }
  };

  // 2. Download do Ofício em .pdf
  const handleBaixarOficioPdf = (abrirPreview = false) => {
    if (!validarOficio()) return;
    try {
      const doc = gerarOficioAberturaPdf(obterParamsOficio(), abrirPreview);
      if (!abrirPreview) {
        const numSanitizado = numeroOficio.replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Oficio_Abertura_CV_${numSanitizado || 'DAS'}.pdf`);
      }
    } catch (err: any) {
      alert('Erro ao gerar PDF do Ofício: ' + (err.message || err));
    }
  };

  // 3. Copiar texto para o SEI
  const handleCopiarTextoSei = () => {
    if (!validarOficio()) return;
    const texto = obterTextoSeiOficio(obterParamsOficio());
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // 4. Download da Ficha Cadastral em .pdf
  const handleBaixarFichaPdf = (abrirPreview = false) => {
    try {
      const doc = gerarFichaCadastralPdf(fichaData, abrirPreview);
      if (!abrirPreview) {
        const numSanitizado = (fichaData.eventoNumero || 'CV').replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Ficha_Cadastral_BB_${numSanitizado}.pdf`);
      }
    } catch (err: any) {
      alert('Erro ao gerar PDF da Ficha Cadastral: ' + (err.message || err));
    }
  };

  // 5. Download da Ficha Cadastral em .docx
  const handleBaixarFichaDocx = async () => {
    setGerandoFichaDocx(true);
    try {
      const blob = await gerarFichaCadastralDocx(fichaData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const numSanitizado = (fichaData.eventoNumero || 'CV').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Ficha_Cadastral_BB_${numSanitizado}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erro ao gerar Word da Ficha Cadastral: ' + (err.message || err));
    } finally {
      setGerandoFichaDocx(false);
    }
  };

  // 6. Download do Pacote Completo (Ofício + Ficha Cadastral em PDF unificado de 3 páginas)
  const handleBaixarPacoteCompleto = () => {
    if (!validarOficio()) return;
    setGerandoPacote(true);
    try {
      // Cria página 1 com o ofício
      const doc = gerarOficioAberturaPdf(obterParamsOficio(), false);
      // Concatena as 2 páginas da Ficha Cadastral no mesmo PDF
      gerarFichaCadastralPdf(fichaData, false, doc);

      const numSanitizado = numeroOficio.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Pacote_Oficio_e_Ficha_CV_${numSanitizado}.pdf`);
    } catch (err: any) {
      alert('Erro ao gerar pacote completo: ' + (err.message || err));
    } finally {
      setGerandoPacote(false);
    }
  };

  const atualizarFicha = (campo: keyof FichaCadastralData, valor: any) => {
    setFichaData((prev) => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Building className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Ofício de Abertura & Ficha Cadastral (Conta Vinculada)
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Contrato nº {numContrato} • {empresaRazao} • Banco do Brasil Setor Público RN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50 flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setTabAtiva('OFICIO')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              tabAtiva === 'OFICIO'
                ? 'bg-white border-blue-600 text-blue-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>1. Minuta do Ofício de Abertura</span>
          </button>

          <button
            type="button"
            onClick={() => setTabAtiva('FICHA_CADASTRAL')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              tabAtiva === 'FICHA_CADASTRAL'
                ? 'bg-white border-blue-600 text-blue-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>2. Ficha Cadastral (Anexo BB)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              Modelo Oficial
            </span>
          </button>
        </div>

        {/* Mensagem de Erro Geral */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2 shrink-0">
            <span className="font-bold">Atenção:</span>
            <span>{erro}</span>
          </div>
        )}

        {/* Conteúdo com Barra de Rolagem */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-700 text-xs">
          {tabAtiva === 'OFICIO' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Formulário do Ofício */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nº e Ano do Ofício de Abertura * <span className="font-normal text-slate-500">(apenas xx/ano)</span>
                    </label>
                    <input
                      type="text"
                      value={numeroOficio}
                      onChange={(e) => {
                        setNumeroOficio(e.target.value);
                        if (erro) setErro(null);
                      }}
                      placeholder="Ex: 147/2026"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                    />
                    {oficioFormatado && (
                      <span className="text-[10px] font-bold text-blue-800 mt-1 block">
                        Padrão oficial gerado: {oficioFormatado}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Número da Conta Vinculada <span className="font-normal text-slate-500">(caso já informada)</span>
                    </label>
                    <input
                      type="text"
                      value={contaRelacionamento}
                      onChange={(e) => setContaRelacionamento(e.target.value)}
                      placeholder="Deixe em branco se aguarda abertura"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>
                </div>

                {/* Dados do Signatário */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800 text-[11px] block mb-2">
                    Dados do Diretor Signatário (Diretoria de Administração e Serviços - DAS/PROAD):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Nome do Diretor:</label>
                      <input
                        type="text"
                        value={responsavelNome}
                        onChange={(e) => setResponsavelNome(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Matrícula:</label>
                      <input
                        type="text"
                        value={responsavelMatricula}
                        onChange={(e) => setResponsavelMatricula(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Cargo / Função:</label>
                      <input
                        type="text"
                        value={cargoDiretor}
                        onChange={(e) => setCargoDiretor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Portaria de Nomeação:</label>
                      <input
                        type="text"
                        value={portariaDiretor}
                        onChange={(e) => setPortariaDiretor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-blue-950"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Ofício */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-blue-900 font-semibold text-xs">
                  <Info className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Você pode baixar o arquivo editável para levar ao SEI ou baixar o PDF oficial:</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarTextoSei}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    title="Copiar texto formatado para colar direto no editor do SEI"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? 'Copiado para SEI!' : 'Copiar Texto para SEI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBaixarOficioDocx}
                    disabled={gerandoDocx}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    title="Baixar em formato Word (.docx) editável"
                  >
                    <Download className="w-4 h-4" />
                    <span>{gerandoDocx ? 'Gerando Word...' : 'Baixar Ofício em .docx'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBaixarOficioPdf(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    title="Abrir prévia do PDF em nova aba"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-700" />
                    <span>Visualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBaixarOficioPdf(false)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    title="Baixar PDF com brasão oficial UERN"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Ofício em .pdf</span>
                  </button>
                </div>
              </div>

              {/* Prévia Visual do Ofício */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 font-serif text-slate-800 leading-relaxed">
                <div className="text-center space-y-0.5 border-b pb-3 border-slate-200">
                  <div className="font-bold text-sm uppercase">Universidade do Estado do Rio Grande do Norte – UERN</div>
                  <div className="font-semibold text-xs text-slate-600">Pró-Reitoria de Administração – PROAD</div>
                  <div className="font-semibold text-xs text-slate-600">Diretoria de Administração e Serviços – DAS</div>
                  <div className="text-[10px] text-slate-500">Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210</div>
                </div>

                <div className="font-bold text-xs">{oficioFormatado || 'Ofício nº ___/2026 - DAS/PROAD/UERN'}</div>

                <div className="text-xs space-y-0.5">
                  <div>Ao(À) Senhor(a) Gerente</div>
                  <div className="font-bold">Banco do Brasil S.A.</div>
                  <div>Agência 3795-8 - Escritório Setor Público RN</div>
                </div>

                <div className="text-xs pt-1">
                  <span className="font-bold">Assunto: </span>
                  Cadastro de Convênio de Conta Garantia (Conta Vinculada)
                </div>

                <div className="text-xs pt-2">Senhor(a) Gerente,</div>

                <div className="text-xs text-justify space-y-2 indent-6">
                  <p>
                    Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da{' '}
                    <strong>FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN</strong>, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato Administrativo nº{' '}
                    <strong>{numContrato} - FUERN</strong>, firmado com a empresa{' '}
                    <strong>{empresaRazao}</strong>, inscrita no CNPJ sob o nº <strong>{empresaCnpj}</strong>.
                  </p>
                  <p>
                    O presente pedido atende às disposições da Lei Estadual nº 10.841/2021, do Decreto Estadual nº 33.782/2024 e da Instrução Normativa-SEI nº 2/2024 - SEAD/RN, para retenção das provisões de encargos trabalhistas de dedicação exclusiva de mão de obra.
                  </p>
                  <p>
                    Encaminhamos em anexo a respectiva <strong>FICHA CADASTRAL</strong> devidamente preenchida e assinada.
                  </p>
                </div>

                <div className="pt-4 text-xs indent-6">Atenciosamente,</div>

                <div className="pt-4 text-right text-xs">
                  <div>Mossoró/RN, data da assinatura eletrônica.</div>
                  <div className="font-bold mt-2 uppercase">{responsavelNome}</div>
                  <div>Matrícula nº {responsavelMatricula}</div>
                  <div>{portariaDiretor || cargoDiretor}</div>
                  <div>Diretoria de Administração e Serviços – DAS/PROAD</div>
                </div>
              </div>
            </div>
          )}

          {tabAtiva === 'FICHA_CADASTRAL' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Informativo */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">Ficha Cadastral Oficial do Banco do Brasil (Modelo Idêntico ao SEI)</p>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Os dados foram pré-carregados automaticamente a partir do contrato e dos normativos da UERN.
                    Você pode conferir e ajustar qualquer campo abaixo antes de gerar o PDF oficial em anexo.
                  </p>
                </div>
              </div>

              {/* Seção 1: Identificação do Órgão */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                  1. Identificação do Órgão Público (Convenente)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Razão Social:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoRazaoSocial}
                      onChange={(e) => atualizarFicha('orgaoRazaoSocial', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">CNPJ:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoCnpj}
                      onChange={(e) => atualizarFicha('orgaoCnpj', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Pessoa para Contato:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoContatoNome}
                      onChange={(e) => atualizarFicha('orgaoContatoNome', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">DDD:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoContatoDdd}
                      onChange={(e) => atualizarFicha('orgaoContatoDdd', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Telefone:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoContatoTelefone}
                      onChange={(e) => atualizarFicha('orgaoContatoTelefone', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Endereço da Sede:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoEndereco}
                      onChange={(e) => atualizarFicha('orgaoEndereco', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Município / UF:</label>
                    <input
                      type="text"
                      value={`${fichaData.orgaoMunicipio} / ${fichaData.orgaoUf}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('/');
                        atualizarFicha('orgaoMunicipio', parts[0]?.trim() || '');
                        if (parts[1]) atualizarFicha('orgaoUf', parts[1].trim());
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">CEP:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoCep}
                      onChange={(e) => atualizarFicha('orgaoCep', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">E-mail do Órgão:</label>
                    <input
                      type="email"
                      value={fichaData.orgaoEmail}
                      onChange={(e) => atualizarFicha('orgaoEmail', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Agência de Relacionamento:</label>
                    <input
                      type="text"
                      value={`Prefixo ${fichaData.orgaoAgenciaPrefixo}-${fichaData.orgaoAgenciaDv}`}
                      onChange={(e) => {
                        const m = e.target.value.match(/(\d{4})-(\d)/);
                        if (m) {
                          atualizarFicha('orgaoAgenciaPrefixo', m[1]);
                          atualizarFicha('orgaoAgenciaDv', m[2]);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Conta Corrente do Órgão:</label>
                    <input
                      type="text"
                      value={fichaData.orgaoContaCorrente}
                      onChange={(e) => atualizarFicha('orgaoContaCorrente', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2 & 3 & 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                    2. Serviço Solicitado*
                  </span>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={fichaData.servicoContratacao}
                      onChange={(e) => atualizarFicha('servicoContratacao', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Contratação</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={fichaData.servicoCadastrarGarantidor}
                      onChange={(e) => atualizarFicha('servicoCadastrarGarantidor', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Cadastrar Garantidor**</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={fichaData.servicoCadastrarEvento}
                      onChange={(e) => atualizarFicha('servicoCadastrarEvento', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Cadastrar Evento</span>
                  </label>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                    3. Cadastramento do Convênio
                  </span>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Cidade / UF:</span>
                      <span className="font-bold text-xs">{fichaData.convenioCidadeSede} / {fichaData.convenioUf}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">CEP:</span>
                      <span className="font-mono text-xs">{fichaData.convenioCep}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Bairro:</span>
                      <span className="text-xs">{fichaData.convenioBairro}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                    4. Tipo de Convênio*
                  </span>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tipoConvenio"
                      checked={fichaData.tipoConvenio === 'CONTRATOS_ADMINISTRATIVOS'}
                      onChange={() => atualizarFicha('tipoConvenio', 'CONTRATOS_ADMINISTRATIVOS')}
                      className="text-blue-600"
                    />
                    <span className="font-bold">Contratos Administrativos</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tipoConvenio"
                      checked={fichaData.tipoConvenio === 'CAUCAO_LICITACAO'}
                      onChange={() => atualizarFicha('tipoConvenio', 'CAUCAO_LICITACAO')}
                      className="text-blue-600"
                    />
                    <span>Caução em Licitação</span>
                  </label>
                </div>
              </div>

              {/* Seção 5: Dados do Evento */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                  5. Dados do Evento (Contrato)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Número do Evento (Contrato):</label>
                    <input
                      type="text"
                      value={fichaData.eventoNumero}
                      onChange={(e) => atualizarFicha('eventoNumero', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Nome do Evento (Nome da Empresa):</label>
                    <input
                      type="text"
                      value={fichaData.eventoNome}
                      onChange={(e) => atualizarFicha('eventoNome', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Descrição do Evento (Objeto):</label>
                  <textarea
                    rows={2}
                    value={fichaData.eventoDescricao}
                    onChange={(e) => atualizarFicha('eventoDescricao', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Início do Evento:</label>
                    <input
                      type="text"
                      value={fichaData.eventoDataInicio}
                      onChange={(e) => atualizarFicha('eventoDataInicio', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Fim do Evento:</label>
                    <input
                      type="text"
                      value={fichaData.eventoDataFim}
                      onChange={(e) => atualizarFicha('eventoDataFim', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Início Captação Depósitos:</label>
                    <input
                      type="text"
                      value={fichaData.eventoDataInicioCaptacao}
                      onChange={(e) => atualizarFicha('eventoDataInicioCaptacao', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Fim Captação Depósitos:</label>
                    <input
                      type="text"
                      value={fichaData.eventoDataFimCaptacao}
                      onChange={(e) => atualizarFicha('eventoDataFimCaptacao', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">Depositante:</span>
                  <div className="flex items-center space-x-6 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="eventoDepositante"
                        checked={fichaData.eventoDepositante === '1_ORGAO'}
                        onChange={() => atualizarFicha('eventoDepositante', '1_ORGAO')}
                        className="text-blue-600"
                      />
                      <span>( X ) 1 – Órgão Público</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="eventoDepositante"
                        checked={fichaData.eventoDepositante === '2_PRESTADORA'}
                        onChange={() => atualizarFicha('eventoDepositante', '2_PRESTADORA')}
                        className="text-blue-600"
                      />
                      <span>( ) 2 – Prestadora de Serviço</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Seção 6: Dados da Empresa Prestadora */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs block text-blue-950">
                  6. Dados da Empresa Prestadora de Serviço (Garantidor)*
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Razão Social:</label>
                    <input
                      type="text"
                      value={fichaData.empresaRazaoSocial}
                      onChange={(e) => atualizarFicha('empresaRazaoSocial', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">CNPJ:</label>
                    <input
                      type="text"
                      value={fichaData.empresaCnpj}
                      onChange={(e) => atualizarFicha('empresaCnpj', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Pessoa para Contato (Preposto / Representante):</label>
                    <input
                      type="text"
                      value={fichaData.empresaContatoNome}
                      onChange={(e) => atualizarFicha('empresaContatoNome', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">DDD:</label>
                    <input
                      type="text"
                      value={fichaData.empresaContatoDdd}
                      onChange={(e) => atualizarFicha('empresaContatoDdd', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Telefone:</label>
                    <input
                      type="text"
                      value={fichaData.empresaContatoTelefone}
                      onChange={(e) => atualizarFicha('empresaContatoTelefone', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Endereço da Sede:</label>
                    <input
                      type="text"
                      value={fichaData.empresaEndereco}
                      onChange={(e) => atualizarFicha('empresaEndereco', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Cidade / UF:</label>
                    <input
                      type="text"
                      value={`${fichaData.empresaCidade} / ${fichaData.empresaUf}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('/');
                        atualizarFicha('empresaCidade', parts[0]?.trim() || '');
                        if (parts[1]) atualizarFicha('empresaUf', parts[1].trim());
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">CEP:</label>
                    <input
                      type="text"
                      value={fichaData.empresaCep}
                      onChange={(e) => atualizarFicha('empresaCep', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">E-mail da Empresa:</label>
                  <input
                    type="email"
                    value={fichaData.empresaEmail}
                    onChange={(e) => atualizarFicha('empresaEmail', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Botões de Ação da Ficha */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-emerald-900 font-semibold text-xs">
                  <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Baixe a Ficha Cadastral oficial individualmente ou veja a prévia:</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBaixarFichaPdf(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-700" />
                    <span>Visualizar Ficha (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBaixarFichaDocx}
                    disabled={gerandoFichaDocx}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{gerandoFichaDocx ? 'Gerando Word...' : 'Baixar Ficha em .docx'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBaixarFichaPdf(false)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Ficha em .pdf</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Documentos em conformidade com o Banco do Brasil e SEI-RN</span>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-white transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleBaixarPacoteCompleto}
              disabled={gerandoPacote}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
              title="Gera um PDF consolidado de 3 páginas contendo o Ofício de Abertura + Ficha Cadastral anexa"
            >
              <Archive className="w-4 h-4 text-amber-300" />
              <span>{gerandoPacote ? 'Gerando Pacote...' : 'Baixar Pacote Completo (Ofício + Ficha)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
