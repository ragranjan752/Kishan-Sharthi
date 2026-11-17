// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Regional Land Measurement & Unit Conversion Engine
//  Verified Bihar Land Survey Rules:
//  Land in Bihar is measured using local "Lagghi" (pole length in Hath).
//  1 Kattha = 1 Lagghi * 1 Lagghi * 20 Dhur (or based on regional standard).
//  Standard state revenue default: 1 Bigha = 20 Kattha.
//  However, square feet per Kattha and local Bigha vary by district/sub-division.
// ═══════════════════════════════════════════════════════════════════

const REGIONAL_MEASUREMENT_RULES = {
  // Tirhut / Mithila Region (Darbhanga, Madhubani, Samastipur, Sitamarhi, Muzaffarpur, Vaishali, Sheohar)
  // Traditional Lagghi: 6 to 6.5 Hath (~1361 to 1900 sq ft per Kattha)
  MITHILA_TIRHUT: {
    districts: ['Darbhanga', 'Madhubani', 'Samastipur', 'Sitamarhi', 'Muzaffarpur', 'Vaishali', 'Sheohar'],
    katthaPerBigha: 20,
    sqFtPerKattha: 1361.25, // Standard survey Kattha (~3.125 decimals)
    description: 'Tirhut/Mithila standard: 1 Bigha = 20 Kattha (Approx 1361.25 sq ft / Kattha)'
  },

  // Magadh / Patna Division (Patna, Nalanda, Gaya, Jehanabad, Arwal, Nawada, Aurangabad, Bhojpur, Buxar, Rohtas, Kaimur)
  // Traditional survey: 1 Bigha = 20 Kattha = 27,225 sq ft (~0.625 Acre)
  MAGADH_BHOJPUR: {
    districts: ['Patna', 'Nalanda', 'Gaya', 'Jehanabad', 'Arwal', 'Nawada', 'Aurangabad', 'Bhojpur', 'Buxar', 'Rohtas', 'Kaimur'],
    katthaPerBigha: 20,
    sqFtPerKattha: 1361.25,
    description: 'Magadh/Shahabad standard: 1 Bigha = 20 Kattha = 0.625 Acre'
  },

  // Kosi / Seemanchal (Purnia, Katihar, Araria, Kishanganj, Saharsa, Supaul, Madhepura)
  KOSI_SEEMANCHAL: {
    districts: ['Purnia', 'Katihar', 'Araria', 'Kishanganj', 'Saharsa', 'Supaul', 'Madhepura'],
    katthaPerBigha: 20,
    sqFtPerKattha: 1361.25,
    description: 'Kosi/Seemanchal: 20 Kattha per Bigha'
  },

  // Anga / Munger Division (Bhagalpur, Banka, Munger, Jamui, Lakhisarai, Sheikhpura, Begusarai, Khagaria)
  ANGA_MUNGER: {
    districts: ['Bhagalpur', 'Banka', 'Munger', 'Jamui', 'Lakhisarai', 'Sheikhpura', 'Begusarai', 'Khagaria'],
    katthaPerBigha: 20,
    sqFtPerKattha: 1361.25,
    description: 'Anga/Munger: 20 Kattha per Bigha'
  },

  // Saran Division (Saran, Siwan, Gopalganj, East Champaran, West Champaran)
  SARAN_CHAMPARAN: {
    districts: ['Saran', 'Siwan', 'Gopalganj', 'East Champaran', 'West Champaran'],
    katthaPerBigha: 20,
    sqFtPerKattha: 1361.25,
    description: 'Saran & Champaran: 20 Kattha per Bigha'
  }
};

/**
 * Returns regional rule according to district.
 * @param {string} district
 */
function getRegionalRule(district) {
  if (!district) return REGIONAL_MEASUREMENT_RULES.MAGADH_BHOJPUR;
  const dClean = district.trim().toLowerCase();
  for (const key of Object.keys(REGIONAL_MEASUREMENT_RULES)) {
    const rule = REGIONAL_MEASUREMENT_RULES[key];
    if (rule.districts.some(d => d.toLowerCase() === dClean)) {
      return rule;
    }
  }
  return REGIONAL_MEASUREMENT_RULES.MAGADH_BHOJPUR;
}

/**
 * Converts land size in Kattha to various standard metrics.
 * @param {number} kattha
 * @param {string} district
 */
function convertKattha(kattha, district = 'Patna') {
  const numKattha = parseFloat(kattha);
  if (isNaN(numKattha) || numKattha < 0) {
    return {
      kattha: 0,
      bigha: 0,
      sqFt: 0,
      acres: 0,
      hectares: 0,
      districtRule: getRegionalRule(district).description
    };
  }

  const rule = getRegionalRule(district);
  const bigha = numKattha / rule.katthaPerBigha;
  const sqFt = numKattha * rule.sqFtPerKattha;
  const acres = sqFt / 43560; // 1 Acre = 43,560 sq ft
  const hectares = sqFt / 107639.1; // 1 Hectare = 107,639.1 sq ft

  return {
    kattha: Number(numKattha.toFixed(2)),
    bigha: Number(bigha.toFixed(3)),
    sqFt: Number(sqFt.toFixed(2)),
    acres: Number(acres.toFixed(3)),
    hectares: Number(hectares.toFixed(4)),
    districtRule: rule.description
  };
}

module.exports = {
  REGIONAL_MEASUREMENT_RULES,
  getRegionalRule,
  convertKattha
};
