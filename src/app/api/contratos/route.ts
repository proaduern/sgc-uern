import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { registrarAuditoria } from '@/lib/auditClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status');

    // Se o usuário for Fiscal ou Gestor (não admin), filtrar contratos vinculados a ele
    const isRestrictedFiscal =
      session.role !== 'ADMIN_PROAD' &&
      session.role !== 'ADMIN_PARCIAL';

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { numeroContrato: { contains: search, mode: 'insensitive' } },
        { numeroEmpenho: { contains: search, mode: 'insensitive' } },
        { processoSeiMae: { contains: search, mode: 'insensitive' } },
        { objeto: { contains: search, mode: 'insensitive' } },
        { fornecedor: { razaoSocial: { contains: search, mode: 'insensitive' } } },
        { fornecedor: { cnpj: { contains: search } } },
      ];
    }

    if (isRestrictedFiscal) {
      whereClause.responsaveis = {
        some: {
          userId: session.id,
          ativo: true,
        },
      };
    }

    const contratos = await prisma.contrato.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        fornecedor: true,
        responsaveis: {
          include: {
            user: {
              select: { id: true, nome: true, email: true, matricula: true, role: true },
            },
          },
        },
        indicesReajuste: true,
        convencoesColetivas: {
          select: {
            id: true,
            nomeConvencao: true,
            sindicatoLaboral: true,
            numeroRegistroMte: true,
            dataBase: true,
          },
        },
        itens: true,
        _count: {
          select: {
            medicoes: true,
            trabalhadores: true,
            penalidades: true,
          },
        },
      },
    });

    return NextResponse.json({ contratos });
  } catch (error: any) {
    console.error('Erro ao buscar contratos:', error);
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 });
  }
}

function parseAndValidateDate(val: any, fieldLabel: string): Date {
  if (!val) throw new Error(`Campo ${fieldLabel} é obrigatório.`);

  let str = String(val).trim();

  // Trata formato DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,6})/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    let ano = brMatch[3];
    if (ano.length === 2) ano = `20${ano}`;
    str = `${ano}-${mes}-${dia}`;
  }

  // Trata ano com erro de digitação/estouro de dígitos (ex: +020026 -> 2026, 20026 -> 2026, 02026 -> 2026)
  const isoMatch = str.match(/^(\+?\d+)-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let anoRaw = isoMatch[1].replace(/^\+/, '');
    const mes = isoMatch[2].padStart(2, '0');
    const dia = isoMatch[3].padStart(2, '0');

    // Se ano tem 5 dígitos com 200xx ou 020xx
    if (anoRaw.length === 5 && (anoRaw.startsWith('200') || anoRaw.startsWith('020'))) {
      anoRaw = anoRaw.replace(/^0+/, '');
      if (anoRaw.length === 5 && anoRaw.startsWith('200')) {
        anoRaw = '20' + anoRaw.slice(3);
      }
    } else if (anoRaw.length > 4) {
      anoRaw = anoRaw.slice(0, 4);
    }

    const anoNum = parseInt(anoRaw, 10);
    if (isNaN(anoNum) || anoNum < 1950 || anoNum > 2100) {
      throw new Error(`Data de ${fieldLabel} inválida: o ano (${anoNum}) deve estar entre 1950 e 2100.`);
    }

    str = `${anoRaw.padStart(4, '0')}-${mes}-${dia}T00:00:00.000Z`;
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) {
    throw new Error(`Data de ${fieldLabel} inválida ("${val}").`);
  }

  const anoFinal = d.getUTCFullYear();
  if (anoFinal < 1950 || anoFinal > 2100) {
    throw new Error(`Data de ${fieldLabel} inválida: o ano (${anoFinal}) deve estar entre 1950 e 2100.`);
  }

  return d;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem cadastrar ou importar contratos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      numeroContrato,
      numeroEmpenho,
      empenhoSubstituiContrato,
      processoSeiMae,
      licitacaoProcedimento,
      objeto,
      vigenciaInicio,
      vigenciaFim,
      valorGlobal,
      tipoVigencia,
      portariaContinuadosRef,
      portariaContinuadosIdSei,
      portariaContinuadosUrl,
      tipoContrato,
      regimeExecucao, // 'DEDICACAO_EXCLUSIVA' | 'SEM_DEDICACAO_EXCLUSIVA' | 'MISTO'
      tipoEmpreitada,
      tipoMedicao,
      dataOrcamentoEstimado,
      anosVigencia,
      fornecedorId,
      fornecedorNovo, // { razaoSocial, cnpj, email, telefone, nomePreposto }
      indices, // Array<{ tipoIndice, nomeIndiceSetorial?, justificativaSetorial? }>
      convencoes, // Array<{ nomeConvencao, sindicatoLaboral?, sindicatoPatronal?, numeroRegistroMte?, dataBase?, vigenciaInicio?, vigenciaFim? }>
      itens, // Array<{ numeroItem, descricao, tipoGrupo, unidade, quantidade, valorUnitario, categoriaItem?, quantidadeAnual?, cctVinculada? }>
    } = body;

    // Validações Essenciais
    if (!processoSeiMae || !objeto || !vigenciaInicio || !vigenciaFim || !valorGlobal) {
      return NextResponse.json(
        { error: 'Processo SEI Mãe, Objeto, Vigência e Valor Global são campos obrigatórios.' },
        { status: 400 }
      );
    }

    // Sanitização e validação segura de datas contra erros de digitação (ex: +020026 -> 2026)
    let dInicio: Date;
    let dFim: Date;
    let dOrcamento: Date | null = null;
    try {
      dInicio = parseAndValidateDate(vigenciaInicio, 'Início da Vigência');
      dFim = parseAndValidateDate(vigenciaFim, 'Fim da Vigência');
      if (dataOrcamentoEstimado) {
        dOrcamento = parseAndValidateDate(dataOrcamentoEstimado, 'Data-Base do Orçamento');
      }
    } catch (dateErr: any) {
      return NextResponse.json({ error: dateErr.message }, { status: 400 });
    }

    let finalFornecedorId = fornecedorId;

    // Se fornecedor foi cadastrado no fluxo rápido
    if (!finalFornecedorId && fornecedorNovo) {
      const cleanCnpj = fornecedorNovo.cnpj.replace(/\D/g, '');
      let forn = await prisma.fornecedor.findUnique({ where: { cnpj: cleanCnpj } });
      if (!forn) {
        forn = await prisma.fornecedor.create({
          data: {
            razaoSocial: fornecedorNovo.razaoSocial,
            cnpj: cleanCnpj,
            email: fornecedorNovo.email,
            telefone: fornecedorNovo.telefone || null,
            endereco: fornecedorNovo.endereco || null,
            nomeRepresentanteLegal: fornecedorNovo.nomeRepresentanteLegal || null,
            cpfRepresentanteLegal: fornecedorNovo.cpfRepresentanteLegal || null,
            telefoneRepresentanteLegal: fornecedorNovo.telefoneRepresentanteLegal || null,
            emailRepresentanteLegal: fornecedorNovo.emailRepresentanteLegal || null,
            nomePreposto: fornecedorNovo.nomePreposto || null,
            telefonePreposto: fornecedorNovo.telefonePreposto || null,
            emailPreposto: fornecedorNovo.emailPreposto || null,
          },
        });
      }
      finalFornecedorId = forn.id;
    }

    if (!finalFornecedorId) {
      return NextResponse.json(
        { error: 'Fornecedor contratado não informado.' },
        { status: 400 }
      );
    }

    const valorGlobalFloat = parseFloat(valorGlobal);
    const isObra = tipoContrato === 'OBRA';
    const limiteLegalPadrao = isObra ? 50.0 : 25.0; // Lei 14.133: 50% obras, 25% compras/serviços

    // Calcular anos de vigência se não fornecido
    let anosVigenciaFinal = parseInt(anosVigencia, 10);
    if (isNaN(anosVigenciaFinal) || anosVigenciaFinal < 1) {
      if (dFim > dInicio) {
        let months = (dFim.getFullYear() - dInicio.getFullYear()) * 12 + (dFim.getMonth() - dInicio.getMonth());
        if (dFim.getDate() >= dInicio.getDate() - 2) months += 1;
        anosVigenciaFinal = Math.max(1, Math.round(months / 12));
      } else {
        anosVigenciaFinal = 1;
      }
    }

    // Criar Contrato com transação Prisma
    const novoContrato = await prisma.$transaction(async (tx) => {
      const c = await tx.contrato.create({
        data: {
          numeroContrato: numeroContrato || null,
          numeroEmpenho: numeroEmpenho || null,
          empenhoSubstituiContrato: !!empenhoSubstituiContrato,
          processoSeiMae,
          licitacaoProcedimento,
          objeto,
          vigenciaInicio: dInicio,
          vigenciaFim: dFim,
          anosVigencia: anosVigenciaFinal,
          valorGlobal: valorGlobalFloat,
          valorAtualizado: valorGlobalFloat,
          tipoVigencia: tipoVigencia || 'NAO_CONTINUADO',
          portariaContinuadosRef,
          portariaContinuadosIdSei,
          portariaContinuadosUrl,
          tipoContrato: tipoContrato || 'FORNECIMENTO_SIMPLES',
          regimeExecucao: regimeExecucao || (
            tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
              ? 'DEDICACAO_EXCLUSIVA'
              : 'SEM_DEDICACAO_EXCLUSIVA'
          ),
          tipoEmpreitada: tipoEmpreitada || 'PRECO_UNITARIO',
          tipoMedicao: tipoMedicao || 'MENSAL',
          dataOrcamentoEstimado: dOrcamento,
          fornecedorId: finalFornecedorId,
        },
      });

      // Cadastrar Índices de Reajuste
      if (indices && Array.isArray(indices) && indices.length > 0) {
        for (const idx of indices) {
          await tx.contratoIndice.create({
            data: {
              contratoId: c.id,
              tipoIndice: idx.tipoIndice,
              nomeIndiceSetorial: idx.nomeIndiceSetorial || null,
              justificativaSetorial: idx.justificativaSetorial || null,
              dataBase: c.dataOrcamentoEstimado,
            },
          });
        }
      }

      // Cadastrar Convenções Coletivas Vinculadas (Multi-CCT)
      if (convencoes && Array.isArray(convencoes) && convencoes.length > 0) {
        for (const conv of convencoes) {
          if (conv.nomeConvencao?.trim() || conv.sindicatoLaboral?.trim() || conv.numeroRegistroMte?.trim()) {
            await tx.convenioColetivo.create({
              data: {
                contratoId: c.id,
                nomeConvencao: conv.nomeConvencao?.trim() || 'Convenção Coletiva',
                numeroRegistroMte: conv.numeroRegistroMte?.trim() || null,
                sindicatoLaboral: conv.sindicatoLaboral?.trim() || null,
                sindicatoPatronal: conv.sindicatoPatronal?.trim() || null,
                dataBase: conv.dataBase?.trim() || null,
                vigenciaInicio: conv.vigenciaInicio ? new Date(conv.vigenciaInicio) : c.vigenciaInicio,
                vigenciaFim: conv.vigenciaFim ? new Date(conv.vigenciaFim) : c.vigenciaFim,
                categoriasProfissionais: conv.categoriasProfissionais || null,
              },
            });
          }
        }
      }

      // Cadastrar Itens do Contrato (Suporte a DEMO, Não DEMO e Misto)
      if (itens && Array.isArray(itens) && itens.length > 0) {
        const itensParaInserir = itens.map((item: any, i: number) => {
          const isDemo = item.categoriaItem === 'DEMO' || (
            item.categoriaItem !== 'NAO_DEMO' && (
              regimeExecucao === 'DEDICACAO_EXCLUSIVA' ||
              c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
            )
          );

          const vUnit = parseFloat(item.valorUnitario) || 0;
          let qtd = parseFloat(item.quantidade) || 0;
          let qtdAnual = parseFloat(item.quantidadeAnual) || 0;

          let totalAnual = 0;
          let totalPlurianual = 0;
          let totalItemEfetivo = 0;

          if (isDemo) {
            // Regime DEMO: Quantidade = postos no mês; ValorUnitário = valor mensal do posto
            totalAnual = qtd * vUnit * 12;
            totalPlurianual = anosVigenciaFinal > 1 ? totalAnual * anosVigenciaFinal : 0;
            totalItemEfetivo = anosVigenciaFinal > 1 ? totalPlurianual : totalAnual;
          } else {
            // Regime NÃO DEMO (Serviços Unitários / Fornecimento / Bens):
            if (qtdAnual === 0 && qtd > 0) {
              qtdAnual = qtd;
            }
            // Quantidade total contratada é qtdAnual * anosVigencia
            qtd = anosVigenciaFinal > 1 ? qtdAnual * anosVigenciaFinal : qtdAnual;
            totalAnual = qtdAnual * vUnit;
            totalPlurianual = anosVigenciaFinal > 1 ? qtdAnual * vUnit * anosVigenciaFinal : 0;
            totalItemEfetivo = anosVigenciaFinal > 1 ? totalPlurianual : totalAnual;
          }

          return {
            contratoId: c.id,
            numeroItem: item.numeroItem || (i + 1),
            cidade: item.cidade || 'Mossoró',
            descricao: item.descricao || `Item ${i + 1}`,
            tipoGrupo: item.tipoGrupo || 'ITEM_INDIVIDUAL',
            unidade: item.unidade || (isDemo ? 'MÊS' : 'UN'),
            categoriaItem: isDemo ? 'DEMO' : 'NAO_DEMO',
            quantidadeAnual: qtdAnual,
            tipoReajuste: item.tipoReajuste || (isDemo ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE'),
            indiceReferencia: item.cctVinculada || item.indiceReferencia || null,
            cctVinculada: isDemo ? (item.cctVinculada || item.indiceReferencia || null) : null,
            quantidadeOriginal: qtd,
            quantidadeAtual: qtd,
            valorUnitarioOriginal: vUnit,
            valorUnitarioAtual: vUnit,
            valorTotalAnual: totalAnual,
            valorTotalPlurianual: totalPlurianual,
            valorTotalOriginal: totalItemEfetivo,
            valorTotalAtual: totalItemEfetivo,
            limiteAcrescimoPercent: limiteLegalPadrao,
          };
        });

        await tx.contratoItem.createMany({
          data: itensParaInserir,
        });
      }

      return c;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Despachar log para o cofre central de auditoria PROAD
    registrarAuditoria({
      sistema: 'SGC',
      acao: 'CRIACAO',
      entidade: 'Contrato',
      entidadeId: novoContrato.id,
      entidadeNome: `Contrato nº ${novoContrato.numeroContrato || novoContrato.processoSeiMae}`,
      descricao: `Cadastro inicial do contrato nº ${novoContrato.numeroContrato || novoContrato.processoSeiMae}`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosNovos: {
        numeroContrato: novoContrato.numeroContrato,
        tipoContrato: novoContrato.tipoContrato,
        objeto: novoContrato.objeto,
        valorGlobal: novoContrato.valorGlobal,
        vigenciaInicio: novoContrato.vigenciaInicio,
        vigenciaFim: novoContrato.vigenciaFim,
        status: novoContrato.status,
      },
      rota: '/api/contratos',
    });

    return NextResponse.json({ success: true, contrato: novoContrato }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar contrato:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cadastro de contrato.' },
      { status: 500 }
    );
  }
}
