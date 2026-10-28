import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  gerarDocxAtoDesignacao,
  gerarHtmlAtoDesignacao,
  ParametrosAtoDesignacao,
  SUBCRITORES_PROAD_PADRAO,
  PORTARIA_COMPETENCIA_PADRAO,
  NORMATIVO_REFERENCIA_PADRAO,
  MembroEquipeAto,
} from '@/lib/ato-designacao-generator';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatarDataPorExtenso(data: Date = new Date()): string {
  const dia = data.getDate();
  const mes = MESES[data.getMonth()];
  const ano = data.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contratoId,
      formato = 'DADOS', // 'DADOS' | 'DOCX' | 'HTML'
      customizacoes = {},
    } = body;

    if (!contratoId) {
      return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        fornecedor: true,
        responsaveis: {
          where: { ativo: true },
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                email: true,
                matricula: true,
                campus: true,
                unidadeSigla: true,
              },
            },
          },
          orderBy: [
            { tipoAtuacao: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    const anoAtual = new Date().getFullYear();

    // Mapeia membros cadastrados no contrato
    // Prioriza os membros customizados se passados pelo usuário no modal
    let membrosAto: MembroEquipeAto[] = [];
    if (customizacoes.membros && Array.isArray(customizacoes.membros) && customizacoes.membros.length > 0) {
      membrosAto = customizacoes.membros;
    } else {
      membrosAto = contrato.responsaveis.map((r) => ({
        id: r.id,
        nome: r.user.nome,
        matricula: r.user.matricula || '',
        tipoAtuacao: r.tipoAtuacao,
        campusSetor: r.campusSetor || r.user.campus || null,
      }));
    }

    // Ordenação estrita das atribuições (Gestor -> Suplente -> Adm -> Técnico -> Setorial)
    const ordemAtuacao: Record<string, number> = {
      GESTOR: 1,
      SUPLENTE: 2,
      FISCAL_ADMINISTRATIVO: 3,
      FISCAL_TECNICO: 4,
      FISCAL_SETORIAL: 5,
    };
    membrosAto.sort((a, b) => (ordemAtuacao[a.tipoAtuacao] || 99) - (ordemAtuacao[b.tipoAtuacao] || 99));

    // Determina número do Ato
    let numeroAto = customizacoes.numeroAto;
    if (!numeroAto) {
      const respComAto = contrato.responsaveis.find((r) => r.numeroAtoDesignacao);
      if (respComAto?.numeroAtoDesignacao) {
        numeroAto = respComAto.numeroAtoDesignacao;
      } else {
        numeroAto = `___/${anoAtual}`;
      }
    }

    const dataExtenso = customizacoes.dataExtenso || formatarDataPorExtenso();
    const cidadeData = customizacoes.cidadeData || 'Mossoró-RN';
    const portariaCompetencia = customizacoes.portariaCompetencia || PORTARIA_COMPETENCIA_PADRAO;
    const normativoReferencia = customizacoes.normativoReferencia || NORMATIVO_REFERENCIA_PADRAO;
    const notasEmpenhos = customizacoes.notasEmpenhos !== undefined ? customizacoes.notasEmpenhos : (contrato.numeroEmpenho || '');
    const idsEmpenhos = customizacoes.idsEmpenhos !== undefined ? customizacoes.idsEmpenhos : '';
    const subscritores = customizacoes.subscritores || SUBCRITORES_PROAD_PADRAO;

    const parametros: ParametrosAtoDesignacao = {
      numeroAto,
      ano: anoAtual,
      dataExtenso,
      cidadeData,
      portariaCompetencia,
      notasEmpenhos,
      idsEmpenhos,
      numeroContrato: contrato.numeroContrato || '',
      fornecedor: contrato.fornecedor.razaoSocial,
      cnpj: contrato.fornecedor.cnpj,
      objeto: contrato.objeto,
      processoSei: contrato.processoSeiMae,
      normativoReferencia,
      membros: membrosAto,
      subscritores,
    };

    if (formato === 'DOCX') {
      const buffer = await gerarDocxAtoDesignacao(parametros);
      const numSanitized = numeroAto.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Ato_Designacao_${numSanitized || 'SEI'}.docx`;

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const html = gerarHtmlAtoDesignacao(parametros);

    return NextResponse.json({
      success: true,
      parametros,
      html,
      contrato: {
        id: contrato.id,
        numeroContrato: contrato.numeroContrato,
        processoSeiMae: contrato.processoSeiMae,
        objeto: contrato.objeto,
        fornecedor: contrato.fornecedor.razaoSocial,
        cnpj: contrato.fornecedor.cnpj,
        numeroEmpenho: contrato.numeroEmpenho,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar Ato de Designação:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar Ato de Designação' },
      { status: 500 }
    );
  }
}
