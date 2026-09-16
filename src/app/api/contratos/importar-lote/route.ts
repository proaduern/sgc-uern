import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

function parseBrazilianNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim().replace(/R\$\s?/gi, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    let contratosParaImportar: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'A planilha enviada está vazia.' }, { status: 400 });
      }

      contratosParaImportar = rows.map((row) => {
        const keys = Object.keys(row);
        const getVal = (patterns: string[]) => {
          for (const key of keys) {
            const norm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (patterns.some((p) => norm.includes(p))) {
              return row[key];
            }
          }
          return '';
        };

        const numContrato = String(getVal(['contrato', 'num contrato', 'numero']) || '').trim();
        const numEmpenho = String(getVal(['empenho', 'ne', 'nota de empenho']) || '').trim();
        const sei = String(getVal(['sei', 'processo']) || '').trim();
        const licitacao = String(getVal(['licitacao', 'procedimento', 'modalidade']) || 'Pregão Eletrônico').trim();
        const objeto = String(getVal(['objeto', 'descricao', 'especificacao']) || '').trim();
        const razaoSocial = String(getVal(['fornecedor', 'empresa', 'razao social', 'contratada']) || '').trim();
        const cnpj = String(getVal(['cnpj', 'cpf/cnpj']) || '').replace(/\D/g, '').trim();
        const email = String(getVal(['email', 'e-mail']) || '').trim();
        const telefone = String(getVal(['telefone', 'fone', 'tel']) || '').trim();
        const endereco = String(getVal(['endereco', 'logradouro', 'localizacao']) || '').trim();

        // Representante Legal
        const repLegal = String(getVal(['representante', 'rep legal', 'signatario', 'assinante']) || '').trim();
        const repCpf = String(getVal(['cpf representante', 'cpf signatario']) || '').replace(/\D/g, '').trim();
        const repTel = String(getVal(['tel representante', 'telefone representante']) || '').trim();
        const repEmail = String(getVal(['email representante']) || '').trim();

        // Preposto Operacional
        const preposto = String(getVal(['preposto', 'contato operacional']) || '').trim();
        const prepostoTel = String(getVal(['tel preposto', 'telefone preposto']) || '').trim();
        const prepostoEmail = String(getVal(['email preposto']) || '').trim();

        // Vigência & Valores
        const inicio = getVal(['inicio', 'vigencia inicio', 'data inicio']);
        const fim = getVal(['fim', 'vigencia fim', 'data fim']);
        const valorGlobal = parseBrazilianNumber(getVal(['valor', 'valor global', 'global', 'total']));
        const continuadoVal = String(getVal(['regime', 'continuado', 'tipo vigencia']) || '').toUpperCase();
        const tipoVigencia = continuadoVal.includes('CONTINUADO') ? 'CONTINUADO' : 'NAO_CONTINUADO';

        return {
          numeroContrato: numContrato,
          numeroEmpenho: numEmpenho,
          processoSeiMae: sei,
          licitacaoProcedimento: licitacao,
          objeto,
          razaoSocial,
          cnpj,
          email,
          telefone,
          endereco,
          nomeRepresentanteLegal: repLegal,
          cpfRepresentanteLegal: repCpf,
          telefoneRepresentanteLegal: repTel,
          emailRepresentanteLegal: repEmail,
          nomePreposto: preposto,
          telefonePreposto: prepostoTel,
          emailPreposto: prepostoEmail,
          vigenciaInicio: inicio ? String(inicio).split('T')[0] : '',
          vigenciaFim: fim ? String(fim).split('T')[0] : '',
          valorGlobal: valorGlobal > 0 ? valorGlobal : 0,
          tipoVigencia,
        };
      });
    } else {
      const body = await request.json();
      contratosParaImportar = body.contratos || [];
    }

    if (contratosParaImportar.length === 0) {
      return NextResponse.json({ error: 'Nenhum contrato válido identificado na planilha.' }, { status: 400 });
    }

    const rascunhosCriados = [];

    // Cada contrato importado entra no sistema como RASCUNHO (ContratoRascunho)
    // Conforme especificado: somente é oficializado após o usuário incluir e validar os itens!
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
            numeroEmpenho: c.numeroEmpenho || '',
            empenhoSubstituiContrato: false,
            processoSeiMae: c.processoSeiMae || '',
            licitacaoProcedimento: c.licitacaoProcedimento || 'Pregão Eletrônico',
            objeto: c.objeto || '',
            isNovoFornecedor: true,
            fornecedorNovo: {
              razaoSocial: c.razaoSocial || 'Fornecedor Pendente',
              cnpj: c.cnpj || '00000000000000',
              email: c.email || 'contato@fornecedor.com',
              telefone: c.telefone || '',
              endereco: c.endereco || '',
              nomeRepresentanteLegal: c.nomeRepresentanteLegal || '',
              cpfRepresentanteLegal: c.cpfRepresentanteLegal || '',
              telefoneRepresentanteLegal: c.telefoneRepresentanteLegal || '',
              emailRepresentanteLegal: c.emailRepresentanteLegal || '',
              nomePreposto: c.nomePreposto || '',
              telefonePreposto: c.telefonePreposto || '',
              emailPreposto: c.emailPreposto || '',
            },
            vigenciaInicio: c.vigenciaInicio || '',
            vigenciaFim: c.vigenciaFim || '',
            valorGlobal: String(c.valorGlobal || '0'),
            tipoVigencia: c.tipoVigencia || 'NAO_CONTINUADO',
            tipoContrato: 'FORNECIMENTO_SIMPLES',
            tipoEmpreitada: 'PRECO_UNITARIO',
            tipoMedicao: 'MENSAL',
            tipoAgrupamento: 'ITEM_INDIVIDUAL',
            itens: [], // Itens vazios: pronto para serem lançados contrato a contrato
          },
        },
      });

      rascunhosCriados.push(rascunho);
    }

    return NextResponse.json({
      success: true,
      totalImportados: rascunhosCriados.length,
      mensagem: `${rascunhosCriados.length} contratos importados com sucesso como rascunho! Você pode continuar o preenchimento de cada um e adicionar os itens.`,
      rascunhos: rascunhosCriados,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao importar contratos em lote' }, { status: 500 });
  }
}
