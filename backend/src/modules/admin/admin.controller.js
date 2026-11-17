// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Admin & Department Official Controller
// ═══════════════════════════════════════════════════════════════════

const { supabase, isConfigured } = require('../../config/supabase');
const schemeRepo = require('../schemes/schemes.repository');
const farmerRepo = require('../farmers/farmers.repository');
const { sendSuccess, sendCreated, errors } = require('../../utils/response');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { z } = require('zod');

// In-memory store for advisories if Supabase not configured
const advisoriesMemoryStore = [];

// GET /api/v1/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const schemes = await schemeRepo.getAllSchemes();

  // District distribution
  const districtDistribution = {
    'Darbhanga': 1420,
    'Patna': 1850,
    'Muzaffarpur': 1210,
    'Rohtas': 980,
    'Purnia': 840,
    'Nalanda': 920,
    'Gaya': 760,
    'Bhagalpur': 810,
    'Samastipur': 1100
  };

  return sendSuccess(res, {
    total_farmers_registered: 18450,
    verified_schemes_active: schemes.length,
    disease_scans_today: 142,
    pending_expert_verifications: 18,
    district_distribution: districtDistribution,
    active_crop_clusters: {
      'Makhana': 'Mithila / Kosi Basin',
      'Shahi Litchi': 'Muzaffarpur & Vaishali',
      'Dhan (Rice Bowl)': 'Rohtas, Bhojpur, Kaimur',
      'Rabi Makka': 'Khagaria, Begusarai, Purnia'
    }
  }, 'प्रशासनिक सांख्यिकी (Admin statistics)');
});

const advisoryInputSchema = z.object({
  title: z.string().min(5, 'शीर्षक कम से कम 5 अक्षर होना चाहिए'),
  content: z.string().min(10, 'सामग्री आवश्यक है'),
  category: z.enum(['weather_warning', 'pest_alert', 'subsidy_announcement', 'sowing_guidance', 'mandi_notice']),
  target_districts: z.array(z.string()).default(['ALL']),
  target_crops: z.array(z.string()).default(['ALL']),
  severity: z.enum(['info', 'normal', 'urgent', 'emergency']).default('normal')
});

// POST /api/v1/admin/advisories
const publishAdvisory = asyncHandler(async (req, res) => {
  const data = advisoryInputSchema.parse(req.body);

  const advisory = {
    id: 'adv_' + Date.now(),
    ...data,
    department_issuer: 'कृषि विभाग / आत्मा (ATMA), बिहार',
    created_by: req.user ? req.user.id : 'department_admin',
    created_at: new Date().toISOString()
  };

  advisoriesMemoryStore.unshift(advisory);

  if (isConfigured) {
    try {
      await supabase.from('agricultural_advisories').insert(advisory);
    } catch (e) {
      // Log
    }
  }

  return sendCreated(res, { advisory }, 'कृषि परामर्श बुलेटिन सफलतापूर्वक जारी किया गया');
});

// GET /api/v1/admin/advisories
const getAdvisories = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    advisories: advisoriesMemoryStore,
    total: advisoriesMemoryStore.length
  }, 'कृषि परामर्श सूची');
});

// PUT /api/v1/admin/schemes/:schemeId/verify
const verifyScheme = asyncHandler(async (req, res) => {
  const { schemeId } = req.params;
  const { notification_ref, notes } = req.body;

  const scheme = await schemeRepo.getSchemeById(schemeId);
  if (!scheme) {
    throw new AppError('योजना नहीं मिली', 404, 'SCHEME_NOT_FOUND');
  }

  scheme.verification_status = 'verified';
  scheme.last_verified_at = new Date().toISOString();
  if (notification_ref) scheme.notification_ref = notification_ref;

  return sendSuccess(res, {
    scheme_id: schemeId,
    verification_status: 'verified',
    last_verified_at: scheme.last_verified_at,
    notification_ref: scheme.notification_ref
  }, 'योजना आधिकारिक रूप से सत्यापित की गई');
});

module.exports = {
  getDashboardStats,
  publishAdvisory,
  getAdvisories,
  verifyScheme
};
