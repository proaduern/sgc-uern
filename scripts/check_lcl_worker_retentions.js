const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.contrato.findFirst({
    where: { numeroContrato: '035/2025' },
    include: {
      trabalhadores: true,
      movimentacoesContaVinculada: {
        include: { trabalhador: true }
      }
    }
  });

  console.log('Contrato:', c.numeroContrato, c.objeto);
  console.log('Total de Trabalhadores Cadastrados:', c.trabalhadores.length);
  console.log('Total de Movimentações na Conta Vinculada:', c.movimentacoesContaVinculada.length);

  // Ver se as movimentações estão com trabalhadorId ou se estão globais
  const comTrabalhador = c.movimentacoesContaVinculada.filter(m => m.trabalhadorId);
  const semTrabalhador = c.movimentacoesContaVinculada.filter(m => !m.trabalhadorId);

  console.log('Movimentações com trabalhadorId vinculado:', comTrabalhador.length);
  console.log('Movimentações sem trabalhadorId (apenas valor global da fatura):', semTrabalhador.length);

  semTrabalhador.forEach(m => {
    console.log(`- ${m.competenciaMesAno}: Rubrica ${m.rubrica} | R$ ${m.valor} | Motivo: ${m.motivoLiberacao || 'N/A'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
