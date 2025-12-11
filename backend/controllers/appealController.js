const { GradeAppeal, Enrollment, User, Course, Department } = require('../models');

// @desc    Create a grade appeal (Student)
// @route   POST /api/appeals
const createAppeal = async (req, res) => {
    try {
        const { enrollmentId, reason } = req.body;
        const studentId = req.user.id;

        // Verify user is a student
        if (req.user.role?.name !== 'student') {
            return res.status(403).json({ message: 'Only students can submit grade appeals' });
        }

        if (!enrollmentId || !reason) {
            return res.status(400).json({ message: 'enrollmentId and reason are required' });
        }

        // Verify enrollment exists and belongs to this student
        const enrollment = await Enrollment.findOne({
            where: { id: enrollmentId, userId: studentId },
            include: [{ model: Course, as: 'course' }],
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found or does not belong to you' });
        }

        // Check if there's already a pending appeal for this enrollment
        const existingAppeal = await GradeAppeal.findOne({
            where: { enrollmentId, status: 'pending' },
        });

        if (existingAppeal) {
            return res.status(400).json({ message: 'You already have a pending appeal for this course' });
        }

        // Create the appeal
        const appeal = await GradeAppeal.create({
            enrollmentId,
            studentId,
            currentGrade: enrollment.grade,
            reason,
            status: 'pending',
        });

        const appealWithAssoc = await GradeAppeal.findByPk(appeal.id, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Enrollment,
                    as: 'enrollment',
                    include: [{ model: Course, as: 'course' }],
                },
            ],
        });

        res.status(201).json({
            message: 'Grade appeal submitted successfully',
            appeal: appealWithAssoc,
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get student's own appeals
// @route   GET /api/appeals/my-appeals
const getMyAppeals = async (req, res) => {
    try {
        const studentId = req.user.id;

        if (req.user.role?.name !== 'student') {
            return res.status(403).json({ message: 'Only students can access their appeals' });
        }

        const appeals = await GradeAppeal.findAll({
            where: { studentId },
            include: [
                {
                    model: Enrollment,
                    as: 'enrollment',
                    include: [
                        { model: Course, as: 'course', include: [{ model: Department, as: 'department' }] },
                    ],
                },
                { model: User, as: 'resolvedBy', attributes: ['id', 'fullName'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(appeals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get appeal for a specific course (Student)
// @route   GET /api/appeals/course/:courseId
const getAppealByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        if (req.user.role?.name !== 'student') {
            return res.status(403).json({ message: 'Only students can access their appeals' });
        }

        // Find enrollment first
        const enrollment = await Enrollment.findOne({
            where: { userId: studentId, courseId },
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        const appeal = await GradeAppeal.findOne({
            where: { enrollmentId: enrollment.id },
            include: [
                { model: User, as: 'resolvedBy', attributes: ['id', 'fullName'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(appeal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all appeals (Admin/Advisor)
// @route   GET /api/appeals
const getAllAppeals = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status) where.status = status;

        const appeals = await GradeAppeal.findAll({
            where,
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Enrollment,
                    as: 'enrollment',
                    include: [
                        { model: Course, as: 'course', include: [{ model: Department, as: 'department' }] },
                    ],
                },
                { model: User, as: 'resolvedBy', attributes: ['id', 'fullName'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(appeals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update appeal status (Admin/Advisor)
// @route   PUT /api/appeals/:id
const updateAppeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, professorResponse, newGrade } = req.body;

        const appeal = await GradeAppeal.findByPk(id, {
            include: [{ model: Enrollment, as: 'enrollment' }],
        });

        if (!appeal) {
            return res.status(404).json({ message: 'Appeal not found' });
        }

        const updateData = {};

        if (status) {
            updateData.status = status;
            if (status === 'resolved') {
                updateData.resolvedAt = new Date();
                updateData.resolvedById = req.user.id;
            }
        }

        if (professorResponse !== undefined) {
            updateData.professorResponse = professorResponse;
        }

        if (newGrade !== undefined) {
            updateData.newGrade = newGrade;
            // Also update the enrollment grade if a new grade is provided
            if (newGrade && appeal.enrollment) {
                await appeal.enrollment.update({ grade: newGrade });
            }
        }

        await appeal.update(updateData);

        const updatedAppeal = await GradeAppeal.findByPk(id, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Enrollment,
                    as: 'enrollment',
                    include: [{ model: Course, as: 'course' }],
                },
                { model: User, as: 'resolvedBy', attributes: ['id', 'fullName'] },
            ],
        });

        res.json({
            message: 'Appeal updated successfully',
            appeal: updatedAppeal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAppeal,
    getMyAppeals,
    getAppealByCourse,
    getAllAppeals,
    updateAppeal,
};
