const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do SGC-UERN...');

  // 1. Criar Administrador Inicial PROAD (conforme especificado)
  const senhaHash = await bcrypt.hash('123', 10);
  
  const adminProad = await prisma.user.upsert({
    where: { email: 'proad@uern.br' },
    update: {},
    create: {
      nome: 'Pró-Reitoria de Administração (PROAD)',
      email: 'proad@uern.br',
      matricula: '08155-8',
      senhaHash: senhaHash,
      role: 'ADMIN_PROAD',
      deveTrocarSenha: true, // Força a troca no 1º login
      ativo: true,
    },
  });
  console.log('Admin PROAD criado/verificado:', adminProad.email);

  // 2. Criar Normativos Oficiais da Base Institucional
  const normativos = [
    {
      titulo: 'Instrução Normativa nº 01/2026 – PROAD/UERN',
      tipo: 'INSTRUCAO_NORMATIVA',
      numero: '01',
      ano: 2026,
      orgaoEmissor: 'PROAD/UERN',
      descricao: 'Dispõe sobre diretrizes, procedimentos e responsabilidades na gestão e fiscalização de contratos e atas no âmbito da UERN.',
      arquivoUrl: '/docs/normativos/IN 01.2026 - PROAD-UERN - Gestão e Fiscalização de Contratos e Atas.pdf',
      criadoPorId: adminProad.id,
    },
    {
      titulo: 'Instrução Normativa nº 05/2017 – MPOG / Governo Federal',
      tipo: 'INSTRUCAO_NORMATIVA',
      numero: '05',
      ano: 2017,
      orgaoEmissor: 'Ministério do Planejamento (Federal)',
      descricao: 'Diretrizes gerais de contratação, gestão e fiscalização de serviços sob o regime de execução indireta.',
      arquivoUrl: '/docs/normativos/IN 05.2017 - GOV FEDERAL.pdf',
      criadoPorId: adminProad.id,
    },
    {
      titulo: 'Caderno de Logística – Conta Vinculada',
      tipo: 'CADERNO_LOGISTICA',
      numero: 'Caderno de Logística',
      ano: 2024,
      orgaoEmissor: 'Secretaria de Gestão e Inovação',
      descricao: 'Manual operacional com fórmulas de retenção de provisões trabalhistas (férias, 13º, multa FGTS) para contratos terceirizados.',
      arquivoUrl: '/docs/normativos/CADERNO LOGISTICA - CONTA VINCULADA.pdf',
      criadoPorId: adminProad.id,
    },
    {
      titulo: 'Cartilha AGU – Perguntas Frequentes em Contratações Públicas (v3)',
      tipo: 'LEGISLACAO',
      numero: 'Versão 3',
      ano: 2023,
      orgaoEmissor: 'Advocacia-Geral da União',
      descricao: 'Guia de orientação jurídica e boas práticas segundo a Lei nº 14.133/2021.',
      arquivoUrl: '/docs/normativos/CARTILHA AGU - Perguntas Frequentes em Contratações Públicas e Matéria Administrativa - v3 - 11.2023.pdf',
      criadoPorId: adminProad.id,
    },
  ];

  for (const norm of normativos) {
    const existing = await prisma.normativo.findFirst({
      where: { titulo: norm.titulo },
    });
    if (!existing) {
      await prisma.normativo.create({ data: norm });
      console.log('Normativo cadastrado:', norm.titulo);
    }
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
