import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseImrSpreadsheet, calcularGlosaImr } from '@/lib/imr-parser';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');
    const mesCompetencia = searchParams.get('mesCompetencia');

    const where: any = {};
    if (contratoId) where.contratoId = contratoId;
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
            fiscalNome: parsedData.fiscalNome || 'Fiscal Administrativo',
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
        fiscalNome,
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
