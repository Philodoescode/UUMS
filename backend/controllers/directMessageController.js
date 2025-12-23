const { Op } = require('sequelize');
const { DirectMessage, User, Role } = require('../models');

// @desc    Send a new direct message
// @route   POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { recipientId, body } = req.body;
    const senderId = req.user.id;

    // 1. Validate required fields
    if (!recipientId || !body) {
      return res.status(400).json({
        message: 'Both recipientId and body are required',
      });
    }

    // 2. Validate body is not empty after trimming
    const sanitizedBody = body.trim();
    if (!sanitizedBody) {
      return res.status(400).json({
        message: 'Message body cannot be empty',
      });
    }

    // 3. Verify recipient exists
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({
        message: 'Recipient not found',
      });
    }

    // 4. Prevent sending message to self
    if (senderId === recipientId) {
      return res.status(400).json({
        message: 'Cannot send a message to yourself',
      });
    }

    // 5. Create the message
    const message = await DirectMessage.create({
      senderId,
      recipientId,
      body: sanitizedBody,
    });

    // 6. Return the created message with sender/recipient info
    const populatedMessage = await DirectMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
      ],
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: error.errors[0].message,
      });
    }

    res.status(500).json({ message: 'Server error while sending message' });
  }
};

// @desc    Get message history with a specific user
// @route   GET /api/messages/:recipientId
const getMessageHistory = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const currentUserId = req.user.id;

    // 1. Verify the other user exists
    const otherUser = await User.findByPk(recipientId);
    if (!otherUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // 2. Get all messages between the two users (either direction)
    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: recipientId },
          { senderId: recipientId, recipientId: currentUserId },
        ],
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
};

// @desc    Get inbox - list of conversations with most recent message
// @route   GET /api/messages/inbox
const getInbox = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Get all messages involving the current user
    const allMessages = await DirectMessage.findAll({
      where: {
        [Op.or]: [{ senderId: currentUserId }, { recipientId: currentUserId }],
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'fullName', 'email'],
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'fullName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group messages by the "other user" (the person we're chatting with)
    const conversationsMap = new Map();

    for (const msg of allMessages) {
      // Determine who the "other user" is
      const otherUserId =
        msg.senderId === currentUserId ? msg.recipientId : msg.senderId;
      const otherUser =
        msg.senderId === currentUserId ? msg.recipient : msg.sender;

      // Only keep the first (most recent) message per conversation
      if (!conversationsMap.has(otherUserId)) {
        // Count unread messages in this conversation (messages TO current user that are unread)
        const unreadCount = allMessages.filter(
          (m) =>
            m.senderId === otherUserId &&
            m.recipientId === currentUserId &&
            !m.isRead
        ).length;

        conversationsMap.set(otherUserId, {
          recipientId: otherUserId,
          participant: {
            id: otherUser.id,
            fullName: otherUser.fullName,
            email: otherUser.email,
          },
          lastMessage: {
            id: msg.id,
            body: msg.body,
            createdAt: msg.createdAt,
            isFromMe: msg.senderId === currentUserId,
          },
          unreadCount,
        });
      }
    }

    // Convert map to array (already ordered by most recent)
    const conversations = Array.from(conversationsMap.values());

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ message: 'Server error while fetching inbox' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:senderId/read
const markAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const currentUserId = req.user.id;

    // Mark all messages from this sender to current user as read
    await DirectMessage.update(
      { isRead: true },
      {
        where: {
          senderId: senderId,
          recipientId: currentUserId,
          isRead: false,
        },
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error while marking messages as read' });
  }
};

module.exports = {
  sendMessage,
  getMessageHistory,
  getInbox,
  markAsRead,
};
