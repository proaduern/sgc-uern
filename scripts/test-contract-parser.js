const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testContractParser() {
  const buf = fs.readFileSync('tests/fixtures/Contrato_EXEMPLO.pdf');
  const p = new PDFParse(new Uint8Array(buf));
  await p.load();
  const res = await p.getText();

  const startIdx = res.text.indexOf('1.2. \tObjeto da contratação:');
  const endIdx = res.text.indexOf('CLÁUSULA SEGUNDA');
  const itemsText = res.text.substring(startIdx, endIdx);

  // Robust line-by-line or token-based item extractor
  // Each item starts with a line containing the item number: `^\s*(\d+)\s*\t?\s*([A-Za-zÀ-ú\s/]+)?`
  // and ends with 3 currency values: `R$ ... R$ ... R$ ...`
  const lines = itemsText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const items = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts an item: e.g. "1 \tAssu/RN \tAgente de Limpeza (44h) \tPosto \t8 \tR$ 3.452,65..."
    // or "27 \tNatal/RN"
    const startMatch = line.match(/^(\d+)\s+(Assu\/RN|Caicó\/RN|Mossoró\/RN|Natal\/RN|Patu\/RN|Pau dos Ferros\/RN)(.*)/i) 
                    || line.match(/^(\d+)\t+(Assu\/RN|Caicó\/RN|Mossoró\/RN|Natal\/RN|Patu\/RN|Pau dos Ferros\/RN)(.*)/i);
    
    if (startMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        numeroItem: parseInt(startMatch[1], 10),
        cidade: startMatch[2].trim(),
        rawText: startMatch[3] || ''
      };
    } else if (currentItem) {
      if (line.startsWith('TOTAL -') || line.startsWith('ITEM \t') || line.startsWith('CLÁUSULA')) {
        items.push(currentItem);
        currentItem = null;
      } else {
        currentItem.rawText += ' ' + line;
      }
    }
  }
  if (currentItem) items.push(currentItem);

  console.log('Total items captured:', items.length);

  // Now parse each captured item block
  const parsedItems = items.map(it => {
    // Look for R$ values
    const rMatches = it.rawText.match(/R\$\s*([\d\.,]+)/g) || [];
    // Posto / Unidade
    const unitMatch = it.rawText.match(/(Posto|Unidade|Mês|Serviço|Item|Lote)\s*(\d+)/i);
    const qtd = unitMatch ? parseInt(unitMatch[2], 10) : 1;
    const unidade = unitMatch ? unitMatch[1] : 'Posto';
    
    // Description is before Posto
    let desc = it.rawText;
    if (unitMatch) {
      const uIdx = it.rawText.indexOf(unitMatch[0]);
      desc = it.rawText.substring(0, uIdx).replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    return {
      numeroItem: it.numeroItem,
      cidade: it.cidade,
      descricao: desc,
      unidade,
      quantidade: qtd,
      valorUnitarioMensal: rMatches[0] || '',
      valorUnitarioAnual: rMatches[1] || '',
      valorTotalAnual: rMatches[2] || ''
    };
  });

  console.log(`Parsed ${parsedItems.length} items!`);
  console.log('First item:', parsedItems[0]);
  console.log('Item 25:', parsedItems[24]);
  console.log('Last item (50):', parsedItems[49]);
}

testContractParser().catch(console.error);
