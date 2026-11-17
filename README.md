# कृषि सारथी - बिहार एडिशन
# Krishi Sarthi - Bihar Edition

एक किसान-केंद्रित कृषि सहायता प्लेटफॉर्म जो बिहार के किसानों को आधुनिक तकनीक और सरकारी योजनाओं से जोड़ता है।

## 🗂️ Project Structure (Restructured)

- `frontend/` — vanilla HTML/CSS/JS UI served by Express (`index.html`, `app.js`, `styles.css`, Firebase/Supabase client adapters).
- `backend/src/` — Express app, middleware, modules, config, utils.
- `backend/config/` — shared Firebase/Supabase clients.
- `backend/tests/` — Jest tests.
- `backend/uploads/` — local disease-image uploads.
- `supabase/migrations/` — SQL migrations.
- `docs/` — architecture/deployment docs.

Run from repo root: `npm install`, `npm run dev`, `npm start`, `npm test -- --runInBand`.

## 🏗️ तकनीकी ढांचा (Tech Stack)

- **डेटाबेस**: Supabase (PostgreSQL)
- **इमेज स्टोरेज**: Firebase Storage
- **बैकएंड**: Node.js + Express.js
- **AI असिस्टेंट**: LLM Integration (OpenAI/Gemini/Claude)

## 📊 डेटाबेस स्कीमा

### किसान प्रोफ़ाइल (Farmers Table)
```sql
- id (UUID, Primary Key)
- name (VARCHAR, किसान का नाम)
- phone (VARCHAR, यूनीक फोन नंबर)
- district (VARCHAR, जिला)
- block (VARCHAR, ब्लॉक)
- land_size_kattha (DECIMAL, जमीन का आकार कट्ठा में)
- land_size_bigha (GENERATED, कट्ठा को बीघा में कनवर्ट)
- primary_crop (ENUM: Makhana/Dhan/Makka)
```

### योजनाएं (Schemes Table)
```sql
- id (UUID, Primary Key)
- name (VARCHAR, योजना का नाम)
- description (TEXT, योजना विवरण)
- eligible_districts (TEXT[], पात्र जिले)
- min_land_size_kattha (DECIMAL, न्यूनतम जमीन)
- max_land_size_kattha (DECIMAL, अधिकतम जमीन)
- primary_crop_filter (VARCHAR, फसल फिल्टर)
- benefit_amount (DECIMAL, लाभ राशि)
```

### रोग पहचान (Detections Table)
```sql
- id (UUID, Primary Key)
- farmer_id (UUID, Foreign Key)
- image_url (TEXT, Firebase Storage URL)
- disease_name (VARCHAR, रोग का नाम)
- confidence_score (DECIMAL, AI कॉन्फिडेंस)
- ai_analysis (TEXT, AI विश्लेषण)
- status (ENUM: pending/processing/completed/failed)
```

## 🚀 API एंडपॉइंट्स

### किसान प्रोफ़ाइल
- `POST /api/farmers` - किसान प्रोफ़ाइल बनाएं
- `GET /api/farmers/:farmerId` - किसान प्रोफ़ाइल प्राप्त करें
- `PUT /api/farmers/:farmerId` - किसान प्रोफ़ाइल अपडेट करें
- `GET /api/farmers/phone/:phone` - फोन से किसान खोजें

### बिहार योजना इंजन
- `GET /api/schemes/farmer/:farmerId` - किसान के लिए पात्र योजनाएं
- `GET /api/schemes` - सभी योजनाएं (फिल्टर के साथ)
- `GET /api/schemes/stats/district/:district` - जिला-वार योजना आँकड़े

### रोग पहचान
- `POST /api/detections/upload` - इमेज अपलोड करें (multipart/form-data)
- `GET /api/detections/:detectionId` - पहचान परिणाम प्राप्त करें
- `GET /api/detections/farmer/:farmerId` - किसान की सभी पहचानें
- `PUT /api/detections/:detectionId/analysis` - AI विश्लेषण अपडेट करें

### AI सारथी चैट
- `POST /api/sarthi/chat` - AI सारथी से चैट करें
- `GET /api/sarthi/chat/history/:farmerId` - चैट इतिहास प्राप्त करें
- `GET /api/sarthi/sessions/:farmerId` - किसान के सत्र प्राप्त करें

## 🔧 सेटअप इंस्ट्रक्शन्स

### 1. रिपॉजिटरी क्लोन करें
```bash
git clone <repository-url>
cd krishi-sarthi-bihar
```

### 2. डिपेंडेंसीज इंस्टॉल करें
```bash
npm install
```

### 3. एनवायरनमेंट वेरिएबल्स सेट करें
Create `.env` in the repo root with the required variables (placeholders only):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- `JWT_SECRET`
- AI सर्विस API कीज़ (OpenAI/Gemini/Claude)

### 4. डेटाबेस सेटअप
Supabase डैशबोर्ड में `backend/database/schema.sql` और `supabase/migrations/*.sql` फाइलें क्रम से रन करें।

### 5. सर्वर चलाएं
```bash
# डेवलपमेंट मोड
npm run dev

# प्रोडक्शन मोड
npm start
```

## 🌟 विशेषताएं

### 1. बिहार-विशिष्ट जानकारी
- सभी 38 जिलों की कृषि जानकारी
- कट्ठा/बीघा इकाइयों में जमीन माप
- स्थानीय फसलें: मखाना, धान, मक्का

### 2. स्मार्ट योजना इंजन
- जिला और जमीन के आकार के आधार पर योजनाएं
- दरभंगा मखाना सब्सिडी
- पटना डीजल अनुदान

### 3. AI सारथी
- हिंदी/हिंग्लिश में बातचीत
- किसान की प्रोफ़ाइल के अनुसार सलाह
- बिहार कृषि विशेषज्ञ सिस्टम प्रॉम्प्ट

### 4. रोग पहचान
- Firebase Storage में इमेज अपलोड
- AI-आधारित रोग पहचान
- किसान-विशिष्ट इतिहास

## 📝 API उदाहरण

### किसान प्रोफ़ाइल बनाना
```json
POST /api/farmers
{
  "name": "राम किसान",
  "phone": "9876543210",
  "district": "दरभंगा",
  "block": "बहेरी",
  "land_size_kattha": 50,
  "primary_crop": "Makhana"
}
```

### AI सारथी से चैट
```json
POST /api/sarthi/chat
{
  "farmerId": "uuid-here",
  "message": "मेरे मखाने की फसल में कीड़ा लग गया है, क्या करूं?",
  "sessionId": "session-uuid"
}
```

### इमेज अपलोड करना
```bash
curl -X POST \
  http://localhost:3001/api/detections/upload \
  -F 'image=@crop_disease.jpg' \
  -F 'farmerId=uuid-here'
```

## 🔒 सिक्योरिटी

- Row Level Security (RLS) पॉलिसीज
- फाइल अपलोड सिक्योरिटी
- Rate Limiting
- CORS कॉन्फिगरेशन
- हेलमेट सिक्योरिटी हेडर्स

## 📈 परफॉर्मेंस

- डेटाबेस इंडेक्सिंग
- कंप्रेशन मिडलवेयर
- Firebase CDN से इमेज सर्विंग
- कैशिंग स्ट्रैटेजी

## 🤝 योगदान

1. इश्यू बनाएं
2. फीचर ब्रांच बनाएं
3. पुल रिक्वेस्ट सबमिट करें
4. कोड रिव्यू करें

## 📄 लाइसेंस

MIT License - [LICENSE](LICENSE) फाइल देखें


---

**कृषि सारथी - बिहार के किसानों का सच्चा साथी** 🌾
