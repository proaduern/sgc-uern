const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
    where: { contrato: { numeroContrato: { contains: '035/2025' } } },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      campus: true,
      banco: true,
      agencia: true,
      contaCorrente: true,
      dataAdmissao: true,
      dataDemissao: true,
      status: true
    }
  });

  console.table(trabalhadores.map(t => ({
    nome: t.nomeCompleto,
    cpf: t.cpf,
    campus: t.campus,
    banco: t.banco,
    agencia: t.agencia,
    conta: t.contaCorrente,
    admissao: t.dataAdmissao?.toISOString().slice(0, 10),
    demissao: t.dataDemissao?.toISOString().slice(0, 10),
    status: t.status
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
