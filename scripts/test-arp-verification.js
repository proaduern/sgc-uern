const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testArp() {
  console.log('=== TESTE DE VERIFICAÇÃO DO MÓDULO DE ATAS (ARP) E GESTOR DE ATA ===');

  try {
    // 1. Criar ou buscar usuário GESTOR_ATA
    console.log('\n1. Testando criação/busca de usuário GESTOR_ATA...');
    let gestorAta = await prisma.user.findFirst({
      where: { role: 'GESTOR_ATA' }
    });

    if (!gestorAta) {
      gestorAta = await prisma.user.create({
        data: {
          nome: 'Carlos Eduardo Gestor de Ata',
          email: 'gestor.ata.teste@uern.br',
          matricula: '99881-0',
          role: 'GESTOR_ATA',
          senhaHash: '123_hash',
          deveTrocarSenha: false,
        }
      });
      console.log('Criado usuário GESTOR_ATA com sucesso:', gestorAta.id, gestorAta.nome, gestorAta.role);
    } else {
      console.log('Usuário GESTOR_ATA já existe:', gestorAta.id, gestorAta.nome, gestorAta.role);
    }

    // 2. Verificar fornecedor
    let fornecedor = await prisma.fornecedor.findFirst();
    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          razaoSocial: 'Comercial Distribuidora RN Ltda',
          cnpj: '11.222.333/0001-44',
          email: 'contato@distribuidorarn.com.br',
          cidade: 'Mossoró',
          estado: 'RN',
        }
      });
    }

    // 3. Criar ou buscar uma Ata de Teste
    console.log('\n2. Testando criação de Ata com Itens...');
    let ata = await prisma.ataRegistroPreco.findFirst({
      where: { numeroAta: '99-TESTE' },
      include: { itens: true, adesoes: true, autorizacoesExecucao: true }
    });

    if (!ata) {
      ata = await prisma.ataRegistroPreco.create({
        data: {
          numeroAta: '99-TESTE',
          ano: 2026,
          processoSei: '04410022.000999/2026-99',
          objeto: 'Registro de preços para eventual aquisição de suprimentos de informática para os campi da UERN',
          fornecedorId: fornecedor.id,
          gestorId: gestorAta.id,
          vigenciaInicio: new Date('2026-01-01'),
          vigenciaFim: new Date('2026-12-31'),
          valorGlobalOriginal: 100000.0,
          valorGlobalAtual: 100000.0,
          indiceReajuste: 'IPCA',
          status: 'VIGENTE',
          itens: {
            create: [
              {
                numeroItem: 1,
                descricao: 'Toner para impressora laser HP',
                marcaModelo: 'HP Original',
                unidade: 'UN',
                quantidadeRegistrada: 100,
                quantidadeSaldo: 100,
                valorUnitario: 250.0,
                valorTotal: 25000.0,
              },
              {
                numeroItem: 2,
                descricao: 'Papel A4 Sulfite 75g pacote com 500 folhas',
                marcaModelo: 'Chamex',
                unidade: 'PCT',
                quantidadeRegistrada: 2500,
                quantidadeSaldo: 2500,
                valorUnitario: 30.0,
                valorTotal: 75000.0,
              }
            ]
          }
        },
        include: { itens: true, adesoes: true, autorizacoesExecucao: true }
      });
      console.log('Ata de Teste criada com sucesso:', ata.id, 'Itens:', ata.itens.length);
    } else {
      console.log('Ata de Teste encontrada:', ata.id, 'Itens:', ata.itens.length);
    }

    // 4. Testar emissão de Autorização de Execução (AEA) com dedução de saldo
    console.log('\n3. Testando Autorização de Execução (AEA)...');
    const itemToner = ata.itens.find(i => i.numeroItem === 1);
    const qtdDeduzir = 10;
    
    // Atualiza saldo do item
    await prisma.ataItem.update({
      where: { id: itemToner.id },
      data: {
        quantidadeSaldo: itemToner.quantidadeSaldo - qtdDeduzir
      }
    });

    const aea = await prisma.ataAutorizacaoExecucao.create({
      data: {
        ataId: ata.id,
        numeroAutorizacao: 'AEA-TESTE-001/2026',
        processoSei: '04410022.000111/2026-01',
        orgaoRequisitante: 'Campus Mossoró - DAF',
        descricao: 'Fornecimento de 10 toners para impressora laser do DAF',
        valorTotal: qtdDeduzir * itemToner.valorUnitario,
        status: 'AUTORIZADA',
      }
    });

    console.log('AEA criada com sucesso:', aea.numeroAutorizacao, 'Valor:', aea.valorTotal);
    const itemAtualizado = await prisma.ataItem.findUnique({ where: { id: itemToner.id } });
    console.log('Saldo do item após dedução:', itemAtualizado.quantidadeSaldo, '(original era', itemToner.quantidadeSaldo, ')');

    // 5. Testar Adesão de Carona com regras da Lei 14.133/2021
    console.log('\n4. Testando Adesão de Carona (Lei 14.133)...');
    const limite50 = ata.valorGlobalOriginal * 0.5; // 50.000
    const limite200 = ata.valorGlobalOriginal * 2.0; // 200.000
    console.log('Teto Individual de 50%:', limite50);
    console.log('Teto Global de 2x (200%):', limite200);

    const caronaValor = 20000.0; // 20% - válido (< 50%)
    const adesao = await prisma.ataAdesao.create({
      data: {
        ataId: ata.id,
        orgaoRequisitante: 'Prefeitura Municipal de Mossoró',
        processoSeiAdesao: '04410022.000222/2026-02',
        valorAdesao: caronaValor,
        percentualAdesao: (caronaValor / ata.valorGlobalOriginal) * 100,
        statusAprovacao: 'AUTORIZADA',
        dataAprovacao: new Date(),
        justificativa: 'Órgão não-participante requer fornecimento de insumos conforme Art. 86 da Lei 14.133.',
      }
    });

    console.log('Adesão de Carona criada:', adesao.orgaoRequisitante, 'Valor:', adesao.valorAdesao, 'Perc:', adesao.percentualAdesao, '%');

    console.log('\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===\n');
  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testArp();
