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
  pa: 'ਪੰਜਾਬੀ',
  punjabi: 'ਪੰਜਾਬੀ',
  te: 'తెలుగు',
  telugu: 'తెలుగు',
  mr: 'मराठी',
  marathi: 'मराठी',
  ta: 'தமிழ்',
  tamil: 'தமிழ்',
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

async function processFarmerChat({ message, farmer = {}, sessionId = null, lang = null, context = null }) {
  const detectedLang = detectLanguage(message);
  const responseLang = RESPONSE_LANGUAGES[lang] ? lang : detectedLang;
  const verifiedContext = retrieveVerifiedContext(message, farmer);
  let systemPrompt = buildSystemPrompt(farmer, verifiedContext, responseLang);
  if (context) {
    systemPrompt += `\n\n[संदर्भ: किसान ने अभी इस फसल रोग जांच के बारे में पूछा है — ${context}. कृपया उसी निदान, फसल एवं उपचार के संदर्भ में उत्तर दें।]`;
  }

  // Attempt multi-provider AI generation
  let aiResult = await generateAgriAdvice(systemPrompt, message);
  let replyText = '';
  let providerUsed = 'verified_knowledge_base';

  if (aiResult && aiResult.text) {
    replyText = aiResult.text;
    providerUsed = aiResult.provider;
  } else {
    // Deterministic safe fallback using verified knowledge items
    const FALLBACK = {
      en: {
        ctx: (n, d, t) => `Hello ${n}! Verified information for your area (${d}) and crop:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *Source: ${t.verified_source}*\n\n(For urgent help, call the farmer helpline 1800-180-1551 or visit your nearest KVK.)`,
        gen: (n) => `Hello ${n}! I'm gathering accurate, research-backed information for your query.\n\nFor immediate help with schemes and crop management in India, call the toll-free Kisan Call Centre **1800-180-1551** or contact your nearest **Krishi Vigyan Kendra (KVK)**.`
      },
      pa: {
        ctx: (n, d, t) => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${n}! ਤੁਹਾਡੇ ਖੇਤਰ (${d}) ਅਤੇ ਫਸਲ ਲਈ ਪ੍ਰਮਾਣਿਤ ਜਾਣਕਾਰੀ:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *ਸਰੋਤ: ${t.verified_source}*\n\n(ਤੁਰੰਤ ਮਦਦ ਲਈ 1800-180-1551 ‘ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਨੇੜਲੇ KVK ‘ਤੇ ਜਾਓ।)`,
        gen: (n) => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${n}! ਮੈਂ ਤੁਹਾਡੇ ਸਵਾਲ ਲਈ ਸਹੀ, ਖੋਜ-ਅਧਾਰਿਤ ਜਾਣਕਾਰੀ ਇਕੱਠੀ ਕਰ ਰਿਹਾ/ਰਹੀ ਹਾਂ।\n\nਤੁਰੰਤ ਮਦਦ ਲਈ **1800-180-1551** ‘ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਆਪਣੇ ਨੇੜਲੇ **ਕ੍ਰਿਸ਼ੀ ਵਿਗਿਆਨ ਕੇਂਦਰ (KVK)** ਨਾਲ ਸੰਪਰਕ ਕਰੋ।`
      },
      te: {
        ctx: (n, d, t) => `నమస్కారం ${n}! మీ ప్రాంతం (${d}) మరియు పంట కోసం ధృవీకరించబడిన సమాచారం:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *మూలం: ${t.verified_source}*\n\n(తక్షణ సహాయం కోసం 1800-180-1551ాకు కాల్ చేయండి లేదా సమీప KVKానికి వెళ్లండి.)`,
        gen: (n) => `నమస్కారం ${n}! మీ ప్రశ్నకు ఖచ్చితమైన, పరిశోధన-ఆధారిత సమాచారం సేకరిస్తున్నాను.\n\nతక్షణ సహాయం కోసం **1800-180-1551**కు కాల్ చేయండి లేదా సమీప KVKను సంప్రదించండి.`
      },
      mr: {
        ctx: (n, d, t) => `नमस्कार ${n}! तुमच्या भाग (${d}) व पिकासाठी पडताळलेली माहिती:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *स्रोत: ${t.verified_source}*\n\n(तातडीच्या मदतीसाठी 1800-180-1551 वर कॉल करा किंवा जवळच्या KVK ला भेट द्या.)`,
        gen: (n) => `नमस्कार ${n}! तुमच्या प्रश्नासाठी अचूक, संशोधन-आधारित माहिती गोळा करत आहे.\n\nतातडीच्या मदतीसाठी **1800-180-1551** वर कॉल करा किंवा जवळच्या KVK ला भेट द्या.`
      },
      ta: {
        ctx: (n, d, t) => `வணக்கம் ${n}! உங்கள் பகுதி (${d}) மற்றும் பயிருக்கான சரிபார்க்கப்பட்ட தகவல்:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *மூலம்: ${t.verified_source}*\n\n(அவசர உதவிக்கு 1800-180-1551 அழைக்கவும் அல்லது அருகிலுள்ள KVK-க்கு செல்லவும்.)`,
        gen: (n) => `வணக்கம் ${n}! உங்கள் கேள்விக்கு துல்லியமான, ஆராய்ச்சி-சார்ந்த தகவலை சேகரிக்கிறேன்.\n\nஅவசர உதவிக்கு **1800-180-1551** அழைக்கவும் அல்லது அருகிலுள்ள KVK-வை அணுகவும்.`
      },
      hi: {
        ctx: (n, d, t) => `नमस्ते ${n}! आपके क्षेत्र (${d}) एवं फसल से संबंधित प्रामाणिक जानकारी:\n\n**${t.title_hi}**\n${t.content_hi}\n\n📌 *स्रोत: ${t.verified_source}*\n\n(विशेष सहायता हेतु किसान कॉल सेंटर 1800-180-1551 पर संपर्क करें)`,
        gen: (n) => `नमस्ते ${n}! आपके प्रश्न पर कृषि वैज्ञानिक मानकों के अनुसार सटीक जानकारी जुटाई जा रही है।\n\nकृषि योजनाओं व फसल प्रबंधन की तत्काल सहायता के लिए टोल-फ्री **1800-180-1551** अथवा अपने नजदीकी **कृषि विज्ञान केंद्र (KVK)** से संपर्क करें।`
      }
    };
    const langKey = (responseLang === 'en' || responseLang === 'english') ? 'en'
      : (responseLang === 'hi' || responseLang === 'hindi' || responseLang === 'hinglish') ? 'hi'
      : (FALLBACK[responseLang] ? responseLang : 'hi');
    const fb = FALLBACK[langKey];
    replyText = verifiedContext.length > 0
      ? fb.ctx(farmer.name || (langKey === 'en' ? 'Farmer' : 'किसान भाई'), farmer.district || (langKey === 'en' ? 'India' : 'बिहार'), verifiedContext[0])
      : fb.gen(farmer.name || (langKey === 'en' ? 'Farmer' : 'किसान भाई'));
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
