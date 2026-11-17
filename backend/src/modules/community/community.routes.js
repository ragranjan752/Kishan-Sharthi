// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Community Q&A Forum
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { sendSuccess, sendCreated } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { z } = require('zod');

const communityPosts = [
  {
    id: 1,
    title: 'दरभंगा में मखाना की नई नर्सरी में पत्ती सड़न की रोकथाम?',
    description: 'मखाना नर्सरी में कोमल पत्तियों पर काले धब्बे दिख रहे हैं। क्या कोई भाई जैविक उपचार बता सकता है?',
    category: 'Makhana',
    crop: 'Makhana',
    likes: 12,
    reply_count: 4,
    is_solved: 1,
    author_name: 'राम कुमार',
    district: 'Darbhanga',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    title: 'रोहतास में धान की सीधी बुवाई (DSR) का अनुभव कैसा रहा?',
    description: 'डीएसआर विधि से पानी और मजदूरी की कितनी बचत हुई? खरपतवार नियंत्रण हेतु किस दवा का उपयोग किया?',
    category: 'Technique',
    crop: 'Dhan',
    likes: 18,
    reply_count: 6,
    is_solved: 0,
    author_name: 'उमेश सिंह',
    district: 'Rohtas',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

// GET /api/v1/community/posts
router.get('/community/posts', (req, res) => {
  return sendSuccess(res, communityPosts, 'समुदाय चर्चाएं प्राप्त');
});

const postSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  category: z.string().default('General'),
  crop: z.string().optional()
});

// POST /api/v1/community/posts
router.post('/community/posts', authenticate, (req, res) => {
  const data = postSchema.parse(req.body);
  const newPost = {
    id: communityPosts.length + 1,
    ...data,
    author_id: req.user.id,
    author_name: req.user.name,
    district: req.user.district,
    likes: 0,
    reply_count: 0,
    is_solved: 0,
    created_at: new Date().toISOString()
  };
  communityPosts.unshift(newPost);
  return sendCreated(res, newPost, 'चर्चा सफलतापूर्वक पोस्ट की गई');
});

module.exports = router;
