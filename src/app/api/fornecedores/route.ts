import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const fornecedores = await prisma.fornecedor.findMany({
      orderBy: { razaoSocial: 'asc' },
    });

    return NextResponse.json({ fornecedores });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      razaoSocial,
      nomeFantasia,
      cnpj,
      email,
      telefone,
      endereco,
      nomeRepresentanteLegal,
      cpfRepresentanteLegal,
      telefoneRepresentanteLegal,
      emailRepresentanteLegal,
      nomePreposto,
      telefonePreposto,
      emailPreposto,
    } = body;

    if (!razaoSocial || !cnpj || !email) {
      return NextResponse.json({ error: 'Razão Social, CNPJ e E-mail são obrigatórios' }, { status: 400 });
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');

    const existing = await prisma.fornecedor.findUnique({
      where: { cnpj: cleanCnpj },
    });

    if (existing) {
      return NextResponse.json({ error: 'Fornecedor com este CNPJ já cadastrado' }, { status: 409 });
    }

    const novo = await prisma.fornecedor.create({
      data: {
        razaoSocial,
        nomeFantasia,
        cnpj: cleanCnpj,
        email,
        telefone,
        endereco,
        nomeRepresentanteLegal,
        cpfRepresentanteLegal,
        telefoneRepresentanteLegal,
        emailRepresentanteLegal,
        nomePreposto,
        telefonePreposto,
        emailPreposto,
      },
    });

    return NextResponse.json({ success: true, fornecedor: novo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cadastrar fornecedor' }, { status: 500 });
  }
}
