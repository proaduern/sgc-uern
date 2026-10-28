import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
} from 'docx';

export interface MembroEquipeAto {
  id?: string;
  nome: string;
  matricula: string;
  tipoAtuacao: string; // GESTOR, SUPLENTE, FISCAL_ADMINISTRATIVO, FISCAL_TECNICO, FISCAL_SETORIAL
  campusSetor?: string | null;
}

export interface SubscritorProad {
  nome: string;
  cargo: string;
  matricula: string;
  portaria: string;
  ativo: boolean;
}

export interface ParametrosAtoDesignacao {
  numeroAto: string; // Ex: "448/2026"
  ano: number;
  dataExtenso: string; // Ex: "15 de outubro de 2026"
  cidadeData?: string; // Ex: "Mossoró-RN"
  portariaCompetencia?: string;
  notasEmpenhos?: string;
  idsEmpenhos?: string;
  numeroContrato?: string;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  processoSei: string;
  normativoReferencia?: string;
  membros: MembroEquipeAto[];
  subscritores?: SubscritorProad[];
}

export const SUBCRITORES_PROAD_PADRAO: SubscritorProad[] = [
  {
    nome: 'TNS Ma. Maria Nilza Batista Luz',
    cargo: 'Pró-Reitora de Administração – PROAD/UERN',
    matricula: '08246-5',
    portaria: 'Portaria nº 3649/2025-GP/FUERN',
    ativo: true,
  },
  {
    nome: 'TNS Esp. Pedro Rebouças de Oliveira Neto',
    cargo: 'Pró-Reitor Adjunto de Administração - PROAD/UERN',
    matricula: '08155-8',
    portaria: 'Portaria nº 3649/2025-GP/FUERN',
    ativo: true,
  },
];

export const PORTARIA_COMPETENCIA_PADRAO =
  'PORTARIA Nº 3649/2025-GP/FUERN DE 27 DE SETEMBRO DE 2025 (Id 36708460), publicada no Jornal Oficial da UERN, edição de 29 de setembro de 2025';

export const NORMATIVO_REFERENCIA_PADRAO =
  'Instrução Normativa nº 01/2026 - PROAD, conforme Id SEI 39959658, Processo nº 04410022.000911/2025-29.';

export function formatarPapelExtenso(tipoAtuacao: string, campusSetor?: string | null): string {
  switch (tipoAtuacao) {
    case 'GESTOR':
      return 'Gestor(a) do Contrato';
    case 'SUPLENTE':
      return 'Gestor(a) Suplente do Contrato';
    case 'FISCAL_ADMINISTRATIVO':
      return 'Fiscal Administrativo(a) do Contrato';
    case 'FISCAL_TECNICO':
      return 'Fiscal Técnico(a) do Contrato';
    case 'FISCAL_SETORIAL':
      return campusSetor
        ? `Fiscal Setorial do Contrato (Representante do Campus ${campusSetor.startsWith('Campus') ? campusSetor.replace(/^Campus\s*/i, '') : campusSetor})`
        : 'Fiscal Setorial do Contrato';
    default:
      return tipoAtuacao.replace(/_/g, ' ');
  }
}

/**
 * Monta as alíneas a), b), c), d), e) no padrão rigoroso do SEI / PROAD.
 */
export function montarAlineasAto(membros: MembroEquipeAto[]): Array<{ letra: string; texto: string }> {
  const gestores = membros.filter((m) => m.tipoAtuacao === 'GESTOR');
  const suplentes = membros.filter((m) => m.tipoAtuacao === 'SUPLENTE');
  const fiscaisAdm = membros.filter((m) => m.tipoAtuacao === 'FISCAL_ADMINISTRATIVO');
  const fiscaisTec = membros.filter((m) => m.tipoAtuacao === 'FISCAL_TECNICO');
  const fiscaisSetoriais = membros.filter((m) => m.tipoAtuacao === 'FISCAL_SETORIAL');

  const alineas: Array<{ letra: string; texto: string }> = [];
  const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  let lIdx = 0;

  // a) Gestor Titular
  if (gestores.length > 0) {
    const letra = letras[lIdx++];
    const g = gestores[0];
    alineas.push({
      letra,
      texto: `Designar o(a) servidor(a) ${g.nome}, matrícula nº ${g.matricula || '_______'}, como Gestor(a) do Contrato, podendo, em sua ausência, ser substituído(a) pelo(a) Gestor(a) Suplente do mesmo contrato;`,
    });
  }

  // b) Gestor Suplente
  if (suplentes.length > 0) {
    const letra = letras[lIdx++];
    const s = suplentes[0];
    alineas.push({
      letra,
      texto: `Designar o(a) servidor(a) ${s.nome}, matrícula nº ${s.matricula || '_______'}, como Gestor(a) Suplente do Contrato;`,
    });
  }

  // c) Fiscal Administrativo
  if (fiscaisAdm.length > 0) {
    const letra = letras[lIdx++];
    if (fiscaisAdm.length === 1) {
      const fa = fiscaisAdm[0];
      alineas.push({
        letra,
        texto: `Designar o(a) servidor(a) ${fa.nome}, matrícula nº ${fa.matricula || '_______'}, como Fiscal Administrativo(a) do Contrato, podendo ser substituído(a), em casos excepcionais e mediante justificativa nos autos, por qualquer servidor(a) previamente designado(a) para a Fiscalização Administrativa de outro contrato da Instituição;`,
      });
    } else {
      const listaFas = fiscaisAdm.map((m) => `${m.nome}, matrícula nº ${m.matricula || '_______'}`).join(', e ');
      alineas.push({
        letra,
        texto: `Designar os(as) servidores(as) ${listaFas}, como Fiscais Administrativo(a)s do Contrato, podendo ser substituídos(as), em casos excepcionais e mediante justificativa nos autos, por qualquer servidor(a) previamente designado(a) para a Fiscalização Administrativa de outro contrato da Instituição;`,
      });
    }
  }

  // d) Fiscal Técnico
  if (fiscaisTec.length > 0) {
    const letra = letras[lIdx++];
    if (fiscaisTec.length === 1) {
      const ft = fiscaisTec[0];
      alineas.push({
        letra,
        texto: `Designar o(a) servidor(a) ${ft.nome}, matrícula nº ${ft.matricula || '_______'}, como Fiscal Técnico(a) do Contrato, podendo ser substituído(a) por qualquer servidor(a) previamente designado(a) para Fiscalização Técnica de outro contrato da Instituição ou ainda por servidor(a) que tenha acompanhado in loco a execução do objeto;`,
      });
    } else {
      const listaFts = fiscaisTec
        .map((m, idx) => (idx === fiscaisTec.length - 1 ? `e ${m.nome}, matrícula nº ${m.matricula || '_______'}` : `${m.nome}, matrícula nº ${m.matricula || '_______'}`))
        .join(fiscaisTec.length === 2 ? ' ' : ', ');
      alineas.push({
        letra,
        texto: `Designar o(a)(s) servidor(a)(s) ${listaFts}, como Fiscais Técnico(a)(s) do Contrato, podendo ser substituído(a)(s) por qualquer servidor(a) previamente designado(a) para Fiscalização Técnica de outro contrato da Instituição ou ainda por servidor(a) que tenha acompanhado in loco a execução do objeto;`,
      });
    }
  }

  // e) Fiscal Setorial (Campi)
  if (fiscaisSetoriais.length > 0) {
    const letra = letras[lIdx++];
    const listaSetoriais = fiscaisSetoriais
      .map((m) => {
        const campusNome = m.campusSetor
          ? (m.campusSetor.startsWith('Campus') ? m.campusSetor : `Campus Avançado de ${m.campusSetor}-RN`)
          : 'Campus da Unidade';
        return `${m.nome}, matrícula nº ${m.matricula || '_______'}, como Fiscal Setorial do Contrato (Representante do ${campusNome})`;
      })
      .join('; ');

    alineas.push({
      letra,
      texto: `Designar os(as) servidores(as) ${listaSetoriais}, podendo, em caso de ausência(s), ser(em) substituído(a)(s) por outro(a)(s) servidor(a)(s) lotado(a)(s) no(s) referido(s) Campi, que esteja(m) acompanhando in loco a prestação do serviço.`,
    });
  }

  return alineas;
}

/**
 * Gera documento Word (.docx) compatível com o SEI e com o Microsoft Word.
 */
export async function gerarDocxAtoDesignacao(p: ParametrosAtoDesignacao): Promise<Buffer> {
  const alineas = montarAlineasAto(p.membros);
  const subscritores = (p.subscritores || SUBCRITORES_PROAD_PADRAO).filter((s) => s.ativo);
  const cidadeData = p.cidadeData || 'Mossoró-RN';
  const portariaComp = p.portariaCompetencia || PORTARIA_COMPETENCIA_PADRAO;
  const normativoRef = p.normativoReferencia || NORMATIVO_REFERENCIA_PADRAO;

  // Monta texto do Considerando dos Empenhos e Contrato
  let considerandoEmpenhos = '';
  if (p.notasEmpenhos && p.notasEmpenhos.trim()) {
    const idsPart = p.idsEmpenhos && p.idsEmpenhos.trim() ? ` (${p.idsEmpenhos.trim()})` : '';
    considerandoEmpenhos = `CONSIDERANDO as Notas de Empenhos nºs ${p.notasEmpenhos.trim()}${idsPart}, do Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${p.fornecedor}, CNPJ nº ${p.cnpj}, o qual tem como objeto ${p.objeto}, nos termos do Processo SEI nº ${p.processoSei};`;
  } else {
    considerandoEmpenhos = `CONSIDERANDO o Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${p.fornecedor}, CNPJ nº ${p.cnpj}, o qual tem como objeto ${p.objeto}, nos termos do Processo SEI nº ${p.processoSei};`;
  }

  const numAtoLimpo = p.numeroAto ? p.numeroAto.replace(/^ato\s*(de\s*designação)?\s*(nº\s*)?/i, '').trim() : `___/${p.ano}`;

  const paragraphs: Paragraph[] = [
    // Título Principal
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300, line: 276 },
      children: [
        new TextRun({
          text: `ATO DE DESIGNAÇÃO DE GESTORES E FISCAIS DE CONTRATOS Nº ${numAtoLimpo}`,
          bold: true,
          size: 24, // 12pt
          font: 'Arial',
        }),
      ],
    }),

    // Preâmbulo
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 276 },
      children: [
        new TextRun({
          text: `A Pró-Reitoria de Administração da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE, no uso de suas atribuições conferidas pela ${portariaComp};`,
          size: 22, // 11pt
          font: 'Arial',
        }),
      ],
    }),

    // 1º Considerando
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 276 },
      children: [
        new TextRun({
          text: 'CONSIDERANDO ',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
        new TextRun({
          text: 'a exigência legal de designação de representante da Administração para acompanhamento e fiscalização da execução dos contratos administrativos, que representará a FUERN perante o(a) contratado(a) e zelará pela boa execução do objeto pactuado, exercendo as atividades de orientação, fiscalização e controle;',
          size: 22,
          font: 'Arial',
        }),
      ],
    }),

    // 2º Considerando
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240, line: 276 },
      children: [
        new TextRun({
          text: 'CONSIDERANDO ',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
        new TextRun({
          text: considerandoEmpenhos.replace(/^CONSIDERANDO\s+/i, ''),
          size: 22,
          font: 'Arial',
        }),
      ],
    }),

    // RESOLVE:
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 160, line: 276 },
      children: [
        new TextRun({
          text: 'RESOLVE:',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
  ];

  // Alíneas
  alineas.forEach((al) => {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 180, line: 276 },
        children: [
          new TextRun({
            text: `${al.letra}) `,
            bold: true,
            size: 22,
            font: 'Arial',
          }),
          new TextRun({
            text: al.texto,
            size: 22,
            font: 'Arial',
          }),
        ],
      })
    );
  });

  // Fecho Normativo
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 120, after: 160, line: 276 },
      children: [
        new TextRun({
          text: `As competências e atribuições do(a) gestor(a) e fiscais acima designados(as), bem como os demais procedimentos relacionados à gestão e fiscalização de contratos no âmbito da UERN constam da ${normativoRef}`,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160, line: 276 },
      children: [
        new TextRun({
          text: 'Juntem-se cópias do presente Ato de Designação aos respectivos processos de pagamento.',
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240, line: 276 },
      children: [
        new TextRun({
          text: 'REGISTRE-SE. CUMPRA-SE.',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 360, line: 276 },
      children: [
        new TextRun({
          text: `${cidadeData}, ${p.dataExtenso}.`,
          size: 22,
          font: 'Arial',
        }),
      ],
    })
  );

  // Subscritores PROAD
  subscritores.forEach((sub) => {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, line: 240 },
        children: [
          new TextRun({
            text: sub.nome,
            bold: true,
            size: 22,
            font: 'Arial',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, line: 240 },
        children: [
          new TextRun({
            text: sub.cargo,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, line: 240 },
        children: [
          new TextRun({
            text: `Matrícula nº ${sub.matricula}`,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 240, line: 240 },
        children: [
          new TextRun({
            text: sub.portaria,
            size: 20,
            font: 'Arial',
          }),
        ],
      })
    );
  });

  // Bloco de Ciência dos Servidores Designados
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 120, line: 276 },
      children: [
        new TextRun({
          text: 'CIÊNCIA DO(S) SERVIDOR(ES) DESIGNADO(S):',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 260, line: 276 },
      children: [
        new TextRun({
          text: 'Declaro-me ciente da designação ora atribuída, e das funções que são inerentes em razão da função.',
          size: 22,
          font: 'Arial',
        }),
      ],
    })
  );

  // Membros individuais no bloco de ciência
  p.membros.forEach((m) => {
    const papelExtenso = formatarPapelExtenso(m.tipoAtuacao, m.campusSetor);
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 30, line: 240 },
        children: [
          new TextRun({
            text: m.nome,
            bold: true,
            size: 22,
            font: 'Arial',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 30, line: 240 },
        children: [
          new TextRun({
            text: `Mat. nº ${m.matricula || '_______'}`,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 200, line: 240 },
        children: [
          new TextRun({
            text: papelExtenso,
            size: 20,
            font: 'Arial',
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1), // ~2.54cm
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.18), // ~3.0cm
              right: convertInchesToTwip(0.8), // ~2.0cm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Gera o texto HTML formatado (Rich Text) para cópia direta no editor do SEI e para a prévia em tela.
 */
export function gerarHtmlAtoDesignacao(p: ParametrosAtoDesignacao): string {
  const alineas = montarAlineasAto(p.membros);
  const subscritores = (p.subscritores || SUBCRITORES_PROAD_PADRAO).filter((s) => s.ativo);
  const cidadeData = p.cidadeData || 'Mossoró-RN';
  const portariaComp = p.portariaCompetencia || PORTARIA_COMPETENCIA_PADRAO;
  const normativoRef = p.normativoReferencia || NORMATIVO_REFERENCIA_PADRAO;

  let considerandoEmpenhos = '';
  if (p.notasEmpenhos && p.notasEmpenhos.trim()) {
    const idsPart = p.idsEmpenhos && p.idsEmpenhos.trim() ? ` (${p.idsEmpenhos.trim()})` : '';
    considerandoEmpenhos = `CONSIDERANDO as Notas de Empenhos nºs ${p.notasEmpenhos.trim()}${idsPart}, do Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${p.fornecedor}, CNPJ nº ${p.cnpj}, o qual tem como objeto ${p.objeto}, nos termos do Processo SEI nº ${p.processoSei};`;
  } else {
    considerandoEmpenhos = `CONSIDERANDO o Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${p.fornecedor}, CNPJ nº ${p.cnpj}, o qual tem como objeto ${p.objeto}, nos termos do Processo SEI nº ${p.processoSei};`;
  }

  const numAtoLimpo = p.numeroAto ? p.numeroAto.replace(/^ato\s*(de\s*designação)?\s*(nº\s*)?/i, '').trim() : `___/${p.ano}`;

  return `
<div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; max-width: 800px; margin: 0 auto; text-align: justify;">
  <p style="text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 24px;">
    ATO DE DESIGNAÇÃO DE GESTORES E FISCAIS DE CONTRATOS Nº ${numAtoLimpo}
  </p>

  <p style="margin-bottom: 16px;">
    A Pró-Reitoria de Administração da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE, no uso de suas atribuições conferidas pela ${portariaComp};
  </p>

  <p style="margin-bottom: 16px;">
    <strong>CONSIDERANDO</strong> a exigência legal de designação de representante da Administração para acompanhamento e fiscalização da execução dos contratos administrativos, que representará a FUERN perante o(a) contratado(a) e zelará pela boa execução do objeto pactuado, exercendo as atividades de orientação, fiscalização e controle;
  </p>

  <p style="margin-bottom: 20px;">
    <strong>CONSIDERANDO</strong> ${considerandoEmpenhos.replace(/^CONSIDERANDO\s+/i, '')}
  </p>

  <p style="font-weight: bold; margin-bottom: 12px; text-align: left;">
    RESOLVE:
  </p>

  ${alineas
    .map(
      (al) => `
    <p style="margin-bottom: 12px; padding-left: 24px; text-indent: -24px;">
      <strong>${al.letra})</strong> ${al.texto}
    </p>`
    )
    .join('')}

  <p style="margin-top: 16px; margin-bottom: 12px;">
    As competências e atribuições do(a) gestor(a) e fiscais acima designados(as), bem como os demais procedimentos relacionados à gestão e fiscalização de contratos no âmbito da UERN constam da ${normativoRef}
  </p>

  <p style="margin-bottom: 16px;">
    Juntem-se cópias do presente Ato de Designação aos respectivos processos de pagamento.
  </p>

  <p style="font-weight: bold; margin-bottom: 20px; text-align: left;">
    REGISTRE-SE. CUMPRA-SE.
  </p>

  <p style="margin-bottom: 30px; text-align: left;">
    ${cidadeData}, ${p.dataExtenso}.
  </p>

  <div style="margin-bottom: 36px;">
    ${subscritores
      .map(
        (sub) => `
      <div style="margin-bottom: 20px; text-align: left;">
        <div style="font-weight: bold;">${sub.nome}</div>
        <div>${sub.cargo}</div>
        <div>Matrícula nº ${sub.matricula}</div>
        <div>${sub.portaria}</div>
      </div>`
      )
      .join('')}
  </div>

  <div style="margin-top: 24px; border-top: 1px solid #ccc; padding-top: 18px;">
    <p style="font-weight: bold; margin-bottom: 8px;">
      CIÊNCIA DO(S) SERVIDOR(ES) DESIGNADO(S):
    </p>
    <p style="margin-bottom: 18px;">
      Declaro-me ciente da designação ora atribuída, e das funções que são inerentes em razão da função.
    </p>

    <div style="display: grid; grid-template-columns: 1fr; gap: 14px;">
      ${p.membros
        .map(
          (m) => `
        <div style="text-align: left; padding: 6px 0;">
          <div style="font-weight: bold;">${m.nome}</div>
          <div>Mat. nº ${m.matricula || '_______'}</div>
          <div>${formatarPapelExtenso(m.tipoAtuacao, m.campusSetor)}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>
</div>
`.trim();
}
