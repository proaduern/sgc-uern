import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repactuacao = await prisma.repactuacaoCalculo.findUnique({
      where: { id: params.id },
      include: {
        contrato: true,
        itens: {
          include: { trabalhador: true },
          orderBy: [{ competenciaMesAno: 'asc' }, { funcao: 'asc' }],
        },
        comprovantes: {
          orderBy: { enviadoEm: 'desc' },
        },
      },
    });

    if (!repactuacao) {
      return NextResponse.json({ error: 'Repactuação não encontrada' }, { status: 404 });
    }

    return NextResponse.json(repactuacao);
  } catch (error: any) {
    console.error('Erro ao buscar repactuação:', error);
    return NextResponse.json({ error: 'Erro ao buscar repactuação' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.repactuacaoCalculo.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Repactuação excluída com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir repactuação:', error);
    return NextResponse.json({ error: 'Erro ao excluir repactuação' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getSession();
    const body = await request.json();

    const { status, homologarFiscal, observacoes } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (observacoes !== undefined) dataToUpdate.observacoes = observacoes;

    if (homologarFiscal) {
      dataToUpdate.status = 'HOMOLOGADO_FISCAL';
      dataToUpdate.dataHomologacaoFiscal = new Date();
      dataToUpdate.fiscalResponsavelNome = currentUser?.nome || 'Fiscal da PROAD';
      dataToUpdate.fiscalResponsavelMatricula = currentUser?.matricula || 'UERN-7482';
    }

    const updated = await prisma.repactuacaoCalculo.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        itens: {
          include: { trabalhador: true },
        },
        comprovantes: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar repactuação:', error);
    return NextResponse.json({ error: 'Erro ao atualizar repactuação' }, { status: 500 });
  }
}
