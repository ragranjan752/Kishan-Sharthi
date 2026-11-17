// ═══════════════════════════════════════════════════════════════════
//  Unit Tests: AI Sarthi Language Detection & RAG Retrieval
// ═══════════════════════════════════════════════════════════════════

const { detectLanguage, retrieveVerifiedContext } = require('../../src/modules/sarthi/sarthi.rag');

describe('AI Sarthi RAG & Language Utilities', () => {
  test('accurately identifies Bhojpuri language phrases', () => {
    expect(detectLanguage('रउवा बताईं कि धान में खाद कब डालीं?')).toBe('bhojpuri');
    expect(detectLanguage('हमार मक्का के फसल कइसन बा?')).toBe('bhojpuri');
  });

  test('accurately identifies Maithili language phrases', () => {
    expect(detectLanguage('अहां के कहलियै मखाना के खेती केना करब?')).toBe('maithili');
    expect(detectLanguage('हमर धान के पत्ता पीयर भेल अछि')).toBe('maithili');
  });

  test('identifies Hindi text', () => {
    expect(detectLanguage('गेहूं में पीले रतुआ रोग का जैविक उपचार बताएं')).toBe('hindi');
  });

  test('defaults to Hinglish for Romanized text', () => {
    expect(detectLanguage('Mere dhaan me kida lag gaya hai kya kare')).toBe('hinglish');
  });

  test('retrieves relevant verified context for Makhana in Darbhanga', () => {
    const snippets = retrieveVerifiedContext('मखाना में पत्ती सड़न का इलाज', {
      district: 'Darbhanga',
      primary_crop: 'Makhana'
    });

    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets[0].crops).toContain('Makhana');
    expect(snippets[0].verified_source).toBeDefined();
  });
});
