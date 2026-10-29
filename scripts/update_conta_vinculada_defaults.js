const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contratos = await prisma.contrato.findMany({
    select: {
      id: true,
      numeroContrato: true,
      tipoContrato: true,
      regimeExecucao: true,
      retencaoContaVinculadaAtiva: true,
      nivelContaVinculada: true,
      percentualTotalRetencao: true
    }
  });
  console.log('Contratos encontrados:', contratos);

  // Se o contrato for do tipo dedicação exclusiva / terceirização (ex: LCL Facilities 035/2025), ativar retenção
  for (const c of contratos) {
    if (c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' || c.regimeExecucao === 'DEDICACAO_EXCLUSIVA' || c.numeroContrato === '035/2025') {
      await prisma.contrato.update({
        where: { id: c.id },
        data: {
          retencaoContaVinculadaAtiva: true,
          nivelContaVinculada: 'NIVEL_1_LEVE_31_54',
          percentualDecimoTerceiro: 8.33,
          percentualFerias: 8.33,
          percentualTercoConstitucional: 2.78,
          percentualMultaFgts: 4.00,
          percentualEncargosSubmodulo: 8.10,
          percentualTotalRetencao: 31.54,
          normativoContaVinculadaRef: 'Instrução Normativa-SEI nº 2, de 02 de julho de 2024 - SEAD/RN (Anexo I)',
          justificativaAlteracaoAliquota: 'Alíquotas parametrizadas de acordo com o Anexo I da IN nº 02/2024 - SEAD/RN (Nível 1 - SAT 1%).',
          historicoAliquotasJson: [
            {
              data: new Date().toISOString(),
              usuario: 'Sistema / Implantação SGC',
              motivo: 'Definição inicial de parâmetros conforme Instrução Normativa-SEI nº 2/2024 - SEAD/RN (Nível 1 - 31,54%)',
              aliquotas: {
                nivel: 'NIVEL_1_LEVE_31_54',
                decimoTerceiro: 8.33,
                ferias: 8.33,
                tercoConstitucional: 2.78,
                multaFgts: 4.00,
                encargosSubmodulo: 8.10,
                total: 31.54
              }
            }
          ]
        }
      });
      console.log(`Contrato ${c.numeroContrato} (${c.id}) atualizado com alíquotas da IN 2/2024!`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
