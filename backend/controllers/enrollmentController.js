const { Enrollment, User, Course, Role, Department } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new enrollment
// @route   POST /api/enrollments
const createEnrollment = async (req, res) => {
  try {
    const { userId, courseId, status } = req.body;

    // Validate required fields
    if (!userId || !courseId) {
      return res.status(400).json({ message: 'userId and courseId are required' });
    }

    // Check user exists and is a student
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.role.name !== 'student') {
      return res.status(400).json({ message: 'User must have student role to enroll' });
    }

    // Check course exists and is active
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(400).json({ message: 'Course not found' });
    }
    if (!course.isActive) {
      return res.status(400).json({ message: 'Course is not active' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: { userId, courseId },
    });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }

    // Check course capacity
    const enrolledCount = await Enrollment.count({
      where: { 
        courseId, 
        status: { [Op.in]: ['enrolled', 'waitlisted'] } 
      },
    });

    let enrollmentStatus = status || 'enrolled';
    if (enrolledCount >= course.capacity) {
      enrollmentStatus = 'waitlisted';
    }

    const enrollment = await Enrollment.create({
      userId,
      courseId,
      status: enrollmentStatus,
    });

    // Fetch with associations
    const enrollmentWithAssoc = await Enrollment.findByPk(enrollment.id, {
      include: [
        { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
        { 
          model: Course, 
          as: 'course',
          include: [{ model: Department, as: 'department' }],
        },
      ],
    });

    res.status(201).json(enrollmentWithAssoc);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all enrollments
// @route   GET /api/enrollments
const getAllEnrollments = async (req, res) => {
  try {
    const { userId, courseId, status } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    const enrollments = await Enrollment.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
        { 
          model: Course, 
          as: 'course',
          include: [{ model: Department, as: 'department' }],
        },
      ],
      order: [['enrolledAt', 'DESC']],
    });

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single enrollment by ID
// @route   GET /api/enrollments/:id
const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
        { 
          model: Course, 
          as: 'course',
          include: [{ model: Department, as: 'department' }],
        },
      ],
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update enrollment (change status, add grade)
// @route   PUT /api/enrollments/:id
const updateEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const { status, grade } = req.body;

    await enrollment.update({
      status: status !== undefined ? status : enrollment.status,
      grade: grade !== undefined ? grade : enrollment.grade,
    });

    // Fetch updated enrollment with associations
    const updatedEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [
        { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
        { 
          model: Course, 
          as: 'course',
          include: [{ model: Department, as: 'department' }],
        },
      ],
    });

    res.json(updatedEnrollment);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete enrollment
// @route   DELETE /api/enrollments/:id
const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    await enrollment.destroy();
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
};
