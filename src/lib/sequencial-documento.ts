import prisma from '@/lib/prisma';

export type TipoDocumentoSgc = 'ORDEM_SERVICO' | 'ORDEM_COMPRA' | 'OFICIO' | 'MEMORANDO';

export function normalizarTipoDocumento(tipo: string): TipoDocumentoSgc {
  const t = (tipo || '').toUpperCase().trim();
  if (t === 'ORDEM_COMPRA' || t === 'OC') return 'ORDEM_COMPRA';
  if (t === 'OFICIO' || t === 'OFÍCIO') return 'OFICIO';
  if (t === 'MEMORANDO' || t === 'MEMO') return 'MEMORANDO';
  return 'ORDEM_SERVICO';
}

export function obterRotuloTipoDocumento(tipo: string): string {
  const t = normalizarTipoDocumento(tipo);
  switch (t) {
    case 'ORDEM_COMPRA':
      return 'Ordem de Compra';
    case 'OFICIO':
      return 'Ofício';
    case 'MEMORANDO':
      return 'Memorando';
    case 'ORDEM_SERVICO':
    default:
      return 'Ordem de Serviço';
  }
}

/**
 * Formata um número e ano no padrão oficial do SGC UERN:
 * Ex: Ordem de Serviço nº 01/2026 - SGC UERN
 * Ex: Ofício nº 01/2026 - SGC UERN
 * Ex: Ordem de Compra nº 01/2026 - SGC UERN
 * Ex: Memorando nº 01/2026 - SGC UERN
 */
export function formatarTextoDocumentoSgc(
  tipo: string,
  numero: number | string,
  ano?: number | string
): string {
  const rotulo = obterRotuloTipoDocumento(tipo);
  const anoAtual = ano ? parseInt(String(ano), 10) : new Date().getFullYear();

  let numInt = 1;
  if (typeof numero === 'number') {
    numInt = numero;
  } else {
    // Extrai o primeiro bloco numérico
    const match = String(numero || '').match(/(\d+)/);
    if (match) {
      numInt = parseInt(match[1], 10);
    }
  }

  const numFormatado = String(numInt).padStart(2, '0');
  return `${rotulo} nº ${numFormatado}/${anoAtual} - SGC UERN`;
}

/**
 * Formata apenas a fração "01/2026 - SGC UERN" ou "01/2026-SGC"
 */
export function formatarNumeroAnoSgc(numero: number | string, ano?: number | string): string {
  const anoAtual = ano ? parseInt(String(ano), 10) : new Date().getFullYear();
  let numInt = 1;
  if (typeof numero === 'number') {
    numInt = numero;
  } else {
    const match = String(numero || '').match(/(\d+)/);
    if (match) {
      numInt = parseInt(match[1], 10);
    }
  }
  const numFormatado = String(numInt).padStart(2, '0');
  return `${numFormatado}/${anoAtual} - SGC UERN`;
}

/**
 * Consulta o próximo número sequencial sem consumi-lo (para pré-visualização)
 */
export async function obterProximoSequencial(tipo: string, anoParam?: number) {
  const t = normalizarTipoDocumento(tipo);
  const ano = anoParam || new Date().getFullYear();

  const registro = await prisma.sequencialDocumento.findUnique({
    where: {
      tipo_ano: { tipo: t, ano },
    },
  });

  const proximoNumero = (registro?.ultimoNumero || 0) + 1;
  const numeroFormatado = String(proximoNumero).padStart(2, '0');

  return {
    tipo: t,
    rotuloTipo: obterRotuloTipoDocumento(t),
    ano,
    proximoNumero,
    numeroFormatado,
    identificador: `${numeroFormatado}/${ano} - SGC UERN`,
    tituloCompleto: formatarTextoDocumentoSgc(t, proximoNumero, ano),
  };
}

/**
 * Reserva e incrementa atômica e definitivamente o sequencial no banco
 */
export async function reservarProximoSequencial(
  tipo: string,
  anoParam?: number,
  numeroEspecifico?: number
) {
  const t = normalizarTipoDocumento(tipo);
  const ano = anoParam || new Date().getFullYear();

  return await prisma.$transaction(async (tx) => {
    const registro = await tx.sequencialDocumento.findUnique({
      where: {
        tipo_ano: { tipo: t, ano },
      },
    });

    let novoNumero = (registro?.ultimoNumero || 0) + 1;
    if (numeroEspecifico && numeroEspecifico > (registro?.ultimoNumero || 0)) {
      novoNumero = numeroEspecifico;
    }

    const atualizado = await tx.sequencialDocumento.upsert({
      where: {
        tipo_ano: { tipo: t, ano },
      },
      create: {
        tipo: t,
        ano,
        ultimoNumero: novoNumero,
      },
      update: {
        ultimoNumero: novoNumero,
      },
    });

    const numFormatado = String(atualizado.ultimoNumero).padStart(2, '0');
    return {
      tipo: t,
      rotuloTipo: obterRotuloTipoDocumento(t),
      ano,
      numero: atualizado.ultimoNumero,
      numeroFormatado: numFormatado,
      identificador: `${numFormatado}/${ano} - SGC UERN`,
      tituloCompleto: formatarTextoDocumentoSgc(t, atualizado.ultimoNumero, ano),
    };
  });
}
