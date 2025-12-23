const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessageHistory,
} = require('../controllers/directMessageController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// POST /api/messages - Send a new message
router.post('/', sendMessage);

// GET /api/messages/:recipientId - Get message history with a specific user
router.get('/:recipientId', getMessageHistory);

module.exports = router;
