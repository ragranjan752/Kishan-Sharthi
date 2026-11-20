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
    category: 'Disease',
    crop: 'Makhana',
    likes: 12,
    reply_count: 4,
    is_solved: 1,
    author_name: 'राम कुमार (दरभंगा)',
    user_name: 'राम कुमार (दरभंगा)',
    district: 'Darbhanga',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    title: 'रोहतास में धान की सीधी बुवाई (DSR) का अनुभव कैसा रहा?',
    description: 'डीएसआर विधि से पानी और मजदूरी की कितनी बचत हुई? खरपतवार नियंत्रण हेतु किस दवा का उपयोग किया?',
    category: 'General',
    crop: 'Dhan',
    likes: 18,
    reply_count: 6,
    is_solved: 0,
    author_name: 'उमेश सिंह (रोहतास)',
    user_name: 'उमेश सिंह (रोहतास)',
    district: 'Rohtas',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 3,
    title: 'समस्तीपुर में सरसों में माहू (Aphid) कीट का तुरंत इलाज?',
    description: 'सरसों के पौधों पर काले चिपचिपे कीड़े लग रहे हैं। नीम तेल 5ml/लीटर का छिड़काव किया है पर ज्यादा असर नहीं हुआ। क्या उपचार करें?',
    category: 'Pest Control',
    crop: 'Sarson',
    likes: 9,
    reply_count: 3,
    is_solved: 1,
    author_name: 'सुरेश यादव (समस्तीपुर)',
    user_name: 'सुरेश यादव (समस्तीपुर)',
    district: 'Samastipur',
    created_at: new Date(Date.now() - 250000000).toISOString()
  },
  {
    id: 4,
    title: 'खगड़िया में मक्का में फॉल आर्मीवर्म का प्रकोप',
    description: 'मक्का के पत्तों में गोल छेद दिख रहे हैं। जैविक और रासायनिक दोनों विकल्प बताएं।',
    category: 'Disease',
    crop: 'Makka',
    likes: 14,
    reply_count: 5,
    is_solved: 0,
    author_name: 'दीपक कुमार (खगड़िया)',
    user_name: 'दीपक कुमार (खगड़िया)',
    district: 'Khagaria',
    created_at: new Date(Date.now() - 320000000).toISOString()
  },
  {
    id: 5,
    title: 'बिहार डीजल अनुदान योजना का आवेदन कैसे करें?',
    description: 'डीजल अनुदान के लिए पेट्रोल पंप रसीद पर 10 अंकों का किसान पंजीकरण नंबर लिखना अनिवार्य है क्या? फॉर्म कब तक भरा जाएगा?',
    category: 'Scheme',
    crop: 'All',
    likes: 22,
    reply_count: 7,
    is_solved: 1,
    author_name: 'विकास चौधरी (पटना)',
    user_name: 'विकास चौधरी (पटना)',
    district: 'Patna',
    created_at: new Date(Date.now() - 400000000).toISOString()
  }
];

// In-memory replies + stats (demo store, same pattern as posts)
const communityReplies = new Map();
communityReplies.set(1, [
  { id: 1, post_id: 1, user_name: 'कृषि विज्ञान केंद्र साथी', content: 'कोमल पत्ती के धब्बों के लिए कॉपर ऑक्सीक्लोराइड 2g/लीटर या स्यूडोमोनास फ्लोरेसेंस 5g/लीटर का छिड़काव करें। साथ में खेत में जल निकासी दुरुस्त रखें।', is_solution: true, created_at: new Date(Date.now() - 43200000).toISOString() }
]);
communityReplies.set(3, [
  { id: 2, post_id: 3, user_name: 'डॉ. प्रमोद कुमार (कीट विशेषज्ञ)', content: 'माहू के प्रारंभिक प्रकोप में 5% नीम अर्क या इमिडाक्लोप्रिड 17.8% SL का 1ml प्रति 3 लीटर पानी में मिलाकर शाम के समय छिड़काव करें।', is_solution: true, created_at: new Date(Date.now() - 150000000).toISOString() }
]);
communityReplies.set(5, [
  { id: 3, post_id: 5, user_name: 'कृषि समन्वयक', content: 'हाँ, पेट्रोल पंप रसीद पर 10 अंकों का किसान रजिस्ट्रेशन नंबर और डीजल का बिल नंबर होना आवश्यक है। dbtagriculture.bihar.gov.in पर ऑनलाइन आवेदन करें।', is_solution: true, created_at: new Date(Date.now() - 200000000).toISOString() }
]);
let replyIdSeq = 100;
let postIdSeq = communityPosts.length;

function findPost(id) {
  return communityPosts.find(p => Number(p.id) === Number(id));
}

// GET /api/v1/community/posts
router.get('/community/posts', (req, res) => {
  return res.json({
    success: true,
    data: communityPosts,
    posts: communityPosts,
    total: communityPosts.length,
    message: 'समुदाय चर्चाएं प्राप्त'
  });
});

// GET /api/v1/community/stats
router.get('/community/stats', (req, res) => {
  const totalReplies = [...communityReplies.values()].reduce((a, r) => a + r.length, 0);
  const solved = communityPosts.filter(p => p.is_solved).length;
  return res.json({
    success: true,
    data: {
      total_posts: communityPosts.length,
      total_replies: totalReplies,
      solved_posts: solved,
      totalPosts: communityPosts.length,
      totalReplies,
      solvedPosts: solved
    },
    total_posts: communityPosts.length,
    total_replies: totalReplies,
    solved_posts: solved,
    message: 'समुदाय आंकड़े'
  });
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
    id: ++postIdSeq,
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
  communityReplies.set(newPost.id, []);
  return sendCreated(res, newPost, 'चर्चा सफलतापूर्वक पोस्ट की गई');
});

// GET /api/v1/community/posts/:id — post + replies
router.get('/community/posts/:id', optionalAuth, (req, res) => {
  const post = findPost(req.params.id);
  if (!post) return sendSuccess(res, { post: null, replies: [] }, 'Post not found');
  return sendSuccess(res, { post, replies: communityReplies.get(post.id) || [] }, 'Post detail');
});

// POST /api/v1/community/posts/:id/like
router.post('/community/posts/:id/like', optionalAuth, (req, res) => {
  const post = findPost(req.params.id);
  if (!post) return sendSuccess(res, { error: 'Post not found' }, 'Not found');
  post.likes = (post.likes || 0) + 1;
  return sendSuccess(res, { likes: post.likes }, 'Liked');
});

const replySchema = z.object({
  content: z.string().min(2).max(2000),
  is_solution: z.boolean().optional()
});

// POST /api/v1/community/posts/:id/reply
router.post('/community/posts/:id/reply', authenticate, (req, res) => {
  const post = findPost(req.params.id);
  if (!post) return sendSuccess(res, { error: 'Post not found' }, 'Not found');
  const data = replySchema.parse(req.body);
  const replies = communityReplies.get(post.id) || [];
  const reply = {
    id: ++replyIdSeq,
    post_id: post.id,
    user_id: req.user.id,
    user_name: req.user.name || 'Farmer',
    content: data.content,
    is_solution: data.is_solution ? 1 : 0,
    created_at: new Date().toISOString()
  };
  replies.push(reply);
  communityReplies.set(post.id, replies);
  post.reply_count = replies.length;
  if (data.is_solution) post.is_solved = 1;
  return sendCreated(res, reply, 'Reply posted');
});

module.exports = router;
