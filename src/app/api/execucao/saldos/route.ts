import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';
import * as XLSX from 'xlsx';

function parseBrazilianNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim().replace(/R\$\s?/gi, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');
    const cidade = searchParams.get('cidade');
    const status = searchParams.get('status');
    const search = searchParams.get('q');
    const objeto = searchParams.get('objeto');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    const where: any = {};

    // Restrição RBAC por Perfil e Designação
    if (!isAdminRole(session.role)) {
      const { contractIds, campusSetor } = await getUserDesignatedContext(session.id);
      if (contratoId) {
        if (!contractIds.includes(contratoId)) {
          return NextResponse.json({
            despesas: [],
            totais: { totalEstimado: 0, totalExecutado: 0, saldoTotalAberto: 0, quantidadeDespesas: 0 },
          });
        }
        where.contratoId = contratoId;
      } else {
        where.contratoId = { in: contractIds };
      }

      // Se for Fiscal Setorial, restringir rigidamente ao seu campus
      if (session.role === 'FISCAL_SETORIAL' && campusSetor) {
        where.cidade = { contains: campusSetor, mode: 'insensitive' };
      }
    } else if (contratoId) {
      where.contratoId = contratoId;
    }

    if (cidade && cidade !== 'TODAS' && (!where.cidade || session.role !== 'FISCAL_SETORIAL')) {
      where.cidade = { contains: cidade, mode: 'insensitive' };
    }

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (objeto) {
      where.contrato = {
        ...where.contrato,
        objeto: { contains: objeto, mode: 'insensitive' },
      };
    }

    if (search) {
      where.OR = [
        { processoSeiDespesa: { contains: search, mode: 'insensitive' } },
        { numeroNotaFiscal: { contains: search, mode: 'insensitive' } },
        { referencia: { contains: search, mode: 'insensitive' } },
        { contrato: { numeroContrato: { contains: search, mode: 'insensitive' } } },
        { contrato: { objeto: { contains: search, mode: 'insensitive' } } },
        { contrato: { fornecedor: { razaoSocial: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (dataInicio || dataFim) {
      where.dataAtesto = {};
      if (dataInicio) where.dataAtesto.gte = new Date(dataInicio);
      if (dataFim) where.dataAtesto.lte = new Date(dataFim + 'T23:59:59');
    }

    const despesas = await prisma.despesaExecucao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contrato: {
          include: {
            fornecedor: true,
          },
        },
      },
    });

    // Buscar contratos no escopo para obter o Valor Global Contratual
    let contratosInScope: any[] = [];
    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      contratosInScope = await prisma.contrato.findMany({
        where: { id: { in: contratoId ? [contratoId] : contractIds } },
        select: { id: true, valorGlobal: true, valorAtualizado: true },
      });
    } else {
      contratosInScope = await prisma.contrato.findMany({
        where: contratoId && contratoId !== 'TODOS' ? { id: contratoId } : {},
        select: { id: true, valorGlobal: true, valorAtualizado: true },
      });
    }

    const valorGlobalContratos = contratosInScope.reduce(
      (acc, c) => acc + (c.valorAtualizado ?? c.valorGlobal ?? 0),
      0
    );

    // Calcular Totais Oficiais:
    // 1. Processos ABERTA: provisionados (debitam provisoriamente do saldo)
    const despesasAbertas = despesas.filter((d) => d.status === 'ABERTA');
    // 2. Processos ATESTADA: executados em definitivo (a provisão cessa e o valor real atestado é debitado)
    const despesasAtestadas = despesas.filter((d) => d.status === 'ATESTADA');

    const valorProvisionado = despesasAbertas.reduce((acc, d) => acc + (d.valorEstimado || 0), 0);
    const valorAtestado = despesasAtestadas.reduce((acc, d) => acc + (d.valorAtestado || 0), 0);
    const saldoContrato = valorGlobalContratos - (valorProvisionado + valorAtestado);

    return NextResponse.json({
      despesas,
      totais: {
        valorGlobalContratos,
        valorProvisionado,
        valorAtestado,
        saldoContrato,
        quantidadeDespesas: despesas.length,
        // Aliases de compatibilidade
        totalEstimado: valorProvisionado,
        totalExecutado: valorAtestado,
        saldoTotalAberto: saldoContrato,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    let despesasParaInserir: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 });
      }

      despesasParaInserir = rows.map((row) => {
        const keys = Object.keys(row);
        const getVal = (patterns: string[]) => {
          for (const key of keys) {
            const norm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (patterns.some((p) => norm.includes(p))) {
              return row[key];
            }
          }
          return '';
        };

        const contratoRef = String(getVal(['contrato', 'num contrato', 'numero contrato', 'contrato/sei']) || '').trim();
        const seiDespesa = String(getVal(['processo de despesa', 'processo sei', 'despesa sei', 'sei']) || '').trim();
        const nf = String(getVal(['nota fiscal', 'nf', 'numero nf', 'no nf']) || '').trim();
        const dataAtestoRaw = getVal(['data atesto', 'data do atesto', 'atesto', 'data']);
        const referencia = String(getVal(['referencia', 'mes/ano', 'medicao', 'competencia']) || '').trim();
        const cidadeRaw = String(getVal(['local', 'local da prestacao', 'cidade', 'campus']) || 'Mossoró').trim();

        // Normalizar cidades oficiais dos campi UERN
        let cidade = 'Mossoró';
        const cNorm = cidadeRaw.toLowerCase();
        if (cNorm.includes('assu') || cNorm.includes('açu')) cidade = 'Assú';
        else if (cNorm.includes('patu')) cidade = 'Patu';
        else if (cNorm.includes('pau') || cNorm.includes('ferros')) cidade = 'Pau dos Ferros';
        else if (cNorm.includes('caico') || cNorm.includes('caicó')) cidade = 'Caicó';
        else if (cNorm.includes('natal')) cidade = 'Natal';
        else if (cNorm.includes('mossor')) cidade = 'Mossoró';

        const valorEstimado = parseBrazilianNumber(getVal(['valor estimado', 'estimado', 'empenhado', 'valor empenhado']));
        const valorAtestado = parseBrazilianNumber(getVal(['valor atestado', 'atestado', 'executado', 'valor real']));
        let saldo = parseBrazilianNumber(getVal(['saldo', 'saldo aberto', 'saldo a atestar']));
        if (saldo === 0 && valorEstimado > 0 && valorAtestado > 0) {
          saldo = valorEstimado - valorAtestado;
        }

        let dataAtesto: Date | null = null;
        if (dataAtestoRaw) {
          const d = new Date(dataAtestoRaw);
          if (!isNaN(d.getTime())) dataAtesto = d;
        }

        return {
          contratoRef,
          processoSeiDespesa: seiDespesa,
          numeroNotaFiscal: nf,
          dataAtesto,
          referencia: referencia || 'Exercício Corrente',
          cidade,
          valorEstimado,
          valorAtestado,
          saldo,
        };
      });
    } else {
      const body = await request.json();
      despesasParaInserir = Array.isArray(body) ? body : (body.despesas || [body]);
    }

    if (despesasParaInserir.length === 0) {
      return NextResponse.json({ error: 'Nenhuma despesa válida identificada.' }, { status: 400 });
    }

    let inseridas = 0;
    const contratosCadastrados = await prisma.contrato.findMany({
      select: { id: true, numeroContrato: true, processoSeiMae: true },
    });

    for (const d of despesasParaInserir) {
      // Localizar contrato pelo número ou SEI
      let contrato = contratosCadastrados.find(
        (c) =>
          (d.contratoRef && c.numeroContrato && c.numeroContrato.includes(d.contratoRef)) ||
          (d.contratoRef && c.processoSeiMae && c.processoSeiMae.includes(d.contratoRef))
      );

      // Se não encontrar, vincula ao primeiro contrato cadastrado ou cria referência
      if (!contrato && contratosCadastrados.length > 0) {
        contrato = contratosCadastrados[0];
      }

      if (!contrato) continue;

      await prisma.despesaExecucao.create({
        data: {
          contratoId: contrato.id,
          numeroContratoRef: d.contratoRef || contrato.numeroContrato || null,
          processoSeiMaeRef: contrato.processoSeiMae,
          processoSeiDespesa: d.processoSeiDespesa || '04410035.000000/2026-00',
          numeroNotaFiscal: d.numeroNotaFiscal || null,
          dataAtesto: d.dataAtesto ? new Date(d.dataAtesto) : null,
          referencia: d.referencia || 'Competência Geral',
          cidade: d.cidade || 'Mossoró',
          valorEstimado: d.valorEstimado || 0,
          valorAtestado: d.valorAtestado || 0,
          saldo: 0,
          status: d.status || ((d.dataAtesto || (d.valorAtestado || 0) > 0) ? 'ATESTADA' : 'ABERTA'),
        },
      });

      inseridas++;
    }

    return NextResponse.json({
      success: true,
      totalImportadas: inseridas,
      mensagem: `${inseridas} despesas e saldos importados com sucesso!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao processar planilha de saldos' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem editar lançamentos de despesas e saldos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      numeroContratoRef,
      processoSeiDespesa,
      numeroNotaFiscal,
      dataAtesto,
      referencia,
      cidade,
      valorEstimado,
      valorAtestado,
      saldo,
      status,
      observacoes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do lançamento de saldo é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.despesaExecucao.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lançamento de despesa não encontrado.' }, { status: 404 });
    }

    const vEst = valorEstimado !== undefined ? parseFloat(valorEstimado) : existing.valorEstimado;
    const vAt = valorAtestado !== undefined ? parseFloat(valorAtestado) : existing.valorAtestado;
    const computedStatus = status || ((vAt > 0 || dataAtesto) ? 'ATESTADA' : 'ABERTA');

    const updated = await prisma.despesaExecucao.update({
      where: { id },
      data: {
        ...(numeroContratoRef !== undefined && { numeroContratoRef }),
        ...(processoSeiDespesa && { processoSeiDespesa }),
        ...(numeroNotaFiscal !== undefined && { numeroNotaFiscal }),
        ...(dataAtesto !== undefined && {
          dataAtesto: dataAtesto ? new Date(dataAtesto) : null,
        }),
        ...(referencia && { referencia }),
        ...(cidade && { cidade }),
        valorEstimado: vEst,
        valorAtestado: vAt,
        saldo: 0,
        status: computedStatus,
        ...(observacoes !== undefined && { observacoes }),
      },
      include: {
        contrato: {
          include: {
            fornecedor: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, despesa: updated });
  } catch (error: any) {
    console.error('Erro ao editar despesa/saldo:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar despesa' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir lançamentos de saldo/despesa.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (e) {
        // body may be empty if called with query param
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do lançamento de despesa é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.despesaExecucao.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lançamento de despesa não encontrado.' }, { status: 404 });
    }

    // O Administrador tem permissão irrestrita para exclusão de lançamentos de despesa (inclusive atestadas ou pagas)
    await prisma.despesaExecucao.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Lançamento de despesa excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir despesa/saldo:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir despesa' }, { status: 500 });
  }
}


