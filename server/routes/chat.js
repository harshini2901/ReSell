const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Listing = require('../models/Listing');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ── GET /api/chat ────────────────────────────────────────────────────────────
// Protected — fetches all conversations for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'name email')
      .populate('listingId', 'title images price')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

// ── GET /api/chat/:id ────────────────────────────────────────────────────────
// Protected — fetches messages for a specific conversation
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // Verify user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    res.json({ messages, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// ── POST /api/chat ───────────────────────────────────────────────────────────
// Protected — start a new conversation or get existing one for a listing
router.post('/', protect, async (req, res) => {
  try {
    const { listingId } = req.body;
    const buyerId = req.user._id;

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    
    const sellerId = listing.sellerId;

    if (buyerId.toString() === sellerId.toString()) {
      return res.status(400).json({ message: 'You cannot chat with yourself about your own listing' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      listingId,
      participants: { $all: [buyerId, sellerId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        listingId,
        participants: [buyerId, sellerId]
      });
    }

    res.json({ conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error starting conversation' });
  }
});

// ── POST /api/chat/image ─────────────────────────────────────────────────────
// Protected — upload an image to chat (returns URL to be sent via socket)
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image provided' });
    res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error uploading image' });
  }
});

module.exports = router;
