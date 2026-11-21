const fs = require('fs');
const f = 'frontend/app.js';
let s = fs.readFileSync(f, 'utf8');

const T = {
  en: "pf_phone:'Mobile Number',pf_state:'State / UT',pf_district:'District',pf_subdistrict:'Sub-district / Tehsil',pf_village:'Village',pf_land:'Land (Kattha)',pf_crop:'Main Crop',pf_sub:'Update your details — all fields optional'",
  hi: "pf_phone:'मोबाइल नंबर',pf_state:'राज्य / UT',pf_district:'जिला',pf_subdistrict:'उप-जिला / तहसील',pf_village:'गाँव',pf_land:'भूमि (Kattha)',pf_crop:'मुख्य फसल',pf_sub:'अपनी जानकारी अपडेट करें — सभी फ़ील्ड वैकल्पिक हैं'",
  pa: "pf_phone:'ਮੋਬਾਈਲ ਨੰਬਰ',pf_state:'ਰਾਜ / UT',pf_district:'ਜ਼ਿਲ੍ਹਾ',pf_subdistrict:'ਉਪ-ਜ਼ਿਲ੍ਹਾ / ਤਹਿਸੀਲ',pf_village:'ਗਾਂਵ',pf_land:'ਜ਼ਮੀਨ (ਕਤੱਥਾ)',pf_crop:'ਮੁੱਖ ਫਸਲ',pf_sub:'ਆਪਣੀ ਜਾਣਕਾਰੀ ਅੱਪਡੇਟ ਕਰੋ — ਸਾਰੇ ਖੇਤਰ ਵਿਕਲਪਿਕ ਹਨ'",
  te: "pf_phone:'మొబైల్ నంబర్',pf_state:'రాష్ట్రం / UT',pf_district:'జిల్లా',pf_subdistrict:'ఉప-జిల్లా / తాలూకా',pf_village:'గ్రామం',pf_land:'భూమి (కత్తా)',pf_crop:'ప్రధాన పంట',pf_sub:'మీ వివరాలను అప్‌డేట్ చేయండి — అన్ని ఫీల్డ్‌లు ఐచ్ఛికం'",
  mr: "pf_phone:'मोबाइल नंबर',pf_state:'राज्य / UT',pf_district:'जिल्हा',pf_subdistrict:'उप-जिल्हा / तालुका',pf_village:'गाव',pf_land:'जमीन (कत्था)',pf_crop:'मुख्य पीक',pf_sub:'तुमची माहिती अपडेट करा — सर्व फील्ड ऐच्छिक आहेत'",
  ta: "pf_phone:'மொபைல் எண்',pf_state:'மாநிலம் / UT',pf_district:'மாவட்டம்',pf_subdistrict:'துணை மாவட்டம் / வட்டாரம்',pf_village:'கிராமம்',pf_land:'நிலம் (கத்தா)',pf_crop:'முக்கிய பயிர்',pf_sub:'உங்கள் விவரங்களை புதுப்பிக்கவும் — அனைத்து புலங்களும் விருப்பம்'"
};

const anchors = {
  en: "pf_title:'Edit Profile'",
  hi: "pf_title:'प्रोफ़ाइल संपादित करें'",
  pa: "pf_title:'ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ'",
  te: "pf_title:'ప్రొఫైల్ సవరించండి'",
  mr: "pf_title:'प्रोफाइल संपादित करा'",
  ta: "pf_title:'சுயவிவரத்தை திருத்து'"
};

for (const [lang, kv] of Object.entries(T)) {
  const a = anchors[lang];
  const idx = s.indexOf(a);
  if (idx === -1) { console.log('miss', lang); continue; }
  const end = idx + a.length;
  s = s.slice(0, end) + ',' + kv + s.slice(end);
}
fs.writeFileSync(f, s);
console.log('pf_sub count:', (s.match(/pf_sub:/g) || []).length);
