import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';
import * as XLSX from 'xlsx';

// Função para extrair dados da planilha no formato IN 05/2017 UERN
function extrairDadosPlanilhaIn05(buffer: Buffer): any {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let funcao = '';
  let municipio = 'Mossoró/RN';
  let cbo = '';
  let jornada = '44 horas semanais';
  let cctReferencia = '';
  let mesesExecucao = 12;
  let salarioBase = 0;
  let totalModulo1 = 0;
  let totalModulo2 = 0;
  let totalModulo3 = 0;
  let totalModulo4 = 0;
  let totalModulo5 = 0;
  let totalModulo6 = 0;
  let precoTotalEmpregado = 0;
  let valorMensalTotal = 0;
  let valorGlobalTotal = 0;
  let fatorK = 0;
  let custosIndiretosPercent = 3.0;
  let lucroPercent = 3.2;
  let tributosPercent = 14.25;

  const detalhesM1: any[] = [];
  const detalhesM2: any[] = [];
  const detalhesM3: any[] = [];
  const detalhesM4: any[] = [];
  const detalhesM5: any[] = [];
  const detalhesM6: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rText = row.map((c) => String(c).trim()).join(' | ');

    // Cabeçalho básico
    if (rText.includes('Item') && row[2] && !funcao) {
      funcao = String(row[2]).trim();
    }
    if (rText.includes('Município') && row[2]) {
      municipio = String(row[2]).trim();
    }
    if (rText.includes('Classificação Brasileira de Ocupações') && row[2]) {
      cbo = String(row[2]).trim();
    }
    if (rText.includes('Jornada') && row[2]) {
      jornada = String(row[2]).trim();
    }
    if (rText.includes('Acordo, Convenção ou Dissídio') && row[2]) {
      cctReferencia = String(row[2]).trim();
    }
    if (rText.includes('Salário Normativo') && (row[1] || row[2])) {
      salarioBase = parseFloat(row[2] || row[1]) || 0;
    }
    if (rText.includes('meses de execução contratual') && (row[1] || row[2])) {
      mesesExecucao = parseInt(row[2] || row[1], 10) || 12;
    }

    // Totais dos Módulos
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 1') || rText.toUpperCase().includes('TOTAL DO MODULO 1')) {
      totalModulo1 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 2') || rText.toUpperCase().includes('TOTAL DO MODULO 2')) {
      totalModulo2 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 3') || rText.toUpperCase().includes('TOTAL DO MODULO 3')) {
      totalModulo3 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 4') || rText.toUpperCase().includes('TOTAL DO MODULO 4')) {
      totalModulo4 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 5') || rText.toUpperCase().includes('TOTAL DO MODULO 5')) {
      totalModulo5 = parseFloat(row[row.length - 1] || row[2] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 6') || rText.toUpperCase().includes('TOTAL DO MODULO 6')) {
      totalModulo6 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }

    // Totais Finais
    if (rText.toUpperCase().includes('PREÇO TOTAL POR EMPREGADO') || rText.toUpperCase().includes('PRECO TOTAL POR EMPREGADO')) {
      precoTotalEmpregado = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('VALOR MENSAL DOS SERVIÇOS') || rText.toUpperCase().includes('VALOR MENSAL DOS SERVICOS')) {
      valorMensalTotal = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('VALOR GLOBAL DA PROPOSTA') && row.some((c) => typeof c === 'number' && c > 100)) {
      valorGlobalTotal = parseFloat(row.find((c) => typeof c === 'number' && c > 100)) || 0;
    }
    if (rText.toUpperCase().includes('FATOR K')) {
      fatorK = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
  }

  if (salarioBase === 0 && totalModulo1 > 0) salarioBase = totalModulo1;
  if (totalModulo1 === 0 && salarioBase > 0) totalModulo1 = salarioBase;
  if (precoTotalEmpregado === 0) {
    precoTotalEmpregado = totalModulo1 + totalModulo2 + totalModulo3 + totalModulo4 + totalModulo5 + totalModulo6;
  }
  if (valorMensalTotal === 0) valorMensalTotal = precoTotalEmpregado;
  if (valorGlobalTotal === 0) valorGlobalTotal = valorMensalTotal * mesesExecucao;
  if (fatorK === 0 && salarioBase > 0) {
    fatorK = parseFloat((precoTotalEmpregado / salarioBase).toFixed(4));
  }

  return {
    funcao: funcao || 'Função Terceirizada',
    municipio,
    cbo,
    jornada,
    cctReferencia,
    mesesExecucao,
    salarioBase,
    totalModulo1,
    totalModulo2,
    totalModulo3,
    totalModulo4,
    totalModulo5,
    totalModulo6,
    custosIndiretosPercent,
    lucroPercent,
    tributosPercent,
    precoTotalEmpregado,
    valorMensalTotal,
    valorGlobalTotal,
    fatorK,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');
    const itemId = searchParams.get('itemId');

    if (!contratoId) {
      return NextResponse.json({ error: 'contratoId é obrigatório' }, { status: 400 });
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ planilhas: [], totais: null });
      }
    }

    const where: any = { contratoId };
    if (itemId) where.itemId = itemId;

    const planilhas = await prisma.contratoPlanilhaCusto.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            numeroItem: true,
            descricao: true,
            unidade: true,
            quantidadeAtual: true,
            valorUnitarioAtual: true,
            valorTotalAtual: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Totais consolidados de todas as planilhas do contrato
    const totalMensalGeral = planilhas.reduce((acc, p) => acc + (p.valorMensalTotal || 0), 0);
    const totalGlobalGeral = planilhas.reduce((acc, p) => acc + (p.valorGlobalTotal || 0), 0);
    const totalEmpregados = planilhas.reduce((acc, p) => acc + (p.quantidadeEmpregados || 1) * (p.quantidadePostos || 1), 0);

    return NextResponse.json({
      planilhas,
      totais: {
        quantidadePlanilhas: planilhas.length,
        totalMensalGeral,
        totalGlobalGeral,
        totalEmpregados,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar planilhas de custos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';

    // Caso 1: Upload via FormData (Arquivo Excel)
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      const contratoId = fd.get('contratoId') as string;
      const itemId = (fd.get('itemId') as string) || null;
      const file = (fd.get('arquivo') || fd.get('file')) as File | null;

      if (!contratoId || !file) {
        return NextResponse.json({ error: 'Contrato e Arquivo são obrigatórios' }, { status: 400 });
      }

      if (!isAdminRole(session.role)) {
        const { contractIds } = await getUserDesignatedContext(session.id);
        if (!contractIds.includes(contratoId)) {
          return NextResponse.json({ error: 'Não autorizado para este contrato' }, { status: 403 });
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = extrairDadosPlanilhaIn05(buffer);

      let numeroItem: number | null = null;
      if (itemId) {
        const it = await prisma.contratoItem.findUnique({ where: { id: itemId } });
        if (it) numeroItem = it.numeroItem;
      }

      const novaPlanilha = await prisma.contratoPlanilhaCusto.create({
        data: {
          contratoId,
          itemId: itemId || null,
          numeroItem,
          funcao: parsed.funcao,
          cbo: parsed.cbo || null,
          municipio: parsed.municipio || null,
          jornada: parsed.jornada || null,
          cctReferencia: parsed.cctReferencia || null,
          mesesExecucao: parsed.mesesExecucao || 12,
          quantidadeEmpregados: 1,
          quantidadePostos: 1,
          salarioBase: parsed.salarioBase,
          totalModulo1: parsed.totalModulo1,
          totalModulo2: parsed.totalModulo2,
          totalModulo3: parsed.totalModulo3,
          totalModulo4: parsed.totalModulo4,
          totalModulo5: parsed.totalModulo5,
          totalModulo6: parsed.totalModulo6,
          custosIndiretosPercent: parsed.custosIndiretosPercent,
          lucroPercent: parsed.lucroPercent,
          tributosPercent: parsed.tributosPercent,
          precoTotalEmpregado: parsed.precoTotalEmpregado,
          valorMensalTotal: parsed.valorMensalTotal,
          valorGlobalTotal: parsed.valorGlobalTotal,
          fatorK: parsed.fatorK,
          arquivoOriginalNome: file.name,
          dadosDetalhados: parsed,
        },
      });

      return NextResponse.json({ success: true, planilha: novaPlanilha }, { status: 201 });
    }

    // Caso 2: Envio de JSON Estruturado (Cadastro manual ou formulário interativo)
    const body = await request.json();
    const {
      contratoId,
      itemId,
      numeroItem,
      funcao,
      cbo,
      municipio,
      jornada,
      cctReferencia,
      mesesExecucao,
      quantidadeEmpregados,
      quantidadePostos,
      salarioBase,
      totalModulo1,
      totalModulo2,
      totalModulo3,
      totalModulo4,
      totalModulo5,
      totalModulo6,
      custosIndiretosPercent,
      lucroPercent,
      tributosPercent,
      precoTotalEmpregado,
      valorMensalTotal,
      valorGlobalTotal,
      fatorK,
      dadosDetalhados,
      arquivoOriginalNome,
      arquivoOriginalUrl,
    } = body;

    if (!contratoId || !funcao || salarioBase === undefined) {
      return NextResponse.json(
        { error: 'Contrato, Função e Salário Base são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Você não possui permissão para este contrato.' }, { status: 403 });
      }
    }

    let resolvedNumeroItem = numeroItem;
    if (itemId && !resolvedNumeroItem) {
      const itemRec = await prisma.contratoItem.findUnique({ where: { id: itemId } });
      if (itemRec) resolvedNumeroItem = itemRec.numeroItem;
    }

    const sBase = parseFloat(salarioBase) || 0;
    const m1 = totalModulo1 !== undefined ? parseFloat(totalModulo1) : sBase;
    const m2 = totalModulo2 !== undefined ? parseFloat(totalModulo2) : 0;
    const m3 = totalModulo3 !== undefined ? parseFloat(totalModulo3) : 0;
    const m4 = totalModulo4 !== undefined ? parseFloat(totalModulo4) : 0;
    const m5 = totalModulo5 !== undefined ? parseFloat(totalModulo5) : 0;
    const m6 = totalModulo6 !== undefined ? parseFloat(totalModulo6) : 0;
    const precoEmp = precoTotalEmpregado !== undefined ? parseFloat(precoTotalEmpregado) : (m1 + m2 + m3 + m4 + m5 + m6);
    const qtdEmp = parseInt(quantidadeEmpregados, 10) || 1;
    const qtdPostos = parseInt(quantidadePostos, 10) || 1;
    const vMensal = valorMensalTotal !== undefined ? parseFloat(valorMensalTotal) : (precoEmp * qtdEmp * qtdPostos);
    const nMeses = parseInt(mesesExecucao, 10) || 12;
    const vGlobal = valorGlobalTotal !== undefined ? parseFloat(valorGlobalTotal) : (vMensal * nMeses);
    const fK = fatorK !== undefined ? parseFloat(fatorK) : (sBase > 0 ? parseFloat((precoEmp / sBase).toFixed(4)) : null);

    const novaPlanilha = await prisma.contratoPlanilhaCusto.create({
      data: {
        contratoId,
        itemId: itemId || null,
        numeroItem: resolvedNumeroItem || null,
        funcao,
        cbo: cbo || null,
        municipio: municipio || 'Mossoró/RN',
        jornada: jornada || '44 horas semanais',
        cctReferencia: cctReferencia || null,
        mesesExecucao: nMeses,
        quantidadeEmpregados: qtdEmp,
        quantidadePostos: qtdPostos,
        salarioBase: sBase,
        totalModulo1: m1,
        totalModulo2: m2,
        totalModulo3: m3,
        totalModulo4: m4,
        totalModulo5: m5,
        totalModulo6: m6,
        custosIndiretosPercent: custosIndiretosPercent ? parseFloat(custosIndiretosPercent) : null,
        lucroPercent: lucroPercent ? parseFloat(lucroPercent) : null,
        tributosPercent: tributosPercent ? parseFloat(tributosPercent) : null,
        precoTotalEmpregado: precoEmp,
        valorMensalTotal: vMensal,
        valorGlobalTotal: vGlobal,
        fatorK: fK,
        dadosDetalhados: dadosDetalhados || null,
        arquivoOriginalNome: arquivoOriginalNome || null,
        arquivoOriginalUrl: arquivoOriginalUrl || null,
      },
      include: {
        item: true,
      },
    });

    return NextResponse.json({ success: true, planilha: novaPlanilha }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao salvar planilha de custos:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar planilha de custos' }, { status: 500 });
  }
}
