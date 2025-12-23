const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessageHistory,
  getInbox,
  markAsRead,
} = require('../controllers/directMessageController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/messages/inbox - Get inbox (list of conversations)
// Must be before /:recipientId to avoid matching 'inbox' as a recipientId
router.get('/inbox', getInbox);

// POST /api/messages - Send a new message
router.post('/', sendMessage);

// PUT /api/messages/:senderId/read - Mark messages from a sender as read
router.put('/:senderId/read', markAsRead);

// GET /api/messages/:recipientId - Get message history with a specific user
router.get('/:recipientId', getMessageHistory);

module.exports = router;
