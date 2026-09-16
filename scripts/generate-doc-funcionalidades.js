const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = require('docx');

function createDoc() {
  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  const headerCell = (text, widthPercent) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: '003366', type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })],
        }),
      ],
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
    });

  const bodyCell = (text, widthPercent, align = AlignmentType.LEFT, bold = false, fill = 'FFFFFF') =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill, type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text, bold, size: 19, color: '1E293B' })],
        }),
      ],
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
    });

  const titleP = (text) =>
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, size: 36, color: '003366', font: 'Calibri' })],
    });

  const subtitleP = (text) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text, size: 22, color: '475569', font: 'Calibri', italic: true })],
    });

  const h1 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 140 },
      children: [new TextRun({ text, bold: true, size: 28, color: '003366', font: 'Calibri' })],
    });

  const h2 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      children: [new TextRun({ text, bold: true, size: 23, color: '1E293B', font: 'Calibri' })],
    });

  const p = (text) =>
    new Paragraph({
      spacing: { before: 80, after: 100 },
      alignment: AlignmentType.JUSTIFY,
      children: [new TextRun({ text, size: 21, color: '334155', font: 'Calibri' })],
    });

  const bullet = (boldPrefix, text) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.JUSTIFY,
      children: [
        new TextRun({ text: boldPrefix, bold: true, size: 21, color: '0F172A', font: 'Calibri' }),
        new TextRun({ text, size: 21, color: '334155', font: 'Calibri' }),
      ],
    });

  const noteBox = (text) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        left: { style: BorderStyle.SINGLE, size: 24, color: '003366' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 200, right: 140 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, italic: true, size: 20, color: '003366', font: 'Calibri' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          titleP('SISTEMA DE GESTÃO E FISCALIZAÇÃO DE CONTRATOS E ATAS DE REGISTRO DE PREÇOS (SGC-UERN)'),
          subtitleP('Relatório Executivo e Analítico de Funcionalidades do Sistema\nUniversidade do Estado do Rio Grande do Norte (UERN) – Pró-Reitoria de Administração (PROAD)'),

          noteBox(
            'Documento Institucional emitido em conformidade com a Instrução Normativa nº 01/2026-PROAD/UERN, a Lei Federal nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos), a Instrução Normativa nº 05/2017-MPOG e o Caderno de Logística de Conta Vinculada.'
          ),

          h1('1. Introdução e Objetivo do Sistema'),
          p(
            'O SGC-UERN é a solução corporativa institucional desenvolvida para modernizar, padronizar e blindar juridicamente os processos de gestão, fiscalização técnica, administrativa e setorial de todos os contratos administrativos e atas de registro de preços no âmbito dos 6 campi da Universidade do Estado do Rio Grande do Norte: Mossoró (Campus Central), Assú, Patu, Pau dos Ferros, Caicó e Natal.'
          ),
          p(
            'O sistema foi concebido e implantado em estrita observância ao princípio da segregação de funções, assegurando rastreabilidade eletrônica de todos os atos de execução orçamentária, cálculo de retenções, emissão de ordens oficiais com assinatura criptográfica e geração de relatórios anuais para subsidiar o balanço da Contabilidade e da PROPLAN.'
          ),

          h1('2. Módulo 1 – Painel Geral (Dashboard) e Monitoramento de Alertas'),
          bullet(
            'Painel de Indicadores Estratégicos (KPIs): ',
            'Apresentação consolidada e em tempo real do número de contratos ativos, montante global contratado, valor atualizado com aditivos, valor total provisionado em estimativas e saldo financeiro disponível.'
          ),
          bullet(
            'Régua Automatizada de Alertas de Vigência: ',
            'Monitoramento preventivo dos prazos de vencimento dos contratos em 90 dias, 60 dias, 30 dias e 15 dias, orientando o setor de contratos e os gestores quanto à tempestividade de prorrogações ou nova licitação.'
          ),
          bullet(
            'Alertas de Interregno de Reajuste (12 Meses): ',
            'Notificação de direito ao reajuste por índice oficial ou repactuação por convenção coletiva após o decurso do prazo de 1 ano do orçamento ou da proposta.'
          ),
          bullet(
            'Pendências de Atestes e Medições: ',
            'Sinalização instantânea para Fiscais Técnicos sobre faturas aguardando recebimento provisório e para Gestores sobre atestes definitivos pendentes.'
          ),

          h1('3. Módulo 2 – Contratos Administrativos & Empenhos Substitutivos'),
          bullet(
            'Tipologias Contratuais Diferenciadas: ',
            'Suporte a contratos formais e a Notas de Empenho que substituem o termo de contrato (art. 95 da Lei 14.133/2021), classificados em: Fornecimento Simples, Fornecimento Continuado de Bens, Serviços sem Dedicação Exclusiva, Serviços Terceirizados com Dedicação Exclusiva, Serviços Técnicos Profissionais, Obras e Engenharia, e Locação de Imóveis.'
          ),
          bullet(
            'Importação em Lote de Itens via Planilha Excel (.xlsx): ',
            'Mecanismo de carga em massa com download de template padronizado, validação de cabeçalhos, pré-visualização em modal interativo e sincronização com o banco de dados.'
          ),
          bullet(
            'Travas Legais de Aditamento: ',
            'Validação algorítmica dos limites legais de acréscimo de até 25% do valor inicial para compras e serviços e de até 50% para obras e reformas (art. 125 da Lei 14.133/2021).'
          ),
          bullet(
            'Sistema de Rascunhos Persistentes de Contratos: ',
            'Mecanismo de salvamento de rascunhos em tempo real que permite preencher instrumentos complexos em etapas, retomar edições anteriores e descartar minutas não homologadas.'
          ),
          bullet(
            'Gestão de Reajustes e Repactuações: ',
            'Parametrização de índices oficiais (IPCA, INPC, IGP-M, FIPE) e índices setoriais, com data-base, cálculo percentual e registro histórico.'
          ),

          h1('4. Módulo 3 – Gestão de Atas de Registro de Preço (ARP), Execução e Caronas'),
          p(
            'Módulo de acesso exclusivo para a Pró-Reitoria de Administração (PROAD) e para o servidor formalmente investido no perfil de Gestor de Ata de Registro de Preço (GESTOR_ATA), responsável pelo ciclo de vida completo das atas licitatórias da UERN nos termos da Lei Federal nº 14.133/2021.'
          ),
          bullet(
            'Perfil Especializado de Gestor de Ata (GESTOR_ATA): ',
            'Cadastrado no módulo de gestão de usuários, este ator assume a responsabilidade direta pelo catálogo de itens licitados, controle de vigência, saldos remanescentes, aplicação de reajustes contratuais e emissão de autorizações de execução e de caronas.'
          ),
          bullet(
            'Controle de Vigência e Catálogo de Itens: ',
            'Registro completo de atas com número oficial, ano, processo SEI licitatório, fornecedor beneficiário, monitoramento de interregno de 1 ano de vigência (Art. 84 da Lei 14.133/2021) e relação detalhada de itens com especificação, marca, modelo, quantidade registrada, quantidade saldo e valores unitários.'
          ),
          bullet(
            'Gestão de Reajustes Contratuais em Cascata: ',
            'Parametrização do índice oficial (IPCA, INPC, IGP-M ou Setorial) com ferramenta de aplicação de percentual de reajuste automático que recalcula instantaneamente os valores unitários de todos os itens catalogados e atualiza o valor global da ata.'
          ),
          bullet(
            'Autorizações para Execução de Ata (AEA): ',
            'Aba dedicada para emissão de ordens de fornecimento/execução para as unidades e campi da UERN (Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal). O sistema deduz automaticamente o saldo físico de cada item solicitado, atualiza o saldo remanescente em tempo real e gera o Termo Oficial de Autorização de Execução de Ata timbrado para juntada ao processo SEI correspondente.'
          ),
          bullet(
            'Autorizações de Carona de Ata (Adesões - Lei nº 14.133/2021): ',
            'Aba com medidores visuais e travas algorítmicas estritas para adesões de órgãos não participantes (Art. 86 da Lei 14.133/2021):\n- Teto Individual (§ 4º): Nenhuma carona pode superar 50% do valor/quantitativo registrado da ata para o órgão solicitante;\n- Teto Global Cumulativo (§ 5º): A soma de todas as adesões concedidas é rigorosamente limitada ao dobro (2x / 200%) do valor registrado da ata;\n- Registro do Processo SEI de adesão, parecer técnico fundamentado do Gestor de Ata e status homologatório.'
          ),
          bullet(
            'Menu Exclusivo e Segregação Rigorosa: ',
            'O menu lateral "Gestão de Atas (ARP)" é exibido exclusivamente para administradores da PROAD e para o Gestor de Ata, permanecendo estritamente oculto para gestores de contrato e fiscais de unidades.'
          ),

          h1('5. Módulo 4 – Equipe de Gestão e Fiscalização (Matriz de Segregação de Funções)'),
          bullet(
            'Papeis Regimentais Conforme IN 01/2026-PROAD: ',
            'Diferenciação clara entre Gestor do Contrato, Suplente, Fiscal Administrativo, Fiscal Técnico e Fiscal Setorial.'
          ),
          bullet(
            'Vinculação por Ato de Designação da PROAD: ',
            'Registro obrigatório do número da portaria e ID do processo SEI para cada membro da equipe.'
          ),
          bullet(
            'Distribuição Regionalizada por Campus: ',
            'Atribuição dos fiscais aos campi de Mossoró, Assú, Patu, Pau dos Ferros, Caicó e Natal, garantindo que fiscais setoriais acompanhem a execução in loco de sua unidade.'
          ),

          h1('6. Módulo 5 – Execução Orçamentária, Saldos e Ordens de Serviço/Compra'),
          bullet(
            'Emissão Condicional e Estrita de Ordem de Compra (OC): ',
            'Disponibilizada exclusivamente para gestores e fiscais de contratos de aquisição de bens/materiais. Exibe apenas contratos compatíveis de fornecimento, gera documento timbrado em PDF e chancela eletrônica com Hash criptográfico SHA-256 (prefixo UERN-OC).'
          ),
          bullet(
            'Emissão Condicional e Estrita de Ordem de Serviço (OS): ',
            'Disponibilizada exclusivamente para gestores e fiscais de contratos de serviços e obras. Bloqueia seleção de contratos de bens, gera documento timbrado em PDF e chancela eletrônica (prefixo UERN-OS).'
          ),
          bullet(
            'Ocultação Inteligente de Botões: ',
            'Fiscais vinculados unicamente a serviços têm o botão de Ordem de Compra ocultado para evitar equívocos operacionais, e fiscais vinculados unicamente a compras têm o botão de Ordem de Serviço ocultado.'
          ),
          bullet(
            'Fluxo Duplo de Ateste (IN nº 01/2026): ',
            'Ateste Provisório (conferência do objeto e medição realizada em até 15 dias pelo Fiscal Técnico/Setorial) e Ateste Definitivo (privativo do Gestor do Contrato para liquidação e pagamento).'
          ),
          bullet(
            'Glosas e Retenções Cautelares: ',
            'Aplicação de descontos por descumprimento de SLA ou falhas na execução com dedução automática do valor líquido da fatura.'
          ),
          bullet(
            'Acompanhamento de Saldos e Provisões: ',
            'Tabela interativa de saldos com cálculo dinâmico: Valor Global - (Despesas Provisionadas/Estimadas + Despesas Atestadas).'
          ),
          bullet(
            'Edição e Exclusão Administrativa de Faturas e Despesas Não Atestadas: ',
            'Permissão exclusiva para o Administrador Geral da PROAD retificar ou excluir lançamentos que ainda não foram homologados/certificados, atuando nas três abas do módulo: (1) Aba "Saldos de Contratos & Despesas Abertas", permitindo editar ou excluir despesas com status Aberta ou com valor atestado zerado; (2) Aba "Controle de Saldo & Atestes", permitindo editar valores, datas e dados de medição ou excluir faturas ainda não atestadas definitivamente; e (3) Aba "Ordens de Serviços Emitidas", permitindo retificar descrições e valores ou excluir ordens desde que não possuam medições vinculadas já atestadas definitivamente. Registros atestados ou liquidados contam com bloqueio absoluto contra exclusão para garantia de conformidade contábil e auditoria.'
          ),

          h1('7. Módulo 6 – Gestão de Usuários, Administradores e Perfis Institucionais'),
          p(
            'Módulo restrito à Pró-Reitoria de Administração (PROAD) para controle integral do cadastro de servidores, perfis funcionais e credenciais institucionais de acesso.'
          ),
          bullet(
            'Perfis Regimentais e Papéis de Acesso: ',
            'Parametrização e atribuição dos perfis: Administrador Geral (ADMIN_PROAD), Gestor de Contrato, Gestor de Ata de Registro de Preço (GESTOR_ATA), Fiscal Administrativo, Fiscal Técnico e Fiscal Setorial.'
          ),
          bullet(
            'Edição Cadastral Completa e Ativação: ',
            'Possibilidade de atualizar nome civil, e-mail institucional, matrícula SIAPE/UERN, nível de acesso funcional e chave de ativação (ativo/inativo) do usuário.'
          ),
          bullet(
            'Redefinição de Senha Institucional Padronizada: ',
            'Opção direta de reset de senha para a credencial institucional temporária "123", impondo automaticamente a obrigatoriedade de criação de nova senha pessoal no próximo login.'
          ),
          bullet(
            'Exclusão Segura com Validação de Integridade: ',
            'Exclusão de usuários com trava algorítmica contra auto-exclusão do administrador logado, alerta preventivo e bloqueio se o servidor possuir ordens emitidas com assinatura digital ou atas gerenciadas em vigor, e expurgo em cascata de designações contratuais e alertas do sistema.'
          ),

          h1('8. Módulo 7 – Terceirização e Convenções Coletivas de Trabalho (CCT)'),
          bullet(
            'Quadro de Trabalhadores Terceirizados: ',
            'Mapeamento individual de funcionários por contrato, CPF, cargo, jornada, salário-base e campus de lotação.'
          ),
          bullet(
            'Parametrização de CCTs: ',
            'Controle de sindicato, data-base de reajuste salarial, benefícios obrigatórios (vale transporte, vale alimentação, auxílio creche) para conferência de repactuações.'
          ),
          bullet(
            'Checklist Mensal de Regularidade Trabalhista: ',
            'Conferência obrigatória antes do pagamento da fatura de certidões FGTS, CNDT, INSS, folha analítica e comprovantes de pagamento.'
          ),

          h1('9. Módulo 8 – Conta Vinculada de Provisões Trabalhistas'),
          bullet(
            'Fórmulas do Caderno de Logística Federal: ',
            'Cálculo e retenção das rubricas de Férias e 1/3 Constitucional, 13º Salário, Multa Rescisória do FGTS (40% + 10%) e impactos previdenciários sobre provisões.'
          ),
          bullet(
            'Retenções Mensais e Liberações Auditadas: ',
            'Controle de saldo da conta vinculada por contrato, com histórico de depósitos bloqueados e liberações autorizadas pelo Gestor mediante comprovação de usufruto de férias ou rescisões.'
          ),

          h1('10. Módulo 9 – IMR (Medição de Resultado) e Aplicação de Penalidades'),
          bullet(
            'Avaliação de Nível de Serviço: ',
            'Aferição quantitativa de conformidade do fornecedor e dedução direta de glosas em faturas.'
          ),
          bullet(
            'Registro das Sanções da Lei 14.133/2021: ',
            'Advertência formal, Multa moratória ou compensatória, Impedimento de Licitar e Contratar (até 3 anos) e Declaração de Inidoneidade (3 a 6 anos).'
          ),
          bullet(
            'Score de Confiabilidade do Fornecedor: ',
            'Indicador numérico de desempenho que penaliza fornecedores reincidentes e fornece histórico para novas licitações.'
          ),

          h1('11. Módulo 10 – Fechamento Contábil Anual e Relatórios Executivos'),
          bullet(
            'Demonstrativo de Fechamento de Exercício para a Contabilidade: ',
            'Relatório que reúne todas as despesas com estimativa aberta no exercício para avaliação orçamentária e financeira.'
          ),
          bullet(
            'Parecer Contábil do Gestor (Manter vs. Anular Empenho): ',
            'O gestor do contrato avalia processo a processo se o empenho deve ser Mantido (há perspectiva de execução nos meses seguintes) ou Anulado/Cancelado (o fornecedor já informou recusa ou motivo operacional, liberando o orçamento para a contabilidade fechar o balanço).'
          ),
          bullet(
            'Exportação Oficial em PDF e Excel: ',
            'Geração de demonstrativo timbrado da UERN com resumo executivo, tabela de processos e campo de assinaturas da Gestão de Contratos e do Setor Contábil da PROPLAN, além de planilha detalhada em formato XLSX.'
          ),
          bullet(
            'Ficha Individual do Contrato e Auditoria: ',
            'Emissão de dossiê analítico do contrato com histórico de todas as faturas, fiscais, glosas e saldos para órgãos de controle (CGE e TCE/RN).'
          ),

          h1('12. Matriz Resumo de Funcionalidades por Perfil'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                children: [
                  headerCell('Módulo / Funcionalidade', 40),
                  headerCell('Admin PROAD', 15),
                  headerCell('Gestor do Contrato', 15),
                  headerCell('Fiscal Adm.', 15),
                  headerCell('Fiscal Técnico/Set.', 15),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Painel Geral & Alertas de Vigência', 40, AlignmentType.LEFT, true),
                  bodyCell('Global', 15, AlignmentType.CENTER),
                  bodyCell('Vinculados', 15, AlignmentType.CENTER),
                  bodyCell('Vinculados', 15, AlignmentType.CENTER),
                  bodyCell('Vinculados', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Gestão de Usuários (Edição, Reset Senha, Exclusão)', 40, AlignmentType.LEFT, true),
                  bodyCell('Total', 15, AlignmentType.CENTER),
                  bodyCell('Oculto', 15, AlignmentType.CENTER),
                  bodyCell('Oculto', 15, AlignmentType.CENTER),
                  bodyCell('Oculto', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Cadastro de Contratos & Planilha em Lote', 40, AlignmentType.LEFT, true),
                  bodyCell('Total', 15, AlignmentType.CENTER),
                  bodyCell('Consulta', 15, AlignmentType.CENTER),
                  bodyCell('Consulta', 15, AlignmentType.CENTER),
                  bodyCell('Consulta', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Atas de Registro de Preço (ARP), Execuções & Caronas', 40, AlignmentType.LEFT, true),
                  bodyCell('Total', 15, AlignmentType.CENTER),
                  bodyCell('Total (Gestor Ata)', 15, AlignmentType.CENTER),
                  bodyCell('Oculto', 15, AlignmentType.CENTER),
                  bodyCell('Oculto', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Emissão de Ordem de Compra (OC)', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim (Bens)', 15, AlignmentType.CENTER),
                  bodyCell('Sim (Bens)', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Emissão de Ordem de Serviço (OS)', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim (Serv)', 15, AlignmentType.CENTER),
                  bodyCell('Sim (Serv)', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Recebimento Provisório da Medição', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Recebimento Definitivo da Medição', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Edição/Exclusão de Faturas e Despesas Não Atestadas', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Terceirização, CCT & Conta Vinculada', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('IMR e Registro de Penalidades', 40, AlignmentType.LEFT, true),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Apontamento', 15, AlignmentType.CENTER),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('Fechamento Contábil Anual (Manter/Anular)', 40, AlignmentType.LEFT, true),
                  bodyCell('Global', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Sim', 15, AlignmentType.CENTER),
                  bodyCell('Não', 15, AlignmentType.CENTER),
                ],
              }),
            ],
          }),

          h1('13. Conclusão e Prontidão Operacional'),
          p(
            'O SGC-UERN consolida-se como uma plataforma completa, robusta e integralmente aderente ao ecossistema da Universidade do Estado do Rio Grande do Norte. Todos os módulos planejados encontram-se desenvolvidos, testados e disponíveis para utilização das equipes da PROAD, gestores e fiscais em todos os campi da universidade.'
          ),
        ],
      },
    ],
  });

  return doc;
}

async function run() {
  const doc = createDoc();
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '..', 'docs', 'Relatorio_de_Funcionalidades_SGC_UERN.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Documento gerado com sucesso em:', outPath);
}

run().catch(console.error);
