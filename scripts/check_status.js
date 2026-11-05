const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const resp = await prisma.contratoResponsavel.findMany({
    where: { contratoId: '6943a96e-047d-4d06-8f3f-12a3c3af1b6d' },
    include: { user: true }
  });
  console.log('Responsaveis atuais:', resp.map(r => ({ id: r.id, nome: r.user.nome, tipo: r.tipoAtuacao, ativo: r.ativo, matricula: r.user.matricula })));
  
  const trabs = await prisma.trabalhadorTerceirizado.findMany({
    where: { contratoId: '6943a96e-047d-4d06-8f3f-12a3c3af1b6d' }
  });
  console.log('Trabalhadores no SGC:', trabs.map(t => ({ id: t.id, nome: t.nomeCompleto, cpf: t.cpf, funcao: t.funcao, status: t.status, dataDemissao: t.dataDemissao })));
}
main().finally(() => prisma.$disconnect());
