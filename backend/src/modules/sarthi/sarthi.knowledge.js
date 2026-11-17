// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Verified Bihar Agricultural Knowledge Base
//  Source: Bihar Agricultural University (BAU) Sabour, ICAR-RCER Patna,
//  and Department of Agriculture, Government of Bihar.
// ═══════════════════════════════════════════════════════════════════

const { DISEASE_KNOWLEDGE } = require('../detections/disease.knowledge');

const BASE_AGRI_KNOWLEDGE = [
  {
    topic: 'makhana_cultivation',
    title_hi: 'मिथिला मखाना की वैज्ञानिक खेती एवं प्रबंधन',
    districts: ['Darbhanga', 'Madhubani', 'Sitamarhi', 'Samastipur', 'Saharsa', 'Supaul', 'Katihar', 'Purnia'],
    crops: ['Makhana'],
    keywords: ['मखाना', 'makhana', 'foxnut', 'gorgon nut', 'तालाब', 'बीज', 'प्रसंस्करण', 'लावा'],
    content_hi: `• उपयुक्त जलवायु: उत्तर-पूर्वी बिहार का नम वातावरण एवं 1 से 2 फीट स्थिर जल स्तर वाले तालाब या खेत।
• बुवाई समय: दिसम्बर से जनवरी (नर्सरी), रोपाई: फरवरी-मार्च।
• उन्नत किस्में: 'सबौर मखाना-1' (BAU सबौर) एवं 'स्वर्ण वैदेही' (ICAR पटना)।
• खाद/उर्वरक: 100-150 कुंतल प्रति हेक्टेयर सड़ी गोबर की खाद।
• कटाई: अगस्त से अक्टूबर में तालाब के तल से बीजों को एकत्र करना (गांज निकालना)।
• जीआई टैग: 'मिथिला मखाना' को भारत सरकार द्वारा भौगोलिक संकेतक (GI Tag) प्राप्त है।`,
    verified_source: 'ICAR-राष्ट्रीय मखाना अनुसंधान केंद्र (NRCM), दरभंगा एवं BAU सबौर'
  },
  {
    topic: 'dhan_paddy_bihar',
    title_hi: 'बिहार में धान की उन्नत खेती एवं पोषण प्रबंधन',
    districts: ['Bhojpur', 'Rohtas', 'Kaimur', 'Buxar', 'Begusarai', 'Khagaria', 'Patna', 'Nalanda'],
    crops: ['Dhan'],
    keywords: ['धान', 'dhan', 'rice', 'paddy', 'रोपाई', 'खाद', 'यूरिया', 'डीएपी', 'swarna sub1', 'राजेंद्र श्वेता'],
    content_hi: `• बाढ़ सहिष्णु किस्में: 'स्वर्णा सब-1' (14-17 दिन जलमग्नता सहनशील), 'जलमग्न'।
• शीघ्र पकने वाली किस्में: 'राजेंद्र श्वेता', 'राजेंद्र भगवती', 'सहभागी धान' (कम पानी/सूखा सहिष्णु)।
• अनुशंसित खाद (प्रति कट्ठा / 1361 वर्गफीट): DAP - 750 ग्राम, Urea - 1.5 किग्रा (तीन बार में: 500 ग्राम रोपाई, 500 ग्राम 21 दिन, 500 ग्राम गभोट पर), MOP - 400 ग्राम, Zinc Sulphate (21%) - 150 ग्राम।
• खरपतवार नियंत्रण: प्रेटिलाक्लोर (Pretilachlor 50% EC) 500 मिली प्रति एकड़ रोपाई के 2-3 दिन भीतर पर्याप्त नमी में।`,
    verified_source: 'डॉ. राजेंद्र प्रसाद केंद्रीय कृषि विश्वविद्यालय (RPCAU), पूसा, समस्तीपुर'
  },
  {
    topic: 'makka_maize_rabi',
    title_hi: 'बिहार में रबी मक्का उत्पादन तकनीक',
    districts: ['Khagaria', 'Begusarai', 'Saharsa', 'Purnia', 'Katihar', 'Nalanda', 'Gaya', 'Bhagalpur'],
    crops: ['Makka'],
    keywords: ['मक्का', 'makka', 'maize', 'corn', 'भुट्टा', 'रबी मक्का', 'fall armyworm'],
    content_hi: `• बिहार देश का दूसरा सबसे बड़ा मक्का उत्पादक राज्य है। रबी मक्का की उत्पादकता विश्व स्तर की (80-100 कुंतल/हेक्टेयर) होती है।
• बुवाई का सर्वोत्तम समय: 15 अक्टूबर से 15 नवम्बर।
• अनुशंसित किस्में: शक्तिमान-1, शक्तिमान-2, गंगा-11, पायनियर 30V92, डेकाल्ब 9108।
• फॉल आर्मीवर्म (सैनिक कीट) नियंत्रण: शुरुआती अवस्था में नीम तेल (1500 ppm) 5 मिली/लीटर अथवा फेरोमोन ट्रैप (5 प्रति एकड़)। अत्यधिक प्रकोप में क्लोरेंट्रानिलिप्रोल (Coragen) 0.4 मिली/लीटर पानी।`,
    verified_source: 'मक्का अनुसंधान निदेशालय (IIMR) एवं कृषि विभाग, बिहार'
  },
  {
    topic: 'litchi_shahi',
    title_hi: 'शाही लीची फल विकास एवं फल फटने से बचाव',
    districts: ['Muzaffarpur', 'Vaishali', 'East Champaran', 'Samastipur'],
    crops: ['Litchi'],
    keywords: ['लीची', 'litchi', 'शाही लीची', 'मुजफ्फरपुर', 'फल फटना', 'बोरॉन', 'कीट'],
    content_hi: `• जीआई टैग: 'मुजफ्फरपुर की शाही लीची' को जीआई टैग प्राप्त है।
• फल फटने (Fruit Cracking) की रोकथाम: अप्रैल-मई में नियमित नमी बनाए रखें। बोरॉन (Borax 20%) 2 ग्राम प्रति लीटर पानी का छिड़काव फल मटर के दाने के बराबर होने पर करें।
• फल छेदक कीट (Fruit Borer) रोकथाम: फल पकने से 20 दिन पूर्व तक नीम आधारित कीटनाशक या स्पिनोसैड (Spinosad 45% SC) 0.5 मिली/लीटर का छिड़काव।`,
    verified_source: 'राष्ट्रीय लीची अनुसंधान केंद्र (NRC on Litchi), मुशहरी, मुजफ्फरपुर'
  },
  {
    topic: 'bihar_soil_fertilizer',
    title_hi: 'बिहार की मृदा एवं संतुलित उर्वरक प्रबंधन',
    districts: ['ALL'],
    crops: ['ALL'],
    keywords: ['मिट्टी', 'soil', 'गोबर खाद', 'कम्पोस्ट', 'जिंक', 'बोरॉन', 'मृदा स्वास्थ्य कार्ड'],
    content_hi: `• बिहार के गंगा के मैदानी भाग में जलोढ़ (Alluvial) मिट्टी है। उत्तरी बिहार में चूने की अधिकता तथा दक्षिणी बिहार में हल्की अम्लीय से उदासीन मिट्टी है।
• जिंक की सामान्य कमी: बिहार की 45% मिट्टियों में जिंक की कमी पाई जाती है। प्रति एकड़ 10 किग्रा जिंक सल्फेट डालने से 15-20% उपज वृद्धि होती है।
• सॉइल हेल्थ कार्ड: नजदीकी प्रखंड कृषि कार्यालय या किसान विज्ञान केंद्र (KVK) से निःशुल्क मिट्टी जांच कराएं।`,
    verified_source: 'कृषि रसायन एवं मृदा विज्ञान विभाग, बिहार कृषि विश्वविद्यालय, सबौर'
  }
];

// ── Verified disease entries (from detections/disease.knowledge.js) ──
const DISEASE_AGRI_ENTRIES = DISEASE_KNOWLEDGE.map(d => ({
  topic: 'disease_' + d.id,
  title_hi: d.name_hi,
  districts: ['ALL'],
  crops: [d.crop],
  keywords: [...d.aliases, d.name_en, d.name_hi],
  content_hi: 'लक्षण: ' + d.symptoms_hi + '\n\nजैविक उपचार: ' + d.organic_hi + '\n\nरासायनिक उपचार (सावधानी से, लेबल दर जांचें): ' + d.chemical_hi + '\n\nरोकथाम: ' + d.prevention_hi,
  verified_source: d.source
}));

const VERIFIED_AGRI_KNOWLEDGE = [...BASE_AGRI_KNOWLEDGE, ...DISEASE_AGRI_ENTRIES];

module.exports = {
  VERIFIED_AGRI_KNOWLEDGE,
  DISEASE_AGRI_ENTRIES
};
