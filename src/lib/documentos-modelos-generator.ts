export interface ParametrosOficioProrrogacao {
  numeroOficio: string;
  ano: number;
  fornecedor: string;
  cnpj: string;
  enderecoFornecedor: string;
  numeroContrato: string;
  processoSei: string;
  objeto: string;
  mesesProrrogacao: number;
  vigenciaProrrogadaInicio: string; // DD/MM/AAAA
  vigenciaProrrogadaFim: string; // DD/MM/AAAA
  gestorNome: string;
  gestorMatricula: string;
  gestorAto: string;
  gestorCargo?: string;
}

export interface ParametrosSolicitacaoProrrogacao {
  numeroSolicitacao: string;
  ano: number;
  numeroContrato: string;
  processoSei: string;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  documentosProcesso: Array<{ item: string; descricao: string; idSei?: string }>;
  justificativa: string;
  mesesProrrogacao: number;
  vigenciaProrrogadaInicio: string;
  vigenciaProrrogadaFim: string;
  valorEstimadoProrrogacao: number;
  gestorNome: string;
  gestorMatricula: string;
  gestorAto: string;
  gestorCargo?: string;
}

export interface ItemComparativoRepactuacao {
  numeroItem: number;
  cidade: string;
  funcao: string;
  tipo: string; // Posto
  quantidade: number;
  valorUnitarioMensalAnterior: number;
  valorUnitarioAnualAnterior: number;
  valorTotalAnterior: number;
  valorUnitarioMensalNovo: number;
  valorUnitarioAnualNovo: number;
  valorTotalNovo: number;
}

export interface MesProRataRepactuacao {
  ordem: number;
  mes: string;
  diasProporcionais?: number;
  valorVigenteAnterior: number;
  valorRepactuacaoNovo: number;
  diferenca: number;
}

export interface ParametrosSolicitacaoRepactuacao {
  numeroSolicitacao: string;
  ano: number;
  numeroContrato: string;
  idSeiContrato?: string;
  processoSei: string;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  portariaContinuos?: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  cctRegistro?: string;
  itensComparativos: ItemComparativoRepactuacao[];
  mesesProRata: MesProRataRepactuacao[];
  valorTotalApostilamento: number;
  gestorNome: string;
  gestorMatricula: string;
  gestorAto: string;
  gestorCargo?: string;
}

function fmtMoeda(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 1. Gerador do Ofício ao Fornecedor - Anuência de Prorrogação
export function gerarHtmlOficioProrrogacao(p: ParametrosOficioProrrogacao): string {
  return `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <strong>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN</strong><br />
    <span style="font-size: 10pt;">Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210</span><br />
    <span style="font-size: 10pt;">Telefone: (84) 3315-2100 - http://portal.uern.br/</span>
  </div>

  <p style="text-align: left; font-weight: bold; margin-bottom: 15px;">
    Ofício nº ${p.numeroOficio}/${p.ano}/UERN - PROAD - DAS/UERN - PROAD/UERN - REITORIA-UERN
  </p>

  <p style="margin-bottom: 15px;">
    À empresa <strong>${p.fornecedor}</strong>, CNPJ nº <strong>${p.cnpj}</strong><br />
    ${p.enderecoFornecedor || 'Endereço cadastral constante dos autos'}
  </p>

  <p style="margin-bottom: 10px;"><strong>Assunto:</strong> Solicitação de Prorrogação Contratual - CTR nº ${p.numeroContrato} - ${p.fornecedor}</p>
  <p style="margin-bottom: 20px;"><strong>Referência:</strong> Caso responda este Ofício, indicar expressamente o <strong>Processo nº ${p.processoSei}</strong>.</p>

  <p style="margin-bottom: 15px;">Prezado(a),</p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
    Em cumprimento à legislação vigente que norteia a Administração Pública, solicitamos posicionamento formal desta empresa quanto ao <strong>ACEITE</strong> para a prorrogação do <strong>Contrato nº ${p.numeroContrato}</strong>, firmado com a Fundação Universidade do Estado do Rio Grande do Norte (FUERN), que tem como objeto a ${p.objeto}.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
    Trata-se de procedimento preliminar para fins de instrução processual, visando a formalização de termo aditivo para a prorrogação do prazo de vigência contratual por mais <strong>${p.mesesProrrogacao.toString().padStart(2, '0')} (${p.mesesProrrogacao}) meses</strong>, compreendendo o período de <strong>${p.vigenciaProrrogadaInicio} a ${p.vigenciaProrrogadaFim}</strong>, mantendo-se inalteradas as demais cláusulas e condições do contrato.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
    Diante do exposto, solicitamos o envio de resposta formal, por meio de Ofício, no prazo de até <strong>05 (cinco) dias úteis</strong>, a contar do recebimento deste expediente, para que possamos dar o devido andamento aos trâmites administrativos necessários em tempo hábil.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 25px;">
    A manifestação formal de aceite (ou recusa) deverá ser encaminhada eletronicamente para o e-mail institucional <strong>diram@uern.br / servicos@uern.br</strong>, em arquivo digitalizado e devidamente assinado por representante legal habilitado, acompanhada das respectivas certidões de regularidade fiscal vigentes (Federal, Estadual, Municipal, Trabalhista, FGTS e CADIN).
  </p>

  <p style="text-align: center; margin-top: 40px; margin-bottom: 5px;">Atenciosamente,</p>
  <p style="text-align: center; margin-bottom: 30px;">Mossoró/RN, data da assinatura eletrônica.</p>

  <div style="text-align: center; margin-top: 40px;">
    <strong>${p.gestorNome}</strong><br />
    Matrícula nº ${p.gestorMatricula}<br />
    ${p.gestorAto}<br />
    ${p.gestorCargo || 'Gestor(a) do Contrato'}
  </div>
</div>
  `.trim();
}

// 2. Gerador da Solicitação de Providências - Prorrogação
export function gerarHtmlSolicitacaoProrrogacao(p: ParametrosSolicitacaoProrrogacao): string {
  const docsList = p.documentosProcesso && p.documentosProcesso.length > 0
    ? p.documentosProcesso.map(d => `<li style="margin-bottom: 4px;">${d.descricao}${d.idSei ? `: <strong>ID ${d.idSei}</strong>` : ''};</li>`).join('')
    : `
      <li>Processo de contratação: Processo SEI nº ${p.processoSei};</li>
      <li>Contrato nº ${p.numeroContrato} - FUERN;</li>
      <li>Ofício da empresa manifestando anuência quanto à prorrogação;</li>
      <li>Certidões de regularidade fiscal e trabalhista vigentes;</li>
    `;

  return `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px;">
  <p style="font-weight: bold; margin-bottom: 10px;">
    Solicitação de Providências nº ${p.numeroSolicitacao}/${p.ano}/UERN - PROAD - DAS/UERN - PROAD/UERN - REITORIA
  </p>

  <p style="margin-bottom: 15px;">
    <strong>À Pró-Reitoria de Administração - PROAD/UERN</strong><br />
    <strong>Assunto:</strong> Solicitação de providências referente ao pedido de prorrogação do Contrato nº ${p.numeroContrato} – FUERN.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 12px;">
    Considerando a legislação que norteia a Administração Pública, solicitamos providências quanto à <strong>PRORROGAÇÃO</strong> do <strong>Contrato nº ${p.numeroContrato}-FUERN</strong>, firmado entre a empresa <strong>${p.fornecedor}</strong>, inscrita no CNPJ/MF sob o nº <strong>${p.cnpj}</strong>, e a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, que tem como objeto a ${p.objeto}.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 10px;">
    Considerando a orientação da PGE/RN e do Gabinete da PROAD de que todos os processos de prorrogação, reajuste e repactuação relativos a contratos devem ser tramitados e instruídos dentro do processo principal, informamos abaixo os documentos relacionados com os seus respectivos IDs:
  </p>

  <ol type="a" style="margin-left: 20px; margin-bottom: 15px;">
    ${docsList}
  </ol>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 12px;">
    ${p.justificativa || `Trata-se de serviço continuado essencial às atividades institucionais da UERN, cuja prorrogação por ${p.mesesProrrogacao} meses (período de ${p.vigenciaProrrogadaInicio} a ${p.vigenciaProrrogadaFim}) demonstra-se vantajosa para a Administração Pública.`}
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 20px;">
    O valor total estimado para a presente prorrogação é de <strong>${fmtMoeda(p.valorEstimadoProrrogacao)}</strong>. Diante do exposto, encaminhamos o processo para deliberação, autorização da autoridade competente e formalização do competente Termo Aditivo de Prorrogação.
  </p>

  <div style="text-align: center; margin-top: 40px;">
    <strong>${p.gestorNome}</strong><br />
    Matrícula nº ${p.gestorMatricula}<br />
    ${p.gestorAto}<br />
    ${p.gestorCargo || 'Gestor(a) do Contrato'}
  </div>
</div>
  `.trim();
}

// 3. Gerador da Solicitação de Providências - Repactuação (com Tabelas 01 e 02)
export function gerarHtmlSolicitacaoRepactuacao(p: ParametrosSolicitacaoRepactuacao): string {
  // Monta linhas da Tabela 01
  const linhasTabela01 = p.itensComparativos.map((it) => `
    <tr>
      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${it.numeroItem}</td>
      <td style="border: 1px solid #000; padding: 4px;">${it.cidade}</td>
      <td style="border: 1px solid #000; padding: 4px;">${it.funcao}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${it.tipo}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${it.quantidade}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmtMoeda(it.valorUnitarioMensalAnterior)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmtMoeda(it.valorTotalAnterior)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right; background-color: #f0fdf4;">${fmtMoeda(it.valorUnitarioMensalNovo)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right; background-color: #f0fdf4;">${fmtMoeda(it.valorTotalNovo)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${fmtMoeda(it.valorTotalNovo - it.valorTotalAnterior)}</td>
    </tr>
  `).join('');

  const totalAnterior = p.itensComparativos.reduce((acc, it) => acc + it.valorTotalAnterior, 0);
  const totalNovo = p.itensComparativos.reduce((acc, it) => acc + it.valorTotalNovo, 0);
  const diferencaGlobal = totalNovo - totalAnterior;

  // Monta linhas da Tabela 02 (Mês a mês pro-rata)
  const linhasTabela02 = p.mesesProRata.map((m) => `
    <tr>
      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${m.ordem}</td>
      <td style="border: 1px solid #000; padding: 4px;">${m.mes}${m.diasProporcionais ? ` (${m.diasProporcionais} dias)*` : ''}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmtMoeda(m.valorVigenteAnterior)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmtMoeda(m.valorRepactuacaoNovo)}</td>
      <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${fmtMoeda(m.diferenca)}</td>
    </tr>
  `).join('');

  const totalTabela02Anterior = p.mesesProRata.reduce((acc, m) => acc + m.valorVigenteAnterior, 0);
  const totalTabela02Novo = p.mesesProRata.reduce((acc, m) => acc + m.valorRepactuacaoNovo, 0);
  const totalTabela02Diferenca = p.mesesProRata.reduce((acc, m) => acc + m.diferenca, 0);

  return `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; max-width: 950px; margin: 0 auto; padding: 20px;">
  <p style="font-weight: bold; margin-bottom: 10px;">
    Solicitação de Providências nº ${p.numeroSolicitacao}/${p.ano}/UERN - PROAD - DAS/UERN - PROAD/UERN - REITORIA
  </p>

  <p style="margin-bottom: 15px;">
    <strong>À Pró-Reitoria de Administração - PROAD</strong><br />
    <strong>Assunto:</strong> Solicitação de providências referente ao pedido de Repactuação do Contrato nº ${p.numeroContrato} – FUERN.
  </p>

  <p style="text-align: justify; margin-bottom: 8px;">
    CONSIDERANDO a legislação que norteia a Administração Pública, solicitamos providências quanto ao pedido de <strong>REPACTUAÇÃO</strong> do <strong>Contrato nº ${p.numeroContrato}-FUERN${p.idSeiContrato ? ` (${p.idSeiContrato})` : ''}</strong>, firmado entre a empresa <strong>${p.fornecedor}</strong>, inscrita no CNPJ sob o nº <strong>${p.cnpj}</strong>, e a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, que tem como objeto a ${p.objeto};
  </p>

  <p style="text-align: justify; margin-bottom: 8px;">
    CONSIDERANDO que se trata de prestação de serviço contínuo essencial às atividades da Instituição${p.portariaContinuos ? `, conforme Portaria ${p.portariaContinuos}` : ''};
  </p>

  <p style="text-align: justify; margin-bottom: 8px;">
    CONSIDERANDO a vigência pactuada de <strong>${p.vigenciaInicio} a ${p.vigenciaFim}</strong> e a previsão editalícia e contratual de repactuação fundada na variação dos custos da mão de obra decorrente de Convenção Coletiva de Trabalho${p.cctRegistro ? ` (CCT nº ${p.cctRegistro})` : ''};
  </p>

  <p style="text-align: justify; margin-bottom: 12px;">
    Trazemos a seguir o detalhamento comparativo dos itens e valores vigentes e propostos:
  </p>

  <h4 style="margin-top: 15px; margin-bottom: 6px; font-size: 11pt; text-align: center;">
    TABELA 01 - DEMONSTRATIVO COMPARATIVO ITEM A ITEM / CARGO / CAMPUS
  </h4>

  <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="border: 1px solid #000; padding: 4px;">Item</th>
        <th style="border: 1px solid #000; padding: 4px;">Campus/Município</th>
        <th style="border: 1px solid #000; padding: 4px;">Função</th>
        <th style="border: 1px solid #000; padding: 4px;">Tipo</th>
        <th style="border: 1px solid #000; padding: 4px;">Qtd</th>
        <th style="border: 1px solid #000; padding: 4px;">Unit. Mensal Anterior</th>
        <th style="border: 1px solid #000; padding: 4px;">Total Anual Anterior</th>
        <th style="border: 1px solid #000; padding: 4px; background-color: #e2e8f0;">Unit. Mensal Novo</th>
        <th style="border: 1px solid #000; padding: 4px; background-color: #e2e8f0;">Total Anual Novo</th>
        <th style="border: 1px solid #000; padding: 4px;">Diferença Anual</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela01}
      <tr style="font-weight: bold; background-color: #f8fafc;">
        <td colspan="6" style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL GERAL ESTIMADO:</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${fmtMoeda(totalAnterior)}</td>
        <td></td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${fmtMoeda(totalNovo)}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #166534;">${fmtMoeda(diferencaGlobal)}</td>
      </tr>
    </tbody>
  </table>

  <h4 style="margin-top: 15px; margin-bottom: 6px; font-size: 11pt; text-align: center;">
    TABELA 02 - VALORES MÊS A MÊS DO PERÍODO COM CÁLCULO PRO-RATA
  </h4>

  <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="border: 1px solid #000; padding: 4px; width: 50px;">Ord.</th>
        <th style="border: 1px solid #000; padding: 4px;">Mês / Competência</th>
        <th style="border: 1px solid #000; padding: 4px;">Valor Vigente Anterior</th>
        <th style="border: 1px solid #000; padding: 4px;">Valor da Repactuação</th>
        <th style="border: 1px solid #000; padding: 4px;">Diferença Residual</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela02}
      <tr style="font-weight: bold; background-color: #f8fafc;">
        <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL:</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${fmtMoeda(totalTabela02Anterior)}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${fmtMoeda(totalTabela02Novo)}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #166534;">${fmtMoeda(totalTabela02Diferenca)}</td>
      </tr>
    </tbody>
  </table>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 12px;">
    Diante do exposto, o valor total do apostilamento decorrente da Repactuação será de <strong>${fmtMoeda(p.valorTotalApostilamento || totalTabela02Diferenca)}</strong>, passando o novo valor global anual do contrato para <strong>${fmtMoeda(totalNovo)}</strong>, que passará a constituir a nova base de cálculo para eventuais acréscimos e supressões supervenientes.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 25px;">
    Encaminhamos os autos à Pró-Reitoria de Administração para a formalização do competente <strong>Termo de Apostilamento</strong> e as providências financeiras pertinentes.
  </p>

  <div style="text-align: center; margin-top: 40px;">
    <strong>${p.gestorNome}</strong><br />
    Matrícula nº ${p.gestorMatricula}<br />
    ${p.gestorAto}<br />
    ${p.gestorCargo || 'Gestor(a) do Contrato'}
  </div>
</div>
  `.trim();
}
