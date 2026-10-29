const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Ingestão do Contrato 035/2025 - LCL FACILITIES no SGC...');

  // 1. FORNECEDOR
  console.log('1. Cadastrando / Atualizando Fornecedor LCL FACILITIES...');
  const fornecedor = await prisma.fornecedor.upsert({
    where: { cnpj: '04.251.091/0001-99' },
    update: {
      razaoSocial: 'LCL FACILITIES LTDA',
      nomeFantasia: 'LCL FACILITIES',
      email: 'leandroftome@hotmail.com',
      telefone: '(84) 99907-3031',
      endereco: 'Rua Capitão José Severino, nº 130, Centro, Patu/RN - CEP 59.770-000',
      nomeRepresentanteLegal: 'Leandro Francisco Tomé',
      nomePreposto: 'Leandro Francisco Tomé',
      telefonePreposto: '(84) 99907-3031',
      emailPreposto: 'leandroftome@hotmail.com',
      statusSicaf: 'REGULAR',
      scoreConfiabilidade: 95.0, // Deduzido 5 pts pelas advertências
    },
    create: {
      cnpj: '04.251.091/0001-99',
      razaoSocial: 'LCL FACILITIES LTDA',
      nomeFantasia: 'LCL FACILITIES',
      email: 'leandroftome@hotmail.com',
      telefone: '(84) 99907-3031',
      endereco: 'Rua Capitão José Severino, nº 130, Centro, Patu/RN - CEP 59.770-000',
      nomeRepresentanteLegal: 'Leandro Francisco Tomé',
      nomePreposto: 'Leandro Francisco Tomé',
      telefonePreposto: '(84) 99907-3031',
      emailPreposto: 'leandroftome@hotmail.com',
      statusSicaf: 'REGULAR',
      scoreConfiabilidade: 95.0,
    },
  });
  console.log(`   Fornecedor ID: ${fornecedor.id}`);

  // 2. MEMBROS DA FISCALIZAÇÃO (USUÁRIOS)
  console.log('2. Assegurando Usuários da Comissão de Fiscalização (Ato 193/2026)...');
  const senhaPadraoHash = await bcrypt.hash('123456', 10);

  const membrosDados = [
    { nome: 'Pedro Eloy de Paiva Farias', email: 'pedroeloy@uern.br', matricula: '012757-4', role: 'GESTOR', campus: 'Campus Central - Mossoró', setor: 'DAS/PROAD' },
    { nome: 'Mário Sérgio Leite', email: 'mariosergio@uern.br', matricula: '008977-0', role: 'SUPLENTE', campus: 'Campus Central - Mossoró', setor: 'DAS/PROAD' },
    { nome: 'Andréa Emanuelle Bezerra de Oliveira Farias', email: 'andreaemanuelle@uern.br', matricula: '013627-1', role: 'FISCAL_ADMINISTRATIVO', campus: 'Campus Central - Mossoró', setor: 'DAS/PROAD' },
    { nome: 'Francisco Mayccon Passos Costa', email: 'franciscomayccon@uern.br', matricula: '011482-0', role: 'FISCAL_TECNICO', campus: 'Campus Central - Mossoró', setor: 'DAIN' },
    { nome: 'Claudion Silva de Melo', email: 'claudionsilva@uern.br', matricula: '010891-3', role: 'FISCAL_TECNICO', campus: 'Campus Central - Mossoró', setor: 'DAIN' },
    { nome: 'Antonio Alderi Dantas', email: 'antonioalderi@uern.br', matricula: '007841-7', role: 'FISCAL_SETORIAL', campus: 'Campus Central - Mossoró', setor: 'Setorial Mossoró' },
    { nome: 'Alexandre Soares da Costa', email: 'alexandresoaress@uern.br', matricula: '009512-5', role: 'FISCAL_SETORIAL', campus: 'Campus de Caicó', setor: 'Setorial Caicó' },
    { nome: 'Hortência Ferreira Dutra', email: 'hortenciadutra@uern.br', matricula: '011923-8', role: 'FISCAL_SETORIAL', campus: 'Campus de Patu', setor: 'Setorial Patu' },
    { nome: 'Disneylândia Maria Ribeiro', email: 'disneylandiaribeiro@uern.br', matricula: '008320-8', role: 'FISCAL_SETORIAL', campus: 'Campus de Assú', setor: 'Setorial Assú' },
    { nome: 'Maria de Fátima Lopes de Medeiros', email: 'fatimalopes@uern.br', matricula: '006734-2', role: 'FISCAL_SETORIAL', campus: 'Campus de Natal', setor: 'Setorial Natal' },
  ];

  const usuariosMapeados = {};
  for (const m of membrosDados) {
    let u = await prisma.user.findUnique({ where: { email: m.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          nome: m.nome,
          email: m.email,
          matricula: m.matricula,
          role: m.role,
          campus: m.campus,
          unidadeSigla: m.setor,
          unidadeNome: m.setor,
          senhaHash: senhaPadraoHash,
          deveTrocarSenha: true,
          ativo: true,
        },
      });
      console.log(`   Criado usuário: ${m.nome} (${m.email})`);
    } else {
      u = await prisma.user.update({
        where: { email: m.email },
        data: {
          nome: m.nome,
          matricula: m.matricula,
          campus: m.campus,
          unidadeSigla: m.setor,
        },
      });
      console.log(`   Atualizado usuário: ${m.nome} (${m.email})`);
    }
    usuariosMapeados[m.email] = { user: u, ...m };
  }

  // 3. CONTRATO
  console.log('3. Criando / Atualizando Contrato 035/2025...');
  // Buscar se já existe pelo numeroContrato ou processoSeiMae
  let contrato = await prisma.contrato.findFirst({
    where: {
      OR: [
        { numeroContrato: '035/2025' },
        { processoSeiMae: '04410017.001048/2025-04' }
      ]
    }
  });

  const contratoData = {
    numeroContrato: '035/2025',
    processoSeiMae: '04410017.001048/2025-04',
    licitacaoProcedimento: 'Pregão Eletrônico nº 026/2025 - FUERN',
    objeto: 'A contratação de serviços contínuos de apoio pedagógico e acompanhamento às pessoas com deficiências (PCD), a serem executados nos Campi da UERN (Mossoró, Assú, Caicó, Patu, Pau dos Ferros e Natal) com regime de dedicação exclusiva de mão de obra.',
    vigenciaInicio: new Date('2025-12-04T00:00:00.000Z'),
    vigenciaFim: new Date('2026-12-03T23:59:59.000Z'),
    anosVigencia: 1,
    valorGlobal: 903173.40,
    valorAtualizado: 938488.69,
    valorBaseCalculoAditivos: 938488.69,
    ultimoProcedimentoAtualizacao: 'Apostilamento SEI 43673671 - Repactuação CCT 2026',
    tipoVigencia: 'CONTINUADO',
    tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
    regimeExecucao: 'DEDICACAO_EXCLUSIVA',
    tipoEmpreitada: 'PRECO_UNITARIO',
    tipoMedicao: 'MENSAL',
    status: 'ATIVO',
    exigeContratoFormal: true,
    portariaDesignacaoGestor: 'Ato nº 193/2026 - Reitoria',
    dataDesignacaoGestor: new Date('2026-02-01T00:00:00.000Z'),
    fornecedorId: fornecedor.id,
  };

  if (!contrato) {
    contrato = await prisma.contrato.create({ data: contratoData });
    console.log(`   Criado Contrato ID: ${contrato.id}`);
  } else {
    contrato = await prisma.contrato.update({
      where: { id: contrato.id },
      data: contratoData
    });
    console.log(`   Atualizado Contrato ID: ${contrato.id}`);
  }

  // 4. MEMBROS RESPONSÁVEIS PELO CONTRATO (ContratoResponsavel)
  console.log('4. Vinculando Membros da Fiscalização ao Contrato...');
  for (const item of Object.values(usuariosMapeados)) {
    await prisma.contratoResponsavel.upsert({
      where: {
        contratoId_userId_tipoAtuacao: {
          contratoId: contrato.id,
          userId: item.user.id,
          tipoAtuacao: item.role,
        }
      },
      update: {
        numeroAtoDesignacao: 'Ato nº 193/2026',
        idSeiAtoDesignacao: '41006901',
        campusSetor: item.campus,
        ativo: true,
      },
      create: {
        contratoId: contrato.id,
        userId: item.user.id,
        tipoAtuacao: item.role,
        numeroAtoDesignacao: 'Ato nº 193/2026',
        idSeiAtoDesignacao: '41006901',
        campusSetor: item.campus,
        ativo: true,
      }
    });
  }
  console.log('   10 Membros vinculados com sucesso.');

  // 5. CONVENÇÃO COLETIVA
  console.log('5. Cadastrando Convenção Coletiva de Trabalho (CCT)...');
  await prisma.convenioColetivo.deleteMany({ where: { contratoId: contrato.id } });
  const cct = await prisma.convenioColetivo.create({
    data: {
      contratoId: contrato.id,
      nomeConvencao: 'CCT RN000009/2025 - SEAC/RN x SINDLIMP/RN (Grupo VI)',
      numeroRegistroMte: 'RN000009/2025',
      sindicatoLaboral: 'SINDLIMP/RN',
      sindicatoPatronal: 'SEAC/RN',
      dataBase: 'Janeiro',
      vigenciaInicio: new Date('2025-01-01T00:00:00.000Z'),
      vigenciaFim: new Date('2025-12-31T23:59:59.000Z'),
      categoriasProfissionais: 'Grupo VI - Intérprete e Tradutor de Libras e Funções de Apoio Pedagógico à Inclusão',
      itensFiscalizacao: {
        salarioNormativo44h: 2889.38,
        salarioBase40h: 2626.71,
        salarioBaseRepactuado2026: 2758.05,
        beneficios: {
          seguroVida: 2.13,
          auxilioSaude: 137.98,
          bsf: 16.13,
          pqm: 5.60,
          totalSubmodulo23: 198.11,
        },
        regras: {
          retencaoContaVinculadaPercentualTotal: 33.25,
          ferias: 12.10,
          decimoTerceiro: 8.33,
          fgtsProvisao: 5.00,
          incidenciaSubmodulo: 7.82,
        }
      }
    }
  });

  // 6. ITENS DO CONTRATO
  console.log('6. Cadastrando Postos nos Itens do Contrato...');
  await prisma.contratoItem.deleteMany({ where: { contratoId: contrato.id } });
  const itemPosto = await prisma.contratoItem.create({
    data: {
      contratoId: contrato.id,
      numeroItem: 1,
      cidade: 'Múltiplos Campi (Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal)',
      descricao: 'Serviços de apoio pedagógico e acompanhamento às pessoas com deficiências (PCD) - Dedicação Exclusiva de Mão de Obra',
      tipoGrupo: 'ITEM_INDIVIDUAL',
      unidade: 'Posto',
      categoriaItem: 'DEMO',
      quantidadeOriginal: 15,
      quantidadeAtual: 15,
      valorUnitarioOriginal: 5017.63,
      valorUnitarioAtual: 5258.69,
      valorTotalOriginal: 903173.40,
      valorTotalAtual: 938488.69,
      tipoReajuste: 'REPACTUACAO_CCT',
      indiceReferencia: 'CCT RN000009/2025',
      cctVinculada: 'CCT RN000009/2025 - SEAC/RN x SINDLIMP/RN (Grupo VI)',
    }
  });

  // 7. PLANILHA DE COMPOSIÇÃO DE CUSTOS (IN 05/2017)
  console.log('7. Registrando Planilha Analítica de Composição de Custos...');
  await prisma.contratoPlanilhaCusto.deleteMany({ where: { contratoId: contrato.id } });
  await prisma.contratoPlanilhaCusto.create({
    data: {
      contratoId: contrato.id,
      itemId: itemPosto.id,
      numeroItem: 1,
      funcao: 'Técnico em Assuntos Educacionais',
      cbo: '2392-15',
      municipio: 'Mossoró, Assú, Caicó, Patu, Pau dos Ferros e Natal',
      jornada: '40h semanais',
      cctReferencia: 'RN000009/2025',
      mesesExecucao: 12,
      quantidadeEmpregados: 15,
      quantidadePostos: 15,
      salarioBase: 2626.71,
      totalModulo1: 2626.71,
      totalModulo2: 1563.98,
      totalModulo3: 187.10,
      totalModulo4: 106.12,
      totalModulo5: 9.39,
      totalModulo6: 524.33,
      custosIndiretosPercent: 1.00,
      lucroPercent: 1.00,
      tributosPercent: 8.65,
      precoTotalEmpregado: 5017.63,
      valorMensalTotal: 75264.45,
      valorGlobalTotal: 903173.40,
      fatorK: 1.91,
      arquivoOriginalNome: '3. Planilha de Custos e Formacao de Preços - LCL FACILITIES.xlsx',
      dadosDetalhados: {
        modulo1: {
          salarioBase: 2626.71,
          periculosidade: 0.0,
          insalubridade: 0.0,
          adicionalNoturno: 0.0,
          total: 2626.71
        },
        modulo2: {
          submodulo21_feriasE13: {
            decimoTerceiro: 218.89,
            adicionalFerias: 72.96,
            total: 291.85,
            aliquota: 11.11
          },
          submodulo22_encargosPrevidenciarios: {
            inss: 583.71,
            salarioEducacao: 72.96,
            sat: 87.56,
            sescSesi: 43.78,
            senaiSenac: 29.19,
            sebrae: 17.51,
            incra: 5.84,
            fgts: 233.48,
            total: 1074.03,
            aliquota: 36.80
          },
          submodulo23_beneficios: {
            transporte: 0.0,
            refeicao: 0.0,
            seguroVida: 2.13,
            saude: 137.98,
            bsf: 16.13,
            pqm: 5.60,
            total: 198.11
          },
          total: 1563.98
        },
        modulo3_rescisao: {
          avisoPrevioIndenizado: 11.03,
          multaFgts: 105.07,
          avisoTrabalhado: 5.00,
          total: 187.10,
          aliquota: 7.12
        },
        modulo4_reposicao: {
          ausenciasLegais: 106.12,
          total: 106.12,
          aliquota: 2.42
        },
        modulo5_insumos: {
          uniformes: 9.39,
          total: 9.39
        },
        modulo6_indiretosELucro: {
          custosIndiretos: 44.93,
          lucro: 45.38,
          tributos: {
            pis: 32.61,
            cofins: 150.53,
            iss: 250.88,
            totalTributos: 434.02,
            aliquotaTotal: 8.65
          },
          total: 524.33
        }
      }
    }
  });

  // 8. ALTERAÇÃO CONTRATUAL (1º TERMO DE APOSTILAMENTO)
  console.log('8. Registrando 1º Termo de Apostilamento (Repactuação 2026)...');
  await prisma.contratoAlteracao.deleteMany({ where: { contratoId: contrato.id } });
  await prisma.contratoAlteracao.create({
    data: {
      contratoId: contrato.id,
      tipoAlteracao: 'REPACTUACAO_APOSTILAMENTO',
      instrumento: 'APOSTILAMENTO',
      numeroTermo: '1º Termo de Apostilamento',
      processoSei: '04410017.001048/2025-04',
      documentoSeiId: '43673671',
      dataAssinatura: new Date('2026-08-15T00:00:00.000Z'),
      possuiEfeitoRetroativo: true,
      dataRetroatividade: new Date('2026-01-01T00:00:00.000Z'),
      valorAnterior: 903173.40,
      valorAjuste: 35315.29,
      novoValorGlobal: 938488.69,
      novaBaseCalculoAditivos: 938488.69,
      justificativa: 'Repactuação de preços decorrente da homologação da Convenção Coletiva de Trabalho 2026 da categoria (Grupo VI SEAC/SINDLIMP).',
      criadoPorId: usuariosMapeados['pedroeloy@uern.br'].user.id,
    }
  });

  // 9. COLABORADORES & DOCUMENTOS (CTPS + ASO)
  console.log('9. Cadastrando 17 Colaboradores Terceirizados e seus Documentos...');
  await prisma.trabalhadorTerceirizado.deleteMany({ where: { contratoId: contrato.id } });

  const colaboradores = [
    { nome: 'PATRÍCIA SANTOS SOUZA DA SILVA', cpf: '021.838.665-60', campus: 'Campus de Assú', adm: '2026-02-09', dem: null, banco: 'BANCO DO BRASIL', ag: '2143', cc: '0036388X', status: 'ATIVO' },
    { nome: 'EDSON GIANOTTI LUCENA DOS SANTOS', cpf: '075.444.844-40', campus: 'Campus de Caicó', adm: '2026-02-09', dem: null, banco: 'BRADESCO', ag: '1038', cc: '00379735', status: 'ATIVO' },
    { nome: 'ANNE JANAINA TOSCANO DOS SANTOS SILVA', cpf: '052.876.464-02', campus: 'Campus Central - Mossoró', adm: '2026-02-09', dem: null, banco: 'CEF', ag: '2044', cc: '796949797-0', status: 'ATIVO' },
    { nome: 'MARIA ANNYCIONARA DE AZEVEDO CUNHA', cpf: '897.394.694-34', campus: 'Campus Central - Mossoró', adm: '2026-02-10', dem: null, banco: 'BANCO DO BRASIL', ag: '00361', cc: '01133314', status: 'ATIVO' },
    { nome: 'GERUSA SANTOS FERNANDES DE OLIVEIRA', cpf: '074.039.394-41', campus: 'Campus Central - Mossoró', adm: '2026-02-09', dem: null, banco: 'SANTANDER', ag: '2968', cc: '02080935-8', status: 'ATIVO' },
    { nome: 'MARIA GLAUCIA REGINA IZIDIO DA SILVA', cpf: '023.313.964-85', campus: 'Campus Central - Mossoró', adm: '2026-02-13', dem: null, banco: 'CEF', ag: '0560', cc: '598015089-3', status: 'ATIVO' },
    { nome: 'MARIA LUIZA DA SILVA ANDRADE', cpf: '017.043.454-05', campus: 'Campus Central - Mossoró', adm: '2026-02-10', dem: null, banco: 'NUBANK', ag: '0001', cc: '46359971-9', status: 'ATIVO' },
    { nome: 'SHEILA TATIANA FERREIRA DE LIMA', cpf: '027.513.474-10', campus: 'Campus Central - Mossoró', adm: '2026-02-09', dem: null, banco: 'BANCO DO BRASIL', ag: '35262', cc: '00746073', status: 'ATIVO' },
    { nome: 'SUELEN JALES DE LIRA APOLINÁRIO', cpf: '057.538.874-90', campus: 'Campus Central - Mossoró', adm: '2026-02-09', dem: null, banco: 'CEF', ag: '560', cc: '000049436-8', status: 'ATIVO' },
    { nome: 'THAYNARA AVELINO DE MELO', cpf: '084.591.334-43', campus: 'Campus Central - Mossoró', adm: '2026-02-09', dem: null, banco: 'BANCO DO BRASIL', ag: '1365X', cc: '00306436', status: 'ATIVO' },
    { nome: 'KARLA SUZANA ASSUNÇÃO GUIMARÃES COSTA', cpf: '025.819.074-44', campus: 'Campus de Natal', adm: '2026-02-09', dem: null, banco: 'BANCO DO BRASIL', ag: '12467', cc: '00107166', status: 'ATIVO' },
    { nome: 'REGYANE GOMES DA SILVA', cpf: '838.896.394-53', campus: 'Campus de Natal', adm: '2026-02-09', dem: '2026-04-14', banco: 'BANCO DO BRASIL', ag: '28789', cc: '0052299', status: 'DEMITIDO' },
    { nome: 'LUCIANA CARLOS GURGEL', cpf: '024.530.974-82', campus: 'Campus de Patu', adm: '2026-02-09', dem: null, banco: 'NUBANK', ag: '0001', cc: '44176192-0', status: 'ATIVO' },
    { nome: 'ANA LUIZA PAIVA', cpf: '131.696.424-80', campus: 'Campus de Pau dos Ferros', adm: '2026-02-09', dem: '2026-07-20', banco: 'BRADESCO', ag: '5883', cc: '0713169', status: 'DEMITIDO' },
    { nome: 'SONALY MARIA FERNANDES DE BESSA', cpf: '122.191.524-05', campus: 'Campus de Pau dos Ferros', adm: '2026-02-09', dem: null, banco: 'BRADESCO', ag: '5882-3', cc: '00319880', status: 'ATIVO' },
    { nome: 'MARIA NATALIA SOUSA DE LIMA', cpf: '070.991.744-95', campus: 'Campus de Natal', adm: '2026-04-29', dem: null, banco: 'BANCO DO BRASIL', ag: '357453', cc: '105021-4', status: 'ATIVO' },
    { nome: 'CLARA IASMIM CURIOSO DE FREITAS BRITO', cpf: '071.856.584-38', campus: 'Campus de Pau dos Ferros', adm: '2026-08-11', dem: null, banco: 'BANCO DO BRASIL', ag: '1109-6', cc: '50924-8', status: 'ATIVO' },
  ];

  for (const c of colaboradores) {
    const t = await prisma.trabalhadorTerceirizado.create({
      data: {
        contratoId: contrato.id,
        nomeCompleto: c.nome,
        cpf: c.cpf,
        funcao: 'Técnico em Assuntos Educacionais',
        campus: c.campus,
        setorLotacao: 'DAIN / Apoio Inclusão',
        jornada: '40h semanais',
        dataAdmissao: new Date(c.adm + 'T00:00:00.000Z'),
        dataDemissao: c.dem ? new Date(c.dem + 'T00:00:00.000Z') : null,
        banco: c.banco,
        agencia: c.ag,
        contaCorrente: c.cc,
        salarioBaseCct: 2626.71,
        cctVinculada: 'CCT RN000009/2025',
        status: c.status,
      }
    });

    // Criar registros documentais conferidos (CTPS + ASO)
    await prisma.documentoTrabalhador.createMany({
      data: [
        {
          trabalhadorId: t.id,
          tipoDocumento: 'CTPS_DIGITAL',
          nomeArquivo: `${c.nome}.pdf`,
          arquivoUrl: `/documentos/trabalhadores/ctps/${c.nome}.pdf`,
          statusConferencia: 'CONFERIDO',
          observacoes: 'Carteira de Trabalho Digital oficial emitida via Portal Gov.br/MTE conferida com êxito.',
        },
        {
          trabalhadorId: t.id,
          tipoDocumento: 'ASO_ADMISSIONAL',
          nomeArquivo: `${c.nome}.pdf`,
          arquivoUrl: `/documentos/trabalhadores/aso/${c.nome}.pdf`,
          statusConferencia: 'CONFERIDO',
          observacoes: 'Atestado de Saúde Ocupacional Admissional emitido por Médico do Trabalho (NR-7) com parecer APTO.',
        }
      ]
    });
  }
  console.log('   17 Colaboradores e 34 Documentos (CTPS + ASO) cadastrados com status CONFERIDO.');

  // 10. MEDIÇÕES E DESPESAS DE EXECUÇÃO
  console.log('10. Registrando Histórico das Medições e Despesas de Execução...');
  await prisma.medicaoDespesa.deleteMany({ where: { contratoId: contrato.id } });
  await prisma.despesaExecucao.deleteMany({ where: { contratoId: contrato.id } });

  const medicoes = [
    { ref: '02/2026', sei: '04410035.000435/2026-88', nfs: '2600000000525 a 530', bruto: 51316.65, glosa: 5621.27, liq: 45695.38, atesto: '2026-04-24' },
    { ref: '03/2026', sei: '04410035.000595/2026-27', nfs: '2600000000554 a 559', bruto: 75264.45, glosa: 4120.03, liq: 71144.42, atesto: '2026-05-10' },
    { ref: '04/2026', sei: '04410035.000887/2026-60', nfs: '2600000000569 a 574', bruto: 75264.45, glosa: 5613.23, liq: 69651.22, atesto: '2026-06-01' },
    { ref: '05/2026', sei: '04410035.001088/2026-19', nfs: '2600000000611 a 616', bruto: 75264.45, glosa: 3997.97, liq: 71266.48, atesto: '2026-07-07' },
    { ref: '06/2026', sei: '04410035.001460/2026-89', nfs: '2600000000644 a 649', bruto: 75264.45, glosa: 6734.82, liq: 68529.63, atesto: '2026-07-23' },
    { ref: '07/2026', sei: '04410035.001743/2026-21', nfs: '2600000000966 a 971', bruto: 75264.45, glosa: 11522.33, liq: 63742.12, atesto: '2026-08-27' },
    { ref: '08/2026', sei: '04410035.001949/2026-51', nfs: '2600000001162 a 169', bruto: 78880.35, glosa: 5680.41, liq: 73199.94, atesto: '2026-09-20' },
    { ref: 'RETROATIVO_REPACTUACAO', sei: '04410035.002501/2026-54', nfs: '2600000001355 a 360', bruto: 19427.11, glosa: 0.0, liq: 19427.11, atesto: '2026-10-10' },
  ];

  for (const m of medicoes) {
    const dataAtestoObj = new Date(m.atesto + 'T00:00:00.000Z');
    await prisma.medicaoDespesa.create({
      data: {
        contratoId: contrato.id,
        referenciaMesAno: m.ref,
        processoSeiDespesa: m.sei,
        numeroNotaFiscal: m.nfs,
        dataEmissaoNf: dataAtestoObj,
        valorNotaFiscal: m.bruto,
        valorGlosa: m.glosa,
        motivoGlosa: m.glosa > 0 ? 'Glosas por faltas sem cobertura de substituto e abatimentos de benefícios' : null,
        valorAtestadoFinal: m.liq,
        dataRecebimentoProvisorio: dataAtestoObj,
        dataRecebimentoDefinitivo: dataAtestoObj,
        status: 'LIQUIDADO_PAGO',
      }
    });

    await prisma.despesaExecucao.create({
      data: {
        contratoId: contrato.id,
        numeroContratoRef: '035/2025',
        processoSeiMaeRef: '04410017.001048/2025-04',
        processoSeiDespesa: m.sei,
        numeroNotaFiscal: m.nfs,
        dataAtesto: dataAtestoObj,
        referencia: m.ref,
        cidade: 'Todos os Campi',
        valorEstimado: m.bruto,
        valorAtestado: m.liq,
        saldo: 0.0,
        status: 'PAGA',
        observacoes: `Execução da Medição referente a ${m.ref} liquidada e quitada conforme atesto.`,
        anoExercicio: 2026,
      }
    });
  }
  console.log('   8 Medições (01 a 07 + Retroativo) e Despesas de Execução gravadas.');

  // 11. CONTA VINCULADA (RETENÇÕES)
  console.log('11. Lançando Retenções de Conta Vinculada...');
  await prisma.contaVinculadaMovimentacao.deleteMany({ where: { contratoId: contrato.id } });

  const retencoes = [
    { mes: '02/2026', valor: 8987.16, saldoAnt: 0.0, saldoAtu: 8987.16, proc: '04410035.000435/2026-88' },
    { mes: '03/2026', valor: 13755.75, saldoAnt: 8987.16, saldoAtu: 22742.91, proc: '04410035.000595/2026-27' },
    { mes: '04/2026', valor: 13883.13, saldoAnt: 22742.91, saldoAtu: 36626.04, proc: '04410035.000887/2026-60' },
    { mes: '05/2026', valor: 13755.75, saldoAnt: 36626.04, saldoAtu: 50381.79, proc: '04410035.001088/2026-19' },
    { mes: '07/2026', valor: 13755.75, saldoAnt: 50381.79, saldoAtu: 64137.54, proc: '04410035.001743/2026-21' },
    { mes: '09/2026', valor: 13755.75, saldoAnt: 64137.54, saldoAtu: 77893.29, proc: '04410035.001949/2026-51' },
  ];

  for (const r of retencoes) {
    await prisma.contaVinculadaMovimentacao.create({
      data: {
        contratoId: contrato.id,
        competenciaMesAno: r.mes,
        rubrica: 'FGTS_SOBRE_PROVISOES', // Provisões conjuntas (Férias 12,1%, 13º 8,33%, FGTS 5%, Incidência 7,82%)
        tipoOperacao: 'RETENCAO_ENTRADA',
        valor: r.valor,
        saldoAnterior: r.saldoAnt,
        saldoAtual: r.saldoAtu,
        numeroOficio: r.proc,
        motivoLiberacao: 'Retenção cautelar mensal de provisões trabalhistas (IN nº 02/2024 - PROAD).',
      }
    });
  }
  console.log('   6 Movimentações de Conta Vinculada lançadas. Saldo acumulado: R$ 77.893,29.');

  // 12. PENALIDADES
  console.log('12. Registrando Notificações e Penalidades...');
  await prisma.penalidade.deleteMany({ where: { contratoId: contrato.id } });

  await prisma.penalidade.create({
    data: {
      contratoId: contrato.id,
      fornecedorId: fornecedor.id,
      tipoPenalidade: 'ADVERTENCIA',
      fatosDescricao: 'Atraso injustificado no pagamento dos salários dos colaboradores terceirizados referente à competência de Maio/2026.',
      baseLegal: 'Artigo 156, I da Lei 14.133/2021 e Cláusula de Penalidades do CTR 035/2025',
      status: 'REGISTRADO_SICAF',
      protocoloNotificacaoSei: 'Termo de Notificação 75/2026 - Proc. 04410035.001513/2026-61',
      dataEnvioNotificacao: new Date('2026-06-10T00:00:00.000Z'),
      prazoDefesaFim: new Date('2026-06-25T23:59:59.000Z'),
      protocoloDecisaoSei: 'Decisão Administrativa PROAD publicada no JOUERN em 18/07/2026 (SICAF ID 43058255)',
      impactoScore: 2.5,
    }
  });

  await prisma.penalidade.create({
    data: {
      contratoId: contrato.id,
      fornecedorId: fornecedor.id,
      tipoPenalidade: 'ADVERTENCIA',
      fatosDescricao: 'Ausência de repasse e pagamento tempestivo de vales e auxílios convencionais aos colaboradores no período de Fevereiro a Junho/2026.',
      baseLegal: 'Artigo 156, I da Lei 14.133/2021 e CCT RN000009/2025',
      status: 'REGISTRADO_SICAF',
      protocoloNotificacaoSei: 'Termo de Notificação 73/2026 - Proc. 04410035.001823/2026-86',
      dataEnvioNotificacao: new Date('2026-07-15T00:00:00.000Z'),
      prazoDefesaFim: new Date('2026-07-30T23:59:59.000Z'),
      protocoloDecisaoSei: 'Decisão Administrativa PROAD publicada no JOUERN em 20/08/2026 (SICAF ID 44227236)',
      impactoScore: 2.5,
    }
  });

  await prisma.penalidade.create({
    data: {
      contratoId: contrato.id,
      fornecedorId: fornecedor.id,
      tipoPenalidade: 'ADVERTENCIA',
      fatosDescricao: 'Reincidência em atraso no pagamento salarial aos colaboradores referente à folha de Junho/2026.',
      baseLegal: 'Artigo 156 da Lei 14.133/2021',
      status: 'EM_ANALISE_DEFESA',
      protocoloNotificacaoSei: 'Termo de Notificação 71/2026 - Proc. 04410035.001814/2026-95',
      dataEnvioNotificacao: new Date('2026-08-01T00:00:00.000Z'),
      prazoDefesaFim: new Date('2026-08-16T23:59:59.000Z'),
      protocoloDecisaoSei: 'Em fase de instrução e análise de justificativa pela DAS/PROAD',
      impactoScore: 0.0,
    }
  });
  console.log('   3 Notificações / Penalidades registradas.');

  console.log('✨ INGESTÃO DO CONTRATO 035/2025 CONCLUÍDA COM TOTAL SUCESSO! ✨');
}

main()
  .catch((e) => {
    console.error('❌ Erro na ingestão:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
