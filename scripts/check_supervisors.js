const { PrismaClient: PrismaSGC } = require('../node_modules/@prisma/client');
const { PrismaClient: PrismaManut } = require('../../manutencao-uern/node_modules/@prisma/client');

async function main() {
  const sgc = new PrismaSGC();
  const manut = new PrismaManut();

  console.log('=== SGC SUPERVISORES ===');
  const sgcSupervisores = await sgc.trabalhadorTerceirizado.findMany({
    where: { funcao: { contains: 'SUPERVISOR', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(sgcSupervisores.map(s => ({
    id: s.id,
    nome: s.nomeCompleto,
    cpf: s.cpf,
    status: s.status,
    demissao: s.dataDemissao,
    beneficios: s.beneficiosInfo
  })), null, 2));

  console.log('=== MANUTENCAO SUPERVISORES & ITENS MAO OBRA ===');
  const postos = await manut.contratoItemMaoObra.findMany({
    where: { funcao: { contains: 'SUPERVISOR', mode: 'insensitive' } },
    include: { funcionarios: true }
  });
  console.log('Postos Supervisores:', JSON.stringify(postos.map(p => ({
    id: p.id,
    funcao: p.funcao,
    quantidadePostos: p.quantidadePostos,
    funcionarios: p.funcionarios.map(f => ({ id: f.id, nome: f.nomeCompleto, cpf: f.cpf, ativo: f.ativo }))
  })), null, 2));

  console.log('=== MANUTENCAO TODOS TRABALHADORES POSTOS ===');
  const todosTrabs = await manut.contratoFuncionarioPosto.findMany({
    include: { itemMaoObra: true }
  });
  console.log(`Total trabalhadores em postos: ${todosTrabs.length}`);
  const supervisores = todosTrabs.filter(t => t.itemMaoObra.funcao.toLowerCase().includes('supervisor'));
  console.log('Supervisores alocados nos postos:', supervisores);

  await sgc.$disconnect();
  await manut.$disconnect();
}

main().catch(console.error);
