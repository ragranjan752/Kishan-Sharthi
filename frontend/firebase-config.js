// ═══════════════════════════════════════════════════════
//  Kisan Sarthi — Firebase Configuration
//  Replace the values below with your Firebase project credentials
//  from https://console.firebase.google.com
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyDI2TxG3LIeNYK9uZBOR_MY3J3wJmoV4I8",
  authDomain: "krishi-sarthi-da1fd.firebaseapp.com",
  projectId: "krishi-sarthi-da1fd",
  storageBucket: "krishi-sarthi-da1fd.firebasestorage.app",
  messagingSenderId: "453713457140",
  appId: "1:453713457140:web:6e8b84bc3cb98fe473d3a1",
  measurementId: "G-HYBPE1SVYV"
};

// ── Initialize Firebase ──
firebase.initializeApp(firebaseConfig);

// ── Firebase Service References ──
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();
const fbStorage = firebase.storage();

// ── Check if Firebase is properly configured ──
const FIREBASE_CONFIGURED = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// ── Settings ──
if (FIREBASE_CONFIGURED) {
  fbAuth.useDeviceLanguage();
  // Enable Firestore offline persistence  
  fbDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn('Firestore persistence error:', err.code);
  });
  
  // Check if Google Auth is enabled
  fbAuth.getRedirectResult().then((result) => {
    if (result.user) {
      console.log('User already signed in:', result.user.email);
    }
  }).catch((error) => {
    console.log('Auth check error:', error.code, error.message);
  });
  
}

console.log(FIREBASE_CONFIGURED
  ? '✅ Firebase initialized — connected to cloud'
  : '⚠️ Firebase not configured — running in demo mode. Update firebase-config.js with your credentials.'
);

/*
 ╔═══════════════════════════════════════════════════════╗
 ║  SETUP INSTRUCTIONS                                  ║
 ║                                                      ║
 ║  1. Go to https://console.firebase.google.com        ║
 ║  2. Create a new project (or use existing)           ║
 ║  3. Enable Authentication → Phone provider           ║
 ║  4. Create Firestore Database (start in test mode)   ║
 ║  5. Create Storage bucket                            ║
 ║  6. Go to Project Settings → General → Your apps     ║
 ║  7. Add a Web App → Copy the config object           ║
 ║  8. Paste the values above                           ║
 ║                                                      ║
 ║  For demo/testing, add test phone numbers:           ║
 ║  Auth → Phone → Phone numbers for testing            ║
 ║  Add: +919876543210 with code 123456                 ║
 ║                                                      ║
 ║  Then run: node seed-firestore.js                    ║
 ║  to populate Firestore with demo data                ║
 ╚═══════════════════════════════════════════════════════╝
*/
