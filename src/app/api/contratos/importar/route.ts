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
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = (formData.get('planilha') || formData.get('file')) as File | null;

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
      const linhaNum = i + 2;

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

      const razaoSocial = String(getVal(['razao social', 'fornecedor', 'empresa', 'contratada']) || '').trim();
      const cnpjRaw = String(getVal(['cnpj', 'cpf/cnpj']) || '').replace(/\D/g, '').trim();
      const email = String(getVal(['email', 'e-mail']) || '').trim();
      const telefone = String(getVal(['telefone da empresa', 'telefone', 'fone', 'tel']) || '').trim();
      const endereco = String(getVal(['endereco', 'logradouro', 'localizacao']) || '').trim();

      // Representante Legal
      const repLegal = String(getVal(['representante legal', 'representante', 'signatario', 'assinante']) || '').trim();
      const repCpf = String(getVal(['cpf representante', 'cpf signatario']) || '').replace(/\D/g, '').trim();
      const repTel = String(getVal(['telefone representante', 'tel representante']) || '').trim();
      const repEmail = String(getVal(['email representante']) || '').trim();

      // Preposto
      const preposto = String(getVal(['preposto', 'contato operacional']) || '').trim();
      const prepostoTel = String(getVal(['telefone preposto', 'tel preposto']) || '').trim();
      const prepostoEmail = String(getVal(['email preposto']) || '').trim();

      const processoSei = String(getVal(['processo sei', 'sei', 'processo']) || '').trim();
      const licitacao = String(getVal(['licitacao', 'procedimento', 'modalidade']) || 'Pregão Eletrônico').trim();
      const objeto = String(getVal(['objeto', 'descricao']) || '').trim();
      const valorGlobal = parseBrazilianNumber(getVal(['valor global', 'valor', 'total']));
      const vigenciaInicio = getVal(['inicio vigencia', 'vigencia inicio', 'inicio', 'data inicio']);
      const vigenciaFim = getVal(['fim vigencia', 'vigencia fim', 'fim', 'data fim']);
      const numContrato = String(getVal(['numero contrato', 'contrato', 'num']) || '').trim();
      const numEmpenho = String(getVal(['numero empenho', 'empenho', 'ne']) || '').trim();
      const continuadoVal = String(getVal(['regime', 'continuado', 'tipo vigencia']) || '').toUpperCase();
      const tipoVigencia = continuadoVal.includes('CONTINUADO') ? 'CONTINUADO' : 'NAO_CONTINUADO';

      if (!razaoSocial && !processoSei && !objeto && !numContrato) {
        continue;
      }

      try {
        // Criar como ContratoRascunho (pendente de inserção de itens para validação)
        await prisma.contratoRascunho.create({
          data: {
            usuarioId: session.id,
            tituloIdentificador: numContrato
              ? `Contrato nº ${numContrato}`
              : (processoSei ? `SEI: ${processoSei}` : `Contrato Importado (Linha ${linhaNum})`),
            numeroContrato: numContrato || null,
            processoSei: processoSei || null,
            objeto: objeto || null,
            dados: {
              numeroContrato: numContrato || '',
              numeroEmpenho: numEmpenho || '',
              empenhoSubstituiContrato: false,
              processoSeiMae: processoSei || '',
              licitacaoProcedimento: licitacao,
              objeto: objeto || '',
              isNovoFornecedor: true,
              fornecedorNovo: {
                razaoSocial: razaoSocial || 'Fornecedor Pendente',
                cnpj: cnpjRaw || '00000000000000',
                email: email || 'contato@empresa.com.br',
                telefone: telefone || '',
                endereco: endereco || '',
                nomeRepresentanteLegal: repLegal || '',
                cpfRepresentanteLegal: repCpf || '',
                telefoneRepresentanteLegal: repTel || '',
                emailRepresentanteLegal: repEmail || '',
                nomePreposto: preposto || '',
                telefonePreposto: prepostoTel || '',
                emailPreposto: prepostoEmail || '',
              },
              vigenciaInicio: vigenciaInicio ? String(vigenciaInicio).split('T')[0] : '',
              vigenciaFim: vigenciaFim ? String(vigenciaFim).split('T')[0] : '',
              valorGlobal: String(valorGlobal || '0'),
              tipoVigencia,
              tipoContrato: 'FORNECIMENTO_SIMPLES',
              tipoEmpreitada: 'PRECO_UNITARIO',
              tipoMedicao: 'MENSAL',
              tipoAgrupamento: 'ITEM_INDIVIDUAL',
              itens: [], // Fica como rascunho até os itens serem cadastrados
            },
          },
        });

        sucessos++;
      } catch (err: any) {
        erros.push(`Linha ${linhaNum}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${sucessos} contratos importados com sucesso como Rascunhos! Eles já constam no painel para que você adicione os itens e finalize cada um.`,
      sucessos,
      erros,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha no processamento da planilha: ' + error.message }, { status: 500 });
  }
}
