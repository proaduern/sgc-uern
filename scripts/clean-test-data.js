const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const r = await prisma.contrato.deleteMany({
    where: { numeroContrato: { contains: 'TESTE' } }
  });
  console.log('Contratos teste removidos:', r.count);
}

clean().finally(() => prisma.$disconnect());
