const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contrato = await prisma.contrato.findFirst({
    where: { numeroContrato: '01/2026' },
    include: {
      responsaveis: {
        include: { user: true }
      }
    }
  });

  console.log('=== CONTRATO 01/2026 SGC RESPONSÁVEIS ===');
  console.log('Contrato:', contrato?.id, contrato?.numeroContrato);
  for (const r of contrato?.responsaveis || []) {
    console.log(`- Tipo: ${r.tipoAtuacao} | Nome: ${r.user?.nome} | Matrícula: ${r.user?.matricula} | Email: ${r.user?.email} | Portaria: ${r.portariaNumero}`);
  }

  // Also check if Nayara exists in Usuario or any other place
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { nome: { contains: 'Nayara', mode: 'insensitive' } },
        { nome: { contains: 'Erione', mode: 'insensitive' } }
      ]
    }
  });
  console.log('=== USUÁRIOS NAYARA / ERIONE ===');
  console.log(users.map(u => ({ id: u.id, nome: u.nome, email: u.email, matricula: u.matricula, role: u.role })));

  await prisma.$disconnect();
}

main().catch(console.error);
