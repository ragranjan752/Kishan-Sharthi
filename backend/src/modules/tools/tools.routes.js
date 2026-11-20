// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Tool & Farm Equipment Sharing Marketplace
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { sendSuccess, sendCreated } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { z } = require('zod');

const toolListings = [
  { id: 1, tool_name: 'Mahindra 575 DI Tractor (45 HP)', tool_type: 'Tractor', price_per_hour: 450, location: 'बिहटा, पटना (Bihta, Patna)', state: 'Bihar', available_from: '06:00', available_to: '19:00', status: 'available', notes: 'चालक सहित। कल्टीवेटर संलग्न।', owner_name: 'राम प्रसाद', owner_phone: '9876543210' },
  { id: 2, tool_name: 'Mini Paddy Combine Harvester', tool_type: 'Harvester', price_per_hour: 850, location: 'बिक्रमगंज, रोहतास (Bikramganj, Rohtas)', state: 'Bihar', available_from: '07:00', available_to: '18:00', status: 'available', notes: 'धान कटाई हेतु उपयुक्त।', owner_name: 'उमेश प्रसाद', owner_phone: '9876501234' },
  { id: 3, tool_name: 'Multi-crop Seed Cum Fertilizer Drill', tool_type: 'Seeder', price_per_hour: 250, location: 'बहेरी, दरभंगा (Baheri, Darbhanga)', state: 'Bihar', available_from: '06:00', available_to: '18:00', status: 'available', notes: 'मक्का एवं गेहूं की सटीक बुवाई हेतु।', owner_name: 'सीता देवी', owner_phone: '9876598765' },
  { id: 4, tool_name: 'Battery Power Sprayer 16L', tool_type: 'Sprayer', price_per_hour: 80, location: 'मुशहरी, मुजफ्फरपुर (Mushahari, Muzaffarpur)', state: 'Bihar', available_from: '08:00', available_to: '17:00', status: 'available', notes: 'लीची व सब्जियों पर छिड़काव हेतु।', owner_name: 'अनिल कुमार', owner_phone: '9876512345' }
];

const toolBookings = [];
let listingIdSeq = toolListings.length;
let bookingIdSeq = 0;

const normPhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);

function findListing(id) {
  return toolListings.find(l => Number(l.id) === Number(id));
}

// GET /api/tools/listings?status=&state=
router.get('/tools/listings', optionalAuth, (req, res) => {
  const { status, state } = req.query;
  let list = toolListings;
  if (status) list = list.filter(l => l.status === status);
  if (state && state.trim()) {
    const s = String(state).toLowerCase().trim();
    const matched = list.filter(l => !l.state || String(l.state).toLowerCase().includes(s) || s.includes(String(l.state).toLowerCase()));
    if (matched.length > 0) list = matched;
  }
  return res.json({ success: true, listings: list, data: list });
});

// GET /api/tools/alerts?state= — AI Sarthi nearby-machine alerts
router.get('/tools/alerts', optionalAuth, (req, res) => {
  const state = req.query.state ? String(req.query.state).toLowerCase().trim() : '';
  let pool = toolListings;
  if (state) {
    const matched = toolListings.filter(l => !l.state || String(l.state).toLowerCase().includes(state) || state.includes(String(l.state).toLowerCase()));
    if (matched.length > 0) pool = matched;
  }
  const alerts = pool
    .slice(0, 3)
    .map(l => ({
      tool_name: l.tool_name,
      location: l.location,
      ai_message: `${l.tool_name} उपलब्ध है — ${l.location} में। ₹${l.price_per_hour}/hr। बुकिंग के लिए Request करें।`
    }));
  return res.json({ success: true, alerts, data: alerts });
});

const createToolSchema = z.object({
  owner_name: z.string().min(2),
  owner_phone: z.string().min(10),
  tool_name: z.string().min(3),
  tool_type: z.string().min(2),
  price_per_hour: z.number().positive(),
  location: z.string().min(3),
  state: z.string().optional(),
  available_from: z.string().optional(),
  available_to: z.string().optional(),
  notes: z.string().optional()
});

// POST /api/tools/listings
router.post('/tools/listings', optionalAuth, (req, res) => {
  const data = createToolSchema.parse(req.body);
  const newTool = {
    id: ++listingIdSeq,
    ...data,
    state: data.state || 'Bihar',
    status: 'available',
    created_at: new Date().toISOString()
  };
  toolListings.unshift(newTool);
  return sendCreated(res, newTool, 'उपकरण सफलतापूर्वक सूचीबद्ध किया गया');
});

const requestSchema = z.object({
  requester_name: z.string().min(2),
  requester_phone: z.string().min(10),
  requested_hours: z.number().positive().default(2),
  requested_date: z.string().optional(),
  message: z.string().optional()
});

// POST /api/tools/listings/:id/request — create booking
router.post('/tools/listings/:id/request', optionalAuth, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
  const data = requestSchema.parse(req.body);
  const booking = {
    id: ++bookingIdSeq,
    listing_id: listing.id,
    tool_name: listing.tool_name,
    owner_name: listing.owner_name,
    owner_phone: listing.owner_phone,
    requester_name: data.requester_name,
    requester_phone: normPhone(data.requester_phone) || data.requester_phone,
    requested_hours: data.requested_hours,
    requested_date: data.requested_date || new Date().toISOString().slice(0, 10),
    message: data.message || '',
    status: 'pending',
    created_at: new Date().toISOString()
  };
  toolBookings.push(booking);
  return sendCreated(res, booking, 'Booking request sent');
});

// GET /api/tools/bookings?phone= — incoming (owner) + outgoing (requester)
router.get('/tools/bookings', optionalAuth, (req, res) => {
  const phone = normPhone(req.query.phone);
  if (!phone) return res.json({ success: true, incoming: [], outgoing: [] });
  const incoming = toolBookings.filter(b => normPhone(b.owner_phone) === phone);
  const outgoing = toolBookings.filter(b => normPhone(b.requester_phone) === phone);
  return res.json({ success: true, incoming, outgoing });
});

const respondSchema = z.object({
  action: z.enum(['accept', 'reject']),
  owner_phone: z.string().min(10)
});

// POST /api/tools/bookings/:id/respond
router.post('/tools/bookings/:id/respond', optionalAuth, (req, res) => {
  const booking = toolBookings.find(b => Number(b.id) === Number(req.params.id));
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
  const data = respondSchema.parse(req.body);
  if (normPhone(booking.owner_phone) !== normPhone(data.owner_phone)) {
    return res.status(403).json({ success: false, error: 'Only owner can respond' });
  }
  booking.status = data.action === 'accept' ? 'accepted' : 'rejected';
  booking.responded_at = new Date().toISOString();
  return sendSuccess(res, booking, 'Request updated');
});

const statusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'])
});

// POST /api/tools/bookings/:id/status
router.post('/tools/bookings/:id/status', optionalAuth, (req, res) => {
  const booking = toolBookings.find(b => Number(b.id) === Number(req.params.id));
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
  const data = statusSchema.parse(req.body);
  booking.status = data.status;
  return sendSuccess(res, booking, 'Status updated');
});

module.exports = router;
