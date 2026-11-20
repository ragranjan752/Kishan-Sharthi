// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Validators (Zod)
//  Phase 4: Input validation for all farmer endpoints.
// ═══════════════════════════════════════════════════════

const { z } = require('zod');

// ── Bihar districts (official list from Bihar government) ──
const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
  'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
  'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
  'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
  'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
  'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
  'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
  'Supaul', 'Vaishali', 'West Champaran',
];

// ── Valid crop types ──
const VALID_CROPS = ['Makhana', 'Dhan', 'Makka', 'Gehun', 'Sarson', 'Sabzi', 'Aloo', 'Tamatar', 'Kapas', 'Ganna', 'Chana', 'Arhar', 'Moong', 'Moongfali', 'Soyabean', 'Jowar', 'Bajra', 'Jau', 'Kela', 'Santra', 'Papita', 'Baingan', 'Bhindi', 'Kheera', 'Anya'];

// ── Farmer categories per Bihar agricultural records ──
const FARMER_CATEGORIES = ['marginal', 'small', 'medium', 'large'];

// ── Reusable base schemas ──
const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number starting with 6-9')
  .optional()
  .nullable();

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt limit
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const katthaSchema = z
  .number({ invalid_type_error: 'Land size must be a number' })
  .positive('Land size must be positive')
  .max(10000, 'Land size seems too large — please verify');

// ════════════════════════════════════
//  REGISTER
// ════════════════════════════════════
const geoCodeSchema = z
  .number({ invalid_type_error: 'Invalid geography code' })
  .int('Geography code must be an integer')
  .positive('Geography code must be positive')
  .optional()
  .nullable();

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[\u0900-\u097FA-Za-z\s\-'.]+$/, 'Name contains invalid characters'),

  phone: phoneSchema,

  email: emailSchema,

  password: passwordSchema,

  // -- Pan-India location (LGD codes -- preferred path) --
  state: z.string().max(150).optional().nullable(),
  state_code: geoCodeSchema,
  district_code: geoCodeSchema,
  subdistrict_code: geoCodeSchema,
  village_code: geoCodeSchema,

  // -- Location names (resolved server-side from codes, or manual entry) --
  district: z.string().max(150).optional().nullable(),
  block: z.string().max(150).optional().nullable(),
  village: z.string().max(200).optional().nullable(),

  // -- Agricultural profile (optional at signup; collected via complete-profile) --
  land_size_kattha: katthaSchema.optional().nullable(),

  primary_crop: z.enum(VALID_CROPS, {
    errorMap: () => ({ message: `Crop must be one of: ${VALID_CROPS.join(', ')}` }),
  }).optional().nullable(),

  farmer_category: z
    .enum(FARMER_CATEGORIES, {
      errorMap: () => ({ message: `Category must be: ${FARMER_CATEGORIES.join(', ')}` }),
    })
    .optional()
    .default('small'),
});

// ════════════════════════════════════

//  LOGIN
// ════════════════════════════════════
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// ════════════════════════════════════
//  FORGOT PASSWORD
// ════════════════════════════════════
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// ════════════════════════════════════
//  RESET PASSWORD
// ════════════════════════════════════
const resetPasswordSchema = z.object({
  email: emailSchema,
  reset_code: z
    .string()
    .length(6, 'Reset code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Reset code must contain only digits'),
  new_password: passwordSchema,
});

// ════════════════════════════════════
//  COMPLETE PROFILE
// ════════════════════════════════════
const completeProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[\u0900-\u097FA-Za-z\s\-'.]+$/, 'Name contains invalid characters'),

  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),

  // -- Pan-India geography (LGD codes preferred; names required) --
  state: z.string().max(150).optional().nullable(),
  state_code: geoCodeSchema,
  district_code: geoCodeSchema,
  subdistrict_code: geoCodeSchema,

  district: z
    .string()
    .min(2, 'District is required')
    .max(150, 'District name too long'),

  block: z
    .string()
    .min(2, 'Sub-district / block is required')
    .max(150, 'Sub-district name too long'),

  land_size_kattha: katthaSchema,

  primary_crop: z.enum(VALID_CROPS, {
    errorMap: () => ({ message: `Crop must be one of: ${VALID_CROPS.join(', ')}` }),
  }),
});

// ════════════════════════════════════
//  UPDATE PROFILE
// ════════════════════════════════════
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[\u0900-\u097FA-Za-z\s\-'.]+$/)
    .optional(),

  phone: phoneSchema,

  block: z.string().min(2).max(100).optional(),

  land_size_kattha: katthaSchema.optional(),

  primary_crop: z.enum(VALID_CROPS).optional(),

  farmer_category: z.enum(FARMER_CATEGORIES).optional(),

  // Profile photo URL (must come from Firebase/trusted storage)
  profile_image_url: z.string().url('Invalid image URL').optional().nullable(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  updateProfileSchema,
  BIHAR_DISTRICTS,
  VALID_CROPS,
  FARMER_CATEGORIES,
};

