// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Verified Crop Disease Knowledge Base
//  Sources: ICAR institutions, KVK network, State Dept. of Agriculture
//  Bihar, and package-of-practice advisories. Organic-first approach;
//  chemical recommendations are general label-rate guidance only —
//  farmers must verify dosage with local BAO/KVK before spraying.
// ═══════════════════════════════════════════════════════════════════

const CROP_ALIASES = {
  dhan: 'Dhan', rice: 'Dhan', paddy: 'Dhan', धान: 'Dhan',
  gehun: 'Gehun', wheat: 'Gehun', गेहूं: 'Gehun',
  makka: 'Makka', maize: 'Makka', corn: 'Makka', मक्का: 'Makka',
  sarson: 'Sarson', mustard: 'Sarson', सरसों: 'Sarson',
  litchi: 'Litchi', लीची: 'Litchi',
  makhana: 'Makhana', मखाना: 'Makhana',
  aam: 'Aam', mango: 'Aam', आम: 'Aam',
  sabzi: 'Sabzi', vegetable: 'Sabzi', सब्जी: 'Sabzi'
};

function normalizeCrop(name = '') {
  const n = String(name).toLowerCase().trim();
  return CROP_ALIASES[n] || CROP_ALIASES[n.replace(/[^a-z\u0900-\u097F]/g, '')] || null;
}

function normalizeText(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').trim();
}

const DISEASE_KNOWLEDGE = [
  // ── Paddy / Dhan ──────────────────────────────────────────────
  {
    id: 'paddy_blast',
    crop: 'Dhan',
    name_en: 'Paddy Blast',
    name_hi: 'धान का ब्लास्ट रोग (पत्ती झुलसा)',
    aliases: ['blast', 'paddy blast', 'rice blast', 'pyricularia', 'ब्लास्ट', 'पत्ती झुलसा'],
    symptoms_hi: 'पत्तियों पर गहरे भूरे-हरे धब्बे जिनके किनारे भूरे व बीच में धूसर-सफेद; ग्रीवा (neck) पर धब्बे से बालियों में दाना नहीं बनता।',
    organic_hi: '• सड़ी गोबर की खाद (2-3 टन/एकड़) और ट्राइकोडेर्मा आधारित जैविक छिड़काव करें।\n• पोटाश (MOP) की संतुलित मात्रा — पोटाश की कमी ब्लास्ट को बढ़ावा देती है।\n• खेत में पानी का सतत प्रबंधन करें; 2-3 दिन की जल निकासी ब्लास्ट रोकने में सहायक है।\n• घनी रोपाई से बचें — पौधों के बीच हवा का संचलन हो।',
    chemical_hi: '• ट्राइसीक्लेआजोल 75% WP — 120-150 ग्राम/एकड़ (500-750 लीटर पानी में), या आइसोप्रोथियोलने 40% EC — 250-300 मिली/एकड़।\n• छिड़काव सुबह के समय करें। गंभीर प्रकोप पर 10-15 दिन बाद दोहराएं।',
    prevention_hi: '• ब्लास्ट-रोधी किस्में लगाएं: सहभागी धान, राजेंद्र भगवती, CR धान-801।\n• नाइट्रोजन की अत्यधिक मात्रा न दें — यूरिया की निर्धारित मात्रा का पालन करें।\n• खेत में जलभराव से बचें; रोपाई के बाद जल प्रबंधन का ध्यान रखें।',
    source: 'ICAR-राष्ट्रीय चावल अनुसंधान संस्थान (NRRI), कटक एवं KVK, बिहार'
  },
  {
    id: 'paddy_brown_spot',
    crop: 'Dhan',
    name_en: 'Brown Spot',
    name_hi: 'भूरी धब्बा रोग (Brown Spot)',
    aliases: ['brown spot', 'drechslera', 'भूरी धब्बा', 'भूरा धब्बा'],
    symptoms_hi: 'पत्तियों व भूस में अंडाकार भूरे-लाल धब्बे, धब्बों के बीच में गहरे भूरे व किनारे पीले-भूरे; बालियों में दाने हल्के व सिकुड़े (pecky rice) हो जाते हैं।',
    organic_hi: '• पोटाश व जिंक की कमी दूर करें — संतुलित पोषण ही सबसे बड़ा बचाव है।\n• सड़ी गोबर खाद + ट्राइकोडेर्मा/स्यूडोमोनास आधारित जैविक छिड़काव।\n• खेत में जल-निस्तारण सुनिश्चित करें।',
    chemical_hi: '• प्रोपिकोनाजोल 25% EC — 200 मिली/एकड़ (200 लीटर पानी में)।\n• 10 दिन के अंतराल पर दो बार तक छिड़काव करें।',
    prevention_hi: '• पोटाश-युक्त उर्वरक (MOP) का उपयोग करें; जिंक सल्फेट की कमी दूर करें।\n• बीज को बुवाई से पहले ट्राइकोडेर्मा विरिडी से उपचारित करें।\n• घनी रोपाई व नाइट्रोजन की अधिकता से बचें।',
    source: 'ICAR-राष्ट्रीय चावल अनुसंधान संस्थान (NRRI), कटक'
  },
  {
    id: 'paddy_blb',
    crop: 'Dhan',
    name_en: 'Bacterial Leaf Blight (BLB)',
    name_hi: 'जीवाणु पत्ती झुलसा (BLB)',
    aliases: ['blb', 'bacterial leaf blight', 'xanthomonas', 'जीवाणु झुलसा'],
    symptoms_hi: 'पत्तियों की नोक से शुरू होकर ऊपर की ओर बढ़ने वाले अभिजल (water-soaked) धूसर-हरे धब्बे, बाद में शुष्क होकर पीलापन; नोक पर सिल्वर-शीट जैसी झिल्ली।',
    organic_hi: '• नाइट्रोजन की अधिकता से बचें — BLB नाइट्रोजन-संवेदी रोग है।\n• रोगग्रस्त अवशेषों को न जलाएं/न बिखेरें।\n• स्यूडोमोनास फ्लोरेसेंस / कॉपर oxychloride आधारित छिड़काव (1 ग्राम/लीटर) सहायक है।',
    chemical_hi: '• स्ट्रेप्टोसाइक्लिन सल्फेट + टेट्रासाइक्लिन — लेबल की दर से (प्रायः 300-400 ग्राम/एकड़ 500 लीटर पानी में)।\n• या कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर; 15 दिन बाद दोहराएं।',
    prevention_hi: '• BLB-रोधी किस्में लगाएं: सहभागी धान, स्वर्णा सब-1।\n• बीज चयन व बीज उपचार करें।\n• पानी की अधिकता/जलभराव न रखें — BLB अधिक नमी में फैलता है।',
    source: 'ICAR-राष्ट्रीय चावल अनुसंधान संस्थान (NRRI), कटक एवं कृषि विभाग, बिहार'
  },
  {
    id: 'paddy_sheath_blight',
    crop: 'Dhan',
    name_en: 'Sheath Blight',
    name_hi: 'धान का म्यान झुलसा (Sheath Blight)',
    aliases: ['sheath blight', 'rhizoctonia', 'म्यान झुलसा', 'कवच झुलसा'],
    symptoms_hi: 'पत्तियों की म्यान पर बड़े अंडाकार धूसर-सफेद धब्बे जिनके किनारे गहरे भूरे; ऊपर की ओर पत्ती पर भी फैलना; बालियों के जोड़ों को कमज़ोर करना।',
    organic_hi: '• उर्वरकों का संतुलित प्रयोग — विशेषकर नाइट्रोजन कम रखें।\n• ट्राइकोडेर्मा हैरज़ियनम / स्यूडोमोनास आधारित छिड़काव।\n• घनी रोपाई से बचें; जल निकासी सुनिश्चित करें।',
    chemical_hi: '• ट्राइसीक्लेआजोल 75% WP — 100-120 ग्राम/एकड़, या VALIDAMYCIN 3% L — 250 मिली/एकड़।\n• या हेक्साकोनाज़ोल 5% EC — 300 मिली/एकड़। 10-12 दिन बाद दोहराएं।',
    prevention_hi: '• घनी रोपाई से बचें — प्रति वर्ग मीटर पौधों की संख्या नियंत्रित रखें।\n• ग्रीष्मकालीन गहरी जुताई से मिट्टी में रोगाणु नष्ट होते हैं।\n• सहभागी धान जैसी partially resistant किस्में चुनें।',
    source: 'ICAR-राष्ट्रीय चावल अनुसंधान संस्थान (NRRI), कटक'
  },

  // ── Wheat / Gehun ─────────────────────────────────────────────
  {
    id: 'wheat_leaf_rust',
    crop: 'Gehun',
    name_en: 'Leaf Rust',
    name_hi: 'गेहूं का रतुआ रोग (Leaf Rust)',
    aliases: ['leaf rust', 'puccinia triticina', 'रतुआ', 'रतुआ रोग'],
    symptoms_hi: 'पत्तियों पर छोटे नारंगी-भूरे चूर्णित फफूंद के दाने (uredia) बनना, जो रगड़ने पर हाथ पर नारंगी धूल चिपकाते हैं; गंभीर प्रकोप में पत्तियां सूखकर करक जाती हैं।',
    organic_hi: '• जिंक व सल्फर की कमी दूर करें — सूक्ष्म पोषक संतुलन रतुआ रोकने में मदद करता है।\n• रोगग्रस्त अवशेषों को न जलाएं/न बिखेरें — खेत साफ रखें।\n• नीम तेल (1500 ppm) + कॉपर आधारित छिड़काव रोगदमन में सहायक है।',
    chemical_hi: '• प्रोपिकोनाजोल 25% EC — 200 मिली/100 लीटर पानी/एकड़, या टेबुकोनाज़ोल 50%+ट्रायडिमेफॉन 40% WG — 75-100 ग्राम/एकड़।\n• डाइथेनो-M-45 78% WP — 500 ग्राम/एकड़। आवश्यकता अनुसार 15 दिन बाद दोहराएं।',
    prevention_hi: '• रतुआ-रोधी किस्में लगाएं: PBW 343, HD 2967, HD 3086।\n• देर से बुवाई से बचें — नवंबर के मध्य तक बुवाई पूरी करें।\n• अधिक नाइट्रोजन/घने रोप से बचें — फसलों में हवा का संचलन हो।',
    source: 'ICAR-भारतीय गेहूं एवं जौ अनुसंधान संस्थान (IIWBR), करनाल'
  },
  {
    id: 'wheat_yellow_rust',
    crop: 'Gehun',
    name_en: 'Yellow (Stripe) Rust',
    name_hi: 'पीला रतुआ (Yellow/Stripe Rust)',
    aliases: ['yellow rust', 'stripe rust', 'puccinia striiformis', 'पीला रतुआ', 'पीली धार'],
    symptoms_hi: 'पत्तियों पर पीले-नारंगी धूसर धारियां/पट्टियां बनना जो पत्तियों के समानांतर चलती हैं; गंभीर स्थिति में पत्तियां पीली पड़कर करक जाती हैं।',
    organic_hi: '• जिंक व सल्फर उर्वरक संतुलन रखें।\n• नीम-आधारित जैविक छिड़काव सुरक्षा के लिए सहायक है।\n• रोगग्रस्त अवशेषों को खेत से हटाएं।',
    chemical_hi: '• प्रोपिकोनाजोल 25% EC — 200 मिली/100 लीटर, या टेबुकोनाज़ोल 50%+ट्रायडिमेफॉन 40% WG — 100 ग्राम/एकड़।\n• साफ मौसम में सुबह छिड़काव करें; 15 दिन बाद दोहराएं।',
    prevention_hi: '• पीले रतुआ-रोधी किस्में: PBW 343, DBW 187, HD 3086।\n• अवशेषों को न जलाएं।\n• शस्यावर्तन: गेहूं के बाद दालें/तिलहन लगाएं।',
    source: 'ICAR-भारतीय गेहूं एवं जौ अनुसंधान संस्थान (IIWBR), करनाल'
  },

  // ── Maize / Makka ─────────────────────────────────────────────
  {
    id: 'maize_turcicum_blight',
    crop: 'Makka',
    name_en: 'Turcicum Leaf Blight (Maydis Leaf Blight)',
    name_hi: 'मक्का का पत्ती झुलसा (Turcicum Leaf Blight)',
    aliases: ['turcicum', 'maydis', 'leaf blight maize', 'tflb', 'झुलसा मक्का', 'दीर्घ धब्बा'],
    symptoms_hi: 'पत्तियों पर लंबे (5-10 सेमी) धूसर-पीले-हरे धब्बे जो घिरते हुए बढ़ते हैं; गंभीर प्रकोप में पत्तियां भूरी होकर सूख जाती हैं।',
    organic_hi: '• घुलनशील जिंक/पोटाश संतुलन — पोटाश की कमी रोग बढ़ाती है।\n• ट्राइकोडेर्मा/स्यूडोमोनास आधारित जैविक छिड़काव।\n• घनी बुवाई से बचें; खेत में hygienic अवशेष प्रबंधन।',
    chemical_hi: '• प्रोपिकोनाजोल 25% EC — 200-250 मिली/100 लीटर पानी/एकड़, या Azoxystrobin 23% SC — 100-120 मिली/एकड़।\n• दो छिड़काव 10-12 दिन के अंतराल पर।',
    prevention_hi: '• Turcicum-रोधी संकर लगाएं: शक्तिमान-1, शक्तिमान-2, गंगा-11।\n• certified बीज उपयोग करें; बुवाई के समय बीज उपचार (थिरम/कैरबेन्डाजिम 2 ग्राम/किग्रा बीज)।\n• खेत में हवादार घनी न रखें।',
    source: 'ICAR-मक्का अनुसंधान निदेशालय (IIMR), नई दिल्ली'
  },
  {
    id: 'maize_flea_beetle',
    crop: 'Makka',
    name_en: 'Flea Beetle',
    name_hi: 'मक्का की फ्ली बीटल (Flea Beetle)',
    aliases: ['flea beetle', 'फ्ली बीटल', 'फुदकी कीट'],
    symptoms_hi: 'नई पत्तियों पर छोटी गोल छेद — फ्ली बीटल द्वारा भक्षण; पत्तियों पर समानांतर कटी धारियां।',
    organic_hi: '• खेत के किनारे की घास-फूस साफ रखें — कीट पनपने से रोक।\n• नीम तेल (1500 ppm) 5 मिली/लीटर का छिड़काव नई पत्तियों पर।\n• पीले चिपचिपे कार्ड/जाल लगाएं।',
    chemical_hi: '• Imidacloprid 17.8% SL — 2-3 मिली/लीटर या थायमेथॉक्सम 25% WG — 1 ग्राम/लीटर।\n• थायमेथॉक्सम 30% FS बीज उपचार (2-3 ग्राम/किग्रा बीज) — बुवाई के समय।',
    prevention_hi: '• flea beetle tolerant संकर बीज चुनें।\n• बुवाई के तुरंत बाद नर्सरी की निगरानी करें।\n• घनी बुवाई से बचें — airy spacing रखें।',
    source: 'ICAR-मक्का अनुसंधान निदेशालय (IIMR), नई दिल्ली'
  },

  // ── Mustard / Sarson ──────────────────────────────────────────
  {
    id: 'mustard_white_rust',
    crop: 'Sarson',
    name_en: 'White Rust',
    name_hi: 'सरसों का श्वेत जीरो (White Rust)',
    aliases: ['white rust', 'albugo', 'श्वेत जीरो', 'सफेद जीरो', 'white blister'],
    symptoms_hi: 'पत्तियों व तनों पर सफेद-पीले फफूंद के उभरे हुए फफोले, पत्तियां विकृत होकर मुड़ जाती हैं; तने पर भी सफेद दाने।',
    organic_hi: '• रोगग्रस्त पौधों को उखाड़कर नष्ट करें — रोगाणु फैलाव रोकें।\n• स्यूडोमोनास/ट्राइकोडेर्मा आधारित जैविक छिड़काव।\n• खेत में hygienic अवशेष प्रबंधन करें।',
    chemical_hi: '• मेटालैक्सिल 8% + मैंकोज़ेब 64% WP — 200-250 ग्राम/एकड़ 200 लीटर पानी में।\n• या हेक्साकोनाज़ोल 5% EC — 200 मिली/एकड़। 10-15 दिन बाद दोहराएं।',
    prevention_hi: '• श्वेत जीरो-रोधी किस्में: पुसा सरसों-26, NRCHB-101।\n• फसल चक्र: सरसों के बाद अलग परिवार की फसल (गेहूं/चना) लगाएं।\n• certified बीज व treated बीज का उपयोग।',
    source: 'ICAR-राष्ट्रीय राई एवं सरसों अनुसंधान केंद्र (NRC on Rapeseed-Mustard), भरभाड़ा'
  },
  {
    id: 'mustard_alternaria',
    crop: 'Sarson',
    name_en: 'Alternaria Blight',
    name_hi: 'सरसों का झुलसा (Alternaria Blight)',
    aliases: ['alternaria', 'alternaria blight', 'झुलसा सरसों', 'भूरा धब्बा सरसों'],
    symptoms_hi: 'पत्तियों पर भूरे-गहरे धब्बे जिनके किनारे पीले; तने व siliqua पर भी धब्बे; शुष्क स्थानों में रोग अधिक।',
    organic_hi: '• संतुलित उर्वरक — पोटाश की कमी रोग बढ़ाती है।\n• नीम तेल + स्यूडोमोनास छिड़काव।\n• खेत में hygienic अवशेष प्रबंधन।',
    chemical_hi: '• मैंकोज़ेब 75% WP — 400-500 ग्राम/एकड़ 200 लीटर पानी में।\n• या Azoxystrobin 23% SC — 100-120 मिली/एकड़। 10-12 दिन बाद दोहराएं।',
    prevention_hi: '• झुलसा-रोधी किस्में चुनें।\n• घना रोप/closed canopy से बचें।\n• certified बीज उपयोग; खेत में साफ-सफाई।',
    source: 'ICAR-राष्ट्रीय राई एवं सरसों अनुसंधान केंद्र (NRC on Rapeseed-Mustard), भरभाड़ा'
  },

  // ── Litchi ────────────────────────────────────────────────────
  {
    id: 'litchi_anthracnose',
    crop: 'Litchi',
    name_en: 'Litchi Anthracnose',
    name_hi: 'लीची का एन्थ्रेक्नोज़ रोग',
    aliases: ['anthracnose', 'colletotrichum', 'एन्थ्रेक्नोज़', 'लीची झुलसा'],
    symptoms_hi: 'पत्तियों व फलों पर धूसर-काले धब्बे, पत्तियों पर necrotic धब्बों के किनारे पीले; फल पर धब्बे सड़न का कारण।',
    organic_hi: '• कॉपर oxychloride / नीम तेल आधारित छिड़काव फल विकास की अवस्था में।\n• झड़ी हुई फलों/पत्तियों को न बिखेरें — नष्ट करें।\n• adequate sunlight व air circulation के लिए tree pruning करें।',
    chemical_hi: '• कॉपर ऑक्सीक्लोराइड 50% WP — 2-3 ग्राम/लीटर या Azoxystrobin 23% SC — 1 मिली/लीटर।\n• Mancozeb 75% WP — 2-2.5 ग्राम/लीटर। दो छिड़काव 15 दिन के अंतराल पर।',
    prevention_hi: '• फल लगने से पहले copper-based छिड़काव करें (फरवरी-मार्च)।\n• घना छाया न रखें — tree canopy managed रखें।\n• KVK, मुजफ्फरपुर से disease forecasting advisory लें।',
    source: 'राष्ट्रीय लीची अनुसंधान केंद्र (NRC on Litchi), मुशहरी, मुजफ्फरपुर'
  },

  // ── Mango / Aam ───────────────────────────────────────────────
  {
    id: 'mango_anthracnose',
    crop: 'Aam',
    name_en: 'Mango Anthracnose',
    name_hi: 'आम का एन्थ्रेक्नोज़ रोग',
    aliases: ['mango anthracnose', 'aam anthracnose', 'आम झुलसा', 'आम का काला धब्बा'],
    symptoms_hi: 'पत्तियों, कलियों व फलों पर काले-धूसर धब्बे, कलियों में सड़न, फलों पर velvet-textured धब्बे जो बाद में सड़न का कारण बनते हैं।',
    organic_hi: '• FIELD hygiene + copper oxychloride/नीम तेल छिड़काव।\n• फल पकने से पहले tree canopy open रखें।\n• सड़ी हुई कली/फल तुरंत हटाएं।',
    chemical_hi: '• कॉपर ऑक्सीक्लोराइड 50% WP — 3 ग्राम/लीटर या Carbendazim 50% WP — 1 ग्राम/लीटर।\n• Mancozeb 75% WP — 2.5 ग्राम/लीटर। फल पकने के 15-20 दिन पहले अंतिम छिड़काव।',
    prevention_hi: '• disease-free क्षेत्र से कलम/बीज लें।\n• Monsoon में copper spray बढ़ाएं — नमी में anthracnose फैलता है।\n• Post-harvest: रोगग्रस्त फल अलग रखें।',
    source: 'ICAR-राष्ट्रीय आम अनुसंधान केंद्र (ICAR-NRC on Mango), लखनऊ'
  }
];

/**
 * Match a detected disease name (+ optional crop) against verified KB.
 * Returns the best-matching disease entry or null.
 */
function matchVerifiedDisease(diseaseName = '', cropName = '', farmerCrop = '') {
  const dNorm = normalizeText(diseaseName);
  const crop = normalizeCrop(cropName) || normalizeCrop(farmerCrop) || null;
  if (!dNorm) return null;

  let best = null;
  let bestScore = 0;

  for (const d of DISEASE_KNOWLEDGE) {
    if (crop && d.crop !== crop) continue;
    let score = 0;
    for (const alias of d.aliases) {
      const a = normalizeText(alias);
      if (dNorm.includes(a) || a.includes(dNorm)) {
        score += a.length;
      }
    }
    if (score === 0) {
      const dWords = new Set(dNorm.split(' ').filter(w => w.length > 3));
      const aWords = new Set(d.aliases.flatMap(x => normalizeText(x).split(' ')).filter(w => w.length > 3));
      const overlap = [...dWords].filter(w => aWords.has(w)).length;
      score = overlap * 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  return bestScore >= 4 ? best : null;
}

/** Format a verified entry into API-ready fields. */
function verifiedFields(disease) {
  if (!disease) return {};
  return {
    verified_disease_id: disease.id,
    verified_disease_name: disease.name_hi,
    knowledge_source: disease.source,
    verified_symptoms: disease.symptoms_hi,
    verified_organic_treatment: disease.organic_hi,
    verified_chemical_treatment: disease.chemical_hi,
    verified_prevention: disease.prevention_hi
  };
}

module.exports = {
  DISEASE_KNOWLEDGE,
  matchVerifiedDisease,
  verifiedFields,
  normalizeCrop
};
