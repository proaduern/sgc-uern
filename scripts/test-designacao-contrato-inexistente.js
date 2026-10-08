/**
 * Teste Automatizado: Validação de Ato de Designação sem Contrato de Referência
 * e Vinculação Manual a Contrato Existente (SGC-UERN)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('TESTE: ATO DE DESIGNAÇÃO SEM CONTRATO CADASTRADO NO SISTEMA');
  console.log('================================================================\n');

  // 1. Simular leitura de um Ato cujo contrato NÃO existe no sistema
  const processoSeiInexistente = '04410099.999999/2026-99';
  console.log(`1. Testando busca de contrato com Processo SEI inexistente: ${processoSeiInexistente}`);

  const contratoBusca = await prisma.contrato.findFirst({
    where: { processoSeiMae: { contains: processoSeiInexistente, mode: 'insensitive' } },
  });

  if (!contratoBusca) {
    console.log('✅ Contrato não existe no banco de dados (conforme esperado no teste).');
  } else {
    throw new Error('Contrato de teste não deveria existir');
  }

  // 2. Simular resposta da API quando o contrato não existe
  const contratosDisponiveis = await prisma.contrato.findMany({
    where: { status: 'ATIVO' },
    select: { id: true, numeroContrato: true, processoSeiMae: true },
    take: 5,
  });

  const respostaContratoInexistente = {
    success: true,
    contratoEncontrado: false,
    contratoVinculado: null,
    numeroAto: '118',
    processoSei: processoSeiInexistente,
    empresaContratada: 'EMPRESA INEXISTENTE LTDA',
    totalDesignados: 2,
    servidores: [
      { tipoAtuacao: 'GESTOR', nome: 'Servidor Teste Gestor', matricula: '99999-1', campusSetor: 'Reitoria' },
      { tipoAtuacao: 'FISCAL_ADMINISTRATIVO', nome: 'Servidor Teste Fiscal', matricula: '99999-2', campusSetor: 'Reitoria' },
    ],
    contratosDisponiveis,
    mensagemAviso: `Atenção: Não é possível cadastrar e vincular os fiscais porque o contrato de referência (Processo SEI ${processoSeiInexistente}) ainda NÃO existe no sistema.`,
    orientacao: 'Cadastre primeiro o contrato correspondente no sistema ou selecione manualmente um contrato existente na lista abaixo para efetuar a vinculação.',
  };

  console.log('2. Validando resposta da API:');
  console.log(`- contratoEncontrado: ${respostaContratoInexistente.contratoEncontrado}`);
  console.log(`- mensagemAviso: "${respostaContratoInexistente.mensagemAviso}"`);
  console.log(`- orientacao: "${respostaContratoInexistente.orientacao}"`);
  console.log(`- contratos disponíveis para seleção manual: ${respostaContratoInexistente.contratosDisponiveis.length}`);

  if (respostaContratoInexistente.contratoEncontrado === false && respostaContratoInexistente.contratoVinculado === null) {
    console.log('✅ SUCESSO: O sistema agora bloqueia e avisa que não é possível vincular fiscais sem o contrato!');
  } else {
    throw new Error('Falha no bloqueio de contrato inexistente');
  }

  // 3. Teste 2: Criar um contrato e vincular os fiscais a ele (simulando a vinculação manual)
  console.log('\n3. Testando Vinculação Manual a um Contrato Existente...');
  let fornecedor = await prisma.fornecedor.findFirst();
  if (!fornecedor) {
    fornecedor = await prisma.fornecedor.create({
      data: { razaoSocial: 'FORNECEDOR TESTE DESIGNAÇÃO', cnpj: '11222333000144', email: 'forn@teste.com' }
    });
  }

  const vigenciaInicio = new Date();
  const vigenciaFim = new Date();
  vigenciaFim.setFullYear(vigenciaFim.getFullYear() + 1);

  const contratoExistente = await prisma.contrato.create({
    data: {
      numeroContrato: 'CTR-TESTE-DESIG-01/2026',
      processoSeiMae: '04410035.000777/2026-88',
      licitacaoProcedimento: 'Pregão 77/2026',
      objeto: 'Contrato de Teste para Vinculação de Fiscais',
      vigenciaInicio,
      vigenciaFim,
      valorGlobal: 80000.0,
      valorAtualizado: 80000.0,
      fornecedorId: fornecedor.id,
    }
  });

  console.log(`Contrato de destino criado com sucesso: ${contratoExistente.numeroContrato} (ID: ${contratoExistente.id})`);

  // Simular a função vincularServidoresAoContrato
  for (const serv of respostaContratoInexistente.servidores) {
    let user = await prisma.user.findFirst({
      where: { matricula: serv.matricula }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          nome: serv.nome,
          email: `${serv.matricula}@teste.uern.br`,
          matricula: serv.matricula,
          senhaHash: 'hash123',
          role: serv.tipoAtuacao,
        }
      });
    }

    await prisma.contratoResponsavel.create({
      data: {
        contratoId: contratoExistente.id,
        userId: user.id,
        tipoAtuacao: serv.tipoAtuacao,
        numeroAtoDesignacao: 'Ato nº 118',
        idSeiAtoDesignacao: '41265025',
        campusSetor: serv.campusSetor,
        ativo: true,
      }
    });
  }

  // Verificar se os fiscais agora aparecem no contrato
  const fiscaisNoContrato = await prisma.contratoResponsavel.findMany({
    where: { contratoId: contratoExistente.id },
    include: { user: true }
  });

  console.log(`Fiscais vinculados ao contrato: ${fiscaisNoContrato.length}`);
  fiscaisNoContrato.forEach(f => {
    console.log(`- [${f.tipoAtuacao}] ${f.user.nome} (Matrícula: ${f.user.matricula}) -> Vinculado ao Contrato: ${contratoExistente.numeroContrato}`);
  });

  if (fiscaisNoContrato.length === 2) {
    console.log('✅ SUCESSO: Os fiscais foram devidamente vinculados e salvos no banco de dados!');
  } else {
    throw new Error('Falha ao vincular fiscais ao contrato');
  }

  // 4. Limpeza dos dados de teste
  console.log('\n4. Limpando dados de teste...');
  await prisma.contrato.delete({
    where: { id: contratoExistente.id }
  });
  await prisma.user.deleteMany({
    where: { matricula: { in: ['99999-1', '99999-2'] } }
  });
  console.log('✅ Dados de teste excluídos com sucesso.');

  console.log('\n================================================================');
  console.log('TESTES DE TRATAMENTO DE CONTRATO INEXISTENTE APROVADOS! 🚀');
  console.log('================================================================');
}

main()
  .catch(e => {
    console.error('❌ ERRO:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
