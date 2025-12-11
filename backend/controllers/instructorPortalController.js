const { Enrollment, User, Course, Department, Instructor, CourseInstructor, GradeAuditLog, Role } = require('../models');
const { Op } = require('sequelize');

// @desc    Get courses the advisor oversees (is assigned to as instructor)
// @route   GET /api/instructor-portal/my-courses
const getInstructorCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find instructor profile for this user
        const instructor = await Instructor.findOne({
            where: { userId },
            include: [
                {
                    model: Course,
                    as: 'courses',
                    include: [
                        { model: Department, as: 'department' },
                    ],
                },
            ],
        });

        if (!instructor) {
            return res.status(404).json({ message: 'Instructor profile not found' });
        }

        res.json(instructor.courses || []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get students enrolled in a specific course
// @route   GET /api/advisor/courses/:courseId/students
const getCourseStudents = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify advisor teaches this course
        const instructor = await Instructor.findOne({ where: { userId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found' });
        }

        const courseInstructor = await CourseInstructor.findOne({
            where: { courseId, instructorId: instructor.id },
        });

        if (!courseInstructor) {
            return res.status(403).json({ message: 'You are not assigned to this course' });
        }

        // Get all enrollments for this course
        const enrollments = await Enrollment.findAll({
            where: { courseId },
            include: [
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'fullName', 'email'],
                    include: [{ model: Role, as: 'role' }],
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name'],
                },
            ],
            order: [['student', 'fullName', 'ASC']],
        });

        res.json(enrollments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign or update grade for a student
// @route   PUT /api/advisor/enrollments/:enrollmentId/grade
const assignGrade = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { grade, feedback, reason } = req.body;
        const advisorId = req.user.id;

        if (!grade) {
            return res.status(400).json({ message: 'Grade is required' });
        }

        // Find the enrollment
        const enrollment = await Enrollment.findByPk(enrollmentId, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                { model: Course, as: 'course' },
            ],
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Verify advisor teaches this course
        const instructor = await Instructor.findOne({ where: { userId: advisorId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found' });
        }

        const courseInstructor = await CourseInstructor.findOne({
            where: { courseId: enrollment.courseId, instructorId: instructor.id },
        });

        if (!courseInstructor) {
            return res.status(403).json({ message: 'You are not assigned to this course' });
        }

        // Store previous values for audit log
        const previousGrade = enrollment.grade;
        const previousFeedback = enrollment.feedback;
        const isNewGrade = !previousGrade;

        // Update the enrollment
        await enrollment.update({
            grade,
            feedback: feedback !== undefined ? feedback : enrollment.feedback,
            status: 'completed',
        });

        // Create audit log entry
        await GradeAuditLog.create({
            enrollmentId: enrollment.id,
            studentId: enrollment.userId,
            courseId: enrollment.courseId,
            advisorId,
            previousGrade,
            newGrade: grade,
            previousFeedback,
            newFeedback: feedback || null,
            action: isNewGrade ? 'assigned' : 'updated',
            reason: reason || null,
        });

        // Fetch updated enrollment
        const updatedEnrollment = await Enrollment.findByPk(enrollmentId, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                { model: Course, as: 'course', attributes: ['id', 'courseCode', 'name'] },
            ],
        });

        res.json({
            message: isNewGrade ? 'Grade assigned successfully' : 'Grade updated successfully',
            enrollment: updatedEnrollment,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get grade audit log for a course
// @route   GET /api/advisor/courses/:courseId/audit-log
const getCourseAuditLog = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify advisor teaches this course
        const instructor = await Instructor.findOne({ where: { userId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found' });
        }

        const courseInstructor = await CourseInstructor.findOne({
            where: { courseId, instructorId: instructor.id },
        });

        if (!courseInstructor) {
            return res.status(403).json({ message: 'You are not assigned to this course' });
        }

        const auditLogs = await GradeAuditLog.findAll({
            where: { courseId },
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'advisor', attributes: ['id', 'fullName'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(auditLogs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getInstructorCourses,
    getCourseStudents,
    assignGrade,
    getCourseAuditLog,
};
