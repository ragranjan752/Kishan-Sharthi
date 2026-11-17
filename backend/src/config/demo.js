// ═══════════════════════════════════════════════
//  Krishi Sarthi — Demo Mode Configuration
//  Development-only demo authentication helpers.
// ═══════════════════════════════════════════════

const jwt = require('jsonwebtoken');

const DEMO_FARMER_ID = 'demo-farmer-001';
const DEMO_TOKEN_TTL = process.env.DEMO_TOKEN_TTL || '12h';

function isDemoModeEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.DEMO_MODE === 'true';
}

function demoProfile() {
  return {
    id: DEMO_FARMER_ID,
    uid: DEMO_FARMER_ID,
    name: 'Rajesh Kumar',
    email: 'demo@krishisarthi.local',
    phone: '9999999999',
    district: 'Darbhanga',
    block: 'Baheri',
    village: 'Demo Village',
    land_size_kattha: 50,
    primary_crop: 'Makhana',
    role: 'farmer',
    farmer_category: 'small',
    is_active: true,
    profile_completed: true,
    isDemo: true,
  };
}

function isDemoTokenPayload(decoded) {
  return !!decoded && decoded.demo === true && decoded.id === DEMO_FARMER_ID && decoded.role === 'farmer';
}

function issueDemoToken() {
  return jwt.sign(
    {
      id: DEMO_FARMER_ID,
      demo: true,
      district: 'Darbhanga',
      role: 'farmer',
    },
    process.env.JWT_SECRET,
    { expiresIn: DEMO_TOKEN_TTL }
  );
}

module.exports = { DEMO_FARMER_ID, isDemoModeEnabled, demoProfile, isDemoTokenPayload, issueDemoToken };
