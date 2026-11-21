// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Farmer Community Q&A Forum
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const learning = require('../learning/learning.service');
const router = express.Router();
const { sendSuccess, sendCreated } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { z } = require('zod');

const communityPosts = [];

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
  learning.ingestCandidate({ module: 'community', ref_id: String(newPost.id), raw_text: (newPost.title||'')+' '+(newPost.problem||newPost.description||'')+' '+(newPost.solution||''), extracted: learning.extractHints((newPost.title||'')+' '+(newPost.problem||newPost.description||'')+' '+(newPost.solution||'')) }).catch(()=>{});
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
