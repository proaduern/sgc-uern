import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};
    if (contratoId) whereClause.contratoId = contratoId;

    const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            fornecedor: true,
          },
        },
      },
      orderBy: { nomeCompleto: 'asc' },
    });

    return NextResponse.json({ trabalhadores });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar trabalhadores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';

    // Se for upload de planilha (.xlsx / .csv)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('planilha') as File;
      const contratoId = formData.get('contratoId') as string;

      if (!file || !contratoId) {
        return NextResponse.json({ error: 'Arquivo de planilha e Contrato ID são obrigatórios.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      let inseridos = 0;
      for (const row of rows) {
        const nome = row['Nome Completo'] || row['Nome'] || row['Funcionário'];
        const cpfRaw = String(row['CPF'] || '').replace(/\D/g, '');
        const funcao = row['Função'] || row['Cargo'] || 'Apoio Operacional';
        const salario = parseFloat(row['Salário'] || row['Salário Base'] || 1600);

        if (nome && cpfRaw) {
          await prisma.trabalhadorTerceirizado.create({
            data: {
              contratoId,
              nomeCompleto: nome,
              cpf: cpfRaw,
              funcao,
              dataAdmissao: row['Admissão'] ? new Date(row['Admissão']) : new Date(),
              banco: row['Banco'] || null,
              agencia: row['Agência'] ? String(row['Agência']) : null,
              contaCorrente: row['Conta'] ? String(row['Conta']) : null,
              salarioBaseCct: salario,
              beneficiosInfo: row['Benefícios'] || 'Vale Transporte + Alimentação',
            },
          });
          inseridos++;
        }
      }

      return NextResponse.json({ success: true, inseridos });
    }

    // Se for JSON manual
    const body = await request.json();
    const {
      contratoId,
      nomeCompleto,
      cpf,
      funcao,
      sexo,
      dataNascimento,
      dataAdmissao,
      banco,
      agencia,
      contaCorrente,
      salarioBaseCct,
      beneficiosInfo,
    } = body;

    if (!contratoId || !nomeCompleto || !cpf || !funcao || !salarioBaseCct) {
      return NextResponse.json(
        { error: 'Contrato, Nome, CPF, Função e Salário Base são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    const trabalhador = await prisma.trabalhadorTerceirizado.create({
      data: {
        contratoId,
        nomeCompleto,
        cpf: cleanCpf,
        funcao,
        sexo: sexo || null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        dataAdmissao: new Date(dataAdmissao),
        banco: banco || null,
        agencia: agencia || null,
        contaCorrente: contaCorrente || null,
        salarioBaseCct: parseFloat(salarioBaseCct),
        beneficiosInfo: beneficiosInfo || null,
      },
    });

    return NextResponse.json({ success: true, trabalhador }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar trabalhador:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar trabalhador' }, { status: 500 });
  }
}
