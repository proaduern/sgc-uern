import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de integração PROAD inválida.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const ordens = await prisma.ordemServico.findMany({
      where: contratoId ? { contratoId } : undefined,
      include: {
        contrato: {
          select: {
            numeroContrato: true,
            objeto: true,
            fornecedor: { select: { razaoSocial: true, cnpj: true } },
          },
        },
        fiscalAdm: { select: { nome: true, email: true } },
        medicoes: {
          select: {
            id: true,
            valorAtestadoFinal: true,
            status: true,
            referenciaMesAno: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, ordens });
  } catch (error: any) {
    console.error('Erro ao listar OSs no SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar OSs.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de integração PROAD inválida.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contratoId,
      numeroContratoRef,
      numeroOs,
      ano,
      processoSeiDespesa,
      descricaoServico,
      valorEstimado,
      autorizadoPorNome,
      autorizadoPorEmail,
      origemChamadoId,
      origemDemandaId,
      unidadeDemandante,
    } = body;

    if (!valorEstimado || Number(valorEstimado) <= 0) {
      return NextResponse.json({ error: 'Valor da Ordem de Serviço deve ser maior que zero.' }, { status: 400 });
    }

    // 1. Localiza o contrato no SGC (por ID ou por número aproximado)
    let contrato = null;
    if (contratoId) {
      contrato = await prisma.contrato.findUnique({
        where: { id: contratoId },
        include: { ordensServico: true },
      });
    }

    if (!contrato && numeroContratoRef) {
      contrato = await prisma.contrato.findFirst({
        where: {
          status: 'ATIVO',
          OR: [
            { numeroContrato: { contains: numeroContratoRef, mode: 'insensitive' } },
            { numeroContrato: 'Contrato nº 14/2025' },
          ],
        },
        include: { ordensServico: true },
      });
    }

    // Fallback para o contrato padrão de manutenção se não especificado
    if (!contrato) {
      contrato = await prisma.contrato.findFirst({
        where: {
          status: 'ATIVO',
          numeroContrato: 'Contrato nº 14/2025',
        },
        include: { ordensServico: true },
      });
    }

    if (!contrato) {
      return NextResponse.json({ error: 'Nenhum contrato ativo de manutenção predial encontrado no SGC.' }, { status: 404 });
    }

    // 2. Trava de Saldo Contratual no SGC
    const totalEmpenhadoAtual = contrato.ordensServico.reduce((acc, os) => acc + (os.valorEstimado || 0), 0);
    const saldoDisponivel = contrato.valorAtualizado - totalEmpenhadoAtual;

    if (Number(valorEstimado) > saldoDisponivel) {
      return NextResponse.json(
        {
          error: `Saldo contratual insuficiente no SGC para autorização da OS. Saldo disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Solicitado: R$ ${Number(valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          saldoDisponivel,
          valorSolicitado: Number(valorEstimado),
          contratoNumero: contrato.numeroContrato,
        },
        { status: 422 }
      );
    }

    // 3. Fiscal Adm / Autorizador
    let fiscal = await prisma.user.findFirst({
      where: {
        OR: [
          { email: autorizadoPorEmail || '' },
          { role: 'ADMIN_PROAD' },
          { role: 'FISCAL_ADMINISTRATIVO' },
        ],
      },
    });

    if (!fiscal) {
      fiscal = await prisma.user.findFirst();
    }

    if (!fiscal) {
      return NextResponse.json({ error: 'Nenhum usuário fiscal ou admin cadastrado no SGC.' }, { status: 500 });
    }

    // 4. Gera hash de assinatura digital da autorização PROAD
    const hashData = `${contrato.id}-${numeroOs}-${valorEstimado}-${new Date().toISOString()}-${processoSeiDespesa || 'SEI-UERN'}`;
    const hashAssinatura = crypto.createHash('sha256').update(hashData).digest('hex');

    const anoOs = ano || new Date().getFullYear();
    const numeroOsFinal = numeroOs || `OS-MANUT-${String(contrato.ordensServico.length + 1).padStart(4, '0')}/${anoOs}`;

    // 5. Registra a Ordem de Serviço no SGC
    const novaOs = await prisma.ordemServico.create({
      data: {
        contratoId: contrato.id,
        numeroOs: numeroOsFinal,
        ano: anoOs,
        fiscalAdmId: fiscal.id,
        processoSeiDespesa: processoSeiDespesa || contrato.processoSeiMae,
        descricaoServico: `[Manutenção UERN] ${descricaoServico || 'Serviço de Manutenção Predial'}${unidadeDemandante ? ` | Unidade: ${unidadeDemandante}` : ''}${origemChamadoId ? ` | Chamado nº ${origemChamadoId}` : ''}`,
        valorEstimado: Number(valorEstimado),
        hashAssinaturaEletronica: hashAssinatura,
        status: 'EMITIDA',
      },
    });

    const novoSaldoDisponivel = saldoDisponivel - Number(valorEstimado);

    return NextResponse.json({
      success: true,
      mensagem: 'Ordem de Serviço registrada e saldo provisionado no SGC com sucesso!',
      ordemServico: {
        id: novaOs.id,
        numeroOs: novaOs.numeroOs,
        valorEstimado: novaOs.valorEstimado,
        contratoId: contrato.id,
        contratoNumero: contrato.numeroContrato,
        saldoAnterior: saldoDisponivel,
        saldoRestante: novoSaldoDisponivel,
        hashAssinatura: novaOs.hashAssinaturaEletronica,
      },
    });
  } catch (error: any) {
    console.error('Erro ao registrar OS no SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao emitir OS no SGC.' }, { status: 500 });
  }
}
