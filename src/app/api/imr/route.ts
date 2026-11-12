import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseImrSpreadsheet, calcularGlosaImr } from '@/lib/imr-parser';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');
    const mesCompetencia = searchParams.get('mesCompetencia');
    const action = searchParams.get('action');

    const isUserAdmin = isAdminRole(session.role);
    let userContractIds: string[] = [];

    if (!isUserAdmin) {
      const userContext = await getUserDesignatedContext(session.id);
      userContractIds = userContext.contractIds;
    }

    // Retorna o template oficial de itens do IMR com pré-carga de faltas e ocorrências objetivas
    if (action === 'TEMPLATE_COM_FATOS') {
      if (!isUserAdmin && contratoId && !userContractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Acesso negado para este contrato' }, { status: 403 });
      }

      const templateZelo = require('@/lib/imr-zelo-template.json');
      const campus = searchParams.get('campus') || '';

      let itensPreenchidos = JSON.parse(JSON.stringify(templateZelo));

      // Se houver contratoId e mesCompetencia, busca fatos objetivos de frequência de terceirizados
      if (contratoId && mesCompetencia) {
        const whereFreq: any = {
          contratoId,
          competenciaMesAno: mesCompetencia,
          faltasInjustificadas: { gt: 0 }
        };

        if (campus && campus !== 'TODOS') {
          whereFreq.trabalhador = {
            campus: { contains: campus, mode: 'insensitive' }
          };
        }

        const faltas = await prisma.frequenciaTrabalhador.findMany({
          where: whereFreq,
          include: {
            trabalhador: {
              select: { nomeCompleto: true, campus: true, funcao: true }
            }
          }
        });

        if (faltas.length > 0) {
          const totalDiasFalta = faltas.reduce((acc, f) => acc + (f.faltasInjustificadas || 0), 0);
          const nomesTrabalhadores = faltas.map(f => `${f.trabalhador.nomeCompleto} (${f.faltasInjustificadas} falta(s))`).slice(0, 5).join(', ');
          const detalhe = `Apuração automática de folha de ponto: ${totalDiasFalta} falta(s) injustificada(s) registrada(s) no mês [${nomesTrabalhadores}]`;

          // Localiza o item de "Falta de funcionário no posto, sem substituição" (Indicador nº 02)
          const itemFalta = itensPreenchidos.find((it: any) =>
            it.descricao.toLowerCase().includes('falta de funcionário no posto')
          );

          if (itemFalta) {
            itemFalta.ocorreu = true;
            itemFalta.pontuacaoAplicada = itemFalta.pontuacaoPrevista || 2.0;
            itemFalta.documentoSei = detalhe;
          }
        }
      }

      return NextResponse.json({
        template: itensPreenchidos,
        totalItens: itensPreenchidos.length
      });
    }

    const where: any = {};
    if (!isUserAdmin) {
      if (contratoId) {
        if (!userContractIds.includes(contratoId)) {
          return NextResponse.json({ avaliacoes: [] });
        }
        where.contratoId = contratoId;
      } else {
        where.contratoId = { in: userContractIds };
      }
    } else {
      if (contratoId) where.contratoId = contratoId;
    }

    if (mesCompetencia) where.mesCompetencia = mesCompetencia;

    const avaliacoes = await prisma.imrAvaliacao.findMany({
      where,
      include: {
        contrato: {
          include: {
            fornecedor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ avaliacoes });
  } catch (error: any) {
    console.error('Erro ao buscar avaliações de IMR:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const isUserAdmin = isAdminRole(session.role);
    let userContractIds: string[] = [];
    if (!isUserAdmin) {
      const userContext = await getUserDesignatedContext(session.id);
      userContractIds = userContext.contractIds;
    }

    const contentType = req.headers.get('content-type') || '';

    // 1. Upload e Análise Inteligente de Planilha (.xlsx ou .ods)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const contratoIdParam = formData.get('contratoId') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'Arquivo de planilha não enviado' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Leitura inteligente pelo parser
      const parsedData = parseImrSpreadsheet(buffer);

      // Localiza contrato correspondente no banco
      let contratoEncontrado: any = null;
      if (contratoIdParam) {
        contratoEncontrado = await prisma.contrato.findUnique({
          where: { id: contratoIdParam },
          include: { fornecedor: true },
        });
      } else if (parsedData.contratoNumero) {
        const numClean = parsedData.contratoNumero.replace(/[^\d\/]/g, '');
        contratoEncontrado = await prisma.contrato.findFirst({
          where: {
            OR: [
              { numeroContrato: { contains: numClean } },
              { numeroEmpenho: { contains: numClean } },
            ],
          },
          include: { fornecedor: true },
        });
      }

      // Validação RBAC: Se não for admin, só pode acessar contratos aos quais está designado
      if (!isUserAdmin && contratoEncontrado) {
        if (!userContractIds.includes(contratoEncontrado.id)) {
          return NextResponse.json(
            { error: 'Você não tem designação formal para avaliar IMR deste contrato.' },
            { status: 403 }
          );
        }
      }

      // Se solicitado persistência direta:
      const salvarDireto = formData.get('salvar') === 'true';
      if (salvarDireto && contratoEncontrado) {
        // Estima valor da fatura mensal para calcular valor monetário da glosa
        const valorFaturaMensal = (contratoEncontrado.valorGlobal || 0) / (contratoEncontrado.vigenciaMeses || 12);
        const valorGlosa = (valorFaturaMensal * parsedData.percentualGlosa) / 100;

        const novaAvaliacao = await prisma.imrAvaliacao.create({
          data: {
            contratoId: contratoEncontrado.id,
            mesCompetencia: parsedData.mesCompetencia || new Date().toISOString().slice(0, 7),
            localCampus: parsedData.localCampus || 'Campus Central Mossoró',
            totalPontos: parsedData.totalPontos,
            percentualGlosa: parsedData.percentualGlosa,
            valorGlosa,
            observacoes: parsedData.observacoes || `Grau de Aceitação: ${parsedData.grauAceitacao}`,
            fiscalNome: parsedData.fiscalNome || session.nome || 'Fiscal Administrativo',
            status: parsedData.requerProcessoSancionatorio ? 'REQUER_NOTIFICACAO' : 'CONCLUIDO',
            itens: parsedData.itens as any,
          },
        });

        return NextResponse.json({
          sucesso: true,
          avaliacaoSalva: novaAvaliacao,
          dadosExtraidos: parsedData,
          contrato: contratoEncontrado,
        });
      }

      return NextResponse.json({
        sucesso: true,
        dadosExtraidos: parsedData,
        contratoSugerido: contratoEncontrado,
      });
    }

    // 2. Cadastro manual / JSON
    const body = await req.json();
    const {
      contratoId,
      mesCompetencia,
      localCampus,
      totalPontos,
      percentualGlosa,
      valorGlosa,
      observacoes,
      fiscalNome,
      fiscalMatricula,
      itens,
      status,
    } = body;

    if (!contratoId || !mesCompetencia) {
      return NextResponse.json({ error: 'Contrato e Mês de Competência são obrigatórios.' }, { status: 400 });
    }

    // Validação RBAC
    if (!isUserAdmin && !userContractIds.includes(contratoId)) {
      return NextResponse.json(
        { error: 'Você não tem designação formal para avaliar IMR deste contrato.' },
        { status: 403 }
      );
    }

    const glosaInfo = calcularGlosaImr(totalPontos || 0);

    const avaliacao = await prisma.imrAvaliacao.create({
      data: {
        contratoId,
        mesCompetencia,
        localCampus: localCampus || 'Campus Central Mossoró',
        totalPontos: totalPontos || 0,
        percentualGlosa: percentualGlosa !== undefined ? percentualGlosa : glosaInfo.percentual,
        valorGlosa: valorGlosa || 0,
        observacoes: observacoes || glosaInfo.grau,
        fiscalNome: fiscalNome || session.nome || 'Fiscal Administrativo',
        fiscalMatricula,
        status: status || (glosaInfo.sancionatorio ? 'REQUER_NOTIFICACAO' : 'CONCLUIDO'),
        itens: itens || [],
      },
      include: {
        contrato: {
          include: {
            fornecedor: true,
          },
        },
      },
    });

    return NextResponse.json({ sucesso: true, avaliacao });
  } catch (error: any) {
    console.error('Erro ao processar IMR:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
