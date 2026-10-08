import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseContratosWorkbook, ContratoImportado } from '@/lib/excel-contratos-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    let contratosParaImportar: ContratoImportado[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      contratosParaImportar = parseContratosWorkbook(buffer);

      if (!contratosParaImportar || contratosParaImportar.length === 0) {
        return NextResponse.json({ error: 'Nenhum contrato válido identificado na planilha enviada.' }, { status: 400 });
      }
    } else {
      const body = await request.json();
      contratosParaImportar = body.contratos || [];
    }

    if (contratosParaImportar.length === 0) {
      return NextResponse.json({ error: 'Nenhum contrato válido para importar.' }, { status: 400 });
    }

    const rascunhosCriados = [];

    // Cada contrato importado entra no sistema como RASCUNHO (ContratoRascunho)
    // Preserva todas as informações de licitação, fornecedor e equipe de fiscais (incluindo cidades dos setoriais)
    for (const c of contratosParaImportar) {
      if (!c.objeto && !c.numeroContrato && !c.processoSeiMae) continue;

      const rascunho = await prisma.contratoRascunho.create({
        data: {
          usuarioId: session.id,
          tituloIdentificador: c.numeroContrato
            ? `Contrato nº ${c.numeroContrato}`
            : (c.processoSeiMae ? `SEI: ${c.processoSeiMae}` : 'Contrato Importado em Lote'),
          numeroContrato: c.numeroContrato || null,
          processoSei: c.processoSeiMae || null,
          objeto: c.objeto || null,
          dados: {
            numeroContrato: c.numeroContrato || '',
            idSeiContrato: c.idSeiContrato || '',
            numeroEmpenho: c.empenho || '',
            empenhoSubstituiContrato: false,
            processoSeiMae: c.processoSeiMae || '',
            licitacaoProcedimento: c.licitacaoProcedimento || 'Pregão Eletrônico',
            objeto: c.objeto || '',
            descricaoObjeto: c.descricaoObjeto || '',
            isNovoFornecedor: true,
            fornecedorNovo: {
              razaoSocial: c.razaoSocial || 'Fornecedor Pendente',
              cnpj: c.cnpj || '00000000000000',
              email: c.email || 'contato@fornecedor.com',
              telefone: '',
              endereco: c.endereco || '',
              nomeRepresentanteLegal: c.nomeRepresentanteLegal || '',
              telefoneRepresentanteLegal: c.telefoneRepresentanteLegal || '',
              emailRepresentanteLegal: c.emailRepresentanteLegal || '',
              nomePreposto: c.nomePreposto || '',
              telefonePreposto: c.contatoPreposto || '',
              emailPreposto: '',
            },
            documentosSei: {
              dfdIdSei: c.dfdIdSei || '',
              riscosIdSei: c.riscosIdSei || '',
              etpIdSei: c.etpIdSei || '',
              trIdSei: c.trIdSei || '',
              editalIdSei: c.editalIdSei || '',
            },
            numeroAtoDesignacao: c.numeroAtoDesignacao || '',
            idSeiAtoDesignacao: c.idSeiAtoDesignacao || '',
            vigenciaInicio: c.vigenciaInicio || '',
            vigenciaFim: c.vigenciaFim || '',
            valorGlobal: String(c.valorGlobal || '0'),
            tipoVigencia: c.tipoVigencia || 'NAO_CONTINUADO',
            tipoContrato: c.tipoContrato || 'FORNECIMENTO_SIMPLES',
            tipoEmpreitada: c.tipoEmpreitada || 'PRECO_UNITARIO',
            tipoMedicao: 'MENSAL',
            tipoAgrupamento: 'ITEM_INDIVIDUAL',
            responsaveis: (c.responsaveis || []) as any,
            itens: [], // Itens para validação e lançamento contrato a contrato ou importação inteligente
          } as any,
        },
      });

      rascunhosCriados.push(rascunho);
    }

    return NextResponse.json({
      success: true,
      totalImportados: rascunhosCriados.length,
      mensagem: `${rascunhosCriados.length} contratos importados com sucesso com equipe de fiscais (incluindo setoriais e cidades)! Eles constam como rascunho prontos para validação e ativação.`,
      rascunhos: rascunhosCriados,
    });
  } catch (error: any) {
    console.error('Erro na importação em lote:', error);
    return NextResponse.json({ error: error.message || 'Erro ao importar contratos em lote' }, { status: 500 });
  }
}
