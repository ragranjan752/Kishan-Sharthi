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
  sabzi: 'Sabzi', vegetable: 'Sabzi', सब्जी: 'Sabzi',
  aloo: 'Aloo', potato: 'Aloo', आलू: 'Aloo',
  tamatar: 'Tamatar', tomato: 'Tamatar', टमाटर: 'Tamatar',
  kapas: 'Kapas', cotton: 'Kapas', कपास: 'Kapas',
  ganna: 'Ganna', sugarcane: 'Ganna', गन्ना: 'Ganna',
  chana: 'Chana', chickpea: 'Chana', चना: 'Chana',
  arhar: 'Arhar', pigeonpea: 'Arhar', अरहर: 'Arhar', toor: 'Arhar',
  moong: 'Moong', mungbean: 'Moong', मूंग: 'Moong',
  urad: 'Urad', blackgram: 'Urad', उड़द: 'Urad',
  moongfali: 'Moongfali', groundnut: 'Moongfali', peanut: 'Moongfali', मूंगफली: 'Moongfali',
  soyabean: 'Soyabean', soybean: 'Soyabean', सोयाबीन: 'Soyabean',
  surajmukhi: 'Surajmukhi', sunflower: 'Surajmukhi', सूरजमुखी: 'Surajmukhi',
  kela: 'Kela', banana: 'Kela', केला: 'Kela',
  santra: 'Santra', citrus: 'Santra', orange: 'Santra', संतरा: 'Santra',
  anaar: 'Anaar', pomegranate: 'Anaar', अनार: 'Anaar',
  papita: 'Papita', papaya: 'Papita', पपीता: 'Papita',
  baingan: 'Baingan', brinjal: 'Baingan', eggplant: 'Baingan', बैंगन: 'Baingan',
  bhindi: 'Bhindi', okra: 'Bhindi', okra: 'Bhindi', भिंडी: 'Bhindi',
  kheera: 'Kheera', cucumber: 'Kheera', खीरा: 'Kheera',
  lehsun: 'Lehsun', garlic: 'Lehsun', लहसुन: 'Lehsun',
  jowar: 'Jowar', sorghum: 'Jowar', ज्वार: 'Jowar',
  bajra: 'Bajra', 'pearl millet': 'Bajra', बाजरा: 'Bajra',
  jau: 'Jau', barley: 'Jau', जौ: 'Jau',
  masoor: 'Masoor', lentil: 'Masoor', मसूर: 'Masoor',
  angoor: 'Angoor', grape: 'Angoor', अंगूर: 'Angoor',
  guava: 'Guava', अमरूद: 'Guava', ber: 'Ber', बेर: 'Ber'
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
  },

  // ── Potato / Aloo ─────────────────────────────────────────────
  {
    id: 'potato_late_blight',
    crop: 'Aloo',
    name_en: 'Late Blight',
    name_hi: 'आलू का लेट ब्लाइट (देर-झुलसा रोग)',
    aliases: ['late blight', 'phytophthora', 'लेट ब्लाइट', 'आलू का झुलसा'],
    symptoms_hi: 'पत्तियों व डंठल पर पानी-भरे भूरे धब्बे जो ठंड-नमी में तेज़ी से बढ़ते हैं; underside पर सफेद फफूंद; कंद सड़कर सड़न फैलती है।',
    organic_hi: '• रोगग्रस्त पत्तियों को तुरंत हटाएं व न जलाएं।\n• नीम तेल + छाछ आधारित छिड़काव (5 मिली/लीटर) सहायक है।\n• ट्राइकोडेर्मा हैरज़ियनम जीवामृत 10-15 दिन के अंतराल पर छिड़कें।',
    chemical_hi: '• मैंकोज़ेब 75% WP — 2.5-3 ग्राम/लीटर या Metalaxyl+Mancozeb — लेबल दर से।\n• नमी के मौसम में 7-10 दिन के अंतराल पर दोहराएं।',
    prevention_hi: '• blight-रोधी किस्में: कुफरी ज्योति, hills की र դեպ।\n• बीज कंद disease-free रखें; 2% कॉपर सल्फेट घोल में डुबोकर लगाएं।\n• अधिक पानी न दें — कंद सड़न रोकें।',
    source: 'ICAR-भारतीय आलू अनुसंधान संस्थान (ICAR-CPRI), शिमला एवं PAU, लुधियाना'
  },
  {
    id: 'potato_early_blight',
    crop: 'Aloo',
    name_en: 'Early Blight',
    name_hi: 'आलू का अर्ली ब्लाइट (जल्दी-झुलसा)',
    aliases: ['early blight', 'alternaria', 'अर्ली ब्लाइट'],
    symptoms_hi: 'पत्तियों पर गोलाकार भूरे धब्बे जिनके चारों ओर पीला घेरा; धब्बे बड़े होकर पत्ती झुलसा देती हैं; कंद पर सतही धब्बे।',
    organic_hi: '• संतुलित पोषण — पोटाश की कमी रोग बढ़ाती है।\n• नीम खली/क noz के किचन से जीवामृत बनाएं और छिड़कें।',
    chemical_hi: '• मैंकोज़ेब 75% WP — 2.5 ग्राम/लीटर, या क्लोरोथैलोनिल — लेबल दर से। 10-12 दिन बाद दोहराएं।',
    prevention_hi: '• गहरी जुताई व फसल चक्र अपनाएं।\n• रोगग्रस्त अवशेष न जलाएं।\n• प्रतिरोधी किस्में चुनें।',
    source: 'ICAR-भारतीय आलू अनुसंधान संस्थान (ICAR-CPRI), शिमला'
  },

  // ── Tomato / Tamatar ──────────────────────────────────────────
  {
    id: 'tomato_early_blight',
    crop: 'Tamatar',
    name_en: 'Early Blight',
    name_hi: 'टमाटर का अर्ली ब्लाइट',
    aliases: ['tomato early blight', 'alternaria tomato', 'टमाटर झुलसा'],
    symptoms_hi: 'पत्तियों पर गोल भूरे धब्बे पीले घेरों के साथ; पुरानी पत्तियां नीचे से सूखती हैं; फलों पर गहरे धब्बे व त्वचा छिलकना।',
    organic_hi: '• नीम तेल (5 मिली/लीटर) + छाछ (100 मिली/लीटर) छिड़काव।\n• ट्राइकोडेर्मा आधारित जीवामृत 15 दिन के अंतराल पर।',
    chemical_hi: '• मैंकोज़ेब 75% WP — 2.5-3 ग्राम/लीटर या Difenoconazole — लेबल दर से। 10 दिन बाद दोहराएं।',
    prevention_hi: '• पादपों के बीच दूरी रखें — हवा का संचलन हो।\n• रोगग्रस्त पत्तियां तुरंत हटाएं।\n• पॉलीहाउस/स्थिरी क्षेत्र में जल न रखें।',
    source: 'Punjab Agricultural University (PAU), लुधियाना एवं ICAR-IIHR, हैदराबाद'
  },
  {
    id: 'tomato_late_blight',
    crop: 'Tamatar',
    name_en: 'Late Blight',
    name_hi: 'टमाटर का लेट ब्लाइट',
    aliases: ['tomato late blight', 'late blight tomato', 'फाइटोफ्थोरा'],
    symptoms_hi: 'पत्तियों व तनों पर जल-भरे भूरे धब्बे जो नमी में पूरे पौधे पर फैलते हैं; फल पर गहरे धब्बे; सफेद फफूंद underside पर।',
    organic_hi: '• रोगग्रस्त भाग तुरंत हटाएं।\n• पोटाश बढ़ाएं — रोग-सहिष्णुता बढ़ती है।\n• लेकिन आस-पास के पौधों पर भी कॉपर स्प्रे करें।',
    chemical_hi: '• मैंकोज़ेब + Metalaxyl मिक्स — लेबल दर से।\n• नमी के मौसम में 7 दिन के अंतराल पर छिड़काव।',
    prevention_hi: '• पौध-रोपाई से पहले मिट्टी सौर-ताप से गर्म करें।\n• नीचलेपन वाली भूमि में जल निकासी करें।\n• disease-free पौधे ही लगाएं।',
    source: 'Punjab Agricultural University (PAU), लुधियाना'
  },

  // ── Cotton / Kapas ────────────────────────────────────────────
  {
    id: 'cotton_bacterial_blight',
    crop: 'Kapas',
    name_en: 'Bacterial Blight',
    name_hi: 'कपास का जीवाणु झुलसा',
    aliases: ['bacterial blight cotton', 'xanthomonas cotton', 'कपास का झुलसा'],
    symptoms_hi: 'पत्तियों पर पानी-भरे धब्बे जो बाद में काले-भूरे हो जाते हैं; तने पर गहरे धब्बे; पौधा रौनक खोकर सूखता है।',
    organic_hi: '• रोगग्रस्त पौधे उखाड़कर न जलाएं।\n• नीम 5 मिली/लीटर + छाछ 100 मिली/लीटर छिड़काव।',
    chemical_hi: '• स्ट्रेप्टोसाइक्लिन सल्फेट — लेबल दर से (500-750 ग्राम/एकड़)।\n• या कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर।',
    prevention_hi: '• disease-free बीज चुनें; बीज को 50°C गर्म पानी में 10 मिनट उपचारित करें।\n• प्रतिरोधी किस्में लगाएं।\n• घनी बुवाई से बचें।',
    source: 'ICAR-केंद्रीय कपास अनुसंधान संस्थान (ICAR-CICR), नागपुर'
  },
  {
    id: 'cotton_bollworm',
    crop: 'Kapas',
    name_en: 'Pink Bollworm / Bollworm',
    name_hi: 'कपास का गुलाबी तंबाकू छेदक (बोलवर्म)',
    aliases: ['bollworm', 'pink bollworm', 'tobacco caterpillar', 'बोलवर्म', 'तंबाकू कीट'],
    symptoms_hi: 'फूलों व कीटाणुओं में छेद; झंडा गिरे पत्ते; boll पर छेद व अंदर कीड़ा; कपास की मात्रा व गुणवत्ता कम।',
    organic_hi: '• ट्राइकोग्रामा भिवेवी / कॉरीकरण mannequin से जैविक नियंत्रण।\n• Neem-based insecticide + BT cotton किस्में।\n•$field में नीम की पत्तियां/गुड़ का प्रलोभन kullancrognostic करें।',
    chemical_hi: '• Emamectin benzoate 5% SG — 80-100 ग्राम/एकड़ (500-750 लीटर पानी में)।\n• या Chlorantraniliprole 18.5% SC — 150-200 मिली/एकड़। 15 दिन बाद दोहराएं।',
    prevention_hi: '• BT-कपास किस्में लगाएं (BG-II/BG-III)।\n• फसल चक्र अपनाएं — कपास के बाद तिलहन/दलहन।\n• हर 7-10 दिन की scouting से शुरुआती कीट-नियंत्रण tránh करें।',
    source: 'ICAR-केंद्रीय कपास अनुसंधान संस्थान (ICAR-CICR), नागपुर एवं KVK'
  },

  // ── Sugarcane / Ganna ─────────────────────────────────────────
  {
    id: 'sugarcane_red_rot',
    crop: 'Ganna',
    name_en: 'Red Rot',
    name_hi: 'गन्ने की लाल सड़न (Red Rot)',
    aliases: ['red rot', 'red rot sugarcane', 'लाल सड़न'],
    symptoms_hi: 'तने में लाल-भूरे धब्बे; तना काटने पर भीतर लाल-सफेद अनाज;Internal Tissue लाल व आयनाइज़्ड; गन्ना कोमल व सुगंधहीन।',
    organic_hi: '• रोगग्रस्त डंठल तुरंत उखाड़ें व जलाएं।\n• सेट-ट्यूब के बीज का चयन करें; 50°C पानी में 10 मिनट उपचारित करें।',
    chemical_hi: '• Propiconazole 25% EC — 1 मिली/लीटर या Carbendazim — बीज उपचार हेतु।',
    prevention_hi: '• disease-free बोसे की टुकड़ी/सेट-ट्यूब से ही बुवाई करें।\n• 2-3 वर्ष फसल चक्र अपनाएं।\n• जल भराव न रखें।',
    source: 'ICAR-भारतीय गन्ना अनुसंधान संस्थान (ICAR-IISR), लखनऊ'
  },
  {
    id: 'sugarcane_top_borer',
    crop: 'Ganna',
    name_en: 'Top Borer',
    name_hi: 'गन्ने का शीर्ष भेदक (Top Borer)',
    aliases: ['top borer', 'sugarcane borer', 'शीर्ष भेदक'],
    symptoms_hi: 'पत्तियों का शीर्ष सूखकर मुड़ना (dead heart); छेद से कीट-मल बाहर; तने में टनल; उपज में भारी गिरावट।',
    organic_hi: '• झंडे/फंदे से नर कीट पकड़ें।\n• ट्राइकोग्रामा klebari के अंडे पर छोड़ें।\n• नीम-based पेस्ट तने पर लगाएं।',
    chemical_hi: '• Emamectin benzoate 5% SG — 100-125 ग्राम/एकड़, या Chlorpyriphos 20% EC — 1.5-2 लीटर/एकड़।',
    prevention_hi: '• 15-20 दिन की scouting करें।\n• resistant किस्में लगाएं।\n• फसल चक्र व फसल अवशेष न जलाएं।',
    source: 'ICAR-भारतीय गन्ना अनुसंधान संस्थान (ICAR-IISR), लखनऊ एवं STATE KVK'
  },

  // ── Pulses ────────────────────────────────────────────────────
  {
    id: 'chickpea_wilt',
    crop: 'Chana',
    name_en: 'Wilt / Fusarium Wilt',
    name_hi: 'चना की मुरझानी (Wilt रोग)',
    aliases: ['chickpea wilt', 'fusarium wilt chana', 'चना मुरझाना', 'wilting'],
    symptoms_hi: 'पौधा अचानक मुरझाकर सूख जाता है — जड़ें भूरी व सड़ी; तने के आधार पर गहरा धब्बा; पैदावार में भारी गिरावट।',
    organic_hi: '• सड़ी गोबर खाद + ट्राइकोडेर्मा हैरज़ियनम जीवामृत बुवाई से पहले।\n• रोगग्रस्त पौधे उखाड़कर न जलाएं — मिट्टी से हटा दें।',
    chemical_hi: '• Carbendazim 50% WP — बीज उपचार 2 ग्राम/किग्रा बीज, या Trichoderma harzianum — 10 ग्राम/किग्रा बीज।',
    prevention_hi: '• late sowing से बचें — Fusarium गर्म मिट्टी में फैलता है।\n• फसल चक्र: चना के बाद चना न लगाएं।\n• deep summer ploughing से मिट्टी में रोगाणु नष्ट।',
    source: 'ICAR-भारतीय दलहन अनुसंधान संस्थान (ICAR-IIPR), कानपुर एवं PAU, लुधियाना'
  },
  {
    id: 'pigeonpea_wilt',
    crop: 'Arhar',
    name_en: 'Fusarium Wilt',
    name_hi: 'अरहर की मुरझानी (Fusarium Wilt)',
    aliases: ['pigeonpea wilt', 'arhar wilt', 'अरहर मुरझाना', 'toor wilt'],
    symptoms_hi: 'एक-एक पौधा अचानक मुरझाता है —;xylem में भूरी रेखा; जड़ें सड़ी व काली; पौधा हरा दिखने के बावजूद गिर जाता है।',
    organic_hi: '• Trichoderma + Pseudomonas जीवामृत बीज व मिट्टी में।\n• रोगग्रस्त पौधे तुरंत हटा दें।',
    chemical_hi: '• Carbendazim बीज उपचार + soil drench — लेबल दर से।',
    prevention_hi: '• wilt-रोधी किस्में: IPA-09-37, Maruti।\n• फसल चक्र: अरहर के बाद अरहर न लगाएं।\n• खेत में जल निकासी सुनिश्चित करें।',
    source: 'ICAR-भारतीय दलहन अनुसंधान संस्थान (ICAR-IIPR), कानपुर'
  },
  {
    id: 'mungbean_yellow_mosaic',
    crop: 'Moong',
    name_en: 'Yellow Mosaic Virus',
    name_hi: 'मूंग का पीला मोज़ेक वायरस',
    aliases: ['yellow mosaic', 'mosaic virus moong', 'पीला मोजेक'],
    symptoms_hi: 'पत्तियों पर पीले-हरे मोज़ेक धब्बे; पत्तियां सिकुड़कर छोटी; फली व दाना नहीं बनता; पौधा बौना रह जाता है।',
    organic_hi: '• सफेद मक्खी (vector) को नियंत्रित करें — पीले चिपचिपे पत्ते पर पानी से धोएं।\n• नीम oil based insecticide छिड़कें।',
    chemical_hi: '•vector नियंत्रण: Imidacloprid 17.8% SL — 150-200 मिली/एकड़, या Acetamiprid — लेबल दर से।',
    prevention_hi: '• Resistant किस्में: HUM-16, Pusa Vishal।\n• जल्दी बुवाई (जुलाई के पहले सप्ताह) — WHITEFLY (सफेद मक्खी) के प्रकोप से बचें।\n• घनी बुवाई से बचें।',
    source: 'ICAR-भारतीय दलहन अनुसंधान संस्थान (ICAR-IIPR), कानपुर एवं KVK'
  },

  // ── Oilseeds / Commercial ─────────────────────────────────────
  {
    id: 'groundnut_tikka',
    crop: 'Moongfali',
    name_en: 'Tikka Leaf Spot',
    name_hi: 'मूंगफली का टिक्का रोग',
    aliases: ['tikka', 'tikka leaf spot', 'groundnut tikka', 'टिक्का'],
    symptoms_hi: 'पत्तियों पर गहरे भूरे-लाल उभरे धब्बे (tikka); धब्बे के चारों ओर पीला घेरा; पत्ती सूखकर गिरती है; underground Pods सड़ते हैं।',
    organic_hi: '• सड़ी गोबर खाद + ट्राइकोडेर्मा जीवामृत।\n• नीम oil 5 मिली/लीटर छिड़काव।',
    chemical_hi: '• Chlorothalonil 75% WP — 2 ग्राम/लीटर या Hexaconazole 5% EC — 2 मिली/लीटर। 10-15 दिन बाद दोहराएं।',
    prevention_hi: '• disease-free बीज चुनें।\n• घनी बुवाई से बचें;_field में जल निकासी करें।\n• फसल चक्र अपनाएं।',
    source: 'ICAR-ICRISAT, हैदराबाद एवं Punjab Agricultural University (PAU), लुधियाना'
  },
  {
    id: 'soybean_rust',
    crop: 'Soyabean',
    name_en: 'Soybean Rust',
    name_hi: 'सोयाबीन का रस्ट रोग',
    aliases: ['soybean rust', 'phakopsora', 'सोयाबीन रस्ट'],
    symptoms_hi: 'पत्तियों की ऊपरी सतह पर छोटे भूरे-लाल उभरे धब्बे; underside पर हल्का धूसर पाउडर; पत्तियां जल्दी सूखती हैं; उपज में भारी गिरावट।',
    organic_hi: '• पोटाश की मात्रा बढ़ाएं।\n• रोगग्रस्त पत्तियां हटाएं।',
    chemical_hi: '• Propiconazole 25% EC — 200 मिली/एकड़ (200 लीटर पानी में), या Tebuconazole — लेबल दर से।',
    prevention_hi: '• रोगग्रस्त अवशेष न जलाएं।\n• ICAR-IIOR/ICAR-DEMP की अनुशंसित किस्में चुनें।\n• घनी बुवाई से बचें।',
    source: 'ICAR-भारतीय तिलहन अनुसंधान संस्थान (ICAR-IIOR), हैदराबाद'
  },

  // ── Vegetables ────────────────────────────────────────────────
  {
    id: 'brinjal_fsb',
    crop: 'Baingan',
    name_en: 'Fruit & Shoot Borer',
    name_hi: 'बैंगन का फल व तना भेदक',
    aliases: ['fruit shoot borer', 'brinjal borer', 'शूट बोरर', 'फल भेदक'],
    symptoms_hi: 'तने व फलों में छेद; अंदर कीड़ा; पत्तियां बासी होकर गिरती हैं; फलों में कीट-मल; उपज में भारी गिरावट।',
    organic_hi: '•pheromone ट्रैप लगाएं।\n• नीम oil based insecticide + BT (Bacillus thuringiensis) छिड़काव।\n• रोगग्रस्त फल/पौधे तुरंत हटाएं।',
    chemical_hi: '• Emamectin benzoate 5% SG — 80-100 ग्राम/एकड़ या Chlorantraniliprole 18.5% SC — 150-200 मिली/एकड़।',
    prevention_hi: '• pheromone ट्रैप 4-5/एकड़ लगाएं।\n• रोगग्रस्त भाग हटाएं।\n• 7-10 दिन की scouting करें।',
    source: 'ICAR-भारतीय सब्जी अनुसंधान संस्थान (ICAR-IIHR), हैदराबाद एवं STATE KVK'
  },
  {
    id: 'bhindi_yvmv',
    crop: 'Bhindi',
    name_en: 'Yellow Vein Mosaic Virus',
    name_hi: 'भिंडी का पीली नस मोज़ेक वायरस',
    aliases: ['yellow vein mosaic', 'bhindi mosaic', 'पीली नस'],
    symptoms_hi: 'पत्तियों पर पीली नसें (veins); पत्तियां बारीक व सिकुड़ी; फल छोटा व विकृत; उपज में भारी गिरावट।',
    organic_hi: '• सफेद मक्खी (vector) को नियंत्रित करें।\n• नीम oil + स्टिकी ट्रैप।',
    chemical_hi: '•vector नियंत्रण: Imidacloprid या Acetamiprid — लेबल दर से।',
    prevention_hi: '• Resistant किस्में: Arka Anamika, VRO-6।\n• जल्दी बुवाई।\n• खेत में घनी बुवाई से बचें।',
    source: 'ICAR-IIHR, हैदराबाद एवं ICAR-IIVR, वाराणसी'
  },
  {
    id: 'cucumber_downy_mildew',
    crop: 'Kheera',
    name_en: 'Downy Mildew',
    name_hi: 'खीरे का डाउन मिल्ड्यू (पत्ती फफूंद)',
    aliases: ['downy mildew cucumber', 'downy mildew', 'डाउन मिल्ड्यू', 'पत्ती फफूंद'],
    symptoms_hi: 'पत्तियों की ऊपरी सतह पर पीले धब्बे; underside पर काले-बैंगनी फफूंद; पत्तियां जल्दी सूखती हैं; फसल बर्बाद होती है।',
    organic_hi: '• पानी की अधिकता न दें — नमी में रोग फैलता है।\n• नीम oil 5 मिली/लीटर छिड़काव।',
    chemical_hi: '• Metalaxyl + Mancozeb मिक्स — लेबल दर से, या Copper oxychloride 3 ग्राम/लीटर।',
    prevention_hi: '• field में जल निकासी करें।\n• रोगग्रस्त पत्तियां तुरंत हटाएं।\n• disease-free बीज चुनें।',
    source: 'ICAR-IIHR, हैदराबाद एवं ICAR-IIVR, वाराणसी'
  },

  // ── Plantation / Fruits ───────────────────────────────────────
  {
    id: 'banana_sigatoka',
    crop: 'Kela',
    name_en: 'Sigatoka / Leaf Spot',
    name_hi: 'केले का सिगाटोका / पत्ती धब्बा रोग',
    aliases: ['sigatoka', 'banana leaf spot', 'sigaoka', 'केले का धब्बा'],
    symptoms_hi: 'पत्तियों पर भूरे-लाल धब्बे जो लंबे होते हैं; पत्तियां जल्दी सूखती हैं; फल की गुणवत्ता व मात्रा में गिरावट; पौधा कमजोर।',
    organic_hi: '• पत्तियों के बीच दूरी रखें — हवा का संचलन हो।\n• नीम oil + छाछ छिड़काव।',
    chemical_hi: '• Mancozeb 75% WP — 2.5-3 ग्राम/लीटर या Propiconazole — लेबल दर से। 15 दिन बाद दोहराएं।',
    prevention_hi: '• disease-free suckers से बाग लगाएं।\n• पुरानी पत्तियां हटाएं — फफूंद वहीं पनपती है।\n•_field में जल निकासी करें।',
    source: 'ICAR-राष्ट्रीय केला अनुसंधान केंद्र (ICAR-NRC on Banana), त्रिची'
  },
  {
    id: 'citrus_canker',
    crop: 'Santra',
    name_en: 'Citrus Canker',
    name_hi: 'संतरे का कैंसर रोग',
    aliases: ['citrus canker', 'canker', 'कैंसर', 'संतरे का कैंसर'],
    symptoms_hi: 'पत्तियों व फलों पर उभरे भूरीBorders वाले धब्बे; छिलके पर धब्बे; पत्तियां झड़ती हैं; फल विकृत होते हैं।',
    organic_hi: '• कॉपर ऑक्सीक्लोराइड + नीम oil का मिश्रण छिड़कें।\n• रोगग्रस्त भाग करें।',
    chemical_hi: '• Copper oxychloride 50% WP — 3 ग्राम/लीटर + Streptocycline — लेबल दर से।',
    prevention_hi: '• disease-free पौधे लगाएं।\n• pruning के tools को 1% formalin/bleach से disinfect करें।\n•_field में घनी बुवाई से बचें।',
    source: 'ICAR-राष्ट्रीय खट्टे फल अनुसंधान संस्थान (ICAR-NRC on Citrus), नागपुर एवं PAU, लुधियाना'
  },
  {
    id: 'papaya_ringspot',
    crop: 'Papita',
    name_en: 'Ringspot Virus',
    name_hi: 'पपीते का रिंगस्पॉट वायरस',
    aliases: ['ringspot', 'papaya ringspot', 'पपीता वायरस', 'rsv'],
    symptoms_hi: 'पत्तियों पर हल्के हरे व गहरे हरे के वलय (rings); तना व फल पर धब्बे; पौधा बौना व कमजोर; फल विकृत।',
    organic_hi: '• रोगग्रस्त पौधे तुरंत उखाड़ें व न जलाएं।\n• Aphid vector को नियंत्रित करें।',
    chemical_hi: '•vector नियंत्रण: Dimethoate या Imidacloprid — लेबल दर से।',
    prevention_hi: '• disease-free पौधे लगाएं।\n• खेत में घनी बुवाई से बचें।\n• प्रतिरोधी किस्में चुनें।',
    source: 'ICAR-भारतीय बागवानी अनुसंधान संस्थान (ICAR-IIHR), हैदराबाद'
  },

  // ── Millets / Cereals ─────────────────────────────────────────
  {
    id: 'jowar_downy_mildew',
    crop: 'Jowar',
    name_en: 'Downy Mildew',
    name_hi: 'ज्वार का डाउन मिल्ड्यू',
    aliases: ['downy mildew jowar', 'sorghum downy mildew', 'ज्वार फफूंद'],
    symptoms_hi: 'पत्तियों पर पीले धब्बे; underside पर सफेद-बैंगनी फफूंद; पौधा बौना व पीलापन; बालियां नहीं बनतीं।',
    organic_hi: '• disease-free बीज चुनें।\n• नीम oil छिड़काव।',
    chemical_hi: '• Metalaxyl + Mancozeb मिक्स बीज उपचार, या Copper oxychloride 3 ग्राम/लीटर।',
    prevention_hi: '• Resistant किस्में लगाएं।\n• खेत में जल निकासी करें।\n• फसल चक्र अपनाएं।',
    source: 'ICAR-भारतीय बाजरा अनुसंधान संस्थान (ICAR-IIMR), हैदराबाद'
  },
  {
    id: 'bajra_smut',
    crop: 'Bajra',
    name_en: 'Smuts',
    name_hi: 'बाजरे का कंडुआ/स्मट रोग',
    aliases: ['smut bajra', 'pearl millet smut', 'कंडुआ', 'स्मट'],
    symptoms_hi: 'बाजरे के बालियों में काले-भूरे पाउडर (smut spores); बालियां काली व विकृत; उपज में भारी गिरावट।',
    organic_hi: '• disease-free बीज चुनें।\n• बीज को गर्म पानी (50-52°C) में 10 मिनट उपचारित करें।',
    chemical_hi: '• Captan 50% WP — बीज उपचार 2.5 ग्राम/किग्रा बीज।',
    prevention_hi: '• disease-free बीज ही बुवाई करें।\n•_field में घनी बुवाई से बचें।\n• फसल चक्र अपनाएं।',
    source: 'ICAR-भारतीय बाजरा अनुसंधान संस्थान (ICAR-IIMR), हैदराबाद'
  },
  {
    id: 'barley_leaf_rust',
    crop: 'Jau',
    name_en: 'Leaf Rust / Net Blotch',
    name_hi: 'जौ का पत्ती रस्ट / नेट ब्लॉच',
    aliases: ['barley rust', 'leaf rust barley', 'जौ रस्ट', 'नेट ब्लॉच'],
    symptoms_hi: 'पत्तियों पर भूरे-लाल उभरे धब्बे; धब्बे के चारों ओर पीला घेरा; पत्तियां जल्दी सूखती हैं; बालियों में दाना हल्का।',
    organic_hi: '• पोटाश की मात्रा बढ़ाएं।\n• रोगग्रस्त पत्तियां हटाएं।',
    chemical_hi: '• Propiconazole 25% EC — 200 मिली/एकड़ या Tebuconazole — लेबल दर से।',
    prevention_hi: '• Resistant किस्में चुनें।\n• disease-free बीज।\n•_field में जल निकासी करें।',
    source: 'ICAR-भारतीय गेहूं एवं जौ अनुसंधान संस्थान (ICAR-IIWBR), करनाल'
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
