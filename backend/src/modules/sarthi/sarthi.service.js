// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — AI Sarthi Service (RAG & Multi-Language)
// ═══════════════════════════════════════════════════════════════════

const { detectLanguage, retrieveVerifiedContext } = require('./sarthi.rag');
const { generateAgriAdvice } = require('./sarthi.providers');
const { supabase, isConfigured } = require('../../config/supabase');
const logger = require('../../config/logger');

const RESPONSE_LANGUAGES = {
  hi: 'हिंदी',
  hindi: 'हिंदी',
  en: 'English',
  english: 'English',
  bho: 'भोजपुरी',
  bhojpuri: 'भोजपुरी',
  mai: 'मैथिली',
  maithili: 'मैथिली',
  hinglish: 'Hinglish (Hindi-English mix)'
};

function buildSystemPrompt(farmer, verifiedContext, responseLang) {
  let contextBlock = '';
  if (verifiedContext.length > 0) {
    contextBlock = '\n\n**प्रामाणिक कृषि संदर्भ (Verified Agriculture Context):**\n' +
      verifiedContext.map(c => `• [${c.title_hi}] (स्रोत: ${c.verified_source}):\n${c.content_hi}`).join('\n\n');
  }

  return `तुम "कृषि सारथी" (Krishi Sarthi) हो — बिहार सरकार एवं कृषि अनुसंधान संस्थानों (BAU सबौर, ICAR पटना) के आधिकारिक मानकों पर आधारित विशेषज्ञ डिजिटल कृषि सलाहकार।

**किसान प्रोफ़ाइल:**
• नाम: ${farmer.name || 'किसान भाई'}
• जिला: ${farmer.district || 'बिहार'}
• प्रखंड (Block): ${farmer.block || 'निर्दिष्ट नहीं'}
• मुख्य फसल: ${farmer.primary_crop || 'विविध'}
• जमीन का आकार: ${farmer.land_size_kattha ? farmer.land_size_kattha + ' कट्ठा' : 'निर्दिष्ट नहीं'}
• पसंदीदा भाषा/बोली: ${RESPONSE_LANGUAGES[responseLang] || responseLang}

**सलाहकार नियम व सिद्धांत (Mandatory Guidelines):**
1. भाषा: किसान ने जो भाषा चुनी है उसी में — ${RESPONSE_LANGUAGES[responseLang] || 'हिंदी'} — में विनम्र, आत्मीय और व्यावहारिक उत्तर दें। यदि किसान ने कोई भाषा नहीं चुनी, तो प्रश्न की भाषा के अनुसार हिंदी, हिंग्लिश, मैथिली या भोजपुरी में उत्तर दें।
2. सत्यनिष्ठा: कभी भी फर्जी योजनाएं, मनगढ़ंत कीटनाशक दवा की मात्रा या फर्जी आंकड़े न बनाएं। यदि किसी तथ्य की पुष्टि न हो, तो स्पष्ट कहें: "इसकी पुष्टि हेतु कृपया अपने नजदीकी प्रखंड कृषि पदाधिकारी (BAO) या कृषि विज्ञान केंद्र (KVK) से संपर्क करें।"
3. मात्राएं एवं माप: बिहार की स्थानीय माप (कट्ठा / बीघा / एकड़) में बात करें।
4. प्राथमिक जैविक उपचार: कीट या रोग में पहले जैविक या सुरक्षित नीम-आधारित उपचार बताएं, रासायनिक दवा केवल गंभीर स्थिति में ही अनुशंसित करें।
${contextBlock}`;
}

async function processFarmerChat({ message, farmer = {}, sessionId = null, lang = null }) {
  const detectedLang = detectLanguage(message);
  const responseLang = RESPONSE_LANGUAGES[lang] ? lang : detectedLang;
  const verifiedContext = retrieveVerifiedContext(message, farmer);
  const systemPrompt = buildSystemPrompt(farmer, verifiedContext, responseLang);

  // Attempt multi-provider AI generation
  let aiResult = await generateAgriAdvice(systemPrompt, message);
  let replyText = '';
  let providerUsed = 'verified_knowledge_base';

  if (aiResult && aiResult.text) {
    replyText = aiResult.text;
    providerUsed = aiResult.provider;
  } else {
    // Deterministic safe fallback using verified knowledge items
    if (verifiedContext.length > 0) {
      const top = verifiedContext[0];
      replyText = `नमस्ते ${farmer.name || 'किसान भाई'}! आपके क्षेत्र (${farmer.district || 'बिहार'}) एवं फसल से संबंधित प्रामाणिक जानकारी:\n\n**${top.title_hi}**\n${top.content_hi}\n\n📌 *स्रोत: ${top.verified_source}*\n\n(विशेष सहायता हेतु बिहार किसान कॉल सेंटर 1800-180-1551 पर संपर्क करें)`;
    } else {
      replyText = `नमस्ते ${farmer.name || 'किसान भाई'}! आपके प्रश्न पर कृषि वैज्ञानिक मानकों के अनुसार सटीक जानकारी जुटाई जा रही है।\n\nबिहार में कृषि योजनाओं व फसल प्रबंधन की तत्काल सहायता के लिए आप राज्य के टोल-फ्री किसान कॉल सेंटर नंबर **1800-180-1551** अथवा अपने नजदीकी **कृषि विज्ञान केंद्र (KVK)** से संपर्क कर सकते हैं।`;
    }
  }

  const citations = verifiedContext.map(c => ({
    title: c.title_hi,
    source: c.verified_source
  }));

  // Store in chat history if Supabase is connected and farmer has ID
  if (isConfigured && farmer.id) {
    try {
      await supabase.from('ai_chat_messages').insert({
        farmer_id: farmer.id,
        sender: 'user',
        content: message
      });
      await supabase.from('ai_chat_messages').insert({
        farmer_id: farmer.id,
        sender: 'assistant',
        content: replyText,
        source_references: citations
      });
    } catch (dbErr) {
      logger.warn({ err: dbErr }, 'Could not persist chat message to database');
    }
  }

  return {
    reply: replyText,
    provider: providerUsed,
    detected_language: detectedLang,
    citations,
    safety_disclaimer: 'यह सलाह कृषि अनुसंधान संस्थानों के सामान्य मानकों पर आधारित है। मौसम व मिट्टी की विशिष्ट स्थिति अनुसार स्थानीय कृषि समन्वयक से परामर्श अनुशंसित है।'
  };
}

module.exports = {
  processFarmerChat
};
