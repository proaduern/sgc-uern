const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Populando Contratos Contínuos de Exemplo no SGC-UERN ---');

  // 1. Fornecedores
  const f1 = await prisma.fornecedor.upsert({
    where: { cnpj: '08.912.345/0001-99' },
    update: {},
    create: {
      razaoSocial: 'Potiguar Segurança e Vigilância Privada Ltda',
      nomeFantasia: 'Potiguar Segurança',
      cnpj: '08.912.345/0001-99',
      email: 'contato@potiguarseguranca.com.br',
      telefone: '(84) 3312-4000',
    },
  });

  const f2 = await prisma.fornecedor.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      razaoSocial: 'Engenharia Fácil e Manutenções Ltda',
      nomeFantasia: 'Engenharia Fácil',
      cnpj: '12.345.678/0001-90',
      email: 'contato@engenhariafacil.com.br',
      telefone: '(84) 3322-9988',
    },
  });

  const f3 = await prisma.fornecedor.upsert({
    where: { cnpj: '24.567.890/0001-11' },
    update: {},
    create: {
      razaoSocial: 'Ascensores Potiguares Engenharia Ltda',
      nomeFantasia: 'Ascensores Potiguares',
      cnpj: '24.567.890/0001-11',
      email: 'manutencao@ascensores.com.br',
      telefone: '(84) 3211-5500',
    },
  });

  // 2. Contrato 1: Vigilância Armada e Desarmada (Vigência até 25/11/2027)
  const c1 = await prisma.contrato.create({
    data: {
      numeroContrato: 'Contrato nº 18/2023',
      processoSeiMae: '04410023.001928/2023-41',
      licitacaoProcedimento: 'Pregão Eletrônico nº 14/2023',
      objeto: 'Contratação de empresa especializada na prestação de serviços continuados de vigilância armada e desarmada para os Campi da UERN.',
      tipoVigencia: 'CONTINUADO',
      tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
      vigenciaInicio: new Date('2023-11-26'),
      vigenciaFim: new Date('2027-11-25'),
      anosVigencia: 4,
      valorGlobal: 14850000.0,
      valorAtualizado: 14850000.0,
      status: 'ATIVO',
      fornecedorId: f1.id,
    },
  });

  // 3. Contrato 2: Limpeza e Conservação Predial (Vigência até 09/05/2026)
  const c2 = await prisma.contrato.create({
    data: {
      numeroContrato: 'Contrato nº 09/2024',
      processoSeiMae: '04410055.000842/2024-19',
      licitacaoProcedimento: 'Pregão Eletrônico nº 05/2024',
      objeto: 'Prestação de serviços contínuos de limpeza, asseio e conservação predial para as unidades acadêmicas e administrativas da UERN.',
      tipoVigencia: 'CONTINUADO',
      tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
      vigenciaInicio: new Date('2024-05-10'),
      vigenciaFim: new Date('2026-05-09'),
      anosVigencia: 2,
      valorGlobal: 5280000.0,
      valorAtualizado: 5280000.0,
      status: 'ATIVO',
      fornecedorId: f2.id,
    },
  });

  // 4. Contrato 3: Manutenção de Elevadores (Vigência até 31/01/2026)
  const c3 = await prisma.contrato.create({
    data: {
      numeroContrato: 'Contrato nº 03/2025',
      processoSeiMae: '04410088.000123/2025-05',
      licitacaoProcedimento: 'Dispensa de Licitação nº 02/2025',
      objeto: 'Serviços continuados de manutenção preventiva e corretiva para elevadores e plataformas elevatórias da UERN.',
      tipoVigencia: 'CONTINUADO',
      tipoContrato: 'SERVICO_SEM_DEDICACAO',
      vigenciaInicio: new Date('2025-02-01'),
      vigenciaFim: new Date('2026-01-31'),
      anosVigencia: 1,
      valorGlobal: 240000.0,
      valorAtualizado: 240000.0,
      status: 'ATIVO',
      fornecedorId: f3.id,
    },
  });

  console.log('3 Contratos contínuos cadastrados com sucesso:');
  console.log('- Vigilância (até 25/11/2027) -> Alimenta PCA 2027');
  console.log('- Limpeza (até 09/05/2026) -> Alimenta PCA 2026');
  console.log('- Elevadores (até 31/01/2026) -> Alimenta PCA 2026');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
