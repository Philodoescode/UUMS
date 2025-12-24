const { Op } = require('sequelize');
const { MeetingRequest, User, Role } = require('../models');
const {
  sendMeetingRequestNotification,
  sendMeetingApprovedNotification,
  sendMeetingDeclinedNotification,
} = require('../utils/notificationHelper');

// @desc    Create a new meeting request
// @route   POST /api/meeting-requests
const createMeetingRequest = async (req, res) => {
  try {
    const { professorId, requestedDate, requestedTime, reason } = req.body;
    const studentId = req.user.id;

    // 1. Validate required fields
    if (!professorId || !requestedDate || !requestedTime || !reason) {
      return res.status(400).json({
        message: 'professorId, requestedDate, requestedTime, and reason are required',
      });
    }

    // 2. Validate reason is not empty after trimming
    const sanitizedReason = reason.trim();
    if (!sanitizedReason) {
      return res.status(400).json({
        message: 'Reason cannot be empty',
      });
    }

    // 3. Verify professor exists
    const professor = await User.findByPk(professorId, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!professor) {
      return res.status(404).json({
        message: 'Professor not found',
      });
    }

    // 4. Verify professor has instructor role
    const professorRoleName = professor.role?.name?.toLowerCase();
    if (professorRoleName !== 'instructor' && professorRoleName !== 'ta') {
      return res.status(400).json({
        message: 'You can only request meetings with instructors or TAs',
      });
    }

    // 5. Prevent requesting meeting with self
    if (studentId === professorId) {
      return res.status(400).json({
        message: 'Cannot request a meeting with yourself',
      });
    }

    // 6. Validate future date/time
    const requestDateTime = new Date(`${requestedDate}T${requestedTime}`);
    const now = new Date();
    
    if (requestDateTime <= now) {
      return res.status(400).json({
        message: 'Requested date and time must be in the future',
      });
    }

    // 7. Create the meeting request
    const meetingRequest = await MeetingRequest.create({
      studentId,
      professorId,
      requestedDate,
      requestedTime,
      reason: sanitizedReason,
      status: 'Pending',
    });

    // 8. Send notification to professor
    try {
      await sendMeetingRequestNotification(
        professorId,
        req.user.fullName,
        requestedDate,
        requestedTime,
        sanitizedReason
      );
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Continue even if notification fails
    }

    // 9. Return the created request with populated data
    const populatedRequest = await MeetingRequest.findByPk(meetingRequest.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
      ],
    });

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Error creating meeting request:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: error.errors[0].message,
      });
    }

    res.status(500).json({ message: 'Server error while creating meeting request' });
  }
};

// @desc    Get meeting requests for current user
// @route   GET /api/meeting-requests/my-requests?status=Pending
const getMyMeetingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const userRoleName = req.user.role?.name?.toLowerCase();

    // Build where clause
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    let meetingRequests;

    // If user is instructor/professor, get requests made to them
    if (userRoleName === 'instructor' || userRoleName === 'ta') {
      meetingRequests = await MeetingRequest.findAll({
        where: {
          professorId: userId,
          ...whereClause,
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'fullName', 'email', 'profileImage'],
            include: [{ model: Role, as: 'role', attributes: ['name'] }],
          },
          {
            model: User,
            as: 'professor',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    } else {
      // For students, get requests they made
      meetingRequests = await MeetingRequest.findAll({
        where: {
          studentId: userId,
          ...whereClause,
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: User,
            as: 'professor',
            attributes: ['id', 'fullName', 'email', 'profileImage'],
            include: [{ model: Role, as: 'role', attributes: ['name'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    }

    res.json(meetingRequests);
  } catch (error) {
    console.error('Error fetching meeting requests:', error);
    res.status(500).json({ message: 'Server error while fetching meeting requests' });
  }
};

// @desc    Get single meeting request by ID
// @route   GET /api/meeting-requests/:id
const getMeetingRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const meetingRequest = await MeetingRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'fullName', 'email', 'profileImage'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'fullName', 'email', 'profileImage'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
      ],
    });

    if (!meetingRequest) {
      return res.status(404).json({
        message: 'Meeting request not found',
      });
    }

    // Verify user is either the student or professor
    if (meetingRequest.studentId !== userId && meetingRequest.professorId !== userId) {
      return res.status(403).json({
        message: 'You are not authorized to view this meeting request',
      });
    }

    res.json(meetingRequest);
  } catch (error) {
    console.error('Error fetching meeting request:', error);
    res.status(500).json({ message: 'Server error while fetching meeting request' });
  }
};

// @desc    Update meeting request status (approve/decline)
// @route   PUT /api/meeting-requests/:id/status
const updateMeetingRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, professorNotes, approvedDate, approvedTime } = req.body;

    // 1. Validate status
    if (!status || !['Approved', 'Declined'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be either "Approved" or "Declined"',
      });
    }

    // 2. Find the meeting request
    const meetingRequest = await MeetingRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'fullName', 'email'],
        },
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'fullName', 'email'],
        },
      ],
    });

    if (!meetingRequest) {
      return res.status(404).json({
        message: 'Meeting request not found',
      });
    }

    // 3. Verify user is the professor
    if (meetingRequest.professorId !== userId) {
      return res.status(403).json({
        message: 'Only the professor can update the meeting request status',
      });
    }

    // 4. Verify request is still pending
    if (meetingRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'This meeting request has already been processed',
      });
    }

    // 5. Update the meeting request
    meetingRequest.status = status;
    meetingRequest.professorNotes = professorNotes || null;
    
    if (status === 'Approved') {
      meetingRequest.approvedDate = approvedDate || meetingRequest.requestedDate;
      meetingRequest.approvedTime = approvedTime || meetingRequest.requestedTime;
    }

    await meetingRequest.save();

    // 6. Send notification to student
    try {
      if (status === 'Approved') {
        await sendMeetingApprovedNotification(
          meetingRequest.studentId,
          req.user.fullName,
          meetingRequest.approvedDate,
          meetingRequest.approvedTime,
          professorNotes
        );
      } else {
        await sendMeetingDeclinedNotification(
          meetingRequest.studentId,
          req.user.fullName,
          professorNotes
        );
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Continue even if notification fails
    }

    // 7. Return updated request
    const updatedRequest = await MeetingRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'fullName', 'email'],
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        },
      ],
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating meeting request:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: error.errors[0].message,
      });
    }

    res.status(500).json({ message: 'Server error while updating meeting request' });
  }
};

// @desc    Delete meeting request (student only, pending only)
// @route   DELETE /api/meeting-requests/:id
const deleteMeetingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const meetingRequest = await MeetingRequest.findByPk(id);

    if (!meetingRequest) {
      return res.status(404).json({
        message: 'Meeting request not found',
      });
    }

    // Verify user is the student who created it
    if (meetingRequest.studentId !== userId) {
      return res.status(403).json({
        message: 'Only the student who created the request can delete it',
      });
    }

    // Only allow deletion of pending requests
    if (meetingRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'Only pending meeting requests can be deleted',
      });
    }

    await meetingRequest.destroy();

    res.json({ message: 'Meeting request deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting request:', error);
    res.status(500).json({ message: 'Server error while deleting meeting request' });
  }
};

module.exports = {
  createMeetingRequest,
  getMyMeetingRequests,
  getMeetingRequestById,
  updateMeetingRequestStatus,
  deleteMeetingRequest,
};
