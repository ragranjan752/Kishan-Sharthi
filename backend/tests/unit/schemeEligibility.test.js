// ═══════════════════════════════════════════════════════════════════
//  Unit Tests: Dynamic Government Scheme Eligibility Engine
// ═══════════════════════════════════════════════════════════════════

const { evaluateEligibility } = require('../../src/modules/schemes/schemes.service');

describe('Government Scheme Eligibility Evaluator', () => {
  const darbhangaMakhanaScheme = {
    id: 'test-makhana',
    name: 'Darbhanga Makhana Special Subsidy',
    official_title_hi: 'दरभंगा मखाना विशेष विकास अनुदान',
    department: 'कृषि विभाग, बिहार सरकार',
    source_url: 'https://dbtagriculture.bihar.gov.in',
    notification_ref: 'BR-HORTI-MKH-2024/09',
    verification_status: 'verified',
    benefit_amount: 25000,
    benefits_summary: '₹25,000 प्रति एकड़',
    rules: {
      eligible_districts: ['Darbhanga', 'Madhubani', 'Sitamarhi'],
      eligible_blocks: ['ALL'],
      min_land_kattha: 10,
      max_land_kattha: 1000,
      eligible_crops: ['Makhana'],
      farmer_categories: ['marginal', 'small', 'medium', 'large']
    },
    documents: [{ name: 'Aadhaar' }]
  };

  test('matches a Darbhanga farmer with Makhana crop and 25 Kattha', () => {
    const farmer = {
      district: 'Darbhanga',
      block: 'Baheri',
      land_size_kattha: 25,
      primary_crop: 'Makhana',
      farmer_category: 'small'
    };

    const evaluation = evaluateEligibility(darbhangaMakhanaScheme, farmer);
    expect(evaluation.is_eligible).toBe(true);
    expect(evaluation.match_score).toBe(100);
    expect(evaluation.unmet_conditions.length).toBe(0);
    expect(evaluation.legal_disclaimer).toContain('प्रारंभिक पात्रता आंकलन मात्र है');
  });

  test('rejects a farmer from non-eligible district (Patna) with clear unmet conditions', () => {
    const farmer = {
      district: 'Patna',
      block: 'Bihta',
      land_size_kattha: 25,
      primary_crop: 'Makhana',
      farmer_category: 'small'
    };

    const evaluation = evaluateEligibility(darbhangaMakhanaScheme, farmer);
    expect(evaluation.is_eligible).toBe(false);
    expect(evaluation.unmet_conditions.some(c => c.includes('केवल निम्नलिखित जिलों के लिए'))).toBe(true);
  });

  test('rejects a farmer with land below minimum requirement (< 10 Kattha)', () => {
    const farmer = {
      district: 'Darbhanga',
      block: 'Baheri',
      land_size_kattha: 5,
      primary_crop: 'Makhana',
      farmer_category: 'marginal'
    };

    const evaluation = evaluateEligibility(darbhangaMakhanaScheme, farmer);
    expect(evaluation.is_eligible).toBe(false);
    expect(evaluation.unmet_conditions.some(c => c.includes('न्यूनतम जमीन 10 कट्ठा'))).toBe(true);
  });

  test('never claims official government approval in result', () => {
    const farmer = {
      district: 'Darbhanga',
      block: 'Baheri',
      land_size_kattha: 25,
      primary_crop: 'Makhana',
      farmer_category: 'small'
    };

    const evaluation = evaluateEligibility(darbhangaMakhanaScheme, farmer);
    expect(evaluation.legal_disclaimer).toBeDefined();
    expect(evaluation.legal_disclaimer.toLowerCase()).not.toContain('approved by government');
  });
});
