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

  const h3 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 180, after: 80 },
      children: [new TextRun({ text, bold: true, size: 21, color: '334155', font: 'Calibri' })],
    });

  const p = (text) =>
    new Paragraph({
      spacing: { before: 80, after: 100 },
      alignment: AlignmentType.JUSTIFY,
      children: [new TextRun({ text, size: 21, color: '334155', font: 'Calibri' })],
    });

  const stepP = (stepNumber, title, text) =>
    new Paragraph({
      spacing: { before: 100, after: 100 },
      alignment: AlignmentType.JUSTIFY,
      children: [
        new TextRun({ text: `Passo ${stepNumber}: `, bold: true, color: '003366', size: 21, font: 'Calibri' }),
        new TextRun({ text: `${title} – `, bold: true, color: '0F172A', size: 21, font: 'Calibri' }),
        new TextRun({ text, size: 21, color: '334155', font: 'Calibri' }),
      ],
    });

  const tipBox = (title, text) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        left: { style: BorderStyle.SINGLE, size: 24, color: '047857' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 200, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `💡 ${title}: `, bold: true, size: 20, color: '047857', font: 'Calibri' }),
                    new TextRun({ text, size: 20, color: '065F46', font: 'Calibri' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const alertBox = (title, text) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        left: { style: BorderStyle.SINGLE, size: 24, color: 'B91C1C' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: 'FEF2F2', type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 200, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `⚠️ ${title}: `, bold: true, size: 20, color: 'B91C1C', font: 'Calibri' }),
                    new TextRun({ text, size: 20, color: '991B1B', font: 'Calibri' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          titleP('MANUAL DO USUÁRIO E GUIA PRÁTICO PASSO A PASSO'),
          subtitleP('Sistema de Gestão e Fiscalização de Contratos e Atas da UERN (SGC-UERN)\nPara Administradores, Gestores, Fiscais e Equipe Contábil'),

          tipBox(
            'Linguagem Simples e Acessível',
            'Este manual foi estruturado para ser direto, visual e amigável. Não exige conhecimento técnico de informática. Basta seguir o passo a passo da sua função para realizar qualquer operação no sistema.'
          ),

          h1('1. Apresentação e Primeiros Passos'),
          p(
            'Bem-vindo ao SGC-UERN! Este sistema foi criado pela Pró-Reitoria de Administração (PROAD) para facilitar o trabalho diário de quem cuida dos contratos na UERN. Aqui você pode emitir ordens de serviço e de compra, acompanhar os pagamentos, validar faturas e verificar prazos sem complicações.'
          ),

          h2('Como Acessar o Sistema'),
          stepP(1, 'Acesse a Página de Login', 'Abra seu navegador de internet (Google Chrome, Edge ou Firefox) e digite o endereço do SGC-UERN fornecido pela PROAD.'),
          stepP(2, 'Informe seu Usuário e Senha', 'No campo "E-mail Institucional", digite seu e-mail cadastrado (ex: seu.nome@uern.br). No primeiro acesso, utilize a senha inicial padronizada "123".'),
          stepP(3, 'Crie sua Nova Senha', 'Por segurança, no primeiro login o sistema solicitará que você defina uma nova senha pessoal de sua preferência.'),

          tipBox('Dica de Senha', 'Escolha uma senha que você lembre facilmente, mas que contenha letras e números para garantir a segurança dos processos contratuais da universidade.'),

          h2('Conhecendo a Barra Lateral e o Painel Inicial'),
          p(
            'Ao entrar no sistema, você verá o menu à esquerda com os módulos disponíveis para o seu perfil. As opções mais comuns são:'
          ),
          bullet('Visão Geral (Início): ', 'Mostra o resumo de contratos, valores e cartões coloridos com alertas importantes.'),
          bullet('Contratos Vinculados: ', 'Lista todos os contratos onde você foi oficialmente designado como Gestor ou Fiscal.'),
          bullet('Execução & Medições: ', 'Onde você emite Ordens de Serviço (OS) ou Ordens de Compra (OC), lança medições e aprova faturas.'),
          bullet('Relatórios & Fechamento: ', 'Onde você emite demonstrativos e informa à Contabilidade quais despesas serão mantidas ou anuladas.'),

          h1('2. Guia do Gestor do Contrato'),
          p(
            'Você, como Gestor do Contrato, é a autoridade central da coordenação contratual. Seu papel é emitir as ordens oficiais para as empresas começarem o trabalho, aprovar o pagamento final (Ateste Definitivo) e decidir sobre o orçamento ao fim do ano.'
          ),

          h2('Como Emitir uma Ordem de Serviço (OS) ou Ordem de Compra (OC)'),
          stepP(1, 'Acesse o Módulo de Execução', 'No menu lateral esquerdo, clique em "Execução & Medições".'),
          stepP(2, 'Clique no Botão de Emissão', 'No topo da tela, você verá o botão correspondente ao seu tipo de contrato:\n- Se o seu contrato for de serviços ou obras: clique no botão azul "Emitir Ordem de Serviço (OS)".\n- Se o seu contrato for de compra de materiais/bens: clique no botão verde "Emitir Ordem de Compra (OC)".'),
          stepP(3, 'Selecione o Contrato', 'Na janela que se abrirá, o sistema listará apenas os contratos compatíveis com a ordem escolhida. Escolha o contrato desejado.'),
          stepP(4, 'Preencha os Dados Básicos', 'Informe o Número do Processo SEI da despesa, o valor estimado a ser liberado e a descrição do serviço ou especificação dos bens a fornecer.'),
          stepP(5, 'Confirme e Emita o Documento', 'Clique em "Emitir Ordem Oficial". O sistema gerará o documento em PDF timbrado com Chancela Eletrônica institucional e código verificador Hash SHA-256 para você enviar à empresa contratada.'),

          tipBox('Sem Risco de Confusão', 'O sistema só mostra para você as opções compatíveis com o seu contrato. Se você só gerencia serviços, nunca verá opção de compra por engano, e vice-versa!'),

          h2('Como Dar o Recebimento/Ateste Definitivo da Fatura'),
          p(
            'O Ateste Definitivo é privativo do Gestor e autoriza o setor financeiro a efetuar o pagamento à empresa contratada.'
          ),
          stepP(1, 'Acesse a Aba "Controle de Saldo & Atestes"', 'Dentro do menu Execução, clique na aba "Controle de Saldo & Atestes".'),
          stepP(2, 'Localize a Medição Validada pelo Fiscal Técnico', 'Verifique se a coluna "Recebimento Provisório" já está com o visto verde do Fiscal Técnico.'),
          stepP(3, 'Clique em "Dar Ateste Definitivo"', 'Após conferir que a documentação está correta e não há pendências, clique no botão azul "Dar Ateste Definitivo". O status mudará imediatamente para Atestada e o valor será lançado para pagamento.'),

          h2('Fechamento Contábil de Fim de Ano (Manter vs. Anular Empenho)'),
          p(
            'Todo final de ano, a Contabilidade da UERN e a PROPLAN precisam saber quais despesas estimadas ainda vão acontecer e quais podem ser canceladas para liberar o orçamento da universidade.'
          ),
          stepP(1, 'Acesse "Relatórios & Fechamento"', 'Clique no menu lateral "Relatórios & Fechamento". A primeira aba aberta será "Fechamento Contábil Anual".'),
          stepP(2, 'Examine suas Despesas em Aberto', 'Na tabela abaixo, veja todos os processos estimativos abertos dos seus contratos.'),
          stepP(3, 'Clique em "Alterar Decisão"', 'Ao lado da despesa que deseja avaliar, clique no botão azul de alteração.'),
          stepP(4, 'Defina a Decisão e Justificativa', 'Escolha entre:\n- Manter Empenho: se a empresa ainda vai entregar o bem ou executar o serviço nos próximos meses.\n- Anular Empenho: se a empresa já informou que não vai entregar ou a despesa não acontecerá mais. Escreva uma breve justificativa e clique em Salvar.'),
          stepP(5, 'Gere o Relatório Timbrado', 'No topo da página, clique em "Emitir Relatório PDF" para imprimir o demonstrativo oficial assinado pela Gestão e Contabilidade.'),

          h1('3. Guia do Gestor de Ata de Registro de Preço (ARP)'),
          p(
            'Você, como Gestor de Ata de Registro de Preço (ARP), é a autoridade responsável pelo gerenciamento de todo o ciclo de vida das atas licitatórias da UERN. O seu módulo no menu ("Gestão de Atas (ARP)") é exclusivo para seu perfil e para a PROAD.'
          ),

          h2('Como Cadastrar uma Nova Ata e seus Itens'),
          stepP(1, 'Acesse o Módulo de Atas', 'No menu lateral esquerdo, clique em "Gestão de Atas (ARP)".'),
          stepP(2, 'Clique em "Cadastrar Nova Ata (ARP)"', 'No canto superior direito, clique no botão azul com o ícone de adição.'),
          stepP(3, 'Preencha os Dados do Instrumento Licitatório', 'Informe o Número da Ata (ex: 01), o Ano (2026), o Processo SEI da licitação, o fornecedor vencedor, as datas de início e fim da vigência e o índice oficial de reajuste (ex: IPCA).'),
          stepP(4, 'Cadastre os Itens Licitados e seus Saldos Iniciais', 'Para cada item registrado na ata, informe: descrição do material/serviço, marca/modelo, unidade de medida (UN, CX, PCT, etc.), quantidade total registrada e valor unitário. O sistema calcula os totais automaticamente.'),
          stepP(5, 'Salve a Ata', 'Clique em "Salvar Ata e Itens". A ata ficará imediatamente disponível para consultas e emissão de autorizações.'),

          h2('Como Aplicar Reajustes Contratuais em Cascata'),
          p(
            'Ao completar 12 meses de vigência, se o fornecedor fizer jus ao reajuste por índice inflacionário, você pode aplicá-lo em lote com apenas um clique.'
          ),
          stepP(1, 'Localize a Ata na Tela Inicial de Atas', 'Na listagem de atas vigentes, clique no botão verde "Reajuste".'),
          stepP(2, 'Informe o Índice e o Percentual Acordado', 'Selecione o índice oficial (IPCA, INPC, IGP-M ou Setorial) e digite o percentual concedido (ex: 4.62%).'),
          stepP(3, 'Confirme a Operação', 'Clique em "Confirmar Reajuste". O sistema atualizará automaticamente o valor global da ata e recalculará os valores unitários de todos os itens cadastrados.'),

          h2('Como Emitir Autorização para Execução de Ata (AEA)'),
          p(
            'Quando um campus da UERN (Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal) ou setor da reitoria necessitar de materiais ou serviços da ata, você emitirá a AEA.'
          ),
          stepP(1, 'Acesse a Aba "2. Autorizações para Execução de Ata"', 'No topo da página de Atas, clique na segunda aba.'),
          stepP(2, 'Clique em "Nova Autorização de Execução"', 'O sistema abrirá a janela de autorização.'),
          stepP(3, 'Selecione a Ata e o Campus/Órgão Requisitante', 'Escolha a ata desejada. O sistema listará na mesma tela todos os itens com seus saldos físicos remanescentes.'),
          stepP(4, 'Informe as Quantidades Solicitadas', 'Digite a quantidade a autorizar em cada item. O sistema valida se há saldo suficiente e não permite autorizar quantitativo superior ao saldo disponível.'),
          stepP(5, 'Preencha o Processo SEI e Descrição da Demanda', 'Informe o número do processo de despesa do campus e a finalidade da contratação.'),
          stepP(6, 'Emita e Imprima o Termo Oficial', 'Clique em "Emitir Autorização de Execução". Na tabela de autorizações, clique no botão azul "Imprimir Termo" para visualizar e imprimir o documento timbrado da UERN para juntada ao processo SEI.'),

          h2('Como Autorizar Carona de Ata (Adesão de Órgão Não-Participante)'),
          p(
            'Conforme o Art. 86 da Lei Federal nº 14.133/2021, órgãos públicos externos podem solicitar adesão ("carona") à Ata da UERN, observando limites legais rigorosos.'
          ),
          stepP(1, 'Acesse a Aba "3. Autorizações de Carona de Ata"', 'Clique na terceira aba da página.'),
          stepP(2, 'Examine os Medidores Visuais de Saldo de Carona', 'O sistema exibe o teto de 50% para órgãos individuais e a barra de progresso do teto global cumulativo de 2x (dobro do valor da ata).'),
          stepP(3, 'Clique em "Autorizar Nova Carona"', 'Selecione a ata e informe o órgão externo (ex: Prefeitura Municipal de Mossoró, IFRN, etc.), o número do processo SEI e o valor pleiteado.'),
          stepP(4, 'Validação Legal Automática', 'O sistema avisa instantaneamente se o valor ultrapassar o limite individual de 50% ou o teto de 200% global, bloqueando adesões irregulares.'),
          stepP(5, 'Registre o Parecer do Gestor', 'Insira a justificativa técnica de vantajosidade e disponibilidade do fornecedor e confirme a autorização.'),

          h1('4. Guia do Fiscal Administrativo'),
          p(
            'O Fiscal Administrativo cuida do cumprimento das obrigações formais da empresa: certidões de regularidade (FGTS, INSS, CNDT), folha de pagamento de funcionários terceirizados e prazos de vigência.'
          ),

          h2('Conferência Mensal de Terceirização e Folha'),
          stepP(1, 'Acesse o Módulo "Terceirização & CCT"', 'Clique no menu lateral correspondente.'),
          stepP(2, 'Verifique a Lista de Trabalhadores', 'Confira se os funcionários alocados no campus correspondem aos cadastrados e se o piso salarial da Convenção Coletiva (CCT) está sendo cumprido.'),
          stepP(3, 'Preencha o Checklist de Regularidade', 'Antes de liberar a fatura para ateste, marque os itens verificados: Guia de FGTS recolhida, certidões negativas válidas e comprovante de vale-transporte/alimentação.'),

          h2('Acompanhamento da Conta Vinculada'),
          p(
            'Em contratos com dedicação exclusiva de mão de obra, parte do valor da fatura é retida em conta bancária bloqueada para garantir férias, 13º e rescisão dos trabalhadores.'
          ),
          stepP(1, 'Clique em "Conta Vinculada" no Menu', 'Você verá o saldo retido de cada contrato e o extrato de lançamentos.'),
          stepP(2, 'Conferir os Valores de Retenção', 'O sistema calcula automaticamente os percentuais das rubricas conforme o Caderno de Logística federal.'),
          stepP(3, 'Registrar Solicitação de Liberação', 'Quando a empresa comprovar que o funcionário gozou férias ou foi desligado, registre a liberação para homologação do Gestor.'),

          h1('5. Guia do Fiscal Técnico e Fiscal Setorial (Campi Avançados)'),
          p(
            'Você é os olhos da universidade no dia a dia da execução! Atua diretamente nos campi de Mossoró, Assú, Patu, Pau dos Ferros, Caicó ou Natal, acompanhando se a empresa está entregando o que prometeu.'
          ),

          h2('Como Realizar o Recebimento/Ateste Provisório'),
          stepP(1, 'Receba a Nota Fiscal ou Relatório de Execução', 'Quando a empresa entregar as mercadorias ou concluir o período de serviço mensal, pegue o número da Nota Fiscal.'),
          stepP(2, 'Conferência Física do Objeto', 'Verifique a quantidade, qualidade e conformidade com o que foi contratado.'),
          stepP(3, 'Acesse "Execução & Medições"', 'Vá para a aba "Controle de Saldo & Atestes". Se a medição ainda não estiver lançada, use o botão "Lançar Fatura / Medição".'),
          stepP(4, 'Aplique Glosas se Houve Falhas', 'Se a empresa deixou de cumprir algum item do serviço ou entregou materiais com defeito, informe o valor a descontar no campo "Valor da Glosa" e justifique o motivo.'),
          stepP(5, 'Clique em "Dar Ateste Provisório"', 'Clique no botão amarelo para atestar provisoriamente. Isso formaliza que o serviço foi recebido e encaminha o processo para a liquidação do Gestor.'),

          alertBox('Atenção ao Prazo', 'Conforme o art. 28 da IN 01/2026-PROAD, o Fiscal Técnico tem até 15 dias úteis para realizar o recebimento provisório após a apresentação da nota fiscal.'),

          h1('6. Guia da Equipe de Contabilidade e Orçamento (PROPLAN / DCO)'),
          p(
            'A equipe contábil utiliza o sistema para fechar o balanço orçamentário e patrimonial anual da UERN, cancelando sobras de empenho desnecessárias e preservando os saldos reais.'
          ),

          h2('Acesso e Emissão do Fechamento Contábil Anual'),
          stepP(1, 'Acesse "Relatórios & Fechamento"', 'Selecione a aba "Fechamento Contábil Anual (Fim de Ano - Contabilidade)".'),
          stepP(2, 'Analise os Cartões no Topo', 'Veja imediatamente:\n- Total Estimado em Aberto: todo o montante de empenhos abertos no exercício.\n- Empenhos a Manter: valor com perspectiva de execução futura pelo fornecedor.\n- Empenhos a Anular: valor recomendado para cancelamento e devolução ao orçamento.'),
          stepP(3, 'Filtre por Campus ou Exercício', 'Utilize os seletores para filtrar os processos de Mossoró, Assú, Patu, Pau dos Ferros, Caicó ou Natal, ou por contrato específico.'),
          stepP(4, 'Exporte para Planilha ou Documento Timbrado', 'Use "Exportar Excel (.xlsx)" para alimentar os sistemas contábeis do Estado (SIAFI/SIGEF) ou "Emitir Relatório PDF" para anexar ao processo de prestação de contas com as assinaturas da PROAD e PROPLAN.'),

          h1('7. Guia do Administrador da PROAD'),
          p(
            'Os administradores da Pró-Reitoria de Administração gerenciam a base de contratos, usuários e atas de registro de preços de toda a universidade.'
          ),

          h2('Como Cadastrar um Novo Contrato com Importação de Itens'),
          stepP(1, 'Vá para o Menu "Contratos & Empenhos"', 'Clique no botão azul "+ Novo Contrato".'),
          stepP(2, 'Preencha os Dados do Instrumento', 'Informe se é Contrato ou Empenho, número do processo SEI mãe, fornecedor, datas de vigência e valor global.'),
          stepP(3, 'Faça a Carga de Itens em Massa', 'Clique em "Importar Itens (.xlsx)" e envie a planilha oficial com a descrição, unidade, quantidades e preços.'),
          stepP(4, 'Salve ou Deixe em Rascunho', 'Você pode clicar em "Salvar Rascunho" a qualquer momento para continuar depois ou clicar em "Cadastrar Contrato" para oficializar o registro.'),

          h2('Como Designar Fiscais e Gestores'),
          stepP(1, 'Abra o Contrato ou vá ao Menu "Gestores & Fiscais"', 'Localize o contrato que receberá a equipe.'),
          stepP(2, 'Clique em "Designar Responsável"', 'Selecione o servidor, informe a função (Gestor, Suplente, Fiscal Administrativo, Técnico ou Setorial), o número da Portaria e o ID do documento no SEI.'),

          h2('Como Cadastrar um Usuário com Perfil Gestor de Ata (ARP)'),
          stepP(1, 'Vá para o Menu "Gestão de Usuários"', 'No menu lateral, sob a seção Administração, clique em "Gestão de Usuários".'),
          stepP(2, 'Clique em "Cadastrar Administrador / Usuário"', 'Clique no botão azul no topo da página.'),
          stepP(3, 'Selecione o Perfil "Gestor de Ata de Registro de Preço (ARP)"', 'Preencha o nome do servidor, e-mail institucional, matrícula e no campo "Papel / Nível de Acesso" selecione a opção "Gestor de Ata de Registro de Preço (ARP)".'),
          stepP(4, 'Confirme o Cadastro', 'Clique em "Salvar Usuário". O usuário receberá a credencial inicial e passará a ter acesso exclusivo ao módulo de Atas.'),

          h2('Como Editar Usuários e Resetar Senhas'),
          p('Como administrador, você pode atualizar as informações de qualquer servidor cadastrado no sistema.'),
          stepP(1, 'Localize o Usuário', 'Na tabela de "Gestão de Usuários", utilize a busca ou localize o servidor desejado.'),
          stepP(2, 'Clique no Botão "Editar"', 'Na coluna "Ações", clique no botão azul com o ícone de lápis correspondente ao usuário.'),
          stepP(3, 'Atualize os Dados Necessários', 'Modifique o nome completo, matrícula, papel institucional de acesso ou ative/inative a conta conforme portarias da PROAD.'),
          stepP(4, 'Redefinir Senha do Servidor', 'Caso o usuário tenha esquecido a senha, marque a opção "Resetar senha para padrão institucional (\'123\')". O sistema redefinirá a credencial e exigirá a criação de nova senha no próximo login dele.'),
          stepP(5, 'Salvar Alterações', 'Clique em "Salvar Alterações" para confirmar as modificações.'),

          h2('Como Excluir ou Inativar Usuários (Regras de Segurança)'),
          p('Para manter a higienização da base institucional sem violar a rastreabilidade pública dos processos contratuais:'),
          stepP(1, 'Clique em "Excluir"', 'Na coluna "Ações" do usuário, clique no botão vermelho de exclusão.'),
          stepP(2, 'Analise o Alerta de Integridade', 'O sistema verifica se o servidor é o administrador atualmente conectado (bloqueando auto-exclusão acidental) ou se ele é signatário de ordens de serviço/compra ou responsável por atas vigentes.'),
          stepP(3, 'Inativação vs. Exclusão', 'Se o usuário já emitiu documentos oficiais com chancela criptográfica, utilize a edição para desmarcar o status "Conta Ativa" (inativação), preservando o histórico da universidade.'),
          stepP(4, 'Confirmar Exclusão', 'Para servidores sem histórico vinculante, confirme na janela modal clicando em "Sim, Excluir Definitivamente".'),

          h2('Como Editar ou Excluir Faturas e Despesas Não Atestadas (Módulo Execução)'),
          p('Erros materiais em lançamentos operacionais podem ser retificados ou expurgados exclusivamente pela PROAD antes da certificação final:'),
          stepP(1, 'Aba "Saldos de Contratos & Despesas Abertas"', 'Na listagem de despesas, clique em "Editar" para corrigir referências e processos SEI. Caso o lançamento esteja com status Aberta ou com valor atestado zerado, clique em "Excluir" para cancelar a estimativa errônea.'),
          stepP(2, 'Aba "Controle de Saldo & Atestes"', 'Localize a medição e clique em "Editar" para retificar o número da NF, competência ou valores. Se a fatura ainda não tiver recebido o Ateste Definitivo e não estiver liquidada/paga, você pode utilizar o botão "Excluir" para removê-la com segurança.'),
          stepP(3, 'Aba "Ordens de Serviços Emitidas"', 'Clique em "Editar" no card da ordem para retificar o valor estimado ou descrição do serviço. Se a ordem não possuir medições atestadas definitivamente, clique em "Excluir" para expurgar a ordem incorreta.'),

          alertBox('Bloqueio Legal de Exclusão', 'Faturas e despesas que já receberam o Ateste Definitivo do Gestor ou foram liquidadas e pagas possuem valor probatório contábil e NÃO podem ser excluídas sob nenhuma hipótese, garantindo conformidade com as diretrizes do TCE/RN e CGE.'),

          h1('8. Perguntas Frequentes (FAQ)'),
          bullet('P: Não vejo o botão de Ordem de Compra. O que aconteceu? ', 'R: O sistema verifica os seus contratos. Se você só for responsável por contratos de prestação de serviços ou obras, o botão de compra é ocultado automaticamente para não causar confusão.'),
          bullet('P: Quem pode ver o menu "Gestão de Atas (ARP)"? ', 'R: O menu de Atas é estritamente exclusivo. Somente administradores da PROAD e o usuário formalmente designado com o papel de Gestor de Ata de Registro de Preço (ARP) conseguem visualizá-lo.'),
          bullet('P: O que é o código Hash que sai no PDF da Ordem? ', 'R: É uma chancela eletrônica de segurança institucional (SHA-256). Ela garante que aquele documento foi emitido pelo sistema da UERN e impede qualquer falsificação de valores ou assinaturas.'),
          bullet('P: Posso alterar minha decisão contábil de fim de ano? ', 'R: Sim. Enquanto o exercício não for encerrado formalmente pela Contabilidade, você pode reabrir a despesa em "Relatórios & Fechamento" e atualizar sua justificativa.'),
          bullet('P: Onde tiro dúvidas sobre normativos da UERN? ', 'R: No menu "Base de Normativos", você pode consultar e baixar a íntegra da IN nº 01/2026-PROAD, a Lei 14.133/2021 e o Caderno de Logística.'),

          h1('9. Contatos e Suporte'),
          p('Em caso de dúvidas operacionais ou dificuldades de acesso, entre em contato com a equipe de suporte:'),
          bullet('Pró-Reitoria de Administração (PROAD/UERN): ', 'proad@uern.br | Ramal interno: 2100'),
          bullet('Setor de Contratos e Convênios: ', 'contratos@uern.br | Ramal interno: 2105'),
          bullet('Diretoria de Tecnologia da Informação (DTI/UERN): ', 'dti@uern.br | Chamados: suporte.uern.br'),
        ],
      },
    ],
  });

  return doc;
}

async function run() {
  const doc = createDoc();
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '..', 'docs', 'Manual_de_Uso_SGC_UERN.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Manual de Uso gerado com sucesso em:', outPath);
}

run().catch(console.error);
