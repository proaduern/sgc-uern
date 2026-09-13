import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN_PROAD' && session.role !== 'ADMIN_PARCIAL')) {
      return NextResponse.json({ error: 'Apenas administradores podem importar planilhas.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('planilha') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'A planilha enviada está vazia.' }, { status: 400 });
    }

    let sucessos = 0;
    const erros: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linhaNum = i + 2; // Cabeçalho na linha 1

      const razaoSocial = row['Empresa'] || row['Razão Social'] || row['Fornecedor'];
      const cnpjRaw = String(row['CNPJ'] || '').replace(/\D/g, '');
      const processoSei = row['Processo SEI'] || row['Processo SEI Mãe'] || row['Processo'];
      const objeto = row['Objeto'] || row['Descrição do Objeto'];
      const valorGlobal = parseFloat(row['Valor Global'] || row['Valor'] || 0);
      const vigenciaInicio = row['Início Vigência'] || row['Vigência Início'];
      const vigenciaFim = row['Fim Vigência'] || row['Vigência Fim'];
      const numContrato = row['Número Contrato'] || row['Contrato'];
      const numEmpenho = row['Número Empenho'] || row['Empenho'];

      if (!razaoSocial || !cnpjRaw || !processoSei || !objeto || !valorGlobal) {
        erros.push(`Linha ${linhaNum}: Campos obrigatórios ausentes (Empresa, CNPJ, Processo SEI, Objeto ou Valor).`);
        continue;
      }

      try {
        // 1. Localizar ou criar fornecedor
        let fornecedor = await prisma.fornecedor.findUnique({
          where: { cnpj: cnpjRaw },
        });

        if (!fornecedor) {
          fornecedor = await prisma.fornecedor.create({
            data: {
              razaoSocial,
              cnpj: cnpjRaw,
              email: row['Email'] || `${cnpjRaw}@fornecedor.uern.br`,
              telefone: row['Telefone'] ? String(row['Telefone']) : null,
              nomePreposto: row['Preposto'] || null,
            },
          });
        }

        // 2. Tratar datas
        const dataIni = vigenciaInicio ? new Date(vigenciaInicio) : new Date();
        const dataFim = vigenciaFim ? new Date(vigenciaFim) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

        // 3. Criar Contrato
        await prisma.contrato.create({
          data: {
            numeroContrato: numContrato ? String(numContrato) : null,
            numeroEmpenho: numEmpenho ? String(numEmpenho) : null,
            processoSeiMae: String(processoSei),
            licitacaoProcedimento: row['Licitação'] || 'Dispensa/Pregão',
            objeto: String(objeto),
            vigenciaInicio: dataIni,
            vigenciaFim: dataFim,
            valorGlobal: valorGlobal,
            valorAtualizado: valorGlobal,
            tipoVigencia: row['Continuado'] === 'SIM' || row['Tipo Vigência'] === 'CONTINUADO' ? 'CONTINUADO' : 'NAO_CONTINUADO',
            tipoContrato: 'SERVICO_SEM_DEDICACAO',
            fornecedorId: fornecedor.id,
          },
        });

        sucessos++;
      } catch (err: any) {
        erros.push(`Linha ${linhaNum}: Erro ao inserir contrato - ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessados: rows.length,
      sucessos,
      erros,
    });
  } catch (error: any) {
    console.error('Erro na importação de planilha:', error);
    return NextResponse.json({ error: 'Erro ao processar importação da planilha.' }, { status: 500 });
  }
}
