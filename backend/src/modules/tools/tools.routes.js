// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Tool & Farm Equipment Sharing Marketplace
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { sendSuccess, sendCreated, errors } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { z } = require('zod');

const toolListings = [
  { id: 1, tool_name: 'Mahindra 575 DI Tractor (45 HP)', tool_type: 'Tractor', price_per_hour: 450, location: 'बिहटा, पटना (Bihta, Patna)', state: 'Bihar', available_from: '06:00', available_to: '19:00', status: 'available', notes: 'चालक सहित। कल्टीवेटर संलग्न।' },
  { id: 2, tool_name: 'Mini Paddy Combine Harvester', tool_type: 'Harvester', price_per_hour: 850, location: 'बिक्रमगंज, रोहतास (Bikramganj, Rohtas)', state: 'Bihar', available_from: '07:00', available_to: '18:00', status: 'available', notes: 'धान कटाई हेतु उपयुक्त।' },
  { id: 3, tool_name: 'Multi-crop Seed Cum Fertilizer Drill', tool_type: 'Seeder', price_per_hour: 250, location: 'बहेरी, दरभंगा (Baheri, Darbhanga)', state: 'Bihar', available_from: '06:00', available_to: '18:00', status: 'available', notes: 'मक्का एवं गेहूं की सटीक बुवाई हेतु।' },
  { id: 4, tool_name: 'Battery Power Sprayer 16L', tool_type: 'Sprayer', price_per_hour: 80, location: 'मुशहरी, मुजफ्फरपुर (Mushahari, Muzaffarpur)', state: 'Bihar', available_from: '08:00', available_to: '17:00', status: 'available', notes: 'लीची व सब्जियों पर छिड़काव हेतु।' }
];

// GET /api/v1/tools
router.get('/tools', (req, res) => {
  return sendSuccess(res, toolListings, 'कृषि उपकरण सूची');
});

const createToolSchema = z.object({
  tool_name: z.string().min(3),
  tool_type: z.string().min(2),
  description: z.string().optional(),
  daily_rate: z.number().positive(),
  location: z.string().min(3),
  district: z.string().optional()
});

// POST /api/v1/tools
router.post('/tools', authenticate, (req, res) => {
  const data = createToolSchema.parse(req.body);
  const newTool = {
    id: toolListings.length + 1,
    ...data,
    owner_id: req.user.id,
    owner_name: req.user.name,
    status: 'available',
    created_at: new Date().toISOString()
  };
  toolListings.unshift(newTool);
  return sendCreated(res, newTool, 'उपकरण सफलतापूर्वक सूचीबद्ध किया गया');
});

module.exports = router;
