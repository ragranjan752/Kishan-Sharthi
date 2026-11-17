// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Scheme Validators (Zod)
// ═══════════════════════════════════════════════════════════════════

const { z } = require('zod');
const { BIHAR_DISTRICTS } = require('../farmers/farmers.validator');

const schemeQuerySchema = z.object({
  district: z.string().optional(),
  crop: z.string().optional(),
  category: z.enum(['marginal', 'small', 'medium', 'large']).optional(),
  scheme_type: z.enum(['central', 'state', 'district', 'joint']).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

const checkEligibilitySchema = z.object({
  district: z.string().refine((d) => BIHAR_DISTRICTS.includes(d), {
    message: 'District must be one of Bihar 38 official districts'
  }),
  block: z.string().optional(),
  land_size_kattha: z.number().positive(),
  primary_crop: z.string(),
  farmer_category: z.enum(['marginal', 'small', 'medium', 'large']).optional().default('small'),
  annual_income: z.number().optional()
});

module.exports = {
  schemeQuerySchema,
  checkEligibilitySchema
};
