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
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 19 })],
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
          children: [new TextRun({ text, bold, size: 18, color: '1E293B' })],
        }),
      ],
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
    });

  const titleP = (text) =>
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, size: 34, color: '003366', font: 'Calibri' })],
    });

  const subtitleP = (text) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text, size: 21, color: '475569', font: 'Calibri', italic: true })],
    });

  const h1 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 140 },
      children: [new TextRun({ text, bold: true, size: 26, color: '003366', font: 'Calibri' })],
    });

  const h2 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      children: [new TextRun({ text, bold: true, size: 22, color: '1E293B', font: 'Calibri' })],
    });

  const h3 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 180, after: 80 },
      children: [new TextRun({ text, bold: true, size: 20, color: '334155', font: 'Calibri' })],
    });

  const p = (text) =>
    new Paragraph({
      spacing: { before: 70, after: 90 },
      alignment: AlignmentType.JUSTIFY,
      children: [new TextRun({ text, size: 20, color: '334155', font: 'Calibri' })],
    });

  const codeP = (text) =>
    new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text, font: 'Consolas', size: 18, color: '0F172A' })],
    });

  const bullet = (boldPrefix, text) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 50, after: 50 },
      alignment: AlignmentType.JUSTIFY,
      children: [
        new TextRun({ text: boldPrefix, bold: true, size: 20, color: '0F172A', font: 'Calibri' }),
        new TextRun({ text, size: 20, color: '334155', font: 'Calibri' }),
      ],
    });

  const techBox = (title, text) =>
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
              margins: { top: 120, bottom: 120, left: 180, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `${title}: `, bold: true, size: 19, color: '003366', font: 'Calibri' }),
                    new TextRun({ text, size: 19, color: '334155', font: 'Calibri' }),
                  ],
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
          titleP('ESPECIFICAÇÃO TÉCNICA E ARQUITETURA DE SOFTWARE'),
          subtitleP('Sistema de Gestão e Fiscalização de Contratos e Atas da UERN (SGC-UERN)\nDocumento de Engenharia de Software para a Equipe de TI (DTI/UERN)'),

          techBox(
            'Finalidade do Documento',
            'Este documento técnico consolida toda a arquitetura de software, stack tecnológica, modelo de dados relacional, matriz RBAC de segurança, especificação de endpoints REST e roteiro de implantação/operação do sistema SGC-UERN para subsidiar a equipe de TI da UERN.'
          ),

          h1('1. Visão Geral do Sistema e Stack Tecnológica'),
          p(
            'O SGC-UERN foi construído utilizando uma arquitetura moderna fullstack orientada a componentes e APIs RESTful assíncronas. O ecossistema adotado garante alta performance, tipagem estática ponta a ponta e escalabilidade:'
          ),
          bullet('Frontend & Framework: ', 'Next.js 14.2 (App Router) com React 18 e TypeScript 5.6.'),
          bullet('Estilização & UI: ', 'TailwindCSS 3.4 com design responsivo, tokens institucionais e Lucide React para iconografia.'),
          bullet('ORM & Banco de Dados: ', 'Prisma ORM 5.22.0 sobre banco de dados relacional PostgreSQL 14+ (compatível com instalação on-premise na DTI ou nuvem).'),
          bullet('Segurança e Autenticação: ', 'JSON Web Tokens (JWT) assinados via biblioteca jose (HMAC-SHA256) armazenados em cookies HttpOnly/SameSite, com senhas criptografadas via bcryptjs (10 salt rounds).'),
          bullet('Documentos e Planilhas: ', 'Geração de relatórios e ordens de serviço/compra com jsPDF e jspdf-autotable; processamento e importação em lote de planilhas Excel via xlsx; e documentação corporativa em docx.'),

          h1('2. Arquitetura de Software e Topologia em Camadas'),
          p(
            'A aplicação estrutura-se em 5 camadas lógicas desacopladas que favorecem a manutenibilidade e auditoria:'
          ),
          bullet('1. Camada de Apresentação (Client Components): ', 'Localizada em src/app/(dashboard) e src/components, encapsula toda a interface de usuário, gráficos, tabelas dinâmicas e formulários com validação em tempo de execução.'),
          bullet('2. Camada de Interceptação e Segurança (Middleware): ', 'Localizada em src/middleware.ts, processa cada requisição HTTP, intercepta rotas privadas (/dashboard, /contratos, /execucao, /relatorios, etc.), decodifica o JWT e redireciona usuários não autenticados para /login.'),
          bullet('3. Camada de Endpoints RESTful (Route Handlers): ', 'Localizada em src/app/api/*, implementa os verbos HTTP (GET, POST, PUT, PATCH, DELETE) retornando payloads padronizados em formato application/json.'),
          bullet('4. Camada de Negócio e Controle de Acesso (RBAC): ', 'Localizada em src/lib/rbac.ts e src/lib/auth.ts, centraliza todas as regras de autorização institucional (ex: canPerformDefinitiveAttest, canIssueOrder, getUserDesignatedContext).'),
          bullet('5. Camada de Acesso a Dados (Prisma Singleton): ', 'Localizada em src/lib/prisma.ts, instancia o Prisma Client de forma resiliente ao hot-reload em ambiente de desenvolvimento e com pool de conexões otimizado para produção.'),

          h1('3. Modelo de Segurança e Controle de Acesso Baseado em Papéis (RBAC)'),
          p(
            'O SGC-UERN adota uma matriz RBAC refinada com dupla camada de checagem: o papel global do usuário e a designação funcional por contrato.'
          ),

          h2('Papéis Globais no Sistema (Enum Role)'),
          bullet('ADMIN_PROAD: ', 'Acesso irrestrito a todos os módulos, parametrizações globais, atas, contratos de todos os campi e relatórios analíticos da universidade.'),
          bullet('ADMIN_PARCIAL: ', 'Acesso administrativo de suporte operacional à PROAD.'),
          bullet('GESTOR_ATA: ', 'Gestor de Ata de Registro de Preço (ARP) com prerrogativas exclusivas para cadastro de atas e itens, controle de saldos, aplicação de reajustes, emissão de Autorizações de Execução de Ata (AEA) e gestão de Caronas de órgãos externos (Lei 14.133/2021).'),
          bullet('GESTOR: ', 'Servidor titular responsável pela coordenação do contrato, emissão de OS/OC, ateste definitivo e parecer de fechamento contábil.'),
          bullet('SUPLENTE: ', 'Substituto legal do Gestor, com prerrogativas equivalentes em períodos de vacância ou ausência.'),
          bullet('FISCAL_ADMINISTRATIVO: ', 'Responsável pela fiscalização documental, certidões, folha de terceirizados, cálculo de conta vinculada e emissão de ordens.'),
          bullet('FISCAL_TECNICO: ', 'Responsável pela conferência in loco da execução do serviço/obra e emissão do Ateste Provisório.'),
          bullet('FISCAL_SETORIAL: ', 'Responsável pelo acompanhamento regionalizado da execução no respectivo campus (Assú, Patu, Pau dos Ferros, Caicó, Natal).'),
          bullet('FORNECEDOR: ', 'Acesso restrito para consulta aos seus contratos, atas e envio de faturas.'),

          h2('Segregação Funcional por Contrato (ContratoResponsavel)'),
          p(
            'A tabela associativa contrato_responsaveis vincula o usuário ao contrato com os seguintes campos essenciais:'
          ),
          codeP('- contratoId: chave estrangeira do Contrato (UUID)\n- userId: chave estrangeira do Usuário (UUID)\n- tipoAtuacao: Role específica assumida no contrato\n- numeroAtoDesignacao: número da Portaria oficial da PROAD\n- idSeiAtoDesignacao: identificador do processo no SEI\n- campusSetor: identificação do campus atendido\n- ativo: booleano indicando vigência da designação'),
          p(
            'Essa modelagem permite que um servidor atue como Gestor no Contrato A (onde pode emitir ateste definitivo) e atue apenas como Fiscal Técnico no Contrato B (onde só tem permissão para ateste provisório).'
          ),

          h2('Assinatura e Verificação de Autenticidade (Chancela Criptográfica)'),
          p(
            'Toda Ordem de Serviço (OS) ou de Compra (OC) gerada pelo sistema recebe uma chancela eletrônica irretratável calculada via algoritmo SHA-256:'
          ),
          codeP('Hash = SHA256(contratoId + ":" + numeroOs + ":" + processoSei + ":" + userId + ":" + timestamp).slice(0, 32)'),
          p(
            'O código resultante é impresso no documento oficial timbrado, permitindo a auditores externos, fornecedores e órgãos de controle (CGE, TCE/RN) atestar a autenticidade do ato administrativo.'
          ),

          h1('4. Modelagem do Banco de Dados (Schema Prisma)'),
          p(
            'O banco de dados relacional é estruturado em tabelas principais interconectadas com integridade referencial estrita:'
          ),
          bullet('usuarios (User): ', 'Armazena credenciais, e-mail institucional, matrícula, papel global (incluindo GESTOR_ATA) e status de troca de senha.'),
          bullet('contratos (Contrato): ', 'Entidade central com número de contrato/empenho, processo SEI mãe, fornecedor, vigências, valores globais e atualizados, tipologia contratual e status.'),
          bullet('contrato_itens (ContratoItem): ', 'Detalhamento de cada item do contrato (descrição, unidade, quantidade inicial/atual, valor unitário/total, limite legal de acréscimo 25%/50%).'),
          bullet('contrato_indices (ContratoIndice): ', 'Índices de reajuste (IPCA, INPC, IGP-M, FIPE) e datas-bases contratuais.'),
          bullet('contrato_responsaveis (ContratoResponsavel): ', 'Matriz de fiscais e gestores designados por contrato com ato SEI.'),
          bullet('atas_registro_preco (AtaRegistroPreco) e ata_itens: ', 'Registro de atas, vigência, fornecedor, gestorId, campos de reajuste (indiceReajuste, percentualUltimoReajuste, dataUltimoReajuste), itens registrados e saldo disponível.'),
          bullet('ata_autorizacoes_execucao (AtaAutorizacaoExecucao): ', 'Emissões formais de autorizações de execução para os campi da UERN (AEA), com número oficial, processo SEI, órgão requisitante, valor total e dedução de saldos.'),
          bullet('ata_adesoes (AtaAdesao): ', 'Controle de adesões externas (caronas) com travas algorítmicas de 50% por órgão individual e limite global cumulativo de 2x o valor da ata (Art. 86 Lei 14.133/21).'),
          bullet('ordens_servico (OrdemServico): ', 'Registro de OS e OC emitidas com chancela eletrônica SHA-256 e descrição do objeto.'),
          bullet('medicoes_despesa (MedicaoDespesa): ', 'Registro de medições mensais, notas fiscais, glosas, ateste provisório e ateste definitivo.'),
          bullet('despesas_execucao (DespesaExecucao): ', 'Controle de saldos de despesas abertas (provisionadas) vs atestadas e parecer de fechamento contábil anual (MANTER vs ANULAR_CANCELAR).'),
          bullet('trabalhadores_terceirizados e convenios_coletivos: ', 'Mão de obra terceirizada, remunerações e parametrizações de CCT.'),
          bullet('conta_vinculada_movimentacoes: ', 'Lançamentos de retenção e liberação de férias, 13º e rescisão (Caderno de Logística).'),
          bullet('penalidades (Penalidade) e alertas_sistema: ', 'Sanções aplicadas (Lei 14.133/21) e notificações preventivas automáticas.'),

          h1('5. Especificação de Endpoints RESTful'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                children: [
                  headerCell('Método & Rota', 35),
                  headerCell('Perfil Mínimo', 20),
                  headerCell('Descrição Técnica', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('POST /api/auth/login', 35, AlignmentType.LEFT, true),
                  bodyCell('Público', 20),
                  bodyCell('Autentica usuário, gera JWT e armazena em cookie HttpOnly seguro.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET /api/auth/me', 35, AlignmentType.LEFT, true),
                  bodyCell('Autenticado', 20),
                  bodyCell('Retorna sessão atual, contexto de contratos vinculados e permissões RBAC.', 45),
                ],
              }),
               new TableRow({
                children: [
                  bodyCell('GET, POST /api/usuarios', 35, AlignmentType.LEFT, true),
                  bodyCell('Admin PROAD', 20),
                  bodyCell('Listagem e cadastro de novos usuários com definição de papéis institucionais.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, PUT, DELETE /api/usuarios/[id]', 35, AlignmentType.LEFT, true),
                  bodyCell('Admin PROAD', 20),
                  bodyCell('Consulta, edição cadastral, reset de senha para "123" e exclusão com proteção contra auto-exclusão.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST /api/contratos', 35, AlignmentType.LEFT, true),
                  bodyCell('Gestor / Admin', 20),
                  bodyCell('Listagem filtrada por vínculo ou cadastro de novo contrato/empenho.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('POST /api/contratos/importar-lote', 35, AlignmentType.LEFT, true),
                  bodyCell('Admin PROAD', 20),
                  bodyCell('Recebe planilha XLSX com itens e grava no banco em transação atômica.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST, PUT, DELETE /api/execucao/os', 35, AlignmentType.LEFT, true),
                  bodyCell('Gestor / Fiscal / Admin', 20),
                  bodyCell('Emissão (com SHA-256), edição de dados e exclusão restrita a ordens sem medições atestadas.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST, PUT, PATCH, DELETE /api/execucao/medicoes', 35, AlignmentType.LEFT, true),
                  bodyCell('Fiscal / Gestor / Admin', 20),
                  bodyCell('Atestes provisório e definitivo, retificação de dados e exclusão de faturas não atestadas.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST, PUT, DELETE /api/execucao/saldos', 35, AlignmentType.LEFT, true),
                  bodyCell('Autenticado / Admin', 20),
                  bodyCell('Consulta, carga em lote, edição e exclusão de despesas estimativas em aberto.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST /api/atas', 35, AlignmentType.LEFT, true),
                  bodyCell('PROAD / Gestor Ata', 20),
                  bodyCell('Listagem e cadastro de Atas de Registro de Preços e itens com saldo inicial.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, PUT /api/atas/[id]', 35, AlignmentType.LEFT, true),
                  bodyCell('PROAD / Gestor Ata', 20),
                  bodyCell('Retificação cadastral e aplicação de reajustes contratuais em cascata.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST /api/atas/autorizacoes', 35, AlignmentType.LEFT, true),
                  bodyCell('PROAD / Gestor Ata', 20),
                  bodyCell('Emissão de Autorização de Execução de Ata (AEA) com dedução de saldo de itens.', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET, POST, PATCH /api/atas/adesao', 35, AlignmentType.LEFT, true),
                  bodyCell('PROAD / Gestor Ata', 20),
                  bodyCell('Gestão de Caronas com validação estrita dos limites da Lei 14.133 (50% e 2x).', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('GET /api/relatorios/fechamento-contabil', 35, AlignmentType.LEFT, true),
                  bodyCell('Gestor / Admin', 20),
                  bodyCell('Consolida despesas estimadas do exercício (Total, A Manter, A Anular).', 45),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell('PATCH /api/relatorios/fechamento-contabil', 35, AlignmentType.LEFT, true),
                  bodyCell('Gestor do Contrato', 20),
                  bodyCell('Registra parecer (MANTER vs ANULAR) e justificativa contábil do gestor.', 45),
                ],
              }),
            ],
          }),

          h1('6. Guia de Implantação e Operação (DevOps / Infraestrutura)'),

          h2('Requisitos Mínimos de Servidor'),
          bullet('Sistema Operacional: ', 'Linux Ubuntu 22.04 LTS, Debian 12 ou Rocky Linux 9.'),
          bullet('Processamento e Memória: ', 'Mínimo de 2 vCPUs e 4 GB de memória RAM.'),
          bullet('Armazenamento: ', 'Mínimo de 30 GB SSD disponível.'),
          bullet('Ambiente de Execução: ', 'Node.js v20.x ou v22.x LTS e npm v10+.'),
          bullet('Banco de Dados: ', 'PostgreSQL 14, 15 ou 16 com extensão pgcrypto habilitada.'),

          h2('Variáveis de Ambiente (.env)'),
          codeP(
            '# Conexão com o PostgreSQL (Pooler com SSL habilitado)\n' +
            'DATABASE_URL="postgresql://usuario:senha@host:5432/sgc_uern?sslmode=require&pgbouncer=true"\n' +
            'DIRECT_URL="postgresql://usuario:senha@host:5432/sgc_uern?sslmode=require"\n\n' +
            '# Chave Secreta para Assinatura dos Tokens JWT\n' +
            'JWT_SECRET="uern_sgc_super_secret_key_2026_proad_dti_security_token"\n\n' +
            '# URL Base da Aplicação\n' +
            'NEXT_PUBLIC_APP_URL="https://contratos.uern.br"'
          ),

          h2('Passo a Passo de Instalação e Deploy'),
          bullet('1. Clonar repositório: ', 'git clone <url-repositorio> sgc-uern && cd sgc-uern'),
          bullet('2. Instalar dependências: ', 'npm ci --production=false'),
          bullet('3. Gerar artefatos Prisma: ', 'npx prisma generate'),
          bullet('4. Sincronizar banco de dados: ', 'npx prisma db push (ou prisma migrate deploy)'),
          bullet('5. Executar carga inicial (seed): ', 'node prisma/seed.js'),
          bullet('6. Gerar build de produção: ', 'npm run build'),
          bullet('7. Iniciar com gerenciador de processos: ', 'pm2 start npm --name "sgc-uern" -- start -p 3000'),

          h2('Configuração de Proxy Reverso Nginx'),
          codeP(
            'server {\n' +
            '    listen 80;\n' +
            '    server_name contratos.uern.br;\n' +
            '    return 301 https://$host$request_uri;\n' +
            '}\n\n' +
            'server {\n' +
            '    listen 443 ssl http2;\n' +
            '    server_name contratos.uern.br;\n\n' +
            '    ssl_certificate /etc/letsencrypt/live/contratos.uern.br/fullchain.pem;\n' +
            '    ssl_certificate_key /etc/letsencrypt/live/contratos.uern.br/privkey.pem;\n\n' +
            '    location / {\n' +
            '        proxy_pass http://127.0.0.1:3000;\n' +
            '        proxy_http_version 1.1;\n' +
            '        proxy_set_header Upgrade $http_upgrade;\n' +
            '        proxy_set_header Connection "upgrade";\n' +
            '        proxy_set_header Host $host;\n' +
            '        proxy_cache_bypass $http_upgrade;\n' +
            '        proxy_set_header X-Real-IP $remote_addr;\n' +
            '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n' +
            '        proxy_set_header X-Forwarded-Proto $scheme;\n' +
            '    }\n' +
            '}'
          ),

          h2('Rotina de Backup e Recuperação de Desastres'),
          p(
            'Recomenda-se a inclusão do script de backup no crontab do servidor de banco de dados para execução diária às 02:00h com expurgo de arquivos com mais de 30 dias:'
          ),
          codeP('pg_dump -U postgres -d sgc_uern -F c -b -v -f "/var/backups/sgc_uern_$(date +\\%Y\\%m\\%d_\\%H\\%M).dump"'),

          h1('7. Considerações Finais de Manutenibilidade'),
          p(
            'O código-fonte segue as convenções e boas práticas estabelecidas pelo ecossistema Next.js e TypeScript. Todas as migrações de banco devem ser gerenciadas via Prisma Migrate e os testes de conformidade de rotas podem ser executados com o script scripts/test-endpoints.js para validação contínua.'
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
  const outPath = path.join(__dirname, '..', 'docs', 'Documento_Tecnico_Arquitetura_SGC_UERN.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Documento Técnico gerado com sucesso em:', outPath);
}

run().catch(console.error);
