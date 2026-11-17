// ═══════════════════════════════════════════════
//  Krishi Sarthi — Centralized Firebase Admin SDK
//  Modular API for firebase-admin v14+.
//  Modules are lazy-loaded only when credentials exist so
//  test/dev environments without Firebase do not load the SDK.
// ═══════════════════════════════════════════════

let bucket = null;
let auth = null;
let isConfigured = false;

try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    const hasValidCreds =
        projectId &&
        projectId !== 'your_firebase_project_id' &&
        clientEmail &&
        !clientEmail.includes('xxxxx') &&
        privateKey &&
        !privateKey.includes('Your_Private_Key_Here');

    if (!hasValidCreds) {
        console.log('⚠️  Firebase not configured — image upload will use local storage');
        console.log('   → Fill FIREBASE_* credentials in .env');
    } else {
        const { initializeApp, cert, getApps } = require('firebase-admin/app');
        const { getAuth } = require('firebase-admin/auth');
        const { getStorage } = require('firebase-admin/storage');

        if (getApps().length === 0) {
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n')
                }),
                storageBucket
            });
            console.log('✅ Firebase Admin SDK initialized');
        } else {
            console.log('✅ Firebase Admin SDK (reused existing)');
        }

        bucket = getStorage().bucket();
        auth = getAuth();
        isConfigured = true;
    }
} catch (error) {
    console.log('❌ Firebase initialization failed:', error.message);
    console.log('   → Image upload will fall back to local ./uploads');
}

module.exports = {
    admin: { auth: () => auth },
    auth,
    bucket,
    isConfigured
};
