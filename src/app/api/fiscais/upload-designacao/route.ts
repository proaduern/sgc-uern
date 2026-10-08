import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { parseDesignacaoPdf } from '@/lib/pdf-designacao-parser';

async function vincularServidoresAoContrato(contrato: any, servidores: any[], numeroAto?: string, idSeiAto?: string) {
  const defaultPassHash = await hashPassword('123');
  const designacoesSalvas: any[] = [];

  for (const serv of servidores) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          serv.matricula ? { matricula: serv.matricula } : undefined,
          { nome: { equals: serv.nome, mode: 'insensitive' } },
        ].filter(Boolean) as any,
      },
    });

    if (!user) {
      const baseEmail = serv.nome.toLowerCase().replace(/[^a-z0-9]/g, '.');
      const cleanEmail = `${baseEmail}.${Date.now().toString().slice(-4)}@uern.br`;
      user = await prisma.user.create({
        data: {
          nome: serv.nome,
          email: cleanEmail,
          matricula: serv.matricula || null,
          senhaHash: defaultPassHash,
          role: serv.tipoAtuacao,
          deveTrocarSenha: true,
        },
      });
    } else if (serv.matricula && !user.matricula) {
      await prisma.user.update({
        where: { id: user.id },
        data: { matricula: serv.matricula },
      });
    }

    const resp = await prisma.contratoResponsavel.upsert({
      where: {
        contratoId_userId_tipoAtuacao: {
          contratoId: contrato.id,
          userId: user.id,
          tipoAtuacao: serv.tipoAtuacao,
        },
      },
      update: {
        numeroAtoDesignacao: numeroAto ? `Ato nº ${numeroAto}` : 'Ato de Designação',
        idSeiAtoDesignacao: idSeiAto || '',
        campusSetor: serv.campusSetor || serv.cidade || 'Campus Central',
        ativo: true,
      },
      create: {
        contratoId: contrato.id,
        userId: user.id,
        tipoAtuacao: serv.tipoAtuacao,
        numeroAtoDesignacao: numeroAto ? `Ato nº ${numeroAto}` : 'Ato de Designação',
        idSeiAtoDesignacao: idSeiAto || '',
        campusSetor: serv.campusSetor || serv.cidade || 'Campus Central',
        ativo: true,
      },
    });

    designacoesSalvas.push({
      id: resp.id,
      papel: serv.tipoAtuacao,
      nome: serv.nome,
      matricula: serv.matricula,
      cidade: serv.cidade,
      campusSetor: serv.campusSetor,
    });
  }

  return designacoesSalvas;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';

    // FLUXO 1: Vinculação manual de servidores pré-parseados a um contrato existente via JSON
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { contratoId, numeroAto, idSeiAto, processoSei, servidores } = body;

      if (!contratoId || !servidores || !Array.isArray(servidores) || servidores.length === 0) {
        return NextResponse.json({
          error: 'Contrato e lista de servidores são obrigatórios para a vinculação.',
        }, { status: 400 });
      }

      const contrato = await prisma.contrato.findUnique({
        where: { id: contratoId },
        include: { fornecedor: true },
      });

      if (!contrato) {
        return NextResponse.json({ error: 'Contrato selecionado não encontrado no sistema.' }, { status: 404 });
      }

      const designacoes = await vincularServidoresAoContrato(contrato, servidores, numeroAto, idSeiAto);

      return NextResponse.json({
        success: true,
        contratoEncontrado: true,
        numeroAto,
        idSeiAto,
        processoSei: processoSei || contrato.processoSeiMae,
        contratoVinculado: {
          id: contrato.id,
          numeroContrato: contrato.numeroContrato || 'S/N',
          processoSeiMae: contrato.processoSeiMae,
          objeto: contrato.objeto,
          fornecedor: contrato.fornecedor?.razaoSocial,
        },
        totalDesignados: designacoes.length,
        servidores,
        mensagem: `Ato nº ${numeroAto || ''} vinculado com sucesso ao Contrato nº ${contrato.numeroContrato || contrato.processoSeiMae}! Todos os ${designacoes.length} fiscais foram cadastrados e vinculados à equipe de fiscalização.`,
      });
    }

    // FLUXO 2: Upload e interpretação do PDF de designação
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo PDF de designação enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDesignacaoPdf(buffer);

    if (!parsed.servidores || parsed.servidores.length === 0) {
      return NextResponse.json({
        error: 'Não foi possível identificar os servidores ou fiscais no arquivo de designação enviado.',
      }, { status: 400 });
    }

    const contratoIdManual = formData.get('contratoId') as string | null;

    // Localizar o contrato pelo ID manual, Processo SEI, CNPJ ou Nome da contratada
    let contrato = null;
    if (contratoIdManual) {
      contrato = await prisma.contrato.findUnique({
        where: { id: contratoIdManual },
        include: { fornecedor: true },
      });
    }

    if (!contrato && parsed.processoSei) {
      const procLimpo = parsed.processoSei.trim();
      const procApenasDigitos = procLimpo.replace(/\D/g, '');

      // 1. Busca direta por contains ou equals no processoSeiMae
      contrato = await prisma.contrato.findFirst({
        where: {
          OR: [
            { processoSeiMae: { contains: procLimpo, mode: 'insensitive' } },
            { processoSeiMae: { equals: procLimpo, mode: 'insensitive' } },
          ],
        },
        include: { fornecedor: true },
      });

      // 2. Se não achou, compara apenas os dígitos numéricos
      if (!contrato && procApenasDigitos.length >= 6) {
        const todosContratos = await prisma.contrato.findMany({
          where: { status: 'ATIVO' },
          include: { fornecedor: true },
        });

        contrato = todosContratos.find((c) => {
          const cDigitos = (c.processoSeiMae || '').replace(/\D/g, '');
          return cDigitos.includes(procApenasDigitos) || procApenasDigitos.includes(cDigitos);
        }) || null;
      }
    }

    if (!contrato && parsed.cnpjContratada) {
      const cnpjNumeros = parsed.cnpjContratada.replace(/\D/g, '');
      contrato = await prisma.contrato.findFirst({
        where: {
          fornecedor: {
            OR: [
              { cnpj: { contains: cnpjNumeros } },
              { cnpj: { contains: parsed.cnpjContratada } },
            ],
          },
        },
        include: { fornecedor: true },
      });
    }

    if (!contrato && parsed.empresaContratada) {
      const nomeParte = parsed.empresaContratada.trim().slice(0, 15);
      if (nomeParte.length >= 4) {
        contrato = await prisma.contrato.findFirst({
          where: {
            fornecedor: {
              OR: [
                { razaoSocial: { contains: nomeParte, mode: 'insensitive' } },
                { nomeFantasia: { contains: nomeParte, mode: 'insensitive' } },
              ],
            },
          },
          include: { fornecedor: true },
        });
      }
    }

    // Se o contrato de referência existir no sistema, cadastra os servidores e cria os vínculos em ContratoResponsavel
    if (contrato) {
      const designacoes = await vincularServidoresAoContrato(contrato, parsed.servidores, parsed.numeroAto, parsed.idSeiAto);

      return NextResponse.json({
        success: true,
        contratoEncontrado: true,
        numeroAto: parsed.numeroAto,
        dataAto: parsed.dataAto,
        idSeiAto: parsed.idSeiAto,
        processoSei: parsed.processoSei,
        empresaContratada: parsed.empresaContratada,
        contratoVinculado: {
          id: contrato.id,
          numeroContrato: contrato.numeroContrato || 'S/N',
          processoSeiMae: contrato.processoSeiMae,
          objeto: contrato.objeto,
          fornecedor: contrato.fornecedor?.razaoSocial,
        },
        totalDesignados: designacoes.length,
        servidores: parsed.servidores,
        mensagem: `Ato nº ${parsed.numeroAto} vinculado com sucesso ao Contrato nº ${contrato.numeroContrato || contrato.processoSeiMae}! Todos os ${designacoes.length} gestores e fiscais foram cadastrados e vinculados ao contrato.`,
      });
    }

    // Se o contrato NÃO for encontrado, busca contratos disponíveis no sistema para seleção manual
    const contratosDisponiveis = await prisma.contrato.findMany({
      where: { status: 'ATIVO' },
      select: {
        id: true,
        numeroContrato: true,
        processoSeiMae: true,
        objeto: true,
        fornecedor: { select: { razaoSocial: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      contratoEncontrado: false,
      contratoVinculado: null,
      numeroAto: parsed.numeroAto,
      dataAto: parsed.dataAto,
      idSeiAto: parsed.idSeiAto,
      processoSei: parsed.processoSei,
      empresaContratada: parsed.empresaContratada,
      totalDesignados: parsed.servidores.length,
      servidores: parsed.servidores,
      contratosDisponiveis: contratosDisponiveis.map((c) => ({
        id: c.id,
        numeroContrato: c.numeroContrato || 'S/N',
        processoSeiMae: c.processoSeiMae,
        fornecedorNome: c.fornecedor?.razaoSocial,
        objeto: c.objeto,
      })),
      mensagemAviso: `Atenção: Não é possível cadastrar e vincular os fiscais porque o contrato de referência (Processo SEI ${parsed.processoSei || 'não identificado'} - ${parsed.empresaContratada || 'Empresa'}) ainda NÃO existe no sistema.`,
      orientacao: 'Cadastre primeiro o contrato correspondente no sistema ou selecione manualmente um contrato existente na lista abaixo para efetuar a vinculação.',
    });
  } catch (error: any) {
    console.error('Erro no upload inteligente de designação:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar ato de designação.' }, { status: 500 });
  }
}
