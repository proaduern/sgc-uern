// Conversor de valores numéricos monetários para texto por extenso (BRL)
export function valorPorExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenasEspeciais = [
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze',
    'dezesseis', 'dezessete', 'dezoito', 'dezenove'
  ];
  const dezenas = [
    '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
    'sessenta', 'setenta', 'oitenta', 'noventa'
  ];
  const centenas = [
    '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
  ];

  function converteGrupo(n: number): string {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);
    if (d === 1) {
      partes.push(dezenasEspeciais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(' e ');
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const bilhoes = Math.floor(inteiro / 1000000000);
  const milhoes = Math.floor((inteiro % 1000000000) / 1000000);
  const milhares = Math.floor((inteiro % 1000000) / 1000);
  const resto = inteiro % 1000;

  const partesTexto: string[] = [];

  if (bilhoes > 0) {
    partesTexto.push(converteGrupo(bilhoes) + (bilhoes === 1 ? ' bilhão' : ' bilhões'));
  }
  if (milhoes > 0) {
    partesTexto.push(converteGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
  }
  if (milhares > 0) {
    partesTexto.push(converteGrupo(milhares) + ' mil');
  }
  if (resto > 0) {
    partesTexto.push(converteGrupo(resto));
  }

  let resultado = '';
  if (partesTexto.length > 0) {
    resultado = partesTexto.join(' ') + (inteiro === 1 ? ' real' : ' reais');
  }

  if (centavos > 0) {
    const textoCentavos = converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    if (resultado) {
      resultado += ' e ' + textoCentavos;
    } else {
      resultado = textoCentavos;
    }
  }

  return resultado || 'zero reais';
}
