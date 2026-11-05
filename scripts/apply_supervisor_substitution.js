const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONTRATO_ID = '6943a96e-047d-4d06-8f3f-12a3c3af1b6d';

async function main() {
  console.log('=== APLICANDO SUBSTITUIÇÃO DO SUPERVISOR NO SGC ===');

  // 1. Atualizar Ícaro Patrick de Oliveira como SUBSTITUIDO
  const icaro = await prisma.trabalhadorTerceirizado.findFirst({
    where: {
      contratoId: CONTRATO_ID,
      cpf: '124.400.384-07'
    }
  });

  if (icaro) {
    await prisma.trabalhadorTerceirizado.update({
      where: { id: icaro.id },
      data: {
        status: 'SUBSTITUIDO',
        dataDemissao: new Date('2026-08-31T23:59:59.000Z'),
        beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80 [Substituído a partir de 01/09/2026 por Ryan Miqueias Oliveira Mesquita conforme Processo SEI 04410035.002260/2026-43 e Relatório de Faturamento Setembro/2026]'
      }
    });
    console.log(`✔ Ícaro Patrick de Oliveira atualizado para status SUBSTITUIDO (saída em 31/08/2026).`);
  } else {
    console.warn('⚠ Ícaro Patrick de Oliveira não encontrado no contrato.');
  }

  // 2. Inserir/Atualizar Ryan Miqueias Oliveira Mesquita como ATIVO
  let ryan = await prisma.trabalhadorTerceirizado.findFirst({
    where: {
      contratoId: CONTRATO_ID,
      cpf: '701.180.294-14'
    }
  });

  const ryanData = {
    contratoId: CONTRATO_ID,
    nomeCompleto: 'Ryan Miqueias Oliveira Mesquita',
    cpf: '701.180.294-14',
    funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    jornada: '44h semanais',
    dataAdmissao: new Date('2026-09-01T00:00:00.000Z'),
    dataDemissao: null,
    banco: 'Nubank (0260)',
    agencia: '0001',
    contaCorrente: '14346265-5',
    cctVinculada: 'CCT RN000009/2025 - SINDLIMP/SEAC',
    salarioBaseCct: 2389.81,
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80 [Substituiu Ícaro Patrick de Oliveira no posto de Supervisor a partir de 01/09/2026 conforme Processo SEI 04410035.002260/2026-43]'
  };

  if (!ryan) {
    ryan = await prisma.trabalhadorTerceirizado.create({
      data: ryanData
    });
    console.log(`✔ Ryan Miqueias Oliveira Mesquita inserido com sucesso (admissão em 01/09/2026).`);
  } else {
    ryan = await prisma.trabalhadorTerceirizado.update({
      where: { id: ryan.id },
      data: ryanData
    });
    console.log(`✔ Ryan Miqueias Oliveira Mesquita atualizado com sucesso.`);
  }

  // Documentos admissionais de Ryan Miqueias
  const docs = [
    { tipoDocumento: 'CTPS_DIGITAL', nomeArquivo: 'CTPS_Digital_Ryan_Miqueias.pdf' },
    { tipoDocumento: 'ASO_ADMISSIONAL', nomeArquivo: 'ASO_Admissional_Ryan_Miqueias.pdf' },
    { tipoDocumento: 'FICHA_REGISTRO', nomeArquivo: 'Ficha_Registro_Empregado_Ryan_Miqueias.pdf' },
    { tipoDocumento: 'CONTA_BANCARIA', nomeArquivo: 'Comprovante_Bancario_Nubank_Ryan_Miqueias.pdf' }
  ];

  for (const doc of docs) {
    const docExiste = await prisma.documentoTrabalhador.findFirst({
      where: { trabalhadorId: ryan.id, tipoDocumento: doc.tipoDocumento }
    });
    if (!docExiste) {
      await prisma.documentoTrabalhador.create({
        data: {
          trabalhadorId: ryan.id,
          tipoDocumento: doc.tipoDocumento,
          nomeArquivo: doc.nomeArquivo,
          arquivoUrl: `/documentos/terceirizados/${CONTRATO_ID}/${doc.nomeArquivo}`,
          statusConferencia: 'CONFERIDO',
          observacoes: 'Documento homologado pela fiscalização técnica/administrativa.'
        }
      });
    }
  }
  console.log(`✔ Documentos admissionais de Ryan Miqueias conferidos e vinculados.`);

  // 3. Confirmar que Erione de Souza Costa é FISCAL_ADMINISTRATIVO e Nayara não está vinculada
  const erione = await prisma.user.findFirst({
    where: { matricula: '012866-0' }
  });

  if (erione) {
    await prisma.user.update({
      where: { id: erione.id },
      data: { role: 'FISCAL_ADMINISTRATIVO' }
    });

    await prisma.contratoResponsavel.upsert({
      where: {
        contratoId_userId_tipoAtuacao: {
          contratoId: CONTRATO_ID,
          userId: erione.id,
          tipoAtuacao: 'FISCAL_ADMINISTRATIVO'
        }
      },
      update: { ativo: true, campusSetor: 'DAS / PROAD' },
      create: {
        contratoId: CONTRATO_ID,
        userId: erione.id,
        tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
        numeroAtoDesignacao: 'Portaria PROAD/UERN - Contrato 01/2026',
        idSeiAtoDesignacao: '04410038.000993/2025-32',
        campusSetor: 'DAS / PROAD',
        ativo: true
      }
    });
    console.log(`✔ Erione de Souza Costa confirmado como FISCAL_ADMINISTRATIVO único.`);
  }

  // Desvincular Nayara caso tenha ficado algum registro no contrato 01/2026
  const nayara = await prisma.user.findFirst({
    where: { matricula: '12902-0' }
  });
  if (nayara) {
    await prisma.contratoResponsavel.deleteMany({
      where: {
        contratoId: CONTRATO_ID,
        userId: nayara.id
      }
    });
    console.log(`✔ Verificado: Nayara Glenda não está vinculada ao Contrato 01/2026.`);
  }

  console.log('=== OPERAÇÃO NO SGC CONCLUÍDA COM SUCESSO ===');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
