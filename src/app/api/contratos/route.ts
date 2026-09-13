import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status');

    // Se o usuário for Fiscal ou Gestor (não admin), filtrar contratos vinculados a ele
    const isRestrictedFiscal =
      session.role !== 'ADMIN_PROAD' &&
      session.role !== 'ADMIN_PARCIAL';

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { numeroContrato: { contains: search, mode: 'insensitive' } },
        { numeroEmpenho: { contains: search, mode: 'insensitive' } },
        { processoSeiMae: { contains: search, mode: 'insensitive' } },
        { objeto: { contains: search, mode: 'insensitive' } },
        { fornecedor: { razaoSocial: { contains: search, mode: 'insensitive' } } },
        { fornecedor: { cnpj: { contains: search } } },
      ];
    }

    if (isRestrictedFiscal) {
      whereClause.responsaveis = {
        some: {
          userId: session.id,
          ativo: true,
        },
      };
    }

    const contratos = await prisma.contrato.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        fornecedor: true,
        responsaveis: {
          include: {
            user: {
              select: { id: true, nome: true, email: true, matricula: true, role: true },
            },
          },
        },
        indicesReajuste: true,
        itens: true,
        _count: {
          select: {
            medicoes: true,
            trabalhadores: true,
            penalidades: true,
          },
        },
      },
    });

    return NextResponse.json({ contratos });
  } catch (error: any) {
    console.error('Erro ao buscar contratos:', error);
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      numeroContrato,
      numeroEmpenho,
      empenhoSubstituiContrato,
      processoSeiMae,
      licitacaoProcedimento,
      objeto,
      vigenciaInicio,
      vigenciaFim,
      valorGlobal,
      tipoVigencia,
      portariaContinuadosRef,
      portariaContinuadosIdSei,
      portariaContinuadosUrl,
      tipoContrato,
      tipoEmpreitada,
      tipoMedicao,
      dataOrcamentoEstimado,
      fornecedorId,
      fornecedorNovo, // { razaoSocial, cnpj, email, telefone, nomePreposto }
      indices, // Array<{ tipoIndice, nomeIndiceSetorial?, justificativaSetorial? }>
      itens, // Array<{ numeroItem, descricao, tipoGrupo, unidade, quantidade, valorUnitario }>
    } = body;

    // Validações Essenciais
    if (!processoSeiMae || !objeto || !vigenciaInicio || !vigenciaFim || !valorGlobal) {
      return NextResponse.json(
        { error: 'Processo SEI Mãe, Objeto, Vigência e Valor Global são campos obrigatórios.' },
        { status: 400 }
      );
    }

    let finalFornecedorId = fornecedorId;

    // Se fornecedor foi cadastrado no fluxo rápido
    if (!finalFornecedorId && fornecedorNovo) {
      const cleanCnpj = fornecedorNovo.cnpj.replace(/\D/g, '');
      let forn = await prisma.fornecedor.findUnique({ where: { cnpj: cleanCnpj } });
      if (!forn) {
        forn = await prisma.fornecedor.create({
          data: {
            razaoSocial: fornecedorNovo.razaoSocial,
            cnpj: cleanCnpj,
            email: fornecedorNovo.email,
            telefone: fornecedorNovo.telefone,
            nomePreposto: fornecedorNovo.nomePreposto,
          },
        });
      }
      finalFornecedorId = forn.id;
    }

    if (!finalFornecedorId) {
      return NextResponse.json(
        { error: 'Fornecedor contratado não informado.' },
        { status: 400 }
      );
    }

    const valorGlobalFloat = parseFloat(valorGlobal);
    const isObra = tipoContrato === 'OBRA';
    const limiteLegalPadrao = isObra ? 50.0 : 25.0; // Lei 14.133: 50% obras, 25% compras/serviços

    // Criar Contrato com transação Prisma
    const novoContrato = await prisma.$transaction(async (tx) => {
      const c = await tx.contrato.create({
        data: {
          numeroContrato: numeroContrato || null,
          numeroEmpenho: numeroEmpenho || null,
          empenhoSubstituiContrato: !!empenhoSubstituiContrato,
          processoSeiMae,
          licitacaoProcedimento,
          objeto,
          vigenciaInicio: new Date(vigenciaInicio),
          vigenciaFim: new Date(vigenciaFim),
          valorGlobal: valorGlobalFloat,
          valorAtualizado: valorGlobalFloat,
          tipoVigencia: tipoVigencia || 'NAO_CONTINUADO',
          portariaContinuadosRef,
          portariaContinuadosIdSei,
          portariaContinuadosUrl,
          tipoContrato: tipoContrato || 'FORNECIMENTO_SIMPLES',
          tipoEmpreitada: tipoEmpreitada || 'PRECO_UNITARIO',
          tipoMedicao: tipoMedicao || 'MENSAL',
          dataOrcamentoEstimado: dataOrcamentoEstimado ? new Date(dataOrcamentoEstimado) : null,
          fornecedorId: finalFornecedorId,
        },
      });

      // Cadastrar Índices de Reajuste
      if (indices && Array.isArray(indices) && indices.length > 0) {
        for (const idx of indices) {
          await tx.contratoIndice.create({
            data: {
              contratoId: c.id,
              tipoIndice: idx.tipoIndice,
              nomeIndiceSetorial: idx.nomeIndiceSetorial || null,
              justificativaSetorial: idx.justificativaSetorial || null,
              dataBase: c.dataOrcamentoEstimado,
            },
          });
        }
      }

      // Cadastrar Itens do Contrato com limite de acréscimo legal usando inserção em lote (createMany)
      if (itens && Array.isArray(itens) && itens.length > 0) {
        const itensParaInserir = itens.map((item: any, i: number) => {
          const qtd = parseFloat(item.quantidade) || 0;
          const vUnit = parseFloat(item.valorUnitario) || 0;
          const totalItem = qtd * vUnit;

          return {
            contratoId: c.id,
            numeroItem: item.numeroItem || (i + 1),
            descricao: item.descricao || `Item ${i + 1}`,
            tipoGrupo: item.tipoGrupo || 'ITEM_INDIVIDUAL',
            unidade: item.unidade || 'UN',
            quantidadeOriginal: qtd,
            quantidadeAtual: qtd,
            valorUnitarioOriginal: vUnit,
            valorUnitarioAtual: vUnit,
            valorTotalOriginal: totalItem,
            valorTotalAtual: totalItem,
            limiteAcrescimoPercent: limiteLegalPadrao,
          };
        });

        await tx.contratoItem.createMany({
          data: itensParaInserir,
        });
      }

      return c;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json({ success: true, contrato: novoContrato }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar contrato:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cadastro de contrato.' },
      { status: 500 }
    );
  }
}
