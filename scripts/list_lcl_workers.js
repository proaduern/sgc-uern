const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ts = await prisma.trabalhadorTerceirizado.findMany({
    where: { contrato: { numeroContrato: '035/2025' } },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      funcao: true,
      campus: true,
      salarioBaseCct: true,
      dataAdmissao: true,
      movimentacoesContaVinculada: true
    }
  });
  console.log(`Encontrados ${ts.length} trabalhadores:`);
  ts.forEach(t => {
    console.log(`- ${t.nomeCompleto} | Cargo: ${t.funcao} | Campus: ${t.campus} | Salário Base CCT: R$ ${t.salarioBaseCct} | Movimentações CV: ${t.movimentacoesContaVinculada.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
