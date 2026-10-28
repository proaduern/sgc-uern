import '@/lib/pdf-extractor';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseContratoPdf } from '@/lib/pdf-contrato-parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo PDF de contrato enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseContratoPdf(buffer);

    // Salva automaticamente o contrato como RASCUNHO no banco Neon
    // O usuário tem acesso à prévia detalhada com todos os 50 itens antes de homologar
    const rascunho = await prisma.contratoRascunho.create({
      data: {
        usuarioId: session.id,
        tituloIdentificador: parsed.numeroContrato
          ? `Contrato nº ${parsed.numeroContrato} (Extraído de PDF)`
          : (parsed.processoSeiMae ? `SEI: ${parsed.processoSeiMae}` : 'Contrato Extraído de PDF'),
        numeroContrato: parsed.numeroContrato || null,
        processoSei: parsed.processoSeiMae || null,
        objeto: parsed.objeto || null,
        dados: {
          numeroContrato: parsed.numeroContrato || '',
          processoSeiMae: parsed.processoSeiMae || '',
          licitacaoProcedimento: parsed.licitacaoProcedimento || 'Pregão Eletrônico',
          objeto: parsed.objeto || '',
          isNovoFornecedor: true,
          fornecedorNovo: {
            razaoSocial: parsed.razaoSocial || 'Fornecedor Pendente',
            cnpj: parsed.cnpj || '00000000000000',
            email: 'contato@fornecedor.com',
            telefone: '',
            endereco: parsed.endereco || '',
            nomeRepresentanteLegal: parsed.nomeRepresentanteLegal || '',
            telefoneRepresentanteLegal: '',
            emailRepresentanteLegal: '',
            nomePreposto: '',
            telefonePreposto: '',
            emailPreposto: '',
          },
          vigenciaInicio: parsed.vigenciaInicio || '',
          vigenciaFim: parsed.vigenciaFim || '',
          anosVigencia: Math.round((parsed.vigenciaMeses || 12) / 12) || 1,
          valorGlobal: String(parsed.valorGlobal || '0'),
          tipoVigencia: parsed.tipoVigencia || 'CONTINUADO',
          tipoContrato: parsed.tipoContrato || 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
          regimeExecucao: parsed.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' ? 'DEDICACAO_EXCLUSIVA' : 'SEM_DEDICACAO_EXCLUSIVA',
          tipoEmpreitada: parsed.tipoEmpreitada || 'PRECO_UNITARIO',
          tipoMedicao: 'MENSAL',
          tipoAgrupamento: 'ITEM_INDIVIDUAL',
          indiceIpca: parsed.indiceReajusteSugerido === 'IPCA',
          indiceCct: parsed.indiceReajusteSugerido === 'CONVENCAO_COLETIVA',
          itens: parsed.itens.map((it, idx) => ({
            numeroItem: it.numeroItem || (idx + 1),
            descricao: it.descricao,
            cidade: it.cidade || '',
            unidade: it.unidade || 'Posto',
            quantidade: String(it.quantidade || 1),
            quantidadeAnual: String(it.quantidade || 1),
            valorUnitario: String(it.valorUnitarioAnual > 0 ? it.valorUnitarioAnual : (it.valorUnitarioMensal || 0)),
            valorUnitarioMensal: it.valorUnitarioMensal || 0,
            valorUnitarioAnual: it.valorUnitarioAnual || 0,
            valorTotalAnual: it.valorTotalAnual || 0,
            tipoReajuste: parsed.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE',
            categoriaItem: parsed.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' ? 'DEMO' : 'NAO_DEMO',
          })),
          camposPendentes: parsed.camposPendentes,
          origemPdf: file.name,
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      rascunhoId: rascunho.id,
      parsed: {
        numeroContrato: parsed.numeroContrato,
        processoSeiMae: parsed.processoSeiMae,
        licitacaoProcedimento: parsed.licitacaoProcedimento,
        razaoSocial: parsed.razaoSocial,
        cnpj: parsed.cnpj,
        endereco: parsed.endereco,
        nomeRepresentanteLegal: parsed.nomeRepresentanteLegal,
        objeto: parsed.objeto,
        tipoContrato: parsed.tipoContrato,
        tipoVigencia: parsed.tipoVigencia,
        tipoEmpreitada: parsed.tipoEmpreitada,
        vigenciaMeses: parsed.vigenciaMeses,
        vigenciaInicio: parsed.vigenciaInicio,
        vigenciaFim: parsed.vigenciaFim,
        valorGlobal: parsed.valorGlobal,
        indiceReajusteSugerido: parsed.indiceReajusteSugerido,
        itens: parsed.itens,
        totalPostos: parsed.totalPostos,
        somaItens: parsed.somaItens,
        conferenciaMatematica: parsed.conferenciaMatematica,
        camposPendentes: parsed.camposPendentes,
        isRascunho: parsed.isRascunho,
      },
      numeroContrato: parsed.numeroContrato,
      processoSei: parsed.processoSeiMae,
      fornecedor: parsed.razaoSocial,
      cnpj: parsed.cnpj,
      totalItensExtraidos: parsed.itens.length,
      camposPendentes: parsed.camposPendentes,
      isRascunho: parsed.isRascunho,
      mensagem: parsed.isRascunho
        ? `Contrato nº ${parsed.numeroContrato || 'sem número'} extraído com sucesso! Foram extraídos ${parsed.itens.length} itens contratuais (${parsed.totalPostos} postos de trabalho). Como há ${parsed.camposPendentes.length} pendências para homologação definitiva, o contrato foi salvo como rascunho.`
        : `Contrato nº ${parsed.numeroContrato} e seus ${parsed.itens.length} itens foram extraídos integralmente com sucesso!`,
    });
  } catch (error: any) {
    console.error('Erro no upload inteligente de contrato:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar PDF do contrato.' }, { status: 500 });
  }
}
