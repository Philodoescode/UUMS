const { Announcement, Course, Department, User, Role, Instructor, CourseInstructor } = require('../models');

// @desc    Create a new announcement for a course
// @route   POST /api/announcements
const createAnnouncement = async (req, res) => {
    try {
        const { courseId, title, content } = req.body;
        const userId = req.user.id;

        // Check roles
        const userRoles = req.user.roles ? req.user.roles.map(r => r.name) : [];
        const isInstructor = userRoles.includes('instructor');
        const isAdvisor = userRoles.includes('advisor');
        const isAdmin = userRoles.includes('admin');

        if (!isAdmin) {
            if (!isInstructor) {
                return res.status(403).json({ message: 'Only instructors can create announcements.' });
            }
            // Requirement: whoever have only instructor role, cannot publish announcments.
            // Requirement: for any user who have both instructor and advisor can publish announcments.
            if (!isAdvisor) {
                return res.status(403).json({ message: 'You must have both Instructor and Advisor roles to publish announcements.' });
            }
        }

        // 1. Verify User is Instructor
        const instructor = await Instructor.findOne({ where: { userId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found.' });
        }

        // 2. Verify Instructor is assigned to this course
        const isAssigned = await CourseInstructor.findOne({
            where: { courseId, instructorId: instructor.id }
        });

        if (!isAssigned && !isAdmin) {
            return res.status(403).json({ message: 'You are not assigned to this course.' });
        }

        // 3. Create Announcement
        const announcement = await Announcement.create({
            courseId,
            instructorId: instructor.id,
            title,
            content
        });

        // 4. Return with author info
        const populatedAnnouncement = await Announcement.findByPk(announcement.id, {
            include: [
                {
                    model: Instructor,
                    as: 'instructor',
                    include: [{ model: User, as: 'user', attributes: ['fullName'] }]
                }
            ]
        });

        res.status(201).json(populatedAnnouncement);

    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all announcements for a course
// @route   GET /api/announcements/course/:courseId
const getCourseAnnouncements = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Optional: Add logic to check if user (student/instructor) has access to this course
        // For now, assuming if they can view the course details, they can view announcements.

        const announcements = await Announcement.findAll({
            where: { courseId },
            include: [
                {
                    model: Instructor,
                    as: 'instructor',
                    include: [{ model: User, as: 'user', attributes: ['fullName'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(announcements);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAnnouncement,
    getCourseAnnouncements
};
