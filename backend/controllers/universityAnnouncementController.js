const { UniversityAnnouncement, User, Role } = require('../models');

// Helper function to check if user has permission to create announcements
const hasAnnouncementPermission = async (user) => {
  // Admin and HR roles always have permission
  if (user.role.name === 'admin' || user.role.name === 'hr') {
    return true;
  }

  // For other users, check if they have BOTH instructor AND advisor roles
  // Fetch user with all their roles from the UserRole junction table
  const userWithRoles = await User.findByPk(user.id, {
    include: [{
      model: Role,
      as: 'roles',
      attributes: ['name']
    }]
  });

  if (!userWithRoles || !userWithRoles.roles || userWithRoles.roles.length === 0) {
    return false;
  }

  // Extract role names from the user's roles
  const roleNames = userWithRoles.roles.map(r => r.name);

  // User must have BOTH 'instructor' AND 'advisor' roles
  const hasInstructor = roleNames.includes('instructor');
  const hasAdvisor = roleNames.includes('advisor');

  return hasInstructor && hasAdvisor;
};

// @desc    Create a new university-wide announcement
// @route   POST /api/university-announcements
const createUniversityAnnouncement = async (req, res) => {
  try {
    const { title, body, type, date } = req.body;
    const userId = req.user.id;

    // 1. Verify user has permission to create announcements
    const hasPermission = await hasAnnouncementPermission(req.user);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'You do not have permission to create university announcements. Only admin, hr, and users with both instructor and advisor roles can create announcements.' 
      });
    }

    // 2. Validate required fields
    if (!title || !body || !type || !date) {
      return res.status(400).json({ 
        message: 'All fields are required: title, body, type, and date' 
      });
    }

    // 3. Validate type enum
    const validTypes = ['general', 'event', 'deadline'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid type. Type must be one of: ${validTypes.join(', ')}` 
      });
    }

    // 4. Validate date
    const announcementDate = new Date(date);
    if (isNaN(announcementDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format' 
      });
    }

    // 5. Sanitize inputs (trim whitespace)
    const sanitizedTitle = title.trim();
    const sanitizedBody = body.trim();

    if (!sanitizedTitle || !sanitizedBody) {
      return res.status(400).json({ 
        message: 'Title and body cannot be empty' 
      });
    }

    // 6. Create announcement
    const announcement = await UniversityAnnouncement.create({
      title: sanitizedTitle,
      body: sanitizedBody,
      type,
      date: announcementDate,
      createdById: userId,
    });

    // 7. Return with creator info
    const populatedAnnouncement = await UniversityAnnouncement.findByPk(announcement.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }]
        }
      ]
    });

    res.status(201).json(populatedAnnouncement);

  } catch (error) {
    console.error('Error creating university announcement:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: error.errors[0].message 
      });
    }
    
    res.status(500).json({ message: 'Server error while creating announcement' });
  }
};

// @desc    Get all university announcements
// @route   GET /api/university-announcements
const getUniversityAnnouncements = async (req, res) => {
  try {
    const announcements = await UniversityAnnouncement.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }]
        }
      ],
      order: [['publishedAt', 'DESC']]
    });

    res.json(announcements);

  } catch (error) {
    console.error('Error fetching university announcements:', error);
    res.status(500).json({ message: 'Server error while fetching announcements' });
  }
};

module.exports = {
  createUniversityAnnouncement,
  getUniversityAnnouncements
};
