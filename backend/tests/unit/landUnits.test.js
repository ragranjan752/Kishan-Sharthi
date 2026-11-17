// ═══════════════════════════════════════════════════════════════════
//  Unit Tests: Bihar Regional Land Measurement & Unit Conversion
// ═══════════════════════════════════════════════════════════════════

const { convertKattha, getRegionalRule } = require('../../src/utils/landUnits');

describe('Bihar Land Unit Conversions', () => {
  test('converts 20 Kattha in Patna (Magadh) to 1 Bigha and approx 0.625 Acre', () => {
    const result = convertKattha(20, 'Patna');
    expect(result.kattha).toBe(20);
    expect(result.bigha).toBe(1);
    expect(result.acres).toBeCloseTo(0.625, 2);
    expect(result.sqFt).toBe(27225);
  });

  test('converts 40 Kattha in Darbhanga (Mithila) to 2 Bigha', () => {
    const result = convertKattha(40, 'Darbhanga');
    expect(result.kattha).toBe(40);
    expect(result.bigha).toBe(2);
    expect(result.acres).toBeCloseTo(1.25, 2);
  });

  test('handles zero and negative values gracefully', () => {
    const zero = convertKattha(0, 'Gaya');
    expect(zero.bigha).toBe(0);
    expect(zero.acres).toBe(0);

    const negative = convertKattha(-10, 'Muzaffarpur');
    expect(negative.bigha).toBe(0);
  });

  test('identifies regional rule accurately based on district', () => {
    const mithilaRule = getRegionalRule('Madhubani');
    expect(mithilaRule.districts).toContain('Madhubani');

    const magadhRule = getRegionalRule('Rohtas');
    expect(magadhRule.districts).toContain('Rohtas');
  });
});
