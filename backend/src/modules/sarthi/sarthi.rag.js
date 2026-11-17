// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — RAG Context Retrieval Engine
//  Extracts verified agronomic snippets & citations matching query
// ═══════════════════════════════════════════════════════════════════

const { VERIFIED_AGRI_KNOWLEDGE } = require('./sarthi.knowledge');

/**
 * Detect language preferences (Hindi, Hinglish, Bhojpuri, Maithili, English).
 */
function detectLanguage(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('भोजपुरी') || lower.includes('का बा') || lower.includes('बानि') || lower.includes('हमार') || lower.includes('रउवा')) {
    return 'bhojpuri';
  }
  if (lower.includes('मैथिली') || lower.includes('अहां') || lower.includes('हमर') || lower.includes('कहलियै') || lower.includes('की भेल')) {
    return 'maithili';
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hindi';
  }
  return 'hinglish';
}

/**
 * Retrieve verified knowledge snippets relevant to the query and farmer profile.
 *
 * @param {string} userQuery
 * @param {object} farmerProfile - { district, primary_crop }
 * @returns {Array<{ topic, title_hi, content_hi, verified_source, relevanceScore }>}
 */
function retrieveVerifiedContext(userQuery = '', farmerProfile = {}) {
  const queryLower = userQuery.toLowerCase();
  const district = (farmerProfile.district || '').toLowerCase();
  const crop = (farmerProfile.primary_crop || '').toLowerCase();

  const scoredResults = VERIFIED_AGRI_KNOWLEDGE.map(item => {
    let score = 0;

    // Keyword match
    for (const kw of item.keywords) {
      if (queryLower.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    // Crop relevance
    if (item.crops.includes('ALL') || (crop && item.crops.some(c => c.toLowerCase() === crop))) {
      score += 2;
    }

    // District relevance
    if (item.districts.includes('ALL') || (district && item.districts.some(d => d.toLowerCase() === district))) {
      score += 2;
    }

    return {
      ...item,
      relevanceScore: score
    };
  });

  // Filter items with positive score, sort descending, return top 3
  return scoredResults
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}

module.exports = {
  detectLanguage,
  retrieveVerifiedContext
};
