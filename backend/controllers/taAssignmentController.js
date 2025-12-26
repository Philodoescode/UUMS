const { CourseTAAssignment, Course, Instructor, User, Role, CourseInstructor, Department } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all TAs assigned to a specific course
// @route   GET /api/ta-assignments/course/:courseId
const getTAsForCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify user is instructor of this course
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

        const taAssignments = await CourseTAAssignment.findAll({
            where: { courseId },
            include: [
                {
                    model: User,
                    as: 'taUser',
                    attributes: ['id', 'fullName', 'email'],
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(taAssignments);
    } catch (error) {
        console.error('Error fetching TAs for course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign a TA to a course with duties
// @route   POST /api/ta-assignments
const assignTA = async (req, res) => {
    try {
        const { courseId, taUserId, duties } = req.body;
        const userId = req.user.id;

        if (!courseId || !taUserId) {
            return res.status(400).json({ message: 'Course ID and TA User ID are required' });
        }

        // Verify user is instructor of this course
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

        // Verify the target user is a TA
        const taUser = await User.findByPk(taUserId, {
            include: [{ model: Role, as: 'role' }],
        });

        if (!taUser) {
            return res.status(404).json({ message: 'TA user not found' });
        }

        if (taUser.role?.name !== 'ta') {
            return res.status(400).json({ message: 'Selected user is not a TA' });
        }

        // Check if TA is already assigned to this course
        const existingAssignment = await CourseTAAssignment.findOne({
            where: { courseId, taUserId },
        });

        if (existingAssignment) {
            return res.status(400).json({ message: 'TA is already assigned to this course' });
        }

        // Create the assignment
        const assignment = await CourseTAAssignment.create({
            courseId,
            instructorId: instructor.id,
            taUserId,
            duties: duties || '',
        });

        // Fetch with associations for response
        const fullAssignment = await CourseTAAssignment.findByPk(assignment.id, {
            include: [
                {
                    model: User,
                    as: 'taUser',
                    attributes: ['id', 'fullName', 'email'],
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name'],
                },
            ],
        });

        res.status(201).json({
            message: 'TA assigned successfully',
            assignment: fullAssignment,
        });
    } catch (error) {
        console.error('Error assigning TA:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update TA duties
// @route   PUT /api/ta-assignments/:id
const updateTADuties = async (req, res) => {
    try {
        const { id } = req.params;
        const { duties } = req.body;
        const userId = req.user.id;

        const assignment = await CourseTAAssignment.findByPk(id, {
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name'],
                },
                {
                    model: User,
                    as: 'taUser',
                    attributes: ['id', 'fullName', 'email'],
                },
            ],
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Verify user is instructor of this course
        const instructor = await Instructor.findOne({ where: { userId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found' });
        }

        const courseInstructor = await CourseInstructor.findOne({
            where: { courseId: assignment.courseId, instructorId: instructor.id },
        });

        if (!courseInstructor) {
            return res.status(403).json({ message: 'You are not authorized to modify this assignment' });
        }

        await assignment.update({ duties });

        res.json({
            message: 'TA duties updated successfully',
            assignment,
        });
    } catch (error) {
        console.error('Error updating TA duties:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove TA from course
// @route   DELETE /api/ta-assignments/:id
const removeTA = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const assignment = await CourseTAAssignment.findByPk(id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Verify user is instructor of this course
        const instructor = await Instructor.findOne({ where: { userId } });
        if (!instructor) {
            return res.status(403).json({ message: 'Instructor profile not found' });
        }

        const courseInstructor = await CourseInstructor.findOne({
            where: { courseId: assignment.courseId, instructorId: instructor.id },
        });

        if (!courseInstructor) {
            return res.status(403).json({ message: 'You are not authorized to remove this assignment' });
        }

        await assignment.destroy();

        res.json({ message: 'TA removed from course successfully' });
    } catch (error) {
        console.error('Error removing TA:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all courses assigned to the current TA with duties
// @route   GET /api/ta-assignments/my-courses
const getTAMyCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        const assignments = await CourseTAAssignment.findAll({
            where: { taUserId: userId },
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name', 'semester', 'year', 'credits'],
                    include: [
                        { model: Department, as: 'department', attributes: ['name'] },
                    ],
                },
                {
                    model: Instructor,
                    as: 'instructor',
                    include: [
                        { model: User, as: 'user', attributes: ['fullName', 'email'] },
                    ],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(assignments);
    } catch (error) {
        console.error('Error fetching TA courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all users with TA role (for instructor to search/select)
// @route   GET /api/ta-assignments/available-tas
const getAvailableTAs = async (req, res) => {
    try {
        const taRole = await Role.findOne({ where: { name: 'ta' } });

        if (!taRole) {
            return res.json([]);
        }

        // Use UserRole join table to find users with TA role
        const tas = await User.findAll({
            include: [
                {
                    model: Role,
                    as: 'roles',
                    through: { attributes: [] },
                    where: { id: taRole.id },
                    attributes: []
                }
            ],
            where: { isActive: true },
            attributes: ['id', 'fullName', 'email'],
            order: [['fullName', 'ASC']],
        });

        res.json(tas);
    } catch (error) {
        console.error('Error fetching available TAs:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTAsForCourse,
    assignTA,
    updateTADuties,
    removeTA,
    getTAMyCourses,
    getAvailableTAs,
};
