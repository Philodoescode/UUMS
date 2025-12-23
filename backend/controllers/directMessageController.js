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

module.exports = {
  sendMessage,
  getMessageHistory,
};
