const StudentFeedback = require('../models/studentFeedbackModel');
const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// Helper to generate anonymous hash
const generateStudentHash = (studentId, courseId) => {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    return crypto
        .createHmac('sha256', secret)
        .update(`${studentId}-${courseId}`)
        .digest('hex');
};

exports.submitFeedback = async (req, res) => {
    try {
        const { courseId, targetUserId, targetRole, rating, comments } = req.body;
        const studentId = req.user.id; // user is authenticated

        // 1. Verify Enrollment
        const enrollment = await Enrollment.findOne({
            where: {
                userId: studentId,
                courseId: courseId,
            },
            include: [{ model: Course, as: 'course' }], // Check course details if needed
        });

        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in this course.' });
        }

        // 2. Check for Course Completion / Time Limit
        // Logic: If status is 'completed', check if it was completed more than 14 days ago.
        if (enrollment.status === 'completed') {
            const completionDate = new Date(enrollment.updatedAt);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            if (completionDate < twoWeeksAgo) {
                return res.status(403).json({ message: 'Feedback period for this course has ended.' });
            }
        }

        // 3. Generate Hash for Anonymity
        const studentHash = generateStudentHash(studentId, courseId);

        // 4. Check for existing feedback
        const existingFeedback = await StudentFeedback.findOne({
            where: {
                courseId,
                targetUserId,
                studentHash,
            },
        });

        if (existingFeedback) {
            return res.status(400).json({ message: 'You have already submitted feedback for this staff member in this course.' });
        }

        // 5. Create Feedback
        // We need semester/year from the course to store in feedback for history
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const feedback = await StudentFeedback.create({
            courseId,
            targetUserId,
            targetRole,
            rating,
            comments,
            studentHash,
            semester: course.semester,
            year: course.year,
        });

        res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: feedback.id });
    } catch (error) {
        console.error('Submit Feedback Error:', error);
        res.status(500).json({ message: 'Server error submitting feedback.' });
    }
};

exports.getStaffFeedback = async (req, res) => {
    try {
        const staffId = req.user.id; // The logged-in staff member viewing their own stats

        // Aggregate stats
        const stats = await StudentFeedback.findAll({
            where: { targetUserId: staffId },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
                'semester',
                'year',
                'courseId'
            ],
            group: ['courseId', 'semester', 'year'],
            order: [['year', 'DESC'], ['semester', 'DESC']],
        });

        // Get recent comments (limit 50)
        const comments = await StudentFeedback.findAll({
            where: { targetUserId: staffId, comments: { [Op.ne]: null } },
            attributes: ['comments', 'rating', 'createdAt', 'courseId', 'semester', 'year'],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.status(200).json({ stats, comments });
    } catch (error) {
        console.error('Get Staff Feedback Error:', error);
        res.status(500).json({ message: 'Server error retrieving feedback.' });
    }
};
