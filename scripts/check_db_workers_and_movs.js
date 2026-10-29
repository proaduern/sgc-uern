const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contrato = await prisma.contrato.findFirst({
    where: { numeroContrato: { contains: '035/2025' } },
    include: {
      trabalhadores: true,
      movimentacoesContaVinculada: true
    }
  });

  if (!contrato) {
    console.log('Contrato 035/2025 não encontrado!');
    return;
  }

  console.log('Contrato:', contrato.numero, contrato.id);
  console.log('Total trabalhadores no banco:', contrato.trabalhadores.length);
  for (const t of contrato.trabalhadores) {
    console.log(`DB Worker: ID=${t.id} | Nome=${t.nome} | CPF=${t.cpf} | Campus=${t.campus} | Cargo=${t.funcao}`);
  }

  console.log('\nTotal movimentações atuais no banco:', contrato.movimentacoesContaVinculada.length);
  for (const m of contrato.movimentacoesContaVinculada) {
    console.log(`DB Mov: ID=${m.id} | Data=${m.dataMovimentacao?.toISOString().slice(0,10)} | Tipo=${m.tipo} | Valor=${m.valor} | Desc=${m.descricao} | TrabId=${m.trabalhadorId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
