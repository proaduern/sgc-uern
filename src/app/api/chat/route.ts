import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ChatMessage } from '@/types/chat';

// Respostas de Base de Conhecimento Normativo da UERN
const BASE_CONHECIMENTO_NORMAS = [
  {
    topicos: ['repactuação', 'cct', 'convenção coletiva', 'interregno', 'reajuste', 'mão de obra', 'sinapi'],
    responder: (contratos: any[]) => ({
      text: `📋 **Regras de Repactuação x Reajuste por Índice (IN 01/2026 e Jurisprudência UERN/TCE):**\n\n` +
        `1. **Mão de Obra Terceirizada (com Dedicação Exclusiva):**\n` +
        `   • O reajuste ocorre por **Repactuação** atrelada à nova Convenção Coletiva de Trabalho (CCT).\n` +
        `   • **NÃO há incidência de interregno de 1 (um) ano** para a mão de obra caso a CCT seja firmada antes desse prazo. A repactuação é devida a contar da vigência da nova convenção coletiva da categoria.\n\n` +
        `2. **Insumos, Materiais e Serviços Eventuais:**\n` +
        `   • O reajuste se dá em **sentido estrito**, atrelado a índice contratual (ex: IPCA, SINAPI, INCC).\n` +
        `   • **SUJEITO obrigatoriamente ao interregno mínimo de 1 (um) ano** a contar da data limite para apresentação da proposta ou do orçamento estimado.\n\n` +
        `3. **Contratos Mistos (Ex: Manutenção Predial):**\n` +
        `   • O SGC-UERN divide automaticamente a planilha de custos: a mão de obra residente repactua com base na CCT sem exigência de 1 ano, enquanto materiais e insumos aguardam o interregno anual do índice.`,
      referencias: [
        'Art. 135 da Lei Federal nº 14.133/2021',
        'Art. 38 da IN nº 01/2026 - PROAD/UERN',
        'Acórdãos 1.827/2008 e 1.563/2012 - TCU Plenário'
      ],
      linksUteis: [
        { label: 'Ir para Módulo de Contratos', url: '/contratos' },
      ]
    })
  },
  {
    topicos: ['conta vinculada', 'ofício', 'oficio', 'bb', 'banco do brasil', 'liberação', 'férias', '13º', 'décimo', 'resgate'],
    responder: (contratos: any[]) => ({
      text: `🏦 **Gestão de Conta Vinculada (Lei Estadual nº 10.841/2021 & Caderno de Logística UERN):**\n\n` +
        `• **Provisões Retidas Mensalmente:**\n` +
        `  - Férias Gozadas: 8,33%\n` +
        `  - 1/3 Constitucional de Férias: 2,78%\n` +
        `  - 13º Salário: 8,33%\n` +
        `  - FGTS sobre Provisões: 8,00%\n` +
        `  - Multa Rescisória de FGTS: 4,00%\n` +
        `  - Encargos GPS/FGTS: 35,30%\n\n` +
        `• **Liberação de Recursos & Débito por Funcionário:**\n` +
        `  - O sistema gera automaticamente o **Ofício Bancário ao Banco do Brasil (Agência 3795-8 Setor Público RN)** e a Memória de Cálculo individualizada por empregado e por Campus.\n` +
        `  - Ao confirmar o envio do ofício ao banco, o saldo é **automaticamente debitado do saldo individual de cada trabalhador**.`,
      referencias: [
        'Lei Estadual nº 10.841/2021 (RN)',
        'Decreto Estadual nº 33.782/2024',
        'IN nº 01/2026 - PROAD/UERN'
      ],
      linksUteis: [
        { label: 'Acessar Conta Vinculada', url: '/conta-vinculada' }
      ]
    })
  },
  {
    topicos: ['imr', 'medição de resultado', 'glosa', 'indicador', 'pontuação', 'pontos', 'desconto fatura'],
    responder: (contratos: any[]) => ({
      text: `📊 **Instrumento de Medição de Resultado (IMR) - Modelo Oficial UERN:**\n\n` +
        `• **5 Indicadores Oficiais:**\n` +
        `  1. Execução dos Serviços (limpeza, rotinas, frequência);\n` +
        `  2. Funcionários (pontualidade, conduta, postura);\n` +
        `  3. Uniformes e EPI's (fornecimento completo e substituição);\n` +
        `  4. Ferramentas e Equipamentos (disponibilidade e manutenção);\n` +
        `  5. Obrigações Trabalhistas e Previdenciárias (FGTS, INSS, salários e benefícios).\n\n` +
        `• **Critérios de Glosa Contratual:**\n` +
        `  • 1 a 5 pontos: **0% (Sem Glosa)** - Totalmente Aceitável\n` +
        `  • 6 a 10 pontos: **Glosa de 0,1%** da fatura mensal\n` +
        `  • 11 a 20 pontos: **Glosa de 0,2%** da fatura mensal\n` +
        `  • 21 a 30 pontos: **Glosa de 0,3%** da fatura mensal\n` +
        `  • 31 a 50 pontos: **Glosa de 0,5%** da fatura mensal\n` +
        `  • 51 a 70 pontos: **Glosa de 1,0%** da fatura mensal\n` +
        `  • Acima de 70 pontos: **Glosa de 5,0%** e instauração imediata de processo sancionatório/rescisão.\n\n` +
        `💡 *Você pode importar a planilha em .xlsx ou .ods diretamente na aba IMR do sistema.*`,
      referencias: [
        'Anexo I - Modelo de IMR da UERN',
        'Art. 44 da IN nº 01/2026 - PROAD/UERN'
      ],
      linksUteis: [
        { label: 'Ir para Avaliações de IMR', url: '/penalidades' }
      ]
    })
  },
  {
    topicos: ['notificação', 'notificacao', 'defesa', 'prazo', 'recurso', 'penalidade', 'sancionatório', 'sicaf', 'advertência', 'multa'],
    responder: (contratos: any[]) => ({
      text: `⚖️ **Rito de Notificação & Processo Sancionatório (IN 01/2026 UERN & Lei 14.133/21):**\n\n` +
        `• **1. Notificação de Ampla Defesa Prévia:**\n` +
        `  - Prazo legal improrrogável: **15 (quinze) dias úteis** a contar do recebimento oficial (Art. 45 IN 01/2026 e Art. 156 Lei 14.133/21).\n` +
        `  - Competência da Notificação: Fiscal Administrativo / Gestor do Contrato.\n\n` +
        `• **2. Decisão Preliminar & Fase Recursal:**\n` +
        `  - Em caso de aplicação de sanção (Advertência ou Multa), a empresa tem novo prazo de **15 (quinze) dias úteis para Recurso**, que possui **efeito suspensivo** obrigatório.\n\n` +
        `• **3. Competências da Fuern:**\n` +
        `  - Advertência e Multa: Decididas pelo **Gestor do Contrato** com parecer da Consultoria Jurídica.\n` +
        `  - Impedimento de Licitar (até 3 anos) ou Declaração de Inidoneidade: Competência exclusiva da **Reitoria / Presidência da FUERN**, precedida de comissão com pelo menos 2 servidores estáveis.\n\n` +
        `💡 *O SGC gera o Termo de Notificação pronto para download em .xlsx e em .pdf.*`,
      referencias: [
        'Arts. 44 a 50 da IN nº 01/2026 - PROAD/UERN',
        'Arts. 155 a 168 da Lei Federal nº 14.133/2021'
      ],
      linksUteis: [
        { label: 'Emitir Notificação no Sistema', url: '/penalidades' }
      ]
    })
  },
  {
    topicos: ['cidade', 'campus', 'campi', 'mossoró', 'natal', 'patu', 'assú', 'assu', 'caicó', 'caico', 'pau dos ferros'],
    responder: (contratos: any[]) => ({
      text: `📍 **Execução por Cidade / Campus da UERN:**\n\n` +
        `• No SGC-UERN, todos os itens de serviços de Contratos e Empenhos agora possuem o campo obrigatório **Cidade de Execução**.\n` +
        `• Campi atendidos: **Mossoró (Sede), Assú, Caicó, Patu, Pau dos Ferros, Natal** e Geral/Todos.\n` +
        `• Essa discriminação permite aos fiscais setoriais acompanhar exatamente os quantitativos e medições executados no seu campus local.`,
      referencias: [
        'Organização Multicampi da FUERN',
        'Manual de Procedimentos de Fiscalização Setorial'
      ],
      linksUteis: [
        { label: 'Ver Contratos por Campus', url: '/contratos' }
      ]
    })
  }
];

export async function POST(req: NextRequest) {
  try {
    const { mensagem } = await req.json();
    if (!mensagem || typeof mensagem !== 'string') {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 });
    }

    const msgLower = mensagem.toLowerCase().trim();

    // 1. Carrega contratos do banco Neon Tech para respostas contextualizadas
    const contratos = await prisma.contrato.findMany({
      include: {
        fornecedor: true,
        responsaveis: {
          include: {
            user: true,
          },
        },
        itens: true,
        indicesReajuste: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 2. Verifica se a pergunta busca por algum contrato específico (por número ou fornecedor)
    const contratoCitado = contratos.find((c: any) => {
      const numC = (c.numeroContrato || '').toLowerCase();
      const numE = (c.numeroEmpenho || '').toLowerCase();
      const forn = (c.fornecedor?.razaoSocial || '').toLowerCase();
      const numOnly = numC.replace(/[^\d]/g, '');

      return (
        (numC && msgLower.includes(numC)) ||
        (numE && msgLower.includes(numE)) ||
        (numOnly && numOnly.length >= 3 && msgLower.includes(numOnly)) ||
        (forn && msgLower.includes(forn))
      );
    });

    if (contratoCitado) {
      const fiscaisStr =
        contratoCitado.responsaveis.length > 0
          ? contratoCitado.responsaveis
              .map((r: any) => `• ${r.user?.nome || 'Servidor'} (${r.tipoAtuacao} - Ato ${r.numeroAtoDesignacao || 'S/N'})`)
              .join('\n')
          : 'Nenhum fiscal vinculado ainda.';

      const cidadesItens = Array.from(
        new Set(contratoCitado.itens.map((i: any) => i.cidade || 'Mossoró').filter(Boolean))
      ).join(', ');

      const valorFormatado = (contratoCitado.valorGlobal || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      const inicio = contratoCitado.vigenciaInicio
        ? new Date(contratoCitado.vigenciaInicio).toLocaleDateString('pt-BR')
        : 'Não informada';
      const fim = contratoCitado.vigenciaFim
        ? new Date(contratoCitado.vigenciaFim).toLocaleDateString('pt-BR')
        : 'Não informada';

      const vigenciaMeses = Math.max(
        1,
        Math.round(
          (new Date(contratoCitado.vigenciaFim).getTime() - new Date(contratoCitado.vigenciaInicio).getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375)
        )
      );

      const indicesStr =
        contratoCitado.indicesReajuste && contratoCitado.indicesReajuste.length > 0
          ? contratoCitado.indicesReajuste.map((i: any) => i.nomeIndiceSetorial || i.tipoIndice).join(', ')
          : 'Conforme CCT para Mão de Obra e IPCA/SINAPI para insumos';

      const resposta = {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        text: `📄 **Informações do Contrato nº ${contratoCitado.numeroContrato || contratoCitado.numeroEmpenho}:**\n\n` +
          `• **Contratada:** ${contratoCitado.fornecedor?.razaoSocial || 'Fornecedor'} (CNPJ: ${contratoCitado.fornecedor?.cnpj || 'N/A'})\n` +
          `• **Objeto:** ${contratoCitado.objeto}\n` +
          `• **Vigência:** ${inicio} até ${fim} (${vigenciaMeses} meses)\n` +
          `• **Valor Global:** ${valorFormatado}\n` +
          `• **Processo SEI:** ${contratoCitado.processoSeiMae || 'Não informado'}\n` +
          `• **Cidades de Execução dos Itens:** ${cidadesItens || 'Geral'}\n` +
          `• **Equipe de Fiscalização Designada:**\n${fiscaisStr}\n\n` +
          `• **Reajuste/Repactuação:** ${indicesStr}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        referencias: [
          `Contrato nº ${contratoCitado.numeroContrato || contratoCitado.numeroEmpenho}`,
          `Processo SEI nº ${contratoCitado.processoSeiMae || 'FUERN'}`,
        ],
        linksUteis: [
          { label: 'Ver Detalhes do Contrato', url: `/contratos/${contratoCitado.id}` },
        ],
      };

      return NextResponse.json({ resposta });
    }

    // 3. Procura na base de conhecimento de normas
    for (const item of BASE_CONHECIMENTO_NORMAS) {
      const encontrou = item.topicos.some((topico) => msgLower.includes(topico));
      if (encontrou) {
        const resultado = item.responder(contratos);
        return NextResponse.json({
          resposta: {
            id: 'msg-' + Date.now(),
            sender: 'bot',
            text: resultado.text,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            referencias: resultado.referencias,
            linksUteis: resultado.linksUteis,
          },
        });
      }
    }

    // 4. Pergunta genérica sobre contratos cadastrados no sistema
    if (msgLower.includes('quantos contratos') || msgLower.includes('quais contratos') || msgLower.includes('lista')) {
      const listaContratos = contratos.slice(0, 5).map(c => `• **Contrato ${c.numeroContrato || c.numeroEmpenho}**: ${c.fornecedor.razaoSocial} (${(c.valorGlobal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`).join('\n');
      return NextResponse.json({
        resposta: {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          text: `📊 **Contratos Ativos no SGC-UERN:**\n\nAtualmente temos **${contratos.length} contrato(s) cadastrado(s)** no sistema.\n\nPrincipais contratos recentes:\n${listaContratos}\n\nVocê pode me perguntar sobre qualquer um deles (pelo número ou empresa) para obter vigência, fiscais ou valores!`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          referencias: ['Banco de Dados SGC-UERN'],
          linksUteis: [{ label: 'Painel Geral de Contratos', url: '/contratos' }]
        }
      });
    }

    // 5. Resposta assistiva padrão inteligente
    return NextResponse.json({
      resposta: {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        text: `Olá! Sou o **Assistente de Normas & Contratos do SGC-UERN**.\n\nPosso te ajudar a responder instantaneamente dúvidas sobre:\n\n` +
          `• 📜 **Regras de Repactuação x Reajuste** (Mão de obra sem interregno de 1 ano x Insumos anuais)\n` +
          `• 🏦 **Conta Vinculada & Ofício Bancário** (Cálculos de provisões e liberação por funcionário)\n` +
          `• 📊 **IMR (Instrumento de Medição de Resultado)** (Notas, faixas de glosa e importação .xlsx/.ods)\n` +
          `• ⚖️ **Notificações e Processos Sancionatórios** (Prazos de 15 dias úteis, modelos e recursos)\n` +
          `• 📍 **Execução por Campus/Cidade** (Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal)\n` +
          `• 📄 **Qualquer Contrato Cadastrado** (Digite o número do contrato ou o nome da empresa para detalhes completos).\n\n` +
          `Como posso te ajudar agora?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        referencias: ['Instrução Normativa nº 01/2026 - PROAD/UERN', 'Lei nº 14.133/2021'],
        linksUteis: [
          { label: 'Módulo de Contratos', url: '/contratos' },
          { label: 'Conta Vinculada', url: '/conta-vinculada' },
          { label: 'IMR & Notificações', url: '/penalidades' },
        ]
      }
    });
  } catch (error: any) {
    console.error('Erro na rota de chat:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no assistente' }, { status: 500 });
  }
}
