import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';

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
        convencoesColetivas: {
          select: {
            id: true,
            nomeConvencao: true,
            sindicatoLaboral: true,
            numeroRegistroMte: true,
            dataBase: true,
          },
        },
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

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem cadastrar ou importar contratos.' },
        { status: 403 }
      );
    }

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
      anosVigencia,
      fornecedorId,
      fornecedorNovo, // { razaoSocial, cnpj, email, telefone, nomePreposto }
      indices, // Array<{ tipoIndice, nomeIndiceSetorial?, justificativaSetorial? }>
      convencoes, // Array<{ nomeConvencao, sindicatoLaboral?, sindicatoPatronal?, numeroRegistroMte?, dataBase?, vigenciaInicio?, vigenciaFim? }>
      itens, // Array<{ numeroItem, descricao, tipoGrupo, unidade, quantidade, valorUnitario, cctVinculada? }>
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
            telefone: fornecedorNovo.telefone || null,
            endereco: fornecedorNovo.endereco || null,
            nomeRepresentanteLegal: fornecedorNovo.nomeRepresentanteLegal || null,
            cpfRepresentanteLegal: fornecedorNovo.cpfRepresentanteLegal || null,
            telefoneRepresentanteLegal: fornecedorNovo.telefoneRepresentanteLegal || null,
            emailRepresentanteLegal: fornecedorNovo.emailRepresentanteLegal || null,
            nomePreposto: fornecedorNovo.nomePreposto || null,
            telefonePreposto: fornecedorNovo.telefonePreposto || null,
            emailPreposto: fornecedorNovo.emailPreposto || null,
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

    // Calcular anos de vigência se não fornecido
    let anosVigenciaFinal = parseInt(anosVigencia, 10);
    if (isNaN(anosVigenciaFinal) || anosVigenciaFinal < 1) {
      const d1 = new Date(vigenciaInicio);
      const d2 = new Date(vigenciaFim);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
        let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
        if (d2.getDate() >= d1.getDate() - 2) months += 1;
        anosVigenciaFinal = Math.max(1, Math.round(months / 12));
      } else {
        anosVigenciaFinal = 1;
      }
    }

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
          anosVigencia: anosVigenciaFinal,
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

      // Cadastrar Convenções Coletivas Vinculadas (Multi-CCT)
      if (convencoes && Array.isArray(convencoes) && convencoes.length > 0) {
        for (const conv of convencoes) {
          if (conv.nomeConvencao?.trim() || conv.sindicatoLaboral?.trim() || conv.numeroRegistroMte?.trim()) {
            await tx.convenioColetivo.create({
              data: {
                contratoId: c.id,
                nomeConvencao: conv.nomeConvencao?.trim() || 'Convenção Coletiva',
                numeroRegistroMte: conv.numeroRegistroMte?.trim() || null,
                sindicatoLaboral: conv.sindicatoLaboral?.trim() || null,
                sindicatoPatronal: conv.sindicatoPatronal?.trim() || null,
                dataBase: conv.dataBase?.trim() || null,
                vigenciaInicio: conv.vigenciaInicio ? new Date(conv.vigenciaInicio) : c.vigenciaInicio,
                vigenciaFim: conv.vigenciaFim ? new Date(conv.vigenciaFim) : c.vigenciaFim,
                categoriasProfissionais: conv.categoriasProfissionais || null,
              },
            });
          }
        }
      }

      // Cadastrar Itens do Contrato com cálculo de valores mensais, anuais e plurianuais
      if (itens && Array.isArray(itens) && itens.length > 0) {
        const itensParaInserir = itens.map((item: any, i: number) => {
          const qtd = parseFloat(item.quantidade) || 0;
          const vUnit = parseFloat(item.valorUnitario) || 0;
          const unidadeNorm = (item.unidade || 'MÊS').trim().toUpperCase();
          const isMensal = ['MÊS', 'MES', 'POSTO', 'POSTO/MÊS', 'MENSAL'].includes(unidadeNorm);

          // Valor Anual: a * 12 * qtd (se mensal) ou qtd * vUnit
          const totalAnual = isMensal ? qtd * vUnit * 12 : qtd * vUnit;
          // Valor Plurianual: a * 12 * anos * qtd (se anos > 1), senão 0
          const totalPlurianual = anosVigenciaFinal > 1 ? (isMensal ? qtd * vUnit * 12 * anosVigenciaFinal : qtd * vUnit * anosVigenciaFinal) : 0;
          // Valor total efetivo considerado para fins de contrato: plurianual se anos > 1, senão anual
          const totalItemEfetivo = anosVigenciaFinal > 1 ? totalPlurianual : totalAnual;

          return {
            contratoId: c.id,
            numeroItem: item.numeroItem || (i + 1),
            cidade: item.cidade || 'Mossoró',
            descricao: item.descricao || `Item ${i + 1}`,
            tipoGrupo: item.tipoGrupo || 'ITEM_INDIVIDUAL',
            unidade: item.unidade || 'MÊS',
            tipoReajuste: item.tipoReajuste || (
              ['MÊS', 'MES', 'POSTO', 'POSTO/MÊS', 'MENSAL'].includes((item.unidade || '').toUpperCase()) && c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
                ? 'REPACTUACAO_CCT'
                : 'REAJUSTE_INDICE'
            ),
            indiceReferencia: item.cctVinculada || item.indiceReferencia || null,
            cctVinculada: item.cctVinculada || (item.tipoReajuste === 'REPACTUACAO_CCT' ? item.indiceReferencia : null) || null,
            quantidadeOriginal: qtd,
            quantidadeAtual: qtd,
            valorUnitarioOriginal: vUnit,
            valorUnitarioAtual: vUnit,
            valorTotalAnual: totalAnual,
            valorTotalPlurianual: totalPlurianual,
            valorTotalOriginal: totalItemEfetivo,
            valorTotalAtual: totalItemEfetivo,
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
