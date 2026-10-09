import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao, getUserDesignatedContext } from '@/lib/rbac';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (contratoId) {
        if (!contractIds.includes(contratoId)) return NextResponse.json({ trabalhadores: [] });
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

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
        documentos: {
          orderBy: { enviadoEm: 'desc' },
        },
        frequencias: {
          orderBy: { competenciaMesAno: 'desc' },
          take: 12,
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

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json(
        { error: 'Seu perfil não possui permissão para gerenciar trabalhadores terceirizados.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Se for upload de planilha (.xlsx / .csv)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('planilha') as File;
      const contratoId = formData.get('contratoId') as string;

      if (!file || !contratoId) {
        return NextResponse.json({ error: 'Arquivo de planilha e Contrato ID são obrigatórios.' }, { status: 400 });
      }

      if (!isAdminRole(session.role)) {
        const { contractIds } = await getUserDesignatedContext(session.id);
        if (!contractIds.includes(contratoId)) {
          return NextResponse.json({ error: 'Não autorizado para este contrato.' }, { status: 403 });
        }
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
      campus,
      setorLotacao,
      jornada,
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
        campus: campus || null,
        setorLotacao: setorLotacao || null,
        jornada: jornada || null,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (!isAdminRole(session.role) && !canManageTerceirizacao(session.role))) {
      return NextResponse.json({ error: 'Permissão insuficiente para editar trabalhadores.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      nomeCompleto,
      cpf,
      funcao,
      campus,
      setorLotacao,
      jornada,
      sexo,
      dataNascimento,
      dataAdmissao,
      dataDemissao,
      banco,
      agencia,
      contaCorrente,
      salarioBaseCct,
      beneficiosInfo,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do trabalhador é obrigatório.' }, { status: 400 });
    }

    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : undefined;

    const updated = await prisma.trabalhadorTerceirizado.update({
      where: { id },
      data: {
        ...(nomeCompleto ? { nomeCompleto } : {}),
        ...(cleanCpf ? { cpf: cleanCpf } : {}),
        ...(funcao ? { funcao } : {}),
        ...(campus !== undefined ? { campus } : {}),
        ...(setorLotacao !== undefined ? { setorLotacao } : {}),
        ...(jornada !== undefined ? { jornada } : {}),
        ...(sexo !== undefined ? { sexo } : {}),
        ...(dataNascimento ? { dataNascimento: new Date(dataNascimento) } : {}),
        ...(dataAdmissao ? { dataAdmissao: new Date(dataAdmissao) } : {}),
        ...(dataDemissao !== undefined ? { dataDemissao: dataDemissao ? new Date(dataDemissao) : null } : {}),
        ...(banco !== undefined ? { banco } : {}),
        ...(agencia !== undefined ? { agencia } : {}),
        ...(contaCorrente !== undefined ? { contaCorrente } : {}),
        ...(salarioBaseCct !== undefined ? { salarioBaseCct: parseFloat(salarioBaseCct) } : {}),
        ...(beneficiosInfo !== undefined ? { beneficiosInfo } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ success: true, trabalhador: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar trabalhador:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar trabalhador' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (!isAdminRole(session.role) && !canManageTerceirizacao(session.role))) {
      return NextResponse.json({ error: 'Permissão insuficiente para remover trabalhador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do trabalhador é obrigatório.' }, { status: 400 });
    }

    await prisma.trabalhadorTerceirizado.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Trabalhador removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir trabalhador:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir trabalhador' }, { status: 500 });
  }
}
