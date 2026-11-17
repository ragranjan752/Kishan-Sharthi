// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Scheme Eligibility Engine Service
//  Evaluates farmer criteria against verified scheme rules.
// ═══════════════════════════════════════════════════════════════════

const schemeRepo = require('./schemes.repository');
const { convertKattha } = require('../../utils/landUnits');

/**
 * Evaluates whether a farmer matches a scheme's eligibility rules.
 * Never claims official government approval — returns eligibility potential.
 *
 * @param {object} scheme
 * @param {object} farmer - { district, block, land_size_kattha, primary_crop, farmer_category, annual_income }
 * @returns {object} { isEligible, matchScore, matchedConditions, unmetConditions, legalDisclaimer }
 */
function evaluateEligibility(scheme, farmer) {
  const rules = scheme.rules || (scheme.scheme_eligibility_rules && scheme.scheme_eligibility_rules[0]) || {};
  const matchedConditions = [];
  const unmetConditions = [];

  const district = (farmer.district || '').trim();
  const landKattha = parseFloat(farmer.land_size_kattha) || 0;
  const crop = (farmer.primary_crop || '').trim();
  const category = (farmer.farmer_category || 'small').toLowerCase();

  // 1. District Check
  const eligibleDistricts = rules.eligible_districts || ['ALL'];
  if (eligibleDistricts.includes('ALL') || eligibleDistricts.some(d => d.toLowerCase() === district.toLowerCase())) {
    matchedConditions.push(`जिला पात्र है (${district})`);
  } else {
    unmetConditions.push(`यह योजना केवल निम्नलिखित जिलों के लिए है: ${eligibleDistricts.join(', ')}`);
  }

  // 2. Land Size Check
  const minLand = rules.min_land_kattha !== undefined ? rules.min_land_kattha : 0;
  const maxLand = rules.max_land_kattha;

  if (landKattha >= minLand && (maxLand === null || maxLand === undefined || landKattha <= maxLand)) {
    matchedConditions.push(`जमीन का रकबा नियमानुसार पात्र है (${landKattha} कट्ठा)`);
  } else {
    if (landKattha < minLand) {
      unmetConditions.push(`न्यूनतम जमीन ${minLand} कट्ठा होनी चाहिए (आपकी जमीन: ${landKattha} कट्ठा)`);
    } else if (maxLand && landKattha > maxLand) {
      unmetConditions.push(`अधिकतम जमीन सीमा ${maxLand} कट्ठा है (आपकी जमीन: ${landKattha} कट्ठा)`);
    }
  }

  // 3. Crop Filter Check
  const eligibleCrops = rules.eligible_crops || ['ALL'];
  if (eligibleCrops.includes('ALL') || eligibleCrops.some(c => c.toLowerCase() === crop.toLowerCase())) {
    matchedConditions.push(`फसल पात्र है (${crop})`);
  } else {
    unmetConditions.push(`यह योजना इन फसलों के लिए मान्य है: ${eligibleCrops.join(', ')} (आपकी फसल: ${crop})`);
  }

  // 4. Farmer Category Check
  const eligibleCategories = rules.farmer_categories || ['marginal', 'small', 'medium', 'large'];
  if (eligibleCategories.includes(category)) {
    matchedConditions.push(`कृषक श्रेणी मान्य है (${category})`);
  } else {
    unmetConditions.push(`मान्य कृषक श्रेणियां: ${eligibleCategories.join(', ')}`);
  }

  const isEligible = unmetConditions.length === 0;
  const matchScore = Math.round((matchedConditions.length / (matchedConditions.length + unmetConditions.length)) * 100);

  return {
    scheme_id: scheme.id,
    scheme_name: scheme.name,
    official_title_hi: scheme.official_title_hi,
    department: scheme.department,
    source_url: scheme.source_url,
    notification_ref: scheme.notification_ref,
    verification_status: scheme.verification_status,
    last_verified_at: scheme.last_verified_at,
    benefit_amount: scheme.benefit_amount,
    benefits_summary: scheme.benefits_summary,
    is_eligible: isEligible,
    match_score: matchScore,
    matched_conditions: matchedConditions,
    unmet_conditions: unmetConditions,
    required_documents: scheme.documents || scheme.scheme_documents || [],
    legal_disclaimer: 'यह परिणाम प्रारंभिक पात्रता आंकलन मात्र है। सरकारी लाभ की अंतिम स्वीकृति संबंधित विभागीय जांच एवं आधिकारिक डीबीटी पोर्टल पर आवेदन सत्यापन के अधीन है।'
  };
}

async function getEligibleSchemesForFarmer(farmer) {
  const allSchemes = await schemeRepo.getAllSchemes();
  const evaluated = allSchemes.map(s => evaluateEligibility(s, farmer));

  // Sort: Eligible first, then descending by match score, then benefit amount
  return evaluated.sort((a, b) => {
    if (a.is_eligible !== b.is_eligible) return a.is_eligible ? -1 : 1;
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    return (b.benefit_amount || 0) - (a.benefit_amount || 0);
  });
}

async function getSchemeCatalog(filters = {}) {
  const schemes = await schemeRepo.getAllSchemes(filters);
  return schemes.map(s => ({
    id: s.id,
    name: s.name,
    official_title_hi: s.official_title_hi,
    department: s.department,
    description: s.description,
    benefits_summary: s.benefits_summary,
    benefit_amount: s.benefit_amount,
    scheme_type: s.scheme_type,
    source_url: s.source_url,
    notification_ref: s.notification_ref,
    verification_status: s.verification_status,
    last_verified_at: s.last_verified_at,
    documents: s.documents || s.scheme_documents || []
  }));
}

async function getSchemeDetailsWithGuide(id) {
  const scheme = await schemeRepo.getSchemeById(id);
  if (!scheme) return null;

  return {
    ...scheme,
    application_guide: {
      step_1: 'आधिकारिक बिहार डीबीटी कृषि पोर्टल पर जाएं: ' + scheme.source_url,
      step_2: '13 अंकों की किसान पंजीकरण संख्या (Farmer Registration ID) दर्ज करें।',
      step_3: 'आवश्यक दस्तावेज (आधार, बैंक पासबुक, एलपीसी / राजस्व रसीद) की प्रति संलग्न करें।',
      step_4: 'ऑनलाइन पावती रसीद प्रिंट कर सुरक्षित रखें। कृषि समन्वयक / प्रखंड कृषि पदाधिकारी द्वारा स्थलीय सत्यापन किया जाएगा।',
      tracking_portal: scheme.source_url
    },
    verification_note: `सत्यापित अभिलेख (Last Verified: ${new Date(scheme.last_verified_at).toLocaleDateString('hi-IN')}). विभागीय अधिसूचना संदर्भ: ${scheme.notification_ref}`
  };
}

module.exports = {
  evaluateEligibility,
  getEligibleSchemesForFarmer,
  getSchemeCatalog,
  getSchemeDetailsWithGuide
};
