import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: { tipo: string } | Promise<{ tipo: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const tipo = resolvedParams.tipo;

    let headers: string[] = [];
    let rows: any[] = [];
    let filename = 'Modelo_UERN.xlsx';

    if (tipo === 'contratos') {
      filename = 'MODELO_CADASTRO_DE_CONTRATOS.xlsx';
      headers = [
        'OBJETO',
        'TIPO',
        'Empreitada',
        'REGIME',
        'Processo MÃE',
        'DFD ID SEI',
        'RISCOS ID SEI',
        'ETP ID SEI',
        'TR ID SEI',
        'EDITAL ID SEI',
        'PROCEDIMENTO LICITATÓRIO',
        'DESCRIÇÃO DO OBJETO',
        'Nº CTR - ID SEI',
        'NOME FORNECEDOR',
        'CNPJ / CPF',
        'E-MAIL FORNECEDOR',
        'ENDEREÇO FORNECEDOR',
        'PREPOSTO FORNECEDOR',
        'CONTATO EMPRESA/PREPOSTO',
        'Nº ATO DE DESIGNAÇÃO DE GESTOR E FISCAIS (id SEI)',
        'GESTOR (contato)',
        'MATRÍCULA',
        'GESTOR SUPLENTE (contato)',
        'MATRÍCULA',
        'FISCAL ADM (contato)',
        'MATRÍCULA',
        'FISCAL TÉCNICO',
        'MATRÍCULA',
        'FISCAL SETORIAL ASSU',
        'MATRÍCULA',
        'FISCAL SETORIAL CAICÓ',
        'MATRÍCULA',
        'FISCAL SETORIAL NATAL',
        'MATRÍCULA',
        'FISCAL SETORIAL PATU',
        'MATRÍCULA',
        'FISCAL SETORIAL PAU DOS FERROS',
        'MATRÍCULA',
        'Início',
        'Prazo',
        'Valor',
        'PENALIDADES',
        'EMPENHO 2026',
        'DFD 2027',
        'DATA DA CHECAGEM',
      ];
      rows = [
        [
          'Serviço de Limpeza e Conservação Predial',
          'Serviço com dedicação exclusiva de mão de obra',
          'Preço Unitário',
          'CONTINUADO',
          '04410035.000304/2025-10',
          '35636081',
          '35668825',
          '35636447',
          '35908632',
          '37101711',
          'Pregão Eletrônico nº 38/2025',
          'Prestação de serviços de limpeza, conservação, copeiragem e jardinagem nos campi da UERN',
          '028/2025 id 37559246',
          'SERVITIUM LTDA',
          '00.558.943/0001-34',
          'contato@servitium.com.br',
          'Av. Dr. Joaquim Nabuco, 2339, Olinda/PE',
          'Representante Operacional',
          '5584999990000',
          'Ato 118/2026 (40247209)',
          'Pedro Eloy de Paiva Farias (5584987333375)',
          '12.757-4',
          'Mário Sérgio Leite (5584994148925)',
          '08977-0',
          'Eginaldo Alves Guerreiro (5588981050516)',
          '13.773-1',
          'Rodrigo Guerra Benevides',
          '08219-8',
          'Rodolfo Almeida Peixoto',
          '12.981-0',
          'Flávio Dantas',
          '13.056-7',
          'Hugo Paulinele Pereira de Lima',
          '08796-3',
          'Larissa de Almeida Medeiros',
          '08924-9',
          'José Roberto da Silva',
          '13.165-2',
          '2025-11-14',
          '2026-11-13',
          12762865.08,
          '-',
          '2025NE002036',
          'DFD 40365161',
          '2026-03-24',
        ],
      ];
    } else if (tipo === 'fiscais') {
      filename = 'Modelo_Importacao_Fiscais_UERN.xlsx';
      headers = [
        'Número do Contrato ou SEI',
        'Tipo de Atuação (GESTOR, SUPLENTE, FISCAL_ADMINISTRATIVO, FISCAL_TECNICO, FISCAL_SETORIAL)',
        'Nome Completo do Servidor',
        'E-mail Institucional (@uern.br)',
        'Matrícula do Servidor',
        'Portaria / Ato de Designação',
        'ID SEI da Portaria',
        'Campus ou Setor de Lotação',
      ];
      rows = [
        [
          '11/2026',
          'GESTOR',
          'Maria Helena de Souza',
          'maria.helena@uern.br',
          '12345-6',
          'Portaria nº 120/2026-GR',
          '7894561',
          'Campus Central - Mossoró',
        ],
        [
          '11/2026',
          'FISCAL_ADMINISTRATIVO',
          'João Pedro Cavalcante',
          'joao.pedro@uern.br',
          '98765-4',
          'Portaria nº 120/2026-GR',
          '7894561',
          'PROAD - Sede',
        ],
        [
          '11/2026',
          'FISCAL_TECNICO',
          'Ana Beatriz Lima',
          'ana.beatriz@uern.br',
          '45678-9',
          'Portaria nº 120/2026-GR',
          '7894561',
          'Diretoria de Informatização',
        ],
      ];
    } else if (tipo === 'saldos') {
      filename = 'Modelo_Importacao_Saldos_Despesas_UERN.xlsx';
      headers = [
        'Contrato / SEI',
        'Processo de Despesa',
        'Nº da Nota Fiscal',
        'Data do Atesto (AAAA-MM-DD)',
        'Referência (Mês/ano ou Medição)',
        'Local da prestação (Mossoró, Assú, Patu, Pau dos Ferros, Caicó ou Natal)',
        'Valor Estimado (R$)',
        'Valor Atestado (R$)',
      ];
      rows = [
        [
          '11/2026',
          '04410035.000123/2026-11',
          'NF-e 4521',
          '2026-03-10',
          '03/2026',
          'Mossoró',
          '97217.11',
          '97217.11',
        ],
        [
          '11/2026',
          '04410035.000256/2026-44',
          'NF-e 4610',
          '2026-04-12',
          '04/2026',
          'Pau dos Ferros',
          '45000.00',
          '42500.00',
        ],
        [
          '11/2026',
          '04410035.000389/2026-89',
          '',
          '',
          '05/2026',
          'Caicó',
          '35000.00',
          '0.00',
        ],
      ];
    } else if (tipo === 'custos' || tipo === 'composicao-custos') {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'docs', 'Planilha_de_custos_e_formacao_de_precos.xlsx');
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Planilha_de_custos_e_formacao_de_precos_UERN.xlsx"',
          },
        });
      } else {
        return NextResponse.json({ error: 'Arquivo modelo não encontrado no servidor' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Tipo de modelo não encontrado' }, { status: 404 });
    }

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
