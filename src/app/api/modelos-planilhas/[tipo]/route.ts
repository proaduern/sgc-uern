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
      filename = 'Modelo_Importacao_Contratos_UERN.xlsx';
      headers = [
        'Número do Contrato',
        'Nota de Empenho',
        'Processo SEI Mãe',
        'Procedimento Licitatório',
        'Objeto da Contratação',
        'Razão Social do Fornecedor',
        'CNPJ do Fornecedor',
        'E-mail do Fornecedor',
        'Telefone da Empresa',
        'Endereço da Empresa',
        'Nome do Representante Legal (Assina o Contrato)',
        'CPF do Representante Legal',
        'Telefone do Representante Legal',
        'E-mail do Representante Legal',
        'Nome do Preposto (Operacional)',
        'Telefone do Preposto',
        'E-mail do Preposto',
        'Início da Vigência (AAAA-MM-DD)',
        'Fim da Vigência (AAAA-MM-DD)',
        'Valor Global (R$)',
        'Regime de Vigência (CONTINUADO / NAO_CONTINUADO)',
      ];
      rows = [
        [
          '11/2026',
          '2026NE000142',
          '04410035.003671/2025-75',
          'Pregão Eletrônico nº 05/2025',
          'Aquisição e instalação de equipamentos de TI para os campi da UERN',
          'Tech Informática e Serviços Eireli',
          '12.345.678/0001-90',
          'licitacao@techinfo.com.br',
          '(84) 3315-0000',
          'Av. Rio Branco, 500, Centro, Mossoró/RN',
          'Carlos Eduardo da Silva',
          '123.456.789-00',
          '(84) 99888-1122',
          'carlos.representante@techinfo.com.br',
          'Marcos Oliveira',
          '(84) 99777-3344',
          'marcos.preposto@techinfo.com.br',
          '2026-02-01',
          '2027-02-01',
          '1166605.42',
          'CONTINUADO',
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
