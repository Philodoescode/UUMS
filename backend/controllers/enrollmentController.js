const { Enrollment, User, Course, Role, Department, Instructor, CourseTAAssignment } = require('../models');
const { Op } = require('sequelize');

// @desc    Approve or Reject Enrollment (Advisor)
// @route   PUT /api/enrollments/:id/approval
const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'enrolled' (approve) or 'dropped' (reject)
    const advisorId = req.user.id;

    if (!['enrolled', 'dropped'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "enrolled" to approve or "dropped" to reject.' });
    }

    const enrollment = await Enrollment.findByPk(id, {
      include: [{ model: User, as: 'student' }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if current user is the student's advisor
    const isAdmin = req.user.roles && req.user.roles.some(r => r.name === 'admin');
    if (enrollment.student.advisorId !== advisorId && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to approve this enrollment' });
    }

    enrollment.status = status;
    await enrollment.save();

    res.json({ message: `Enrollment ${status === 'enrolled' ? 'approved' : 'rejected'} successfully`, enrollment });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
      include: [{ model: Role, as: 'roles' }],
    });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    const hasStudentRole = user.roles && user.roles.some(r => r.name === 'student');
    if (!hasStudentRole) {
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

    // Special logic for Advisor: restrict to assigned students
    const user = req.user; // populated by protect middleware
    const isAdvisor = user.roles && user.roles.some(r => r.name === 'advisor');
    if (isAdvisor) {
      // This is tricky without a join on the where clause for the include.
      // Sequelize allows this.
    }

    const includeOptions = [
      { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
      {
        model: Course,
        as: 'course',
        include: [{ model: Department, as: 'department' }]
      }
    ];

    if (isAdvisor) {
      includeOptions[0].where = { advisorId: user.id };
    }

    const enrollments = await Enrollment.findAll({
      where,
      include: includeOptions,
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

// @desc    Register for a course (Student self-registration)
// @route   POST /api/enrollments/register
const registerForCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    // Check user role
    if (req.user.role?.name !== 'student') {
      return res.status(403).json({ message: 'Only students can register for courses' });
    }

    // 1. Check course exists and is active
    const course = await Course.findByPk(courseId, {
      include: [
        { model: Course, as: 'prerequisites' }
      ]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (!course.isActive) {
      return res.status(400).json({ message: 'Course is not active' });
    }

    // 2. Check if already enrolled or waitlisted
    const existingEnrollment = await Enrollment.findOne({
      where: { userId, courseId },
    });
    if (existingEnrollment) {
      return res.status(400).json({
        message: `You are already ${existingEnrollment.status} in this course`
      });
    }

    // 3. Check Prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      const prerequisiteIds = course.prerequisites.map(p => p.id);

      const completedPrerequisites = await Enrollment.count({
        where: {
          userId,
          courseId: { [Op.in]: prerequisiteIds },
          status: 'completed'
        }
      });

      if (completedPrerequisites < prerequisiteIds.length) {
        const missingPrereqs = course.prerequisites.map(p => p.courseCode).join(', ');
        return res.status(400).json({
          message: `You have not completed all prerequisites for this course. Required: ${missingPrereqs}`
        });
      }
    }

    // 4. Check Capacity
    const enrolledCount = await Enrollment.count({
      where: {
        courseId,
        status: { [Op.in]: ['enrolled', 'waitlisted'] }
      },
    });

    let status = 'enrolled';
    let message = 'Successfully registered for course';

    if (enrolledCount >= course.capacity) {
      status = 'waitlisted';
      message = 'Course is full. You have been added to the waitlist.';
    } else if (req.user.advisorId) {
      // New Logic: If student has an advisor, set generic status to pending
      status = 'pending';
      message = 'Registration pending advisor approval.';
    }

    // 5. Create Enrollment
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      status,
    });

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

    res.status(201).json({
      message,
      enrollment: enrollmentWithAssoc
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current student's enrolled courses
// @route   GET /api/enrollments/my-courses
const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is a student
    if (req.user.role?.name !== 'student') {
      return res.status(403).json({ message: 'Only students can access their enrollments' });
    }

    const enrollments = await Enrollment.findAll({
      where: {
        userId,
        status: { [Op.in]: ['enrolled', 'completed', 'waitlisted', 'pending'] }
      },
      include: [
        {
          model: Course,
          as: 'course',
          include: [
            { model: Department, as: 'department' },
            { model: Course, as: 'prerequisites' },
            {
              model: Instructor,
              as: 'instructors',
              include: [
                { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
              ],
              attributes: ['id', 'title', 'officeLocation', 'officeHours']
            },
            {
              model: CourseTAAssignment,
              as: 'taAssignments',
              include: [
                { model: User, as: 'taUser', attributes: ['id', 'fullName', 'email'] }
              ]
            }
          ],
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

// @desc    Get student's grade for a specific course
// @route   GET /api/enrollments/my-grade/:courseId
const getMyGrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    // Verify user is a student
    if (req.user.role?.name !== 'student') {
      return res.status(403).json({ message: 'Only students can access their grades' });
    }

    const enrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId,
      },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'courseCode', 'name'],
        },
      ],
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found for this course' });
    }

    res.json({
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseName: enrollment.course.name,
      courseCode: enrollment.course.courseCode,
      status: enrollment.status,
      grade: enrollment.grade,
      feedback: enrollment.feedback,
      enrolledAt: enrollment.enrolledAt,
    });
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
  registerForCourse,
  getMyEnrollments,
  getMyGrade,
  approveEnrollment,
};
