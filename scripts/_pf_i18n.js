const fs = require('fs');
const f = 'frontend/app.js';
let s = fs.readFileSync(f, 'utf8');

const adds = {
  en: "pf_name:'Full Name',pf_email:'Email (read-only)',pf_save:'Save Profile',pf_title:'Edit Profile'",
  hi: "pf_name:'पूरा नाम',pf_email:'Email (केवल पढ़ने के लिए)',pf_save:'प्रोफ़ाइल सेव करें',pf_title:'प्रोफ़ाइल संपादित करें'",
  pa: "pf_name:'ਪੂਰਾ ਨਾਮ',pf_email:'Email (ਸਿਰਫ ਪੜ੍ਹਨ ਲਈ)',pf_save:'ਪ੍ਰੋਫਾਈਲ ਸੇਵ ਕਰੋ',pf_title:'ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ'",
  te: "pf_name:'పూర్తి పేరు',pf_email:'ఇమెయిల్ (చదవడానికి మాత్రమే)',pf_save:'ప్రొఫైల్ సేవ్ చేయండి',pf_title:'ప్రొఫైల్ సవరించండి'",
  mr: "pf_name:'पूर्ण नाव',pf_email:'ईमेल (फक्त वाचनीय)',pf_save:'प्रोफाइल जतन करा',pf_title:'प्रोफाइल संपादित करा'",
  ta: "pf_name:'முழு பெயர்',pf_email:'மின்னஞ்சல் (படிக்க மட்டும்)',pf_save:'சுயவிவரத்தை சேமி',pf_title:'சுயவிவரத்தை திருத்து'"
};

// UI_I18N is one object literal: en:{...},hi:{...},...
// Insert pf keys before the closing brace of each lang object — anchor on "logout:'...'" value per lang.
const logoutVals = {
  en: "logout:'Logout'",
  hi: "logout:'लॉगआउट'",
  pa: "logout:'ਲੌਗਆਉਟ'",
  te: "logout:'లాగ్ అవుట్'",
  mr: "logout:'लॉगआउट'",
  ta: "logout:'வெளியேறு'"
};

for (const [lang, kv] of Object.entries(adds)) {
  const lv = logoutVals[lang];
  const needle = lv + '}';
  const idx = s.indexOf(needle);
  if (idx === -1) { console.log('miss', lang); continue; }
  // only replace first occurrence after UI_I18N start — but logout appears once per lang block
  s = s.slice(0, idx) + lv + ',' + kv + '}' + s.slice(idx + needle.length);
}
fs.writeFileSync(f, s);
console.log('done, pf_name count:', (s.match(/pf_name/g) || []).length);
